/**
 * Model Registry - Unified Model Configuration
 * 
 * This registry provides a provider-agnostic way to define models.
 * Each model can have multiple provider configurations, allowing
 * automatic failover between providers.
 * 
 * Structure:
 * - Models are defined once with unified options
 * - Provider-specific endpoints and configs are nested under 'providers'
 * - Default provider and fallback order can be specified
 */

/**
 * Model Registry
 * 
 * Key: Internal model ID
 * Value: Model configuration
 */
const MODEL_REGISTRY = {
  // ============================================
  // IMAGE MODELS
  // ============================================
  
  // FLUX Models
  'flux-pro-1.1': {
    name: 'FLUX 1.1 Pro',
    type: 'image',
    category: 'text-to-image',
    tags: ['photorealistic', 'pro', 'high-quality'],
    displayOrder: 1,
    
    // Base pricing (can be overridden per provider)
    baseCost: 0.04,
    
    // Unified options (provider adapters translate these)
    options: {
      image_size: {
        label: 'Image Size',
        type: 'select',
        default: 'landscape_16_9',
        choices: [
          { value: 'square_hd', label: '1024×1024', priceMultiplier: 1 },
          { value: 'portrait_4_3', label: '768×1024', priceMultiplier: 1 },
          { value: 'portrait_16_9', label: '768×1344', priceMultiplier: 1.3 },
          { value: 'landscape_4_3', label: '1024×768', priceMultiplier: 1 },
          { value: 'landscape_16_9', label: '1344×768', priceMultiplier: 1.3 },
        ]
      },
      num_images: {
        label: 'Number of Images',
        type: 'select',
        default: '1',
        choices: [
          { value: '1', label: '1', priceMultiplier: 1 },
          { value: '2', label: '2', priceMultiplier: 2 },
          { value: '4', label: '4', priceMultiplier: 4 },
        ]
      }
    },
    
    // Provider-specific configurations
    providers: {
      fal: {
        endpoint: 'fal-ai/flux-pro/v1.1',
        textToImageEndpoint: 'fal-ai/flux-pro/v1.1',
        cost: 0.04,
      },
      replicate: {
        version: 'black-forest-labs/flux-pro',
        cost: 0.05,
      },
      selfhosted: {
        checkpoint: 'flux1-pro-v1.1.safetensors',
        cost: 0,
      }
    },
    
    defaultProvider: 'fal',
    fallbackOrder: ['replicate', 'selfhosted'],
  },

  'flux-schnell': {
    name: 'FLUX Schnell',
    type: 'image',
    category: 'text-to-image',
    tags: ['fast', 'budget', 'good-quality'],
    displayOrder: 5,
    baseCost: 0.003,
    
    options: {
      image_size: {
        label: 'Image Size',
        type: 'select',
        default: 'landscape_16_9',
        choices: [
          { value: 'square_hd', label: '1024×1024', priceMultiplier: 1 },
          { value: 'portrait_4_3', label: '768×1024', priceMultiplier: 1 },
          { value: 'landscape_4_3', label: '1024×768', priceMultiplier: 1 },
          { value: 'landscape_16_9', label: '1344×768', priceMultiplier: 1 },
        ]
      }
    },
    
    providers: {
      fal: {
        endpoint: 'fal-ai/flux/schnell',
        cost: 0.003,
      },
      replicate: {
        version: 'black-forest-labs/flux-schnell',
        cost: 0.003,
      }
    },
    
    defaultProvider: 'fal',
    fallbackOrder: ['replicate'],
  },

  'flux-dev': {
    name: 'FLUX Dev',
    type: 'image',
    category: 'both',
    tags: ['balanced', 'versatile'],
    displayOrder: 3,
    baseCost: 0.025,
    imageInput: 'optional',
    maxInputImages: 1,
    
    options: {
      image_size: {
        label: 'Image Size',
        type: 'select',
        default: 'landscape_16_9',
        choices: [
          { value: 'square_hd', label: '1024×1024', priceMultiplier: 1 },
          { value: 'portrait_16_9', label: '768×1344', priceMultiplier: 1.3 },
          { value: 'landscape_16_9', label: '1344×768', priceMultiplier: 1.3 },
        ]
      },
      guidance_scale: {
        label: 'Guidance Scale',
        type: 'select',
        default: '3.5',
        choices: [
          { value: '2', label: '2 (Creative)', priceMultiplier: 1 },
          { value: '3.5', label: '3.5 (Default)', priceMultiplier: 1 },
          { value: '5', label: '5 (Precise)', priceMultiplier: 1 },
        ]
      }
    },
    
    providers: {
      fal: {
        endpoint: 'fal-ai/flux/dev',
        textToImageEndpoint: 'fal-ai/flux/dev',
        imageToImageEndpoint: 'fal-ai/flux/dev/image-to-image',
        cost: 0.025,
      },
      replicate: {
        version: 'black-forest-labs/flux-dev',
        cost: 0.03,
      }
    },
    
    defaultProvider: 'fal',
    fallbackOrder: ['replicate'],
  },

  // ============================================
  // VIDEO MODELS
  // ============================================

  'kling-v2.6-pro': {
    name: 'Kling 2.6 Pro',
    type: 'video',
    category: 'text-to-video',
    tags: ['cinematic', 'pro', 'high-quality'],
    displayOrder: 1,
    baseCost: 0.07,
    maxWaitTime: 600,
    
    options: {
      duration: {
        label: 'Duration',
        type: 'select',
        default: '5',
        choices: [
          { value: '5', label: '5 seconds', priceMultiplier: 1 },
          { value: '10', label: '10 seconds', priceMultiplier: 2 },
        ]
      },
      aspect_ratio: {
        label: 'Aspect Ratio',
        type: 'select',
        default: '16:9',
        choices: [
          { value: '16:9', label: '16:9 (Landscape)', priceMultiplier: 1 },
          { value: '9:16', label: '9:16 (Portrait)', priceMultiplier: 1 },
          { value: '1:1', label: '1:1 (Square)', priceMultiplier: 1 },
        ]
      }
    },
    
    providers: {
      fal: {
        endpoint: 'fal-ai/kling-video/v2.6/pro/text-to-video',
        cost: 0.07,
      }
    },
    
    defaultProvider: 'fal',
    fallbackOrder: [],
  },

  'minimax-video': {
    name: 'MiniMax Video',
    type: 'video',
    category: 'text-to-video',
    tags: ['fast', 'affordable'],
    displayOrder: 5,
    baseCost: 0.20,
    maxWaitTime: 300,
    
    options: {
      prompt_optimizer: {
        label: 'Prompt Optimizer',
        type: 'select',
        default: 'true',
        choices: [
          { value: 'true', label: 'Enabled', priceMultiplier: 1 },
          { value: 'false', label: 'Disabled', priceMultiplier: 1 },
        ]
      }
    },
    
    providers: {
      fal: {
        endpoint: 'fal-ai/minimax/video-01',
        cost: 0.20,
      }
    },
    
    defaultProvider: 'fal',
    fallbackOrder: [],
  },

  // ============================================
  // UPSCALE MODELS
  // ============================================

  'crystal-upscaler': {
    name: 'Crystal Upscaler',
    type: 'image',
    category: 'upscale',
    tags: ['upscale', 'enhance', '4k'],
    displayOrder: 90,
    baseCost: 0.016,
    imageInput: 'required',
    maxInputImages: 1,
    
    options: {
      scale_factor: {
        label: 'Scale Factor',
        type: 'select',
        default: '2',
        choices: [
          { value: '2', label: '2x', priceMultiplier: 4 },
          { value: '4', label: '4x (4K)', priceMultiplier: 16 },
        ]
      },
      creativity: {
        label: 'Creativity',
        type: 'select',
        default: '0',
        choices: [
          { value: '0', label: 'Preserve Details', priceMultiplier: 1 },
          { value: '5', label: 'Balanced', priceMultiplier: 1 },
          { value: '10', label: 'Maximum AI', priceMultiplier: 1 },
        ]
      }
    },
    
    providers: {
      fal: {
        endpoint: 'clarityai/crystal-upscaler',
        cost: 0.016,
      }
    },
    
    defaultProvider: 'fal',
    fallbackOrder: [],
  },
};

/**
 * Get model by ID
 * @param {string} modelId
 * @returns {Object|null}
 */
function getModel(modelId) {
  return MODEL_REGISTRY[modelId] || null;
}

/**
 * Get all models
 * @returns {Object}
 */
function getAllModels() {
  return MODEL_REGISTRY;
}

/**
 * Get models by type
 * @param {string} type - 'image' | 'video' | 'chat'
 * @returns {Array}
 */
function getModelsByType(type) {
  return Object.entries(MODEL_REGISTRY)
    .filter(([_, model]) => model.type === type)
    .map(([id, model]) => ({ id, ...model }))
    .sort((a, b) => a.displayOrder - b.displayOrder);
}

/**
 * Get models by category
 * @param {string} category
 * @returns {Array}
 */
function getModelsByCategory(category) {
  return Object.entries(MODEL_REGISTRY)
    .filter(([_, model]) => model.category === category)
    .map(([id, model]) => ({ id, ...model }))
    .sort((a, b) => a.displayOrder - b.displayOrder);
}

/**
 * Get provider config for a model
 * @param {string} modelId
 * @param {string} providerId
 * @returns {Object|null}
 */
function getProviderConfig(modelId, providerId) {
  const model = MODEL_REGISTRY[modelId];
  if (!model) return null;
  return model.providers?.[providerId] || null;
}

/**
 * Get cost for model + provider + options
 * @param {string} modelId
 * @param {string} providerId
 * @param {Object} options
 * @returns {number}
 */
function calculateCost(modelId, providerId, options = {}) {
  const model = MODEL_REGISTRY[modelId];
  if (!model) return 0;
  
  const providerConfig = model.providers?.[providerId];
  let cost = providerConfig?.cost || model.baseCost || 0;
  
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
 * Get all models that support a specific provider
 * @param {string} providerId
 * @returns {Array}
 */
function getModelsForProvider(providerId) {
  return Object.entries(MODEL_REGISTRY)
    .filter(([_, model]) => model.providers?.[providerId])
    .map(([id, model]) => ({ id, ...model }));
}

/**
 * Check if model supports a provider
 * @param {string} modelId
 * @param {string} providerId
 * @returns {boolean}
 */
function modelSupportsProvider(modelId, providerId) {
  const model = MODEL_REGISTRY[modelId];
  return !!(model?.providers?.[providerId]);
}

module.exports = {
  MODEL_REGISTRY,
  getModel,
  getAllModels,
  getModelsByType,
  getModelsByCategory,
  getProviderConfig,
  calculateCost,
  getModelsForProvider,
  modelSupportsProvider,
};
