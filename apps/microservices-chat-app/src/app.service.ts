import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class AppService {
  constructor(
    @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy,
    @Inject('CHAT_SERVICE') private readonly chatClient: ClientProxy,
  ) {}

  login(data: { email: string; password: string }) {
    return this.authClient.send({ cmd: 'login' }, data);
  }

  register(data: { email: string; password: string; name: string }) {
    return this.authClient.send({ cmd: 'register' }, data);
  }

  sendMessage(data: { from: string; to: string; message: string }) {
    return this.chatClient.send({ cmd: 'send_message' }, data);
  }

  getMessages(data: { userId: string }) {
    return this.chatClient.send({ cmd: 'get_messages' }, data);
  }
}
