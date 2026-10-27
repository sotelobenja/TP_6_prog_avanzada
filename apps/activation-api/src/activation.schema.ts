import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { ActivationStatus, SimulateFailure } from '@activation-poc/contracts';

export type ActivationDocument = HydratedDocument<Activation>;

@Schema({ _id: false })
class StepResult {
  @Prop()
  status: 'OK' | 'FAILED';

  @Prop()
  at: string;

  @Prop()
  reason?: string;
}

@Schema({ _id: false })
class HistoryItem {
  @Prop()
  eventType: string;

  @Prop()
  eventId: string;

  @Prop()
  at: string;
}

@Schema({ collection: 'activations', timestamps: true })
export class Activation {
  @Prop()
  _id: string;

  @Prop({ required: true, index: true })
  customerId: string;

  @Prop({ required: true })
  planId: string;

  @Prop({ required: true })
  status: ActivationStatus;

  @Prop({ default: 'none' })
  simulateFailure: SimulateFailure;

  @Prop({ default: 'web' })
  channel: string;

  @Prop({ type: Object, default: {} })
  steps: {
    billing?: StepResult;
    provisioning?: StepResult;
  };

  @Prop({ type: [Object], default: [] })
  history: HistoryItem[];
}

export const ActivationSchema = SchemaFactory.createForClass(Activation);
