import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { KafkaToolkitModule } from '@activation-poc/kafka-toolkit';
import { HealthController } from './health.controller';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGO_URI || 'mongodb://localhost:27017/notification'),
    KafkaToolkitModule,
  ],
  controllers: [HealthController, NotificationController],
  providers: [NotificationService],
})
export class AppModule {}
