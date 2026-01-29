import React from "react";

export function Layout(props: { children: React.ReactNode; rightPill?: string }) {
  return (
    <div className="container">
      <div className="header">
        <div className="brand">LLM Canvas – Prototyp</div>
        <div className="pill">{props.rightPill ?? "Proxy-Daten • Fokus: Funktion"}</div>
      </div>
      {props.children}
    </div>
  );
}
