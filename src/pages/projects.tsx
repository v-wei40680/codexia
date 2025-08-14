import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FolderOpen } from 'lucide-react';
import { useFolderStore } from '@/stores/FolderStore';
import { Button } from '@/components/ui/button';
import { useLayoutStore } from '@/stores/layoutStore';

interface Project {
  path: string;
  trust_level: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const { setCurrentFolder } = useFolderStore();
  const { toggleFileTree } = useLayoutStore()

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const projectList = await invoke<Project[]>('read_codex_config');
      setProjects(projectList);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const openProjectInFileTree = (projectPath: string) => {
    setCurrentFolder(projectPath);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div>Loading projects...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="w-full">
          <div className="flex items-center justify-between w-full">
            <h1 className="text-2xl font-bold">Projects</h1>
            <Button>Add mcp server</Button>
          </div>
          <p className="text-muted-foreground">Manage your Codex projects</p>
        </div>
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <FolderOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No projects found</h3>
            <p className="text-muted-foreground">
              run codex at project to see them here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {projects.map((project, index) => {
            const projectName = project.path.split(/[/\\]/).pop() || project.path;
            return (
              <Card 
                key={index} 
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => {
                  toggleFileTree()
                  openProjectInFileTree(project.path)
                }}
              >
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FolderOpen className="w-5 h-5" />
                      {projectName}
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      project.trust_level === 'trusted' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {project.trust_level}
                    </span>
                  </CardTitle>
                  <CardDescription>{project.path}</CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}