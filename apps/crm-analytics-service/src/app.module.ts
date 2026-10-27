import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { KafkaToolkitModule } from '@activation-poc/kafka-toolkit';
import { CrmAnalyticsController } from './crm.controller';
import { CrmAnalyticsService } from './crm.service';
import { CrmContact, CrmContactSchema } from './crm.schema';
import { HealthController } from './health.controller';

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGO_URI || 'mongodb://localhost:27017/crm'),
    MongooseModule.forFeature([{ name: CrmContact.name, schema: CrmContactSchema }]),
    KafkaToolkitModule,
  ],
  controllers: [HealthController, CrmAnalyticsController],
  providers: [CrmAnalyticsService],
})
export class AppModule {}
