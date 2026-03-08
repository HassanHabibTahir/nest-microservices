import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post('auth/login')
  login(@Body() body: { email: string; password: string }) {
    return this.appService.login(body);
  }

  @Post('auth/register')
  register(@Body() body: { email: string; password: string; name: string }) {
    return this.appService.register(body);
  }

  @Post('chat/send')
  sendMessage(@Body() body: { from: string; to: string; message: string }) {
    return this.appService.sendMessage(body);
  }

  @Get('chat/messages')
  getMessages(@Query('userId') userId: string) {
    return this.appService.getMessages({ userId });
  }
}
