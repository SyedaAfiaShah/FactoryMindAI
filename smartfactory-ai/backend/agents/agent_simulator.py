from typing import Dict, Any
import json

def build_agent5_prompt(context: Dict[str, Any], actions: Dict[str, Any], previous_intelligence: Dict[str, Any]) -> str:
    """
    Constructs the prompt for the Simulation Agent with the EXACT requested schema.
    """
    prompt = f"""
SYSTEM: You are the Simulation Agent for SmartFactory AI.
OBJECTIVE: Predict the outcome of proposed actions and generate alerts for stakeholders.

INPUTS:
Proposed Actions: {json.dumps(actions, indent=2)}
Current Context: {json.dumps(context, indent=2)}
Previous Intelligence: {json.dumps(previous_intelligence, indent=2)}

TASK:
1. Simulate the execution of all proposed actions.
2. For each action, compute the Before/After impact on risk_score, production_pct, and cost_per_day.
3. Define clear execution steps and an estimated timeline.
4. Generate professional SMS and Email notifications.

REQUIRED OUTPUT JSON:
{{
  "actions_simulated": [
    {{
      "action_id": "ACT-001",
      "title": "Emergency maintenance tonight",
      "before_state": {{
        "risk_score": 0,
        "production_pct": 0,
        "cost_per_day": 0
      }},
      "after_state":  {{
        "risk_score": 0,
        "production_pct": 0,
        "cost_per_day": 0
      }},
      "execution_steps": ["step 1", "step 2"],
      "timeline_hours": 0
    }}
  ],
  "notifications": [
    {{"channel": "SMS", "recipient": "Shift Supervisor", "message": "..."}},
    {{"channel": "Email", "recipient": "Maintenance Manager", "message": "..."}}
  ]
}}

CRITICAL:
Respond ONLY with valid JSON matching this exact schema. No markdown, no explanation.
"""
    return prompt.strip()
