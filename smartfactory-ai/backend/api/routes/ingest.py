import csv
import io
from pathlib import Path
from typing import List

import pandas as pd
from fastapi import APIRouter, File, HTTPException, Query, UploadFile

from services.supabase_client import supabase_service
from api.models.scenario import DefaultSensorDatasetRequest, IngestTextRequest

router = APIRouter(prefix="/scenarios", tags=["ingest"])

REQUIRED_SENSOR_COLUMNS = [
    "UDI",
    "Product ID",
    "Type",
    "Air temperature [K]",
    "Process temperature [K]",
    "Rotational speed [rpm]",
    "Torque [Nm]",
    "Tool wear [min]",
    "Target",
]

SCENARIO_CONFIGS = {
    "overstrain_failure": {
        "title": "Overstrain risk on high-load spindle",
        "description": "High torque, falling RPM, and elevated wear indicate the machine is operating beyond its safe load window.",
        "adjustments": {
            "Torque [Nm]": 24.0,
            "Rotational speed [rpm]": -420.0,
            "Tool wear [min]": 55.0,
            "Process temperature [K]": 8.0,
        },
    },
    "heat_dissipation_failure": {
        "title": "Cooling degradation and overheating",
        "description": "Process temperature is rising faster than ambient conditions, which matches a heat dissipation failure pattern.",
        "adjustments": {
            "Air temperature [K]": 4.5,
            "Process temperature [K]": 18.0,
            "Rotational speed [rpm]": -180.0,
            "Torque [Nm]": 12.0,
        },
    },
    "tool_wear_failure": {
        "title": "Progressive tool wear causing quality loss",
        "description": "Tool wear has accumulated and torque instability suggests the cutter is close to replacement threshold.",
        "adjustments": {
            "Tool wear [min]": 95.0,
            "Torque [Nm]": 15.0,
            "Rotational speed [rpm]": -260.0,
            "Process temperature [K]": 6.0,
        },
    },
}


def _dataset_path() -> Path:
    return Path(__file__).parents[3] / "data" / "ai4i2020.csv"


def _machine_product_id(machine_id: str) -> str:
    cleaned = "".join(ch for ch in machine_id if ch.isdigit()) or machine_id.replace(" ", "")
    return f"MACHINE-{cleaned}"


def _load_scenario_rows(machine_id: str, scenario_type: str, sample_size: int) -> List[dict]:
    dataset = pd.read_csv(_dataset_path())
    config = SCENARIO_CONFIGS[scenario_type]
    base_rows = dataset[dataset["Machine failure"] == 1].head(sample_size).copy()
    if base_rows.empty:
        base_rows = dataset.head(sample_size).copy()

    product_id = _machine_product_id(machine_id)
    base_rows.loc[:, "Product ID"] = product_id
    base_rows.loc[:, "Target"] = 1

    for column, delta in config["adjustments"].items():
        if column in base_rows.columns:
            base_rows.loc[:, column] = (base_rows[column].astype(float) + delta).round(3)

    base_rows.loc[:, "Air temperature [K]"] = base_rows["Air temperature [K]"].clip(lower=285, upper=330)
    base_rows.loc[:, "Process temperature [K]"] = base_rows["Process temperature [K]"].clip(lower=295, upper=360)
    base_rows.loc[:, "Rotational speed [rpm]"] = base_rows["Rotational speed [rpm]"].clip(lower=900, upper=3200)
    base_rows.loc[:, "Torque [Nm]"] = base_rows["Torque [Nm]"].clip(lower=5, upper=120)
    base_rows.loc[:, "Tool wear [min]"] = base_rows["Tool wear [min]"].clip(lower=0, upper=260)

    rows = base_rows[REQUIRED_SENSOR_COLUMNS].to_dict(orient="records")
    for row in rows:
        row["machine_id"] = machine_id
        row["scenario_type"] = scenario_type
        row["dataset_source"] = "ai4i"
        row["scenario_label"] = config["title"]
        row["scenario_summary"] = config["description"]
    return rows


def _generate_synthetic_rows(machine_id: str, scenario_type: str, sample_size: int) -> List[dict]:
    config = SCENARIO_CONFIGS[scenario_type]
    type_map = {
        "overstrain_failure": "H",
        "heat_dissipation_failure": "M",
        "tool_wear_failure": "L",
    }
    rows: List[dict] = []
    product_id = _machine_product_id(machine_id)

    for index in range(sample_size):
        air_temp = 296.0 + (index * 0.25)
        process_temp = air_temp + 10.5 + (index * 0.4)
        rpm = 1580 - (index * 22)
        torque = 38.0 + (index * 1.8)
        tool_wear = 75 + (index * 7)

        if scenario_type == "overstrain_failure":
            torque += 18 + (index * 1.2)
            rpm -= 140 + (index * 8)
            tool_wear += 22
        elif scenario_type == "heat_dissipation_failure":
            air_temp += 2.8
            process_temp += 10 + (index * 0.8)
            torque += 8
        elif scenario_type == "tool_wear_failure":
            tool_wear += 65 + (index * 3)
            torque += 11 + (index * 0.6)
            rpm -= 70 + (index * 5)

        row = {
            "UDI": index + 1,
            "Product ID": product_id,
            "Type": type_map[scenario_type],
            "Air temperature [K]": round(min(max(air_temp, 285), 330), 3),
            "Process temperature [K]": round(min(max(process_temp, 295), 360), 3),
            "Rotational speed [rpm]": int(min(max(rpm, 900), 3200)),
            "Torque [Nm]": round(min(max(torque, 5), 120), 3),
            "Tool wear [min]": int(min(max(tool_wear, 0), 260)),
            "Target": 1 if index >= max(sample_size - 4, 0) else 0,
            "machine_id": machine_id,
            "scenario_type": scenario_type,
            "dataset_source": "synthetic",
            "scenario_label": config["title"],
            "scenario_summary": config["description"],
        }
        rows.append(row)

    return rows


def _generate_failure_demo_rows(machine_id: str, scenario_type: str, sample_size: int) -> List[dict]:
    rows = _generate_synthetic_rows(machine_id, scenario_type, sample_size)
    for index, row in enumerate(rows):
        row["Target"] = 1
        row["dataset_source"] = "failure_demo"
        row["Process temperature [K]"] = round(min(float(row["Process temperature [K]"]) + 12 + index * 0.9, 360), 3)
        row["Torque [Nm]"] = round(min(float(row["Torque [Nm]"]) + 18 + index * 1.1, 120), 3)
        row["Rotational speed [rpm]"] = int(max(int(row["Rotational speed [rpm]"]) - 180 - index * 12, 900))
        row["Tool wear [min]"] = int(min(int(row["Tool wear [min]"]) + 35 + index * 4, 260))
        row["scenario_label"] = "Forced failure verification demo"
        row["scenario_summary"] = "Deliberately severe telemetry to validate insights, contradictions, actions, and simulator outputs."
    return rows


@router.post("/{id}/ingest/sensor")
async def ingest_sensor_data(
    id: str,
    file: UploadFile = File(...),
) -> dict:
    """Ingests sensor data from a CSV file."""
    if not file.filename.endswith(".csv"):
        raise HTTPException(
            status_code=400,
            detail={
                "error": "Bad Request",
                "detail": "File must be a CSV",
                "code": "INVALID_FILE_TYPE",
            },
        )

    try:
        content = await file.read()
        stream = io.StringIO(content.decode("utf-8"))
        reader = csv.DictReader(stream)

        if not all(col in reader.fieldnames for col in REQUIRED_SENSOR_COLUMNS):
            missing = [col for col in REQUIRED_SENSOR_COLUMNS if col not in reader.fieldnames]
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "Validation Error",
                    "detail": f"Missing columns: {', '.join(missing)}",
                    "code": "MISSING_COLUMNS",
                },
            )

        rows = list(reader)
        await supabase_service.insert_row(
            "data_sources",
            {
                "scenario_id": id,
                "source_type": "sensor_csv",
                "parsed_data": rows,
            },
        )

        return {
            "status": "success",
            "rows_processed": len(rows),
            "scenario_id": id,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Internal Server Error",
                "detail": str(e),
                "code": "INGESTION_ERROR",
            },
        )


@router.post("/{id}/ingest/sensor/default")
async def ingest_default_sensor_data(
    id: str,
    request: DefaultSensorDatasetRequest,
) -> dict:
    """Loads server-side demo sensor rows for a specific machine and failure scenario."""
    try:
        if request.dataset_source == "failure_demo":
            rows = _generate_failure_demo_rows(request.machine_id, request.scenario_type, request.sample_size)
        elif request.dataset_source == "synthetic":
            rows = _generate_synthetic_rows(request.machine_id, request.scenario_type, request.sample_size)
        else:
            rows = _load_scenario_rows(request.machine_id, request.scenario_type, request.sample_size)

        await supabase_service.insert_row(
            "data_sources",
            {
                "scenario_id": id,
                "source_type": "sensor_csv",
                "parsed_data": rows,
            },
        )
        await supabase_service.insert_row(
            "data_sources",
            {
                "scenario_id": id,
                "source_type": "operator_note",
                "raw_content": (
                    f"{request.machine_id} flagged under preset scenario {request.scenario_type} "
                    f"using {request.dataset_source} demo telemetry. Analyze the sensor stream, trained scaler behavior, and likely failure path."
                ),
            },
        )
        if request.dataset_source == "failure_demo":
            await supabase_service.insert_row(
                "data_sources",
                {
                    "scenario_id": id,
                    "source_type": "email",
                    "raw_content": f"Operations email says {request.machine_id} should stay online for urgent output, despite severe sensor alarms.",
                },
            )
            await supabase_service.insert_row(
                "data_sources",
                {
                    "scenario_id": id,
                    "source_type": "news",
                    "raw_content": "Expedite pressure is high due to a customer escalation and shortage of backup line capacity.",
                },
            )

        return {
            "status": "success",
            "scenario_id": id,
            "machine_id": request.machine_id,
            "scenario_type": request.scenario_type,
            "dataset_source": request.dataset_source,
            "rows_processed": len(rows),
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Internal Server Error",
                "detail": str(e),
                "code": "DEFAULT_SENSOR_INGESTION_ERROR",
            },
        )


@router.post("/{id}/ingest/text")
async def ingest_text_data(
    id: str,
    request: IngestTextRequest,
) -> dict:
    """Ingests text-based data such as notes, emails, and news."""
    try:
        data_to_insert = {
            "scenario_id": id,
            "source_type": request.type,
            "raw_content": request.content,
        }
        await supabase_service.insert_row("data_sources", data_to_insert)
        return {"status": "success", "scenario_id": id, "type": request.type}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Internal Server Error",
                "detail": str(e),
                "code": "INGESTION_ERROR",
            },
        )


@router.post("/{id}/ingest/csv")
async def ingest_generic_csv(
    id: str,
    type: str = Query(..., pattern="^(inventory|production|maintenance)$"),
    file: UploadFile = File(...),
) -> dict:
    """Ingests generic CSV data for inventory, production, or maintenance."""
    if not file.filename.endswith(".csv"):
        raise HTTPException(
            status_code=400,
            detail={
                "error": "Bad Request",
                "detail": "File must be a CSV",
                "code": "INVALID_FILE_TYPE",
            },
        )

    try:
        content = await file.read()
        stream = io.StringIO(content.decode("utf-8"))
        reader = csv.DictReader(stream)
        rows = list(reader)

        await supabase_service.insert_row(
            "data_sources",
            {
                "scenario_id": id,
                "source_type": f"generic_csv_{type}",
                "parsed_data": rows,
            },
        )

        return {
            "status": "success",
            "type": type,
            "rows_processed": len(rows),
            "scenario_id": id,
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Internal Server Error",
                "detail": str(e),
                "code": "INGESTION_ERROR",
            },
        )
