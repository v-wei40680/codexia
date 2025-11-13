export interface Plan {
  step: string;
  status: string;
}

export type MessageRole = "user" | "assistant";
export type MessageVariant = "reasoning" | "response" | "plan";

export interface ReviewMessage {
  id: string;
  role?: MessageRole;
  type: string;
  content?: string;
  plan?: Plan[];
  variant?: MessageVariant;
  title?: string;
}
