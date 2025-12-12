import { useState, useEffect, useCallback } from "react";
import { useNoteStore } from "@/stores/useNoteStore";
import { useThemeContext } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save, Eye, Code, PencilIcon, PanelLeft } from "lucide-react";
import AceEditor from "react-ace";
import { NoteToChat } from "./NoteToChat";

import "ace-builds/src-noconflict/mode-markdown";
import "ace-builds/src-noconflict/theme-github";
import "ace-builds/src-noconflict/theme-monokai";
import "ace-builds/src-noconflict/ext-language_tools";
import { MarkdownRenderer } from "../chat/MarkdownRenderer";

function NoteContentEditor({ content, onChange, theme, placeholder }: { content: string; onChange: (val: string) => void; theme: string; placeholder: string }) {
  return (
    <AceEditor
      mode="markdown"
      theme={theme === 'dark' ? 'monokai' : 'github'}
      value={content}
      onChange={onChange}
      width="100%"
      height="100%"
      fontSize={14}
      showPrintMargin={false}
      showGutter={true}
      highlightActiveLine={true}
      setOptions={{
        enableBasicAutocompletion: true,
        enableLiveAutocompletion: true,
        enableSnippets: true,
        showLineNumbers: true,
        tabSize: 2,
        wrap: true
      }}
      placeholder={placeholder}
    />
  );
}

export function NoteEditor() {
  const {
    createNote,
    getCurrentNote, setCurrentNote,
    updateNote,
    toggleNoteListVisibility,
  } = useNoteStore();
  
  const { theme } = useThemeContext();

  const currentNote = getCurrentNote();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [viewMode, setViewMode] = useState<'edit' | 'preview' | 'split'>('edit');

  useEffect(() => {
    if (currentNote) {
      setTitle(currentNote.title);
      setContent(currentNote.content);
      setHasChanges(false);
    } else {
      setTitle("");
      setContent("");
      setHasChanges(false);
    }
    setIsEditing(false);
  }, [currentNote]);

  const handleSave = useCallback(async () => {
    if (hasChanges) {
      if (currentNote) {
        await updateNote(currentNote.id, { title, content });
      } else {
        // Create a new note if none exists
        const newNote = await createNote(title || undefined, content);
        setCurrentNote(newNote.id);
      }
      setHasChanges(false);
      setIsEditing(false);
    }
  }, [hasChanges, currentNote, title, content, updateNote, createNote, setCurrentNote]);

  const handleTitleChange = useCallback((newTitle: string) => {
    setTitle(newTitle);
    setHasChanges(true);
  }, []);

  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
    setHasChanges(true);
  }, []);

  // Auto-save mechanism: save after 2 seconds of inactivity when there are changes
  useEffect(() => {
    if (!hasChanges) return;
    const timeout = setTimeout(() => {
      handleSave();
    }, 2000);
    return () => clearTimeout(timeout);
  }, [hasChanges, handleSave]);

  // Helper function to render editor based on viewMode
  const renderEditor = () => {
    if (!currentNote) {
      return (
        <div className="h-full p-0">
          <NoteContentEditor
            content={content}
            onChange={handleContentChange}
            theme={theme}
            placeholder="Start writing your new note in markdown..."
          />
        </div>
      );
    }
    if (viewMode === 'edit') {
      return (
        <div className="h-full p-0">
          <NoteContentEditor
            content={content}
            onChange={handleContentChange}
            theme={theme}
            placeholder="Start writing your note in markdown..."
          />
        </div>
      );
    }
    if (viewMode === 'preview') {
      return (
        <div className="h-full p-4 overflow-y-auto">
          <MarkdownRenderer content={content} />
        </div>
      );
    }
    // split view
    return (
      <div className="h-full flex">
        {/* Editor Panel */}
        <div className="flex-1 border-r">
          <NoteContentEditor
            content={content}
            onChange={handleContentChange}
            theme={theme}
            placeholder="Start writing your note in markdown..."
          />
        </div>
        
        {/* Preview Panel */}
        <div className="flex-1 p-4 overflow-y-auto bg-gray-50 dark:bg-gray-900">
          <MarkdownRenderer content={content} />
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Note Header */}
      <div className="flex items-center gap-3 px-2 border-b bg-white dark:bg-gray-800 dark:border-gray-700">
        <Button
          onClick={toggleNoteListVisibility}
          size="icon"
          variant="ghost"
          className="h-7 w-7 p-0"
          title="Toggle Note List"
        >
          <PanelLeft className="h-4 w-4" />
        </Button>
        <Button
          onClick={async () => {
            const newNote = await createNote();
            setCurrentNote(newNote.id);
          }}
          size="icon"
          className="h-7 w-7 p-0"
          title="Create New Note"
        >
          <PencilIcon className="h-3 w-3" />
        </Button>
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <Input
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="font-medium"
              placeholder="Note title..."
              autoFocus
              onBlur={() => setIsEditing(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSave();
                }
              }}
            />
          ) : (
            <h1
              className="text-lg font-medium text-gray-900 dark:text-gray-100 truncate cursor-text hover:bg-gray-50 dark:hover:bg-gray-700 px-2 py-1 rounded"
              onClick={() => setIsEditing(true)}
              title="Click to edit title"
            >
              {title || "Untitled Note"}
            </h1>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Add to Chat Button */}
          {currentNote && <NoteToChat content={content} />}
          <div className="flex rounded-md border dark:border-gray-600">
            <Button
              variant={viewMode === "edit" ? "default" : "outline"}
              size="sm"
              className="h-8 rounded-r-none border-r-0"
              onClick={() => setViewMode("edit")}
            >
              <Code className="w-3 h-3 mr-1.5" />
              Edit
            </Button>
            <Button
              variant={viewMode === "preview" ? "default" : "outline"}
              size="sm"
              className="h-8 rounded-none border-r-0"
              onClick={() => setViewMode("preview")}
            >
              <Eye className="w-3 h-3 mr-1.5" />
            </Button>
            <Button
              variant={viewMode === "split" ? "default" : "outline"}
              size="sm"
              className="h-8 rounded-l-none"
              onClick={() => setViewMode("split")}
            >
              Split
            </Button>
          </div>

          {hasChanges && (
            <Button onClick={handleSave} size="sm" className="h-8">
              <Save className="w-3 h-3 mr-1.5" />
              Save
            </Button>
          )}
        </div>
      </div>

      {/* Note Content */}
      <div className="flex-1 min-h-0">
        {renderEditor()}
      </div>

      {/* Footer with metadata */}
      {currentNote && (
        <div className="px-4 py-2 border-t bg-gray-50 dark:bg-gray-800 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 flex justify-between items-center">
          <span>
            Created: {new Date(currentNote.createdAt).toLocaleDateString()}
          </span>
          <span>
            Modified: {new Date(currentNote.updatedAt).toLocaleString()}
          </span>
        </div>
      )}
    </div>
  );
}
