import type { Answers, EvaluationOutput, ModelOption, EvalResultRow, PaymentPreference } from "../types/models";

const BETA_PLAN_BONUS = 0.05;

export const PERF_DIMS = ["Intelligence", "Speed", "Coding quality", "Task adherence", "Factual reliability"] as const;

type PerfDim = typeof PERF_DIMS[number];

function percentileRanks(values: Array<[string, number]>): Record<string, number> {
  // Percentile ranks in [0,1], ascending by value. Tie-safe (average rank).
  if (!values.length) return {};
  const valsSorted = [...values].sort((a, b) => a[1] - b[1]);
  const n = valsSorted.length;
  const ranks: Record<string, number> = {};
  let i = 0;
  while (i < n) {
    let j = i;
    while (j + 1 < n && valsSorted[j + 1][1] === valsSorted[i][1]) j += 1;
    const avgRank = (i + j) / 2.0;
    const pct = n === 1 ? 1.0 : (avgRank / (n - 1));
    for (let k = i; k <= j; k += 1) ranks[valsSorted[k][0]] = pct;
    i = j + 1;
  }
  return ranks;
}

function applyEeaScreen(candidates: ModelOption[]): ModelOption[] {
  const filtered: ModelOption[] = [];
  for (const m of candidates) {
    if (m.source_type === "open_weight") {
      filtered.push(m);
      continue;
    }
    if (m.hosts?.some(h => h.eea_processing === true)) filtered.push(m);
  }
  return filtered;
}

function stageLabel(key: string): string {
  const map: Record<string, string> = {
    "Trust exclusions": "Ausschlüsse nach Vertrauen",
    "Hosting feasibility": "Betrieb / Bereitstellung möglich",
    "Access modes": "Zugriffsarten",
    "Compliance": "Compliance",
    "Compliance (EEA screen)": "Compliance (EWR-Prüfung)",
    "Contract (Output IP)": "Rechte an Ausgaben",
    "Contract (Training on inputs)": "Training mit Eingaben",
  };
  return map[key] ?? key;
}

export function filterCandidates(models: ModelOption[], answers: Answers): {
  candidates: ModelOption[];
  log: string[];
  excluded_by_stage: Record<string, string[]>;
  provider_scope: boolean;
} {
  const log: string[] = [];
  const excluded_by_stage: Record<string, string[]> = {};
  let candidates = [...models];

  const fmt = (stage: string, selection?: string, removed?: number, remaining?: number, skipped?: boolean): string => {
    const s = stageLabel(stage);
    if (skipped) return `${s}: übersprungen.`;
    const parts: string[] = [`${s}:`];
    if (selection) parts.push(`ausgewählt ${selection}`);
    if (typeof removed === "number") parts.push(`${removed} Option(en) entfernt`);
    if (typeof remaining === "number") parts.push(`verbleibend ${remaining}`);
    return parts.join("; ") + ".";
  };

  const record = (stage: string, before: ModelOption[], after: ModelOption[]) => {
    const beforeIds = new Set(before.map(m => m.model_id));
    const afterIds = new Set(after.map(m => m.model_id));
    const removed = before.filter(m => beforeIds.has(m.model_id) && !afterIds.has(m.model_id)).map(m => m.model_name);
    if (removed.length) {
      const label = stageLabel(stage);
      excluded_by_stage[label] = (excluded_by_stage[label] ?? []).concat([...removed].sort());
    }
  };

  // Trust exclusions
  const excludedDevs = new Set(answers.exclude_developers ?? []);
  const excludedCountries = new Set(answers.exclude_countries ?? []);
  const selection = `countries=${excludedCountries.size ? [...excludedCountries].sort().join(", ") : "keine"}; developers=${excludedDevs.size ? [...excludedDevs].sort().join(", ") : "keine"}`;
  const beforeTrust = [...candidates];
  candidates = candidates.filter(m => !excludedDevs.has(m.developer_name) && !excludedCountries.has(m.country_of_origin));
  record("Trust exclusions", beforeTrust, candidates);
  log.push(fmt("Trust exclusions", selection, beforeTrust.length - candidates.length, candidates.length));

  // Hosting responsibility
  const hosting = answers.hosting_responsibility;
  let provider_scope = true;
  if (hosting) {
    provider_scope = hosting === "provider-managed" || hosting === "either";
    const before = [...candidates];
    const filtered: ModelOption[] = [];
    for (const m of candidates) {
      let ok = false;
      if (hosting === "provider-managed") ok = (m.hosts?.length ?? 0) > 0;
      else if (hosting === "self-managed") ok = m.source_type === "open_weight";
      else ok = (m.source_type === "open_weight") || ((m.hosts?.length ?? 0) > 0);
      if (ok) filtered.push(m);
    }
    candidates = filtered;
    record("Hosting feasibility", before, candidates);
    log.push(fmt("Hosting feasibility", hosting, before.length - candidates.length, candidates.length));
  } else {
    provider_scope = true;
    log.push(fmt("Hosting feasibility", undefined, undefined, undefined, true));
  }

  // Access modes (only if provider-scope)
  const requiredAccess = new Set(answers.required_access_modes ?? []);
  if (provider_scope && requiredAccess.size) {
    const before = [...candidates];
    const filtered: ModelOption[] = [];
    for (const m of candidates) {
      let ok = true;
      if (requiredAccess.has("API")) ok = ok && (m.api_availability === true);
      if (requiredAccess.has("Chat")) ok = ok && (m.hosts?.some(h => h.chat_available === true) ?? false);
      if (ok) filtered.push(m);
    }
    candidates = filtered;
    record("Access modes", before, candidates);
    log.push(fmt("Access modes", [...requiredAccess].sort().join(", "), before.length - candidates.length, candidates.length));
  } else {
    log.push(fmt("Access modes", undefined, undefined, undefined, true));
  }

  // Compliance (only if provider-scope)
  if (provider_scope) {
    const personal = answers.personal_data_input;
    const eea = answers.eea_required;

    if (personal === null) {
      log.push(fmt("Compliance", undefined, undefined, undefined, true));
    } else {
      const sel = personal
        ? "personenbezogene Daten=ja (EWR-Prüfung automatisch)"
        : (eea === null ? "personenbezogene Daten=nein; EWR-Anforderung=übersprungen"
          : `personenbezogene Daten=nein; EWR-Anforderung=${eea ? "ja" : "nein"}`);

      const apply = (personal === true) || (personal === false && eea === true);
      if (apply) {
        const before = [...candidates];
        candidates = applyEeaScreen(candidates);
        record("Compliance (EEA screen)", before, candidates);
        log.push(fmt("Compliance", sel, before.length - candidates.length, candidates.length));
      } else {
        log.push(fmt("Compliance", sel, 0, candidates.length));
      }
    }
  } else {
    log.push(fmt("Compliance", undefined, undefined, undefined, true));
  }

  // Contractual conditions
  const requireOutput = answers.require_output_ip;
  if (requireOutput === null) {
    log.push(fmt("Contract (Output IP)", undefined, undefined, undefined, true));
  } else if (requireOutput === true) {
    const before = [...candidates];
    const filtered: ModelOption[] = [];
    for (const m of candidates) {
      if (m.source_type === "open_weight") filtered.push(m);
      else if (m.output_ip === true) filtered.push(m);
    }
    candidates = filtered;
    record("Contract (Output IP)", before, candidates);
    log.push(fmt("Contract (Output IP)", "ja", before.length - candidates.length, candidates.length));
  } else {
    log.push(fmt("Contract (Output IP)", "nein", 0, candidates.length));
  }

  const allowTraining = answers.allow_training_on_inputs;
  if (allowTraining === null) {
    log.push(fmt("Contract (Training on inputs)", undefined, undefined, undefined, true));
  } else if (allowTraining === false) {
    const before = [...candidates];
    const filtered: ModelOption[] = [];
    for (const m of candidates) {
      if (m.source_type === "open_weight") filtered.push(m);
      else if (m.training_on_user_inputs === "no_train" || m.training_on_user_inputs === "opt_out") filtered.push(m);
    }
    candidates = filtered;
    record("Contract (Training on inputs)", before, candidates);
    log.push(fmt("Contract (Training on inputs)", "nein (Training nicht erlaubt)", before.length - candidates.length, candidates.length));
  } else {
    log.push(fmt("Contract (Training on inputs)", "ja (Training erlaubt)", 0, candidates.length));
  }

  return { candidates, log, excluded_by_stage, provider_scope };
}

function segmentLabelForCosts(modelId: string, costsSorted: Array<[string, number]>): "Unteres Drittel" | "Mittleres Drittel" | "Oberes Drittel" | "n/a" {
  const n = costsSorted.length;
  if (n < 3) return "n/a";
  const idx = costsSorted.findIndex(x => x[0] === modelId);
  if (idx < 0) return "n/a";
  const t1 = Math.floor(n / 3);
  const t2 = Math.floor((2 * n) / 3);
  if (idx < t1) return "Unteres Drittel";
  if (idx < t2) return "Mittleres Drittel";
  return "Oberes Drittel";
}

function planMatchLabel(pref: PaymentPreference, m: ModelOption): "passt" | "passt nicht" | "keine Präferenz" {
  if (pref === null) return "keine Präferenz";
  if (pref === "usage-based") return m.usage_based_pricing_available === true ? "passt" : "passt nicht";
  return m.subscription_available === true ? "passt" : "passt nicht";
}

export function evaluate(models: ModelOption[], answers: Answers): EvaluationOutput {
  const { candidates, log, excluded_by_stage } = filterCandidates(models, answers);
  if (!candidates.length) return { results: [], log, excluded_by_stage, diagnostics: {} };

  const planPref = answers.payment_plan_preference; // "usage-based" | "subscription" | null
  const selectedSegments = new Set(answers.pricing_segments ?? []);
  const costImportance = Math.max(1, Math.min(5, Math.trunc(answers.cost_importance ?? 3)));
  const wCost = Math.max(0, costImportance - 1); // 0..4

  const perfLikert = answers.perf_likert ?? {};

  // Token cost (50/50)
  const tokenCosts: Array<[string, number]> = [];
  const missingCost = new Set<string>();
  const rawCost: Record<string, number | null> = {};
  const rawIn: Record<string, number | null> = {};
  const rawOut: Record<string, number | null> = {};
  for (const m of candidates) {
    const inp = m.input_token_price ?? null;
    const out = m.output_token_price ?? null;
    rawIn[m.model_id] = inp;
    rawOut[m.model_id] = out;
    if (inp === null || out === null) {
      missingCost.add(m.model_id);
      rawCost[m.model_id] = null;
      continue;
    }
    const c = 0.5 * Number(inp) + 0.5 * Number(out);
    tokenCosts.push([m.model_id, c]);
    rawCost[m.model_id] = c;
  }

  const pctCost = percentileRanks(tokenCosts); // ascending by cost
  const cPos: Record<string, number> = {};
  for (const [mid, pct] of Object.entries(pctCost)) cPos[mid] = 1.0 - pct; // 1=cheapest

  // Segment targets in cost-position space
  const targets: number[] = [];
  if (!selectedSegments.size) targets.push(1.0);
  else {
    if (selectedSegments.has("low")) targets.push(1.0);
    if (selectedSegments.has("mid")) targets.push(0.5);
    if (selectedSegments.has("premium")) targets.push(0.0);
  }

  const costScore: Record<string, number> = {};
  for (const m of candidates) {
    if (missingCost.has(m.model_id) || cPos[m.model_id] === undefined) {
      costScore[m.model_id] = 0.5;
    } else {
      let best = 0.0;
      for (const t of targets) best = Math.max(best, 1.0 - Math.abs(cPos[m.model_id] - t));
      costScore[m.model_id] = Math.max(0.0, Math.min(1.0, best));
    }
  }

  // Performance percentile per dimension (higher better)
  const perfRanksDim: Record<string, Record<string, number>> = {};
  for (const d of PERF_DIMS) {
    const vals: Array<[string, number]> = [];
    for (const m of candidates) {
      const v = m.perf?.[d] ?? null;
      if (v === null || v === undefined) continue;
      vals.push([m.model_id, Number(v)]);
    }
    perfRanksDim[d] = percentileRanks(vals);
  }

  // Plan bonus
  const planBonus: Record<string, number> = {};
  for (const m of candidates) {
    let b = 0.0;
    if (planPref === null) b = 0.0;
    else if (planPref === "usage-based") b = (m.usage_based_pricing_available === true) ? 1.0 : 0.0;
    else b = (m.subscription_available === true) ? 1.0 : 0.0;
    planBonus[m.model_id] = b;
  }

  // Segment labels per model based on avg token cost (ascending)
  const costsSorted = [...tokenCosts].sort((a, b) => a[1] - b[1]);

  const results: EvalResultRow[] = [];
  for (const m of candidates) {
    let num = 0.0;
    let den = 0.0;

    if (wCost > 0) {
      num += wCost * costScore[m.model_id];
      den += wCost;
    }

    let dimUsed = 0;
    for (const d of PERF_DIMS) {
      const L = Math.max(1, Math.min(5, Math.trunc(perfLikert[d] ?? 3)));
      const w = Math.max(0, L - 1);
      if (w === 0) continue;
      const rd = perfRanksDim[d]?.[m.model_id];
      if (rd === undefined) continue;
      num += w * rd;
      den += w;
      dimUsed += 1;
    }

    const base = den === 0 ? 0.5 : (num / den);
    const final = base + BETA_PLAN_BONUS * planBonus[m.model_id];

    results.push({
      model_id: m.model_id,
      model_name: m.model_name,
      developer_name: m.developer_name,
      country_of_origin: m.country_of_origin,
      source_type: m.source_type,
      final_score: final,
      base_score: base,
      avg_token_cost: rawCost[m.model_id] ?? null,
      input_token_price: rawIn[m.model_id] ?? null,
      output_token_price: rawOut[m.model_id] ?? null,
      cost_score: costScore[m.model_id],
      cost_data: missingCost.has(m.model_id) ? "not available" : "ok",
      perf_dims_used: `${dimUsed}/5`,
      plan_bonus: planBonus[m.model_id],
      plan_match: planMatchLabel(planPref, m),
      segment_label: missingCost.has(m.model_id) ? "n/a" : segmentLabelForCosts(m.model_id, costsSorted),
      perf_values: Object.fromEntries(PERF_DIMS.map(d => [d, (m.perf?.[d] ?? null)])),
    });
  }

  results.sort((a, b) => b.final_score - a.final_score);

  const diagnostics = {
    note: "Segmente werden als Drittel der durchschnittlichen Tokenkosten (50/50 Input/Output) innerhalb der aktuellen Kandidatenmenge berechnet (Proxy-Daten)."
  };

  return { results, log, excluded_by_stage, diagnostics };
}
