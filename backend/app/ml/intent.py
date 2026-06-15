"""AI-assistant intent classification (ML-3).

Robust to paraphrasing and spelling mistakes: a TF-IDF model over **word +
character** n-grams (char n-grams absorb typos) with nearest-example cosine
matching and a confidence threshold that routes weak matches to a fallback.

Falls back to a pure-Python keyword scorer when scikit-learn is unavailable, so
the chat assistant always answers.
"""
from __future__ import annotations

import threading

from .text import SKLEARN_AVAILABLE, make_word_char_vectorizer, normalize, tokenize

# intent -> training utterances ------------------------------------------------
INTENT_EXAMPLES: dict[str, list[str]] = {
    "greeting": [
        "hi", "hello", "hey there", "good morning", "yo", "hey", "what's up", "howdy",
    ],
    "draft_intro": [
        "draft an intro to maya", "write a warm introduction", "help me reach out to an alumnus",
        "compose a message to connect", "intro message", "how should i introduce myself",
        "write an outreach note", "craft a connection request message",
    ],
    "find_alumni": [
        "find alumni in fintech", "who works at google", "show me mentors in design",
        "people who pivoted into vc", "alumni recommendations", "recommend me some alumni",
        "find people in machine learning", "connect me with someone at stripe",
        "find me an alumnus to talk to", "who can i connect with", "suggest alumni for me",
    ],
    "find_jobs": [
        "any internships", "show me jobs", "software engineering roles", "find me a job at stripe",
        "open positions", "recommend jobs for me", "what roles match my skills", "summer internship",
    ],
    "prep_session": [
        "help me prep for friday", "prepare for my session", "what should i ask my mentor",
        "interview prep", "get ready for the call", "questions for my mentorship session",
        "how do i prepare for a coffee chat",
    ],
    "referrals_status": [
        "status of my referrals", "did my referral get forwarded", "track my referrals",
        "any update on stripe referral", "summarize my pending referrals", "referral progress",
    ],
    "booking_help": [
        "how do i book a session", "schedule a meeting", "book time with a mentor",
        "set up a call", "reserve a slot with an alum", "i want to book a consultation",
    ],
    "mentorship": [
        "find a mentor", "mentorship programs", "i want to be mentored", "join a cohort",
        "show mentorship tracks", "who can mentor me",
    ],
    "thanks": [
        "thanks", "thank you", "appreciate it", "thx", "thanks a lot", "much appreciated",
    ],
}

_CONFIDENCE_THRESHOLD = 0.35

_REPLIES: dict[str, str] = {
    "greeting": "Hey{name}! I'm ALink AI — your network co-pilot. I can find alumni, draft intros, prep you for sessions, and track referrals. What are you working on?",
    "draft_intro": "Here's a warm intro you can adapt:\n\n\"Hi — I'm {name_or_you}, a CS student exploring your field. Your path really resonates with mine, and I'd love 15 minutes to learn how you approach your craft.\"\n\nWant me to tailor it to a specific person?",
    "find_alumni": "I can surface alumni matched to your skills and goals. Open the Finder — your top matches are ranked by relevance — or tell me an industry/company and I'll narrow it down.",
    "find_jobs": "Based on your profile I can rank roles by fit. Check the Jobs page for your personalized 'For you' list, or tell me a company/role and I'll filter.",
    "prep_session": "For your next session: bring two concrete decisions you want input on, skim the mentor's background, and have a portfolio/resume link ready. Want a tailored question list?",
    "referrals_status": "I can summarize your referrals by status (submitted → under review → forwarded). Head to Referrals to see them live, or ask me to draft a polite follow-up.",
    "booking_help": "To book: open a mentor's card and hit 'Book', pick a topic, date and time, and send the request. Want me to suggest mentors to book with?",
    "mentorship": "There are several mentorship cohorts open right now — portfolio reviews, interview sprints, founder office hours. Browse Mentorship to apply, or tell me your focus and I'll recommend one.",
    "thanks": "Anytime{name} — happy to help. Ping me whenever you want to find someone, draft a note, or prep for a chat.",
    "fallback": "Got it. I can help you find alumni, draft intros, recommend jobs, prep for sessions, and track referrals. Which of those would be most useful right now?",
}


class _IntentModel:
    def __init__(self) -> None:
        self._labels: list[str] = []
        self._examples: list[str] = []
        for intent, phrases in INTENT_EXAMPLES.items():
            for phrase in phrases:
                self._labels.append(intent)
                self._examples.append(phrase)
        self._vectorizer = None
        self._matrix = None
        if SKLEARN_AVAILABLE:
            try:
                self._vectorizer = make_word_char_vectorizer()
                self._matrix = self._vectorizer.fit_transform(self._examples)
            except Exception:
                self._vectorizer = None
                self._matrix = None

    def classify(self, prompt: str) -> tuple[str, float]:
        text = normalize(prompt)
        if not text:
            return "fallback", 0.0
        if self._vectorizer is not None and self._matrix is not None:
            from sklearn.metrics.pairwise import cosine_similarity

            vec = self._vectorizer.transform([text])
            sims = cosine_similarity(vec, self._matrix)[0]
            best = int(sims.argmax())
            score = float(sims[best])
            if score < _CONFIDENCE_THRESHOLD:
                return "fallback", score
            return self._labels[best], score
        return self._keyword_classify(text)

    def _keyword_classify(self, text: str) -> tuple[str, float]:
        tokens = tokenize(text)
        best_intent, best_score = "fallback", 0.0
        for intent, phrases in INTENT_EXAMPLES.items():
            for phrase in phrases:
                overlap = tokens & tokenize(phrase)
                if overlap:
                    score = len(overlap) / max(1, len(tokenize(phrase)))
                    if score > best_score:
                        best_intent, best_score = intent, score
        if best_score < 0.34:
            return "fallback", best_score
        return best_intent, best_score


_model: _IntentModel | None = None
_lock = threading.Lock()


def _get_model() -> _IntentModel:
    global _model
    if _model is None:
        with _lock:
            if _model is None:
                _model = _IntentModel()
    return _model


def classify(prompt: str) -> tuple[str, float]:
    return _get_model().classify(prompt)


def generate_reply(prompt: str, *, user_name: str | None = None) -> str:
    intent, _score = classify(prompt)
    template = _REPLIES.get(intent, _REPLIES["fallback"])
    first = (user_name or "").split(" ")[0] if user_name else ""
    return template.format(
        name=(f" {first}" if first else ""),
        name_or_you=first or "a student",
    )
