export function DefaultEventContent({
  message,
  type,
}: {
  message?: string | null;
  type: string;
}) {
  if (message) {
    return (
      <p className="whitespace-pre-wrap leading-relaxed">
        {message}
      </p>
    );
  }

  return (
    <p className="text-xs text-muted-foreground">
      Received an event of type {type}.
    </p>
  );
}
