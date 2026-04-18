"use client";

import { Fragment } from "react";

interface Props {
  content: string;
  streaming?: boolean;
}

type Block =
  | { kind: "h1" | "h2" | "h3"; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] }
  | { kind: "blockquote"; text: string }
  | { kind: "p"; text: string }
  | { kind: "hr" };

function parseBlocks(raw: string): Block[] {
  const lines = raw.split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Blank line — skip
    if (line.trim() === "") { i++; continue; }

    // Headings
    if (line.startsWith("### ")) {
      blocks.push({ kind: "h3", text: line.slice(4).trim() });
      i++; continue;
    }
    if (line.startsWith("## ")) {
      blocks.push({ kind: "h2", text: line.slice(3).trim() });
      i++; continue;
    }
    if (line.startsWith("# ")) {
      blocks.push({ kind: "h1", text: line.slice(2).trim() });
      i++; continue;
    }

    // HR
    if (/^[-*]{3,}$/.test(line.trim())) {
      blocks.push({ kind: "hr" });
      i++; continue;
    }

    // Blockquote
    if (line.startsWith("> ") || line === ">") {
      const lines2: string[] = [];
      while (i < lines.length && (lines[i].startsWith("> ") || lines[i] === ">")) {
        lines2.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      blocks.push({ kind: "blockquote", text: lines2.join(" ") });
      continue;
    }

    // Unordered list
    if (/^(\s*[-*+] )/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^(\s*[-*+] )/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*+] /, "").trim());
        i++;
      }
      blocks.push({ kind: "ul", items });
      continue;
    }

    // Ordered list
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, "").trim());
        i++;
      }
      blocks.push({ kind: "ol", items });
      continue;
    }

    // Paragraph — collect consecutive non-special lines
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].startsWith("#") &&
      !/^(\s*[-*+] )/.test(lines[i]) &&
      !/^\d+\.\s/.test(lines[i]) &&
      !/^[-*]{3,}$/.test(lines[i].trim())
    ) {
      para.push(lines[i]);
      i++;
    }
    if (para.length) blocks.push({ kind: "p", text: para.join(" ") });
  }

  return blocks;
}

// Inline: bold, italic, inline code
function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  // Matches: **bold**, *italic*, `code`
  const re = /(\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`)/g;
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[2] !== undefined) parts.push(<strong key={m.index} className="font-semibold">{m[2]}</strong>);
    else if (m[3] !== undefined) parts.push(<em key={m.index} className="italic">{m[3]}</em>);
    else if (m[4] !== undefined) parts.push(<code key={m.index} className="rounded bg-black/10 px-1 py-0.5 font-mono text-[0.8em]">{m[4]}</code>);
    last = m.index + m[0].length;
  }

  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export function MarkdownContent({ content, streaming }: Props) {
  const blocks = parseBlocks(content);

  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {blocks.map((block, bi) => {
        const isLast = bi === blocks.length - 1;
        const cursor = streaming && isLast
          ? <span className="ml-0.5 inline-block h-3 w-1 translate-y-0.5 animate-pulse bg-current align-baseline" />
          : null;

        switch (block.kind) {
          case "h1":
            return <h1 key={bi} className="mt-1 text-base font-bold leading-snug">{renderInline(block.text)}{cursor}</h1>;
          case "h2":
            return <h2 key={bi} className="mt-1 text-sm font-bold leading-snug">{renderInline(block.text)}{cursor}</h2>;
          case "h3":
            return <h3 key={bi} className="mt-0.5 text-sm font-semibold text-foreground/80 leading-snug">{renderInline(block.text)}{cursor}</h3>;
          case "hr":
            return <hr key={bi} className="border-current opacity-20" />;
          case "blockquote":
            return (
              <blockquote key={bi} className="border-l-2 border-current pl-3 opacity-75 italic">
                <span>{renderInline(block.text)}{cursor}</span>
              </blockquote>
            );
          case "ul":
            return (
              <ul key={bi} className="space-y-1.5 pl-3">
                {block.items.map((item, ii) => {
                  const itemIsLast = isLast && ii === block.items.length - 1;
                  return (
                    <li key={ii} className="flex gap-2">
                      <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-60" />
                      <span>{renderInline(item)}{itemIsLast && cursor}</span>
                    </li>
                  );
                })}
              </ul>
            );
          case "ol":
            return (
              <ol key={bi} className="space-y-1.5 pl-3">
                {block.items.map((item, ii) => {
                  const itemIsLast = isLast && ii === block.items.length - 1;
                  return (
                    <li key={ii} className="flex gap-2">
                      <span className="shrink-0 font-semibold opacity-70">{ii + 1}.</span>
                      <span>{renderInline(item)}{itemIsLast && cursor}</span>
                    </li>
                  );
                })}
              </ol>
            );
          case "p":
          default:
            return (
              <p key={bi}>
                {renderInline(block.text)}{cursor}
              </p>
            );
        }
      })}

      {/* Show cursor even when content is empty (initial streaming state) */}
      {streaming && blocks.length === 0 && (
        <span className="inline-block h-3 w-1 translate-y-0.5 animate-pulse bg-current align-baseline" />
      )}
    </div>
  );
}
