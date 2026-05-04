module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['./jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)',
  ],
  moduleNameMapper: {
    '^@/services/supabase$': '<rootDir>/__mocks__/services/supabase.js',
    '^(\\.{1,2}/)+services/supabase(\\.js)?$': '<rootDir>/__mocks__/services/supabase.js',
    '^\\.\/supabase(\\.js)?$': '<rootDir>/__mocks__/services/supabase.js',
    '^@/(.*)$': '<rootDir>/$1',
  },
};
