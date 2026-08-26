import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { AppError } from '../../core/error-handler';

// Fields Telegram's Login Widget sends back on successful auth.
// https://core.telegram.org/widgets/login#checking-authorization
export interface TelegramWidgetData {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

const MAX_AUTH_AGE_SECONDS = 24 * 60 * 60; // reject stale/replayed widget payloads

/**
 * Verifies a Telegram Login Widget payload against the bot token, per
 * Telegram's documented algorithm. This is deliberately hand-rolled rather
 * than pulled from a library — passport-telegram (and most npm alternatives)
 * predate or don't implement the widget flow correctly, and the algorithm
 * itself is ~10 lines of stdlib crypto with no reason to add a dependency.
 *
 * Throws AppError on any failure (bad signature, missing bot token, stale payload).
 */
export function verifyTelegramWidgetData(data: TelegramWidgetData): void {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    throw new AppError('Telegram login is not configured', 501, 'TELEGRAM_NOT_CONFIGURED');
  }

  const { hash, ...fields } = data;
  if (!hash) {
    throw new AppError('Invalid Telegram login payload', 400, 'INVALID_TELEGRAM_DATA');
  }

  const dataCheckString = Object.keys(fields)
    .sort()
    .filter((key) => fields[key as keyof typeof fields] !== undefined)
    .map((key) => `${key}=${fields[key as keyof typeof fields]}`)
    .join('\n');

  const secretKey = createHash('sha256').update(botToken).digest();
  const computedHash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  const expected = Buffer.from(computedHash, 'hex');
  const actual = Buffer.from(hash, 'hex');

  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    throw new AppError('Telegram login signature is invalid', 401, 'INVALID_TELEGRAM_SIGNATURE');
  }

  const ageSeconds = Math.floor(Date.now() / 1000) - data.auth_date;
  if (ageSeconds > MAX_AUTH_AGE_SECONDS || ageSeconds < 0) {
    throw new AppError('Telegram login has expired, please try again', 401, 'TELEGRAM_AUTH_EXPIRED');
  }
}
