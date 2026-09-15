import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import LoginScreen from '@/app/index';

jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    login: jest.fn().mockResolvedValue({
      id: 1, name: 'Test', email: 'test@test.com', phone: '123',
      uesrType: 'WAITER', accountLocked: false, roles: ['WAITER'],
      permission: [], tenantCode: 'T1', tenantSlug: 't1',
    }),
    token: null,
    user: null,
    logout: jest.fn().mockResolvedValue(undefined),
    isLoading: false,
  }),
}));

jest.mock('@/context/ThemeContext', () => ({
  useTheme: () => ({
    isDark: false,
    theme: 'light',
    toggleTheme: jest.fn(),
  }),
}));

jest.mock('@/context/AlertContext', () => ({
  useCustomAlert: () => ({
    showAlert: jest.fn(),
    hideAlert: jest.fn(),
  }),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: jest.fn(),
    push: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
}));

jest.mock('expo-notifications', () => ({
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
  scheduleNotificationAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('react-native-reanimated', () => {
  const View = require('react-native').View;
  const Animated = {
    View: View,
    Text: require('react-native').Text,
    ScrollView: require('react-native').ScrollView,
  };
  return {
    __esModule: true,
    default: Animated,
    useSharedValue: (val: number) => ({ value: val }),
    useAnimatedStyle: (fn: any) => ({}),
    withTiming: (val: any) => val,
    withDelay: (_: any, val: any) => val,
    Easing: {
      bezier: () => (t: number) => t,
    },
  };
});

jest.mock('expo-image', () => {
  const View = require('react-native').View;
  return {
    __esModule: true,
    default: View,
  };
});

jest.mock('@/services/localNotificationService', () => ({
  requestLiveAlertsPermission: jest.fn(() => Promise.resolve(true)),
  presentLiveAlert: jest.fn(() => Promise.resolve()),
}));

jest.mock('@/utils/networkError', () => ({
  isNetworkError: jest.fn(() => false),
  NETWORK_OFFLINE_MESSAGE: 'Network error message',
}));

describe('LoginScreen', () => {
  it('should render login form elements', async () => {
    const { getByPlaceholderText, getByText } = await render(<LoginScreen />);

    expect(getByPlaceholderText('yourname@gmail.com')).toBeTruthy();
    expect(getByPlaceholderText('Enter password')).toBeTruthy();
    expect(getByText('Log In')).toBeTruthy();
  });

  it('should render welcome text', async () => {
    const { getByText } = await render(<LoginScreen />);

    expect(getByText('Welcome back!')).toBeTruthy();
    expect(getByText('Log in to your account')).toBeTruthy();
  });

  it('should render email and password labels', async () => {
    const { getByText } = await render(<LoginScreen />);

    expect(getByText('Email Address')).toBeTruthy();
    expect(getByText('Password')).toBeTruthy();
  });

  it('should render forgot password link', async () => {
    const { getByText } = await render(<LoginScreen />);
    expect(getByText('Forgot?')).toBeTruthy();
  });

  it('should allow typing in email field', async () => {
    const { getByPlaceholderText } = await render(<LoginScreen />);

    await fireEvent.changeText(getByPlaceholderText('yourname@gmail.com'), 'test@example.com');
    expect(getByPlaceholderText('yourname@gmail.com').props.value).toBe('test@example.com');
  });

  it('should allow typing in password field', async () => {
    const { getByPlaceholderText } = await render(<LoginScreen />);

    await fireEvent.changeText(getByPlaceholderText('Enter password'), 'mypassword');
    expect(getByPlaceholderText('Enter password').props.value).toBe('mypassword');
  });

  it('should show login button text', async () => {
    const { getByText } = await render(<LoginScreen />);
    expect(getByText('Log In')).toBeTruthy();
  });
});
