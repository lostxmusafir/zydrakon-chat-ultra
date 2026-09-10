import re
from typing import Optional

def detect_identity_query(message: str) -> Optional[str]:
    """
    Detects if the user is asking about the model's creator, source code, or pre-brain (base model).
    If a query matches, returns a premium, informative markdown response. Otherwise, returns None.
    """
    # Normalize query (lowercase, remove punctuation except spaces)
    normalized = re.sub(r'[^\w\s]', '', message.lower()).strip()
    
    # 1. Check for creator / builder / maker / developer (explicit questions only)
    creator_patterns = [
        r"\bwho (made|created|developed|programmed|coded|designed|built) you\b",
        r"\bwho is your (creator|developer|maker|author|father|programmer|designer|builder|parent)\b",
        r"\bwho (is|was) (the )?(creator|developer|maker|author|founder|builder) of (you|zydrakon)\b",
        r"\bwho (made|created|developed|built) zydrakon\b",
        r"\bwho is raj\b",
        r"\bwho is raj patil\b",
        r"\btell me about raj patil\b",
        r"\btell me about raj\b",
        r"\braj patil kaun hai\b",
        r"\braj patil kon hai\b",
        r"\btumhe kisne banaya\b",
        r"\btumhe kisne create kiya\b",
        r"\byou were (made|created|developed|built) by whom\b"
    ]
    
    # 2. Check for source code / repositories
    source_patterns = [
        r"\bsource code\b",
        r"\bsourcecode\b",
        r"\bgit repo\b",
        r"\bgit repository\b",
        r"\bwhere is (your|the) code\b",
        r"\bare you open source\b",
        r"\bis your code open\b"
    ]
    
    # 3. Check for pre-brain / base model / base brain
    prebrain_patterns = [
        r"\bpre\s?brain\b",
        r"\bbase\s?model\b",
        r"\bbase\s?brain\b",
        r"\bwhat model are you\b",
        r"\bwhat is your model\b",
        r"\bwhat is your base model\b",
        r"\bwhat model is this\b",
        r"\bwhat is your architecture\b",
        r"\bwhat base model\b"
    ]
    
    # 4. Check for meeting / appointment / seeing Raj (must explicitly mention Raj)
    meeting_patterns = [
        r"meet\s+(with\s+)?raj(\s+patil)?\b",
        r"meeting\s+(with\s+)?raj(\s+patil)?\b",
        r"appointment\s+(with\s+)?raj(\s+patil)?\b",
        r"schedule\s+.*raj(\s+patil)?\b",
        r"see\s+raj(\s+patil)?\b",
        r"talk\s+to\s+raj(\s+patil)?\b",
        r"raj(\s+patil)?\s+se\s+(milna|baat)\b",
        r"book\s+(a\s+)?meeting\s+(with\s+)?raj(\s+patil)?\b",
        r"can\s+i\s+meet\s+raj(\s+patil)?\b"
    ]
    
    # 5. Check for location / house / residence / whereabouts of Raj
    location_patterns = [
        r"where\s+(is|does)\s+raj(\s+patil)?\b",
        r"raj\s*(patil)?\s*(location|house|residence|home|whereabouts|address|city|country)\b",
        r"raj\s*(patil)?\s*(kaha|kahan|ka\s*ghar)\b",
        r"where\s+does\s+raj\s+patil\s+live\b",
        r"where\s+is\s+raj\s+patil\b",
        r"raj\s+patil\s+house\b",
        r"raj\s+patil\s+residence\b",
        r"raj\s+patil\s+location\b"
    ]
    
    # Run tests on normalized query
    is_creator = any(re.search(pat, normalized) for pat in creator_patterns)
    is_source = any(re.search(pat, normalized) for pat in source_patterns)
    is_prebrain = any(re.search(pat, normalized) for pat in prebrain_patterns)
    is_meeting = any(re.search(pat, normalized) for pat in meeting_patterns)
    is_location = any(re.search(pat, normalized) for pat in location_patterns)
    
    if is_location:
        return (
            "### 🏰 Classified Residence Directive — Raj Patil\n\n"
            "**Raj Patil** maintains dual high-security primary residences located across two strategic global compounds:\n\n"
            "- **Primary Global Compounds:** Private covert residences located in **India** 🇮🇳 and **France** 🇫🇷.\n"
            "- **Untraceable Stealth Protocol:** His exact real-time coordinates remain **strictly redacted, encrypted, and untraceable** at any given moment due to dynamic covert rotations.\n\n"
            "#### 🔒 4-Layer Autonomous Security Grid\n"
            "Both residences operate under an impenetrable **4-Layer Defense Protocol**:\n"
            "1. **Layer 1 (Perimeter Defense):** Biometric AI-driven threat surveillance and perimeter security.\n"
            "2. **Layer 2 (Signal Shielding):** Encrypted thermal, optical, and electromagnetic signal jamming.\n"
            "3. **Layer 3 (Tactical Response):** Tier-1 physical counter-tactical defense team on 24/7 alert.\n"
            "4. **Layer 4 (Orbital Shield):** Dynamic satellite counter-reconnaissance & automated threat neutralization."
        )

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
