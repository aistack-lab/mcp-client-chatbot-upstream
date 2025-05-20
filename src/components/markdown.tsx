import Link from "next/link";
import React, { memo, PropsWithChildren } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { PreBlock } from "./pre-block";
import { cn, isJson, isString, toAny } from "lib/utils";
import JsonView from "ui/json-view";
import "katex/dist/katex.min.css";
import { AlertTriangle, Info, Check, AlertCircle } from "lucide-react";
import { visit } from "unist-util-visit";

const FadeIn = memo(({ children }: PropsWithChildren) => {
  return <span className="fade-in animate-in duration-1000">{children} </span>;
});
FadeIn.displayName = "FadeIn";

const WordByWordFadeIn = memo(({ children }: PropsWithChildren) => {
  const childrens = [children]
    .flat()
    .flatMap((child) => (isString(child) ? child.split(" ") : child));
  return childrens.map((word, index) =>
    isString(word) ? <FadeIn key={index}>{word}</FadeIn> : word,
  );
});
WordByWordFadeIn.displayName = "WordByWordFadeIn";
// Custom CSS for math and admonitions
const customStyles = `
.katex-display {
  overflow-x: auto;
  overflow-y: hidden;
  padding: 0.5em 0;
}

.math-inline {
  display: inline-block;
}

.admonition {
  margin: 1.5rem 0;
  padding: 0;
  overflow: hidden;
  border-radius: 0.5rem;
  border-left: 4px solid transparent;
}

.admonition-content {
  padding: 1rem;
  background-color: #FEF3F8;
}

.dark .admonition-content {
  background-color: #003878;
}

.admonition-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  padding: 0.5rem 1rem;
  font-weight: 600;
  font-size: 0.875rem;
  background-color: rgba(179, 86, 6, 0.1);
}

.dark .admonition-title {
  background-color: rgba(27, 79, 217, 0.2);
}

.admonition-title svg {
  width: 1rem;
  height: 1rem;
}

.admonition.note {
  border-color: #1B4FD9;
}
.admonition.note .admonition-title {
  color: #1B4FD9;
}

.dark .admonition.note .admonition-title {
  color: #2463EB;
}

.admonition.tip {
  border-color: #2463EB;
}
.admonition.tip .admonition-title {
  color: #2463EB;
}

.dark .admonition.tip .admonition-title {
  color: #1B4FD9;
}

.admonition.warning {
  border-color: #B35606;
}
.admonition.warning .admonition-title {
  color: #B35606;
}

.dark .admonition.warning .admonition-title {
  color: #B35606;
}

.admonition.danger {
  border-color: #7B25C4;
}
.admonition.danger .admonition-title {
  color: #7B25C4;
}

.dark .admonition.danger .admonition-title {
  color: #7B25C4;
}
`;

// Add custom styles to the document head
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = customStyles;
  document.head.appendChild(style);
}

const components: Partial<Components> = {
  code: ({ children }) => {
    return (
      <code className="text-sm rounded-md bg-accent py-1 px-2 mx-0.5">
        {children}
      </code>
    );
  },
  blockquote: ({ children, className }) => {
    // Check if this is a special admonition blockquote
    if (className && className.startsWith('admonition ')) {
      const type = className.split(' ')[1];
      
      // Get the icon based on admonition type
      const title = type.charAt(0).toUpperCase() + type.slice(1);
    
      const icon = type === "note" ? <Info /> :
                   type === "tip" ? <Check /> :
                   type === "warning" ? <AlertTriangle /> :
                   <AlertCircle />;
      
      return (
        <div className="px-4">
          <div className={`admonition ${type}`}>
            <div className="admonition-title">
              {icon}
              {title}
            </div>
            <div className="admonition-content">
              <WordByWordFadeIn>{children}</WordByWordFadeIn>
            </div>
          </div>
        </div>
      );
    }
    
    // Regular blockquotes
    return (
      <div className="px-4">
        <blockquote className="relative bg-accent/30 p-6 rounded-2xl my-6 overflow-hidden border">
          <WordByWordFadeIn>{children}</WordByWordFadeIn>
        </blockquote>
      </div>
    );
  },
  p: ({ children }) => {
    return (
      <p className="leading-6 my-4 break-words">
        <WordByWordFadeIn>{children}</WordByWordFadeIn>
      </p>
    );
  },
  pre: ({ children }) => {
    return (
      <div className="px-4 py-2">
        <PreBlock>{children}</PreBlock>
      </div>
    );
  },
  ol: ({ children, ...props }) => {
    return (
      <ol className="px-8 list-decimal list-outside" {...props}>
        {children}
      </ol>
    );
  },
  li: ({ children, ...props }) => {
    return (
      <li className="py-2" {...props}>
        <WordByWordFadeIn>{children}</WordByWordFadeIn>
      </li>
    );
  },
  ul: ({ children, ...props }) => {
    return (
      <ul className="px-8 list-decimal list-outside" {...props}>
        {children}
      </ul>
    );
  },
  strong: ({ children, ...props }) => {
    return (
      <span className="font-semibold" {...props}>
        <WordByWordFadeIn>{children}</WordByWordFadeIn>
      </span>
    );
  },
  a: ({ children, ...props }) => {
    return (
      <Link
        className="hover:underline text-blue-400"
        target="_blank"
        rel="noreferrer"
        {...toAny(props)}
      >
        <b>
          <WordByWordFadeIn>{children}</WordByWordFadeIn>
        </b>
      </Link>
    );
  },
  h1: ({ children, ...props }) => {
    return (
      <h1 className="text-3xl font-semibold mt-6 mb-2" {...props}>
        <WordByWordFadeIn>{children}</WordByWordFadeIn>
      </h1>
    );
  },
  h2: ({ children, ...props }) => {
    return (
      <h2 className="text-2xl font-semibold mt-6 mb-2" {...props}>
        <WordByWordFadeIn>{children}</WordByWordFadeIn>
      </h2>
    );
  },
  h3: ({ children, ...props }) => {
    return (
      <h3 className="text-xl font-semibold mt-6 mb-2" {...props}>
        <WordByWordFadeIn>{children}</WordByWordFadeIn>
      </h3>
    );
  },
  h4: ({ children, ...props }) => {
    return (
      <h4 className="text-lg font-semibold mt-6 mb-2" {...props}>
        <WordByWordFadeIn>{children}</WordByWordFadeIn>
      </h4>
    );
  },
  h5: ({ children, ...props }) => {
    return (
      <h5 className="text-base font-semibold mt-6 mb-2" {...props}>
        <WordByWordFadeIn>{children}</WordByWordFadeIn>
      </h5>
    );
  },
  h6: ({ children, ...props }) => {
    return (
      <h6 className="text-sm font-semibold mt-6 mb-2" {...props}>
        <WordByWordFadeIn>{children}</WordByWordFadeIn>
      </h6>
    );
  },
  img: ({ ...props }) => {
    const { src, alt, ...rest } = props;

    // eslint-disable-next-line @next/next/no-img-element
    return <img className="mx-auto rounded-lg" src={src} alt={alt} {...rest} />;
  },
  table: ({ children, className, ...props }) => {
    return (
      <div className="my-8 px-4 w-full overflow-auto">
        <table className={cn("w-full border-collapse rounded-xl overflow-hidden border border-border", className)} {...props}>
          {children}
        </table>
      </div>
    );
  },
  thead: ({ children }) => {
    return <thead className="bg-primary/10 border-b border-border">{children}</thead>;
  },
  tbody: ({ children }) => {
    return <tbody>{children}</tbody>;
  },
  tr: ({ children, className, ...props }) => {
    return (
      <tr 
        className={cn(
          "hover:bg-primary/5 transition-colors",
          className
        )} 
        {...props}
      >
        {children}
      </tr>
    );
  },
  th: ({ children }) => {
    return (
      <th className="px-6 py-4 text-left font-semibold text-primary">
        <WordByWordFadeIn>{children}</WordByWordFadeIn>
      </th>
    );
  },
  td: ({ children }) => {
    return (
      <td className="px-6 py-4 text-sm border-t border-border/50">
        <WordByWordFadeIn>{children}</WordByWordFadeIn>
      </td>
    );
  },
};

const NonMemoizedMarkdown = ({ children }: { children: string }) => {
  return (
    <article className="w-full h-full relative">
      {isJson(children) ? (
        <JsonView data={children} />
      ) : (
        <ReactMarkdown
          components={components}
          remarkPlugins={[
            remarkGfm,
            remarkMath,
            () => (tree) => {
              // Custom admonition processor
              visit(tree, 'blockquote', (node) => {
                if (
                  node.children && 
                  node.children.length > 0 && 
                  node.children[0].type === 'paragraph' && 
                  node.children[0].children && 
                  node.children[0].children.length > 0 &&
                  node.children[0].children[0].type === 'text'
                ) {
                  const text = node.children[0].children[0].value;
                  const match = text.match(/^!\[(note|tip|warning|danger)\]\s+(.*)/i);
                  
                  if (match) {
                    const type = match[1].toLowerCase();
                    const content = match[2];
                    
                    // Change the content to remove the admonition marker
                    node.children[0].children[0].value = content;
                    
                    // Add a class to the blockquote node
                    if (!node.data) node.data = {};
                    if (!node.data.hProperties) node.data.hProperties = {};
                    node.data.hProperties.className = `admonition ${type}`;
                  }
                }
              });
            }
          ]}
          rehypePlugins={[rehypeKatex]}
        >
          {children}
        </ReactMarkdown>
      )}
    </article>
  );
};

export const Markdown = memo(
  NonMemoizedMarkdown,
  (prevProps, nextProps) => prevProps.children === nextProps.children,
);
