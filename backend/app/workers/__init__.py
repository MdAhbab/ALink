"""Worker microservices that consume domain events from RabbitMQ.

Run individually, e.g.::

    python -m app.workers.notifications_worker
    python -m app.workers.achievements_worker
    python -m app.workers.ai_worker

Each binds its own durable queue to the ``alink.events`` topic exchange, so the
broker fans every event out to all interested concerns.
"""
