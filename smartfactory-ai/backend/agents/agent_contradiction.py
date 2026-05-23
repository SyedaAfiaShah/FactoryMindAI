from typing import Dict, Any
import json

def build_agent2_prompt(context: Dict[str, Any], previous_output: Dict[str, Any]) -> str:
    """
    Constructs the prompt for the Contradiction Detection Agent.
    Includes output from Agent 1 (Machine Health) for context.
    """
    prompt = f"""
SYSTEM: You are the Contradiction Detection Agent for SmartFactory AI.
OBJECTIVE: Identify inconsistencies between different data sources (emails vs inventory vs machine health).

CONTEXT:
Inventory Data: {json.dumps(context['inventory'], indent=2)}
Supplier Emails: {json.dumps(context['emails'], indent=2)}
Machine Health Assessment (Agent 1): {json.dumps(previous_output, indent=2)}

TASK:
1. Compare reported inventory levels with shipment notices in emails.
2. Detect inconsistencies in quantity, dates, or status.
3. Check if machine health risks conflict with planned maintenance in emails.
4. Resolve conflicts by determining the most trusted source based on timestamps.

OUTPUT SCHEMA (JSON):
{{
  "contradictions": [
    {{
      "field": "string",
      "source_a": "string",
      "source_b": "string",
      "resolution": "string",
      "confidence": 0.0-1.0,
      "recommendation": "string"
    }}
  ]
}}

INSTRUCTIONS:
- Resolve operational conflicts logically.
- Assign higher confidence to more recent or authoritative sources.
- Respond ONLY with valid JSON matching the output schema. No markdown, no explanation.
"""
    return prompt.strip()
