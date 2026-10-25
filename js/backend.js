// ==========================================
// SAIFA DESIGNS – BACKEND & DATA PERSISTENCE
// ==========================================

const $ = id => document.getElementById(id);
const E = s => Security.escapeHTML(s);
const R = n => "₹" + Number(n || 0).toLocaleString("en-IN");
const uid = () => Math.random().toString(36).slice(2, 9).toUpperCase();
const np = p => String(p || "").replace(/\D/g, "").slice(-10);

// Helper for localStorage with json fallback
function loadLS(key, fallback) {
  try {
    const raw = localStorage.getItem("saifa_" + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

function saveLS(key, data) {
  try {
    localStorage.setItem("saifa_" + key, JSON.stringify(data));
  } catch (e) {}
}

// Global Application State
let S = {
  prod: loadLS("prod", SEED_PROD),
  orders: loadLS("orders", typeof SEED_ORDERS !== "undefined" ? SEED_ORDERS : []),
  customers: loadLS("customers", []),
  team: loadLS("team", SEED_TEAM),
  workers: loadLS("workers", SEED_WORKERS),
  work: loadLS("work", []),
  payouts: loadLS("payouts", []),
  attendance: loadLS("attendance", []),
  coupons: loadLS("coupons", SEED_COUPONS),
  cfg: loadLS("cfg", JSON.parse(JSON.stringify(DEF))),
  cart: loadLS("cart", []),
  appliedCoupon: null,
  cat: "All",
  me: null,
  tab: "Dashboard",
  sfilter: "All",
  ofilter: "All",
  cq: "",
  teamEdit: null,
  workerEdit: null,
  selectedWorkerSalary: "all",
  navCollapsed: false
};

let db = null;
let sample = null;

// Selectors
const products = () => (Array.isArray(S.prod) ? S.prod : SEED_PROD);
const team = () => (Array.isArray(S.team) ? S.team.slice().sort((a, b) => (a.ord || 0) - (b.ord || 0)) : SEED_TEAM);
const orders = () => (Array.isArray(S.orders) && S.orders.length > 0 ? S.orders : (typeof SEED_ORDERS !== "undefined" ? SEED_ORDERS : []));
const custs = () => S.customers || [];
const workers = () => (Array.isArray(S.workers) ? S.workers : SEED_WORKERS);
const coupons = () => (Array.isArray(S.coupons) ? S.coupons : SEED_COUPONS);

// Worker & Salary calculations
const monKey = ts => {
  const d = new Date(ts);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
};
const curMon = monKey(Date.now());

function sal(wid) {
  return (S.work || [])
    .filter(w => w.wk == wid && monKey(w.ts) == curMon && w.verified !== false)
    .reduce((a, w) => a + (Number(w.qty) || 0) * (Number(w.rate) || 0), 0);
}

function getWorkerMonthlyStats(wid, monthKey = curMon) {
  const piecesLog = (S.work || []).filter(w => w.wk == wid && monKey(w.ts) == monthKey);
  const verifiedPiecesLog = piecesLog.filter(w => w.verified !== false);
  const pendingPiecesLog = piecesLog.filter(w => w.verified === false);

  const totalPieces = verifiedPiecesLog.reduce((a, w) => a + (Number(w.qty) || 0), 0);
  const totalEarned = verifiedPiecesLog.reduce((a, w) => a + (Number(w.qty) || 0) * (Number(w.rate) || 0), 0);

  const pendingPieces = pendingPiecesLog.reduce((a, w) => a + (Number(w.qty) || 0), 0);
  const pendingEarned = pendingPiecesLog.reduce((a, w) => a + (Number(w.qty) || 0) * (Number(w.rate) || 0), 0);

  const payoutLog = (S.payouts || []).filter(p => p.wid == wid && monKey(p.date) == monthKey);
  const totalPaid = payoutLog.reduce((a, p) => a + (Number(p.amount) || 0), 0);

  const pendingBalance = totalEarned - totalPaid;

  const attLog = (S.attendance || []).filter(at => at.wid == wid && String(at.date).startsWith(monthKey));
  const daysPresent = attLog.filter(at => at.status == "Present").length;
  const daysHalf = attLog.filter(at => at.status == "Half-Day").length;
  const daysLeave = attLog.filter(at => at.status == "Leave" || at.status == "Absent").length;

  return {
    totalPieces,
    totalEarned,
    pendingPieces,
    pendingEarned,
    totalPaid,
    pendingBalance,
    daysPresent,
    daysHalf,
    daysLeave,
    payoutLog,
    piecesLog,
    verifiedPiecesLog,
    pendingPiecesLog
  };
}

// ------------------------------------------
// Boutique Live Status, Opening Hours & Schedule
// ------------------------------------------
function formatTime12(timeStr = "10:30") {
  if (!timeStr) return "10:30 AM";
  const [hStr, mStr] = String(timeStr).split(":");
  let h = parseInt(hStr, 10) || 0;
  const m = String(mStr || "00").padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  h = h ? h : 12;
  return `${h}:${m} ${ampm}`;
}

function getShopLiveStatus() {
  const cfg = S.cfg || DEF;
  const setting = cfg.shopStatus || "Auto";

  if (setting === "Online") {
    const msg = "Boutique Atelier is Open · Orders & Bespoke Stitching Active";
    return {
      isOpen: true,
      setting: "Online",
      status: "Online",
      label: "Online & Accepting Orders",
      badgeClass: "open",
      icon: "🟢",
      reason: msg,
      message: msg,
      hoursFormatted: cfg.hours || "Tue–Sun 10:30 AM – 9:00 PM (Monday Closed)"
    };
  }

  if (setting === "Offline") {
    const msg = cfg.offlineNotice || "Atelier currently paused by administrator.";
    return {
      isOpen: false,
      setting: "Offline",
      status: "Offline",
      label: "Boutique Temporarily Closed",
      badgeClass: "closed",
      icon: "🔴",
      reason: msg,
      message: msg,
      hoursFormatted: cfg.hours || "Tue–Sun 10:30 AM – 9:00 PM (Monday Closed)"
    };
  }

  // "Auto" Schedule Evaluation
  const now = new Date();
  const day = now.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const isMonday = day === 1;

  if (cfg.mondayClosed && isMonday) {
    const msg = "Weekly Monday Closure · Reopens Tuesday at " + formatTime12(cfg.openTime || "10:30");
    return {
      isOpen: false,
      setting: "Auto",
      status: "Auto",
      isMondayClosed: true,
      label: "Closed Today (Monday Atelier Rest Day)",
      badgeClass: "closed",
      icon: "🔴",
      reason: msg,
      message: msg,
      hoursFormatted: cfg.hours || "Tue–Sun 10:30 AM – 9:00 PM (Monday Closed)"
    };
  }

  const [openH, openM] = (cfg.openTime || "10:30").split(":").map(Number);
  const [closeH, closeM] = (cfg.closeTime || "21:00").split(":").map(Number);

  const curMinutes = now.getHours() * 60 + now.getMinutes();
  const openMinutes = (openH || 10) * 60 + (openM || 30);
  const closeMinutes = (closeH || 21) * 60 + (closeM || 0);

  if (curMinutes >= openMinutes && curMinutes < closeMinutes) {
    const msg = `Open today until ${formatTime12(cfg.closeTime || "21:00")} · Walk-ins & Online Orders Welcome`;
    return {
      isOpen: true,
      setting: "Auto",
      status: "Auto",
      label: `Open · ${formatTime12(cfg.openTime || "10:30")}–${formatTime12(cfg.closeTime || "21:00")}`,
      badgeClass: "open",
      icon: "🟢",
      reason: msg,
      message: msg,
      hoursFormatted: cfg.hours || "Tue–Sun 10:30 AM – 9:00 PM (Monday Closed)"
    };
  } else {
    const isMorning = curMinutes < openMinutes;
    const nextReopen = isMorning 
      ? `Opens today at ${formatTime12(cfg.openTime || "10:30")}` 
      : isMonday ? `Opens Tuesday at ${formatTime12(cfg.openTime || "10:30")}` : `Opens tomorrow at ${formatTime12(cfg.openTime || "10:30")}`;
    const msg = `Operating Hours: ${formatTime12(cfg.openTime || "10:30")} to ${formatTime12(cfg.closeTime || "21:00")} (Mon Closed)`;
    return {
      isOpen: false,
      setting: "Auto",
      status: "Auto",
      label: `Closed · ${nextReopen}`,
      badgeClass: "closed",
      icon: "🌙",
      reason: msg,
      message: msg,
      hoursFormatted: cfg.hours || "Tue–Sun 10:30 AM – 9:00 PM (Monday Closed)"
    };
  }
}

function setShopLiveStatus(newStatus) {
  S.cfg.shopStatus = newStatus;
  saveLS("cfg", S.cfg);
  if (typeof Realtime !== "undefined") {
    Realtime.broadcast("SETTINGS_UPDATED", S.cfg);
    Realtime.broadcast("SHOP_STATUS_CHANGED", { status: newStatus });
  }
  put("config", S.cfg, "main").then(() => {
    toast(`Shop status updated to "${newStatus}" 🏪`);
    if (typeof panel === "function" && S.tab) panel();
    if (typeof renderFront === "function") renderFront();
  });
}

function findWorkerByLoginId(identifier) {
  if (!identifier) return null;
  const raw = String(identifier).trim().toLowerCase();
  const cleanPhone = np(raw);
  const strippedId = raw.replace(/@saifadesigns(\.com)?/g, "").trim();

  return workers().find(w => {
    const wWid = String(w.wid || "").toLowerCase().trim();
    const wStripped = wWid.replace(/@saifadesigns(\.com)?/g, "").trim();
    const wPhone = np(w.phone || "");

    return (
      wWid === raw ||
      wStripped === strippedId ||
      (cleanPhone.length === 10 && wPhone === cleanPhone)
    );
  });
}

// ---------- backend synchronization ----------
(async function initBackend() {
  try {
    let cloudActive = false;

    // Check if Firebase SDK & Config are loaded
    if (typeof firebase !== "undefined" && typeof isFirebaseConfigured === "function" && isFirebaseConfigured()) {
      if (!firebase.apps.length) {
        firebase.initializeApp(FIREBASE_CONFIG);
      }

      // 1. Firebase Realtime Database (RTDB)
      if (firebase.database && FIREBASE_CONFIG.databaseURL) {
        const rtdb = firebase.database();
        window._rtdb = rtdb;
        cloudActive = true;

        const collections = ["prod", "orders", "customers", "team", "workers", "work", "coupons", "payouts", "attendance"];
        collections.forEach(col => {
          rtdb.ref(col).on("value", snapshot => {
            const val = snapshot.val();
            if (val) {
              const mapped = Array.isArray(val) ? val.filter(Boolean) : Object.keys(val).map(k => ({ ...val[k], id: val[k].id || k }));
              const stateKey = (col === "products" || col === "prod") ? "prod" : col;
              S[stateKey] = mapped;
              saveLS(stateKey, mapped);
              if (typeof refresh === "function") refresh();
            } else {
              // Auto-seed initial catalogue if cloud collection is fresh/empty
              const stateKey = (col === "products" || col === "prod") ? "prod" : col;
              const sourceArr = S[stateKey];
              if (Array.isArray(sourceArr) && sourceArr.length > 0) {
                const seedObj = {};
                sourceArr.forEach(item => {
                  if (item && item.id) seedObj[item.id] = item;
                });
                rtdb.ref(col).set(seedObj).catch(() => {});
              }
            }
          });
        });

        rtdb.ref("config/main").on("value", snapshot => {
          const val = snapshot.val();
          if (val) {
            S.cfg = { ...DEF, ...val };
            saveLS("cfg", S.cfg);
            if (typeof refresh === "function") refresh();
          } else {
            rtdb.ref("config/main").set(S.cfg || DEF).catch(() => {});
          }
        });

        if (typeof Realtime !== "undefined") {
          Realtime.updateConnectionBadge("Online · Firebase Realtime Cloud Sync Active", true);
        }
      } 
      // 2. Firebase Cloud Firestore
      else if (firebase.firestore) {
        const fstore = firebase.firestore();
        db = fstore;
        cloudActive = true;

        ["products", "orders", "customers", "team", "workers", "work", "coupons", "payouts", "attendance"].forEach(col => {
          fstore.collection(col).onSnapshot(sn => {
            const mapped = sn.docs.map(d => ({ ...d.data(), id: d.id }));
            const stateKey = col === "products" ? "prod" : col;
            S[stateKey] = mapped;
            saveLS(stateKey, mapped);
            if (typeof refresh === "function") refresh();
          }, () => {});
        });

        fstore.collection("config").doc("main").onSnapshot(s => {
          if (s.exists) {
            S.cfg = { ...DEF, ...s.data() };
            saveLS("cfg", S.cfg);
            if (typeof refresh === "function") refresh();
          }
        }, () => {});

        if (typeof Realtime !== "undefined") {
          Realtime.updateConnectionBadge("Online · Firestore Cloud Sync Active", true);
        }
      }
    }

    if (!cloudActive) {
      if (typeof Realtime !== "undefined") {
        Realtime.updateConnectionBadge(navigator.onLine ? "Online · Realtime Sync Active" : "Offline Mode", navigator.onLine);
      }
    }

    if (typeof refresh === "function") refresh();
  } catch (e) {
    console.warn("Backend init notice:", e);
    if (typeof refresh === "function") refresh();
  }
})();

function put(col, data, id) {
  id = id || uid();
  const stateKey = col === "products" ? "prod" : col;
  const arr = S[stateKey] || (S[stateKey] = []);
  const row = { ...data, id };
  const i = arr.findIndex(x => x.id == id);
  i > -1 ? (arr[i] = row) : arr.unshift(row);
  saveLS(stateKey, arr);

  if (typeof Realtime !== "undefined") {
    Realtime.broadcast("RECORD_SAVED", { col, id, row });
  }

  if (typeof refresh === "function") refresh();

  // Cloud Realtime Database Sync
  if (window._rtdb) {
    window._rtdb.ref(stateKey + "/" + id).set(row).catch(() => {});
  }

  // Cloud Firestore Sync
  if (db && db.collection) {
    return db.collection(col).doc(id).set(data).then(() => id).catch(() => id);
  }

  return Promise.resolve(id);
}

function upd(col, id, patch) {
  const stateKey = col === "products" ? "prod" : col;
  const r = (S[stateKey] || []).find(x => x.id == id);
  if (r) {
    Object.assign(r, patch);
    saveLS(stateKey, S[stateKey]);

    if (typeof Realtime !== "undefined") {
      Realtime.broadcast("RECORD_UPDATED", { col, id, patch });
    }

    if (typeof refresh === "function") refresh();
  }

  // Cloud Realtime Database Sync
  if (window._rtdb) {
    window._rtdb.ref(stateKey + "/" + id).update(patch).catch(() => {});
  }

  // Cloud Firestore Sync
  if (db && db.collection) {
    return db.collection(col).doc(id).update(patch).catch(() => {});
  }

  return Promise.resolve();
}

function del(col, id) {
  const stateKey = (col === "products" || col === "prod") ? "prod" : col;
  const deletedItem = (S[stateKey] || []).find(x => String(x.id) === String(id));
  S[stateKey] = (S[stateKey] || []).filter(x => String(x.id) !== String(id));
  saveLS(stateKey, S[stateKey]);

  if (col === "coupons" && deletedItem && deletedItem.isBanner) {
    S.cfg.offerBanner = "";
    saveLS("cfg", S.cfg);
  }

  if (typeof Realtime !== "undefined") {
    Realtime.broadcast("RECORD_DELETED", { col, id });
    if (col === "coupons") {
      Realtime.broadcast("COUPON_UPDATED", S.coupons);
    } else if (col === "products" || col === "prod") {
      Realtime.broadcast("PRODUCT_UPDATED", S.prod);
    } else if (col === "orders") {
      Realtime.broadcast("ORDER_UPDATED", { id, status: "Deleted" });
    }
  }

  if (typeof panel === "function" && S.tab) panel();
  if (typeof renderFront === "function") renderFront();
  if (typeof refresh === "function") refresh();

  // Cloud Realtime Database Sync
  if (window._rtdb) {
    window._rtdb.ref(stateKey + "/" + id).remove().catch(() => {});
  }

  // Cloud Firestore Sync
  if (db && db.collection) {
    db.collection(col).doc(id).delete().catch(() => {});
  }
}

function saveCfg() {
  saveLS("cfg", S.cfg);
  if (typeof Realtime !== "undefined") {
    Realtime.broadcast("SETTINGS_UPDATED", S.cfg);
  }

  // Cloud Realtime Database Sync
  if (window._rtdb) {
    window._rtdb.ref("config/main").set(S.cfg).catch(() => {});
  }

  // Cloud Firestore Sync
  if (db && db.collection) {
    db.collection("config").doc("main").set(S.cfg).catch(() => {});
  }

  put("config", S.cfg, "main").then(id => {
    if (id) {
      if (typeof toast === "function") toast("Boutique settings saved ✅");
      if (typeof refresh === "function") refresh();
    }
  });
}

// ---------- customers ----------
function nextCid() {
  const m = Math.max(0, ...custs().map(c => +String(c.cid).replace(/\D/g, "") || 0));
  return "CUS" + String(m + 1).padStart(4, "0");
}

function saveCust(name, phone, address, garment, meas) {
  const p = np(phone);
  const c = custs().find(x => np(x.phone) == p);
  const rec = {
    name: Security.sanitize(name),
    phone: p,
    address: Security.sanitize(address || (c && c.address) || ""),
    cid: c ? c.cid : nextCid(),
    measures: (c && c.measures) || [],
    created: c ? c.created : Date.now()
  };
  if (meas && Object.values(meas).some(v => v && v != "-")) {
    rec.measures = [{ date: Date.now(), garment: Security.sanitize(garment), m: meas }, ...rec.measures].slice(0, 20);
  }
  return put("customers", rec, c ? c.id : null).then(id => (id ? rec.cid : null));
}

function custByPhone(p) {
  return custs().find(x => np(x.phone) == np(p));
}

// ---------- order placement & payment helpers ----------
function placeOrder(o) {
  const no = "SD" + Date.now().toString(36).toUpperCase().slice(-5);
  return saveCust(o.customer, o.phone, o.address, o.garment || "Shop order", o.measure).then(cid => {
    if (!cid) return null;
    const full = {
      ...o,
      customer: Security.sanitize(o.customer),
      address: Security.sanitize(o.address),
      cid,
      no,
      ts: Date.now(),
      status: "New",
      paid: o.paid || "Unpaid",
      phone: np(o.phone),
      coupon: S.appliedCoupon ? S.appliedCoupon.code : null,
      discount: S.appliedCoupon ? S.appliedCoupon.discount : 0,
      history: [
        { status: "New", at: Date.now(), note: "Order placed online" }
      ]
    };

    if (S.appliedCoupon) {
      recordCouponRedemption(S.appliedCoupon.code);
    }

    return put("orders", full).then(id => {
      if (id) {
        if (typeof Realtime !== "undefined") {
          Realtime.broadcast("ORDER_CREATED", full);
        }
        return { ...full, id };
      }
      return null;
    });
  });
}

function updateOrderStatus(orderId, newStatus, customerNote = "") {
  const o = orders().find(x => x.id == orderId);
  if (!o) return;
  const history = o.history || [];
  history.push({
    status: newStatus,
    at: Date.now(),
    note: customerNote || `Status updated to ${newStatus}`
  });

  const patch = { status: newStatus, history };
  if (newStatus === "Ready") patch.readyAt = Date.now();
  if (newStatus === "Delivered") patch.deliveredAt = Date.now();

  upd("orders", orderId, patch);
  if (typeof Realtime !== "undefined") {
    Realtime.broadcast("ORDER_UPDATED", { orderId, patch });
  }
}

function updateOrderProgressStage(orderId, stageName, note = "") {
  const o = orders().find(x => x.id == orderId);
  if (!o) return;
  const stageLog = o.progressStages || [];
  stageLog.push({
    stage: stageName,
    at: Date.now(),
    by: S.me?.name || "Artisan Workstation",
    note: note || `Advanced to ${stageName}`
  });

  const patch = { currentStage: stageName, progressStages: stageLog };
  if (stageName === "Ready for Trial & Delivery") {
    patch.status = "Ready";
    patch.readyAt = Date.now();
  } else if (stageName === "Core Stitching & Assembly" || stageName === "Cutting & Pattern Drafting") {
    if (o.status === "New" || o.status === "Confirmed") {
      patch.status = "Stitching";
    }
  }

  upd("orders", orderId, patch);
  if (typeof Realtime !== "undefined") {
    Realtime.broadcast("ORDER_UPDATED", { orderId, patch });
  }
}

function updateOrderPayment(orderId, newPaidStatus) {
  const o = orders().find(x => x.id == orderId);
  if (!o) return;
  const patch = { paid: newPaidStatus };
  if (newPaidStatus === "Paid") {
    patch.paidAt = Date.now();
  }
  upd("orders", orderId, patch);
  if (typeof Realtime !== "undefined") {
    Realtime.broadcast("ORDER_UPDATED", { orderId, patch });
  }
  if (typeof panel === "function" && S.tab) panel();
  if (typeof renderFront === "function") renderFront();
}

function upiLink(amt, note) {
  const c = S.cfg;
  return `upi://pay?pa=${encodeURIComponent(c.upi)}&pn=${encodeURIComponent(c.payee)}&am=${Number(amt).toFixed(2)}&cu=INR&tn=${encodeURIComponent(note)}`;
}

// Generates an automated WhatsApp link for sharing order details with admin
function getAdminWhatsAppOrderLink(o) {
  const c = S.cfg;
  const adminPhone = c.shopPhone;
  const trackUrl = `${window.location.origin}${window.location.pathname}#track?id=${o.no}&phone=${o.phone}`;
  const itemsText = o.type === 'Stitch' 
    ? `${o.garment} (Measurements: ${Object.entries(o.measure || {}).map(([k,v]) => k + ': ' + v + '"').join(', ')})`
    : (o.items || []).map(i => `${i.n} x${i.q}`).join(', ');

  const msg = `*NEW ORDER RECEIVED - SAIFA DESIGNS* 👗
----------------------------------------
*Order ID:* #${o.no}
*Client ID:* ${o.cid}
*Customer:* ${o.customer}
*Phone:* ${o.phone}
*Address:* ${o.address}
*Type:* ${o.type}
*Items/Details:* ${itemsText}
${o.note ? `*Design Note:* ${o.note}\n` : ''}
*Total Amount:* ₹${o.total}
*Payment Method:* ${o.pay} (${o.paid})
${o.coupon ? `*Coupon Applied:* ${o.coupon} (-₹${o.discount})\n` : ''}
----------------------------------------
*Live Order Tracking Link:*
${trackUrl}`;

  return `https://wa.me/91${np(adminPhone)}?text=${encodeURIComponent(msg)}`;
}

// ---------- coupon validation & engine ----------
function validateCoupon(code, cartTotal) {
  if (!code) return { valid: false, message: "Please enter a coupon code" };
  const clean = code.trim().toUpperCase();
  const cp = coupons().find(c => c.code.toUpperCase() === clean);
  if (!cp) return { valid: false, message: "Invalid coupon code" };
  if (!cp.active) return { valid: false, message: "This coupon is currently inactive" };
  if (cp.validTill && new Date(cp.validTill + "T23:59:59") < new Date()) {
    return { valid: false, message: `Coupon expired on ${cp.validTill}` };
  }
  if (cp.maxUses && cp.usedCount >= cp.maxUses) {
    return { valid: false, message: "Coupon redemption limit has been reached" };
  }
  if (cp.minOrder && cartTotal < cp.minOrder) {
    return { valid: false, message: `Minimum order value of ${R(cp.minOrder)} required for this coupon` };
  }

  let discount = 0;
  if (cp.type === "percent") {
    discount = Math.round((cartTotal * (cp.val || 0)) / 100);
  } else {
    discount = Math.min(cartTotal, cp.val || 0);
  }

  return {
    valid: true,
    coupon: cp,
    discount,
    finalTotal: Math.max(0, cartTotal - discount),
    message: `Coupon '${cp.code}' applied! You saved ${R(discount)}.`
  };
}

function recordCouponRedemption(code) {
  const clean = code.trim().toUpperCase();
  const cp = coupons().find(c => c.code.toUpperCase() === clean);
  if (cp) {
    upd("coupons", cp.id, { usedCount: (cp.usedCount || 0) + 1 });
  }
}

function getCurrentBannerOfferText() {
  if (S.cfg && S.cfg.offerBanner === "none") {
    return "";
  }
  if (S.cfg && S.cfg.offerBanner) {
    return S.cfg.offerBanner;
  }
  const bannerCp = (S.coupons || []).find(c => c.active && c.isBanner) || (S.coupons || []).find(c => c.active);
  if (bannerCp) {
    const discountText = bannerCp.type === "percent" ? `${bannerCp.val}% off` : `₹${bannerCp.val} flat discount`;
    return `🎉 Special Offer: Use code <b>${Security.escapeHTML(bannerCp.code)}</b> for ${discountText} on ${Security.escapeHTML(bannerCp.desc || "all collections")}!`;
  }
  return "🎉 Festive Offer: Use code FESTIVE10 for 10% off on all readymade collections!";
}

function setCouponAsBanner(couponId) {
  const all = S.coupons || [];
  const target = all.find(c => c.id == couponId);
  if (!target) return;

  if (target.isBanner) {
    // If already banner, toggle it off
    target.isBanner = false;
    saveLS("coupons", all);
    S.cfg.offerBanner = "";
    saveLS("cfg", S.cfg);
    if (typeof Realtime !== "undefined") {
      Realtime.broadcast("SETTINGS_UPDATED", S.cfg);
      Realtime.broadcast("COUPON_UPDATED", all);
    }
    toast(`Coupon ${target.code} removed from storefront banner 📢`);
  } else {
    // Activate and set as exclusive live banner
    all.forEach(c => {
      c.isBanner = (c.id == couponId);
    });
    target.active = true;
    saveLS("coupons", all);
    S.cfg.offerBanner = ""; // Clear static override to let dynamic template render target
    saveLS("cfg", S.cfg);
    if (typeof Realtime !== "undefined") {
      Realtime.broadcast("SETTINGS_UPDATED", S.cfg);
      Realtime.broadcast("COUPON_UPDATED", all);
    }
    toast(`Coupon ${target.code} set as live storefront announcement banner! 🌟`);
  }
  if (typeof renderFront === "function") renderFront();
  if (typeof panel === "function") panel();
}

function toggleCouponActive(id) {
  const cp = (S.coupons || []).find(c => c.id == id);
  if (cp) {
    const newActive = !cp.active;
    const patch = { active: newActive };
    if (!newActive && cp.isBanner) {
      patch.isBanner = false;
      cp.isBanner = false;
    }
    upd("coupons", id, patch).then(() => {
      if (typeof Realtime !== "undefined") {
        Realtime.broadcast("COUPON_UPDATED", S.coupons);
      }
      toast(`Coupon ${cp.code} is now ${newActive ? 'Active ▶' : 'Paused ⏸'}`);
      if (typeof renderFront === "function") renderFront();
      if (typeof panel === "function") panel();
    });
  }
}

// ---------- worker attendance & payouts ----------
function logAttendance(wid, date, status, note = "", otHours = 0) {
  const existing = (S.attendance || []).find(at => at.wid == wid && at.date == date);
  const data = {
    wid,
    date,
    status,
    otHours: Number(otHours) || 0,
    note: Security.sanitize(note),
    recordedAt: Date.now()
  };
  let prom;
  if (existing) {
    prom = upd("attendance", existing.id, data);
  } else {
    prom = put("attendance", data);
  }
  return prom.then(id => {
    if (typeof Realtime !== "undefined") {
      Realtime.broadcast("ATTENDANCE_UPDATED", { wid, date, status, data });
    }
    if (typeof panel === "function" && S.tab === "Salary") panel();
    return id;
  });
}

function deleteAttendance(wid, date) {
  const existing = (S.attendance || []).find(at => at.wid == wid && at.date == date);
  if (existing) {
    del("attendance", existing.id);
    if (typeof Realtime !== "undefined") {
      Realtime.broadcast("ATTENDANCE_UPDATED", { wid, date, status: "Deleted" });
    }
    if (typeof panel === "function" && S.tab === "Salary") panel();
  }
}

// ---------- smart revenue analytics engine ----------
function getRevenueAnalytics(period = "7days") {
  const os = orders();
  const now = new Date();
  const todayStr = now.toDateString();
  const curMonthNum = now.getMonth();
  const curYearNum = now.getFullYear();

  // 1. Lifetime Totals
  const lifetimeRev = os.reduce((a, x) => a + (Number(x.total) || 0), 0);
  const totalPaidRev = os.filter(x => x.paid === "Paid").reduce((a, x) => a + (Number(x.total) || 0), 0);
  const totalClaimedRev = os.filter(x => x.paid === "Claimed").reduce((a, x) => a + (Number(x.total) || 0), 0);
  const totalUnpaidRev = os.filter(x => x.paid === "Unpaid" || !x.paid).reduce((a, x) => a + (Number(x.total) || 0), 0);

  // 2. Today's Revenue
  const todayOrders = os.filter(x => new Date(x.ts).toDateString() === todayStr);
  const todayRev = todayOrders.reduce((a, x) => a + (Number(x.total) || 0), 0);
  const todayPaidRev = todayOrders.filter(x => x.paid === "Paid").reduce((a, x) => a + (Number(x.total) || 0), 0);

  // 3. This Week's Revenue (Last 7 days)
  const oneWeekAgo = new Date(now.getTime() - 7 * 86400000);
  const weekOrders = os.filter(x => new Date(x.ts) >= oneWeekAgo);
  const weekRev = weekOrders.reduce((a, x) => a + (Number(x.total) || 0), 0);
  const weekPaidRev = weekOrders.filter(x => x.paid === "Paid").reduce((a, x) => a + (Number(x.total) || 0), 0);

  // 4. This Month's Revenue
  const monthOrders = os.filter(x => {
    const d = new Date(x.ts);
    return d.getMonth() === curMonthNum && d.getFullYear() === curYearNum;
  });
  const monthRev = monthOrders.reduce((a, x) => a + (Number(x.total) || 0), 0);
  const monthPaidRev = monthOrders.filter(x => x.paid === "Paid").reduce((a, x) => a + (Number(x.total) || 0), 0);

  // 5. Highest Revenue Day
  const dayMap = {};
  os.forEach(x => {
    const d = new Date(x.ts);
    const dStr = d.toISOString().slice(0, 10);
    dayMap[dStr] = (dayMap[dStr] || 0) + (Number(x.total) || 0);
  });
  let highestDay = { date: "No sales yet", amount: 0, dateFormatted: "N/A" };
  Object.entries(dayMap).forEach(([dt, amt]) => {
    if (amt > highestDay.amount) {
      const parts = dt.split("-");
      const dObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      highestDay = {
        date: dt,
        amount: amt,
        dateFormatted: dObj.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
      };
    }
  });

  // 6. Chart Series for requested period
  const series = [];
  let daysCount = 7;
  if (period === "30days") daysCount = 30;
  else if (period === "thisMonth") daysCount = Math.max(7, now.getDate());

  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const dtIso = d.toISOString().slice(0, 10);
    const dayName = d.toLocaleDateString("en-IN", { weekday: "short" });
    const dayNum = d.getDate();
    const dayOrders = os.filter(x => new Date(x.ts).toDateString() === d.toDateString());
    const dayRev = dayOrders.reduce((a, x) => a + (Number(x.total) || 0), 0);
    const dayPaidRev = dayOrders.filter(x => x.paid === "Paid").reduce((a, x) => a + (Number(x.total) || 0), 0);
    const isHighest = highestDay.amount > 0 && dayRev === highestDay.amount;

    series.push({
      iso: dtIso,
      label: daysCount <= 7 ? `${dayName} ${dayNum}` : `${dayNum}`,
      fullDate: d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
      amount: dayRev,
      paidAmount: dayPaidRev,
      ordersCount: dayOrders.length,
      isHighest
    });
  }
  const peakChartAmt = Math.max(1, ...series.map(s => s.amount));

  // 7. Segment Split: Stitching vs Readymade
  const stitchingRev = os.filter(x => x.type === "Stitch").reduce((a, x) => a + (Number(x.total) || 0), 0);
  const readymadeRev = os.filter(x => x.type !== "Stitch").reduce((a, x) => a + (Number(x.total) || 0), 0);

  // 8. Payment Modes
  const upiRev = os.filter(x => (x.pay || "").includes("UPI")).reduce((a, x) => a + (Number(x.total) || 0), 0);
  const cashRev = os.filter(x => (x.pay || "").toLowerCase().includes("cash") || (x.pay || "").toLowerCase().includes("shop")).reduce((a, x) => a + (Number(x.total) || 0), 0);
  const otherPayRev = Math.max(0, lifetimeRev - upiRev - cashRev);

  // 9. Popular Garments in Stitching
  const stitchGarmentCounts = {};
  os.filter(x => x.type === "Stitch").forEach(x => {
    const g = x.garment || "Custom Stitch";
    stitchGarmentCounts[g] = (stitchGarmentCounts[g] || 0) + 1;
  });
  const topGarments = Object.entries(stitchGarmentCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  return {
    lifetimeRev,
    totalPaidRev,
    totalClaimedRev,
    totalUnpaidRev,
    todayRev,
    todayPaidRev,
    todayOrders: todayOrders.length,
    weekRev,
    weekPaidRev,
    weekOrders: weekOrders.length,
    monthRev,
    monthPaidRev,
    monthOrders: monthOrders.length,
    highestDay,
    series,
    peakChartAmt,
    stitchingRev,
    readymadeRev,
    upiRev,
    cashRev,
    otherPayRev,
    topGarments,
    totalOrdersCount: os.length
  };
}

// ---------- smart artisan productivity & AI analytics ----------
function getArtisanProductivityAI() {
  const wrks = workers();
  const allOrders = orders();
  const allWork = S.work || [];
  const allAtt = S.attendance || [];
  const curMonthKey = curMon;

  const rankings = wrks.map(w => {
    const assignedOrders = allOrders.filter(o => o.type === "Stitch" && o.worker == w.id);
    const completedOrders = assignedOrders.filter(o => o.status === "Ready" || o.status === "Delivered");
    const inProgressOrders = assignedOrders.filter(o => !["Ready", "Delivered", "Cancelled"].includes(o.status));

    let totalSpeedHours = 0;
    let timedCount = 0;
    completedOrders.forEach(o => {
      const finishTime = o.readyAt || o.deliveredAt;
      if (finishTime && finishTime > o.ts) {
        totalSpeedHours += (finishTime - o.ts) / (1000 * 3600);
        timedCount++;
      }
    });
    const avgTurnaroundDays = timedCount > 0 ? (totalSpeedHours / timedCount / 24).toFixed(1) : "1.8";

    const monthlyPieces = allWork
      .filter(wk => wk.wk == w.id && monKey(wk.ts) == curMonthKey)
      .reduce((a, b) => a + (Number(b.qty) || 0), 0) || completedOrders.length;

    const workerAtt = allAtt.filter(a => a.wid == w.id && String(a.date).startsWith(curMonthKey));
    const presentDays = workerAtt.filter(a => a.status === "Present").length;
    const halfDays = workerAtt.filter(a => a.status === "Half-Day").length;
    const leaveDays = workerAtt.filter(a => a.status === "Leave" || a.status === "Absent").length;
    const otShifts = workerAtt.filter(a => a.status === "Overtime" || (a.otHours && a.otHours > 0)).length;
    const workingDaysCount = Math.max(1, new Date().getDate());
    const attendancePct = Math.min(100, Math.round(((presentDays + halfDays * 0.5 + otShifts) / workingDaysCount) * 100));

    const productivityScore = Math.min(100, Math.round(
      (monthlyPieces * 12) + (attendancePct * 0.35) + (timedCount > 0 ? Math.max(0, 30 - parseFloat(avgTurnaroundDays) * 5) : 20)
    ));

    return {
      worker: w,
      completedCount: completedOrders.length,
      inProgressCount: inProgressOrders.length,
      monthlyPieces,
      avgTurnaroundDays,
      presentDays,
      halfDays,
      leaveDays,
      otShifts,
      attendancePct,
      productivityScore,
      role: w.role || "Artisan Tailor"
    };
  });

  rankings.sort((a, b) => b.productivityScore - a.productivityScore);

  const topArtisan = rankings[0] || null;
  const fastestWorker = rankings.slice().sort((a, b) => parseFloat(a.avgTurnaroundDays) - parseFloat(b.avgTurnaroundDays))[0] || null;
  const mostReliable = rankings.slice().sort((a, b) => b.attendancePct - a.attendancePct)[0] || null;

  // AI Workload Balancer & Capacity recommendations
  let workloadRecommendation = "Artisan workloads are currently balanced across the atelier.";
  const overloaded = rankings.filter(r => r.inProgressCount >= 3);
  const available = rankings.filter(r => r.inProgressCount <= 1);
  if (overloaded.length > 0 && available.length > 0) {
    workloadRecommendation = `⚡ <b>AI Workload Alert:</b> <b>${Security.escapeHTML(overloaded[0].worker.name)}</b> has <b>${overloaded[0].inProgressCount} active stitching orders</b>. Route incoming custom orders to <b>${Security.escapeHTML(available[0].worker.name)}</b> (${available[0].inProgressCount} active) for quickest turnaround!`;
  } else if (overloaded.length > 0) {
    workloadRecommendation = `⚡ <b>High Boutique Demand:</b> ${overloaded.map(o => `<b>${Security.escapeHTML(o.worker.name)}</b> (${o.inProgressCount} jobs)`).join(", ")} are near capacity. Prioritize pending trials before urgent deliveries.`;
  } else if (topArtisan) {
    workloadRecommendation = `🏆 <b>Atelier Performance:</b> <b>${Security.escapeHTML(topArtisan.worker.name)}</b> is leading the team with a productivity score of <b>${topArtisan.productivityScore}/100</b> and <b>${topArtisan.avgTurnaroundDays} days</b> avg completion speed!`;
  }

  return {
    rankings,
    topArtisan,
    fastestWorker,
    mostReliable,
    workloadRecommendation
  };
}

function recordSalaryPayout(wid, amount, mode = "Cash", note = "") {
  const w = workers().find(x => x.id == wid);
  const data = {
    wid,
    workerName: w ? w.name : "Worker",
    amount: Math.max(0, Number(amount) || 0),
    date: Date.now(),
    mode,
    note: Security.sanitize(note)
  };
  return put("payouts", data);
}

// ---------- export & import system ----------
function exportDatabaseJSON() {
  const backup = {
    version: "2.1",
    exportDate: new Date().toISOString(),
    config: S.cfg,
    products: S.prod,
    orders: S.orders,
    customers: S.customers,
    coupons: S.coupons,
    workers: S.workers,
    work: S.work,
    payouts: S.payouts,
    attendance: S.attendance,
    team: S.team
  };
  const str = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup, null, 2));
  const a = document.createElement("a");
  a.setAttribute("href", str);
  a.setAttribute("download", `saifa_backup_${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function importDatabaseJSON(jsonStr) {
  try {
    const data = JSON.parse(jsonStr);
    if (!data || typeof data !== "object") throw new Error("Invalid format");

    if (data.config) S.cfg = { ...DEF, ...data.config };
    if (Array.isArray(data.products)) S.prod = data.products;
    if (Array.isArray(data.orders)) S.orders = data.orders;
    if (Array.isArray(data.customers)) S.customers = data.customers;
    if (Array.isArray(data.coupons)) S.coupons = data.coupons;
    if (Array.isArray(data.workers)) S.workers = data.workers;
    if (Array.isArray(data.work)) S.work = data.work;
    if (Array.isArray(data.payouts)) S.payouts = data.payouts;
    if (Array.isArray(data.attendance)) S.attendance = data.attendance;
    if (Array.isArray(data.team)) S.team = data.team;

    ["prod", "orders", "customers", "coupons", "workers", "work", "payouts", "attendance", "team", "cfg"].forEach(k => {
      saveLS(k, S[k]);
    });

    if (typeof Realtime !== "undefined") {
      Realtime.broadcast("DATABASE_RESTORED", { time: Date.now() });
    }

    if (typeof toast === "function") toast("Database successfully imported and restored! ✅");
    if (typeof refresh === "function") refresh();
    return true;
  } catch (e) {
    if (typeof toast === "function") toast("Error restoring backup: Invalid JSON file");
    return false;
  }
}

function exportOrdersCSV() {
  const os = orders();
  const headers = ["Order No", "Date", "Customer", "Phone", "Customer ID", "Type", "Garment/Items", "Total (INR)", "Payment Mode", "Payment Status", "Order Status"];
  const rows = os.map(o => [
    o.no,
    new Date(o.ts).toLocaleDateString("en-IN"),
    `"${(o.customer || "").replace(/"/g, '""')}"`,
    o.phone,
    o.cid,
    o.type,
    `"${(o.type == 'Stitch' ? o.garment : (o.items || []).map(i => i.n + 'x' + i.q).join(', ')).replace(/"/g, '""')}"`,
    o.total,
    o.pay,
    o.paid,
    o.status
  ]);
  const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
  const a = document.createElement("a");
  a.setAttribute("href", encodeURI(csvContent));
  a.setAttribute("download", `saifa_orders_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function exportCustomersCSV() {
  const cs = custs();
  const headers = ["Customer ID", "Name", "Phone", "Address", "Total Orders", "Last Active"];
  const rows = cs.map(c => [
    c.cid,
    `"${(c.name || "").replace(/"/g, '""')}"`,
    c.phone,
    `"${(c.address || "").replace(/"/g, '""')}"`,
    orders().filter(o => np(o.phone) === np(c.phone)).length,
    new Date(c.created || Date.now()).toLocaleDateString("en-IN")
  ]);
  const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
  const a = document.createElement("a");
  a.setAttribute("href", encodeURI(csvContent));
  a.setAttribute("download", `saifa_customers_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(a);
  a.click();
  a.remove();
}
