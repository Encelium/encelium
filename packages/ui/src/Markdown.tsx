import type { ReactNode } from "react";
import s from "./Message.module.css";

/**
 * The small part of Markdown that models write in chat: paragraphs, lists, **bold**,
 * *italic*, `code`, code blocks and headings. Builds React elements (never raw HTML),
 * so nothing in a reply can run as code. Every block picks its own text direction.
 */
export function Markdown({ text }: { text: string }) {
  return <>{blocks(text)}</>;
}

function blocks(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  let i = 0;
  const key = () => out.length;
  while (i < lines.length) {
    const line = lines[i]!;
    // Code block (an unfinished one, while the reply is still streaming, runs to the end).
    const fence = line.match(/^\s*```/);
    if (fence) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !/^\s*```/.test(lines[i]!)) code.push(lines[i++]!);
      i++;
      out.push(<pre key={key()} className={s.codeBlock} dir="ltr"><code>{code.join("\n")}</code></pre>);
      continue;
    }
    if (!line.trim()) { i++; continue; }
    // Headings become a bold line: chat replies don't need big titles.
    const heading = line.match(/^\s*#{1,6}\s+(.*)$/);
    if (heading) {
      out.push(<p key={key()} dir="auto"><strong>{inline(heading[1]!, isRtl(heading[1]!))}</strong></p>);
      i++;
      continue;
    }
    // Lists: "- ", "* ", "+ " or "1. " / "1) ".
    const listItem = /^\s*(?:[-*+•]|\d+[.)])\s+/;
    if (listItem.test(line)) {
      const ordered = /^\s*\d/.test(line);
      const items: string[] = [];
      while (i < lines.length && (listItem.test(lines[i]!) || (items.length && /^\s{2,}\S/.test(lines[i]!)))) {
        if (listItem.test(lines[i]!)) items.push(lines[i]!.replace(listItem, ""));
        else items[items.length - 1] += " " + lines[i]!.trim();
        i++;
      }
      const children = items.map((item, n) => <li key={n} dir="auto">{inline(item, isRtl(item))}</li>);
      out.push(ordered ? <ol key={key()}>{children}</ol> : <ul key={key()}>{children}</ul>);
      continue;
    }
    // Paragraph: lines until a blank line or another kind of block.
    const para: string[] = [];
    while (i < lines.length && lines[i]!.trim() && !/^\s*(```|#{1,6}\s)/.test(lines[i]!) && !listItem.test(lines[i]!)) para.push(lines[i++]!.trim());
    const rtl = isRtl(para.join(" "));
    out.push(<p key={key()} dir="auto">{para.flatMap((l, n) => (n ? [<br key={`b${n}`} />, ...inline(l, rtl)] : inline(l, rtl)))}</p>);
  }
  return out;
}

const RTL_CHAR = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/;
/** Does this text read right to left? (Its first letter is Arabic or Hebrew, like dir="auto" decides.) */
const isRtl = (text: string) => { const m = text.match(/[A-Za-z\u00C0-\u024F\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/); return !!m && RTL_CHAR.test(m[0]); };

/**
 * In a right-to-left paragraph, keep each run of English text (with its quotes, brackets and
 * inner spaces) together as one isolated piece, so neutral marks like quotes don't jump to the
 * wrong side. Sentence punctuation right after the run stays outside, in the Arabic flow.
 */
export function isolateLtr(text: string, key = "b"): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /[^\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]*[A-Za-z0-9][^\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]*/g;
  let last = 0, n = 0;
  for (const m of text.matchAll(re)) {
    const lead = m[0].match(/^[\s]*/)![0];
    const trail = m[0].match(/[\s.,،؛:!؟]*$/)![0];
    const core = m[0].slice(lead.length, m[0].length - trail.length);
    if (!core) continue;
    const start = m.index + lead.length;
    if (start > last) out.push(text.slice(last, start));
    out.push(<bdi key={`${key}${n++}`} dir="ltr">{core}</bdi>);
    last = start + core.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** Plain text (no Markdown) that may mix Arabic and English, e.g. the person's own message. */
export function BidiText({ text }: { text: string }) {
  return <>{isRtl(text) ? isolateLtr(text) : text}</>;
}

/** `code`, **bold**, *italic* / _italic_, and [text](link) shown as its text. */
function inline(text: string, rtl = false): ReactNode[] {
  const plain = (s: string, k: string) => (rtl ? isolateLtr(s, k) : [s]);
  const out: ReactNode[] = [];
  const re = /`([^`]+)`|\*\*(.+?)\*\*|__(.+?)__|(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?!\w)|(?<!\w)_(?!\s)(.+?)(?<!\s)_(?!\w)|\[([^\]]+)\]\([^)\s]+\)/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index > last) out.push(...plain(text.slice(last, m.index), `p${m.index}-`));
    const k = out.length;
    if (m[1] !== undefined) out.push(<code key={k}>{m[1]}</code>);
    else if (m[2] !== undefined || m[3] !== undefined) out.push(<strong key={k}>{inline(m[2] ?? m[3]!, rtl)}</strong>);
    else if (m[4] !== undefined || m[5] !== undefined) out.push(<em key={k}>{inline(m[4] ?? m[5]!, rtl)}</em>);
    else out.push(...plain(m[6]!, `l${m.index}-`));
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(...plain(text.slice(last), "end-"));
  return out;
}
