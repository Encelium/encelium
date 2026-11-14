import { useEffect, useState } from "react";
import { Button, Dialog, Icon, TextField } from "@encelium/ui";
import { bridge, type ModelFailure, type ModelState, type ProviderOption } from "./bridge";
import type { Strings } from "./i18n";
import s from "./ModelDialog.module.css";

const CUSTOM = "custom";
const fmt = (text: string, vars: Record<string, string>) => text.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? "");

type Test = { state: "idle" } | { state: "testing" } | { state: "ok"; models: string[] } | { state: "failed"; reason: ModelFailure };

interface Props {
  t: Strings;
  open: boolean;
  onClose: () => void;
  onSaved: (message: string) => void;
}

/**
 * "Use your own model": pick where the model is, paste a key (if it needs one),
 * test, choose a model, save. Nothing else to understand.
 */
export function ModelDialog({ t, open, onClose, onSaved }: Props) {
  const m = t.model;
  const [presets, setPresets] = useState<ProviderOption[]>([]);
  const [current, setCurrent] = useState<ModelState>({ mode: "encelium" });
  const [presetId, setPresetId] = useState("");
  const [address, setAddress] = useState("");
  const [key, setKey] = useState("");
  const [test, setTest] = useState<Test>({ state: "idle" });
  const [model, setModel] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    Promise.all([bridge.models.presets(), bridge.models.get()]).then(([list, state]) => {
      setPresets(list);
      setCurrent(state);
      setPresetId(state.mode === "own" ? state.presetId : "");
      setAddress(state.mode === "own" && state.baseUrl ? state.baseUrl : "");
      setModel(state.mode === "own" ? state.model : "");
      setKey("");
      setTest({ state: "idle" });
      // Already set up: load the model list with the saved key, so switching
      // models doesn't mean pasting the key again.
      if (state.mode === "own") {
        setTest({ state: "testing" });
        bridge.models.test({ presetId: state.presetId, baseUrl: state.baseUrl ?? undefined }).then((result) => {
          setTest(result.ok
            ? { state: "ok", models: result.models.includes(state.model) ? result.models : [state.model, ...result.models] }
            : { state: "failed", reason: result.reason });
        });
      }
    });
  }, [open]);

  const preset = presets.find((p) => p.id === presetId);
  const isCustom = presetId === CUSTOM;
  const providerName = isCustom ? address || m.other : preset?.name ?? "";
  const keySaved = current.mode === "own" && current.presetId === presetId && current.hasKey;
  const needsKey = !!preset?.needsKey;
  // Custom servers may or may not need a key, so the field is shown but optional.
  const showKey = needsKey || isCustom;

  // Any change to where/key invalidates the last test.
  const choose = (id: string) => { setPresetId(id); setTest({ state: "idle" }); setModel(""); setKey(""); };

  const runTest = async () => {
    setTest({ state: "testing" });
    const result = await bridge.models.test({ presetId, baseUrl: isCustom ? address : undefined, apiKey: key || undefined });
    if (result.ok) {
      setTest({ state: "ok", models: result.models });
      if (!result.models.includes(model)) setModel(result.models[0] ?? "");
    } else {
      setTest({ state: "failed", reason: result.reason });
    }
  };

  const errorText = (reason: ModelFailure) => {
    const k = reason === "no-network" && (preset?.local || isCustom) ? "no-network-local" : reason;
    return fmt(m.errors[k], { provider: providerName });
  };

  const save = async () => {
    setSaving(true);
    const result = await bridge.models.save({ presetId, baseUrl: isCustom ? address : undefined, apiKey: key || undefined, model });
    setSaving(false);
    if (result.ok) { onSaved(fmt(m.saved, { model })); onClose(); }
    else setTest({ state: "failed", reason: result.reason });
  };

  const backToEncelium = async () => {
    const result = await bridge.models.reset();
    if (!result.ok) { setTest({ state: "failed", reason: result.reason }); return; }
    onSaved(fmt(m.saved, { model: t.appName }));
    onClose();
  };

  const canTest = !!presetId && (!isCustom || address.trim().length > 0) && (!needsKey || key.length > 0 || keySaved) && test.state !== "testing";
  const canSave = test.state === "ok" && !!model && !saving;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={m.title}
      size="lg"
      actions={
        <div className={s.actions}>
          {current.mode === "own" && <Button variant="ghost" onClick={backToEncelium}>{m.useEncelium}</Button>}
          <span className={s.spacer} />
          <Button variant="secondary" onClick={onClose}>{m.cancel}</Button>
          <Button variant="primary" onClick={save} disabled={!canSave}>{saving ? m.checking : m.save}</Button>
        </div>
      }
    >
      <div className={s.body}>
        <p className={s.intro}>{m.intro}</p>

        <fieldset className={s.fieldset}>
          <legend className={s.legend}>{m.provider}</legend>
          <div className={s.providers}>
            {[...presets, { id: CUSTOM, name: m.other, needsKey: false, keyUrl: null, local: false }].map((p) => (
              <label key={p.id} className={[s.provider, presetId === p.id ? s.selected : ""].filter(Boolean).join(" ")}>
                <input type="radio" name="provider" value={p.id} checked={presetId === p.id} onChange={() => choose(p.id)} className={s.radio} />
                <span>{p.name}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {isCustom && (
          <TextField label={m.address} hint={m.addressHint} value={address} dir="ltr" spellCheck={false}
            onChange={(e) => { setAddress(e.target.value); setTest({ state: "idle" }); }} />
        )}

        {showKey && (
          <div className={s.keyBlock}>
            <TextField label={isCustom ? m.keyOptional : m.key} hint={keySaved ? m.keySaved : isCustom ? m.keyOptionalHint : m.keyHint} type="password" value={key} dir="ltr" autoComplete="off" spellCheck={false}
              onChange={(e) => { setKey(e.target.value.trim()); setTest({ state: "idle" }); }} />
            {preset?.keyUrl && (
              <a className={s.getKey} href={preset.keyUrl} target="_blank" rel="noreferrer">{m.getKey}</a>
            )}
          </div>
        )}

        {preset?.local && <p className={s.note}><Icon name="info" size={16} />{fmt(m.localNote, { provider: preset.name })}</p>}

        {presetId && (
          <div className={s.testRow}>
            <Button variant="secondary" onClick={runTest} disabled={!canTest}>{test.state === "testing" ? m.testing : m.test}</Button>
            <p className={s.result} role="status" aria-live="polite">
              {test.state === "ok" && <span className={s.ok}><Icon name="check" size={16} />{m.connected}</span>}
              {test.state === "failed" && <span className={s.fail}><Icon name="alert" size={16} />{errorText(test.reason)}</span>}
            </p>
          </div>
        )}

        {test.state === "ok" && (
          <label className={s.selectField}>
            <span className={s.legend}>{m.chooseModel}</span>
            <select className={s.select} value={model} onChange={(e) => setModel(e.target.value)} dir="ltr">
              {test.models.map((id) => <option key={id} value={id}>{id}</option>)}
            </select>
          </label>
        )}
      </div>
    </Dialog>
  );
}
