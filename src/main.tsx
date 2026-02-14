import { cleanupLegacyZustandStores } from '@/lib/zustandPersistCleanup';
import { toast } from '@/components/ui/use-toast';

const { removedKeys } = cleanupLegacyZustandStores();

if (removedKeys.length > 0) {
  toast.warning('Old local data was cleaned automatically.', {
    description: `Cleared ${removedKeys.length} outdated local store(s) for compatibility.`,
  });
}

void import('./app-entry');
