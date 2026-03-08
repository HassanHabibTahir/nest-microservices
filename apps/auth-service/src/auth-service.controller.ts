import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AuthServiceService } from './auth-service.service';

@Controller()
export class AuthServiceController {
  constructor(private readonly authServiceService: AuthServiceService) {}

  @MessagePattern({ cmd: 'login' })
  login(@Payload() data: { email: string; password: string }) {
    return this.authServiceService.login(data);
  }

  @MessagePattern({ cmd: 'register' })
  register(@Payload() data: { email: string; password: string; name: string }) {
    return this.authServiceService.register(data);
  }
}
