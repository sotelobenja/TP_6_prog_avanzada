import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { KafkaToolkitModule } from '@activation-poc/kafka-toolkit';
import { ProvisioningOrder, ProvisioningOrderSchema } from './provisioning.schema';
import { ProvisioningController } from './provisioning.controller';
import { ProvisioningService } from './provisioning.service';
import { HealthController } from './health.controller';

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGO_URI || 'mongodb://localhost:27017/provisioning'),
    MongooseModule.forFeature([{ name: ProvisioningOrder.name, schema: ProvisioningOrderSchema }]),
    KafkaToolkitModule,
  ],
  controllers: [HealthController, ProvisioningController],
  providers: [ProvisioningService],
})
export class AppModule {}
