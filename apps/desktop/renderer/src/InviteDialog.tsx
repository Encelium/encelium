import { useEffect, useState } from "react";
import { Button, Dialog, TextField } from "@enceladus/ui";
import { bridge, type ModelFailure } from "./bridge";
import type { Strings } from "./i18n";

/** Connect to the Enceladus model: the invite code (and, until it's built in, the server address). */
export function InviteDialog({ t, open, onClose, onDone }: { t: Strings; open: boolean; onClose: () => void; onDone: (message: string) => void }) {
  const a = t.access;
  const [address, setAddress] = useState("");
  const [builtIn, setBuiltIn] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ModelFailure | null>(null);

  useEffect(() => {
    if (!open || !bridge.access) return;
    setCode(""); setError(null);
    bridge.access.get().then((s) => { setAddress(s.gatewayUrl); setBuiltIn(s.builtInAddress); });
  }, [open]);

  const connect = async () => {
    if (!bridge.access) return;
    setBusy(true); setError(null);
    const result = await bridge.access.connect({ gatewayUrl: address, code });
    setBusy(false);
    if (result.ok) { onDone(a.connected); onClose(); }
    else setError(result.reason);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={a.title}
      actions={
        <>
          <Button variant="secondary" onClick={onClose}>{t.deleteCancel}</Button>
          <Button variant="primary" onClick={connect} disabled={busy || !code.trim() || (!builtIn && !address.trim())}>{busy ? a.checking : a.connect}</Button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <p className="app-dialog-text">{a.intro}</p>
        <TextField label={a.code} type="password" value={code} dir="ltr" autoComplete="off" spellCheck={false} autoFocus onChange={(e) => setCode(e.target.value.trim())} />
        {!builtIn && (
          <TextField label={a.address} hint={a.addressHint} value={address} dir="ltr" spellCheck={false} placeholder="https://…/v1" onChange={(e) => setAddress(e.target.value)} />
        )}
        {error && <p role="alert" style={{ margin: 0, color: "var(--color-risky-text)", fontSize: "var(--text-sm)" }}>{a.errors[error as keyof typeof a.errors] ?? a.errors.other}</p>}
      </div>
    </Dialog>
  );
}
