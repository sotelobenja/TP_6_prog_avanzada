import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { kafkaMicroserviceOptions } from '@activation-poc/kafka-toolkit';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.connectMicroservice(
    kafkaMicroserviceOptions({
      clientId: process.env.KAFKA_CLIENT_ID || 'billing-service',
      groupId: process.env.KAFKA_GROUP_ID || 'billing-svc',
    }),
  );
  await app.startAllMicroservices();
  await app.listen(Number(process.env.PORT || 3001), '0.0.0.0');
}

bootstrap();
