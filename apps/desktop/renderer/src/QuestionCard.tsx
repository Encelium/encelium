import { useState } from "react";
import { Icon } from "@enceladus/ui";
import type { Strings } from "./i18n";
import s from "./QuestionCard.module.css";

/**
 * The agent's question, with clickable answers (recommended first) and "Other…" for the
 * person's own words. Once answered, it shows the answer and can't be changed.
 */
export function QuestionCard({ t, question, options, answer, disabled, onAnswer }: {
  t: Strings;
  question: string;
  options: string[];
  answer?: string;
  disabled?: boolean;
  onAnswer: (text: string) => void;
}) {
  const [other, setOther] = useState(false);
  const [text, setText] = useState("");

  return (
    <section className={s.card} aria-label={question}>
      <div className={s.head}>
        <span className={s.icon} aria-hidden="true"><Icon name="info" size={16} /></span>
        <h3 className={s.question} dir="auto">{question}</h3>
      </div>
      {answer !== undefined ? (
        <p className={s.answered}><Icon name="check" size={14} /><span dir="auto">{answer}</span></p>
      ) : (
        <>
          <div className={s.options}>
            {options.map((o, i) => (
              <button key={o} type="button" className={[s.option, i === 0 ? s.recommended : ""].filter(Boolean).join(" ")} disabled={disabled} onClick={() => onAnswer(o)} dir="auto">
                {o}
                {i === 0 && options.length > 1 && <span className={s.tag}>{t.question.recommended}</span>}
              </button>
            ))}
            {!other && (
              <button type="button" className={s.option} disabled={disabled} onClick={() => setOther(true)}>{t.question.other}</button>
            )}
          </div>
          {other && (
            <form className={s.otherRow} onSubmit={(e) => { e.preventDefault(); if (text.trim()) onAnswer(text.trim()); }}>
              <input className={s.input} value={text} autoFocus dir="auto" placeholder={t.question.placeholder} onChange={(e) => setText(e.target.value)} />
              <button type="submit" className={s.send} disabled={!text.trim() || disabled}>{t.question.send}</button>
            </form>
          )}
        </>
      )}
    </section>
  );
}
