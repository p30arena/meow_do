import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Mermaid from "./Mermaid";

interface MarkdownRendererProps {
  children: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ children }) => {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          pre: ({ node, children, ...props }) => {
            const child = React.Children.only(children);

            if (
              React.isValidElement<{
                className?: string;
                children?: React.ReactNode;
              }>(child)
            ) {
              const { className, children: codeContent } = child.props;
              const language = className?.replace("language-", "") || "";

              if (language === "mermaid") {
                return (
                  <pre className="not-prose" {...props}>
                    <Mermaid
                      chart={String(codeContent).replace(/\n$/, "")}
                    />
                  </pre>
                );
              }
            }
            return <pre {...props}>{children}</pre>;
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;