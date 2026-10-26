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
    if (data === null || data === undefined) {
      localStorage.removeItem("saifa_" + key);
    } else {
      localStorage.setItem("saifa_" + key, JSON.stringify(data));
    }
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
  reviews: loadLS("reviews", []),
  cfg: loadLS("cfg", JSON.parse(JSON.stringify(DEF))),
  cart: loadLS("cart", []),
  appliedCoupon: null,
  cat: "All",
  me: loadLS("me", null),
  tab: "Dashboard",
  sfilter: "All",
  ofilter: "All",
  cq: "",
  teamEdit: null,
  workerEdit: null,
  selectedWorkerSalary: "all",
  navCollapsed: false
};

// Clean out any legacy seed data from previous sessions if present
if (Array.isArray(S.workers) && S.workers.some(w => w.id === "w1" || w.id === "w2")) {
  S.workers = [];
  saveLS("workers", []);
}
if (Array.isArray(S.team) && S.team.some(t => t.id === "t1" || t.id === "t2")) {
  S.team = [];
  saveLS("team", []);
}
if (Array.isArray(S.coupons) && S.coupons.some(c => c.id === "cp1" || c.id === "cp2")) {
  S.coupons = [];
  saveLS("coupons", []);
}
if (Array.isArray(S.orders) && S.orders.some(o => o.id === "ord_demo_1" || o.id === "ord_sample_1")) {
  S.orders = [];
  saveLS("orders", []);
}

let db = null;
let sample = null;

// Ensure dynamic categories, subcategories & measurements exist in S.cfg
if (!S.cfg) S.cfg = JSON.parse(JSON.stringify(DEF));
if (!Array.isArray(S.cfg.materialSubcats) || !S.cfg.materialSubcats.length) {
  S.cfg.materialSubcats = (typeof DEF !== "undefined" && DEF.materialSubcats) ? [...DEF.materialSubcats] : ["Pure Silk & Banarasi", "Flowy Georgette & Chiffon", "Breathable Cotton & Linen", "Embroidered Organza & Net"];
}
if (!Array.isArray(S.cfg.readymadeSubcats) || !S.cfg.readymadeSubcats.length) {
  S.cfg.readymadeSubcats = (typeof DEF !== "undefined" && DEF.readymadeSubcats) ? [...DEF.readymadeSubcats] : ["Bridal & Party Lehengas", "Designer Salwar Suits", "Anarkalis & Kurtis", "Pre-pleated Ready Sarees", "Readymade Padded Blouses"];
}
if (!Array.isArray(S.cfg.measurements) || !S.cfg.measurements.length) {
  S.cfg.measurements = (typeof DEF !== "undefined" && DEF.measurements) ? [...DEF.measurements] : ["Bust", "Waist", "Hip", "Length", "Shoulder", "Sleeve"];
}
if (!S.cfg.prices) S.cfg.prices = (typeof DEF !== "undefined" && DEF.prices) ? { ...DEF.prices } : {};
if (!S.cfg.pay) S.cfg.pay = (typeof DEF !== "undefined" && DEF.pay) ? { ...DEF.pay } : {};

// Migrate legacy "Gown / Anarkali" key to "Gown & Anarkali" for Firebase key safety
if (S.cfg.prices && S.cfg.prices["Gown / Anarkali"]) {
  S.cfg.prices["Gown & Anarkali"] = S.cfg.prices["Gown / Anarkali"];
  delete S.cfg.prices["Gown / Anarkali"];
  saveLS("cfg", S.cfg);
}
if (S.cfg.pay && S.cfg.pay["Gown / Anarkali"]) {
  S.cfg.pay["Gown & Anarkali"] = S.cfg.pay["Gown / Anarkali"];
  delete S.cfg.pay["Gown / Anarkali"];
  saveLS("cfg", S.cfg);
}

// Ensure Readymade products in local state have valid sizeStock
if (Array.isArray(S.prod)) {
  const predefinedSizes = (typeof READYMADE_SIZES !== "undefined" && Array.isArray(READYMADE_SIZES)) 
    ? READYMADE_SIZES 
    : ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];
  let modified = false;
  S.prod.forEach(p => {
    if (p.cat === "Readymade" && (!p.sizeStock || typeof p.sizeStock !== "object")) {
      p.sizeStock = {};
      predefinedSizes.forEach(sz => {
        if (Array.isArray(p.variants) && p.variants.length > 0) {
          const matching = p.variants.filter(v => String(v.size || '').trim().toUpperCase() === sz);
          p.sizeStock[sz] = matching.reduce((acc, curr) => acc + (Math.max(0, Number(curr.stock)) || 0), 0);
        } else {
          p.sizeStock[sz] = (p.sizes || '').toUpperCase().includes(sz) ? Math.max(0, Math.floor((Number(p.stock) || 0) / 3)) : 0;
        }
      });
      const sum = Object.values(p.sizeStock).reduce((a, b) => a + Number(b), 0);
      if (sum > 0) p.stock = sum;
      modified = true;
    }
  });
  if (modified) saveLS("prod", S.prod);
}


// Global Phone Formatting & Internationalization Helpers
function formatPhone(ph) {
  const raw = String(ph || "").replace(/\D/g, "");
  if (raw.length === 10) return `+91 ${raw.slice(0, 5)} ${raw.slice(5)}`;
  if (raw.length === 12 && raw.startsWith("91")) return `+91 ${raw.slice(2, 7)} ${raw.slice(7)}`;
  return ph ? (String(ph).startsWith("+") ? ph : `+${ph}`) : "+91 99999 99999";
}

function getIntlPhone(ph) {
  const raw = String(ph || "").replace(/\D/g, "");
  if (raw.length === 10) return "91" + raw;
  return raw || "919999999999";
}

// Firebase RTDB Key Sanitizer (replaces illegal characters . # $ / [ ])
function sanitizeFirebaseData(data) {
  if (data === null || data === undefined) return null;
  if (typeof data !== "object") return data;
  if (Array.isArray(data)) return data.map(sanitizeFirebaseData);
  const out = {};
  for (const key of Object.keys(data)) {
    const safeKey = key.replace(/[.#$\/\[\]]/g, "_");
    out[safeKey] = sanitizeFirebaseData(data[key]);
  }
  return out;
}

// Dynamic Category, Subcategory, Garment and Measurement helpers
function getMeasurements() {
  if (S.cfg && Array.isArray(S.cfg.measurements) && S.cfg.measurements.length > 0) {
    return S.cfg.measurements;
  }
  return typeof DEF !== "undefined" && DEF.measurements ? DEF.measurements : ["Bust", "Waist", "Hip", "Length", "Shoulder", "Sleeve"];
}

function getMaterialSubcats() {
  if (S.cfg && Array.isArray(S.cfg.materialSubcats) && S.cfg.materialSubcats.length > 0) {
    return S.cfg.materialSubcats;
  }
  return typeof DEF !== "undefined" && DEF.materialSubcats ? DEF.materialSubcats : ["Pure Silk & Banarasi", "Flowy Georgette & Chiffon", "Breathable Cotton & Linen", "Embroidered Organza & Net"];
}

function getReadymadeSubcats() {
  if (S.cfg && Array.isArray(S.cfg.readymadeSubcats) && S.cfg.readymadeSubcats.length > 0) {
    return S.cfg.readymadeSubcats;
  }
  return typeof DEF !== "undefined" && DEF.readymadeSubcats ? DEF.readymadeSubcats : ["Bridal & Party Lehengas", "Designer Salwar Suits", "Anarkalis & Kurtis", "Pre-pleated Ready Sarees", "Readymade Padded Blouses"];
}

function getGarmentTypes() {
  if (S.cfg && S.cfg.prices && Object.keys(S.cfg.prices).length > 0) {
    return Object.keys(S.cfg.prices);
  }
  return typeof DEF !== "undefined" && DEF.prices ? Object.keys(DEF.prices) : ["Blouse", "Salwar Suit", "Lehenga", "Gown & Anarkali", "Kurti", "Saree Fall & Pico", "Alteration"];
}

function getGarmentPrice(garment) {
  if (S.cfg && S.cfg.prices && S.cfg.prices[garment] !== undefined) {
    return Number(S.cfg.prices[garment]) || 0;
  }
  if (typeof DEF !== "undefined" && DEF.prices && DEF.prices[garment] !== undefined) {
    return Number(DEF.prices[garment]) || 0;
  }
  return 350;
}

function getGarmentPay(garment) {
  if (S.cfg && S.cfg.pay && S.cfg.pay[garment] !== undefined) {
    return Number(S.cfg.pay[garment]) || 0;
  }
  if (typeof DEF !== "undefined" && DEF.pay && DEF.pay[garment] !== undefined) {
    return Number(DEF.pay[garment]) || 0;
  }
  return 120;
}

// Selectors
const products = () => (Array.isArray(S.prod) ? S.prod : SEED_PROD);
const team = () => (Array.isArray(S.team) ? S.team.slice().sort((a, b) => (a.ord || 0) - (b.ord || 0)) : []);
const orders = () => (Array.isArray(S.orders) ? S.orders : []);
const custs = () => S.customers || [];
const workers = () => (Array.isArray(S.workers) ? S.workers : []);
const coupons = () => (Array.isArray(S.coupons) ? S.coupons : []);
const reviews = () => (Array.isArray(S.reviews) ? S.reviews : []);

// Customer Ratings & Boutique Trust Score Analytics
function getShopRatingStats() {
  const allReviews = reviews().filter(r => r.status !== "Hidden");
  const total = allReviews.length;
  if (!total) {
    return {
      average: 5.0,
      averageFormatted: "5.0",
      totalCount: 0,
      stars: 5,
      breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    };
  }
  const sum = allReviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0);
  const avg = Math.round((sum / total) * 10) / 10;
  const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  allReviews.forEach(r => {
    const star = Math.min(5, Math.max(1, Math.round(Number(r.rating) || 5)));
    breakdown[star] = (breakdown[star] || 0) + 1;
  });
  return {
    average: avg,
    averageFormatted: avg.toFixed(1),
    totalCount: total,
    stars: Math.round(avg),
    breakdown
  };
}

// ------------------------------------------
// Genuine Customer Analytics & Order-Linked Reviews
// ------------------------------------------
function getGenuineCustomerStats() {
  const os = orders();
  const qualifyingOrders = os.filter(o => o.status === "Delivered" || o.paid === "Paid");
  const uniquePhones = new Set();
  const phoneOrderCounts = {};

  qualifyingOrders.forEach(o => {
    const clean = np(o.phone);
    if (clean && clean.length === 10) {
      uniquePhones.add(clean);
      phoneOrderCounts[clean] = (phoneOrderCounts[clean] || 0) + 1;
    }
  });

  const totalRegistered = (S.customers || []).length;
  const qualifyingBuyersCount = uniquePhones.size;
  const repeatBuyersCount = Object.values(phoneOrderCounts).filter(cnt => cnt >= 2).length;
  const retentionRate = qualifyingBuyersCount > 0 ? Math.round((repeatBuyersCount / qualifyingBuyersCount) * 100) : 0;

  return {
    totalRegistered,
    qualifyingBuyersCount,
    repeatBuyersCount,
    retentionRate,
    totalGenuineCustomers: qualifyingBuyersCount > 0 ? qualifyingBuyersCount : totalRegistered,
    displayCount: qualifyingBuyersCount > 0 ? qualifyingBuyersCount : totalRegistered
  };
}

function getEligibleOrdersForReview(phone) {
  const clean = np(phone);
  if (!clean || clean.length !== 10) return [];
  const os = orders();
  const revs = reviews();

  const eligible = os.filter(o => {
    const matchPhone = np(o.phone) === clean;
    const isQualifying = o.paid === "Paid" || o.status === "Delivered";
    const notCancelled = o.status !== "Cancelled";
    return matchPhone && isQualifying && notCancelled;
  });

  return eligible.map(o => {
    const existingRev = revs.find(r => r.orderId === o.id || (r.orderNo && r.orderNo === o.no));
    const itemsSummary = o.type === "Stitch" 
      ? (o.garment || "Bespoke Custom Stitching") 
      : (Array.isArray(o.items) ? o.items.map(i => `${i.n} (${i.size || 'Std'})`).join(", ") : "Boutique Collection");

    return {
      id: o.id,
      no: o.no,
      type: o.type,
      garment: o.garment,
      itemsSummary,
      total: o.total,
      paid: o.paid,
      status: o.status,
      date: o.ts,
      dateFormatted: new Date(o.ts).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
      isReviewed: Boolean(existingRev),
      reviewId: existingRev ? existingRev.id : null,
      existingRating: existingRev ? existingRev.rating : null,
      existingReviewText: existingRev ? existingRev.review : ""
    };
  });
}

function submitOrderVerifiedReview(orderId, phone, name, rating, comment, service = "Bespoke Stitching") {
  const cleanPhone = np(phone);
  const o = orders().find(x => x.id === orderId || x.no === orderId);
  if (!o) {
    return Promise.resolve({ success: false, message: "Order not found. Reviews require a valid boutique purchase." });
  }
  if (np(o.phone) !== cleanPhone) {
    return Promise.resolve({ success: false, message: "Mobile number does not match this order's registered client." });
  }
  if (o.paid !== "Paid" && o.status !== "Delivered") {
    return Promise.resolve({ success: false, message: "Reviews are eligible only for paid or delivered orders." });
  }

  const existing = reviews().find(r => r.orderId === o.id || (r.orderNo && r.orderNo === o.no));

  const fraudAnalysis = typeof AI !== "undefined" && typeof AI.analyzeReviewFraud === "function"
    ? AI.analyzeReviewFraud(comment, rating, o, { phone: cleanPhone, name })
    : { fraudScore: 5, fraudFlags: [], recommendation: "Approved" };

  const reviewRecord = {
    id: existing ? existing.id : ("rev_" + uid()),
    orderId: o.id,
    orderNo: o.no,
    verifiedPurchase: true,
    name: Security.sanitize(name || o.customer || "Valued Client"),
    phone: cleanPhone,
    rating: Math.min(5, Math.max(1, Number(rating) || 5)),
    service: Security.sanitize(service || (o.type === 'Stitch' ? o.garment : 'Readymade Wear')),
    review: Security.sanitize(comment || ""),
    status: fraudAnalysis.fraudScore >= 60 ? "Flagged" : (existing ? existing.status : "Approved"),
    fraudScore: fraudAnalysis.fraudScore || 0,
    fraudFlags: fraudAnalysis.fraudFlags || [],
    fraudReason: fraudAnalysis.reason || "Verified purchase match",
    createdAt: existing ? (existing.createdAt || Date.now()) : Date.now(),
    updatedAt: Date.now()
  };

  return put("reviews", reviewRecord, reviewRecord.id).then(() => {
    if (typeof Realtime !== "undefined" && Realtime.broadcast) {
      Realtime.broadcast(existing ? "REVIEW_UPDATED" : "REVIEW_SUBMITTED", reviewRecord);
    }
    return {
      success: true,
      review: reviewRecord,
      isUpdate: Boolean(existing),
      message: existing 
        ? `Your review for Order #${o.no} was updated successfully! 🔄` 
        : `Thank you ${reviewRecord.name}! Your verified ${reviewRecord.rating}★ rating has been recorded ⭐`
    };
  });
}

function moderateReview(reviewId, newStatus, adminNote = "") {
  const r = reviews().find(x => x.id === reviewId);
  if (!r) return Promise.resolve();
  const patch = { 
    status: newStatus,
    moderatedAt: Date.now(),
    moderatedBy: S.me?.name || "Admin Atelier",
    moderationNote: adminNote || `Status set to ${newStatus}`
  };
  return upd("reviews", reviewId, patch);
}

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

  const attLog = (S.attendance || []).filter(at => at.wid == wid && String(at.date).startsWith(monthKey));
  const daysPresent = attLog.filter(at => at.status == "Present").length;
  const daysHalf = attLog.filter(at => at.status == "Half-Day").length;
  const daysLeave = attLog.filter(at => at.status == "Leave" || at.status == "Absent").length;
  const daysWeeklyOff = attLog.filter(at => at.status == "Weekly Off").length;
  const totalOtHours = attLog.reduce((a, at) => a + (Number(at.otHours) || 0), 0);
  const otEarnings = totalOtHours * 50; // Standard boutique overtime allowance ₹50/hr

  const grossEarned = totalEarned + otEarnings;
  const pendingBalance = grossEarned - totalPaid;

  const allPayouts = (S.payouts || []).filter(p => p.wid == wid);
  const allTimePaid = allPayouts.reduce((a, p) => a + (Number(p.amount) || 0), 0);
  const allVerifiedWork = (S.work || []).filter(w => w.wk == wid && w.verified !== false);
  const allTimeEarned = allVerifiedWork.reduce((a, w) => a + (Number(w.qty) || 0) * (Number(w.rate) || 0), 0);
  const allTimePendingBalance = allTimeEarned - allTimePaid;

  return {
    totalPieces,
    totalEarned,
    otEarnings,
    grossEarned,
    totalOtHours,
    pendingPieces,
    pendingEarned,
    totalPaid,
    pendingBalance,
    allTimeEarned,
    allTimePaid,
    allTimePendingBalance,
    daysPresent,
    daysHalf,
    daysLeave,
    daysWeeklyOff,
    payoutLog,
    piecesLog,
    verifiedPiecesLog,
    pendingPiecesLog,
    attLog
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
  saveCfg();
  if (typeof Realtime !== "undefined") {
    Realtime.broadcast("SHOP_STATUS_CHANGED", { status: newStatus });
  }
  toast(`Shop status updated to "${newStatus}" 🏪`);
  if (typeof panel === "function" && S.tab && S.me && S.me.role === "admin" && $("pn")?.classList.contains("on")) panel();
  if (typeof renderFront === "function") renderFront();
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

        const collections = ["prod", "orders", "customers", "team", "workers", "work", "coupons", "payouts", "attendance", "reviews"];
        collections.forEach(col => {
          rtdb.ref(col).on("value", snapshot => {
            const val = snapshot.val();
            const stateKey = (col === "products" || col === "prod") ? "prod" : col;
            if (val && typeof val === "object" && Object.keys(val).length > 0) {
              const mapped = Array.isArray(val) ? val.filter(Boolean) : Object.keys(val).map(k => ({ ...val[k], id: val[k].id || k }));
              S[stateKey] = mapped;
              saveLS(stateKey, mapped);
            } else {
              // Cloud collection is completely empty or all records deleted
              S[stateKey] = [];
              saveLS(stateKey, []);
            }
            if (typeof refresh === "function") refresh();
            if (typeof panel === "function" && S.tab && S.me && S.me.role === "admin" && $("pn")?.classList.contains("on")) panel();
            if (typeof renderFront === "function") renderFront();
          });
        });

        rtdb.ref("config/main").on("value", snapshot => {
          const val = snapshot.val();
          if (val) {
            S.cfg = { ...DEF, ...val };
            saveLS("cfg", S.cfg);
            if (typeof refresh === "function") refresh();
          } else {
            const cleanCfg = typeof sanitizeFirebaseData === "function" ? sanitizeFirebaseData(S.cfg || DEF) : (S.cfg || DEF);
            rtdb.ref("config/main").set(cleanCfg).catch(err => console.warn("Firebase RTDB config seed error:", err));
          }
        }, err => {
          console.warn("Firebase RTDB config read notice:", err);
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

        ["products", "orders", "customers", "team", "workers", "work", "coupons", "payouts", "attendance", "reviews"].forEach(col => {
          fstore.collection(col).onSnapshot(sn => {
            const mapped = sn.docs.map(d => ({ ...d.data(), id: d.id }));
            const stateKey = (col === "products" || col === "prod") ? "prod" : col;
            S[stateKey] = mapped;
            saveLS(stateKey, mapped);
            if (typeof refresh === "function") refresh();
            if (typeof panel === "function" && S.tab && S.me && S.me.role === "admin" && $("pn")?.classList.contains("on")) panel();
            if (typeof renderFront === "function") renderFront();
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
    const cleanRow = typeof sanitizeFirebaseData === "function" ? sanitizeFirebaseData(row) : row;
    window._rtdb.ref(stateKey + "/" + id).set(cleanRow).catch(err => console.warn("RTDB put error:", err));
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
    const cleanPatch = typeof sanitizeFirebaseData === "function" ? sanitizeFirebaseData(patch) : patch;
    window._rtdb.ref(stateKey + "/" + id).update(cleanPatch).catch(err => console.warn("RTDB upd error:", err));
  }

  // Cloud Firestore Sync
  if (db && db.collection) {
    return db.collection(col).doc(id).update(patch).catch(() => {});
  }

  return Promise.resolve();
}

async function del(col, id) {
  const stateKey = (col === "products" || col === "prod") ? "prod" : col;
  const deletedItem = (S[stateKey] || []).find(x => String(x.id) === String(id));
  S[stateKey] = (S[stateKey] || []).filter(x => String(x.id) !== String(id));
  saveLS(stateKey, S[stateKey]);

  if (col === "coupons") {
    if (deletedItem && deletedItem.isBanner) {
      S.cfg.offerBanner = "";
      saveLS("cfg", S.cfg);
    }
    if (S.appliedCoupon && String(S.appliedCoupon.id) === String(id)) {
      S.appliedCoupon = null;
    }
  }

  // Restore inventory stock when an order is deleted
  if (col === "orders" && deletedItem && !deletedItem.stockRestored && Array.isArray(deletedItem.items)) {
    const restoredCount = (typeof restoreOrderStock === "function") ? restoreOrderStock(deletedItem) : 0;
    if (typeof toast === "function" && restoredCount > 0) {
      toast(`Order deleted & ${restoredCount} item(s) restored to inventory stock 📦`);
    }
  }

  if (typeof Realtime !== "undefined") {
    Realtime.broadcast("RECORD_DELETED", { col, id });
    if (col === "coupons") {
      Realtime.broadcast("COUPON_UPDATED", S.coupons);
    } else if (col === "products" || col === "prod") {
      Realtime.broadcast("PRODUCT_UPDATED", S.prod);
    } else if (col === "orders") {
      Realtime.broadcast("ORDER_UPDATED", { id, status: "Deleted" });
    } else if (col === "reviews") {
      Realtime.broadcast("REVIEW_DELETED", { id });
    } else if (col === "customers") {
      Realtime.broadcast("CUSTOMER_UPDATED", S.customers);
    } else if (col === "workers") {
      Realtime.broadcast("WORKER_UPDATED", S.workers);
    } else if (col === "team") {
      Realtime.broadcast("TEAM_UPDATED", S.team);
    }
  }

  if (typeof panel === "function" && S.tab && S.me && S.me.role === "admin" && $("pn")?.classList.contains("on")) panel();
  if (typeof renderFront === "function") renderFront();
  if (typeof refresh === "function") refresh();

  const syncPromises = [];

  // Cloud Realtime Database Sync
  if (window._rtdb) {
    const rtdbKey = (col === "products" || col === "prod") ? "prod" : col;
    syncPromises.push(window._rtdb.ref(rtdbKey + "/" + id).remove().catch(err => {
      console.warn("RTDB delete notice:", err);
    }));
  }

  // Cloud Firestore Sync
  if (db && db.collection) {
    const fstoreCol = (col === "prod" || col === "products") ? "products" : col;
    syncPromises.push(db.collection(fstoreCol).doc(String(id)).delete().catch(err => {
      console.warn("Firestore delete notice:", err);
    }));
  }

  await Promise.all(syncPromises);
  return true;
}

function saveCfg() {
  saveLS("cfg", S.cfg);
  if (typeof Realtime !== "undefined") {
    Realtime.broadcast("SETTINGS_UPDATED", S.cfg);
  }

  // Cloud Realtime Database Sync across all devices
  if (window._rtdb) {
    const cleanCfg = typeof sanitizeFirebaseData === "function" ? sanitizeFirebaseData(S.cfg) : S.cfg;
    window._rtdb.ref("config/main").set(cleanCfg).catch(err => console.warn("RTDB config sync:", err));
  }

  // Cloud Firestore Sync across all devices
  if (db && db.collection) {
    db.collection("config").doc("main").set(S.cfg).catch(err => console.warn("Firestore config sync:", err));
  }

  if (typeof refresh === "function") refresh();
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
      worker: o.worker || null,
      customer: Security.sanitize(o.customer),
      address: Security.sanitize(o.address),
      cid,
      no,
      ts: Date.now(),
      status: o.status || "New",
      paid: o.paid || "Unpaid",
      phone: np(o.phone),
      coupon: S.appliedCoupon ? S.appliedCoupon.code : null,
      discount: S.appliedCoupon ? S.appliedCoupon.discount : 0,
      history: [
        { status: o.status || "New", at: Date.now(), note: "Order placed" }
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

  // Stock restoration on order cancellation
  if (newStatus === "Cancelled" && !o.stockRestored && Array.isArray(o.items) && o.items.length > 0) {
    const restoredCount = (typeof restoreOrderStock === "function") ? restoreOrderStock(o) : 0;
    patch.stockRestored = true;
    if (typeof toast === "function") toast(`Order marked Cancelled & ${restoredCount} item(s) restored to stock 📦`);
  } else if (newStatus !== "Cancelled" && o.stockRestored && Array.isArray(o.items) && o.items.length > 0) {
    // If status reverted from Cancelled back to an active status, deduct stock again
    if (typeof reDeductOrderStock === "function") {
      reDeductOrderStock(o);
    }
    patch.stockRestored = false;
  }

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
    by: S.me?.name || "Admin Atelier",
    note: note || `Advanced to ${stageName}`
  });

  const patch = { 
    stage: stageName,
    currentStage: stageName, 
    progressStages: stageLog,
    stageNote: note || o.stageNote || ""
  };

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
  if (typeof panel === "function" && S.tab && S.me && S.me.role === "admin" && $("pn")?.classList.contains("on")) panel();
  if (typeof renderFront === "function") renderFront();
}

function upiLink(amt, note) {
  const c = S.cfg;
  return `upi://pay?pa=${encodeURIComponent(c.upi)}&pn=${encodeURIComponent(c.payee)}&am=${Number(amt).toFixed(2)}&cu=INR&tn=${encodeURIComponent(note)}`;
}

// Generates an automated WhatsApp link for sharing order details with admin
function getAdminWhatsAppOrderLink(o) {
  const c = S.cfg;
  const adminPhone = typeof getIntlPhone === "function" ? getIntlPhone(c.shopPhone) : (c.shopPhone || "919999999999");
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

  return `https://wa.me/${adminPhone}?text=${encodeURIComponent(msg)}`;
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
  if (typeof panel === "function" && S.me && S.me.role === "admin" && $("pn")?.classList.contains("on")) panel();
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
      if (typeof panel === "function" && S.me && S.me.role === "admin" && $("pn")?.classList.contains("on")) panel();
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
    if (typeof panel === "function" && S.tab === "Salary" && S.me && S.me.role === "admin" && $("pn")?.classList.contains("on")) panel();
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
    if (typeof panel === "function" && S.tab === "Salary" && S.me && S.me.role === "admin" && $("pn")?.classList.contains("on")) panel();
  }
}

// ------------------------------------------
// ------------------------------------------
// Product Size, Colour & Variant-Level Inventory Engine
// ------------------------------------------

function getProductSizeStock(product, sizeName = "", colorName = "") {
  if (!product) return 0;
  // If product is Material category (ordinary fabrics), return total stock directly
  if (product.cat === "Material") {
    return Math.max(0, Number(product.stock) || 0);
  }

  const sNorm = (sizeName || "").trim().toUpperCase();
  const cNorm = (colorName || "").trim().toLowerCase();

  // 1. If variants are defined, check for specific size & color match first
  if (Array.isArray(product.variants) && product.variants.length > 0) {
    if (sNorm && cNorm) {
      const match = product.variants.find(v => 
        String(v.size || "").trim().toUpperCase() === sNorm &&
        String(v.color || "").trim().toLowerCase() === cNorm
      );
      if (match) return Math.max(0, Number(match.stock) || 0);
    }
    if (sNorm) {
      const matchSizes = product.variants.filter(v => String(v.size || "").trim().toUpperCase() === sNorm);
      if (matchSizes.length > 0) {
        return matchSizes.reduce((acc, curr) => acc + (Math.max(0, Number(curr.stock)) || 0), 0);
      }
    }
  }

  // 2. Next check sizeStock dictionary
  if (product.sizeStock && typeof product.sizeStock === "object") {
    if (sNorm) {
      const key = Object.keys(product.sizeStock).find(k => k.trim().toUpperCase() === sNorm);
      if (key && product.sizeStock[key] !== undefined) {
        return Math.max(0, Number(product.sizeStock[key]) || 0);
      }
    }
  }

  // 3. Fallback to product.stock if no size specified or product lacks sizeStock
  return Math.max(0, Number(product.stock) || 0);
}

function ensureProductVariants(product) {
  if (!product) return [];
  if (Array.isArray(product.variants) && product.variants.length > 0) {
    return product.variants;
  }

  if (product.cat === "Readymade") {
    const predefinedSizes = (typeof READYMADE_SIZES !== "undefined" && Array.isArray(READYMADE_SIZES)) 
      ? READYMADE_SIZES 
      : ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];
    const sizeStock = product.sizeStock || {};
    const colors = (product.colors || "Standard").split(",").map(c => c.trim()).filter(Boolean);
    const variants = [];

    predefinedSizes.forEach(sz => {
      const szStock = (sizeStock[sz] !== undefined) ? (Math.max(0, Number(sizeStock[sz])) || 0) : 0;
      const count = Math.max(1, colors.length);
      const perCol = Math.floor(szStock / count);
      let rem = szStock;

      colors.forEach((col, cIdx) => {
        const isLast = (cIdx === colors.length - 1);
        const stockVal = isLast ? rem : perCol;
        rem -= stockVal;
        const skuSuffix = (sz + "-" + col.slice(0, 3)).toUpperCase().replace(/[^A-Z0-9-]/g, "");
        variants.push({
          id: `var_${product.id || 'prd'}_${sz}_${cIdx}`,
          sku: `SD-${(product.id || "PRD").toUpperCase()}-${skuSuffix}`,
          size: sz,
          color: col,
          stock: stockVal,
          reserved: 0,
          reorderThreshold: 3,
          price: product.price || 0
        });
      });
    });

    product.variants = variants;
    if (!product.sizeStock) {
      product.sizeStock = {};
      predefinedSizes.forEach(sz => {
        product.sizeStock[sz] = 0;
      });
    }
    return product.variants;
  }

  if (typeof generateDefaultVariants === "function") {
    product.variants = generateDefaultVariants(product);
  } else {
    product.variants = [{
      id: `var_${product.id}_def`,
      sku: `SD-${(product.id || "PRD").toUpperCase()}-STD`,
      size: "Free Size",
      color: "Standard",
      stock: Number(product.stock) || 0,
      reserved: 0,
      reorderThreshold: 3,
      price: product.price || 0
    }];
  }
  return product.variants;
}

function updateVariantStock(productId, variantId, qtyDelta, isDirectSet = false) {
  const p = products().find(x => x.id === productId);
  if (!p) return Promise.resolve();
  const vars = ensureProductVariants(p);
  const v = vars.find(x => x.id === variantId);
  if (v) {
    v.stock = isDirectSet ? Math.max(0, Number(qtyDelta) || 0) : Math.max(0, (Number(v.stock) || 0) + Number(qtyDelta));
    p.stock = vars.reduce((acc, curr) => acc + (Number(curr.stock) || 0), 0);
    p.variants = vars;
    if (p.sizeStock && v.size && p.sizeStock[v.size] !== undefined) {
      p.sizeStock[v.size] = vars.filter(x => String(x.size).toUpperCase() === String(v.size).toUpperCase())
                               .reduce((acc, curr) => acc + (Number(curr.stock) || 0), 0);
    }
    return upd("products", p.id, { stock: p.stock, sizeStock: p.sizeStock, variants: vars });
  }
  return Promise.resolve();
}

function addVariantToProduct(productId, variantData) {
  const p = products().find(x => x.id === productId);
  if (!p) return Promise.resolve();
  const vars = ensureProductVariants(p);
  const newVar = {
    id: `var_${p.id}_${uid()}`,
    sku: Security.sanitize(variantData.sku || `SD-${p.id.toUpperCase()}-${uid().slice(0, 4)}`),
    size: Security.sanitize(variantData.size || "Free Size"),
    color: Security.sanitize(variantData.color || "Standard"),
    stock: Math.max(0, Number(variantData.stock) || 0),
    reserved: 0,
    reorderThreshold: Math.max(0, Number(variantData.reorderThreshold) || 3),
    price: Number(variantData.price) || p.price || 0
  };
  vars.push(newVar);
  p.stock = vars.reduce((acc, curr) => acc + (Number(curr.stock) || 0), 0);
  p.variants = vars;
  if (p.sizeStock && newVar.size && p.sizeStock[newVar.size] !== undefined) {
    p.sizeStock[newVar.size] = vars.filter(x => String(x.size).toUpperCase() === String(newVar.size).toUpperCase())
                             .reduce((acc, curr) => acc + (Number(curr.stock) || 0), 0);
  }
  return upd("products", p.id, { stock: p.stock, sizeStock: p.sizeStock, variants: vars });
}

function deleteVariantFromProduct(productId, variantId) {
  const p = products().find(x => x.id === productId);
  if (!p) return Promise.resolve();
  const vars = ensureProductVariants(p).filter(v => v.id !== variantId);
  p.stock = vars.reduce((acc, curr) => acc + (Number(curr.stock) || 0), 0);
  p.variants = vars;
  return upd("products", p.id, { stock: p.stock, variants: vars });
}

function validateAndDeductStock(cartItems) {
  if (!Array.isArray(cartItems) || !cartItems.length) return { valid: false, message: "Cart is empty" };
  const allProds = products();

  // 1. Group requested quantities by product & size to prevent overselling on duplicate cart entries
  const requestedTotals = {};
  for (const item of cartItems) {
    const sNorm = (item.size || "").trim().toUpperCase();
    const cNorm = (item.color || "").trim().toLowerCase();
    const key = `${item.id}__${sNorm}__${cNorm}`;
    requestedTotals[key] = (requestedTotals[key] || 0) + (Math.max(1, Number(item.q) || 1));
  }

  // Pre-validation pass
  for (const item of cartItems) {
    const pr = allProds.find(p => String(p.id) === String(item.id));
    if (!pr) {
      return { valid: false, message: `Product "${item.n}" is no longer in our boutique catalogue.` };
    }
    const sNorm = (item.size || "").trim().toUpperCase();
    const cNorm = (item.color || "").trim().toLowerCase();
    const key = `${item.id}__${sNorm}__${cNorm}`;
    const totalQtyNeeded = requestedTotals[key] || item.q;
    const available = getProductSizeStock(pr, item.size, item.color);

    if (available < totalQtyNeeded) {
      const sizeLabel = item.size ? ` in size ${item.size}` : "";
      return {
        valid: false,
        message: `Insufficient stock for "${pr.name}"${sizeLabel}. Only ${available} unit(s) available.`
      };
    }
  }

  // 2. Atomic deduction pass
  cartItems.forEach(item => {
    const pr = allProds.find(p => String(p.id) === String(item.id));
    if (!pr) return;
    const qty = Math.max(1, Number(item.q) || 1);
    const sNorm = (item.size || "").trim().toUpperCase();
    const cNorm = (item.color || "").trim().toLowerCase();

    if (pr.cat === "Readymade") {
      // Deduct from sizeStock if exists
      if (pr.sizeStock && typeof pr.sizeStock === "object") {
        const szKey = Object.keys(pr.sizeStock).find(k => k.toUpperCase() === sNorm) || item.size;
        if (szKey && pr.sizeStock[szKey] !== undefined) {
          pr.sizeStock[szKey] = Math.max(0, (Number(pr.sizeStock[szKey]) || 0) - qty);
        }
      }

      // Deduct from matching variant
      const vars = Array.isArray(pr.variants) && pr.variants.length > 0 ? pr.variants : null;
      if (vars) {
        let v = null;
        if (item.variantId) {
          v = vars.find(x => x.id === item.variantId);
        }
        if (!v && sNorm && cNorm) {
          v = vars.find(x => String(x.size).toUpperCase() === sNorm && String(x.color).toLowerCase() === cNorm);
        }
        if (!v && sNorm) {
          v = vars.find(x => String(x.size).toUpperCase() === sNorm);
        }
        if (v) {
          v.stock = Math.max(0, (Number(v.stock) || 0) - qty);
        }
      }

      // Recalculate total product stock atomically
      if (pr.sizeStock) {
        pr.stock = Object.values(pr.sizeStock).reduce((acc, curr) => acc + (Math.max(0, Number(curr)) || 0), 0);
      } else if (vars) {
        pr.stock = vars.reduce((acc, curr) => acc + (Math.max(0, Number(curr.stock)) || 0), 0);
      } else {
        pr.stock = Math.max(0, (Number(pr.stock) || 0) - qty);
      }

      upd("products", pr.id, { stock: pr.stock, sizeStock: pr.sizeStock, variants: pr.variants });
    } else {
      // Ordinary fabric products (Material) - sold by length or quantity
      const newStock = Math.max(0, (Number(pr.stock) || 0) - qty);
      pr.stock = newStock;
      upd("products", pr.id, { stock: newStock });
    }
  });

  return { valid: true };
}

function restoreOrderStock(o) {
  if (!o || o.stockRestored || !Array.isArray(o.items) || !o.items.length) return 0;
  let restoredCount = 0;
  const allProds = products();

  o.items.forEach(it => {
    const pr = allProds.find(p => String(p.id) === String(it.id));
    if (!pr) return;
    const qty = Math.max(1, Number(it.q) || 1);
    const sNorm = (it.size || "").trim().toUpperCase();
    const cNorm = (it.color || "").trim().toLowerCase();

    if (pr.cat === "Readymade") {
      if (pr.sizeStock && typeof pr.sizeStock === "object") {
        const szKey = Object.keys(pr.sizeStock).find(k => k.toUpperCase() === sNorm) || it.size;
        if (szKey && pr.sizeStock[szKey] !== undefined) {
          pr.sizeStock[szKey] = (Number(pr.sizeStock[szKey]) || 0) + qty;
        }
      }
      const vars = Array.isArray(pr.variants) && pr.variants.length > 0 ? pr.variants : null;
      if (vars) {
        let v = null;
        if (it.variantId) {
          v = vars.find(x => x.id === it.variantId);
        }
        if (!v && sNorm && cNorm) {
          v = vars.find(x => String(x.size).toUpperCase() === sNorm && String(x.color).toLowerCase() === cNorm);
        }
        if (!v && sNorm) {
          v = vars.find(x => String(x.size).toUpperCase() === sNorm);
        }
        if (v) {
          v.stock = (Number(v.stock) || 0) + qty;
        }
      }
      if (pr.sizeStock) {
        pr.stock = Object.values(pr.sizeStock).reduce((acc, curr) => acc + (Math.max(0, Number(curr)) || 0), 0);
      } else if (vars) {
        pr.stock = vars.reduce((acc, curr) => acc + (Math.max(0, Number(curr.stock)) || 0), 0);
      } else {
        pr.stock = (Number(pr.stock) || 0) + qty;
      }
      upd("products", pr.id, { stock: pr.stock, sizeStock: pr.sizeStock, variants: pr.variants });
    } else {
      const newStock = (Number(pr.stock) || 0) + qty;
      pr.stock = newStock;
      upd("products", pr.id, { stock: newStock });
    }
    restoredCount += qty;
  });

  o.stockRestored = true;
  return restoredCount;
}

function reDeductOrderStock(o) {
  if (!o || !o.stockRestored || !Array.isArray(o.items) || !o.items.length) return 0;
  let deductedCount = 0;
  const allProds = products();

  o.items.forEach(it => {
    const pr = allProds.find(p => String(p.id) === String(it.id));
    if (!pr) return;
    const qty = Math.max(1, Number(it.q) || 1);
    const sNorm = (it.size || "").trim().toUpperCase();
    const cNorm = (it.color || "").trim().toLowerCase();

    if (pr.cat === "Readymade") {
      if (pr.sizeStock && typeof pr.sizeStock === "object") {
        const szKey = Object.keys(pr.sizeStock).find(k => k.toUpperCase() === sNorm) || it.size;
        if (szKey && pr.sizeStock[szKey] !== undefined) {
          pr.sizeStock[szKey] = Math.max(0, (Number(pr.sizeStock[szKey]) || 0) - qty);
        }
      }
      const vars = Array.isArray(pr.variants) && pr.variants.length > 0 ? pr.variants : null;
      if (vars) {
        let v = null;
        if (it.variantId) {
          v = vars.find(x => x.id === it.variantId);
        }
        if (!v && sNorm && cNorm) {
          v = vars.find(x => String(x.size).toUpperCase() === sNorm && String(x.color).toLowerCase() === cNorm);
        }
        if (!v && sNorm) {
          v = vars.find(x => String(x.size).toUpperCase() === sNorm);
        }
        if (v) {
          v.stock = Math.max(0, (Number(v.stock) || 0) - qty);
        }
      }
      if (pr.sizeStock) {
        pr.stock = Object.values(pr.sizeStock).reduce((acc, curr) => acc + (Math.max(0, Number(curr)) || 0), 0);
      } else if (vars) {
        pr.stock = vars.reduce((acc, curr) => acc + (Math.max(0, Number(curr.stock)) || 0), 0);
      } else {
        pr.stock = Math.max(0, (Number(pr.stock) || 0) - qty);
      }
      upd("products", pr.id, { stock: pr.stock, sizeStock: pr.sizeStock, variants: pr.variants });
    } else {
      const newStock = Math.max(0, (Number(pr.stock) || 0) - qty);
      pr.stock = newStock;
      upd("products", pr.id, { stock: newStock });
    }
    deductedCount += qty;
  });

  o.stockRestored = false;
  return deductedCount;
}

// ------------------------------------------
// AI-Assisted UPI Payment Screenshot Verification
// ------------------------------------------
function verifyPaymentProof(orderId, isApproved, adminNote = "") {
  const o = orders().find(x => x.id === orderId);
  if (!o) return Promise.resolve();
  const history = o.history || [];
  const proof = o.paymentProof || {};

  if (isApproved) {
    proof.status = "Verified";
    proof.verifiedAt = Date.now();
    proof.verifiedBy = S.me?.name || "Admin Atelier";
    proof.adminNote = adminNote || "Payment verified against merchant UPI bank records";
    history.push({
      status: o.status,
      at: Date.now(),
      note: `Payment proof verified by ${proof.verifiedBy}. Marked as Paid.`
    });
    return upd("orders", orderId, {
      paid: "Paid",
      paidAt: Date.now(),
      paymentProof: proof,
      history
    }).then(() => {
      if (typeof toast === "function") toast(`Order #${o.no} confirmed & marked Paid! 💳✅`);
    });
  } else {
    proof.status = "Rejected";
    proof.rejectedAt = Date.now();
    proof.rejectedBy = S.me?.name || "Admin Atelier";
    proof.rejectReason = adminNote || "Transaction reference unverified or amount mismatch";
    history.push({
      status: o.status,
      at: Date.now(),
      note: `Payment proof rejected: ${proof.rejectReason}`
    });
    return upd("orders", orderId, {
      paid: "Unpaid",
      paymentProof: proof,
      history
    }).then(() => {
      if (typeof toast === "function") toast(`Payment proof for Order #${o.no} marked as Rejected ⚠️`);
    });
  }
}

// ---------- smart revenue analytics engine ----------
function getRevenueAnalytics(period = "daily") {
  const os = orders();
  const validOrders = os.filter(x => x.status !== "Cancelled");
  const now = new Date();
  const todayStr = now.toDateString();
  const curMonthNum = now.getMonth();
  const curYearNum = now.getFullYear();

  // Strict Financial Separation: Confirmed Paid vs Claimed (unverified) vs Unpaid
  const paidOrders = validOrders.filter(x => x.paid === "Paid");
  const claimedOrders = validOrders.filter(x => x.paid === "Claimed");
  const unpaidOrders = validOrders.filter(x => x.paid === "Unpaid" || !x.paid);

  // 1. Confirmed Lifetime Totals: Counted strictly ONLY when payment is confirmed as Paid
  const lifetimeRev = paidOrders.reduce((a, x) => a + (Number(x.total) || 0), 0);
  const totalPaidRev = lifetimeRev;
  const totalClaimedRev = claimedOrders.reduce((a, x) => a + (Number(x.total) || 0), 0);
  const totalUnpaidRev = unpaidOrders.reduce((a, x) => a + (Number(x.total) || 0), 0);
  const totalBilledRev = lifetimeRev + totalClaimedRev + totalUnpaidRev;

  // 2. Today's Financials
  const todayOrders = validOrders.filter(x => new Date(x.ts).toDateString() === todayStr);
  const todayPaidOrders = todayOrders.filter(x => x.paid === "Paid");
  const todayRev = todayPaidOrders.reduce((a, x) => a + (Number(x.total) || 0), 0);
  const todayPaidRev = todayRev;
  const todayClaimedRev = todayOrders.filter(x => x.paid === "Claimed").reduce((a, x) => a + (Number(x.total) || 0), 0);
  const todayUnpaidRev = todayOrders.filter(x => x.paid === "Unpaid" || !x.paid).reduce((a, x) => a + (Number(x.total) || 0), 0);

  // 3. This Week's Financials (Last 7 days)
  const oneWeekAgo = new Date(now.getTime() - 7 * 86400000);
  const weekOrders = validOrders.filter(x => new Date(x.ts) >= oneWeekAgo);
  const weekPaidOrders = weekOrders.filter(x => x.paid === "Paid");
  const weekRev = weekPaidOrders.reduce((a, x) => a + (Number(x.total) || 0), 0);
  const weekPaidRev = weekRev;
  const weekClaimedRev = weekOrders.filter(x => x.paid === "Claimed").reduce((a, x) => a + (Number(x.total) || 0), 0);
  const weekUnpaidRev = weekOrders.filter(x => x.paid === "Unpaid" || !x.paid).reduce((a, x) => a + (Number(x.total) || 0), 0);

  // 4. This Month's Financials
  const monthOrders = validOrders.filter(x => {
    const d = new Date(x.ts);
    return d.getMonth() === curMonthNum && d.getFullYear() === curYearNum;
  });
  const monthPaidOrders = monthOrders.filter(x => x.paid === "Paid");
  const monthRev = monthPaidOrders.reduce((a, x) => a + (Number(x.total) || 0), 0);
  const monthPaidRev = monthRev;
  const monthClaimedRev = monthOrders.filter(x => x.paid === "Claimed").reduce((a, x) => a + (Number(x.total) || 0), 0);
  const monthUnpaidRev = monthOrders.filter(x => x.paid === "Unpaid" || !x.paid).reduce((a, x) => a + (Number(x.total) || 0), 0);

  // 5. Highest Revenue Day (Based strictly on confirmed Paid sales)
  const dayMap = {};
  paidOrders.forEach(x => {
    const d = new Date(x.ts);
    const dStr = d.toISOString().slice(0, 10);
    dayMap[dStr] = (dayMap[dStr] || 0) + (Number(x.total) || 0);
  });
  let highestDay = { date: "No paid sales yet", amount: 0, dateFormatted: "N/A" };
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

  // 6. Multi-Period Chart Series Aggregator (Daily, Weekly, Monthly, Yearly)
  const series = [];
  const normalizedPeriod = (period === "7days" || period === "14days") ? "daily" : period;

  if (normalizedPeriod === "weekly") {
    // Last 8 weeks
    for (let w = 7; w >= 0; w--) {
      const endMs = now.getTime() - (w * 7 * 86400000);
      const startMs = endMs - (7 * 86400000);
      const wStartDate = new Date(startMs);
      const wEndDate = new Date(endMs);
      const wOrders = validOrders.filter(x => x.ts >= startMs && x.ts < endMs);
      const wPaid = wOrders.filter(x => x.paid === "Paid");
      const wClaimed = wOrders.filter(x => x.paid === "Claimed");
      const wUnpaid = wOrders.filter(x => x.paid === "Unpaid" || !x.paid);

      const paidRev = wPaid.reduce((a, x) => a + (Number(x.total) || 0), 0);
      const claimedRev = wClaimed.reduce((a, x) => a + (Number(x.total) || 0), 0);
      const unpaidRev = wUnpaid.reduce((a, x) => a + (Number(x.total) || 0), 0);

      series.push({
        iso: `W${w}`,
        label: w === 0 ? "This Week" : `${w}w ago`,
        fullDate: `${wStartDate.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} – ${wEndDate.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`,
        amount: paidRev,
        paidAmount: paidRev,
        claimedAmount: claimedRev,
        unpaidAmount: unpaidRev,
        ordersCount: wPaid.length,
        totalOrdersCount: wOrders.length,
        isHighest: false
      });
    }
  } else if (normalizedPeriod === "monthly" || period === "30days") {
    // Last 12 calendar months
    for (let m = 11; m >= 0; m--) {
      const targetMonth = new Date(now.getFullYear(), now.getMonth() - m, 1);
      const mIdx = targetMonth.getMonth();
      const yIdx = targetMonth.getFullYear();
      const mOrders = validOrders.filter(x => {
        const d = new Date(x.ts);
        return d.getMonth() === mIdx && d.getFullYear() === yIdx;
      });
      const mPaid = mOrders.filter(x => x.paid === "Paid");
      const mClaimed = mOrders.filter(x => x.paid === "Claimed");
      const mUnpaid = mOrders.filter(x => x.paid === "Unpaid" || !x.paid);

      const paidRev = mPaid.reduce((a, x) => a + (Number(x.total) || 0), 0);
      const claimedRev = mClaimed.reduce((a, x) => a + (Number(x.total) || 0), 0);
      const unpaidRev = mUnpaid.reduce((a, x) => a + (Number(x.total) || 0), 0);

      series.push({
        iso: `${yIdx}-${String(mIdx + 1).padStart(2, "0")}`,
        label: targetMonth.toLocaleDateString("en-IN", { month: "short" }),
        fullDate: targetMonth.toLocaleDateString("en-IN", { month: "long", year: "numeric" }),
        amount: paidRev,
        paidAmount: paidRev,
        claimedAmount: claimedRev,
        unpaidAmount: unpaidRev,
        ordersCount: mPaid.length,
        totalOrdersCount: mOrders.length,
        isHighest: false
      });
    }
  } else if (normalizedPeriod === "yearly") {
    // Multi-year comparison (e.g. 2024, 2025, 2026)
    const baseYear = curYearNum;
    for (let y = baseYear - 2; y <= baseYear; y++) {
      const yOrders = validOrders.filter(x => new Date(x.ts).getFullYear() === y);
      const yPaid = yOrders.filter(x => x.paid === "Paid");
      const yClaimed = yOrders.filter(x => x.paid === "Claimed");
      const yUnpaid = yOrders.filter(x => x.paid === "Unpaid" || !x.paid);

      const paidRev = yPaid.reduce((a, x) => a + (Number(x.total) || 0), 0);
      const claimedRev = yClaimed.reduce((a, x) => a + (Number(x.total) || 0), 0);
      const unpaidRev = yUnpaid.reduce((a, x) => a + (Number(x.total) || 0), 0);

      series.push({
        iso: String(y),
        label: String(y),
        fullDate: `Year ${y}`,
        amount: paidRev,
        paidAmount: paidRev,
        claimedAmount: claimedRev,
        unpaidAmount: unpaidRev,
        ordersCount: yPaid.length,
        totalOrdersCount: yOrders.length,
        isHighest: false
      });
    }
  } else {
    // Default Daily (Last 14 days)
    const daysCount = 14;
    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const dtIso = d.toISOString().slice(0, 10);
      const dayName = d.toLocaleDateString("en-IN", { weekday: "short" });
      const dayNum = d.getDate();
      const dayOrders = validOrders.filter(x => new Date(x.ts).toDateString() === d.toDateString());
      const dayPaidOrders = dayOrders.filter(x => x.paid === "Paid");
      const dayClaimedOrders = dayOrders.filter(x => x.paid === "Claimed");
      const dayUnpaidOrders = dayOrders.filter(x => x.paid === "Unpaid" || !x.paid);

      const dayPaidRev = dayPaidOrders.reduce((a, x) => a + (Number(x.total) || 0), 0);
      const dayClaimedRev = dayClaimedOrders.reduce((a, x) => a + (Number(x.total) || 0), 0);
      const dayUnpaidRev = dayUnpaidOrders.reduce((a, x) => a + (Number(x.total) || 0), 0);
      const isHighest = highestDay.amount > 0 && dayPaidRev === highestDay.amount;

      series.push({
        iso: dtIso,
        label: i < 7 ? `${dayName} ${dayNum}` : `${dayNum}`,
        fullDate: d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
        amount: dayPaidRev,
        paidAmount: dayPaidRev,
        claimedAmount: dayClaimedRev,
        unpaidAmount: dayUnpaidRev,
        ordersCount: dayPaidOrders.length,
        totalOrdersCount: dayOrders.length,
        isHighest
      });
    }
  }

  const peakChartAmt = Math.max(1, ...series.map(s => s.amount));

  // 7. Confirmed Segment Split: Bespoke Stitching vs Readymade
  const stitchingRev = paidOrders.filter(x => x.type === "Stitch").reduce((a, x) => a + (Number(x.total) || 0), 0);
  const readymadeRev = paidOrders.filter(x => x.type !== "Stitch").reduce((a, x) => a + (Number(x.total) || 0), 0);

  // 8. Payment Modes on confirmed paid orders
  const upiRev = paidOrders.filter(x => (x.pay || "").includes("UPI")).reduce((a, x) => a + (Number(x.total) || 0), 0);
  const cashRev = paidOrders.filter(x => (x.pay || "").toLowerCase().includes("cash") || (x.pay || "").toLowerCase().includes("shop")).reduce((a, x) => a + (Number(x.total) || 0), 0);
  const otherPayRev = Math.max(0, lifetimeRev - upiRev - cashRev);

  // 9. Popular Garments in Stitching
  const stitchGarmentCounts = {};
  validOrders.filter(x => x.type === "Stitch").forEach(x => {
    const g = x.garment || "Custom Stitch";
    stitchGarmentCounts[g] = (stitchGarmentCounts[g] || 0) + 1;
  });
  const topGarments = Object.entries(stitchGarmentCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  // 10. Financial Margins & Expense Intelligence
  const totalWagesPaid = (S.payouts || []).reduce((a, p) => a + (Number(p.amount) || 0), 0);
  const estimatedTailoringExpenses = totalWagesPaid || Math.round(stitchingRev * 0.35);
  const estimatedGrossProfit = Math.max(0, lifetimeRev - estimatedTailoringExpenses);
  const averageOrderValue = paidOrders.length ? Math.round(lifetimeRev / paidOrders.length) : (validOrders.length ? Math.round(totalBilledRev / validOrders.length) : 0);

  return {
    lifetimeRev,
    totalPaidRev,
    totalClaimedRev,
    totalUnpaidRev,
    totalBilledRev,
    estimatedTailoringExpenses,
    estimatedGrossProfit,
    averageOrderValue,
    todayRev,
    todayPaidRev,
    todayClaimedRev,
    todayUnpaidRev,
    todayOrders: todayPaidOrders.length,
    todayTotalOrders: todayOrders.length,
    weekRev,
    weekPaidRev,
    weekClaimedRev,
    weekUnpaidRev,
    weekOrders: weekPaidOrders.length,
    weekTotalOrders: weekOrders.length,
    monthRev,
    monthPaidRev,
    monthClaimedRev,
    monthUnpaidRev,
    monthOrders: monthPaidOrders.length,
    monthTotalOrders: monthOrders.length,
    highestDay,
    currentPeriod: normalizedPeriod,
    series,
    peakChartAmt,
    stitchingRev,
    readymadeRev,
    upiRev,
    cashRev,
    otherPayRev,
    topGarments,
    totalOrdersCount: validOrders.length,
    paidCount: paidOrders.length,
    claimedCount: claimedOrders.length,
    unpaidCount: unpaidOrders.length,
    paidOrders,
    claimedOrders,
    unpaidOrders
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
    version: "2.2",
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
    team: S.team,
    reviews: S.reviews
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
    if (Array.isArray(data.reviews)) S.reviews = data.reviews;

    ["prod", "orders", "customers", "coupons", "workers", "work", "payouts", "attendance", "team", "reviews", "cfg"].forEach(k => {
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

function exportReviewsCSV() {
  const rList = typeof reviews === "function" ? reviews() : (S.reviews || []);
  const headers = ["Review ID", "Date", "Customer Name", "Phone", "Rating", "Service", "Order No", "Status", "Review Text"];
  const rows = rList.map(r => [
    r.id,
    new Date(r.updatedAt || r.createdAt || Date.now()).toLocaleDateString("en-IN"),
    `"${(r.name || "").replace(/"/g, '""')}"`,
    r.phone || "",
    r.rating || 5,
    `"${(r.service || "").replace(/"/g, '""')}"`,
    r.orderNo || "",
    r.status || "Active",
    `"${(r.review || "").replace(/"/g, '""')}"`
  ]);
  const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
  const a = document.createElement("a");
  a.setAttribute("href", encodeURI(csvContent));
  a.setAttribute("download", `saifa_reviews_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function exportPayrollCSV(monthKey) {
  const mKey = monthKey || (S.attYearMonth || curMon);
  const wrks = workers();
  const headers = ["Worker ID", "Artisan Name", "Role", "Phone", "Month", "Verified Pieces", "Pending Pieces", "Piece Wage (INR)", "Overtime Hours", "OT Allowance (INR)", "Gross Earned (INR)", "Amount Paid (INR)", "Pending Balance (INR)", "Days Present", "Days Half", "Days Leave"];
  const rows = wrks.map(w => {
    const stats = getWorkerMonthlyStats(w.id, mKey);
    return [
      w.wid || w.id,
      `"${(w.name || "").replace(/"/g, '""')}"`,
      `"${(w.role || "").replace(/"/g, '""')}"`,
      w.phone || "",
      mKey,
      stats.totalPieces,
      stats.pendingPieces,
      stats.totalEarned,
      stats.totalOtHours,
      stats.otEarnings,
      stats.grossEarned,
      stats.totalPaid,
      stats.pendingBalance,
      stats.daysPresent,
      stats.daysHalf,
      stats.daysLeave
    ];
  });
  const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
  const a = document.createElement("a");
  a.setAttribute("href", encodeURI(csvContent));
  a.setAttribute("download", `saifa_artisan_payroll_${mKey}.csv`);
  document.body.appendChild(a);
  a.click();
  a.remove();
  toast(`Exported payroll CSV for ${mKey} 📄✅`);
}

window.reviews = reviews;
window.getShopRatingStats = getShopRatingStats;
window.getGenuineCustomerStats = getGenuineCustomerStats;
window.getEligibleOrdersForReview = getEligibleOrdersForReview;
window.submitOrderVerifiedReview = submitOrderVerifiedReview;
window.moderateReview = moderateReview;
window.verifyPaymentProof = verifyPaymentProof;
window.ensureProductVariants = ensureProductVariants;
window.updateVariantStock = updateVariantStock;
window.addVariantToProduct = addVariantToProduct;
window.deleteVariantFromProduct = deleteVariantFromProduct;
window.validateAndDeductStock = validateAndDeductStock;
window.getRevenueAnalytics = getRevenueAnalytics;
window.exportReviewsCSV = exportReviewsCSV;
window.exportPayrollCSV = exportPayrollCSV;
window.getProductSizeStock = getProductSizeStock;
window.restoreOrderStock = restoreOrderStock;
window.reDeductOrderStock = reDeductOrderStock;
window.saveCfg = saveCfg;
window.setShopLiveStatus = setShopLiveStatus;
window.getWorkerMonthlyStats = getWorkerMonthlyStats;
window.getArtisanProductivityAI = getArtisanProductivityAI;

