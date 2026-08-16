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
      className="mb-3 rounded-2xl p-4"
      style={{ backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border }}
      activeOpacity={0.75}>
      <View className="mb-2 flex-row items-start justify-between">
        <View className="mr-3 flex-1">
          <Text
            className="text-base font-semibold"
            style={{ color: COLORS.textPrimary }}
            numberOfLines={1}>
            {bill.hospitalName}
          </Text>
          <Text className="mt-0.5 text-xs" style={{ color: COLORS.textMuted }}>
            {bill.city}, {bill.state}
          </Text>
        </View>
        <RiskBadge level={bill.riskLevel} />
      </View>

      <View className="mt-3 flex-row items-end justify-between">
        <View>
          <Text className="text-xs" style={{ color: COLORS.textMuted }}>
            Total Amount
          </Text>
          <Text className="mt-0.5 text-lg font-bold" style={{ color: COLORS.textPrimary }}>
            {formatINR(bill.totalAmount)}
          </Text>
        </View>
        {flaggedCount > 0 && (
          <View>
            <Text className="text-right text-xs" style={{ color: COLORS.textMuted }}>
              Flagged Items
            </Text>
            <Text
              className="mt-0.5 text-right text-base font-semibold"
              style={{ color: COLORS.danger }}>
              {flaggedCount} item{flaggedCount !== 1 ? 's' : ''}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}
