import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypePrism from 'rehype-prism-plus';
import 'prismjs/themes/prism.css';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}


export const MarkdownRenderer = memo<MarkdownRendererProps>(({ 
  content, 
  className = "" 
}) => {
  return (
    <div className={`text-sm text-gray-800 leading-relaxed prose prose-sm max-w-none break-words ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypePrism]}
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0 select-text">{children}</p>,
          
          code: ({ inline, className, children, ...props }: any) => {
            if (inline) {
              return (
                <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono text-red-600 select-text" {...props}>
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
            <pre className="bg-gray-50 border rounded-md p-3 overflow-x-auto my-2 select-text">
              {children}
            </pre>
          ),
          
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-gray-300 pl-4 italic my-2 select-text">
              {children}
            </blockquote>
          ),
          
          ul: ({ children }) => <ul className="list-disc pl-4 my-2 select-text">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-4 my-2 select-text">{children}</ol>,
          li: ({ children }) => <li className="mb-1 select-text">{children}</li>,
          
          h1: ({ children }) => <h1 className="text-lg font-bold mb-2 select-text">{children}</h1>,
          h2: ({ children }) => <h2 className="text-base font-bold mb-2 select-text">{children}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-bold mb-2 select-text">{children}</h3>,
          
          table: ({ children }) => (
            <div className="overflow-x-auto my-2">
              <table className="min-w-full border-collapse border border-gray-300 select-text">
                {children}
              </table>
            </div>
          ),
          
          th: ({ children }) => (
            <th className="border border-gray-300 px-2 py-1 bg-gray-100 font-medium text-left select-text">
              {children}
            </th>
          ),
          
          td: ({ children }) => (
            <td className="border border-gray-300 px-2 py-1 select-text">{children}</td>
          ),
          
          // Make links selectable
          a: ({ href, children, ...props }) => (
            <a 
              href={href} 
              className="text-blue-600 hover:text-blue-800 underline select-text" 
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