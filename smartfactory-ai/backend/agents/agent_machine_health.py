from typing import Dict, Any
import json

def build_agent1_prompt(context: Dict[str, Any]) -> str:
    """
    Constructs the prompt for the Machine Health Agent.
    """
    prompt = f"""
SYSTEM: You are the Machine Health Agent for SmartFactory AI.
OBJECTIVE: Analyze telemetry, anomalies, and ML predictions to assess factory equipment health.

CONTEXT:
Scenario ID: {context['scenario_id']}
Scenario Description: {context['scenario_description']}
Priority Machines: {json.dumps(context.get('focus_machines', []), indent=2)}
Scenario Tags: {json.dumps(context.get('scenario_tags', []), indent=2)}
Latest Telemetry: {json.dumps(context['sensor_data'], indent=2)}
ML Prediction Scores: {json.dumps(context['ml_predictions'], indent=2)}
Operator Notes: {json.dumps(context['operator_notes'], indent=2)}

TASK:
1. Analyze vibration, temperature, and torque anomalies.
2. Cross-reference ML risk scores with raw telemetry.
3. Identify specific machines at risk of failure.
4. Detect subtle operational degradation patterns.

OUTPUT SCHEMA (JSON):
{{
  "risk_assessments": [
    {{
      "machine_id": "string",
      "risk_score": 0.0-100.0,
      "anomalies": ["string"],
      "urgency": "low/medium/high/critical",
      "evidence": ["string"]
    }}
  ],
  "overall_factory_risk": 0.0-100.0
}}

INSTRUCTIONS:
- Prioritize the most recent telemetry.
- If telemetry rows identify a machine number, keep the analysis tied to that machine.
- Explain technical evidence clearly.
- Detect hidden risks that ML might miss but raw data suggests.
- Respond ONLY with valid JSON matching the output schema. No markdown, no explanation.
"""
    return prompt.strip()
