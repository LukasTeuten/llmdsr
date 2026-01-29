import React from "react";

export function QuestionShell(props: {
  title: string;
  stepLabel: string;
  meaning: string;
  why: string;
  note?: string;
  children: React.ReactNode;
  onPrev?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  prevLabel?: string;
  canNext?: boolean;
}) {
  return (
    <div className="card cardPad">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
        <div>
          <div className="pill">{props.stepLabel}</div>
        </div>
      </div>

      <div style={{ marginTop: 10 }}>
        <div className="h1" style={{ fontSize: 22 }}>{props.title}</div>

        <div className="grid2" style={{ marginTop: 10 }}>
          <div className="fieldset">
            <div className="legend">Worum geht’s?</div>
            <div className="p" style={{ marginTop: 8 }}>{props.meaning}</div>
          </div>
          <div className="fieldset">
            <div className="legend">Warum fragen wir das?</div>
            <div className="p" style={{ marginTop: 8 }}>{props.why}</div>
            {props.note ? <div className="small" style={{ marginTop: 8 }}>{props.note}</div> : null}
          </div>
        </div>

        <div className="hr" />
        {props.children}

        <div className="hr" />
        <div className="row" style={{ justifyContent: "space-between" }}>
          <button className="btn btnGhost" onClick={props.onPrev} disabled={!props.onPrev}>
            {props.prevLabel ?? "Zurück"}
          </button>
          <button className="btn btnPrimary" onClick={props.onNext} disabled={props.canNext === false}>
            {props.nextLabel ?? "Weiter"}
          </button>
        </div>
      </div>
    </div>
  );
}
