interface EmptyStateProps {
  isSessionLoading: boolean;
  hasSelection: boolean;
}

export default function EmptyState({ isSessionLoading, hasSelection }: EmptyStateProps) {
  return (
    <p className="py-6 text-center text-sm text-slate-500">
      {isSessionLoading
        ? "Loading conversation…"
        : hasSelection
        ? "No messages found for this session."
        : "Select a conversation to view messages."}
    </p>
  );
}
