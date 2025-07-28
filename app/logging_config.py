import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path

# -----------------------------------------------------------------------------
# Centralised logging configuration
# -----------------------------------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent.parent   # the “hospitality_scheduler” package
LOG_DIR  = BASE_DIR / "logs"
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

# --------------------- Firebase service file handler ----------------------
firebase_handler = RotatingFileHandler(
    LOG_DIR / "firebase.log",
    maxBytes=5 * 1024 * 1024,  # 5 MB
    backupCount=5,
    encoding="utf-8",
)
firebase_handler.setFormatter(
    logging.Formatter("%(asctime)s [%(levelname)s] %(name)s: %(message)s")
)

firebase_logger = logging.getLogger("firebase")
firebase_logger.setLevel(logging.INFO)
firebase_logger.addHandler(firebase_handler)
firebase_logger.propagate = False  # prevent duplication in console