import { invoke } from '@tauri-apps/api/core';
import { CodexConfig } from '../types/codex';

class SessionManager {
  private sessionConfigs: Map<string, CodexConfig> = new Map();
  private runningSessions: Set<string> = new Set();
  private readonly MAX_CONCURRENT_SESSIONS = 2; // Limit concurrent sessions

  async ensureSessionRunning(sessionId: string, config: CodexConfig): Promise<void> {
    // If session is already running, do nothing
    if (this.runningSessions.has(sessionId)) {
      return;
    }

    // If we're at the limit, stop the oldest session
    if (this.runningSessions.size >= this.MAX_CONCURRENT_SESSIONS) {
      const oldestSession = Array.from(this.runningSessions)[0];
      console.log(`Session limit reached (${this.MAX_CONCURRENT_SESSIONS}), stopping oldest session: ${oldestSession}`);
      await this.stopSession(oldestSession);
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
      console.log(`🛑 SessionManager: Stopping session ${sessionId}`);
      await invoke('stop_session', { sessionId });
      this.sessionConfigs.delete(sessionId);
      this.runningSessions.delete(sessionId);
      console.log(`✅ SessionManager: Session ${sessionId} stopped and removed from local state`);
      console.log(`📊 Remaining sessions:`, Array.from(this.runningSessions));
    } catch (error) {
      console.error('Failed to stop session:', error);
      throw error;
    }
  }

  async closeSession(sessionId: string): Promise<void> {
    try {
      // Use the new close_session command which properly shuts down the protocol connection
      await invoke('close_session', { sessionId });
      this.sessionConfigs.delete(sessionId);
      this.runningSessions.delete(sessionId);
    } catch (error) {
      console.error('Failed to close session:', error);
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

  getLocalRunningSessions(): string[] {
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


  getSessionConfig(sessionId: string): CodexConfig | undefined {
    return this.sessionConfigs.get(sessionId);
  }

  // Update session ID mapping when the real session ID is discovered
  updateSessionId(oldSessionId: string, newSessionId: string): void {
    const config = this.sessionConfigs.get(oldSessionId);
    if (config) {
      // Remove old mapping
      this.sessionConfigs.delete(oldSessionId);
      this.runningSessions.delete(oldSessionId);
      
      // Add new mapping
      this.sessionConfigs.set(newSessionId, config);
      this.runningSessions.add(newSessionId);
      
      console.log(`Session ID updated from ${oldSessionId} to ${newSessionId}`);
    }
  }
}

export const sessionManager = new SessionManager();