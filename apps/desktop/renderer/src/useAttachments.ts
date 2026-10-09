import { useState } from "react";
import type { ComposerAttachment } from "@enceladus/ui";
import { bridge, type Attachment } from "./bridge";
import type { Strings } from "./i18n";

const MAX_FILES = 10;
const MAX_SIZE = 50 * 1024 * 1024;

/** Files waiting to be sent with the next message, from the paperclip or drag-and-drop. */
export function useAttachments(t: Strings, onNotice: (message: string) => void) {
  const [files, setFiles] = useState<Attachment[]>([]);

  const add = (incoming: Attachment[]) => {
    const tooBig = incoming.filter((f) => f.size > MAX_SIZE);
    if (tooBig.length) onNotice(t.attachTooBig.replace("{name}", tooBig[0]!.name));
    setFiles((prev) => {
      const next = [...prev];
      for (const f of incoming) if (f.size <= MAX_SIZE && !next.some((x) => x.path === f.path)) next.push(f);
      if (next.length > MAX_FILES) onNotice(t.attachTooMany);
      return next.slice(0, MAX_FILES);
    });
  };

  return {
    files,
    /** For the Composer's chips. */
    chips: files.map<ComposerAttachment>((f) => ({ id: f.path, name: f.name, kind: f.kind })),
    available: !!bridge.attachments,
    choose: async () => { if (bridge.attachments) add(await bridge.attachments.choose()); },
    drop: async (list: FileList) => { if (bridge.attachments) add(await bridge.attachments.describeDropped(list)); },
    remove: (id: string) => setFiles((prev) => prev.filter((f) => f.path !== id)),
    clear: () => setFiles([]),
  };
}
