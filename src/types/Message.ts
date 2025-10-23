import { EventMsg } from "@/bindings/EventMsg";

export type EventWithId = { id: string; msg: EventMsg; request_id?: number };

export interface Message {
  id: string;
  conversationId: string;
  type: string;
  timestamp: number;
  payload: any;
}
