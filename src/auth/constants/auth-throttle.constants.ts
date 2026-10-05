import { minutes } from '@nestjs/throttler';

const FIFTEEN_MINUTES = minutes(15);

export const AUTH_THROTTLE = {
  REGISTER: {
    default: {
      limit: 5,
      ttl: FIFTEEN_MINUTES,
    },
  },

  VERIFY_EMAIL: {
    default: {
      limit: 5,
      ttl: FIFTEEN_MINUTES,
    },
  },

  RESEND_VERIFICATION: {
    default: {
      limit: 3,
      ttl: FIFTEEN_MINUTES,
    },
  },

  LOGIN: {
    default: {
      limit: 5,
      ttl: FIFTEEN_MINUTES,
    },
  },

  FORGOT_PASSWORD: {
    default: {
      limit: 3,
      ttl: FIFTEEN_MINUTES,
    },
  },

  RESET_PASSWORD: {
    default: {
      limit: 5,
      ttl: FIFTEEN_MINUTES,
    },
  },
} as const;