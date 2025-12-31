import { Card } from "../ui/card";
import { Code, FileText, Bug, Sparkles, RefreshCw, TestTube, Rocket, Lightbulb, Search, Wrench, ChevronsDown, ChevronsUp } from "lucide-react";
import { useState } from "react";

interface Example {
  icon: React.ReactNode;
  title: string;
  prompt: string;
  category: string;
}

const EXAMPLES: Example[] = [
  {
    icon: <Code className="h-5 w-5" />,
    title: "Code Generation",
    prompt: "Create a React component with TypeScript that displays a list of users with pagination",
    category: "Create"
  },
  {
    icon: <Bug className="h-5 w-5" />,
    title: "Debug Code",
    prompt: "Find and fix any bugs in the current codebase, especially type errors",
    category: "Fix"
  },
  {
    icon: <RefreshCw className="h-5 w-5" />,
    title: "Refactor",
    prompt: "Refactor this component to use hooks instead of class components and improve code quality",
    category: "Improve"
  },
  {
    icon: <TestTube className="h-5 w-5" />,
    title: "Write Tests",
    prompt: "Generate unit tests for the main functions in this file with full coverage",
    category: "Test"
  },
  {
    icon: <FileText className="h-5 w-5" />,
    title: "Add Documentation",
    prompt: "Add JSDoc comments to all functions and create a comprehensive README",
    category: "Document"
  },
  {
    icon: <Sparkles className="h-5 w-5" />,
    title: "Optimize Performance",
    prompt: "Analyze and optimize the performance of this React application, focusing on re-renders",
    category: "Optimize"
  },
  {
    icon: <Search className="h-5 w-5" />,
    title: "Code Review",
    prompt: "Review the codebase and suggest improvements for code quality, security, and best practices",
    category: "Review"
  },
  {
    icon: <Rocket className="h-5 w-5" />,
    title: "Add Feature",
    prompt: "Add a dark mode toggle feature to this application with theme persistence",
    category: "Feature"
  },
  {
    icon: <Lightbulb className="h-5 w-5" />,
    title: "Explain Code",
    prompt: "Explain how the authentication system works in this codebase",
    category: "Learn"
  },
  {
    icon: <Wrench className="h-5 w-5" />,
    title: "Setup Project",
    prompt: "Help me set up a new TypeScript + React + Vite project with ESLint and Prettier",
    category: "Setup"
  },
];

interface Props {
  onSelectPrompt: (prompt: string) => void;
}

export function ExamplePrompts({ onSelectPrompt }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleAll = () => {
    setIsExpanded(prev => !prev);
  };

  return (
    <div className="space-y-4 p-4">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <h2 className="text-2xl font-bold">What can Claude Code help you with?</h2>
          <button
            onClick={toggleAll}
            className="p-1.5 hover:bg-accent rounded transition-colors"
            aria-label={isExpanded ? "Collapse all" : "Expand all"}
          >
            {isExpanded ? (
              <ChevronsUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronsDown className="h-5 w-5 text-muted-foreground" />
            )}
          </button>
        </div>
        <p className="text-muted-foreground">
          Select an example below or type your own prompt
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {EXAMPLES.map((example, idx) => (
          <Card
            key={idx}
            className="p-3 hover:bg-accent cursor-pointer transition-colors"
            onClick={() => onSelectPrompt(example.prompt)}
          >
            {isExpanded ? (
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  {example.icon}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-sm flex-1">{example.title}</h3>
                    <span className="text-xs text-muted-foreground px-2 py-1 rounded-full bg-secondary">
                      {example.category}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {example.prompt}
                  </p>
                </div>
              </div>
            ) : (
              <h3 className="font-semibold text-sm">{example.title}</h3>
            )}
          </Card>
        ))}
      </div>

      <Card className="p-4 bg-muted/50">
        <div className="space-y-2">
          <h3 className="font-semibold text-sm">Pro Tips:</h3>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>Be specific about what you want Claude to do</li>
            <li>Claude can read, write, and edit files in your project</li>
            <li>You can ask Claude to run tests and commands</li>
            <li>Use interrupt button to stop ongoing tasks</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}
