/**
 * FalProvider - Fal.ai API Provider Implementation
 * 
 * Implements the BaseProvider interface for Fal.ai's API.
 * Supports image generation, video generation, and upscaling.
 * 
 * Features:
 * - Synchronous image generation via fal.run
 * - Async video generation via queue.fal.run with polling
 * - Automatic cancellation support
 * - Smart timeout handling
 */

const axios = require('axios');
const BaseProvider = require('./BaseProvider');

class FalProvider extends BaseProvider {
  constructor(apiKey, config = {}) {
    super(apiKey, config);
    this.name = 'fal';
    this.baseUrl = 'https://fal.run';
    this.queueUrl = 'https://queue.fal.run';
  }

  /**
   * Check if Fal.ai is available
   */
  async isAvailable() {
    if (!this.apiKey) return false;
    
    try {
      // Simple health check - just verify API key works
      const response = await axios.get('https://fal.run/fal-ai/flux/schnell', {
        headers: { 'Authorization': `Key ${this.apiKey}` },
        timeout: 5000,
        validateStatus: () => true
      });
      return response.status !== 401;
    } catch (error) {
      this.log('warn', 'Availability check failed', { error: error.message });
      return false;
    }
  }

  /**
   * Generate image(s)
   */
  async generateImage(model, prompt, options = {}, inputImages = []) {
    const endpoint = this.getImageEndpoint(model, inputImages);
    const payload = this.buildImagePayload(model, prompt, options, inputImages);
    
    this.log('info', `Image generation: ${endpoint}`, { 
      numImages: options.num_images || 1,
      hasInputImages: inputImages.length > 0 
    });

    try {
      const response = await this.retry(async () => {
        return axios.post(`${this.baseUrl}/${endpoint}`, payload, {
          headers: this.getHeaders(),
          timeout: this.timeout
        });
      });

      return this.normalizeImageResponse(response.data);
    } catch (error) {
      this.log('error', 'Image generation failed', { error: error.message });
      throw this.normalizeError(error);
    }
  }

  /**
   * Generate video (async with polling)
   */
  async generateVideo(model, prompt, options = {}, inputImages = [], genId = null, db = null) {
    const endpoint = this.getVideoEndpoint(model, inputImages);
    const payload = this.buildVideoPayload(model, prompt, options, inputImages);
    
    this.log('info', `Video generation: ${endpoint}`, { 
      duration: options.duration,
      hasInputImages: inputImages.length > 0 
    });

    try {
      // Submit to queue
      const submitResponse = await axios.post(`${this.queueUrl}/${endpoint}`, payload, {
        headers: this.getHeaders()
      });

      const requestId = submitResponse.data.request_id;
      
      // If immediate result (some fast models)
      if (!requestId && submitResponse.data.video?.url) {
        return this.normalizeVideoResponse(submitResponse.data);
      }

      if (!requestId) {
        throw new Error('No request_id in queue response');
      }

      // Store request ID for cancellation
      if (genId && db) {
        db.prepare('UPDATE generations SET externalRequestId = ? WHERE id = ?').run(requestId, genId);
      }

      // Poll for result
      const result = await this.pollForResult(endpoint, requestId, model, genId, db);
      return this.normalizeVideoResponse(result);

    } catch (error) {
      this.log('error', 'Video generation failed', { error: error.message });
      throw this.normalizeError(error);
    }
  }

  /**
   * Upscale image
   */
  async upscaleImage(model, imageUrl, options = {}) {
    const endpoint = model.providerConfig?.fal?.endpoint || model.apiEndpoint;
    
    const payload = {
      image_url: imageUrl,
      scale_factor: parseInt(options.scale_factor) || 2,
    };
    
    if (options.creativity !== undefined) {
      payload.creativity = parseInt(options.creativity);
    }

    this.log('info', `Image upscale: ${endpoint}`, { scaleFactor: payload.scale_factor });

    try {
      const response = await this.retry(async () => {
        return axios.post(`${this.baseUrl}/${endpoint}`, payload, {
          headers: this.getHeaders(),
          timeout: 120000
        });
      });

      return {
        success: true,
        url: response.data.image?.url,
        metadata: { 
          width: response.data.image?.width,
          height: response.data.image?.height
        }
      };
    } catch (error) {
      throw this.normalizeError(error);
    }
  }

  /**
   * Upscale video (async)
   */
  async upscaleVideo(model, videoUrl, options = {}, genId = null, db = null) {
    const endpoint = model.providerConfig?.fal?.endpoint || model.apiEndpoint;
    
    const payload = {
      video_url: videoUrl,
      scale_factor: parseInt(options.scale_factor) || 2,
    };

    this.log('info', `Video upscale: ${endpoint}`, { scaleFactor: payload.scale_factor });

    try {
      // Submit to queue
      const submitResponse = await axios.post(`${this.queueUrl}/${endpoint}`, payload, {
        headers: this.getHeaders()
      });

      const requestId = submitResponse.data.request_id;
      if (!requestId) {
        throw new Error('No request_id for video upscale');
      }

      // Poll for result
      const result = await this.pollForResult(endpoint, requestId, model, genId, db);
      
      return {
        success: true,
        url: result.video?.url,
        metadata: { 
          width: result.video?.width,
          height: result.video?.height,
          duration: result.video?.duration
        }
      };
    } catch (error) {
      throw this.normalizeError(error);
    }
  }

  /**
   * Check status of async request
   */
  async checkStatus(requestId, endpoint) {
    try {
      const response = await axios.get(
        `${this.queueUrl}/${endpoint}/requests/${requestId}/status`,
        { headers: this.getHeaders() }
      );

      return {
        status: response.data.status?.toLowerCase() || 'pending',
        queuePosition: response.data.queue_position,
        progress: response.data.progress
      };
    } catch (error) {
      throw this.normalizeError(error);
    }
  }

  /**
   * Cancel async generation
   */
  async cancelGeneration(requestId, endpoint) {
    try {
      await axios.delete(
        `${this.queueUrl}/${endpoint}/requests/${requestId}`,
        { headers: this.getHeaders() }
      );
      return true;
    } catch (error) {
      this.log('warn', 'Cancel request failed', { error: error.message });
      return false;
    }
  }

  /**
   * Poll for async result
   */
  async pollForResult(endpoint, requestId, model, genId = null, db = null) {
    const maxWaitTime = (model.maxWaitTime || 600) * 1000;
    const startTime = Date.now();
    const pollInterval = 3000;

    while ((Date.now() - startTime) < maxWaitTime) {
      await new Promise(r => setTimeout(r, pollInterval));

      // Check if cancelled
      if (genId && db) {
        const gen = db.prepare('SELECT cancelledAt FROM generations WHERE id = ?').get(genId);
        if (gen?.cancelledAt) {
          await this.cancelGeneration(requestId, endpoint);
          throw new Error('Generation cancelled by user');
        }
      }

      try {
        const statusRes = await axios.get(
          `${this.queueUrl}/${endpoint}/requests/${requestId}/status`,
          { headers: this.getHeaders() }
        );

        const elapsed = Math.round((Date.now() - startTime) / 1000);
        this.log('info', `Status: ${statusRes.data.status} (${elapsed}s)`);

        if (statusRes.data.status === 'COMPLETED') {
          const resultRes = await axios.get(
            `${this.queueUrl}/${endpoint}/requests/${requestId}`,
            { headers: this.getHeaders() }
          );
          return resultRes.data;
        }

        if (statusRes.data.status === 'FAILED') {
          throw new Error(statusRes.data.error || 'Generation failed');
        }
      } catch (e) {
        if (e.response?.status !== 404) throw e;
      }
    }

    throw new Error('Generation timed out');
  }

  /**
   * Get appropriate image endpoint
   */
  getImageEndpoint(model, inputImages) {
    if (inputImages?.length > 0) {
      return model.providerConfig?.fal?.imageToImageEndpoint || 
             model.imageToImageEndpoint || 
             model.apiEndpoint;
    }
    return model.providerConfig?.fal?.textToImageEndpoint || 
           model.textToImageEndpoint || 
           model.apiEndpoint;
  }

  /**
   * Get appropriate video endpoint
   */
  getVideoEndpoint(model, inputImages) {
    if (inputImages?.length > 0 && model.imageToVideoEndpoint) {
      return model.providerConfig?.fal?.imageToVideoEndpoint || 
             model.imageToVideoEndpoint;
    }
    return model.providerConfig?.fal?.endpoint || 
           model.apiEndpoint;
  }

  /**
   * Build image generation payload
   */
  buildImagePayload(model, prompt, options = {}, inputImages = []) {
    const payload = {
      prompt,
      num_images: options.num_images || 1,
      enable_safety_checker: true,
    };

    // Standard options
    if (options.image_size) payload.image_size = options.image_size;
    if (options.aspect_ratio) payload.aspect_ratio = options.aspect_ratio;
    if (options.style) payload.style = options.style;
    if (options.guidance_scale) payload.guidance_scale = parseFloat(options.guidance_scale);
    if (options.resolution) payload.resolution = options.resolution;
    if (options.scale) payload.scale = parseInt(options.scale);
    if (options.strength) payload.strength = parseFloat(options.strength);

    // Handle input images
    if (inputImages?.length > 0) {
      const paramName = model.imageParamName || 'image_url';
      const paramType = model.imageParamType || 'single';

      if (paramType === 'array') {
        payload[paramName] = inputImages;
      } else {
        payload[paramName] = inputImages[0];
      }
    }

    return payload;
  }

  /**
   * Build video generation payload
   */
  buildVideoPayload(model, prompt, options = {}, inputImages = []) {
    const payload = { prompt };

    // Duration
    if (options.duration) payload.duration = options.duration;
    if (options.aspect_ratio) payload.aspect_ratio = options.aspect_ratio;
    if (options.resolution) payload.resolution = options.resolution;
    if (options.num_frames) payload.num_frames = parseInt(options.num_frames);
    if (options.prompt_optimizer !== undefined) payload.prompt_optimizer = options.prompt_optimizer;

    // Kling-specific
    if (options.negative_prompt) {
      payload.negative_prompt = options.negative_prompt;
    } else if (model.apiEndpoint?.includes('kling')) {
      payload.negative_prompt = "blur, distort, and low quality";
    }

    if (options.cfg_scale) {
      payload.cfg_scale = parseFloat(options.cfg_scale);
    } else if (model.apiEndpoint?.includes('kling')) {
      payload.cfg_scale = 0.5;
    }

    // Input image
    if (inputImages?.length > 0) {
      const paramName = model.imageParamName || 'image_url';
      payload[paramName] = inputImages[0];
    }

    // Video input (for extension models)
    if (options.video_url) {
      payload.video_url = options.video_url;
    }

    // Audio options
    if (options.generate_audio !== undefined) {
      payload.generate_audio = options.generate_audio === 'true' || options.generate_audio === true;
    }
    if (options.with_audio !== undefined) {
      payload.with_audio = options.with_audio === 'true' || options.with_audio === true;
    }

    // Quality options
    if (options.num_inference_steps) payload.num_inference_steps = parseInt(options.num_inference_steps);
    if (options.guidance_scale) payload.guidance_scale = parseFloat(options.guidance_scale);
    if (options.video_quality) payload.video_quality = options.video_quality;

    // Camera/trajectory options
    if (options.trajectories) payload.trajectories = options.trajectories;
    if (options.camera_lora) payload.camera_lora = options.camera_lora;
    if (options.acceleration) payload.acceleration = options.acceleration;
    if (options.video_size) payload.video_size = options.video_size;

    return payload;
  }

  /**
   * Normalize image response
   */
  normalizeImageResponse(data) {
    const urls = [];
    
    if (data.images?.length > 0) {
      urls.push(...data.images.map(img => img.url).filter(Boolean));
    } else if (data.image?.url) {
      urls.push(data.image.url);
    }

    if (urls.length === 0) {
      throw new Error('No image in response');
    }

    return {
      success: true,
      urls,
      url: urls[0],
      seed: data.seed,
      metadata: {
        width: data.images?.[0]?.width || data.image?.width,
        height: data.images?.[0]?.height || data.image?.height,
        contentType: data.images?.[0]?.content_type
      }
    };
  }

  /**
   * Normalize video response
   */
  normalizeVideoResponse(data) {
    const url = data.video?.url;
    
    if (!url) {
      throw new Error('No video in response');
    }

    return {
      success: true,
      url,
      thumbnailUrl: data.video?.thumbnail_url,
      seed: data.seed,
      metadata: {
        width: data.video?.width,
        height: data.video?.height,
        duration: data.video?.duration,
        fps: data.video?.fps
      }
    };
  }

  /**
   * Normalize error
   */
  normalizeError(error) {
    const message = error.response?.data?.detail || 
                   error.response?.data?.error || 
                   error.message;
    
    const normalized = new Error(message);
    normalized.status = error.response?.status;
    normalized.provider = 'fal';
    normalized.originalError = error;
    
    return normalized;
  }

  /**
   * Get request headers
   */
  getHeaders() {
    return {
      'Authorization': `Key ${this.apiKey}`,
      'Content-Type': 'application/json'
    };
  }
}

module.exports = FalProvider;
