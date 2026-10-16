from typing import List, Dict, Any, Optional
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from app.models import Module, ModuleChunk


class RAGEngine:
    """
    Retrieval-Augmented Generation (RAG) engine for retrieving
    relevant syllabus chunks based on subject modules and topics.
    """

    def __init__(self, modules: List[Module]):
        self.modules = [m for m in modules if m.is_included and m.extracted_text.strip()]
        self.chunks_data: List[Dict[str, Any]] = []
        self._build_index()

    def _build_index(self):
        """Build chunk metadata and TF-IDF search index from modules."""
        self.chunks_data = []
        for mod in self.modules:
            # Use chunks if stored, otherwise use module chunks or full text
            if mod.chunks and len(mod.chunks) > 0:
                for chunk in mod.chunks:
                    self.chunks_data.append({
                        "module_id": mod.id,
                        "module_number": mod.module_number,
                        "module_name": mod.module_name,
                        "text": chunk.chunk_text.strip()
                    })
            else:
                # If no pre-computed chunks, use module text as chunk
                self.chunks_data.append({
                    "module_id": mod.id,
                    "module_number": mod.module_number,
                    "module_name": mod.module_name,
                    "text": mod.extracted_text.strip()
                })

        if not self.chunks_data:
            self.vectorizer = None
            self.tfidf_matrix = None
            return

        corpus = [c["text"] for c in self.chunks_data]
        self.vectorizer = TfidfVectorizer(
            ngram_range=(1, 2),
            stop_words="english",
            max_df=0.95,
            sublinear_tf=True
        )
        try:
            self.tfidf_matrix = self.vectorizer.fit_transform(corpus)
        except Exception:
            self.tfidf_matrix = None

    def retrieve_chunks(
        self,
        query: str,
        module_id: Optional[int] = None,
        module_name: Optional[str] = None,
        top_k: int = 3
    ) -> List[Dict[str, Any]]:
        """
        Retrieve the most relevant chunks for a specific module or query.
        """
        if not self.chunks_data:
            return []

        # Filter candidate chunks by module if specified
        candidates = []
        candidate_indices = []
        for idx, item in enumerate(self.chunks_data):
            if module_id is not None and item["module_id"] != module_id:
                continue
            if module_name is not None and module_name.lower() not in item["module_name"].lower():
                continue
            candidates.append(item)
            candidate_indices.append(idx)

        # If no module matched or specific match is empty, fall back to all
        if not candidates:
            candidates = self.chunks_data
            candidate_indices = list(range(len(self.chunks_data)))

        # If query is empty or vectorizer not ready, return first top_k candidates
        if not query or self.vectorizer is None or self.tfidf_matrix is None:
            return candidates[:top_k]

        try:
            query_vec = self.vectorizer.transform([query])
            sub_matrix = self.tfidf_matrix[candidate_indices]
            sims = cosine_similarity(query_vec, sub_matrix).flatten()
            ranked_order = np.argsort(-sims)

            results = []
            for rank_idx in ranked_order[:top_k]:
                matched_candidate = candidates[rank_idx]
                score = float(sims[rank_idx])
                results.append({
                    **matched_candidate,
                    "similarity_score": score
                })
            return results
        except Exception:
            return candidates[:top_k]

    def get_grounding_context_for_module(self, module_name: str, top_k: int = 4) -> str:
        """
        Format retrieved syllabus content into a clean reference string
        to inject into Gemini LLM prompts.
        """
        chunks = self.retrieve_chunks(query=module_name, module_name=module_name, top_k=top_k)
        if not chunks:
            # Try searching by module name alone
            chunks = self.retrieve_chunks(query=module_name, top_k=top_k)

        context_blocks = []
        for c in chunks:
            text_snippet = c["text"]
            if len(text_snippet) > 1200:
                text_snippet = text_snippet[:1200] + "... [truncated]"
            context_blocks.append(f"--- [Module: {c['module_name']}] ---\n{text_snippet}")

        return "\n\n".join(context_blocks)
