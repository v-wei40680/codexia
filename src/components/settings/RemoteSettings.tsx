import { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSettingsStore } from '@/stores/settings';
import { p2pSetStunServers } from '@/services/tauri/p2p';

const DEFAULT_SERVERS = [
  'stun.cloudflare.com:3478',
  'stun.l.google.com:19302',
];

export function RemoteSettings() {
  const { customStunServers, setCustomStunServers } = useSettingsStore();
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');

  // Sync to backend whenever the list changes
  useEffect(() => {
    p2pSetStunServers(customStunServers).catch(() => undefined);
  }, [customStunServers]);

  function add() {
    const val = draft.trim();
    if (!val) return;
    // Basic host:port validation
    if (!/^[^:\s]+:\d+$/.test(val)) {
      setError('Format must be host:port (e.g. stun.example.com:3478)');
      return;
    }
    if (customStunServers.includes(val)) {
      setError('Server already in list');
      return;
    }
    setCustomStunServers([...customStunServers, val]);
    setDraft('');
    setError('');
  }

  function remove(server: string) {
    setCustomStunServers(customStunServers.filter((s) => s !== server));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') add();
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h3 className="text-sm font-medium px-1">STUN Servers</h3>
        <Card>
          <CardContent className="px-4 space-y-4">
            <div className="space-y-0.5">
              <div className="text-sm font-medium">Custom STUN servers</div>
              <div className="text-xs text-muted-foreground">
                Added servers are tried first; built-in defaults (Cloudflare, Google) are used as
                fallbacks.
              </div>
            </div>

            {/* Custom list */}
            {customStunServers.length > 0 && (
              <ul className="space-y-1">
                {customStunServers.map((srv) => (
                  <li
                    key={srv}
                    className="flex items-center justify-between rounded-md border border-border px-3 py-1.5 text-xs"
                  >
                    <span className="font-mono">{srv}</span>
                    <button
                      type="button"
                      onClick={() => remove(srv)}
                      className="ml-2 text-muted-foreground hover:text-destructive"
                      aria-label={`Remove ${srv}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {/* Add row */}
            <div className="flex gap-2">
              <Input
                value={draft}
                onChange={(e) => { setDraft(e.target.value); setError(''); }}
                onKeyDown={handleKeyDown}
                placeholder="stun.example.com:3478"
                className="h-8 flex-1 font-mono text-xs"
              />
              <Button size="sm" className="h-8 px-3" onClick={add}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}

            <div className="h-px bg-border" />

            {/* Built-in defaults (read-only) */}
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">Default fallbacks</div>
              <ul className="space-y-1">
                {DEFAULT_SERVERS.map((srv) => (
                  <li
                    key={srv}
                    className="rounded-md border border-border/50 px-3 py-1.5 text-xs font-mono text-muted-foreground"
                  >
                    {srv}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
