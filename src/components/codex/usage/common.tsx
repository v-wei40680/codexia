import { Button } from '@/components/ui/button';

export function LoadingState() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading usage data...</p>
      </div>
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={onRetry}>Try Again</Button>
      </div>
    </div>
  );
}

export function EmptyState({ onRefresh }: { onRefresh: () => void }) {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <p className="text-gray-600 mb-4">No usage data available</p>
        <Button onClick={onRefresh}>Refresh</Button>
      </div>
    </div>
  );
}
