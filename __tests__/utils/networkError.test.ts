import { isNetworkError, NETWORK_OFFLINE_MESSAGE } from '@/utils/networkError';

describe('isNetworkError', () => {
  it('should return true when error has no response', () => {
    expect(isNetworkError({})).toBe(true);
    expect(isNetworkError({ message: 'Network Error' })).toBe(true);
  });

  it('should return false when error has a response', () => {
    expect(isNetworkError({ response: { status: 400 } })).toBe(false);
    expect(isNetworkError({ response: { status: 500 } })).toBe(false);
  });

  it('should return truthy for falsy error values', () => {
    expect(isNetworkError(false)).toBeTruthy();
    expect(isNetworkError(0)).toBeTruthy();
  });
});

describe('NETWORK_OFFLINE_MESSAGE', () => {
  it('should be a non-empty string', () => {
    expect(typeof NETWORK_OFFLINE_MESSAGE).toBe('string');
    expect(NETWORK_OFFLINE_MESSAGE.length).toBeGreaterThan(0);
  });

  it('should contain internet connection reference', () => {
    expect(NETWORK_OFFLINE_MESSAGE.toLowerCase()).toContain('internet');
  });
});
