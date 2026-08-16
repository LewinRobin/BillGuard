import React from 'react';
import { View, Text } from 'react-native';
import { COLORS } from '../../constants/theme';

interface Props {
  label: string;
  value: string;
  subtitle?: string;
  accent?: 'default' | 'danger' | 'success';
}

const ACCENT_COLORS = {
  default: COLORS.primary,
  danger: COLORS.danger,
  success: COLORS.success,
};

export default function SummaryCard({ label, value, subtitle, accent = 'default' }: Props) {
  return (
    <View
      className="flex-1 rounded-2xl p-4"
      style={{ backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border }}>
      <Text className="mb-1 text-xs" style={{ color: COLORS.textMuted }}>
        {label}
      </Text>
      <Text className="text-xl font-bold" style={{ color: ACCENT_COLORS[accent] }}>
        {value}
      </Text>
      {subtitle && (
        <Text className="mt-0.5 text-xs" style={{ color: COLORS.textMuted }}>
          {subtitle}
        </Text>
      )}
    </View>
  );
}
