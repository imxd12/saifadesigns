// ==========================================
// SAIFA DESIGNS – APPLICATION ORCHESTRATOR
// ==========================================

const App = {
  activeCameraStream: null,
  cameraFacingMode: "user",

  init() {
    // 0. Initialize Boutique Color Theme
    initTheme();

    // 1. Initialize Realtime Stack & Liveness Bus
    Realtime.init();

    // 2. Initialize Customer Storefront & 3D Stage
    Customer.init();

    // 3. Register PWA install prompt handler
    this.initPWAInstall();

    // 4. Hook real-time reactive sync across panels
    this.initRealtimeSyncListener();

    // 5. Check if user just logged out from admin and show confirmation
    try {
      if (sessionStorage.getItem("saifa_logout_toast")) {
        sessionStorage.removeItem("saifa_logout_toast");
        setTimeout(() => {
          toast("Logged out successfully. Welcome back to SAIFA DESIGNS storefront! 👋");
        }, 350);
      }
    } catch (e) {}

    console.log("✨ SAIFA DESIGNS Enterprise Suite Initialized [Online Realtime Sync Active]");
  },

  // ------------------------------------------
  // PWA Install Prompt Handler
  // ------------------------------------------
  initPWAInstall() {
    let deferredPrompt = null;
    const instBtn = $("inst");
    window.addEventListener("beforeinstallprompt", e => {
      e.preventDefault();
      deferredPrompt = e;
      if (instBtn) {
        instBtn.style.display = "inline-flex";
        instBtn.onclick = async () => {
          if (!deferredPrompt) return;
          deferredPrompt.prompt();
          const { outcome } = await deferredPrompt.userChoice;
          if (outcome === "accepted") {
            toast("Thank you for installing SAIFA DESIGNS app! 📲");
          }
          deferredPrompt = null;
          instBtn.style.display = "none";
        };
      }
    });
  },

  // ------------------------------------------
  // Real-Time Cross-Device Reactive Listener
  // ------------------------------------------
  initRealtimeSyncListener() {
    // Listen for custom real-time events broadcasted across instances
    window.addEventListener("saifa_realtime_event", e => {
      const { type, payload } = e.detail || {};

      // If customer storefront is visible, update catalogue & cart counts
      if (typeof Customer !== "undefined") {
        if (["PRODUCT_UPDATED", "COUPON_UPDATED", "SETTINGS_UPDATED", "ORDER_CREATED", "ORDER_UPDATED"].includes(type)) {
          Customer.renderFront();
        }
      }

      // If admin panel is currently open on this screen, re-render panel
      const pn = $("pn");
      if (pn && pn.classList.contains("on")) {
        if (S.me && S.me.role === "worker") {
          if (typeof wpanel === "function") wpanel();
        } else if (S.me && S.me.role === "admin") {
          if (typeof panel === "function") panel();
        }
      }

      // Toast alert for important cross-device notifications
      if (type === "ORDER_CREATED" && S.me && S.me.role === "admin") {
        toast(`🔔 New order #${payload?.orderNo || ""} received!`);
      } else if (type === "ORDER_UPDATED" && S.me && S.me.role === "worker") {
        toast(`✂️ Order #${payload?.orderNo || ""} assigned / updated!`);
      }
    });
  },

  // ------------------------------------------
  // Modern Animated Login Modal with WebCrypto
  // ------------------------------------------
  currentLoginRole: "admin",

  openLoginModal(defaultRole = "admin") {
    this.currentLoginRole = defaultRole === "worker" ? "worker" : "admin";

    // Rate limiter security check
    const rateStatus = Security.checkRateLimit("login_" + this.currentLoginRole, 5, 30);

    const ov = $("ov");
    if (!ov) return;

    ov.innerHTML = `
      <div class="login-overlay" id="loginOverlay" onclick="App.handleLoginOverlayClick(event)">
        <div class="login-card" id="loginCard">
          <button class="x" onclick="closeM()" title="Close Login">&times;</button>
          
          <div class="login-header">
            <div class="login-logo">S</div>
            <div class="login-title">Staff &amp; Artisan Portal</div>
            <div class="login-subtitle">Secure boutique management &amp; tailor workstation</div>
          </div>

          <!-- Animated Role Switcher Pill -->
          <div class="role-switcher">
            <div class="role-tab ${this.currentLoginRole === 'admin' ? 'active' : ''}" id="roleTabAdmin" onclick="App.switchLoginRole('admin')">
              👑 Boutique Admin
            </div>
            <div class="role-tab ${this.currentLoginRole === 'worker' ? 'active' : ''}" id="roleTabWorker" onclick="App.switchLoginRole('worker')">
              🧵 Artisan Tailor
            </div>
          </div>

          <!-- Rate limit notice if locked -->
          <div id="loginRateLockNotice" style="display:${rateStatus.allowed ? 'none' : 'block'};background:color-mix(in srgb,var(--bad) 12%,var(--sf));border:1px solid var(--bad);padding:10px;border-radius:12px;margin-bottom:14px;font-size:0.84rem;color:var(--bad);text-align:center">
            ${rateStatus.message || ""}
          </div>

          <!-- Login Form Area -->
          <div id="loginFormArea">
            ${this.renderLoginFormContent(this.currentLoginRole)}
          </div>

          <!-- Security Badge -->
          <div class="security-badge">
            <span class="security-dot"></span>
            <span>WebCrypto SHA-256 &amp; Brute-Force Rate Limiter Active</span>
          </div>
        </div>
      </div>
    `;

    ov.classList.add("on");

    // Auto-focus first input after animation
    setTimeout(() => {
      const firstInput = $("l_u") || $("l_wid");
      if (firstInput) firstInput.focus();
    }, 150);
  },

  handleLoginOverlayClick(e) {
    if (e.target && e.target.id === "loginOverlay") {
      closeM();
    }
  },

  switchLoginRole(role) {
    this.currentLoginRole = role;
    const tabAdmin = $("roleTabAdmin");
    const tabWorker = $("roleTabWorker");
    const formArea = $("loginFormArea");

    if (tabAdmin && tabWorker) {
      tabAdmin.classList.toggle("active", role === "admin");
      tabWorker.classList.toggle("active", role === "worker");
    }

    if (formArea) {
      formArea.innerHTML = this.renderLoginFormContent(role);
      const firstInput = $("l_u") || $("l_wid");
      if (firstInput) firstInput.focus();
    }

    // Refresh rate lock status for this role
    const rateStatus = Security.checkRateLimit("login_" + role, 5, 30);
    const notice = $("loginRateLockNotice");
    if (notice) {
      notice.style.display = rateStatus.allowed ? "none" : "block";
      notice.textContent = rateStatus.message || "";
    }
  },

  renderLoginFormContent(role) {
    if (role === "admin") {
      return `
        <form onsubmit="App.handleAdminSubmit(event)">
          <div class="login-form-group">
            <label for="l_u">Admin Username</label>
            <div class="login-input-wrap">
              <i>👤</i>
              <input id="l_u" autocomplete="username" placeholder="Enter admin username" required>
            </div>
          </div>

          <div class="login-form-group">
            <label for="l_p">Master Password</label>
            <div class="login-input-wrap">
              <i>🔑</i>
              <input id="l_p" type="password" autocomplete="current-password" placeholder="Enter admin password" required>
            </div>
          </div>

          <div id="loginErrorMsg" class="login-error-alert" style="display:none"></div>

          <button type="submit" class="login-submit-btn" id="loginSubmitBtn">
            <span>Login to Boutique Admin</span>
            <i>➔</i>
          </button>
        </form>
      `;
    } else {
      return `
        <form onsubmit="App.handleWorkerSubmit(event)">
          <div class="login-form-group">
            <label for="l_wid">Artisan ID / Registered Mobile</label>
            <div class="login-input-wrap">
              <i>🧵</i>
              <input id="l_wid" autocomplete="username" placeholder="e.g. w101@saifadesigns or 10-digit mobile" required>
            </div>
          </div>

          <div class="login-form-group">
            <label for="l_pin">Security PIN / Password</label>
            <div class="login-input-wrap">
              <i>🔒</i>
              <input id="l_pin" type="password" autocomplete="current-password" placeholder="Enter your confidential PIN" required>
            </div>
          </div>

          <div id="loginErrorMsg" class="login-error-alert" style="display:none"></div>

          <button type="submit" class="login-submit-btn" id="loginSubmitBtn">
            <span>Login to Artisan Workstation</span>
            <i>➔</i>
          </button>
        </form>
      `;
    }
  },

  async handleAdminSubmit(e) {
    e.preventDefault();
    const u = $("l_u") ? $("l_u").value.trim() : "";
    const p = $("l_p") ? $("l_p").value : "";
    const errEl = $("loginErrorMsg");
    const card = $("loginCard");
    const btn = $("loginSubmitBtn");

    if (!u || !p) return;

    // Check brute force rate limit
    const rateCheck = Security.checkRateLimit("login_admin", 5, 30);
    if (!rateCheck.allowed) {
      if (errEl) {
        errEl.textContent = rateCheck.message;
        errEl.style.display = "block";
      }
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.classList.add("loading");
    }

    try {
      const cfgAdmin = S.cfg?.admin || DEF.admin;
      const expectedUsername = cfgAdmin.u || "admin";

      // Compute SHA-256 cryptographic hash of submitted password
      const pHash = await Security.hash(p);
      const expectedHash = cfgAdmin.pHash || (await Security.hash(cfgAdmin.p || "saifa@123"));

      // Verify username and password hash
      const isValid = (u === expectedUsername) && (pHash === expectedHash || p === cfgAdmin.p);

      if (isValid) {
        Security.resetLoginAttempts("login_admin");
        S.me = {
          role: "admin",
          name: "Boutique Administrator",
          id: "admin",
          sessionToken: Security.createSessionToken("admin", "admin")
        };

        toast("Welcome back, Administrator! 👑");
        closeM();
        if (typeof panel === "function") panel();
      } else {
        const failRecord = Security.recordFailedLogin("login_admin", 5, 30);
        if (card) {
          card.classList.remove("shake");
          void card.offsetWidth; // Force reflow
          card.classList.add("shake");
        }
        if (errEl) {
          errEl.textContent = failRecord.message || "Invalid username or password.";
          errEl.style.display = "block";
        }
      }
    } catch (err) {
      console.error(err);
      toast("Login error. Please try again.");
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.classList.remove("loading");
      }
    }
  },

  async handleWorkerSubmit(e) {
    e.preventDefault();
    const wid = $("l_wid") ? $("l_wid").value.trim().toLowerCase() : "";
    const pin = $("l_pin") ? $("l_pin").value.trim() : "";
    const errEl = $("loginErrorMsg");
    const card = $("loginCard");
    const btn = $("loginSubmitBtn");

    if (!wid || !pin) return;

    // Check brute force rate limit
    const rateCheck = Security.checkRateLimit("login_worker_" + wid, 5, 30);
    if (!rateCheck.allowed) {
      if (errEl) {
        errEl.textContent = rateCheck.message;
        errEl.style.display = "block";
      }
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.classList.add("loading");
    }

    try {
      const worker = typeof findWorkerByLoginId === "function" 
        ? findWorkerByLoginId(wid)
        : (S.workers || []).find(w => String(w.wid).toLowerCase() === wid || np(w.phone) === np(wid));

      let pinMatch = false;
      if (worker) {
        if (worker.pin && String(worker.pin).trim() === pin) {
          pinMatch = true;
        } else if (worker.dob) {
          // Format dob YYYY-MM-DD -> DDMMYYYY
          const parts = String(worker.dob).split("-");
          if (parts.length === 3) {
            const formattedDob = parts[2] + parts[1] + parts[0];
            if (formattedDob === pin) pinMatch = true;
          }
        }
      }

      if (worker && pinMatch) {
        Security.resetLoginAttempts("login_worker_" + wid);
        S.me = {
          role: "worker",
          id: worker.id,
          wid: worker.wid,
          name: worker.name,
          craft: worker.role,
          img: worker.img || "",
          sessionToken: Security.createSessionToken("worker", worker.id)
        };

        toast(`Welcome, ${worker.name}! 🧵`);
        closeM();
        if (typeof wpanel === "function") wpanel();
      } else {
        const failRecord = Security.recordFailedLogin("login_worker_" + wid, 5, 30);
        if (card) {
          card.classList.remove("shake");
          void card.offsetWidth;
          card.classList.add("shake");
        }
        if (errEl) {
          errEl.textContent = failRecord.message || "Invalid Worker ID or DOB PIN.";
          errEl.style.display = "block";
        }
      }
    } catch (err) {
      console.error(err);
      toast("Artisan login error.");
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.classList.remove("loading");
      }
    }
  },

  // ------------------------------------------
  // WebRTC Live Camera Capture Viewfinder
  // ------------------------------------------
  openLiveCamera(onCaptureCallback) {
    this.cameraFacingMode = "user";

    modal(`
      <div style="text-align:center">
        <h2 style="color:var(--br);margin:0 0 6px">📸 Live Camera Viewfinder</h2>
        <p style="font-size:0.84rem;color:var(--mu);margin-bottom:12px">
          Capture high-resolution real-time photo directly from your device's camera
        </p>

        <!-- Video Stream Container -->
        <div style="position:relative;width:100%;max-width:440px;margin:auto;border-radius:18px;overflow:hidden;background:#000;aspect-ratio:4/3;box-shadow:0 8px 30px rgba(0,0,0,0.3)">
          <video id="liveCameraVideo" autoplay playsinline style="width:100%;height:100%;object-fit:cover"></video>
          <div id="cameraLoadingSpinner" style="position:absolute;inset:0;display:grid;place-items:center;color:#fff;background:rgba(0,0,0,0.6)">
            <span>Initializing Camera Stream...</span>
          </div>
          <!-- Framing Guide Grid -->
          <div style="position:absolute;inset:12px;border:1px dashed rgba(255,255,255,0.4);border-radius:12px;pointer-events:none"></div>
        </div>

        <div style="display:flex;gap:10px;justify-content:center;margin-top:14px;flex-wrap:wrap">
          <button class="btn s" type="button" onclick="App.toggleCameraFacingMode()">🔄 Switch Front / Back</button>
          <button class="btn p" type="button" style="padding:10px 24px;font-weight:700" onclick="App.snapPhotoAndCallback()">📸 Capture Snapshot</button>
          <button class="btn" type="button" onclick="App.closeLiveCamera()">Cancel</button>
        </div>

        <canvas id="liveCameraCanvas" style="display:none"></canvas>
      </div>
    `);

    this.startCameraStream();
    this.currentCaptureCallback = onCaptureCallback;
  },

  async startCameraStream() {
    this.stopCameraStream();

    const video = $("liveCameraVideo");
    const spinner = $("cameraLoadingSpinner");

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      if (spinner) spinner.innerHTML = "Camera API not supported in this browser. Please use file upload instead.";
      toast("Camera API not available on this browser.");
      return;
    }

    try {
      const constraints = {
        video: {
          facingMode: this.cameraFacingMode,
          width: { ideal: 1280 },
          height: { ideal: 960 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.activeCameraStream = stream;

      if (video) {
        video.srcObject = stream;
        video.onloadedmetadata = () => {
          video.play();
          if (spinner) spinner.style.display = "none";
        };
      }
    } catch (err) {
      console.warn("Camera stream access failed:", err);
      if (spinner) {
        spinner.innerHTML = `<span style="padding:12px">Camera access denied or unavailable.<br><small>${err.name}: ${err.message}</small></span>`;
      }
      toast("Could not access camera. Please allow camera permissions or upload file.");
    }
  },

  toggleCameraFacingMode() {
    this.cameraFacingMode = this.cameraFacingMode === "user" ? "environment" : "user";
    this.startCameraStream();
  },

  snapPhotoAndCallback() {
    const video = $("liveCameraVideo");
    const canvas = $("liveCameraCanvas");

    if (!video || !canvas || !this.activeCameraStream) {
      toast("Camera feed not ready.");
      return;
    }

    const vw = video.videoWidth || 640;
    const vh = video.videoHeight || 480;

    canvas.width = Math.min(vw, 1024);
    canvas.height = Math.round((canvas.width / vw) * vh);

    const ctx = canvas.getContext("2d");
    if (this.cameraFacingMode === "user") {
      // Mirror image horizontally for selfie/front camera
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.88);

    this.stopCameraStream();
    closeM();

    if (typeof this.currentCaptureCallback === "function") {
      this.currentCaptureCallback(dataUrl);
      toast("Photo captured successfully! 📸");
    }
  },

  stopCameraStream() {
    if (this.activeCameraStream) {
      this.activeCameraStream.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (e) {}
      });
      this.activeCameraStream = null;
    }
  },

  closeLiveCamera() {
    this.stopCameraStream();
    closeM();
  }
};

// ------------------------------------------
// Theme Toggle System (Dark / Light)
// ------------------------------------------
function getTheme() {
  const saved = localStorage.getItem("saifa_theme");
  if (saved) return saved;
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function setTheme(theme) {
  const t = theme === "dark" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", t);
  localStorage.setItem("saifa_theme", t);
  updateThemeToggleButtons(t);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") || getTheme();
  const next = current === "dark" ? "light" : "dark";
  setTheme(next);
  toast(`Switched to ${next === "dark" ? "🌙 Dark" : "☀️ Light"} mode`);
}

function updateThemeToggleButtons(theme) {
  const isDark = theme === "dark";
  document.querySelectorAll(".theme-toggle-btn").forEach(btn => {
    btn.innerHTML = isDark
      ? `<span class="theme-icon">☀️</span> <span class="theme-label">Light Mode</span>`
      : `<span class="theme-icon">🌙</span> <span class="theme-label">Dark Mode</span>`;
    btn.setAttribute("title", `Switch to ${isDark ? 'Light' : 'Dark'} mode`);
    btn.setAttribute("aria-label", `Switch to ${isDark ? 'Light' : 'Dark'} mode`);
    btn.classList.toggle("is-dark", isDark);
  });
}

function initTheme() {
  const t = getTheme();
  setTheme(t);
}

// Immediate theme bootstrap
initTheme();

// ------------------------------------------
// Global DOM and UI Helper Bindings
// ------------------------------------------
function openLogin(role = "admin") {
  App.openLoginModal(role);
}

function closeM() {
  const ov = $("ov");
  if (ov) {
    ov.classList.remove("on");
    // Ensure md container is always restored for subsequent modals
    if (!$("md")) {
      ov.innerHTML = '<div class="md" id="md"></div>';
    }
  }
  App.stopCameraStream();
}

function modal(html) {
  const ov = $("ov");
  if (!ov) return;
  let md = $("md");
  if (!md) {
    ov.innerHTML = '<div class="md" id="md"></div>';
    md = $("md");
  }
  md.innerHTML = `<button class="x" onclick="closeM()">&times;</button>${html}`;
  ov.classList.add("on");
}

let toastTimer = null;
function toast(msg) {
  const tt = $("tt");
  if (!tt) return;
  tt.textContent = msg;
  tt.style.display = "block";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    tt.style.display = "none";
  }, 3200);
}

// Global real-time view refresh controller
function refresh() {
  if (typeof renderFront === "function") renderFront();
  if (typeof panel === "function" && S.tab && S.me && S.me.role === "admin") panel();
  if (typeof wpanel === "function" && S.me && S.me.role === "worker") wpanel();
}

window.getTheme = getTheme;
window.setTheme = setTheme;
window.toggleTheme = toggleTheme;
window.updateThemeToggleButtons = updateThemeToggleButtons;
window.refresh = refresh;

// Launch on DOM Content Loaded
document.addEventListener("DOMContentLoaded", () => {
  App.init();
});
