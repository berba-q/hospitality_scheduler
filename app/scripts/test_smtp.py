#!/usr/bin/env python3
"""
Test script to verify SMTP configuration works with your existing setup
Run this in your project root: python test_smtp.py
"""

import os
from dotenv import load_dotenv
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Load environment variables
load_dotenv()

def test_smtp_configuration():
    """Test SMTP configuration using your .env file settings"""
    
    print("🧪 Testing SMTP Configuration")
    print("=" * 50)
    
    # Get settings from environment (same as your app)
    smtp_host = os.getenv('SMTP_HOST')
    smtp_port = int(os.getenv('SMTP_PORT', 587))
    smtp_username = os.getenv('SMTP_USERNAME')
    smtp_password = os.getenv('SMTP_PASSWORD')
    
    # Validate configuration
    print(f"📧 SMTP Host: {smtp_host}")
    print(f"📧 SMTP Port: {smtp_port}")
    print(f"📧 SMTP Username: {smtp_username}")
    print(f"📧 SMTP Password: {'*' * len(smtp_password) if smtp_password else 'NOT SET'}")
    print()
    
    if not all([smtp_host, smtp_username, smtp_password]):
        print("❌ SMTP configuration incomplete!")
        print("💡 Make sure these are set in your .env file:")
        print("   - SMTP_HOST")
        print("   - SMTP_USERNAME") 
        print("   - SMTP_PASSWORD")
        return False
    
    # Test recipient (change this to your email)
    test_email = input("Enter test email address (or press Enter to use SMTP_USERNAME): ").strip()
    if not test_email:
        test_email = smtp_username
    
    try:
        print(f"🔄 Creating test email to {test_email}...")
        
        # Create message (using same logic as your NotificationService)
        msg = MIMEMultipart()
        from_name = "Schedula"
        from_email = smtp_username
        
        msg['From'] = f"{from_name} <{from_email}>"
        msg['To'] = test_email
        msg['Subject'] = "🎉 SMTP Test - Your Email Configuration Works!"
        
        # Create HTML body (same style as your NotificationService)
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>SMTP Test Successful</title>
            <style>
                body {{ font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; }}
                .header {{ color: #333; text-align: center; margin-bottom: 30px; }}
                .content {{ background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }}
                .footer {{ border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; text-align: center; color: #666; font-size: 12px; }}
                .success {{ background-color: #d4edda; padding: 15px; border-radius: 5px; color: #155724; margin: 20px 0; }}
            </style>
        </head>
        <body>
            <h2 class="header">🎉 SMTP Test Successful!</h2>
            <div class="content">
                <div class="success">
                    <p><strong>Congratulations!</strong> Your SMTP configuration is working perfectly.</p>
                </div>
                <p>Your Schedula application can now send real emails for:</p>
                <ul>
                    <li>✅ User signup confirmations</li>
                    <li>✅ Password reset links</li>
                    <li>✅ Staff invitations</li>
                    <li>✅ Schedule notifications</li>
                    <li>✅ Shift swap requests</li>
                </ul>
                <p><strong>Configuration used:</strong></p>
                <ul>
                    <li>Host: {smtp_host}</li>
                    <li>Port: {smtp_port}</li>
                    <li>Username: {smtp_username}</li>
                </ul>
            </div>
            <div class="footer">
                <p>This test email was sent by your Schedula SMTP configuration.</p>
            </div>
        </body>
        </html>
        """
        
        # Add text version
        text_body = f"""
🎉 SMTP Test Successful!

Congratulations! Your SMTP configuration is working perfectly.

Your Schedula application can now send real emails for:
✅ User signup confirmations
✅ Password reset links  
✅ Staff invitations
✅ Schedule notifications
✅ Shift swap requests

Configuration used:
- Host: {smtp_host}
- Port: {smtp_port}
- Username: {smtp_username}

This test email was sent by your Schedula SMTP configuration.
        """
        
        msg.attach(MIMEText(html_body, 'html'))
        msg.attach(MIMEText(text_body, 'plain'))
        
        print(f"🔄 Connecting to {smtp_host}:{smtp_port}...")
        
        # Connect and send (same logic as your NotificationService)
        server = smtplib.SMTP(smtp_host, smtp_port)
        server.starttls(context=ssl.create_default_context())
        
        print("🔄 Authenticating...")
        server.login(smtp_username, smtp_password)
        
        print(f"🔄 Sending test email...")
        server.send_message(msg)
        server.quit()
        
        print()
        print("🎉 SUCCESS! Test email sent successfully!")
        print(f"📧 Check {test_email} for the test message")
        print()
        print("🚀 Your NotificationService is ready to send real emails!")
        print("   You can now test signup, password reset, and notifications.")
        
        return True
        
    except smtplib.SMTPAuthenticationError as e:
        print(f"❌ Authentication failed: {e}")
        print("💡 Troubleshooting tips:")
        print("   - For Gmail: Use App Password, not your regular password")
        print("   - Enable 2-factor authentication first")
        print("   - Check username and password are correct")
        return False
        
    except smtplib.SMTPConnectError as e:
        print(f"❌ Connection failed: {e}")
        print("💡 Troubleshooting tips:")
        print("   - Check SMTP host and port")
        print("   - Try port 587 (STARTTLS) or 465 (SSL)")
        print("   - Check firewall settings")
        return False
        
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

if __name__ == "__main__":
    success = test_smtp_configuration()
    if success:
        print("\n✅ Your SMTP configuration is working!")
        print("   You can now test email sending in your application.")
    else:
        print("\n❌ SMTP configuration needs to be fixed.")
        print("   Please check your .env file and try again.")