import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CodexProjectView from "@/pages/projects";
import { ProjectList } from "@/components/cc/ProjectList";
import type { Project } from "@/lib/api";
import { api } from "@/lib/api";
import { useNavigationStore } from "@/stores/navigationStore";
import { useState, useEffect } from "react";
import { useFolderStore } from "@/stores/FolderStore";

export function ProjectPanel() {
  const [projects, setProjects] = useState<Project[]>([]);
  const { setSelectedProject, setMainView, mainView } = useNavigationStore();
  const { setCurrentFolder } = useFolderStore();

  // Load projects
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const projectList = await api.listProjects();
        setProjects(projectList);
      } catch (err) {
        console.error("Failed to load projects:", err);
      }
    };

    loadProjects();
  }, []);

  const handleProjectClick = (project: Project) => {
    setSelectedProject(project);
    setCurrentFolder(project.path);
    setMainView(mainView === "cc" ? null : "cc");
  };

  const handleOpenProject = async () => {
    console.log("Open project clicked");
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <Tabs
        defaultValue="codex"
        className="flex flex-col h-full overflow-hidden"
      >
        <div className="shrink-0 border-b">
          <TabsList className="w-full justify-start rounded-none border-0 bg-transparent p-0 h-auto gap-0">
            <TabsTrigger
              value="codex"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-3 py-3 text-sm font-medium"
            >
              codex
            </TabsTrigger>
            <TabsTrigger
              value="cc"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-3 py-3 text-sm font-medium"
            >
              Claude Code
            </TabsTrigger>
          </TabsList>
        </div>
        <div className="flex-1 overflow-hidden">
          <TabsContent value="codex" className="h-full overflow-auto m-0">
            <CodexProjectView />
          </TabsContent>
          <TabsContent value="cc" className="h-full overflow-auto m-0">
            <ProjectList
              projects={projects}
              onProjectClick={handleProjectClick}
              onOpenProject={handleOpenProject}
              loading={false}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
