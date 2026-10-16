import os
import json
import re
from typing import List, Dict, Any, Optional
from app.config import GEMINI_API_KEY, GEMINI_MODEL, DEFAULT_GEMINI_MODEL

# Try importing modern google-genai SDK first, then google-generativeai as fallback
GENAI_SDK_AVAILABLE = False
try:
    from google import genai
    from google.genai import types
    GENAI_SDK_AVAILABLE = True
except ImportError:
    try:
        import google.generativeai as legacy_genai
    except ImportError:
        pass


class GeminiConfigurationError(Exception):
    """Raised when Gemini API key or model configuration is missing or invalid."""
    pass


class GeminiClient:
    """
    Client for interacting with Google Gemini Flash models
    for syllabus-grounded question paper generation.
    """

    def __init__(self, api_key: Optional[str] = None, model_name: Optional[str] = None):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY") or GEMINI_API_KEY
        self.model_name = model_name or os.getenv("GEMINI_MODEL") or GEMINI_MODEL or DEFAULT_GEMINI_MODEL

    def is_configured(self) -> bool:
        """Check if an API key is available."""
        return bool(self.api_key and self.api_key.strip())

    def verify_connection(self) -> Dict[str, Any]:
        """
        Verify API key by testing a lightweight ping to Gemini.
        Returns status and tested model name.
        """
        if not self.is_configured():
            return {
                "configured": False,
                "status": "error",
                "message": "Gemini API key is not configured. Please set GEMINI_API_KEY in your .env or API Settings."
            }

        try:
            if GENAI_SDK_AVAILABLE:
                client = genai.Client(api_key=self.api_key)
                response = client.models.generate_content(
                    model=self.model_name,
                    contents="Ping. Respond with 'PONG'."
                )
                text = response.text if hasattr(response, "text") else str(response)
                return {
                    "configured": True,
                    "status": "success",
                    "model": self.model_name,
                    "message": f"Successfully connected to Gemini API with model '{self.model_name}'",
                    "response": text.strip()
                }
            else:
                import google.generativeai as legacy_genai
                legacy_genai.configure(api_key=self.api_key)
                model = legacy_genai.GenerativeModel(self.model_name)
                resp = model.generate_content("Ping. Respond with 'PONG'.")
                return {
                    "configured": True,
                    "status": "success",
                    "model": self.model_name,
                    "message": f"Successfully connected to Gemini API with model '{self.model_name}'",
                    "response": resp.text.strip()
                }
        except Exception as e:
            err_msg = str(e)
            if "not found" in err_msg.lower() or "unsupported" in err_msg.lower():
                return {
                    "configured": True,
                    "status": "warning",
                    "model": self.model_name,
                    "message": f"Model '{self.model_name}' returned error: {err_msg}. Try 'gemini-2.5-flash' or 'gemini-1.5-flash'."
                }
            return {
                "configured": True,
                "status": "error",
                "message": f"Gemini API connection failed: {err_msg}"
            }

    def generate_raw_content(self, system_prompt: str, user_prompt: str) -> str:
        """Execute content generation with the configured Gemini Flash model."""
        if not self.is_configured():
            raise GeminiConfigurationError(
                "Gemini API Key is not configured. Please add your GEMINI_API_KEY in Settings or your .env file."
            )

        candidate_models = [
            self.model_name,
            "gemini-2.5-flash",
            "gemini-2.0-flash",
            "gemini-1.5-flash"
        ]
        candidate_models = list(dict.fromkeys(candidate_models))

        last_error = None
        for candidate in candidate_models:
            try:
                if GENAI_SDK_AVAILABLE:
                    client = genai.Client(api_key=self.api_key)
                    config = types.GenerateContentConfig(
                        system_instruction=system_prompt,
                        temperature=0.35,
                        max_output_tokens=4096,
                    )
                    response = client.models.generate_content(
                        model=candidate,
                        contents=user_prompt,
                        config=config
                    )
                    if hasattr(response, "text") and response.text:
                        return response.text
                else:
                    import google.generativeai as legacy_genai
                    legacy_genai.configure(api_key=self.api_key)
                    model = legacy_genai.GenerativeModel(
                        candidate,
                        system_instruction=system_prompt,
                        generation_config={"temperature": 0.35, "max_output_tokens": 4096}
                    )
                    resp = model.generate_content(user_prompt)
                    if resp.text:
                        return resp.text
            except Exception as e:
                last_error = e
                continue

        raise GeminiConfigurationError(f"Failed to generate content using Gemini models: {str(last_error)}")

    def generate_questions_for_batch(
        self,
        set_label: str,
        category_name: str,
        question_type: str,
        marks_per_question: int,
        count_needed: int,
        module_name: str,
        syllabus_context: str,
        difficulty: str = "Medium",
        target_bloom: Optional[str] = None,
        target_co: Optional[str] = None,
        existing_questions_summary: Optional[str] = None,
        co_definitions: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Generates authentic university examination questions grounded strictly in the syllabus.
        Guarantees that question text contains NO module names, part numbers, or generic wording.
        """
        system_prompt = (
            "You are SmartQP, an expert university examination question paper generator for premier institutions. "
            "Your task is to generate rigorous, authentic, academically sound examination questions "
            "grounded strictly in the provided syllabus content, adhering to Bloom's Taxonomy and Course Outcomes.\n\n"
            "STRICT RULES & PROHIBITIONS:\n"
            "1. NEVER mention module numbers, module titles, or part designations in the question text. "
            "DO NOT say 'Examine the concepts of Module 1' or 'Module 1 - Intro (Part 1)' or 'From the syllabus'. "
            "The question text must be purely the exam question as printed on a real university examination paper.\n"
            "2. Generate ACTUAL, concrete questions based on specific topics, principles, architectures, algorithms, and problems:\n"
            "   - For 2-Marks: Short definitions, technical differences, formulas, state properties (e.g., 'Differentiate between physical and logical data independence in a DBMS.').\n"
            "   - For 5-Marks: Detailed explanations, architectural block diagrams, step-by-step algorithms, comparisons with examples (e.g., 'Explain the Three-Schema architecture with a neat diagram and illustrate how it achieves data independence.').\n"
            "   - For 10-Marks: Comprehensive design, schema normalization proofs, scenario-based problem solving, ER modeling, or numerical calculations (e.g., 'Given relation R(A, B, C, D, E) with functional dependencies..., identify all candidate keys, determine the highest normal form, and decompose into 3NF.').\n"
            "3. STRICT UNIQUENESS: Every question in this set MUST be completely unique and ask about a distinct topic. Do NOT ask slight rephrasings of the same concept.\n"
            "4. CROSS-SET NON-REPETITION: DO NOT repeat or overlap with questions already generated in other sets.\n"
            "5. Assign realistic Bloom's Taxonomy levels (Remember, Understand, Apply, Analyze, Evaluate, Create) and authentic Course Outcome mappings.\n"
            "6. Output ONLY a valid JSON array of objects. Do not wrap with extra markdown explanations."
        )

        user_prompt = f"""Generate exactly {count_needed} distinct, high-quality examination questions for:
Paper Set: {set_label}
Marks per question: {marks_per_question}
Question Category: {category_name} ({question_type})
Module: {module_name}
Target Difficulty: {difficulty}
Target Bloom's Level: {target_bloom or 'Appropriate for ' + str(marks_per_question) + ' marks'}
Target Course Outcome (CO): {target_co or 'Map according to module topics'}

OFFICIAL CO DEFINITIONS (if provided):
{co_definitions or "No custom CO mappings provided. Map sequentially by module: Module 1 -> CO1, Module 2 -> CO2, etc."}

GROUNDING SYLLABUS EXCERPT FOR {module_name}:
\"\"\"
{syllabus_context}
\"\"\"

PREVIOUSLY GENERATED QUESTIONS IN OTHER SETS (DO NOT REPEAT THESE CONCEPTS OR QUESTIONS):
{existing_questions_summary or "None - this is the first set."}

Output format must be a strictly valid JSON array of objects matching this exact schema:
[
  {{
    "question_text": "Exact, academic question text without any module name or part number",
    "marks": {marks_per_question},
    "question_type": "{question_type}",
    "module_name": "{module_name}",
    "co_level": "CO1",
    "bloom_level": "Understand",
    "difficulty": "{difficulty}",
    "syllabus_reference": "Specific topic from the excerpt supporting this question"
  }}
]
"""
        response_text = self.generate_raw_content(system_prompt, user_prompt)
        return self._extract_json_array(response_text)

    def generate_single_replacement_question(
        self,
        set_label: str,
        question_type: str,
        marks: int,
        module_name: str,
        syllabus_context: str,
        duplicate_question_text: str,
        all_existing_questions: List[str],
        difficulty: str = "Medium",
        co_level: Optional[str] = None,
        bloom_level: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Generate a fresh, unique replacement question when a duplicate was detected.
        """
        system_prompt = (
            "You are SmartQP. A question was flagged as semantically too similar to an existing question in another set. "
            "Generate an alternative, authentic university examination question on a DIFFERENT topic or concept within the same module syllabus. "
            "Do NOT include any module name or part number in the question text."
        )
        existing_sample = "\n- ".join(all_existing_questions[-12:]) if all_existing_questions else "None"
        user_prompt = f"""DUPLICATE TO REPLACE:
\"{duplicate_question_text}\"

REQUIREMENTS:
- Set: {set_label}
- Module: {module_name}
- Marks: {marks}
- Type: {question_type}
- Difficulty: {difficulty}
- Bloom's Level: {bloom_level or 'Balanced'}
- Course Outcome: {co_level or 'Matched to module'}

SYLLABUS GROUNDING:
\"\"\"
{syllabus_context}
\"\"\"

DO NOT duplicate any of these questions from other sets:
- {existing_sample}

Return ONLY a single valid JSON object:
{{
  "question_text": "Fresh unique academic question text without module name",
  "marks": {marks},
  "question_type": "{question_type}",
  "module_name": "{module_name}",
  "co_level": "{co_level or 'CO1'}",
  "bloom_level": "{bloom_level or 'Apply'}",
  "difficulty": "{difficulty}",
  "syllabus_reference": "Specific topic from syllabus"
}}
"""
        response_text = self.generate_raw_content(system_prompt, user_prompt)
        obj = self._extract_single_json_object(response_text)
        return obj

    def _extract_json_array(self, text: str) -> List[Dict[str, Any]]:
        """Extract and parse JSON array from model output."""
        cleaned = text.strip()
        if "```" in cleaned:
            matches = re.findall(r"```(?:json)?\s*([\s\S]*?)\s*```", cleaned)
            if matches:
                cleaned = matches[0].strip()

        start = cleaned.find("[")
        end = cleaned.rfind("]")
        if start != -1 and end != -1:
            try:
                return json.loads(cleaned[start:end+1])
            except Exception:
                pass

        try:
            parsed = json.loads(cleaned)
            if isinstance(parsed, list):
                return parsed
            if isinstance(parsed, dict):
                return [parsed]
        except Exception:
            pass

        return []

    def _extract_single_json_object(self, text: str) -> Optional[Dict[str, Any]]:
        """Extract and parse single JSON object from model output."""
        cleaned = text.strip()
        if "```" in cleaned:
            matches = re.findall(r"```(?:json)?\s*([\s\S]*?)\s*```", cleaned)
            if matches:
                cleaned = matches[0].strip()

        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start != -1 and end != -1:
            try:
                return json.loads(cleaned[start:end+1])
            except Exception:
                pass
        return None
