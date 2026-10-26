// ==========================================
// SAIFA DESIGNS – REAL-TIME STACK & SYNC
// ==========================================

const Realtime = {
  channel: null,
  isOnline: navigator.onLine,
  listeners: [],

  init() {
    // 1. Initialize BroadcastChannel for sub-millisecond cross-tab/window sync
    if (typeof BroadcastChannel !== "undefined") {
      try {
        this.channel = new BroadcastChannel("saifa_realtime_bus");
        this.channel.onmessage = event => {
          this.handleIncomingMessage(event.data);
        };
      } catch (e) {
        console.warn("BroadcastChannel initialization skipped", e);
      }
    }

    // 2. Storage event listener for cross-window persistent state synchronization
    window.addEventListener("storage", e => {
      if (e.key && e.key.startsWith("saifa_")) {
        const stateKey = e.key.replace("saifa_", "");
        try {
          const newVal = (e.newValue && e.newValue.trim() !== "") ? JSON.parse(e.newValue) : [];
          S[stateKey] = newVal;
          this.triggerLocalRefresh(stateKey);
        } catch (err) {}
      }
    });

    // 3. Network connection liveness monitor
    window.addEventListener("online", () => {
      this.isOnline = true;
      this.updateConnectionBadge("Online · Realtime Sync Active", true);
      this.broadcast("SYSTEM_ONLINE", { time: Date.now() });
    });

    window.addEventListener("offline", () => {
      this.isOnline = false;
      this.updateConnectionBadge("Offline Mode · Local Storage Active", false);
    });

    this.updateConnectionBadge(navigator.onLine ? "Online · Realtime Sync Active" : "Offline Mode", navigator.onLine);
  },

  // Broadcast a real-time event across all open devices, tabs & windows
  broadcast(type, payload = {}) {
    const msg = {
      type,
      payload,
      timestamp: Date.now(),
      senderId: S.me ? S.me.role + "_" + (S.me.id || "admin") : "guest"
    };

    if (this.channel) {
      try {
        this.channel.postMessage(msg);
      } catch (e) {}
    }

    try {
      window.dispatchEvent(new CustomEvent("saifa_realtime_event", { detail: msg }));
    } catch (e) {}
  },

  handleIncomingMessage(msg) {
    if (!msg || !msg.type) return;

    // Reload corresponding data in state
    switch (msg.type) {
      case "RECORD_DELETED": {
        const col = msg.payload && msg.payload.col;
        if (col) {
          const stateKey = (col === "products" || col === "prod") ? "prod" : col;
          S[stateKey] = loadLS(stateKey, []);
        }
        break;
      }
      case "RECORD_UPDATED":
      case "RECORD_SAVED": {
        const col = msg.payload && msg.payload.col;
        if (col) {
          const stateKey = (col === "products" || col === "prod") ? "prod" : col;
          S[stateKey] = loadLS(stateKey, []);
        }
        break;
      }
      case "ORDER_CREATED":
      case "ORDER_UPDATED":
        S.orders = loadLS("orders", []);
        break;
      case "PRODUCT_UPDATED":
        S.prod = loadLS("prod", []);
        break;
      case "CUSTOMER_UPDATED":
        S.customers = loadLS("customers", []);
        break;
      case "WORKER_UPDATED":
        S.workers = loadLS("workers", []);
        break;
      case "TEAM_UPDATED":
        S.team = loadLS("team", []);
        break;
      case "WORK_LOGGED":
        S.work = loadLS("work", []);
        break;
      case "ATTENDANCE_LOGGED":
        S.attendance = loadLS("attendance", []);
        break;
      case "PAYOUT_LOGGED":
        S.payouts = loadLS("payouts", []);
        break;
      case "SETTINGS_UPDATED":
      case "SHOP_STATUS_CHANGED":
        S.cfg = loadLS("cfg", S.cfg);
        break;
      case "COUPON_UPDATED":
        S.coupons = loadLS("coupons", []);
        break;
      case "REVIEW_SUBMITTED":
      case "REVIEW_UPDATED":
      case "REVIEW_DELETED":
        S.reviews = loadLS("reviews", []);
        break;
    }

    try {
      window.dispatchEvent(new CustomEvent("saifa_realtime_event", { detail: msg }));
    } catch (e) {}

    if (typeof refresh === "function") {
      refresh();
    } else {
      if (typeof renderFront === "function") renderFront();
      if (typeof panel === "function" && S.tab && S.me && S.me.role === "admin" && $("pn")?.classList.contains("on")) panel();
      if (typeof wpanel === "function" && S.me && S.me.role === "worker" && $("pn")?.classList.contains("on")) wpanel();
    }
  },

  triggerLocalRefresh(key) {
    if (typeof refresh === "function") {
      refresh();
    } else {
      if (typeof renderFront === "function") renderFront();
      if (typeof panel === "function" && S.tab && S.me && S.me.role === "admin" && $("pn")?.classList.contains("on")) panel();
      if (typeof wpanel === "function" && S.me && S.me.role === "worker" && $("pn")?.classList.contains("on")) wpanel();
    }
  },

  updateConnectionBadge(text, isLive) {
    const el = document.getElementById("lv");
    if (el) {
      el.textContent = text;
      el.className = isLive ? "live" : "pill w";
    }
  }
};
