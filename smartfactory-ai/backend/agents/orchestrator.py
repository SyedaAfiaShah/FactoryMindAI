import logging
import time
from datetime import datetime
from typing import Dict, Any
from .gemini_client import GeminiClient, GeminiQuotaError
from ..services.supabase_client import supabase_service
from .prompt_builder import build_scenario_payload

# Import agent prompt builders
from .agent_machine_health import build_agent1_prompt
from .agent_contradiction import build_agent2_prompt
from .agent_demand import build_agent3_prompt
from .agent_action_planner import build_agent4_prompt
from .agent_simulator import build_agent5_prompt

logger = logging.getLogger(__name__)

AGENT_NUMBERS = {
    "machine_health": 1,
    "contradiction_detection": 2,
    "demand_forecast": 3,
    "action_planning": 4,
    "simulation": 5,
}


class PipelineExecutionError(Exception):
    def __init__(self, message: str, code: str = "pipeline_execution_failed", retry_after_seconds: int | None = None):
        super().__init__(message)
        self.code = code
        self.retry_after_seconds = retry_after_seconds

class AntigravityOrchestrator:
    def __init__(self):
        self.gemini = GeminiClient()
        self.supabase = supabase_service

    async def run_full_pipeline(self, scenario_id: str) -> Dict[str, Any]:
        """
        Runs the multi-agent orchestration pipeline sequentially.
        """
        start_time = time.time()
        logger.info(f"Starting pipeline for scenario: {scenario_id}")
        
        agent_traces = []
        
        try:
            # Step 0: Build Context
            context = await build_scenario_payload(scenario_id)
            
            # Step 1: Machine Health Agent
            logger.info("Agent 1: Analyzing Machine Health...")
            p1 = build_agent1_prompt(context)
            health_output = await self.gemini.generate_json_fast(p1)
            await self._save_trace(scenario_id, "machine_health", p1, health_output)
            agent_traces.append({"agent": "machine_health", "output": health_output})

            # Step 2: Contradiction Detection Agent
            logger.info("Agent 2: Detecting Contradictions...")
            p2 = build_agent2_prompt(context, health_output)
            contradiction_output = await self.gemini.generate_json_fast(p2)
            await self._save_trace(scenario_id, "contradiction_detection", p2, contradiction_output)
            agent_traces.append({"agent": "contradiction_detection", "output": contradiction_output})

            # Step 3: Demand Forecast Agent
            logger.info("Agent 3: Forecasting Demand...")
            p3 = build_agent3_prompt(context, health_output, contradiction_output)
            demand_output = await self.gemini.generate_json_fast(p3)
            await self._save_trace(scenario_id, "demand_forecast", p3, demand_output)
            agent_traces.append({"agent": "demand_forecast", "output": demand_output})

            # Step 4: Action Planning Agent
            logger.info("Agent 4: Planning Actions...")
            p4 = build_agent4_prompt(health_output, contradiction_output, demand_output)
            actions_output = await self.gemini.generate_json(p4)
            await self._save_trace(scenario_id, "action_planning", p4, actions_output)
            agent_traces.append({"agent": "action_planning", "output": actions_output})

            # Step 5: Simulation Agent
            logger.info("Agent 5: Simulating Outcomes...")
            p5 = build_agent5_prompt(context, actions_output, {"health": health_output, "demand": demand_output})
            simulation_output = await self.gemini.generate_json(p5)
            await self._save_trace(scenario_id, "simulation", p5, simulation_output)
            
            agent_traces.append({"agent": "simulation", "output": simulation_output})

            # Final Aggregate Result
            result = {
                "insights": health_output.get("risk_assessments", []),
                "contradictions": contradiction_output.get("contradictions", []),
                "demand_forecast": demand_output,
                "actions": actions_output.get("actions", []),
                "simulation": simulation_output.get("actions_simulated", []),
                "ml_predictions": context.get("ml_predictions", []),
                "source_overview": context.get("source_overview", {}),
                "notifications": simulation_output.get("notifications", []),
                "agent_traces": agent_traces,
                "execution_metadata": {
                    "scenario_id": scenario_id,
                    "total_time_seconds": round(time.time() - start_time, 2),
                    "status": "complete"
                }
            }

            return result

        except GeminiQuotaError as e:
            logger.error(f"Pipeline execution failed due to Gemini quota exhaustion: {e}")
            self.supabase.client.table("scenarios").update({"status": "error"}).eq("id", scenario_id).execute()
            raise PipelineExecutionError(
                str(e),
                code="gemini_quota_exceeded",
                retry_after_seconds=e.retry_after_seconds,
            ) from e
        except Exception as e:
            logger.error(f"Pipeline execution failed: {str(e)}")
            self.supabase.client.table("scenarios").update({"status": "error"}).eq("id", scenario_id).execute()
            raise PipelineExecutionError(str(e)) from e

    async def _save_trace(self, scenario_id: str, agent_name: str, prompt_sent: str, output: Dict[str, Any]):
        """Helper to save intermediate agent reasoning to Supabase."""
        base_payload = {
            "scenario_id": scenario_id,
            "agent_name": agent_name,
            "created_at": datetime.utcnow().isoformat()
        }
        full_payload = {
            **base_payload,
            "prompt_sent": prompt_sent,
            "raw_response": str(output),
            "parsed_output": output,
            "status": "success",
        }
        try:
            payload_with_num = {**full_payload, "agent_number": AGENT_NUMBERS.get(agent_name)}
            await self.supabase.insert_row("agent_traces", payload_with_num)
        except Exception as e:
            logger.warning(f"Failed to save trace with agent_number for {agent_name}: {e}. Retrying without agent_number...")
            try:
                await self.supabase.insert_row("agent_traces", full_payload)
            except Exception as e2:
                logger.warning(f"Failed to save trace without agent_number for {agent_name}: {e2}. Falling back to minimal trace...")
                try:
                    await self.supabase.insert_row("agent_traces", base_payload)
                except Exception as fallback_error:
                    logger.warning(f"Failed to save minimal trace for {agent_name}: {fallback_error}")
