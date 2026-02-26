import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import bcrypt from "bcryptjs";
import { config } from "./config.js";
export const hashPassword = (password) => bcrypt.hash(password, 12);
export const verifyPassword = (password, hash) => bcrypt.compare(password, hash);
export const normalizeEmail = (email) => email.trim().toLowerCase();
export const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
export const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();
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
const transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    requireTLS: config.smtp.requireTls,
    auth: config.smtp.user
        ? {
            user: config.smtp.user,
            pass: config.smtp.pass
        }
        : undefined
});
export const sendOtpEmail = async (email, otp) => {
    try {
        await transporter.sendMail({
            from: config.smtp.from,
            to: email,
            subject: "Your Secure Storage OTP",
            text: `Your OTP code is: ${otp}. It expires in ${config.otpTtlMinutes} minutes.`
        });
    }
    catch (error) {
        const reason = error?.message ?? "smtp_send_failed";
        throw new Error(`otp_email_send_failed:${reason}`);
    }
};
