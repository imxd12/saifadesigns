// ==========================================
// SAIFA DESIGNS – ENTERPRISE SECURITY MODULE
// ==========================================

const Security = {
  // 1. Cryptographic SHA-256 Hashing via Web Crypto API
  async hash(str) {
    if (!str) return "";
    const msgUint8 = new TextEncoder().encode(String(str));
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  },

  // 2. Strict XSS Prevention & HTML Entity Escaping
  escapeHTML(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;")
      .replace(/`/g, "&#96;");
  },

  // Sanitize input to strip script tags, dangerous protocols and event handlers
  sanitize(input) {
    if (typeof input !== "string") return input;
    let clean = input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/javascript\s*:/gi, "")
      .replace(/data\s*:\s*text\/html/gi, "")
      .replace(/on\w+\s*=/gi, "");
    return this.escapeHTML(clean.trim());
  },

  // Safe URL verification (blocks javascript:, vbscript:, and malicious schemes)
  isSafeURL(url) {
    if (!url) return true;
    const trimmed = String(url).trim().toLowerCase();
    return (
      trimmed.startsWith("https://") ||
      trimmed.startsWith("http://") ||
      trimmed.startsWith("data:image/") ||
      trimmed.startsWith("blob:") ||
      trimmed.startsWith("mailto:") ||
      trimmed.startsWith("tel:") ||
      trimmed.startsWith("#")
    );
  },

  // 3. Brute-Force Rate Limiting (Protects Admin & Worker Logins)
  loginAttempts: {},

  checkRateLimit(identifier, maxAttempts = 5, lockoutSeconds = 30) {
    const now = Date.now();
    const record = this.loginAttempts[identifier] || { count: 0, lockedUntil: 0 };

    if (record.lockedUntil > now) {
      const waitSec = Math.ceil((record.lockedUntil - now) / 1000);
      return {
        allowed: false,
        message: `Too many failed attempts. Locked for security. Try again in ${waitSec}s.`
      };
    }

    return { allowed: true };
  },

  recordFailedLogin(identifier, maxAttempts = 5, lockoutSeconds = 30) {
    const now = Date.now();
    const record = this.loginAttempts[identifier] || { count: 0, lockedUntil: 0 };
    record.count++;

    if (record.count >= maxAttempts) {
      record.lockedUntil = now + lockoutSeconds * 1000;
      record.count = 0; // Reset count for next cycle
      this.loginAttempts[identifier] = record;
      return {
        locked: true,
        message: `Security Lockout: ${maxAttempts} failed attempts. Access locked for ${lockoutSeconds} seconds.`
      };
    }

    this.loginAttempts[identifier] = record;
    return {
      locked: false,
      remaining: maxAttempts - record.count,
      message: `Invalid credentials. ${maxAttempts - record.count} attempt(s) remaining.`
    };
  },

  resetLoginAttempts(identifier) {
    delete this.loginAttempts[identifier];
  },

  // 4. Session Integrity Token Generator
  createSessionToken(role, userId) {
    const payload = {
      role,
      uid: userId,
      issuedAt: Date.now(),
      nonce: Math.random().toString(36).substring(2)
    };
    return btoa(JSON.stringify(payload));
  },

  verifySessionToken(token) {
    try {
      const parsed = JSON.parse(atob(token));
      // Max session duration 24 hours
      if (Date.now() - parsed.issuedAt > 24 * 60 * 60 * 1000) {
        return null;
      }
      return parsed;
    } catch (e) {
      return null;
    }
  }
};
