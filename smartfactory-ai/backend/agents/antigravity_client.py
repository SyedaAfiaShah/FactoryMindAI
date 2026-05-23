import logging
import os
import time
from datetime import datetime
from typing import Dict, Any, List

# Try importing vertexai and ReasoningEngine
try:
    import vertexai
    from vertexai.preview.reasoning_engines import ReasoningEngine
    VERTEXAI_AVAILABLE = True
except ImportError:
    VERTEXAI_AVAILABLE = False

from agents.gemini_client import GeminiClient, GeminiQuotaError
from services.supabase_client import supabase_service
from agents.prompt_builder import build_scenario_payload

# Import agent prompt builders
from agents.agent_machine_health import build_agent1_prompt
from agents.agent_contradiction import build_agent2_prompt
from agents.agent_demand import build_agent3_prompt
from agents.agent_action_planner import build_agent4_prompt
from agents.agent_simulator import build_agent5_prompt

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
        
        self.project_id = os.getenv("GOOGLE_PROJECT_ID")
        self.location = os.getenv("VERTEX_AI_LOCATION", "us-central1")
        self.agent_engine_id = os.getenv("ANTIGRAVITY_AGENT_ENGINE_ID")
        
        self.engine = None
        if VERTEXAI_AVAILABLE and self.project_id and self.agent_engine_id:
            try:
                vertexai.init(project=self.project_id, location=self.location)
                self.engine = ReasoningEngine(self.agent_engine_id)
                logger.info(f"Initialized Vertex AI Agent Engine with ID: {self.agent_engine_id}")
            except Exception as e:
                logger.error(f"Failed to initialize Vertex AI ReasoningEngine: {e}. Falling back to direct Gemini Client.")
        else:
            logger.info("Vertex AI not configured or not available. Using direct Gemini Client fallback.")

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
            health_output = await self._generate_response("machine_health", p1, fast=True)
            await self._save_trace(scenario_id, "machine_health", p1, health_output)
            agent_traces.append({"agent": "machine_health", "output": health_output})

            # Step 2: Contradiction Detection Agent
            logger.info("Agent 2: Detecting Contradictions...")
            p2 = build_agent2_prompt(context, health_output)
            contradiction_output = await self._generate_response("contradiction_detection", p2, fast=True)
            await self._save_trace(scenario_id, "contradiction_detection", p2, contradiction_output)
            agent_traces.append({"agent": "contradiction_detection", "output": contradiction_output})

            # Step 3: Demand Forecast Agent
            logger.info("Agent 3: Forecasting Demand...")
            p3 = build_agent3_prompt(context, health_output, contradiction_output)
            demand_output = await self._generate_response("demand_forecast", p3, fast=True)
            await self._save_trace(scenario_id, "demand_forecast", p3, demand_output)
            agent_traces.append({"agent": "demand_forecast", "output": demand_output})

            # Step 4: Action Planning Agent
            logger.info("Agent 4: Planning Actions...")
            p4 = build_agent4_prompt(health_output, contradiction_output, demand_output)
            actions_output = await self._generate_response("action_planning", p4)
            await self._save_trace(scenario_id, "action_planning", p4, actions_output)
            agent_traces.append({"agent": "action_planning", "output": actions_output})

            # Step 5: Simulation Agent
            logger.info("Agent 5: Simulating Outcomes...")
            p5 = build_agent5_prompt(context, actions_output, {"health": health_output, "demand": demand_output})
            simulation_output = await self._generate_response("simulation", p5)
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

            # Store all results in respective Supabase tables as requested by Prompt 3
            await self._store_results_in_tables(scenario_id, result)

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

    async def _generate_response(self, agent_name: str, prompt: str, fast: bool = False) -> Dict[str, Any]:
        """Helper to generate response, handling Vertex AI Reasoning Engine or fallback."""
        if self.engine:
            # Execute via ReasoningEngine with exponential backoff / retry logic (max 3 retries)
            for attempt in range(3):
                try:
                    # In vertexai reasoning engine, sessions are used or query/send_message
                    response = self.engine.query(input=prompt)
                    if isinstance(response, str):
                        return self.gemini._parse_json_response(response)
                    elif isinstance(response, dict):
                        return response
                except Exception as e:
                    logger.warning(f"ReasoningEngine attempt {attempt+1} failed: {e}")
                    if attempt == 2:
                        logger.error("ReasoningEngine failed after 3 attempts. Falling back to direct Gemini client...")
                    else:
                        # Exponential backoff: sleep for 2, 4 seconds
                        time.sleep(2 ** (attempt + 1))
        
        # Fallback to direct GeminiClient
        # Use fast/lite models for simpler agents (1-3), full model for agents 4-5
        if fast:
            return await self.gemini.generate_json_fast(prompt)
        return await self.gemini.generate_json(prompt)

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

    async def _store_results_in_tables(self, scenario_id: str, results: Dict[str, Any]) -> None:
        """Stores the parsed agent results into their respective Supabase tables in parallel batches."""
        import asyncio
        sem = asyncio.Semaphore(1)

        async def safe_insert(table: str, data: Dict[str, Any]) -> Dict[str, Any]:
            async with sem:
                return await self.supabase.insert_row(table, data)

        try:
            # Step 1: Insert Insights, Contradictions, and Actions in parallel
            primary_tasks = []
            
            # 1a. Insights
            for insight in results.get("insights", []):
                severity_map = {"critical": "critical", "high": "high", "medium": "medium", "low": "low"}
                severity = severity_map.get(insight.get("urgency", "").lower(), "medium")
                primary_tasks.append(safe_insert("insights", {
                    "scenario_id": scenario_id,
                    "category": "machine_health",
                    "severity": severity,
                    "title": f"Machine health risk for {insight.get('machine_id')}",
                    "description": f"Anomalies: {', '.join(insight.get('anomalies', []))}. Evidence: {', '.join(insight.get('evidence', []))}",
                    "evidence": insight,
                    "confidence": 0.9,
                    "machine_id": insight.get("machine_id"),
                    "created_at": datetime.utcnow().isoformat()
                }))

            # Also add Demand Forecast as an insight
            demand_data = results.get("demand_forecast", {})
            if demand_data:
                primary_tasks.append(safe_insert("insights", {
                    "scenario_id": scenario_id,
                    "category": "demand",
                    "severity": "high" if float(demand_data.get("stockout_risk_pct", 0)) >= 50 else "medium",
                    "title": "Production Demand and Supply Gap Forecast",
                    "description": f"Demand Delta: {demand_data.get('demand_delta_pct')}%, Stockout Risk: {demand_data.get('stockout_risk_pct')}%, Raw Material Runway: {demand_data.get('raw_material_days')} days.",
                    "evidence": demand_data,
                    "confidence": 0.85,
                    "created_at": datetime.utcnow().isoformat()
                }))

            # 1b. Contradictions
            for contra in results.get("contradictions", []):
                primary_tasks.append(safe_insert("contradictions", {
                    "scenario_id": scenario_id,
                    "field_name": contra.get("field"),
                    "source_a_name": "Source A",
                    "source_a_value": contra.get("source_a"),
                    "source_a_timestamp": datetime.utcnow().isoformat(),
                    "source_b_name": "Source B",
                    "source_b_value": contra.get("source_b"),
                    "source_b_timestamp": datetime.utcnow().isoformat(),
                    "resolution": f"{contra.get('resolution')}. Recommendation: {contra.get('recommendation')}",
                    "confidence": float(contra.get("confidence", 0.8)),
                    "created_at": datetime.utcnow().isoformat()
                }))

            # 1c. Actions
            actions = results.get("actions", [])
            action_start_idx = len(primary_tasks)
            for action in actions:
                primary_tasks.append(safe_insert("actions", {
                    "scenario_id": scenario_id,
                    "action_code": action.get("id"),
                    "title": action.get("title"),
                    "description": action.get("description"),
                    "priority": int(action.get("priority", 3)),
                    "category": action.get("category", "maintenance").lower(),
                    "effort_hours": int(action.get("effort_hours", 2)),
                    "cost_estimate": float(action.get("cost_estimate", 0.0)),
                    "currency": "USD",
                    "target_system": action.get("target_system"),
                    "status": "recommended",
                    "created_at": datetime.utcnow().isoformat()
                }))
            
            # Execute primary tasks
            primary_results = await asyncio.gather(*primary_tasks, return_exceptions=True)
            
            # Log any exceptions
            for idx, r in enumerate(primary_results):
                if isinstance(r, Exception):
                    logger.error(f"Error during primary database insertion at index {idx}: {r}")

            # Build action map
            action_map = {}
            inserted_actions = primary_results[action_start_idx : action_start_idx + len(actions)]
            for action, inserted_action in zip(actions, inserted_actions):
                if inserted_action and not isinstance(inserted_action, Exception) and "id" in inserted_action:
                    action_map[action.get("id")] = inserted_action["id"]

            # Step 2: Insert Action Steps and Simulations in parallel
            secondary_tasks = []
            
            # 2a. Action Steps
            for action in actions:
                internal_action_id = action_map.get(action.get("id"))
                if internal_action_id:
                    for idx, step_desc in enumerate(action.get("steps", [])):
                        secondary_tasks.append(safe_insert("action_steps", {
                            "action_id": internal_action_id,
                            "step_order": idx + 1,
                            "description": step_desc,
                            "target_actor": "Maintenance Team",
                            "estimated_duration_min": 30,
                            "created_at": datetime.utcnow().isoformat()
                        }))
            
            # 2b. Simulations
            simulations = results.get("simulation", [])
            sim_start_idx = len(secondary_tasks)
            for sim in simulations:
                action_code = sim.get("action_id")
                internal_action_id = action_map.get(action_code)
                
                # Standardize states
                before = sim.get("before_state", {})
                after = sim.get("after_state", {})
                
                before_std = {
                    "risk_score": before.get("risk_score"),
                    "production_efficiency": before.get("production_pct"),
                    "daily_cost": before.get("cost_per_day")
                }
                after_std = {
                    "risk_score": after.get("risk_score"),
                    "production_efficiency": after.get("production_pct"),
                    "daily_cost": after.get("cost_per_day")
                }
                
                secondary_tasks.append(safe_insert("simulations", {
                    "scenario_id": scenario_id,
                    "action_id": internal_action_id,
                    "before_state": before_std,
                    "after_state": after_std,
                    "delta": {
                        "risk_reduction": float(after.get("risk_score", 0)) - float(before.get("risk_score", 0)),
                        "efficiency_gain": float(after.get("production_pct", 0)) - float(before.get("production_pct", 0)),
                        "cost_saving": float(after.get("cost_per_day", 0)) - float(before.get("cost_per_day", 0))
                    },
                    "execution_log": [{"timestamp": datetime.utcnow().strftime('%H:%M:%S'), "message": step} for step in sim.get("execution_steps", [])],
                    "created_at": datetime.utcnow().isoformat()
                }))
            
            secondary_results = await asyncio.gather(*secondary_tasks, return_exceptions=True)
            
            # Log any exceptions
            for idx, r in enumerate(secondary_results):
                if isinstance(r, Exception):
                    logger.error(f"Error during secondary database insertion at index {idx}: {r}")

            # Build simulation list mapping
            inserted_sims = secondary_results[sim_start_idx : sim_start_idx + len(simulations)]

            # Step 3: Insert Notifications in parallel
            notification_tasks = []
            for sim, inserted_sim in zip(simulations, inserted_sims):
                if inserted_sim and not isinstance(inserted_sim, Exception) and "id" in inserted_sim:
                    action_code = sim.get("action_id")
                    # Store notifications
                    for notif in results.get("notifications", []):
                        notification_tasks.append(safe_insert("notifications", {
                            "simulation_id": inserted_sim["id"],
                            "channel": notif.get("channel", "Email"),
                            "recipient_role": notif.get("recipient"),
                            "recipient_name": notif.get("recipient"),
                            "message_body": notif.get("message"),
                            "subject": f"SmartFactory AI Alert: Action {action_code}",
                            "sent_at": datetime.utcnow().isoformat(),
                            "created_at": datetime.utcnow().isoformat()
                        }))
            
            if notification_tasks:
                notification_results = await asyncio.gather(*notification_tasks, return_exceptions=True)
                for idx, r in enumerate(notification_results):
                    if isinstance(r, Exception):
                        logger.error(f"Error during notification database insertion at index {idx}: {r}")

        except Exception as e:
            logger.error(f"Failed to store structured results in tables: {e}")
