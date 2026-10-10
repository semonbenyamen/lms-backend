import Joi from 'joi';

export const envValidationSchema = Joi.object({
  DATABASE_URL: Joi.string().uri().required(),
  JWT_SECRET: Joi.string().required(),
  AUTH_TOKEN_SECRET: Joi.string().required(),
  JWT_EXPIRES_IN: Joi.string()
    .pattern(/^[1-9]\d*(ms|s|m|h|d|w|y)$/)
    .required(),

  MAIL_USER: Joi.string().email().required(),
  MAIL_APP_PASSWORD: Joi.string().required(),
});
