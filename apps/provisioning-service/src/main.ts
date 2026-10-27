import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { kafkaMicroserviceOptions } from '@activation-poc/kafka-toolkit';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.connectMicroservice(
    kafkaMicroserviceOptions({
      clientId: process.env.KAFKA_CLIENT_ID || 'provisioning-service',
      groupId: process.env.KAFKA_GROUP_ID || 'provisioning-svc',
    }),
  );
  await app.startAllMicroservices();
  await app.listen(Number(process.env.PORT || 3002), '0.0.0.0');
}

bootstrap();
