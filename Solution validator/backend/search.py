import httpx
import urllib.parse
from bs4 import BeautifulSoup
from typing import List, Dict, Any
from backend.config import config

class SearchEngine:
    """
    Handles queries to the web. Supports Serper.dev API as the primary provider
    and a robust, zero-dependency DuckDuckGo HTML parser as a fallback.
    """
    def __init__(self):
        self.api_key = config.serper_api_key
        self.client = httpx.Client(
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            },
            timeout=10.0,
            follow_redirects=True
        )

    def execute_search(self, query: str, filetype_filter: str = None) -> List[Dict[str, str]]:
        """
        Executes search. Automatically handles query refinement for specific filetypes.
        """
        refined_query = query
        if filetype_filter:
            refined_query = f"{query} filetype:{filetype_filter}"

        if self.api_key:
            return self._query_serper(refined_query)
        else:
            return self._query_ddg(refined_query)

    def _query_serper(self, query: str) -> List[Dict[str, str]]:
        """Hits Serper.dev API endpoints to get high-fidelity Google search results."""
        url = "https://google.serper.dev/search"
        payload = {"q": query, "num": 10}
        headers = {
            "X-API-KEY": self.api_key,
            "Content-Type": "application/json"
        }
        try:
            response = self.client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()
            results = []
            for item in data.get("organic", []):
                results.append({
                    "title": item.get("title", ""),
                    "link": item.get("link", ""),
                    "snippet": item.get("snippet", ""),
                    "source": "google"
                })
            return results
        except Exception as e:
            print(f"[Warning] Serper API error: {e}. Cascading fallback to DuckDuckGo...")
            return self._query_ddg(query)

    def _query_ddg(self, query: str) -> List[Dict[str, str]]:
        """Scrapes DuckDuckGo HTML output in a clean, zero-config search module."""
        encoded_query = urllib.parse.quote_plus(query)
        url = f"https://html.duckduckgo.com/html/?q={encoded_query}"
        try:
            response = self.client.get(url)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, 'html.parser')
            results = []
            
            # DuckDuckGo HTML structure search
            for a in soup.find_all('a', class_='result__snippet'):
                parent = a.find_parent('div', class_='result__body')
                if not parent:
                    continue
                title_elem = parent.find('a', class_='result__url')
                if title_elem:
                    title = title_elem.get_text(strip=True)
                    link = title_elem.get('href', '')
                    if link.startswith('//'):
                        link = 'https:' + link
                    
                    # Unescape DuckDuckGo external redirect URLs if present
                    try:
                        parsed = urllib.parse.urlparse(link)
                        params = urllib.parse.parse_qs(parsed.query)
                        if 'uddg' in params:
                            link = params['uddg'][0]
                    except Exception:
                        pass
                    
                    snippet = a.get_text(strip=True)
                    results.append({
                        "title": title,
                        "link": link,
                        "snippet": snippet,
                        "source": "duckduckgo"
                    })
            return results[:8]
        except Exception as e:
            print(f"[Error] Fallback search error: {e}")
            return []
