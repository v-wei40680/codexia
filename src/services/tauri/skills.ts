import type { SkillsListResponse } from '@/bindings/v2';

import {
  type InstalledSkillItem,
  type MarketplaceSkillItem,
  type SkillAgent,
  type SkillScope,
  invokeTauri,
  isTauri,
  postJson,
  toast,
} from './shared';

export async function skillList(cwd: string) {
  if (isTauri()) {
    return await invokeTauri<SkillsListResponse>('skills_list', { cwd });
  }
  return await postJson<SkillsListResponse>('/api/codex/skills/list', { cwd });
}

export async function cloneSkillsRepo(url: string) {
  if (isTauri()) {
    return await invokeTauri<string>('clone_skills_repo', { url });
  }
  toast({
    title: 'cloneSkillsRepo is only available in Tauri mode.',
    variant: 'destructive',
  });
  return Promise.reject(new Error('cloneSkillsRepo is only available in Tauri mode.'));
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
  toast({
    title: 'listMarketplaceSkills is only available in Tauri mode.',
    variant: 'destructive',
  });
  return Promise.reject(new Error('listMarketplaceSkills is only available in Tauri mode.'));
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
  toast({
    title: 'listInstalledSkills is only available in Tauri mode.',
    variant: 'destructive',
  });
  return Promise.reject(new Error('listInstalledSkills is only available in Tauri mode.'));
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
  toast({
    title: 'installMarketplaceSkill is only available in Tauri mode.',
    variant: 'destructive',
  });
  return Promise.reject(new Error('installMarketplaceSkill is only available in Tauri mode.'));
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
  toast({
    title: 'uninstallInstalledSkill is only available in Tauri mode.',
    variant: 'destructive',
  });
  return Promise.reject(new Error('uninstallInstalledSkill is only available in Tauri mode.'));
}

export async function skillsConfigWrite(path: string, enabled: boolean) {
  if (isTauri()) {
    return await invokeTauri('skills_config_write', { path, enabled });
  }
  return await postJson('/api/codex/skills/config/write', { path, enabled });
}
