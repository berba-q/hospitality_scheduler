# Create: app/services/i18n_service.py

from typing import Dict, Any, Optional
import json
from pathlib import Path

class BackendI18nService:
    """Service to resolve i18n keys for notifications on the backend"""
    
    def __init__(self):
        self.translations = {}
        self.supported_locales = ["en", "it"]
        self.default_locale = "en"
        self._load_translations()
    
    def _load_translations(self):
        """Load translations - for now hardcoded, but can be loaded from JSON files"""
        
        # English translations
        self.translations["en"] = {
            "notifications": {
                "templates": {
                    "schedule_published": {
                        "title": "New Schedule Published",
                        "message": "Hi $staff_name! Your schedule for the week of $week_start is now available.",
                        "whatsapp": "*Schedule Alert*\n\nHi $staff_name! Your schedule for the week of $week_start is ready.\n\n🏢 $facility_name\n\nView schedule: $action_url",
                    },
                    "swap_request": {
                        "title": "🔄 Shift Swap Request",
                        "message": "$requester_name wants to swap their $original_day $original_shift shift with you.",
                        "whatsapp": "*Swap Request*\n\n$requester_name would like to swap shifts with you:\n\n📅 $original_day\n⏰ $original_shift\n📝 Reason: $reason\n\nRespond here: $action_url",
                    },
                    "swap_approved": {
                        "title": "✅ Swap Request Approved",
                        "message": "Great news! Your swap request for $original_day $original_shift has been approved by $approver_name.",
                        "whatsapp": "✅ *Swap Approved!*\n\nYour shift swap has been approved:\n\n📅 $original_day\n⏰ $original_shift\n👤 Approved by: $approver_name\n\nView updated schedule: $action_url",
                    },
                    "swap_assignment": {
                        "title": "🎯 Shift Assignment",
                        "message": "You've been assigned to cover $requester_name's $original_day $original_shift shift at $facility_name. Reason: $reason",
                        "whatsapp": "🎯 *Shift Assignment*\n\nHi $assigned_staff_name!\n\nYou've been assigned to cover a shift:\n\n👤 Originally: $requester_name\n📅 $original_day\n⏰ $original_shift\n🏢 $facility_name\n📝 Reason: $reason\n\nPlease accept or decline: $action_url",
                    },
                    "emergency_coverage": {
                        "title": "🚨 Urgent Coverage Needed",
                        "message": "$requester_name at $facility_name needs urgent coverage for $original_day $original_shift. Reason: $reason",
                        "whatsapp": "🚨 *URGENT: Coverage Needed*\n\n🏢 $facility_name\n👤 $requester_name\n📅 $original_day\n⏰ $original_shift\n📝 Reason: $reason\n\nReview request: $action_url",
                    },
                    "email_verification": {
                        "title": "Email Verification Required",
                        "message": "Please verify your email address using the code sent to you.",
                        "subject": "Verify Your Email for Account Linking",
                        "html": """<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Verification</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; }
        .header { color: #333; text-align: center; margin-bottom: 30px; }
        .content { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .verification-code { 
            background-color: #007bff; color: white; padding: 15px 30px; 
            border-radius: 5px; font-size: 24px; font-weight: bold; 
            letter-spacing: 3px; display: inline-block; margin: 20px 0;
        }
        .important { background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0; }
        .footer { border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; text-align: center; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <h2 class="header">Email Verification Required</h2>
    <div class="content">
        <p>Hello $user_name,</p>
        <p>You've requested to link your $provider_name account ($provider_email) to your existing account.</p>
        <p>To complete this linking process, please verify that you have access to $target_email by entering the verification code below:</p>
        
        <div style="text-align: center;">
            <p><strong>Your verification code:</strong></p>
            <div class="verification-code">$verification_code</div>
        </div>
        
        <div class="important">
            <p><strong>Important:</strong></p>
            <ul>
                <li>This code will expire in $expires_in</li>
                <li>Do not share this code with anyone</li>
                <li>If you didn't request this verification, please ignore this email</li>
            </ul>
        </div>
    </div>
    
    <div class="footer">
        <p>This email was sent to $target_email as part of the account linking process.</p>
        <p>If you have any questions, please contact our support team.</p>
    </div>
</body>
</html>""",
                        "text": """Email Verification Required

Hello $user_name,

You've requested to link your $provider_name account ($provider_email) to your existing account.

To complete this linking process, please verify that you have access to $target_email by entering the verification code below:

Verification Code: $verification_code

Important:
- This code will expire in $expires_in
- Do not share this code with anyone
- If you didn't request this verification, please ignore this email

This email was sent to $target_email as part of the account linking process.
If you have any questions, please contact our support team.""",
                        "whatsapp": "🔐 *Account Linking Verification*\n\nHi $user_name!\n\nYour verification code to link your $provider_name account is: *$verification_code*\n\nThis code expires in $expires_in.\n\nDo not share this code with anyone.",
                    },
                    "password_reset": {
                        "title": "Password Reset Request",
                        "message": "A password reset has been requested for your account. Click the link in the email to reset your password.",
                        "subject": "Reset Your Password",
                        "html": """<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; }
        .header { color: #333; text-align: center; margin-bottom: 30px; }
        .content { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .reset-button { 
            background-color: #007bff; color: white; padding: 12px 30px; 
            border-radius: 5px; text-decoration: none; display: inline-block; 
            font-weight: bold; margin: 20px 0;
        }
        .reset-button:hover { background-color: #0056b3; }
        .important { background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0; }
        .footer { border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; text-align: center; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <h2 class="header">🔐 Password Reset Request</h2>
    <div class="content">
        <p>Hello $user_name,</p>
        <p>We received a request to reset the password for your account. If you made this request, click the button below to reset your password:</p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="$reset_url" class="reset-button">Reset Your Password</a>
        </div>
        
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; background-color: #f1f1f1; padding: 10px; border-radius: 4px; font-family: monospace;">
            $reset_url
        </p>
        
        <div class="important">
            <p><strong>Important Security Information:</strong></p>
            <ul>
                <li>This link will expire in $expires_in</li>
                <li>If you didn't request this password reset, please ignore this email</li>
                <li>Your password won't change until you access the link above and create a new one</li>
                <li>For security, this link can only be used once</li>
            </ul>
        </div>
    </div>
    
    <div class="footer">
        <p>This email was sent because a password reset was requested for your account.</p>
        <p>If you have any questions, please contact our support team.</p>
    </div>
</body>
</html>""",
                        "text": """Password Reset Request

Hello $user_name,

We received a request to reset the password for your account. If you made this request, click the link below to reset your password:

$reset_url

Important Security Information:
- This link will expire in $expires_in
- If you didn't request this password reset, please ignore this email
- Your password won't change until you access the link above and create a new one
- For security, this link can only be used once

This email was sent because a password reset was requested for your account.
If you have any questions, please contact our support team.""",
                        "whatsapp": "🔐 *Password Reset*\n\nHi $user_name!\n\nSomeone requested a password reset for your account. If this was you, use this link to reset your password:\n\n$reset_url\n\n⚠️ This link expires in $expires_in.\n\nIf you didn't request this, please ignore this message.",
                    },
                    "staff_invitation": {
                        "title": "You're Invited to Join $organization_name",
                        "message": "You've been invited to join $organization_name as a $role at $facility_name.",
                        "subject": "Invitation to Join $organization_name",
                        "html": """<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Staff Invitation</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; }
        .header { color: #333; text-align: center; margin-bottom: 30px; }
        .content { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .accept-button { 
            background-color: #28a745; color: white; padding: 12px 30px; 
            border-radius: 5px; text-decoration: none; display: inline-block; 
            font-weight: bold; margin: 20px 0;
        }
        .accept-button:hover { background-color: #218838; }
        .details-box { background-color: #fff; padding: 15px; border-radius: 4px; margin: 20px 0; border-left: 4px solid #007bff; }
        .footer { border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; text-align: center; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <h2 class="header">🎉 Welcome to the Team!</h2>
    <div class="content">
        <p>Hi $staff_name,</p>
        <p>Great news! $invited_by_name has invited you to join <strong>$organization_name</strong> as part of our team.</p>
        
        <div class="details-box">
            <h3>Position Details:</h3>
            <p><strong>Role:</strong> $role</p>
            <p><strong>Facility:</strong> $facility_name</p>
            <p><strong>Organization:</strong> $organization_name</p>
        </div>
        
        <p>To get started, please accept this invitation and create your account:</p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="$accept_url" class="accept-button">Accept Invitation & Create Account</a>
        </div>
        
        <p><strong>Custom Message from $invited_by_name:</strong></p>
        <div style="background-color: #f1f1f1; padding: 15px; border-radius: 4px; font-style: italic;">
            $custom_message
        </div>
        
        <p><small><strong>Important:</strong> This invitation expires on $expires_at. Please accept it before then to join the team.</small></p>
    </div>
    
    <div class="footer">
        <p>This invitation was sent to $recipient_email by $invited_by_name.</p>
        <p>If you have any questions, please contact our support team.</p>
    </div>
</body>
</html>""",
                        "text": """Welcome to the Team!

Hi $staff_name,

Great news! $invited_by_name has invited you to join $organization_name as part of our team.

Position Details:
- Role: $role
- Facility: $facility_name
- Organization: $organization_name

To get started, please accept this invitation and create your account:
$accept_url

Custom Message from $invited_by_name:
$custom_message

Important: This invitation expires on $expires_at. Please accept it before then to join the team.

This invitation was sent to $recipient_email by $invited_by_name.
If you have any questions, please contact our support team.""",
                        "whatsapp": "🎉 *Welcome to the Team!*\n\nHi $staff_name!\n\n$invited_by_name has invited you to join $organization_name as a $role at $facility_name.\n\nAccept your invitation here: $accept_url\n\n📅 Expires: $expires_at\n\n💬 Message: $custom_message",
                    },
                }
            }
        }
        
        # Italian translations
        self.translations["it"] = {
            "notifications": {
                "templates": {
                    "schedule_published": {
                        "title": "Nuovo Turno Pubblicato",
                        "message": "Ciao $staff_name! Il tuo turno per la settimana del $week_start è ora disponibile.",
                        "whatsapp": "*Avviso Turno*\n\nCiao $staff_name! Il tuo turno per la settimana del $week_start è pronto.\n\n🏢 $facility_name\n\nVedi turno: $action_url",
                    },
                    "swap_request": {
                        "title": "🔄 Richiesta Scambio Turno",
                        "message": "$requester_name vuole scambiare il suo turno di $original_day $original_shift con te.",
                        "whatsapp": "*Richiesta Scambio*\n\n$requester_name vorrebbe scambiare turni con te:\n\n📅 $original_day\n⏰ $original_shift\n📝 Motivo: $reason\n\nRispondi qui: $action_url",
                    },
                    "swap_approved": {
                        "title": "✅ Richiesta Scambio Approvata",
                        "message": "Ottime notizie! La tua richiesta di scambio per $original_day $original_shift è stata approvata da $approver_name.",
                        "whatsapp": "✅ *Scambio Approvato!*\n\nIl tuo scambio turno è stato approvato:\n\n📅 $original_day\n⏰ $original_shift\n👤 Approvato da: $approver_name\n\nVedi orario aggiornato: $action_url",
                    },
                    "swap_assignment": {
                        "title": "🎯 Assegnazione Turno",
                        "message": "Ti è stato assegnato di coprire il turno di $requester_name di $original_day $original_shift presso $facility_name. Motivo: $reason",
                        "whatsapp": "🎯 *Assegnazione Turno*\n\nCiao $assigned_staff_name!\n\nTi è stato assegnato di coprire un turno:\n\n👤 Originariamente: $requester_name\n📅 $original_day\n⏰ $original_shift\n🏢 $facility_name\n📝 Motivo: $reason\n\nAccetta o rifiuta: $action_url",
                    },
                    "emergency_coverage": {
                        "title": "🚨 Copertura Urgente Necessaria",
                        "message": "$requester_name presso $facility_name ha bisogno di copertura urgente per $original_day $original_shift. Motivo: $reason",
                        "whatsapp": "🚨 *URGENTE: Copertura Necessaria*\n\n🏢 $facility_name\n👤 $requester_name\n📅 $original_day\n⏰ $original_shift\n📝 Motivo: $reason\n\nEsamina richiesta: $action_url",
                    },
                    "email_verification": {
                        "title": "Verifica Email Richiesta",
                        "message": "Verifica il tuo indirizzo email utilizzando il codice che ti è stato inviato.",
                        "subject": "Verifica la Tua Email per il Collegamento Account",
                        "html": """<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verifica Email</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; }
        .header { color: #333; text-align: center; margin-bottom: 30px; }
        .content { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .verification-code { 
            background-color: #007bff; color: white; padding: 15px 30px; 
            border-radius: 5px; font-size: 24px; font-weight: bold; 
            letter-spacing: 3px; display: inline-block; margin: 20px 0;
        }
        .important { background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0; }
        .footer { border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; text-align: center; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <h2 class="header">Verifica Email Richiesta</h2>
    <div class="content">
        <p>Ciao $user_name,</p>
        <p>Hai richiesto di collegare il tuo account $provider_name ($provider_email) al tuo account esistente.</p>
        <p>Per completare questo processo di collegamento, verifica di avere accesso a $target_email inserendo il codice di verifica qui sotto:</p>
        
        <div style="text-align: center;">
            <p><strong>Il tuo codice di verifica:</strong></p>
            <div class="verification-code">$verification_code</div>
        </div>
        
        <div class="important">
            <p><strong>Importante:</strong></p>
            <ul>
                <li>Questo codice scadrà tra $expires_in</li>
                <li>Non condividere questo codice con nessuno</li>
                <li>Se non hai richiesto questa verifica, ignora questa email</li>
            </ul>
        </div>
    </div>
    
    <div class="footer">
        <p>Questa email è stata inviata a $target_email come parte del processo di collegamento account.</p>
        <p>Se hai domande, contatta il nostro team di supporto.</p>
    </div>
</body>
</html>""",
                        # ... (Italian text and whatsapp versions)
                        "text": "Verifica Email Richiesta\n\nCiao $user_name,\n\nHai richiesto di collegare il tuo account $provider_name ($provider_email) al tuo account esistente.\n\nPer completare questo processo di collegamento, verifica di avere accesso a $target_email inserendo il codice di verifica qui sotto:\n\nCodice di Verifica: $verification_code\n\nImportante:\n- Questo codice scadrà tra $expires_in\n- Non condividere questo codice con nessuno\n- Se non hai richiesto questa verifica, ignora questa email\n\nQuesta email è stata inviata a $target_email come parte del processo di collegamento account.\nSe hai domande, contatta il nostro team di supporto.",
                        "whatsapp": "🔐 *Verifica Collegamento Account*\n\nCiao $user_name!\n\nIl tuo codice di verifica per collegare l'account $provider_name è: *$verification_code*\n\nQuesto codice scade tra $expires_in.\n\nNon condividere questo codice con nessuno.",
                    },
                    # ... (add other Italian templates similar to English)
                    "password_reset": {
                        "title": "Richiesta Reimpostazione Password",
                        "message": "È stata richiesta una reimpostazione password per il tuo account. Clicca il link nell'email per reimpostare la password.",
                        "subject": "Reimposta la Tua Password",
                        "html": "<!DOCTYPE html><html><head><meta charset=\"utf-8\"><title>Reimpostazione Password</title></head><body><h2>🔐 Richiesta Reimpostazione Password</h2><p>Ciao $user_name,</p><p>Abbiamo ricevuto una richiesta per reimpostare la password del tuo account.</p><a href=\"$reset_url\" style=\"background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none;\">Reimposta la Password</a><p>Link: $reset_url</p><p><strong>Importante:</strong> Questo link scadrà tra $expires_in</p></body></html>",
                        "text": "Richiesta Reimpostazione Password\n\nCiao $user_name,\n\nAbbiamo ricevuto una richiesta per reimpostare la password del tuo account. Se hai fatto questa richiesta, clicca il link qui sotto:\n\n$reset_url\n\nImportante: Questo link scadrà tra $expires_in",
                        "whatsapp": "🔐 *Reimpostazione Password*\n\nCiao $user_name!\n\nQualcuno ha richiesto una reimpostazione password per il tuo account. Se sei stato tu, usa questo link:\n\n$reset_url\n\n⚠️ Questo link scade tra $expires_in.",
                    },
                    "staff_invitation": {
                        "title": "Sei Invitato a Unirti a $organization_name",
                        "message": "Sei stato invitato a unirti a $organization_name come $role presso $facility_name.",
                        "subject": "Invito a Unirti a $organization_name",
                        "html": "<!DOCTYPE html><html><head><meta charset=\"utf-8\"><title>Invito Staff</title></head><body><h2>🎉 Benvenuto nel Team!</h2><p>Ciao $staff_name,</p><p>$invited_by_name ti ha invitato a unirti a <strong>$organization_name</strong>.</p><p><strong>Ruolo:</strong> $role</p><p><strong>Struttura:</strong> $facility_name</p><a href=\"$accept_url\" style=\"background-color: #28a745; color: white; padding: 12px 30px; text-decoration: none;\">Accetta Invito</a><p>Messaggio: $custom_message</p><p>Scade: $expires_at</p></body></html>",
                        "text": "Benvenuto nel Team!\n\nCiao $staff_name,\n\n$invited_by_name ti ha invitato a unirti a $organization_name come $role presso $facility_name.\n\nAccetta qui: $accept_url\n\nMessaggio: $custom_message\nScade: $expires_at",
                        "whatsapp": "🎉 *Benvenuto nel Team!*\n\nCiao $staff_name!\n\n$invited_by_name ti ha invitato a unirti a $organization_name come $role presso $facility_name.\n\nAccetta qui: $accept_url\n\n📅 Scade: $expires_at\n\n💬 Messaggio: $custom_message",
                    },
                }
            }
        }
    
    def get_translation(self, key: str, locale: str = "en") -> Optional[str]:
        """Get translation for a key in the specified locale"""
        
        # Ensure locale is supported
        if locale not in self.supported_locales:
            locale = self.default_locale
        
        # Try to get translation in requested locale
        translation = self._get_nested_value(self.translations.get(locale, {}), key)
        
        # Fallback to English if not found and not already English
        if translation is None and locale != self.default_locale:
            translation = self._get_nested_value(self.translations.get(self.default_locale, {}), key)
        
        return translation
    
    def _get_nested_value(self, data: Dict[str, Any], key: str) -> Optional[str]:
        """Get nested value from dictionary using dot notation"""
        keys = key.split('.')
        current = data
        
        for k in keys:
            if isinstance(current, dict) and k in current:
                current = current[k]
            else:
                return None
        
        return current if isinstance(current, str) else None
    
    def resolve_template_key(self, template_key: str, locale: str = "en") -> str:
        """Resolve a template key to the actual translated string"""
        
        if not template_key:
            return ""
        
        # If it's already a resolved string (doesn't start with notifications.), return as-is
        if not template_key.startswith("notifications."):
            return template_key
        
        # Get the translation
        translation = self.get_translation(template_key, locale)
        
        if translation is None:
            print(f"⚠️ Translation not found for key: {template_key} (locale: {locale})")
            # Return the key itself as fallback
            return template_key
        
        return translation

# Create a global instance
i18n_service = BackendI18nService()