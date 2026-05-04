import logo from '@/assets/icons/logo.png';
import { useAuth } from '@/context/AuthContext';
import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Image, Text, TextInput, View, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import AppPressable from '@/components/AppPressable';
import { useToast } from '@/context/ToastContext';

export default function Login() {
  const { signIn } = useAuth();
  const router = useRouter();
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      toast.info('Please enter email and password');
      return;
    }
    setLoading(true);
    const { error } = await signIn(email.trim(), password);
    setLoading(false);

    if (error) {
      toast.error(error);
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <KeyboardAvoidingView 
      className="flex-1 bg-background" 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="w-full flex-row justify-center mt-5 mb-12">
          <Image
            source={logo}
            className="w-56 h-56"
            resizeMode="contain"
          />
        </View>

        <Text className="text-white text-3xl font-bold mb-6">Welcome</Text>

        <TextInput
          className="bg-[#1A1B2E] text-white rounded-xl px-4 py-3 mb-4"
          placeholder="Email"
          placeholderTextColor="#888"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          className="bg-[#1A1B2E] text-white rounded-xl px-4 py-3 mb-6"
          placeholder="Password"
          placeholderTextColor="#888"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <AppPressable
          className="bg-[#7B3FF2] rounded-xl py-3 items-center mb-5"
          disabled={loading}
          onPress={handleLogin}
          accessibilityRole="button"
          accessibilityLabel="Sign in"
        >
          <Text className="text-white font-semibold">
            {loading ? 'Signing in...' : 'Sign In'}
          </Text>
        </AppPressable>

        <Text className="text-white text-center mb-8">
          Don't have an account?{' '}
          <Link href="/signup" className="text-[#7B3FF2] font-semibold">
            Sign Up
          </Link>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
