export type { Message} from "./Message"
export type { McpServerConfig } from "./mcp"
import { EventMsg } from "@/bindings/EventMsg";

export interface Line {
  method: string;
  params: {
    id: string;
    msg: EventMsg;
    conversationId: string;
  };
}