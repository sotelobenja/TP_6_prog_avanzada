import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { KafkaToolkitModule } from '@activation-poc/kafka-toolkit';
import { BillingAccount, BillingAccountSchema } from './billing.schema';
import { CompensationFlag, CompensationFlagSchema } from './flag.schema';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { HealthController } from './health.controller';

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGO_URI || 'mongodb://localhost:27017/billing'),
    MongooseModule.forFeature([
      { name: BillingAccount.name, schema: BillingAccountSchema },
      { name: CompensationFlag.name, schema: CompensationFlagSchema },
    ]),
    KafkaToolkitModule,
  ],
  controllers: [HealthController, BillingController],
  providers: [BillingService],
})
export class AppModule {}
