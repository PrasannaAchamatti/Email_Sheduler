import { RateLimitService } from '../src/services/rateLimitService';
import { redisClient } from '../src/config/redis';

describe('Distributed Rate Limiting and Spacing Coordination', () => {
  const testSenderId = 'test_sender_suite_1';

  beforeAll(async () => {
    await RateLimitService.resetSenderHourlyUsage(testSenderId);
  });

  afterAll(async () => {
    await RateLimitService.resetSenderHourlyUsage(testSenderId);
    await redisClient.quit();
  });

  test('calculates hour window strings and next reset time', () => {
    const fixedDate = new Date('2026-11-04T15:30:00Z');
    const windowStr = RateLimitService.getHourWindow(fixedDate);
    expect(windowStr).toBe('2026-11-04-15');

    const nextReset = RateLimitService.getNextHourWindowStart(fixedDate);
    expect(nextReset.toISOString()).toBe('2026-11-04T16:00:00.000Z');
  });

  test('allows sends within hourly limit and blocks when exceeded', async () => {
    const limit = 3;

    // Send 1
    const res1 = await RateLimitService.checkAndIncrementHourly(testSenderId, limit);
    expect(res1.allowed).toBe(true);
    expect(res1.currentCount).toBe(1);

    // Send 2
    const res2 = await RateLimitService.checkAndIncrementHourly(testSenderId, limit);
    expect(res2.allowed).toBe(true);
    expect(res2.currentCount).toBe(2);

    // Send 3 (hits max limit)
    const res3 = await RateLimitService.checkAndIncrementHourly(testSenderId, limit);
    expect(res3.allowed).toBe(true);
    expect(res3.currentCount).toBe(3);

    // Send 4 (exceeds limit -> blocked and provides delay until next window)
    const res4 = await RateLimitService.checkAndIncrementHourly(testSenderId, limit);
    expect(res4.allowed).toBe(false);
    expect(res4.currentCount).toBe(4);
    expect(res4.delayUntilNextWindowMs).toBeGreaterThan(0);
  });

  test('enforces minimum delay spacing between sends', async () => {
    const spacingSender = 'test_spacing_sender';
    const minDelay = 1000;

    // First check should allow immediately
    const check1 = await RateLimitService.checkMinimumDelay(spacingSender, minDelay);
    expect(check1.allowed).toBe(true);

    // Immediate second check should require wait
    const check2 = await RateLimitService.checkMinimumDelay(spacingSender, minDelay);
    expect(check2.allowed).toBe(false);
    expect(check2.waitMs).toBeGreaterThan(0);
    expect(check2.waitMs).toBeLessThanOrEqual(minDelay);
  });
});

