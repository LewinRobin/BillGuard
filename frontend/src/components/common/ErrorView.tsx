import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { COLORS } from '../../constants/theme';

interface Props {
  message: string;
  onRetry?: () => void;
}

export default function ErrorView({ message, onRetry }: Props) {
  return (
    <View className="flex-1 items-center justify-center px-6 gap-4">
      <Text className="text-base text-center" style={{ color: COLORS.textSecondary }}>
        {message}
      </Text>
      {onRetry && (
        <TouchableOpacity
          onPress={onRetry}
          className="rounded-lg px-6 py-3"
          style={{ backgroundColor: COLORS.primary }}
        >
          <Text className="text-white font-semibold text-sm">Try Again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
