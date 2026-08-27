import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createHash, createHmac } from 'crypto';
import { verifyTelegramWidgetData, TelegramWidgetData } from './telegram-verify';
import { AppError } from '../../core/error-handler';

const BOT_TOKEN = '123456:test-bot-token';

function signPayload(fields: Omit<TelegramWidgetData, 'hash'>): TelegramWidgetData {
  const dataCheckString = Object.keys(fields)
    .sort()
    .map((key) => `${key}=${(fields as any)[key]}`)
    .join('\n');

  const secretKey = createHash('sha256').update(BOT_TOKEN).digest();
  const hash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  return { ...fields, hash };
}

describe('verifyTelegramWidgetData', () => {
  const originalToken = process.env.TELEGRAM_BOT_TOKEN;

  beforeEach(() => {
    process.env.TELEGRAM_BOT_TOKEN = BOT_TOKEN;
  });

  afterEach(() => {
    process.env.TELEGRAM_BOT_TOKEN = originalToken;
  });

  it('accepts a correctly signed, fresh payload', () => {
    const payload = signPayload({
      id: 12345,
      first_name: 'Ada',
      auth_date: Math.floor(Date.now() / 1000),
    });

    expect(() => verifyTelegramWidgetData(payload)).not.toThrow();
  });

  it('rejects a payload with a tampered field (hash no longer matches)', () => {
    const payload = signPayload({
      id: 12345,
      first_name: 'Ada',
      auth_date: Math.floor(Date.now() / 1000),
    });

    // Attacker changes the id after signing — hash was computed over the original.
    const tampered = { ...payload, id: 99999 };

    expect(() => verifyTelegramWidgetData(tampered)).toThrow(AppError);
    expect(() => verifyTelegramWidgetData(tampered)).toThrow(/signature is invalid/);
  });

  it('rejects a payload with a garbage hash', () => {
    const payload = signPayload({
      id: 12345,
      first_name: 'Ada',
      auth_date: Math.floor(Date.now() / 1000),
    });

    expect(() =>
      verifyTelegramWidgetData({ ...payload, hash: 'not-a-real-hash-af00' })
    ).toThrow(AppError);
  });

  it('rejects a stale payload older than 24 hours (replay protection)', () => {
    const payload = signPayload({
      id: 12345,
      first_name: 'Ada',
      auth_date: Math.floor(Date.now() / 1000) - 25 * 60 * 60,
    });

    expect(() => verifyTelegramWidgetData(payload)).toThrow(/expired/);
  });

  it('rejects an auth_date in the future (clock-skew / forged replay)', () => {
    const payload = signPayload({
      id: 12345,
      first_name: 'Ada',
      auth_date: Math.floor(Date.now() / 1000) + 60 * 60,
    });

    expect(() => verifyTelegramWidgetData(payload)).toThrow(/expired/);
  });

  it('throws a clear config error when TELEGRAM_BOT_TOKEN is unset', () => {
    delete process.env.TELEGRAM_BOT_TOKEN;

    const payload = signPayload({
      id: 12345,
      first_name: 'Ada',
      auth_date: Math.floor(Date.now() / 1000),
    });

    expect(() => verifyTelegramWidgetData(payload)).toThrow(/not configured/);
  });
});
