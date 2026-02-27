import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { Resend } from "resend";
import bcrypt from "bcryptjs";
import { config } from "./config.js";
const resend = new Resend(config.resendApiKey);
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
export const sendOtpEmail = async (email, otp) => {
    const { error } = await resend.emails.send({
        from: config.emailFrom,
        to: email,
        subject: "Your Secure Storage OTP",
        text: `Your OTP code is: ${otp}. It expires in ${config.otpTtlMinutes} minutes.`
    });
    if (error) {
        throw new Error(`otp_email_send_failed:${error.message}`);
    }
};
