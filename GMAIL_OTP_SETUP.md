# Gmail OTP Setup

This project can send OTP emails through Gmail SMTP.

## 1. Create Google App Password

1. Turn on 2-Step Verification in your Google account.
2. Create an App Password from Google Account security settings.
3. Keep the generated 16-character password safe.

Notes:
- Use an App Password, not your normal Gmail account password.
- If your organization uses Google Workspace, admin policies can block App Passwords.

## 2. Configure project environment

Create a `.env` file in the project root (or copy `.env.example`):

```bash
cp .env.example .env
```

Set values:

```env
RETURN_OTP_IN_RESPONSE=false
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_REQUIRE_TLS=true
SMTP_USER=your-account@gmail.com
SMTP_PASS=your-16-char-app-password
SMTP_FROM=your-account@gmail.com
```

## 3. Restart stack

```bash
docker compose down
docker compose up -d --build
```

## 4. Test OTP delivery

1. Open admin UI: `http://localhost:5173`
2. Start login for your Gmail user in the app.
3. Check the inbox of `SMTP_USER` (and spam folder if needed).

If OTP is not delivered, check:

```bash
docker compose logs --tail=200 gateway
```

You should not keep `RETURN_OTP_IN_RESPONSE=true` when using real email delivery.
