import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ChatSession, ChatMessage, CodexConfig, DEFAULT_CONFIG } from '../types/codex';

interface ChatStore {
  // Configuration
  config: CodexConfig;
  setConfig: (config: CodexConfig) => void;
  
  // Sessions
  sessions: ChatSession[];
  activeSessionId: string | null;
  
  // Session management
  createSession: () => string;
  selectSession: (sessionId: string) => void;
  closeSession: (sessionId: string) => void;
  
  // Message management
  addMessage: (sessionId: string, message: ChatMessage) => void;
  updateMessage: (sessionId: string, messageId: string, content: string) => void;
  setSessionLoading: (sessionId: string, loading: boolean) => void;
  
  // Streaming support
  startStreamingMessage: (sessionId: string, messageId: string, content: string) => void;
  appendToStreamingMessage: (sessionId: string, messageId: string, delta: string) => void;
  finishStreamingMessage: (sessionId: string, messageId: string) => void;
  
  // Session state
  setSessionActive: (sessionId: string, active: boolean) => void;
  updateSessionConfig: (sessionId: string, config: CodexConfig) => void;
}

let sessionCounter = 0;

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      // Initial state
      config: DEFAULT_CONFIG,
      sessions: [],
      activeSessionId: null,

      // Configuration
      setConfig: (config) => {
        set({ config });
        
        // Update active session config if any
        const { activeSessionId, sessions } = get();
        if (activeSessionId) {
          const updatedSessions = sessions.map(session =>
            session.id === activeSessionId
              ? { ...session, config }
              : session
          );
          set({ sessions: updatedSessions });
        }
      },

      // Session management
      createSession: () => {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 9);
        const counter = ++sessionCounter;
        const sessionId = `session-${timestamp}-${counter}-${random}`;
        
        const newSession: ChatSession = {
          id: sessionId,
          name: `Chat ${get().sessions.length + 1}`,
          messages: [],
          isActive: false,
          config: get().config,
        };
        
        set((state) => ({
          sessions: [...state.sessions, newSession],
          activeSessionId: sessionId,
        }));
        
        return sessionId;
      },

      selectSession: (sessionId) => {
        set((state) => ({
          activeSessionId: sessionId,
          sessions: state.sessions.map(session => ({
            ...session,
            isActive: session.id === sessionId
          }))
        }));
      },

      closeSession: (sessionId) => {
        set((state) => {
          const filteredSessions = state.sessions.filter(s => s.id !== sessionId);
          const newActiveId = state.activeSessionId === sessionId
            ? filteredSessions.length > 0 ? filteredSessions[0].id : null
            : state.activeSessionId;
          
          return {
            sessions: filteredSessions,
            activeSessionId: newActiveId,
          };
        });
      },

      // Message management
      addMessage: (sessionId, message) => {
        set((state) => ({
          sessions: state.sessions.map(session =>
            session.id === sessionId
              ? { ...session, messages: [...session.messages, message] }
              : session
          )
        }));
      },

      updateMessage: (sessionId, messageId, content) => {
        set((state) => ({
          sessions: state.sessions.map(session =>
            session.id === sessionId
              ? {
                  ...session,
                  messages: session.messages.map(msg =>
                    msg.id === messageId ? { ...msg, content } : msg
                  )
                }
              : session
          )
        }));
      },

      setSessionLoading: (sessionId, loading) => {
        set((state) => ({
          sessions: state.sessions.map(session =>
            session.id === sessionId
              ? { ...session, isLoading: loading }
              : session
          )
        }));
      },

      // Streaming support
      startStreamingMessage: (sessionId, messageId, content) => {
        const message: ChatMessage = {
          id: messageId,
          type: 'agent',
          content,
          timestamp: new Date(),
          isStreaming: true,
        };
        
        get().addMessage(sessionId, message);
      },

      appendToStreamingMessage: (sessionId, messageId, delta) => {
        set((state) => ({
          sessions: state.sessions.map(session =>
            session.id === sessionId
              ? {
                  ...session,
                  messages: session.messages.map(msg =>
                    msg.id === messageId && msg.isStreaming
                      ? { ...msg, content: msg.content + delta }
                      : msg
                  )
                }
              : session
          )
        }));
      },

      finishStreamingMessage: (sessionId, messageId) => {
        set((state) => ({
          sessions: state.sessions.map(session =>
            session.id === sessionId
              ? {
                  ...session,
                  messages: session.messages.map(msg =>
                    msg.id === messageId
                      ? { ...msg, isStreaming: false }
                      : msg
                  )
                }
              : session
          )
        }));
      },

      // Session state
      setSessionActive: (sessionId, active) => {
        set((state) => ({
          sessions: state.sessions.map(session =>
            session.id === sessionId
              ? { ...session, isActive: active }
              : session
          )
        }));
      },

      updateSessionConfig: (sessionId, config) => {
        set((state) => ({
          sessions: state.sessions.map(session =>
            session.id === sessionId
              ? { ...session, config }
              : session
          )
        }));
      },
    }),
    {
      name: 'codexia-chat-store',
      // Only persist config and sessions, not transient state
      partialize: (state) => ({
        config: state.config,
        sessions: state.sessions.map(session => ({
          ...session,
          isLoading: false, // Reset loading state on restore
          messages: session.messages.map(msg => ({
            ...msg,
            isStreaming: false, // Reset streaming state on restore
          })),
        })),
        activeSessionId: state.activeSessionId,
      }),
    }
  )
);