import { Button } from '@/components/ui/button';
import { open } from '@tauri-apps/plugin-shell';

export function AutoMateView() {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <h1 className="text-2xl font-bold">Contribute or wait for a release</h1>
      <p>
        Visit <Button onClick={() => open('https://github.com/milisp/codexia')}>GitHub</Button> for
        more information.
      </p>
    </div>
  );
}
