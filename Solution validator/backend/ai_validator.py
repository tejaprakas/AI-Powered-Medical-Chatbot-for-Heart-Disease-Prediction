import json
from pydantic import BaseModel, Field
from google import genai
from google.genai import types
from backend.config import config

class ValidationReport(BaseModel):
    match_score: int = Field(..., description="Integrative similarity match score from 0 to 100")
    rationale: str = Field(..., description="Detailed technical explanation of the overlap, product design, and architectural commonalities.")
    commonalities: list[str] = Field(..., description="Core features, concepts, or target problems already fully addressed by existing solutions.")
    differentiators: list[str] = Field(..., description="Unique elements, novel technical improvements, or distinct market angles of the user's solution.")
    market_saturation: str = Field(..., description="Market density assessment: LOW, MODERATE, or HIGH")
    alternative_suggestions: list[str] = Field(..., description="Practical engineering pivots, specific target audiences, or feature adaptations to bypass direct market duplication.")

class AIValidator:
    """
    Core semantic comparison engine that uses the Gemini API via the google-genai SDK
    to analyze matching characteristics and structure a market report.
    """
    def __init__(self):
        self.api_key = config.gemini_api_key
        if self.api_key:
            # The client will utilize GEMINI_API_KEY from environment or directly passed
            self.client = genai.Client(api_key=self.api_key)
        else:
            self.client = None
            print("[Warning] No GEMINI_API_KEY found. Running in heuristic simulation mode.")

    def run_comparison(self, problem: str, solution: str, sources: list[dict]) -> ValidationReport:
        """Runs the validation comparison using Gemini or falls back to heuristic matching."""
        if not self.client:
            return self._run_heuristic_fallback(problem, solution, sources)

        # Build prompt content from search sources
        sources_text = ""
        for i, src in enumerate(sources[:8], 1):
            sources_text += f"\nCompetitor {i}:\n"
            sources_text += f"Title: {src.get('title')}\n"
            sources_text += f"Link: {src.get('link')}\n"
            sources_text += f"Snippet: {src.get('snippet')}\n"

        prompt = f"""
        You are an expert AI Solutions Architect and Venture General Partner.
        Your goal is to validate if a proposed startup idea/solution already exists in the market based on web search sources.
        
        Compare the following user concept against the web search results provided.
        
        [USER'S CONCEPT]
        - Problem Statement: {problem}
        - Proposed Solution: {solution}
        
        [WEB SEARCH RESULTS / EXISTING COMPETITORS]
        {sources_text}
        
        Analyze:
        1. Whether the exact core technological solution already exists.
        2. Where the user's proposal has key commonalities with existing competitors.
        3. Any potential differentiators (e.g. unique UX, distinct tech architecture, specific underserved demographics).
        4. Calculate a global Match Score (0 to 100):
           - 0-30: Virtually no competitor exists. The space is completely open (Blue Ocean).
           - 31-70: Competitors exist, but they have different features, target markets, or technical stacks. Pivot advised.
           - 71-100: Established direct competitors exist with the exact same USP. Highly saturated.
        5. Formulate a final recommendation.
        """

        try:
            response = self.client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=ValidationReport,
                    temperature=0.2,
                )
            )
            # Parse response json into ValidationReport Pydantic model
            report_dict = json.loads(response.text)
            return ValidationReport(**report_dict)
        except Exception as e:
            print(f"[Error] Gemini API generation failed: {e}. Cascading to heuristic fallback...")
            return self._run_heuristic_fallback(problem, solution, sources, api_error=True)

    def _run_heuristic_fallback(self, problem: str, solution: str, sources: list[dict], api_error: bool = False) -> ValidationReport:
        """
        Generates a smart, realistic analysis report using simple heuristic overlaps
        to ensure the app remains fully interactive and testable without a valid API key.
        """
        # Count keyword overlap between solution/problem and search snippet texts
        keywords = set(re.findall(r'\w+', (solution + " " + problem).lower()))
        match_count = 0
        overlapping_terms = set()
        
        for src in sources[:6]:
            text = (src.get('title', '') + " " + src.get('snippet', '')).lower()
            for kw in keywords:
                if len(kw) > 3 and kw in text:
                    match_count += 1
                    overlapping_terms.add(kw)

        # Base calculations for simulation
        source_count = len(sources)
        if source_count == 0:
            match_score = 12
            saturation = "LOW"
            rationale_prefix = "No direct matching web sources or competitors were identified during web index sweeps."
        else:
            overlap_weight = min((match_count / 15.0) * 100, 95.0)
            # Standardize match score based on overlap findings
            match_score = int(max(20.0, overlap_weight)) if overlap_weight > 0 else int(15 + source_count * 5)
            match_score = min(match_score, 98)
            
            if match_score > 70:
                saturation = "HIGH"
                rationale_prefix = f"Extremely high search similarity discovered. Multiple digital portals match core descriptors like: {', '.join(list(overlapping_terms)[:4])}."
            elif match_score > 35:
                saturation = "MODERATE"
                rationale_prefix = f"Moderate overlap detected. Similar services address elements of the problem domain, but distinct technological implementation offsets direct replication."
            else:
                saturation = "LOW"
                rationale_prefix = f"Low direct market replication detected. Standard industry players solve tangential problems, but your proposed approach has a highly vacant competitive index."

        status_msg = " [Demokit Fallback Active: Set GEMINI_API_KEY for dynamic AI processing]" if not api_error else " [AI Server Timeout Fallback]"
        
        return ValidationReport(
            match_score=match_score,
            rationale=f"{rationale_prefix} This evaluation was processed via local heuristic similarity engines.{status_msg}",
            commonalities=[
                f"Addresses the core target problem of '{problem[:40]}...'",
                "Utilizes online distribution and standardized service models.",
                "Competes broadly in the same industry domain."
            ],
            differentiators=[
                "Novel integration of features specified in your solution.",
                "Custom optimization pathways tailored to specific user experiences.",
                "Pioneering technical stack implementation."
            ],
            market_saturation=saturation,
            alternative_suggestions=[
                "Hone in on specific micro-demographics to build early traction.",
                "Differentiate by incorporating localized, high-touch user integrations.",
                "Create proprietary APIs to build structural moats."
            ]
        )
