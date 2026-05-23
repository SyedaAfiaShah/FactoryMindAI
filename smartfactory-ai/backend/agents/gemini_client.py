import os
import json
import asyncio
import logging
import re
import httpx
from google import genai
from typing import Any, Dict, List
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception
from dotenv import load_dotenv

# Resolve and load backend/.env explicitly
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
dotenv_path = os.path.join(backend_dir, ".env")
load_dotenv(dotenv_path, override=True)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class GeminiQuotaError(Exception):
    def __init__(self, message: str, retry_after_seconds: int | None = None):
        super().__init__(message)
        self.retry_after_seconds = retry_after_seconds


class GeminiClient:
    def __init__(self):
        # Resolve GOOGLE_APPLICATION_CREDENTIALS relative path to absolute
        creds_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        if creds_path and not os.path.isabs(creds_path):
            # Resolve relative to the backend directory
            resolved_path = os.path.join(backend_dir, creds_path)
            if os.path.exists(resolved_path):
                os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = resolved_path
                logger.info(f"Resolved GOOGLE_APPLICATION_CREDENTIALS relative path to absolute: {resolved_path}")
            else:
                # Try relative to workspace
                workspace_dir = os.path.dirname(backend_dir)
                workspace_resolved = os.path.join(workspace_dir, creds_path)
                if os.path.exists(workspace_resolved):
                    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = workspace_resolved
                    logger.info(f"Resolved GOOGLE_APPLICATION_CREDENTIALS relative path to absolute: {workspace_resolved}")

        # 1. Vertex AI setup (Prioritized)
        self.project_id = os.getenv("GOOGLE_PROJECT_ID")
        self.vertex_client = None
        if self.project_id:
            try:
                # Initialize Vertex AI client using the google-genai SDK
                self.vertex_client = genai.Client(vertexai=True, project=self.project_id, location="us-central1")
                logger.info(f"Initialized GeminiClient in Vertex AI mode using project: {self.project_id}")
            except Exception as e:
                logger.error(f"Failed to initialize Vertex AI client: {str(e)}")
        else:
            logger.warning("GOOGLE_PROJECT_ID not found. Vertex AI mode will be bypassed.")

        # 2. Developer API (AI Studio) setup
        self.api_key = os.getenv("GOOGLE_API_KEY")
        self.developer_client = None
        self.skip_developer_api = False
        if self.api_key:
            self.developer_client = genai.Client(api_key=self.api_key)
            logger.info("Initialized GeminiClient in Developer API mode using GOOGLE_API_KEY")
        else:
            logger.warning("GOOGLE_API_KEY not found. Developer API mode will be bypassed.")

        # 3. Groq setup
        self.groq_api_key = os.getenv("GROQ_API_KEY")
        if self.groq_api_key:
            logger.info("Groq API configuration detected via GROQ_API_KEY")
        else:
            logger.warning("GROQ_API_KEY not found. Groq fallback will be bypassed unless key is supplied later.")

        self.model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
        self.model_fallbacks: List[str] = []
        for candidate in [
            self.model_name,
            "gemini-2.5-flash-lite",
            "gemini-2.0-flash-lite",
            "gemini-2.0-flash",
        ]:
            if candidate not in self.model_fallbacks:
                self.model_fallbacks.append(candidate)

    def _is_quota_error(self, error: Exception) -> bool:
        message = str(error)
        return (
            "429" in message
            or "RESOURCE_EXHAUSTED" in message
            or "quota" in message.lower()
            or "rate limit" in message.lower()
        )

    def _extract_retry_after_seconds(self, error: Exception) -> int | None:
        message = str(error)
        match = re.search(r"retry in ([\d.]+)s", message, re.IGNORECASE)
        if not match:
            return None

        try:
            return max(1, int(float(match.group(1))))
        except ValueError:
            return None

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception(lambda exc: not isinstance(exc, GeminiQuotaError)),
        before_sleep=lambda retry_state: logger.warning(f"Retrying multi-provider AI call... Attempt {retry_state.attempt_number}")
    )
    async def generate_json_fast(self, prompt: str) -> Dict[str, Any]:
        """
        Faster JSON generation using lightweight models (gemini-2.0-flash-lite first).
        Best for simpler agents (1, 2, 3) where speed matters more than reasoning depth.
        Falls back to the standard generate_json pipeline if fast models fail.
        """
        loop = asyncio.get_event_loop()
        fast_models = ["gemini-2.0-flash-lite", "gemini-2.0-flash", "gemini-2.5-flash-lite"]

        # Try fast models via Developer API first
        if self.developer_client and not self.skip_developer_api:
            for model_name in fast_models:
                try:
                    response = await loop.run_in_executor(
                        None,
                        lambda current_model=model_name: self.developer_client.models.generate_content(
                            model=current_model,
                            contents=prompt,
                            config=genai.types.GenerateContentConfig(
                                automatic_function_calling=genai.types.AutomaticFunctionCallingConfig(
                                    maximum_remote_calls=1
                                )
                            )
                        )
                    )
                    if response and response.text:
                        logger.info(f"Fast generation succeeded using AI Studio model: {model_name}")
                        return self._parse_json_response(response.text)
                except Exception as model_error:
                    if self._is_quota_error(model_error):
                        logger.warning(f"Fast model {model_name} quota hit. Trying next.")
                        self.skip_developer_api = True
                        break
                    logger.warning(f"Fast model {model_name} failed: {str(model_error)}. Trying next.")
                    continue

        # Fall back to the full standard pipeline
        return await self.generate_json(prompt)

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception(lambda exc: not isinstance(exc, GeminiQuotaError)),
        before_sleep=lambda retry_state: logger.warning(f"Retrying multi-provider AI call... Attempt {retry_state.attempt_number}")
    )
    async def generate_json(self, prompt: str) -> Dict[str, Any]:
        """
        Generates a JSON response, falling back dynamically:
        1. Google AI Studio (Developer API - Prioritized)
        2. Vertex AI API
        3. Groq API
        """
        loop = asyncio.get_event_loop()
        last_error = None

        # ----------------- OPTION 1: Google AI Studio (Developer API) -----------------
        if self.developer_client and not self.skip_developer_api:
            logger.info("Attempting generation via Google AI Studio Developer API...")
            for model_name in self.model_fallbacks:
                try:
                    response = await loop.run_in_executor(
                        None,
                        lambda current_model=model_name: self.developer_client.models.generate_content(
                            model=current_model,
                            contents=prompt,
                            config=genai.types.GenerateContentConfig(
                                automatic_function_calling=genai.types.AutomaticFunctionCallingConfig(
                                    maximum_remote_calls=1
                                )
                            )
                        )
                    )
                    if response and response.text:
                        self.model_name = model_name
                        logger.info(f"Successfully generated JSON using AI Studio model: {model_name}")
                        return self._parse_json_response(response.text)
                except Exception as model_error:
                    last_error = model_error
                    if self._is_quota_error(model_error):
                        logger.warning(f"AI Studio Model {model_name} failed due to quota. Disabling AI Studio for this pipeline run.")
                        self.skip_developer_api = True
                        break  # Skip the rest of the AI studio models
                    logger.warning(f"AI Studio Model {model_name} failed: {str(model_error)}. Trying next model/provider.")
                    continue

        # ----------------- OPTION 2: Vertex AI -----------------
        if self.vertex_client:
            logger.info("Attempting generation via Vertex AI API...")
            for model_name in ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash"]:
                try:
                    response = await loop.run_in_executor(
                        None,
                        lambda current_model=model_name: self.vertex_client.models.generate_content(
                            model=current_model,
                            contents=prompt,
                            config=genai.types.GenerateContentConfig(
                                automatic_function_calling=genai.types.AutomaticFunctionCallingConfig(
                                    maximum_remote_calls=1
                                )
                            )
                        )
                    )
                    if response and response.text:
                        logger.info(f"Successfully generated JSON using Vertex AI model: {model_name}")
                        return self._parse_json_response(response.text)
                except Exception as vertex_error:
                    last_error = vertex_error
                    logger.warning(f"Vertex AI Model {model_name} failed: {str(vertex_error)}. Trying next model/provider.")
                    continue

        # ----------------- OPTION 3: Groq API fallback -----------------
        self.groq_api_key = self.groq_api_key or os.getenv("GROQ_API_KEY")
        if self.groq_api_key:
            logger.info("Attempting generation via Groq API (llama-3.3-70b-versatile)...")
            try:
                async with httpx.AsyncClient(timeout=60.0) as http_client:
                    groq_response = await http_client.post(
                        "https://api.groq.com/openai/v1/chat/completions",
                        headers={
                            "Authorization": f"Bearer {self.groq_api_key}",
                            "Content-Type": "application/json",
                        },
                        json={
                            "model": "llama-3.3-70b-versatile",
                            "messages": [
                                {
                                    "role": "system",
                                    "content": "You are a factory analytics assistant. You MUST return valid JSON matching the requested schema. Do not output any preamble or conversational text, only return the JSON object."
                                },
                                {"role": "user", "content": prompt}
                            ],
                            "response_format": {"type": "json_object"},
                            "temperature": 0.1,
                        }
                    )
                    
                    if groq_response.status_code == 200:
                        result_data = groq_response.json()
                        content_text = result_data["choices"][0]["message"]["content"]
                        logger.info("Successfully generated JSON using Groq API.")
                        return self._parse_json_response(content_text)
                    else:
                        logger.error(f"Groq API returned error status {groq_response.status_code}: {groq_response.text}")
                        last_error = Exception(f"Groq API failed with status {groq_response.status_code}")
            except Exception as groq_error:
                last_error = groq_error
                logger.error(f"Groq fallback failed: {str(groq_error)}")

        # If everything failed, raise quota exhaustion or last exception
        if last_error and self._is_quota_error(last_error):
            retry_after_seconds = self._extract_retry_after_seconds(last_error)
            raise GeminiQuotaError(
                "All configured multi-provider AI options (Vertex AI, AI Studio, Groq) failed or are currently quota-limited."
                if retry_after_seconds is None
                else f"All configured multi-provider AI options failed. Retry after about {retry_after_seconds} seconds.",
                retry_after_seconds=retry_after_seconds,
            )

        raise last_error or ValueError("All configured AI providers (Vertex AI, AI Studio, Groq) failed to generate content.")

    def _parse_json_response(self, text: str) -> Dict[str, Any]:
        text = text.strip()
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()

        try:
            data = json.loads(text)
            return data
        except json.JSONDecodeError as e:
            logger.error(f"Malformed JSON: {text}")
            raise ValueError(f"Failed to parse AI response as JSON: {str(e)}")
