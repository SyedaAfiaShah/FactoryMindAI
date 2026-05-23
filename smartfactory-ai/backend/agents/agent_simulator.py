from typing import Dict, Any
import json

def build_agent5_prompt(context: Dict[str, Any], actions: Dict[str, Any], previous_intelligence: Dict[str, Any]) -> str:
    """
    Constructs the prompt for the Simulation Agent.
    Schema uses production_efficiency (0-100 %) to match the frontend display.
    """
    prompt = f"""
SYSTEM: You are the Simulation Agent for SmartFactory AI.
OBJECTIVE: Predict the outcome of proposed actions and generate professional alerts for stakeholders.

INPUTS:
Proposed Actions: {json.dumps(actions, indent=2)}
Current Context: {json.dumps(context, indent=2)}
Previous Intelligence: {json.dumps(previous_intelligence, indent=2)}

TASK:
1. Simulate the execution of each proposed action.
2. For each action, compute realistic Before/After values for risk_score (0-100), production_efficiency (0-100 pct), and daily_cost (USD).
3. Provide 3-5 execution_steps describing exactly what happens.
4. Generate 2 professional stakeholder notifications (one SMS, one Email).

REQUIRED OUTPUT JSON:
{{
  "actions_simulated": [
    {{
      "action_id": "ACT-001",
      "title": "Action title here",
      "before_state": {{
        "risk_score": 82,
        "production_efficiency": 74,
        "daily_cost": 4200
      }},
      "after_state": {{
        "risk_score": 18,
        "production_efficiency": 88,
        "daily_cost": 3100
      }},
      "execution_steps": [
        "Step 1: Shut down machine and isolate spindle control.",
        "Step 2: Inspect bearing assembly for heat damage.",
        "Step 3: Replace worn coupling and re-calibrate sensors.",
        "Step 4: Run test cycle at 60% load.",
        "Step 5: Confirm telemetry returns to normal range."
      ],
      "timeline_hours": 2
    }}
  ],
  "notifications": [
    {{
      "channel": "SMS",
      "recipient_name": "John Smith",
      "recipient_role": "Shift Supervisor",
      "subject": "URGENT: Machine failure risk detected",
      "message_body": "ALERT: Machine 1 is at 82% failure risk. Reduce load immediately and initiate maintenance protocol."
    }},
    {{
      "channel": "Email",
      "recipient_name": "Sarah Lee",
      "recipient_role": "Maintenance Manager",
      "subject": "SmartFactory AI: Maintenance Action Required",
      "message_body": "Automated analysis has flagged Machine 1 for immediate maintenance intervention. Risk score: 82%. Recommended actions have been dispatched. Please review and approve the repair schedule."
    }}
  ]
}}

CRITICAL:
- Use realistic numbers based on the context provided.
- Respond ONLY with valid JSON matching the output schema exactly. No markdown, no explanation, no extra keys.
"""
    return prompt.strip()
