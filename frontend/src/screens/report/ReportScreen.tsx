import React, { useState } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, ActivityIndicator, Share } from 'react-native';
import type { ReportScreenProps } from '../../navigation/types';
import { COLORS } from '../../constants/theme';
import { billsApi } from '../../api/bills';
import { formatINR } from '../../utils/currency';

export default function ReportScreen({ route }: ReportScreenProps) {
  const { billId } = route.params;
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      const res = await billsApi.getBillAnalysis(billId);
      const bill = res.data.data;
      const flagged = bill.items.filter((i: any) => i.anomalyFlag);

      const lines = [
        'BillGuard — Bill Analysis Report',
        '==============================',
        '',
        `Hospital: ${bill.hospitalName}`,
        `Location: ${bill.city}, ${bill.state}`,
        `Total Amount: ${formatINR(bill.totalAmount)}`,
        `Risk Level: ${bill.riskLevel}`,
        ...(flagged.length > 0 ? [`Flagged Amount: ${formatINR(bill.totalFlaggedAmount)}`] : []),
        '',
        'Items:',
        ...bill.items.map(
          (i: any) =>
            `  ${i.normalizedServiceName} — ${formatINR(i.totalPrice)}${i.anomalyFlag ? ' ⚠' : ''}`
        ),
        '',
        'Powered by BillGuard',
      ];

      await Share.share({
        message: lines.join('\n'),
        title: 'Bill Analysis Report',
      });
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 px-4 pt-8" style={{ backgroundColor: COLORS.background }}>
      <View
        className="mb-6 rounded-2xl p-6"
        style={{ backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border }}>
        <Text className="mb-1 text-base font-semibold" style={{ color: COLORS.textPrimary }}>
          Download PDF Report
        </Text>
        <Text className="text-sm" style={{ color: COLORS.textSecondary }}>
          A detailed breakdown of all bill items, flagged anomalies, and regional benchmark
          comparisons.
        </Text>
      </View>

      <TouchableOpacity
        className="items-center rounded-2xl py-4"
        style={{ backgroundColor: COLORS.primary, opacity: loading ? 0.6 : 1 }}
        onPress={handleDownload}
        disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-base font-semibold text-white">Download Report</Text>
        )}
      </TouchableOpacity>

      <Text className="mt-4 text-center text-xs" style={{ color: COLORS.textMuted }}>
        Reports do not contain raw OCR data. All personally identifiable information is handled per
        the DPDP Act.
      </Text>
    </SafeAreaView>
  );
}
