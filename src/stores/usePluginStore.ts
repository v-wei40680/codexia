import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { type SkillScope } from '@/services';

export type McpScope = 'local' | 'project' | 'global';

type PluginState = {
  skillScope: SkillScope;
  setSkillScope: (scope: SkillScope) => void;
  mcpScope: McpScope;
  setMcpScope: (scope: McpScope) => void;
};

export const usePluginStore = create<PluginState>()(
  persist(
    (set) => ({
      skillScope: 'user',
      setSkillScope: (skillScope) => set({ skillScope }),
      mcpScope: 'local',
      setMcpScope: (mcpScope) => set({ mcpScope }),
    }),
    { name: 'plugin-store' }
  )
);
