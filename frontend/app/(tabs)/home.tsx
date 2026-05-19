import React from 'react';
import { router } from 'expo-router';
import DocAgentHomeScreen from '../../components/DocAgentHomeScreen';

export default function HomeScreenRoute() {
  return (
    <DocAgentHomeScreen userName="Admin" />
  );
}
