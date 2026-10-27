import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model } from 'mongoose';
import {
  ActivationRequestedPayload,
  Envelope,
  makeEvent,
  TOPICS,
} from '@activation-poc/contracts';
import { OutboxService } from '@activation-poc/kafka-toolkit';
import { ProvisioningOrder, ProvisioningOrderDocument } from './provisioning.schema';

@Injectable()
export class ProvisioningService {
  constructor(
    @InjectModel(ProvisioningOrder.name)
    private readonly orders: Model<ProvisioningOrderDocument>,
    private readonly outbox: OutboxService,
  ) {}

  async handle(event: Envelope, session: ClientSession): Promise<void> {
    if (event.eventType === 'ActivationRequested') {
      const activationEvent = event as unknown as Envelope<ActivationRequestedPayload>;
      await this.onRequested(activationEvent, session);
    }

    if (event.eventType === 'ActivationFailed') {
      await this.onFailed(event, session);
    }
  }

  private async onRequested(
    event: Envelope<ActivationRequestedPayload>,
    session: ClientSession,
  ): Promise<void> {
    if (event.payload.simulateFailure === 'provisioning') {
      const failed = makeEvent({
        eventType: 'ProvisioningFailed',
        correlationId: event.correlationId,
        customerId: event.customerId,
        source: 'provisioning-service',
        payload: { planId: event.payload.planId, reason: 'Forced provisioning failure' },
      });
      await this.outbox.enqueue(session, TOPICS.PROVISIONING_EVENTS, failed);
      return;
    }

    await this.orders.create(
      [
        {
          activationId: event.correlationId,
          customerId: event.customerId,
          planId: event.payload.planId,
          status: 'CREATED',
        },
      ],
      { session },
    );

    const completed = makeEvent({
      eventType: 'ProvisioningCompleted',
      correlationId: event.correlationId,
      customerId: event.customerId,
      source: 'provisioning-service',
      payload: { planId: event.payload.planId },
    });
    await this.outbox.enqueue(session, TOPICS.PROVISIONING_EVENTS, completed);
  }

  private async onFailed(event: Envelope, session: ClientSession): Promise<void> {
    const order = await this.orders.findOne({ activationId: event.correlationId }).session(session);
    if (!order || order.status === 'CANCELLED') {
      return;
    }

    order.status = 'CANCELLED';
    order.reason = 'Compensated after ActivationFailed';
    await order.save({ session });
  }
}
