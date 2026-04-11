import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import type { Bill } from '../../types/bill.types';
import { formatINR } from '../../utils/currency';
import { COLORS } from '../../constants/theme';
import RiskBadge from '../common/RiskBadge';

interface Props {
  bill: Bill;
  onPress: () => void;
}

export default function BillCard({ bill, onPress }: Props) {
  const flaggedCount = bill.items.filter((i) => i.anomalyFlag).length;

  return (
    <TouchableOpacity
      onPress={onPress}
      className="rounded-2xl p-4 mb-3"
      style={{ backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border }}
      activeOpacity={0.75}
    >
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-1 mr-3">
          <Text className="font-semibold text-base" style={{ color: COLORS.textPrimary }} numberOfLines={1}>
            {bill.hospitalName}
          </Text>
          <Text className="text-xs mt-0.5" style={{ color: COLORS.textMuted }}>
            {bill.city}, {bill.state}
          </Text>
        </View>
        <RiskBadge level={bill.riskLevel} />
      </View>

      <View className="flex-row justify-between items-end mt-3">
        <View>
          <Text className="text-xs" style={{ color: COLORS.textMuted }}>Total Amount</Text>
          <Text className="text-lg font-bold mt-0.5" style={{ color: COLORS.textPrimary }}>
            {formatINR(bill.totalAmount)}
          </Text>
        </View>
        {flaggedCount > 0 && (
          <View>
            <Text className="text-xs text-right" style={{ color: COLORS.textMuted }}>Flagged Items</Text>
            <Text className="text-base font-semibold text-right mt-0.5" style={{ color: COLORS.danger }}>
              {flaggedCount} item{flaggedCount !== 1 ? 's' : ''}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}
