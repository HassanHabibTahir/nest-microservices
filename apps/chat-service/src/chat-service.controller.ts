import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ChatServiceService } from './chat-service.service';

@Controller()
export class ChatServiceController {
  constructor(private readonly chatServiceService: ChatServiceService) {}

  @MessagePattern({ cmd: 'send_message' })
  sendMessage(@Payload() data: { from: string; to: string; message: string }) {
    return this.chatServiceService.sendMessage(data);
  }

  @MessagePattern({ cmd: 'get_messages' })
  getMessages(@Payload() data: { userId: string }) {
    return this.chatServiceService.getMessages(data);
  }
}
