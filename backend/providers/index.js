/**
 * Provider Registry
 * 
 * Central registry for all AI generation providers.
 * Provides factory methods to get provider instances.
 */

const BaseProvider = require('./BaseProvider');
const FalProvider = require('./FalProvider');
const ReplicateProvider = require('./ReplicateProvider');
const SelfHostedProvider = require('./SelfHostedProvider');

// Provider configuration
const PROVIDER_CONFIG = {
  fal: {
    name: 'Fal.ai',
    class: FalProvider,
    envKey: 'FAL_KEY',
    settingsKey: 'falApiKey',
    priority: 1,
  },
  replicate: {
    name: 'Replicate',
    class: ReplicateProvider,
    envKey: 'REPLICATE_API_TOKEN',
    settingsKey: 'replicateApiKey',
    priority: 2,
  },
  selfhosted: {
    name: 'Self-Hosted',
    class: SelfHostedProvider,
    envKey: 'SELFHOSTED_URL',
    settingsKey: 'selfhostedUrl',
    priority: 3,
  },
};

// Cached provider instances
const providerInstances = new Map();

/**
 * Get a provider instance
 * @param {string} providerId - Provider ID (fal, replicate, selfhosted)
 * @param {Function} getSettingFn - Function to get settings from DB
 * @returns {BaseProvider}
 */
function getProvider(providerId, getSettingFn) {
  // Return cached instance if available
  if (providerInstances.has(providerId)) {
    return providerInstances.get(providerId);
  }

  const config = PROVIDER_CONFIG[providerId];
  if (!config) {
    throw new Error(`Unknown provider: ${providerId}`);
  }

  // Get API key from settings or environment
  let apiKey = null;
  if (getSettingFn) {
    apiKey = getSettingFn(config.settingsKey);
  }
  if (!apiKey && config.envKey) {
    apiKey = process.env[config.envKey];
  }

  // Create provider instance
  const providerConfig = {};
  
  // Add self-hosted specific config
  if (providerId === 'selfhosted') {
    providerConfig.baseUrl = apiKey || process.env.SELFHOSTED_URL || 'http://localhost:7860';
    providerConfig.backend = process.env.SELFHOSTED_BACKEND || 'automatic1111';
    apiKey = null; // Self-hosted doesn't need an API key in the traditional sense
  }

  const instance = new config.class(apiKey, providerConfig);
  providerInstances.set(providerId, instance);
  
  return instance;
}

/**
 * Get all available providers
 * @param {Function} getSettingFn - Function to get settings from DB
 * @returns {Promise<Array<{id: string, name: string, available: boolean}>>}
 */
async function getAvailableProviders(getSettingFn) {
  const results = [];

  for (const [id, config] of Object.entries(PROVIDER_CONFIG)) {
    try {
      const provider = getProvider(id, getSettingFn);
      const available = await provider.isAvailable();
      results.push({
        id,
        name: config.name,
        available,
        priority: config.priority,
      });
    } catch (error) {
      results.push({
        id,
        name: config.name,
        available: false,
        priority: config.priority,
        error: error.message,
      });
    }
  }

  return results.sort((a, b) => a.priority - b.priority);
}

/**
 * Clear cached provider instances (useful for testing or config changes)
 */
function clearProviderCache() {
  providerInstances.clear();
}

/**
 * Get provider by priority that is available
 * @param {Function} getSettingFn - Function to get settings from DB
 * @param {string} [preferredProvider] - Preferred provider to try first
 * @returns {Promise<BaseProvider|null>}
 */
async function getFirstAvailableProvider(getSettingFn, preferredProvider = null) {
  const providerIds = Object.keys(PROVIDER_CONFIG)
    .sort((a, b) => PROVIDER_CONFIG[a].priority - PROVIDER_CONFIG[b].priority);

  // Try preferred provider first
  if (preferredProvider && PROVIDER_CONFIG[preferredProvider]) {
    const provider = getProvider(preferredProvider, getSettingFn);
    if (await provider.isAvailable()) {
      return provider;
    }
  }

  // Try others in priority order
  for (const id of providerIds) {
    if (id === preferredProvider) continue; // Already tried
    
    const provider = getProvider(id, getSettingFn);
    if (await provider.isAvailable()) {
      return provider;
    }
  }

  return null;
}

module.exports = {
  // Classes
  BaseProvider,
  FalProvider,
  ReplicateProvider,
  SelfHostedProvider,
  
  // Factory functions
  getProvider,
  getAvailableProviders,
  getFirstAvailableProvider,
  clearProviderCache,
  
  // Config
  PROVIDER_CONFIG,
};
