import os
import re
import urllib.parse
from typing import Dict, List, Any
import httpx
from bs4 import BeautifulSoup

class SolutionValidatorEngine:
    """
    Core validation engine that handles searching, scraping, and categorizing
    downloadable documents (PDFs, Whitepapers, Case Studies) for a problem-solution pair.
    """
    
    def __init__(self, serper_api_key: str = None, gemini_api_key: str = None):
        self.serper_api_key = serper_api_key or os.environ.get("SERPER_API_KEY")
        self.gemini_api_key = gemini_api_key or os.environ.get("GEMINI_API_KEY")
        self.client = httpx.Client(
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"},
            timeout=10.0,
            follow_redirects=True
        )

    def search_web(self, query: str, filetype_filter: str = None) -> List[Dict[str, str]]:
        """
        Executes a search query using Serper.dev API if key is present,
        otherwise falls back to a clean DuckDuckGo HTML parser.
        """
        full_query = query
        if filetype_filter:
            full_query = f"{query} filetype:{filetype_filter}"

        if self.serper_api_key:
            return self._search_serper(full_query)
        else:
            return self._search_ddg_fallback(full_query)

    def _search_serper(self, query: str) -> List[Dict[str, str]]:
        """Queries the Serper.dev API for high-quality organic results."""
        url = "https://google.serper.dev/search"
        payload = {"q": query, "num": 10}
        headers = {
            "X-API-KEY": self.serper_api_key,
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
                    "snippet": item.get("snippet", "")
                })
            return results
        except Exception as e:
            print(f"[Warning] Serper API failed ({e}). Falling back to DuckDuckGo...")
            return self._search_ddg_fallback(query)

    def _search_ddg_fallback(self, query: str) -> List[Dict[str, str]]:
        """Zero-config fallback scraper for DuckDuckGo search results."""
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
                        "snippet": snippet
                    })
            return results[:8]
        except Exception as e:
            print(f"[Error] Fallback search failed: {e}")
            return []

    def scrape_and_extract_assets(self, url: str) -> List[Dict[str, str]]:
        """
        Crawls a target webpage and extracts downloadable asset links
        such as PDFs, Whitepapers, Case Studies, and documentation.
        """
        assets = []
        try:
            response = self.client.get(url)
            if response.status_code != 200:
                return []
            
            soup = BeautifulSoup(response.text, 'html.parser')
            base_url = f"{urllib.parse.urlparse(url).scheme}://{urllib.parse.urlparse(url).netloc}"
            
            for link_tag in soup.find_all('a', href=True):
                href = link_tag['href']
                text = link_tag.get_text(strip=True)
                
                # Resolve relative paths
                absolute_url = urllib.parse.urljoin(url, href)
                
                # Analyze href structure and anchor text to classify assets
                category = self._classify_link(absolute_url, text)
                if category:
                    assets.append({
                        "title": text if len(text) > 4 else f"{category.capitalize()} Link",
                        "url": absolute_url,
                        "category": category
                    })
            
            # Deduplicate by URL
            unique_assets = {}
            for asset in assets:
                unique_assets[asset["url"]] = asset
            return list(unique_assets.values())
        except Exception as e:
            print(f"[Warning] Failed to scrape {url}: {e}")
            return []

    def _classify_link(self, url: str, text: str) -> str:
        """Classifies a URL into a category based on regex heuristics."""
        url_lower = url.lower()
        text_lower = text.lower()
        
        # Define matching patterns
        pdf_pattern = r'\.pdf$'
        case_study_pattern = r'case-study|case_study|success-story|customer-story'
        whitepaper_pattern = r'whitepaper|white-paper|research-paper|industry-report'
        doc_pattern = r'/docs/|/documentation/|/manual/|/api-ref'
        
        # 1. Whitepapers & Reports
        if re.search(whitepaper_pattern, url_lower) or re.search(whitepaper_pattern, text_lower):
            return "whitepaper"
        
        # 2. Case Studies
        if re.search(case_study_pattern, url_lower) or re.search(case_study_pattern, text_lower):
            return "case_study"
            
        # 3. Documentation
        if re.search(doc_pattern, url_lower) or "docs" in text_lower or "documentation" in text_lower:
            return "documentation"
            
        # 4. Standard PDFs (if not already classified as whitepaper/case study)
        if re.search(pdf_pattern, url_lower):
            return "pdf"
            
        return None

    def validate_solution(self, problem: str, solution: str) -> Dict[str, Any]:
        """
        Runs the full validation flow: searches, scrapes found links,
        extracts downloadable documents, and preps for LLM comparison.
        """
        print(f"[*] Validating Solution: {solution[:50]}...")
        
        # Step 1: Create search queries
        search_query = f'"{solution}" OR ("{problem[:30]}" AND "{solution[:30]}")'
        document_query = f'{solution} filetype:pdf'
        
        # Step 2: Query the web
        general_results = self.search_web(search_query)
        doc_results = self.search_web(document_query, filetype_filter="pdf")
        
        all_sources = general_results + doc_results
        
        # Deduplicate results by URL
        unique_sources = {}
        for res in all_sources:
            unique_sources[res["link"]] = res
            
        # Step 3: Extract downloadable documents from top 3 organic sources
        downloadable_assets = []
        
        # Direct PDFs from filetype:pdf search
        for url, res in unique_sources.items():
            if url.endswith(".pdf"):
                downloadable_assets.append({
                    "title": res["title"] or "Direct PDF Document",
                    "url": url,
                    "category": "pdf"
                })
                
        # Scraping targets for inner whitepaper/case study links
        top_targets = [url for url in unique_sources.keys() if not url.endswith(".pdf")][:3]
        for target in top_targets:
            scraped = self.scrape_and_extract_assets(target)
            downloadable_assets.extend(scraped)
            
        # Deduplicate downloads
        unique_downloads = {}
        for d in downloadable_assets:
            unique_downloads[d["url"]] = d

        return {
            "search_query_used": search_query,
            "verified_sources": list(unique_sources.values())[:10],
            "downloadable_assets": list(unique_downloads.values())[:10]
        }

# Quick demonstration
if __name__ == "__main__":
    validator = SolutionValidatorEngine()
    # Test queries
    test_prob = "Finding a quick taxi in a crowded metropolis"
    test_sol = "Ride-hailing platform using mobile GPS matching"
    
    report = validator.validate_solution(test_prob, test_sol)
    
    print("\n=== VERIFIED SOURCES ===")
    for src in report["verified_sources"][:3]:
        print(f"- {src['title']}\n  Link: {src['link']}")
        
    print("\n=== DOWNLOADABLE ASSETS ===")
    for asset in report["downloadable_assets"][:5]:
        print(f"- [{asset['category'].upper()}] {asset['title']}\n  URL: {asset['url']}")
