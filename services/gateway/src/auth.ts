import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { Resend } from "resend";
import bcrypt from "bcryptjs";
import { config } from "./config.js";

const resend = new Resend(config.resendApiKey);

export const hashPassword = (password: string) => bcrypt.hash(password, 12);
export const verifyPassword = (password: string, hash: string) => bcrypt.compare(password, hash);

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

export const verifyAccessToken = (token: string) =>
  jwt.verify(token, config.jwtSecret) as { sub: string; email: string };

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

export const sendOtpEmail = async (email: string, otp: string) => {
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
