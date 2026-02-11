import { ChevronLeft } from 'lucide-react';

export function BackButton({ onClick }: { onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
      aria-label="Go back"
    >
      <ChevronLeft size={20} />
      <span>Back</span>
    </button>
  );
}
