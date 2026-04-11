import React from 'react';
import { View, Text } from 'react-native';
import type { AnomalyLevel } from '../../types/bill.types';
import { RISK_COLORS, RISK_BG_COLORS } from '../../constants/theme';

interface Props {
  level: AnomalyLevel;
}

const LABELS: Record<AnomalyLevel, string> = {
  none: 'All Clear',
  low: 'Low Risk',
  medium: 'Medium Risk',
  high: 'High Risk',
};

export default function RiskBadge({ level }: Props) {
  return (
    <View
      className= "rounded-full px-3 py-1 self-start"
  style = {{ backgroundColor: RISK_BG_COLORS[level] }
}
    >
  <Text
        className="text-xs font-semibold"
style = {{ color: RISK_COLORS[level] }}
      >
  { LABELS[level]}
  </Text>
  </View>
  );
}
