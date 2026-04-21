"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Props {
  content: string;
  streaming?: boolean;
}

export function MarkdownContent({ content, streaming }: Props) {
  return (
    <div className="min-w-0 max-w-full space-y-2 overflow-hidden text-sm leading-relaxed break-words [overflow-wrap:anywhere] [&_*]:max-w-full">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: (props) => <h1 className="mt-1 text-base font-bold leading-snug" {...props} />,
          h2: (props) => <h2 className="mt-1 text-sm font-bold leading-snug" {...props} />,
          h3: (props) => (
            <h3 className="mt-0.5 text-sm font-semibold text-foreground/80 leading-snug" {...props} />
          ),
          p: (props) => <p className="leading-relaxed break-words [overflow-wrap:anywhere]" {...props} />,
          ul: (props) => <ul className="list-disc space-y-1.5 pl-5" {...props} />,
          ol: (props) => <ol className="list-decimal space-y-1.5 pl-5" {...props} />,
          blockquote: (props) => (
            <blockquote className="border-l-2 border-current pl-3 opacity-75 italic" {...props} />
          ),
          code: ({ className, children, ...props }) => (
            <code
              className={`rounded bg-black/10 px-1 py-0.5 font-mono text-[0.8em] whitespace-pre-wrap break-all [overflow-wrap:anywhere] ${className ?? ""}`.trim()}
              {...props}
            >
              {children}
            </code>
          ),
          table: (props) => (
            <div className="my-2 w-full overflow-hidden">
              <table className="w-full table-fixed border-collapse text-xs" {...props} />
            </div>
          ),
          th: (props) => (
            <th
              className="border border-black/10 bg-black/5 px-2 py-1 text-left font-semibold break-words [overflow-wrap:anywhere]"
              {...props}
            />
          ),
          td: (props) => (
            <td
              className="border border-black/10 px-2 py-1 align-top break-words [overflow-wrap:anywhere]"
              {...props}
            />
          ),
          a: (props) => <a className="underline" target="_blank" rel="noreferrer" {...props} />,
          hr: (props) => <hr className="border-current opacity-20" {...props} />,
        }}
      >
        {content || ""}
      </ReactMarkdown>

      {streaming && (
        <span className="inline-block h-3 w-1 translate-y-0.5 animate-pulse bg-current align-baseline" />
      )}
    </div>
  );
}
