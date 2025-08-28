import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypePrism from 'rehype-prism-plus';
import { useThemeStore } from '@/stores/ThemeStore';
import 'prismjs/themes/prism.css';
import 'prismjs/themes/prism-dark.css';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}


export const MarkdownRenderer = memo<MarkdownRendererProps>(({ 
  content, 
  className = "" 
}) => {
  const { theme } = useThemeStore();
  
  return (
    <div className={`text-sm text-foreground leading-relaxed prose prose-sm ${theme === 'dark' ? 'prose-invert' : ''} max-w-full break-words overflow-hidden ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypePrism]}
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0 select-text">{children}</p>,
          
          code: ({ inline, className, children, ...props }: any) => {
            if (inline) {
              return (
                <code className={`px-1 py-0.5 rounded text-sm font-mono select-text ${theme === 'dark' ? 'bg-muted text-primary' : 'bg-gray-100 text-gray-800'}`} {...props}>
                  {children}
                </code>
              );
            }
            return (
              <code className={`${className} select-text`} {...props}>
                {children}
              </code>
            );
          },
          
          pre: ({ children }) => (
            <pre className={`border rounded-md p-3 overflow-x-auto my-2 select-text max-w-full ${theme === 'dark' ? 'bg-muted/50' : 'bg-gray-50'}`}>
              {children}
            </pre>
          ),
          
          blockquote: ({ children }) => (
            <blockquote className={`border-l-4 pl-4 italic my-2 select-text ${theme === 'dark' ? 'border-muted-foreground/30' : 'border-gray-300'}`}>
              {children}
            </blockquote>
          ),
          
          ul: ({ children }) => <ul className="list-disc pl-6 my-2 select-text">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-6 my-2 select-text">{children}</ol>,
          li: ({ children }) => <li className="mb-1 select-text">{children}</li>,
          
          h1: ({ children }) => <h1 className="text-lg font-bold mb-2 select-text">{children}</h1>,
          h2: ({ children }) => <h2 className="text-base font-bold mb-2 select-text">{children}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-bold mb-2 select-text">{children}</h3>,
          
          table: ({ children }) => (
            <div className="overflow-x-auto my-2 max-w-full">
              <table className={`w-full border-collapse border select-text ${theme === 'dark' ? 'border-border' : 'border-gray-300'}`}>
                {children}
              </table>
            </div>
          ),
          
          th: ({ children }) => (
            <th className={`border px-2 py-1 font-medium text-left select-text ${theme === 'dark' ? 'border-border bg-muted/50' : 'border-gray-300 bg-gray-100'}`}>
              {children}
            </th>
          ),
          
          td: ({ children }) => (
            <td className={`border px-2 py-1 select-text ${theme === 'dark' ? 'border-border' : 'border-gray-300'}`}>{children}</td>
          ),
          
          // Make links selectable
          a: ({ href, children, ...props }) => (
            <a 
              href={href} 
              className={`underline select-text ${theme === 'dark' ? 'text-primary hover:text-primary/80' : 'text-blue-600 hover:text-blue-800'}`} 
              target="_blank" 
              rel="noopener noreferrer" 
              {...props}
            >
              {children}
            </a>
          ),
          
          // Ensure other text elements are selectable
          strong: ({ children }) => <strong className="select-text">{children}</strong>,
          em: ({ children }) => <em className="select-text">{children}</em>,
          span: ({ children }) => <span className="select-text">{children}</span>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});