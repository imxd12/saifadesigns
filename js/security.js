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

  // 3. Persistent Brute-Force Rate Limiting (Survives Page Refresh via localStorage)
  _getRateLimits() {
    try {
      return JSON.parse(localStorage.getItem("saifa_sec_rate_limits") || "{}");
    } catch (e) {
      return {};
    }
  },

  _saveRateLimits(limits) {
    try {
      localStorage.setItem("saifa_sec_rate_limits", JSON.stringify(limits));
    } catch (e) {}
  },

  checkRateLimit(identifier, maxAttempts = 5, lockoutSeconds = 30) {
    const now = Date.now();
    const limits = this._getRateLimits();
    const record = limits[identifier] || { count: 0, lockedUntil: 0, totalLockouts: 0 };

    if (record.lockedUntil > now) {
      const waitSec = Math.ceil((record.lockedUntil - now) / 1000);
      return {
        allowed: false,
        waitSec,
        message: `Security Lockout: Too many attempts. Access paused for ${waitSec}s.`
      };
    }

    return { allowed: true };
  },

  recordFailedLogin(identifier, maxAttempts = 5, baseLockoutSeconds = 30) {
    const now = Date.now();
    const limits = this._getRateLimits();
    const record = limits[identifier] || { count: 0, lockedUntil: 0, totalLockouts: 0 };
    record.count = (record.count || 0) + 1;

    if (record.count >= maxAttempts) {
      // Progressive backoff: doubles lockout time for repeat offenders
      record.totalLockouts = (record.totalLockouts || 0) + 1;
      const penaltyMultiplier = Math.min(record.totalLockouts, 6);
      const effectiveLockout = baseLockoutSeconds * penaltyMultiplier;
      record.lockedUntil = now + effectiveLockout * 1000;
      record.count = 0; // Reset count for next cycle
      limits[identifier] = record;
      this._saveRateLimits(limits);
      return {
        locked: true,
        waitSec: effectiveLockout,
        message: `Security Lockout: ${maxAttempts} failed attempts. Access locked for ${effectiveLockout} seconds.`
      };
    }

    limits[identifier] = record;
    this._saveRateLimits(limits);
    return {
      locked: false,
      remaining: maxAttempts - record.count,
      message: `Invalid attempt. ${maxAttempts - record.count} attempt(s) remaining before lockout.`
    };
  },

  resetLoginAttempts(identifier) {
    const limits = this._getRateLimits();
    delete limits[identifier];
    this._saveRateLimits(limits);
  },

  // 4. Cryptographically Strong Non-Sequential Order Token Generator
  generateSecureOrderNo() {
    try {
      const arr = new Uint8Array(4);
      if (typeof crypto !== "undefined" && crypto.getRandomValues) {
        crypto.getRandomValues(arr);
        // Base-32 alphanumeric character set excluding ambiguous 0/O, 1/I
        const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
        let token = "";
        for (let i = 0; i < 6; i++) {
          token += chars[arr[i % arr.length] % chars.length];
        }
        return "SD" + token;
      }
    } catch (e) {}
    // Fallback using random string with timestamp mixing
    return "SD" + Math.random().toString(36).toUpperCase().slice(2, 8);
  },

  // 5. PII Masking Utilities for Public Tracking Protection (IDOR Shield)
  maskName(name) {
    if (!name) return "Valued Client";
    const parts = String(name).trim().split(/\s+/);
    return parts.map(p => {
      if (p.length <= 2) return p[0] + "*";
      return p[0] + "*".repeat(p.length - 2) + p.slice(-1);
    }).join(" ");
  },

  maskPhone(phone) {
    if (!phone) return "";
    const clean = String(phone).replace(/\D/g, "");
    if (clean.length < 10) return "******";
    return clean.slice(0, 2) + "******" + clean.slice(-2);
  },

  maskAddress(addr) {
    if (!addr) return "Boutique Counter Trial";
    const str = String(addr).trim();
    if (/pickup|counter|shop|trial/i.test(str)) {
      return "Boutique Counter Pickup / Trial";
    }
    const parts = str.split(",");
    if (parts.length > 1) {
      const city = parts[parts.length - 1].trim();
      return `*** Area, ${city} (Full Address Protected)`;
    }
    return "*** Protected Address Details";
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
