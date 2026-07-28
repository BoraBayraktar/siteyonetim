import bcrypt from "bcryptjs";

import type { AuthServiceContract, AuthUserDto, ValidateCredentialsInput } from "./contract";
import { AuthRepository } from "./repository";

export class AuthService implements AuthServiceContract {
  constructor(private readonly repository = new AuthRepository()) {}

  async validateCredentials(input: ValidateCredentialsInput): Promise<AuthUserDto | null> {
    const user = await this.repository.findByEmail(input.email.trim());
    if (!user) {
      return null;
    }
    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) {
      return null;
    }
    return this.repository.toDto(user);
  }

  async findUserById(userId: string): Promise<AuthUserDto | null> {
    const user = await this.repository.findById(userId);
    if (!user) {
      return null;
    }
    return this.repository.toDto(user);
  }
}

export function createAuthService(): AuthService {
  return new AuthService();
}
