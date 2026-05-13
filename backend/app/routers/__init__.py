from . import (
    auth, users, connections, bookings, referrals, events, jobs, stories,
    mentorship, achievements, notifications, activity, chat, verifications,
    settings as settings_router, admin, goals, uploads,
)

ALL_ROUTERS = [
    auth.router,
    users.router,
    connections.router,
    bookings.router,
    referrals.router,
    events.router,
    jobs.router,
    stories.router,
    mentorship.router,
    achievements.router,
    notifications.router,
    activity.router,
    chat.router,
    verifications.router,
    settings_router.router,
    goals.router,
    admin.router,
    uploads.router,
]
