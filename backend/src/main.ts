import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  const frontendOrigin =
    process.env.FRONTEND_ORIGIN || 'http://localhost:3000';

  app.enableCors({
    origin: [frontendOrigin, 'http://127.0.0.1:3000'],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept'],
  });

  const port = Number(process.env.PORT || 3001);
  await app.listen(port);
  // Never log API keys
  console.log(`Cursor Personal API Explorer backend listening on :${port}`);
}
bootstrap();
