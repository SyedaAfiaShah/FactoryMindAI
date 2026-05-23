from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, ConfigDict, Field

class ScenarioCreate(BaseModel):
    """Model for creating a new scenario."""
    name: str = Field(..., description="The name of the industrial scenario")
    description: str = Field(..., description="A detailed description of the scenario")

class ScenarioResponse(BaseModel):
    """Model for scenario response data."""
    id: str = Field(..., description="Unique identifier for the scenario")
    name: str = Field(..., description="Name of the scenario")
    status: str = Field("pending", description="Current status of the scenario")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Timestamp when created")

    model_config = ConfigDict(from_attributes=True)

class IngestTextRequest(BaseModel):
    """Model for ingesting text-based data."""
    type: Literal["operator_note", "email", "news", "policy"] = Field(..., description="Type of text content")
    content: str = Field(..., description="The actual text content to ingest")


class DefaultSensorDatasetRequest(BaseModel):
    """Load server-side demo sensor data for a specific machine and scenario."""
    machine_id: str = Field(..., description="Factory machine identifier, e.g. Machine 1")
    scenario_type: Literal["overstrain_failure", "heat_dissipation_failure", "tool_wear_failure"] = Field(
        ..., description="Preset factory failure scenario"
    )
    dataset_source: Literal["ai4i", "synthetic", "failure_demo"] = Field(
        "ai4i", description="Whether to base the demo rows on AI4I records, generated synthetic data, or a forced failure demo"
    )
    sample_size: int = Field(12, ge=5, le=50, description="How many sensor rows to generate")
