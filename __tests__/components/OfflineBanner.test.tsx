import React from 'react';
import { render } from '@testing-library/react-native';
import { OfflineBanner } from '@/components/OfflineBanner';
import NetInfo from '@react-native-community/netinfo';

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(),
  fetch: jest.fn(),
}));

jest.mock('lucide-react-native', () => {
  const React = require('react');
  return {
    Wifi: (props: any) => React.createElement('Wifi', props),
    WifiOff: (props: any) => React.createElement('WifiOff', props),
  };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe('OfflineBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render nothing when connected', async () => {
    (NetInfo.addEventListener as jest.Mock).mockImplementation((callback) => {
      callback({ isConnected: true, isInternetReachable: true });
      return jest.fn();
    });

    const { queryByText } = await render(<OfflineBanner />);
    expect(queryByText('NO INTERNET CONNECTION')).toBeNull();
    expect(queryByText('BACK ONLINE')).toBeNull();
  });

  it('should show offline banner when disconnected', async () => {
    (NetInfo.addEventListener as jest.Mock).mockImplementation((callback) => {
      callback({ isConnected: false, isInternetReachable: false });
      return jest.fn();
    });

    const { getByText } = await render(<OfflineBanner />);
    expect(getByText('NO INTERNET CONNECTION')).toBeTruthy();
  });

  it('should subscribe to NetInfo changes', async () => {
    (NetInfo.addEventListener as jest.Mock).mockReturnValue(jest.fn());

    await render(<OfflineBanner />);
    expect(NetInfo.addEventListener).toHaveBeenCalledTimes(1);
    expect(NetInfo.addEventListener).toHaveBeenCalledWith(expect.any(Function));
  });

  it('should cleanup subscription on unmount', async () => {
    const unsubscribe = jest.fn();
    (NetInfo.addEventListener as jest.Mock).mockReturnValue(unsubscribe);

    const { unmount } = await render(<OfflineBanner />);
    await unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
