import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ cors: { origin: true } })
export class ActivationGateway {
  @WebSocketServer()
  server!: Server;

  emitUpdate(activation: unknown): void {
    this.server.emit('activation.updated', activation);
  }
}
