import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger API documentation
  const config = new DocumentBuilder()
    .setTitle('OmniHub API')
    .setDescription('OmniHub AI Generation Platform API Documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication endpoints')
    .addTag('models', 'AI model endpoints')
    .addTag('generations', 'Image/Video generation endpoints')
    .addTag('chat', 'Chat/Conversation endpoints')
    .addTag('workspaces', 'Workspace management endpoints')
    .addTag('admin', 'Admin panel endpoints')
    .addTag('community', 'Community/Sharing endpoints')
    .addTag('payments', 'Payment/Subscription endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);

  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                    OmniHub API Server                      ║
╠═══════════════════════════════════════════════════════════╣
║  🚀 Server running on: http://localhost:${port}              ║
║  📚 API Docs:          http://localhost:${port}/docs          ║
║  🔧 Environment:       ${process.env.NODE_ENV || 'development'}                     ║
╚═══════════════════════════════════════════════════════════╝
  `);
}

bootstrap();
