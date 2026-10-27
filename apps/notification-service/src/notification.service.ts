import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { Envelope } from '@activation-poc/contracts';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'localhost',
    port: Number(process.env.SMTP_PORT || 1025),
    secure: false,
    ignoreTLS: true,
    tls: { rejectUnauthorized: false },
  });

  async handle(event: Envelope): Promise<void> {
    if (event.eventType !== 'ActivationCompleted' && event.eventType !== 'ActivationFailed') {
      return;
    }

    const email = `${event.customerId}@demo.local`;
    const subject =
      event.eventType === 'ActivationCompleted' ? 'Activación completada' : 'Activación fallida';
    const text =
      event.eventType === 'ActivationCompleted'
        ? `La activación ${event.correlationId} fue completada correctamente.`
        : `La activación ${event.correlationId} falló: ${String((event.payload as { reason?: string })?.reason ?? 'Sin detalle')}`;

    await this.transporter.sendMail({
      from: 'noreply@activation.local',
      to: email,
      subject,
      text,
      html: `<p>${text}</p>`,
    });

    this.logger.log(`Email sent to ${email} for activation ${event.correlationId}`);
  }
}
