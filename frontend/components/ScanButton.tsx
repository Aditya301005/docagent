import React from 'react';
import { TouchableOpacity, Text } from 'react-native';

interface Props {
  onPress: () => void;
  title?: string;
}

export const ScanButton: React.FC<Props> = ({ onPress, title = 'Scan Document' }) => {
  return (
    <TouchableOpacity 
      className="bg-blue-500 py-3 px-6 rounded-full items-center"
      onPress={onPress}
    >
      <Text className="text-white font-bold text-lg">{title}</Text>
    </TouchableOpacity>
  );
};
