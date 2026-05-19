import React from 'react';
import { View, Text } from 'react-native';
import { Entity } from '../types';

interface Props {
  entity: Entity;
}

export const EntityBadge: React.FC<Props> = ({ entity }) => {
  return (
    <View className="bg-blue-100 rounded-full px-3 py-1 mr-2">
      <Text className="text-blue-800 text-sm">
        {entity.type.toUpperCase()}: {entity.value}
      </Text>
    </View>
  );
};
