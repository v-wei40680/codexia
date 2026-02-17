import type { SkillsListResponse } from '@/bindings/v2';

import {
  type InstalledSkillItem,
  type MarketplaceSkillItem,
  type SkillAgent,
  type SkillScope,
  invokeTauri,
  isTauri,
  postJson,
} from './shared';

export async function skillList(cwd: string) {
  if (isTauri()) {
    return await invokeTauri<SkillsListResponse>('skills_list', { cwd });
  }
  return await postJson<SkillsListResponse>('/api/codex/skills/list', { cwds: [cwd] });
}

export async function cloneSkillsRepo(url: string) {
  if (isTauri()) {
    return await invokeTauri<string>('clone_skills_repo', { url });
  }
  return await postJson<string>('/api/skills/clone-repo', { url });
}

export async function listMarketplaceSkills(
  selectedAgent: SkillAgent,
  scope: SkillScope,
  cwd?: string
) {
  if (isTauri()) {
    return await invokeTauri<Array<MarketplaceSkillItem>>('list_marketplace_skills', {
      selectedAgent,
      scope,
      cwd,
    });
  }
  return await postJson<Array<MarketplaceSkillItem>>('/api/skills/list-marketplace', {
    selected_agent: selectedAgent,
    scope,
    cwd,
  });
}

export async function listInstalledSkills(
  selectedAgent: SkillAgent,
  scope: SkillScope,
  cwd?: string
) {
  if (isTauri()) {
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
  selectedAgent: SkillAgent,
  scope: SkillScope,
  cwd?: string
) {
  if (isTauri()) {
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

export async function uninstallInstalledSkill(
  skillName: string,
  selectedAgent: SkillAgent,
  scope: SkillScope,
  cwd?: string
) {
  if (isTauri()) {
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

export async function skillsConfigWrite(path: string, enabled: boolean) {
  if (isTauri()) {
    return await invokeTauri('skills_config_write', { path, enabled });
  }
  return await postJson('/api/codex/skills/config/write', { path, enabled });
}
