type TokenCountShape = {
  input_tokens?: number;
  cached_input_tokens?: number;
  output_tokens?: number;
  reasoning_output_tokens?: number;
  total_tokens: number;
};

interface TokenCountInfoProps {
  usage: TokenCountShape | null | undefined;
  className?: string;
}

export function TokenCountInfo({ usage, className }: TokenCountInfoProps) {
  if (!usage || typeof usage.total_tokens !== "number") {
    return null;
  }

  return (
    <div className={"flex items-center gap-3 " + (className ?? "")}>
      <div className="text-sm">
        <span className="text-muted-foreground">Total</span>{" "}
        <span className="font-medium">{usage.total_tokens.toLocaleString()}</span>
        <span className="text-muted-foreground"> tokens</span>
      </div>
    </div>
  );
}

export default TokenCountInfo;
