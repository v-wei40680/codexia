import { getJson, invokeTauri, isTauri, postJson, postNoContent } from './shared';

export async function loadManifests() {
  if (isTauri()) {
    return await invokeTauri<unknown[]>('load_manifests');
  }
  return await getJson<unknown[]>('/api/dxt/manifests');
}

export async function loadManifest(user: string, repo: string) {
  if (isTauri()) {
    return await invokeTauri<unknown | null>('load_manifest', { user, repo });
  }
  return await postJson<unknown | null>('/api/dxt/manifest', { user, repo });
}

export async function checkManifestsExist() {
  if (isTauri()) {
    return await invokeTauri<boolean>('check_manifests_exist');
  }
  return await getJson<boolean>('/api/dxt/manifests/exist');
}

export async function downloadAndExtractManifests() {
  if (isTauri()) {
    await invokeTauri('download_and_extract_manifests');
    return;
  }
  await postNoContent('/api/dxt/manifests/download');
}
