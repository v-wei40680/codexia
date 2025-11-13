type StdioMcpServerConfig = {
  type?: "stdio";
  command: string;
  args: string[];
  env?: Record<string, string>;
};

type HttpMcpServerConfig = {
  type: "http";
  url: string;
};

type SseMcpServerConfig = {
  type: "sse";
  url: string;
};

export type McpServerConfig =
  | StdioMcpServerConfig
  | HttpMcpServerConfig
  | SseMcpServerConfig;
