import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface SimpleMarkdownProps {
  content: string;
}
export const SimpleMarkdown = memo<SimpleMarkdownProps>(({ content }) => {
  return <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>;
});
