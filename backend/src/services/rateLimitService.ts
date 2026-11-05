import { redisClient } from '../config/redis';
import { env } from '../config/env';
import { logger } from '../config/logger';

export interface RateLimitCheckResult {
  allowed: boolean;
  currentCount: number;
  maxLimit: number;
  hourWindow: string;
  nextWindowStart: Date;
  delayUntilNextWindowMs: number;
}

export interface MinDelayCheckResult {
  allowed: boolean;
  waitMs: number;
}

export class RateLimitService {
  /**
   * Format current hour window string, e.g. "2026-11-04-23"
   */
  public static getHourWindow(date: Date = new Date()): string {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    const h = String(date.getUTCHours()).padStart(2, '0');
    return `${y}-${m}-${d}-${h}`;
  }

  /**
   * Calculate next available hourly window start time
   */
  public static getNextHourWindowStart(date: Date = new Date()): Date {
    const next = new Date(date);
    next.setUTCMinutes(0, 0, 0);
    next.setUTCHours(next.getUTCHours() + 1);
    return next;
  }

  /**
   * Atomically check and increment hourly send counter for a sender
   */
  public static async checkAndIncrementHourly(
    senderId: string,
    customMaxLimit?: number
  ): Promise<RateLimitCheckResult> {
    const maxLimit = customMaxLimit || env.MAX_EMAILS_PER_HOUR_PER_SENDER;
    const now = new Date();
    const hourWindow = this.getHourWindow(now);
    const key = `rl:sender:hourly:${senderId}:${hourWindow}`;

    // Atomic Lua script: Increment and set expire if key is new
    const luaScript = `
      local current = redis.call('INCR', KEYS[1])
      if current == 1 then
        redis.call('EXPIRE', KEYS[1], 7200)
      end
      return current
    `;

    const currentCount = (await redisClient.eval(luaScript, 1, key)) as number;

    const nextWindowStart = this.getNextHourWindowStart(now);
    const delayUntilNextWindowMs = Math.max(0, nextWindowStart.getTime() - now.getTime());

    if (currentCount > maxLimit) {
      // Over the limit
      return {
        allowed: false,
        currentCount,
        maxLimit,
        hourWindow,
        nextWindowStart,
        delayUntilNextWindowMs
      };
    }

    return {
      allowed: true,
      currentCount,
      maxLimit,
      hourWindow,
      nextWindowStart,
      delayUntilNextWindowMs: 0
    };
  }

  /**
   * Atomically check minimum delay spacing between sends for a sender
   */
  public static async checkMinimumDelay(
    senderId: string,
    minDelayMs: number = env.MIN_DELAY_BETWEEN_EMAILS_MS
  ): Promise<MinDelayCheckResult> {
    const now = Date.now();
    const key = `rl:sender:last_send:${senderId}`;

    // Atomic Lua script: checks if last_send exists and if now - last_send < minDelay
    // If elapsed >= minDelay, update last_send to now and return 0
    // If not elapsed, return remaining wait time
    const luaScript = `
      local last = redis.call('GET', KEYS[1])
      local now = tonumber(ARGV[1])
      local minDelay = tonumber(ARGV[2])
      
      if not last then
        redis.call('SET', KEYS[1], now, 'EX', 3600)
        return 0
      end
      
      local elapsed = now - tonumber(last)
      if elapsed >= minDelay then
        redis.call('SET', KEYS[1], now, 'EX', 3600)
        return 0
      else
        local remaining = minDelay - elapsed
        return remaining
      end
    `;

    const waitMs = (await redisClient.eval(luaScript, 1, key, now.toString(), minDelayMs.toString())) as number;

    if (waitMs > 0) {
      return { allowed: false, waitMs };
    }

    return { allowed: true, waitMs: 0 };
  }

  /**
   * Record actual successful send timestamp to enforce minimum delay for subsequent sends
   */
  public static async recordSendTimestamp(senderId: string): Promise<void> {
    const now = Date.now();
    const key = `rl:sender:last_send:${senderId}`;
    await redisClient.set(key, now.toString(), 'EX', 3600);
  }

  /**
   * Check if Slack alert was already triggered for this sender and hour window
   * Atomically sets flag if not set. Returns true if this is the first alert.
   */
  public static async shouldTriggerSlackAlert(senderId: string, hourWindow: string): Promise<boolean> {
    const key = `rl:sender:slack_alert:${senderId}:${hourWindow}`;
    const result = await redisClient.set(key, '1', 'EX', 7200, 'NX');
    return result === 'OK';
  }

  /**
   * Get current hourly usage for a sender
   */
  public static async getSenderHourlyUsage(
    senderId: string,
    customMaxLimit?: number
  ): Promise<{
    senderId: string;
    currentCount: number;
    maxLimit: number;
    hourWindow: string;
    resetsAt: Date;
    remaining: number;
    percentUsed: number;
  }> {
    const now = new Date();
    const hourWindow = this.getHourWindow(now);
    const key = `rl:sender:hourly:${senderId}:${hourWindow}`;
    const val = await redisClient.get(key);
    const currentCount = val ? parseInt(val, 10) : 0;
    const maxLimit = customMaxLimit || env.MAX_EMAILS_PER_HOUR_PER_SENDER;
    const resetsAt = this.getNextHourWindowStart(now);
    const remaining = Math.max(0, maxLimit - currentCount);
    const percentUsed = Math.min(100, Math.round((currentCount / maxLimit) * 100));

    return {
      senderId,
      currentCount,
      maxLimit,
      hourWindow,
      resetsAt,
      remaining,
      percentUsed
    };
  }

  /**
   * Reset hourly usage for testing purposes
   */
  public static async resetSenderHourlyUsage(senderId: string): Promise<void> {
    const hourWindow = this.getHourWindow();
    const key = `rl:sender:hourly:${senderId}:${hourWindow}`;
    await redisClient.del(key);
  }
}

