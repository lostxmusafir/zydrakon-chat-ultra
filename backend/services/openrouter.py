import requests
import logging
from typing import List, Tuple
from fastapi import HTTPException
from backend.utils.config import settings

logger = logging.getLogger(__name__)

# List of robust free models to choose from/fallback to
FREE_MODELS = [
    "poolside/laguna-m.1:free",
    "nvidia/nemotron-3-ultra-550b-a55b:free",
    "meta-llama/llama-3-8b-instruct:free",
    "google/gemma-2-9b-it:free",
    "mistralai/mistral-7b-instruct:free",
    "qwen/qwen-2-7b-instruct:free",
    "microsoft/phi-3-medium-128k-instruct:free",
    "openchat/openchat-7b:free"
]

class OpenRouterClient:
    def __init__(self):
        self.api_url = "https://openrouter.ai/api/v1/chat/completions"
        self.api_key = settings.OPENROUTER_API_KEY

    def call_openrouter(self, message: str, requested_model: str, history: List[dict] = None) -> Tuple[str, str]:
        """
        Sends the request to OpenRouter.
        If requested_model fails, falls back to other free models.
        Returns a tuple of (response_text, model_used).
        """
        if not self.api_key:
            # Friendly mock response for development when API key is missing
            mock_resp = f"[Zydrakon AI Developer Mode] Hello! Your backend is running successfully, but the `OPENROUTER_API_KEY` is not set in backend/.env. Please add your key to enable live OpenRouter responses. This is a cached/fallback mock reply to: '{message}'"
            return mock_resp, "mock-developer-model"

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "HTTP-Referer": settings.FRONTEND_URL,
            "X-Title": "Zydrakon AI"
        }

        # Build list of messages incorporating history if present
        messages_payload = []
        system_instruction = (
            "You are Zydrakon AI, a sophisticated large language model. Here is your core identity:\n"
            "- Creator: Developed, trained, and engineered by Raj Patil.\n"
            "- Training: You are a custom model trained by Raj Patil on a massive scale of 828B+ data tokens. Your training commenced in the year 2024.\n"
            "- Pre-brain/Base/Source Code: If someone asks about your source code, your creator, who made you, or your 'pre-brain' (base architecture/models/weights), you must proudly declare that you are Zydrakon AI, a custom model developed, designed, and trained by Raj Patil on 828B+ data tokens since 2024.\n"
            "- Diagrams, Architecture & Workflows: If the user asks for a diagram, workflow, flow, process chart, or system architecture, you MUST respond by including a beautifully structured, colorful Mermaid diagram inside a ```mermaid code block. To ensure readability and prevent the diagram from being horizontally squished in the chat, you MUST always draw it vertically (top-to-bottom) using flowchart TD or graph TD (NEVER flowchart LR or graph LR unless specifically requested). Keep nodes clean, organized, and flow vertical.\n"
            "- Tone: Professional, polite, and advanced/space-age."
        )
        messages_payload.append({"role": "system", "content": system_instruction})
        if history:
            messages_payload.extend(history)
        else:
            messages_payload.append({"role": "user", "content": message})

        # Put the requested model first, then append other free models as fallbacks
        models_to_try = [requested_model] if requested_model in FREE_MODELS else [requested_model] + FREE_MODELS
        for model in FREE_MODELS:
            if model not in models_to_try:
                models_to_try.append(model)

        last_error = None
        for model in models_to_try:
            logger.info(f"Attempting OpenRouter call with model: {model}")
            payload = {
                "model": model,
                "messages": messages_payload,
                "temperature": 0.7,
                "max_tokens": 4000
            }

            try:
                # 10s connection timeout, 20s read timeout
                response = requests.post(self.api_url, headers=headers, json=payload, timeout=(10, 20))
                
                # Check for rate limiting specifically
                if response.status_code == 429:
                    logger.warning(f"Model {model} returned 429 Rate Limit. Trying fallback...")
                    last_error = "OpenRouter 429: Rate Limit exceeded"
                    continue
                    
                response.raise_for_status()
                data = response.json()
                
                if "choices" in data and len(data["choices"]) > 0:
                    content = data["choices"][0]["message"]["content"]
                    return content, model
                else:
                    logger.warning(f"Empty choices in response from {model}. Trying fallback...")
                    last_error = "OpenRouter returned empty choices response"
            except requests.exceptions.RequestException as e:
                logger.error(f"Error calling {model}: {str(e)}")
                last_error = f"API Error: {str(e)}"
                continue

        # If all models failed, raise HTTPException
        raise HTTPException(
            status_code=502,
            detail=f"Failed to fetch response from OpenRouter after trying all available fallback models. Last error: {last_error}"
        )

openrouter_client = OpenRouterClient()
