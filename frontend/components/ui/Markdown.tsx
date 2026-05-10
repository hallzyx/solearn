/**
 * Lightweight Markdown renderer — converts basic MD to JSX.
 * Supports: **bold**, ## headings, - lists, line breaks.
 */

import { memo, type ReactNode } from "react";

function renderLine(text: string, key: number) {
  // ## Heading
  if (text.startsWith("## ")) {
    return (
      <h3 key={key} className="font-heading text-base font-black uppercase tracking-tight mt-4 mb-2">
        {text.slice(3)}
      </h3>
    );
  }
  if (text.startsWith("# ")) {
    return (
      <h2 key={key} className="heading-lg mt-4 mb-2">
        {text.slice(2)}
      </h2>
    );
  }

  // - List item
  if (text.match(/^[\-\*]\s/)) {
    return (
      <li key={key} className="ml-4 list-disc">
        <InlineText text={text.replace(/^[\-\*]\s/, "")} />
      </li>
    );
  }

  // --- separator
  if (text.match(/^---+$/)) {
    return <hr key={key} className="my-3 border-brand-gray" />;
  }

  // Regular paragraph or bold
  return (
    <p key={key} className="mb-1.5">
      <InlineText text={text} />
    </p>
  );
}

function InlineText({ text }: { text: string }) {
  // Split by **bold** markers
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={i} className="font-black">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

export const Markdown = memo(function Markdown({ text }: { text: string }) {
  const lines = text.split("\n");
  const lastNonEmpty = lines.filter(Boolean).length;
  let liGroup: ReactNode[] = [];

  return (
    <div className="text-sm leading-relaxed">
      {lines.map((line, i) => {
        // Group consecutive list items
        if (line.match(/^[\-\*]\s/)) {
          liGroup.push(renderLine(line, i) as ReactNode);
          // If next line is also a list item, continue grouping
          const nextLine = lines[i + 1];
          if (nextLine?.match(/^[\-\*]\s/)) return null;
          const group = (
            <ul key={`ul-${i}`} className="mb-2">
              {liGroup}
            </ul>
          );
          liGroup = [];
          return group;
        }

        if (line.trim() === "" && i < lastNonEmpty) {
          return <br key={i} />;
        }

        if (line.trim() === "") return null;
        return renderLine(line, i);
      })}
    </div>
  );
});
