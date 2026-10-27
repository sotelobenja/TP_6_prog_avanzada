import { Controller } from '@nestjs/common';
import { Ctx, EventPattern, KafkaContext, Payload } from '@nestjs/microservices';
import { TOPICS } from '@activation-poc/contracts';
import { handleKafkaEvent, IdempotencyService, KafkaPublisher } from '@activation-poc/kafka-toolkit';
import { ActivationService } from './activation.service';

@Controller()
export class ActivationEventsController {
  constructor(
    private readonly service: ActivationService,
    private readonly idempotency: IdempotencyService,
    private readonly publisher: KafkaPublisher,
  ) {}

  @EventPattern(TOPICS.BILLING_EVENTS)
  async onBilling(@Payload() payload: unknown, @Ctx() context: KafkaContext) {
    await this.handle(payload, context);
  }

  @EventPattern(TOPICS.PROVISIONING_EVENTS)
  async onProvisioning(@Payload() payload: unknown, @Ctx() context: KafkaContext) {
    await this.handle(payload, context);
  }

  private async handle(payload: unknown, context: KafkaContext) {
    let correlationId: string | undefined;
    await handleKafkaEvent({
      payload,
      context,
      idempotency: this.idempotency,
      publisher: this.publisher,
      handler: async (event, session) => {
        correlationId = event.correlationId;
        await this.service.applyDownstreamEvent(event, session);
      },
    });
    if (correlationId) {
      this.service.emit(correlationId);
    }
  }
}
