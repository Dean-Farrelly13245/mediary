import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import { useAuth } from '@/context/AuthContext';
import { getProfile, updateProfile, uploadAvatar } from '@/services/profile';
import AppPressable from '@/components/AppPressable';
import ScreenHeader from '@/components/ScreenHeader';
import { SkeletonProfileHeader } from '@/components/Skeleton';
import { useToast } from '@/context/ToastContext';

export default function EditProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [localImage, setLocalImage] = useState<string | null>(null);
  const [localImageBase64, setLocalImageBase64] = useState<string | null>(null);
  const [localImageMime, setLocalImageMime] = useState<string>('image/jpeg');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user || !user.id) {
      setLoading(false);
      return;
    }

    let active = true;

    async function load() {
      try {
        const profile = await getProfile(user.id);

        if (!active) return;

        setDisplayName(
          profile?.display_name || profile?.username || user.email || ''
        );
        setBio(profile?.bio || '');
        setAvatarUrl(profile?.avatar_url || null);
      } catch (err) {
        console.log('Failed to load profile for edit:', err);
        toast.error('Could not load profile');
      } finally {
        setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [user]);

  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      toast.info('Photo permission required');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      setLocalImage(asset.uri);
      setLocalImageBase64(asset.base64 ?? null);
      setLocalImageMime(asset.mimeType ?? 'image/jpeg');
    }
  }

  async function handleSave() {
    if (!user || !user.id) return;

    try {
      setSaving(true);

      let finalAvatarUrl = avatarUrl;
      if (localImage && localImageBase64) {
        finalAvatarUrl = await uploadAvatar(user.id, localImage, localImageBase64, localImageMime);
      }

      await updateProfile(user.id, {
        display_name: displayName.trim(),
        bio: bio.trim(),
        avatar_url: finalAvatarUrl,
      });

      toast.success('Profile updated');
      router.back();
    } catch (err) {
      console.log('Failed to save profile:', err);
      toast.error('Could not save profile');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-950" edges={['left', 'right', 'bottom']}>
        <ScreenHeader title="Edit Profile" />
        <SkeletonProfileHeader />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-950" edges={['left', 'right', 'bottom']}>
      <ScreenHeader title="Edit Profile" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ padding: 16 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="items-center mb-6">
            {localImage || avatarUrl ? (
              <Image
                source={{ uri: localImage || (avatarUrl as string) }}
                className="h-24 w-24 rounded-full mb-3"
              />
            ) : (
              <View className="h-24 w-24 rounded-full bg-slate-900 items-center justify-center mb-3">
                <Ionicons name="person" size={40} color="#e5e7eb" />
              </View>
            )}

            <AppPressable
              onPress={pickImage}
              className="px-4 py-2 rounded-full bg-indigo-600"
              accessibilityRole="button"
              accessibilityLabel="Change profile picture"
            >
              <Text className="text-slate-50 text-sm">Change picture</Text>
            </AppPressable>
          </View>

          <View className="mb-4">
            <Text className="text-xs text-slate-400 mb-1">Name</Text>
            <TextInput
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Your name"
              placeholderTextColor="#64748b"
              className="rounded-xl bg-slate-900 px-3 py-2 text-slate-50"
            />
          </View>

          <View className="mb-6">
            <Text className="text-xs text-slate-400 mb-1">Bio</Text>
            <TextInput
              value={bio}
              onChangeText={setBio}
              placeholder="Tell people what you like to watch / play / read."
              placeholderTextColor="#64748b"
              className="rounded-xl bg-slate-900 px-3 py-2 text-slate-50"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <AppPressable
            disabled={saving}
            onPress={handleSave}
            className="items-center rounded-xl bg-indigo-600 py-3"
            accessibilityRole="button"
            accessibilityLabel="Save profile changes"
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-slate-50 font-semibold">Save changes</Text>
            )}
          </AppPressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
