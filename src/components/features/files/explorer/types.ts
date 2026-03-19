export type FileNode = {
  name: string;
  path: string;
  kind: 'file' | 'dir' | 'symlink';
  children?: FileNode[];
};

export type FileTreeProps = {
  folder: string;
  isTreeVisible?: boolean;
  onToggleTree?: () => void;
  onFileSelect?: (path: string) => void;
};
