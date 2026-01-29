import React, { useEffect, useState } from "react";
import "./styles.css";
import type { ModelOption } from "./types/models";
import { Layout } from "./components/Layout";
import { Home } from "./components/Home";
import { Wizard } from "./components/Wizard";

type View = "home" | "wizard";

export default function App() {
  const [view, setView] = useState<View>("home");
  const [models, setModels] = useState<ModelOption[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/models.json", { cache: "no-store" });
        if (!res.ok) throw new Error(`models.json konnte nicht geladen werden (${res.status}).`);
        const data = await res.json();
        // models.json is expected to be an array
        setModels(data as ModelOption[]);
      } catch (e: any) {
        setErr(e?.message ?? String(e));
      }
    })();
  }, []);

  return (
    <Layout rightPill="Proxy-Daten • Fokus: Funktion">
      {err ? (
        <div className="card cardPad">
          <div className="h1">Fehler beim Laden</div>
          <p className="p">{err}</p>
          <p className="small">Prüfe, ob <code>public/models.json</code> vorhanden ist.</p>
        </div>
      ) : models === null ? (
        <div className="card cardPad">
          <div className="h1">Lade Daten…</div>
          <p className="p">models.json wird geladen.</p>
        </div>
      ) : view === "home" ? (
        <Home onStart={() => setView("wizard")} />
      ) : (
        <Wizard models={models} onExitToHome={() => setView("home")} />
      )}
    </Layout>
  );
}
