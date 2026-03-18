// hooks/useTrafficLightConfig.ts
import { useMemo } from 'react';
import { isMacos } from '@/hooks/runtime';

export const useTrafficLightConfig = (isSidebarOpen: boolean) => {
  const needsTrafficLightOffset = useMemo(() => {
    return isMacos && !isSidebarOpen;
  }, [isSidebarOpen]);

  return {
    isMacos,
    needsTrafficLightOffset,
  };
};
