import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  TextInput,
} from 'react-native';
import { useBillUpload } from '../../hooks/useBillUpload';
import { billsApi } from '../../api/bills';
import type { UploadBillPayload } from '../../types/bill.types';
import type { UploadScreenProps } from '../../navigation/types';
import { SUPPORTED_STATES } from '../../constants/config';

export default function UploadScreen({ navigation }: UploadScreenProps) {
  const { pickDocument, pickImage, uploadBill, isUploading, error } = useBillUpload();
  const [pending, setPending] = useState<UploadBillPayload | null>(null);
  const [selectedState, setSelectedState] = useState('');
  const [city, setCity] = useState('');

  const handlePick = async (type: 'pdf' | 'image') => {
    const payload = type === 'pdf' ? await pickDocument() : await pickImage();
    if (payload) setPending(payload);
  };

  const handleUpload = async () => {
    if (!pending || !selectedState || !city.trim()) return;
    const billId = await uploadBill({ ...pending, city: city.trim(), state: selectedState });
    if (billId) {
      await billsApi.processBill(billId);
      navigation.replace('Analysis', { billId });
    }
  };

  const canSubmit = !!pending && !!selectedState && !!city.trim() && !isUploading;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F7F8FA' }}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {/* Step 1 */}
        <StepHeader step="1" label="Select your bill" />
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 28 }}>
          {[
            { type: 'pdf' as const, label: 'PDF File', sub: 'From your device', icon: '📄' },
            { type: 'image' as const, label: 'Photo', sub: 'Camera or gallery', icon: '📷' },
          ].map(({ type, label, sub, icon }) => {
            const selected =
              pending?.mimeType &&
              ((type === 'pdf' && pending.mimeType === 'application/pdf') ||
                (type === 'image' && pending.mimeType.startsWith('image/')));
            return (
              <TouchableOpacity
                key={type}
                onPress={() => handlePick(type)}
                activeOpacity={0.8}
                style={{
                  flex: 1,
                  backgroundColor: selected ? '#ECFDF5' : '#ffffff',
                  borderRadius: 16,
                  padding: 18,
                  alignItems: 'center',
                  borderWidth: 2,
                  borderColor: selected ? '#1A6B4A' : '#F3F4F6',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 6,
                  elevation: selected ? 3 : 1,
                }}>
                <Text style={{ fontSize: 32, marginBottom: 8 }}>{icon}</Text>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '700',
                    color: selected ? '#1A6B4A' : '#111827',
                    marginBottom: 2,
                  }}>
                  {label}
                </Text>
                <Text style={{ fontSize: 11, color: '#9CA3AF' }}>{sub}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {pending && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#ECFDF5',
              borderRadius: 12,
              padding: 12,
              marginBottom: 28,
              gap: 10,
            }}>
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: '#1A6B4A',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>✓</Text>
            </View>
            <Text
              style={{ flex: 1, fontSize: 13, color: '#065F46', fontWeight: '500' }}
              numberOfLines={1}>
              {pending.name}
            </Text>
          </View>
        )}

        {/* Step 2 */}
        <StepHeader step="2" label="Your location" />
        <Text
          style={{
            fontSize: 12,
            fontWeight: '600',
            color: '#6B7280',
            marginBottom: 8,
            letterSpacing: 0.4,
            textTransform: 'uppercase',
          }}>
          City
        </Text>
        <TextInput
          value={city}
          onChangeText={setCity}
          placeholder="e.g. Kochi, Mumbai, Delhi"
          placeholderTextColor="#9CA3AF"
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 12,
            borderWidth: 1.5,
            borderColor: city ? '#1A6B4A' : '#E5E7EB',
            paddingHorizontal: 16,
            height: 50,
            fontSize: 15,
            color: '#111827',
            marginBottom: 20,
          }}
        />

        <Text
          style={{
            fontSize: 12,
            fontWeight: '600',
            color: '#6B7280',
            marginBottom: 10,
            letterSpacing: 0.4,
            textTransform: 'uppercase',
          }}>
          State
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingBottom: 4, marginBottom: 32 }}>
          {SUPPORTED_STATES.map((s) => (
            <TouchableOpacity
              key={s}
              onPress={() => setSelectedState(s)}
              style={{
                borderRadius: 20,
                paddingHorizontal: 16,
                paddingVertical: 8,
                backgroundColor: selectedState === s ? '#1A6B4A' : '#ffffff',
                borderWidth: 1.5,
                borderColor: selectedState === s ? '#1A6B4A' : '#E5E7EB',
              }}>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '500',
                  color: selectedState === s ? '#fff' : '#374151',
                }}>
                {s}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {error && (
          <Text style={{ fontSize: 13, color: '#DC2626', marginBottom: 16, textAlign: 'center' }}>
            {error}
          </Text>
        )}

        <TouchableOpacity
          onPress={handleUpload}
          disabled={!canSubmit}
          style={{
            borderRadius: 16,
            height: 56,
            backgroundColor: canSubmit ? '#1A6B4A' : '#D1D5DB',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#1A6B4A',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: canSubmit ? 0.3 : 0,
            shadowRadius: 10,
            elevation: canSubmit ? 5 : 0,
          }}
          activeOpacity={0.85}>
          {isUploading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text
              style={{ color: canSubmit ? '#fff' : '#9CA3AF', fontSize: 16, fontWeight: '600' }}>
              Analyse Bill
            </Text>
          )}
        </TouchableOpacity>

        <Text
          style={{
            fontSize: 11,
            color: '#9CA3AF',
            textAlign: 'center',
            marginTop: 16,
            lineHeight: 17,
          }}>
          Your bill is encrypted at rest. Files are auto-deleted per our retention policy.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function StepHeader({ step, label }: { step: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 10 }}>
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 14,
          backgroundColor: '#1A6B4A',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>{step}</Text>
      </View>
      <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>{label}</Text>
    </View>
  );
}
