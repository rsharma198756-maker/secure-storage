import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import { config } from "./config.js";

export const hashPassword = (password: string) => bcrypt.hash(password, 12);
export const verifyPassword = (password: string, hash: string) =>
  bcrypt.compare(password, hash);

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const generateOtp = () =>
  crypto.randomInt(100000, 1000000).toString();

export const hashOtp = (otp: string) =>
  crypto.createHmac("sha256", config.otpSecret).update(otp).digest("hex");

export const signAccessToken = (userId: string, email: string) => {
  const expiresIn = `${config.jwtAccessTtlMinutes}m`;
  const token = jwt.sign({ sub: userId, email }, config.jwtSecret, {
    expiresIn: expiresIn as any
  });
  return { token, expiresInMinutes: config.jwtAccessTtlMinutes };
};

export type AccessTokenClaims = {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
};

export const verifyAccessToken = (token: string) =>
  jwt.verify(token, config.jwtSecret) as AccessTokenClaims;

type ServiceTokenClaims = {
  kind: "system" | "user";
  scope: string;
  userId?: string;
};

export const signServiceToken = (claims: ServiceTokenClaims) =>
  jwt.sign(claims, config.serviceJwt.secret, {
    issuer: config.serviceJwt.issuer,
    audience: config.serviceJwt.audience,
    expiresIn: `${config.serviceJwt.ttlSeconds}s`
  });

type SecurityActionTokenClaims = {
  sub: string;
  scope: "security:control";
  kind: "security_action";
  iat?: number;
  exp?: number;
};

export const signSecurityActionToken = (userId: string) =>
  jwt.sign(
    {
      sub: userId,
      scope: "security:control",
      kind: "security_action"
    },
    config.jwtSecret,
    { expiresIn: `${config.securityStepUpTtlSeconds}s` }
  );

export const verifySecurityActionToken = (token: string) =>
  jwt.verify(token, config.jwtSecret) as SecurityActionTokenClaims;

export const sendOtpEmail = async (email: string, otp: string) => {
  const subject = "Your Secure Storage OTP";
  const text = `Your OTP code is: ${otp}. It expires in ${config.otpTtlMinutes} minutes.`;

  // ── Brevo REST API (production) ──────────────────────────────────────────
  if (config.brevoApiKey) {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": config.brevoApiKey,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        sender: { name: config.emailFromName, email: config.emailFromAddress },
        to: [{ email }],
        subject,
        textContent: text
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as any;
      throw new Error(`otp_email_send_failed:${err?.message ?? res.status}`);
    }
    return;
  }

  // ── SMTP fallback (local dev via Mailpit) ────────────────────────────────
  const transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    requireTLS: config.smtp.requireTls,
    ...(config.smtp.user ? { auth: { user: config.smtp.user, pass: config.smtp.pass } } : {})
  });

  await transporter.sendMail({
    from: `"${config.emailFromName}" <${config.emailFromAddress}>`,
    to: email,
    subject,
    text
  });
};
