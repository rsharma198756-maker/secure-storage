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

export const normalizePhoneNumber = (phoneNumber: string) => {
  if (!phoneNumber) {
    throw new Error("phone_number_required");
  }

  const digitsOnly = phoneNumber.replace(/[^\d]/g, "");
  if (!digitsOnly || digitsOnly.length < 10) {
    throw new Error("invalid_phone_number");
  }

  if (digitsOnly.length === 10) {
    return `91${digitsOnly}`;
  }

  return digitsOnly;
};

export const isValidPhoneNumber = (phoneNumber: string) => {
  try {
    normalizePhoneNumber(phoneNumber);
    return true;
  } catch {
    return false;
  }
};

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

const sendOtpSms = async (phoneNumber: string, otp: string) => {
  if (!config.msg91.authKey || !config.msg91.templateId) {
    throw new Error("otp_sms_not_configured");
  }

  const res = await fetch(`${config.msg91.apiBaseUrl}/otp`, {
    method: "POST",
    headers: {
      authkey: config.msg91.authKey,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      mobile: normalizePhoneNumber(phoneNumber),
      otp,
      template_id: config.msg91.templateId
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as any;
    if (res.status === 401 || res.status === 403) {
      throw new Error("otp_sms_auth_failed");
    }
    if (res.status === 404) {
      throw new Error("otp_sms_template_not_found");
    }
    throw new Error(err?.message ?? err?.error ?? `otp_sms_send_failed:${res.status}`);
  }
};

export const sendOtp = async (params: {
  email: string;
  phoneNumber?: string | null;
  otp: string;
}) => {
  if (params.phoneNumber && config.msg91.authKey && config.msg91.templateId) {
    await sendOtpSms(params.phoneNumber, params.otp);
    return { channel: "sms" as const };
  }

  await sendOtpEmail(params.email, params.otp);
  return { channel: "email" as const };
};
