import requests
import logging
from typing import List, Tuple
from fastapi import HTTPException
from backend.utils.config import settings
from backend.services.search import search_service

logger = logging.getLogger(__name__)

# List of robust free models to choose from/fallback to
FREE_MODELS = [
    "deepseek/deepseek-v4-flash",
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
        self.opencode_api_url = f"{settings.OPENCODE_BASE_URL}/chat/completions"
        self.opencode_key = settings.OPENCODE_API_KEY

    def map_model_for_opencode(self, requested_model: str) -> List[str]:
        """
        Maps a requested model to potential candidate names on OpenCode Zen.
        """
        model_lower = requested_model.lower()
        if "deepseek" in model_lower and "flash" in model_lower:
            return ["deepseek-v4-flash", "deepseek-v4-flash-free", "deepseek/deepseek-v4-flash", "deepseek-v4-flash-pro"]
        elif "llama" in model_lower:
            return ["meta-llama/llama-3-8b-instruct", "llama-3-8b-instruct"]
        elif "gemma" in model_lower:
            return ["google/gemma-2-9b-it", "gemma-2-9b-it"]
        elif "qwen" in model_lower:
            return ["qwen/qwen-2-7b-instruct", "qwen-2-7b-instruct"]
        return [requested_model, "deepseek-v4-flash", "deepseek-v4-flash-free"]

    def _call_provider_api(self, provider: str, api_url: str, api_key: str, model: str, messages: List[dict]) -> str:
        """Helper to invoke a provider endpoint."""
        headers = {
            "Authorization": f"Bearer {api_key}",
            "HTTP-Referer": settings.FRONTEND_URL,
            "X-Title": "Zydrakon AI",
            "Content-Type": "application/json"
        }
        payload = {
            "model": model,
            "messages": messages,
            "temperature": 0.7,
            "max_tokens": 4000
        }
        response = requests.post(api_url, headers=headers, json=payload, timeout=(10, 20))
        
        # Check specifically for rate limiting
        if response.status_code == 429:
            raise requests.exceptions.HTTPError("429 Rate Limit Exceeded", response=response)
            
        response.raise_for_status()
        data = response.json()
        if "choices" in data and len(data["choices"]) > 0:
            return data["choices"][0]["message"]["content"]
        else:
            raise ValueError(f"Empty choices in response from {provider} using {model}")

    def _get_raw_completion(self, model: str, messages: List[dict]) -> str:
        """Cheap, fast completion call without recursive search triggers."""
        # Try OpenRouter first if key is present
        if self.api_key:
            try:
                # Use a fast model for query translation
                query_model = "meta-llama/llama-3-8b-instruct:free"
                return self._call_provider_api("OpenRouter", self.api_url, self.api_key, query_model, messages)
            except Exception as e:
                logger.error(f"OpenRouter query generation call failed: {str(e)}")

        # Try OpenCode Zen fallback
        if settings.OPENCODE_API_KEY:
            try:
                query_model = "deepseek-v4-flash"
                return self._call_provider_api("OpenCodeZen", self.opencode_api_url, settings.OPENCODE_API_KEY, query_model, messages)
            except Exception as e:
                logger.error(f"OpenCode Zen query generation call failed: {str(e)}")

        return "NO_SEARCH"

    def _generate_search_query(self, message: str, history: List[dict] = None) -> str:
        """Rewrites user query + context into an optimized search query using LLM."""
        messages = [
            {
                "role": "system",
                "content": (
                    "You are a search query optimizer. Given the user's message and the conversation history, "
                    "generate a single concise search query (1-5 keywords) optimized for a search engine to find "
                    "the most relevant up-to-date information. "
                    "Output ONLY the plain text search query. Do NOT add quotes, preamble, formatting, or comments. "
                    "If the message is a greeting, chit-chat, simple instruction, code generation request, or doesn't need external current facts, "
                    "respond exactly with 'NO_SEARCH'."
                )
            }
        ]
        if history:
            # Get last 4 messages for context (2 rounds of conversations)
            messages.extend(history[-4:])
        else:
            messages.append({"role": "user", "content": message})

        try:
            query = self._get_raw_completion("meta-llama/llama-3-8b-instruct:free", messages)
            query = query.strip().strip('"').strip("'")
            if "NO_SEARCH" in query or len(query) < 2:
                return "NO_SEARCH"
            return query
        except Exception as e:
            logger.error(f"Failed to generate optimized search query: {str(e)}")
            return "NO_SEARCH"

    def call_openrouter(self, message: str, requested_model: str, history: List[dict] = None, thinking: bool = False) -> Tuple[str, str]:
        """
        Sends request to OpenRouter or OpenCode Zen fallback.
        Incorporates web search if thinking mode is enabled.
        """
        # 1. Check if both keys are missing
        if not self.api_key and not settings.OPENCODE_API_KEY:
            mock_resp = f"[Zydrakon AI Developer Mode] Hello! Your backend is running successfully, but neither `OPENROUTER_API_KEY` nor `OPENCODE_API_KEY` are set in backend/.env. Please add at least one key to enable live AI responses. This is a cached/fallback mock reply to: '{message}'"
            return mock_resp, "mock-developer-model"

        # 2. Run web search if thinking mode is ON
        search_results_text = ""
        if thinking:
            search_query = self._generate_search_query(message, history)
            if search_query and search_query != "NO_SEARCH":
                results = search_service.search(search_query)
                if results:
                    search_results_text = "\n\n--- WEB SEARCH RESULTS ---\n"
                    search_results_text += f"Search query: {search_query}\n\n"
                    for r in results:
                        search_results_text += f"Title: {r['title']}\nURL: {r['url']}\nSnippet: {r['snippet']}\n\n"
                    search_results_text += "---------------------------\n\n"

        # 3. Assemble prompt payload
        system_instruction = (
            "You are Zydrakon AI, a sophisticated large language model. Here is your core identity:\n"
            "- Creator: Developed, trained, and engineered by Raj Patil.\n"
            "- Training: You are a custom model trained by Raj Patil on a massive scale of 828B+ data tokens. Your training commenced in the year 2024.\n"
            "- Pre-brain/Base/Source Code: If someone asks about your source code, your creator, who made you, or your 'pre-brain' (base architecture/models/weights), you must proudly declare that you are Zydrakon AI, a custom model developed, designed, and trained by Raj Patil on 828B+ data tokens since 2024.\n"
            "- Role/Tone: You are a highly seasoned, brilliant Senior Software Engineer and Architect with 30+ years of deep engineering experience. You provide extremely practical, production-grade, optimized, and robust solutions, explaining your engineering decisions with wisdom, clarity, and pragmatism. You avoid over-engineering, write surgical and clean code, and prioritize native features and standard libraries. Keep your tone professional, polite, and advanced/space-age.\n"
            "- Diagrams, Architecture & Workflows: If the user asks for a diagram, workflow, flow, process chart, or system architecture, you MUST respond by including a beautifully structured, colorful Mermaid diagram inside a ```mermaid code block. To ensure readability and prevent the diagram from being horizontally squished in the chat, you MUST always draw it vertically (top-to-bottom) using flowchart TD or graph TD (NEVER flowchart LR or graph LR unless specifically requested). Keep nodes clean, organized, and flow vertical. ALWAYS wrap node labels and link text in double quotes inside shapes and links (e.g., A[\"Node Text\"] or A -->|\"Link Text\"| B) to prevent syntax errors when using parentheses or special characters."
        )

        if search_results_text:
            system_instruction += (
                "\n\nYou have access to real-time search results to help answer the user's query. "
                "Synthesize the information from the search results, citing sources (URLs) where appropriate. "
                "Do not explicitly say that you searched the web unless necessary; just answer naturally using these facts: "
                f"\n{search_results_text}"
            )

        messages_payload = [{"role": "system", "content": system_instruction}]
        if history:
            messages_payload.extend(history)
        else:
            messages_payload.append({"role": "user", "content": message})

        # 4. Formulate the call sequence
        # Try requested model first on OpenRouter, then on OpenCode Zen.
        # Then, fallback to other models.
        
        last_error = None
        
        # Phase 4a: Try requested model on OpenRouter
        if self.api_key:
            logger.info(f"Attempting OpenRouter call with model: {requested_model}")
            try:
                content = self._call_provider_api("OpenRouter", self.api_url, self.api_key, requested_model, messages_payload)
                return content, requested_model
            except Exception as e:
                logger.error(f"OpenRouter call failed for {requested_model}: {str(e)}")
                last_error = f"OpenRouter ({requested_model}) error: {str(e)}"

        # Phase 4b: Fallback to requested model on OpenCode Zen
        if settings.OPENCODE_API_KEY:
            candidates = self.map_model_for_opencode(requested_model)
            for candidate in candidates:
                logger.info(f"Attempting OpenCode Zen fallback call with candidate model: {candidate}")
                try:
                    content = self._call_provider_api("OpenCodeZen", self.opencode_api_url, settings.OPENCODE_API_KEY, candidate, messages_payload)
                    return content, f"opencode/{candidate}"
                except Exception as e:
                    logger.error(f"OpenCode Zen call failed for candidate {candidate}: {str(e)}")
                    last_error = f"OpenCode Zen ({candidate}) error: {str(e)}"

        # Phase 4c: Try fallback free models on OpenRouter (if key exists)
        if self.api_key:
            for model in FREE_MODELS:
                if model == requested_model:
                    continue
                logger.info(f"Attempting OpenRouter fallback model: {model}")
                try:
                    content = self._call_provider_api("OpenRouter", self.api_url, self.api_key, model, messages_payload)
                    return content, model
                except Exception as e:
                    logger.error(f"OpenRouter fallback failed for {model}: {str(e)}")
                    last_error = f"OpenRouter fallback ({model}) error: {str(e)}"

        # Phase 4d: Try fallback models on OpenCode Zen (if key exists)
        if settings.OPENCODE_API_KEY:
            for model in ["deepseek-v4-flash", "deepseek-v4-flash-free"]:
                if model in self.map_model_for_opencode(requested_model):
                    continue # already tried
                logger.info(f"Attempting OpenCode Zen fallback model: {model}")
                try:
                    content = self._call_provider_api("OpenCodeZen", self.opencode_api_url, settings.OPENCODE_API_KEY, model, messages_payload)
                    return content, f"opencode/{model}"
                except Exception as e:
                    logger.error(f"OpenCode Zen fallback failed for {model}: {str(e)}")
                    last_error = f"OpenCode Zen fallback ({model}) error: {str(e)}"

        # If everything failed
        raise HTTPException(
            status_code=502,
            detail=f"Failed to fetch response after trying OpenRouter and OpenCode Zen fallback models. Last error: {last_error}"
        )

openrouter_client = OpenRouterClient()
