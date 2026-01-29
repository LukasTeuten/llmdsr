import { PERF_DIMS } from "../logic/decisionEngine";
import type { Answers } from "../types/models";

export type StepKey =
  | "trust"
  | "hosting"
  | "access"
  | "personal"
  | "eea"
  | "output_ip"
  | "training"
  | "payment"
  | "pricing_segments"
  | "cost_importance"
  | "performance"
  | "results";

export interface StepCopy {
  key: StepKey;
  title: string;
  isOptional?: boolean;
  meaning: string;
  why: string;
  // optional: extra small note shown under explain blocks
  note?: string;
  // function to decide if the step should be visible
  visible?: (a: Answers) => boolean;
}

export const START_TEXT = {
  title: "LLM Canvas – Funktionaler Prototyp",
  body: [
    "Dies ist ein funktionaler Prototyp im Rahmen meiner Masterarbeit. Ziel ist es, Kleinst bis Mittelgroße Unternehmen bei der Auswahl geeigneter Sprachmodelle zu unterstützen, ohne dass dafür bereits tiefes technisches Vorwissen nötig ist.",
    "Der Prototyp führt Schritt für Schritt durch zentrale Anforderungen, die in der Praxis häufig den Ausschlag geben (z.B. Betriebsform, organisatorische Vorgaben, Kostenpräferenzen und Leistungsaspekte). Aus den Antworten werden Optionen nachvollziehbar eingegrenzt und anschließend sortiert.",
    "Wichtig: Die im Prototyp verwendeten Modellinformationen sind Proxy-Daten (Beispieldaten). Sie sollen den Entscheidungsprozess und die Darstellung testbar machen, sind aber keine verbindliche oder vollständige Marktübersicht.",
    "Der Fokus liegt auf Funktionalität und Nachvollziehbarkeit, nicht auf optischer Ausgestaltung. Der Prototyp ist keine Rechtsberatung und ersetzt keine Detailprüfung von Verträgen oder Datenschutzanforderungen."
  ]
};

export const STEP_COPY: StepCopy[] = [
  {
    key: "trust",
    title: "Möchten Sie bestimmte Länder oder Entwickler ausschließen?",
    isOptional: true,
    meaning:
      "Hier legen Sie fest, ob bestimmte Länder oder Entwickler für Sie grundsätzlich nicht in Frage kommen. Diese Optionen werden anschließend nicht mehr berücksichtigt.",
    why:
      "Solche Ausschlüsse sind in der Praxis häufig harte Vorgaben (z.B. interne Richtlinien oder Vertrauensanforderungen). Ein früher Ausschluss spart Zeit und vermeidet, dass später scheinbar passende Optionen übrig bleiben, die Sie ohnehin nicht nutzen würden.",
    note:
      "Optional: Wenn Sie nichts auswählen, wird in diesem Schritt nichts ausgeschlossen."
  },
  {
    key: "hosting",
    title: "Wie soll das Modell betrieben werden?",
    meaning:
      "Sie entscheiden, ob Sie einen fertigen Dienst nutzen (Anbieter-betrieben), ob Sie selbst betreiben möchten (Selbstbetrieb), oder ob beides möglich ist.",
    why:
      "Nicht jede Option ist als Dienst verfügbar, und nicht jede Option ist sinnvoll selbst zu betreiben. Diese Entscheidung wirkt sich stark auf Aufwand, Kontrolle und Umsetzbarkeit aus."
  },
  {
    key: "access",
    title: "Welche Zugriffsarten müssen bereits verfügbar sein?",
    isOptional: true,
    meaning:
      "Sie wählen nur aus, was zwingend vorhanden sein muss: eine technische Schnittstelle (API) und/oder eine fertige Chat-Oberfläche. Wenn Ihnen beides egal ist, wählen Sie nichts aus.",
    why:
      "Viele Vorhaben scheitern nicht an der Modellqualität, sondern an der praktischen Nutzbarkeit. Eine API ist wichtig für Integration in eigene Systeme; eine Chat-Oberfläche ermöglicht einen schnellen Start ohne Entwicklungsaufwand.",
    note:
      "Optional: Wenn Sie nichts auswählen, wird in diesem Schritt nichts gefiltert."
  },
  {
    key: "personal",
    title: "Werden personenbezogene Daten als Eingabe verarbeitet?",
    meaning:
      "Personenbezogene Daten sind Informationen, mit denen eine Person direkt oder indirekt erkennbar ist (z.B. Name, E-Mail, Kundennummer oder Kombinationen von Merkmalen).",
    why:
      "Sobald personenbezogene Daten betroffen sind, steigen die praktischen Anforderungen an Datenverarbeitung, Verträge und Umsetzbarkeit häufig deutlich.",
    note:
      "Konservativer Filter: Bei „Ja“ werden Optionen ausgeklammert, bei denen eine Verarbeitung im EWR nicht realistisch abbildbar ist (z.B. keine klare EWR-Verarbeitung oder kein sinnvoller Selbstbetrieb)."
  },
  {
    key: "eea",
    title: "Muss die Datenverarbeitung im EWR stattfinden?",
    meaning:
      "EWR bedeutet EU plus Island, Liechtenstein und Norwegen. Diese Frage bildet eine interne Vorgabe ab, auch wenn keine personenbezogenen Daten verarbeitet werden.",
    why:
      "Einige Organisationen verlangen EWR-Verarbeitung aus internen Compliance- oder Sicherheitsgründen. Wenn Sie „Ja“ wählen, wird dieselbe konservative EWR-Prüfung angewendet.",
    visible: (a) => a.personal_data_input === false
  },
  {
    key: "output_ip",
    title: "Benötigen Sie klare Nutzungsrechte an den Ausgaben?",
    meaning:
      "Es geht darum, ob der Anbieter vertraglich zusagt, dass Sie die erzeugten Ausgaben (z.B. Texte oder Code) nutzen dürfen, etwa für Veröffentlichung oder kommerzielle Nutzung.",
    why:
      "Wenn Ergebnisse veröffentlicht oder weitergegeben werden sollen, ist eine klare vertragliche Regelung oft Voraussetzung. Hinweis: Eine Zusage ersetzt keine Einzelfallprüfung (keine Rechtsberatung)."
  },
  {
    key: "training",
    title: "Dürfen Ihre Eingaben vom Anbieter zur Verbesserung oder zum Training genutzt werden?",
    meaning:
      "Einige Anbieter verwenden Eingaben (teilweise) zur Produktverbesserung. Wenn Sie „Nein“ wählen, bleiben nur Optionen, die dies ausdrücklich ausschließen oder ein Opt-out anbieten.",
    why:
      "Für viele Unternehmen ist das eine harte Vorgabe (z.B. wegen Geheimhaltung oder vertraglicher Pflichten). Hinweis: „Kein Training“ kann bei manchen Anbietern an bestimmte Tarife gebunden sein."
  },
  {
    key: "payment",
    title: "Bevorzugtes Zahlungsmodell?",
    isOptional: true,
    meaning:
      "Sie können angeben, ob Ihnen nutzungsbasierte Abrechnung oder ein Abo lieber ist – oder ob Sie keine Präferenz haben. Das schließt nichts aus, sondern beeinflusst nur leicht die Sortierung.",
    why:
      "In der Praxis passt nicht jedes Abrechnungsmodell zu Budgetplanung und Controlling. Als weiche Präferenz kann es dennoch helfen, besser passende Optionen oben zu sehen."
  },
  {
    key: "pricing_segments",
    title: "Welche Kostenbereiche sollen bevorzugt werden?",
    isOptional: true,
    meaning:
      "Sie können festlegen, ob eher günstigere, mittlere oder teurere Optionen bevorzugt werden sollen. Die Einteilung erfolgt relativ innerhalb der verbleibenden Optionen (Drittel nach Tokenkosten).",
    why:
      "Damit lässt sich eine Kostenpräferenz ausdrücken, ohne feste Schwellenwerte angeben zu müssen. Wenn Sie mehrere Bereiche wählen, zählt die beste Übereinstimmung.",
    note:
      "Optional: Wenn Sie nichts auswählen, wird kein Kostenbereich aktiv bevorzugt."
  },
  {
    key: "cost_importance",
    title: "Wie wichtig sind Kosten für die Sortierung?",
    meaning:
      "Sie stellen ein, wie stark Kosten die Sortierung beeinflussen: 1 = unwichtig, 5 = sehr wichtig.",
    why:
      "Manche Teams nutzen Kosten nur als Nebenbedingung, andere möchten stark kostenorientiert vergleichen. Dieser Regler verstärkt oder schwächt die Wirkung der Kostenpräferenz."
  },
  {
    key: "performance",
    title: "Wie wichtig sind diese Leistungsaspekte für Sie?",
    meaning:
      "Sie bewerten jeden Aspekt von 1 (unwichtig) bis 5 (sehr wichtig). Aspekte mit 1 werden in der Leistungswertung ignoriert.",
    why:
      "„Leistung“ ist nicht eindimensional. Je nach Einsatz (z.B. Text vs. Code) sind andere Eigenschaften wichtiger. Die Werte basieren auf Proxy-Daten und werden innerhalb der verbleibenden Kandidaten vergleichend eingeordnet.",
    note:
      `Aspekte: ${PERF_DIMS.join(", ")}.`
  }
];
