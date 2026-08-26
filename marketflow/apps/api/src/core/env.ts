import { logger } from './logger';

const INSECURE_DEFAULTS: Record<string, string> = {
  JWT_SECRET: 'your-super-secret-jwt-key-change-this-in-production',
  REFRESH_TOKEN_SECRET: 'your-refresh-token-secret-change-this',
  SESSION_SECRET: 'your-session-secret-change-this',
  ENCRYPTION_KEY: 'your-32-character-encryption-key!!',
  MASTER_ADMIN_PASSWORD: 'ChangeMeInProduction123!',
};

const REQUIRED_IN_PRODUCTION = [
  'DATABASE_URL',
  'JWT_SECRET',
  'ENCRYPTION_KEY',
  'MASTER_ADMIN_EMAIL',
  'MASTER_ADMIN_PASSWORD',
];

/**
 * Validates environment configuration at boot. In production, refuses to start
 * if a secret is missing or still set to the shipped placeholder value —
 * those placeholders are public (committed in .env.example) so leaving them
 * in place means anyone can forge JWTs / read encrypted integration configs.
 */
export function validateEnv(): void {
  const isProduction = process.env.NODE_ENV === 'production';
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const key of REQUIRED_IN_PRODUCTION) {
    if (!process.env[key]) {
      const msg = `Missing required environment variable: ${key}`;
      isProduction ? errors.push(msg) : warnings.push(msg);
    }
  }

  for (const [key, insecureValue] of Object.entries(INSECURE_DEFAULTS)) {
    if (process.env[key] === insecureValue) {
      const msg = `${key} is set to the default placeholder value — this is publicly known and must be changed`;
      isProduction ? errors.push(msg) : warnings.push(msg);
    }
  }

  if (process.env.ENCRYPTION_KEY && process.env.ENCRYPTION_KEY.length !== 32) {
    const msg = 'ENCRYPTION_KEY must be exactly 32 characters (used as AES-256 key)';
    isProduction ? errors.push(msg) : warnings.push(msg);
  }

  warnings.forEach((w) => logger.warn(`[env] ${w}`));

  if (errors.length > 0) {
    errors.forEach((e) => logger.error(`[env] ${e}`));
    logger.error(
      `[env] Refusing to start in production with ${errors.length} configuration error(s). Fix .env and restart.`
    );
    process.exit(1);
  }
}
