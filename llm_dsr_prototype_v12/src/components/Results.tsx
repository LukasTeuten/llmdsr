import React, { useMemo, useState } from "react";
import type { EvaluationOutput } from "../types/models";
import { PERF_DIMS } from "../logic/decisionEngine";

type SortKey = string;

export function Results(props: {
  out: EvaluationOutput;
  onRestart: () => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("final_score");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [showDetails, setShowDetails] = useState(false);
  const [sortDesc, setSortDesc] = useState(true);

  const rows = useMemo(() => {
    const arr = [...props.out.results];
    arr.sort((a, b) => {
      const dir = sortDesc ? -1 : 1;
      const get = (r: any) => {
  if (typeof sortKey === "string" && sortKey.startsWith("perf:")) {
    const dim = sortKey.slice("perf:".length);
    return r?.perf_values?.[dim] ?? null;
  }
  return r[sortKey];
};
      const va = get(a);
      const vb = get(b);
      if (va === vb) return 0;
      // numeric?
      const na = typeof va === "number" ? va : Number.NaN;
      const nb = typeof vb === "number" ? vb : Number.NaN;
      if (!Number.isNaN(na) && !Number.isNaN(nb)) return dir * (na - nb);
      return dir * String(va ?? "").localeCompare(String(vb ?? ""), "de");
    });
    return arr;
  }, [props.out.results, sortKey, sortDesc]);

  React.useEffect(() => { setPage(1); }, [props.out.results, sortKey, sortDesc]);

const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
const safePage = Math.max(1, Math.min(totalPages, page));
const startIdx = (safePage - 1) * pageSize;
const pagedRows = rows.slice(startIdx, startIdx + pageSize);

const onSort = (k: SortKey) => {
    if (k === sortKey) setSortDesc(!sortDesc);
    else { setSortKey(k); setSortDesc(true); }
  };

  if (!props.out.results.length) {
    return (
      <div className="card cardPad wideCard">
        <div className="h1">Keine Ergebnisse</div>
        <p className="p">Nach den Ausschlussregeln bleiben keine Optionen übrig.</p>
        <div className="hr" />
        <button className="btn btnPrimary" onClick={props.onRestart}>Neu starten</button>
      </div>
    );
  }

  return (
    <div className="card cardPad">
      <div className="h1">Ergebnisliste</div>
      <p className="p">
  Die Tabelle zeigt die verbleibenden Optionen nach dem Fragebogen, absteigend nach dem <strong>Finalen Score</strong>.
  Der Finale Score ist eine gewichtete Rangzahl aus (a) Kostenpräferenz und Kostenwichtigkeit sowie (b) den von dir gewichteten Leistungsaspekten.
  Zusätzlich gibt es einen kleinen Bonus, wenn das bevorzugte Zahlungsmodell passt (falls du eine Präferenz angegeben hast).
  Alle Werte basieren auf Proxy-Daten.
  <br /><br />
  <strong>Tokenkosten</strong> sind im Datensatz als <strong>USD pro 1 Mio. Tokens</strong> hinterlegt (Input und Output getrennt).
  <br />
  <strong>Leistungswerte</strong> (Intelligenz, Geschwindigkeit, …) sind Proxy-Scores auf einer <strong>0–100</strong>-Skala (höher = besser).
  „Geschwindigkeit“ steht dabei für eine zusammengefasste Annäherung an Antworttempo (z.B. Durchsatz/Latenz), nicht für eine einzelne Rohmetrik.
</p>

      <div className="row" style={{ justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
  <div className="small">
    Tipp: Klick auf Spaltenkopf zum Sortieren.
  </div>
  <button className="btn" onClick={() => setShowDetails(v => !v)}>
    {showDetails ? "Zusatzspalten ausblenden" : "Zusatzspalten einblenden"}
  </button>
</div>

<div className="tableWrap" style={{ marginTop: 10 }}>
        <table>
          <thead>
  <tr>
    <th onClick={() => onSort("model_name")}>Modell</th>
    <th onClick={() => onSort("developer_name")}>Entwickler</th>
    <th onClick={() => onSort("country_of_origin")}>Herkunft</th>
    <th onClick={() => onSort("final_score")}>Finaler Score</th>

    {showDetails ? (
      <>
        <th onClick={() => onSort("segment_label")}>Kosten-Segment</th>
        <th onClick={() => onSort("plan_match")}>Zahlungsmodell (Match)</th>
        <th onClick={() => onSort("input_token_price")}>Tokenkosten Input (USD / 1 Mio.)</th>
        <th onClick={() => onSort("output_token_price")}>Tokenkosten Output (USD / 1 Mio.)</th>
        {PERF_DIMS.map(d => (
          <th key={d} onClick={() => onSort(`perf:${d}`)}>{toDeDim(d)}</th>
        ))}
      </>
    ) : null}
  </tr>
</thead>
          <tbody>
  {pagedRows.map(r => (
    <tr key={r.model_id}>
      <td><strong>{r.model_name}</strong></td>
      <td>{r.developer_name}</td>
      <td>{r.country_of_origin}</td>
      <td>{r.final_score.toFixed(3)}</td>

      {showDetails ? (
        <>
          <td><span className="badge">{r.segment_label}</span></td>
          <td>{badgeForMatch(r.plan_match)}</td>
          <td>{fmtNum(r.input_token_price)}</td>
          <td>{fmtNum(r.output_token_price)}</td>
          {PERF_DIMS.map(d => (
            <td key={d}>{fmtNum(r.perf_values?.[d] ?? null)}</td>
          ))}
        </>
      ) : null}
    </tr>
  ))}
</tbody>
        </table>
      </div>

      <div className="row" style={{ justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
  <div className="small">
    Zeige {startIdx + 1}–{Math.min(startIdx + pageSize, rows.length)} von {rows.length} Ergebnissen
  </div>
  <div className="row" style={{ gap: 6, alignItems: "center" }}>
    <button className="btn" onClick={() => setPage(1)} disabled={safePage === 1}>«</button>
    <button className="btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}>‹</button>

    {pageButtons(safePage, totalPages).map(n => (
      <button
        key={n}
        className={n === safePage ? "btn btnPrimary" : "btn"}
        onClick={() => setPage(n)}
      >
        {n}
      </button>
    ))}

    <button className="btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}>›</button>
    <button className="btn" onClick={() => setPage(totalPages)} disabled={safePage === totalPages}>»</button>
  </div>
</div>

      <div className="hr" />

      <details>
        <summary>Nachvollziehbarkeit: interne Scores pro Modell</summary>
        <div className="small" style={{ marginTop: 10 }}>
          Diese Details sind für Verständnis/Traceability gedacht. Sie sind nicht zwingend für die Nutzung nötig.
        </div>
        <div className="hr" />
        {pagedRows.map(r => (
          <details key={r.model_id} style={{ marginBottom: 10 }}>
            <summary>{r.model_name}</summary>
            <div className="hr" />
            <div className="kv">
              <div className="small">Base Score</div><div>{r.base_score.toFixed(3)}</div>
              <div className="small">Cost Score</div><div>{r.cost_score.toFixed(3)} ({r.cost_data})</div>
              <div className="small">Ø Tokenkosten</div><div>{fmtNum(r.avg_token_cost)}</div>
              <div className="small">Plan Bonus</div><div>{r.plan_bonus.toFixed(0)}</div>
              <div className="small">Leistungsabdeckung</div><div>{r.perf_dims_used}</div>
            </div>
          </details>
        ))}
      </details>

      <div style={{ height: 12 }} />

      <details>
        <summary>Ausschlüsse je Schritt</summary>
        <div className="small" style={{ marginTop: 10 }}>
          Zeigt, welche Modelle in welchem Schritt entfernt wurden.
        </div>
        <div className="hr" />
        {Object.entries(props.out.excluded_by_stage).map(([stage, list]) => (
          <details key={stage} style={{ marginBottom: 10 }}>
            <summary>{stage} ({list.length})</summary>
            <div className="hr" />
            {list.length ? (
              <ul>
                {list.map((m, i) => <li key={i}>{m}</li>)}
              </ul>
            ) : (
              <div className="small">Keine Ausschlüsse.</div>
            )}
          </details>
        ))}
      </details>

      <div style={{ height: 12 }} />

      <details>
        <summary>Verarbeitungsprotokoll</summary>
        <div className="hr" />
        <textarea readOnly value={props.out.log.join("\n")} />
      </details>

      <div className="hr" />
      <div className="row" style={{ justifyContent: "space-between" }}>
        <button className="btn btnGhost" onClick={() => downloadJson(props.out)}>Ergebnis als JSON exportieren</button>
        <button className="btn btnPrimary" onClick={props.onRestart}>Neu starten</button>
      </div>
    </div>
  );
}

function fmtNum(v: number | null | undefined): string {
  if (v === null || v === undefined) return "n/a";
  // show compact
  const s = Number(v);
  if (Number.isNaN(s)) return "n/a";
  return s.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
}

function badgeForMatch(m: string) {
  if (m === "passt") return <span className="badge badgeGood">passt</span>;
  if (m === "passt nicht") return <span className="badge badgeBad">passt nicht</span>;
  return <span className="badge">keine Präferenz</span>;
}

function toDeDim(d: string): string {
  const map: Record<string, string> = {
    "Intelligence": "Intelligenz",
    "Speed": "Geschwindigkeit",
    "Coding quality": "Code-Qualität",
    "Task adherence": "Folgt Anweisungen",
    "Factual reliability": "Zuverlässigkeit",
  };
  return map[d] ?? d;
}

function pageButtons(current: number, total: number): number[] {
  // Google-ish: show up to 7 pages around current
  const max = 7;
  if (total <= max) return Array.from({ length: total }, (_, i) => i + 1);
  const half = Math.floor(max / 2);
  let start = Math.max(1, current - half);
  let end = Math.min(total, start + max - 1);
  start = Math.max(1, end - max + 1);
  const arr: number[] = [];
  for (let i = start; i <= end; i += 1) arr.push(i);
  return arr;
}

function downloadJson(out: any) {
  const blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "llm_canvas_result.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
