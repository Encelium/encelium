import { useEffect, useState } from "react";
import type { ComposerAttachment } from "@enceladus/ui";
import { bridge, type Attachment } from "./bridge";
import type { Strings } from "./i18n";

const MAX_FILES = 10;
const MAX_SIZE = 50 * 1024 * 1024;

/** Files waiting to be sent with the next message, from the paperclip or drag-and-drop. */
export function useAttachments(t: Strings, onNotice: (message: string) => void) {
  const [files, setFiles] = useState<Attachment[]>([]);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});

  // Pictures get a small preview as soon as they're added.
  useEffect(() => {
    const api = bridge.attachments;
    if (!api) return;
    for (const f of files) {
      if (f.kind !== "image" || f.path in thumbs) continue;
      setThumbs((prev) => ({ ...prev, [f.path]: "" })); // asked for; don't ask again
      api.thumbnail({ path: f.path }).then((url) => { if (url) setThumbs((prev) => ({ ...prev, [f.path]: url })); });
    }
  }, [files, thumbs]);

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
    chips: files.map<ComposerAttachment>((f) => ({ id: f.path, name: f.name, kind: f.kind, thumbnail: thumbs[f.path] || undefined })),
    available: !!bridge.attachments,
    choose: async () => { if (bridge.attachments) add(await bridge.attachments.choose()); },
    drop: async (list: FileList) => { if (bridge.attachments) add(await bridge.attachments.describeDropped(list)); },
    /** Screenshots pasted with Ctrl+V: saved as files first (they have no path of their own). */
    paste: async (images: File[]) => {
      const api = bridge.attachments;
      if (!api) return;
      const saved = await Promise.all(images.map(async (image) => {
        const bytes = new Uint8Array(await image.arrayBuffer());
        let binary = "";
        for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
        return api.savePasted({ data: btoa(binary), type: image.type });
      }));
      add(saved.filter((f): f is Attachment => !!f));
    },
    remove: (id: string) => setFiles((prev) => prev.filter((f) => f.path !== id)),
    clear: () => setFiles([]),
  };
}
