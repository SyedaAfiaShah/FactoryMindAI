-- 001_initial_schema.sql

-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: scenarios
CREATE TABLE scenarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    status TEXT CHECK (status IN ('pending', 'analyzing', 'complete', 'error')) DEFAULT 'pending',
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: data_sources
CREATE TABLE data_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scenario_id UUID REFERENCES scenarios(id) ON DELETE CASCADE,
    source_type TEXT CHECK (source_type IN ('sensor_csv', 'operator_note', 'email', 'inventory_csv', 'news', 'maintenance_csv', 'production_csv')),
    raw_content TEXT,
    parsed_data JSONB,
    file_path TEXT,
    row_count INT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: agent_traces
CREATE TABLE agent_traces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scenario_id UUID REFERENCES scenarios(id) ON DELETE CASCADE,
    agent_name TEXT,
    agent_number INT CHECK (agent_number BETWEEN 1 AND 5),
    prompt_sent TEXT,
    raw_response TEXT,
    parsed_output JSONB,
    reasoning_steps JSONB[],
    duration_ms INT,
    status TEXT CHECK (status IN ('success', 'error')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: insights
CREATE TABLE insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scenario_id UUID REFERENCES scenarios(id) ON DELETE CASCADE,
    category TEXT CHECK (category IN ('machine_health', 'supply_chain', 'demand', 'ops')),
    severity TEXT CHECK (severity IN ('critical', 'high', 'medium', 'low')),
    title TEXT,
    description TEXT,
    evidence JSONB,
    confidence FLOAT,
    machine_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: contradictions
CREATE TABLE contradictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scenario_id UUID REFERENCES scenarios(id) ON DELETE CASCADE,
    field_name TEXT,
    source_a_name TEXT,
    source_a_value TEXT,
    source_a_timestamp TIMESTAMPTZ,
    source_b_name TEXT,
    source_b_value TEXT,
    source_b_timestamp TIMESTAMPTZ,
    resolution TEXT,
    confidence FLOAT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: actions
CREATE TABLE actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scenario_id UUID REFERENCES scenarios(id) ON DELETE CASCADE,
    action_code TEXT,
    title TEXT,
    description TEXT,
    priority INT CHECK (priority BETWEEN 1 AND 5),
    category TEXT CHECK (category IN ('maintenance', 'procurement', 'production', 'logistics')),
    effort_hours INT,
    cost_estimate FLOAT,
    currency TEXT DEFAULT 'USD',
    target_system TEXT,
    status TEXT CHECK (status IN ('recommended', 'approved', 'rejected', 'simulated')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: action_steps
CREATE TABLE action_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action_id UUID REFERENCES actions(id) ON DELETE CASCADE,
    step_order INT,
    description TEXT,
    target_actor TEXT,
    estimated_duration_min INT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: simulations
CREATE TABLE simulations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scenario_id UUID REFERENCES scenarios(id) ON DELETE CASCADE,
    action_id UUID REFERENCES actions(id) ON DELETE CASCADE,
    before_state JSONB,
    after_state JSONB,
    delta JSONB,
    execution_log JSONB[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    simulation_id UUID REFERENCES simulations(id) ON DELETE CASCADE,
    channel TEXT CHECK (channel IN ('SMS', 'Email', 'Push')),
    recipient_role TEXT,
    recipient_name TEXT,
    message_body TEXT,
    subject TEXT,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: ml_predictions
CREATE TABLE ml_predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scenario_id UUID REFERENCES scenarios(id) ON DELETE CASCADE,
    machine_id TEXT,
    product_id TEXT,
    risk_score FLOAT,
    failure_probability FLOAT,
    predicted_failure_type TEXT,
    urgency TEXT,
    key_factors JSONB[],
    model_version TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for FKs
CREATE INDEX idx_data_sources_scenario_id ON data_sources(scenario_id);
CREATE INDEX idx_agent_traces_scenario_id ON agent_traces(scenario_id);
CREATE INDEX idx_insights_scenario_id ON insights(scenario_id);
CREATE INDEX idx_contradictions_scenario_id ON contradictions(scenario_id);
CREATE INDEX idx_actions_scenario_id ON actions(scenario_id);
CREATE INDEX idx_action_steps_action_id ON action_steps(action_id);
CREATE INDEX idx_simulations_scenario_id ON simulations(scenario_id);
CREATE INDEX idx_simulations_action_id ON simulations(action_id);
CREATE INDEX idx_notifications_simulation_id ON notifications(simulation_id);
CREATE INDEX idx_ml_predictions_scenario_id ON ml_predictions(scenario_id);

-- Updated_at Trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_scenarios_updated_at
    BEFORE UPDATE ON scenarios
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_traces ENABLE ROW LEVEL SECURITY;
ALTER TABLE insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE contradictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access their own scenarios" ON scenarios
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access data_sources for their scenarios" ON data_sources
    FOR ALL USING (scenario_id IN (SELECT id FROM scenarios WHERE user_id = auth.uid()));

CREATE POLICY "Users can access agent_traces for their scenarios" ON agent_traces
    FOR ALL USING (scenario_id IN (SELECT id FROM scenarios WHERE user_id = auth.uid()));

CREATE POLICY "Users can access insights for their scenarios" ON insights
    FOR ALL USING (scenario_id IN (SELECT id FROM scenarios WHERE user_id = auth.uid()));

CREATE POLICY "Users can access contradictions for their scenarios" ON contradictions
    FOR ALL USING (scenario_id IN (SELECT id FROM scenarios WHERE user_id = auth.uid()));

CREATE POLICY "Users can access actions for their scenarios" ON actions
    FOR ALL USING (scenario_id IN (SELECT id FROM scenarios WHERE user_id = auth.uid()));

CREATE POLICY "Users can access action_steps for their scenarios" ON action_steps
    FOR ALL USING (action_id IN (SELECT id FROM actions WHERE scenario_id IN (SELECT id FROM scenarios WHERE user_id = auth.uid())));

CREATE POLICY "Users can access simulations for their scenarios" ON simulations
    FOR ALL USING (scenario_id IN (SELECT id FROM scenarios WHERE user_id = auth.uid()));

CREATE POLICY "Users can access notifications for their scenarios" ON notifications
    FOR ALL USING (simulation_id IN (SELECT id FROM simulations WHERE scenario_id IN (SELECT id FROM scenarios WHERE user_id = auth.uid())));

CREATE POLICY "Users can access ml_predictions for their scenarios" ON ml_predictions
    FOR ALL USING (scenario_id IN (SELECT id FROM scenarios WHERE user_id = auth.uid()));
