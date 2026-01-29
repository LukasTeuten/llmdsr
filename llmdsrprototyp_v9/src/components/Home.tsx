import React from "react";
import { START_TEXT } from "../data/questions.de";

export function Home(props: { onStart: () => void }) {
  return (
    <div className="card cardPad">
      <div className="h1">{START_TEXT.title}</div>
      {START_TEXT.body.map((p, i) => (
        <p className="p" key={i}>{p}</p>
      ))}
      <div className="hr" />
      <div className="center">
        <button className="btn btnPrimary" onClick={props.onStart}>
          Prozess starten
        </button>
        <div className="small" style={{ marginTop: 10 }}>
          Hinweis: Es geht um Funktionalität und Nachvollziehbarkeit, nicht um fertiges Produktdesign.
        </div>
      </div>
    </div>
  );
}
