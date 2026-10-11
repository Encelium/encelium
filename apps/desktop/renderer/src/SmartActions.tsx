import type { Attachment } from "./bridge";
import type { Strings } from "./i18n";
import s from "./SmartActions.module.css";

type Kind = "image" | "sheet" | "doc" | "code" | "other";

function kindOf(name: string, kind: Attachment["kind"]): Kind {
  if (kind === "image") return "image";
  if (/\.(xlsx?|csv|tsv|ods)$/i.test(name)) return "sheet";
  if (/\.(pdf|docx?|odt|rtf|txt|md)$/i.test(name)) return "doc";
  if (/\.(html?|css|jsx?|tsx?|py|ps1|bat|json|java|cs|cpp|c|php|rb|go)$/i.test(name)) return "code";
  return "other";
}

/**
 * Attached a file but haven't typed yet? A few ready requests for that kind of file.
 * Clicking one fills the message box (nothing is sent until the person sends it).
 */
export function SmartActions({ t, files, onPick }: { t: Strings; files: Attachment[]; onPick: (text: string) => void }) {
  if (!files.length) return null;
  const kinds = new Set(files.map((f) => kindOf(f.name, f.kind)));
  const kind: Kind = kinds.size === 1 ? [...kinds][0]! : "other";
  const actions = t.smart[kind];
  return (
    <div className={s.row}>
      {actions.map((a) => (
        <button key={a} type="button" className={s.chip} dir="auto" onClick={() => onPick(a)}>{a}</button>
      ))}
    </div>
  );
}
