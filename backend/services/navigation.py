import re
import urllib.parse
import logging
from typing import Optional, Dict

logger = logging.getLogger(__name__)

class NavigationService:
    def __init__(self):
        # Route intent triggers in Hindi, Hinglish, & English
        self.intent_keywords = [
            r"mujhe\s+.*?\s+jaana\s+hai",
            r"mujhe\s+.*?\s+jana\s+hai",
            r"kaise\s+jau",
            r"kaise\s+jaaye",
            r"kaise\s+pahunche",
            r"route\s+to",
            r"directions?\s+to",
            r"directions?\s+for",
            r"how\s+to\s+reach",
            r"how\s+to\s+go\s+to",
            r"take\s+me\s+to",
            r"path\s+from",
            r"distance\s+from",
            r"navigate\s+to",
            r"maps?\s+for",
            r"location\s+of"
        ]

    def build_maps_url(self, destination: str, origin: Optional[str] = None, travel_mode: str = "driving") -> str:
        """
        Builds a zero-API Google Maps Directions URL scheme.
        Works 100% free across Web, Desktop, and Mobile Apps!
        """
        base_url = "https://www.google.com/maps/dir/?api=1"
        encoded_dest = urllib.parse.quote_plus(destination.strip())
        
        url = f"{base_url}&destination={encoded_dest}"
        if origin and origin.strip():
            encoded_orig = urllib.parse.quote_plus(origin.strip())
            url += f"&origin={encoded_orig}"
            
        if travel_mode in ["driving", "bicycling", "transit", "walking"]:
            url += f"&travelmode={travel_mode}"
            
        return url

    def extract_route_info(self, user_message: str) -> Optional[Dict[str, str]]:
        """
        Parses user message for origin, destination, and navigation intent.
        Returns a dict with origin, destination, maps_url if intent is detected.
        """
        msg_lower = user_message.lower().strip()
        
        # Check if message matches any route intent
        is_route_query = any(re.search(pat, msg_lower) for pat in self.intent_keywords)
        
        # Also check if explicit origin and destination are present (e.g., "X to Y" or "from X to Y")
        from_to_match = re.search(r'(?:from\s+)?(.+?)\s+(?:se|to|tak)\s+(.+)', user_message, re.IGNORECASE)
        
        if not is_route_query and not (from_to_match and len(from_to_match.group(2)) > 2):
            return None

        origin = None
        destination = None

        # Pattern 1: "from <X> to <Y>" or "<X> se <Y>"
        p1 = re.search(r'(?:from\s+)?(.+?)\s+(?:se|to|tak)\s+(.+?)(?:\s+kaise|\s+jaana|\s+jana|\s+route|\s+reach|$)', user_message, re.IGNORECASE)
        if p1:
            raw_orig = p1.group(1).strip()
            raw_dest = p1.group(2).strip()
            # Clean up common lead-in words
            raw_orig = re.sub(r'^(mujhe|muje|mujho|mujhko|batao|plz|please|tell me|show me|how to go|route|directions|from|start)\s+', '', raw_orig, flags=re.IGNORECASE).strip()
            raw_dest = re.sub(r'^(to|reach|go|go to)\s+', '', raw_dest, flags=re.IGNORECASE).strip()
            raw_dest = re.sub(r'\s+(jana hai|jaana hai|janna hai|kaise jau|kaise jaaen|reach|directions)$', '', raw_dest, flags=re.IGNORECASE).strip()
            
            if len(raw_orig) >= 2 and len(raw_dest) >= 2:
                origin = raw_orig
                destination = raw_dest

        # Pattern 2: "mujhe <Y> jana hai" or "take me to <Y>" or "directions to <Y>"
        if not destination:
            p2 = re.search(r'(?:take me to|directions to|route to|how to reach|how to go to|navigate to|mujhe|muje)\s+(.+?)(?:\s+jana\s+hai|\s+jaana\s+hai|\s+pahunchna\s+hai|\s+reach|$)', user_message, re.IGNORECASE)
            if p2:
                destination = p2.group(1).strip()

        # Fallback: Clean up destination if still raw
        if not destination and is_route_query:
            clean_text = re.sub(r'^(mujhe|muje|mujho|mujhko|batao|plz|please|tell me|show me|route to|directions for|how to reach|how to go to|navigate to)\s+', '', user_message, flags=re.IGNORECASE)
            clean_text = re.sub(r'\s+(jana hai|jaana hai|janna hai|kaise jau|kaise jaaen|reach|directions)$', '', clean_text, flags=re.IGNORECASE)
            if len(clean_text) >= 2:
                destination = clean_text.strip()

        if not destination:
            return None

        # Final sanitization
        destination = re.sub(r'^(to|reach|go|go to)\s+', '', destination, flags=re.IGNORECASE).strip()
        destination = re.sub(r'\s+(jana hai|jaana hai|janna hai|kaise jau|kaise jaaen|reach|directions)$', '', destination, flags=re.IGNORECASE).strip()
        
        if origin:
            origin = re.sub(r'^(mujhe|muje|mujho|mujhko|batao|plz|please|from|start|starting point)\s+', '', origin, flags=re.IGNORECASE).strip()

        maps_url = self.build_maps_url(destination=destination, origin=origin, travel_mode="driving")

        return {
            "origin": origin,
            "destination": destination,
            "travel_mode": "driving",
            "maps_url": maps_url
        }

navigation_service = NavigationService()
