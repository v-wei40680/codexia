import { useState, useEffect, useRef } from "react";
import "./App.css";
import { ChatInterface } from "./components/ChatInterface";
import { SessionManager } from "./components/SessionManager";
import { ConfigDialog } from "./components/ConfigDialog";
import { ConfigIndicator } from "./components/ConfigIndicator";
import { DebugPanel } from "./components/DebugPanel";
import { useChatStore } from "./store/chatStore";
import { sessionManager } from "./services/sessionManager";

function App() {
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const initialSessionCreated = useRef(false);

  // Zustand store
  const {
    config,
    sessions,
    activeSessionId,
    setConfig,
    createSession,
    selectSession,
    closeSession,
  } = useChatStore();

  // Create initial session if none exists
  useEffect(() => {
    if (sessions.length === 0 && !initialSessionCreated.current) {
      initialSessionCreated.current = true;
      createSession();
    }
  }, [sessions.length, createSession]);

  // Sync session manager with backend periodically
  useEffect(() => {
    const syncInterval = setInterval(() => {
      sessionManager.syncWithBackend();
    }, 2000); // Sync every 2 seconds

    // Initial sync
    sessionManager.syncWithBackend();

    return () => clearInterval(syncInterval);
  }, []);

  const activeSession = sessions.find(s => s.id === activeSessionId);
  const currentConfig = activeSession?.config || config;

  return (
    <main className="h-screen flex">
      <SessionManager
        sessions={sessions}
        activeSessionId={activeSessionId}
        onCreateSession={createSession}
        onSelectSession={selectSession}
        onCloseSession={closeSession}
      />
      <div className="flex-1 flex flex-col">
        {/* Configuration Indicator */}
        <ConfigIndicator
          config={currentConfig}
          onOpenConfig={() => setIsConfigOpen(true)}
        />
        
        {activeSessionId ? (
          <ChatInterface
            sessionId={activeSessionId}
            config={currentConfig}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">Welcome to Codexia</h2>
              <p>Create a new chat session to get started</p>
            </div>
          </div>
        )}
      </div>

      {/* Configuration Dialog */}
      <ConfigDialog
        isOpen={isConfigOpen}
        config={config}
        onClose={() => setIsConfigOpen(false)}
        onSave={(newConfig) => {
          setConfig(newConfig);
        }}
      />

      {/* Debug Panel */}
      <DebugPanel />
    </main>
  );
}

export default App;
