/**
 * SelfHostedProvider - Self-Hosted/Local AI Provider Implementation
 * 
 * Implements the BaseProvider interface for self-hosted AI models.
 * Supports ComfyUI, Automatic1111, and custom endpoints.
 * 
 * Features:
 * - Local GPU utilization
 * - Custom model paths
 * - No external API costs
 * - Full control over generation
 * 
 * Supported backends:
 * - ComfyUI (with API mode enabled)
 * - Automatic1111/Stable Diffusion WebUI
 * - Custom REST endpoints
 */

const axios = require('axios');
const BaseProvider = require('./BaseProvider');

class SelfHostedProvider extends BaseProvider {
  constructor(apiKey, config = {}) {
    super(apiKey, config);
    this.name = 'selfhosted';
    this.baseUrl = config.baseUrl || 'http://localhost:7860';
    this.backend = config.backend || 'automatic1111'; // 'comfyui' | 'automatic1111' | 'custom'
  }

  /**
   * Check if self-hosted server is available
   */
  async isAvailable() {
    try {
      const healthEndpoint = this.getHealthEndpoint();
      const response = await axios.get(healthEndpoint, { timeout: 5000 });
      return response.status === 200;
    } catch (error) {
      this.log('warn', 'Self-hosted server not available', { error: error.message });
      return false;
    }
  }

  /**
   * Generate image(s)
   */
  async generateImage(model, prompt, options = {}, inputImages = []) {
    this.log('info', `Image generation via ${this.backend}`, { 
      model: model.id,
      hasInputImages: inputImages.length > 0 
    });

    try {
      switch (this.backend) {
        case 'comfyui':
          return await this.generateComfyUI(model, prompt, options, inputImages);
        case 'automatic1111':
          return await this.generateAutomatic1111(model, prompt, options, inputImages);
        default:
          return await this.generateCustom(model, prompt, options, inputImages);
      }
    } catch (error) {
      this.log('error', 'Image generation failed', { error: error.message });
      throw this.normalizeError(error);
    }
  }

  /**
   * Generate video (limited support)
   */
  async generateVideo(model, prompt, options = {}, inputImages = []) {
    this.log('info', 'Video generation via self-hosted', { model: model.id });

    // Self-hosted video generation typically requires specialized setup
    // This is a placeholder for custom implementations
    throw new Error('Video generation not supported for self-hosted provider. Configure a workflow or use cloud providers.');
  }

  /**
   * Generate via ComfyUI
   */
  async generateComfyUI(model, prompt, options = {}, inputImages = []) {
    const workflow = this.buildComfyWorkflow(model, prompt, options, inputImages);
    
    // Submit workflow
    const response = await axios.post(`${this.baseUrl}/prompt`, {
      prompt: workflow
    });

    const promptId = response.data.prompt_id;

    // Poll for result
    const result = await this.pollComfyUI(promptId);
    
    return this.normalizeComfyResponse(result);
  }

  /**
   * Generate via Automatic1111
   */
  async generateAutomatic1111(model, prompt, options = {}, inputImages = []) {
    const endpoint = inputImages?.length > 0 ? '/sdapi/v1/img2img' : '/sdapi/v1/txt2img';
    
    const payload = {
      prompt,
      negative_prompt: options.negative_prompt || '',
      steps: options.steps || 30,
      cfg_scale: options.guidance_scale || 7,
      width: options.width || 1024,
      height: options.height || 1024,
      batch_size: options.num_images || 1,
      sampler_name: options.sampler || 'DPM++ 2M Karras',
    };

    // Handle size presets
    if (options.image_size) {
      const sizes = this.parseSizePreset(options.image_size);
      payload.width = sizes.width;
      payload.height = sizes.height;
    }

    // Add input image for img2img
    if (inputImages?.length > 0) {
      // Fetch and convert to base64 if it's a URL
      const imageBase64 = await this.fetchImageAsBase64(inputImages[0]);
      payload.init_images = [imageBase64];
      payload.denoising_strength = options.strength || 0.75;
    }

    // Override model if specified
    if (model.providerConfig?.selfhosted?.checkpoint) {
      await this.setA1111Model(model.providerConfig.selfhosted.checkpoint);
    }

    const response = await axios.post(`${this.baseUrl}${endpoint}`, payload, {
      timeout: this.timeout
    });

    return this.normalizeA1111Response(response.data);
  }

  /**
   * Generate via custom endpoint
   */
  async generateCustom(model, prompt, options = {}, inputImages = []) {
    const endpoint = model.providerConfig?.selfhosted?.endpoint || '/generate';
    
    const payload = {
      prompt,
      options,
      input_images: inputImages
    };

    const response = await axios.post(`${this.baseUrl}${endpoint}`, payload, {
      headers: this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {},
      timeout: this.timeout
    });

    // Expect standard response format
    return {
      success: true,
      urls: response.data.images || [response.data.image],
      url: response.data.images?.[0] || response.data.image,
      metadata: response.data.metadata || {}
    };
  }

  /**
   * Poll ComfyUI for result
   */
  async pollComfyUI(promptId) {
    const maxWait = 300000; // 5 minutes
    const startTime = Date.now();
    
    while ((Date.now() - startTime) < maxWait) {
      await new Promise(r => setTimeout(r, 1000));
      
      const response = await axios.get(`${this.baseUrl}/history/${promptId}`);
      
      if (response.data[promptId]) {
        const result = response.data[promptId];
        if (result.status?.completed) {
          return result;
        }
        if (result.status?.status_str === 'error') {
          throw new Error('ComfyUI workflow failed');
        }
      }
    }
    
    throw new Error('ComfyUI workflow timed out');
  }

  /**
   * Build ComfyUI workflow (simplified - real implementation would be more complex)
   */
  buildComfyWorkflow(model, prompt, options = {}, inputImages = []) {
    // This is a simplified example - real workflows are much more complex
    // In production, you'd load workflow templates from files
    return {
      '3': {
        inputs: {
          text: prompt,
          clip: ['4', 0]
        },
        class_type: 'CLIPTextEncode'
      },
      // ... more nodes would be here
    };
  }

  /**
   * Set Automatic1111 model
   */
  async setA1111Model(modelName) {
    try {
      await axios.post(`${this.baseUrl}/sdapi/v1/options`, {
        sd_model_checkpoint: modelName
      });
    } catch (error) {
      this.log('warn', 'Failed to set model', { model: modelName, error: error.message });
    }
  }

  /**
   * Fetch image and convert to base64
   */
  async fetchImageAsBase64(url) {
    // If already base64, return as-is
    if (url.startsWith('data:')) {
      return url.split(',')[1];
    }

    const response = await axios.get(url, { responseType: 'arraybuffer' });
    return Buffer.from(response.data).toString('base64');
  }

  /**
   * Parse size preset to dimensions
   */
  parseSizePreset(preset) {
    const sizes = {
      'square_hd': { width: 1024, height: 1024 },
      'square': { width: 512, height: 512 },
      'portrait_4_3': { width: 768, height: 1024 },
      'portrait_16_9': { width: 768, height: 1344 },
      'landscape_4_3': { width: 1024, height: 768 },
      'landscape_16_9': { width: 1344, height: 768 },
    };
    return sizes[preset] || sizes['square_hd'];
  }

  /**
   * Get health check endpoint
   */
  getHealthEndpoint() {
    switch (this.backend) {
      case 'comfyui':
        return `${this.baseUrl}/system_stats`;
      case 'automatic1111':
        return `${this.baseUrl}/sdapi/v1/sd-models`;
      default:
        return `${this.baseUrl}/health`;
    }
  }

  /**
   * Check generation status (for async workflows)
   */
  async checkStatus(requestId) {
    if (this.backend === 'comfyui') {
      const response = await axios.get(`${this.baseUrl}/history/${requestId}`);
      const result = response.data[requestId];
      
      return {
        status: result?.status?.completed ? 'completed' : 
                result?.status?.status_str === 'error' ? 'failed' : 'pending',
        progress: result?.status?.progress
      };
    }
    
    return { status: 'unknown' };
  }

  /**
   * Cancel generation
   */
  async cancelGeneration(requestId) {
    if (this.backend === 'comfyui') {
      try {
        await axios.post(`${this.baseUrl}/interrupt`);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }

  /**
   * Normalize Automatic1111 response
   */
  normalizeA1111Response(data) {
    const images = data.images || [];
    
    if (images.length === 0) {
      throw new Error('No images in response');
    }

    // A1111 returns base64 images - convert to data URLs
    const urls = images.map(img => `data:image/png;base64,${img}`);

    return {
      success: true,
      urls,
      url: urls[0],
      seed: data.info ? JSON.parse(data.info).seed : null,
      metadata: {
        info: data.info
      }
    };
  }

  /**
   * Normalize ComfyUI response
   */
  normalizeComfyResponse(data) {
    // ComfyUI outputs are in the outputs field
    const outputs = Object.values(data.outputs || {})[0];
    const images = outputs?.images || [];

    if (images.length === 0) {
      throw new Error('No images in ComfyUI output');
    }

    // Build URLs from ComfyUI output info
    const urls = images.map(img => 
      `${this.baseUrl}/view?filename=${img.filename}&subfolder=${img.subfolder}&type=${img.type}`
    );

    return {
      success: true,
      urls,
      url: urls[0],
      metadata: {}
    };
  }

  /**
   * Normalize error
   */
  normalizeError(error) {
    const message = error.response?.data?.error || 
                   error.response?.data?.detail ||
                   error.message;
    
    const normalized = new Error(message);
    normalized.status = error.response?.status;
    normalized.provider = 'selfhosted';
    normalized.originalError = error;
    
    return normalized;
  }
}

module.exports = SelfHostedProvider;
