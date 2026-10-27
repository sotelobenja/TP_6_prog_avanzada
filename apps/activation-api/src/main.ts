import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { kafkaMicroserviceOptions } from '@activation-poc/kafka-toolkit';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.connectMicroservice(
    kafkaMicroserviceOptions({
      clientId: process.env.KAFKA_CLIENT_ID || 'activation-api',
      groupId: process.env.KAFKA_GROUP_ID || 'activation-api',
    }),
  );
  await app.startAllMicroservices();
  await app.listen(Number(process.env.PORT || 3000), '0.0.0.0');
}

bootstrap();
