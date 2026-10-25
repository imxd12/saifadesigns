// ==========================================
// SAIFA DESIGNS – ADMIN & WORKER PORTAL
// ==========================================

const TABS = [
  { id: "Dashboard", label: "Dashboard", icon: "📊", group: "Overview" },
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

    <!-- Top KPI Grid: Comprehensive Revenue & Volume Metrics -->
    <div class="kpi-grid" style="grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));">
      <!-- 1. Today's Revenue -->
      <div class="kpi-card" style="border-top: 3px solid var(--ok);">
        <div class="kpi-icon">💵</div>
        <small>Today's Sales</small>
        <b style="color:var(--ok)">${R(analytics.todayRev)}</b>
        <span class="trend up">${analytics.todayOrders} order(s) placed today</span>
      </div>

      <!-- 2. This Week's Revenue -->
      <div class="kpi-card" style="border-top: 3px solid var(--br);">
        <div class="kpi-icon">📅</div>
        <small>This Week's Revenue</small>
        <b>${R(analytics.weekRev)}</b>
        <span class="trend up">${analytics.weekOrders} orders (last 7 days)</span>
      </div>

      <!-- 3. This Month's Revenue -->
      <div class="kpi-card" style="border-top: 3px solid var(--gd);">
        <div class="kpi-icon">🗓️</div>
        <small>Current Month Total</small>
        <b style="color:var(--gd)">${R(analytics.monthRev)}</b>
        <span class="trend up">${analytics.monthOrders} orders in ${new Date().toLocaleDateString('en-IN', {month: 'long'})}</span>
      </div>

      <!-- 4. Highest Revenue Day -->
      <div class="kpi-card" style="border-top: 3px solid #f59e0b; background: linear-gradient(135deg, color-mix(in srgb, #f59e0b 8%, var(--sf)), var(--sf));">
        <div class="kpi-icon">⭐</div>
        <small>Highest Revenue Day</small>
        <b style="color:#d97706">${R(analytics.highestDay.amount)}</b>
        <span class="trend" style="color:#b45309;font-weight:600">🌟 Peak: ${analytics.highestDay.dateFormatted}</span>
      </div>

      <!-- 5. Lifetime Store Revenue -->
      <div class="kpi-card">
        <div class="kpi-icon">💰</div>
        <small>Total Lifetime Sales</small>
        <b>${R(analytics.lifetimeRev)}</b>
        <span class="trend">${analytics.totalOrdersCount} total orders recorded</span>
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

function printInvoice(orderId) {
  const o = orders().find(x => x.id == orderId);
  if (!o) return;
  const c = S.cfg;
  modal(`
    <div id="invoice-print-area" class="invoice-sheet">
      <div class="invoice-header">
        <div>
          <h2 style="color:var(--br);margin:0">${E(c.payee)}</h2>
          <small style="color:var(--mu)">${E(c.address)}<br>Phone: +${E(c.shopPhone)}</small>
        </div>
        <div style="text-align:right">
          <h3 style="margin:0;color:var(--gd)">RETAIL INVOICE</h3>
          <p style="margin:2px 0"><b>Invoice No:</b> #${E(o.no)}</p>
          <small>Date: ${new Date(o.ts).toLocaleDateString("en-IN")}</small>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px;font-size:0.88rem">
        <div>
          <b>Billed To:</b><br>
          ${E(o.customer)}<br>
          Phone: ${E(o.phone)}<br>
          Client ID: <b>${E(o.cid)}</b><br>
          ${E(o.address)}
        </div>
        <div style="text-align:right">
          <b>Payment Details:</b><br>
          Mode: ${E(o.pay)}<br>
          Status: <b>${E(o.paid)}</b><br>
          Order Status: <b>${E(o.status)}</b>
        </div>
      </div>

      ${o.type === "Stitch" && o.measure ? `
        <div style="background:#f9f5f6;padding:10px;border-radius:10px;margin-bottom:14px;font-size:0.84rem">
          <b>Tailoring Measurements (${E(o.garment)}):</b><br>
          ${MEAS.map(m => `${m}: <b>${E(o.measure[m] || "-")}"</b>`).join(" · ")}
        </div>
      ` : ""}

      <table>
        <thead>
          <tr>
            <th>Item Description</th>
            <th style="text-align:center">Qty</th>
            <th style="text-align:right">Price</th>
            <th style="text-align:right">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${o.type === "Stitch" ? `
            <tr>
              <td>${E(o.garment)} Tailoring & Stitching</td>
              <td style="text-align:center">1</td>
              <td style="text-align:right">${R(o.total + (o.discount || 0))}</td>
              <td style="text-align:right">${R(o.total + (o.discount || 0))}</td>
            </tr>
          ` : (o.items || []).map(it => `
            <tr>
              <td>
                <b>${E(it.n)}</b>
                ${(it.size || it.color) ? `<br><small style="color:var(--mu)">${it.size ? 'Size: ' + E(it.size) : ''}${it.size && it.color ? ' · ' : ''}${it.color ? 'Color: ' + E(it.color) : ''}</small>` : ''}
              </td>
              <td style="text-align:center">${it.q}</td>
              <td style="text-align:right">${R(it.p)}</td>
              <td style="text-align:right">${R(it.p * it.q)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>

      <div style="margin-top:14px;text-align:right">
        ${o.discount ? `<p style="color:var(--ok)">Coupon Discount: -${R(o.discount)}</p>` : ""}
        <h3 style="color:var(--br);margin:4px 0">Grand Total: ${R(o.total)}</h3>
      </div>

      <div style="margin-top:20px;border-top:1px dashed #ccc;padding-top:12px;display:flex;justify-content:space-between;align-items:center;font-size:0.8rem">
        <p>Thank you for choosing SAIFA DESIGNS!<br>Alterations are supported on request.</p>
        <button class="btn p s" onclick="window.print()">🖨️ Print Invoice</button>
      </div>
    </div>
  `);
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
      <label style="font-weight:600">Fit Measurements (Inches)</label>
      <div class="meas">
        ${MEAS.map((m, i) => `
          <div>
            <label style="font-size:0.75rem">${m}</label>
            <input id="es_m_${i}" type="number" step="0.5" value="${(o.measure && o.measure[m] !== '-' && o.measure[m]) ? o.measure[m] : ''}" placeholder="-">
          </div>
        `).join("")}
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
  MEAS.forEach((measName, i) => {
    const el = $("es_m_" + i);
    m[measName] = (el && el.value) ? el.value : "-";
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
// 5. Products Management with Image Upload & AI
// ------------------------------------------
function onProductCategoryChange(cat) {
  const subSel = $("psubcat");
  if (!subSel) return;
  const list = cat === "Material" ? MATERIAL_SUBCATS : READYMADE_SUBCATS;
  subSel.innerHTML = list.map(s => `<option value="${Security.escapeHTML(s)}">${Security.escapeHTML(s)}</option>`).join("");
}

function renderProductsTab() {
  return `
    <div class="box">
      <b>👗 Add New Boutique Garment / Fabric Collection</b>
      <div class="g2" style="margin-top:8px">
        <div><label>Product Name</label><input id="pn1" placeholder="e.g. Zari Silk Lehenga"></div>
        <div>
          <label>Category</label>
          <select id="pc" onchange="onProductCategoryChange(this.value)">
            <option value="Material">Material (Dress Fabrics &amp; Unstitched)</option>
            <option value="Readymade">Readymade (Pre-Stitched &amp; Occasion Wear)</option>
          </select>
        </div>
        <div>
          <label>Subcategory</label>
          <select id="psubcat">
            ${MATERIAL_SUBCATS.map(s => `<option value="${Security.escapeHTML(s)}">${Security.escapeHTML(s)}</option>`).join("")}
          </select>
        </div>
        <div><label>Selling Price ₹</label><input id="pp" type="number" placeholder="e.g. 2500"></div>
        <div><label>Initial Stock Units</label><input id="ps" type="number" value="10"></div>
        <div><label>Fabric Specification</label><input id="pf" placeholder="Pure Chanderi Silk"></div>
        <div><label>Available Colors</label><input id="pcl" placeholder="Red, Gold, Emerald"></div>
        <div><label>Sizes Available</label><input id="psz" placeholder="Free size / S, M, L"></div>
        <div><label>Primary Theme Color</label><input id="ph" type="color" value="#8e1647"></div>
      </div>

      <!-- Image Upload, Live Camera & AI Visualizer Options -->
      <div style="margin:10px 0;background:var(--sf2);padding:14px;border-radius:14px">
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
      
      <button class="btn p" onclick="addProd()">Save Product to Catalogue</button>
      ${products() === SEED_PROD ? ' <button class="btn" onclick="seedDb()">Load Sample Catalogue into Database</button>' : ""}
    </div>

    <div class="box">
      <b>Existing Inventory (${(S.prod || []).length} items)</b>
      <table style="margin-top:10px">
        <thead>
          <tr>
            <th>Photo</th>
            <th>Name</th>
            <th>Type</th>
            <th>Price ₹</th>
            <th>Stock</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${(S.prod || []).map(p => `
            <tr>
              <td style="width:50px">
                <div style="width:40px;height:40px;border-radius:8px;overflow:hidden;background:#eee;display:grid;place-items:center">
                  ${p.img ? `<img src="${p.img}" style="width:100%;height:100%;object-fit:cover">` : p.em || "👗"}
                </div>
              </td>
              <td><b>${E(p.name)}</b><br><small style="color:var(--mu)">${E(p.fabric)}</small></td>
              <td><span class="tag">${E(p.cat)}</span></td>
              <td>
                <input style="width:90px;margin:0;padding:4px 8px" type="number" value="${p.price}" onchange="upd('products','${p.id}',{price:+this.value})">
              </td>
              <td>
                <input style="width:75px;margin:0;padding:4px 8px" type="number" value="${p.stock}" onchange="upd('products','${p.id}',{stock:+this.value})">
                ${p.stock < 5 ? `<br><small style="color:var(--bad);font-weight:600">Low Stock!</small>` : ""}
              </td>
              <td>
                <button class="btn s d" onclick="requestDelete('products','${p.id}')">✕ Delete</button>
              </td>
            </tr>
          `).join("") || "<tr><td colspan='6'>No custom products saved. Sample catalogue currently active.</td></tr>"}
        </tbody>
      </table>
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
  const subcat = $("psubcat") ? $("psubcat").value : (cat === "Material" ? MATERIAL_SUBCATS[0] : READYMADE_SUBCATS[0]);

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
          ${MEAS.map(m => `<div><small style="color:var(--mu)">${m}</small><br><b>${E(ms.m[m] || "-")}</b></div>`).join("")}
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
            <option value="Online" ${c.shopStatus === "Online" ? "selected" : ""}>🟢 Online (Force Open for visits & orders)</option>
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

    <div class="box">
      <b>🏬 Boutique Details (Shown on website)</b>
      <div class="g2" style="margin-top:8px">
        <div><label>Phone / WhatsApp</label><input id="s_ph" value="${E(c.shopPhone)}"></div>
        <div><label>Store Hours Display Text</label><input id="s_h" value="${E(c.hours || 'Tue–Sun 10:30 AM – 9:00 PM (Monday Atelier Rest Day)')}"></div>
      </div>
      <label>Boutique Address</label><input id="s_ad" value="${E(c.address)}">
      <label>Google Maps Link</label><input id="s_m" value="${E(c.map)}">
      <label>Top Announcement Banner Offer</label><input id="s_o" value="${E(c.offer)}">
    </div>

    <div class="box">
      <b>✂️ Stitching Pricing &amp; Artisan Pay Matrix</b>
      <table style="margin-top:8px">
        <thead><tr><th>Garment</th><th>Customer Price ₹</th><th>Artisan Pay per Piece ₹</th><th></th></tr></thead>
        <tbody>
          ${Object.keys(c.prices).map(k => `
            <tr>
              <td><b>${E(k)}</b></td>
              <td><input style="width:100px;margin:0;padding:4px" type="number" value="${c.prices[k]}" onchange="S.cfg.prices['${k}']=+this.value"></td>
              <td><input style="width:100px;margin:0;padding:4px" type="number" value="${c.pay[k] || 0}" onchange="S.cfg.pay['${k}']=+this.value"></td>
              <td><button class="btn s d" onclick="delete S.cfg.prices['${k}'];delete S.cfg.pay['${k}'];saveCfg()">✕</button></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
      <div class="g2" style="margin-top:10px">
        <div><label>New Garment Name</label><input id="ng" placeholder="Sharara Set"></div>
        <div><label>Customer Price</label><input id="np2" type="number" placeholder="1200"></div>
        <div><label>Artisan Rate</label><input id="nw" type="number" placeholder="400"></div>
      </div>
      <button class="btn s" onclick="addFare()">+ Add Garment to Fare List</button>
    </div>

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
  S.cfg.prices[g] = +$("np2").value || 0;
  S.cfg.pay[g] = +$("nw").value || 0;
  saveCfg();
  toast("Garment added to pricing matrix");
  panel();
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
