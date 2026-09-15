import { timeAgo } from '@/utils/timeAgo';

describe('timeAgo', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-31T12:00:00Z').getTime());
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('should return "N/A" for undefined', () => {
    expect(timeAgo(undefined)).toBe('N/A');
  });

  it('should return "N/A" for empty string', () => {
    expect(timeAgo('')).toBe('N/A');
  });

  it('should return "N/A" for invalid date string', () => {
    expect(timeAgo('not-a-date')).toBe('N/A');
  });

  it('should return "just now" for future dates', () => {
    const future = new Date(Date.now() + 60000).toISOString();
    expect(timeAgo(future)).toBe('just now');
  });

  it('should return "1 second ago" for 1 second ago', () => {
    const oneSecondAgo = new Date(Date.now() - 1000).toISOString();
    expect(timeAgo(oneSecondAgo)).toBe('1 second ago');
  });

  it('should return seconds ago for less than a minute', () => {
    const thirtySecsAgo = new Date(Date.now() - 30000).toISOString();
    expect(timeAgo(thirtySecsAgo)).toBe('30 seconds ago');
  });

  it('should return "1 minute ago" for exactly 1 minute', () => {
    const oneMinAgo = new Date(Date.now() - 60000).toISOString();
    expect(timeAgo(oneMinAgo)).toBe('1 minute ago');
  });

  it('should return minutes ago for less than an hour', () => {
    const fiveMinsAgo = new Date(Date.now() - 300000).toISOString();
    expect(timeAgo(fiveMinsAgo)).toBe('5 minutes ago');
  });

  it('should return "1 hour ago" for exactly 1 hour', () => {
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
    expect(timeAgo(oneHourAgo)).toBe('1 hour ago');
  });

  it('should return hours ago for less than a day', () => {
    const threeHoursAgo = new Date(Date.now() - 10800000).toISOString();
    expect(timeAgo(threeHoursAgo)).toBe('3 hours ago');
  });

  it('should return "Yesterday" for exactly 1 day', () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString();
    expect(timeAgo(yesterday)).toBe('Yesterday');
  });

  it('should return days ago for 2-6 days', () => {
    const threeDaysAgo = new Date(Date.now() - 86400000 * 3).toISOString();
    expect(timeAgo(threeDaysAgo)).toBe('3 days ago');
  });

  it('should return formatted date for 7+ days', () => {
    const tenDaysAgo = new Date(Date.now() - 86400000 * 10).toISOString();
    const result = timeAgo(tenDaysAgo);
    expect(result).toMatch(/\w+ \d{1,2}, \d{4}/);
  });
});
