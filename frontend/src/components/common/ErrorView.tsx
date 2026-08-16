import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { COLORS } from '../../constants/theme';

interface Props {
  message: string;
  onRetry?: () => void;
}

export default function ErrorView({ message, onRetry }: Props) {
  return (
    <View className="flex-1 items-center justify-center gap-4 px-6">
      <Text className="text-center text-base" style={{ color: COLORS.textSecondary }}>
        {message}
      </Text>
      {onRetry && (
        <TouchableOpacity
          onPress={onRetry}
          className="rounded-lg px-6 py-3"
          style={{ backgroundColor: COLORS.primary }}>
          <Text className="text-sm font-semibold text-white">Try Again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
