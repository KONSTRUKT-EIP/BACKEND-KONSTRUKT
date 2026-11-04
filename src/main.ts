import { setDefaultAutoSelectFamilyAttemptTimeout } from 'node:net';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

// Par défaut, Node n'attend que 250 ms par adresse (IPv6 puis IPv4) avant d'abandonner une connexion.
// C'est trop court pour les API externes lointaines (météo) : les appels échouaient en ETIMEDOUT.
setDefaultAutoSelectFamilyAttemptTimeout(2000);

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Konstrukt API')
    .setDescription('API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
