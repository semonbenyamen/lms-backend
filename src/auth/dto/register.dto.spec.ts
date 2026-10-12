import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RegisterDto } from './register.dto.js';

describe('RegisterDto', () => {
  const validData = {
    firstName: 'Semon',
    lastName: 'Benyamin',
    email: 'test@example.com',
    password: 'StrongPassword123!',
    confirmPassword: 'StrongPassword123!',
  };

  it('should accept matching passwords', async () => {
    const dto = plainToInstance(RegisterDto, validData);

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should reject mismatched passwords', async () => {
    const dto = plainToInstance(RegisterDto, {
      ...validData,
      confirmPassword: 'DifferentPassword123!',
    });

    const errors = await validate(dto);

    expect(
      errors.some(
        (error) => error.property === 'confirmPassword',
      ),
    ).toBe(true);
  });

  it('should reject a weak password', async () => {
    const dto = plainToInstance(RegisterDto, {
      ...validData,
      password: '12345678',
      confirmPassword: '12345678',
    });

    const errors = await validate(dto);

    expect(
      errors.some((error) => error.property === 'password'),
    ).toBe(true);
  });
});