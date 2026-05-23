from typing import Dict, Any
import json

def build_agent4_prompt(agent1: Dict[str, Any], agent2: Dict[str, Any], agent3: Dict[str, Any]) -> str:
    """
    Constructs the prompt for the Action Planning Agent.
    """
    prompt = f"""
SYSTEM: You are the Lead Action Planner for SmartFactory AI.
OBJECTIVE: Generate concrete, manufacturing-safe actions based on intelligence from previous analysis.

INPUTS:
1. Machine Health Analysis: {json.dumps(agent1, indent=2)}
2. Data Contradictions: {json.dumps(agent2, indent=2)}
3. Demand & Supply Risk: {json.dumps(agent3, indent=2)}

TASK:
1. Generate 3-5 concrete operational actions.
2. Prioritize by urgency and production impact.
3. Recommend realistic interventions (e.g., re-routing logistics, specific part replacement).
4. Categorize actions (Maintenance, Logistics, Production).

OUTPUT SCHEMA (JSON):
{{
  "actions": [
    {{
      "id": "ACT-001",
      "title": "string",
      "description": "string",
      "priority": 1,
      "category": "Maintenance/Logistics/Production",
      "effort_hours": 0,
      "cost_estimate": 0,
      "target_system": "string",
      "steps": ["string"]
    }}
  ]
}}

INSTRUCTIONS:
- Actions must be operationally realistic and specific.
- Avoid generic "monitor the situation" advice.
- Respond ONLY with valid JSON matching the output schema. No markdown, no explanation.
"""
    return prompt.strip()
