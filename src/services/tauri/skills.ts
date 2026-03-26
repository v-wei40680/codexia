import type { SkillsListResponse } from '@/bindings/v2';

import {
  type InstalledSkillItem,
  type MarketplaceSkillItem,
  type SkillScope,
  invokeTauri,
  isDesktopTauri,
  postJson,
} from './shared';

export type MarketSkillItem = {
  id: string;
  source: string;
  skillId: string;
  name: string;
  installs: number;
};

export type CentralSkillItem = {
  name: string;
  path: string;
  description?: string | null;
  linkedCodex: boolean;
  linkedCc: boolean;
};

export async function skillList(cwd: string) {
  if (isDesktopTauri()) {
    return await invokeTauri<SkillsListResponse>('skills_list', { cwd });
  }
  return await postJson<SkillsListResponse>('/api/codex/skills/list', { cwds: [cwd] });
}

export async function cloneSkillsRepo(url: string) {
  if (isDesktopTauri()) {
    return await invokeTauri<string>('clone_skills_repo', { url });
  }
  return await postJson<string>('/api/skills/clone-repo', { url });
}

export async function listMarketplaceSkills() {
  if (isDesktopTauri()) {
    return await invokeTauri<Array<MarketplaceSkillItem>>('list_marketplace_skills');
  }
  return await postJson<Array<MarketplaceSkillItem>>('/api/skills/list-marketplace', {});
}

export async function listCentralSkills(scope: SkillScope, cwd?: string) {
  if (isDesktopTauri()) {
    return await invokeTauri<Array<CentralSkillItem>>('list_central_skills', { scope, cwd });
  }
  return await postJson<Array<CentralSkillItem>>('/api/skills/list-central', { scope, cwd });
}

export async function listInstalledSkills(
  selectedAgent: string,
  scope: SkillScope,
  cwd?: string
) {
  if (isDesktopTauri()) {
    return await invokeTauri<Array<InstalledSkillItem>>('list_installed_skills', {
      selectedAgent,
      scope,
      cwd,
    });
  }
  return await postJson<Array<InstalledSkillItem>>('/api/skills/list-installed', {
    selected_agent: selectedAgent,
    scope,
    cwd,
  });
}

export async function installMarketplaceSkill(
  skillMdPath: string,
  skillName: string,
  selectedAgent: string,
  scope: SkillScope,
  cwd?: string
) {
  if (isDesktopTauri()) {
    return await invokeTauri<string>('install_marketplace_skill', {
      skillMdPath,
      skillName,
      selectedAgent,
      scope,
      cwd,
    });
  }
  return await postJson<string>('/api/skills/install-marketplace', {
    skill_md_path: skillMdPath,
    skill_name: skillName,
    selected_agent: selectedAgent,
    scope,
    cwd,
  });
}

export async function linkSkillToAgent(
  skillName: string,
  agent: string,
  scope: SkillScope,
  cwd?: string
) {
  if (isDesktopTauri()) {
    return await invokeTauri<void>('link_skill_to_agent', { skillName, agent, scope, cwd });
  }
  return await postJson<void>('/api/skills/link', {
    skill_name: skillName,
    agent,
    scope,
    cwd,
  });
}

export async function uninstallInstalledSkill(
  skillName: string,
  selectedAgent: string,
  scope: SkillScope,
  cwd?: string
) {
  if (isDesktopTauri()) {
    return await invokeTauri<string>('uninstall_installed_skill', {
      skillName,
      selectedAgent,
      scope,
      cwd,
    });
  }
  return await postJson<string>('/api/skills/uninstall-installed', {
    skill_name: skillName,
    selected_agent: selectedAgent,
    scope,
    cwd,
  });
}

export async function deleteCentralSkill(skillName: string, scope: SkillScope, cwd?: string) {
  if (isDesktopTauri()) {
    return await invokeTauri<void>('delete_central_skill', { skillName, scope, cwd });
  }
  return await postJson<void>('/api/skills/delete-central', { skill_name: skillName, scope, cwd });
}

export async function fetchMarketLeaderboard(board: 'alltime' | 'trending' | 'hot') {
  if (isDesktopTauri()) {
    return await invokeTauri<Array<MarketSkillItem>>('fetch_market_leaderboard', { board });
  }
  return await postJson<Array<MarketSkillItem>>('/api/skills/market/leaderboard', { board });
}

export async function searchMarketSkills(query: string, limit = 40) {
  if (isDesktopTauri()) {
    return await invokeTauri<Array<MarketSkillItem>>('search_market_skills', { query, limit });
  }
  return await postJson<Array<MarketSkillItem>>('/api/skills/market/search', { query, limit });
}

export async function installFromMarket(
  source: string,
  skillId: string,
  scope: SkillScope,
  cwd?: string
) {
  if (isDesktopTauri()) {
    return await invokeTauri<string>('install_from_market', { source, skillId, scope, cwd });
  }
  return await postJson<string>('/api/skills/market/install', {
    source,
    skill_id: skillId,
    scope,
    cwd,
  });
}

export type SkillGroup = { id: string; name: string; skillNames: string[] };
export type SkillGroupsConfig = { groups: SkillGroup[] };

export async function readSkillGroups(scope: SkillScope, cwd?: string): Promise<SkillGroupsConfig> {
  if (isDesktopTauri()) {
    return await invokeTauri<SkillGroupsConfig>('read_skill_groups', { scope, cwd });
  }
  return await postJson<SkillGroupsConfig>('/api/skills/groups/read', { scope, cwd });
}

export async function writeSkillGroups(
  scope: SkillScope,
  cwd: string | undefined,
  config: SkillGroupsConfig
): Promise<void> {
  if (isDesktopTauri()) {
    return await invokeTauri<void>('write_skill_groups', { scope, cwd, config });
  }
  return await postJson<void>('/api/skills/groups/write', { scope, cwd, config });
}

export async function skillsConfigWrite(path: string, enabled: boolean) {
  if (isDesktopTauri()) {
    return await invokeTauri('skills_config_write', { path, enabled });
  }
  return await postJson('/api/codex/skills/config/write', { path, enabled });
}
