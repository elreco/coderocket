import { memo, useMemo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import type { BundledLanguage } from "shiki";

import {
  rehypePlugins,
  remarkPlugins,
  allowedHTMLElements,
} from "@/utils/markdown";

import { CodeBlock } from "./code-block";

interface MarkdownProps {
  children: string;
  html?: boolean;
  limitedMarkdown?: boolean;
}

export const Markdown = memo(
  ({ children, html = false, limitedMarkdown = false }: MarkdownProps) => {
    const components = useMemo(() => {
      return {
        div: ({ className, children, ...props }) => {
          return (
            <div className={className} {...props}>
              {children}
            </div>
          );
        },
        pre: (props) => {
          const { children, node, ...rest } = props;

          const [firstChild] = node?.children ?? [];

          if (
            firstChild &&
            firstChild.type === "element" &&
            firstChild.tagName === "code" &&
            firstChild.children[0].type === "text"
          ) {
            const { className, ...rest } = firstChild.properties;
            const [, language = "plaintext"] =
              /language-(\w+)/.exec(String(className) || "") ?? [];

            return (
              <CodeBlock
                code={firstChild.children[0].value}
                language={language as BundledLanguage}
                {...rest}
              />
            );
          }

          return <pre {...rest}>{children}</pre>;
        },
        h1: ({ children }) => (
          <h1 className="my-4 border-b border-border pb-[0.3em] text-2xl font-semibold leading-tight">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="my-3 border-b border-border pb-[0.3em] text-xl font-semibold leading-tight">
            {children}
          </h2>
        ),
        p: ({ children }) => <p className="my-2 last:mb-0">{children}</p>,
        a: ({ children, href }) => (
          <a
            href={href}
            className="cursor-pointer text-primary no-underline hover:underline"
          >
            {children}
          </a>
        ),
        code: ({ children, className }) => {
          const isInline = !className;
          return isInline ? (
            <code className="rounded-md bg-border px-[0.4em] py-[0.2em] font-mono text-[13px] text-foreground">
              {children}
            </code>
          ) : (
            <code className={className}>{children}</code>
          );
        },
        blockquote: ({ children }) => (
          <blockquote className="m-0 my-3 border-l-4 border-border pl-4 text-foreground">
            {children}
          </blockquote>
        ),
        ul: ({ children }) => (
          <ul className="my-2 list-disc pl-8">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="my-2 list-decimal pl-8">{children}</ol>
        ),
        li: ({ children }) => (
          <li className="first:mt-0 last:mb-0">{children}</li>
        ),
      } satisfies Components;
    }, []);

    return (
      <ReactMarkdown
        allowedElements={allowedHTMLElements}
        components={components}
        remarkPlugins={remarkPlugins(limitedMarkdown)}
        rehypePlugins={rehypePlugins(html)}
      >
        {children}
      </ReactMarkdown>
    );
  },
);
