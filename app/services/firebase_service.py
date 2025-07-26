# app/services/firebase_service.py
"""Firebase Admin SDK integration & structured push-notification helper.
This module provides a service class for sending push notifications
to single or multiple device tokens using Firebase Cloud Messaging (FCM).
It handles both single-token and multicast sends, with built-in error handling
and logging.
"""

from __future__ import annotations

import asyncio
import logging
import os
from itertools import islice
from typing import Any, Dict, List, Optional, Sequence, Tuple

import firebase_admin
from firebase_admin import credentials, messaging
from firebase_admin.exceptions import FirebaseError

from ..core.config import get_settings

# --------------------------------------------------------------------------- #
# Logging
# --------------------------------------------------------------------------- #
logger = logging.getLogger("firebase")
if not logger.handlers:
    logger.addHandler(logging.NullHandler())

# --------------------------------------------------------------------------- #
# Settings
# --------------------------------------------------------------------------- #
settings = get_settings()

# Max number of tokens the Admin SDK accepts in a single `send_each_for_multicast()`.
_MAX_BATCH_SIZE = 500


def _chunk(seq: Sequence[str], size: int = _MAX_BATCH_SIZE):
    """Yield slices of *seq* with *size* elements each."""
    it = iter(seq)
    while True:
        batch = list(islice(it, size))
        if not batch:
            break
        yield batch


class FirebaseService:
    """Handle Firebase Admin SDK operations for single and multicast sends."""

    def __init__(self) -> None:
        self._app: Optional[firebase_admin.App] = None
        self._initialize_firebase()

    # --------------------------------------------------------------------- #
    # Lifecycle helpers
    # --------------------------------------------------------------------- #
    def _initialize_firebase(self) -> None:
        try:
            if (
                settings.FIREBASE_SERVICE_ACCOUNT_PATH
                and os.path.exists(settings.FIREBASE_SERVICE_ACCOUNT_PATH)
            ):
                cred = credentials.Certificate(settings.FIREBASE_SERVICE_ACCOUNT_PATH)
                self._app = (
                    firebase_admin.get_app()
                    if firebase_admin._apps
                    else firebase_admin.initialize_app(cred)
                )
                logger.info(
                    "firebase_initialised",
                    extra={"service_account": settings.FIREBASE_SERVICE_ACCOUNT_PATH},
                )
            else:
                logger.warning(
                    "firebase_service_account_missing",
                    extra={"path": settings.FIREBASE_SERVICE_ACCOUNT_PATH},
                )
        except Exception:
            logger.exception("firebase_initialisation_failed")
            self._app = None

    # --------------------------------------------------------------------- #
    # Public API — SINGLE TOKEN
    # --------------------------------------------------------------------- #
    async def send_push_notification(
        self,
        token: str,
        title: str,
        body: str,
        data: Optional[Dict[str, Any]] = None,
        action_url: Optional[str] = None,
        *,
        analytics_label: str = "scheduler_v1",
        dry_run: bool = False,
    ) -> bool:
        """Send a push notification to **one** device token."""
        if not self._app:
            logger.error("firebase_unavailable")
            return False

        message = self._build_message(
            token=token,
            title=title,
            body=body,
            data=data,
            action_url=action_url,
            analytics_label=analytics_label,
        )

        loop = asyncio.get_running_loop()
        try:
            message_id = await loop.run_in_executor(
                None, lambda: messaging.send(message, dry_run=dry_run)
            )
            logger.info(
                "fcm_send_ok",
                extra={"msg_id": message_id, "token": token, "label": analytics_label},
            )
            return True
        except messaging.UnregisteredError as exc:
            logger.warning(
                "fcm_bad_token",
                extra={"token": token, "reason": type(exc).__name__},
            )
            return False
        except messaging.SenderIdMismatchError as exc:
            logger.error(
                "fcm_senderid_mismatch",
                extra={"token": token, "reason": type(exc).__name__},
            )
            return False
        except FirebaseError as exc:
            logger.error(
                "fcm_api_error",
                extra={
                    "token": token,
                    "code": getattr(exc, "code", None),
                    "detail": getattr(exc, "detail", None),
                },
            )
            return False
        except Exception:
            logger.exception("fcm_unknown_error", extra={"token": token})
            return False

    # --------------------------------------------------------------------- #
    # Public API — MULTICAST (Modern API)
    # --------------------------------------------------------------------- #
    async def send_push_multicast(
        self,
        tokens: Sequence[str],
        title: str,
        body: str,
        data: Optional[Dict[str, Any]] = None,
        action_url: Optional[str] = None,
        *,
        analytics_label: str = "scheduler_v1",
        dry_run: bool = False,
    ) -> Tuple[int, int]:
        """Send the *same* notification to many tokens (batch ≤ 500).

        Uses the modern send_each_for_multicast API.

        Returns
        -------
        (success_count, failure_count)
        """
        if not self._app:
            logger.error("firebase_unavailable")
            return (0, len(tokens))

        success_total, failure_total = 0, 0
        loop = asyncio.get_running_loop()

        for batch in _chunk(tokens):
            multicast_msg = self._build_multicast_message(
                tokens=batch,
                title=title,
                body=body,
                data=data,
                action_url=action_url,
                analytics_label=analytics_label,
            )
            try:
                #  Use send_each_for_multicast to handle up to 500 tokens
                response = await loop.run_in_executor(
                    None, lambda: messaging.send_each_for_multicast(multicast_msg, dry_run=dry_run)
                )

                success_total += response.success_count
                failure_total += response.failure_count

                # Per-token logging — preserve index mapping
                for idx, resp in enumerate(response.responses):
                    tkn = batch[idx]
                    if resp.success:
                        logger.info(
                            "fcm_send_ok",
                            extra={
                                "msg_id": resp.message_id,
                                "token": tkn,
                                "label": analytics_label,
                            },
                        )
                    else:
                        err = resp.exception
                        event = (
                            "fcm_bad_token"
                            if isinstance(err, messaging.UnregisteredError)
                            else "fcm_api_error"
                        )
                        logger.warning(
                            event,
                            extra={
                                "token": tkn,
                                "reason": type(err).__name__,
                                "code": getattr(err, "code", None),
                            },
                        )
            except Exception:
                # Catastrophic batch failure — count every token as failed
                logger.exception("fcm_multicast_batch_error")
                failure_total += len(batch)

        return success_total, failure_total

    # ------------------------------------------------------------------ #
    # Internal builders
    # ------------------------------------------------------------------ #
    def _build_message(
        self,
        *,
        token: str,
        title: str,
        body: str,
        data: Optional[Dict[str, Any]],
        action_url: Optional[str],
        analytics_label: str,
    ) -> messaging.Message:
        """Create a single-recipient `Message`."""
        return messaging.Message(
            notification=messaging.Notification(title=title, body=body),
            data={k: str(v) for k, v in (data or {}).items()},
            token=token,
            fcm_options=messaging.FCMOptions(analytics_label=analytics_label),
            webpush=self._webpush_cfg(action_url),
            android=self._android_cfg(analytics_label),
            apns=self._apns_cfg(analytics_label),
        )

    def _build_multicast_message(
        self,
        *,
        tokens: Sequence[str],
        title: str,
        body: str,
        data: Optional[Dict[str, Any]],
        action_url: Optional[str],
        analytics_label: str,
    ) -> messaging.MulticastMessage:
        """Create a `MulticastMessage` for <= 500 tokens."""
        return messaging.MulticastMessage(
            notification=messaging.Notification(title=title, body=body),
            data={k: str(v) for k, v in (data or {}).items()},
            tokens=list(tokens),
            fcm_options=messaging.FCMOptions(analytics_label=analytics_label),
            webpush=self._webpush_cfg(action_url),
            android=self._android_cfg(analytics_label),
            apns=self._apns_cfg(analytics_label),
        )

    @staticmethod
    def _webpush_cfg(action_url: Optional[str]):
        if not action_url:
            return None
        return messaging.WebpushConfig(
            fcm_options=messaging.WebpushFCMOptions(
                link=action_url
            )
        )

    @staticmethod
    def _android_cfg(analytics_label: str):
        """Create Android configuration with analytics label."""
        return messaging.AndroidConfig(
            priority="high",
            fcm_options=messaging.AndroidFCMOptions(analytics_label=analytics_label), 
        )

    @staticmethod
    def _apns_cfg(analytics_label: str):
        return messaging.APNSConfig(
            fcm_options=messaging.APNSFCMOptions(analytics_label=analytics_label)
        )

    # --------------------------------------------------------------------- #
    # Misc
    # --------------------------------------------------------------------- #
    def is_available(self) -> bool:
        return self._app is not None