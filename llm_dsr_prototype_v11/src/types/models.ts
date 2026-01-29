export type SourceType = "open_weight" | "proprietary";

export interface ModelHost {
  host_name: string;
  host_country?: string | null;
  eea_processing?: boolean | null;
  chat_available?: boolean | null;
  api_available?: boolean | null;
}

export interface ModelOption {
  model_id: string;
  model_name: string;
  developer_name: string;
  country_of_origin: string;
  source_type: SourceType;
  output_ip?: boolean | null;
  training_on_user_inputs?: "yes_train" | "no_train" | "opt_out" | null;
  usage_based_pricing_available?: boolean | null;
  subscription_available?: boolean | null;
  api_availability?: boolean | null;
  hosts: ModelHost[];
  input_token_price?: number | null;
  output_token_price?: number | null;
  perf: Record<string, number | null>;
}

export type PaymentPreference = "usage-based" | "subscription" | null;

export interface Answers {
  exclude_developers: string[];
  exclude_countries: string[];
  hosting_responsibility: "provider-managed" | "self-managed" | "either" | null;
  required_access_modes: ("API" | "Chat")[];
  personal_data_input: boolean | null;
  eea_required: boolean | null;
  require_output_ip: boolean | null;
  allow_training_on_inputs: boolean | null;
  payment_plan_preference: PaymentPreference;
  pricing_segments: ("low" | "mid" | "premium")[];
  cost_importance: number; // 1..5
  perf_likert: Record<string, number>; // 1..5
}

export interface EvalResultRow {
  model_id: string;
  model_name: string;
  developer_name: string;
  country_of_origin: string;
  source_type: SourceType;
  final_score: number;
  base_score: number;
  avg_token_cost: number | null;
  input_token_price: number | null;
  output_token_price: number | null;
  cost_score: number;
  cost_data: "ok" | "not available";
  perf_dims_used: string;
  plan_bonus: number;
  plan_match: "passt" | "passt nicht" | "keine Präferenz";
  segment_label: "Unteres Drittel" | "Mittleres Drittel" | "Oberes Drittel" | "n/a";
  perf_values: Record<string, number | null>;
}

export interface EvaluationOutput {
  results: EvalResultRow[];
  log: string[];
  excluded_by_stage: Record<string, string[]>;
  diagnostics: Record<string, unknown>;
}
