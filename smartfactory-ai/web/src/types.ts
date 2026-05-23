export interface Scenario {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'analyzing' | 'complete' | 'error';
  error_code?: string;
  error_message?: string;
  retry_after_seconds?: number | null;
  user_id?: string;
  created_at: string;
  updated_at: string;
}

export interface DataSource {
  id: string;
  scenario_id: string;
  source_type: 'sensor_csv' | 'operator_note' | 'email' | 'inventory_csv' | 'news' | 'maintenance_csv' | 'production_csv' | 'policy' | 'generic_csv_inventory' | 'generic_csv_production' | 'generic_csv_maintenance';
  raw_content?: string;
  parsed_data?: Record<string, any>;
  file_path?: string;
  row_count?: number;
  payload?: Record<string, any>[];
  content?: string;
  created_at: string;
}

export interface AgentTrace {
  id: string;
  scenario_id: string;
  agent_name: string;
  agent_number: number;
  prompt_sent: string;
  raw_response: string;
  parsed_output: Record<string, any>;
  reasoning_steps: Record<string, any>[];
  duration_ms: number;
  status: 'success' | 'error';
  created_at: string;
}

export interface Insight {
  id: string;
  scenario_id: string;
  category: 'machine_health' | 'supply_chain' | 'demand' | 'ops';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  evidence: Record<string, any>;
  confidence: number;
  machine_id: string;
  created_at: string;
}

export interface Contradiction {
  id: string;
  scenario_id: string;
  field_name: string;
  source_a_name: string;
  source_a_value: string;
  source_a_timestamp: string;
  source_b_name: string;
  source_b_value: string;
  source_b_timestamp: string;
  resolution: string;
  confidence: number;
  created_at: string;
}

export interface Action {
  id: string;
  scenario_id: string;
  action_code: string;
  title: string;
  description: string;
  priority: number;
  category: 'maintenance' | 'procurement' | 'production' | 'logistics';
  effort_hours: number;
  cost_estimate: number;
  currency: string;
  target_system: string;
  status: 'recommended' | 'approved' | 'rejected' | 'simulated';
  steps?: string[];
  created_at: string;
}

export interface ActionStep {
  id: string;
  action_id: string;
  step_order: number;
  description: string;
  target_actor: string;
  estimated_duration_min: number;
  created_at?: string;
}

export interface Simulation {
  id: string;
  scenario_id: string;
  action_id: string;
  title?: string;
  before_state: Record<string, any>;
  after_state: Record<string, any>;
  delta: Record<string, any>;
  execution_log?: Record<string, any>[];
  execution_steps?: string[];
  created_at: string;
}

export interface Notification {
  id: string;
  simulation_id: string;
  channel: 'SMS' | 'Email' | 'Push';
  recipient_role: string;
  recipient_name: string;
  message_body: string;
  subject: string;
  sent_at: string | null;
  created_at: string;
}

export interface MLPrediction {
  id: string;
  scenario_id: string;
  machine_id: string;
  product_id: string;
  risk_score: number;
  failure_probability: number;
  predicted_failure_type: string;
  urgency: string;
  key_factors: Record<string, any>[];
  model_version: string;
  created_at: string;
}

export interface ScenarioResults {
  scenario?: Scenario;
  data_sources?: DataSource[];
  agent_traces?: AgentTrace[];
  insights: Insight[];
  contradictions: Contradiction[];
  actions: Action[];
  action_steps?: ActionStep[];
  simulations: Simulation[];
  notifications?: Notification[];
  ml_predictions: MLPrediction[];
}
