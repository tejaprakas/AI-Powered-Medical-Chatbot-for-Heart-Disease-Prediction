import re
import urllib.parse
import httpx
from bs4 import BeautifulSoup
from typing import List, Dict, Any

class AssetScraper:
    """
    Crawls target websites to extract and classify downloadable documents
    (PDFs, Whitepapers, Case Studies, and official API/User manuals).
    """
    def __init__(self):
        self.client = httpx.Client(
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            },
            timeout=8.0,
            follow_redirects=True
        )

    def extract_assets_from_url(self, url: str) -> List[Dict[str, str]]:
        """Scrapes URL and isolates candidate document downloads."""
        assets = []
        try:
            # We don't want to parse raw binary files like PDFs
            if url.lower().endswith(".pdf"):
                return [{
                    "title": "Direct Document PDF",
                    "url": url,
                    "category": "pdf"
                }]

            response = self.client.get(url)
            if response.status_code != 200:
                return []

            # Parse content
            soup = BeautifulSoup(response.text, 'html.parser')
            
            for link_tag in soup.find_all('a', href=True):
                href = link_tag['href']
                text = link_tag.get_text(strip=True)
                
                # Make relative paths absolute
                absolute_url = urllib.parse.urljoin(url, href)
                
                # Check for document patterns
                category = self._classify_url(absolute_url, text)
                if category:
                    assets.append({
                        "title": text if len(text) > 4 else f"{category.replace('_', ' ').capitalize()} Link",
                        "url": absolute_url,
                        "category": category
                    })
            
            # Deduplicate items by URL
            unique_assets = {}
            for asset in assets:
                unique_assets[asset["url"]] = asset
                
            return list(unique_assets.values())
        except Exception as e:
            print(f"[Warning] Error scraping assets from {url}: {e}")
            return []

    def _classify_url(self, url: str, text: str) -> str | None:
        """Classifies url/text using heuristic regex patterns."""
        url_lower = url.lower()
        text_lower = text.lower()
        
        # Check domain whitelist exceptions (skip social media, standard share links, login)
        ignore_domains = ['twitter.com', 'facebook.com', 'linkedin.com', 'login', 'signup', 'share', 'javascript:']
        if any(d in url_lower for d in ignore_domains):
            return None

        # Regex heuristics
        pdf_pattern = r'\.pdf$'
        case_study_pattern = r'case-study|case_study|success-story|customer-story|case-studies'
        whitepaper_pattern = r'whitepaper|white-paper|research-paper|industry-report|reports/'
        doc_pattern = r'/docs/|/documentation/|/manual/|/api-ref|docs\.'
        
        if re.search(whitepaper_pattern, url_lower) or re.search(whitepaper_pattern, text_lower):
            return "whitepaper"
            
        if re.search(case_study_pattern, url_lower) or re.search(case_study_pattern, text_lower):
            return "case_study"
            
        if re.search(doc_pattern, url_lower) or "docs" in text_lower or "documentation" in text_lower:
            return "documentation"
            
        if re.search(pdf_pattern, url_lower):
            return "pdf"
            
        return None
