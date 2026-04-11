import React from 'react';
import { View, Text, TouchableOpacity, SafeAreaView } from 'react-native';
import type { ReportScreenProps } from '../../navigation/types';
import { COLORS } from '../../constants/theme';

export default function ReportScreen({ route }: ReportScreenProps) {
  const { billId } = route.params;

  return (
    <SafeAreaView className="flex-1 px-4 pt-8" style={{ backgroundColor: COLORS.background }}>
      <View
        className="rounded-2xl p-6 mb-6"
        style={{ backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border }}
      >
        <Text className="text-base font-semibold mb-1" style={{ color: COLORS.textPrimary }}>
          Download PDF Report
        </Text>
        <Text className="text-sm" style={{ color: COLORS.textSecondary }}>
          A detailed breakdown of all bill items, flagged anomalies, and regional benchmark comparisons.
        </Text>
      </View>

      <TouchableOpacity
        className="rounded-2xl py-4 items-center"
        style={{ backgroundColor: COLORS.primary }}
        onPress={() => {
          // TODO: call /bill/{id}/report endpoint and trigger share sheet
        }}
      >
        <Text className="text-white font-semibold text-base">Download Report</Text>
      </TouchableOpacity>

      <Text className="text-xs text-center mt-4" style={{ color: COLORS.textMuted }}>
        Reports do not contain raw OCR data. All personally identifiable information is handled per the DPDP Act.
      </Text>
    </SafeAreaView>
  );
}
