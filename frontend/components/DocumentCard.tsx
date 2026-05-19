import React from 'react';
import { View, Text } from 'react-native';
import { Document } from '../types';

interface Props {
  document: Document;
}

export const DocumentCard: React.FC<Props> = ({ document }) => {
  return (
    <View className="p-4 bg-white rounded-lg shadow mb-4">
      <Text className="text-lg font-bold">{document.filename}</Text>
      <Text className="text-gray-500">{document.uploadedAt}</Text>
    </View>
  );
};
