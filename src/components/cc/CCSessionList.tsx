import { useState, useEffect } from "react";
import { SessionList } from "./SessionList";
import { api } from "@/lib/api";
import { useNavigationStore } from "@/stores/navigationStore";
import { useFolderStore } from "@/stores/FolderStore";
import type { Session, Project } from "@/lib/api";

/**
 * CCSessionList - Component for managing and displaying CC sessions in the sidebar
 * Handles projects loading, project-folder synchronization, and session loading
 */
export function CCSessionList() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [ccProjects, setCCProjects] = useState<Project[]>([]);

  const { selectedProject, setSelectedProject } = useNavigationStore();
  const { currentFolder } = useFolderStore();

  // Load CC projects once for synchronization
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const projects = await api.listProjects();
        setCCProjects(projects);
      } catch (err) {
        console.error("Failed to load projects for sync:", err);
      }
    };
    loadProjects();
  }, []);

  // Synchronize selectedProject and currentFolder
  // When currentFolder changes, find matching project and set it
  useEffect(() => {
    if (!currentFolder) {
      return;
    }

    if (selectedProject && selectedProject.path === currentFolder) {
      // Already in sync
      return;
    }

    // Find project that matches currentFolder
    const matchingProject = ccProjects.find((p) => p.path === currentFolder);
    if (matchingProject && selectedProject?.id !== matchingProject.id) {
      setSelectedProject(matchingProject);
    } else if (!matchingProject && selectedProject) {
      // currentFolder doesn't match any project, clear selection
      setSelectedProject(null);
    }
  }, [currentFolder, ccProjects, selectedProject, setSelectedProject]);

  // Load sessions when project is selected
  useEffect(() => {
    if (!selectedProject) {
      setSessions([]);
      return;
    }

    const loadSessions = async () => {
      try {
        const sessionList = await api.getProjectSessions(selectedProject.id);
        setSessions(sessionList);
      } catch (err) {
        console.error("Failed to load sessions:", err);
      }
    };

    loadSessions();
  }, [selectedProject]);

  if (!selectedProject && !currentFolder) {
    return null;
  }

  return (
    <div className="w-full mt-2 overflow-auto flex-1">
      <SessionList
        sessions={sessions}
        projectPath={currentFolder || selectedProject?.path || ""}
      />
    </div>
  );
}
