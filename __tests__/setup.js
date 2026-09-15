jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: jest.fn(),
    push: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
  useGlobalSearchParams: () => ({}),
  Link: 'Link',
  Stack: { Screen: 'Screen' },
  router: { replace: jest.fn(), push: jest.fn(), back: jest.fn() },
}));

jest.mock('expo-print', () => ({
  printAsync: jest.fn(() => Promise.resolve()),
  printToFileAsync: jest.fn(() => Promise.resolve({ uri: 'file://test.pdf' })),
}));

jest.mock('expo-sharing', () => ({
  shareAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true, ios: { status: 1 } })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true, ios: { status: 1 } })),
  scheduleNotificationAsync: jest.fn(() => Promise.resolve()),
  setNotificationChannelAsync: jest.fn(() => Promise.resolve()),
  AndroidImportance: { HIGH: 4 },
  IosAuthorizationStatus: { AUTHORIZED: 1 },
}));

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn(() => Promise.resolve({ isConnected: true })),
}));

jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

jest.mock('@stomp/stompjs', () => ({
  Client: jest.fn().mockImplementation(() => ({
    activate: jest.fn(),
    deactivate: jest.fn(),
    subscribe: jest.fn(),
    onConnect: null,
    onDisconnect: null,
    onWebSocketError: null,
    onStompError: null,
  })),
  ReconnectionTimeMode: { EXPONENTIAL: 1 },
}));

jest.mock('react-native-qrcode-svg', () => 'QRCodeSvg');

jest.mock('lucide-react-native', () => {
  const React = require('react');
  const createMockIcon = (name) => {
    const MockIcon = (props) => React.createElement('Icon', { ...props, testID: `icon-${name}` });
    MockIcon.displayName = name;
    return MockIcon;
  };
  return new Proxy({}, {
    get: (target, prop) => {
      if (typeof prop === 'string') {
        return createMockIcon(prop);
      }
      return undefined;
    }
  });
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: ({ children }) => children,
}));

jest.mock('expo-font', () => ({
  useFonts: () => [true, null],
  loadAsync: jest.fn(),
}));

jest.mock('expo-splash-screen', () => ({
  hideAsync: jest.fn(),
  preventAutoHideAsync: jest.fn(),
}));

jest.mock('react-native-gesture-handler', () => {
  const View = require('react-native').View;
  return {
    GestureHandlerRootView: View,
    Gesture: { Pan: () => ({}) },
  };
});

jest.mock('react-native-screens', () => {
  const View = require('react-native').View;
  return {
    ScreenContainer: View,
    Screen: View,
  };
});

jest.mock('react-native-pager-view', () => {
  const View = require('react-native').View;
  return {
    __esModule: true,
    default: View,
  };
});

jest.mock('react-native-web', () => ({
  View: require('react-native').View,
  Text: require('react-native').Text,
  TextInput: require('react-native').TextInput,
  TouchableOpacity: require('react-native').TouchableOpacity,
  ScrollView: require('react-native').ScrollView,
  StyleSheet: require('react-native').StyleSheet,
  Platform: require('react-native').Platform,
  Dimensions: require('react-native').Dimensions,
  Animated: require('react-native').Animated,
  Modal: require('react-native').Modal,
  TouchableWithoutFeedback: require('react-native').TouchableWithoutFeedback,
  KeyboardAvoidingView: require('react-native').KeyboardAvoidingView,
  StatusBar: require('react-native').StatusBar,
  ToastAndroid: { showWithGravity: jest.fn() },
}));

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  RN.ToastAndroid = { showWithGravity: jest.fn() };
  RN.Platform.OS = 'android';
  return RN;
});
