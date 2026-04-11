import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
} from 'react-native';
import { authApi } from '../../api/auth';
import type { LoginScreenProps } from '../../navigation/types';

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focused, setFocused] = useState(false);

  const handleSendOtp = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    try {
      setLoading(true);
      setError('');
      await authApi.requestOtp(trimmed);
      navigation.navigate('VerifyOtp', { email: trimmed });
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#F7F8FA' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#F7F8FA" />
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Top decorative band */}
        <View style={{
          height: 260,
          backgroundColor: '#1A6B4A',
          borderBottomLeftRadius: 36,
          borderBottomRightRadius: 36,
          alignItems: 'center',
          justifyContent: 'flex-end',
          paddingBottom: 36,
        }}>
          {/* Shield icon made from shapes */}
          <View style={{
            width: 64,
            height: 72,
            backgroundColor: 'rgba(255,255,255,0.15)',
            borderRadius: 32,
            borderTopLeftRadius: 32,
            borderTopRightRadius: 32,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
          }}>
            <View style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              borderWidth: 3,
              borderColor: '#ffffff',
            }} />
            <View style={{
              position: 'absolute',
              bottom: 14,
              width: 16,
              height: 3,
              backgroundColor: '#ffffff',
              borderRadius: 2,
            }} />
          </View>

          <Text style={{
            color: '#ffffff',
            fontSize: 28,
            fontWeight: '700',
            letterSpacing: 0.5,
          }}>
            BillCheck
          </Text>
          <Text style={{
            color: 'rgba(255,255,255,0.75)',
            fontSize: 13,
            marginTop: 4,
            letterSpacing: 0.2,
          }}>
            Hospital bill transparency for India
          </Text>
        </View>

        {/* Card form */}
        <View style={{
          flex: 1,
          paddingHorizontal: 24,
          paddingTop: 36,
        }}>
          <Text style={{
            fontSize: 22,
            fontWeight: '700',
            color: '#1A1A1A',
            marginBottom: 6,
          }}>
            Sign in
          </Text>
          <Text style={{
            fontSize: 14,
            color: '#6B7280',
            marginBottom: 32,
            lineHeight: 20,
          }}>
            Enter your email and we'll send you a one-time code.
          </Text>

          {/* Email field */}
          <Text style={{
            fontSize: 12,
            fontWeight: '600',
            color: '#374151',
            marginBottom: 8,
            letterSpacing: 0.5,
            textTransform: 'uppercase',
          }}>
            Email Address
          </Text>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#ffffff',
            borderRadius: 14,
            borderWidth: 1.5,
            borderColor: error ? '#EF4444' : focused ? '#1A6B4A' : '#E5E7EB',
            paddingHorizontal: 16,
            height: 54,
            shadowColor: focused ? '#1A6B4A' : '#000',
            shadowOffset: { width: 0, height: focused ? 0 : 1 },
            shadowOpacity: focused ? 0.12 : 0.04,
            shadowRadius: focused ? 8 : 2,
            elevation: focused ? 3 : 1,
          }}>
            {/* Mail icon */}
            <View style={{ marginRight: 12 }}>
              <View style={{
                width: 18,
                height: 13,
                borderWidth: 1.5,
                borderColor: focused ? '#1A6B4A' : '#9CA3AF',
                borderRadius: 3,
              }} />
              <View style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: 18,
                height: 7,
                borderRightWidth: 1.5,
                borderBottomWidth: 0,
                borderColor: 'transparent',
                borderTopLeftRadius: 3,
                borderTopRightRadius: 3,
              }} />
            </View>
            <TextInput
              value={email}
              onChangeText={(t) => { setEmail(t); setError(''); }}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              style={{
                flex: 1,
                fontSize: 15,
                color: '#111827',
              }}
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {error ? (
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginTop: 8,
              gap: 6,
            }}>
              <View style={{
                width: 16,
                height: 16,
                borderRadius: 8,
                backgroundColor: '#FEE2E2',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Text style={{ color: '#EF4444', fontSize: 10, fontWeight: '700' }}>!</Text>
              </View>
              <Text style={{ fontSize: 13, color: '#EF4444' }}>{error}</Text>
            </View>
          ) : null}

          {/* CTA Button */}
          <TouchableOpacity
            onPress={handleSendOtp}
            disabled={loading || !email.trim()}
            style={{
              marginTop: 28,
              borderRadius: 14,
              height: 54,
              backgroundColor: loading || !email.trim() ? '#A7C4B5' : '#1A6B4A',
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#1A6B4A',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: loading || !email.trim() ? 0 : 0.3,
              shadowRadius: 8,
              elevation: loading || !email.trim() ? 0 : 4,
            }}
            activeOpacity={0.85}
          >
            <Text style={{
              color: '#ffffff',
              fontSize: 16,
              fontWeight: '600',
              letterSpacing: 0.3,
            }}>
              {loading ? 'Sending code…' : 'Continue with Email'}
            </Text>
          </TouchableOpacity>

          {/* Trust badges */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 20,
            marginTop: 28,
          }}>
            {['DPDP Act', 'Encrypted', 'No Ads'].map((label) => (
              <View key={label} style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
              }}>
                <View style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: '#1A6B4A',
                }} />
                <Text style={{ fontSize: 11, color: '#9CA3AF', fontWeight: '500' }}>
                  {label}
                </Text>
              </View>
            ))}
          </View>

          <Text style={{
            fontSize: 11,
            color: '#D1D5DB',
            textAlign: 'center',
            marginTop: 20,
            lineHeight: 16,
          }}>
            By continuing, you agree to our privacy policy and consent to{'\n'}
            data processing under the DPDP Act.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
