import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CompensationFlagDocument = HydratedDocument<CompensationFlag>;

@Schema({ collection: 'compensation_flags', timestamps: true })
export class CompensationFlag {
  @Prop({ required: true, unique: true })
  activationId: string;
}

export const CompensationFlagSchema = SchemaFactory.createForClass(CompensationFlag);
