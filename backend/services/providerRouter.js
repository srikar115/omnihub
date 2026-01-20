/**
 * Provider Router Service
 * 
 * Handles intelligent routing of generation requests to AI providers.
 * Features:
 * - Automatic failover between providers
 * - Health checking
 * - Cost-based routing
 * - Provider preference per model
 * - Error logging and metrics
 */

const { getProvider, getAvailableProviders } = require('../providers');
const { getModel, getProviderConfig, calculateCost } = require('../models/modelRegistry');

// Track provider health
const providerHealth = new Map();
const HEALTH_CHECK_INTERVAL = 60000; // 1 minute
const FAILURE_THRESHOLD = 3; // Failures before marking unhealthy
const RECOVERY_TIME = 300000; // 5 minutes before retry

/**
 * Generate content using the best available provider
 * 
 * @param {string} modelId - Model ID from registry
 * @param {string} type - 'image' | 'video' | 'upscale'
 * @param {Object} params - Generation parameters
 * @param {string} params.prompt - Text prompt
 * @param {Object} params.options - Generation options
 * @param {Array<string>} params.inputImages - Input images for img2img/upscale
 * @param {Function} getSetting - Function to get settings from DB
 * @param {Function} logError - Function to log errors
 * @param {Object} context - Additional context (db, genId, etc.)
 * @returns {Promise<GenerationResult>}
 */
async function generate(modelId, type, params, getSetting, logError, context = {}) {
  const model = getModel(modelId);
  if (!model) {
    throw new Error(`Unknown model: ${modelId}`);
  }

  const { prompt, options = {}, inputImages = [] } = params;
  
  // Build provider order: default first, then fallbacks
  const providerOrder = [
    model.defaultProvider,
    ...(model.fallbackOrder || [])
  ].filter(p => p && model.providers?.[p]);

  // Track attempts for logging
  const attempts = [];
  let lastError = null;

  for (const providerId of providerOrder) {
    // Check provider health
    if (!isProviderHealthy(providerId)) {
      attempts.push({ provider: providerId, skipped: true, reason: 'unhealthy' });
      continue;
    }

    try {
      const provider = getProvider(providerId, getSetting);
      
      // Check if provider is available
      if (!await provider.isAvailable()) {
        attempts.push({ provider: providerId, skipped: true, reason: 'unavailable' });
        markProviderFailure(providerId);
        continue;
      }

      // Get provider-specific model config
      const providerConfig = getProviderConfig(modelId, providerId);
      const modelWithProvider = {
        ...model,
        ...providerConfig,
        providerConfig: { [providerId]: providerConfig }
      };

      // Generate based on type
      let result;
      switch (type) {
        case 'image':
          result = await provider.generateImage(modelWithProvider, prompt, options, inputImages);
          break;
        case 'video':
          result = await provider.generateVideo(
            modelWithProvider, 
            prompt, 
            options, 
            inputImages,
            context.genId,
            context.db
          );
          break;
        case 'upscale':
          if (options.sourceType === 'video') {
            result = await provider.upscaleVideo(
              modelWithProvider,
              inputImages[0],
              options,
              context.genId,
              context.db
            );
          } else {
            result = await provider.upscaleImage(modelWithProvider, inputImages[0], options);
          }
          break;
        default:
          throw new Error(`Unknown generation type: ${type}`);
      }

      // Success! Mark provider healthy
      markProviderSuccess(providerId);

      return {
        success: true,
        provider: providerId,
        result,
        attempts,
        cost: calculateCost(modelId, providerId, options)
      };

    } catch (error) {
      lastError = error;
      markProviderFailure(providerId);
      
      attempts.push({
        provider: providerId,
        error: error.message,
        status: error.status
      });

      // Log failover
      if (logError) {
        logError(
          'provider_failover',
          context.userId,
          context.genId,
          providerId,
          'failover',
          error.message,
          null,
          { modelId, attempts: attempts.length, nextProvider: providerOrder[attempts.length] }
        );
      }

      // Continue to next provider
      continue;
    }
  }

  // All providers failed
  throw new Error(
    lastError?.message || 
    `All providers failed for model ${modelId}: ${attempts.map(a => a.provider).join(', ')}`
  );
}

/**
 * Generate image specifically
 */
async function generateImage(modelId, prompt, options, inputImages, getSetting, logError, context) {
  return generate(modelId, 'image', { prompt, options, inputImages }, getSetting, logError, context);
}

/**
 * Generate video specifically
 */
async function generateVideo(modelId, prompt, options, inputImages, getSetting, logError, context) {
  return generate(modelId, 'video', { prompt, options, inputImages }, getSetting, logError, context);
}

/**
 * Upscale image or video
 */
async function upscale(modelId, sourceUrl, options, getSetting, logError, context) {
  return generate(modelId, 'upscale', { 
    prompt: '', 
    options, 
    inputImages: [sourceUrl] 
  }, getSetting, logError, context);
}

/**
 * Check if provider is healthy
 */
function isProviderHealthy(providerId) {
  const health = providerHealth.get(providerId);
  if (!health) return true; // Unknown = assume healthy
  
  // If marked unhealthy, check if recovery time has passed
  if (!health.healthy && health.lastFailure) {
    const timeSinceFailure = Date.now() - health.lastFailure;
    if (timeSinceFailure > RECOVERY_TIME) {
      // Reset and try again
      providerHealth.delete(providerId);
      return true;
    }
    return false;
  }
  
  return health.healthy;
}

/**
 * Mark provider as failed
 */
function markProviderFailure(providerId) {
  const health = providerHealth.get(providerId) || { 
    healthy: true, 
    failures: 0, 
    successes: 0 
  };
  
  health.failures++;
  health.lastFailure = Date.now();
  
  if (health.failures >= FAILURE_THRESHOLD) {
    health.healthy = false;
    console.log(`[ROUTER] Provider ${providerId} marked unhealthy after ${health.failures} failures`);
  }
  
  providerHealth.set(providerId, health);
}

/**
 * Mark provider as successful
 */
function markProviderSuccess(providerId) {
  const health = providerHealth.get(providerId) || { 
    healthy: true, 
    failures: 0, 
    successes: 0 
  };
  
  health.successes++;
  health.healthy = true;
  health.failures = 0; // Reset failure count on success
  
  providerHealth.set(providerId, health);
}

/**
 * Get current health status of all providers
 */
function getHealthStatus() {
  const status = {};
  for (const [id, health] of providerHealth) {
    status[id] = {
      healthy: health.healthy,
      failures: health.failures,
      successes: health.successes,
      lastFailure: health.lastFailure
    };
  }
  return status;
}

/**
 * Force health check on a provider
 */
async function checkProviderHealth(providerId, getSetting) {
  try {
    const provider = getProvider(providerId, getSetting);
    const available = await provider.isAvailable();
    
    if (available) {
      markProviderSuccess(providerId);
    } else {
      markProviderFailure(providerId);
    }
    
    return available;
  } catch (error) {
    markProviderFailure(providerId);
    return false;
  }
}

/**
 * Get best provider for a model based on health and cost
 */
async function getBestProvider(modelId, getSetting) {
  const model = getModel(modelId);
  if (!model) return null;

  const providerOrder = [
    model.defaultProvider,
    ...(model.fallbackOrder || [])
  ].filter(p => p && model.providers?.[p]);

  for (const providerId of providerOrder) {
    if (isProviderHealthy(providerId)) {
      try {
        const provider = getProvider(providerId, getSetting);
        if (await provider.isAvailable()) {
          return {
            id: providerId,
            provider,
            config: model.providers[providerId],
            cost: model.providers[providerId].cost || model.baseCost
          };
        }
      } catch (error) {
        continue;
      }
    }
  }

  return null;
}

/**
 * Reset all health tracking (useful for testing)
 */
function resetHealth() {
  providerHealth.clear();
}

module.exports = {
  // Main generation functions
  generate,
  generateImage,
  generateVideo,
  upscale,
  
  // Health management
  isProviderHealthy,
  markProviderFailure,
  markProviderSuccess,
  getHealthStatus,
  checkProviderHealth,
  resetHealth,
  
  // Provider selection
  getBestProvider,
};
