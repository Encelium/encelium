import { useState } from "react";
import { Button, Dialog, Icon, TextField } from "@encelium/ui";
import { bridge } from "./bridge";
import type { Strings } from "./i18n";

/** Sign in (Google, or a code by email) to move to the higher free tier. */
export function SignInDialog({ t, open, onClose, onDone }: { t: Strings; open: boolean; onClose: () => void; onDone: (message: string) => void }) {
  const s = t.signin;
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [step, setStep] = useState<"pick" | "code">("pick");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (fn: () => Promise<{ ok: boolean; reason?: string; devCode?: string }>, okNext?: () => void) => {
    setBusy(true); setError(null);
    const result = await fn();
    setBusy(false);
    if (result.ok) { okNext?.(); return; }
    setError((s.errors as Record<string, string>)[result.reason ?? "other"] ?? s.errors.other);
  };

  const google = () => run(() => bridge.access!.signin({ method: "google" }), () => { onDone(s.connected); onClose(); });

  const sendCode = () => run(async () => {
    const r = await bridge.access!.signin({ method: "email-start", email });
    if (r.ok && r.devCode) setDevCode(r.devCode); // the local simulator returns it; real servers won't
    return r;
  }, () => setStep("code"));

  const verify = () => run(() => bridge.access!.signin({ method: "email-verify", email, code }), () => { onDone(s.connected); onClose(); });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={s.title}
      actions={
        <>
          <Button variant="secondary" onClick={onClose}>{t.cancel}</Button>
          {step === "code"
            ? <Button variant="primary" onClick={verify} disabled={busy || !code.trim()}>{busy ? s.busy : s.verify}</Button>
            : <Button variant="primary" onClick={google} disabled={busy}>{busy ? s.busy : s.google}</Button>}
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", maxWidth: 420 }}>
        <p className="app-dialog-text">{s.intro}</p>

        <Button variant="primary" onClick={google} disabled={busy}>{s.google}</Button>
        <p className="app-dialog-text" style={{ textAlign: "center" }}>{s.or}</p>

        {step === "pick" ? (
          <>
            <TextField label={s.email} type="email" dir="ltr" value={email} spellCheck={false} onChange={(e) => setEmail(e.target.value.trim())} />
            <Button variant="secondary" onClick={sendCode} disabled={busy || !email.includes("@")}>{s.send}</Button>
          </>
        ) : (
          <>
            <p className="app-dialog-text">{devCode ? s.codeDev.replace("{code}", devCode) : s.codeSent}</p>
            <TextField label={s.code} value={code} dir="ltr" spellCheck={false} autoFocus onChange={(e) => setCode(e.target.value.trim())} />
            <Button variant="secondary" onClick={() => setStep("pick")}>{s.back}</Button>
          </>
        )}

        {error && <p role="alert" style={{ margin: 0, color: "var(--color-risky-text)", fontSize: "var(--text-sm)" }}>{error}</p>}
      </div>
    </Dialog>
  );
}
