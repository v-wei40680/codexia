import { Card } from '@/components/ui/card';
import {
  Code,
  FileText,
  Bug,
  Sparkles,
  RefreshCw,
  TestTube,
  Rocket,
  Lightbulb,
  Search,
  Wrench,
  ChevronsDown,
  ChevronsUp,
} from 'lucide-react';

interface Example {
  icon: React.ReactNode;
  title: string;
  prompt: string;
  category: string;
}

const EXAMPLES: Example[] = [
  {
    icon: <Code className="h-5 w-5" />,
    title: 'Code Generation',
    prompt:
      'Create a React component with TypeScript that displays a list of users with pagination',
    category: 'Create',
  },
  {
    icon: <Bug className="h-5 w-5" />,
    title: 'Debug Code',
    prompt: 'Find and fix any bugs in the current codebase, especially type errors',
    category: 'Fix',
  },
  {
    icon: <RefreshCw className="h-5 w-5" />,
    title: 'Refactor',
    prompt:
      'Refactor this component to use hooks instead of class components and improve code quality',
    category: 'Improve',
  },
  {
    icon: <TestTube className="h-5 w-5" />,
    title: 'Write Tests',
    prompt: 'Generate unit tests for the main functions in this file with full coverage',
    category: 'Test',
  },
  {
    icon: <FileText className="h-5 w-5" />,
    title: 'Add Documentation',
    prompt: 'Add JSDoc comments to all functions and create a comprehensive README',
    category: 'Document',
  },
  {
    icon: <Sparkles className="h-5 w-5" />,
    title: 'Optimize Performance',
    prompt:
      'Analyze and optimize the performance of this React application, focusing on re-renders',
    category: 'Optimize',
  },
  {
    icon: <Search className="h-5 w-5" />,
    title: 'Code Review',
    prompt:
      'Review the codebase and suggest improvements for code quality, security, and best practices',
    category: 'Review',
  },
  {
    icon: <Rocket className="h-5 w-5" />,
    title: 'Add Feature',
    prompt: 'Add a dark mode toggle feature to this application with theme persistence',
    category: 'Feature',
  },
  {
    icon: <Lightbulb className="h-5 w-5" />,
    title: 'Explain Code',
    prompt: 'Explain how the authentication system works in this codebase',
    category: 'Learn',
  },
  {
    icon: <Wrench className="h-5 w-5" />,
    title: 'Setup Project',
    prompt: 'Help me set up a new TypeScript + React + Vite project with ESLint and Prettier',
    category: 'Setup',
  },
];


interface Props {
  onSelectPrompt: (prompt: string) => void;
  isExpanded: boolean;
  onToggleExpanded: () => void;
}

export function ExamplePrompts({ onSelectPrompt, isExpanded, onToggleExpanded }: Props) {
  const displayedExamples = isExpanded ? EXAMPLES : EXAMPLES.slice(0, 4);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between px-2">
        <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          {isExpanded ? 'All Examples' : 'Example Prompts'}
        </h2>
        <button
          onClick={onToggleExpanded}
          className="text-xs font-medium text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
        >
          {isExpanded ? (
            <>
              Show less <ChevronsUp className="h-3.5 w-3.5" />
            </>
          ) : (
            <>
              Show all <ChevronsDown className="h-3.5 w-3.5" />
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-1">
        {displayedExamples.map((example, idx) => (
          <Card
            key={idx}
            className="group relative overflow-hidden p-4 hover:shadow-md hover:border-primary/50 cursor-pointer transition-all duration-300 bg-card/50 backdrop-blur-sm border-dashed"
            onClick={() => onSelectPrompt(example.prompt)}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="flex items-start gap-3 relative z-10">
              <div className="mt-0.5 p-2.5 rounded-xl bg-primary/10 text-primary group-hover:scale-110 transition-transform duration-300">
                {example.icon}
              </div>
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                    {example.title}
                  </h3>
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary transition-colors">
                    {example.category}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                  {example.prompt}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
