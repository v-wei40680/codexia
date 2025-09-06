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

  // Categories
  categories: { id: string; name: string }[];
  selectedCategoryId: string | null; // null means "All"
  addCategory: (name: string) => string;
  deleteCategory: (categoryId: string) => void;
  setSelectedCategory: (categoryId: string | null) => void;
  setConversationCategory: (conversationId: string, categoryId: string | null) => void;

  // Conversation management
  createConversation: (title?: string, sessionId?: string) => string;
  createForkConversation: (
    fromConversationId: string,
    parentMessageId: string,
    history: ChatMessage[],
    title?: string,
  ) => string;
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
  setForkMetaApplied: (conversationId: string) => void;
  setResumeMeta: (conversationId: string, meta: { codexSessionId?: string; resumePath?: string }) => void;

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
      categories: [],
      selectedCategoryId: null,

      addCategory: (name: string) => {
        const id = `cat-${generateUniqueId()}`;
        set((state) => ({
          categories: [{ id, name: name.trim() || "Unnamed" }, ...state.categories],
        }));
        return id;
      },

      deleteCategory: (categoryId: string) => {
        set((state) => ({
          categories: state.categories.filter((c) => c.id !== categoryId),
          // Clear category from conversations that used this category
          conversations: state.conversations.map((conv) =>
            conv.categoryId === categoryId ? { ...conv, categoryId: null, updatedAt: Date.now() } : conv,
          ),
          // If the deleted category is currently selected, reset to All (null)
          selectedCategoryId: state.selectedCategoryId === categoryId ? null : state.selectedCategoryId,
        }));
      },

      setSelectedCategory: (categoryId: string | null) => {
        set({ selectedCategoryId: categoryId });
      },

      setConversationCategory: (conversationId: string, categoryId: string | null) => {
        set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === conversationId ? { ...conv, categoryId, updatedAt: Date.now() } : conv,
          ),
        }));
      },


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
          categoryId: get().selectedCategoryId ?? null,
        };

        set((state) => ({
          conversations: [newConversation, ...state.conversations],
          currentConversationId: id,
          pendingNewConversation: true,
        }));

        return id;
      },

      // Create a new empty conversation that is a fork of a parent conversation
      createForkConversation: (
        fromConversationId: string,
        parentMessageId: string,
        history: ChatMessage[],
        title?: string,
      ) => {
        const id = `codex-event-${generateUniqueId()}`;
        const now = Date.now();
        const currentFolder = useFolderStore.getState().currentFolder;

        const forkTitle = title || `Fork: ${generateTitle(history)}`;
        // Seed the forked conversation with a visible copy of prior messages
        // plus a small system banner so users know it’s a forked view.
        const forkBanner: ChatMessage = {
          id: `${id}-fork-${generateUniqueId()}`,
          role: 'system',
          content: `Forked from ${fromConversationId} at message ${parentMessageId}`,
          timestamp: now,
        };

        const seededMessages: ChatMessage[] = [forkBanner, ...history];

        const newConversation: Conversation = {
          id,
          title: forkTitle,
          messages: seededMessages,
          createdAt: now,
          updatedAt: now,
          isFavorite: false,
          projectRealpath: currentFolder || undefined,
          forkMeta: {
            fromConversationId,
            parentMessageId,
            history,
            applied: false,
          },
        };

        set((state) => ({
          conversations: [newConversation, ...state.conversations],
          currentConversationId: id,
          pendingNewConversation: true,
        }));

        return id;
      },


      // Select a conversation imported from disk history (jsonl rollout)
      // Ensure it exists in the store and mark resume metadata so ChatInterface can resume
      selectHistoryConversation: (conversation: Conversation) => {
        set((state) => {
          const exists = state.conversations.some((c) => c.id === conversation.id);
          const resumePath = conversation.filePath;
          const updated: Conversation = {
            ...conversation,
            // Map filePath into resume meta for backend resume
            ...(resumePath ? { resumePath } as any : {}),
          } as Conversation;

          return {
            conversations: exists
              ? state.conversations.map((c) => (c.id === updated.id ? { ...c, ...updated } : c))
              : [updated, ...state.conversations],
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

      setForkMetaApplied: (conversationId: string) => {
        set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === conversationId
              ? {
                  ...conv,
                  forkMeta: conv.forkMeta
                    ? { ...conv.forkMeta, applied: true }
                    : conv.forkMeta,
                  updatedAt: Date.now(),
                }
              : conv,
          ),
        }));
      },

      setResumeMeta: (conversationId: string, meta: { codexSessionId?: string; resumePath?: string }) => {
        set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === conversationId
              ? {
                  ...conv,
                  codexSessionId: meta.codexSessionId ?? conv.codexSessionId,
                  resumePath: meta.resumePath ?? conv.resumePath,
                  updatedAt: Date.now(),
                }
              : conv,
          ),
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
        const { conversations, selectedCategoryId } = get();
        const currentFolder = useFolderStore.getState().currentFolder;
        
        // Filter conversations that belong to the current project and match selected category (if any)
        return conversations.filter((conv) => {
          const inProject = conv.projectRealpath === currentFolder;
          const inCategory = selectedCategoryId ? conv.categoryId === selectedCategoryId : true;
          return inProject && inCategory;
        });
      },
    }),
    {
      name: "conversation-storage", 
      version: 6,
      migrate: (persisted: any, version) => {
        if (!persisted) return persisted;
        if (version < 6) {
          return {
            ...persisted,
            categories: [],
            selectedCategoryId: null,
            conversations: (persisted.conversations || []).map((c: any) => ({
              ...c,
              categoryId: c?.categoryId ?? null,
            })),
          };
        }
        return persisted;
      },
      partialize: (state) => ({
        conversations: state.conversations,
        currentConversationId: state.currentConversationId,
        categories: state.categories,
        selectedCategoryId: state.selectedCategoryId,
      }),
    },
  ),
);
