import React from 'react';
import { ActivityIndicator, View, Text } from 'react-native';
import { COLORS } from '../../constants/theme';

interface Props {
  message?: string;
}

export default function LoadingSpinner({ message }: Props) {
  return (
    <View className= "flex-1 items-center justify-center gap-3" >
    <ActivityIndicator size="large" color = { COLORS.primary } />
      { message && (
        <Text className="text-sm" style = {{ color: COLORS.textSecondary }
}>
  { message }
  </Text>
      )}
</View>
  );
}
