import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthServiceService {
  login(data: { email: string; password: string }) {
    return { success: true, token: 'mock-token', user: { email: data.email } };
  }

  register(data: { email: string; password: string; name: string }) {
    return {
      success: true,
      message: 'User registered',
      user: { email: data.email, name: data.name },
    };
  }
}
