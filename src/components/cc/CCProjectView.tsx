import { useState, useEffect, useRef } from "react";
import { api, type Project, type Session, type ClaudeMdFile } from "@/lib/api";
import { ProjectList } from "@/components/cc/ProjectList";
import { FilePicker } from "@/components/cc/FilePicker";
import { SessionList } from "@/components/cc/SessionList";
import { ProjectViewErrorBoundary } from "./ProjectViewErrorBoundary";

interface CCProjectViewProps {
  onEditClaudeFile?: (file: ClaudeMdFile) => void;
}

export function CCProjectView({ onEditClaudeFile }: CCProjectViewProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [_error, setError] = useState<string | null>(null);
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [homeDirectory, setHomeDirectory] = useState<string>("/");
  const isInitializedRef = useRef(false);

  /**
   * Loads all projects from the ~/.claude/projects directory
   */
  const loadProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const projectList = await api.listProjects();
      setProjects(projectList);
    } catch (err) {
      console.error("Failed to load projects:", err);
      setError(
        "Failed to load projects. Please ensure ~/.claude directory exists.",
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handles project selection and loads its sessions
   */
  const handleProjectClick = async (project: Project) => {
    try {
      setLoading(true);
      setError(null);
      const sessionList = await api.getProjectSessions(project.id);
      setSessions(sessionList);
      setSelectedProject(project);
    } catch (err) {
      console.error("Failed to load sessions:", err);
      setError("Failed to load sessions for this project.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Opens the project directory picker
   */
  const handleOpenProject = async () => {
    // Get home directory before showing picker
    const homeDir = await api.getHomeDirectory();
    setHomeDirectory(homeDir);
    setShowProjectPicker(true);
  };

  // Initialize projects on first render
  useEffect(() => {
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      loadProjects();
    }
  }, []);

  if (selectedProject) {
    return (
      <ProjectViewErrorBoundary>
        <SessionList
          sessions={sessions}
          projectPath={selectedProject.path}
          onEditClaudeFile={onEditClaudeFile}
        />
      </ProjectViewErrorBoundary>
    );
  }

  return (
    <ProjectViewErrorBoundary>
      <div>
        <ProjectList
          projects={projects}
          onProjectClick={handleProjectClick}
          onOpenProject={handleOpenProject}
          loading={loading}
        />

        {/* File picker modal for selecting project directory */}
        {showProjectPicker && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="w-full max-w-2xl h-[600px] bg-background border rounded-lg shadow-lg">
              <FilePicker
                basePath={homeDirectory}
                onSelect={async (entry) => {
                  if (entry.is_directory) {
                    // Create or open a project for this directory
                    try {
                      const project = await api.createProject(entry.path);
                      setShowProjectPicker(false);
                      await loadProjects();
                      await handleProjectClick(project);
                    } catch (err) {
                      console.error("Failed to create project:", err);
                      setError(
                        "Failed to create project for the selected directory.",
                      );
                    }
                  }
                }}
                onClose={() => setShowProjectPicker(false)}
              />
            </div>
          </div>
        )}
      </div>
    </ProjectViewErrorBoundary>
  );
}
