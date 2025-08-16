import { create } from "zustand";
import { persist } from "zustand/middleware";
import { invoke } from "@tauri-apps/api/core";
import type { Conversation, ChatMessage, ChatMode } from "@/types/chat";

interface ConversationStore {
  conversations: Conversation[];
  currentConversationId: string | null;
  sessionDisconnected: boolean;
  pendingUserInput: string | null;

  // Conversation management
  createConversation: (title?: string, mode?: ChatMode) => string;
  createConversationWithSessionId: (sessionId: string, title?: string, mode?: ChatMode) => void;
  deleteConversation: (id: string) => void;
  setCurrentConversation: (id: string) => void;
  updateConversationTitle: (id: string, title: string) => void;
  updateConversationMode: (id: string, mode: ChatMode) => void;
  toggleFavorite: (id: string) => void;

  // Session management
  setSessionDisconnected: (disconnected: boolean) => void;
  setPendingUserInput: (input: string | null) => void;
  addDisconnectionWarning: (conversationId: string) => void;

  // Message management
  addMessage: (conversationId: string, message: ChatMessage) => void;
  updateLastMessage: (conversationId: string, content: string) => void;

  // Getters
  getCurrentConversation: () => Conversation | null;
  getCurrentMessages: () => ChatMessage[];
}

const generateTitle = (messages: ChatMessage[]): string => {
  const firstUserMessage = messages.find((msg) => msg.role === "user");
  if (firstUserMessage) {
    const content = firstUserMessage.content.trim();
    return content.length > 50 ? content.substring(0, 50) + "..." : content;
  }
  return "New Conversation";
};

// Function to get the latest codex session ID
const getLatestCodexSessionId = async (): Promise<string | null> => {
  try {
    const result = await invoke<string | null>('get_latest_session_id');
    return result;
  } catch (error) {
    console.error('Failed to get latest session ID:', error);
    return null;
  }
};

// Export async function to create conversation with latest codex session ID
export const createConversationWithLatestSession = async (title?: string, mode: ChatMode = "agent"): Promise<string> => {
  const sessionId = await getLatestCodexSessionId();
  const store = useConversationStore.getState();
  
  if (sessionId) {
    // Check if conversation with this session ID already exists
    const existingConversation = store.conversations.find(conv => conv.id === sessionId);
    if (existingConversation) {
      store.setCurrentConversation(sessionId);
      return sessionId;
    }
    
    // Create new conversation with codex session ID
    store.createConversationWithSessionId(sessionId, title, mode);
    return sessionId;
  } else {
    // Fallback to regular conversation creation
    return store.createConversation(title, mode);
  }
};

export const useConversationStore = create<ConversationStore>()(
  persist(
    (set, get) => ({
      conversations: [],
      currentConversationId: null,
      sessionDisconnected: false,
      pendingUserInput: null,

      createConversation: (title?: string, mode: ChatMode = "agent") => {
        const id = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const now = Date.now();
        const newConversation: Conversation = {
          id,
          title: title || "New Conversation",
          messages: [],
          mode,
          createdAt: now,
          updatedAt: now,
          isFavorite: false,
        };

        set((state) => ({
          conversations: [newConversation, ...state.conversations],
          currentConversationId: id,
        }));

        return id;
      },

      createConversationWithSessionId: (sessionId: string, title?: string, mode: ChatMode = "agent") => {
        const now = Date.now();
        const newConversation: Conversation = {
          id: sessionId,
          title: title || "New Conversation",
          messages: [],
          mode,
          createdAt: now,
          updatedAt: now,
          isFavorite: false,
        };

        set((state) => ({
          conversations: [newConversation, ...state.conversations],
          currentConversationId: sessionId,
        }));
      },

      deleteConversation: (id: string) => {
        set((state) => {
          const updatedConversations = state.conversations.filter(
            (conv) => conv.id !== id,
          );
          const newCurrentId =
            state.currentConversationId === id
              ? updatedConversations.length > 0
                ? updatedConversations[0].id
                : null
              : state.currentConversationId;
          
          console.log("deleteConversation", id)

          return {
            conversations: updatedConversations,
            currentConversationId: newCurrentId,
          };
        });
      },

      setCurrentConversation: (id: string) => {
        set({ currentConversationId: id });
      },

      updateConversationTitle: (id: string, title: string) => {
        set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === id ? { ...conv, title, updatedAt: Date.now() } : conv,
          ),
        }));
      },

      updateConversationMode: (id: string, mode: ChatMode) => {
        set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === id ? { ...conv, mode, updatedAt: Date.now() } : conv,
          ),
        }));
      },

      toggleFavorite: (id: string) => {
        set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === id 
              ? { ...conv, isFavorite: !conv.isFavorite, updatedAt: Date.now() } 
              : conv,
          ),
        }));
      },

      setSessionDisconnected: (disconnected: boolean) => {
        set({ sessionDisconnected: disconnected });
      },

      setPendingUserInput: (input: string | null) => {
        set({ pendingUserInput: input });
      },

      addDisconnectionWarning: (conversationId: string) => {
        const warningMessage: ChatMessage = {
          id: `${conversationId}-disconnection-warning-${Date.now()}`,
          role: "system",
          content: "⚠️ Codex session has been disconnected. Your previous conversation history cannot be resumed. Please start a new conversation to continue chatting with the AI assistant.",
          timestamp: Date.now(),
        };

        set((state) => ({
          conversations: state.conversations.map((conv) => {
            if (conv.id === conversationId) {
              return {
                ...conv,
                messages: [...conv.messages, warningMessage],
                updatedAt: Date.now(),
              };
            }
            return conv;
          }),
        }));
      },

      addMessage: (conversationId: string, message: ChatMessage) => {
        set((state) => {
          const updatedConversations = state.conversations.map((conv) => {
            if (conv.id === conversationId) {
              const updatedMessages = [...conv.messages, message];
              const title =
                conv.title === "New Conversation" &&
                updatedMessages.length === 1
                  ? generateTitle(updatedMessages)
                  : conv.title;

              return {
                ...conv,
                messages: updatedMessages,
                title,
                updatedAt: Date.now(),
              };
            }
            return conv;
          });

          return { conversations: updatedConversations };
        });
      },

      updateLastMessage: (conversationId: string, content: string) => {
        set((state) => ({
          conversations: state.conversations.map((conv) => {
            if (conv.id === conversationId && conv.messages.length > 0) {
              const updatedMessages = [...conv.messages];
              const lastMessage = updatedMessages[updatedMessages.length - 1];
              updatedMessages[updatedMessages.length - 1] = {
                ...lastMessage,
                content,
              };

              return {
                ...conv,
                messages: updatedMessages,
                updatedAt: Date.now(),
              };
            }
            return conv;
          }),
        }));
      },

      getCurrentConversation: () => {
        const { conversations, currentConversationId } = get();
        return (
          conversations.find((conv) => conv.id === currentConversationId) ||
          null
        );
      },

      getCurrentMessages: () => {
        const current = get().getCurrentConversation();
        return current?.messages || [];
      },
    }),
    {
      name: "conversation-storage",
      version: 3,
      migrate: (persistedState: any, version: number) => {
        if (version < 2) {
          // Migrate from version 1: add mode field to existing conversations
          if (persistedState.conversations) {
            persistedState.conversations = persistedState.conversations.map(
              (conv: any) => ({
                ...conv,
                mode: conv.mode || "chat", // Default to chat mode
              }),
            );
          }
        }
        if (version < 3) {
          // Migrate from version 2: add isFavorite field to existing conversations
          if (persistedState.conversations) {
            persistedState.conversations = persistedState.conversations.map(
              (conv: any) => ({
                ...conv,
                isFavorite: conv.isFavorite || false, // Default to not favorite
              }),
            );
          }
        }
        return persistedState;
      },
    },
  ),
);
