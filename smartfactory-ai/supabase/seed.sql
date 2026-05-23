-- seed.sql

-- We will insert a dummy scenario for public demo.
DO $$
DECLARE
    v_scenario_id UUID := '11111111-1111-1111-1111-111111111111';
    v_action_id UUID := '22222222-2222-2222-2222-222222222222';
    v_simulation_id UUID := '33333333-3333-3333-3333-333333333333';
BEGIN

    -- Create Scenario
    INSERT INTO scenarios (id, name, description, status)
    VALUES (v_scenario_id, 'Production Line 1 Outage Prediction', 'Analyzing sudden temperature spikes in robotic arm joints.', 'complete')
    ON CONFLICT (id) DO NOTHING;

    -- Data Sources
    INSERT INTO data_sources (scenario_id, source_type, raw_content, parsed_data)
    VALUES 
    (v_scenario_id, 'sensor_csv', 'time,temp,vibration\n10:00,45.2,0.5\n10:05,89.5,2.1', '{"readings": 2, "max_temp": 89.5}'),
    (v_scenario_id, 'operator_note', 'Heard a loud grinding noise from the main conveyor.', '{"keywords": ["grinding", "conveyor", "loud"]}');

    -- Agent Traces
    INSERT INTO agent_traces (scenario_id, agent_name, agent_number, prompt_sent, raw_response, parsed_output, duration_ms, status)
    VALUES
    (v_scenario_id, 'Data Ingestion Agent', 1, 'Parse sensor data...', 'Found anomaly in temperature...', '{"anomaly": true, "field": "temp"}', 1250, 'success');

    -- Insights
    INSERT INTO insights (scenario_id, category, severity, title, description, evidence, confidence, machine_id)
    VALUES
    (v_scenario_id, 'machine_health', 'critical', 'Impending Motor Failure', 'Robotic arm joint 3 is showing critical temperature spikes.', '{"sensor": "temp", "value": 89.5}', 0.95, 'ROB-001');

    -- Contradictions
    INSERT INTO contradictions (scenario_id, field_name, source_a_name, source_a_value, source_b_name, source_b_value, resolution, confidence)
    VALUES
    (v_scenario_id, 'machine_status', 'Sensor Logs', 'Overheating', 'Maintenance Schedule', 'Recently Serviced', 'Sensor data prioritized over static schedule.', 0.88);

    -- Actions
    INSERT INTO actions (id, scenario_id, action_code, title, description, priority, category, effort_hours, cost_estimate, target_system, status)
    VALUES
    (v_action_id, v_scenario_id, 'ACT-001', 'Emergency Maintenance', 'Dispatch technician to inspect and lubricate Joint 3.', 1, 'maintenance', 2, 150.00, 'ROB-001', 'recommended');

    -- Action Steps
    INSERT INTO action_steps (action_id, step_order, description, target_actor, estimated_duration_min)
    VALUES
    (v_action_id, 1, 'Shutdown Production Line 1', 'Operator', 5),
    (v_action_id, 2, 'Inspect Joint 3', 'Technician', 30);

    -- Simulations
    INSERT INTO simulations (id, scenario_id, action_id, before_state, after_state, delta)
    VALUES
    (v_simulation_id, v_scenario_id, v_action_id, '{"downtime_risk": 0.9}', '{"downtime_risk": 0.1}', '{"risk_reduction": 0.8}');

    -- Notifications
    INSERT INTO notifications (simulation_id, channel, recipient_role, recipient_name, message_body, subject, sent_at)
    VALUES
    (v_simulation_id, 'Email', 'Maintenance Manager', 'John Doe', 'Urgent maintenance required for ROB-001.', 'Critical Alert: ROB-001', NOW());

    -- ML Predictions
    INSERT INTO ml_predictions (scenario_id, machine_id, product_id, risk_score, failure_probability, predicted_failure_type, urgency)
    VALUES
    (v_scenario_id, 'ROB-001', 'PRD-A', 8.5, 0.92, 'Thermal Overload', 'High');

END $$;
