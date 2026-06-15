"""Shared text/TF-IDF helpers for the recommenders and intent classifier.

Importing scikit-learn is optional: ``SKLEARN_AVAILABLE`` lets callers pick a
heuristic fallback when the library is missing (e.g. before `pip install`).
"""
from __future__ import annotations

import re

try:
    from sklearn.feature_extraction.text import TfidfVectorizer  # noqa: F401
    from sklearn.metrics.pairwise import cosine_similarity  # noqa: F401

    SKLEARN_AVAILABLE = True
except Exception:  # pragma: no cover - import guard
    TfidfVectorizer = None  # type: ignore[assignment]
    cosine_similarity = None  # type: ignore[assignment]
    SKLEARN_AVAILABLE = False


_TOKEN_RE = re.compile(r"[a-z0-9+#.]+")


def normalize(text: str | None) -> str:
    return (text or "").strip().lower()


def tokenize(text: str | None) -> set[str]:
    """Lightweight word tokenizer for heuristic overlap scoring."""
    return set(_TOKEN_RE.findall(normalize(text)))


def make_word_char_vectorizer():
    """A word+char TF-IDF vectorizer.

    Character n-grams (``char_wb``) make matching robust to spelling mistakes,
    while word n-grams capture phrase semantics.
    """
    if not SKLEARN_AVAILABLE:
        raise RuntimeError("scikit-learn is not installed")
    from sklearn.pipeline import FeatureUnion

    word = TfidfVectorizer(analyzer="word", ngram_range=(1, 2), min_df=1, sublinear_tf=True)
    char = TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5), min_df=1, sublinear_tf=True)
    # Word semantics lead; char n-grams only absorb typos, so down-weight them.
    return FeatureUnion(
        [("word", word), ("char", char)],
        transformer_weights={"word": 1.0, "char": 0.45},
    )


def make_profile_vectorizer():
    """TF-IDF vectorizer for profile/job documents (recommenders)."""
    if not SKLEARN_AVAILABLE:
        raise RuntimeError("scikit-learn is not installed")
    return TfidfVectorizer(
        analyzer="word",
        ngram_range=(1, 2),
        min_df=1,
        stop_words="english",
        sublinear_tf=True,
    )


def jaccard(a: set[str], b: set[str]) -> float:
    if not a or not b:
        return 0.0
    inter = len(a & b)
    if inter == 0:
        return 0.0
    return inter / len(a | b)
