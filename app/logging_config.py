import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path

# -----------------------------------------------------------------------------
# Centralised logging configuration
# -----------------------------------------------------------------------------
#   * Keeps noisy subsystems (notifications, Twilio, Firebase, etc.) out of the
#     main Docker console.
#   * Still allows root / FastAPI / Uvicorn logs to stream to stdout so they are
#     visible in `docker compose logs -f api`.
#   * Stores rotated logfiles under /var/log/hosp_scheduler (mount that path as
#     a volume in docker-compose.yml if you want host-side access).
# -----------------------------------------------------------------------------

LOG_DIR = Path("/var/log/hosp_scheduler")
LOG_DIR.mkdir(parents=True, exist_ok=True)

# --------------------- Root logger (console) ----------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

# --------------------- Notification service file handler ----------------------
notif_handler = RotatingFileHandler(
    LOG_DIR / "notifications.log",
    maxBytes=5 * 1024 * 1024,  # 5 MB
    backupCount=5,
    encoding="utf-8",
)
notif_handler.setFormatter(
    logging.Formatter("%(asctime)s [%(levelname)s] %(name)s: %(message)s")
)

notif_logger = logging.getLogger("app.services.notification_service")
notif_logger.setLevel(logging.INFO)  # or DEBUG for local debugging
notif_logger.addHandler(notif_handler)
notif_logger.propagate = False  # prevent duplication in console

# --------------------- Silence third-party chatty libs ------------------------
#logging.getLogger("fcm_django").setLevel(logging.WARNING)
logging.getLogger("twilio.http_client").setLevel(logging.WARNING)

#----------------------- Uvicorn access logs ------------------------
uvicorn_access = logging.getLogger("uvicorn.access")
uvicorn_access.setLevel(logging.INFO)

uvicorn_handler = RotatingFileHandler(
    LOG_DIR / "uvicorn_access.log",
    maxBytes=10 * 1024 * 1024,
    backupCount=5,
    encoding="utf-8",
)
uvicorn_handler.setFormatter(
    logging.Formatter("%(asctime)s %(message)s", "%Y-%m-%d %H:%M:%S")
)

uvicorn_access.handlers.clear()      # remove the default stdout handler
uvicorn_access.addHandler(uvicorn_handler)
uvicorn_access.propagate = False