interface ErrorBannerProps {
  error: string | null;
}

export default function ErrorBanner({ error }: ErrorBannerProps) {
  if (!error) return null;
  return (
    <p className="rounded-lg border border-red-500/40 bg-red-500/15 px-3 py-2 text-xs text-red-200">{error}</p>
  );
}
