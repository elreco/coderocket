import { memo, useMemo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import type { BundledLanguage } from "shiki";

import {
  rehypePlugins,
  remarkPlugins,
  allowedHTMLElements,
} from "@/utils/markdown";

import { CodeBlock } from "../code-block";

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
            firstChild.tagName === "code"
          ) {
            const codeChild = firstChild.children[0];
            const codeContent =
              codeChild && "value" in codeChild ? codeChild.value : "";
            let language = "plaintext";

            if (
              codeContent.includes("import ") ||
              codeContent.includes("className=") ||
              codeContent.includes("htmlFor=") ||
              codeContent.includes("/>") ||
              /<[A-Z][A-Za-z]+/.test(codeContent) ||
              codeContent.includes("=>") ||
              codeContent.includes("const ") ||
              codeContent.includes("let ") ||
              codeContent.includes("async ") ||
              codeContent.includes("await ") ||
              codeContent.includes("useState") ||
              codeContent.includes("useEffect") ||
              codeContent.includes("function ") ||
              codeContent.includes("interface ") ||
              codeContent.includes("type ") ||
              codeContent.includes("class ") ||
              codeContent.includes("export ") ||
              codeContent.includes("return ") ||
              codeContent.includes("props.") ||
              codeContent.includes("?.") ||
              codeContent.includes("||") ||
              codeContent.includes("&&") ||
              codeContent.includes("{...") ||
              /\${.*}/.test(codeContent) ||
              /{[\s\S]*}/.test(codeContent) ||
              /\(\s*\)\s*=>/.test(codeContent) ||
              /\[\s*\w+\s*,\s*set\w+\s*\]/.test(codeContent)
            ) {
              language = "typescript";
            }

            const { className } = firstChild.properties || {};
            const languageMatch = /language-(\w+)/.exec(
              String(className) || "",
            );
            if (languageMatch) {
              language = languageMatch[1];
              if (
                ["js", "jsx", "javascript", "react"].includes(
                  language.toLowerCase(),
                )
              ) {
                language = "typescript";
              }
            }

            const code =
              codeChild && "value" in codeChild ? codeChild.value : "";

            return (
              <CodeBlock
                code={code}
                language={language as BundledLanguage}
                {...rest}
              />
            );
          }

          return <pre {...rest}>{children}</pre>;
        },
        h1: ({ children }) => (
          <h1 className="border-border my-2 border-b pb-[0.3em] text-2xl leading-tight font-semibold">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="border-border my-2 border-b pb-[0.3em] text-xl leading-tight font-semibold">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="my-2 text-lg leading-tight font-semibold">
            {children}
          </h3>
        ),
        h4: ({ children }) => (
          <h4 className="my-2 text-base leading-tight font-semibold">
            {children}
          </h4>
        ),
        h5: ({ children }) => (
          <h5 className="my-2 text-sm leading-tight font-semibold">
            {children}
          </h5>
        ),
        h6: ({ children }) => (
          <h6 className="my-2 text-xs leading-tight font-semibold">
            {children}
          </h6>
        ),
        p: ({ children }) => {
          const content = Array.isArray(children)
            ? children.join("\n")
            : String(children);

          // Patterns plus stricts pour la détection du code
          const codePatterns = [
            // Imports et exports
            /^import\s+[{\s\w}].*from\s+["'].*["'];?$/m,
            /^export\s+(?:default\s+)?(?:const|function|class|interface|type)\s+/m,

            // Déclarations
            /^(?:const|let|var)\s+\w+\s*=/m,
            /^function\s+\w+\s*\(/m,
            /^interface\s+\w+\s*{/m,
            /^type\s+\w+\s*=/m,

            // React/JSX
            /^const\s+\w+\s*=\s*\(\s*\)\s*=>/m,
            /^const\s+\w+\s*=\s*React\.(?:memo|forwardRef)/m,
            /^const\s+\[.*\]\s*=\s*useState/m,
            /^useEffect\s*\(\s*\(\s*\)\s*=>/m,

            // JSX
            /<[A-Z]\w+(?:\s+(?:\w+={[^}]*}|\w+="[^"]*"))*\s*\/?>$/m,
            /^return\s*\(\s*$/m,
          ];

          // Vérifie si le contenu correspond à au moins un pattern de code
          const isCodeBlock = codePatterns.some((pattern) =>
            pattern.test(content),
          );

          if (isCodeBlock) {
            return (
              <CodeBlock
                code={content}
                language="typescript"
                className="my-2"
              />
            );
          }

          return <p className="my-2 last:mb-0">{children}</p>;
        },
        a: ({ children, href }) => (
          <a
            href={href}
            className="text-primary cursor-pointer no-underline hover:underline"
          >
            {children}
          </a>
        ),
        code: ({ children, className }) => {
          const isInline = !className;
          return isInline ? (
            <code className="bg-border text-foreground w-full rounded-md px-[0.4em] py-[0.2em] font-mono text-[13px]">
              {children}
            </code>
          ) : (
            <code className={className}>{children}</code>
          );
        },
        blockquote: ({ children }) => (
          <blockquote className="border-border text-foreground m-0 my-2 border-l-4 pl-4">
            {children}
          </blockquote>
        ),
        ul: ({ children }) => (
          <ul className="my-2 list-disc pl-6">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="my-2 list-decimal pl-6">{children}</ol>
        ),
        li: ({ children }) => <li className="my-2 py-0">{children}</li>,
        table: ({ children }) => (
          <table className="my-2 w-full border-collapse">{children}</table>
        ),
        thead: ({ children }) => <thead>{children}</thead>,
        tbody: ({ children }) => <tbody>{children}</tbody>,
        tr: ({ children }) => (
          <tr className="border-border border-b">{children}</tr>
        ),
        th: ({ children }) => (
          <th className="border-border border px-4 py-2 text-left font-semibold">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="border-border border px-4 py-2">{children}</td>
        ),
        hr: () => <hr className="border-border my-4 border-t" />,
        img: ({ src, alt, ...props }) => (
          <img
            src={src}
            alt={alt}
            className="my-2 max-w-full rounded-md"
            {...props}
          />
        ),
        strong: ({ children }) => (
          <strong className="font-semibold">{children}</strong>
        ),
        em: ({ children }) => <em className="italic">{children}</em>,
        del: ({ children }) => <del className="line-through">{children}</del>,
        sup: ({ children }) => (
          <sup className="align-super text-xs">{children}</sup>
        ),
        sub: ({ children }) => (
          <sub className="align-sub text-xs">{children}</sub>
        ),
        span: ({ children, className }) => (
          <span className={className}>{children}</span>
        ),
        small: ({ children }) => (
          <small className="text-muted-foreground text-sm">{children}</small>
        ),
        kbd: ({ children }) => (
          <kbd className="border-border bg-muted rounded-md border px-1.5 py-0.5 font-mono text-xs">
            {children}
          </kbd>
        ),
        mark: ({ children }) => (
          <mark className="rounded-md bg-yellow-200 px-1 py-0.5 dark:bg-yellow-800">
            {children}
          </mark>
        ),
        abbr: ({ children, title }) => (
          <abbr
            title={title}
            className="border-muted-foreground cursor-help border-b border-dotted"
          >
            {children}
          </abbr>
        ),
        cite: ({ children }) => (
          <cite className="text-muted-foreground italic">{children}</cite>
        ),
        details: ({ children }) => (
          <details className="border-border my-2 rounded-lg border p-2">
            {children}
          </details>
        ),
        summary: ({ children }) => (
          <summary className="cursor-pointer font-semibold">{children}</summary>
        ),
      } satisfies Components;
    }, []);

    return (
      <ReactMarkdown
        allowedElements={allowedHTMLElements}
        components={components}
        remarkPlugins={remarkPlugins(limitedMarkdown)}
        rehypePlugins={rehypePlugins(html)}
        className="overflow-x-auto text-sm"
      >
        {children}
      </ReactMarkdown>
    );
  },
);
