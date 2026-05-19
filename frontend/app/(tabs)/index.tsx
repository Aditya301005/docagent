import React from 'react';
import DocAgentHomeScreen from '../../components/DocAgentHomeScreen';

import AsyncStorage from '@react-native-async-storage/async-storage';

export default function HomeTabIndexRoute() {
  const [name, setName] = React.useState('User');
  
  React.useEffect(() => {
    AsyncStorage.getItem('user_name').then(val => {
      if (val) setName(val);
    });
  }, []);

  return <DocAgentHomeScreen userName={name} />;
}
