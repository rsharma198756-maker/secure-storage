import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import { config } from "./config.js";
export const hashPassword = (password) => bcrypt.hash(password, 12);
export const verifyPassword = (password, hash) => bcrypt.compare(password, hash);
export const normalizeEmail = (email) => email.trim().toLowerCase();
export const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
export const normalizePhoneNumber = (phoneNumber) => {
    if (!phoneNumber) {
        throw new Error("phone_number_required");
    }
    const digitsOnly = phoneNumber.replace(/[^\d]/g, "");
    let localNumber = "";
    if (digitsOnly.length === 10) {
        localNumber = digitsOnly;
    }
    else if (digitsOnly.length === 11 && digitsOnly.startsWith("0")) {
        localNumber = digitsOnly.slice(1);
    }
    else if (digitsOnly.length === 12 && digitsOnly.startsWith("91")) {
        localNumber = digitsOnly.slice(2);
    }
    else {
        throw new Error("invalid_phone_number");
    }
    if (!/^[6-9]\d{9}$/.test(localNumber)) {
        throw new Error("invalid_phone_number");
    }
    return `91${localNumber}`;
};
export const isValidPhoneNumber = (phoneNumber) => {
    try {
        normalizePhoneNumber(phoneNumber);
        return true;
    }
    catch {
        return false;
    }
};
export const generateOtp = () => crypto.randomInt(100000, 1000000).toString();
export const hashOtp = (otp) => crypto.createHmac("sha256", config.otpSecret).update(otp).digest("hex");
export const signAccessToken = (userId, email) => {
    const expiresIn = `${config.jwtAccessTtlMinutes}m`;
    const token = jwt.sign({ sub: userId, email }, config.jwtSecret, {
        expiresIn: expiresIn
    });
    return { token, expiresInMinutes: config.jwtAccessTtlMinutes };
};
export const verifyAccessToken = (token) => jwt.verify(token, config.jwtSecret);
export const signServiceToken = (claims) => jwt.sign(claims, config.serviceJwt.secret, {
    issuer: config.serviceJwt.issuer,
    audience: config.serviceJwt.audience,
    expiresIn: `${config.serviceJwt.ttlSeconds}s`
});
export const signSecurityActionToken = (userId) => jwt.sign({
    sub: userId,
    scope: "security:control",
    kind: "security_action"
}, config.jwtSecret, { expiresIn: `${config.securityStepUpTtlSeconds}s` });
export const verifySecurityActionToken = (token) => jwt.verify(token, config.jwtSecret);
export const signPhoneEnrollmentToken = (userId, email) => jwt.sign({
    sub: userId,
    email,
    kind: "phone_enrollment"
}, config.jwtSecret, { expiresIn: `${config.otpTtlMinutes}m` });
export const verifyPhoneEnrollmentToken = (token) => jwt.verify(token, config.jwtSecret);
export const sendOtpEmail = async (email, otp) => {
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
            const err = await res.json().catch(() => ({}));
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
const sendOtpSms = async (phoneNumber, otp) => {
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
        const err = await res.json().catch(() => ({}));
        if (res.status === 401 || res.status === 403) {
            throw new Error("otp_sms_auth_failed");
        }
        if (res.status === 404) {
            throw new Error("otp_sms_template_not_found");
        }
        throw new Error(err?.message ?? err?.error ?? `otp_sms_send_failed:${res.status}`);
    }
};
export const sendOtp = async (params) => {
    if (!params.phoneNumber) {
        throw new Error("phone_number_required");
    }
    if (!config.msg91.authKey || !config.msg91.templateId) {
        throw new Error("otp_sms_not_configured");
    }
    await sendOtpSms(params.phoneNumber, params.otp);
    return { channel: "sms" };
};
