import logging
from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import Dict, Any
from ...agents.orchestrator import AntigravityOrchestrator, PipelineExecutionError
from ...services.supabase_client import supabase_service
import uuid

router = APIRouter(prefix="/scenarios", tags=["analyze"])
logger = logging.getLogger(__name__)
analysis_errors: Dict[str, Dict[str, Any]] = {}

async def run_orchestration_task(scenario_id: str):
    """
    Background worker to execute the multi-agent pipeline.
    """
    orchestrator = AntigravityOrchestrator()
    try:
        # Update status to analyzing
        supabase_service.client.table("scenarios").update({"status": "analyzing"}).eq("id", scenario_id).execute()
        analysis_errors.pop(scenario_id, None)
        
        # Run pipeline
        await orchestrator.run_full_pipeline(scenario_id)
        
        # Update status to complete
        supabase_service.client.table("scenarios").update({"status": "complete"}).eq("id", scenario_id).execute()
        logger.info(f"Analysis complete for scenario {scenario_id}")
        
    except PipelineExecutionError as e:
        logger.error(f"Background task failed for scenario {scenario_id}: {e}")
        analysis_errors[scenario_id] = {
            "error_code": e.code,
            "error_message": str(e),
            "retry_after_seconds": e.retry_after_seconds,
        }
        supabase_service.client.table("scenarios").update({"status": "error"}).eq("id", scenario_id).execute()
    except Exception as e:
        logger.error(f"Background task failed for scenario {scenario_id}: {e}")
        analysis_errors[scenario_id] = {
            "error_code": "pipeline_execution_failed",
            "error_message": str(e),
            "retry_after_seconds": None,
        }
        supabase_service.client.table("scenarios").update({"status": "error"}).eq("id", scenario_id).execute()

@router.post("/{scenario_id}/analyze")
async def analyze_scenario(scenario_id: str, background_tasks: BackgroundTasks) -> Dict[str, Any]:
    """
    Triggers the multi-agent AI analysis pipeline for a specific scenario.
    Returns immediately with a task ID while the analysis runs in the background.
    """
    # 1. Verify scenario exists
    scenario = await supabase_service.fetch_rows("scenarios", {"id": scenario_id})
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")

    # 2. Check if already analyzing
    if scenario[0].get("status") == "analyzing":
        return {"task_id": str(uuid.uuid4()), "status": "already_running"}

    # 3. Queue the background task
    background_tasks.add_task(run_orchestration_task, scenario_id)
    
    return {
        "task_id": str(uuid.uuid4()),
        "status": "started",
        "scenario_id": scenario_id
    }

@router.get("/{scenario_id}/status")
async def get_analysis_status(scenario_id: str) -> Dict[str, Any]:
    """
    Returns the current analysis status for a scenario.
    """
    scenario = await supabase_service.fetch_rows("scenarios", {"id": scenario_id})
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")

    status = scenario[0].get("status", "pending")

    response = {
        "status": status,
        "progress_pct": 100 if status == "complete" else 0,
        "current_agent": "completed" if status == "complete" else "pending",
    }

    if status == "error":
        response.update(
            analysis_errors.get(
                scenario_id,
                {
                    "error_code": "pipeline_execution_failed",
                    "error_message": "Analysis failed on the backend.",
                    "retry_after_seconds": None,
                },
            )
        )

    return response
