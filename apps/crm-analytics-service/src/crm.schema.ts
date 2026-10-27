import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CrmContactDocument = HydratedDocument<CrmContact>;

@Schema({ collection: 'crm_contacts', timestamps: true })
export class CrmContact {
  @Prop({ required: true, unique: true })
  activationId: string;

  @Prop({ required: true })
  customerId: string;

  @Prop({ required: true })
  planId: string;

  @Prop({ required: true })
  status: 'PENDING' | 'ACTIVE' | 'FAILED';

  @Prop({ default: [] })
  history: string[];

  @Prop()
  reason?: string;
}

export const CrmContactSchema = SchemaFactory.createForClass(CrmContact);
