import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class FalProvider {
  private apiKey: string | undefined;
  private baseUrl = 'https://queue.fal.run';

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('providers.fal.apiKey');
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }

  async generateImage(endpoint: string, prompt: string, options: any = {}) {
    if (!this.apiKey) {
      throw new Error('Fal.ai API key not configured');
    }

    const response = await axios.post(
      `${this.baseUrl}/${endpoint}`,
      { prompt, ...options },
      {
        headers: {
          Authorization: `Key ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      },
    );

    return response.data;
  }

  async generateVideo(endpoint: string, prompt: string, options: any = {}) {
    return this.generateImage(endpoint, prompt, options);
  }

  async checkStatus(requestId: string) {
    const response = await axios.get(`${this.baseUrl}/requests/${requestId}/status`, {
      headers: { Authorization: `Key ${this.apiKey}` },
    });
    return response.data;
  }
}
