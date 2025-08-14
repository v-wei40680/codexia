import { invoke } from '@tauri-apps/api/core';
import { CodexConfig } from '../types/codex';

class SessionManager {
  private sessionConfigs: Map<string, CodexConfig> = new Map();
  private runningSessions: Set<string> = new Set();

  async ensureSessionRunning(sessionId: string, config: CodexConfig): Promise<void> {
    // If session is already running, do nothing
    if (this.runningSessions.has(sessionId)) {
      return;
    }

    try {
      // Start the session (backend will check if already exists)
      await invoke('start_codex_session', {
        sessionId,
        config: {
          working_directory: config.workingDirectory,
          model: config.model,
          provider: config.provider,
          use_oss: config.useOss,
          custom_args: config.customArgs || null,
          approval_policy: config.approvalPolicy,
          sandbox_mode: config.sandboxMode,
        },
      });

      this.runningSessions.add(sessionId);
      this.sessionConfigs.set(sessionId, config);
    } catch (error) {
      console.error('Failed to start session:', error);
      throw error;
    }
  }

  async stopSession(sessionId: string): Promise<void> {
    try {
      await invoke('stop_session', { sessionId });
      this.sessionConfigs.delete(sessionId);
      this.runningSessions.delete(sessionId);
    } catch (error) {
      console.error('Failed to stop session:', error);
      throw error;
    }
  }

  async restartSession(sessionId: string, config: CodexConfig): Promise<void> {
    try {
      console.log('Restarting session:', sessionId, 'with config:', config);
      
      // Stop the existing session
      if (this.runningSessions.has(sessionId)) {
        await this.stopSession(sessionId);
      }
      
      // Add a small delay to ensure cleanup is complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Start with new config
      await this.ensureSessionRunning(sessionId, config);
      
      console.log('Session restarted successfully:', sessionId);
    } catch (error) {
      console.error('Failed to restart session:', error);
      throw error;
    }
  }

  isSessionRunning(sessionId: string): boolean {
    return this.runningSessions.has(sessionId);
  }

  getRunningSessions(): string[] {
    return Array.from(this.runningSessions);
  }
  
  async stopAllSessions(): Promise<void> {
    const sessions = Array.from(this.runningSessions);
    const promises = sessions.map(sessionId => 
      this.stopSession(sessionId).catch(error => {
        console.error(`Failed to stop session ${sessionId}:`, error);
        return null; // Don't let one failure stop the others
      })
    );
    
    await Promise.all(promises);
    console.log(`Stopped ${sessions.length} sessions`);
  }

  async syncWithBackend(): Promise<void> {
    try {
      const runningSessions = await invoke<string[]>('get_running_sessions');
      const previousCount = this.runningSessions.size;
      this.runningSessions = new Set(runningSessions);
      
      // Log if session count changed significantly
      const currentCount = this.runningSessions.size;
      if (Math.abs(currentCount - previousCount) >= 2) {
        console.log(`Session count changed: ${previousCount} -> ${currentCount}`);
      }
      
      // Clean up stale session configs for sessions that are no longer running
      for (const sessionId of this.sessionConfigs.keys()) {
        if (!this.runningSessions.has(sessionId)) {
          this.sessionConfigs.delete(sessionId);
        }
      }
    } catch (error) {
      console.error('Failed to sync with backend:', error);
    }
  }

  getSessionConfig(sessionId: string): CodexConfig | undefined {
    return this.sessionConfigs.get(sessionId);
  }
}

export const sessionManager = new SessionManager();