#!/usr/bin/env python3
"""
Test script to verify Resend email configuration
"""
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from dotenv import load_dotenv

load_dotenv()

def test_resend_smtp():
    """Test Resend SMTP connection and email sending"""

    # Get configuration
    smtp_host = os.getenv('SMTP_HOST', 'smtp.resend.com')
    smtp_port = int(os.getenv('SMTP_PORT', '587'))
    smtp_password = os.getenv('SMTP_PASSWORD')
    smtp_from_email = os.getenv('SMTP_FROM_EMAIL')
    smtp_from_name = os.getenv('SMTP_FROM_NAME', 'Schedula')

    # Validate configuration
    print("=" * 60)
    print("RESEND SMTP TEST")
    print("=" * 60)
    print(f"SMTP Host: {smtp_host}")
    print(f"SMTP Port: {smtp_port}")
    print(f"SMTP Password: {'✅ Set' if smtp_password else '❌ Not set'}")
    print(f"SMTP From Email: {smtp_from_email or '❌ Not set'}")
    print(f"SMTP From Name: {smtp_from_name}")
    print("=" * 60)

    if not smtp_password:
        print("\n❌ ERROR: SMTP_PASSWORD not set in .env")
        print("   Set SMTP_PASSWORD=your_resend_api_key")
        return False

    if not smtp_from_email:
        print("\n❌ ERROR: SMTP_FROM_EMAIL not set in .env")
        print("   For testing, use: SMTP_FROM_EMAIL=onboarding@resend.dev")
        print("   For production, verify your domain and use your own email")
        return False

    # Get test recipient
    test_email = input("\nEnter recipient email for test (press Enter to skip): ").strip()
    if not test_email:
        print("Skipping email send test")
        return True

    try:
        # Create test message
        msg = MIMEMultipart()
        msg['From'] = f"{smtp_from_name} <{smtp_from_email}>"
        msg['To'] = test_email
        msg['Subject'] = "Test Email from Schedula"

        body = """
        <html>
        <body>
            <h2>Test Email</h2>
            <p>This is a test email from your Schedula application.</p>
            <p>If you received this, your Resend SMTP configuration is working correctly!</p>
        </body>
        </html>
        """

        msg.attach(MIMEText(body, 'html'))

        # Connect and send
        print(f"\n📧 Connecting to {smtp_host}:{smtp_port}...")
        server = smtplib.SMTP(smtp_host, smtp_port, timeout=10)

        print("📧 Starting TLS...")
        server.starttls(context=ssl.create_default_context())

        print("📧 Authenticating...")
        server.login("resend", smtp_password)

        print(f"📧 Sending test email to {test_email}...")
        server.send_message(msg)
        server.quit()

        print(f"\n✅ SUCCESS! Test email sent to {test_email}")
        print("   Check your inbox (and spam folder)")
        print("   Check Resend dashboard for logs: https://resend.com/emails")
        return True

    except smtplib.SMTPAuthenticationError as e:
        print(f"\n❌ AUTHENTICATION FAILED: {e}")
        print("   Check that your SMTP_PASSWORD (Resend API key) is correct")
        print("   Get your API key from: https://resend.com/api-keys")
        return False

    except smtplib.SMTPSenderRefused as e:
        print(f"\n❌ SENDER REFUSED: {e}")
        print(f"   The email {smtp_from_email} is not verified in Resend")
        print("   Options:")
        print("   1. Use onboarding@resend.dev for testing")
        print("   2. Verify your own domain at: https://resend.com/domains")
        return False

    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    test_resend_smtp()
