import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from '@/services/supabase';

jest.mock('expo-device', () => ({ isDevice: true }));
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: {
        eas: { projectId: '31f5693d-5a25-41f4-a95a-79b70a8135c4' },
      },
    },
  },
}));

const mockUpsert = jest.fn().mockResolvedValue({ error: null });
beforeEach(() => {
  jest.clearAllMocks();
  (supabase.from as jest.Mock).mockReturnValue({ upsert: mockUpsert });
});

describe('registerPushToken', () => {
  it('does nothing on web', async () => {
    const originalOS = Platform.OS;
    Object.defineProperty(Platform, 'OS', { get: () => 'web', configurable: true });

    const { registerPushToken } = require('@/lib/notifications');
    await registerPushToken('user-123');

    expect(Notifications.getPermissionsAsync).not.toHaveBeenCalled();
    Object.defineProperty(Platform, 'OS', { get: () => originalOS, configurable: true });
  });

  it('does nothing when permissions are not granted', async () => {
    Object.defineProperty(Platform, 'OS', { get: () => 'ios', configurable: true });
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });

    const { registerPushToken } = require('@/lib/notifications');
    await registerPushToken('user-123');

    expect(Notifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
  });

  it('passes the EAS projectId when fetching the token', async () => {
    Object.defineProperty(Platform, 'OS', { get: () => 'ios', configurable: true });
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({
      data: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
    });

    const { registerPushToken } = require('@/lib/notifications');
    await registerPushToken('user-123');

    expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalledWith({
      projectId: '31f5693d-5a25-41f4-a95a-79b70a8135c4',
    });
  });

  it('token returned is in ExponentPushToken format', async () => {
    Object.defineProperty(Platform, 'OS', { get: () => 'ios', configurable: true });
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });

    const fakeToken = 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]';
    (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({ data: fakeToken });

    const { registerPushToken } = require('@/lib/notifications');
    await registerPushToken('user-123');

    const upsertCall = mockUpsert.mock.calls[0][0];
    expect(upsertCall.token).toBe(fakeToken);
    expect(upsertCall.token).toMatch(/^ExponentPushToken\[.+\]$/);
  });

  it('handles getExpoPushTokenAsync throwing without crashing', async () => {
    Object.defineProperty(Platform, 'OS', { get: () => 'ios', configurable: true });
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    (Notifications.getExpoPushTokenAsync as jest.Mock).mockRejectedValue(new Error('token error'));

    const { registerPushToken } = require('@/lib/notifications');
    await expect(registerPushToken('user-123')).rejects.toThrow('token error');
  });
});
