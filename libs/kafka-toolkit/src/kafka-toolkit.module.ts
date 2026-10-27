import { Global, Module } from '@nestjs/common';
import { KafkaPublisher } from './publisher';
import { IdempotencyService } from './idempotency';
import { OutboxService } from './outbox';

@Global()
@Module({
  providers: [KafkaPublisher, IdempotencyService, OutboxService],
  exports: [KafkaPublisher, IdempotencyService, OutboxService],
})
export class KafkaToolkitModule {}
