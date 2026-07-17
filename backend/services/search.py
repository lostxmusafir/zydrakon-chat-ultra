import requests
import re
import logging
from typing import List, Dict, Optional
from urllib.parse import unquote

logger = logging.getLogger(__name__)

class SearchService:
    def __init__(self):
        self.search_url = "https://html.duckduckgo.com/html/"
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
        }

    def clean_html(self, text: str) -> str:
        """Removes HTML tags and entities."""
        text = re.sub(r'<[^>]*>', '', text)
        text = text.replace("&quot;", '"').replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">").replace("&#x27;", "'").replace("&#x2F;", "/")
        return text.strip()

    def search(self, query: str, max_results: int = 5) -> List[Dict[str, str]]:
        """
        Executes a static HTML DuckDuckGo search.
        Returns a list of dicts with keys: 'title', 'url', 'snippet'.
        """
        if not query or query.strip() == "":
            return []
            
        logger.info(f"Performing web search for: '{query}'")
        try:
            response = requests.post(
                self.search_url, 
                data={"q": query}, 
                headers=self.headers, 
                timeout=8
            )
            if response.status_code != 200:
                logger.warning(f"DuckDuckGo search returned status {response.status_code}")
                return []
                
            html = response.text
            blocks = re.split(r'<div class="[^"]*result__body[^"]*">', html)[1:]
            results = []
            
            for block in blocks:
                if len(results) >= max_results:
                    break
                    
                # Extract title/url
                a_match = re.search(r'<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)</a>', block)
                if not a_match:
                    a_match = re.search(r'<a[^>]*href="([^"]*)"[^>]*class="[^"]*result__a[^"]*"[^>]*>([\s\S]*?)</a>', block)
                    
                # Extract snippet
                snippet_match = re.search(r'<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)</a>', block)
                if not snippet_match:
                    snippet_match = re.search(r'<a[^>]*href="[^"]*"[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)</a>', block)
                
                if a_match:
                    raw_url = a_match.group(1)
                    title = self.clean_html(a_match.group(2))
                    
                    url_clean = raw_url
                    if "uddg=" in raw_url:
                        m = re.search(r"uddg=([^&]+)", raw_url)
                        if m:
                            url_clean = unquote(m.group(1))
                    
                    snippet = ""
                    if snippet_match:
                        snippet = self.clean_html(snippet_match.group(1))
                        
                    results.append({
                        "title": title,
                        "url": url_clean,
                        "snippet": snippet
                    })
            
            logger.info(f"Successfully retrieved {len(results)} web search results.")
            return results
        except Exception as e:
            logger.error(f"Error during DuckDuckGo search: {str(e)}")
            return []

search_service = SearchService()
