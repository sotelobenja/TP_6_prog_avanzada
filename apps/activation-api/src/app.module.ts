import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { KafkaToolkitModule } from '@activation-poc/kafka-toolkit';
import { Activation, ActivationSchema } from './activation.schema';
import { ActivationService } from './activation.service';
import { ActivationController } from './activation.controller';
import { ActivationEventsController } from './activation.events';
import { ActivationGateway } from './activation.gateway';
import { HealthController } from './health.controller';

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGO_URI || 'mongodb://localhost:27017/activation'),
    MongooseModule.forFeature([{ name: Activation.name, schema: ActivationSchema }]),
    KafkaToolkitModule,
  ],
  controllers: [HealthController, ActivationController, ActivationEventsController],
  providers: [ActivationService, ActivationGateway],
})
export class AppModule {}
