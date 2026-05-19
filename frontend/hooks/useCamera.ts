import { useState } from 'react';

export const useCamera = () => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  
  const requestPermission = async () => {
    setHasPermission(true);
    // TODO: Expo camera permission request
  };

  return { hasPermission, requestPermission };
};
