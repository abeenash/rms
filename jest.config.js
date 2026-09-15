module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|react-native-reanimated|@stomp/stompjs|react-native-qrcode-svg|lucide-react-native|react-native-safe-area-context|react-native-screens|react-native-gesture-handler)',
  ],
  setupFiles: ['./__tests__/setup.js'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testPathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/helpers/',
    '/__tests__/setup\\.js$',
  ],
};
