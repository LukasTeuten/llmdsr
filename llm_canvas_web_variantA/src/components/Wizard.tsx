import React, { useMemo, useState } from "react";
import type { Answers, ModelOption } from "../types/models";
import { STEP_COPY, type StepKey } from "../data/questions.de";
import { PERF_DIMS } from "../logic/decisionEngine";
import { QuestionShell } from "./QuestionShell";
import { Results } from "./Results";
import { evaluate } from "../logic/decisionEngine";

function defaultAnswers(): Answers {
  const perf: Record<string, number> = {};
  for (const d of PERF_DIMS) perf[d] = 3;
  return {
    exclude_developers: [],
    exclude_countries: [],
    hosting_responsibility: null,
    required_access_modes: [],
    personal_data_input: null,
    eea_required: null,
    require_output_ip: null,
    allow_training_on_inputs: null,
    payment_plan_preference: null,
    pricing_segments: [],
    cost_importance: 3,
    perf_likert: perf,
  };
}

export function Wizard(props: { models: ModelOption[]; onExitToHome: () => void }) {
  const [answers, setAnswers] = useState<Answers>(defaultAnswers());
  const visibleSteps = useMemo(() => {
    const base: StepKey[] = ["trust","hosting","access","personal","eea","output_ip","training","payment","pricing_segments","cost_importance","performance","results"];
    return base.filter(k => {
      const sc = STEP_COPY.find(s => s.key === k);
      return sc?.visible ? sc.visible(answers) : true;
    });
  }, [answers]);

  const [idx, setIdx] = useState(0);

  const stepKey = visibleSteps[Math.min(idx, visibleSteps.length - 1)];
  const stepIndexHuman = visibleSteps.indexOf(stepKey) + 1;
  const stepLabel = `Frage ${stepIndexHuman} von ${visibleSteps.length - 1}`; // minus results
  const copy = STEP_COPY.find(s => s.key === stepKey);

  const goPrev = () => setIdx(v => Math.max(0, v - 1));
  const goNext = () => setIdx(v => Math.min(visibleSteps.length - 1, v + 1));

  const restart = () => {
    setAnswers(defaultAnswers());
    setIdx(0);
  };

  const developers = useMemo(() => {
    const s = new Set(props.models.map(m => m.developer_name).filter(Boolean));
    return [...s].sort((a,b) => a.localeCompare(b,"de"));
  }, [props.models]);

  const countries = useMemo(() => {
    const s = new Set(props.models.map(m => m.country_of_origin).filter(Boolean));
    return [...s].sort((a,b) => a.localeCompare(b,"de"));
  }, [props.models]);

  if (stepKey === "results") {
    const out = evaluate(props.models, answers);
    return <Results out={out} onRestart={restart} />;
  }

  if (!copy) {
    return (
      <div className="card cardPad">
        <div className="h1">Fehler</div>
        <p className="p">Der Fragebogen konnte nicht geladen werden.</p>
        <button className="btn btnPrimary" onClick={props.onExitToHome}>Zur Startseite</button>
      </div>
    );
  }

  return (
    <QuestionShell
      title={copy.title + (copy.isOptional ? " (optional)" : "")}
      stepLabel={stepLabel}
      meaning={copy.meaning}
      why={copy.why}
      note={copy.note}
      onPrev={idx === 0 ? props.onExitToHome : goPrev}
      prevLabel={idx === 0 ? "Startseite" : "Zurück"}
      onNext={goNext}
      nextLabel="Weiter"
      canNext={true}
    >
      {renderStep(stepKey, answers, setAnswers, developers, countries)}
    </QuestionShell>
  );
}

function renderStep(
  stepKey: StepKey,
  answers: Answers,
  setAnswers: React.Dispatch<React.SetStateAction<Answers>>,
  developers: string[],
  countries: string[]
) {
  switch(stepKey) {
    case "trust":
      return <TrustStep answers={answers} setAnswers={setAnswers} developers={developers} countries={countries} />;
    case "hosting":
      return <HostingStep answers={answers} setAnswers={setAnswers} />;
    case "access":
      return <AccessStep answers={answers} setAnswers={setAnswers} />;
    case "personal":
      return <YesNoStep
        answers={answers}
        setAnswers={setAnswers}
        value={answers.personal_data_input}
        onChange={(v) => setAnswers(a => ({ ...a, personal_data_input: v, eea_required: (v === false ? a.eea_required : null) }))}
      />;
    case "eea":
      return <YesNoStep
        answers={answers}
        setAnswers={setAnswers}
        value={answers.eea_required}
        onChange={(v) => setAnswers(a => ({ ...a, eea_required: v }))}
      />;
    case "output_ip":
      return <YesNoStep
        answers={answers}
        setAnswers={setAnswers}
        value={answers.require_output_ip}
        onChange={(v) => setAnswers(a => ({ ...a, require_output_ip: v }))}
      />;
    case "training":
      return <YesNoStep
        answers={answers}
        setAnswers={setAnswers}
        value={answers.allow_training_on_inputs}
        onChange={(v) => setAnswers(a => ({ ...a, allow_training_on_inputs: v }))}
      />;
    case "payment":
      return <PaymentStep answers={answers} setAnswers={setAnswers} />;
    case "pricing_segments":
      return <PricingSegmentsStep answers={answers} setAnswers={setAnswers} />;
    case "cost_importance":
      return <CostImportanceStep answers={answers} setAnswers={setAnswers} />;
    case "performance":
      return <PerformanceStep answers={answers} setAnswers={setAnswers} />;
    default:
      return null;
  }
}

function TrustStep(props: {
  answers: Answers;
  setAnswers: React.Dispatch<React.SetStateAction<Answers>>;
  developers: string[];
  countries: string[];
}) {
  const [qDev, setQDev] = useState("");
  const [qC, setQC] = useState("");

  const devFiltered = useMemo(() => props.developers.filter(d => d.toLowerCase().includes(qDev.toLowerCase())), [props.developers, qDev]);
  const cFiltered = useMemo(() => props.countries.filter(c => c.toLowerCase().includes(qC.toLowerCase())), [props.countries, qC]);

  const toggleDev = (d: string) => {
    props.setAnswers(a => {
      const s = new Set(a.exclude_developers);
      if (s.has(d)) s.delete(d); else s.add(d);
      return { ...a, exclude_developers: [...s].sort() };
    });
  };
  const toggleCountry = (c: string) => {
    props.setAnswers(a => {
      const s = new Set(a.exclude_countries);
      if (s.has(c)) s.delete(c); else s.add(c);
      return { ...a, exclude_countries: [...s].sort() };
    });
  };

  return (
    <div className="grid2">
      <div className="fieldset">
        <div className="legend">Entwickler ausschließen</div>
        <div style={{ marginTop: 8 }}>
          <input type="search" placeholder="Suche…" value={qDev} onChange={(e) => setQDev(e.target.value)} />
          <div style={{ height: 10 }} />
          <div style={{ maxHeight: 260, overflow: "auto" }}>
            {devFiltered.map(d => (
              <label className="checkRow" key={d}>
                <input type="checkbox" checked={props.answers.exclude_developers.includes(d)} onChange={() => toggleDev(d)} />
                <div>
                  <div>{d}</div>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="fieldset">
        <div className="legend">Länder ausschließen</div>
        <div style={{ marginTop: 8 }}>
          <input type="search" placeholder="Suche…" value={qC} onChange={(e) => setQC(e.target.value)} />
          <div style={{ height: 10 }} />
          <div style={{ maxHeight: 260, overflow: "auto" }}>
            {cFiltered.map(c => (
              <label className="checkRow" key={c}>
                <input type="checkbox" checked={props.answers.exclude_countries.includes(c)} onChange={() => toggleCountry(c)} />
                <div>{c}</div>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function HostingStep(props: { answers: Answers; setAnswers: React.Dispatch<React.SetStateAction<Answers>> }) {
  const v = props.answers.hosting_responsibility;
  const set = (nv: any) => props.setAnswers(a => ({ ...a, hosting_responsibility: nv }));
  return (
    <div className="fieldset">
      <label className="checkRow">
        <input type="radio" name="hosting" checked={v === "provider-managed"} onChange={() => set("provider-managed")} />
        <div>
          <div><strong>Anbieter-betrieben</strong></div>
          <div className="small">Schneller Start, weniger IT-Aufwand, aber weniger Kontrolle über Umgebung und Datenpfad.</div>
        </div>
      </label>
      <label className="checkRow">
        <input type="radio" name="hosting" checked={v === "self-managed"} onChange={() => set("self-managed")} />
        <div>
          <div><strong>Selbst betrieben</strong></div>
          <div className="small">Mehr Kontrolle, aber eigener Betrieb (Infrastruktur/Know-how) ist nötig.</div>
        </div>
      </label>
      <label className="checkRow">
        <input type="radio" name="hosting" checked={v === "either"} onChange={() => set("either")} />
        <div>
          <div><strong>Beides ist möglich</strong></div>
          <div className="small">Beide Wege bleiben offen.</div>
        </div>
      </label>
      <div style={{ marginTop: 10 }}>
        <button className="btn btnGhost" onClick={() => set(null)}>Auswahl zurücksetzen</button>
      </div>
    </div>
  );
}

function AccessStep(props: { answers: Answers; setAnswers: React.Dispatch<React.SetStateAction<Answers>> }) {
  const has = (x: "API"|"Chat") => props.answers.required_access_modes.includes(x);
  const toggle = (x: "API"|"Chat") => {
    props.setAnswers(a => {
      const s = new Set(a.required_access_modes);
      if (s.has(x)) s.delete(x); else s.add(x);
      return { ...a, required_access_modes: [...s] as any };
    });
  };
  return (
    <div className="fieldset">
      <label className="checkRow">
        <input type="checkbox" checked={has("API")} onChange={() => toggle("API")} />
        <div>
          <div><strong>Schnittstelle (API)</strong></div>
          <div className="small">Erforderlich, wenn das Modell in eigene Systeme integriert werden soll.</div>
        </div>
      </label>
      <label className="checkRow">
        <input type="checkbox" checked={has("Chat")} onChange={() => toggle("Chat")} />
        <div>
          <div><strong>Chat-Oberfläche</strong></div>
          <div className="small">Fertige Oberfläche, die direkt genutzt werden kann.</div>
        </div>
      </label>
      <div className="small" style={{ marginTop: 8 }}>
        Wenn Sie nichts auswählen, wird Zugriffsart nicht als Filter verwendet.
      </div>
    </div>
  );
}

function YesNoStep(props: {
  answers: Answers;
  setAnswers: React.Dispatch<React.SetStateAction<Answers>>;
  value: boolean | null;
  onChange: (v: boolean | null) => void;
}) {
  return (
    <div className="fieldset">
      <label className="checkRow">
        <input type="radio" name="yesno" checked={props.value === true} onChange={() => props.onChange(true)} />
        <div><strong>Ja</strong></div>
      </label>
      <label className="checkRow">
        <input type="radio" name="yesno" checked={props.value === false} onChange={() => props.onChange(false)} />
        <div><strong>Nein</strong></div>
      </label>
      <div style={{ marginTop: 10 }}>
        <button className="btn btnGhost" onClick={() => props.onChange(null)}>Auswahl zurücksetzen</button>
      </div>
    </div>
  );
}

function PaymentStep(props: { answers: Answers; setAnswers: React.Dispatch<React.SetStateAction<Answers>> }) {
  const v = props.answers.payment_plan_preference;
  const set = (nv: any) => props.setAnswers(a => ({ ...a, payment_plan_preference: nv }));
  return (
    <div className="fieldset">
      <label className="checkRow">
        <input type="radio" name="pay" checked={v === null} onChange={() => set(null)} />
        <div><strong>Keine Präferenz</strong></div>
      </label>
      <label className="checkRow">
        <input type="radio" name="pay" checked={v === "usage-based"} onChange={() => set("usage-based")} />
        <div>
          <div><strong>Nutzungsbasiert</strong></div>
          <div className="small">Abrechnung nach Verbrauch (z.B. Token).</div>
        </div>
      </label>
      <label className="checkRow">
        <input type="radio" name="pay" checked={v === "subscription"} onChange={() => set("subscription")} />
        <div>
          <div><strong>Abo</strong></div>
          <div className="small">Pauschale pro Zeitraum (z.B. monatlich).</div>
        </div>
      </label>
    </div>
  );
}

function PricingSegmentsStep(props: { answers: Answers; setAnswers: React.Dispatch<React.SetStateAction<Answers>> }) {
  const map = [
    { key: "low" as const, label: "Unteres Drittel (günstiger)" },
    { key: "mid" as const, label: "Mittleres Drittel" },
    { key: "premium" as const, label: "Oberes Drittel (teurer)" },
  ];
  const has = (k: any) => props.answers.pricing_segments.includes(k);
  const toggle = (k: any) => {
    props.setAnswers(a => {
      const s = new Set(a.pricing_segments);
      if (s.has(k)) s.delete(k); else s.add(k);
      return { ...a, pricing_segments: [...s] as any };
    });
  };
  return (
    <div className="fieldset">
      {map.map(x => (
        <label className="checkRow" key={x.key}>
          <input type="checkbox" checked={has(x.key)} onChange={() => toggle(x.key)} />
          <div><strong>{x.label}</strong></div>
        </label>
      ))}
      <div className="small" style={{ marginTop: 8 }}>
        Hinweis: Die Drittel werden innerhalb der aktuell verbleibenden Optionen anhand der Tokenkosten gebildet (Proxy-Daten).
      </div>
    </div>
  );
}

function CostImportanceStep(props: { answers: Answers; setAnswers: React.Dispatch<React.SetStateAction<Answers>> }) {
  const v = props.answers.cost_importance;
  return (
    <div className="fieldset">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div className="small">Unwichtig</div>
        <div className="small">Sehr wichtig</div>
      </div>
      <input
        style={{ width: "100%" }}
        type="range"
        min={1}
        max={5}
        step={1}
        value={v}
        onChange={(e) => props.setAnswers(a => ({ ...a, cost_importance: Number(e.target.value) }))}
      />
      <div className="small">Aktuell: {v}</div>
    </div>
  );
}

function PerformanceStep(props: { answers: Answers; setAnswers: React.Dispatch<React.SetStateAction<Answers>> }) {
  const setDim = (d: string, val: number) => {
    props.setAnswers(a => ({ ...a, perf_likert: { ...a.perf_likert, [d]: val } }));
  };
  return (
    <div className="fieldset">
      {PERF_DIMS.map(d => (
        <div key={d} style={{ marginBottom: 14 }}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>{toDeDim(d)}</div>
          <input
            style={{ width: "100%" }}
            type="range"
            min={1}
            max={5}
            step={1}
            value={props.answers.perf_likert[d] ?? 3}
            onChange={(e) => setDim(d, Number(e.target.value))}
          />
          <div className="small">Aktuell: {props.answers.perf_likert[d] ?? 3}</div>
        </div>
      ))}
      <div className="small">
        Werte 1 werden ignoriert. Proxy-Daten können pro Modell unvollständig sein (dann „n/a“).
      </div>
    </div>
  );
}

function toDeDim(d: string): string {
  const map: Record<string, string> = {
    "Intelligence": "Allgemeine Leistungsfähigkeit",
    "Speed": "Geschwindigkeit",
    "Coding quality": "Code-Qualität",
    "Task adherence": "Folgt Anweisungen",
    "Factual reliability": "Zuverlässigkeit (Fakten)",
  };
  return map[d] ?? d;
}
