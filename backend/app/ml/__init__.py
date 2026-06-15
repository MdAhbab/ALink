"""Machine-learning features for ALink.

* ``intent``       — AI-assistant intent classifier (typo-tolerant).
* ``text``         — shared TF-IDF helpers used by the recommenders.
* ``recommenders`` — people & job content-based recommenders.

Every module degrades gracefully when scikit-learn is not installed so the app
still boots (heuristic fallbacks), but the VM install always ships sklearn.
"""
