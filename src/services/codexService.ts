import { CollaborationMode, FuzzyFileSearchParams } from '@/bindings';
import {
  threadStart,
  threadResume,
  turnStart,
  turnInterrupt,
  threadList,
  threadArchive,
  skillList,
  fuzzyFileSearch as tauriFuzzyFileSearch,
  skillsConfigWrite as tauriSkillsConfigWrite,
  loginChatGpt as tauriLoginChatGpt,
  getAccount as tauriGetAccount,
  reviewStart,
} from './tauri';
import type {
  ThreadStartParams,
  ThreadListParams,
  UserInput,
  ReviewStartParams,
  SandboxMode,
  SandboxPolicy,
} from '@/bindings/v2';
import type { ThreadListItem } from '@/types/codex/ThreadListItem';
import { useCodexStore, useConfigStore } from '@/stores/codex';
import { useWorkspaceStore } from '@/stores';
import { convertThreadHistoryToEvents } from '@/utils/threadHistoryConverter';

const sandboxModeToPolicy = (mode: SandboxMode): SandboxPolicy => {
  switch (mode) {
    case 'read-only':
      return { type: 'readOnly' };
    case 'workspace-write':
      return {
        type: 'workspaceWrite',
        writableRoots: [],
        networkAccess: false,
        excludeTmpdirEnvVar: false,
        excludeSlashTmp: false,
      };
    case 'danger-full-access':
      return { type: 'dangerFullAccess' };
  }
};

export const codexService = {
  normalizeThreadItem(thread: any): ThreadListItem {
    const ts = thread.ts ?? thread.createdAt ?? thread.updatedAt ?? 0;
    return {
      id: thread.id,
      preview: thread.preview ?? '',
      cwd: thread.cwd ?? '',
      path: thread.path ?? '',
      source: thread.source ?? '',
      ts,
    };
  },
  async loadThreads(
    cwd: string,
    archived: boolean = false,
    sortKey: 'created_at' | 'updated_at' = 'updated_at'
  ) {
    try {
      const params: ThreadListParams = {
        cursor: null,
        limit: 20,
        modelProviders: null,
        sortKey,
        archived,
        sourceKinds: null,
      };
      const response = await threadList(params, cwd);
      console.log('[CodexService] listThreads response:', response);
      const workingDirThreads = response.data.map((t) => codexService.normalizeThreadItem(t));
      const nextCursor =
        (response as { nextCursor?: string | null }).nextCursor ??
        (response as { next_cursor?: string | null }).next_cursor ??
        null;
      const { setThreads, setThreadListNextCursor } = useCodexStore.getState();
      setThreads(workingDirThreads);
      setThreadListNextCursor(nextCursor);
    } catch (error: any) {
      console.error('[CodexService] Failed to load threads:', error);
      useCodexStore.getState().setThreadListNextCursor(null);
      throw error;
    }
  },
  async loadMoreThreads(cwd: string, sortKey: 'created_at' | 'updated_at' = 'updated_at') {
    const { threadListNextCursor, appendThreads, setThreadListNextCursor } =
      useCodexStore.getState();
    if (!threadListNextCursor) {
      return;
    }
    try {
      const params: ThreadListParams = {
        cursor: threadListNextCursor,
        limit: 20,
        modelProviders: null,
        sortKey,
        archived: false,
        sourceKinds: null,
      };
      const response = await threadList(params, cwd);
      console.log('[CodexService] listThreads (nextCursor) response:', response);
      const workingDirThreads = response.data.map((t) => codexService.normalizeThreadItem(t));
      const nextCursor =
        (response as { nextCursor?: string | null }).nextCursor ??
        (response as { next_cursor?: string | null }).next_cursor ??
        null;
      appendThreads(workingDirThreads);
      setThreadListNextCursor(nextCursor);
    } catch (error: any) {
      console.error('[CodexService] Failed to load more threads:', error);
      throw error;
    }
  },
  async archiveThread(threadId: string) {
    try {
      await threadArchive(threadId);
    } catch (error: any) {
      console.error('[CodexService] archiveThread error:', error);
      throw error;
    }
  },
  async setCurrentThread(threadId: string | null, options?: { resume?: boolean }) {
    const set = useCodexStore.setState;
    const shouldResume = options?.resume ?? true;
    try {
      if (!threadId) {
        set((state) => ({
          currentThreadId: null,
          currentTurnId: null,
          inputFocusTrigger: state.inputFocusTrigger + 1,
        }));
        return;
      }

      if (!shouldResume) {
        set((state) => ({
          currentThreadId: threadId,
          currentTurnId: null,
          inputFocusTrigger: state.inputFocusTrigger + 1,
        }));
        return;
      }

      const { activeThreadIds, events } = useCodexStore.getState();

      if (!activeThreadIds.includes(threadId) || !events[threadId]) {
        await codexService.threadResume(threadId);
      } else {
        set((state) => ({
          currentThreadId: threadId,
          inputFocusTrigger: state.inputFocusTrigger + 1,
        }));
      }
    } catch (error: any) {
      console.error('[CodexService] setCurrentThread error:', error);
      throw error;
    }
  },

  async threadStart() {
    const set = useCodexStore.setState;
    try {
      const { model, approvalPolicy, sandbox, reasoningEffort, personality } =
        useConfigStore.getState();
      const { cwd } = useWorkspaceStore.getState();
      const params: ThreadStartParams = {
        model: model,
        modelProvider: 'openai',
        cwd: cwd,
        approvalPolicy: approvalPolicy,
        sandbox: sandbox,
        baseInstructions: null,
        developerInstructions: null,
        config: {
          model_reasoning_effort: reasoningEffort,
          show_raw_agent_reasoning: true,
          model_reasoning_summary: 'auto',
          web_search_request: useConfigStore.getState().webSearchRequest,
          view_image_tool: true,
          'features.collaboration_modes': true,
          'features.collab': true,
        },
        personality,
        ephemeral: null,
        experimentalRawEvents: true,
      };

      const response = await threadStart(params);
      const thread = codexService.normalizeThreadItem(response.thread);

      set((state) => ({
        threads: [thread, ...state.threads],
        currentThreadId: thread.id,
        activeThreadIds: [...state.activeThreadIds, thread.id],
        events: { ...state.events, [thread.id]: [] },
        inputFocusTrigger: state.inputFocusTrigger + 1,
      }));

      console.log('[CodexService] threadStart completed successfully');
      return thread;
    } catch (error: any) {
      console.error('[CodexService] threadStart error:', error);
      throw error;
    }
  },

  async threadResume(threadId: string) {
    const set = useCodexStore.setState;
    const { activeThreadIds, events } = useCodexStore.getState();
    try {
      const { personality } = useConfigStore.getState();
      const response = await threadResume({
        threadId,
        history: null,
        path: null,
        model: null,
        modelProvider: null,
        cwd: null,
        approvalPolicy: null,
        sandbox: null,
        config: null,
        baseInstructions: null,
        developerInstructions: null,
        personality,
      });
      console.log(response.thread.turns);

      const historicalEvents = convertThreadHistoryToEvents(response.thread);

      set((state) => ({
        currentThreadId: threadId,
        activeThreadIds: activeThreadIds.includes(threadId)
          ? activeThreadIds
          : [...activeThreadIds, threadId],
        events: {
          ...events,
          [threadId]: historicalEvents,
        },
        inputFocusTrigger: state.inputFocusTrigger + 1,
      }));
    } catch (error: any) {
      console.error('[CodexService] threadResume error:', error);
      throw error;
    }
  },

  async turnStart(threadId: string, input: string, images: string[] = []) {
    const set = useCodexStore.setState;
    try {
      const userInputs: UserInput[] = [];

      if (input.trim()) {
        userInputs.push({ type: 'text', text: input, text_elements: [] });
      }

      for (const imagePath of images) {
        userInputs.push({ type: 'localImage', path: imagePath });
      }

      // If both are empty? Assuming input area checks this, but if so, send empty text?
      if (userInputs.length === 0) {
        userInputs.push({ type: 'text', text: '', text_elements: [] });
      }

      const { model, reasoningEffort, collaborationMode, approvalPolicy, sandbox, personality } =
        useConfigStore.getState();
      const selectedCollaborationMode: CollaborationMode = {
        mode: collaborationMode,
        settings: {
          model,
          reasoning_effort: reasoningEffort ?? null,
          developer_instructions: null,
        },
      };

      const response = await turnStart({
        threadId,
        input: userInputs,
        cwd: null,
        approvalPolicy,
        sandboxPolicy: sandboxModeToPolicy(sandbox),
        model: model || null,
        effort: reasoningEffort ?? null,
        summary: null,
        personality,
        outputSchema: null,
        collaborationMode: selectedCollaborationMode,
      });

      set({ currentTurnId: response.turn.id });
      return response.turn;
    } catch (error: any) {
      console.error('[CodexService] turnStart error:', error);
      throw error;
    }
  },

  async turnInterrupt(threadId: string, turnId: string) {
    const set = useCodexStore.setState;
    try {
      await turnInterrupt({ threadId, turnId });
      set({ currentTurnId: null });
    } catch (error: any) {
      console.error('[CodexService] turnInterrupt error:', error);
      throw error;
    }
  },

  async listSkills(cwd: string) {
    try {
      const response = await skillList(cwd);
      console.log('[CodexService] listSkills response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('[CodexService] listSkills error:', error);
      throw error;
    }
  },
  async fuzzyFileSearch(params: FuzzyFileSearchParams) {
    try {
      const response = await tauriFuzzyFileSearch(params);
      console.log('[CodexService] fuzzyFileSearch response:', response.files);
      return response.files;
    } catch (error: any) {
      console.error('[CodexService] fuzzyFileSearch error:', error);
      throw error;
    }
  },
  async skillsConfigWrite(path: string, enabled: boolean) {
    try {
      const response = await tauriSkillsConfigWrite(path, enabled);
      console.log('[CodexService] skillsConfigWrite response:', response);
      return response;
    } catch (error: any) {
      console.error('[CodexService] skillsConfigWrite error:', error);
      throw error;
    }
  },
  async loginChatGpt() {
    try {
      const response = await tauriLoginChatGpt();
      console.log('[CodexService] loginChatGpt response:', response);
      return response;
    } catch (error: any) {
      console.error('[CodexService] loginChatGpt error:', error);
      throw error;
    }
  },
  async getAccount() {
    try {
      const response = await tauriGetAccount();
      console.log('[CodexService] getAccount response:', response);
      return response;
    } catch (error: any) {
      console.error('[CodexService] getAccount error:', error);
      throw error;
    }
  },
  async startReview(params: ReviewStartParams) {
    try {
      const response = await reviewStart(params);
      console.log('[CodexService] startReview response:', response);
      return response;
    } catch (error: any) {
      console.error('[CodexService] startReview error:', error);
      throw error;
    }
  },
};
