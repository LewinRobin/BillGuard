import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import type { BillItem } from '../../types/bill.types';
import { formatINR } from '../../utils/currency';
import { getAnomalyLabel } from '../../utils/anomaly';
import { COLORS } from '../../constants/theme';

interface Props {
  item: BillItem;
}

export default function BillItemRow({ item }: Props) {
  const [expanded, setExpanded] = useState(false);
  const isFlagged = item.anomalyFlag;

  return (
    <TouchableOpacity
      onPress={() => setExpanded((p) => !p)}
      activeOpacity={0.8}
      className="mb-2 overflow-hidden rounded-xl"
      style={{
        backgroundColor: isFlagged ? COLORS.dangerLight : COLORS.surface,
        borderWidth: 1,
        borderColor: isFlagged ? '#F5C6BC' : COLORS.border,
      }}>
      <View className="flex-row items-center justify-between p-3">
        <View className="mr-3 flex-1">
          <Text
            className="text-sm font-medium"
            style={{ color: COLORS.textPrimary }}
            numberOfLines={2}>
            {item.normalizedServiceName}
          </Text>
          {isFlagged && (
            <Text className="mt-1 text-xs" style={{ color: COLORS.danger }}>
              ⚠ {getAnomalyLabel(item.percentAboveAverage)}
            </Text>
          )}
        </View>
        <Text
          className="text-sm font-semibold"
          style={{ color: isFlagged ? COLORS.danger : COLORS.textPrimary }}>
          {formatINR(item.totalPrice)}
        </Text>
      </View>

      {expanded && (
        <View
          className="px-3 pb-3 pt-1"
          style={{ borderTopWidth: 1, borderTopColor: isFlagged ? '#F5C6BC' : COLORS.border }}>
          {item.avgRegionalPrice != null && (
            <>
              <View className="mt-1 flex-row justify-between">
                <Text className="text-xs" style={{ color: COLORS.textMuted }}>
                  Regional average
                </Text>
                <Text className="text-xs font-medium" style={{ color: COLORS.textSecondary }}>
                  {formatINR(item.avgRegionalPrice)}
                </Text>
              </View>
              <View className="mt-1 flex-row justify-between">
                <Text className="text-xs" style={{ color: COLORS.textMuted }}>
                  Fair range
                </Text>
                <Text className="text-xs font-medium" style={{ color: COLORS.textSecondary }}>
                  {formatINR(item.minRegionalPrice ?? 0)} – {formatINR(item.maxRegionalPrice ?? 0)}
                </Text>
              </View>
            </>
          )}
          <View className="mt-1 flex-row justify-between">
            <Text className="text-xs" style={{ color: COLORS.textMuted }}>
              Qty
            </Text>
            <Text className="text-xs font-medium" style={{ color: COLORS.textSecondary }}>
              {item.quantity}
            </Text>
          </View>
          {item.avgRegionalPrice == null && (
            <Text className="mt-1 text-xs" style={{ color: COLORS.textMuted }}>
              No benchmark data available for this service.
            </Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}
