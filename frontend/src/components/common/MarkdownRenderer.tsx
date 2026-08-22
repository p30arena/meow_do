import React, { lazy, Suspense } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const Mermaid = lazy(() => import("./Mermaid"));
interface MarkdownRendererProps {
  children: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ children }) => {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          pre: ({ children, ...props }) => {
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
                    <Suspense fallback={<p role="status">Loading diagram…</p>}>
                      <Mermaid chart={String(codeContent).replace(/\n$/, "")} />
                    </Suspense>
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