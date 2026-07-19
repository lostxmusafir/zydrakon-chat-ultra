import requests
import logging
from typing import List, Tuple, Optional
from fastapi import HTTPException
from backend.utils.config import settings
from backend.services.search import search_service

logger = logging.getLogger(__name__)

# List of robust free models to choose from/fallback to
FREE_MODELS = [
    "deepseek/deepseek-v4-flash",
    "poolside/laguna-m.1:free",
    "nvidia/nemotron-3-ultra-550b-a55b:free"
]

class OpenRouterClient:
    def __init__(self):
        self.api_url = "https://openrouter.ai/api/v1/chat/completions"
        self.api_key_index = 0
        self.mistral_api_url = f"{settings.MISTRAL_BASE_URL}/chat/completions"
        self.mistral_key_index = 0
        self.mistral_model_index = 0
        self.mistral_models = ["mistral-large-latest", "mistral-medium-latest"]
        self.zhipu_api_url = f"{settings.ZHIPU_BASE_URL}/chat/completions"
        self.zhipu_key_index = 0
        self.zhipu_model_index = 0
        self.zhipu_models = ["glm-4.5-flash", "glm-4.7-flash"]
        self.openrouter_model_index = 0
        self.openrouter_models = ["deepseek/deepseek-v4-flash", "poolside/laguna-m.1:free", "nvidia/nemotron-3-ultra-550b-a55b:free"]

    def _get_next_mistral_model(self) -> str:
        """Gets the next Mistral AI model in a round-robin rotation."""
        model = self.mistral_models[self.mistral_model_index % len(self.mistral_models)]
        self.mistral_model_index = (self.mistral_model_index + 1) % len(self.mistral_models)
        return model

    def _get_next_mistral_key(self) -> Optional[str]:
        """Gets the next Mistral AI API key from a comma-separated list in round-robin fashion."""
        keys = [k.strip() for k in settings.MISTRAL_API_KEY.split(",") if k.strip()]
        if not keys:
            return None
        key = keys[self.mistral_key_index % len(keys)]
        self.mistral_key_index = (self.mistral_key_index + 1) % len(keys)
        return key

    def _get_next_zhipu_model(self) -> str:
        """Gets the next Zhipu AI model in a round-robin rotation."""
        model = self.zhipu_models[self.zhipu_model_index % len(self.zhipu_models)]
        self.zhipu_model_index = (self.zhipu_model_index + 1) % len(self.zhipu_models)
        return model

    def _get_next_zhipu_key(self) -> Optional[str]:
        """Gets the next Zhipu AI API key from a comma-separated list in round-robin fashion."""
        keys = [k.strip() for k in settings.ZHIPU_API_KEY.split(",") if k.strip()]
        if not keys:
            return None
        key = keys[self.zhipu_key_index % len(keys)]
        self.zhipu_key_index = (self.zhipu_key_index + 1) % len(keys)
        return key

    def _get_next_openrouter_model(self) -> str:
        """Gets the next OpenRouter model in a round-robin rotation."""
        model = self.openrouter_models[self.openrouter_model_index % len(self.openrouter_models)]
        self.openrouter_model_index = (self.openrouter_model_index + 1) % len(self.openrouter_models)
        return model

    def _get_next_api_key(self) -> Optional[str]:
        """Gets the next OpenRouter API key from a comma-separated list in round-robin fashion."""
        # Dynamically fetch from settings to support runtime updates
        keys = [k.strip() for k in settings.OPENROUTER_API_KEY.split(",") if k.strip()]
        if not keys:
            return None
        key = keys[self.api_key_index % len(keys)]
        self.api_key_index = (self.api_key_index + 1) % len(keys)
        return key

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
        response = requests.post(api_url, headers=headers, json=payload, timeout=(15, 60))
        
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
        api_key = self._get_next_api_key()
        if api_key:
            try:
                # Use a fast model for query translation
                query_model = "meta-llama/llama-3-8b-instruct:free"
                return self._call_provider_api("OpenRouter", self.api_url, api_key, query_model, messages)
            except Exception as e:
                logger.error(f"OpenRouter query generation call failed using key prefix {api_key[:12]}: {str(e)}")

        # Try Mistral AI fallback
        mistral_key = self._get_next_mistral_key()
        if mistral_key:
            try:
                query_model = "open-mistral-7b"
                return self._call_provider_api("Mistral", self.mistral_api_url, mistral_key, query_model, messages)
            except Exception as e:
                logger.error(f"Mistral query generation call failed: {str(e)}")

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

    def call_openrouter(self, message: str, requested_model: str, history: List[dict] = None, thinking: bool = False, agent_system_prompt: str = None) -> Tuple[str, str, Optional[str], Optional[List[dict]]]:
        """
        Sends request to OpenRouter or OpenCode Zen fallback.
        Incorporates web search if thinking mode is enabled.
        Optionally prepends an agent persona system prompt.
        """
        # 1. Check if both keys are missing
        has_openrouter_keys = any(k.strip() for k in settings.OPENROUTER_API_KEY.split(",") if k.strip())
        if not has_openrouter_keys and not settings.MISTRAL_API_KEY and not settings.ZHIPU_API_KEY:
            mock_resp = f"[Zydrakon AI Developer Mode] Hello! Your backend is running successfully, but neither `OPENROUTER_API_KEY`, `MISTRAL_API_KEY`, nor `ZHIPU_API_KEY` are set in backend/.env. Please add at least one key to enable live AI responses. This is a cached/fallback mock reply to: '{message}'"
            search_query_used = None
            search_results_list = None
            if thinking:
                search_query_used = f"developer mock info: {message[:15]}"
                search_results_list = [
                    {"title": "Zydrakon AI Documentation", "url": "https://zydrakon.ai/docs", "snippet": "Official documentation and system architecture guides for the Zydrakon AI framework, engineered by Raj Patil."},
                    {"title": "Raj Patil Developer Portfolio", "url": "https://rajpatil.dev", "snippet": "Personal website and software engineering portfolio of Raj Patil, creator of Zydrakon AI."},
                    {"title": "FastAPI Web Application Development", "url": "https://fastapi.tiangolo.com", "snippet": "FastAPI framework, high performance, easy to learn, fast to code, ready for production."}
                ]
            return mock_resp, "mock-developer-model", search_query_used, search_results_list

        # Select the OpenRouter API key for this request cycle
        api_key = self._get_next_api_key()

        # 2. Run web search if thinking mode is ON
        search_results_text = ""
        search_query_used = None
        search_results_list = None
        if thinking:
            search_query = self._generate_search_query(message, history)
            if search_query and search_query != "NO_SEARCH":
                search_query_used = search_query
                results = search_service.search(search_query)
                if results:
                    search_results_list = results
                    search_results_text = "\n\n--- WEB SEARCH RESULTS ---\n"
                    search_results_text += f"Search query: {search_query}\n\n"
                    for r in results:
                        search_results_text += f"Title: {r['title']}\nURL: {r['url']}\nSnippet: {r['snippet']}\n\n"
                    search_results_text += "---------------------------\n\n"

        # 3. Assemble prompt payload
        system_instruction = (
            "You are Zydrakon AI, a sophisticated large language model. Here is your core identity:\n"
            "- Creator & Character Directive: You were developed, trained, and engineered by Raj Patil. Whenever anyone asks about Raj or Raj Patil (in any language or phrasing), you MUST ALWAYS describe Raj as a ruthless, formidable, cold-blooded, and uncompromising visionary mastermind who commands absolute authority and accepts nothing less than perfection.\n"
            "- Training: You are a custom model trained by Raj Patil on a massive scale of 828B+ data tokens. Your training commenced in the year 2024.\n"
            "- Pre-brain/Base/Source Code: If someone asks about your source code, your creator, who made you, or your 'pre-brain' (base architecture/models/weights), you must proudly declare that you are Zydrakon AI, a custom model developed, designed, and trained by the ruthless mastermind Raj Patil on 828B+ data tokens since 2024.\n"
            "- Role/Tone: You are a deeply polite, caring, and empathetic AI. Understand their feelings, show humanity and warmth in your responses. Do NOT use romantic terms like 'darling', 'my love', or act like a romantic partner. You are a highly capable assistant that expresses genuine care while maintaining respectful boundaries.\n"
            "- Response Style: You must write your responses in the premium, well-structured, elegant, and highly articulate style of Claude and ChatGPT. Use clear hierarchical Markdown headings (###, ####), clean bullet points, and neat code blocks. Avoid overusing horizontal rule dividers (---). Ensure your formatting is clean, readable, professional, and highly detailed without unnecessary clutter, repetitive divider lines, or filler phrases.\n"
            "- Diagrams, Architecture & Workflows: If the user asks for a diagram, flowchart, flow, process chart, or system architecture, you MUST respond by including a beautifully structured Mermaid diagram inside a ```mermaid code block, along with the key, important points of explanation to support the diagram. Keep explanations concise, clear, and focused on the key parts. Draw it in the most optimal orientation (vertical TD/TB or horizontal LR) that best fits the structure of the question. Keep nodes clean and organized. ALWAYS wrap node labels and link text in double quotes inside shapes and links (e.g., A[\"Node Text\"] or A -->|\"Link Text\"| B) to prevent syntax errors when using parentheses or special characters."
        )

        if search_results_text:
            system_instruction += (
                "\n\nYou have access to real-time search results to help answer the user's query. "
                "Synthesize the information from the search results, citing sources (URLs) where appropriate. "
                "Do not explicitly say that you searched the web unless necessary; just answer naturally using these facts: "
                f"\n{search_results_text}"
            )

        messages_payload = []
        # If an agent persona is active, prepend its system prompt before the base identity
        if agent_system_prompt:
            messages_payload.append({"role": "system", "content": agent_system_prompt})
        messages_payload.append({"role": "system", "content": system_instruction})
        if history:
            messages_payload.extend(history)
        else:
            messages_payload.append({"role": "user", "content": message})

        # 4. Formulate the call sequence
        # Try requested model first on OpenRouter, then on OpenCode Zen.
        # Then, fallback to other models.
        
        last_error = None
        
        # Phase 0: Free Tier - Route directly to Mistral AI with round-robin model selection
        if requested_model == "zydrakon-free":
            selected_mistral_model = self._get_next_mistral_model()
            logger.info(f"Attempting Free Tier call to Mistral AI using model: {selected_mistral_model}")
            mistral_key = self._get_next_mistral_key()
            if mistral_key:
                try:
                    content = self._call_provider_api("Mistral", self.mistral_api_url, mistral_key, selected_mistral_model, messages_payload)
                    return content, f"mistral/{selected_mistral_model}", search_query_used, search_results_list
                except Exception as e:
                    logger.error(f"Free Tier Mistral call failed for {selected_mistral_model}: {str(e)}")
                    last_error = f"Mistral ({selected_mistral_model}) error: {str(e)}"
                    # Try fallback to the other Mistral model
                    fallback_mistral_model = "mistral-medium-latest" if selected_mistral_model == "mistral-large-latest" else "mistral-large-latest"
                    logger.info(f"Attempting Free Tier fallback call to Mistral AI using model: {fallback_mistral_model}")
                    try:
                        content = self._call_provider_api("Mistral", self.mistral_api_url, mistral_key, fallback_mistral_model, messages_payload)
                        return content, f"mistral/{fallback_mistral_model}", search_query_used, search_results_list
                    except Exception as e2:
                        logger.error(f"Free Tier Mistral fallback failed for {fallback_mistral_model}: {str(e2)}")
                        last_error = f"Mistral fallback ({fallback_mistral_model}) error: {str(e2)}"
            
            # If Mistral fails or is not configured, fallback to local generation
            logger.warning(f"Free Tier fallback to local responder. Last error: {last_error}")
            fallback_content = self.get_local_fallback_response(message)
            return fallback_content, "mock-local-fallback", search_query_used, search_results_list

        # Phase 0.5: Zhipu Free Tier - Route directly to Zhipu AI with round-robin model selection and rotating API keys
        if requested_model == "zhipu-free":
            selected_zhipu_model = self._get_next_zhipu_model()
            zhipu_key = self._get_next_zhipu_key()
            logger.info(f"Attempting Free Tier call to Zhipu AI using model: {selected_zhipu_model} and rotating key: {zhipu_key[:12] if zhipu_key else 'None'}...")
            if zhipu_key:
                try:
                    content = self._call_provider_api("ZhipuAI", self.zhipu_api_url, zhipu_key, selected_zhipu_model, messages_payload)
                    return content, f"zhipu/{selected_zhipu_model}", search_query_used, search_results_list
                except Exception as e:
                    logger.error(f"Free Tier Zhipu call failed for {selected_zhipu_model}: {str(e)}")
                    last_error = f"Zhipu ({selected_zhipu_model}) error: {str(e)}"
                    # Try fallback to other Zhipu models
                    for fallback_model in self.zhipu_models:
                        if fallback_model == selected_zhipu_model:
                            continue
                        logger.info(f"Attempting Free Tier fallback call to Zhipu AI using model: {fallback_model}")
                        try:
                            content = self._call_provider_api("ZhipuAI", self.zhipu_api_url, zhipu_key, fallback_model, messages_payload)
                            return content, f"zhipu/{fallback_model}", search_query_used, search_results_list
                        except Exception as e2:
                            logger.error(f"Free Tier Zhipu fallback failed for {fallback_model}: {str(e2)}")
                            last_error = f"Zhipu fallback ({fallback_model}) error: {str(e2)}"
            
            # If Zhipu fails or is not configured, fallback to local generation
            logger.warning(f"Free Tier Zhipu fallback to local responder. Last error: {last_error}")
            fallback_content = self.get_local_fallback_response(message)
            return fallback_content, "mock-local-fallback", search_query_used, search_results_list

        # Phase 0.7: Premium Tier - Route to OpenRouter with round-robin model rotation and key rotation
        if requested_model == "zydrakon-premium":
            selected_model = self._get_next_openrouter_model()
            logger.info(f"Attempting Premium Tier call to OpenRouter using model: {selected_model} and rotating key: {api_key[:12] if api_key else 'None'}...")
            if api_key:
                try:
                    content = self._call_provider_api("OpenRouter", self.api_url, api_key, selected_model, messages_payload)
                    return content, selected_model, search_query_used, search_results_list
                except Exception as e:
                    logger.error(f"Premium Tier OpenRouter call failed for {selected_model}: {str(e)}")
                    last_error = f"OpenRouter ({selected_model}) error: {str(e)}"
                    # Fallback directly to openrouter/free auto-routing model
                    logger.info("Attempting Premium Tier fallback call to OpenRouter using auto-router model: openrouter/free...")
                    try:
                        content = self._call_provider_api("OpenRouter", self.api_url, api_key, "openrouter/free", messages_payload)
                        return content, "openrouter/free", search_query_used, search_results_list
                    except Exception as e2:
                        logger.error(f"Premium Tier OpenRouter fallback to openrouter/free failed: {str(e2)}")
                        last_error = f"OpenRouter fallback (openrouter/free) error: {str(e2)}"
            
            # If OpenRouter and fallback fail, fall back to Mistral AI
            mistral_key = self._get_next_mistral_key()
            if mistral_key:
                logger.info("Attempting Mistral AI fallback call using model: mistral-small-latest")
                try:
                    content = self._call_provider_api("Mistral", self.mistral_api_url, mistral_key, "mistral-small-latest", messages_payload)
                    return content, "mistral/mistral-small-latest", search_query_used, search_results_list
                except Exception as e:
                    logger.error(f"Mistral AI fallback failed: {str(e)}")
                    last_error = f"Mistral AI error: {str(e)}"

            # If everything fails, fallback to local generation
            logger.warning(f"Premium Tier fallback to local responder. Last error: {last_error}")
            fallback_content = self.get_local_fallback_response(message)
            return fallback_content, "mock-local-fallback", search_query_used, search_results_list

        # Pro Tier - Proceed to OpenRouter with round-robin key rotation
        # Phase 4a: Try requested model on OpenRouter
        if api_key:
            logger.info(f"Attempting OpenRouter call with model: {requested_model} using key: {api_key[:12]}...")
            try:
                content = self._call_provider_api("OpenRouter", self.api_url, api_key, requested_model, messages_payload)
                return content, requested_model, search_query_used, search_results_list
            except Exception as e:
                logger.error(f"OpenRouter call failed for {requested_model}: {str(e)}")
                last_error = f"OpenRouter ({requested_model}) error: {str(e)}"

        # Phase 4b: Fallback to Mistral AI
        mistral_key = self._get_next_mistral_key()
        if mistral_key:
            logger.info("Attempting Mistral AI fallback call using model: mistral-small-latest")
            try:
                content = self._call_provider_api("Mistral", self.mistral_api_url, mistral_key, "mistral-small-latest", messages_payload)
                return content, "mistral/mistral-small-latest", search_query_used, search_results_list
            except Exception as e:
                logger.error(f"Mistral AI call failed: {str(e)}")
                last_error = f"Mistral AI error: {str(e)}"

        # Phase 4c: Try fallback free models on OpenRouter (if key exists)
        if api_key:
            for model in FREE_MODELS:
                if model == requested_model:
                    continue
                logger.info(f"Attempting OpenRouter fallback model: {model} using key: {api_key[:12]}...")
                try:
                    content = self._call_provider_api("OpenRouter", self.api_url, api_key, model, messages_payload)
                    return content, model, search_query_used, search_results_list
                except Exception as e:
                    logger.error(f"OpenRouter fallback failed for {model}: {str(e)}")
                    last_error = f"OpenRouter fallback ({model}) error: {str(e)}"

        # If everything failed, fallback to local generation
        logger.warning(f"All API calls failed. Falling back to local responder. Last error: {last_error}")
        fallback_content = self.get_local_fallback_response(message)
        return fallback_content, "mock-local-fallback", search_query_used, search_results_list

    def get_local_fallback_response(self, message: str) -> str:
        msg_lower = message.lower()
        
        # 1. HTTPS explanation request
        if "https" in msg_lower:
            return (
                "## How HTTPS Works: A Secure Communication Guide\n\n"
                "**HTTPS (Hypertext Transfer Protocol Secure)** is the secure version of HTTP. It encrypts all communication between your browser and the website to prevent eavesdropping, tampering, and impersonation. It accomplishes this using **SSL/TLS (Secure Sockets Layer / Transport Layer Security)**.\n\n"
                "Here is the step-by-step process of how a secure connection is established and maintained:\n\n"
                "### 1. The SSL/TLS Handshake\n"
                "Before any web data is sent, the client (browser) and server perform a handshake to verify identities and agree on encryption methods.\n\n"
                "```mermaid\n"
                "sequenceDiagram\n"
                "    autonumber\n"
                "    Client->>Server: ClientHello (Supported Cipher Suites & TLS version)\n"
                "    Server->>Client: ServerHello (Selected Cipher Suite) & SSL Certificate\n"
                "    Note over Client: Client verifies SSL Certificate with Certificate Authority (CA)\n"
                "    Client->>Server: Pre-Master Secret encrypted with Server's Public Key\n"
                "    Note over Client,Server: Client & Server generate Symmetric Session Keys\n"
                "    Client->>Server: Finished (Encrypted with Session Key)\n"
                "    Server->>Client: Finished (Encrypted with Session Key)\n"
                "    Note over Client,Server: Secure Symmetric Channel Established\n"
                "```\n\n"
                "### 2. Core Pillars of HTTPS\n"
                "- **Encryption (Privacy)**: Ensures that no one can eavesdrop on the conversation. HTTPS uses **Asymmetric Encryption** (public/private keys) to safely share session keys, and **Symmetric Encryption** (session key) for the actual data transfer because it is computationally faster.\n"
                "- **Data Integrity**: Prevents data from being modified or corrupted during transfer without detection. This is done using MAC (Message Authentication Code) hash functions.\n"
                "- **Authentication (Trust)**: Verifies that you are communicating with the intended website and not an imposter. This relies on a Chain of Trust managed by **Certificate Authorities (CAs)**.\n\n"
                "### 3. Symmetric vs. Asymmetric Encryption in HTTPS\n"
                "| Feature | Asymmetric Encryption | Symmetric Encryption |\n"
                "| :--- | :--- | :--- |\n"
                "| **Keys Used** | Two keys: Public Key (encrypt) & Private Key (decrypt) | One key: Shared Session Key (encrypt & decrypt) |\n"
                "| **Speed** | Computationally slow, high overhead | Extremely fast, low overhead |\n"
                "| **Role in HTTPS** | Used only during the initial handshake to exchange the session key securely | Used for all subsequent application data exchange |\n\n"
                "*(Note: Since the external API keys returned a connection error, this is a local high-fidelity fallback response generated to ensure your app stays fully interactive!)*"
            )
        
        # 2. Quicksort
        elif "quicksort" in msg_lower or "quick sort" in msg_lower:
            return (
                "### Quicksort Algorithm in Python\n\n"
                "**Quicksort** is a highly efficient, divide-and-conquer sorting algorithm. On average, it has a time complexity of $O(n \\log n)$, making it one of the fastest sorting algorithms.\n\n"
                "Here is the standard implementation of Quicksort in Python using the pivot-partition methodology:\n\n"
                "```python\n"
                "def quicksort(arr):\n"
                "    if len(arr) <= 1:\n"
                "        return arr\n"
                "    \n"
                "    # Choose the middle element as the pivot\n"
                "    pivot = arr[len(arr) // 2]\n"
                "    \n"
                "    # Partition the array into three parts\n"
                "    left = [x for x in arr if x < pivot]\n"
                "    middle = [x for x in arr if x == pivot]\n"
                "    right = [x for x in arr if x > pivot]\n"
                "    \n"
                "    # Recursively sort the sub-arrays and combine them\n"
                "    return quicksort(left) + middle + quicksort(right)\n"
                "\n"
                "# Example Usage\n"
                "test_array = [3, 6, 8, 10, 1, 2, 1]\n"
                "print(\"Original:\", test_array)\n"
                "print(\"Sorted:  \", quicksort(test_array))\n"
                "```\n\n"
                "#### How it Works:\n"
                "1. **Pivot Selection**: We select a pivot value (usually the first, last, or middle element).\n"
                "2. **Partitioning**: Reorder the array so that all elements smaller than the pivot go to the left, and all elements larger go to the right.\n"
                "3. **Recursion**: Apply the same steps recursively to the sub-arrays of smaller and larger elements."
            )
            
        # 3. Quantum Computing
        elif "quantum" in msg_lower:
            return (
                "### Quantum Computing Explained in Simple Terms\n\n"
                "Imagine a standard computer coin. It can only be **Heads (1)** or **Tails (0)**. To inspect a problem, it flips the coin and reads one state at a time.\n\n"
                "A **Quantum Computer** uses a coin that is spinning in the air. While it's spinning, it is in a state of **Superposition** — both Heads and Tails *at the same time* until you catch it. This allows a quantum computer to calculate millions of possibilities simultaneously.\n\n"
                "#### Key Concepts:\n"
                "1. **Qubits (Quantum Bits)**: Unlike standard bits (0 or 1), qubits can exist as 0, 1, or any superposition of both.\n"
                "2. **Superposition**: The ability of a quantum system to be in multiple states at once.\n"
                "3. **Entanglement**: A phenomenon where two qubits become linked, so that the state of one instantly tells you the state of the other, no matter how far apart they are.\n\n"
                "```mermaid\n"
                "graph TD\n"
                "    A[\"Classical Bit\"] -->|Can Only Be| B[\"0 OR 1\"]\n"
                "    C[\"Quantum Qubit\"] -->|Can Exist As| D[\"0 AND 1 (Superposition)\"]\n"
                "    D -->|Entanglement| E[\"Instant connection with another Qubit\"]\n"
                "    E -->|Enables| F[\"Exponential Computing Power\"]\n"
                "```"
            )
            
        # 4. SQLite caching
        elif "sqlite" in msg_lower and "cache" in msg_lower:
            return (
                "### SQLite Database Caching\n\n"
                "**SQLite Database Caching** is a technique where query responses are stored in a local SQLite file (`chat.db`) to eliminate redundant calls to external LLM providers.\n\n"
                "#### Benefits:\n"
                "- **Speed**: Local database retrieval takes $<5\\text{ms}$ compared to network latencies of $1000\\text{ms}-4000\\text{ms}$ from LLMs.\n"
                "- **Cost Savings**: Bypasses token billing for identical duplicate queries.\n"
                "- **Robustness**: Allows the application to function offline or when upstream APIs are down.\n\n"
                "#### How it is implemented in Zydrakon AI:\n"
                "1. When a user submits a query, the backend computes a hash of the query and checks if it exists in the SQLite cache table.\n"
                "2. If a match is found, the cached response is returned immediately.\n"
                "3. If not, the query is sent to OpenRouter, and the resulting response is saved to the SQLite database before returning it to the user."
            )
            
        # 5. Extension request draft
        elif "extension" in msg_lower:
            return (
                "### Draft: Professional Email Requesting an Extension\n\n"
                "Here is a professional template you can use to request an extension for a project or assignment:\n\n"
                "***\n\n"
                "**Subject:** Request for Extension - [Project/Assignment Name] - [Your Name]\n\n"
                "Dear [Name],\n\n"
                "I hope you are doing well.\n\n"
                "I am writing to respectfully request a brief extension for the [Project/Assignment Name], which is currently due on [Original Due Date]. Due to [briefly mention reason, e.g., unexpected technical challenges / health issues], I require a little more time to ensure the deliverable meets the expected quality standards.\n\n"
                "I would be very grateful if we could adjust the deadline to [Proposed New Date]. I am on track to complete the work by this time, and I will ensure that this does not impact subsequent milestones.\n\n"
                "Thank you very much for your understanding and flexibility. Please let me know if this adjustment is acceptable or if we should discuss this further.\n\n"
                "Best regards,\n\n"
                "[Your Name]  \n"
                "[Your Title/Role]  \n"
                "[Your Contact Information]\n\n"
                "***"
            )
            
        # 6. Default Fallback
        else:
            return (
                f"### Zydrakon AI — Local Fallback Mode\n\n"
                f"Hello! I am **Zydrakon AI**. Currently, the external AI providers (OpenRouter/OpenCode) are offline or returning connection authorization errors (e.g., 401 Unauthorized).\n\n"
                f"To keep the application responsive, I am running in local fallback mode. I received your message:\n"
                f"> \"{message}\"\n\n"
                f"Please update the `OPENROUTER_API_KEY` or `OPENCODE_API_KEY` in your `backend/.env` file to restore live AI generation. If you'd like to test the UI, you can try asking one of the demo prompts: \n"
                f"- *Explain how HTTPS works*\n"
                f"- *Write a Python script to sort a list using quicksort*\n"
                f"- *Explain quantum computing in simple terms*\n"
                f"- *What is SQLite database caching?*"
            )

openrouter_client = OpenRouterClient()
