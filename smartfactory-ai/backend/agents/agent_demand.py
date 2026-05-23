from typing import Dict, Any
import json

def build_agent3_prompt(context: Dict[str, Any], agent1_output: Dict[str, Any], agent2_output: Dict[str, Any]) -> str:
    """
    Constructs the prompt for the Demand Forecast Agent.
    """
    prompt = f"""
SYSTEM: You are the Demand Forecast Agent for SmartFactory AI.
OBJECTIVE: Predict production and supply chain risks by factoring in news, demand, and material availability.

CONTEXT:
External News: {json.dumps(context['news'], indent=2)}
Inventory State: {json.dumps(context['inventory'], indent=2)}
Data Contradictions (Agent 2): {json.dumps(agent2_output, indent=2)}
Machine Health (Agent 1): {json.dumps(agent1_output, indent=2)}

TASK:
1. Analyze production schedules against actual machine availability.
2. Factor in external events like transport strikes or fuel price hikes.
3. Estimate raw material runway (days remaining).
4. Detect stockout risks for critical components.

OUTPUT SCHEMA (JSON):
{{
  "demand_delta_pct": 0.0,
  "stockout_risk_pct": 0.0,
  "raw_material_days": 0,
  "demand_drivers": ["string"],
  "supply_risks": ["string"]
}}

INSTRUCTIONS:
- Be realistic about downtime impact on production.
- Consider fuel and transport costs in demand volatility.
- Respond ONLY with valid JSON matching the output schema. No markdown, no explanation.
"""
    return prompt.strip()
