import { useEffect, useRef } from 'react';
import { AgentComposer } from '@/components/common/AgentComposer';
import { resizeTrayWindow } from '@/services/tauri/tray';

export default function TrayView() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const ro = new ResizeObserver(() => {
      const height = el.getBoundingClientRect().height;
      if (height > 0) {
        resizeTrayWindow(Math.ceil(height)).catch(() => { });
      }
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full bg-background text-foreground rounded-lg flex flex-col overflow-hidden px-2"
    >
      <AgentComposer trayMode />
    </div>
  );
}
