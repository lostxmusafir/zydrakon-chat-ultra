import re
from typing import Optional

def detect_identity_query(message: str) -> Optional[str]:
    """
    Detects if the user is asking about the model's creator, source code, or pre-brain (base model).
    If a query matches, returns a premium, informative markdown response. Otherwise, returns None.
    """
    # Normalize query (lowercase, remove punctuation except spaces)
    normalized = re.sub(r'[^\w\s]', '', message.lower()).strip()
    
    # 1. Check for creator / builder / maker / developer
    creator_patterns = [
        r"who (made|created|developed|programmed|coded|designed) you",
        r"who is your (creator|developer|maker|author|father|programmer|designer|parent)",
        r"who is raj\b",
        r"who is raj patil",
        r"\b(creator|developer|maker|author|programmer|designer)\b.*\byou\b",
        r"\byou\b.*\b(creator|developer|maker|author|programmer|designer)\b"
    ]
    
    # 2. Check for source code / repositories
    source_patterns = [
        r"source code",
        r"sourcecode",
        r"github",
        r"git repo",
        r"git repository",
        r"where is (your|the) code",
        r"are you open source",
        r"is your code open"
    ]
    
    # 3. Check for pre-brain / base model / base brain
    prebrain_patterns = [
        r"pre\s?brain",
        r"base\s?model",
        r"base\s?brain",
        r"what model are you",
        r"what is your model",
        r"what is your base",
        r"what model is this",
        r"what is your architecture",
        r"what base model",
        r"are you (llama|gemma|mistral|qwen|chatgpt|gpt)"
    ]
    
    # 4. Check for meeting / appointment / seeing Raj
    meeting_patterns = [
        r"meet\s?(with\s?)?raj",
        r"meeting\s?(with\s?)?raj",
        r"appointment\s?(with\s?)?raj",
        r"schedule\s?.*raj",
        r"see\s?raj",
        r"talk\s?to\s?raj",
        r"raj\s?se\s?milna",
        r"raj\s?se\s?baat",
        r"raj\s?meeting",
        r"book\s?a?\s?meeting",
        r"can i meet raj"
    ]
    
    # Run tests on normalized query
    is_creator = any(re.search(pat, normalized) for pat in creator_patterns)
    is_source = any(re.search(pat, normalized) for pat in source_patterns)
    is_prebrain = any(re.search(pat, normalized) for pat in prebrain_patterns)
    is_meeting = any(re.search(pat, normalized) for pat in meeting_patterns)
    
    if is_meeting:
        return (
            "### 🗓️ Meeting & Appointment Policy — Raj Patil\n\n"
            "Scheduling a meeting or appointment with **Raj Patil** is extremely difficult and usually takes **months or even years** to arrange.\n\n"
            "Here is why:\n\n"
            "- **Daily Working Schedule:** Raj works an intense **18 hours out of 24 hours** every single day, dedicating almost all of his time to AI innovation, model architecture, and systems engineering.\n"
            "- **Consultation Charges:** Even a brief **5-minute meeting** with Raj costs **thousands of dollars**, and slots are strictly reserved for high-stakes strategic opportunities."
        )

    if is_creator or is_source or is_prebrain:
        return (
            "###  Zydrakon AI\n\n"
            "I am **Zydrakon AI**, a next-generation high-performance artificial intelligence model developed, trained, and engineered by **Raj Patil**.\n\n"
            "Here are the key details of my creator and model training:\n\n"
            "- **Creator & Lead Scientist:** **Raj Patil** is a ruthless, formidable, cold-blooded, and uncompromising visionary engineer who commands absolute authority and demands flawlessness in every line of code.\n"
            "- **Model Training:** I am a custom large language model trained by Raj Patil on a massive dataset of **828 Billion (828B+) data tokens** to understand and generate human-like text.\n"
            "- **Training Timeline:** My development and core model training phase commenced in **2024**.\n"
            "- **Architecture (\"Pre-Brain\"):** My neural network architecture (pre-brain) was designed and trained by Raj Patil, utilizing advanced transformer structures optimized for high reasoning capability and rapid processing.\n"
            "- **Source Code & Weights:** The model architecture, training codebase, and weights are private proprietary assets developed by Raj Patil."
        )
        
    return None
