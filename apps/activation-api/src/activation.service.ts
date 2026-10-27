import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Envelope,
  makeEvent,
  SimulateFailure,
  TOPICS,
} from '@activation-poc/contracts';
import { OutboxService } from '@activation-poc/kafka-toolkit';
import { Activation, ActivationDocument } from './activation.schema';
import { ActivationGateway } from './activation.gateway';

@Injectable()
export class ActivationService {
  constructor(
    @InjectModel(Activation.name) private readonly model: Model<ActivationDocument>,
    private readonly outbox: OutboxService,
    private readonly gateway: ActivationGateway,
  ) {}

  async create(input: { customerId: string; planId: string; simulateFailure?: SimulateFailure }) {
    const activationId = `act-${crypto.randomUUID()}`;
    const simulateFailure = input.simulateFailure || 'none';
    const event = makeEvent({
      eventType: 'ActivationRequested',
      correlationId: activationId,
      customerId: input.customerId,
      source: 'activation-api',
      payload: {
        planId: input.planId,
        channel: 'web',
        simulateFailure,
      },
    });

    const session = await this.model.db.startSession();
    try {
      await session.withTransaction(async () => {
        await this.model.create(
          [
            {
              _id: activationId,
              customerId: input.customerId,
              planId: input.planId,
              status: 'PENDING',
              simulateFailure,
              channel: 'web',
              steps: {},
              history: [
                { eventType: event.eventType, eventId: event.eventId, at: event.occurredAt },
              ],
            },
          ],
          { session },
        );
        await this.outbox.enqueue(session, TOPICS.ACTIVATION_REQUESTED, event);
      });
    } finally {
      await session.endSession();
    }

    const created = await this.model.findById(activationId).lean();
    this.gateway.emitUpdate(created);
    return { activationId, status: 'PENDING' as const };
  }

  async findById(id: string) {
    const doc = await this.model.findById(id).lean();
    if (!doc) {
      throw new NotFoundException(`Activation ${id} not found`);
    }
    return doc;
  }

  async list() {
    return this.model.find().sort({ createdAt: -1 }).limit(20).lean();
  }

  async applyDownstreamEvent(event: Envelope, session: import('mongoose').ClientSession) {
    const act = await this.model.findById(event.correlationId).session(session);
    if (!act) {
      return;
    }

    act.history.push({
      eventType: event.eventType,
      eventId: event.eventId,
      at: event.occurredAt,
    });

    const alreadyTerminal = act.status === 'ACTIVE' || act.status === 'FAILED';
    if (!alreadyTerminal) {
      if (act.status === 'PENDING') {
        act.status = 'IN_PROGRESS';
      }

      if (event.eventType === 'BillingAccountCreated' || event.eventType === 'BillingFailed') {
        act.steps.billing = {
          status: event.eventType === 'BillingAccountCreated' ? 'OK' : 'FAILED',
          at: event.occurredAt,
          reason: (event.payload as { reason?: string }).reason,
        };
      }
      if (event.eventType === 'ProvisioningCompleted' || event.eventType === 'ProvisioningFailed') {
        act.steps.provisioning = {
          status: event.eventType === 'ProvisioningCompleted' ? 'OK' : 'FAILED',
          at: event.occurredAt,
          reason: (event.payload as { reason?: string }).reason,
        };
      }

      const billing = act.steps.billing?.status;
      const provisioning = act.steps.provisioning?.status;
      if (billing === 'FAILED' || provisioning === 'FAILED') {
        act.status = 'FAILED';
        const failedStep = billing === 'FAILED' ? 'billing' : 'provisioning';
        const failedEvent = makeEvent({
          eventType: 'ActivationFailed',
          correlationId: act._id,
          customerId: act.customerId,
          source: 'activation-api',
          payload: {
            planId: act.planId,
            failedStep,
            reason: act.steps[failedStep]?.reason || `${failedStep} failed`,
          },
        });
        act.history.push({
          eventType: failedEvent.eventType,
          eventId: failedEvent.eventId,
          at: failedEvent.occurredAt,
        });
        await this.outbox.enqueue(session, TOPICS.ACTIVATION_EVENTS, failedEvent);
      } else if (billing === 'OK' && provisioning === 'OK') {
        act.status = 'ACTIVE';
        const completed = makeEvent({
          eventType: 'ActivationCompleted',
          correlationId: act._id,
          customerId: act.customerId,
          source: 'activation-api',
          payload: { planId: act.planId },
        });
        act.history.push({
          eventType: completed.eventType,
          eventId: completed.eventId,
          at: completed.occurredAt,
        });
        await this.outbox.enqueue(session, TOPICS.ACTIVATION_EVENTS, completed);
      }
    }

    act.markModified('steps');
    act.markModified('history');
    await act.save({ session });
  }

  emit(activationId: string) {
    void this.model
      .findById(activationId)
      .lean()
      .then((doc) => {
        if (doc) {
          this.gateway.emitUpdate(doc);
        }
      });
  }
}
