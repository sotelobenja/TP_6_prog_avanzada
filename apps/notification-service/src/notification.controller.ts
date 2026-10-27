import { Controller } from '@nestjs/common';
import { Ctx, EventPattern, KafkaContext, Payload } from '@nestjs/microservices';
import { TOPICS } from '@activation-poc/contracts';
import { handleKafkaEvent, IdempotencyService, KafkaPublisher } from '@activation-poc/kafka-toolkit';
import { NotificationService } from './notification.service';

@Controller()
export class NotificationController {
  constructor(
    private readonly service: NotificationService,
    private readonly idempotency: IdempotencyService,
    private readonly publisher: KafkaPublisher,
  ) {}

  @EventPattern(TOPICS.ACTIVATION_EVENTS)
  async onActivationEvents(@Payload() payload: unknown, @Ctx() context: KafkaContext) {
    await this.consume(payload, context);
  }

  private consume(payload: unknown, context: KafkaContext) {
    return handleKafkaEvent({
      payload,
      context,
      idempotency: this.idempotency,
      publisher: this.publisher,
      handler: async (event, _session) => {
        await this.service.handle(event);
      },
    });
  }
}
