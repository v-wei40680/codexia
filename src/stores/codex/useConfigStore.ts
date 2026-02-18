import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SandboxMode, AskForApproval } from '@/bindings/v2';
import type { ReasoningEffort, Personality, ModeKind } from '@/bindings';

export type ThreadCwdMode = 'local' | 'worktree';

export interface ConfigStore {
  sandbox: SandboxMode;
  approvalPolicy: AskForApproval;
  reasoningEffort: ReasoningEffort;
  webSearchRequest: boolean;
  modelProvider: 'openai' | 'ollama';
  model: string;
  openaiModel: string;
  ollamaModel: string;
  personality: Personality | null;
  collaborationMode: ModeKind;
  threadCwdMode: ThreadCwdMode;
  setModel: (model: string) => void;
  setModelProvider: (provider: 'openai' | 'ollama') => void;
  setAccessMode: (sandbox: SandboxMode) => void;
  setReasoningEffort: (effort: ReasoningEffort) => void;
  setWebSearch: (webSearchRequest: boolean) => void;
  setPersonality: (personality: Personality | null) => void;
  setCollaborationMode: (mode: ModeKind) => void;
  setThreadCwdMode: (mode: ThreadCwdMode) => void;
}

export const SANDBOX_APPROVAL_MAP: Record<SandboxMode, AskForApproval> = {
  'read-only': 'untrusted',
  'workspace-write': 'on-request',
  'danger-full-access': 'never',
};

export const useConfigStore = create<ConfigStore>()(
  persist(
    (set) => ({
      webSearchRequest: false,
      sandbox: 'workspace-write',
      approvalPolicy: 'on-request',
      reasoningEffort: 'medium',
      modelProvider: 'openai',
      model: '',
      openaiModel: '',
      ollamaModel: '',
      personality: 'friendly',
      collaborationMode: 'default',
      threadCwdMode: 'local',
      setModel: (model: string) => {
        set((state) => {
          if (state.modelProvider === 'ollama') {
            return { model, ollamaModel: model };
          }
          return { model, openaiModel: model };
        });
      },

      setModelProvider: (modelProvider: 'openai' | 'ollama') => {
        set((state) => ({
          modelProvider,
          model: modelProvider === 'ollama' ? state.ollamaModel : state.openaiModel,
        }));
      },

      setAccessMode: (sandbox: SandboxMode) => {
        const approvalPolicy = SANDBOX_APPROVAL_MAP[sandbox];
        set({ sandbox, approvalPolicy });
      },

      setReasoningEffort: (effort: ReasoningEffort) => {
        set({ reasoningEffort: effort });
      },

      setWebSearch: (webSearchRequest: boolean) => {
        set({ webSearchRequest });
      },

      setPersonality: (personality: Personality | null) => {
        set({ personality });
      },

      setCollaborationMode: (mode: ModeKind) => {
        set({ collaborationMode: mode });
      },

      setThreadCwdMode: (mode: ThreadCwdMode) => {
        set({ threadCwdMode: mode });
      },
    }),
    {
      name: 'codex-config-storage',
      version: 3,
      migrate: (persistedState: any, version) => {
        if (!persistedState || version >= 3) {
          return persistedState;
        }
        const previousModel = typeof persistedState.model === 'string' ? persistedState.model : '';
        return {
          ...persistedState,
          modelProvider: 'openai',
          openaiModel: previousModel,
          ollamaModel: '',
        };
      },
    }
  )
);
