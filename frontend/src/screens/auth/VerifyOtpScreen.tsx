import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { authApi } from '../../api/auth';
import { useAuthStore } from '../../store/useAuthStore';
import type { VerifyOtpScreenProps } from '../../navigation/types';
import { COLORS } from '../../constants/theme';

export default function VerifyOtpScreen({ route }: VerifyOtpScreenProps) {
  const { email } = route.params;
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const setAuth = useAuthStore((s) => s.setAuth);

  const handleVerify = async () => {
    if (otp.length !== 6) {
      setError('Enter the 6-digit OTP sent to your email.');
      return;
    }
    try {
      setLoading(true);
      setError('');
      const res = await authApi.verifyOtp(email, otp);
      const { user, accessToken } = res.data.data;
      setAuth(user, accessToken);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 justify-center px-6"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ backgroundColor: COLORS.background }}
    >
      <Text className="text-2xl font-bold mb-2" style={{ color: COLORS.textPrimary }}>
        Check your email
      </Text>
      <Text className="text-sm mb-8" style={{ color: COLORS.textSecondary }}>
        We sent a 6-digit code to {email}
      </Text>

      <TextInput
        value={otp}
        onChangeText={(t) => { setOtp(t.replace(/\D/g, '').slice(0, 6)); setError(''); }}
        placeholder="000000"
        keyboardType="number-pad"
        maxLength={6}
        className="rounded-xl px-4 py-4 text-2xl text-center tracking-widest mb-4"
        style={{
          backgroundColor: COLORS.surface,
          borderWidth: 1,
          borderColor: error ? COLORS.danger : COLORS.border,
          color: COLORS.textPrimary,
          letterSpacing: 8,
        }}
        placeholderTextColor={COLORS.textMuted}
      />

      {error ? (
        <Text className="text-sm mb-4" style={{ color: COLORS.danger }}>{error}</Text>
      ) : null}

      <TouchableOpacity
        onPress={handleVerify}
        disabled={loading || otp.length !== 6}
        className="rounded-xl py-4 items-center"
        style={{ backgroundColor: (loading || otp.length !== 6) ? '#A8D5BF' : COLORS.primary }}
      >
        <Text className="text-white font-semibold text-base">
          {loading ? 'Verifying...' : 'Verify OTP'}
        </Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}
