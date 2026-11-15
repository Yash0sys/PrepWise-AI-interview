import crypto from "crypto";

// In-memory OTP store: Map<email, { otp, expiresAt, lastSentAt, attempts }>
const otpStore = new Map();

// Strict 5-minute TTL as requested
const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const RESEND_COOLDOWN_MS = 25 * 1000; // 25 seconds cooldown between resends

// Periodic cleanup of expired OTPs from memory every 60 seconds
setInterval(() => {
  const now = Date.now();
  for (const [email, record] of otpStore.entries()) {
    if (now > record.expiresAt) {
      otpStore.delete(email);
    }
  }
}, 60 * 1000).unref();

export function generateNumericOtp(digits = 6) {
  const min = Math.pow(10, digits - 1);
  const max = Math.pow(10, digits) - 1;
  return crypto.randomInt(min, max + 1).toString();
}

export function canSendOtp(email) {
  const key = email.toLowerCase().trim();
  const existing = otpStore.get(key);
  if (!existing) return { allowed: true };

  const timeSinceLastSent = Date.now() - existing.lastSentAt;
  if (timeSinceLastSent < RESEND_COOLDOWN_MS) {
    const waitSeconds = Math.ceil((RESEND_COOLDOWN_MS - timeSinceLastSent) / 1000);
    return {
      allowed: false,
      waitSeconds,
      message: `Please wait ${waitSeconds}s before requesting a new OTP.`,
    };
  }

  return { allowed: true };
}

export function saveOtp(email, otp) {
  const key = email.toLowerCase().trim();
  const now = Date.now();
  otpStore.set(key, {
    otp: otp.trim(),
    expiresAt: now + OTP_EXPIRY_MS,
    lastSentAt: now,
    attempts: 0,
  });
}

export function verifyOtp(email, providedOtp) {
  const key = email.toLowerCase().trim();
  const record = otpStore.get(key);

  if (!record) {
    return {
      valid: false,
      message: "No active OTP found. Please request a new verification code.",
    };
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(key);
    return {
      valid: false,
      message: "This OTP has expired (5-minute limit exceeded). Please request a new code.",
    };
  }

  record.attempts += 1;
  if (record.attempts > 5) {
    otpStore.delete(key);
    return {
      valid: false,
      message: "Too many failed attempts. Please request a new OTP.",
    };
  }

  if (record.otp !== providedOtp.trim()) {
    return {
      valid: false,
      message: "Incorrect OTP code. Please check your email and try again.",
    };
  }

  // Clear immediately on successful verification to prevent reuse
  otpStore.delete(key);
  return {
    valid: true,
    message: "OTP verified successfully.",
  };
}
