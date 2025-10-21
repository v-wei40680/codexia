export type { Message} from "./Message"
import { EventMsg } from "@/bindings/EventMsg";

export interface Line {
  method: string;
  params: {
    id: string;
    msg: EventMsg;
    conversationId: string;
  };
}