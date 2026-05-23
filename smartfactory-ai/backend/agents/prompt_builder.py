import asyncio
from datetime import datetime
from collections import defaultdict
from typing import Any, Dict, List

from ml.model_registry import load_model
from services.supabase_client import supabase_service

SENSOR_INT_FIELDS = {
    "UDI",
    "Rotational speed [rpm]",
    "Tool wear [min]",
    "Target",
}

SENSOR_FLOAT_FIELDS = {
    "Air temperature [K]",
    "Process temperature [K]",
    "Torque [Nm]",
}


def _safe_int(value: Any) -> Any:
    if value in (None, ""):
        return value
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return value


def _safe_float(value: Any) -> Any:
    if value in (None, ""):
        return value
    try:
        return float(value)
    except (TypeError, ValueError):
        return value


def _normalize_sensor_row(row: Dict[str, Any]) -> Dict[str, Any]:
    normalized = dict(row)
    for field in SENSOR_INT_FIELDS:
        if field in normalized:
            normalized[field] = _safe_int(normalized[field])
    for field in SENSOR_FLOAT_FIELDS:
        if field in normalized:
            normalized[field] = _safe_float(normalized[field])
    return normalized


def _machine_key(row: Dict[str, Any]) -> str | None:
    machine_value = row.get("machine_id") or row.get("Machine ID") or row.get("Product ID")
    if machine_value in (None, ""):
        return None
    return str(machine_value)


def _machine_sensor_context(sensor_data: List[Dict[str, Any]], rows_per_machine: int = 5) -> tuple[List[str], List[Dict[str, Any]], List[Dict[str, Any]]]:
    grouped_rows: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    for row in sensor_data:
        machine_id = _machine_key(row)
        if machine_id:
            grouped_rows[machine_id].append(row)

    focus_machines = sorted(grouped_rows.keys())
    machine_summaries: List[Dict[str, Any]] = []
    recent_rows: List[Dict[str, Any]] = []

    for machine_id in focus_machines:
        machine_rows = grouped_rows[machine_id]
        latest_row = machine_rows[-1]
        machine_summaries.append(
            {
                "machine_id": machine_id,
                "row_count": len(machine_rows),
                "dataset_sources": sorted({row.get("dataset_source", "uploaded") for row in machine_rows}),
                "scenario_tags": sorted({row.get("scenario_type") for row in machine_rows if row.get("scenario_type")}),
                "latest_metrics": {
                    "air_temp_k": latest_row.get("Air temperature [K]"),
                    "process_temp_k": latest_row.get("Process temperature [K]"),
                    "rpm": latest_row.get("Rotational speed [rpm]"),
                    "torque_nm": latest_row.get("Torque [Nm]"),
                    "tool_wear_min": latest_row.get("Tool wear [min]"),
                    "target": latest_row.get("Target"),
                },
            }
        )
        recent_rows.extend(machine_rows[-rows_per_machine:])

    return focus_machines, machine_summaries, recent_rows


def _aggregate_predictions_by_machine(sensor_data: List[Dict[str, Any]], ml_results: List[Any]) -> List[Dict[str, Any]]:
    aggregated: Dict[str, Dict[str, Any]] = {}

    for row, result in zip(sensor_data, ml_results):
        prediction = result.model_dump()
        machine_id = _machine_key(row) or prediction.get("machine_id") or "Unknown"
        current = aggregated.get(machine_id)

        if current is None:
            aggregated[machine_id] = {
                **prediction,
                "machine_id": machine_id,
                "row_count": 1,
            }
            continue

        current["row_count"] += 1
        if float(prediction.get("risk_score", 0)) >= float(current.get("risk_score", 0)):
            aggregated[machine_id] = {
                **prediction,
                "machine_id": machine_id,
                "row_count": current["row_count"],
            }

    return sorted(
        aggregated.values(),
        key=lambda item: float(item.get("risk_score", 0)),
        reverse=True,
    )


def _append_text_bucket(bucket: List[Dict[str, Any]], source: Dict[str, Any]) -> None:
    bucket.append({
        "content": source.get("raw_content") or source.get("content") or "",
        "created_at": source.get("created_at"),
        "source_type": source.get("source_type"),
    })


async def build_scenario_payload(scenario_id: str) -> Dict[str, Any]:
    """
    Builds the agent context from the unified data_sources table and enriches it with
    predictions from the trained maintenance model.
    """
    scenario_rows, data_sources = await asyncio.gather(
        supabase_service.fetch_rows("scenarios", {"id": scenario_id}),
        supabase_service.fetch_rows("data_sources", {"scenario_id": scenario_id}),
    )

    scenario_info = scenario_rows[0] if scenario_rows else {}
    ordered_sources = sorted(data_sources, key=lambda row: row.get("created_at") or "")

    sensor_data: List[Dict[str, Any]] = []
    operator_notes: List[Dict[str, Any]] = []
    emails: List[Dict[str, Any]] = []
    inventory: List[Dict[str, Any]] = []
    news: List[Dict[str, Any]] = []
    policy: List[Dict[str, Any]] = []
    production: List[Dict[str, Any]] = []
    maintenance_records: List[Dict[str, Any]] = []

    for source in ordered_sources:
        source_type = source.get("source_type")
        payload = source.get("parsed_data") or source.get("payload") or []

        if source_type == "sensor_csv":
            sensor_data.extend(_normalize_sensor_row(row) for row in payload if isinstance(row, dict))
        elif source_type == "operator_note":
            _append_text_bucket(operator_notes, source)
        elif source_type == "email":
            _append_text_bucket(emails, source)
        elif source_type == "news":
            _append_text_bucket(news, source)
        elif source_type == "policy":
            _append_text_bucket(policy, source)
        elif source_type == "generic_csv_inventory":
            inventory.extend(payload)
        elif source_type == "generic_csv_production":
            production.extend(payload)
        elif source_type == "generic_csv_maintenance":
            maintenance_records.extend(payload)

    focus_machines, machine_summaries, recent_sensor_rows = _machine_sensor_context(sensor_data)

    ml_predictions: List[Dict[str, Any]] = []
    predictor = load_model("maintenance_predictor")
    if sensor_data and predictor and getattr(predictor, "scaler", None) is not None:
        try:
            ml_results = predictor.predict(sensor_data)
            ml_predictions = _aggregate_predictions_by_machine(sensor_data, ml_results)
        except Exception as exc:
            ml_predictions = [{"error": f"ML inference unavailable: {exc}"}]
    elif sensor_data:
        ml_predictions = [{"error": "ML model artifact unavailable"}]

    return {
        "scenario_id": scenario_id,
        "scenario_name": scenario_info.get("name", "Unknown"),
        "scenario_description": scenario_info.get("description", ""),
        "focus_machines": focus_machines,
        "machine_summaries": machine_summaries,
        "scenario_tags": sorted({row.get("scenario_type") for row in sensor_data if row.get("scenario_type")}),
        "sensor_data": recent_sensor_rows or sensor_data[-20:],
        "operator_notes": operator_notes,
        "emails": emails,
        "inventory": inventory,
        "news": news,
        "policy": policy,
        "production": production,
        "maintenance_records": maintenance_records,
        "ml_predictions": ml_predictions,
        "source_overview": {
            "sensor_rows": len(sensor_data),
            "machine_count": len(focus_machines),
            "operator_notes": len(operator_notes),
            "emails": len(emails),
            "inventory_rows": len(inventory),
            "news_items": len(news),
            "policy_items": len(policy),
            "production_rows": len(production),
            "maintenance_rows": len(maintenance_records),
        },
        "timestamps": {
            "retrieved_at": datetime.utcnow().isoformat(),
            "scenario_created_at": scenario_info.get("created_at"),
        },
    }
