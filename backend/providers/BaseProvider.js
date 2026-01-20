/**
 * BaseProvider - Abstract base class for AI generation providers
 * 
 * All provider implementations must extend this class and implement
 * the required methods. This enables provider-agnostic generation
 * with automatic failover.
 * 
 * Supported providers:
 * - Fal.ai (default)
 * - Replicate
 * - Self-hosted (ComfyUI, Automatic1111)
 * - RunPod
 * - Modal
 */

class BaseProvider {
  /**
   * @param {string} apiKey - Provider API key
   * @param {Object} config - Provider-specific configuration
   */
  constructor(apiKey, config = {}) {
    if (new.target === BaseProvider) {
      throw new Error('BaseProvider is abstract and cannot be instantiated directly');
    }
    
    this.apiKey = apiKey;
    this.config = config;
    this.name = 'base';
    this.baseUrl = '';
    this.timeout = config.timeout || 300000; // 5 minutes default
    this.retryAttempts = config.retryAttempts || 3;
    this.retryDelay = config.retryDelay || 1000;
  }

  /**
   * Get provider name
   * @returns {string}
   */
  getName() {
    return this.name;
  }

  /**
   * Check if provider is configured and available
   * @returns {Promise<boolean>}
   */
  async isAvailable() {
    throw new Error('isAvailable() must be implemented by provider');
  }

  /**
   * Generate image(s) from prompt
   * @param {Object} model - Model configuration from registry
   * @param {string} prompt - Text prompt
   * @param {Object} options - Generation options (size, steps, etc.)
   * @param {Array<string>} inputImages - Input image URLs for img2img
   * @returns {Promise<GenerationResult>}
   */
  async generateImage(model, prompt, options = {}, inputImages = []) {
    throw new Error('generateImage() must be implemented by provider');
  }

  /**
   * Generate video from prompt or image
   * @param {Object} model - Model configuration from registry
   * @param {string} prompt - Text prompt
   * @param {Object} options - Generation options (duration, fps, etc.)
   * @param {Array<string>} inputImages - Input image URLs for img2vid
   * @returns {Promise<GenerationResult>}
   */
  async generateVideo(model, prompt, options = {}, inputImages = []) {
    throw new Error('generateVideo() must be implemented by provider');
  }

  /**
   * Upscale an image
   * @param {Object} model - Upscaler model configuration
   * @param {string} imageUrl - Image URL to upscale
   * @param {Object} options - Upscale options (scale factor, etc.)
   * @returns {Promise<GenerationResult>}
   */
  async upscaleImage(model, imageUrl, options = {}) {
    throw new Error('upscaleImage() must be implemented by provider');
  }

  /**
   * Upscale a video
   * @param {Object} model - Upscaler model configuration
   * @param {string} videoUrl - Video URL to upscale
   * @param {Object} options - Upscale options
   * @returns {Promise<GenerationResult>}
   */
  async upscaleVideo(model, videoUrl, options = {}) {
    throw new Error('upscaleVideo() must be implemented by provider');
  }

  /**
   * Check status of async generation
   * @param {string} requestId - Provider-specific request ID
   * @returns {Promise<StatusResult>}
   */
  async checkStatus(requestId) {
    throw new Error('checkStatus() must be implemented by provider');
  }

  /**
   * Cancel an in-progress generation
   * @param {string} requestId - Provider-specific request ID
   * @returns {Promise<boolean>}
   */
  async cancelGeneration(requestId) {
    throw new Error('cancelGeneration() must be implemented by provider');
  }

  /**
   * Normalize provider-specific response to unified format
   * @param {Object} rawResponse - Raw provider response
   * @param {string} type - 'image' | 'video'
   * @returns {GenerationResult}
   */
  normalizeResponse(rawResponse, type = 'image') {
    throw new Error('normalizeResponse() must be implemented by provider');
  }

  /**
   * Get cost for generation based on options
   * @param {Object} model - Model configuration
   * @param {Object} options - Generation options
   * @returns {number} - Cost in credits
   */
  calculateCost(model, options = {}) {
    let cost = model.baseCost || 0;
    
    // Apply option multipliers
    if (model.options && options) {
      for (const [key, value] of Object.entries(options)) {
        const optConfig = model.options[key];
        if (optConfig?.choices) {
          const choice = optConfig.choices.find(c => String(c.value) === String(value));
          if (choice?.priceMultiplier) {
            cost *= choice.priceMultiplier;
          }
        }
      }
    }
    
    return cost;
  }

  /**
   * Build request payload from unified options
   * @param {Object} model - Model configuration
   * @param {string} prompt - Text prompt
   * @param {Object} options - Generation options
   * @param {Array<string>} inputImages - Input image URLs
   * @returns {Object} - Provider-specific payload
   */
  buildPayload(model, prompt, options = {}, inputImages = []) {
    throw new Error('buildPayload() must be implemented by provider');
  }

  /**
   * Retry helper with exponential backoff
   * @param {Function} fn - Async function to retry
   * @param {number} attempts - Number of attempts
   * @returns {Promise<any>}
   */
  async retry(fn, attempts = this.retryAttempts) {
    let lastError;
    
    for (let i = 0; i < attempts; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        // Don't retry on certain errors
        if (this.isNonRetryableError(error)) {
          throw error;
        }
        
        // Wait before retry with exponential backoff
        if (i < attempts - 1) {
          const delay = this.retryDelay * Math.pow(2, i);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Check if error should not be retried
   * @param {Error} error
   * @returns {boolean}
   */
  isNonRetryableError(error) {
    const status = error.response?.status;
    
    // Don't retry client errors (except rate limits)
    if (status >= 400 && status < 500 && status !== 429) {
      return true;
    }
    
    // Don't retry content policy violations
    if (error.message?.includes('content') || error.message?.includes('policy')) {
      return true;
    }
    
    return false;
  }

  /**
   * Log provider activity
   * @param {string} level - 'info' | 'warn' | 'error'
   * @param {string} message
   * @param {Object} data
   */
  log(level, message, data = {}) {
    const prefix = `[${this.name.toUpperCase()}]`;
    const timestamp = new Date().toISOString();
    
    switch (level) {
      case 'error':
        console.error(`${prefix} ${message}`, data);
        break;
      case 'warn':
        console.warn(`${prefix} ${message}`, data);
        break;
      default:
        console.log(`${prefix} ${message}`, data);
    }
  }
}

/**
 * @typedef {Object} GenerationResult
 * @property {boolean} success - Whether generation succeeded
 * @property {string} [url] - Result URL (image or video)
 * @property {Array<string>} [urls] - Multiple result URLs (for batch)
 * @property {string} [thumbnailUrl] - Thumbnail URL
 * @property {string} [requestId] - Provider request ID (for async)
 * @property {string} [status] - 'completed' | 'pending' | 'failed'
 * @property {number} [seed] - Generation seed
 * @property {Object} [metadata] - Additional metadata
 * @property {string} [error] - Error message if failed
 */

/**
 * @typedef {Object} StatusResult
 * @property {string} status - 'pending' | 'processing' | 'completed' | 'failed'
 * @property {number} [progress] - Progress percentage (0-100)
 * @property {string} [url] - Result URL if completed
 * @property {string} [error] - Error message if failed
 * @property {number} [queuePosition] - Position in queue
 */

module.exports = BaseProvider;
