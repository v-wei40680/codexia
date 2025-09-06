import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Conversation, ChatMessage } from "@/types/chat";
import { useFolderStore } from "./FolderStore";
import { generateUniqueId } from "@/utils/genUniqueId";

interface ConversationStore {
  // Conversations
  conversations: Conversation[];
  currentConversationId: string | null;
  pendingUserInput: string | null;
  pendingNewConversation: boolean;

  // Conversation management
  createConversation: (title?: string, sessionId?: string) => string;
  selectHistoryConversation: (conversation: Conversation) => void;
  deleteConversation: (id: string) => void;
  setCurrentConversation: (id: string) => void;
  updateConversationTitle: (id: string, title: string) => void;
  toggleFavorite: (id: string) => void;

  // Filtered getters
  getCurrentProjectConversations: () => Conversation[];

  // Session management
  setPendingUserInput: (input: string | null) => void;
  setSessionLoading: (sessionId: string, loading: boolean) => void;
  setPendingNewConversation: (pending: boolean) => void;

  // Message management
  addMessage: (conversationId: string, message: ChatMessage) => void;
  updateMessage: (conversationId: string, messageId: string, updates: Partial<ChatMessage>) => void;
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

export const useConversationStore = create<ConversationStore>()(
  persist(
    (set, get) => ({
      // Initial state
      conversations: [],
      currentConversationId: null,
      pendingUserInput: null,
      pendingNewConversation: false,


      createConversation: (title?: string, sessionId?: string) => {
        // Use provided sessionId or generate a codex-event-{uuid} format for the conversation
        const id = sessionId || `codex-event-${generateUniqueId()}`;
        const state = get();
        
        // Check if conversation with this ID already exists (unlikely but possible)
        const existingConversation = state.conversations.find(conv => conv.id === id);
        if (existingConversation) {
          // Just set as current if it already exists
          set({ currentConversationId: id });
          return id;
        }

        // Get current folder from FolderStore
        const currentFolder = useFolderStore.getState().currentFolder;

        const now = Date.now();
        const newConversation: Conversation = {
          id,
          title: title || "New Conversation",
          messages: [],
          createdAt: now,
          updatedAt: now,
          isFavorite: false,
          projectRealpath: currentFolder || undefined,
        };

        set((state) => ({
          conversations: [newConversation, ...state.conversations],
          currentConversationId: id,
          pendingNewConversation: true,
        }));

        return id;
      },


      // Select conversation from history (disk) - simplified for session_id only
      selectHistoryConversation: (conversation: Conversation) => {
        set(() => {
          console.log(`📁 selectHistoryConversation: ${conversation.id} (${conversation.title})`);
          // Simply set the current conversation ID - no need to merge into store
          // The selectedConversation prop will handle displaying the data
          return {
            currentConversationId: conversation.id,
          };
        });
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

      toggleFavorite: (id: string) => {
        set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === id 
              ? { ...conv, isFavorite: !conv.isFavorite, updatedAt: Date.now() } 
              : conv,
          ),
        }));
      },

      setPendingUserInput: (input: string | null) => {
        set({ pendingUserInput: input });
      },

      setPendingNewConversation: (pending: boolean) => {
        set({ pendingNewConversation: pending });
      },


      setSessionLoading: (sessionId: string, loading: boolean) => {
        set((state) => ({
          conversations: state.conversations.map(conv =>
            conv.id === sessionId
              ? { ...conv, isLoading: loading }
              : conv
          )
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

      updateMessage: (conversationId: string, messageId: string, updates: Partial<ChatMessage>) => {
        set((state) => ({
          conversations: state.conversations.map((conv) => {
            if (conv.id === conversationId) {
              const updatedMessages = conv.messages.map((msg) => 
                msg.id === messageId ? { ...msg, ...updates } : msg
              );
              
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

      getCurrentProjectConversations: () => {
        const { conversations } = get();
        const currentFolder = useFolderStore.getState().currentFolder;
        
        // Filter conversations that belong to the current project
        return conversations.filter(conv => 
          conv.projectRealpath === currentFolder
        );
      },
    }),
    {
      name: "conversation-storage", 
      version: 5,
      partialize: (state) => ({
        conversations: state.conversations,
        currentConversationId: state.currentConversationId,
      }),
    },
  ),
);
