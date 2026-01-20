/**
 * ReplicateProvider - Replicate API Provider Implementation
 * 
 * Implements the BaseProvider interface for Replicate's API.
 * Replicate uses a different model versioning system and webhook-based async.
 * 
 * Features:
 * - Prediction-based API
 * - Webhook support for async results
 * - Automatic polling fallback
 * - Model version management
 * 
 * API Reference: https://replicate.com/docs/reference/http
 */

const axios = require('axios');
const BaseProvider = require('./BaseProvider');

class ReplicateProvider extends BaseProvider {
  constructor(apiKey, config = {}) {
    super(apiKey, config);
    this.name = 'replicate';
    this.baseUrl = 'https://api.replicate.com/v1';
    this.webhookUrl = config.webhookUrl || null;
  }

  /**
   * Check if Replicate is available
   */
  async isAvailable() {
    if (!this.apiKey) return false;
    
    try {
      const response = await axios.get(`${this.baseUrl}/account`, {
        headers: this.getHeaders(),
        timeout: 5000
      });
      return response.status === 200;
    } catch (error) {
      this.log('warn', 'Availability check failed', { error: error.message });
      return false;
    }
  }

  /**
   * Generate image(s)
   */
  async generateImage(model, prompt, options = {}, inputImages = []) {
    const modelVersion = this.getModelVersion(model, 'image');
    const input = this.buildImageInput(model, prompt, options, inputImages);
    
    this.log('info', `Image generation: ${modelVersion}`, { 
      hasInputImages: inputImages.length > 0 
    });

    try {
      const prediction = await this.createPrediction(modelVersion, input);
      const result = await this.waitForPrediction(prediction.id);
      
      return this.normalizeImageResponse(result);
    } catch (error) {
      this.log('error', 'Image generation failed', { error: error.message });
      throw this.normalizeError(error);
    }
  }

  /**
   * Generate video
   */
  async generateVideo(model, prompt, options = {}, inputImages = []) {
    const modelVersion = this.getModelVersion(model, 'video');
    const input = this.buildVideoInput(model, prompt, options, inputImages);
    
    this.log('info', `Video generation: ${modelVersion}`, { 
      duration: options.duration 
    });

    try {
      const prediction = await this.createPrediction(modelVersion, input);
      const result = await this.waitForPrediction(prediction.id, model.maxWaitTime || 600);
      
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
    const modelVersion = this.getModelVersion(model, 'upscale');
    
    const input = {
      image: imageUrl,
      scale: parseInt(options.scale_factor) || 2,
    };

    this.log('info', `Image upscale: ${modelVersion}`);

    try {
      const prediction = await this.createPrediction(modelVersion, input);
      const result = await this.waitForPrediction(prediction.id, 300);
      
      return {
        success: true,
        url: Array.isArray(result.output) ? result.output[0] : result.output,
        metadata: {}
      };
    } catch (error) {
      throw this.normalizeError(error);
    }
  }

  /**
   * Create a prediction
   */
  async createPrediction(version, input) {
    const payload = { version, input };
    
    if (this.webhookUrl) {
      payload.webhook = this.webhookUrl;
      payload.webhook_events_filter = ['completed'];
    }

    const response = await axios.post(`${this.baseUrl}/predictions`, payload, {
      headers: this.getHeaders()
    });

    return response.data;
  }

  /**
   * Wait for prediction to complete
   */
  async waitForPrediction(predictionId, maxWaitSeconds = 300) {
    const startTime = Date.now();
    const maxWaitTime = maxWaitSeconds * 1000;
    const pollInterval = 2000;

    while ((Date.now() - startTime) < maxWaitTime) {
      const response = await axios.get(
        `${this.baseUrl}/predictions/${predictionId}`,
        { headers: this.getHeaders() }
      );

      const prediction = response.data;
      const elapsed = Math.round((Date.now() - startTime) / 1000);

      this.log('info', `Status: ${prediction.status} (${elapsed}s)`);

      if (prediction.status === 'succeeded') {
        return prediction;
      }

      if (prediction.status === 'failed') {
        throw new Error(prediction.error || 'Prediction failed');
      }

      if (prediction.status === 'canceled') {
        throw new Error('Prediction was canceled');
      }

      await new Promise(r => setTimeout(r, pollInterval));
    }

    throw new Error('Prediction timed out');
  }

  /**
   * Check prediction status
   */
  async checkStatus(predictionId) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/predictions/${predictionId}`,
        { headers: this.getHeaders() }
      );

      const prediction = response.data;
      
      return {
        status: prediction.status === 'succeeded' ? 'completed' : 
                prediction.status === 'failed' ? 'failed' : 'pending',
        progress: prediction.progress,
        url: prediction.status === 'succeeded' ? 
             (Array.isArray(prediction.output) ? prediction.output[0] : prediction.output) : null,
        error: prediction.error
      };
    } catch (error) {
      throw this.normalizeError(error);
    }
  }

  /**
   * Cancel prediction
   */
  async cancelGeneration(predictionId) {
    try {
      await axios.post(
        `${this.baseUrl}/predictions/${predictionId}/cancel`,
        {},
        { headers: this.getHeaders() }
      );
      return true;
    } catch (error) {
      this.log('warn', 'Cancel request failed', { error: error.message });
      return false;
    }
  }

  /**
   * Get model version string
   */
  getModelVersion(model, type) {
    // Check provider-specific config
    if (model.providerConfig?.replicate?.version) {
      return model.providerConfig.replicate.version;
    }

    // Replicate model versions (examples)
    const versionMap = {
      'flux-pro': 'black-forest-labs/flux-pro',
      'flux-schnell': 'black-forest-labs/flux-schnell',
      'sdxl': 'stability-ai/sdxl',
      'stable-video': 'stability-ai/stable-video-diffusion',
    };

    return versionMap[model.id] || model.id;
  }

  /**
   * Build image generation input
   */
  buildImageInput(model, prompt, options = {}, inputImages = []) {
    const input = { prompt };

    // Map common options to Replicate format
    if (options.num_images) input.num_outputs = options.num_images;
    if (options.guidance_scale) input.guidance_scale = parseFloat(options.guidance_scale);
    if (options.num_inference_steps) input.num_inference_steps = parseInt(options.num_inference_steps);

    // Size handling
    if (options.image_size) {
      const sizeMap = {
        'square_hd': { width: 1024, height: 1024 },
        'portrait_4_3': { width: 768, height: 1024 },
        'portrait_16_9': { width: 768, height: 1344 },
        'landscape_4_3': { width: 1024, height: 768 },
        'landscape_16_9': { width: 1344, height: 768 },
      };
      const size = sizeMap[options.image_size];
      if (size) {
        input.width = size.width;
        input.height = size.height;
      }
    }

    // Input image for img2img
    if (inputImages?.length > 0) {
      input.image = inputImages[0];
      if (options.strength) input.prompt_strength = parseFloat(options.strength);
    }

    return input;
  }

  /**
   * Build video generation input
   */
  buildVideoInput(model, prompt, options = {}, inputImages = []) {
    const input = { prompt };

    if (options.num_frames) input.video_length = parseInt(options.num_frames);
    if (options.fps) input.fps = parseInt(options.fps);
    if (options.guidance_scale) input.guidance_scale = parseFloat(options.guidance_scale);

    // Input image for img2vid
    if (inputImages?.length > 0) {
      input.image = inputImages[0];
    }

    return input;
  }

  /**
   * Normalize image response
   */
  normalizeImageResponse(prediction) {
    const output = prediction.output;
    const urls = Array.isArray(output) ? output : [output];

    if (urls.length === 0 || !urls[0]) {
      throw new Error('No image in response');
    }

    return {
      success: true,
      urls,
      url: urls[0],
      seed: prediction.metrics?.predict_time,
      metadata: {
        predictTime: prediction.metrics?.predict_time
      }
    };
  }

  /**
   * Normalize video response
   */
  normalizeVideoResponse(prediction) {
    const url = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;

    if (!url) {
      throw new Error('No video in response');
    }

    return {
      success: true,
      url,
      thumbnailUrl: null,
      metadata: {
        predictTime: prediction.metrics?.predict_time
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
    normalized.provider = 'replicate';
    normalized.originalError = error;
    
    return normalized;
  }

  /**
   * Get request headers
   */
  getHeaders() {
    return {
      'Authorization': `Token ${this.apiKey}`,
      'Content-Type': 'application/json'
    };
  }
}

module.exports = ReplicateProvider;
