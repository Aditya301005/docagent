import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { Colors } from '../constants/colors';

interface Props {
  visible: boolean;
  message?: string;
}

export const LoadingOverlay: React.FC<Props> = ({ visible, message = 'Loading...' }) => {
  if (!visible) return null;
  return (
    <View className="absolute inset-0 bg-black/50 justify-center items-center z-50">
      <ActivityIndicator size="large" color={Colors.primary} />
      <Text className="text-white mt-4">{message}</Text>
    </View>
  );
};
