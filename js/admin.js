// ==========================================
// SAIFA DESIGNS – ADMIN & WORKER PORTAL
// ==========================================

const TABS = [
  { id: "Dashboard", label: "Dashboard", icon: "📊", group: "Overview" },
  { id: "Reviews", label: "Client Reviews", icon: "⭐", group: "Store" },
  { id: "AI", label: "AI Business Suite", icon: "✨", group: "Overview" },
  { id: "Orders", label: "Orders & Invoices", icon: "📦", group: "Store" },
  { id: "Stitching", label: "Stitching Queue", icon: "✂️", group: "Store" },
  { id: "Products", label: "Products & Fabrics", icon: "👗", group: "Store" },
  { id: "Coupons", label: "Coupons & Discounts", icon: "🎟️", group: "Store" },
  { id: "Customers", label: "Client Directory", icon: "👥", group: "Team & HR" },
  { id: "Workers", label: "Artisans & Tailors", icon: "🧵", group: "Team & HR" },
  { id: "Salary", label: "Salary & Attendance", icon: "💰", group: "Team & HR" },
  { id: "Team", label: "Front Page Team", icon: "🧑‍💼", group: "Team & HR" },
  { id: "Settings", label: "Boutique Settings", icon: "⚙️", group: "System" },
  { id: "Data", label: "Backup & Export", icon: "💾", group: "System" }
];

function toggleSidebar() {
  S.navCollapsed = !S.navCollapsed;
  const sb = $("adminSidebar");
  if (sb) sb.classList.toggle("collapsed", S.navCollapsed);
}

function toggleMobileSidebar() {
  const sb = $("adminSidebar");
  const bd = $("adminSidebarBackdrop");
  if (sb) {
    sb.classList.toggle("mobile-open");
    if (bd) bd.classList.toggle("active", sb.classList.contains("mobile-open"));
  }
}

function closeMobileSidebar() {
  const sb = $("adminSidebar");
  const bd = $("adminSidebarBackdrop");
  if (sb) sb.classList.remove("mobile-open");
  if (bd) bd.classList.remove("active");
}

// ------------------------------------------
// Safe & Reliable Delete Modal System
// ------------------------------------------
let pendingDelete = null;

function requestDelete(col, id, title) {
  const stateKey = (col === "products" || col === "prod") ? "prod" : col;
  const list = S[stateKey] || [];
  const item = list.find(x => String(x.id) === String(id));
  const resolvedTitle = title || (item ? (item.name || item.customer || (item.no ? "Order #" + item.no : "") || item.code || item.workerName || "Record") : "Record");

  pendingDelete = { col, id: String(id), title: resolvedTitle };

  try {
    modal(`
      <div style="text-align:center;padding:16px 8px">
        <div style="width:68px;height:68px;border-radius:50%;background:color-mix(in srgb, var(--bad) 15%, transparent);color:var(--bad);display:grid;place-items:center;font-size:2.2rem;margin:0 auto 14px;box-shadow:0 0 24px color-mix(in srgb, var(--bad) 25%, transparent)">
          🗑️
        </div>
        <h2 style="color:var(--bad);margin:0 0 8px;font-size:1.35rem">Delete Record Permanently?</h2>
        <p style="color:var(--mu);margin-bottom:16px;font-size:0.95rem;line-height:1.5">
          Are you sure you want to permanently delete <b style="color:var(--tx)">"${Security.escapeHTML(resolvedTitle)}"</b>?
        </p>
        <div style="background:var(--sf2);border:1px solid color-mix(in srgb, var(--bad) 30%, var(--ln));border-radius:14px;padding:12px 14px;font-size:0.86rem;margin-bottom:22px;text-align:left;line-height:1.5;color:var(--tx)">
          ⚠️ <b>Warning:</b> This item will be permanently removed from your <b>${Security.escapeHTML(col)}</b> database and live storefront in real-time. This action cannot be undone.
        </div>
        <div style="display:flex;gap:12px;justify-content:center">
          <button class="btn" style="flex:1;padding:10px 14px;font-weight:600" onclick="closeM()">
            ✕ Cancel / Keep
          </button>
          <button class="btn d" style="flex:1.3;padding:10px 14px;background:var(--bad);color:#fff;font-weight:700;box-shadow:0 6px 18px color-mix(in srgb, var(--bad) 40%, transparent)" onclick="executePermanentDelete()">
            🗑️ Delete Permanently
          </button>
        </div>
      </div>
    `);
  } catch (err) {
    if (confirm(`Are you sure you want to permanently delete "${resolvedTitle}"?`)) {
      executePermanentDelete();
    }
  }
}

function executePermanentDelete() {
  if (!pendingDelete) return closeM();
  const { col, id, title } = pendingDelete;
  closeM();
  del(col, id);
  pendingDelete = null;
  toast(`"${title}" deleted successfully 🗑️`);
  if (typeof panel === "function" && S.tab) panel();
  if (typeof renderFront === "function") renderFront();
}

// ------------------------------------------
// Master Quality Verification & Wage Approval Engine
// ------------------------------------------
const AdminPortal = {
  approveOrderWork(orderId) {
    const o = orders().find(x => x.id == orderId);
    if (!o) return toast("Order not found");

    const wageInput = $(`wage_input_${orderId}`) || $(`ver_wage_${orderId}`);
    const wageAmount = wageInput ? Math.max(0, Number(wageInput.value) || 0) : (o.workerPendingWage || (S.cfg.pay && S.cfg.pay[o.garment]) || 150);

    const workerObj = workers().find(w => w.id == o.worker);
    const workerName = workerObj ? workerObj.name : "Artisan Tailor";

    // 1. Mark order as quality verified, stage ready for trial, status ready
    upd("orders", orderId, {
      workerVerified: true,
      verifiedWage: wageAmount,
      verifiedAt: Date.now(),
      stage: "Ready for Trial & Delivery",
      status: "Ready"
    }).then(() => {
      // 2. Automatically record in work collection to credit the worker's wallet/payroll
      put("work", {
        wk: o.worker || (workerObj ? workerObj.id : "tailor"),
        wn: workerName,
        task: `${o.garment} (Order #${o.no})`,
        qty: 1,
        rate: wageAmount,
        orderId: o.id,
        orderNo: o.no,
        verified: true,
        verifiedAt: Date.now(),
        ts: Date.now()
      }).then(() => {
        Realtime.broadcast("ORDER_WORK_VERIFIED", {
          orderId: o.id,
          orderNo: o.no,
          workerId: o.worker,
          workerName,
          wage: wageAmount,
          stage: "Ready for Trial & Delivery"
        });

        toast(`Order #${o.no} quality verified! ₹${wageAmount} credited to ${workerName}'s earnings ✅`);
        if (typeof panel === "function") panel();
      });
    });
  },

  openReworkModal(orderId) {
    const o = orders().find(x => x.id == orderId);
    if (!o) return toast("Order not found");

    modal(`
      <div style="text-align:left;padding:12px 6px">
        <h2 style="color:var(--bad);margin:0 0 8px">⚠️ Request Quality Rework / Fitting Correction</h2>
        <p style="font-size:0.86rem;color:var(--mu);margin-bottom:12px">
          Order <b>#${Security.escapeHTML(o.no)}</b> (${Security.escapeHTML(o.garment)}) will be returned to the artisan with your adjustment instructions.
        </p>

        <label style="font-size:0.84rem;font-weight:700">Correction Instructions for Artisan *</label>
        <textarea id="rework_reason" rows="3" placeholder="e.g. Neckline is 0.5 inch too wide, please tighten shoulder darts and re-check sleeve length." style="width:100%;margin-top:4px"></textarea>

        <div style="display:flex;gap:10px;margin-top:14px">
          <button class="btn" style="flex:1" onclick="closeM()">Cancel</button>
          <button class="btn d" style="flex:2;background:var(--bad);color:#fff" onclick="AdminPortal.submitReworkRequest('${o.id}')">
            ⚠️ Send Rework Instructions to Artisan
          </button>
        </div>
      </div>
    `);
  },

  submitReworkRequest(orderId) {
    const o = orders().find(x => x.id == orderId);
    if (!o) return toast("Order not found");

    const reasonEl = $("rework_reason");
    const reason = reasonEl ? reasonEl.value.trim() : "";
    if (!reason) return toast("Please enter correction instructions for the artisan.");

    closeM();

    upd("orders", orderId, {
      workerVerified: "rework",
      stage: "Master Quality Check (Rework Requested)",
      reworkNote: reason,
      reworkRequestedAt: Date.now()
    }).then(() => {
      Realtime.broadcast("ORDER_REWORK_REQUESTED", {
        orderId: o.id,
        orderNo: o.no,
        workerId: o.worker,
        reason
      });
      toast(`Rework instructions sent to artisan for Order #${o.no} ⚠️`);
      if (typeof panel === "function") panel();
    });
  },

  approveWorkLog(workId) {
    const w = (S.work || []).find(x => x.id == workId);
    if (!w) return toast("Log entry not found");

    upd("work", workId, {
      verified: true,
      verifiedAt: Date.now()
    }).then(() => {
      Realtime.broadcast("WORK_LOG_APPROVED", {
        workId,
        workerId: w.wk,
        amount: (w.qty || 1) * (w.rate || 0)
      });
      toast(`Piece log for ${w.wn || 'Artisan'} approved! (+${R((w.qty || 1) * (w.rate || 0))}) ✅`);
      if (typeof panel === "function") panel();
    });
  },

  approveAllPendingWorkLogs() {
    const pending = (S.work || []).filter(w => w.verified === false);
    if (!pending.length) return toast("No pending piece logs to approve.");

    Promise.all(pending.map(w => upd("work", w.id, { verified: true, verifiedAt: Date.now() }))).then(() => {
      Realtime.broadcast("ALL_WORK_LOGS_APPROVED", { count: pending.length });
      toast(`All ${pending.length} pending artisan piece logs verified and credited! ✅`);
      if (typeof panel === "function") panel();
    });
  }
};

// ------------------------------------------
// Admin Shell View & Animated Navigation
// ------------------------------------------
function panel() {
  const oCount = orders().filter(x => !["Delivered", "Cancelled"].includes(x.status)).length;
  const payCount = orders().filter(x => x.paid === "Claimed").length;
  const lowCount = products().filter(p => p.stock < 5).length;
  const stitchingCount = orders().filter(x => x.type === "Stitch" && !["Delivered", "Cancelled"].includes(x.status)).length;
  const pendingVerificationOrders = orders().filter(x => x.type === "Stitch" && (x.stage === "Master Quality Check" || x.workerVerified === false)).length;
  const pendingPieceLogs = (S.work || []).filter(w => w.verified === false).length;
  const totalPendingVerifications = pendingVerificationOrders + pendingPieceLogs;

  let body = "";
  switch (S.tab) {
    case "Dashboard": body = renderDash(); break;
    case "Reviews": body = renderReviewsTab(); break;
    case "AI": body = renderAITab(); break;
    case "Orders": body = renderOrdersTab(); break;
    case "Stitching": body = renderStitchingTab(); break;
    case "Products": body = renderProductsTab(); break;
    case "Coupons": body = renderCouponsTab(); break;
    case "Customers": body = renderCustTab(); break;
    case "Workers": body = renderWorkersTab(); break;
    case "Salary": body = renderSalaryTab(); break;
    case "Team": body = renderTeamTab(); break;
    case "Settings": body = renderSettingsTab(); break;
    case "Data": body = renderDataBackupTab(); break;
    default: body = renderDash();
  }

  // Groups
  const groups = ["Overview", "Store", "Team & HR", "System"];
  const currentTab = TABS.find(t => t.id === S.tab) || { label: "Dashboard", icon: "📊" };

  $("pn").innerHTML = `
    <div class="admin-shell">
      <!-- Offcanvas Mobile Drawer Backdrop -->
      <div class="admin-sidebar-backdrop" id="adminSidebarBackdrop" onclick="closeMobileSidebar()"></div>

      <aside class="admin-sidebar ${S.navCollapsed ? "collapsed" : ""}" id="adminSidebar">
        <div class="sidebar-header">
          <div class="sidebar-logo">
            <i>S</i> <span>SAIFA ADMIN</span>
          </div>
          <button class="toggle-btn" onclick="toggleSidebar()" title="Toggle Navigation">
            <i>◀</i>
          </button>
        </div>
        <div class="sidebar-nav">
          ${groups.map(grp => `
            <div class="nav-group-title">${grp}</div>
            ${TABS.filter(t => t.group === grp).map(t => {
              let badge = "";
              if (t.id === "Orders" && oCount) badge = `<span class="nav-badge">${oCount}</span>`;
              if (t.id === "Reviews" && reviews().length) badge = `<span class="nav-badge" style="background:#f59e0b;color:#fff">${reviews().length}</span>`;
              if (t.id === "Stitching" && pendingVerificationOrders) badge = `<span class="nav-badge" style="background:var(--warn)">${pendingVerificationOrders} check</span>`;
              if (t.id === "Products" && lowCount) badge = `<span class="nav-badge" style="background:var(--warn)">${lowCount}</span>`;
              if (t.id === "Coupons") badge = `<span class="nav-badge" style="background:var(--br2)">${coupons().filter(c=>c.active).length}</span>`;
              if (t.id === "Salary" && pendingPieceLogs) badge = `<span class="nav-badge" style="background:var(--warn)">${pendingPieceLogs} log</span>`;
              return `
                <a class="admin-nav-item ${S.tab === t.id ? "active" : ""}" onclick="S.tab='${t.id}';closeMobileSidebar();panel()">
                  <i>${t.icon}</i> <span>${t.label}</span> ${badge}
                </a>
              `;
            }).join("")}
          `).join("")}
          <div style="margin-top:auto;padding-top:14px;border-top:1px solid var(--ln)">
            <a class="admin-nav-item" onclick="logoutSession()" style="cursor:pointer">
              <i>🚪</i> <span>Logout</span>
            </a>
          </div>
        </div>
      </aside>
      
      <main class="admin-main">
        <header class="admin-top-bar luxury-header">
          <!-- Left: Mobile Nav, Atelier Crest, Live Sync Indicator & Active Page -->
          <div class="header-left">
            <button class="menu-toggle-btn" onclick="toggleMobileSidebar()" title="Toggle Navigation">☰</button>
            <div class="header-titles">
              <div class="header-brand-line">
                <span class="header-crest-pill">
                  <span class="header-crest-icon">⚜️</span>
                  <span class="header-brand-tag">SAIFA ATELIER</span>
                </span>
                <span class="header-sync-pill" title="Real-time multi-device database synchronization active">
                  <span class="live-dot-pulse"></span>
                  <span class="sync-text">LIVE SYNC</span>
                </span>
              </div>
              <div class="header-title-row">
                <span class="header-page-icon">${currentTab.icon}</span>
                <h1 class="header-page-title">${currentTab.label}</h1>
              </div>
            </div>
          </div>

          <!-- Center: Dynamic Real-time Status Badges -->
          <div class="header-center">
            ${totalPendingVerifications ? `
              <div class="header-badge warn pulse-alert" onclick="S.tab='Stitching';S.sfilter='Verification';panel()" title="${totalPendingVerifications} garments and piece logs awaiting Master Quality verification & payment approval">
                <span class="badge-icon">🧵</span>
                <span><b>${totalPendingVerifications}</b> Verify Work</span>
              </div>
            ` : ""}
            ${payCount ? `
              <div class="header-badge warn pulse-alert" onclick="S.tab='Orders';S.ofilter='Pending Payment';panel()" title="Review claimed payments waiting for admin check">
                <span class="badge-icon">⚠️</span>
                <span><b>${payCount}</b> Verify Payments</span>
              </div>
            ` : ""}
            <div class="header-badge info" onclick="S.tab='Orders';panel()" title="Total active boutique orders">
              <span class="badge-icon">📦</span>
              <span><b>${oCount}</b> Active Orders</span>
            </div>
            <div class="header-badge gold" onclick="S.tab='Stitching';panel()" title="Stitching Queue in Production">
              <span class="badge-icon">✂️</span>
              <span><b>${stitchingCount}</b> In Tailoring</span>
            </div>
          </div>

          <!-- Right: Control Deck with Theme Toggle, Storefront, Backup & Admin Profile -->
          <div class="header-right">
            <!-- Theme Toggle Button -->
            <button class="theme-toggle-btn" onclick="toggleTheme()" title="Toggle Dark/Light Theme Mode" aria-label="Toggle Dark/Light Mode">
              <span class="theme-icon">${(typeof getTheme === 'function' ? getTheme() : 'dark') === 'dark' ? '☀️' : '🌙'}</span>
              <span class="theme-label">${(typeof getTheme === 'function' ? getTheme() : 'dark') === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
            </button>

            <!-- Storefront Quick Link -->
            <button class="btn s header-btn storefront-btn" onclick="closeAdminPanel()" title="Open Customer Storefront">
              🛍️ <span>Storefront</span>
            </button>

            <!-- Instant JSON Backup -->
            <button class="btn s header-btn backup-btn" onclick="exportDatabaseJSON()" title="Instant Backup Database JSON">
              💾 <span>Backup</span>
            </button>

            <!-- Admin Profile Badge & Logout -->
            <div class="admin-profile-pill">
              <div class="admin-avatar">👑</div>
              <div class="admin-info">
                <b>Saifa Admin</b>
                <span class="online-status"><span class="status-dot"></span>Online</span>
              </div>
              <button class="admin-logout-icon" onclick="logoutSession()" title="Logout of Admin Session">🚪</button>
            </div>
          </div>
        </header>
        ${body}
      </main>
    </div>
  `;
  $("pn").classList.add("on");
}

// ------------------------------------------
// 1. Dashboard View
// ------------------------------------------
function quickSetShopStatus(mode) {
  if (typeof setShopLiveStatus === "function") {
    setShopLiveStatus(mode);
  } else {
    S.cfg.shopStatus = mode;
    saveCfg();
  }
  toast(`Shop status changed to ${mode} mode! 🏬✅`);
  if (typeof panel === "function") panel();
  if (typeof renderFront === "function") renderFront();
}

function getLiveShopActivityList() {
  const os = orders().slice().sort((a,b)=>b.ts-a.ts).slice(0, 5);
  const wk = (S.work || []).slice().sort((a,b)=>b.ts-a.ts).slice(0, 5);
  
  const activities = [];
  os.forEach(o => {
    activities.push({
      icon: o.type === "Stitch" ? "✂️" : "🛍️",
      text: `Order <b>#${o.no}</b> placed by <b>${Security.escapeHTML(o.customer)}</b> (${R(o.total)} · ${E(o.pay)})`,
      time: new Date(o.ts).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
      ts: o.ts
    });
  });
  wk.forEach(w => {
    activities.push({
      icon: "🧵",
      text: `<b>${Security.escapeHTML(w.wn || 'Artisan')}</b> completed <b>${w.qty}</b> pcs of <b>${Security.escapeHTML(w.task)}</b> (+${R(w.qty * (w.rate || 0))})`,
      time: new Date(w.ts).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
      ts: w.ts
    });
  });
  activities.sort((a,b)=>b.ts-a.ts);
  return activities.slice(0, 6);
}

function renderDash() {
  const period = S.chartPeriod || "7days";
  const analytics = getRevenueAnalytics(period);
  const os = orders();
  const open = os.filter(x => !["Delivered", "Cancelled"].includes(x.status));
  const stitching = os.filter(x => x.type === "Stitch" && x.status !== "Delivered");
  const lowStock = products().filter(p => p.stock < 5);
  const claimed = os.filter(x => x.paid === "Claimed");
  const activeCoupons = coupons().filter(c => c.active);
  const c = S.cfg;
  const liveStatus = typeof getShopLiveStatus === "function" ? getShopLiveStatus() : { isOpen: true, label: "Open Now", badgeClass: "open" };

  return `
    <!-- Quick Admin-Controlled Shop Status Banner -->
    <div class="shop-status-control-banner">
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        <div style="width:40px;height:40px;border-radius:12px;background:var(--sf2);display:grid;place-items:center;font-size:1.3rem;border:1px solid var(--ln)">
          🏛️
        </div>
        <div>
          <div style="display:flex;align-items:center;gap:8px">
            <b>Boutique Shop Status:</b>
            <span class="shop-status-pill-badge ${liveStatus.badgeClass}">
              <span class="status-dot"></span> ${Security.escapeHTML(liveStatus.label)}
            </span>
          </div>
          <small style="color:var(--mu)">
            Hours: <b>${c.openTime || '10:30'} – ${c.closeTime || '21:00'}</b> · Mode: <b>${c.shopStatus || 'Auto'}</b> · Monday Rest Day: <b>${c.mondayClosed !== false ? 'Active' : 'Off'}</b>
          </small>
        </div>
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <button class="btn s ${c.shopStatus === 'Auto' ? 'p' : ''}" onclick="quickSetShopStatus('Auto')">🔄 Auto Schedule</button>
        <button class="btn s ${c.shopStatus === 'Online' ? 'ok' : ''}" onclick="quickSetShopStatus('Online')">🟢 Force Online</button>
        <button class="btn s ${c.shopStatus === 'Offline' ? 'd' : ''}" onclick="quickSetShopStatus('Offline')">🔴 Force Offline</button>
      </div>
    </div>

    <!-- Dedicated Financial Integrity & Payment Segregation Deck -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:14px;margin-bottom:18px">
      <!-- 1. Verified Paid Revenue -->
      <div class="box" style="margin:0;border:1.5px solid var(--ok);background:color-mix(in srgb,var(--ok) 6%,var(--sf));border-radius:16px;padding:16px 18px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div>
            <span style="font-size:0.75rem;font-weight:700;color:var(--ok);letter-spacing:0.06em;text-transform:uppercase">
              🟢 Confirmed Paid Revenue
            </span>
            <div style="font-size:1.85rem;font-weight:800;color:var(--ok);margin:4px 0 2px">
              ${R(analytics.totalPaidRev)}
            </div>
            <div style="font-size:0.8rem;color:var(--mu)">
              <b>${analytics.paidCount}</b> verified bills realized in bank / UPI / shop cash.
            </div>
          </div>
          <span style="font-size:2rem">💰</span>
        </div>
        <div style="margin-top:10px;padding-top:8px;border-top:1px dashed color-mix(in srgb,var(--ok) 30%,transparent);display:flex;justify-content:space-between;align-items:center;font-size:0.78rem">
          <span style="color:var(--ok);font-weight:600">✓ Official Realized Revenue</span>
          <button class="btn s ok" style="padding:3px 10px;font-size:0.74rem" onclick="S.dashBillFilter='Paid';panel()">View Paid Bills (${analytics.paidCount}) ➔</button>
        </div>
      </div>

      <!-- 2. Claimed Payments (Awaiting Verification) -->
      <div class="box" style="margin:0;border:1.5px solid var(--warn);background:color-mix(in srgb,var(--warn) 7%,var(--sf));border-radius:16px;padding:16px 18px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div>
            <span style="font-size:0.75rem;font-weight:700;color:var(--warn);letter-spacing:0.06em;text-transform:uppercase">
              🟡 Customer Claimed Payments
            </span>
            <div style="font-size:1.85rem;font-weight:800;color:var(--warn);margin:4px 0 2px">
              ${R(analytics.totalClaimedRev)}
            </div>
            <div style="font-size:0.8rem;color:var(--mu)">
              <b>${analytics.claimedCount}</b> payment claims pending verification.
            </div>
          </div>
          <span style="font-size:2rem">⚠️</span>
        </div>
        <div style="margin-top:10px;padding-top:8px;border-top:1px dashed color-mix(in srgb,var(--warn) 30%,transparent);display:flex;justify-content:space-between;align-items:center;font-size:0.78rem">
          <span style="color:var(--warn);font-weight:600">Pending Bank Check · Excluded from Revenue</span>
          <button class="btn s" style="padding:3px 10px;font-size:0.74rem;border-color:var(--warn);color:var(--warn)" onclick="S.dashBillFilter='Claimed';panel()">Review Claims (${analytics.claimedCount}) ➔</button>
        </div>
      </div>

      <!-- 3. Unpaid & COD Balance -->
      <div class="box" style="margin:0;border:1.5px solid var(--bad);background:color-mix(in srgb,var(--bad) 6%,var(--sf));border-radius:16px;padding:16px 18px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div>
            <span style="font-size:0.75rem;font-weight:700;color:var(--bad);letter-spacing:0.06em;text-transform:uppercase">
              🔴 Unpaid &amp; Pending Balance Due
            </span>
            <div style="font-size:1.85rem;font-weight:800;color:var(--bad);margin:4px 0 2px">
              ${R(analytics.totalUnpaidRev)}
            </div>
            <div style="font-size:0.8rem;color:var(--mu)">
              <b>${analytics.unpaidCount}</b> bills pending payment upon delivery/fitting.
            </div>
          </div>
          <span style="font-size:2rem">⏳</span>
        </div>
        <div style="margin-top:10px;padding-top:8px;border-top:1px dashed color-mix(in srgb,var(--bad) 30%,transparent);display:flex;justify-content:space-between;align-items:center;font-size:0.78rem">
          <span style="color:var(--bad);font-weight:600">Not Paid Yet · Excluded from Revenue</span>
          <button class="btn s" style="padding:3px 10px;font-size:0.74rem;border-color:var(--bad);color:var(--bad)" onclick="S.dashBillFilter='Unpaid';panel()">View Due (${analytics.unpaidCount}) ➔</button>
        </div>
      </div>
    </div>

    <!-- Top KPI Grid: Comprehensive Revenue & Volume Metrics -->
    <div class="kpi-grid" style="grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));">
      <!-- 1. Today's Revenue -->
      <div class="kpi-card" style="border-top: 3px solid var(--ok);">
        <div class="kpi-icon">💵</div>
        <small>Today's Confirmed Sales</small>
        <b style="color:var(--ok)">${R(analytics.todayPaidRev)}</b>
        <span class="trend up">${analytics.todayOrders} paid order(s) today</span>
      </div>

      <!-- 2. This Week's Revenue -->
      <div class="kpi-card" style="border-top: 3px solid var(--br);">
        <div class="kpi-icon">📅</div>
        <small>This Week's Confirmed Sales</small>
        <b>${R(analytics.weekPaidRev)}</b>
        <span class="trend up">${analytics.weekOrders} paid orders (7 days)</span>
      </div>

      <!-- 3. This Month's Revenue -->
      <div class="kpi-card" style="border-top: 3px solid var(--gd);">
        <div class="kpi-icon">🗓️</div>
        <small>Current Month Total (Paid)</small>
        <b style="color:var(--gd)">${R(analytics.monthPaidRev)}</b>
        <span class="trend up">${analytics.monthOrders} paid in ${new Date().toLocaleDateString('en-IN', {month: 'long'})}</span>
      </div>

      <!-- 4. Highest Revenue Day -->
      <div class="kpi-card" style="border-top: 3px solid #f59e0b; background: linear-gradient(135deg, color-mix(in srgb, #f59e0b 8%, var(--sf)), var(--sf));">
        <div class="kpi-icon">⭐</div>
        <small>Highest Paid Day</small>
        <b style="color:#d97706">${R(analytics.highestDay.amount)}</b>
        <span class="trend" style="color:#b45309;font-weight:600">🌟 Peak: ${analytics.highestDay.dateFormatted}</span>
      </div>

      <!-- 5. Lifetime Store Revenue -->
      <div class="kpi-card">
        <div class="kpi-icon">💰</div>
        <small>Total Realized Revenue</small>
        <b>${R(analytics.lifetimeRev)}</b>
        <span class="trend">${analytics.paidCount} paid / ${analytics.totalOrdersCount} orders</span>
      </div>

      <!-- 6. Active In-Progress Orders -->
      <div class="kpi-card">
        <div class="kpi-icon">📦</div>
        <small>Active Orders</small>
        <b>${open.length}</b>
        <span class="trend alert">${open.length} in production / intake</span>
      </div>

      <!-- 7. Bespoke Stitching Queue -->
      <div class="kpi-card">
        <div class="kpi-icon">✂️</div>
        <small>Bespoke Stitching</small>
        <b style="color:var(--br)">${stitching.length}</b>
        <span class="trend">Tailoring workstation queue</span>
      </div>

      <!-- 8. Payments to Verify -->
      <div class="kpi-card" style="${claimed.length ? 'border-top:3px solid var(--warn);background:color-mix(in srgb,var(--warn) 6%,var(--sf))' : ''}">
        <div class="kpi-icon">💳</div>
        <small>Payments To Verify</small>
        <b style="color:${claimed.length ? 'var(--warn)' : 'var(--ok)'}">${claimed.length}</b>
        <span class="trend ${claimed.length ? 'alert' : ''}">${claimed.length ? '⚠️ Customer Claimed UPI' : '✅ All verified'}</span>
      </div>

      <!-- 9. Client Ratings & Reviews -->
      <div class="kpi-card" style="border-top:3px solid #f59e0b;cursor:pointer;background:linear-gradient(135deg,color-mix(in srgb,#f59e0b 6%,var(--sf)),var(--sf))" onclick="S.tab='Reviews';panel()" title="Click to view private client reviews & moderate ratings">
        <div class="kpi-icon">⭐</div>
        <small>Client Ratings &amp; Reviews</small>
        <b style="color:#d97706">${(typeof getShopRatingStats === 'function' ? getShopRatingStats().averageFormatted : '5.0')} ★</b>
        <span class="trend up" style="color:#b45309;font-weight:600">${reviews().length} verified reviews · Manage ➔</span>
      </div>
    </div>

    <!-- Main Chart & Action Center Layout -->
    <div style="display:grid;grid-template-columns:1.8fr 1.2fr;gap:18px;margin-bottom:20px">
      <!-- Revenue Analytics Chart Box -->
      <div class="box" style="margin:0;display:flex;flex-direction:column;justify-content:space-between">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
          <div>
            <b>📈 Revenue Trends &amp; Daily Breakdown</b>
            <p style="font-size:0.78rem;color:var(--mu);margin:2px 0 0">
              Peak revenue: <b style="color:var(--gd)">${R(analytics.peakChartAmt)}</b> · Highest day highlighted with star
            </p>
          </div>
          <!-- Timeframe selector buttons -->
          <div class="tabs" style="margin:0;justify-content:flex-end">
            <span class="chip ${period === '7days' ? 'on' : ''}" onclick="S.chartPeriod='7days';panel()">Last 7 Days</span>
            <span class="chip ${period === '30days' ? 'on' : ''}" onclick="S.chartPeriod='30days';panel()">Last 30 Days</span>
            <span class="chip ${period === 'thisMonth' ? 'on' : ''}" onclick="S.chartPeriod='thisMonth';panel()">This Month</span>
          </div>
        </div>

        <!-- Interactive SVG Chart -->
        <div style="margin-top:14px;overflow-x:auto">
          <svg viewBox="0 0 520 180" style="width:100%;min-width:380px;height:auto;max-height:220px;overflow:visible">
            <!-- Grid lines -->
            <line x1="20" y1="30" x2="500" y2="30" stroke="var(--ln)" stroke-dasharray="3,3" opacity="0.6"/>
            <line x1="20" y1="80" x2="500" y2="80" stroke="var(--ln)" stroke-dasharray="3,3" opacity="0.6"/>
            <line x1="20" y1="130" x2="500" y2="130" stroke="var(--ln)" stroke-dasharray="3,3" opacity="0.6"/>

            ${(() => {
              const count = analytics.series.length;
              const barWidth = Math.max(10, Math.min(38, Math.floor(460 / count) - 8));
              const gap = Math.max(4, Math.floor((480 - (barWidth * count)) / count));
              return analytics.series.map((item, idx) => {
                const x = 24 + idx * (barWidth + gap);
                const height = Math.max(4, (item.amount / analytics.peakChartAmt) * 110);
                const y = 140 - height;
                const isPeak = item.isHighest && item.amount > 0;
                return `
                  <g class="chart-bar-group" style="cursor:pointer" onclick="toast('${E(item.fullDate)}: ${R(item.amount)} (${item.ordersCount} orders)')">
                    <title>${E(item.fullDate)}: ₹${item.amount} (${item.ordersCount} orders)</title>
                    ${isPeak ? `
                      <text x="${x + barWidth/2}" y="${y - 8}" text-anchor="middle" font-size="12">⭐</text>
                    ` : ''}
                    <rect x="${x}" y="${y}" width="${barWidth}" height="${height}" rx="5" 
                      fill="${isPeak ? 'url(#peakGrad)' : 'url(#barGrad)'}"
                      style="transition:height 0.4s cubic-bezier(0.16,1,0.3,1)" />
                    <text x="${x + barWidth/2}" y="156" font-size="9" text-anchor="middle" fill="var(--mu)">
                      ${item.label}
                    </text>
                  </g>
                `;
              }).join("");
            })()}
            <!-- Gradients -->
            <defs>
              <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="var(--br)"/>
                <stop offset="100%" stop-color="var(--gd)"/>
              </linearGradient>
              <linearGradient id="peakGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#f59e0b"/>
                <stop offset="100%" stop-color="#d97706"/>
              </linearGradient>
            </defs>
          </svg>
        </div>

        <!-- Summary Footer under Chart -->
        <div style="display:flex;justify-content:space-between;align-items:center;padding-top:12px;margin-top:10px;border-top:1px solid var(--ln);font-size:0.84rem">
          <span>Selected Period Total: <b style="color:var(--br)">${R(analytics.series.reduce((a,s)=>a+s.amount,0))}</b></span>
          <span style="color:var(--mu)">Total Orders in Period: <b>${analytics.series.reduce((a,s)=>a+s.ordersCount,0)}</b></span>
        </div>
      </div>

      <!-- Action Center & Urgent Verifications Box -->
      <div class="box" style="margin:0;display:flex;flex-direction:column;justify-content:space-between">
        <div>
          <b>🚨 Payment &amp; Production Action Center</b>
          <p style="font-size:0.78rem;color:var(--mu);margin:2px 0 12px">Instant 1-click payment verification &amp; shop alerts</p>

          <div style="display:flex;flex-direction:column;gap:10px;max-height:280px;overflow-y:auto">
            ${(() => {
              const pendingV = orders().filter(o => o.type === "Stitch" && (o.stage === "Master Quality Check" || o.workerVerified === false));
              const pendingLogs = (S.work || []).filter(w => w.verified === false);
              if (!pendingV.length && !pendingLogs.length) return "";
              return `
                <div style="padding:12px;background:color-mix(in srgb,var(--warn) 14%,var(--sf));border-radius:14px;border:1.5px solid var(--warn)">
                  <div style="display:flex;justify-content:space-between;align-items:center">
                    <b style="color:var(--warn)">🧵 ${pendingV.length + pendingLogs.length} Task(s) Awaiting Quality Check &amp; Wage Credit</b>
                    <span class="pill w">Verification</span>
                  </div>
                  <p style="margin:4px 0 8px;font-size:0.78rem;color:var(--mu)">
                    ${pendingV.length} bespoke garment(s) &amp; ${pendingLogs.length} piece log(s) completed by tailors. Inspect craft and approve to credit wages.
                  </p>
                  <div style="display:flex;gap:6px">
                    ${pendingV.length ? `<button class="btn s p" style="flex:1" onclick="S.tab='Stitching';S.sfilter='Verification';panel()">Inspect Garments (${pendingV.length})</button>` : ""}
                    ${pendingLogs.length ? `<button class="btn s" style="flex:1" onclick="S.tab='Salary';panel()">Piece Logs (${pendingLogs.length})</button>` : ""}
                  </div>
                </div>
              `;
            })()}

            ${claimed.length ? `
              <div style="padding:12px;background:color-mix(in srgb,var(--warn) 14%,var(--sf));border-radius:14px;border:1px solid var(--warn)">
                <div style="display:flex;justify-content:space-between;align-items:center">
                  <b>⚠️ ${claimed.length} Payment(s) Awaiting Verification</b>
                  <span class="pill w">Action Required</span>
                </div>
                <div style="display:flex;flex-direction:column;gap:8px;margin-top:10px">
                  ${claimed.map(o => `
                    <div style="display:flex;justify-content:space-between;align-items:center;background:var(--sf);padding:8px 10px;border-radius:10px;font-size:0.82rem">
                      <div>
                        <b>#${E(o.no)}</b> · ${E(o.customer)}<br>
                        <span style="color:var(--mu)">${E(o.pay)} · <b>${R(o.total)}</b></span>
                      </div>
                      <button class="btn s g" style="padding:4px 10px;font-size:0.78rem" onclick="onOrderPaymentChange('${o.id}', 'Paid')" title="Confirm that money was received in bank/UPI">
                        ✅ Confirm ₹${o.total}
                      </button>
                    </div>
                  `).join("")}
                </div>
              </div>
            ` : `
              <div style="padding:12px;background:color-mix(in srgb,var(--ok) 12%,var(--sf));border-radius:14px;border:1px solid var(--ok);font-size:0.84rem;display:flex;align-items:center;gap:8px">
                <span style="font-size:1.3rem">✅</span>
                <span><b>All payments verified!</b> No pending UPI customer claims at this moment.</span>
              </div>
            `}

            ${lowStock.length ? `
              <div style="padding:12px;background:color-mix(in srgb,var(--bad) 10%,var(--sf));border-radius:14px;border:1px solid var(--bad);font-size:0.84rem">
                <b>Inventory Alert: ${lowStock.length} Low Stock Item(s)</b>
                <p style="margin:4px 0 8px;font-size:0.78rem;color:var(--mu)">${lowStock.map(p => `${p.name} (${p.stock} left)`).join(", ")}</p>
                <button class="btn s" onclick="S.tab='Products';panel()">Restock Products &amp; Fabrics 👗</button>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Quick Store Health Metrics -->
        <div style="padding-top:12px;margin-top:14px;border-top:1px solid var(--ln);display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:0.82rem">
          <div>
            <span style="color:var(--mu)">Verified Collections:</span><br>
            <b style="color:var(--ok)">${R(analytics.totalPaidRev)}</b>
          </div>
          <div>
            <span style="color:var(--mu)">Uncollected / Due:</span><br>
            <b style="color:var(--bad)">${R(analytics.totalUnpaidRev)}</b>
          </div>
        </div>
      </div>
    </div>

    <!-- Revenue Segments & Category Breakdown -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(320px, 1fr));gap:18px;margin-bottom:20px">
      <!-- Stitching vs Readymade Split -->
      <div class="box" style="margin:0">
        <b>👗 Sales Revenue by Boutique Segment</b>
        <div style="margin:14px 0 8px">
          <div style="display:flex;justify-content:space-between;font-size:0.85rem;margin-bottom:6px">
            <span>✂️ Bespoke Stitching: <b>${R(analytics.stitchingRev)}</b></span>
            <span>👗 Ready-to-Wear: <b>${R(analytics.readymadeRev)}</b></span>
          </div>
          <div style="height:12px;border-radius:99px;background:var(--ln);overflow:hidden;display:flex">
            <div style="width:${analytics.lifetimeRev ? (analytics.stitchingRev / analytics.lifetimeRev * 100) : 50}%;background:linear-gradient(90deg,var(--br),var(--br2))" title="Stitching"></div>
            <div style="width:${analytics.lifetimeRev ? (analytics.readymadeRev / analytics.lifetimeRev * 100) : 50}%;background:linear-gradient(90deg,var(--gd),#d97706)" title="Readymade"></div>
          </div>
        </div>
        <p style="font-size:0.8rem;color:var(--mu);margin-top:8px">
          Bespoke tailoring accounts for <b>${analytics.lifetimeRev ? Math.round(analytics.stitchingRev / analytics.lifetimeRev * 100) : 0}%</b> of store earnings.
        </p>
      </div>

      <!-- Top Garments & Payment Modes -->
      <div class="box" style="margin:0">
        <b>⭐ Top Stitched Garments &amp; Payment Modes</b>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px;font-size:0.84rem">
          <div>
            <span class="eyebrow" style="margin-bottom:4px">Most Popular Fits</span>
            ${analytics.topGarments.map(([g, cnt]) => `
              <div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px dashed var(--ln)">
                <span>${E(g)}</span>
                <b>${cnt} orders</b>
              </div>
            `).join("") || '<p style="color:var(--mu)">No garments recorded</p>'}
          </div>
          <div>
            <span class="eyebrow" style="margin-bottom:4px">Payment Channels</span>
            <div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px dashed var(--ln)">
              <span>📲 UPI / Online:</span>
              <b>${R(analytics.upiRev)}</b>
            </div>
            <div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px dashed var(--ln)">
              <span>💵 Cash / Counter:</span>
              <b>${R(analytics.cashRev)}</b>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Artisan Performance Leaderboard & Live Shop Activity Stream -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(320px, 1fr));gap:18px;margin-bottom:20px">
      <!-- Artisan Leaderboard Card -->
      <div class="box" style="margin:0">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
          <div>
            <b>🧵 Artisan Performance &amp; Wages Leaderboard</b>
            <p style="font-size:0.78rem;color:var(--mu);margin:2px 0 0">Ranking by completed garments &amp; fair piece-rate earnings (${Security.escapeHTML(curMon)})</p>
          </div>
          <button class="btn s" onclick="S.tab='Workers';panel()">Artisans ➔</button>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${(() => {
            const rankedWorkers = workers().map(w => {
              const stats = typeof getWorkerMonthlyStats === "function" ? getWorkerMonthlyStats(w.id, curMon) : { totalPieces: 0, totalEarned: 0 };
              return { ...w, pieces: stats.totalPieces, earned: stats.totalEarned };
            }).sort((a, b) => b.pieces - a.pieces);

            return rankedWorkers.map((w, idx) => `
              <div style="display:flex;justify-content:space-between;align-items:center;background:var(--sf2);padding:8px 12px;border-radius:12px;font-size:0.84rem">
                <div style="display:flex;align-items:center;gap:10px">
                  <span style="font-size:1.1rem">${idx === 0 ? '🏆' : (idx === 1 ? '🥈' : '🥉')}</span>
                  <div>
                    <b>${Security.escapeHTML(w.name)}</b><br>
                    <small style="color:var(--mu)">${Security.escapeHTML(w.role)}</small>
                  </div>
                </div>
                <div style="text-align:right">
                  <b style="color:var(--br)">${w.pieces} pcs</b><br>
                  <span style="color:var(--ok);font-size:0.78rem;font-weight:600">${R(w.earned)}</span>
                </div>
              </div>
            `).join("") || '<p style="color:var(--mu);text-align:center;padding:12px">No artisan records logged yet.</p>';
          })()}
        </div>
      </div>

      <!-- Live Shop Activity Feed -->
      <div class="box" style="margin:0">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
          <div>
            <b>⚡ Live Shop Activity &amp; Audit Stream</b>
            <p style="font-size:0.78rem;color:var(--mu);margin:2px 0 0">Real-time order intakes, artisan submissions &amp; transactions</p>
          </div>
          <span class="live" style="font-size:0.75rem">Live Sync</span>
        </div>
        <div class="activity-stream">
          ${getLiveShopActivityList().map(act => `
            <div class="activity-item">
              <div class="activity-icon">${act.icon}</div>
              <div style="flex:1">
                <div>${act.text}</div>
              </div>
              <span class="activity-time">${act.time}</span>
            </div>
          `).join("") || '<p style="color:var(--mu);text-align:center;padding:16px">No recent activity recorded today.</p>'}
        </div>
      </div>
    </div>

    <!-- Dedicated Boutique Financial Bills Ledger & Payment Verification Center -->
    ${(() => {
      const billFilter = S.dashBillFilter || "All";
      const billSearch = (S.dashBillSearch || "").trim().toLowerCase();
      let billList = os.filter(x => x.status !== "Cancelled");
      if (billFilter === "Paid") billList = billList.filter(x => x.paid === "Paid");
      else if (billFilter === "Claimed") billList = billList.filter(x => x.paid === "Claimed");
      else if (billFilter === "Unpaid") billList = billList.filter(x => x.paid === "Unpaid" || !x.paid);

      if (billSearch) {
        billList = billList.filter(x => 
          (x.no && String(x.no).toLowerCase().includes(billSearch)) ||
          (x.customer && x.customer.toLowerCase().includes(billSearch)) ||
          (x.phone && x.phone.includes(billSearch)) ||
          (x.cid && x.cid.toLowerCase().includes(billSearch)) ||
          (x.pay && x.pay.toLowerCase().includes(billSearch))
        );
      }

      billList.sort((a, b) => b.ts - a.ts);
      const displayBills = billList.slice(0, 10);

      return `
        <div class="box" style="margin-bottom:20px;border-top:3px solid var(--br)">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
            <div>
              <b>📑 Boutique Financial Ledger &amp; Payment Reconciliation</b>
              <p style="font-size:0.8rem;color:var(--mu);margin:3px 0 0">
                Organized breakdown of Paid, Claimed, and Unpaid bills. Revenue is counted <b>only</b> on confirmed payment.
              </p>
            </div>
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
              <button class="btn s" onclick="exportOrdersCSV()">📄 Export Bills CSV</button>
              <button class="btn s p" onclick="S.tab='Orders';panel()">All Orders (${os.length}) ➔</button>
            </div>
          </div>

          <!-- Payment Filter Tabs & Search Bar -->
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-top:14px;padding-top:12px;border-top:1px solid var(--ln)">
            <div class="tabs" style="justify-content:flex-start;margin:0">
              <span class="chip ${billFilter === 'All' ? 'on' : ''}" onclick="S.dashBillFilter='All';panel()">All Bills (${analytics.totalOrdersCount})</span>
              <span class="chip ${billFilter === 'Paid' ? 'on' : ''}" style="${analytics.paidCount ? 'color:var(--ok);font-weight:700' : ''}" onclick="S.dashBillFilter='Paid';panel()">🟢 Paid (${analytics.paidCount}) · ${R(analytics.totalPaidRev)}</span>
              <span class="chip ${billFilter === 'Claimed' ? 'on' : ''}" style="${analytics.claimedCount ? 'border-color:var(--warn);color:var(--warn);font-weight:700' : ''}" onclick="S.dashBillFilter='Claimed';panel()">🟡 Claimed (${analytics.claimedCount}) · ${R(analytics.totalClaimedRev)}</span>
              <span class="chip ${billFilter === 'Unpaid' ? 'on' : ''}" style="${analytics.unpaidCount ? 'border-color:var(--bad);color:var(--bad);font-weight:700' : ''}" onclick="S.dashBillFilter='Unpaid';panel()">🔴 Unpaid (${analytics.unpaidCount}) · ${R(analytics.totalUnpaidRev)}</span>
            </div>
            <div style="display:flex;align-items:center;gap:6px">
              <input id="dashBillSearchInput" placeholder="🔍 Search bill #, client, phone..." value="${Security.escapeHTML(S.dashBillSearch || '')}" oninput="S.dashBillSearch=this.value.trim().toLowerCase();panel()" style="margin:0;padding:6px 12px;font-size:0.84rem;width:220px">
              ${S.dashBillSearch ? `<button class="btn s" onclick="S.dashBillSearch='';panel()" style="padding:6px 10px">✕</button>` : ''}
            </div>
          </div>

          <!-- Bills Table -->
          <div style="overflow-x:auto;margin-top:14px">
            <table>
              <thead>
                <tr>
                  <th>Bill / Invoice #</th>
                  <th>Date</th>
                  <th>Client</th>
                  <th>Type &amp; Garment / Items</th>
                  <th>Amount ₹</th>
                  <th>Payment Mode</th>
                  <th>Payment Status</th>
                  <th style="text-align:right">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${displayBills.map(o => {
                  const isPaid = o.paid === "Paid";
                  const isClaimed = o.paid === "Claimed";
                  const statusPill = isPaid 
                    ? `<span class="pill ok" style="font-weight:700">✓ Paid</span>` 
                    : isClaimed 
                    ? `<span class="pill w" style="font-weight:700">⚠️ Claimed</span>` 
                    : `<span class="pill bad" style="font-weight:700">🔴 Unpaid</span>`;

                  return `
                    <tr>
                      <td>
                        <b style="color:var(--tx)">#${Security.escapeHTML(o.no)}</b><br>
                        <small style="color:var(--mu)">ID: ${Security.escapeHTML(o.cid || 'N/A')}</small>
                      </td>
                      <td style="font-size:0.82rem;white-space:nowrap">${new Date(o.ts).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</td>
                      <td>
                        <b>${Security.escapeHTML(o.customer)}</b><br>
                        <small style="color:var(--mu)">+91 ${Security.escapeHTML(o.phone)}</small>
                      </td>
                      <td>
                        <span class="tag" style="font-size:0.72rem">${o.type === 'Stitch' ? '✂️ Stitching' : '👗 Readymade'}</span>
                        <small style="color:var(--tx);font-weight:600;display:block;margin-top:2px">
                          ${Security.escapeHTML(o.type === 'Stitch' ? (o.garment || 'Custom Stitch') : (o.items || []).map(i => i.n + ' (x' + i.q + ')').join(', ') || 'Boutique Collection')}
                        </small>
                      </td>
                      <td>
                        <b style="font-size:0.95rem;color:${isPaid ? 'var(--ok)' : isClaimed ? 'var(--warn)' : 'var(--tx)'}">${R(o.total)}</b>
                        ${o.discount ? `<br><small style="color:var(--ok)">-${R(o.discount)} off</small>` : ''}
                      </td>
                      <td>
                        <span style="font-size:0.82rem;color:var(--mu)">${Security.escapeHTML(o.pay || 'UPI')}</span>
                      </td>
                      <td>
                        ${statusPill}
                      </td>
                      <td style="text-align:right">
                        <div style="display:inline-flex;gap:4px">
                          ${!isPaid ? `
                            <button class="btn s ok" style="padding:4px 8px;font-size:0.75rem;font-weight:700" onclick="onOrderPaymentChange('${o.id}', 'Paid')" title="Confirm that money is received in bank/cash">
                              ✓ Verify Paid
                            </button>
                          ` : ''}
                          <button class="btn s" style="padding:4px 8px;font-size:0.75rem" onclick="printInvoice('${o.id}')" title="Print Professional Boutique Invoice">
                            🧾 Receipt
                          </button>
                          <button class="btn s g" style="padding:4px 8px;font-size:0.75rem" onclick="sendWhatsAppInvoice('${o.id}')" title="Send Invoice on WhatsApp">
                            💬
                          </button>
                        </div>
                      </td>
                    </tr>
                  `;
                }).join("") || `<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--mu)">No bills match the selected filter "${Security.escapeHTML(billFilter)}".</td></tr>`}
              </tbody>
            </table>
          </div>
          ${billList.length > 10 ? `
            <div style="text-align:center;margin-top:12px;padding-top:10px;border-top:1px solid var(--ln);font-size:0.84rem">
              <span style="color:var(--mu)">Showing 10 of <b>${billList.length}</b> bills in this view.</span>
              <button class="btn s" style="margin-left:8px" onclick="S.tab='Orders';S.ofilter='${billFilter === 'Paid' ? 'Paid' : billFilter === 'Claimed' ? 'Pending Payment' : 'All'}';panel()">
                View All ${billList.length} Orders ➔
              </button>
            </div>
          ` : ''}
        </div>
      `;
    })()}

    <!-- AI Boutique Health Score & Strategy -->
    <div class="box">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:10px">
        <div>
          <b>✨ SAIFA AI Boutique Strategy &amp; Revenue Intelligence</b>
          <p style="font-size:0.8rem;color:var(--mu);margin:2px 0 0">Real-time AI diagnostic across cash flow, artisan workload and festival demand</p>
        </div>
        <button class="btn s p" onclick="refreshDashboardAI()">Refresh AI Insights</button>
      </div>
      <div id="dashAIOutput" class="ai" style="display:block">
        Generating smart business insights...
      </div>
    </div>
  `;
}

async function refreshDashboardAI() {
  const el = $("dashAIOutput");
  if (el) el.textContent = "Analyzing sales trends, stitching pipeline and stock turnover...";
  const audit = await AI.generateBusinessAudit();
  if (el) el.textContent = audit;
}

// ------------------------------------------
// 2. Smart Orders Page with Invoice & WhatsApp
// ------------------------------------------
function renderOrdersTab() {
  const f = S.ofilter;
  const list = orders()
    .filter(o => f === "All" || o.status === f || (f === "Pending Payment" && o.paid !== "Paid"))
    .sort((a, b) => b.ts - a.ts);

  return `
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:14px">
      <div class="tabs" style="justify-content:flex-start;margin:0">
        ${["All", ...ST, "Pending Payment"].map(s => `
          <span class="chip ${f === s ? "on" : ""}" onclick="S.ofilter='${s}';panel()">${s}</span>
        `).join("")}
      </div>
      <button class="btn s" onclick="exportOrdersCSV()">📄 Export Orders to CSV</button>
    </div>

    <div class="box">
      <table>
        <thead>
          <tr>
            <th>Order No</th>
            <th>Date</th>
            <th>Client</th>
            <th>Type / Garment</th>
            <th>Total</th>
            <th>Payment</th>
            <th>Status Update</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${list.map(o => `
            <tr>
              <td>
                <b>${E(o.no)}</b><br>
                <small style="color:var(--mu)">${E(o.type)}</small>
                ${o.coupon ? `<br><span class="pill ok" style="font-size:0.65rem">Coupon: ${E(o.coupon)} (-${R(o.discount)})</span>` : ""}
              </td>
              <td>${new Date(o.ts).toLocaleDateString("en-IN")}<br><small style="color:var(--mu)">${new Date(o.ts).toLocaleTimeString("en-IN", {hour: '2-digit', minute: '2-digit'})}</small></td>
              <td>
                <b>${E(o.customer)}</b><br>
                <small>${E(o.phone)} · <b>${E(o.cid)}</b></small>
              </td>
              <td>
                <b>${E(o.type === "Stitch" ? o.garment : (o.items || []).map(i => i.n + (i.size || i.color ? ` [${[i.size, i.color].filter(Boolean).join(" · ")}]` : "") + " × " + i.q).join(", "))}</b>
                ${o.note ? `<br><small style="color:var(--mu)">📝 ${E(o.note)}</small>` : ""}
              </td>
              <td>
                <b>${R(o.total)}</b><br>
                <small style="color:var(--mu)">${E(o.pay)}</small>
              </td>
              <td>
                <select style="margin:0;padding:4px 8px;font-size:0.8rem;border-radius:8px" onchange="onOrderPaymentChange('${o.id}', this.value)">
                  ${PAY.map(s => `<option ${s === o.paid ? "selected" : ""}>${s}</option>`).join("")}
                </select>
              </td>
              <td>
                <select style="margin:0;padding:4px 8px;font-size:0.8rem;border-radius:8px" onchange="onOrderStatusChange('${o.id}', this.value)">
                  ${ST.map(s => `<option ${s === o.status ? "selected" : ""}>${s}</option>`).join("")}
                </select>
              </td>
              <td>
                <div style="display:flex;gap:4px">
                  <button class="btn s" title="Print Invoice" onclick="printInvoice('${o.id}')">🧾</button>
                  <button class="btn s g" title="WhatsApp Customer Update" onclick="sendWhatsAppUpdate('${o.id}')">💬</button>
                  <button class="btn s" title="Edit Order Details" onclick="openOrderEdit('${o.id}')">✏️</button>
                  <button class="btn s d" title="Delete" onclick="requestDelete('orders','${o.id}')">✕</button>
                </div>
              </td>
            </tr>
          `).join("") || `<tr><td colspan="8" style="text-align:center;padding:20px;color:var(--mu)">No orders found for filter "${f}".</td></tr>`}
        </tbody>
      </table>
    </div>
  `;
}

function onOrderStatusChange(orderId, newStatus) {
  updateOrderStatus(orderId, newStatus);
  toast(`Order updated to "${newStatus}" ✅`);
  if (typeof panel === "function") panel();
  if (typeof renderFront === "function") renderFront();
}

function onOrderPaymentChange(orderId, newPaidStatus) {
  const o = orders().find(x => x.id == orderId);
  updateOrderPayment(orderId, newPaidStatus);
  toast(`Order #${o ? o.no : ''} payment updated to "${newPaidStatus}" 💰`);
}

function onAssignWorker(orderId, workerId) {
  const o = orders().find(x => x.id == orderId);
  const w = workers().find(x => x.id == workerId);
  upd("orders", orderId, { worker: workerId }).then(() => {
    if (typeof Realtime !== "undefined") {
      Realtime.broadcast("ORDER_UPDATED", { orderId, patch: { worker: workerId } });
    }
    toast(`Order #${o ? o.no : ''} assigned to ${w ? w.name : 'Unassigned'} 🧵`);
    if (typeof panel === "function") panel();
  });
}

function payPill(paid) {
  const p = paid || "Unpaid";
  const cls = p === "Paid" ? "ok" : p === "Claimed" ? "w" : "bad";
  return `<span class="pill ${cls}">${E(p)}</span>`;
}

function stSel(o) {
  return `
    <select onchange="onOrderStatusChange('${o.id}', this.value)" style="margin:0;padding:6px 10px;border-radius:10px;font-size:0.85rem">
      ${ST.map(s => `<option value="${s}" ${s === o.status ? "selected" : ""}>${s}</option>`).join("")}
    </select>
  `;
}

function sendWhatsAppUpdate(orderId) {
  const o = orders().find(x => x.id == orderId);
  if (!o) return;
  const msgType = o.status === "Ready" ? "ready" : o.status === "Delivered" ? "delivered" : o.status === "Stitching" ? "stitching" : "default";
  const msg = AI.draftCustomerUpdate(o, msgType);
  const cleanPhone = np(o.phone);
  window.open(`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(msg)}`, "_blank");
}

function toggleInvoicePrintFormat(format) {
  const el = $("invoice-print-area");
  const a4Btn = $("btn-inv-a4");
  const thermalBtn = $("btn-inv-thermal");
  if (!el) return;
  if (format === "thermal") {
    el.classList.add("thermal-mode");
    if (a4Btn) a4Btn.classList.remove("on");
    if (thermalBtn) thermalBtn.classList.add("on");
  } else {
    el.classList.remove("thermal-mode");
    if (a4Btn) a4Btn.classList.add("on");
    if (thermalBtn) thermalBtn.classList.remove("on");
  }
}

function printInvoice(orderId) {
  const o = orders().find(x => x.id == orderId);
  if (!o) return;
  const c = S.cfg;
  const isPaid = o.paid === "Paid";
  const isClaimed = o.paid === "Claimed";
  const stampClass = isPaid ? "paid" : isClaimed ? "claimed" : "unpaid";
  const stampText = isPaid ? "✓ Confirmed & Paid" : isClaimed ? "⚠️ Claimed (Pending Check)" : "Unpaid / Balance Due";
  const activeMeas = typeof getMeasurements === "function" ? getMeasurements() : MEAS;
  const measKeys = Array.from(new Set([...activeMeas, ...Object.keys(o.measure || {})]));
  const hasMeas = o.type === "Stitch" && o.measure && Object.values(o.measure).some(v => v && v !== "-");

  modal(`
    <div class="no-print" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px">
      <div class="tabs" style="margin:0">
        <span id="btn-inv-a4" class="chip on" onclick="toggleInvoicePrintFormat('a4')">📄 Standard A4 Invoice</span>
        <span id="btn-inv-thermal" class="chip" onclick="toggleInvoicePrintFormat('thermal')">🧾 80mm Receipt Size</span>
      </div>
      <div style="display:flex;gap:6px">
        <button class="btn s g" onclick="sendWhatsAppInvoice('${o.id}')" title="Send official invoice summary to client via WhatsApp">💬 WhatsApp</button>
        <button class="btn s p" onclick="window.print()" title="Print invoice to paper or save as PDF">🖨️ Print Now</button>
        <button class="btn s" onclick="closeM()">✕</button>
      </div>
    </div>

    <div id="invoice-print-area" class="invoice-sheet">
      <!-- Luxury Atelier Header -->
      <div class="invoice-header-luxury">
        <div class="invoice-atelier-crest">
          <div class="invoice-crest-icon">⚜️</div>
          <div>
            <h1 class="invoice-brand-h1">${Security.escapeHTML(c.payee || "SAIFA DESIGNS")}</h1>
            <div class="invoice-brand-sub">Haute Couture · Bespoke Ladies Atelier · Luxury Fabrics</div>
            <div style="font-size:0.78rem;color:#4b5563;margin-top:4px;line-height:1.4">
              ${Security.escapeHTML(c.address || "Shop No. 12, Gulshan Market, Main Road, New Delhi 110025")}<br>
              Atelier Phone: <b>+${Security.escapeHTML(c.shopPhone || "919999999999")}</b> · UPI: <b>${Security.escapeHTML(c.upi || "saifadesigns@okhdfcbank")}</b>
            </div>
          </div>
        </div>

        <div class="invoice-meta-box">
          <div style="font-family:'Cinzel',serif;font-weight:700;font-size:1.1rem;color:#8e1647">OFFICIAL RETAIL INVOICE</div>
          <div style="margin:3px 0"><b>Invoice No:</b> #${Security.escapeHTML(o.no)}</div>
          <div><b>Booking Date:</b> ${new Date(o.ts).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</div>
          <div><b>Trial / Delivery:</b> ${o.due ? Security.escapeHTML(o.due) : "Priority Service"}</div>
          <div>
            <span class="invoice-pill-stamp ${stampClass}">${stampText}</span>
          </div>
        </div>
      </div>

      <!-- Customer & Transaction Details Grid -->
      <div class="invoice-info-grid">
        <div>
          <b style="color:#8e1647;font-size:0.8rem;text-transform:uppercase;letter-spacing:0.04em">Client Information:</b>
          <div style="font-size:1.05rem;font-weight:700;margin:3px 0 1px;color:#111">${Security.escapeHTML(o.customer)}</div>
          <div>Mobile: <b>+91 ${Security.escapeHTML(o.phone)}</b></div>
          <div>Client Profile ID: <b>#${Security.escapeHTML(o.cid || "SAIFA-CLIENT")}</b></div>
          <div style="color:#4b5563;margin-top:2px">Fitting / Address: ${Security.escapeHTML(o.address || "Boutique Counter Pickup / Trial")}</div>
        </div>

        <div style="border-left:1px solid #e5e7eb;padding-left:14px">
          <b style="color:#8e1647;font-size:0.8rem;text-transform:uppercase;letter-spacing:0.04em">Transaction &amp; Order Specs:</b>
          <div style="margin-top:3px">Order Type: <b>${o.type === 'Stitch' ? '✂️ Bespoke Custom Stitching' : '👗 Ready-to-Wear / Fabric'}</b></div>
          <div>Payment Channel: <b>${Security.escapeHTML(o.pay || "UPI")}</b></div>
          <div>Payment Status: <b style="color:${isPaid ? '#059669' : isClaimed ? '#d97706' : '#dc2626'}">${Security.escapeHTML(o.paid || "Unpaid")}</b></div>
          <div>Order Status: <b>${Security.escapeHTML(o.status || "Confirmed")}</b></div>
        </div>
      </div>

      <!-- Itemized Products / Tailoring Table -->
      <table class="invoice-table">
        <thead>
          <tr>
            <th style="text-align:left">Item &amp; Specifications</th>
            <th style="text-align:center;width:60px">Qty</th>
            <th style="text-align:right;width:110px">Rate (₹)</th>
            <th style="text-align:right;width:120px">Total (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${o.type === "Stitch" ? `
            <tr>
              <td>
                <b style="font-size:0.95rem;color:#111">${Security.escapeHTML(o.garment || "Custom Garment")} Tailoring &amp; Crafting</b><br>
                <span style="color:#4b5563;font-size:0.8rem">Fabric: ${Security.escapeHTML(o.fabric || "Client's Own Fabric")}</span>
                ${o.note ? `<br><small style="color:#6b7280;font-style:italic">Design Note: "${Security.escapeHTML(o.note)}"</small>` : ""}
              </td>
              <td style="text-align:center;font-weight:600">1</td>
              <td style="text-align:right">${R(o.total + (o.discount || 0))}</td>
              <td style="text-align:right;font-weight:700">${R(o.total + (o.discount || 0))}</td>
            </tr>
          ` : (o.items || []).map(it => `
            <tr>
              <td>
                <b style="font-size:0.92rem;color:#111">${Security.escapeHTML(it.n)}</b>
                ${(it.size || it.color) ? `
                  <br><span style="display:inline-block;background:#f3f4f6;padding:1px 6px;border-radius:4px;font-size:0.75rem;color:#374151">
                    ${it.size ? 'Size: <b>' + Security.escapeHTML(it.size) + '</b>' : ''}${it.size && it.color ? ' · ' : ''}${it.color ? 'Color: <b>' + Security.escapeHTML(it.color) + '</b>' : ''}
                  </span>
                ` : ""}
              </td>
              <td style="text-align:center;font-weight:600">${it.q || 1}</td>
              <td style="text-align:right">${R(it.p)}</td>
              <td style="text-align:right;font-weight:700">${R((it.p || 0) * (it.q || 1))}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>

      <!-- Itemized Tailoring Measurements Section (Inches) -->
      ${hasMeas ? `
        <div style="margin-top:12px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <b style="font-size:0.8rem;color:#8e1647;text-transform:uppercase;letter-spacing:0.04em">
              📐 Bespoke Master Fitting Measurements (${Security.escapeHTML(o.garment)}):
            </b>
            <span style="font-size:0.74rem;color:#6b7280">All dimensions in inches (")</span>
          </div>
          <div class="invoice-meas-grid">
            ${measKeys.map(k => `
              <div class="invoice-meas-cell">
                <small style="color:#6b7280;display:block;font-size:0.7rem;text-transform:uppercase;font-weight:600">${k}</small>
                <b style="font-size:0.95rem;color:#111">${Security.escapeHTML((o.measure && o.measure[k] && o.measure[k] !== '-') ? o.measure[k] + '"' : "-")}</b>
              </div>
            `).join("")}
          </div>
        </div>
      ` : ""}

      <!-- Summary & Financial Totals Block -->
      <div class="invoice-totals-box">
        <div style="display:flex;justify-content:space-between;width:240px;color:#4b5563">
          <span>Subtotal:</span>
          <span>${R(o.total + (o.discount || 0))}</span>
        </div>
        ${o.discount ? `
          <div style="display:flex;justify-content:space-between;width:240px;color:#059669;font-weight:600">
            <span>Coupon Discount:</span>
            <span>-${R(o.discount)}</span>
          </div>
        ` : ""}
        <div style="display:flex;justify-content:space-between;width:240px;border-top:1.5px solid #8e1647;padding-top:6px;margin-top:4px" class="invoice-grand-total">
          <span style="font-size:1.05rem;color:#111">Grand Total:</span>
          <span style="color:#8e1647">${R(o.total)}</span>
        </div>
        <div style="font-size:0.78rem;color:${isPaid ? '#059669' : '#b45309'};margin-top:2px">
          ${isPaid ? '✓ Full payment confirmed & verified' : isClaimed ? '⚠️ Payment claimed by client — awaiting bank check' : '⚠️ Outstanding payment balance due upon delivery/trial'}
        </div>
      </div>

      <!-- Atelier Guarantee Terms & Signatory Footer -->
      <div class="invoice-footer-terms">
        <div style="max-width:440px">
          <b style="color:#374151">Saifa Designs Boutique Guarantee:</b>
          <div style="margin-top:2px;line-height:1.4">
            • Complimentary trial fitting &amp; adjustments within 7 days of collection.<br>
            • Dry cleaning strongly recommended for delicate zari, organza, banarasi, and hand-embroidered silks.
          </div>
        </div>
        <div style="text-align:center;min-width:180px">
          <div style="border-bottom:1px solid #111;height:38px;margin-bottom:4px"></div>
          <b>Authorized Atelier Signatory</b><br>
          <small style="color:#6b7280">SAIFA DESIGNS BOUTIQUE</small>
        </div>
      </div>
    </div>
  `);
}

function sendWhatsAppInvoice(orderId) {
  const o = orders().find(x => x.id == orderId);
  if (!o) return;
  const c = S.cfg;
  const cleanPhone = np(o.phone);
  const itemsText = o.type === "Stitch" 
    ? `${o.garment} Tailoring (${o.fabric || 'Bespoke'})`
    : (o.items || []).map(i => `${i.n} (${i.q}x${R(i.p)})`).join(', ');

  const msg = `✨ *SAIFA DESIGNS ATELIER INVOICE*\n` +
    `Invoice No: #${o.no}\n` +
    `Client: ${o.customer} (ID: ${o.cid})\n` +
    `Items/Craft: ${itemsText}\n` +
    `Total Amount: ₹${o.total}\n` +
    `Payment Status: *${o.paid}* (${o.pay})\n` +
    `Order Status: ${o.status}\n` +
    `Due Date: ${o.due || 'Priority'}\n\n` +
    `Thank you for choosing Saifa Designs! Please save this invoice for trials & fittings.`;

  window.open(`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(msg)}`, "_blank");
}

function openOrderEdit(orderId) {
  const o = orders().find(x => x.id == orderId);
  if (!o) return;
  modal(`
    <h2 style="color:var(--br)">Edit Order #${E(o.no)}</h2>
    <div class="g2" style="margin-top:10px">
      <div><label>Customer Name</label><input id="eo_n" value="${E(o.customer)}"></div>
      <div><label>Phone Number</label><input id="eo_p" value="${E(o.phone)}"></div>
    </div>
    <label>Delivery Address</label><input id="eo_a" value="${E(o.address)}">
    <div class="g2">
      <div><label>Due Date</label><input id="eo_due" type="date" value="${E(o.due || "")}"></div>
      <div>
        <label>Assigned Artisan/Tailor</label>
        <select id="eo_w">
          <option value="">Unassigned</option>
          ${workers().map(w => `<option value="${w.id}" ${o.worker == w.id ? "selected" : ""}>${E(w.name)} (${E(w.role)})</option>`).join("")}
        </select>
      </div>
    </div>
    <label>Admin / Design Notes</label><textarea id="eo_note" rows="2">${E(o.note || "")}</textarea>
    <div class="g2">
      <div>
        <label>Order Status</label>
        <select id="eo_st">
          ${ST.map(s => `<option ${o.status == s ? "selected" : ""}>${s}</option>`).join("")}
        </select>
      </div>
      <div>
        <label>Payment Status</label>
        <select id="eo_paid">
          ${PAY.map(p => `<option ${o.paid == p ? "selected" : ""}>${p}</option>`).join("")}
        </select>
      </div>
    </div>
    <div class="g2">
      <div><label>Total Price ₹</label><input id="eo_tot" type="number" value="${o.total}"></div>
      <div>
        <label>Payment Method</label>
        <select id="eo_pay">
          ${PAY_MODES.map(pm => `<option ${o.pay == pm ? "selected" : ""}>${pm}</option>`).join("")}
        </select>
      </div>
    </div>
    <div style="display:flex;gap:10px;margin-top:14px">
      <button class="btn p" style="flex:2" onclick="saveOrderEdit('${o.id}')">💾 Save Changes</button>
      <button class="btn d" type="button" style="flex:1;background:var(--bad);color:#fff" onclick="closeM();requestDelete('orders','${o.id}')">🗑️ Delete</button>
    </div>
  `);
}

function saveOrderEdit(orderId) {
  const o = orders().find(x => x.id == orderId);
  if (!o) return closeM();

  const newStatus = $("eo_st") ? $("eo_st").value : o.status;
  const newPaid = $("eo_paid") ? $("eo_paid").value : o.paid;

  const patch = {
    customer: $("eo_n").value.trim(),
    phone: np($("eo_p").value),
    address: $("eo_a").value.trim(),
    due: $("eo_due").value,
    worker: $("eo_w").value,
    note: $("eo_note").value.trim(),
    total: Number($("eo_tot").value) || 0,
    pay: $("eo_pay").value,
    status: newStatus,
    paid: newPaid
  };

  upd("orders", orderId, patch).then(() => {
    if (newStatus !== o.status) {
      updateOrderStatus(orderId, newStatus);
    }
    if (newPaid !== o.paid) {
      updateOrderPayment(orderId, newPaid);
    }
    closeM();
    toast("Order updated successfully ✅");
    if (typeof panel === "function") panel();
  });
}

// ------------------------------------------
// 3. Stitching Queue Tab
// ------------------------------------------
function formatDueBadge(due, status) {
  if (status === "Ready") return `<span class="pill ok">✨ Ready for Trial</span>`;
  if (status === "Delivered") return `<span class="pill ok">✓ Delivered</span>`;
  if (!due) return `<span class="pill" style="opacity:0.7">No due date</span>`;

  const dueTime = new Date(due + "T23:59:59").getTime();
  const nowTime = new Date().getTime();
  const diffDays = Math.ceil((dueTime - nowTime) / (1000 * 3600 * 24));

  if (diffDays < 0) {
    return `<span class="pill bad" style="font-weight:700">⚠️ Overdue by ${Math.abs(diffDays)}d (${due})</span>`;
  } else if (diffDays === 0) {
    return `<span class="pill w" style="font-weight:700">⏰ Due Today (${due})</span>`;
  } else if (diffDays <= 2) {
    return `<span class="pill w">⏳ Due in ${diffDays}d (${due})</span>`;
  } else {
    return `<span class="pill">📅 Due: ${due}</span>`;
  }
}

function renderStitchingTab() {
  const f = S.sfilter || "All";
  const tailorFilter = S.stitchingTailor || "all";
  const search = (S.stitchingSearch || "").trim().toLowerCase();
  const showIntake = Boolean(S.showStitchingIntake);

  const allStitch = orders().filter(o => o.type === "Stitch");
  const pendingVerifications = allStitch.filter(o => o.stage === "Master Quality Check" || o.workerVerified === false);

  let list = allStitch;

  if (f === "Verification") {
    list = pendingVerifications;
  } else if (f !== "All") {
    list = list.filter(o => o.status === f);
  }

  if (tailorFilter !== "all") {
    list = list.filter(o => o.worker == tailorFilter);
  }
  if (search) {
    list = list.filter(o =>
      (o.no && String(o.no).toLowerCase().includes(search)) ||
      (o.customer && o.customer.toLowerCase().includes(search)) ||
      (o.phone && o.phone.includes(search)) ||
      (o.garment && o.garment.toLowerCase().includes(search)) ||
      (o.cid && o.cid.toLowerCase().includes(search))
    );
  }
  list.sort((a, b) => b.ts - a.ts);

  const inProgressCount = allStitch.filter(o => !["Ready", "Delivered", "Cancelled"].includes(o.status)).length;
  const readyCount = allStitch.filter(o => o.status === "Ready").length;

  return `
    <!-- Top Action Bar & Intake Toggle -->
    <div class="box" style="margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
        <div>
          <b>✂️ Bespoke Stitching Atelier Queue (${allStitch.length} Orders · ${inProgressCount} In Progress · ${readyCount} Ready)</b>
          <p style="font-size:0.8rem;color:var(--mu);margin:3px 0 0">
            Real-time artisan routing, fitting specs, due dates and 1-click status & payment sync.
          </p>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <button class="btn s ${showIntake ? '' : 'p'}" onclick="S.showStitchingIntake=!S.showStitchingIntake;panel()">
            ${showIntake ? '▲ Close Intake Form' : '➕ New Stitching Intake'}
          </button>
        </div>
      </div>

      ${showIntake ? `
        <div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--ln);animation:fadeIn 0.2s ease">
          <b style="color:var(--br)">✂️ Register Bespoke Custom Order</b>
          <p style="font-size:0.8rem;color:var(--mu);margin:2px 0 10px">Enter phone to auto-fill returning client's saved measurements.</p>
          ${sForm("as", true)}
        </div>
      ` : ''}
    </div>

    <!-- Filter Tabs, Artisan Filter & Realtime Search -->
    <div class="box" style="padding:14px 18px;margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
        <div class="tabs" style="justify-content:flex-start;margin:0">
          <span class="chip ${f === 'All' ? 'on' : ''}" onclick="S.sfilter='All';panel()">All (${allStitch.length})</span>
          <span class="chip ${f === 'Verification' ? 'on' : ''}" style="${pendingVerifications.length ? 'border-color:var(--warn);color:var(--warn);font-weight:700' : ''}" onclick="S.sfilter='Verification';panel()">
            🔍 Quality Verification (${pendingVerifications.length})
          </span>
          ${ST.map(s => {
            const cnt = allStitch.filter(o => o.status === s).length;
            return `<span class="chip ${f === s ? 'on' : ''}" onclick="S.sfilter='${s}';panel()">${s} (${cnt})</span>`;
          }).join("")}
        </div>

        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <select style="margin:0;padding:6px 10px;font-size:0.84rem;width:auto" onchange="S.stitchingTailor=this.value;panel()">
            <option value="all">All Artisans / Tailors</option>
            ${workers().map(w => `<option value="${w.id}" ${tailorFilter == w.id ? 'selected' : ''}>${E(w.name)} (${E(w.role)})</option>`).join("")}
          </select>
          <div style="display:flex;align-items:center;gap:4px">
            <input placeholder="🔍 Search Order, Client, Phone..." value="${Security.escapeHTML(S.stitchingSearch || '')}" oninput="S.stitchingSearch=this.value.trim().toLowerCase();panel()" style="margin:0;padding:6px 12px;font-size:0.84rem;width:200px">
            ${S.stitchingSearch ? `<button class="btn s" onclick="S.stitchingSearch='';panel()" style="padding:6px 10px">✕</button>` : ''}
          </div>
        </div>
      </div>
    </div>

    <!-- Dedicated Master Quality Verification Review Panel -->
    ${pendingVerifications.length ? `
      <div class="box verification-banner" style="margin-bottom:16px;border-left:4px solid var(--warn);background:color-mix(in srgb, var(--warn) 6%, var(--sf))">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:12px">
          <div>
            <b style="color:var(--warn);font-size:1.05rem">🧵 Master Quality Verification Queue (${pendingVerifications.length} Garments Awaiting Inspection)</b>
            <p style="font-size:0.8rem;color:var(--mu);margin:3px 0 0">
              Artisans have completed tailoring. Inspect measurements &amp; finish. Approving quality immediately credits piece wage to the tailor's wallet.
            </p>
          </div>
          <span class="pill w" style="font-size:0.8rem;padding:4px 10px">
            ⏳ ${pendingVerifications.length} Action(s) Required
          </span>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(320px, 1fr));gap:14px">
          ${pendingVerifications.map(pv => {
            const pvWorker = workers().find(w => w.id == pv.worker);
            const pvWage = pv.workerPendingWage || (S.cfg.pay && S.cfg.pay[pv.garment]) || 150;
            return `
              <div class="box" style="margin:0;background:var(--sf);border:1.5px solid var(--warn);padding:14px;border-radius:14px;display:flex;flex-direction:column;justify-content:space-between">
                <div>
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                    <span style="font-size:1.05rem;font-weight:700;color:var(--br)">#${E(pv.no)} · ${E(pv.garment)}</span>
                    <span class="pill w" style="font-size:0.72rem">Needs Approval</span>
                  </div>
                  <div style="font-size:0.84rem;margin-bottom:8px">
                    Client: <b>${E(pv.customer)}</b> (${E(pv.phone)})<br>
                    <small style="color:var(--mu)">Fabric: ${E(pv.fabric || "Client's Own")} · Due: <b>${E(pv.due || "Immediate")}</b></small>
                  </div>

                  <div style="background:var(--sf2);border-radius:10px;padding:8px 10px;margin-bottom:8px;font-size:0.82rem">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
                      <div style="width:26px;height:26px;border-radius:50%;background:#eee;overflow:hidden;display:grid;place-items:center">
                        ${pvWorker && pvWorker.img ? `<img src="${Security.escapeHTML(pvWorker.img)}" style="width:100%;height:100%;object-fit:cover">` : '🧵'}
                      </div>
                      <b>Artisan:</b> ${pvWorker ? E(pvWorker.name) : 'Assigned Tailor'}
                    </div>
                    ${pv.workerNote ? `<div style="color:var(--tx);font-size:0.8rem">📝 <i>"${Security.escapeHTML(pv.workerNote)}"</i></div>` : ''}
                    <small style="color:var(--mu);display:block;margin-top:2px">Submitted: ${pv.workerSubmittedAt ? new Date(pv.workerSubmittedAt).toLocaleDateString('en-IN') + ' ' + new Date(pv.workerSubmittedAt).toLocaleTimeString('en-IN', {hour:'2-digit',minute:'2-digit'}) : 'Recently'}</small>
                  </div>

                  <!-- Editable Wage Amount for Master -->
                  <div style="display:flex;justify-content:space-between;align-items:center;background:var(--sf2);padding:6px 10px;border-radius:8px;margin-bottom:10px">
                    <label style="margin:0;font-size:0.8rem;font-weight:600">Tailoring Wage to Credit:</label>
                    <div style="display:flex;align-items:center;gap:3px">
                      <span style="font-weight:700">₹</span>
                      <input id="ver_wage_${pv.id}" type="number" value="${pvWage}" style="width:72px;margin:0;padding:3px 6px;font-size:0.84rem;font-weight:700;color:var(--ok)">
                    </div>
                  </div>
                </div>

                <div style="display:flex;gap:6px;margin-top:8px">
                  <button class="btn s g" style="flex:2;background:var(--ok);color:#fff;font-weight:700" onclick="AdminPortal.approveOrderWork('${pv.id}')">
                    ✓ Verify &amp; Add Pay
                  </button>
                  <button class="btn s d" style="flex:1" onclick="AdminPortal.openReworkModal('${pv.id}')">
                    ⚠️ Rework
                  </button>
                </div>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    ` : ''}

    <!-- Stitching Queue Cards Grid -->
    <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(330px,1fr));gap:16px">
      ${list.map(o => {
        const assignedWorker = workers().find(w => w.id == o.worker);
        const isPaid = o.paid === "Paid";
        const isClaimed = o.paid === "Claimed";

        return `
          <div class="box" style="margin:0;display:flex;flex-direction:column;justify-content:space-between;border:1px solid ${o.status === 'Ready' ? 'var(--ok)' : 'var(--ln)'}">
            <div>
              <!-- Header -->
              <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:8px">
                <div>
                  <b style="font-size:1.05rem;color:var(--br)">#${E(o.no)}</b>
                  <span class="chip on" style="font-size:0.72rem;padding:2px 8px;margin-left:6px;background:var(--sf2);color:var(--mu);border:none">${E(o.cid || 'Client')}</span>
                </div>
                <div>
                  ${formatDueBadge(o.due, o.status)}
                </div>
              </div>

              <!-- Customer Info -->
              <div style="background:var(--sf2);padding:10px 12px;border-radius:10px;margin-bottom:10px">
                <div style="display:flex;justify-content:space-between;align-items:center">
                  <b>${E(o.customer)}</b>
                  <a href="tel:${E(o.phone)}" style="font-size:0.8rem;color:var(--br);text-decoration:none;font-weight:600">📞 ${E(o.phone)}</a>
                </div>
                ${o.address ? `<div style="font-size:0.76rem;color:var(--mu);margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">📍 ${E(o.address)}</div>` : ''}
              </div>

              <!-- Garment & Pricing Details -->
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                <div>
                  <span style="font-size:1rem;font-weight:700">👗 ${E(o.garment || 'Custom Stitch')}</span>
                  <div style="font-size:0.78rem;color:var(--mu)">${E(o.fabric || 'Fabric')}</div>
                </div>
                <div style="text-align:right">
                  <span style="font-size:1.15rem;font-weight:800;color:var(--br)">${R(o.total)}</span>
                  <div style="font-size:0.75rem;color:var(--mu)">${E(o.pay || 'UPI')}</div>
                </div>
              </div>

              <!-- Measurements Snapshot -->
              <div style="background:var(--sf);border:1px solid var(--ln);border-radius:10px;padding:8px 10px;margin-bottom:10px">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
                  <small style="font-weight:700;color:var(--mu);text-transform:uppercase;letter-spacing:0.04em">Measurements (Inches)</small>
                  <small style="color:var(--br);cursor:pointer;font-weight:600" onclick="openEditStitchingModal('${o.id}')">✏️ Edit Fit</small>
                </div>
                <div class="meas" style="font-size:0.78rem;gap:4px">
                  ${MEAS.slice(0, 6).map(m => `
                    <div style="padding:2px 4px">
                      <small style="color:var(--mu);display:block;font-size:0.7rem">${m}</small>
                      <b>${E((o.measure && o.measure[m] && o.measure[m] !== '-') ? o.measure[m] + '"' : '-')}</b>
                    </div>
                  `).join("")}
                </div>
              </div>

              ${o.note ? `<div style="font-size:0.8rem;background:color-mix(in srgb, var(--br) 6%, transparent);padding:6px 10px;border-radius:8px;margin-bottom:10px;color:var(--tx)">📝 <b>Note:</b> ${E(o.note)}</div>` : ''}

              <!-- Quality Verification & Tailor Wage Box -->
              ${(o.stage === "Master Quality Check" || o.workerVerified === false) ? `
                <div style="margin:10px 0;background:color-mix(in srgb, var(--warn) 12%, var(--sf));border:1.5px solid var(--warn);border-radius:10px;padding:10px 12px">
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
                    <b style="color:var(--warn);font-size:0.84rem">🔍 Awaiting Quality Sign-off</b>
                    <span class="pill w" style="font-size:0.7rem">Action Needed</span>
                  </div>
                  <div style="font-size:0.8rem;color:var(--tx);margin-bottom:6px">
                    ${o.workerNote ? `Tailor Note: <i>"${Security.escapeHTML(o.workerNote)}"</i><br>` : ''}
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px">
                      <span style="font-size:0.78rem;color:var(--mu)">Craft Piece Wage:</span>
                      <div style="display:flex;align-items:center;gap:2px">
                        <b>₹</b>
                        <input id="wage_input_${o.id}" type="number" value="${o.workerPendingWage || (S.cfg.pay && S.cfg.pay[o.garment]) || 150}" style="width:65px;margin:0;padding:2px 6px;font-size:0.8rem;font-weight:700;color:var(--ok)">
                      </div>
                    </div>
                  </div>
                  <div style="display:flex;gap:4px">
                    <button class="btn s g" style="flex:2;background:var(--ok);color:#fff;font-size:0.78rem" onclick="AdminPortal.approveOrderWork('${o.id}')">
                      ✓ Verify &amp; Add Pay
                    </button>
                    <button class="btn s d" style="flex:1;font-size:0.78rem" onclick="AdminPortal.openReworkModal('${o.id}')">
                      ⚠️ Rework
                    </button>
                  </div>
                </div>
              ` : o.workerVerified === true ? `
                <div style="margin:8px 0;padding:6px 10px;background:color-mix(in srgb, var(--ok) 10%, var(--sf));border:1px solid var(--ok);border-radius:8px;font-size:0.76rem;display:flex;justify-content:space-between;align-items:center">
                  <span style="color:var(--ok);font-weight:700">✓ Quality Verified</span>
                  <span style="color:var(--mu)">Wage Credited: <b style="color:var(--ok)">₹${o.verifiedWage || (S.cfg.pay && S.cfg.pay[o.garment]) || 150}</b></span>
                </div>
              ` : o.workerVerified === "rework" ? `
                <div style="margin:8px 0;padding:6px 10px;background:color-mix(in srgb, var(--bad) 10%, var(--sf));border:1px solid var(--bad);border-radius:8px;font-size:0.76rem">
                  <span style="color:var(--bad);font-weight:700">⚠️ Rework Requested:</span> "${Security.escapeHTML(o.reworkNote || '')}"
                </div>
              ` : ''}

              <!-- Status & Payment Controls (Realtime Synchronized) -->
              <div class="g2" style="margin-top:10px">
                <div>
                  <label style="font-size:0.76rem;margin-bottom:2px">Status</label>
                  <select onchange="onOrderStatusChange('${o.id}', this.value)" style="margin:0;padding:6px 8px;font-size:0.82rem;border-radius:8px">
                    ${ST.map(s => `<option ${s === o.status ? "selected" : ""}>${s}</option>`).join("")}
                  </select>
                </div>
                <div>
                  <label style="font-size:0.76rem;margin-bottom:2px">Payment</label>
                  <div style="display:flex;gap:4px;align-items:center">
                    <select onchange="onOrderPaymentChange('${o.id}', this.value)" style="margin:0;padding:6px 8px;font-size:0.82rem;border-radius:8px;flex:1">
                      ${PAY.map(p => `<option ${p === o.paid ? "selected" : ""}>${p}</option>`).join("")}
                    </select>
                    ${!isPaid ? `<button class="btn s ok" style="padding:6px 8px;font-size:0.75rem" onclick="onOrderPaymentChange('${o.id}', 'Paid')" title="1-Click Verify Payment">✓</button>` : ''}
                  </div>
                </div>
              </div>

              <!-- Assigned Tailor & 6-Stage Progress Tracking -->
              <div class="g2" style="margin-top:8px">
                <div>
                  <label style="font-size:0.76rem;margin-bottom:2px">Assigned Tailor / Master</label>
                  <select onchange="onAssignWorker('${o.id}', this.value)" style="margin:0;padding:6px 8px;font-size:0.82rem;border-radius:8px">
                    <option value="">Unassigned</option>
                    ${workers().map(w => `<option value="${w.id}" ${o.worker == w.id ? "selected" : ""}>${E(w.name)} (${E(w.role)})</option>`).join("")}
                  </select>
                </div>
                <div>
                  <label style="font-size:0.76rem;margin-bottom:2px">Craft Progress Stage</label>
                  <select onchange="onOrderStageChange('${o.id}', this.value)" style="margin:0;padding:6px 8px;font-size:0.82rem;border-radius:8px;font-weight:600;color:var(--br)">
                    ${WORK_PROGRESS_STAGES.map(st => `<option value="${Security.escapeHTML(st)}" ${o.stage === st ? "selected" : ""}>${Security.escapeHTML(st)}</option>`).join("")}
                  </select>
                </div>
              </div>

              <!-- Visual Stage Progress Indicator -->
              <div style="margin-top:6px;display:flex;align-items:center;gap:3px">
                ${WORK_PROGRESS_STAGES.map((st, sIdx) => {
                  const curStageIdx = WORK_PROGRESS_STAGES.indexOf(o.stage || "Cutting & Pattern Drafting");
                  const isDone = sIdx <= curStageIdx;
                  return `<div style="flex:1;height:4px;border-radius:2px;background:${isDone ? 'var(--br)' : 'var(--ln)'}" title="${Security.escapeHTML(st)}"></div>`;
                }).join("")}
              </div>
            </div>

            <!-- Action Buttons Row -->
            <div style="display:flex;gap:6px;margin-top:12px;padding-top:10px;border-top:1px solid var(--ln)">
              <button class="btn s" style="flex:1" onclick="openEditStitchingModal('${o.id}')" title="Edit Measurements & Details">✏️ Edit</button>
              <button class="btn s" style="flex:1" onclick="printInvoice('${o.id}')" title="Print Invoice">🧾 Receipt</button>
              <button class="btn s g" style="flex:1" onclick="sendWhatsAppUpdate('${o.id}')" title="WhatsApp Customer Update">💬 WA</button>
              <button class="btn s d" style="padding:6px 10px" onclick="requestDelete('orders','${o.id}')" title="Delete">✕</button>
            </div>
          </div>
        `;
      }).join("") || `<div class="box" style="grid-column:1/-1;text-align:center;padding:30px;color:var(--mu)">No bespoke stitching orders match filter "${f}".</div>`}
    </div>
  `;
}

function onOrderStageChange(orderId, stageName) {
  if (typeof updateOrderProgressStage === "function") {
    updateOrderProgressStage(orderId, stageName, "Stage updated by Master in Admin Queue");
  } else {
    upd("orders", orderId, { stage: stageName });
  }
  toast(`Order updated to stage '${stageName}' 🧵`);
  if (typeof panel === "function") panel();
}

// ------------------------------------------
// Stitching Order Edit Modal & Handlers
// ------------------------------------------
function openEditStitchingModal(orderId) {
  const o = orders().find(x => x.id == orderId);
  if (!o) return toast("Order not found");
  const prices = (S.cfg && S.cfg.prices) || DEF.prices;
  const gs = Object.keys(prices);

  modal(`
    <h2 style="color:var(--br);margin:0 0 10px">✂️ Edit Bespoke Order #${o.no}</h2>
    <p style="font-size:0.85rem;color:var(--mu);margin-bottom:14px">
      Update client information, fitting specs, target delivery date, tailor assignment and payment.
    </p>

    <div class="g2">
      <div>
        <label>Customer Name *</label>
        <input id="es_cust" value="${Security.escapeHTML(o.customer || '')}" required>
      </div>
      <div>
        <label>Mobile Number (10-digit) *</label>
        <input id="es_phone" value="${Security.escapeHTML(o.phone || '')}" maxlength="10" required>
      </div>
    </div>

    <div class="g2" style="margin-top:8px">
      <div>
        <label>Garment Type</label>
        <select id="es_garment">
          ${gs.map(g => `<option value="${Security.escapeHTML(g)}" ${o.garment === g ? "selected" : ""}>${Security.escapeHTML(g)}</option>`).join("")}
          ${!gs.includes(o.garment) && o.garment ? `<option value="${Security.escapeHTML(o.garment)}" selected>${Security.escapeHTML(o.garment)}</option>` : ""}
        </select>
      </div>
      <div>
        <label>Fabric Option</label>
        <select id="es_fabric">
          <option ${o.fabric === 'Provide My Own Fabric' ? 'selected' : ''}>Provide My Own Fabric</option>
          <option ${o.fabric === 'Purchase Fabric from SAIFA' ? 'selected' : ''}>Purchase Fabric from SAIFA</option>
          <option ${o.fabric === 'Boutique Consultation' ? 'selected' : ''}>Boutique Consultation</option>
        </select>
      </div>
    </div>

    <div class="g2" style="margin-top:8px">
      <div>
        <label>Target Delivery / Trial Date</label>
        <input id="es_due" type="date" value="${o.due || ''}">
      </div>
      <div>
        <label>Total Price (₹)</label>
        <input id="es_total" type="number" value="${o.total || 0}">
      </div>
    </div>

    <div class="g2" style="margin-top:8px">
      <div>
        <label>Assigned Tailor</label>
        <select id="es_worker">
          <option value="">Unassigned</option>
          ${workers().map(w => `<option value="${w.id}" ${o.worker == w.id ? "selected" : ""}>${E(w.name)} (${E(w.role)})</option>`).join("")}
        </select>
      </div>
      <div>
        <label>Order Status</label>
        <select id="es_status">
          ${ST.map(s => `<option value="${s}" ${o.status === s ? "selected" : ""}>${s}</option>`).join("")}
        </select>
      </div>
    </div>

    <div class="g2" style="margin-top:8px">
      <div>
        <label>Payment Status</label>
        <select id="es_paid">
          ${PAY.map(p => `<option value="${p}" ${o.paid === p ? "selected" : ""}>${p}</option>`).join("")}
        </select>
      </div>
      <div>
        <label>Payment Mode</label>
        <select id="es_pay">
          <option ${o.pay === 'UPI' ? 'selected' : ''}>UPI</option>
          <option ${o.pay === 'Cash on Delivery' ? 'selected' : ''}>Cash on Delivery</option>
          <option ${o.pay === 'Pay at Shop' ? 'selected' : ''}>Pay at Shop</option>
        </select>
      </div>
    </div>

    <div style="margin-top:8px">
      <label>Trial / Delivery Address</label>
      <input id="es_addr" value="${Security.escapeHTML(o.address || '')}">
    </div>

    <div style="margin-top:8px">
      <label>Design & Styling Instructions (Neckline, Back Cut, Padding, Sleeves)</label>
      <textarea id="es_note" rows="2">${Security.escapeHTML(o.note || '')}</textarea>
    </div>

    <div style="margin:14px 0 8px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <label style="font-weight:600;margin:0">Fit Measurements (Inches)</label>
        <span style="font-size:0.75rem;color:var(--mu)">All points in inches (step 0.5)</span>
      </div>
      <div class="meas">
        ${(() => {
          const measList = Array.from(new Set([...(typeof getMeasurements === "function" ? getMeasurements() : MEAS), ...Object.keys(o.measure || {})]));
          return measList.map((m, i) => `
            <div>
              <label style="font-size:0.75rem">${m}</label>
              <input id="es_m_${i}" data-meas="${Security.escapeHTML(m)}" type="number" step="0.5" value="${(o.measure && o.measure[m] !== '-' && o.measure[m]) ? o.measure[m] : ''}" placeholder="-">
            </div>
          `).join("");
        })()}
      </div>
    </div>

    <div style="display:flex;gap:8px;margin-top:16px">
      <button class="btn p" style="flex:2" onclick="saveEditedStitching('${o.id}')">💾 Save Specifications</button>
      <button class="btn" style="flex:1" onclick="closeM()">Cancel</button>
      <button class="btn d" type="button" style="flex:1;background:var(--bad);color:#fff" onclick="closeM();requestDelete('orders','${o.id}')">🗑️ Delete</button>
    </div>
  `);
}

function saveEditedStitching(orderId) {
  const o = orders().find(x => x.id == orderId);
  if (!o) return;

  const m = {};
  const measInputs = document.querySelectorAll('[id^="es_m_"]');
  measInputs.forEach(el => {
    const measKey = el.dataset.meas || el.getAttribute("data-meas");
    if (measKey) {
      m[measKey] = el.value ? el.value : "-";
    }
  });

  const newPaid = $("es_paid").value;
  const newWorker = $("es_worker").value;
  const newStatus = $("es_status").value;

  const patch = {
    customer: $("es_cust").value.trim() || o.customer,
    phone: np($("es_phone").value) || o.phone,
    garment: $("es_garment").value,
    fabric: $("es_fabric").value,
    due: $("es_due").value,
    total: Number($("es_total").value) || o.total,
    address: $("es_addr").value.trim() || o.address,
    note: $("es_note").value.trim(),
    measure: m,
    worker: newWorker,
    status: newStatus,
    paid: newPaid,
    pay: $("es_pay").value
  };

  upd("orders", orderId, patch).then(() => {
    if (newPaid !== o.paid) {
      updateOrderPayment(orderId, newPaid);
    }
    if (newStatus !== o.status) {
      updateOrderStatus(orderId, newStatus);
    }
    closeM();
    toast(`Stitching Order #${o.no} updated successfully ✅`);
    if (typeof panel === "function") panel();
  });
}

// ------------------------------------------
// 4. Coupons & Discounts Management Tab
// ------------------------------------------
function copyCouponCode(code) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(code).then(() => {
      toast(`Coupon code '${code}' copied to clipboard! 📋`);
    }).catch(() => {
      prompt("Copy coupon code:", code);
    });
  } else {
    prompt("Copy coupon code:", code);
  }
}

function generateRandomPromoCode() {
  const prefixes = ["FESTIVE", "BRIDAL", "SAIFA", "ROYAL", "EID", "BOUTIQUE", "SPECIAL", "SAVE", "CHIC", "GLAM"];
  const discounts = [10, 15, 20, 25, 30, 50, 100, 200, 250, 500];
  const pfx = prefixes[Math.floor(Math.random() * prefixes.length)];
  const disc = discounts[Math.floor(Math.random() * discounts.length)];
  const numSuffix = disc <= 50 ? disc : disc / 10;
  const code = `${pfx}${numSuffix}`;
  
  const inCode = $("cp_code");
  const inVal = $("cp_val");
  const inType = $("cp_type");
  const inDesc = $("cp_desc");
  if (inCode) inCode.value = code;
  if (inVal && (!inVal.value || inVal.value === "15")) inVal.value = disc;
  if (inType) inType.value = disc > 50 ? "flat" : "percent";
  if (inDesc && !inDesc.value) {
    inDesc.value = `Exclusive ${disc > 50 ? '₹' + disc + ' discount' : disc + '% off'} celebration offer`;
  }
  toast(`Generated promotional code: ${code} 🎲`);
}

function clearStorefrontBanner() {
  const all = S.coupons || [];
  all.forEach(c => { c.isBanner = false; });
  saveLS("coupons", all);
  S.cfg.offerBanner = "none";
  saveLS("cfg", S.cfg);
  if (typeof Realtime !== "undefined") {
    Realtime.broadcast("SETTINGS_UPDATED", S.cfg);
    Realtime.broadcast("COUPON_UPDATED", all);
  }
  toast("Storefront top announcement banner disabled 🔕");
  if (typeof renderFront === "function") renderFront();
  panel();
}

function renderCouponsTab() {
  const cps = coupons();
  const activeCount = cps.filter(c => c.active).length;
  const pausedCount = cps.filter(c => !c.active).length;
  const bannerCount = cps.filter(c => c.isBanner).length;
  const currentBanner = getCurrentBannerOfferText();
  const filter = S.couponFilter || "All";
  const search = (S.couponSearch || "").trim().toLowerCase();

  let list = cps;
  if (filter === "Active") list = list.filter(c => c.active);
  else if (filter === "Paused") list = list.filter(c => !c.active);
  else if (filter === "Live Banner") list = list.filter(c => c.isBanner);

  if (search) {
    list = list.filter(c => 
      (c.code && c.code.toLowerCase().includes(search)) ||
      (c.desc && c.desc.toLowerCase().includes(search)) ||
      String(c.val).includes(search)
    );
  }

  return `
    <!-- Live Storefront Announcement Banner Sync Box -->
    <div class="box" style="border-left: 4px solid var(--br); background: var(--sf);">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
        <div>
          <b>📢 Live Storefront Announcement Banner</b>
          <p style="font-size:0.8rem;color:var(--mu);margin:3px 0 0">
            This banner displays at the very top of the customer storefront across all devices in real time.
          </p>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn s" onclick="resetDefaultBannerText()" title="Reset banner to dynamically promote active coupon">🔄 Reset to Active Coupon</button>
          <button class="btn s" onclick="clearStorefrontBanner()" title="Hide top announcement banner on storefront">🔕 Hide Banner</button>
          <button class="btn s p" onclick="saveCustomBannerText()" title="Save custom banner announcement">💾 Save Banner</button>
        </div>
      </div>

      <div style="margin:12px 0 8px">
        <label>Current Live Announcement Banner Text (HTML supported for bold / icons)</label>
        <input id="customBannerInput" value="${Security.escapeHTML(currentBanner)}" placeholder="e.g. 🎉 Festive Offer: Use code FESTIVE10 for 10% off..." onkeydown="if(event.key==='Enter')saveCustomBannerText()">
      </div>

      <div style="padding:10px 14px;border-radius:12px;background:linear-gradient(90deg,var(--br),var(--br2),var(--gd));color:#fff;font-size:0.88rem;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">
        <span><b>Preview:</b> ${currentBanner || '<i style="opacity:0.8">(Banner currently hidden)</i>'}</span>
        <span class="chip on" style="background:rgba(255,255,255,0.25);border:none;color:#fff;font-size:0.75rem;padding:3px 10px">Live on Storefront</span>
      </div>
    </div>

    <!-- Coupons Directory & Controls -->
    <div class="box">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
        <div>
          <b>🎟️ Boutique Coupons &amp; Promotional Codes (${cps.length} Total · ${activeCount} Active)</b>
          <p style="font-size:0.8rem;color:var(--mu)">Create, edit, pause, resume and set live banner offers for your boutique in real time.</p>
        </div>
        <button class="btn p" onclick="openCreateCouponModal()">+ Create New Coupon</button>
      </div>

      <!-- Filter Chips & Search Bar -->
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-top:14px;padding-top:12px;border-top:1px solid var(--ln)">
        <div class="tabs" style="justify-content:flex-start;margin:0">
          <span class="chip ${filter === 'All' ? 'on' : ''}" onclick="S.couponFilter='All';panel()">All (${cps.length})</span>
          <span class="chip ${filter === 'Active' ? 'on' : ''}" onclick="S.couponFilter='Active';panel()">Active (${activeCount})</span>
          <span class="chip ${filter === 'Paused' ? 'on' : ''}" onclick="S.couponFilter='Paused';panel()">Paused (${pausedCount})</span>
          <span class="chip ${filter === 'Live Banner' ? 'on' : ''}" onclick="S.couponFilter='Live Banner';panel()">🌟 Banner (${bannerCount})</span>
        </div>
        <div style="display:flex;align-items:center;gap:6px">
          <input id="couponSearchInput" placeholder="🔍 Search coupon code, desc..." value="${Security.escapeHTML(S.couponSearch || '')}" oninput="S.couponSearch=this.value.trim().toLowerCase();panel()" style="margin:0;padding:6px 12px;font-size:0.84rem;width:220px">
          ${S.couponSearch ? `<button class="btn s" onclick="S.couponSearch='';panel()" style="padding:6px 10px">✕</button>` : ''}
        </div>
      </div>

      <div class="coupon-grid" style="margin-top:16px">
        ${list.map(c => {
          const isExpired = c.validTill && new Date(c.validTill + "T23:59:59") < new Date();
          const percentUsed = c.maxUses ? Math.min(100, Math.round((c.usedCount / c.maxUses) * 100)) : 0;
          return `
            <div class="coupon-card" style="${c.isBanner ? 'border:1.5px solid var(--gd);box-shadow:0 8px 24px color-mix(in srgb,var(--gd) 20%,transparent)' : ''}">
              <div class="coupon-header">
                <div style="display:flex;align-items:center;gap:6px">
                  <span class="coupon-code-badge" onclick="copyCouponCode('${c.code}')" title="Click to copy code">
                    📋 ${E(c.code)}
                  </span>
                  ${c.isBanner ? `<span class="pill" style="background:color-mix(in srgb,var(--gd) 18%,transparent);color:var(--gd);border:1px solid var(--gd);font-size:0.72rem;font-weight:700">🌟 Live Banner</span>` : ""}
                </div>
                <span class="pill ${c.active && !isExpired ? 'ok' : 'bad'}">${c.active && !isExpired ? 'Active ▶' : isExpired ? 'Expired' : 'Paused ⏸'}</span>
              </div>
              <div style="font-size:1.15rem;font-weight:700;color:var(--tx);margin:6px 0 2px">
                ${c.type === 'percent' ? `${c.val}% OFF` : `Flat ${R(c.val)} OFF`}
              </div>
              <small style="color:var(--mu);display:block;min-height:34px">${E(c.desc || "Boutique discount coupon")}</small>
              <div style="font-size:0.8rem;color:var(--mu);margin-top:6px">
                Min Order: <b>${R(c.minOrder || 0)}</b> · Valid Till: <b>${E(c.validTill || "Never")}</b>
              </div>
              <div class="coupon-usage-bar" style="margin:8px 0 4px">
                <div class="coupon-usage-fill" style="width:${percentUsed}%"></div>
              </div>
              <div style="display:flex;justify-content:space-between;align-items:center;font-size:0.75rem;color:var(--mu);margin-bottom:10px">
                <span>Used: <b>${c.usedCount || 0}</b> / ${c.maxUses || '∞'}</span>
                <span>${percentUsed}% redeemed</span>
              </div>
              
              <!-- Workable Action Buttons: Edit, Pause/Resume, Set Banner, Delete -->
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
                <button class="btn s" onclick="openEditCouponModal('${c.id}')" title="Edit Coupon Details">
                  ✏️ Edit
                </button>
                <button class="btn s ${c.active ? '' : 'p'}" onclick="toggleCouponActive('${c.id}')" title="${c.active ? 'Pause Coupon' : 'Resume Coupon'}">
                  ${c.active ? "⏸ Pause" : "▶ Resume"}
                </button>
                <button class="btn s ${c.isBanner ? 'g' : ''}" style="grid-column:1/-1" onclick="setCouponAsBanner('${c.id}')" title="${c.isBanner ? 'Click to remove coupon from storefront announcement banner' : 'Click to display this coupon on the storefront announcement banner'}">
                  ${c.isBanner ? "🌟 Live on Banner (Click to Unset)" : "📢 Set as Live Banner"}
                </button>
                <button class="btn s d" style="grid-column:1/-1" onclick="requestDelete('coupons','${c.id}')" title="Permanently Delete Coupon">
                  🗑️ Delete Coupon
                </button>
              </div>
            </div>
          `;
        }).join("") || `<p style='color:var(--mu);grid-column:1/-1;text-align:center;padding:24px'>No coupons found matching "${Security.escapeHTML(search || filter)}".</p>`}
      </div>
    </div>
  `;
}

function saveCustomBannerText() {
  const input = $("customBannerInput");
  if (!input) return;
  const val = input.value.trim();
  if (!val) return toast("Banner text cannot be empty");
  S.cfg.offerBanner = val;
  saveLS("cfg", S.cfg);
  if (typeof Realtime !== "undefined") {
    Realtime.broadcast("SETTINGS_UPDATED", S.cfg);
  }
  toast("Live storefront announcement banner updated! 📢");
  if (typeof renderFront === "function") renderFront();
  panel();
}

function resetDefaultBannerText() {
  S.cfg.offerBanner = "";
  saveLS("cfg", S.cfg);
  if (typeof Realtime !== "undefined") {
    Realtime.broadcast("SETTINGS_UPDATED", S.cfg);
  }
  toast("Banner reset to active coupon promotion 🔄");
  if (typeof renderFront === "function") renderFront();
  panel();
}

function openCreateCouponModal() {
  modal(`
    <h2 style="color:var(--br)">Generate New Boutique Coupon</h2>
    <div class="g2" style="margin-top:10px">
      <div>
        <label>Coupon Code (e.g. FESTIVE20, BRIDAL500)</label>
        <div style="display:flex;gap:6px">
          <input id="cp_code" placeholder="EID15" style="text-transform:uppercase" required>
          <button class="btn s" type="button" onclick="generateRandomPromoCode()" title="Auto-generate promo code">🎲 Suggest</button>
        </div>
      </div>
      <div>
        <label>Discount Type</label>
        <select id="cp_type">
          <option value="percent">Percentage (%)</option>
          <option value="flat">Flat Amount (₹)</option>
        </select>
      </div>
    </div>
    <div class="g2">
      <div><label>Discount Value (% or ₹)</label><input id="cp_val" type="number" placeholder="15" required></div>
      <div><label>Minimum Cart Total ₹</label><input id="cp_min" type="number" value="500"></div>
    </div>
    <div class="g2">
      <div><label>Valid Until Date</label><input id="cp_date" type="date" value="2026-12-31"></div>
      <div><label>Maximum Allowed Redemptions</label><input id="cp_max" type="number" value="100"></div>
    </div>
    <label>Description (shown to customer)</label>
    <input id="cp_desc" placeholder="Special festival celebration discount on all collections">

    <div style="margin:12px 0 16px;background:var(--sf2);padding:10px 14px;border-radius:12px;display:flex;align-items:center;gap:10px">
      <input type="checkbox" id="cp_as_banner" style="width:18px;height:18px;margin:0" checked>
      <label for="cp_as_banner" style="margin:0;cursor:pointer;color:var(--tx);font-weight:600">
        📢 Publish immediately as live storefront announcement banner
      </label>
    </div>

    <div style="display:flex;gap:10px;justify-content:flex-end">
      <button class="btn" type="button" onclick="closeM()">Cancel</button>
      <button class="btn p" type="button" onclick="saveNewCoupon()">Create &amp; Save Coupon ✅</button>
    </div>
  `);
}

function saveNewCoupon() {
  const code = $("cp_code").value.trim().toUpperCase();
  const val = Number($("cp_val").value);
  if (!code || isNaN(val) || val <= 0) return toast("Please specify valid Code and Value");

  if (coupons().some(c => c.code.toUpperCase() === code)) {
    return toast(`Coupon code "${code}" already exists! Please use a unique code.`);
  }

  const setAsBanner = $("cp_as_banner") ? $("cp_as_banner").checked : false;

  put("coupons", {
    code,
    type: $("cp_type").value,
    val,
    minOrder: Number($("cp_min").value) || 0,
    validTill: $("cp_date").value || "2026-12-31",
    maxUses: Number($("cp_max").value) || 100,
    usedCount: 0,
    active: true,
    isBanner: setAsBanner,
    desc: $("cp_desc").value.trim()
  }).then(id => {
    if (setAsBanner && id) {
      setCouponAsBanner(id);
    } else {
      if (typeof Realtime !== "undefined") {
        Realtime.broadcast("COUPON_UPDATED", S.coupons);
      }
      if (typeof renderFront === "function") renderFront();
      panel();
    }
    closeM();
    toast(`Coupon ${code} created successfully! 🎟️`);
  });
}

function openEditCouponModal(id) {
  const c = coupons().find(x => x.id == id);
  if (!c) return toast("Coupon not found");
  modal(`
    <h2 style="color:var(--br)">Edit Coupon: ${E(c.code)}</h2>
    <div class="g2" style="margin-top:10px">
      <div>
        <label>Coupon Code</label>
        <input id="cp_edit_code" value="${E(c.code)}" style="text-transform:uppercase" required>
      </div>
      <div>
        <label>Discount Type</label>
        <select id="cp_edit_type">
          <option value="percent" ${c.type === "percent" ? "selected" : ""}>Percentage (%)</option>
          <option value="flat" ${c.type === "flat" ? "selected" : ""}>Flat Amount (₹)</option>
        </select>
      </div>
    </div>
    <div class="g2">
      <div>
        <label>Discount Value</label>
        <input id="cp_edit_val" type="number" value="${c.val || 0}" required>
      </div>
      <div>
        <label>Minimum Cart Total ₹</label>
        <input id="cp_edit_min" type="number" value="${c.minOrder || 0}">
      </div>
    </div>
    <div class="g2">
      <div>
        <label>Valid Until Date</label>
        <input id="cp_edit_date" type="date" value="${c.validTill || ''}">
      </div>
      <div>
        <label>Maximum Allowed Redemptions</label>
        <input id="cp_edit_max" type="number" value="${c.maxUses || 100}">
      </div>
    </div>
    <label>Description (shown to customer)</label>
    <input id="cp_edit_desc" value="${E(c.desc || '')}">

    <div class="g2" style="margin-top:8px">
      <div>
        <label>Status</label>
        <select id="cp_edit_active">
          <option value="true" ${c.active ? "selected" : ""}>Active ▶</option>
          <option value="false" ${!c.active ? "selected" : ""}>Paused ⏸</option>
        </select>
      </div>
      <div>
        <label>Promotional Banner</label>
        <select id="cp_edit_banner">
          <option value="true" ${c.isBanner ? "selected" : ""}>🌟 Show on Storefront Banner</option>
          <option value="false" ${!c.isBanner ? "selected" : ""}>Standard Coupon</option>
        </select>
      </div>
    </div>

    <div style="display:flex;gap:10px;justify-content:space-between;margin-top:14px">
      <button class="btn d" type="button" style="background:var(--bad);color:#fff" onclick="closeM();requestDelete('coupons','${c.id}')">🗑️ Delete Coupon</button>
      <div style="display:flex;gap:8px">
        <button class="btn" type="button" onclick="closeM()">Cancel</button>
        <button class="btn p" type="button" onclick="saveEditedCoupon('${c.id}')">Save Changes ✅</button>
      </div>
    </div>
  `);
}

function saveEditedCoupon(id) {
  const code = $("cp_edit_code").value.trim().toUpperCase();
  const val = Number($("cp_edit_val").value);
  if (!code || isNaN(val) || val <= 0) return toast("Please enter valid code and discount value");

  if (coupons().some(c => c.id != id && c.code.toUpperCase() === code)) {
    return toast(`Another coupon with code "${code}" already exists!`);
  }

  const isBanner = $("cp_edit_banner").value === "true";
  const patch = {
    code,
    type: $("cp_edit_type").value,
    val,
    minOrder: Number($("cp_edit_min").value) || 0,
    validTill: $("cp_edit_date").value || "2026-12-31",
    maxUses: Number($("cp_edit_max").value) || 100,
    desc: $("cp_edit_desc").value.trim(),
    active: $("cp_edit_active").value === "true",
    isBanner
  };

  upd("coupons", id, patch).then(() => {
    if (isBanner) {
      setCouponAsBanner(id);
    } else {
      if (typeof Realtime !== "undefined") {
        Realtime.broadcast("COUPON_UPDATED", S.coupons);
      }
      if (typeof renderFront === "function") renderFront();
      panel();
    }
    closeM();
    toast(`Coupon ${code} updated successfully! ✅`);
  });
}

// ------------------------------------------
// 4B. Dedicated Client Reviews & Ratings Management Tab
// ------------------------------------------
function renderReviewsTab() {
  const allRev = typeof reviews === "function" ? reviews() : (S.reviews || []);
  const stats = typeof getShopRatingStats === "function" 
    ? getShopRatingStats() 
    : { average: 5.0, averageFormatted: "5.0", totalCount: 0, stars: 5, breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } };
  const search = (S.reviewSearch || "").trim().toLowerCase();
  const starFilter = S.reviewStarFilter || "All";
  const statusFilter = S.reviewStatusFilter || "All";

  // Filter list
  let filtered = allRev.filter(r => {
    if (starFilter !== "All" && Math.round(Number(r.rating) || 5) !== Number(starFilter)) return false;
    if (statusFilter === "Active" && r.status === "Hidden") return false;
    if (statusFilter === "Hidden" && r.status !== "Hidden") return false;
    if (search) {
      const match = `${r.name || ''} ${r.phone || ''} ${r.review || ''} ${r.orderNo || ''} ${r.service || ''}`.toLowerCase();
      if (!match.includes(search)) return false;
    }
    return true;
  });

  // Sort: newest first
  filtered.sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));

  const activeCount = allRev.filter(r => r.status !== "Hidden").length;
  const hiddenCount = allRev.filter(r => r.status === "Hidden").length;

  return `
    <!-- Top Metrics Deck: Overall Rating Score & Breakdown -->
    <div class="box" style="border:1px solid var(--br);background:linear-gradient(135deg,color-mix(in srgb,var(--br) 6%,var(--sf)),var(--sf));margin-bottom:18px">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:14px">
        <div>
          <div style="display:flex;align-items:center;gap:10px">
            <span style="font-size:1.8rem">⭐</span>
            <b style="font-size:1.25rem;color:var(--br)">Boutique Ratings &amp; Client Feedback Management</b>
          </div>
          <p style="font-size:0.84rem;color:var(--mu);margin:4px 0 0">
            Real-time verified client reviews and ratings. Manage feedback, moderate visibility, and contact clients directly.
          </p>
        </div>

        <!-- Privacy Shield Indicator Pill -->
        <div style="background:var(--sf2);padding:8px 14px;border-radius:12px;border:1px solid var(--ln);display:flex;align-items:center;gap:8px">
          <span style="font-size:1.1rem">🔒</span>
          <span style="font-size:0.8rem;color:var(--tx);font-weight:600">
            Private Admin Vault · Written reviews &amp; numbers are kept strictly confidential
          </span>
        </div>
      </div>

      <!-- KPI Summary Cards -->
      <div class="kpi-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin-top:16px">
        <div style="background:var(--sf);padding:14px;border-radius:14px;border:1px solid var(--ln);text-align:center">
          <div style="font-size:2.2rem;font-weight:800;color:var(--br);line-height:1;font-family:'Playfair Display',serif">
            ${stats.averageFormatted} <span style="font-size:1.2rem;color:#f59e0b">★</span>
          </div>
          <div style="color:#f59e0b;font-size:1.1rem;margin:3px 0">
            ${"★".repeat(stats.stars) + "☆".repeat(5 - stats.stars)}
          </div>
          <span style="font-size:0.75rem;color:var(--mu);font-weight:600">Live Homepage Score</span>
        </div>

        <div style="background:var(--sf);padding:14px;border-radius:14px;border:1px solid var(--ln);text-align:center">
          <div style="font-size:2.2rem;font-weight:800;color:var(--tx);line-height:1">
            ${allRev.length}
          </div>
          <div style="font-size:0.8rem;color:var(--ok);font-weight:700;margin:4px 0">
            ${activeCount} Active on Score
          </div>
          <span style="font-size:0.75rem;color:var(--mu);font-weight:600">Total Client Reviews</span>
        </div>

        <div style="background:var(--sf);padding:14px;border-radius:14px;border:1px solid var(--ln);text-align:center">
          <div style="font-size:2.2rem;font-weight:800;color:${hiddenCount ? 'var(--warn)' : 'var(--mu)'};line-height:1">
            ${hiddenCount}
          </div>
          <div style="font-size:0.8rem;color:var(--mu);margin:4px 0">
            Excluded from calculation
          </div>
          <span style="font-size:0.75rem;color:var(--mu);font-weight:600">Moderated / Hidden</span>
        </div>

        <!-- Star Distribution Mini-Bars -->
        <div style="background:var(--sf);padding:12px 16px;border-radius:14px;border:1px solid var(--ln);display:flex;flex-direction:column;justify-content:center;gap:4px">
          ${[5, 4, 3, 2, 1].map(s => {
            const cnt = stats.breakdown[s] || 0;
            const pct = allRev.length > 0 ? Math.round((cnt / allRev.length) * 100) : 0;
            return `
              <div style="display:flex;align-items:center;gap:6px;font-size:0.75rem">
                <span style="width:24px;color:var(--tx);font-weight:600">${s}★</span>
                <div style="flex:1;height:6px;background:var(--sf2);border-radius:99px;overflow:hidden">
                  <div style="width:${pct}%;height:100%;background:#f59e0b;border-radius:99px"></div>
                </div>
                <span style="width:20px;text-align:right;color:var(--mu)">${cnt}</span>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    </div>

    <!-- Filter Deck & Search -->
    <div class="box" style="margin-bottom:18px">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
        <!-- Star Filters -->
        <div class="tabs" style="margin:0">
          <span class="chip ${starFilter === 'All' ? 'on' : ''}" onclick="S.reviewStarFilter='All';panel()">
            All Stars (${allRev.length})
          </span>
          <span class="chip ${starFilter === '5' ? 'on' : ''}" onclick="S.reviewStarFilter='5';panel()">
            ⭐⭐⭐⭐⭐ (${stats.breakdown[5] || 0})
          </span>
          <span class="chip ${starFilter === '4' ? 'on' : ''}" onclick="S.reviewStarFilter='4';panel()">
            ⭐⭐⭐⭐ (${stats.breakdown[4] || 0})
          </span>
          <span class="chip ${starFilter === '3' ? 'on' : ''}" onclick="S.reviewStarFilter='3';panel()">
            ⭐⭐⭐ (${stats.breakdown[3] || 0})
          </span>
          <span class="chip ${starFilter === '2' ? 'on' : ''}" onclick="S.reviewStarFilter='2';panel()">
            ⭐⭐ (${stats.breakdown[2] || 0})
          </span>
          <span class="chip ${starFilter === '1' ? 'on' : ''}" onclick="S.reviewStarFilter='1';panel()">
            ⭐ (${stats.breakdown[1] || 0})
          </span>
        </div>

        <!-- Moderation Status Filter & CSV Export -->
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <div style="display:flex;gap:6px;align-items:center">
            <span style="font-size:0.8rem;color:var(--mu);font-weight:600">Status:</span>
            <select style="margin:0;padding:5px 10px;font-size:0.84rem;width:auto" onchange="S.reviewStatusFilter=this.value;panel()">
              <option value="All" ${statusFilter === 'All' ? 'selected' : ''}>All Reviews</option>
              <option value="Active" ${statusFilter === 'Active' ? 'selected' : ''}>Active (Contributes to Score)</option>
              <option value="Hidden" ${statusFilter === 'Hidden' ? 'selected' : ''}>Hidden / Moderated</option>
            </select>
          </div>
          <button class="btn s" onclick="exportReviewsCSV()" title="Download Client Reviews in CSV spreadsheet format" style="padding:5px 12px;font-size:0.82rem">
            📄 Export Reviews (CSV)
          </button>
        </div>
      </div>

      <!-- Search Input -->
      <div style="margin-top:12px;display:flex;gap:8px">
        <input style="margin:0;flex:1" placeholder="🔍 Search client name, mobile number, review text or order ID..." value="${Security.escapeHTML(S.reviewSearch || '')}" oninput="S.reviewSearch=this.value.trim().toLowerCase();panel()">
        ${S.reviewSearch ? `<button class="btn s" onclick="S.reviewSearch='';panel()">Clear</button>` : ''}
      </div>
    </div>

    <!-- Client Reviews List -->
    <div style="display:flex;flex-direction:column;gap:12px">
      ${filtered.length === 0 ? `
        <div class="box" style="text-align:center;padding:48px 20px">
          <div style="font-size:2.8rem;margin-bottom:10px">⭐</div>
          <b style="font-size:1.1rem;color:var(--tx)">No Reviews Found</b>
          <p style="font-size:0.85rem;color:var(--mu);max-width:440px;margin:6px auto 14px">
            ${search || starFilter !== 'All' ? 'No reviews matched your current filters. Try resetting search or star filters.' : 'Client reviews submitted from the homepage rating section will appear here in real time.'}
          </p>
          ${search || starFilter !== 'All' || statusFilter !== 'All' ? `
            <button class="btn s" onclick="S.reviewSearch='';S.reviewStarFilter='All';S.reviewStatusFilter='All';panel()">
              Reset All Filters
            </button>
          ` : ''}
        </div>
      ` : filtered.map(r => {
        const starNum = Number(r.rating) || 5;
        const dateStr = r.updatedAt 
          ? new Date(r.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) 
          : "Recently";
        const isHidden = r.status === "Hidden";
        const waMsg = encodeURIComponent(`Hello ${r.name || 'Ji'}, thank you for sharing your valuable review for Saifa Designs! We truly appreciate your feedback and look forward to styling your next fit.`);

        return `
          <div class="box" style="margin:0;border:1px solid ${isHidden ? 'color-mix(in srgb,var(--warn) 40%,var(--ln))' : 'var(--ln)'};background:${isHidden ? 'color-mix(in srgb,var(--warn) 4%,var(--sf))' : 'var(--sf)'};padding:18px 20px">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px">
              <div>
                <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
                  <b style="font-size:1.1rem;color:var(--tx)">${Security.escapeHTML(r.name || 'Anonymous Client')}</b>
                  <span class="pill ok" style="font-size:0.72rem;padding:2px 8px">✓ Mobile Verified</span>
                  <span class="pill" style="font-size:0.72rem;background:#fef3c7;color:#b45309;font-weight:700">
                    ${"★".repeat(starNum)} ${starNum}.0 / 5
                  </span>
                  ${isHidden ? `<span class="pill warn" style="font-size:0.72rem">Hidden from Public Score</span>` : ''}
                </div>

                <div style="display:flex;align-items:center;gap:12px;margin-top:6px;font-size:0.8rem;color:var(--mu);flex-wrap:wrap">
                  <span>📱 <b>+91 ${Security.escapeHTML(r.phone || '')}</b></span>
                  <span>·</span>
                  <span>🏷️ <b>${Security.escapeHTML(r.service || 'Boutique Service')}</b></span>
                  ${r.orderNo ? `<span>·</span><span>📋 Order: <b>#${Security.escapeHTML(r.orderNo)}</b></span>` : ''}
                  <span>·</span>
                  <span>🕒 Submitted: ${dateStr}</span>
                </div>
              </div>

              <!-- Action Controls -->
              <div style="display:flex;gap:8px;align-items:center">
                <a class="btn s g" href="https://wa.me/91${r.phone}?text=${waMsg}" target="_blank" rel="noopener" title="Thank client on WhatsApp">
                  <span>💬 WhatsApp</span>
                </a>
                <button class="btn s" onclick="toggleReviewVisibility('${r.id}')" title="${isHidden ? 'Include in public score calculation' : 'Hide from public score calculation'}">
                  ${isHidden ? "👁️ Unhide (Include)" : "👁️ Hide (Exclude)"}
                </button>
                <button class="btn s d" onclick="requestDelete('reviews','${r.id}','${Security.escapeHTML(r.name)}\\'s review')" title="Delete Review">
                  🗑️
                </button>
              </div>
            </div>

            <!-- Written Review Content -->
            <div style="margin-top:12px;background:var(--sf2);padding:14px 16px;border-radius:12px;border:1px solid var(--ln);font-size:0.9rem;line-height:1.55;color:var(--tx)">
              ${r.review && r.review.trim() !== "" ? `
                <i style="color:var(--br);font-size:1.2rem;margin-right:4px">“</i>${Security.escapeHTML(r.review)}<i style="color:var(--br);font-size:1.2rem;margin-left:4px">”</i>
              ` : `
                <span style="color:var(--mu);font-style:italic">Client gave a verified ${starNum}-star rating without additional written comments.</span>
              `}
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function toggleReviewVisibility(id) {
  const r = (reviews() || []).find(x => x.id == id);
  if (!r) return;
  const newStatus = r.status === "Hidden" ? "Active" : "Hidden";
  upd("reviews", id, { status: newStatus }).then(() => {
    toast(`Review ${newStatus === "Hidden" ? "hidden from score" : "activated on score"} ✅`);
    if (typeof panel === "function") panel();
    if (typeof renderFront === "function") renderFront();
  });
}

// ------------------------------------------
// 5. Products & Inventory Management (Search, Filters, Sort, Large Datasets & Edit Modal)
// ------------------------------------------
function onProductCategoryChange(cat) {
  const subSel = $("psubcat");
  if (!subSel) return;
  const list = cat === "Material" 
    ? (typeof getMaterialSubcats === "function" ? getMaterialSubcats() : MATERIAL_SUBCATS)
    : (typeof getReadymadeSubcats === "function" ? getReadymadeSubcats() : READYMADE_SUBCATS);
  subSel.innerHTML = list.map(s => `<option value="${Security.escapeHTML(s)}">${Security.escapeHTML(s)}</option>`).join("");
}

function onEditProductCategoryChange(cat) {
  const subSel = $("ep_subcat");
  if (!subSel) return;
  const list = cat === "Material" 
    ? (typeof getMaterialSubcats === "function" ? getMaterialSubcats() : MATERIAL_SUBCATS)
    : (typeof getReadymadeSubcats === "function" ? getReadymadeSubcats() : READYMADE_SUBCATS);
  subSel.innerHTML = list.map(s => `<option value="${Security.escapeHTML(s)}">${Security.escapeHTML(s)}</option>`).join("");
}

function quickAdjustStock(id, delta) {
  const p = products().find(x => x.id == id);
  if (!p) return;
  const newStock = Math.max(0, (Number(p.stock) || 0) + delta);
  upd("products", id, { stock: newStock }).then(() => {
    toast(`Stock updated: "${p.name}" now has ${newStock} unit(s) 📦`);
    if (typeof panel === "function") panel();
    if (typeof renderFront === "function") renderFront();
  });
}

function openEditProductModal(id) {
  const p = products().find(x => x.id == id);
  if (!p) return toast("Product not found");

  const matSubcats = typeof getMaterialSubcats === "function" ? getMaterialSubcats() : MATERIAL_SUBCATS;
  const readySubcats = typeof getReadymadeSubcats === "function" ? getReadymadeSubcats() : READYMADE_SUBCATS;
  const activeSubcats = p.cat === "Material" ? matSubcats : readySubcats;

  modal(`
    <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--ln);padding-bottom:10px;margin-bottom:14px">
      <h2 style="color:var(--br);margin:0;font-size:1.25rem">✏️ Edit Product: ${Security.escapeHTML(p.name)}</h2>
      <button class="btn s" onclick="closeM()">✕</button>
    </div>

    <div class="g2">
      <div>
        <label>Product Name *</label>
        <input id="ep_name" value="${Security.escapeHTML(p.name || '')}" required>
      </div>
      <div>
        <label>Category *</label>
        <select id="ep_cat" onchange="onEditProductCategoryChange(this.value)">
          <option value="Material" ${p.cat === "Material" ? "selected" : ""}>Material (Dress Fabrics &amp; Unstitched)</option>
          <option value="Readymade" ${p.cat === "Readymade" ? "selected" : ""}>Readymade (Pre-Stitched &amp; Occasion Wear)</option>
        </select>
      </div>
    </div>

    <div class="g2" style="margin-top:8px">
      <div>
        <label>Subcategory *</label>
        <select id="ep_subcat">
          ${activeSubcats.map(s => `<option value="${Security.escapeHTML(s)}" ${p.subcat === s ? "selected" : ""}>${Security.escapeHTML(s)}</option>`).join("")}
          ${!activeSubcats.includes(p.subcat) && p.subcat ? `<option value="${Security.escapeHTML(p.subcat)}" selected>${Security.escapeHTML(p.subcat)}</option>` : ""}
        </select>
      </div>
      <div>
        <label>Selling Price ₹ *</label>
        <input id="ep_price" type="number" value="${p.price || 0}" required>
      </div>
    </div>

    <div class="g2" style="margin-top:8px">
      <div>
        <label>Current Stock Units *</label>
        <input id="ep_stock" type="number" value="${p.stock || 0}" required>
      </div>
      <div>
        <label>Fabric Specification</label>
        <input id="ep_fabric" value="${Security.escapeHTML(p.fabric || '')}">
      </div>
    </div>

    <div class="g2" style="margin-top:8px">
      <div>
        <label>Available Colors (comma separated)</label>
        <input id="ep_colors" value="${Security.escapeHTML(p.colors || '')}" placeholder="Red, Gold, Emerald">
      </div>
      <div>
        <label>Sizes Available (comma separated)</label>
        <input id="ep_sizes" value="${Security.escapeHTML(p.sizes || '')}" placeholder="S, M, L, XL, Free size">
      </div>
    </div>

    <div class="g2" style="margin-top:8px">
      <div>
        <label>Primary Theme Color</label>
        <input id="ep_hx" type="color" value="${p.hx || '#8e1647'}">
      </div>
      <div>
        <label>Photo URL</label>
        <input id="ep_img" value="${Security.escapeHTML(p.img || '')}" placeholder="https://..." oninput="const prv = $('ep_img_prev'); if (prv) prv.src = this.value;">
      </div>
    </div>

    <div style="margin-top:10px;text-align:center">
      <img id="ep_img_prev" src="${p.img || ''}" class="img-preview-thumb" style="display:${p.img ? 'inline-block' : 'none'};max-height:100px;border-radius:10px;border:1px solid var(--ln)" alt="Preview">
    </div>

    <div style="margin-top:8px">
      <label>Product Description</label>
      <textarea id="ep_desc" rows="2">${Security.escapeHTML(p.desc || '')}</textarea>
    </div>

    <div style="display:flex;gap:10px;justify-content:space-between;margin-top:16px;padding-top:12px;border-top:1px solid var(--ln)">
      <button class="btn d" type="button" style="background:var(--bad);color:#fff" onclick="closeM();requestDelete('products','${p.id}')">
        🗑️ Delete Product
      </button>
      <div style="display:flex;gap:8px">
        <button class="btn" type="button" onclick="closeM()">Cancel</button>
        <button class="btn p" type="button" onclick="saveEditedProduct('${p.id}')">Save Changes ✅</button>
      </div>
    </div>
  `);
}

function saveEditedProduct(id) {
  const p = products().find(x => x.id == id);
  if (!p) return;

  const n = $("ep_name") ? $("ep_name").value.trim() : "";
  if (!n) return toast("Product name cannot be empty");

  const cat = $("ep_cat") ? $("ep_cat").value : p.cat;
  const subcat = $("ep_subcat") ? $("ep_subcat").value : p.subcat;
  const price = $("ep_price") ? Math.max(0, Number($("ep_price").value) || 0) : p.price;
  const stock = $("ep_stock") ? Math.max(0, Number($("ep_stock").value) || 0) : p.stock;
  const fabric = $("ep_fabric") ? $("ep_fabric").value.trim() : (p.fabric || "");
  const colors = $("ep_colors") ? $("ep_colors").value.trim() : (p.colors || "");
  const sizes = $("ep_sizes") ? $("ep_sizes").value.trim() : (p.sizes || "");
  const hx = $("ep_hx") ? $("ep_hx").value : (p.hx || "#8e1647");
  const img = $("ep_img") ? $("ep_img").value.trim() : (p.img || "");
  const desc = $("ep_desc") ? $("ep_desc").value.trim() : (p.desc || "");

  upd("products", id, {
    name: n,
    cat,
    subcat,
    price,
    stock,
    fabric,
    colors,
    sizes,
    hx,
    img,
    desc
  }).then(() => {
    closeM();
    toast(`Product "${n}" updated successfully! ✅`);
    if (typeof panel === "function") panel();
    if (typeof renderFront === "function") renderFront();
  });
}

function renderProductsTab() {
  const allProds = products();
  const matCount = allProds.filter(p => p.cat === "Material").length;
  const readyCount = allProds.filter(p => p.cat === "Readymade").length;
  const lowStockCount = allProds.filter(p => (Number(p.stock) || 0) < 5).length;
  const outOfStockCount = allProds.filter(p => (Number(p.stock) || 0) <= 0).length;

  const search = (S.prodSearch || "").trim().toLowerCase();
  const catFilter = S.prodCat || "All";
  const subcatFilter = S.prodSubcat || "All";
  const stockFilter = S.prodStock || "All";
  const sortBy = S.prodSort || "recent";
  const pageSize = Number(S.prodPageSize) || 12;
  const currentPage = Math.max(1, Number(S.prodPage) || 1);

  // Available Subcategories based on selected Category filter
  const matSubcats = typeof getMaterialSubcats === "function" ? getMaterialSubcats() : MATERIAL_SUBCATS;
  const readySubcats = typeof getReadymadeSubcats === "function" ? getReadymadeSubcats() : READYMADE_SUBCATS;
  const availableSubcats = catFilter === "Material" ? matSubcats : catFilter === "Readymade" ? readySubcats : Array.from(new Set([...matSubcats, ...readySubcats]));

  // 1. Filtering
  let filtered = allProds.filter(p => {
    if (catFilter !== "All" && p.cat !== catFilter) return false;
    if (subcatFilter !== "All" && p.subcat !== subcatFilter) return false;
    if (stockFilter === "In Stock" && (Number(p.stock) || 0) < 5) return false;
    if (stockFilter === "Low Stock" && ((Number(p.stock) || 0) >= 5 || (Number(p.stock) || 0) <= 0)) return false;
    if (stockFilter === "Out of Stock" && (Number(p.stock) || 0) > 0) return false;
    if (search) {
      const matchText = `${p.name || ''} ${p.fabric || ''} ${p.subcat || ''} ${p.colors || ''} ${p.sizes || ''} ${p.desc || ''}`.toLowerCase();
      if (!matchText.includes(search)) return false;
    }
    return true;
  });

  // 2. Sorting
  filtered.sort((a, b) => {
    if (sortBy === "price_asc") return (a.price || 0) - (b.price || 0);
    if (sortBy === "price_desc") return (b.price || 0) - (a.price || 0);
    if (sortBy === "stock_asc") return (a.stock || 0) - (b.stock || 0);
    if (sortBy === "stock_desc") return (b.stock || 0) - (a.stock || 0);
    if (sortBy === "name_asc") return String(a.name || "").localeCompare(String(b.name || ""));
    if (sortBy === "name_desc") return String(b.name || "").localeCompare(String(a.name || ""));
    return (b.id || "").localeCompare(a.id || ""); // Newest / Default
  });

  // 3. Pagination calculation
  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validPage = Math.min(currentPage, totalPages);
  const startIndex = (validPage - 1) * pageSize;
  const pageItems = filtered.slice(startIndex, startIndex + pageSize);

  return `
    <!-- Top Action Deck: Add Product Accordion/Toggle -->
    <div class="box" style="margin-bottom:18px">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
        <div>
          <b style="font-size:1.1rem;color:var(--br)">👗 Add New Boutique Garment / Fabric Collection</b>
          <p style="font-size:0.8rem;color:var(--mu);margin:3px 0 0">
            Publish brand new luxury materials or readymade collections to your live catalogue and storefront.
          </p>
        </div>
        <button class="btn s" onclick="const f=$('newProdForm'); if(f) f.style.display = f.style.display==='none'?'block':'none'">
          ✨ Toggle Add Product Form
        </button>
      </div>

      <div id="newProdForm" style="display:block;margin-top:12px;padding-top:12px;border-top:1px solid var(--ln)">
        <div class="g2">
          <div><label>Product Name *</label><input id="pn1" placeholder="e.g. Zari Silk Lehenga"></div>
          <div>
            <label>Category *</label>
            <select id="pc" onchange="onProductCategoryChange(this.value)">
              <option value="Material">Material (Dress Fabrics &amp; Unstitched)</option>
              <option value="Readymade">Readymade (Pre-Stitched &amp; Occasion Wear)</option>
            </select>
          </div>
          <div>
            <label>Subcategory *</label>
            <select id="psubcat">
              ${matSubcats.map(s => `<option value="${Security.escapeHTML(s)}">${Security.escapeHTML(s)}</option>`).join("")}
            </select>
          </div>
          <div><label>Selling Price ₹ *</label><input id="pp" type="number" placeholder="e.g. 2500"></div>
          <div><label>Initial Stock Units *</label><input id="ps" type="number" value="10"></div>
          <div><label>Fabric Specification</label><input id="pf" placeholder="Pure Chanderi Silk"></div>
          <div><label>Available Colors</label><input id="pcl" placeholder="Red, Gold, Emerald"></div>
          <div><label>Sizes Available</label><input id="psz" placeholder="Free size / S, M, L"></div>
          <div><label>Primary Theme Color</label><input id="ph" type="color" value="#8e1647"></div>
        </div>

        <!-- Image Upload, Live Camera & AI Visualizer Options -->
        <div style="margin:12px 0;background:var(--sf2);padding:14px;border-radius:14px">
          <b>🖼️ Product Image: Device Upload, Live Camera Viewfinder or AI</b>
          <div class="g2" style="margin-top:6px">
            <div>
              <label>Upload Photo from Device</label>
              <input type="file" id="p_file" accept="image/*" onchange="handleProductImageUpload(this)">
            </div>
            <div>
              <label>Live Camera Capture</label>
              <button type="button" class="btn s p" style="width:100%;margin-top:2px" onclick="captureProductPhotoLive()">
                📸 Open Live Camera Viewfinder
              </button>
            </div>
          </div>
          <div class="g2" style="margin-top:8px">
            <div>
              <label>Or Paste Image URL</label>
              <input id="p_img_url" placeholder="https://..." oninput="updateProductImgPreview(this.value)">
            </div>
            <div>
              <label>AI Fabric Pattern</label>
              <button class="btn s" type="button" style="width:100%;margin-top:2px" onclick="generateAIProductPattern()">
                ✨ Generate AI Cloth Pattern
              </button>
            </div>
          </div>
          <div id="p_img_preview_box" style="margin-top:10px;text-align:center;display:${newProductImgData ? 'block' : 'none'}">
            <img id="p_img_preview" class="img-preview-thumb" src="${newProductImgData || ''}" alt="Preview">
            <button type="button" class="btn s d" style="margin-top:4px" onclick="clearProductImgPreview()">Clear Photo</button>
          </div>
        </div>

        <label>Product Description</label>
        <textarea id="pd" rows="2" placeholder="Rich zari embroidery, matching dupatta..."></textarea>
        
        <div style="display:flex;gap:10px;margin-top:10px">
          <button class="btn p" onclick="addProd()">Save Product to Catalogue</button>
          ${products() === SEED_PROD ? ' <button class="btn" onclick="seedDb()">Load Sample Catalogue into Database</button>' : ""}
        </div>
      </div>
    </div>

    <!-- Inventory Filter Deck, Search & Sorting Controls -->
    <div class="box" style="padding:16px 20px;margin-bottom:18px">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
        <!-- Category Filter Tabs -->
        <div class="tabs" style="margin:0;justify-content:flex-start">
          <span class="chip ${catFilter === 'All' ? 'on' : ''}" onclick="S.prodCat='All';S.prodSubcat='All';S.prodPage=1;panel()">
            All (${allProds.length})
          </span>
          <span class="chip ${catFilter === 'Material' ? 'on' : ''}" onclick="S.prodCat='Material';S.prodSubcat='All';S.prodPage=1;panel()">
            Materials (${matCount})
          </span>
          <span class="chip ${catFilter === 'Readymade' ? 'on' : ''}" onclick="S.prodCat='Readymade';S.prodSubcat='All';S.prodPage=1;panel()">
            Readymade (${readyCount})
          </span>
        </div>

        <!-- Stock Status Filters -->
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
          <span style="font-size:0.8rem;color:var(--mu);font-weight:600">Stock:</span>
          <select style="margin:0;padding:5px 10px;font-size:0.84rem;width:auto" onchange="S.prodStock=this.value;S.prodPage=1;panel()">
            <option value="All" ${stockFilter === 'All' ? 'selected' : ''}>All Levels (${allProds.length})</option>
            <option value="In Stock" ${stockFilter === 'In Stock' ? 'selected' : ''}>🟢 In Stock (≥5 units)</option>
            <option value="Low Stock" ${stockFilter === 'Low Stock' ? 'selected' : ''}>🟠 Low Stock (${lowStockCount})</option>
            <option value="Out of Stock" ${stockFilter === 'Out of Stock' ? 'selected' : ''}>🔴 Out of Stock (${outOfStockCount})</option>
          </select>
        </div>
      </div>

      <!-- Secondary Controls: Search, Dynamic Subcategories & Sorting Dropdown -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:10px;margin-top:14px;padding-top:12px;border-top:1px solid var(--ln)">
        <!-- Real-time Search Input -->
        <div style="position:relative">
          <input placeholder="🔍 Search name, fabric, colors, sizes..." value="${Security.escapeHTML(S.prodSearch || '')}" oninput="S.prodSearch=this.value.trim().toLowerCase();S.prodPage=1;panel()" style="margin:0;padding:7px 12px;font-size:0.84rem;width:100%">
          ${S.prodSearch ? `<button class="btn s" onclick="S.prodSearch='';S.prodPage=1;panel()" style="position:absolute;right:4px;top:4px;padding:3px 8px;font-size:0.75rem">✕</button>` : ''}
        </div>

        <!-- Dynamic Subcategory Dropdown Filter -->
        <div>
          <select style="margin:0;padding:7px 10px;font-size:0.84rem;width:100%" onchange="S.prodSubcat=this.value;S.prodPage=1;panel()">
            <option value="All" ${subcatFilter === 'All' ? 'selected' : ''}>All Subcategories (${availableSubcats.length})</option>
            ${availableSubcats.map(sub => {
              const count = allProds.filter(p => (catFilter === 'All' || p.cat === catFilter) && p.subcat === sub).length;
              return `<option value="${Security.escapeHTML(sub)}" ${subcatFilter === sub ? 'selected' : ''}>${Security.escapeHTML(sub)} (${count})</option>`;
            }).join("")}
          </select>
        </div>

        <!-- Sorting Options -->
        <div>
          <select style="margin:0;padding:7px 10px;font-size:0.84rem;width:100%" onchange="S.prodSort=this.value;panel()">
            <option value="recent" ${sortBy === 'recent' ? 'selected' : ''}>Recently Added (Newest)</option>
            <option value="price_asc" ${sortBy === 'price_asc' ? 'selected' : ''}>Price: Low to High</option>
            <option value="price_desc" ${sortBy === 'price_desc' ? 'selected' : ''}>Price: High to Low</option>
            <option value="stock_asc" ${sortBy === 'stock_asc' ? 'selected' : ''}>Stock: Lowest First (Urgent)</option>
            <option value="stock_desc" ${sortBy === 'stock_desc' ? 'selected' : ''}>Stock: Highest First</option>
            <option value="name_asc" ${sortBy === 'name_asc' ? 'selected' : ''}>Name: A to Z</option>
            <option value="name_desc" ${sortBy === 'name_desc' ? 'selected' : ''}>Name: Z to A</option>
          </select>
        </div>

        <!-- Page Size Selector -->
        <div style="display:flex;align-items:center;gap:6px">
          <span style="font-size:0.78rem;color:var(--mu);white-space:nowrap">Per Page:</span>
          <select style="margin:0;padding:7px 10px;font-size:0.84rem;width:100%" onchange="S.prodPageSize=Number(this.value);S.prodPage=1;panel()">
            <option value="12" ${pageSize === 12 ? 'selected' : ''}>12 items</option>
            <option value="24" ${pageSize === 24 ? 'selected' : ''}>24 items</option>
            <option value="48" ${pageSize === 48 ? 'selected' : ''}>48 items</option>
            <option value="1000" ${pageSize === 1000 ? 'selected' : ''}>All items</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Inventory Data Table -->
    <div class="box">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:12px">
        <div>
          <b>Existing Inventory Collection</b>
          <span style="color:var(--mu);font-size:0.85rem;margin-left:6px">
            Showing <b>${totalItems ? startIndex + 1 : 0}–${Math.min(startIndex + pageSize, totalItems)}</b> of <b>${totalItems}</b> matching collection items
          </span>
        </div>
        ${(search || catFilter !== 'All' || subcatFilter !== 'All' || stockFilter !== 'All') ? `
          <button class="btn s" onclick="S.prodSearch='';S.prodCat='All';S.prodSubcat='All';S.prodStock='All';S.prodPage=1;panel()">
            🔄 Reset Filters
          </button>
        ` : ''}
      </div>

      <div style="overflow-x:auto">
        <table>
          <thead>
            <tr>
              <th style="width:60px">Photo</th>
              <th>Collection Name &amp; Fabric</th>
              <th>Classification</th>
              <th style="width:130px">Selling Price</th>
              <th style="width:180px">Stock Management</th>
              <th style="text-align:right;width:140px">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${pageItems.map(p => {
              const currentStock = Number(p.stock) || 0;
              const isOutOfStock = currentStock <= 0;
              const isLowStock = currentStock > 0 && currentStock < 5;
              const stockStatusPill = isOutOfStock 
                ? `<span class="pill bad" style="font-size:0.72rem;font-weight:700">🔴 Out of Stock</span>`
                : isLowStock
                ? `<span class="pill w" style="font-size:0.72rem;font-weight:700">🟠 Low (${currentStock})</span>`
                : `<span class="pill ok" style="font-size:0.72rem;font-weight:700">🟢 In Stock (${currentStock})</span>`;

              return `
                <tr>
                  <td>
                    <div style="width:48px;height:48px;border-radius:10px;overflow:hidden;background:var(--sf2);display:grid;place-items:center;border:1px solid var(--ln);box-shadow:0 2px 8px rgba(0,0,0,0.06)">
                      ${p.img ? `<img src="${Security.escapeHTML(p.img)}" style="width:100%;height:100%;object-fit:cover" alt="${Security.escapeHTML(p.name)}" onclick="modal('<div style=\\'text-align:center\\'><img src=\\'${Security.escapeHTML(p.img)}\\' style=\\'max-width:100%;border-radius:14px\\'></div>')" title="Click to enlarge">` : `<span style="font-size:1.6rem">${p.em || "👗"}</span>`}
                    </div>
                  </td>
                  <td>
                    <b style="font-size:0.95rem;color:var(--tx)">${Security.escapeHTML(p.name)}</b><br>
                    <small style="color:var(--mu);font-weight:600">${Security.escapeHTML(p.fabric || 'Luxury Fabric')}</small>
                    ${(p.colors || p.sizes) ? `
                      <div style="margin-top:3px;font-size:0.75rem;color:var(--mu)">
                        ${p.colors ? `Colors: <i>${Security.escapeHTML(p.colors)}</i>` : ''}
                        ${p.colors && p.sizes ? ' · ' : ''}
                        ${p.sizes ? `Sizes: <b>${Security.escapeHTML(p.sizes)}</b>` : ''}
                      </div>
                    ` : ''}
                  </td>
                  <td>
                    <span class="tag" style="margin-bottom:2px">${Security.escapeHTML(p.cat || 'Collection')}</span><br>
                    <small style="color:var(--mu);font-weight:600">${Security.escapeHTML(p.subcat || 'General')}</small>
                  </td>
                  <td>
                    <div style="display:flex;align-items:center;gap:3px">
                      <b>₹</b>
                      <input style="width:90px;margin:0;padding:5px 8px;font-weight:700;font-size:0.86rem" type="number" value="${p.price}" onchange="upd('products','${p.id}',{price:+this.value}).then(()=>{toast('Price updated to ₹'+this.value);if(typeof renderFront==='function')renderFront();})">
                    </div>
                  </td>
                  <td>
                    <div style="margin-bottom:4px">${stockStatusPill}</div>
                    <div style="display:flex;align-items:center;gap:4px">
                      <button class="btn s" style="padding:4px 8px;font-weight:800;font-size:0.85rem" onclick="quickAdjustStock('${p.id}', -1)" title="Decrease stock by 1">−</button>
                      <input style="width:65px;margin:0;padding:4px 6px;text-align:center;font-weight:700;font-size:0.86rem" type="number" value="${currentStock}" onchange="upd('products','${p.id}',{stock:+this.value}).then(()=>{toast('Stock updated to '+this.value);if(typeof renderFront==='function')renderFront();})">
                      <button class="btn s" style="padding:4px 8px;font-weight:800;font-size:0.85rem" onclick="quickAdjustStock('${p.id}', 1)" title="Increase stock by 1">+</button>
                      <button class="btn s ok" style="padding:4px 8px;font-size:0.75rem" onclick="quickAdjustStock('${p.id}', 10)" title="Quick restock +10 units">+10</button>
                    </div>
                  </td>
                  <td style="text-align:right">
                    <div style="display:inline-flex;gap:6px">
                      <button class="btn s" onclick="openEditProductModal('${p.id}')" title="Edit full product details">
                        ✏️ Edit
                      </button>
                      <button class="btn s d" onclick="requestDelete('products','${p.id}')" title="Delete product permanently">
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              `;
            }).join("") || `
              <tr>
                <td colspan="6" style="text-align:center;padding:36px;color:var(--mu)">
                  <div style="font-size:2.2rem;margin-bottom:8px">🔍</div>
                  <b>No products found matching your search and filter criteria.</b><br>
                  <button class="btn s" style="margin-top:10px" onclick="S.prodSearch='';S.prodCat='All';S.prodSubcat='All';S.prodStock='All';S.prodPage=1;panel()">
                    Reset All Filters
                  </button>
                </td>
              </tr>
            `}
          </tbody>
        </table>
      </div>

      <!-- Pagination Footer Controls for Large Datasets -->
      ${totalPages > 1 ? `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:16px;padding-top:14px;border-top:1px solid var(--ln);flex-wrap:wrap;gap:10px">
          <div style="font-size:0.84rem;color:var(--mu)">
            Page <b>${validPage}</b> of <b>${totalPages}</b> (${totalItems} total items)
          </div>
          <div style="display:flex;gap:6px;align-items:center">
            <button class="btn s" ${validPage <= 1 ? 'disabled style="opacity:0.5;cursor:not-allowed"' : ''} onclick="S.prodPage=${validPage - 1};panel()">
              ◀ Previous
            </button>
            <div style="display:flex;gap:4px">
              ${(() => {
                const maxButtons = 5;
                const startBtn = Math.max(1, validPage - 2);
                const endBtn = Math.min(totalPages, startBtn + maxButtons - 1);
                const btns = [];
                for (let pg = startBtn; pg <= endBtn; pg++) {
                  btns.push(`
                    <button class="btn s ${pg === validPage ? 'p' : ''}" style="min-width:32px;padding:4px 8px;font-weight:700" onclick="S.prodPage=${pg};panel()">
                      ${pg}
                    </button>
                  `);
                }
                return btns.join("");
              })()}
            </div>
            <button class="btn s" ${validPage >= totalPages ? 'disabled style="opacity:0.5;cursor:not-allowed"' : ''} onclick="S.prodPage=${validPage + 1};panel()">
              Next ▶
            </button>
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

let newProductImgData = "";

function handleProductImageUpload(input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = e => {
      newProductImgData = e.target.result;
      updateProductImgPreview(newProductImgData);
    };
    reader.readAsDataURL(input.files[0]);
  }
}

function updateProductImgPreview(src) {
  newProductImgData = src;
  const box = $("p_img_preview_box");
  const img = $("p_img_preview");
  if (src && box && img) {
    img.src = src;
    box.style.display = "block";
  }
}

function captureProductPhotoLive() {
  if (typeof App !== "undefined" && App.openLiveCamera) {
    App.openLiveCamera(dataUrl => {
      newProductImgData = dataUrl;
      updateProductImgPreview(dataUrl);
      if ($("p_img_url")) $("p_img_url").value = "";
    });
  } else {
    toast("Live camera initializing...");
  }
}

function clearProductImgPreview() {
  newProductImgData = "";
  if ($("p_file")) $("p_file").value = "";
  if ($("p_img_url")) $("p_img_url").value = "";
  const box = $("p_img_preview_box");
  if (box) box.style.display = "none";
}

function generateAIProductPattern() {
  const g = $("pn1").value.trim() || $("pc").value;
  const col = $("ph").value || "#8e1647";
  const svg = AI.generateClothSvg(g, col);
  updateProductImgPreview(svg);
  toast("AI cloth pattern generated ✨");
}

function addProd() {
  const n = $("pn1").value.trim();
  if (!n) return toast("Enter product name");
  const cat = $("pc") ? $("pc").value : "Material";
  const subcat = $("psubcat") ? $("psubcat").value : (cat === "Material" ? (typeof getMaterialSubcats === "function" ? getMaterialSubcats()[0] : MATERIAL_SUBCATS[0]) : (typeof getReadymadeSubcats === "function" ? getReadymadeSubcats()[0] : READYMADE_SUBCATS[0]));

  put("products", {
    name: n,
    cat: cat,
    subcat: subcat,
    price: +$("pp").value || 0,
    stock: +$("ps").value || 0,
    fabric: $("pf").value,
    colors: $("pcl").value,
    sizes: $("psz").value,
    hx: $("ph").value || "#8e1647",
    em: "👗",
    img: newProductImgData || $("p_img_url").value.trim(),
    desc: $("pd").value
  }).then(id => {
    if (id) {
      newProductImgData = "";
      toast(`Product "${n}" added to ${subcat}! ✅`);
      if (typeof panel === "function") panel();
      if (typeof renderFront === "function") renderFront();
    }
  });
}

function seedDb() {
  SEED_PROD.forEach(p => {
    const o = { ...p };
    delete o.id;
    put("products", o);
  });
  toast("Sample catalogue loaded into database");
}

// ------------------------------------------
// 6. Workers & Artisans HR Tab
// ------------------------------------------
let newWorkerImgData = "";

function maskAadhaar(num) {
  if (!num) return "-";
  const cleaned = String(num).replace(/[\s-]/g, "");
  if (cleaned.length < 4) return cleaned;
  return `•••• •••• ${cleaned.slice(-4)}`;
}

function copyWorkerCredentials(name, wid, phone, pin) {
  const text = `SAIFA DESIGNS Artisan Portal Login Credentials\nName: ${name}\nLogin ID: ${wid}\nMobile Login: ${phone}\nInitial Security PIN: ${pin}\nPortal: Staff & Artisan Login button on storefront`;
  navigator.clipboard.writeText(text).then(() => {
    toast(`Credentials for ${name} copied to clipboard! 📋`);
  }).catch(() => {
    toast(`Login ID: ${wid} | PIN: ${pin}`);
  });
}

function renderWorkersTab() {
  const allWorkers = workers();

  return `
    <!-- Secure Credentials & Authentication Guide (Admin Only) -->
    <div class="artisan-credentials-box">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap">
        <div style="display:flex;align-items:center;gap:12px">
          <div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,var(--br),var(--gd));display:grid;place-items:center;font-size:1.4rem;color:#fff;flex-shrink:0">
            🔐
          </div>
          <div>
            <b style="font-size:1.05rem;color:var(--br)">Artisan &amp; Tailor Secure Credentials Guide (Admin Only)</b>
            <p style="font-size:0.8rem;color:var(--mu);margin:2px 0 0">
              For security, credentials and instructions are displayed <b>only inside this admin panel</b> and never publicly on the storefront.
            </p>
          </div>
        </div>
        <span class="pill ok" style="font-size:0.75rem;padding:4px 10px">Role-Based Access Protected</span>
      </div>

      <div style="background:var(--sf);border:1px solid var(--ln);border-radius:12px;padding:12px 14px;margin-top:14px;font-size:0.84rem;line-height:1.55">
        <p style="margin:0 0 6px">
          💡 <b>How Artisans Log In:</b><br>
          1. Artisans click <b>"Staff Login"</b> on the storefront header.<br>
          2. They can enter their <b>10-digit registered mobile number</b> or assigned <b>Artisan ID</b>.<br>
          3. Security PIN is set to their Date of Birth (<b>DDMMYYYY</b>).
        </p>
      </div>
    </div>

    <!-- Register Artisan / Tailor Form -->
    <div class="box">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
        <b>🧵 Register New Artisan / Tailor</b>
        <small style="color:var(--mu)">12-Digit Aadhaar &amp; Residential Address Verification</small>
      </div>

      <div class="g2" style="margin-top:10px">
        <div>
          <label>Full Name *</label>
          <input id="wn" placeholder="e.g. Master Aslam" required>
        </div>
        <div>
          <label>Worker ID (Format: w104@saifadesigns or w104) *</label>
          <input id="wi" placeholder="w104@saifadesigns" required>
        </div>
      </div>

      <div class="g2">
        <div>
          <label>Date of Birth (DOB) * (Generates Initial 8-Digit Security PIN DDMMYYYY)</label>
          <input id="wdob" type="date" required>
        </div>
        <div>
          <label>Registered Contact Phone (10 Digits) * (Supports Mobile Login)</label>
          <input id="wph" type="tel" inputmode="numeric" maxlength="10" placeholder="10-digit mobile number" required>
        </div>
      </div>

      <div class="g2">
        <div>
          <label>Government Aadhaar Number (12 Digits) *</label>
          <input id="waadhaar" type="text" inputmode="numeric" maxlength="14" placeholder="12-digit Aadhaar e.g. 987654321098" oninput="this.value=this.value.replace(/[^0-9]/g,'')">
        </div>
        <div>
          <label>Craft / Specialization Role</label>
          <select id="wr_select" onchange="toggleCustomCraftInput(this.value)">
            ${CRAFT_ROLES.map(r => `<option value="${Security.escapeHTML(r)}">${Security.escapeHTML(r)}</option>`).join("")}
          </select>
          <div id="wr_custom_box" style="margin-top:6px;display:none">
            <label>Specify Custom Craft / Specialization Role</label>
            <input id="wr_custom" placeholder="Type custom artisan specialization...">
          </div>
        </div>
      </div>

      <div style="margin-top:4px">
        <label>Residential Address (Home / Workshop Location) *</label>
        <textarea id="waddr" rows="2" placeholder="Complete residential address of the artisan for verification & fair records..."></textarea>
      </div>

      <!-- Worker Photo Upload & Live Camera -->
      <div style="margin:12px 0;background:var(--sf2);padding:14px;border-radius:14px">
        <b>📸 Artisan Profile Photo: Device Upload or Live Camera Viewfinder</b>
        <div class="g2" style="margin-top:6px">
          <div>
            <label>Upload Photo from Device</label>
            <input type="file" id="w_file" accept="image/*" onchange="handleWorkerImageUpload(this)">
          </div>
          <div>
            <label>Live Camera Capture</label>
            <button type="button" class="btn s p" style="width:100%;margin-top:2px" onclick="captureWorkerPhotoLive()">
              📸 Open Live Camera Viewfinder
            </button>
          </div>
        </div>
        <div style="margin-top:8px">
          <label>Or Photo URL</label>
          <input id="wimg" placeholder="https://..." value="${Security.escapeHTML(newWorkerImgData || '')}" oninput="updateWorkerImgPreview(this.value)">
        </div>
        <div id="w_img_preview_box" style="margin-top:10px;text-align:center;display:${newWorkerImgData ? 'block' : 'none'}">
          <img id="w_img_preview" class="img-preview-thumb" src="${newWorkerImgData || ''}" alt="Artisan Preview">
          <button type="button" class="btn s d" style="margin-top:4px" onclick="clearWorkerImgPreview()">Clear Photo</button>
        </div>
      </div>

      <button class="btn p" style="margin-top:6px;padding:12px 24px" onclick="addW()">
        ✅ Register Artisan &amp; Generate Credentials
      </button>
    </div>

    <!-- Active Artisans Directory & Fair Wages -->
    <div class="box">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
        <b>Registered Artisans &amp; Fair Piece-Rate Wages (${allWorkers.length})</b>
        <small style="color:var(--mu)">Verified Government ID, Address &amp; Piece-Rate Matrix</small>
      </div>

      <div style="overflow-x:auto;margin-top:12px">
        <table class="wages-matrix-table">
          <thead>
            <tr>
              <th>Artisan</th>
              <th>Login ID &amp; Mobile</th>
              <th>Aadhaar Number</th>
              <th>Craft Role</th>
              <th>Residential Address</th>
              <th>Security PIN</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${allWorkers.map(w => `
              <tr>
                <td>
                  <div style="display:flex;align-items:center;gap:10px">
                    <div style="width:38px;height:38px;border-radius:50%;overflow:hidden;background:#eee;flex-shrink:0;border:1px solid var(--ln)">
                      ${w.img ? `<img src="${Security.escapeHTML(w.img)}" style="width:100%;height:100%;object-fit:cover">` : '<span style="font-size:1.3rem">🧵</span>'}
                    </div>
                    <div>
                      <b>${Security.escapeHTML(w.name)}</b><br>
                      <small style="color:var(--mu)">Joined: ${Security.escapeHTML(w.joined || "2026")}</small>
                    </div>
                  </div>
                </td>
                <td>
                  <code style="font-size:0.8rem;color:var(--br)">${Security.escapeHTML(w.wid)}</code><br>
                  <small style="color:var(--mu)">📱 ${Security.escapeHTML(w.phone || "-")}</small>
                </td>
                <td>
                  <span class="aadhaar-badge ${w.aadhaar ? 'verified' : ''}">
                    ${w.aadhaar ? `🔒 ${maskAadhaar(w.aadhaar)}` : '<span style="color:var(--warn)">Pending</span>'}
                  </span>
                </td>
                <td>
                  <span class="pill" style="font-size:0.75rem">${Security.escapeHTML(w.role)}</span>
                </td>
                <td style="max-width:180px;font-size:0.78rem;color:var(--mu);line-height:1.3">
                  ${Security.escapeHTML(w.address || "Workshop Atelier")}
                </td>
                <td>
                  <code style="background:var(--sf2);padding:2px 6px;border-radius:4px;font-size:0.8rem">${Security.escapeHTML(w.pin)}</code>
                </td>
                <td>
                  <div style="display:flex;gap:4px;flex-wrap:wrap">
                    <button class="copy-cred-btn" onclick="copyWorkerCredentials('${Security.escapeHTML(w.name)}', '${Security.escapeHTML(w.wid)}', '${Security.escapeHTML(w.phone || '')}', '${Security.escapeHTML(w.pin)}')">
                      📋 Copy
                    </button>
                    <button class="btn s d" style="padding:2px 8px;font-size:0.72rem" onclick="requestDelete('workers','${w.id}')">
                      ✕ Delete
                    </button>
                  </div>
                </td>
              </tr>
            `).join("") || "<tr><td colspan='7' style='text-align:center;padding:20px 0;color:var(--mu)'>No artisans registered yet.</td></tr>"}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function toggleCustomCraftInput(val) {
  const box = $("wr_custom_box");
  if (box) box.style.display = (val === "Other (Specify Custom Craft...)") ? "block" : "none";
}

function handleWorkerImageUpload(input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = e => {
      newWorkerImgData = e.target.result;
      updateWorkerImgPreview(newWorkerImgData);
    };
    reader.readAsDataURL(input.files[0]);
  }
}

function updateWorkerImgPreview(src) {
  newWorkerImgData = src;
  const box = $("w_img_preview_box");
  const img = $("w_img_preview");
  if (src && box && img) {
    img.src = src;
    box.style.display = "block";
  }
}

function captureWorkerPhotoLive() {
  if (typeof App !== "undefined" && App.openLiveCamera) {
    App.openLiveCamera(dataUrl => {
      newWorkerImgData = dataUrl;
      updateWorkerImgPreview(dataUrl);
      if ($("wimg")) $("wimg").value = "";
    });
  } else {
    toast("Live camera initializing...");
  }
}

function clearWorkerImgPreview() {
  newWorkerImgData = "";
  if ($("w_file")) $("w_file").value = "";
  if ($("wimg")) $("wimg").value = "";
  const box = $("w_img_preview_box");
  if (box) box.style.display = "none";
}

function addW() {
  const n = $("wn").value.trim();
  const rawId = $("wi").value.trim();
  const dob = $("wdob").value;
  const ph = np($("wph").value);
  const aadhaar = $("waadhaar") ? $("waadhaar").value.replace(/[\s-]/g, "").trim() : "";
  const addr = $("waddr") ? $("waddr").value.trim() : "";

  if (!n) return toast("Please enter artisan's full name");
  if (!rawId) return toast("Please enter Worker ID");
  if (!dob) return toast("Please select Date of Birth (generates secure PIN)");
  if (ph.length < 10) return toast("Please enter a valid 10-digit mobile number");

  // Validate 12-digit Aadhaar if provided
  if (aadhaar && !/^\d{12}$/.test(aadhaar)) {
    return toast("Aadhaar must be exactly 12 digits (numeric only)");
  }

  // Format Worker ID as wid@saifadesigns if user typed short ID
  let wid = rawId.toLowerCase();
  if (!wid.includes("@")) {
    wid = `${wid}@saifadesigns`;
  }

  // DOB formatted as DDMMYYYY
  const parts = dob.split("-"); // [YYYY, MM, DD]
  const pin = parts[2] + parts[1] + parts[0];

  if ((S.workers || []).some(w => w.wid.toLowerCase() === wid)) {
    return toast(`Worker ID '${wid}' already exists`);
  }
  if ((S.workers || []).some(w => w.phone === ph)) {
    return toast(`Mobile number '${ph}' is already registered to another worker`);
  }

  const craftSelect = $("wr_select").value;
  let finalRole = craftSelect;
  if (craftSelect === "Other (Specify Custom Craft...)") {
    const customRole = $("wr_custom") ? $("wr_custom").value.trim() : "";
    finalRole = customRole || "Artisan Tailor";
  }

  const photo = newWorkerImgData || ($("wimg") ? $("wimg").value.trim() : "");

  put("workers", {
    name: n,
    wid: wid,
    dob,
    pin,
    role: finalRole,
    phone: ph,
    aadhaar: aadhaar,
    address: addr || "Atelier Workshop, Mumbai",
    img: photo,
    status: "Active",
    joined: new Date().toISOString().slice(0, 10),
    ts: Date.now()
  }).then(id => {
    if (id) {
      newWorkerImgData = "";
      toast(`Artisan registered! Login ID: ${wid} (PIN: ${pin}) ✅`);
      if (typeof panel === "function") panel();
    }
  });
}

// ------------------------------------------
// 7. Salary, Payouts & Smart Attendance Calendar with AI
// ------------------------------------------
function changeAttMonth(delta) {
  let cur = S.attYearMonth || new Date().toISOString().slice(0, 7);
  let [y, m] = cur.split("-").map(Number);
  if (delta === 0) {
    const now = new Date();
    y = now.getFullYear();
    m = now.getMonth() + 1;
  } else {
    m += delta;
    if (m > 12) { m = 1; y++; }
    else if (m < 1) { m = 12; y--; }
  }
  S.attYearMonth = `${y}-${String(m).padStart(2, "0")}`;
  if (typeof panel === "function") panel();
}

function getMonthCalendarDays(year, monthIndex) {
  const firstDay = new Date(year, monthIndex, 1);
  const lastDay = new Date(year, monthIndex + 1, 0);
  const daysInMonth = lastDay.getDate();

  // Monday = 0, ..., Sunday = 6
  let startOffset = (firstDay.getDay() + 6) % 7;

  const days = [];
  for (let i = 0; i < startOffset; i++) {
    days.push({ empty: true });
  }

  const todayIso = new Date().toISOString().slice(0, 10);

  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const dt = new Date(year, monthIndex, d);
    const dayOfWeek = (dt.getDay() + 6) % 7;
    days.push({
      empty: false,
      dayNum: d,
      iso,
      isToday: iso === todayIso,
      isSunday: dayOfWeek === 6
    });
  }
  return days;
}

function batchMarkAllPresentToday() {
  const todayStr = new Date().toISOString().slice(0, 10);
  const wrks = workers();
  if (!wrks.length) return toast("No registered artisans found");
  wrks.forEach(w => {
    logAttendance(w.id, todayStr, "Present", "Batch attendance check-in", 0);
  });
  toast(`Marked all ${wrks.length} artisans Present for today (${todayStr}) ✅`);
  if (typeof panel === "function") panel();
}

function batchMarkSundaysOff() {
  const cur = S.attYearMonth || new Date().toISOString().slice(0, 7);
  const [y, m] = cur.split("-").map(Number);
  const wrks = workers();
  if (!wrks.length) return toast("No registered artisans found");
  const daysInMonth = new Date(y, m, 0).getDate();
  let count = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(y, m - 1, d);
    if (dt.getDay() === 0) {
      const dtStr = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      wrks.forEach(w => {
        logAttendance(w.id, dtStr, "Weekly Off", "Scheduled Sunday weekly off", 0);
      });
      count++;
    }
  }
  toast(`Auto-marked ${count} Sundays as Weekly Off for all artisans 📅`);
  if (typeof panel === "function") panel();
}

function openEditAttendanceModal(wid, dateStr) {
  const wrks = workers();
  if (!wrks.length) return toast("No registered artisans found");
  const targetWid = (wid && wid !== "all") ? wid : wrks[0].id;
  const targetDate = dateStr || new Date().toISOString().slice(0, 10);
  const existing = (S.attendance || []).find(a => a.wid == targetWid && a.date === targetDate);

  modal(`
    <h2 style="color:var(--br);margin:0 0 10px">📅 Attendance &amp; Overtime Log</h2>
    <p style="font-size:0.85rem;color:var(--mu);margin-bottom:14px">
      Record artisan presence, half-days, leave, overtime hours, and daily tailoring notes.
    </p>

    <div class="g2">
      <div>
        <label>Select Artisan *</label>
        <select id="eat_wid" onchange="onAttModalWorkerChange()">
          ${wrks.map(w => `<option value="${w.id}" ${w.id == targetWid ? "selected" : ""}>${E(w.name)} (${E(w.role)})</option>`).join("")}
        </select>
      </div>
      <div>
        <label>Date *</label>
        <input id="eat_date" type="date" value="${targetDate}" onchange="onAttModalWorkerChange()">
      </div>
    </div>

    <div class="g2" style="margin-top:10px">
      <div>
        <label>Attendance Status *</label>
        <select id="eat_status">
          <option value="Present" ${!existing || existing.status === 'Present' ? 'selected' : ''}>🟢 Present (Full Day)</option>
          <option value="Half-Day" ${existing && existing.status === 'Half-Day' ? 'selected' : ''}>🟡 Half-Day</option>
          <option value="Leave" ${existing && existing.status === 'Leave' ? 'selected' : ''}>🔴 Leave / Absent</option>
          <option value="Weekly Off" ${existing && existing.status === 'Weekly Off' ? 'selected' : ''}>⚪ Weekly Off</option>
        </select>
      </div>
      <div>
        <label>Overtime (OT Hours)</label>
        <select id="eat_ot">
          <option value="0" ${!existing || !existing.otHours ? 'selected' : ''}>0 Hours (Normal Shift)</option>
          <option value="1" ${existing && existing.otHours == 1 ? 'selected' : ''}>+1 Hour Overtime</option>
          <option value="2" ${existing && existing.otHours == 2 ? 'selected' : ''}>+2 Hours Overtime</option>
          <option value="3" ${existing && existing.otHours == 3 ? 'selected' : ''}>+3 Hours Overtime</option>
          <option value="4" ${existing && existing.otHours >= 4 ? 'selected' : ''}>+4 Hours Overtime</option>
        </select>
      </div>
    </div>

    <div style="margin-top:10px">
      <label>Work Log / Special Task Note</label>
      <input id="eat_note" placeholder="e.g. Worked late on bridal kali cuts, urgent trial fitting..." value="${existing ? Security.escapeHTML(existing.note || '') : ''}">
    </div>

    <div style="display:flex;gap:8px;margin-top:18px">
      <button class="btn p" style="flex:2" onclick="saveAttendanceRecordFromModal()">💾 Save Attendance</button>
      <button id="eat_del_btn" class="btn d" style="flex:1;display:${existing ? 'inline-block' : 'none'}" onclick="deleteAttendanceRecordFromModal()">🗑️ Clear</button>
      <button class="btn" style="flex:1" onclick="closeM()">Cancel</button>
    </div>
  `);
}

function onAttModalWorkerChange() {
  const wid = $("eat_wid").value;
  const dt = $("eat_date").value;
  const existing = (S.attendance || []).find(a => a.wid == wid && a.date === dt);
  if ($("eat_status")) $("eat_status").value = existing ? existing.status : "Present";
  if ($("eat_ot")) $("eat_ot").value = existing ? String(existing.otHours || 0) : "0";
  if ($("eat_note")) $("eat_note").value = existing ? (existing.note || "") : "";
  const delBtn = $("eat_del_btn");
  if (delBtn) delBtn.style.display = existing ? "inline-block" : "none";
}

function saveAttendanceRecordFromModal() {
  const wid = $("eat_wid").value;
  const dt = $("eat_date").value;
  const status = $("eat_status").value;
  const ot = Number($("eat_ot").value) || 0;
  const note = $("eat_note").value.trim();

  if (!wid || !dt) return toast("Select worker and date");
  logAttendance(wid, dt, status, note, ot);
  closeM();
  toast(`Attendance recorded for ${dt} ✅`);
  if (typeof panel === "function") panel();
}

function deleteAttendanceRecordFromModal() {
  const wid = $("eat_wid").value;
  const dt = $("eat_date").value;
  if (!wid || !dt) return;
  deleteAttendance(wid, dt);
  closeM();
  toast(`Attendance record cleared for ${dt} 🗑️`);
  if (typeof panel === "function") panel();
}

function renderSalaryTab() {
  const selW = S.selectedWorkerSalary || "all";
  const wrks = workers();
  const filteredWorkers = selW === "all" ? wrks : wrks.filter(w => w.id == selW);
  const curYm = S.attYearMonth || new Date().toISOString().slice(0, 7);
  const [calYear, calMonth] = curYm.split("-").map(Number);
  const calMonthIdx = calMonth - 1;

  const monthObj = new Date(calYear, calMonthIdx, 1);
  const monthTitle = monthObj.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  const calDays = getMonthCalendarDays(calYear, calMonthIdx);

  // AI Analytics & Productivity
  const ai = getArtisanProductivityAI();
  const topArtisan = ai.topArtisan;
  const fastestWorker = ai.fastestWorker;
  const mostReliable = ai.mostReliable;

  return `
    <!-- 1. AI Artisan Productivity & Speed Leaderboard -->
    <div class="box" style="border-left: 4px solid var(--br)">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
        <div>
          <b>🧠 AI Atelier Intelligence &amp; Artisan Leaderboard (${monthTitle})</b>
          <p style="font-size:0.8rem;color:var(--mu);margin:3px 0 0">
            Real-time machine performance tracking: completion speed, turnaround times, and workshop capacity balancing.
          </p>
        </div>
        <span class="chip on" style="font-size:0.75rem;padding:3px 10px;background:linear-gradient(90deg,var(--br),var(--gd));color:#fff;border:none">
          ✨ Live AI Engine
        </span>
      </div>

      <div class="leaderboard-grid">
        <!-- Top Artisan of the Month -->
        <div class="leaderboard-card" style="border:1.5px solid var(--gd)">
          <div style="font-size:2.2rem;margin-right:14px">🏆</div>
          <div>
            <div style="font-size:0.75rem;text-transform:uppercase;color:var(--gd);font-weight:800;letter-spacing:0.06em">Top Artisan of the Month</div>
            <b style="font-size:1.15rem;display:block;margin:2px 0">${topArtisan ? E(topArtisan.worker.name) : 'No data yet'}</b>
            <small style="color:var(--mu)">
              ${topArtisan ? `${topArtisan.completedCount} garments · ${topArtisan.presentDays} days active` : 'Register workers'}
            </small>
            <div style="margin-top:4px">
              <span class="pill ok" style="font-size:0.7rem;font-weight:700">Score: ${topArtisan ? topArtisan.productivityScore : 0}/100</span>
            </div>
          </div>
        </div>

        <!-- Speed Master -->
        <div class="leaderboard-card" style="border:1.5px solid #06b6d4">
          <div style="font-size:2.2rem;margin-right:14px">⚡</div>
          <div>
            <div style="font-size:0.75rem;text-transform:uppercase;color:#06b6d4;font-weight:800;letter-spacing:0.06em">Speed Master (Turnaround)</div>
            <b style="font-size:1.15rem;display:block;margin:2px 0">${fastestWorker ? E(fastestWorker.worker.name) : 'No data yet'}</b>
            <small style="color:var(--mu)">
              ${fastestWorker ? `Avg Turnaround: <b>${fastestWorker.avgTurnaroundDays} days</b>` : 'Turnaround tracking'}
            </small>
            <div style="margin-top:4px">
              <span class="pill" style="font-size:0.7rem;font-weight:700;color:#06b6d4;border-color:#06b6d4">⚡ Fastest Completion</span>
            </div>
          </div>
        </div>

        <!-- Reliability Star -->
        <div class="leaderboard-card" style="border:1.5px solid #10b981">
          <div style="font-size:2.2rem;margin-right:14px">💎</div>
          <div>
            <div style="font-size:0.75rem;text-transform:uppercase;color:#10b981;font-weight:800;letter-spacing:0.06em">Reliability & Attendance Star</div>
            <b style="font-size:1.15rem;display:block;margin:2px 0">${mostReliable ? E(mostReliable.worker.name) : 'No data yet'}</b>
            <small style="color:var(--mu)">
              ${mostReliable ? `Attendance Consistency: <b>${mostReliable.attendancePct}%</b>` : 'Consistent presence'}
            </small>
            <div style="margin-top:4px">
              <span class="pill ok" style="font-size:0.7rem;font-weight:700">💎 Perfect Attendance</span>
            </div>
          </div>
        </div>
      </div>

      <!-- AI Workload Recommendation Box -->
      <div style="background:color-mix(in srgb, var(--br) 6%, var(--sf));border:1px solid color-mix(in srgb, var(--br) 20%, var(--ln));border-radius:12px;padding:12px 16px;margin-top:10px;font-size:0.86rem;line-height:1.5">
        ${ai.workloadRecommendation}
      </div>
    </div>

    <!-- 2. Interactive Visual Attendance Calendar -->
    <div class="box">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
        <div>
          <b>📅 Interactive Artisan Attendance Calendar</b>
          <p style="font-size:0.8rem;color:var(--mu);margin:2px 0 0">
            Click any date cell to record attendance, overtime hours, or edit task logs.
          </p>
        </div>

        <!-- Month Navigation & Artisan Filter -->
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <div style="display:flex;align-items:center;background:var(--sf2);padding:2px 6px;border-radius:10px;border:1px solid var(--ln)">
            <button class="btn s" onclick="changeAttMonth(-1)" title="Previous Month" style="padding:4px 8px">◀</button>
            <span style="font-weight:700;font-size:0.88rem;padding:0 8px">${monthTitle}</span>
            <button class="btn s" onclick="changeAttMonth(1)" title="Next Month" style="padding:4px 8px">▶</button>
            <button class="btn s" onclick="changeAttMonth(0)" title="Jump to Current Month" style="padding:4px 8px;margin-left:4px">Today</button>
          </div>

          <select style="margin:0;width:auto;font-size:0.84rem;padding:6px 10px" onchange="S.selectedWorkerSalary=this.value;panel()">
            <option value="all" ${selW === 'all' ? 'selected' : ''}>All Artisans Calendar</option>
            ${wrks.map(w => `<option value="${w.id}" ${selW == w.id ? 'selected' : ''}>${E(w.name)} (${E(w.role)})</option>`).join("")}
          </select>

          <button class="btn s p" onclick="openEditAttendanceModal('${selW === 'all' ? '' : selW}', new Date().toISOString().slice(0, 10))">
            + Log Entry
          </button>
        </div>
      </div>

      <!-- Quick Batch Actions Toolbar -->
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:12px 0 10px;padding:8px 12px;background:var(--sf2);border-radius:10px;font-size:0.82rem">
        <span style="color:var(--mu);font-weight:600">⚡ Batch Actions:</span>
        <button class="btn s" onclick="batchMarkAllPresentToday()" title="Mark all workers present today">✨ Mark All Present Today</button>
        <button class="btn s" onclick="batchMarkSundaysOff()" title="Auto-mark all Sundays as Weekly Off">✨ Mark Sundays Off</button>
        <span style="margin-left:auto;color:var(--mu);font-size:0.78rem">
          Legend: <span class="pill ok" style="padding:1px 6px">P: Present</span> <span class="pill w" style="padding:1px 6px">H: Half</span> <span class="pill bad" style="padding:1px 6px">L: Leave</span> <span class="pill" style="padding:1px 6px;color:#8b5cf6;border-color:#8b5cf6">OT: Overtime</span>
        </span>
      </div>

      <!-- 7-Column Visual Calendar Grid -->
      <div class="att-cal-grid" style="margin-top:10px">
        ${["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => `<div class="att-cal-header">${d}</div>`).join("")}
        ${calDays.map(day => {
          if (day.empty) {
            return `<div class="att-cal-day empty"></div>`;
          }

          // Single worker vs All workers view
          if (selW !== "all") {
            const att = (S.attendance || []).find(a => a.wid == selW && a.date === day.iso);
            const status = att ? att.status : "";
            const ot = (att && att.otHours) ? att.otHours : 0;
            const note = att ? (att.note || "") : "";

            let pillHtml = `<span style="font-size:0.7rem;color:var(--mu)">+ Mark</span>`;
            if (status === "Present") {
              pillHtml = `<span class="att-pill p">🟢 Present${ot > 0 ? ` (+${ot}h)` : ''}</span>`;
            } else if (status === "Half-Day") {
              pillHtml = `<span class="att-pill h">🟡 Half-Day${ot > 0 ? ` (+${ot}h)` : ''}</span>`;
            } else if (status === "Leave" || status === "Absent") {
              pillHtml = `<span class="att-pill l">🔴 Leave</span>`;
            } else if (status === "Weekly Off") {
              pillHtml = `<span class="att-pill off">⚪ Weekly Off</span>`;
            }

            return `
              <div class="att-cal-day ${day.isToday ? 'today' : ''}" onclick="openEditAttendanceModal('${selW}','${day.iso}')">
                <div class="att-day-num">
                  <span>${day.dayNum}</span>
                  ${day.isToday ? '<span style="font-size:0.65rem;color:var(--br)">TODAY</span>' : ''}
                </div>
                <div>${pillHtml}</div>
                ${note ? `<div class="att-day-note" title="${Security.escapeHTML(note)}">📝 ${Security.escapeHTML(note)}</div>` : ''}
              </div>
            `;
          } else {
            // Aggregate all workers
            const dayAtts = (S.attendance || []).filter(a => a.date === day.iso);
            const pCount = dayAtts.filter(a => a.status === "Present").length;
            const hCount = dayAtts.filter(a => a.status === "Half-Day").length;
            const lCount = dayAtts.filter(a => a.status === "Leave" || a.status === "Absent").length;
            const offCount = dayAtts.filter(a => a.status === "Weekly Off").length;

            return `
              <div class="att-cal-day ${day.isToday ? 'today' : ''}" onclick="openEditAttendanceModal('','${day.iso}')">
                <div class="att-day-num">
                  <span>${day.dayNum}</span>
                  ${day.isToday ? '<span style="font-size:0.65rem;color:var(--br)">TODAY</span>' : ''}
                </div>
                <div style="font-size:0.72rem;margin-top:2px">
                  ${pCount > 0 ? `<span class="att-pill p" style="display:inline-block;padding:1px 5px;margin:1px 0">P: ${pCount}</span>` : ''}
                  ${hCount > 0 ? `<span class="att-pill h" style="display:inline-block;padding:1px 5px;margin:1px 0">H: ${hCount}</span>` : ''}
                  ${lCount > 0 ? `<span class="att-pill l" style="display:inline-block;padding:1px 5px;margin:1px 0">L: ${lCount}</span>` : ''}
                  ${offCount > 0 ? `<span class="att-pill off" style="display:inline-block;padding:1px 5px;margin:1px 0">Off: ${offCount}</span>` : ''}
                  ${dayAtts.length === 0 ? `<span style="font-size:0.68rem;color:var(--mu);display:block;text-align:center">+ Mark</span>` : ''}
                </div>
              </div>
            `;
          }
        }).join("")}
      </div>
    </div>

    <!-- 2.5 Pending Artisan Piece Logs Verification Queue -->
    ${(() => {
      const pendingWorkLogs = (S.work || []).filter(w => w.verified === false);
      if (!pendingWorkLogs.length) return "";
      return `
        <div class="box" style="border-left:4px solid var(--warn);background:color-mix(in srgb, var(--warn) 5%, var(--sf))">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:12px">
            <div>
              <b style="color:var(--warn);font-size:1.05rem">⏳ Artisan Piece Logs Awaiting Master Verification (${pendingWorkLogs.length})</b>
              <p style="font-size:0.8rem;color:var(--mu);margin:2px 0 0">
                Craft pieces logged by artisans. Verify quality to approve and credit tailoring wages to worker payrolls.
              </p>
            </div>
            <button class="btn s p" style="background:var(--ok);color:#fff;font-weight:700" onclick="AdminPortal.approveAllPendingWorkLogs()">
              ⚡ Verify &amp; Credit All (${pendingWorkLogs.length})
            </button>
          </div>

          <div style="overflow-x:auto">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Artisan</th>
                  <th>Craft Task / Note</th>
                  <th>Quantity</th>
                  <th>Rate</th>
                  <th>Wage Amount</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${pendingWorkLogs.map(w => `
                  <tr>
                    <td>${new Date(w.ts).toLocaleDateString("en-IN")}<br><small style="color:var(--mu)">${new Date(w.ts).toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit' })}</small></td>
                    <td><b>${Security.escapeHTML(w.wn || "Artisan")}</b></td>
                    <td>
                      <b>${Security.escapeHTML(w.task)}</b>
                      ${w.note ? `<br><small style="color:var(--mu)"><i>${Security.escapeHTML(w.note)}</i></small>` : ""}
                    </td>
                    <td><b>${w.qty || 1}</b> pcs</td>
                    <td>₹${w.rate || 0}</td>
                    <td><b style="color:var(--ok)">${R((w.qty || 1) * (w.rate || 0))}</b></td>
                    <td>
                      <div style="display:flex;gap:4px">
                        <button class="btn s g" onclick="AdminPortal.approveWorkLog('${w.id}')" title="Verify quality and credit wage to artisan">
                          ✓ Verify &amp; Add Pay
                        </button>
                        <button class="btn s d" onclick="requestDelete('work','${w.id}')" title="Reject / Delete Record">
                          ✕ Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        </div>
      `;
    })()}

    <!-- 3. Monthly Artisan Payroll & Settlement Statement -->
    <div class="box">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
        <div>
          <b>💰 Artisan Payroll &amp; Piece-Rate Settlement (${monthTitle})</b>
          <p style="font-size:0.8rem;color:var(--mu);margin:2px 0 0">
            Total piece earnings, disbursements, pending balances, and printable settlement slips.
          </p>
        </div>
        <button class="btn s p" onclick="openPayoutModal()">+ Record Payout</button>
      </div>

      <table style="margin-top:14px">
        <thead>
          <tr>
            <th>Artisan</th>
            <th>Pieces Stitched</th>
            <th>Gross Earned</th>
            <th>Amount Paid</th>
            <th>Pending Balance</th>
            <th>Attendance (${monthTitle})</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${filteredWorkers.map(w => {
            const stats = getWorkerMonthlyStats(w.id, curYm);
            return `
              <tr>
                <td>
                  <div style="display:flex;align-items:center;gap:10px">
                    <div style="width:36px;height:36px;border-radius:50%;overflow:hidden;background:#eee;flex-shrink:0">
                      ${w.img ? `<img src="${Security.escapeHTML(w.img)}" style="width:100%;height:100%;object-fit:cover">` : "🧵"}
                    </div>
                    <div>
                      <b>${E(w.name)}</b><br>
                      <small style="color:var(--mu)">${E(w.role)} · ID: <b>${E(w.wid)}</b></small>
                    </div>
                  </div>
                </td>
                <td><b>${stats.totalPieces}</b> pieces</td>
                <td>
                  <b style="color:var(--br)">${R(stats.totalEarned)}</b>
                  ${stats.pendingEarned > 0 ? `<br><small style="color:var(--warn);font-weight:600">(+${R(stats.pendingEarned)} pending)</small>` : ''}
                </td>
                <td><b style="color:var(--ok)">${R(stats.totalPaid)}</b></td>
                <td><b style="color:${stats.pendingBalance > 0 ? 'var(--warn)' : 'var(--ok)'}">${R(stats.pendingBalance)}</b></td>
                <td>
                  <span class="pill ok">P: ${stats.daysPresent}</span>
                  <span class="pill w">H: ${stats.daysHalf}</span>
                  <span class="pill bad">L: ${stats.daysLeave}</span>
                </td>
                <td>
                  <div style="display:flex;gap:4px">
                    <button class="btn s p" onclick="openPayoutModalForWorker('${w.id}')" title="Disburse Salary / Advance">+ Pay</button>
                    <button class="btn s" onclick="printSalarySlip('${w.id}')" title="Print Salary Slip">🧾 Slip</button>
                  </div>
                </td>
              </tr>
            `;
          }).join("") || "<tr><td colspan='7'>No artisans registered.</td></tr>"}
        </tbody>
      </table>
    </div>

    <!-- 4. Payouts Log -->
    <div class="box">
      <b>💵 Payment Disbursement History</b>
      <table style="margin-top:10px">
        <thead>
          <tr>
            <th>Date</th>
            <th>Artisan</th>
            <th>Amount Paid</th>
            <th>Payment Mode</th>
            <th>Note</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${(S.payouts || []).slice().sort((a,b)=>b.date-a.date).map(p => `
            <tr>
              <td>${new Date(p.date).toLocaleDateString("en-IN")}</td>
              <td><b>${E(p.workerName || "Artisan")}</b></td>
              <td><b style="color:var(--ok)">${R(p.amount)}</b></td>
              <td><span class="pill">${E(p.mode)}</span></td>
              <td>${E(p.note || "-")}</td>
              <td><button class="btn s d" onclick="requestDelete('payouts','${p.id}')">✕</button></td>
            </tr>
          `).join("") || "<tr><td colspan='6'>No payout disbursements recorded yet.</td></tr>"}
        </tbody>
      </table>
    </div>
  `;
}

function openPayoutModal(targetWid = "") {
  modal(`
    <h2 style="color:var(--br)">Record Salary / Advance Payout</h2>
    <div class="g2" style="margin-top:10px">
      <div>
        <label>Select Artisan</label>
        <select id="po_w">
          ${workers().map(w => `<option value="${w.id}" ${w.id == targetWid ? "selected" : ""}>${E(w.name)} (${E(w.role)})</option>`).join("")}
        </select>
      </div>
      <div>
        <label>Amount (₹)</label>
        <input id="po_amt" type="number" placeholder="e.g. 2000">
      </div>
    </div>
    <div class="g2">
      <div>
        <label>Payment Method</label>
        <select id="po_mode">
          <option>Cash</option>
          <option>UPI</option>
          <option>Bank Transfer</option>
        </select>
      </div>
      <div>
        <label>Disbursement Note</label>
        <input id="po_note" placeholder="Advance / Monthly settlement">
      </div>
    </div>
    <button class="btn p" style="width:100%;margin-top:8px" onclick="savePayout()">Disburse Payout ✅</button>
  `);
}

function openPayoutModalForWorker(wid) {
  openPayoutModal(wid);
}

function savePayout() {
  const wid = $("po_w").value;
  const amt = Number($("po_amt").value);
  if (!amt || amt <= 0) return toast("Enter valid payout amount");

  recordSalaryPayout(wid, amt, $("po_mode").value, $("po_note").value.trim());
  closeM();
  toast(`Payout of ${R(amt)} recorded ✅`);
}

function printSalarySlip(wid) {
  const w = workers().find(x => x.id == wid);
  if (!w) return;
  const stats = getWorkerMonthlyStats(wid, curMon);
  modal(`
    <div class="invoice-sheet" id="invoice-print-area">
      <div style="border-bottom:2px solid var(--br);padding-bottom:10px;display:flex;justify-content:space-between">
        <div>
          <h2 style="color:var(--br);margin:0">SAIFA DESIGNS</h2>
          <small>Artisan Salary & Settlement Statement</small>
        </div>
        <div style="text-align:right">
          <b>Month: ${curMon}</b><br>
          Date: ${new Date().toLocaleDateString("en-IN")}
        </div>
      </div>
      <p style="margin:12px 0"><b>Artisan:</b> ${E(w.name)} (${E(w.role)}) · Worker ID: <b>${E(w.wid)}</b></p>
      
      <table>
        <tr><th>Total Pieces Completed</th><td><b>${stats.totalPieces} pcs</b></td></tr>
        <tr><th>Gross Piece-Rate Earnings</th><td><b>${R(stats.totalEarned)}</b></td></tr>
        <tr><th>Amount Paid (Cash/UPI)</th><td><b style="color:var(--ok)">-${R(stats.totalPaid)}</b></td></tr>
        <tr><th>Net Outstanding Balance</th><td><b style="color:var(--br);font-size:1.1rem">${R(stats.pendingBalance)}</b></td></tr>
        <tr><th>Attendance Summary</th><td>${stats.daysPresent} Days Present, ${stats.daysHalf} Half-Days</td></tr>
      </table>

      <div style="margin-top:20px;display:flex;justify-content:space-between;align-items:center">
        <small>Generated automatically by SAIFA Management System</small>
        <button class="btn s p" onclick="window.print()">🖨️ Print Slip</button>
      </div>
    </div>
  `);
}

// ------------------------------------------
// 8. Clients Directory Tab
// ------------------------------------------
function renderCustTab() {
  const q = S.cq.toLowerCase();
  const list = custs().filter(c => (c.name + c.phone + c.cid).toLowerCase().includes(q));

  return `
    <div class="box">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
        <b>👥 Client Profiles & Measurement Archive</b>
        <button class="btn s" onclick="exportCustomersCSV()">📄 Export Clients CSV</button>
      </div>
      <div class="search" style="max-width:none;margin:12px 0">
        <input value="${E(S.cq)}" placeholder="Search client by name, phone or Customer ID…" oninput="S.cq=this.value;panel()">
      </div>
      <table>
        <thead>
          <tr>
            <th>Client ID</th>
            <th>Name</th>
            <th>Phone</th>
            <th>Address</th>
            <th>Orders</th>
            <th>Measurements</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${list.map(c => `
            <tr>
              <td><b>${E(c.cid)}</b></td>
              <td>${E(c.name)}</td>
              <td>${E(c.phone)}</td>
              <td>${E(c.address)}</td>
              <td><span class="pill ok">${orders().filter(o => np(o.phone) === np(c.phone)).length} orders</span></td>
              <td>${(c.measures || []).length} saved</td>
              <td>
                <button class="btn s" onclick="openCust('${c.id}')">View</button>
                <button class="btn s d" onclick="requestDelete('customers','${c.id}')">✕</button>
              </td>
            </tr>
          `).join("") || "<tr><td colspan='7'>No clients found.</td></tr>"}
        </tbody>
      </table>
    </div>
  `;
}

function openCust(id) {
  const c = custs().find(x => x.id == id);
  if (!c) return;
  const os = orders().filter(o => np(o.phone) == np(c.phone)).sort((a, b) => b.ts - a.ts);
  modal(`
    <span class="tag">${E(c.cid)}</span>
    <h2 style="margin:8px 0">${E(c.name)}</h2>
    <div class="g2">
      <div><label>Name</label><input id="ce_n" value="${E(c.name)}"></div>
      <div><label>Phone</label><input id="ce_p" value="${E(c.phone)}"></div>
    </div>
    <div style="display:flex;gap:8px;margin-top:6px;flex-wrap:wrap">
      <button class="btn p" onclick="saveCustEdit('${c.id}')">Save Changes ✅</button>
      <a class="btn g" href="https://wa.me/91${np(c.phone)}" target="_blank" rel="noopener">💬 WhatsApp Client</a>
      <button class="btn d" type="button" style="background:var(--bad);color:#fff" onclick="closeM();requestDelete('customers','${c.id}')">🗑️ Delete Client</button>
    </div>
    <h3 style="margin:18px 0 6px">Saved Body Measurements (${(c.measures || []).length})</h3>
    ${(c.measures || []).map(ms => `
      <div class="box" style="margin:6px 0;background:var(--sf2)">
        <small>${new Date(ms.date).toLocaleDateString("en-IN")} · <b>${E(ms.garment)}</b></small>
        <div class="meas" style="margin-top:6px">
          ${(() => {
            const keys = Array.from(new Set([...(typeof getMeasurements === "function" ? getMeasurements() : MEAS), ...Object.keys(ms.m || {})]));
            return keys.map(m => `<div><small style="color:var(--mu)">${m}</small><br><b>${E(ms.m[m] || "-")}</b></div>`).join("");
          })()}
        </div>
      </div>
    `).join("") || "<p style='color:var(--mu)'>No measurements recorded yet.</p>"}
    <h3 style="margin:18px 0 6px">Order History (${os.length})</h3>
    ${os.map(o => `
      <div class="line">
        <span><b>${E(o.no)}</b> · ${E(o.type)} · ${R(o.total)}<br><small>${new Date(o.ts).toLocaleDateString("en-IN")}</small></span>
        ${pill(o.status)}
      </div>
    `).join("") || "<p style='color:var(--mu)'>No orders on file.</p>"}
  `);
}

function saveCustEdit(id) {
  const c = custs().find(x => x.id == id);
  const n = $("ce_n").value.trim(), p = np($("ce_p").value);
  if (!n || p.length < 10) return toast("Enter valid name and 10-digit mobile");
  const { id: _old, ...rest } = c;
  put("customers", { ...rest, name: n, phone: p, address: $("ce_a").value.trim() }, id).then(x => {
    if (x) {
      closeM();
      toast("Client details updated ✅");
    }
  });
}

// ------------------------------------------
// 9. Front Page Team Tab
// ------------------------------------------
let newTeamImgData = "";

function renderTeamTab() {
  const e = (S.teamEdit && team().find(t => t.id == S.teamEdit)) || {};
  const currentImg = newTeamImgData || e.img || "";

  return `
    <div class="box">
      <b>${S.teamEdit ? "Edit Team Member" : "Add Front-Page Team Member"}</b>
      <div class="g2" style="margin-top:8px">
        <div><label>Name</label><input id="tn" value="${Security.escapeHTML(e.name || "")}"></div>
        <div><label>Role</label><input id="tr" value="${Security.escapeHTML(e.role || "")}"></div>
        <div><label>Display Order</label><input id="to" type="number" value="${e.ord || team().length + 1}"></div>
      </div>

      <!-- Photo Upload & Live Camera Capture -->
      <div style="margin:12px 0;background:var(--sf2);padding:14px;border-radius:14px">
        <b>📸 Team Member Photo: Device Upload or Live Camera Viewfinder</b>
        <div class="g2" style="margin-top:6px">
          <div>
            <label>Upload Photo from Device</label>
            <input type="file" id="t_file" accept="image/*" onchange="handleTeamImageUpload(this)">
          </div>
          <div>
            <label>Live Camera Capture</label>
            <button type="button" class="btn s p" style="width:100%;margin-top:2px" onclick="captureTeamPhotoLive()">
              📸 Open Live Camera Viewfinder
            </button>
          </div>
        </div>
        <div style="margin-top:8px">
          <label>Or Photo URL / Emoji</label>
          <input id="timg" value="${Security.escapeHTML(newTeamImgData || e.img || e.em || "")}" placeholder="https://..." oninput="updateTeamImgPreview(this.value)">
        </div>
        <div id="t_img_preview_box" style="margin-top:10px;text-align:center;display:${currentImg ? 'block' : 'none'}">
          <img id="t_img_preview" class="img-preview-thumb" src="${currentImg || ''}" alt="Team Preview">
          <button type="button" class="btn s d" style="margin-top:4px" onclick="clearTeamImgPreview()">Clear Photo</button>
        </div>
      </div>

      <label>Bio</label><textarea id="tb" rows="2">${Security.escapeHTML(e.bio || "")}</textarea>
      <div style="display:flex;gap:8px;margin-top:8px">
        <button class="btn p" onclick="saveTeam()">${S.teamEdit ? "Update Member" : "Add to Team"}</button>
        ${S.teamEdit ? `<button class="btn" onclick="S.teamEdit=null;newTeamImgData='';panel()">Cancel</button>` : ""}
      </div>
    </div>

    <div class="box">
      <b>Boutique Front-Page Team (${team().length})</b>
      <table style="margin-top:10px">
        <thead>
          <tr><th>Order</th><th>Photo</th><th>Name</th><th>Role</th><th>Actions</th></tr>
        </thead>
        <tbody>
          ${team().map(t => `
            <tr>
              <td>${t.ord || 1}</td>
              <td>
                <div style="width:34px;height:34px;border-radius:50%;overflow:hidden;background:#eee">
                  ${t.img ? `<img src="${Security.escapeHTML(t.img)}" style="width:100%;height:100%;object-fit:cover">` : t.em || "🧑‍💼"}
                </div>
              </td>
              <td><b>${Security.escapeHTML(t.name)}</b></td>
              <td>${Security.escapeHTML(t.role)}</td>
              <td>
                <button class="btn s" onclick="S.teamEdit='${t.id}';newTeamImgData='${t.img || ''}';panel()">Edit</button>
                <button class="btn s d" onclick="requestDelete('team','${t.id}')">✕</button>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function handleTeamImageUpload(input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = e => {
      newTeamImgData = e.target.result;
      updateTeamImgPreview(newTeamImgData);
    };
    reader.readAsDataURL(input.files[0]);
  }
}

function updateTeamImgPreview(src) {
  newTeamImgData = src;
  const box = $("t_img_preview_box");
  const img = $("t_img_preview");
  if (src && box && img) {
    img.src = src;
    box.style.display = "block";
  }
}

function captureTeamPhotoLive() {
  if (typeof App !== "undefined" && App.openLiveCamera) {
    App.openLiveCamera(dataUrl => {
      newTeamImgData = dataUrl;
      updateTeamImgPreview(dataUrl);
      if ($("timg")) $("timg").value = "";
    });
  } else {
    toast("Live camera initializing...");
  }
}

function clearTeamImgPreview() {
  newTeamImgData = "";
  if ($("t_file")) $("t_file").value = "";
  if ($("timg")) $("timg").value = "";
  const box = $("t_img_preview_box");
  if (box) box.style.display = "none";
}

function saveTeam() {
  const n = $("tn").value.trim(), r = $("tr").value.trim();
  if (!n || !r) return toast("Enter name & role");
  const photo = newTeamImgData || ($("timg") ? $("timg").value.trim() : "");
  const data = {
    name: n,
    role: r,
    img: photo,
    em: "🧑‍💼",
    ord: +$("to").value || 0,
    bio: $("tb").value.trim()
  };
  put("team", data, S.teamEdit || null).then(id => {
    if (id) {
      S.teamEdit = null;
      newTeamImgData = "";
      toast("Team member saved ✅");
    }
  });
}

// ------------------------------------------
// 10. Boutique Settings & QR Code Upload
// ------------------------------------------
function renderSettingsTab() {
  const c = S.cfg;
  const liveStatus = typeof getShopLiveStatus === "function" ? getShopLiveStatus() : { isOpen: true, label: "Open Now", badgeClass: "open" };
  const allProds = typeof products === "function" ? products() : [];
  const matSubcats = typeof getMaterialSubcats === "function" ? getMaterialSubcats() : (c.materialSubcats || MATERIAL_SUBCATS);
  const readySubcats = typeof getReadymadeSubcats === "function" ? getReadymadeSubcats() : (c.readymadeSubcats || READYMADE_SUBCATS);
  const garmentTypes = typeof getGarmentTypes === "function" ? getGarmentTypes() : Object.keys(c.prices || {});
  const measList = typeof getMeasurements === "function" ? getMeasurements() : (c.measurements || MEASUREMENTS);

  return `
    <!-- Admin-Controlled Shop Status & Operating Hours Engine -->
    <div class="box" style="border:1px solid var(--br);background:linear-gradient(135deg,color-mix(in srgb,var(--br) 8%,var(--sf)),var(--sf))">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:12px">
        <div>
          <b style="font-size:1.1rem;color:var(--br)">🟢 Shop Status &amp; Automatic Operating Hours Control</b>
          <p style="font-size:0.82rem;color:var(--mu);margin:3px 0 0">
            Control whether the boutique is marked Online, Offline, or synced to the daily operating schedule with automatic Monday rest days.
          </p>
        </div>
        <div>
          <span class="shop-status-pill-badge ${liveStatus.badgeClass}">
            <span class="status-dot"></span> Current Live View: ${Security.escapeHTML(liveStatus.label)}
          </span>
        </div>
      </div>

      <div class="g2" style="margin-top:10px">
        <div>
          <label>Shop Status Mode *</label>
          <select id="s_status">
            <option value="Auto" ${c.shopStatus === "Auto" ? "selected" : ""}>🔄 Auto Schedule (10:30 AM–9:00 PM, Monday Closed)</option>
            <option value="Online" ${c.shopStatus === "Online" ? "selected" : ""}>🟢 Online (Force Open for visits &amp; orders)</option>
            <option value="Offline" ${c.shopStatus === "Offline" ? "selected" : ""}>🔴 Offline (Boutique Closed for visits / Private fitting)</option>
          </select>
        </div>
        <div style="display:flex;gap:12px">
          <div style="flex:1">
            <label>Opening Time</label>
            <input id="s_open" type="time" value="${c.openTime || '10:30'}">
          </div>
          <div style="flex:1">
            <label>Closing Time</label>
            <input id="s_close" type="time" value="${c.closeTime || '21:00'}">
          </div>
        </div>
      </div>

      <div style="margin:10px 0;background:var(--sf2);padding:12px 14px;border-radius:12px;display:flex;align-items:center;gap:10px">
        <input id="s_monday" type="checkbox" style="width:20px;height:20px;margin:0;accent-color:var(--br)" ${c.mondayClosed !== false ? "checked" : ""}>
        <label for="s_monday" style="margin:0;font-size:0.86rem;color:var(--tx);font-weight:600;cursor:pointer">
          📅 Automatic Monday Atelier Rest Day Closure (Closes storefront visit indicator on Mondays)
        </label>
      </div>

      <div style="margin-top:8px">
        <label>Custom Offline Notice / Announcement (Shown to customers when boutique is closed)</label>
        <input id="s_offline" value="${Security.escapeHTML(c.offlineNotice || 'Boutique is currently closed for in-person visits. Online orders & bespoke inquiries remain active 24/7!')}">
      </div>
    </div>

    <!-- 💳 UPI Payments & Standee QR -->
    <div class="box">
      <b>💳 Payments &amp; Custom UPI QR Code</b>
      <p style="font-size:0.8rem;color:var(--mu);margin:4px 0 10px">
        Customers pay to this UPI ID. You can also upload your boutique's official Standee QR code image for customer downloads.
      </p>
      <div class="g2">
        <div><label>UPI ID (e.g. boutique@okhdfcbank)</label><input id="s_upi" value="${E(c.upi)}"></div>
        <div><label>Payee / Account Name</label><input id="s_pay" value="${E(c.payee)}"></div>
      </div>

      <div style="background:var(--sf2);padding:14px;border-radius:14px;margin-top:10px">
        <b>Upload Custom Boutique QR Code Standee Image:</b>
        <div class="g2" style="margin-top:6px">
          <div>
            <label>Upload QR Code Image</label>
            <input type="file" id="s_qr_file" accept="image/*" onchange="handleQRUpload(this)">
          </div>
          <div>
            <label>Or Paste QR Image URL</label>
            <input id="s_qr_url" value="${E(c.qrImage || "")}" placeholder="https://..." oninput="updateQRPreview(this.value)">
          </div>
        </div>
        <div id="qr_preview_box" style="margin-top:10px;text-align:center;display:${c.qrImage ? 'block' : 'none'}">
          <img id="qr_preview_img" src="${c.qrImage || ''}" style="max-width:180px;border-radius:12px;box-shadow:0 6px 20px rgba(0,0,0,0.1)">
          <br>
          <a class="btn s" style="margin-top:6px" href="${c.qrImage || '#'}" download="saifa_upi_qr.png">⬇ Test Download QR</a>
        </div>
      </div>
    </div>

    <!-- 🏬 Boutique Details -->
    <div class="box">
      <b>🏬 Boutique Details (Shown on website &amp; invoices)</b>
      <div class="g2" style="margin-top:8px">
        <div><label>Phone / WhatsApp</label><input id="s_ph" value="${E(c.shopPhone)}"></div>
        <div><label>Store Hours Display Text</label><input id="s_h" value="${E(c.hours || 'Tue–Sun 10:30 AM – 9:00 PM (Monday Atelier Rest Day)')}"></div>
      </div>
      <label>Boutique Address</label><input id="s_ad" value="${E(c.address)}">
      <label>Google Maps Link</label><input id="s_m" value="${E(c.map)}">
      <label>Top Announcement Banner Offer</label><input id="s_o" value="${E(c.offer)}">
    </div>

    <!-- 🏷️ Dynamic Category & Subcategory Management Center -->
    <div class="box" style="border:1px solid var(--br);background:linear-gradient(135deg,color-mix(in srgb,var(--br) 6%,var(--sf)),var(--sf))">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:14px">
        <div>
          <b style="font-size:1.15rem;color:var(--br)">🏷️ Dynamic Categories &amp; Subcategories Management</b>
          <p style="font-size:0.83rem;color:var(--mu);margin:3px 0 0">
            Dynamically add, edit, rename, and delete subcategories for Materials and Readymade collections. Changes sync immediately to storefront filters, inventory forms, and customer navigation.
          </p>
        </div>
      </div>

      <div class="g2" style="gap:16px">
        <!-- Materials Subcategories Column -->
        <div style="background:var(--sf2);padding:14px;border-radius:14px;border:1px solid var(--ln)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
            <div>
              <b style="font-size:0.95rem;color:var(--tx)">🧵 Material Subcategories</b>
              <div style="font-size:0.75rem;color:var(--mu)">Fabrics by meter, dress materials &amp; unstitched</div>
            </div>
            <span class="badge" style="background:color-mix(in srgb,var(--br) 15%,transparent);color:var(--br)">
              ${matSubcats.length} Categories
            </span>
          </div>

          <!-- Existing Material Subcategories List -->
          <div style="display:flex;flex-direction:column;gap:6px;max-height:240px;overflow-y:auto;padding-right:4px;margin-bottom:12px">
            ${matSubcats.map(sub => {
              const count = allProds.filter(p => p.cat === "Material" && p.subcat === sub).length;
              return `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:7px 10px;background:var(--sf);border-radius:8px;border:1px solid var(--ln);font-size:0.85rem">
                  <div style="display:flex;align-items:center;gap:6px;overflow:hidden">
                    <span style="font-weight:600;color:var(--tx);text-overflow:ellipsis;white-space:nowrap;overflow:hidden">${Security.escapeHTML(sub)}</span>
                    <span style="font-size:0.72rem;color:var(--mu);background:var(--sf2);padding:2px 6px;border-radius:6px;white-space:nowrap">${count} items</span>
                  </div>
                  <div style="display:flex;gap:4px">
                    <button class="btn s" title="Rename Subcategory" style="padding:3px 8px;font-size:0.74rem" onclick="openRenameSubcatModal('Material', '${Security.escapeHTML(sub)}')">✏️ Rename</button>
                    <button class="btn s d" title="Delete Subcategory" style="padding:3px 8px;font-size:0.74rem" onclick="deleteSubcat('Material', '${Security.escapeHTML(sub)}')">✕</button>
                  </div>
                </div>
              `;
            }).join("")}
          </div>

          <!-- Add Material Subcategory Input -->
          <div style="display:flex;gap:6px">
            <input id="new_mat_subcat" placeholder="e.g. Pure Velvet, Organza" style="margin:0;padding:6px 10px;font-size:0.82rem;flex:1">
            <button class="btn s p" onclick="addMaterialSubcat()" style="white-space:nowrap">+ Add</button>
          </div>
        </div>

        <!-- Readymade Subcategories Column -->
        <div style="background:var(--sf2);padding:14px;border-radius:14px;border:1px solid var(--ln)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
            <div>
              <b style="font-size:0.95rem;color:var(--tx)">👗 Readymade Subcategories</b>
              <div style="font-size:0.75rem;color:var(--mu)">Pre-stitched boutique dresses, suits &amp; gowns</div>
            </div>
            <span class="badge" style="background:color-mix(in srgb,var(--br) 15%,transparent);color:var(--br)">
              ${readySubcats.length} Categories
            </span>
          </div>

          <!-- Existing Readymade Subcategories List -->
          <div style="display:flex;flex-direction:column;gap:6px;max-height:240px;overflow-y:auto;padding-right:4px;margin-bottom:12px">
            ${readySubcats.map(sub => {
              const count = allProds.filter(p => p.cat === "Readymade" && p.subcat === sub).length;
              return `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:7px 10px;background:var(--sf);border-radius:8px;border:1px solid var(--ln);font-size:0.85rem">
                  <div style="display:flex;align-items:center;gap:6px;overflow:hidden">
                    <span style="font-weight:600;color:var(--tx);text-overflow:ellipsis;white-space:nowrap;overflow:hidden">${Security.escapeHTML(sub)}</span>
                    <span style="font-size:0.72rem;color:var(--mu);background:var(--sf2);padding:2px 6px;border-radius:6px;white-space:nowrap">${count} items</span>
                  </div>
                  <div style="display:flex;gap:4px">
                    <button class="btn s" title="Rename Subcategory" style="padding:3px 8px;font-size:0.74rem" onclick="openRenameSubcatModal('Readymade', '${Security.escapeHTML(sub)}')">✏️ Rename</button>
                    <button class="btn s d" title="Delete Subcategory" style="padding:3px 8px;font-size:0.74rem" onclick="deleteSubcat('Readymade', '${Security.escapeHTML(sub)}')">✕</button>
                  </div>
                </div>
              `;
            }).join("")}
          </div>

          <!-- Add Readymade Subcategory Input -->
          <div style="display:flex;gap:6px">
            <input id="new_ready_subcat" placeholder="e.g. Sharara Sets, Anarkalis" style="margin:0;padding:6px 10px;font-size:0.82rem;flex:1">
            <button class="btn s p" onclick="addReadymadeSubcat()" style="white-space:nowrap">+ Add</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ✂️ Stitching Garment Types & Pricing Matrix -->
    <div class="box">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:10px">
        <div>
          <b style="font-size:1.1rem;color:var(--br)">✂️ Stitching Garment Types, Pricing &amp; Artisan Pay Matrix</b>
          <p style="font-size:0.82rem;color:var(--mu);margin:3px 0 0">
            Manage bespoke stitching garment categories, client prices, and tailor piece-rate remuneration. You can rename garments or adjust fares dynamically.
          </p>
        </div>
      </div>

      <div style="overflow-x:auto">
        <table style="margin-top:6px;width:100%">
          <thead>
            <tr>
              <th>Garment Type</th>
              <th>Customer Price ₹</th>
              <th>Artisan Pay per Piece ₹</th>
              <th style="text-align:right">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${garmentTypes.map(k => `
              <tr>
                <td>
                  <div style="display:flex;align-items:center;gap:6px">
                    <b style="color:var(--tx)">${Security.escapeHTML(k)}</b>
                    <button class="btn s" style="padding:2px 6px;font-size:0.72rem" onclick="openRenameGarmentModal('${Security.escapeHTML(k)}')">✏️ Rename</button>
                  </div>
                </td>
                <td>
                  <div style="display:flex;align-items:center;gap:4px">
                    <span style="font-size:0.85rem;color:var(--mu)">₹</span>
                    <input style="width:90px;margin:0;padding:4px 6px" type="number" value="${c.prices[k] || 0}" onchange="S.cfg.prices['${k}']=+this.value;saveCfg()">
                  </div>
                </td>
                <td>
                  <div style="display:flex;align-items:center;gap:4px">
                    <span style="font-size:0.85rem;color:var(--mu)">₹</span>
                    <input style="width:90px;margin:0;padding:4px 6px" type="number" value="${c.pay[k] || 0}" onchange="S.cfg.pay['${k}']=+this.value;saveCfg()">
                  </div>
                </td>
                <td style="text-align:right">
                  <button class="btn s d" style="padding:4px 8px" onclick="deleteGarment('${Security.escapeHTML(k)}')">✕ Remove</button>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>

      <div class="g3" style="margin-top:14px;background:var(--sf2);padding:14px;border-radius:12px;align-items:flex-end">
        <div>
          <label style="margin-bottom:4px;font-size:0.82rem">New Garment Name</label>
          <input id="ng" placeholder="e.g. Designer Sharara Set" style="margin:0">
        </div>
        <div>
          <label style="margin-bottom:4px;font-size:0.82rem">Customer Stitching Price (₹)</label>
          <input id="np2" type="number" placeholder="1200" style="margin:0">
        </div>
        <div>
          <label style="margin-bottom:4px;font-size:0.82rem">Artisan Pay Rate (₹)</label>
          <input id="nw" type="number" placeholder="400" style="margin:0">
        </div>
      </div>
      <div style="margin-top:10px">
        <button class="btn s p" onclick="addFare()">+ Add Garment to Fare &amp; Pay Matrix</button>
      </div>
    </div>

    <!-- 📐 Dynamic Bespoke Stitch Measurements (Inches) Manager -->
    <div class="box" style="border:1px solid var(--br);background:linear-gradient(135deg,color-mix(in srgb,var(--br) 6%,var(--sf)),var(--sf))">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:12px">
        <div>
          <b style="font-size:1.15rem;color:var(--br)">📐 Bespoke Stitch Measurements (Inches ") Manager</b>
          <p style="font-size:0.82rem;color:var(--mu);margin:3px 0 0">
            Dynamically add, rename, or delete bespoke measurement types. These fields appear across customer stitching booking forms, admin intake cards, worker workstations, customer profiles, and printed invoices.
          </p>
        </div>
        <span class="badge" style="background:color-mix(in srgb,var(--br) 15%,transparent);color:var(--br)">
          ${measList.length} Active Measurements
        </span>
      </div>

      <!-- Measurement Points Grid -->
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px;margin-bottom:14px">
        ${measList.map(m => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:var(--sf2);border-radius:10px;border:1px solid var(--ln)">
            <div style="overflow:hidden">
              <span style="font-weight:600;color:var(--tx);font-size:0.88rem;display:block;text-overflow:ellipsis;white-space:nowrap;overflow:hidden">${Security.escapeHTML(m)}</span>
              <span style="font-size:0.75rem;color:var(--br);font-weight:600">Unit: Inches (")</span>
            </div>
            <div style="display:flex;gap:4px;margin-left:6px">
              <button class="btn s" title="Rename Measurement" style="padding:4px 8px;font-size:0.75rem" onclick="openRenameMeasurementModal('${Security.escapeHTML(m)}')">✏️</button>
              <button class="btn s d" title="Delete Measurement" style="padding:4px 8px;font-size:0.75rem" onclick="deleteMeasurement('${Security.escapeHTML(m)}')">✕</button>
            </div>
          </div>
        `).join("")}
      </div>

      <!-- Add New Measurement Point Form -->
      <div style="background:var(--sf2);padding:14px;border-radius:12px;border:1px solid var(--ln);display:flex;gap:10px;align-items:center;flex-wrap:wrap">
        <div style="flex:1;min-width:200px">
          <label style="margin-bottom:4px;font-size:0.82rem">Add New Measurement Point (Inches)</label>
          <input id="new_meas_name" placeholder="e.g. Flare Width, Armhole, Cuff, Yoke Depth" style="margin:0;padding:8px 12px;font-size:0.85rem">
        </div>
        <div style="margin-top:auto">
          <button class="btn s p" onclick="addMeasurement()" style="padding:8px 14px">+ Add Measurement Point</button>
        </div>
      </div>
    </div>

    <!-- 🔐 Admin Credentials -->
    <div class="box">
      <b>🔐 Admin Credentials</b>
      <div class="g2" style="margin-top:8px">
        <div><label>Admin Username</label><input id="au" value="${E(c.admin.u)}"></div>
        <div><label>Admin Password</label><input id="ap" type="text" value="${E(c.admin.p)}"></div>
      </div>
    </div>

    <button class="btn p" style="width:100%;padding:14px;font-size:1.05rem" onclick="saveAllSettings()">💾 Save All Boutique Settings</button>
  `;
}

function handleQRUpload(input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = e => {
      updateQRPreview(e.target.result);
    };
    reader.readAsDataURL(input.files[0]);
  }
}

function updateQRPreview(src) {
  S.cfg.qrImage = src;
  const box = $("qr_preview_box");
  const img = $("qr_preview_img");
  if (box && img) {
    img.src = src;
    box.style.display = src ? "block" : "none";
  }
}

function saveAllSettings() {
  const c = S.cfg;
  c.shopStatus = $("s_status") ? $("s_status").value : (c.shopStatus || "Auto");
  c.openTime = $("s_open") ? $("s_open").value : (c.openTime || "10:30");
  c.closeTime = $("s_close") ? $("s_close").value : (c.closeTime || "21:00");
  c.mondayClosed = $("s_monday") ? $("s_monday").checked : (c.mondayClosed !== false);
  c.offlineNotice = $("s_offline") ? $("s_offline").value.trim() : (c.offlineNotice || "");
  c.upi = $("s_upi").value.trim() || c.upi;
  c.payee = $("s_pay").value.trim() || c.payee;
  c.shopPhone = np($("s_ph").value) || c.shopPhone;
  c.hours = $("s_h").value;
  c.address = $("s_ad").value;
  c.map = $("s_m").value;
  c.offer = $("s_o").value;
  c.admin = { u: $("au").value.trim() || c.admin.u, p: $("ap").value.trim() || c.admin.p };
  saveCfg();
  if (typeof Realtime !== "undefined" && Realtime.broadcast) {
    Realtime.broadcast("SHOP_STATUS_CHANGED", { status: c.shopStatus });
  }
  toast("All Boutique Settings saved successfully! ⚙️✅");
  if (typeof panel === "function") panel();
  if (typeof renderFront === "function") renderFront();
}

function addFare() {
  const g = $("ng").value.trim();
  if (!g) return toast("Enter garment name");
  if (!S.cfg.prices) S.cfg.prices = {};
  if (!S.cfg.pay) S.cfg.pay = {};
  S.cfg.prices[g] = +$("np2").value || 0;
  S.cfg.pay[g] = +$("nw").value || 0;
  saveCfg();
  toast(`Garment "${g}" added to pricing matrix ✅`);
  if (typeof panel === "function") panel();
}

// ------------------------------------------
// Dynamic Category & Subcategory Operations
// ------------------------------------------
function addMaterialSubcat() {
  const inp = $("new_mat_subcat");
  const name = inp ? inp.value.trim() : "";
  if (!name) return toast("Please enter a material subcategory name");
  if (!Array.isArray(S.cfg.materialSubcats)) {
    S.cfg.materialSubcats = typeof getMaterialSubcats === "function" ? [...getMaterialSubcats()] : [...MATERIAL_SUBCATS];
  }
  if (S.cfg.materialSubcats.some(s => s.toLowerCase() === name.toLowerCase())) {
    return toast(`Subcategory "${name}" already exists`);
  }
  S.cfg.materialSubcats.push(name);
  saveCfg();
  toast(`Material subcategory "${name}" added! ✅`);
  if (typeof panel === "function") panel();
  if (typeof renderFront === "function") renderFront();
}

function addReadymadeSubcat() {
  const inp = $("new_ready_subcat");
  const name = inp ? inp.value.trim() : "";
  if (!name) return toast("Please enter a readymade subcategory name");
  if (!Array.isArray(S.cfg.readymadeSubcats)) {
    S.cfg.readymadeSubcats = typeof getReadymadeSubcats === "function" ? [...getReadymadeSubcats()] : [...READYMADE_SUBCATS];
  }
  if (S.cfg.readymadeSubcats.some(s => s.toLowerCase() === name.toLowerCase())) {
    return toast(`Subcategory "${name}" already exists`);
  }
  S.cfg.readymadeSubcats.push(name);
  saveCfg();
  toast(`Readymade subcategory "${name}" added! ✅`);
  if (typeof panel === "function") panel();
  if (typeof renderFront === "function") renderFront();
}

function openRenameSubcatModal(catType, oldName) {
  modal(`
    <h3 style="color:var(--br);margin:0 0 10px">✏️ Rename ${Security.escapeHTML(catType)} Subcategory</h3>
    <p style="font-size:0.85rem;color:var(--mu);margin-bottom:12px">
      Renaming <b>"${Security.escapeHTML(oldName)}"</b> will also automatically update all existing products in this category to preserve inventory consistency.
    </p>
    <label>New Subcategory Name *</label>
    <input id="rename_subcat_input" value="${Security.escapeHTML(oldName)}" style="margin-bottom:14px">
    <div style="display:flex;gap:10px;justify-content:flex-end">
      <button class="btn" type="button" onclick="closeM()">Cancel</button>
      <button class="btn p" type="button" onclick="saveRenameSubcat('${catType}', '${Security.escapeHTML(oldName)}')">Save New Name ✅</button>
    </div>
  `);
}

function saveRenameSubcat(catType, oldName) {
  const inp = $("rename_subcat_input");
  const newName = inp ? inp.value.trim() : "";
  if (!newName) return toast("Subcategory name cannot be empty");
  if (newName === oldName) return closeM();

  const cfgKey = catType === "Material" ? "materialSubcats" : "readymadeSubcats";
  if (!Array.isArray(S.cfg[cfgKey])) {
    S.cfg[cfgKey] = catType === "Material" 
      ? (typeof getMaterialSubcats === "function" ? [...getMaterialSubcats()] : [...MATERIAL_SUBCATS])
      : (typeof getReadymadeSubcats === "function" ? [...getReadymadeSubcats()] : [...READYMADE_SUBCATS]);
  }

  const idx = S.cfg[cfgKey].findIndex(s => s === oldName);
  if (idx !== -1) {
    S.cfg[cfgKey][idx] = newName;
  } else {
    S.cfg[cfgKey].push(newName);
  }

  // Update existing products in database that have this subcategory
  const prodsToUpdate = products().filter(p => p.cat === catType && p.subcat === oldName);
  prodsToUpdate.forEach(p => {
    p.subcat = newName;
    put("products", p, p.id);
  });

  saveCfg();
  closeM();
  toast(`Subcategory renamed to "${newName}" (${prodsToUpdate.length} products updated) ✅`);
  if (typeof panel === "function") panel();
  if (typeof renderFront === "function") renderFront();
}

function deleteSubcat(catType, name) {
  const cfgKey = catType === "Material" ? "materialSubcats" : "readymadeSubcats";
  const list = S.cfg[cfgKey] || (catType === "Material" 
    ? (typeof getMaterialSubcats === "function" ? getMaterialSubcats() : MATERIAL_SUBCATS)
    : (typeof getReadymadeSubcats === "function" ? getReadymadeSubcats() : READYMADE_SUBCATS));

  if (list.length <= 1) {
    return toast(`Cannot delete: at least one ${catType.toLowerCase()} subcategory must remain`);
  }

  const prodCount = products().filter(p => p.cat === catType && p.subcat === name).length;
  const warnMsg = prodCount > 0 
    ? `Warning: ${prodCount} products currently use this subcategory.`
    : `No products are currently in this subcategory.`;

  if (!confirm(`Are you sure you want to delete the ${catType} subcategory "${name}"?\n\n${warnMsg}`)) {
    return;
  }

  S.cfg[cfgKey] = list.filter(s => s !== name);
  saveCfg();
  toast(`Subcategory "${name}" deleted 🗑️`);
  if (typeof panel === "function") panel();
  if (typeof renderFront === "function") renderFront();
}

// ------------------------------------------
// Dynamic Garment Operations
// ------------------------------------------
function openRenameGarmentModal(oldName) {
  modal(`
    <h3 style="color:var(--br);margin:0 0 10px">✏️ Rename Garment Type</h3>
    <p style="font-size:0.85rem;color:var(--mu);margin-bottom:12px">
      Renaming <b>"${Security.escapeHTML(oldName)}"</b> will transfer customer stitching prices and artisan pay rates to the new garment type.
    </p>
    <label>New Garment Name *</label>
    <input id="rename_garment_input" value="${Security.escapeHTML(oldName)}" style="margin-bottom:14px">
    <div style="display:flex;gap:10px;justify-content:flex-end">
      <button class="btn" type="button" onclick="closeM()">Cancel</button>
      <button class="btn p" type="button" onclick="saveRenameGarment('${Security.escapeHTML(oldName)}')">Save Garment Name ✅</button>
    </div>
  `);
}

function saveRenameGarment(oldName) {
  const inp = $("rename_garment_input");
  const newName = inp ? inp.value.trim() : "";
  if (!newName) return toast("Garment name cannot be empty");
  if (newName === oldName) return closeM();

  if (!S.cfg.prices) S.cfg.prices = {};
  if (!S.cfg.pay) S.cfg.pay = {};

  const oldPrice = S.cfg.prices[oldName] || 0;
  const oldPay = S.cfg.pay[oldName] || 0;

  delete S.cfg.prices[oldName];
  delete S.cfg.pay[oldName];

  S.cfg.prices[newName] = oldPrice;
  S.cfg.pay[newName] = oldPay;

  saveCfg();
  closeM();
  toast(`Garment renamed to "${newName}" ✅`);
  if (typeof panel === "function") panel();
}

function deleteGarment(name) {
  if (!confirm(`Are you sure you want to delete the garment type "${name}" from your pricing and artisan pay matrix?`)) return;
  if (S.cfg.prices) delete S.cfg.prices[name];
  if (S.cfg.pay) delete S.cfg.pay[name];
  saveCfg();
  toast(`Garment "${name}" removed 🗑️`);
  if (typeof panel === "function") panel();
}

// ------------------------------------------
// Dynamic Stitch Measurements (Inches) Operations
// ------------------------------------------
function addMeasurement() {
  const inp = $("new_meas_name");
  const name = inp ? inp.value.trim() : "";
  if (!name) return toast("Please enter a measurement name (e.g. Flare Width, Armhole)");
  if (!Array.isArray(S.cfg.measurements)) {
    S.cfg.measurements = typeof getMeasurements === "function" ? [...getMeasurements()] : [...MEASUREMENTS];
  }
  if (S.cfg.measurements.some(m => m.toLowerCase() === name.toLowerCase())) {
    return toast(`Measurement "${name}" already exists`);
  }
  S.cfg.measurements.push(name);
  saveCfg();
  toast(`Measurement "${name}" (inches) added to bespoke profiles! ✅`);
  if (typeof panel === "function") panel();
}

function openRenameMeasurementModal(oldName) {
  modal(`
    <h3 style="color:var(--br);margin:0 0 10px">✏️ Rename Stitch Measurement</h3>
    <p style="font-size:0.85rem;color:var(--mu);margin-bottom:12px">
      Renaming measurement <b>"${Security.escapeHTML(oldName)}" (inches)</b> will update customer intake forms, order records, and tailor workstations.
    </p>
    <label>New Measurement Name (Inches) *</label>
    <input id="rename_meas_input" value="${Security.escapeHTML(oldName)}" style="margin-bottom:14px">
    <div style="display:flex;gap:10px;justify-content:flex-end">
      <button class="btn" type="button" onclick="closeM()">Cancel</button>
      <button class="btn p" type="button" onclick="saveRenameMeasurement('${Security.escapeHTML(oldName)}')">Save Measurement Name ✅</button>
    </div>
  `);
}

function saveRenameMeasurement(oldName) {
  const inp = $("rename_meas_input");
  const newName = inp ? inp.value.trim() : "";
  if (!newName) return toast("Measurement name cannot be empty");
  if (newName === oldName) return closeM();

  if (!Array.isArray(S.cfg.measurements)) {
    S.cfg.measurements = typeof getMeasurements === "function" ? [...getMeasurements()] : [...MEASUREMENTS];
  }

  const idx = S.cfg.measurements.findIndex(m => m === oldName);
  if (idx !== -1) {
    S.cfg.measurements[idx] = newName;
  } else {
    S.cfg.measurements.push(newName);
  }

  saveCfg();
  closeM();
  toast(`Measurement renamed to "${newName}" (inches) ✅`);
  if (typeof panel === "function") panel();
}

function deleteMeasurement(name) {
  const list = S.cfg.measurements || (typeof getMeasurements === "function" ? getMeasurements() : MEASUREMENTS);
  if (list.length <= 3) {
    return toast("Boutique requires at least 3 core measurements for tailoring");
  }
  if (!confirm(`Are you sure you want to delete the measurement point "${name}"?\nExisting order historical values will remain safe.`)) return;

  S.cfg.measurements = list.filter(m => m !== name);
  saveCfg();
  toast(`Measurement "${name}" removed 🗑️`);
  if (typeof panel === "function") panel();
}

// ------------------------------------------
// Cascading Category Handlers for Product Forms
// ------------------------------------------
function onProductCategoryChange(cat) {
  const sel = $("psubcat");
  if (!sel) return;
  const subcats = cat === "Material" 
    ? (typeof getMaterialSubcats === "function" ? getMaterialSubcats() : MATERIAL_SUBCATS)
    : (typeof getReadymadeSubcats === "function" ? getReadymadeSubcats() : READYMADE_SUBCATS);
  sel.innerHTML = subcats.map(s => `<option value="${Security.escapeHTML(s)}">${Security.escapeHTML(s)}</option>`).join("");
}

function onEditProductCategoryChange(cat) {
  const sel = $("ep_subcat");
  if (!sel) return;
  const subcats = cat === "Material" 
    ? (typeof getMaterialSubcats === "function" ? getMaterialSubcats() : MATERIAL_SUBCATS)
    : (typeof getReadymadeSubcats === "function" ? getReadymadeSubcats() : READYMADE_SUBCATS);
  sel.innerHTML = subcats.map(s => `<option value="${Security.escapeHTML(s)}">${Security.escapeHTML(s)}</option>`).join("");
}

// ------------------------------------------
// 11. AI Suite Tab
// ------------------------------------------
function renderAITab() {
  return `
    <div class="box">
      <b>✨ AI Smart Business & Marketing Suite</b>
      <p style="color:var(--mu);font-size:0.85rem">Generate broadcast messages, audit business health, or calculate precision tailoring meterage.</p>
      
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin:14px 0">
        <button class="btn p" onclick="generateAIAudit()">📊 Run Strategic Business Audit</button>
        <button class="btn" onclick="generateBroadcast('festive')">🎉 Festive WhatsApp Broadcast</button>
        <button class="btn" onclick="generateBroadcast('wedding')">👰 Bridal Campaign Drafter</button>
        <button class="btn" onclick="openFabricCalculatorModal()">📐 AI Fabric Meterage Calculator</button>
      </div>

      <div id="aiSuiteOutput" class="ai" style="display:none"></div>
    </div>
  `;
}

async function generateAIAudit() {
  const el = $("aiSuiteOutput");
  el.style.display = "block";
  el.textContent = "Analyzing real-time order history, product turnover and pipeline bottlenecks...";
  const audit = await AI.generateBusinessAudit();
  el.textContent = audit;
}

function generateBroadcast(type) {
  const el = $("aiSuiteOutput");
  el.style.display = "block";
  const activeCp = coupons().find(c => c.active);
  const code = activeCp ? activeCp.code : "FESTIVE10";
  const msg = AI.generateWhatsAppCampaign(type, code);
  el.textContent = msg;
}

function openFabricCalculatorModal() {
  modal(`
    <h2 style="color:var(--br)">📐 AI Fabric Meterage Calculator</h2>
    <div class="g2" style="margin-top:10px">
      <div>
        <label>Garment Type</label>
        <select id="fc_g">
          <option>Bridal Circular Lehenga (Full Flare)</option>
          <option>Floor-Length Anarkali (16-Kali)</option>
          <option>Designer Padded Blouse</option>
          <option>Straight Salwar Suit & Pants</option>
        </select>
      </div>
      <div>
        <label>Client Height (Inches)</label>
        <input id="fc_h" type="number" value="64">
      </div>
    </div>
    <div class="g2">
      <div>
        <label>Bust Size (Inches)</label>
        <input id="fc_b" type="number" value="36">
      </div>
      <div>
        <label>Flare / Layers</label>
        <select id="fc_fl">
          <option>Grand 4.5m Flare with Can-Can</option>
          <option>Moderate 3m Flare</option>
          <option>Slim Straight Fit</option>
        </select>
      </div>
    </div>
    <button class="btn p" style="width:100%;margin-top:8px" onclick="runFabricCalculation()">Calculate Meterage Requirements</button>
    <div id="fc_res" class="ai" style="display:none;margin-top:12px"></div>
  `);
}

function runFabricCalculation() {
  const g = $("fc_g").value;
  const h = +$("fc_h").value || 64;
  const b = +$("fc_b").value || 36;
  const res = AI.calculateFabric(g, h, b);

  const out = $("fc_res");
  out.style.display = "block";
  out.innerHTML = `
    <b>✂️ Tailoring Material Breakdown for ${E(g)}:</b><br><br>
    • <b>Main Fabric:</b> ${res.mainFabricMeters} Meters<br>
    • <b>Aster (Lining):</b> ${res.asterLiningMeters} Meters<br>
    ${res.canCanMeters ? `• <b>Can-Can Layer:</b> ${res.canCanMeters} Meters<br>` : ""}
    • <b>Lace / Zari Border:</b> ${res.laceBorderMeters} Meters<br><br>
    💡 <i>Master Tailor Note: ${E(res.advice)}</i>
  `;
}

// ------------------------------------------
// 12. Backup, Import & Export Tab
// ------------------------------------------
function renderDataBackupTab() {
  return `
    <div class="box">
      <b>💾 Complete Boutique Database Backup & Restore</b>
      <p style="color:var(--mu);font-size:0.85rem">Safely export your orders, client measurements, inventory and configuration to a portable JSON backup file.</p>
      
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin:16px 0">
        <button class="btn p" onclick="exportDatabaseJSON()">⬇ Download JSON Database Backup</button>
        <button class="btn" onclick="exportOrdersCSV()">📄 Export All Orders (CSV)</button>
        <button class="btn" onclick="exportCustomersCSV()">📄 Export Client Directory (CSV)</button>
      </div>

      <div style="background:var(--sf2);padding:16px;border-radius:14px;border:1px dashed var(--br);margin-top:16px">
        <b>Restore Database from Backup JSON File:</b>
        <p style="font-size:0.8rem;color:var(--mu);margin:4px 0 10px">Select a previously saved .json backup file to restore records.</p>
        <input type="file" id="importFileInput" accept=".json">
        <br><br>
        <button class="btn d" onclick="handleImportFile()">⚠️ Restore Database from File</button>
      </div>
    </div>
  `;
}

function handleImportFile() {
  const input = $("importFileInput");
  if (!input.files || !input.files[0]) return toast("Please select a valid JSON backup file");
  const reader = new FileReader();
  reader.onload = e => {
    importDatabaseJSON(e.target.result);
  };
  reader.readAsText(input.files[0]);
}

// ------------------------------------------
// Navigation & Session Helpers
// ------------------------------------------
function closeAdminPanel() {
  $("pn").classList.remove("on");
  if (typeof renderFront === "function") renderFront();
}

function logoutSession() {
  S.me = null;
  saveLS("me", null);
  const pn = $("pn");
  if (pn) pn.classList.remove("on");
  closeM();
  
  try {
    sessionStorage.setItem("saifa_logout_toast", "1");
  } catch (e) {}

  toast("Logged out successfully. Opening index.html storefront... 👋");
  
  if (typeof renderFront === "function") renderFront();
  
  // Directly open and navigate to index.html storefront
  setTimeout(() => {
    window.location.href = "index.html";
  }, 120);
}
