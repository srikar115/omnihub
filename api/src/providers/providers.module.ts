import { Module, Global } from '@nestjs/common';
import { FalProvider } from './fal.provider';
import { ProviderRouterService } from './provider-router.service';

@Global()
@Module({
  providers: [FalProvider, ProviderRouterService],
  exports: [FalProvider, ProviderRouterService],
})
export class ProvidersModule {}
