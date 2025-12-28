import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Bot, FolderCode } from "lucide-react";
import { type Project, type ClaudeMdFile } from "@/lib/api";
import { initializeWebMode } from "@/lib/apiAdapter";
import { OutputCacheProvider } from "@/lib/outputCache";
import { TabProvider } from "@/contexts/TabContext";
import { Card } from "@/components/ui/card";
import { CCProjectView } from "@/components/cc/CCProjectView";
import { CustomTitlebar } from "@/components/cc/CustomTitlebar";
import { MarkdownEditor } from "@/components/MarkdownEditor";
import { ClaudeFileEditor } from "@/components/cc/ClaudeFileEditor";
import { Settings } from "@/components/cc/Settings";
import { CCAgents } from "@/components/cc/CCAgents";
import { NFOCredits } from "@/components/cc/NFOCredits";
import { ClaudeBinaryDialog } from "@/components/cc/ClaudeBinaryDialog";
import { Toast, ToastContainer } from "@/components/ui/toast";
import { ProjectSettings } from "@/components/cc/ProjectSettings";
import { TabManager } from "@/components/cc/TabManager";
import { TabContent } from "@/components/cc/TabContent";
import { useTabState } from "@/hooks/useTabState";
import { useAppLifecycle } from "@/hooks";

type View =
  | "welcome"
  | "projects"
  | "editor"
  | "claude-file-editor"
  | "settings"
  | "cc-agents"
  | "create-agent"
  | "github-agents"
  | "agent-execution"
  | "agent-run-view"
  | "project-settings"
  | "tabs"; // New view for tab-based interface

/**
 * AppContent component - Contains the main app logic, wrapped by providers
 */
function AppContent() {
  const [view, setView] = useState<View>("tabs");
  const {
    createClaudeMdTab,
    createSettingsTab,
    createAgentsTab,
  } = useTabState();
  const [editingClaudeFile, setEditingClaudeFile] =
    useState<ClaudeMdFile | null>(null);
  const [showNFO, setShowNFO] = useState(false);
  const [showClaudeBinaryDialog, setShowClaudeBinaryDialog] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);
  const [projectForSettings, setProjectForSettings] = useState<Project | null>(
    null,
  );
  const [previousView] = useState<View>("welcome");

  // Initialize analytics lifecycle tracking
  useAppLifecycle();

  // Initialize web mode compatibility on mount
  useEffect(() => {
    initializeWebMode();
  }, []);

  // Keyboard shortcuts for tab navigation
  useEffect(() => {
    if (view !== "tabs") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      if (modKey) {
        switch (e.key) {
          case "t":
            e.preventDefault();
            window.dispatchEvent(new CustomEvent("create-chat-tab"));
            break;
          case "w":
            e.preventDefault();
            window.dispatchEvent(new CustomEvent("close-current-tab"));
            break;
          case "Tab":
            e.preventDefault();
            if (e.shiftKey) {
              window.dispatchEvent(new CustomEvent("switch-to-previous-tab"));
            } else {
              window.dispatchEvent(new CustomEvent("switch-to-next-tab"));
            }
            break;
          default:
            // Handle number keys 1-9
            if (e.key >= "1" && e.key <= "9") {
              e.preventDefault();
              const index = parseInt(e.key) - 1;
              window.dispatchEvent(
                new CustomEvent("switch-to-tab-by-index", {
                  detail: { index },
                }),
              );
            }
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [view]);

  // Listen for Claude not found events
  useEffect(() => {
    const handleClaudeNotFound = () => {
      setShowClaudeBinaryDialog(true);
    };

    window.addEventListener(
      "claude-not-found",
      handleClaudeNotFound as EventListener,
    );
    return () => {
      window.removeEventListener(
        "claude-not-found",
        handleClaudeNotFound as EventListener,
      );
    };
  }, []);

  /**
   * Opens a new Claude Code session in the interactive UI
   */
  // New session creation is handled by the tab system via titlebar actions

  /**
   * Handles editing a CLAUDE.md file from a project
   */
  const handleEditClaudeFile = (file: ClaudeMdFile) => {
    setEditingClaudeFile(file);
    handleViewChange("claude-file-editor");
  };

  /**
   * Returns from CLAUDE.md file editor to projects view
   */
  const handleBackFromClaudeFileEditor = () => {
    setEditingClaudeFile(null);
    handleViewChange("projects");
  };

  /**
   * Handles view changes with navigation protection
   */
  const handleViewChange = (newView: View) => {
    // No need for navigation protection with tabs since sessions stay open
    setView(newView);
  };

  /**
   * Handles navigating to hooks configuration
   */
  // Project settings navigation handled via `projectForSettings` state when needed

  const renderContent = () => {
    switch (view) {
      case "welcome":
        return (
          <div
            className="flex items-center justify-center p-4"
            style={{ height: "100%" }}
          >
            <div className="w-full max-w-4xl">
              {/* Welcome Header */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
                className="mb-12 text-center"
              >
                <h1 className="text-4xl font-bold tracking-tight">
                  <span className="rotating-symbol"></span>
                  Welcome to opcode
                </h1>
              </motion.div>

              {/* Navigation Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                {/* CC Agents Card */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15, delay: 0.05 }}
                >
                  <Card
                    className="h-64 cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg border border-border/50 shimmer-hover trailing-border"
                    onClick={() => handleViewChange("cc-agents")}
                  >
                    <div className="h-full flex flex-col items-center justify-center p-8">
                      <Bot className="h-16 w-16 mb-4 text-primary" />
                      <h2 className="text-xl font-semibold">CC Agents</h2>
                    </div>
                  </Card>
                </motion.div>

                {/* Projects Card */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15, delay: 0.1 }}
                >
                  <Card
                    className="h-64 cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg border border-border/50 shimmer-hover trailing-border"
                    onClick={() => handleViewChange("projects")}
                  >
                    <div className="h-full flex flex-col items-center justify-center p-8">
                      <FolderCode className="h-16 w-16 mb-4 text-primary" />
                      <h2 className="text-xl font-semibold">Projects</h2>
                    </div>
                  </Card>
                </motion.div>
              </div>
            </div>
          </div>
        );

      case "cc-agents":
        return <CCAgents onBack={() => handleViewChange("welcome")} />;

      case "editor":
        return (
          <div className="flex-1 overflow-hidden">
            <MarkdownEditor onBack={() => handleViewChange("welcome")} />
          </div>
        );

      case "settings":
        return <Settings onBack={() => handleViewChange("welcome")} />;

      case "projects":
        return <CCProjectView onEditClaudeFile={handleEditClaudeFile} />;

      case "claude-file-editor":
        return editingClaudeFile ? (
          <ClaudeFileEditor
            file={editingClaudeFile}
            onBack={handleBackFromClaudeFileEditor}
          />
        ) : null;

      case "tabs":
        return (
          <div className="h-full flex flex-col">
            <TabManager className="flex-shrink-0" />
            <div className="flex-1 overflow-hidden">
              <TabContent />
            </div>
          </div>
        );

      case "project-settings":
        if (projectForSettings) {
          return (
            <ProjectSettings
              project={projectForSettings}
              onBack={() => {
                setProjectForSettings(null);
                handleViewChange(previousView || "projects");
              }}
            />
          );
        }
        break;

      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Custom Titlebar */}
      <CustomTitlebar
        onAgentsClick={() => createAgentsTab()}
        onClaudeClick={() => createClaudeMdTab()}
        onSettingsClick={() => createSettingsTab()}
        onInfoClick={() => setShowNFO(true)}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">{renderContent()}</div>

      {/* NFO Credits Modal */}
      {showNFO && <NFOCredits onClose={() => setShowNFO(false)} />}

      {/* Claude Binary Dialog */}
      <ClaudeBinaryDialog
        open={showClaudeBinaryDialog}
        onOpenChange={setShowClaudeBinaryDialog}
        onSuccess={() => {
          setToast({
            message: "Claude binary path saved successfully",
            type: "success",
          });
          // Trigger a refresh of the Claude version check
          window.location.reload();
        }}
        onError={(message) => setToast({ message, type: "error" })}
      />

      {/* Toast Container */}
      <ToastContainer>
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onDismiss={() => setToast(null)}
          />
        )}
      </ToastContainer>
    </div>
  );
}

/**
 * Main App component - Wraps the app with providers
 */
function ClaudeCodeApp() {
  return (
    <OutputCacheProvider>
      <TabProvider>
        <AppContent />
      </TabProvider>
    </OutputCacheProvider>
  );
}

export default ClaudeCodeApp;
