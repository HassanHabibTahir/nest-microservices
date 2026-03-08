import { Injectable } from '@nestjs/common';

@Injectable()
export class ChatServiceService {
  sendMessage(data: { from: string; to: string; message: string }) {
    return { success: true, message: 'Message sent', data };
  }

  getMessages(data: { userId: string }) {
    return { success: true, messages: [], userId: data.userId };
  }
}
