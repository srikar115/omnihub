import { Injectable } from '@nestjs/common';
import { FalProvider } from './fal.provider';

@Injectable()
export class ProviderRouterService {
  constructor(private falProvider: FalProvider) {}

  async generate(type: 'image' | 'video', modelConfig: any, prompt: string, options: any = {}) {
    // For now, route everything to Fal
    const endpoint = modelConfig.apiEndpoint || modelConfig.textToImageEndpoint;

    if (type === 'video') {
      return this.falProvider.generateVideo(endpoint, prompt, options);
    }

    return this.falProvider.generateImage(endpoint, prompt, options);
  }

  async getAvailableProviders() {
    return [
      { id: 'fal', name: 'Fal.ai', available: await this.falProvider.isAvailable() },
    ];
  }
}
