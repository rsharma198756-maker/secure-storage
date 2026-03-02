import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import { config } from "./config.js";
export const hashPassword = (password) => bcrypt.hash(password, 12);
export const verifyPassword = (password, hash) => bcrypt.compare(password, hash);
export const normalizeEmail = (email) => email.trim().toLowerCase();
export const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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
