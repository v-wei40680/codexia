import { create } from "zustand";
import { persist } from "zustand/middleware";
import { EventMsg } from "@/bindings/EventMsg";
import { Message } from "@/types";
import { EventWithId } from "@/types/Message";

type ConversationStore = {
  messages: Record<string, Message[]>;
  currentMessage: string;
};

type ChatActions = {
  addMessage: (conversationId: string, message: Message) => void;
  updateLastAgentMessage: (conversationId: string, event: EventWithId) => void;
  deleteMessages: (conversationId: string) => void;
  setCurrentMessage: (message: string) => void;
};

const extractEventContent = (msg: EventMsg): string => {
  switch (msg.type) {
    case "agent_message":
      return msg.message;
    case "agent_reasoning_raw_content":
      return msg.text;
    default:
      return "";
  }
};

export const useConversationStore = create<ConversationStore & ChatActions>()(
  persist(
    (set, get) => ({
      messages: {},
      currentMessage: "",

      addMessage: (conversationId, message) => {
        set((state) => ({
          messages: {
            ...state.messages,
            [conversationId]: [
              ...(state.messages[conversationId] || []),
              message,
            ],
          },
        }));
      },

      updateLastAgentMessage: (conversationId, event) => {
        if (
          event.msg.type === "agent_message" ||
          event.msg.type === "agent_reasoning_raw_content"
        ) {
          const messages = get().messages[conversationId] || [];
          const lastMessage = messages[messages.length - 1];
          const newContent = extractEventContent(event.msg);

          if (lastMessage?.role === "assistant") {
            const existingEvents = lastMessage.events || [];
            const sameIdExists = existingEvents.some((e) => e.id === event.id);

            let updatedEvents;
            let updatedContent;

            if (sameIdExists) {
              // Append new content for the same event.id
              updatedEvents = [...existingEvents, event];
              updatedContent = lastMessage.content + "\n" + newContent;
            } else {
              // Add as a separate event if id is different
              updatedEvents = [...existingEvents, event];
              updatedContent = lastMessage.content + "\n" + newContent;
            }

            const updatedMessage = {
              ...lastMessage,
              content: updatedContent,
              events: updatedEvents,
            };

            set((state) => ({
              messages: {
                ...state.messages,
                [conversationId]: [...messages.slice(0, -1), updatedMessage],
              },
            }));
          } else {
            // Create new assistant message if none exists
            get().addMessage(conversationId, {
              id: event.id,
              role: "assistant",
              content: newContent,
              timestamp: Date.now(),
              events: [event],
            });
          }
        }
      },

      deleteMessages: (conversationId) => {
        set((state) => {
          const { [conversationId]: _, ...rest } = state.messages;
          return { messages: rest };
        });
      },

      setCurrentMessage: (message) => set({ currentMessage: message }),
    }),

    {
      name: "conversation",
    },
  ),
);
