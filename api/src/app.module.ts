import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

// Config
import { configuration } from './config/configuration';

// Database
import { DatabaseModule } from './database/database.module';

// Feature Modules
import { AuthModule } from './modules/auth/auth.module';
import { ModelsModule } from './modules/models/models.module';
import { GenerationsModule } from './modules/generations/generations.module';
import { ChatModule } from './modules/chat/chat.module';
import { WorkspacesModule } from './modules/workspaces/workspaces.module';
import { AdminModule } from './modules/admin/admin.module';
import { CommunityModule } from './modules/community/community.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { UpscaleModule } from './modules/upscale/upscale.module';
import { SettingsModule } from './modules/settings/settings.module';

// Providers
import { ProvidersModule } from './providers/providers.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env', '../.env'],
    }),

    // Database
    DatabaseModule,

    // AI Providers
    ProvidersModule,

    // Feature Modules
    AuthModule,
    ModelsModule,
    GenerationsModule,
    ChatModule,
    WorkspacesModule,
    AdminModule,
    CommunityModule,
    PaymentsModule,
    ProjectsModule,
    UpscaleModule,
    SettingsModule,
  ],
})
export class AppModule {}
