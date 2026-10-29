// ==========================================
// SAIFA DESIGNS – CUSTOMER STOREFRONT & PORTAL
// ==========================================

const Customer = {
  init() {
    this.initSplashScreen();
    this.saveWishlist();
    this.renderFront();
    this.startShopStatusAutoUpdater();
    this.checkUrlForTracking();
    this.checkUrlForStitching();
    if (typeof this.initCatalogue === "function" && $("catalogueGrid")) {
      this.initCatalogue();
    }
    this.initThreeHero();
    this.initCompactStatusClickOutside();

    window.addEventListener("hashchange", () => {
      this.checkUrlForTracking();
      this.checkUrlForStitching();
    });
  },

  // ------------------------------------------
  // Collapsible Stitching Dropdown Controller
  // ------------------------------------------
  toggleStitchingDropdown(forceOpen = null) {
    const wrap = $("fsboxWrap");
    const trigger = $("stitchDropdownTrigger");
    const btnText = $("stitchBtnText");
    const chevron = $("stitchChevron");
    if (!wrap) return;

    const isCurrentlyOpen = wrap.style.display !== "none" && wrap.classList.contains("open");
    const shouldOpen = forceOpen !== null ? forceOpen : !isCurrentlyOpen;

    if (shouldOpen) {
      wrap.style.display = "block";
      wrap.classList.add("open");
      if (trigger) {
        trigger.classList.add("open");
        trigger.setAttribute("aria-expanded", "true");
      }
      if (btnText) btnText.textContent = "Close Stitching Form";
      if (chevron) chevron.textContent = "▲";
    } else {
      wrap.style.display = "none";
      wrap.classList.remove("open");
      if (trigger) {
        trigger.classList.remove("open");
        trigger.setAttribute("aria-expanded", "false");
      }
      if (btnText) btnText.textContent = "Open Stitching Form";
      if (chevron) chevron.textContent = "▾";
    }
  },

  openStitchingForm() {
    this.toggleStitchingDropdown(true);
    const target = $("stitch");
    if (target) {
      setTimeout(() => {
        target.scrollIntoView({ behavior: "smooth" });
      }, 50);
    }
  },

  checkUrlForStitching() {
    if (window.location.hash === "#stitch") {
      this.openStitchingForm();
    }
  },

  checkUrlForTracking() {
    if (window.location.hash.startsWith("#track")) {
      const parts = window.location.hash.split("?");
      if (parts.length > 1) {
        const urlParams = new URLSearchParams(parts[1]);
        const orderId = urlParams.get("id");
        const phone = urlParams.get("phone");
        if (orderId && $("tk")) $("tk").value = orderId;
        if (phone && $("tp")) $("tp").value = phone;
        if (orderId && phone) {
          setTimeout(() => this.trackOrder(true), 200);
        }
      }
    }
  },

  // ------------------------------------------
  // Payment Modal with Downloadable QR Code
  // ------------------------------------------
  showPayModal(o) {
    const c = S.cfg;
    const qrDataUrl = upiLink(o.total, "Order " + o.no);
    const customQR = c.qrImage;
    this._currentProof = null;

    modal(`
      <h2 style="color:var(--br);margin-bottom:4px">Pay ${R(o.total)}</h2>
      <p style="color:var(--mu);margin-bottom:14px">Order <b>#${E(o.no)}</b> · Pay to <b>${E(c.payee)}</b></p>
      
      <div style="text-align:center">
        <div class="qr" id="qrb">
          ${customQR ? `<img id="payQrImg" src="${customQR}" style="display:block;max-width:200px;height:auto;margin:auto;border-radius:12px">` : ""}
        </div>
        <p style="font-size:0.82rem;color:var(--mu);margin:8px 0">
          UPI ID: <b>${E(c.upi)}</b>
        </p>
        <div style="display:flex;gap:8px;justify-content:center;margin:8px 0">
          <button class="btn s" onclick="Customer.downloadQR('${o.no}')">⬇ Download QR to Gallery</button>
        </div>
      </div>

      <a class="btn p" style="width:100%;margin:6px 0" href="${qrDataUrl}">📲 Open UPI App (GPay, PhonePe, Paytm)</a>
      <p style="font-size:0.75rem;color:var(--mu);text-align:center;margin-bottom:12px">
        On mobile, tap above to open your UPI app. On computer, scan the QR code.
      </p>

      <!-- AI-Assisted Screenshot Verification Dropzone -->
      <div style="background:var(--sf2);padding:12px 14px;border-radius:14px;border:1px solid var(--ln);margin-bottom:12px;text-align:left">
        <b style="font-size:0.86rem;color:var(--tx);display:block;margin-bottom:4px">📸 Upload UPI Payment Screenshot</b>
        <p style="font-size:0.76rem;color:var(--mu);margin:0 0 8px">
          Upload your payment confirmation screen. Vision AI will automatically extract UTR &amp; amount for admin verification.
        </p>
        <input type="file" id="pay_screenshot_file" accept="image/*" onchange="Customer.handlePayProofUpload(this, '${o.id}', ${o.total})" style="font-size:0.8rem">

        <div id="payProofPreviewArea" style="display:none;margin-top:10px;padding:8px 10px;background:var(--sf);border-radius:10px;border:1px solid var(--ln)">
          <div style="display:flex;gap:10px;align-items:center">
            <img id="payProofThumb" src="" style="width:50px;height:50px;object-fit:cover;border-radius:8px;border:1px solid var(--ln)">
            <div id="payProofOcrStatus" style="font-size:0.78rem;color:var(--tx);line-height:1.4">
              Analyzing receipt...
            </div>
          </div>
        </div>
      </div>

      <button class="btn g" style="width:100%;font-weight:700;margin-bottom:8px" onclick="Customer.submitProofAndClaim('${o.id}')">
        ✅ Submit Payment Proof &amp; Claim Order
      </button>

      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px">
        <button class="btn s" style="font-size:0.76rem" onclick="Customer.switchOrderToCod('${o.id}')">
          💵 Switch to Cash on Delivery
        </button>
        <button class="btn s" style="font-size:0.76rem" onclick="closeM()">Close</button>
      </div>
    `);

    if (!customQR) {
      try {
        const q = qrcode(0, "M");
        q.addData(qrDataUrl);
        q.make();
        $("qrb").innerHTML = q.createImgTag(6, 8);
        const img = $("qrb").querySelector("img");
        if (img) img.id = "payQrImg";
      } catch (e) {
        $("qrb").textContent = qrDataUrl;
      }
    }
  },

  downloadQR(orderNo = "order") {
    const img = $("payQrImg");
    if (!img || !img.src) return toast("QR Code is ready for scanning");
    const a = document.createElement("a");
    a.href = img.src;
    a.download = `saifa_upi_qr_${orderNo}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast("QR Code saved to your device! 📥");
  },

  async handlePayProofUpload(input, orderId, expectedTotal) {
    if (input.files && input.files[0]) {
      const reader = new FileReader();
      reader.onload = async e => {
        const dataUrl = e.target.result;
        const previewArea = $("payProofPreviewArea");
        const thumb = $("payProofThumb");
        const statusBox = $("payProofOcrStatus");
        if (previewArea && thumb && statusBox) {
          thumb.src = dataUrl;
          previewArea.style.display = "block";
          statusBox.innerHTML = `<i>🔍 AI Vision analyzing UPI receipt details...</i>`;
        }

        let analysis = null;
        if (typeof AI !== "undefined" && AI.analyzeUpiReceipt) {
          analysis = await AI.analyzeUpiReceipt(dataUrl, expectedTotal);
        }

        Customer._currentProof = {
          img: dataUrl,
          ocr: analysis
        };

        if (statusBox) {
          if (analysis && analysis.verified) {
            statusBox.innerHTML = `
              <b style="color:var(--ok)">✓ Receipt Detected (${analysis.appDetected})</b><br>
              Amount: <b>${R(analysis.amount)}</b> · UTR: <code>${analysis.utr}</code>
            `;
          } else if (analysis) {
            statusBox.innerHTML = `
              <b style="color:var(--warn)">⚠️ Verification Flagged:</b> ${analysis.flags.join(", ") || 'Unreadable fields'}<br>
              <small style="color:var(--mu)">Screenshot will be reviewed manually by boutique admin.</small>
            `;
          } else {
            statusBox.innerHTML = `<b>Screenshot loaded</b> · Ready for submission.`;
          }
        }
      };
      reader.readAsDataURL(input.files[0]);
    }
  },

  submitProofAndClaim(orderId) {
    const proof = this._currentProof;
    const patch = {
      paid: "Claimed",
      paymentProof: proof ? {
        img: proof.img,
        utr: proof.ocr ? proof.ocr.utr : "",
        extractedAmount: proof.ocr ? proof.ocr.amount : 0,
        appDetected: proof.ocr ? proof.ocr.appDetected : "UPI",
        flags: proof.ocr ? proof.ocr.flags : [],
        timestamp: Date.now(),
        status: "Pending Admin Approval"
      } : {
        timestamp: Date.now(),
        status: "Claimed without screenshot"
      }
    };
    upd("orders", orderId, patch);
    closeM();
    this._currentProof = null;
    modal(`
      <div style="text-align:center;padding:12px 6px">
        <div style="font-size:2.8rem">⏳</div>
        <h2 style="color:var(--br);margin:8px 0 4px">Payment Proof Submitted</h2>
        <p style="color:var(--tx);font-size:0.9rem;margin-bottom:12px">
          Thank you! Your payment verification proof has been transmitted to our boutique atelier desk.
        </p>
        <div style="background:var(--sf2);padding:12px;border-radius:12px;border:1px solid var(--ln);font-size:0.82rem;color:var(--mu);margin-bottom:16px;text-align:left">
          • <b>Order Status:</b> Pending Admin Receipt Check<br>
          • <b>Security Notice:</b> Real-time funds verification will be confirmed by the boutique admin before final packing and dispatch.<br>
          • You will receive updates via WhatsApp and live order tracking.
        </div>
        <button class="btn p" onclick="closeM()">Done</button>
      </div>
    `);
    toast("Payment proof recorded! Admin verification pending 📸");
  },

  switchOrderToCod(orderId) {
    upd("orders", orderId, { pay: "Cash on Delivery", paid: "Pending" });
    closeM();
    toast("Order switched to Cash on Delivery / Pay at Shop! 💵");
    if (typeof renderFront === "function") renderFront();
  },

  markPaid(id) {
    this.submitProofAndClaim(id);
  },

  showOrderConfirmation(o) {
    const adminWhatsAppUrl = getAdminWhatsAppOrderLink(o);

    modal(`
      <div style="text-align:center">
        <div style="font-size:3.2rem">🎉</div>
        <h2 style="color:var(--br);margin:6px 0">Order Successfully Placed!</h2>
        <p style="color:var(--mu)">Your unique Order Tracking ID is</p>
        <p style="font:800 2.2rem 'Playfair Display',serif;color:var(--gd);letter-spacing:0.08em;margin:8px 0">
          #${E(o.no)}
        </p>
        <p style="color:var(--mu);font-size:0.88rem">
          Client ID: <b>${E(o.cid)}</b> · Total: <b>${R(o.total)}</b> (${E(o.pay)})
        </p>
        ${o.coupon ? `<p style="color:var(--ok);font-size:0.85rem">Coupon '${E(o.coupon)}' Applied: -${R(o.discount)}</p>` : ""}

        <!-- Automated WhatsApp order confirmation link to Admin -->
        <div style="background:var(--sf2);padding:14px;border-radius:14px;margin:16px 0;text-align:left">
          <b>📲 Share Order with Boutique Master:</b>
          <p style="font-size:0.82rem;color:var(--mu);margin:4px 0 10px">
            Click below to send your Order ID and measurement details directly to our master tailor on WhatsApp.
          </p>
          <a class="btn g" style="width:100%;font-weight:600" href="${adminWhatsAppUrl}" target="_blank" rel="noopener">
            💬 Send Order Details to Admin on WhatsApp
          </a>
        </div>

        <button class="btn p" style="width:100%" onclick="closeM()">Done</button>
      </div>
    `);
  },

  // ------------------------------------------
  // Catalog & Product Browsing with Subcategories
  // ------------------------------------------
  renderChips() {
    const container = $("chips");
    if (!container) return;
    container.innerHTML = ["All", "Material", "Readymade"]
      .map(c => `<span class="chip ${S.cat === c ? "on" : ""}" onclick="Customer.selectCategory('${c}')">${c === 'Material' ? 'Materials & Fabrics' : (c === 'Readymade' ? 'Readymade Wear' : 'All Collections')}</span>`)
      .join("");
    this.renderSubcatChips();
  },

  selectCategory(cat) {
    S.cat = cat;
    S.subcat = "All";
    this.renderShop();
  },

  selectSubcategory(subcat) {
    S.subcat = subcat;
    this.renderShop();
  },

  renderSubcatChips() {
    const subContainer = $("subcatChips");
    if (!subContainer) return;

    let subcats = [];
    if (S.cat === "Material") {
      subcats = typeof getMaterialSubcats === "function" ? getMaterialSubcats() : MATERIAL_SUBCATS;
    } else if (S.cat === "Readymade") {
      subcats = typeof getReadymadeSubcats === "function" ? getReadymadeSubcats() : READYMADE_SUBCATS;
    } else {
      const mats = typeof getMaterialSubcats === "function" ? getMaterialSubcats() : MATERIAL_SUBCATS;
      const readys = typeof getReadymadeSubcats === "function" ? getReadymadeSubcats() : READYMADE_SUBCATS;
      subcats = [...mats.slice(0, 3), ...readys.slice(0, 3)];
    }

    const allProds = products();
    const curSub = S.subcat || "All";

    const allLabel = S.cat === "Material" ? "All Materials" : (S.cat === "Readymade" ? "All Readymade" : "All Subcategories");
    const allCount = S.cat === "All" ? allProds.length : allProds.filter(p => p.cat === S.cat).length;

    let html = `
      <span class="subcat-chip ${curSub === "All" ? "on" : ""}" onclick="Customer.selectSubcategory('All')">
        ${allLabel} <span class="count">${allCount}</span>
      </span>
    `;

    subcats.forEach(sub => {
      const cnt = allProds.filter(p => (S.cat === "All" || p.cat === S.cat) && p.subcat === sub).length;
      html += `
        <span class="subcat-chip ${curSub === sub ? "on" : ""}" onclick="Customer.selectSubcategory('${Security.escapeHTML(sub)}')">
          ${Security.escapeHTML(sub)} <span class="count">${cnt}</span>
        </span>
      `;
    });

    subContainer.innerHTML = html;
  },

  toggleShowAllProducts() {
    S.showAllProducts = !S.showAllProducts;
    this.renderShop();
    if (!S.showAllProducts) {
      const shopEl = $("shop");
      if (shopEl) shopEl.scrollIntoView({ behavior: "smooth" });
    }
  },

  renderShop() {
    this.renderChips();
    const qEl = $("q");
    const q = qEl ? qEl.value.toLowerCase().trim() : "";
    const grid = $("pg");
    if (!grid) return;

    const curSub = S.subcat || "All";

    const allFiltered = products().filter(p => {
      if (p.published === false || p.status === "Draft") return false;
      const matchCat = (S.cat === "All" || p.cat === S.cat);
      const matchSub = (curSub === "All" || p.subcat === curSub);
      const matchSearch = (p.name + p.desc + p.fabric + (p.subcat || "")).toLowerCase().includes(q);
      return matchCat && matchSub && matchSearch;
    });

    if (!allFiltered.length) {
      grid.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:40px 10px;background:var(--sf2);border-radius:18px;border:1px dashed var(--ln);margin:16px 0">
          <p style="font-size:1.4rem;margin-bottom:6px">🔍</p>
          <b style="color:var(--br)">No products found in this subcategory</b>
          <p style="color:var(--mu);font-size:0.86rem;margin-top:4px">Try choosing "All Subcategories" or a different search term.</p>
          <button class="btn s p" style="margin-top:12px" onclick="Customer.selectSubcategory('All')">View All Collections</button>
        </div>
      `;
      return;
    }

    // Show one featured image/item first, then provide fully responsive 'Show More' button
    const isSearchingOrFiltered = Boolean(q) || S.cat !== "All" || curSub !== "All";
    const shouldShowAll = S.showAllProducts || isSearchingOrFiltered;
    const displayedItems = shouldShowAll ? allFiltered : allFiltered.slice(0, 1);

    const cardsHtml = displayedItems.map((p, idx) => `
      <div class="card ${!shouldShowAll ? 'spotlight-card' : ''}">
        <div class="pic" style="background:linear-gradient(135deg,${E(p.hx)}22,${E(p.hx)}88)" onclick="Customer.openDetail('${p.id}')">
          ${!shouldShowAll ? `<span class="ribbon" style="background:linear-gradient(90deg,var(--br),var(--gd));left:12px;right:auto">🌟 Featured Collection Spotlight</span>` : (p.stock < 5 && p.stock > 0 ? `<span class="ribbon">Only ${p.stock} left</span>` : "")}
          <button class="card-wishlist-btn ${Customer.isInWishlist(p.id) ? 'active' : ''}" 
            data-id="${p.id}" 
            type="button"
            onclick="event.stopPropagation(); Customer.toggleWishlist('${p.id}', event)" 
            title="${Customer.isInWishlist(p.id) ? 'Remove from Wishlist' : 'Save to Wishlist'}" 
            aria-label="Wishlist">
            <span class="heart-icon">${Customer.isInWishlist(p.id) ? '💖' : '🤍'}</span>
          </button>
          ${p.img ? `<img src="${p.img}" alt="${E(p.name)}" loading="lazy">` : p.em || "👗"}
          <div class="zoom-overlay"><span>🔍 View Full</span></div>
        </div>
        <div class="cb">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:6px">
            <span class="tag">${E(p.cat)}</span>
            ${p.subcat ? `<span class="pill" style="font-size:0.68rem;padding:2px 8px;background:var(--sf2);color:var(--mu)">${E(p.subcat)}</span>` : ''}
          </div>
          <h3>${E(p.name)}</h3>
          <small>${E(p.fabric)}</small>
          <div class="pr">
            ${R(p.price)}
            ${p.stock < 1 ? ` <span style="color:var(--bad);font-size:0.85rem">· Sold out</span>` : ""}
          </div>
          <div class="row2">
            <button class="btn s p" ${p.stock < 1 ? "disabled" : ""} onclick="Customer.handleQuickAddToCart('${p.id}')">Add to Cart</button>
            <button class="btn s" onclick="Customer.openDetail('${p.id}')">Details</button>
          </div>
        </div>
      </div>
    `).join("");

    let toggleCtaHtml = "";
    if (!shouldShowAll && allFiltered.length > 1) {
      toggleCtaHtml = `
        <div class="responsive-show-more-wrap">
          <button class="responsive-show-more-btn" onclick="Customer.toggleShowAllProducts()" aria-label="Show More Products and Fabrics" title="Click to view all collections">
            <span class="cute-icon">✨</span>
            <span>Show More Products &amp; Fabrics</span>
            <span class="cute-count-badge">+${allFiltered.length - 1} more</span>
            <b class="cute-chevron">▾</b>
          </button>
        </div>
      `;
    } else if (shouldShowAll && !isSearchingOrFiltered && allFiltered.length > 1) {
      toggleCtaHtml = `
        <div class="responsive-show-more-wrap">
          <button class="responsive-show-more-btn cute-btn-subtle" onclick="Customer.toggleShowAllProducts()" aria-label="Show Less Products">
            <span>Show Less (Featured Spotlight)</span>
            <b class="cute-chevron">▲</b>
          </button>
        </div>
      `;
    }

    grid.innerHTML = cardsHtml + toggleCtaHtml;
  },

  // ------------------------------------------
  // New Arrivals (Fresh Creations from Atelier)
  // ------------------------------------------
  renderNewArrivals() {
    const grid = $("newArrivalsGrid");
    if (!grid) return;

    const allProds = products().filter(p => p.published !== false && p.status !== "Draft");
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

    // Filter products added within the last 7 days
    let newItems = allProds.filter(p => {
      const created = p.created || (p.createdAt ? new Date(p.createdAt).getTime() : 0);
      return created >= sevenDaysAgo;
    });

    // Fallback: If fewer than 2 items in 7 days, select the 4 most recently created items
    if (newItems.length < 2) {
      newItems = [...allProds].sort((a, b) => {
        const tA = a.created || 0;
        const tB = b.created || 0;
        return tB - tA;
      }).slice(0, 4);
    }

    if (!newItems.length) {
      grid.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:36px 16px;background:var(--sf);border-radius:18px;border:1px dashed var(--ln)">
          <div style="font-size:2.4rem;margin-bottom:8px">🧵</div>
          <h3 style="font-family:'Playfair Display',serif;color:var(--br);margin:0 0 6px">Atelier Creations in Crafting</h3>
          <p style="color:var(--mu);margin:0 0 14px;font-size:0.9rem">Our master artisans are finishing fresh pieces. Explore our full catalogues below.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = newItems.map(p => {
      const vars = Array.isArray(p.variants) && p.variants.length > 0 ? p.variants : null;
      const totalStock = vars ? vars.reduce((acc, v) => acc + (Number(v.stock) || 0), 0) : (Number(p.stock) || 0);
      const isOut = totalStock <= 0;
      const inWishlist = Customer.isInWishlist(p.id);

      return `
        <div class="card new-arrival-card ${isOut ? 'out-of-stock-card' : ''}" 
          role="button" 
          tabindex="0" 
          aria-label="View details for ${Security.escapeHTML(p.name)}" 
          onclick="Customer.openDetail('${p.id}')"
          onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();Customer.openDetail('${p.id}')}">
          <div class="pic" style="background:linear-gradient(135deg,${E(p.hx || '#8e1647')}22,${E(p.hx || '#8e1647')}88)">
            <span class="ribbon ribbon-new">✨ Just In · Added This Week</span>
            <button class="card-wishlist-btn ${inWishlist ? 'active' : ''}" 
              data-id="${p.id}" 
              type="button"
              onclick="event.stopPropagation(); Customer.toggleWishlist('${p.id}', event)" 
              title="${inWishlist ? 'Remove from Wishlist' : 'Save to Wishlist'}" 
              aria-label="Wishlist">
              <span class="heart-icon">${inWishlist ? '💖' : '🤍'}</span>
            </button>
            ${p.img ? `<img src="${Security.escapeHTML(p.img)}" alt="${Security.escapeHTML(p.name)}" loading="lazy">` : `<span style="font-size:3rem">${p.em || "👗"}</span>`}
            <div class="zoom-overlay"><span>🔍 View Details</span></div>
          </div>
          <div class="cb">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;margin-bottom:6px">
              <span class="tag ${p.cat === 'Readymade' ? 'tag-readymade' : 'tag-material'}">${Security.escapeHTML(p.cat)}</span>
              ${p.subcat ? `<span class="pill subcat-badge">${Security.escapeHTML(p.subcat)}</span>` : ''}
            </div>
            <h3 class="prod-title">${Security.escapeHTML(p.name)}</h3>
            <div class="pr">
              ${R(p.price)}
              ${isOut ? ` <span class="stock-badge stock-badge-out">· Sold out</span>` : (totalStock < 5 ? ` <span class="stock-badge stock-badge-low">· Only ${totalStock} left</span>` : '')}
            </div>
            <button class="btn s p view-details-btn" type="button" style="width:100%;margin-top:10px" onclick="event.stopPropagation(); Customer.openDetail('${p.id}')">
              <span>🔍 View Details</span>
            </button>
          </div>
        </div>
      `;
    }).join("");
  },

  // ------------------------------------------
  // Interactive Why Saifa Designs Feature Modals
  // ------------------------------------------
  openFeatureModal(key) {
    const features = {
      fit_profile: {
        icon: "📏",
        title: "Permanent Fit Profile",
        subtitle: "Archived Tailoring Metrics for Instant Bespoke Orders",
        desc: "When you get measured at Saifa Designs or submit your custom profile online, our master cutters calibrate a comprehensive fit specification (bust, waist, hip, shoulder-to-apex, armhole, posture slope, and preferred drape allowance). This blueprint is securely linked to your unique Client ID.",
        whyItMatters: "You only measure once. Whether ordering bridal trousseau sets, seasonal kurtis, or everyday silk blouses months or years later, our atelier pulls your exact pattern profile.",
        policy: "100% stored securely, updated anytime you request adjustments, and accessible on your customer dashboard.",
        actionBtn: `<button class="btn p" onclick="closeM(); const s=$('stitch'); if(s)s.scrollIntoView({behavior:'smooth'}); if(Customer.toggleStitchingDropdown)Customer.toggleStitchingDropdown(true);">✨ Open Measurement Intake</button>`
      },
      handcrafting: {
        icon: "🪡",
        title: "Artisanal Handcrafting & Finishing",
        subtitle: "Couture Techniques, French Seams & Intricate Detailing",
        desc: "Every garment at Saifa Designs undergoes hand-basting, pattern alignment matching, reinforced inner overlocking, clean French seams, and hand-tacked hems. We finish ensembles with handmade potli buttons, artisanal latkans, and reinforced pocket anchors.",
        whyItMatters: "Fast-fashion machine stitching unravels and causes itchy, abrasive inner seams. Our slow-crafted artisanal construction delivers smooth interior comfort against your skin and maintains structural drape through years of wear.",
        policy: "Three-stage quality inspection by our Master Craftsman before any garment is ironed, packaged, and stamped with our atelier seal.",
        actionBtn: `<button class="btn p" onclick="closeM(); const t=$('team'); if(t)t.scrollIntoView({behavior:'smooth'});">🧵 Meet Our Master Craftsmen</button>`
      },
      textiles: {
        icon: "🧵",
        title: "Pure Certified Textiles",
        subtitle: "Authentic Handloom Weaves & Verified Natural Fibres",
        desc: "We source our materials directly from traditional weaving clusters—authentic Chanderi silk-cotton, Varanasi gold zari brocades, breathable Maheshwari handlooms, pure modal mulmul, and high-thread-count organic linens.",
        whyItMatters: "Pure natural fibres breathe with your body, drape naturally without synthetic stiffness, and retain their luminous luster and dye depth wash after wash.",
        policy: "Zero synthetic blends sold as pure. Every fabric bolt is tested for colorfastness, shrinkage tolerance, and warp/weft density before being offered to our patrons.",
        actionBtn: `<a href="product.html" class="btn p" onclick="closeM()">🧶 Explore Fabrics Catalogue</a>`
      },
      payments: {
        icon: "💳",
        title: "Zero-Friction UPI & COD",
        subtitle: "Instant One-Tap UPI, Boutique Dynamic QR & Flexible Cash Payment",
        desc: "We support one-tap native UPI intent links across GPay, PhonePe, Paytm, and BHIM, dynamic on-screen boutique QR codes with pre-filled amounts, standard Cash on Delivery (COD), and direct counter payment at our boutique.",
        whyItMatters: "No clunky payment gateway redirects or hidden convenience fees. Your transaction is directly verified against your order number in real time.",
        policy: "Fully transparent receipts with itemized order breakdowns, automatic order confirmation, and zero markup on any payment mode.",
        actionBtn: `<button class="btn p" onclick="closeM(); Customer.openCart(true);">🛒 View Cart & Payment Modes</button>`
      },
      tracker: {
        icon: "📦",
        title: "Live Milestone Order Tracker",
        subtitle: "Real-Time Atelier Transparency from Cutting to Delivery",
        desc: "Follow your order through 5 clear artisan stages: (1) Order Confirmed & Fabric Intake, (2) Pattern Drafting & Precision Cutting, (3) Artisan Hand-Stitching & Embroidery, (4) Trial Fitting & Ironing Ready, and (5) Dispatched / Delivered.",
        whyItMatters: "You never have to wonder about the status of your bridal lehenga, festive suit, or bespoke blouse. Real-time updates keep you informed every step of the way.",
        policy: "Live timestamped status updates visible with your Order ID and phone number anytime on our website or at the counter.",
        actionBtn: `<button class="btn p" onclick="closeM(); const tr=$('track'); if(tr)tr.scrollIntoView({behavior:'smooth'}); const tk=$('tk'); if(tk)tk.focus();">🔍 Track Your Existing Order</button>`
      },
      alterations: {
        icon: "✂️",
        title: "Complimentary Alteration Guarantee",
        subtitle: "Generous 2-3 Inch In-Seam Margins & Free Lifetime Fitting Adjustments",
        desc: "All Saifa Designs readymade garments and custom-stitched pieces are constructed with generous internal side seam allowances (typically 2 to 3 inches). If your weight fluctuates or you prefer a closer waist or relaxed chest drape, we adjust it with pleasure.",
        whyItMatters: "Bodies change, and heirloom ethnic garments should fit comfortably throughout your life. You never have to discard a cherished Saifa ensemble because of minor sizing shifts.",
        policy: "100% complimentary fitting tweaks within 30 days of purchase or trial, and nominal support thereafter at our boutique.",
        actionBtn: `<button class="btn p" onclick="closeM(); const c=$('contact'); if(c)c.scrollIntoView({behavior:'smooth'});">📍 Visit Atelier for Fitting</button>`
      }
    };

    const f = features[key];
    if (!f) return;

    modal(`
      <div class="feature-modal-wrap" style="text-align:left;padding:4px 0">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
          <div style="font-size:2.4rem;line-height:1;width:54px;height:54px;display:grid;place-items:center;background:var(--sf2);border-radius:14px;border:1px solid var(--ln);flex-shrink:0">
            ${f.icon}
          </div>
          <div>
            <span class="eyebrow" style="font-size:0.68rem;padding:3px 9px;margin:0 0 4px">SAIFA PROMISE</span>
            <h2 style="font-family:'Playfair Display',serif;color:var(--br);margin:0;font-size:1.35rem">${Security.escapeHTML(f.title)}</h2>
          </div>
        </div>
        <p style="font-weight:600;color:var(--gd);margin:0 0 12px;font-size:0.92rem">${Security.escapeHTML(f.subtitle)}</p>
        <div style="background:var(--sf);border:1px solid var(--ln);border-radius:12px;padding:14px;margin-bottom:14px">
          <p style="color:var(--tx);margin:0 0 10px;line-height:1.6;font-size:0.88rem">${Security.escapeHTML(f.desc)}</p>
          <div style="margin-top:10px;border-top:1px dashed var(--ln);padding-top:10px">
            <b style="color:var(--br);font-size:0.8rem;text-transform:uppercase;letter-spacing:0.04em">Why It Matters:</b>
            <p style="color:var(--mu);margin:4px 0 0;font-size:0.84rem;line-height:1.5">${Security.escapeHTML(f.whyItMatters)}</p>
          </div>
          <div style="margin-top:10px;border-top:1px dashed var(--ln);padding-top:10px">
            <b style="color:var(--br);font-size:0.8rem;text-transform:uppercase;letter-spacing:0.04em">Our Atelier Policy:</b>
            <p style="color:var(--mu);margin:4px 0 0;font-size:0.84rem;line-height:1.5">${Security.escapeHTML(f.policy)}</p>
          </div>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end;margin-top:14px">
          <button class="btn s" onclick="closeM()">Close</button>
          ${f.actionBtn || ''}
        </div>
      </div>
    `);
  },

  // ------------------------------------------
  // Interactive Atelier Journey Step Modals
  // ------------------------------------------
  openJourneyStepModal(stepNumber) {
    const steps = {
      1: {
        num: "01",
        icon: "👗",
        title: "Discover Collections",
        subtitle: "Explore Luxury Fabrics & Designer Readymade Ensembles",
        desc: "Browse our curated catalogues of pure unstitched fabrics (silks, linens, georgettes) on our Materials page or explore ready-to-wear boutique ensembles with complete size options on our Readymade page. Filter by palette, fabric, category, and price.",
        details: "Every item in our catalogue is updated in real time with authentic atelier stock. You can examine high-resolution photographs, fabric descriptions, and available cuts before making your choice.",
        action: `<div style="display:flex;gap:8px;flex-wrap:wrap"><a href="product.html" class="btn p" onclick="closeM()">🧵 View Fabrics</a><a href="readymade.html" class="btn" onclick="closeM()">👗 View Readymade</a></div>`
      },
      2: {
        num: "02",
        icon: "📐",
        title: "Specify Your Fit",
        subtitle: "Personalized Measurements Saved to Permanent Client Profile",
        desc: "For custom stitching, share your measurements using our interactive online intake form, pick a standard sizing benchmark, or visit our atelier for an in-person measurement session. Your specifications are permanently archived under your unique Client ID.",
        details: "Once saved, you never have to re-enter your measurements again. Re-ordering festive kurtis, blouses, or salwar suits is as simple as a single tap.",
        action: `<button class="btn p" onclick="closeM(); const s=$('stitch'); if(s)s.scrollIntoView({behavior:'smooth'}); if(Customer.toggleStitchingDropdown)Customer.toggleStitchingDropdown(true);">✂️ Open Stitching Form</button>`
      },
      3: {
        num: "03",
        icon: "💳",
        title: "Seamless Checkout",
        subtitle: "Transparent Pricing with One-Click UPI & Cash On Delivery",
        desc: "Review your shopping cart with re-priced catalogue validation, apply valid festive discount coupons, and confirm with instant UPI one-click payment, custom boutique QR code, or Cash on Delivery. Receive an instant booking confirmation and unique Order ID.",
        details: "All prices are validated directly against our central catalogue to protect you from checkout discrepancies. Zero extra transaction fees are added.",
        action: `<button class="btn p" onclick="closeM(); Customer.openCart(true);">🛒 View Cart & Checkout</button>`
      },
      4: {
        num: "04",
        icon: "🪡",
        title: "Atelier Crafting & Tracking",
        subtitle: "Pattern Drafting, Precision Cutting & Live Milestone Tracking",
        desc: "Our master artisans translate your specifications onto fabric, carefully hand-cutting patterns, sewing reinforced seams, and finishing trims. You can monitor your garment's live crafting status online through every milestone stage from fabric intake to trial ready.",
        details: "Our atelier milestone system tracks 5 precise stages: Order Confirmed, Cutting & Drafting, Artisan Stitching, Trial Ready, and Delivered.",
        action: `<button class="btn p" onclick="closeM(); const tr=$('track'); if(tr)tr.scrollIntoView({behavior:'smooth'}); const tk=$('tk'); if(tk)tk.focus();">📦 Track Your Order Live</button>`
      },
      5: {
        num: "05",
        icon: "🎉",
        title: "Trial & Delivery",
        subtitle: "Complimentary Trial Fitting, Perfect Adjustments & Safe Delivery",
        desc: "Once your ensemble is finished, visit our studio for a trial fitting session or enjoy safe doorstep delivery. Every garment features built-in expansion margins and our 100% complimentary alteration guarantee so your fit is always impeccable.",
        details: "We provide 2 to 3 inches of inner margin on side seams. If you need any adjustment, our in-house master tailors complete it with pleasure.",
        action: `<button class="btn p" onclick="closeM(); const c=$('contact'); if(c)c.scrollIntoView({behavior:'smooth'});">📍 Atelier Location & Hours</button>`
      }
    };

    const s = steps[stepNumber];
    if (!s) return;

    modal(`
      <div class="journey-modal-wrap" style="text-align:left;padding:4px 0">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
          <div style="font-size:1.8rem;font-weight:800;color:var(--gd);background:var(--sf2);border:1px solid var(--ln);width:54px;height:54px;border-radius:14px;display:grid;place-items:center;flex-shrink:0">
            ${s.num}
          </div>
          <div>
            <span class="eyebrow" style="font-size:0.68rem;padding:3px 9px;margin:0 0 4px">ATELIER STEP ${s.num}</span>
            <h2 style="font-family:'Playfair Display',serif;color:var(--br);margin:0;font-size:1.35rem">${s.icon} ${Security.escapeHTML(s.title)}</h2>
          </div>
        </div>
        <p style="font-weight:600;color:var(--gd);margin:0 0 12px;font-size:0.92rem">${Security.escapeHTML(s.subtitle)}</p>
        <div style="background:var(--sf);border:1px solid var(--ln);border-radius:12px;padding:14px;margin-bottom:14px">
          <p style="color:var(--tx);margin:0 0 10px;line-height:1.6;font-size:0.88rem">${Security.escapeHTML(s.desc)}</p>
          <div style="margin-top:10px;border-top:1px dashed var(--ln);padding-top:10px">
            <b style="color:var(--br);font-size:0.8rem;text-transform:uppercase;letter-spacing:0.04em">What to Expect:</b>
            <p style="color:var(--mu);margin:4px 0 0;font-size:0.84rem;line-height:1.5">${Security.escapeHTML(s.details)}</p>
          </div>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end;margin-top:14px">
          <button class="btn s" onclick="closeM()">Close</button>
          ${s.action || ''}
        </div>
      </div>
    `);
  },

  // ------------------------------------------
  // Google Maps Location Detection & Picker
  // ------------------------------------------
  detectCurrentLocation(targetAddressId, targetMapLinkId) {
    if (!navigator.geolocation) {
      return toast("Geolocation is not supported by your browser");
    }

    toast("Detecting your live GPS location... 📍");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;

        if (targetMapLinkId && $(targetMapLinkId)) {
          $(targetMapLinkId).value = mapsUrl;
        }

        try {
          const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
            headers: { "Accept-Language": "en" }
          });
          if (resp.ok) {
            const data = await resp.json();
            const formatted = data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
            if ($(targetAddressId)) {
              $(targetAddressId).value = formatted;
              $(targetAddressId).focus();
            }
            toast("Location detected & Google Maps pinned! 📍✅");
            return;
          }
        } catch (e) {
          console.warn("Reverse geocode fallback:", e);
        }

        // Fallback coordinates
        if ($(targetAddressId)) {
          $(targetAddressId).value = `GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        }
        toast("GPS coordinates pinned to your order! 📍");
      },
      (err) => {
        console.warn("Geolocation error:", err);
        toast("Could not access location. Please enter your address manually.");
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  },

  openMapLocationPicker(targetAddressId, targetMapLinkId) {
    const currentVal = $(targetAddressId) ? $(targetAddressId).value : "";
    modal(`
      <div style="text-align:center;padding:10px 4px">
        <span style="font-size:2.4rem">🗺️</span>
        <h2 style="color:var(--br);margin:6px 0">Pin Address with Google Maps</h2>
        <p style="color:var(--mu);font-size:0.88rem;margin-bottom:16px">
          Accurate location helps our boutique master with trial fitting visits and delivery.
        </p>

        <div style="background:var(--sf2);padding:14px;border-radius:14px;margin-bottom:16px;text-align:left">
          <label style="font-weight:700">Enter Address or Landmark:</label>
          <input id="mapModalInput" value="${Security.escapeHTML(currentVal)}" placeholder="House / Flat No, Street, Landmark, Area, City...">
          
          <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">
            <button class="btn s p" onclick="Customer.detectCurrentLocation('mapModalInput', '${targetMapLinkId || ''}')">
              📍 Use My Current GPS Location
            </button>
            <button class="btn s" onclick="Customer.previewGoogleMap()">
              🌐 Open Google Maps
            </button>
          </div>
        </div>

        <div style="display:flex;gap:10px;justify-content:center">
          <button class="btn" style="flex:1" onclick="closeM()">Cancel</button>
          <button class="btn p" style="flex:1.2" onclick="Customer.saveMapLocation('${targetAddressId}', '${targetMapLinkId || ''}')">
            ✅ Confirm Location
          </button>
        </div>
      </div>
    `);
  },

  previewGoogleMap() {
    const input = $("mapModalInput");
    const val = input ? input.value.trim() : "";
    const url = val ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(val)}` : "https://www.google.com/maps";
    window.open(url, "_blank", "noopener,noreferrer");
  },

  saveMapLocation(targetAddressId, targetMapLinkId) {
    const input = $("mapModalInput");
    if (!input) return closeM();
    const val = input.value.trim();
    if ($(targetAddressId)) $(targetAddressId).value = val;
    if (targetMapLinkId && $(targetMapLinkId)) {
      $(targetMapLinkId).value = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(val)}`;
    }
    closeM();
    toast("Address updated from Google Maps 📍");
  },

  // ------------------------------------------
  // Shop Operating Hours & Schedule Modal
  // ------------------------------------------
  showShopScheduleModal() {
    const liveStatus = typeof getShopLiveStatus === "function" ? getShopLiveStatus() : { isOpen: true, label: "Open Now", badgeClass: "open", message: "Open today" };
    const c = S.cfg || DEF;
    const openFmt = typeof formatTime12 === "function" ? formatTime12(c.openTime || "10:30") : (c.openTime || "10:30 AM");
    const closeFmt = typeof formatTime12 === "function" ? formatTime12(c.closeTime || "21:00") : (c.closeTime || "9:00 PM");
    const normalHoursText = `${openFmt} – ${closeFmt}`;
    const mapUrl = c.map && c.map.trim() !== "" ? c.map : `https://maps.google.com/?q=${encodeURIComponent('Saifa Designs, ' + (c.address || ''))}`;

    modal(`
      <div style="text-align:center;padding:10px 4px">
        <div style="width:56px;height:56px;border-radius:50%;background:color-mix(in srgb, var(--br) 12%, transparent);display:grid;place-items:center;font-size:1.8rem;margin:0 auto 10px">
          🏛️
        </div>
        <h2 style="color:var(--br);margin:0 0 4px">SAIFA DESIGNS Atelier</h2>
        <p style="color:var(--mu);font-size:0.86rem;margin-bottom:14px">Haute Couture Boutique &amp; Ladies Tailoring</p>

        <!-- Current Live Status Badge -->
        <div style="display:inline-flex;align-items:center;gap:8px;padding:8px 18px;border-radius:99px;font-weight:700;font-size:0.9rem;margin-bottom:16px;background:${liveStatus.isOpen ? 'color-mix(in srgb, var(--ok) 16%, var(--sf))' : 'color-mix(in srgb, var(--bad) 16%, var(--sf))'};color:${liveStatus.isOpen ? 'var(--ok)' : 'var(--bad)'};border:1px solid ${liveStatus.isOpen ? 'var(--ok)' : 'var(--bad)'}">
          <span class="status-dot" style="width:10px;height:10px;border-radius:50%;background:${liveStatus.isOpen ? 'var(--ok)' : 'var(--bad)'}"></span>
          <span>${Security.escapeHTML(liveStatus.label)}</span>
        </div>

        <p style="font-size:0.86rem;color:var(--tx);margin-bottom:16px">
          ${Security.escapeHTML(liveStatus.message)}
        </p>

        <!-- Weekly Operating Schedule Table -->
        <div style="background:var(--sf2);padding:14px;border-radius:14px;text-align:left;margin-bottom:16px">
          <b style="font-size:0.86rem;color:var(--tx)">📅 Weekly Atelier Schedule:</b>
          <table class="schedule-table">
            <tr>
              <td><b>${c.mondayClosed !== false ? "Tuesday – Sunday" : "Monday – Sunday (All 7 Days)"}</b></td>
              <td style="text-align:right"><b>${Security.escapeHTML(c.hours || normalHoursText)}</b></td>
            </tr>
            <tr style="color:${c.mondayClosed !== false ? 'var(--bad)' : 'var(--ok)'}">
              <td><b>Monday</b></td>
              <td style="text-align:right"><b>${c.mondayClosed !== false ? 'Closed (Atelier Rest Day)' : 'Open (' + normalHoursText + ')'}</b></td>
            </tr>
          </table>
          <p style="font-size:0.76rem;color:var(--mu);margin:6px 0 0">
            * Online orders, fabric browsing &amp; bespoke WhatsApp inquiries remain active 24/7.
          </p>
        </div>

        <!-- Boutique Contact & Directions -->
        <div style="font-size:0.84rem;color:var(--mu);margin-bottom:16px;line-height:1.5">
          📍 ${Security.escapeHTML(c.address)}<br>
          📞 Phone: <a href="tel:+${typeof getIntlPhone === 'function' ? getIntlPhone(c.shopPhone) : c.shopPhone}" style="color:var(--br);font-weight:700;text-decoration:none">${typeof formatPhone === 'function' ? Security.escapeHTML(formatPhone(c.shopPhone)) : '+' + Security.escapeHTML(c.shopPhone)}</a>
        </div>

        <div style="display:flex;gap:10px">
          <a class="btn p" style="flex:1" href="${mapUrl}" target="_blank" rel="noopener">📍 Open in Google Maps</a>
          <button class="btn" style="flex:1" onclick="closeM()">Close</button>
        </div>
      </div>
    `);
  },

  // ------------------------------------------
  // Mobile Navigation Drawer Controls
  // ------------------------------------------
  toggleMobileNav() {
    const drawer = $("mobileNavDrawer");
    const toggle = $("mobileNavToggle");
    if (drawer) {
      const isOpen = drawer.classList.toggle("open");
      if (toggle) toggle.classList.toggle("active", isOpen);
    }
  },

  closeMobileNav() {
    const drawer = $("mobileNavDrawer");
    const toggle = $("mobileNavToggle");
    if (drawer) drawer.classList.remove("open");
    if (toggle) toggle.classList.remove("active");
  },

  // ------------------------------------------
  // Compact Atelier Open / Closed Status Popover Controller
  // ------------------------------------------
  toggleShopStatusDropdown(e) {
    if (e && e.stopPropagation) e.stopPropagation();
    const pop = $("shopStatusPopover");
    const btn = $("compactShopStatusBtn");
    if (!pop) return;
    const isShowing = pop.style.display === "block";
    if (isShowing) {
      pop.style.display = "none";
      if (btn) {
        btn.setAttribute("aria-expanded", "false");
        btn.classList.remove("active");
      }
    } else {
      this.renderCompactShopStatus();
      pop.style.display = "block";
      if (btn) {
        btn.setAttribute("aria-expanded", "true");
        btn.classList.add("active");
      }
    }
  },

  closeShopStatusDropdown(e) {
    if (e && e.stopPropagation) e.stopPropagation();
    const pop = $("shopStatusPopover");
    const btn = $("compactShopStatusBtn");
    if (pop) pop.style.display = "none";
    if (btn) {
      btn.setAttribute("aria-expanded", "false");
      btn.classList.remove("active");
    }
  },

  renderCompactShopStatus() {
    const liveStatus = typeof getShopLiveStatus === "function" ? getShopLiveStatus() : { isOpen: true, label: "Open · 10:30 AM–9:00 PM", badgeClass: "open", message: "Boutique Open" };
    const cfg = S.cfg || (typeof DEF !== "undefined" ? DEF : {});

    // Update compact status trigger button
    const btn = $("compactShopStatusBtn");
    const dot = $("compactStatusDot");
    const label = $("compactStatusText");
    if (btn) {
      btn.className = `compact-shop-status-btn ${liveStatus.isOpen ? 'open' : 'closed'}`;
    }
    if (dot) {
      dot.className = `status-indicator-dot ${liveStatus.isOpen ? 'open' : 'closed'}`;
    }
    if (label) {
      label.textContent = liveStatus.compactStatusText || (liveStatus.isOpen ? "🟢 Atelier Open" : (liveStatus.isMondayClosed ? "🔴 Monday Closed" : "🔴 Atelier Closed"));
    }

    // Update popover elements
    const popBadge = $("popoverBadge");
    if (popBadge) {
      popBadge.className = `popover-status-badge ${liveStatus.isOpen ? 'open' : 'closed'}`;
      popBadge.textContent = liveStatus.isOpen ? "🟢 Atelier Open Now" : (liveStatus.isMondayClosed ? "🔴 Monday Rest Day" : "🔴 Atelier Closed");
    }

    const popTime = $("popoverCurrentTime");
    if (popTime) {
      const now = new Date();
      popTime.textContent = `Local Time: ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}`;
    }

    const popHours = $("popoverHours");
    if (popHours) {
      const oT = liveStatus.openTimeFormatted || (typeof formatTime12 === "function" ? formatTime12(cfg.openTime || "10:30") : "10:30 AM");
      const cT = liveStatus.closeTimeFormatted || (typeof formatTime12 === "function" ? formatTime12(cfg.closeTime || "21:00") : "9:00 PM");
      popHours.textContent = `${oT} – ${cT} (Tue–Sun)`;
    }

    const popMonday = $("popoverMonday");
    if (popMonday) {
      popMonday.textContent = cfg.mondayClosed !== false ? "Monday Closed (Weekly Atelier Rest Day)" : "Open 7 Days a Week";
    }

    const popNext = $("popoverNextText");
    if (popNext) {
      popNext.textContent = liveStatus.nextActionNote || (liveStatus.isOpen ? "Open today · Walk-ins welcome" : "Currently closed");
    }
  },

  initCompactStatusClickOutside() {
    if (this._clickOutsideBound) return;
    this._clickOutsideBound = true;
    document.addEventListener("click", (e) => {
      const pop = $("shopStatusPopover");
      const btn = $("compactShopStatusBtn");
      if (pop && pop.style.display === "block") {
        if (!pop.contains(e.target) && (!btn || !btn.contains(e.target))) {
          this.closeShopStatusDropdown();
        }
      }
      const tagPop = $("hangingTagPopover");
      const tagContainer = $("hangingTagContainer");
      if (tagPop && tagPop.style.display === "block") {
        if (!tagPop.contains(e.target) && (!tagContainer || !tagContainer.contains(e.target))) {
          this.closeHangingTagDropdown();
        }
      }
      const drawer = $("mobileNavDrawer");
      const navToggle = $("mobileNavToggle");
      if (drawer && drawer.classList.contains("open")) {
        if (!drawer.contains(e.target) && (!navToggle || !navToggle.contains(e.target))) {
          this.closeMobileNav();
        }
      }
    });
  },

  // ==========================================
  // FULL PRODUCT CATALOGUE SUITE (product.html)
  // ==========================================
  catalogue: {
    search: "",
    cat: "All",
    subcat: "All",
    sortBy: "newest",
    minPrice: null,
    maxPrice: null,
    selectedSizes: [],
    selectedColors: [],
    stockStatus: "all",
    page: 1,
    pageSize: 12,
    pageMode: "All"
  },

  initCatalogue() {
    const grid = $("catalogueGrid");
    if (!grid) return;

    // Detect page specialization from filename
    const path = (window.location.pathname || "").toLowerCase();
    if (path.includes("readymade.html")) {
      this.catalogue.cat = "Readymade";
      this.catalogue.pageMode = "Readymade";
    } else if (path.includes("product.html")) {
      this.catalogue.cat = "Material";
      this.catalogue.pageMode = "Material";
    } else {
      this.catalogue.pageMode = "All";
    }

    // Read URL search params (e.g. ?subcat=Silk&q=chanderi)
    try {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.has("cat") && this.catalogue.pageMode === "All") this.catalogue.cat = urlParams.get("cat");
      if (urlParams.has("subcat")) this.catalogue.subcat = urlParams.get("subcat");
      if (urlParams.has("q")) this.catalogue.search = urlParams.get("q").trim();
      if (urlParams.has("sort")) this.catalogue.sortBy = urlParams.get("sort");
    } catch (e) {}

    const searchInput = $("catalogueSearchInput");
    if (searchInput && this.catalogue.search) {
      searchInput.value = this.catalogue.search;
    }

    this.renderCatalogue();
  },

  setCatalogueCategory(cat) {
    this.catalogue.cat = cat;
    this.catalogue.subcat = "All";
    this.catalogue.page = 1;
    this.renderCatalogue();
  },

  setCatalogueSubcat(subcat) {
    this.catalogue.subcat = subcat;
    this.catalogue.page = 1;
    this.renderCatalogue();
  },

  setCatalogueSearch(q) {
    this.catalogue.search = (q || "").trim().toLowerCase();
    this.catalogue.page = 1;
    this.renderCatalogue();
  },

  setCatalogueSort(sortBy) {
    this.catalogue.sortBy = sortBy;
    this.catalogue.page = 1;
    this.renderCatalogue();
  },

  setCataloguePriceRange(min, max) {
    this.catalogue.minPrice = (min !== "" && min !== null && !isNaN(min)) ? Number(min) : null;
    this.catalogue.maxPrice = (max !== "" && max !== null && !isNaN(max)) ? Number(max) : null;
    this.catalogue.page = 1;
    this.renderCatalogue();
  },

  toggleCatalogueSize(sz) {
    const idx = this.catalogue.selectedSizes.indexOf(sz);
    if (idx >= 0) {
      this.catalogue.selectedSizes.splice(idx, 1);
    } else {
      this.catalogue.selectedSizes.push(sz);
    }
    this.catalogue.page = 1;
    this.renderCatalogue();
  },

  toggleCatalogueColor(col) {
    const idx = this.catalogue.selectedColors.indexOf(col);
    if (idx >= 0) {
      this.catalogue.selectedColors.splice(idx, 1);
    } else {
      this.catalogue.selectedColors.push(col);
    }
    this.catalogue.page = 1;
    this.renderCatalogue();
  },

  setCatalogueStockFilter(status) {
    this.catalogue.stockStatus = status;
    this.catalogue.page = 1;
    this.renderCatalogue();
  },

  resetCatalogueFilters() {
    this.catalogue.search = "";
    if (this.catalogue.pageMode === "Material") {
      this.catalogue.cat = "Material";
    } else if (this.catalogue.pageMode === "Readymade") {
      this.catalogue.cat = "Readymade";
    } else {
      this.catalogue.cat = "All";
    }
    this.catalogue.subcat = "All";
    this.catalogue.sortBy = "newest";
    this.catalogue.minPrice = null;
    this.catalogue.maxPrice = null;
    this.catalogue.selectedSizes = [];
    this.catalogue.selectedColors = [];
    this.catalogue.stockStatus = "all";
    this.catalogue.page = 1;

    const sInp = $("catalogueSearchInput");
    if (sInp) sInp.value = "";
    const pMin = $("catalogueMinPrice");
    if (pMin) pMin.value = "";
    const pMax = $("catalogueMaxPrice");
    if (pMax) pMax.value = "";
    const sortSelect = $("catalogueSortSelect");
    if (sortSelect) sortSelect.value = "newest";

    this.renderCatalogue();
  },

  loadMoreCatalogue() {
    this.catalogue.page += 1;
    this.renderCatalogue(true);
  },

  renderCatalogue(isAppend = false) {
    const grid = $("catalogueGrid");
    if (!grid) return;

    // Only display products published by admin
    const allProds = products().filter(p => p && p.published !== false && p.status !== "Draft");

    // Dynamic extraction of available facets (sizes & colors & subcategories)
    const availableSizes = new Set();
    const availableColors = new Set();
    let maxPriceInDb = 0;

    allProds.forEach(p => {
      const pr = Number(p.price) || 0;
      if (pr > maxPriceInDb) maxPriceInDb = pr;

      if (p.sizes) {
        p.sizes.split(",").forEach(s => {
          const clean = s.trim();
          if (clean) availableSizes.add(clean);
        });
      }
      if (p.sizeStock && typeof p.sizeStock === "object") {
        Object.keys(p.sizeStock).forEach(s => availableSizes.add(s.trim()));
      }
      if (Array.isArray(p.variants)) {
        p.variants.forEach(v => {
          if (v.size) availableSizes.add(v.size.trim());
          if (v.color) availableColors.add(v.color.trim());
        });
      }
      if (p.colors) {
        p.colors.split(",").forEach(c => {
          const clean = c.trim();
          if (clean) availableColors.add(clean);
        });
      }
    });

    // 1. Filtering
    const q = (this.catalogue.search || "").toLowerCase().trim();
    const cat = this.catalogue.cat;
    const subcat = this.catalogue.subcat;
    const minP = this.catalogue.minPrice;
    const maxP = this.catalogue.maxPrice;
    const sizes = this.catalogue.selectedSizes;
    const colors = this.catalogue.selectedColors;
    const stockStatus = this.catalogue.stockStatus;

    let filtered = allProds.filter(p => {
      // Category filter
      if (cat !== "All" && p.cat !== cat) return false;

      // Subcategory filter
      if (subcat !== "All" && p.subcat !== subcat) return false;

      // Price filter
      const price = Number(p.price) || 0;
      if (minP !== null && price < minP) return false;
      if (maxP !== null && price > maxP) return false;

      // Stock status filter
      const stock = Number(p.stock) || 0;
      if (stockStatus === "in_stock" && stock <= 0) return false;
      if (stockStatus === "low_stock" && (stock <= 0 || stock >= 5)) return false;

      // Size filter (multiselect: must match any selected size)
      if (sizes.length > 0) {
        const prodSizes = (p.sizes || "").toUpperCase();
        const prodSizeStock = p.sizeStock || {};
        const hasMatchingSize = sizes.some(sz => {
          const uSz = sz.toUpperCase();
          if (prodSizes.includes(uSz)) return true;
          if (prodSizeStock[sz] !== undefined && Number(prodSizeStock[sz]) > 0) return true;
          if (Array.isArray(p.variants) && p.variants.some(v => String(v.size || '').toUpperCase() === uSz && Number(v.stock) > 0)) return true;
          return false;
        });
        if (!hasMatchingSize) return false;
      }

      // Color filter (multiselect: must match any selected color)
      if (colors.length > 0) {
        const prodColors = (p.colors || "").toLowerCase();
        const hasMatchingColor = colors.some(col => {
          const lCol = col.toLowerCase();
          if (prodColors.includes(lCol)) return true;
          if (Array.isArray(p.variants) && p.variants.some(v => String(v.color || '').toLowerCase() === lCol)) return true;
          return false;
        });
        if (!hasMatchingColor) return false;
      }

      // Keyword / text search filter
      if (q) {
        const hay = `${p.name || ''} ${p.fabric || ''} ${p.desc || ''} ${p.cat || ''} ${p.subcat || ''} ${p.colors || ''} ${p.sizes || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });

    // 2. Sorting
    const sort = this.catalogue.sortBy;
    filtered.sort((a, b) => {
      const pA = Number(a.price) || 0;
      const pB = Number(b.price) || 0;
      const sA = Number(a.stock) || 0;
      const sB = Number(b.stock) || 0;
      const tA = a.created || (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const tB = b.created || (b.createdAt ? new Date(b.createdAt).getTime() : 0);

      if (sort === "price_asc") return pA - pB;
      if (sort === "price_desc") return pB - pA;
      if (sort === "stock_desc") return sB - sA;
      if (sort === "name_asc") return String(a.name || "").localeCompare(String(b.name || ""));
      return tB - tA; // "newest" by default
    });

    // 3. Render Category Tabs & Dynamic Subcategory Chips
    this.renderCatalogueFiltersUI(allProds, availableSizes, availableColors);

    // 4. Render Active Filter Bar & Item Count
    this.renderCatalogueActiveFilters(filtered.length, allProds.length);

    // 5. Pagination Calculation
    const totalCount = filtered.length;
    const displayCount = this.catalogue.page * this.catalogue.pageSize;
    const pageItems = filtered.slice(0, displayCount);

    if (totalCount === 0) {
      grid.innerHTML = `
        <div class="catalogue-empty-state">
          <div class="empty-icon">🔍</div>
          <h3>No matching boutique creations found</h3>
          <p>We couldn't find any pieces matching your chosen criteria. Try relaxing your price filter, selecting another color or size, or clearing all filters.</p>
          <button class="btn p" onclick="Customer.resetCatalogueFilters()">Reset All Filters ✨</button>
        </div>
      `;
      const loadMoreWrap = $("catalogueLoadMoreWrap");
      if (loadMoreWrap) loadMoreWrap.style.display = "none";
      return;
    }

    // Render Product Cards Grid
    const cardsHtml = pageItems.map(p => {
      const vars = Array.isArray(p.variants) && p.variants.length > 0 ? p.variants : null;
      const totalStock = vars ? vars.reduce((acc, v) => acc + (Number(v.stock) || 0), 0) : (Number(p.stock) || 0);
      const isOut = totalStock <= 0;
      const isLow = totalStock > 0 && totalStock < 5;
      const isNew = (Date.now() - (p.created || 0)) <= (7 * 24 * 60 * 60 * 1000);

      // Sizes list
      const sizeArr = (p.sizes || "").split(",").map(s => s.trim()).filter(Boolean);
      // Colors list
      const colorArr = (p.colors || "").split(",").map(c => c.trim()).filter(Boolean);

      const inWishlist = this.isInWishlist(p.id);

      return `
        <div class="card catalogue-card ${isOut ? 'out-of-stock-card' : ''}">
          <div class="pic" style="background:linear-gradient(135deg,${E(p.hx || '#8e1647')}22,${E(p.hx || '#8e1647')}88)" onclick="Customer.openDetail('${p.id}')">
            ${isNew ? `<span class="ribbon ribbon-new">✨ Just In</span>` : (isLow ? `<span class="ribbon ribbon-low">Only ${totalStock} left</span>` : (isOut ? `<span class="ribbon ribbon-out">Sold Out</span>` : ''))}
            
            <button class="card-wishlist-btn ${inWishlist ? 'active' : ''}" 
              data-id="${p.id}" 
              type="button"
              onclick="event.stopPropagation(); Customer.toggleWishlist('${p.id}', event)" 
              title="${inWishlist ? 'Remove from Wishlist' : 'Save to Wishlist'}" 
              aria-label="Wishlist">
              <span class="heart-icon">${inWishlist ? '💖' : '🤍'}</span>
            </button>

            ${p.img ? `<img src="${Security.escapeHTML(p.img)}" alt="${Security.escapeHTML(p.name)}" loading="lazy">` : `<span style="font-size:3.2rem">${p.em || "👗"}</span>`}
            
            <div class="zoom-overlay"><span>🔍 View Ensembles</span></div>
          </div>

          <div class="cb">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;margin-bottom:6px">
              <span class="tag">${Security.escapeHTML(p.cat || 'Fabric')}</span>
              ${p.subcat ? `<span class="pill" style="font-size:0.68rem;padding:2px 8px;background:var(--sf2);color:var(--mu);font-weight:600">${Security.escapeHTML(p.subcat)}</span>` : ''}
            </div>

            <h3 class="catalogue-prod-title" onclick="Customer.openDetail('${p.id}')">${Security.escapeHTML(p.name)}</h3>
            <p class="catalogue-prod-fabric">${Security.escapeHTML(p.fabric || 'Luxury Boutique Material')}</p>

            ${sizeArr.length > 0 ? `
              <div class="catalogue-sizes-row" title="Available sizes">
                <span class="size-label">Sizes:</span>
                ${sizeArr.slice(0, 4).map(s => `<span class="size-badge">${Security.escapeHTML(s)}</span>`).join('')}
                ${sizeArr.length > 4 ? `<span class="size-more">+${sizeArr.length - 4}</span>` : ''}
              </div>
            ` : ''}

            ${colorArr.length > 0 ? `
              <div class="catalogue-colors-row" title="Available colors">
                <span class="color-label">Colors:</span>
                <span class="color-text">${Security.escapeHTML(colorArr.slice(0, 3).join(', '))}${colorArr.length > 3 ? '…' : ''}</span>
              </div>
            ` : ''}

            <div class="pr">
              ${typeof R === "function" ? R(p.price) : `₹${p.price}`}
              ${isOut ? ` <span style="color:var(--bad);font-size:0.84rem;font-weight:600">· Sold out</span>` : (isLow ? ` <span style="color:var(--w);font-size:0.84rem;font-weight:600">· Limited</span>` : '')}
            </div>

            <div class="row2">
              <button class="btn s p" ${isOut ? 'disabled style="opacity:0.5;cursor:not-allowed"' : ''} onclick="Customer.handleQuickAddToCart('${p.id}')">
                ${isOut ? 'Out of Stock' : 'Add to Cart'}
              </button>
              <button class="btn s" onclick="Customer.openDetail('${p.id}')">Details</button>
            </div>
          </div>
        </div>
      `;
    }).join("");

    grid.innerHTML = cardsHtml;

    // Load More Button
    const loadMoreWrap = $("catalogueLoadMoreWrap");
    const loadMoreBtn = $("catalogueLoadMoreBtn");
    const loadMoreText = $("catalogueLoadMoreText");
    if (loadMoreWrap && loadMoreBtn) {
      if (displayCount < totalCount) {
        loadMoreWrap.style.display = "block";
        const remaining = totalCount - displayCount;
        if (loadMoreText) {
          loadMoreText.textContent = `Load More Pieces (${remaining} remaining)`;
        }
      } else {
        loadMoreWrap.style.display = "none";
      }
    }
  },

  renderCatalogueFiltersUI(allProds, availableSizes, availableColors) {
    // 1. Category Pills
    const catPillsWrap = $("catalogueCatPills");
    if (catPillsWrap) {
      const allCount = allProds.length;
      const matCount = allProds.filter(p => p.cat === "Material").length;
      const readyCount = allProds.filter(p => p.cat === "Readymade").length;
      const curCat = this.catalogue.cat;

      if (this.catalogue.pageMode === "Material") {
        catPillsWrap.innerHTML = `
          <div class="catalogue-mode-pill-active">
            <span class="mode-icon">🧵</span>
            <strong>Materials &amp; Fabrics Studio</strong>
            <span class="pill-cnt">${matCount} Pieces</span>
          </div>
          <a href="readymade.html" class="cat-pill mode-switch-pill" style="margin-left:auto">
            <span>Switch to Readymade Ensembles 👗</span>
          </a>
        `;
      } else if (this.catalogue.pageMode === "Readymade") {
        catPillsWrap.innerHTML = `
          <div class="catalogue-mode-pill-active">
            <span class="mode-icon">👗</span>
            <strong>Readymade Garments &amp; Occasion Wear</strong>
            <span class="pill-cnt">${readyCount} Pieces</span>
          </div>
          <a href="product.html" class="cat-pill mode-switch-pill" style="margin-left:auto">
            <span>Switch to Fabrics &amp; Materials 🧵</span>
          </a>
        `;
      } else {
        catPillsWrap.innerHTML = `
          <button class="cat-pill ${curCat === 'All' ? 'active' : ''}" type="button" onclick="Customer.setCatalogueCategory('All')">
            <span>All Pieces</span> <span class="pill-cnt">${allCount}</span>
          </button>
          <button class="cat-pill ${curCat === 'Material' ? 'active' : ''}" type="button" onclick="Customer.setCatalogueCategory('Material')">
            <span>🧵 Materials &amp; Fabrics</span> <span class="pill-cnt">${matCount}</span>
          </button>
          <button class="cat-pill ${curCat === 'Readymade' ? 'active' : ''}" type="button" onclick="Customer.setCatalogueCategory('Readymade')">
            <span>👗 Readymade Wear</span> <span class="pill-cnt">${readyCount}</span>
          </button>
        `;
      }
    }

    // 2. Dynamic Subcategory Chips
    const subcatWrap = $("catalogueSubcatChips");
    if (subcatWrap) {
      const curCat = this.catalogue.cat;
      const matSubcats = typeof getMaterialSubcats === "function" ? getMaterialSubcats() : (typeof MATERIAL_SUBCATS !== "undefined" ? MATERIAL_SUBCATS : []);
      const readySubcats = typeof getReadymadeSubcats === "function" ? getReadymadeSubcats() : (typeof READYMADE_SUBCATS !== "undefined" ? READYMADE_SUBCATS : []);
      const list = curCat === "Material" ? matSubcats : curCat === "Readymade" ? readySubcats : Array.from(new Set([...matSubcats, ...readySubcats]));
      const curSub = this.catalogue.subcat;

      subcatWrap.innerHTML = `
        <span class="subcat-chip ${curSub === 'All' ? 'active' : ''}" onclick="Customer.setCatalogueSubcat('All')">All Subcategories</span>
        ${list.map(s => {
          const cnt = allProds.filter(p => (curCat === 'All' || p.cat === curCat) && p.subcat === s).length;
          return `<span class="subcat-chip ${curSub === s ? 'active' : ''}" onclick="Customer.setCatalogueSubcat('${Security.escapeHTML(s)}')">${Security.escapeHTML(s)} ${cnt > 0 ? `(${cnt})` : ''}</span>`;
        }).join('')}
      `;
    }

    // 3. Size Filter Chips
    const sizeContainer = $("catalogueSizeChips");
    if (sizeContainer) {
      const standardOrder = ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "Free Size"];
      const sortedSizes = Array.from(availableSizes).sort((a, b) => {
        const iA = standardOrder.indexOf(a.toUpperCase());
        const iB = standardOrder.indexOf(b.toUpperCase());
        if (iA >= 0 && iB >= 0) return iA - iB;
        if (iA >= 0) return -1;
        if (iB >= 0) return 1;
        return a.localeCompare(b);
      });

      sizeContainer.innerHTML = sortedSizes.map(sz => {
        const isSel = this.catalogue.selectedSizes.includes(sz);
        return `
          <button class="facet-chip ${isSel ? 'active' : ''}" type="button" onclick="Customer.toggleCatalogueSize('${Security.escapeHTML(sz)}')">
            ${Security.escapeHTML(sz)}
          </button>
        `;
      }).join('') || '<span style="font-size:0.78rem;color:var(--mu)">Standard</span>';
    }

    // 4. Color Filter Chips
    const colorContainer = $("catalogueColorChips");
    if (colorContainer) {
      const colorsList = Array.from(availableColors).sort();
      colorContainer.innerHTML = colorsList.map(col => {
        const isSel = this.catalogue.selectedColors.includes(col);
        return `
          <button class="facet-chip facet-color-chip ${isSel ? 'active' : ''}" type="button" onclick="Customer.toggleCatalogueColor('${Security.escapeHTML(col)}')">
            <span class="color-dot" style="background:${col.toLowerCase()}"></span>
            <span>${Security.escapeHTML(col)}</span>
          </button>
        `;
      }).join('') || '<span style="font-size:0.78rem;color:var(--mu)">All Colours</span>';
    }
  },

  renderCatalogueActiveFilters(filteredCount, totalCount) {
    const summaryEl = $("catalogueCountSummary");
    if (summaryEl) {
      summaryEl.textContent = `Showing ${filteredCount} of ${totalCount} pieces`;
    }

    const activeWrap = $("catalogueActiveFiltersBar");
    if (!activeWrap) return;

    const tags = [];
    if (this.catalogue.cat !== "All") {
      tags.push({ label: `Category: ${this.catalogue.cat}`, reset: () => this.setCatalogueCategory("All") });
    }
    if (this.catalogue.subcat !== "All") {
      tags.push({ label: `Subcategory: ${this.catalogue.subcat}`, reset: () => this.setCatalogueSubcat("All") });
    }
    if (this.catalogue.search) {
      tags.push({ label: `Search: "${this.catalogue.search}"`, reset: () => this.setCatalogueSearch("") });
    }
    if (this.catalogue.minPrice !== null || this.catalogue.maxPrice !== null) {
      const minText = this.catalogue.minPrice !== null ? `₹${this.catalogue.minPrice}` : '₹0';
      const maxText = this.catalogue.maxPrice !== null ? `₹${this.catalogue.maxPrice}` : '∞';
      tags.push({ label: `Price: ${minText} – ${maxText}`, reset: () => this.setCataloguePriceRange(null, null) });
    }
    if (this.catalogue.stockStatus !== "all") {
      tags.push({ label: `Stock: ${this.catalogue.stockStatus === 'in_stock' ? 'In Stock' : 'Low Stock'}`, reset: () => this.setCatalogueStockFilter("all") });
    }
    this.catalogue.selectedSizes.forEach(sz => {
      tags.push({ label: `Size: ${sz}`, reset: () => this.toggleCatalogueSize(sz) });
    });
    this.catalogue.selectedColors.forEach(col => {
      tags.push({ label: `Color: ${col}`, reset: () => this.toggleCatalogueColor(col) });
    });

    if (tags.length === 0) {
      activeWrap.innerHTML = "";
      activeWrap.style.display = "none";
      return;
    }

    activeWrap.style.display = "flex";
    activeWrap.innerHTML = `
      <div class="active-chips-list">
        ${tags.map((t, idx) => `
          <span class="active-filter-badge">
            <span>${Security.escapeHTML(t.label)}</span>
            <button type="button" onclick="Customer._activeFilterResets[${idx}]()" aria-label="Remove filter">✕</button>
          </span>
        `).join('')}
      </div>
      <button class="clear-all-filters-btn" type="button" onclick="Customer.resetCatalogueFilters()">Clear All ✕</button>
    `;
    this._activeFilterResets = tags.map(t => t.reset);
  },

  openDetail(id) {
    const p = products().find(x => x.id == id);
    if (!p) return;
    if (typeof ensureProductVariants === "function") ensureProductVariants(p);

    const isReadymade = p.cat === "Readymade";
    const variants = p.variants || [];
    const colorList = (p.colors || "").split(",").map(c => c.trim()).filter(Boolean);

    let sizeOptions = [];
    if (isReadymade) {
      // Size selectors ONLY for readymade products
      let rawSizes = (p.sizes || "").split(",").map(s => s.trim()).filter(Boolean);
      if (p.sizeStock && typeof p.sizeStock === "object") {
        const stockKeys = Object.keys(p.sizeStock);
        if (stockKeys.length > 0 && (!rawSizes.length || stockKeys.some(k => rawSizes.includes(k)))) {
          rawSizes = stockKeys;
        }
      }
      if (!rawSizes.length) {
        rawSizes = ["XS", "S", "M", "L", "XL", "XXL"];
      }
      sizeOptions = rawSizes;
    } else {
      // Relevant fabric quantity / cut length options for materials
      let customCuts = (p.sizes || "").split(",").map(s => s.trim()).filter(s => s && s.toLowerCase().includes("m"));
      if (customCuts.length >= 2) {
        sizeOptions = customCuts;
      } else {
        sizeOptions = [
          "2.5 Metres (Kurti Cut)",
          "3.0 Metres (Suit Cut)",
          "4.5 Metres (Full Set)",
          "5.5 Metres (Saree Cut)"
        ];
      }
    }

    this._currentProduct = p;
    this._selectedColor = colorList[0] || (variants[0] ? variants[0].color : "Standard");

    // Default to first in-stock size if available for readymade, otherwise first option
    let preferredOption = sizeOptions[0] || (variants[0] ? variants[0].size : "Standard");
    if (isReadymade) {
      for (const sz of sizeOptions) {
        const szStock = typeof getProductSizeStock === "function" 
          ? getProductSizeStock(p, sz, this._selectedColor) 
          : (Number(p.stock) || 0);
        if (szStock > 0) {
          preferredOption = sz;
          break;
        }
      }
    }
    this._selectedSize = preferredOption;

    const availableStock = isReadymade && typeof getProductSizeStock === "function" 
      ? getProductSizeStock(p, this._selectedSize, this._selectedColor) 
      : (Number(p.stock) || 0);
    const isOutOfStock = availableStock <= 0;

    modal(`
      <div class="detail-pic-container" style="position:relative;border-radius:20px;overflow:hidden;background:linear-gradient(135deg,${E(p.hx)}22,${E(p.hx)}77);margin-bottom:16px;box-shadow:0 8px 24px rgba(0,0,0,0.08)">
        <div class="pic detail-pic" style="border-radius:20px;height:clamp(280px, 46vh, 420px);width:100%">
          ${p.img ? `<img src="${p.img}" alt="${E(p.name)}" style="width:100%;height:100%;object-fit:cover;object-position:center 15%;border-radius:20px">` : p.em || "👗"}
        </div>
        ${p.img ? `
          <button class="btn s" onclick="Customer.openFullImage('${p.img}', '${E(p.name)}')" style="position:absolute;bottom:14px;right:14px;background:rgba(255,255,255,0.94);backdrop-filter:blur(6px);color:#2a1420;box-shadow:0 4px 14px rgba(0,0,0,0.22);font-size:0.78rem;border:none;font-weight:600;padding:6px 14px;cursor:pointer">
            🔍 Fullscreen Zoom
          </button>
        ` : ''}
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:6px">
        <span class="tag ${isReadymade ? 'tag-readymade' : 'tag-material'}">${E(p.cat)}</span>
        ${p.subcat ? `<span class="pill" style="font-size:0.72rem;padding:3px 10px;background:var(--sf2);color:var(--mu);font-weight:600">${E(p.subcat)}</span>` : ''}
      </div>
      <h2 style="margin:8px 0 4px;font-family:'Playfair Display',serif">${E(p.name)}</h2>
      <div class="pr" style="font-size:1.45rem;font-family:'Playfair Display',serif">${R(p.price)}</div>
      <p style="color:var(--mu);margin:10px 0;line-height:1.5">${E(p.desc)}</p>

      <!-- Color Variant Selection -->
      ${colorList.length ? `
        <div style="margin:14px 0 8px">
          <label style="display:block;font-size:0.82rem;font-weight:700;color:var(--br);margin-bottom:6px">
            🎨 Select Color / Shade: <span id="selectedColorLabel" style="color:var(--tx);font-weight:600">${Security.escapeHTML(this._selectedColor)}</span>
          </label>
          <div style="display:flex;gap:8px;flex-wrap:wrap" id="colorChipsWrap">
            ${colorList.map((col) => `
              <button type="button" class="variant-chip ${col === this._selectedColor ? 'active' : ''}" onclick="Customer.selectDetailVariant('color', '${Security.escapeHTML(col)}', this)">
                ${Security.escapeHTML(col)}
              </button>
            `).join("")}
          </div>
        </div>
      ` : ''}

      <!-- Size Variant Selection (Readymade Only) OR Fabric Cut Options (Materials Only) -->
      ${isReadymade ? `
        <div style="margin:8px 0 14px">
          <label style="display:block;font-size:0.82rem;font-weight:700;color:var(--br);margin-bottom:6px">
            📏 Select Garment Size: <span id="selectedSizeLabel" style="color:var(--tx);font-weight:600">${Security.escapeHTML(this._selectedSize)}</span>
          </label>
          <div style="display:flex;gap:8px;flex-wrap:wrap" id="sizeChipsWrap">
            ${sizeOptions.map((sz) => {
              const szStock = typeof getProductSizeStock === "function" 
                ? getProductSizeStock(p, sz, this._selectedColor) 
                : (Number(p.stock) || 0);
              const isSzOut = szStock <= 0;
              const isSelected = sz === this._selectedSize;
              return `
                <button type="button" 
                  class="variant-chip ${isSelected ? 'active' : ''} ${isSzOut ? 'out-of-stock' : ''}" 
                  data-size="${Security.escapeHTML(sz)}"
                  onclick="Customer.selectDetailVariant('size', '${Security.escapeHTML(sz)}', this)"
                  style="${isSzOut ? 'opacity:0.6;border-style:dashed;' : ''}">
                  ${Security.escapeHTML(sz)}
                  ${isSzOut ? ' <span style="font-size:0.68rem;color:var(--bad);font-weight:700">· Sold Out</span>' : ` <span style="font-size:0.68rem;color:var(--mu);font-weight:600">(${szStock})</span>`}
                </button>
              `;
            }).join("")}
          </div>
        </div>
      ` : `
        <div style="margin:8px 0 14px">
          <label style="display:block;font-size:0.82rem;font-weight:700;color:var(--br);margin-bottom:6px">
            ✂️ Select Fabric Cut / Length: <span id="selectedSizeLabel" style="color:var(--tx);font-weight:600">${Security.escapeHTML(this._selectedSize)}</span>
          </label>
          <div style="display:flex;gap:8px;flex-wrap:wrap" id="sizeChipsWrap">
            ${sizeOptions.map((cut) => {
              const isSelected = cut === this._selectedSize;
              return `
                <button type="button" 
                  class="variant-chip fabric-cut-chip ${isSelected ? 'active' : ''}" 
                  data-size="${Security.escapeHTML(cut)}"
                  onclick="Customer.selectDetailVariant('size', '${Security.escapeHTML(cut)}', this)">
                  ${Security.escapeHTML(cut)}
                </button>
              `;
            }).join("")}
          </div>
        </div>
      `}

      <table style="margin:12px 0">
        <tr><th>Fabric Spec</th><td><b>${E(p.fabric)}</b></td></tr>
        <tr><th>Stock Status</th><td id="detailStockStatus">${isOutOfStock ? `<span class="pill bad">Out of stock in ${Security.escapeHTML(this._selectedSize)}</span>` : `<span class="pill ok">${availableStock} units available (${Security.escapeHTML(this._selectedSize)} · ${Security.escapeHTML(this._selectedColor)})</span>`}</td></tr>
      </table>
      <p style="font-size:0.8rem;color:var(--mu);margin:10px 0">
        🧵 Complimentary minor alterations · Handcrafted finishing · UPI, Cash on Delivery, or Pay at boutique
      </p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px">
        <button class="btn p" id="detailAddToCartBtn" ${isOutOfStock ? "disabled style='opacity:0.5;cursor:not-allowed'" : ""} onclick="Customer.addCurrentDetailToCart('${p.id}');closeM()">🛒 Add to Cart</button>
        <button class="btn wishlist-detail-btn ${this.isInWishlist(p.id) ? 'active' : ''}" id="detailWishlistBtn" data-id="${p.id}" type="button" onclick="Customer.toggleWishlist('${p.id}', event)">
          ${this.isInWishlist(p.id) ? '💖 Saved in Wishlist' : '🤍 Save to Wishlist'}
        </button>
        ${p.img ? `<button class="btn" onclick="Customer.openFullImage('${p.img}', '${E(p.name)}')">🔍 View Full Photo</button>` : ''}
        <button class="btn" onclick="Customer.askStylistForProduct('${p.id}')">✨ How to Style</button>
      </div>
      <div id="pai" class="ai" style="display:none;margin-top:12px"></div>
    `);
  },

  selectDetailVariant(type, value, btnEl) {
    if (type === "color") {
      this._selectedColor = value;
      const lbl = $("selectedColorLabel");
      if (lbl) lbl.textContent = value;
      const wrap = $("colorChipsWrap");
      if (wrap) wrap.querySelectorAll(".variant-chip").forEach(el => el.classList.remove("active"));
      if (btnEl) btnEl.classList.add("active");
    } else if (type === "size") {
      this._selectedSize = value;
      const lbl = $("selectedSizeLabel");
      if (lbl) lbl.textContent = value;
      const wrap = $("sizeChipsWrap");
      if (wrap) wrap.querySelectorAll(".variant-chip").forEach(el => el.classList.remove("active"));
      if (btnEl) btnEl.classList.add("active");
    }

    // Refresh size chips stock badges when color changes
    const p = this._currentProduct;
    if (p) {
      const isReadymade = p.cat === "Readymade";
      const sizeWrap = $("sizeChipsWrap");
      if (sizeWrap && type === "color" && isReadymade) {
        sizeWrap.querySelectorAll(".variant-chip").forEach(chip => {
          const sz = chip.dataset.size;
          if (sz) {
            const szStock = typeof getProductSizeStock === "function" 
              ? getProductSizeStock(p, sz, this._selectedColor) 
              : (Number(p.stock) || 0);
            const isSzOut = szStock <= 0;
            chip.style.opacity = isSzOut ? "0.6" : "1";
            chip.style.borderStyle = isSzOut ? "dashed" : "solid";
            chip.innerHTML = `${Security.escapeHTML(sz)} ${isSzOut ? '<span style="font-size:0.68rem;color:var(--bad);font-weight:700">· Sold Out</span>' : `<span style="font-size:0.68rem;color:var(--mu);font-weight:600">(${szStock})</span>`}`;
            if (chip.dataset.size === this._selectedSize) {
              chip.classList.add("active");
            }
          }
        });
      }

      const stock = isReadymade && typeof getProductSizeStock === "function" 
        ? getProductSizeStock(p, this._selectedSize, this._selectedColor)
        : (Number(p.stock) || 0);
      const isOut = stock <= 0;
      const statusEl = $("detailStockStatus");
      const addBtn = $("detailAddToCartBtn");

      if (statusEl) {
        statusEl.innerHTML = isOut 
          ? `<span class="pill bad">Out of stock in ${Security.escapeHTML(this._selectedSize)} (${Security.escapeHTML(this._selectedColor)})</span>`
          : `<span class="pill ok">${stock} units available (${Security.escapeHTML(this._selectedSize)} · ${Security.escapeHTML(this._selectedColor)})</span>`;
      }
      if (addBtn) {
        addBtn.disabled = isOut;
        addBtn.style.opacity = isOut ? "0.5" : "1";
        addBtn.style.cursor = isOut ? "not-allowed" : "pointer";
      }
    }
  },

  addCurrentDetailToCart(id) {
    const p = this._currentProduct || products().find(x => x.id == id);
    const variants = p ? (p.variants || []) : [];
    const matched = variants.find(v => 
      (String(v.size).toLowerCase() === String(this._selectedSize).toLowerCase()) &&
      (String(v.color).toLowerCase() === String(this._selectedColor).toLowerCase())
    ) || variants.find(v => String(v.size).toLowerCase() === String(this._selectedSize).toLowerCase());

    this.addToCart(id, this._selectedSize, this._selectedColor, matched ? matched.id : null);
  },

  handleQuickAddToCart(id) {
    const p = products().find(x => x.id == id);
    if (!p) return;
    const colorList = (p.colors || "").split(",").map(c => c.trim()).filter(Boolean);
    const sizeList = (p.sizes || "").split(",").map(s => s.trim()).filter(Boolean);
    if (colorList.length > 1 || sizeList.length > 1 || p.cat === "Readymade") {
      toast("Please pick your preferred Size & Color ✨");
      this.openDetail(id);
    } else {
      const stock = typeof getProductSizeStock === "function" 
        ? getProductSizeStock(p, sizeList[0] || "Standard", colorList[0] || "Standard")
        : (Number(p.stock) || 0);
      if (stock <= 0) {
        toast(`Sorry, "${p.name}" is currently out of stock`);
        this.openDetail(id);
        return;
      }
      this.addToCart(id, sizeList[0] || "Standard", colorList[0] || "Standard");
    }
  },

  openFullImage(imgUrl, title = "Couture Design") {
    modal(`
      <div style="text-align:center">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid var(--ln)">
          <div style="text-align:left">
            <h3 style="font-size:1.15rem;margin:0;font-family:'Playfair Display',serif;color:var(--tx)">${Security.escapeHTML(title)}</h3>
            <small style="color:var(--mu);font-size:0.75rem">High-Resolution Atelier Photo</small>
          </div>
          <button class="btn s" onclick="closeM()" style="padding:4px 10px;font-size:0.75rem">✕ Close</button>
        </div>
        <div style="max-height:72vh;overflow:auto;border-radius:18px;background:color-mix(in srgb,var(--sf2) 80%,#000);padding:8px;display:flex;align-items:center;justify-content:center;box-shadow:inset 0 2px 8px rgba(0,0,0,0.1)">
          <img src="${imgUrl}" alt="${Security.escapeHTML(title)}" style="max-width:100%;max-height:68vh;object-fit:contain;border-radius:12px;box-shadow:0 12px 35px rgba(0,0,0,0.25)">
        </div>
        <p style="font-size:0.78rem;color:var(--mu);margin-top:10px">
          🔍 High-Resolution inspection of pure fabric weave, embroidery, and boutique detailing.
        </p>
      </div>
    `);
  },

  // ------------------------------------------
  // Cart & Coupon Application
  // ------------------------------------------
  addToCart(id, size = "", color = "", variantId = null) {
    const p = products().find(x => x.id == id);
    if (!p) return;

    const chosenSize = size || (p.sizes ? p.sizes.split(",")[0].trim() : "Standard");
    const chosenColor = color || (p.colors ? p.colors.split(",")[0].trim() : "Standard");
    const itemKey = `${id}_${chosenSize}_${chosenColor}`;

    const vars = Array.isArray(p.variants) && p.variants.length > 0 ? p.variants : null;
    let targetVariant = null;
    if (vars) {
      if (variantId) targetVariant = vars.find(v => v.id === variantId);
      if (!targetVariant) {
        targetVariant = vars.find(v => 
          String(v.size).toLowerCase() === String(chosenSize).toLowerCase() && 
          String(v.color).toLowerCase() === String(chosenColor).toLowerCase()
        ) || vars.find(v => String(v.size).toLowerCase() === String(chosenSize).toLowerCase()) || vars[0];
      }
    }

    const availableStock = typeof getProductSizeStock === "function" 
      ? getProductSizeStock(p, chosenSize, chosenColor) 
      : (targetVariant ? Number(targetVariant.stock) : (Number(p.stock) || 0));
    const existingInCart = S.cart.filter(c => (c.itemKey && c.itemKey === itemKey) || (c.id == id && c.size === chosenSize && c.color === chosenColor)).reduce((a, c) => a + c.q, 0);

    if (availableStock <= 0) {
      return toast(`Sorry, "${p.name}" (${chosenSize} · ${chosenColor}) is currently out of stock`);
    }
    if (existingInCart >= availableStock) {
      return toast(`Maximum stock of ${availableStock} reached for "${p.name}" (${chosenSize} · ${chosenColor})`);
    }

    const item = S.cart.find(c => (c.itemKey && c.itemKey === itemKey) || (c.id == id && c.size === chosenSize && c.color === chosenColor));
    if (item) {
      item.q++;
      if (targetVariant) item.variantId = targetVariant.id;
    } else {
      S.cart.push({
        id,
        variantId: targetVariant ? targetVariant.id : null,
        itemKey,
        n: p.name,
        p: p.price,
        q: 1,
        size: chosenSize,
        color: chosenColor,
        img: p.img || ""
      });
    }
    this.saveCart();
    toast(`Added "${p.name}" (${chosenSize} · ${chosenColor}) to cart 🛒`);
  },

  saveCart() {
    saveLS("cart", S.cart);
    const cc = $("cc");
    if (cc) cc.textContent = S.cart.reduce((a, c) => a + c.q, 0);
  },

  openCart(show = true) {
    const d = $("dr");
    if (!d) return;
    if (!show) {
      d.classList.remove("on");
      if (document.body) document.body.classList.remove("cart-open");
      return;
    }
    const w = $("wdr");
    if (w) {
      w.classList.remove("on");
      if (document.body) document.body.classList.remove("wishlist-open");
    }
    d.classList.add("on");
    if (document.body) document.body.classList.add("cart-open");

    const subtotal = S.cart.reduce((a, c) => a + c.p * c.q, 0);
    let discount = 0;
    if (S.appliedCoupon) {
      const valRes = validateCoupon(S.appliedCoupon.code, subtotal);
      if (valRes.valid) {
        discount = valRes.discount;
        S.appliedCoupon.discount = discount;
      } else {
        S.appliedCoupon = null;
      }
    }
    const finalTotal = Math.max(0, subtotal - discount);

    d.innerHTML = `
      <button class="x" onclick="Customer.openCart(false)">×</button>
      <h2 style="color:var(--br)">Your Cart</h2>
      ${S.cart.map((c, i) => `
        <div class="line" style="align-items:flex-start">
          <div style="flex:1">
            <b>${E(c.n)}</b>
            <div style="font-size:0.75rem;color:var(--mu);margin:2px 0 4px">
              ${c.size ? `<span>📏 Size: <b style="color:var(--tx)">${E(c.size)}</b></span>` : ''}
              ${c.size && c.color ? ` &nbsp;|&nbsp; ` : ''}
              ${c.color ? `<span>🎨 Color: <b style="color:var(--tx)">${E(c.color)}</b></span>` : ''}
            </div>
            <small style="color:var(--mu)">${R(c.p)} each</small>
          </div>
          <span style="display:flex;align-items:center;gap:6px">
            <button class="btn s" onclick="Customer.updateCartQty(${i},-1)">−</button>
            <b>${c.q}</b>
            <button class="btn s" onclick="Customer.updateCartQty(${i},1)">+</button>
          </span>
        </div>
      `).join("") || "<p style='color:var(--mu);margin:20px 0'>Your cart is currently empty.</p>"}

      ${S.cart.length ? `
        <!-- Coupon Box -->
        <div class="cart-coupon-box">
          <label style="color:var(--br);font-weight:700">🎟️ Have a Promo / Coupon Code?</label>
          <div style="display:flex;gap:6px;margin-top:4px">
            <input id="cartCouponInput" placeholder="Enter promo coupon code" value="${S.appliedCoupon ? E(S.appliedCoupon.code) : ''}" style="margin:0;text-transform:uppercase">
            <button class="btn s p" onclick="Customer.applyCoupon()">Apply</button>
          </div>
          ${S.appliedCoupon ? `
            <div class="coupon-applied-badge">
              <span>✅ Code '${E(S.appliedCoupon.code)}' applied: Saved ${R(discount)}!</span>
              <button class="btn s d" style="padding:2px 8px;font-size:0.75rem" onclick="Customer.removeCoupon()">Remove</button>
            </div>
          ` : ""}
        </div>

        <div style="margin:14px 0;font-size:0.95rem">
          <div style="display:flex;justify-content:space-between">
            <span>Subtotal:</span> <b>${R(subtotal)}</b>
          </div>
          ${discount ? `
            <div style="display:flex;justify-content:space-between;color:var(--ok)">
              <span>Coupon Discount:</span> <b>-${R(discount)}</b>
            </div>
          ` : ""}
          <div style="display:flex;justify-content:space-between;font-size:1.2rem;margin-top:6px;color:var(--br)">
            <span>Grand Total:</span> <b>${R(finalTotal)}</b>
          </div>
        </div>

        <label>Your Full Name</label><input id="cn" placeholder="Customer name">
        <label>Mobile Number (10 Digits)</label><input id="cp" type="tel" inputmode="numeric" placeholder="98XXXXXXXX">
        <label>Delivery Address</label>
        <textarea id="ca" rows="2" placeholder="House no, Street, Landmark..."></textarea>
        <input id="camaplink" type="hidden">
        <div class="map-actions-row">
          <button type="button" class="map-action-btn" onclick="Customer.detectCurrentLocation('ca', 'camaplink')">
            📍 Detect My Current Location
          </button>
          <button type="button" class="map-action-btn" onclick="Customer.openMapLocationPicker('ca', 'camaplink')">
            🗺️ Pin on Google Maps
          </button>
        </div>
        
        <label>Payment Method</label>
        <div class="tabs" style="justify-content:flex-start" id="cpm">
          ${PAY_MODES.slice(0, 3).map((m, i) => `<span class="chip ${i === 0 ? "on" : ""}" onclick="Customer.selectPaymentMethod(this)">${m}</span>`).join("")}
        </div>
        <p style="font-size:0.78rem;color:var(--mu);margin-bottom:12px">
          UPI provides instant QR code scan & opens installed UPI apps.
        </p>
        <button class="btn p" style="width:100%" onclick="Customer.checkout()">Proceed & Place Order</button>
      ` : `<p style='color:var(--mu)'>Explore our materials & readymade collection to add items.</p>`}
    `;
  },

  updateCartQty(i, d) {
    if (!S.cart || !S.cart[i]) return;
    const item = S.cart[i];
    if (d > 0) {
      const pr = products().find(p => String(p.id) === String(item.id));
      if (pr) {
        const availableStock = typeof getProductSizeStock === "function" 
          ? getProductSizeStock(pr, item.size, item.color) 
          : (Number(pr.stock) || 0);
        if (item.q + d > availableStock) {
          const szLabel = item.size ? ` (${item.size})` : "";
          return toast(`Maximum stock of ${availableStock} reached for "${item.n}"${szLabel}`);
        }
      }
    }
    item.q += d;
    if (item.q < 1) S.cart.splice(i, 1);
    this.saveCart();
    this.openCart(true);
  },

  applyCoupon() {
    const input = $("cartCouponInput");
    if (!input) return;
    const code = input.value.trim();
    const subtotal = S.cart.reduce((a, c) => a + c.p * c.q, 0);
    const res = validateCoupon(code, subtotal);
    if (!res.valid) {
      return toast(res.message);
    }
    S.appliedCoupon = { code: res.coupon.code, discount: res.discount, type: res.coupon.type, val: res.coupon.val };
    toast(res.message);
    this.openCart(true);
  },

  removeCoupon() {
    S.appliedCoupon = null;
    toast("Coupon removed");
    this.openCart(true);
  },

  selectPaymentMethod(el) {
    [...el.parentNode.children].forEach(c => c.classList.remove("on"));
    el.classList.add("on");
  },

  getPaymentMethodValue() {
    const el = [...document.querySelectorAll("#cpm .chip")].find(c => c.classList.contains("on"));
    return el ? el.textContent : "UPI";
  },

  checkout() {
    const n = $("cn").value.trim();
    const p = np($("cp").value);
    const a = $("ca").value.trim();

    if (!n || p.length < 10 || !a) {
      return toast("Please enter Name, 10-digit Phone, and Delivery Address");
    }

    if (!S.cart || !S.cart.length) {
      return toast("Your shopping bag is empty");
    }

    // Server-side / backend atomic variant stock validation & reservation check
    if (typeof validateAndDeductStock === "function") {
      const stockCheck = validateAndDeductStock(S.cart);
      if (!stockCheck.valid) {
        return toast(`⚠️ ${stockCheck.message}`);
      }
    }

    const subtotal = S.cart.reduce((x, c) => x + c.p * c.q, 0);
    const discount = S.appliedCoupon ? S.appliedCoupon.discount : 0;
    const total = Math.max(0, subtotal - discount);
    const pay = this.getPaymentMethodValue();

    const mapsUrl = ($("camaplink") ? $("camaplink").value : "") || `https://www.google.com/maps?q=${encodeURIComponent(a)}`;

    placeOrder({
      type: "Shop",
      customer: n,
      phone: p,
      address: a,
      mapsUrl: mapsUrl,
      items: S.cart.map(c => ({
        id: c.id,
        variantId: c.variantId || null,
        n: c.n,
        q: c.q,
        p: c.p,
        size: c.size || "",
        color: c.color || ""
      })),
      total,
      pay
    }).then(o => {
      if (!o) return;

      // If validateAndDeductStock was not available, fallback to legacy deduction
      if (typeof validateAndDeductStock !== "function") {
        S.cart.forEach(c => {
          const pr = products().find(x => x.id == c.id);
          if (pr && pr.stock > 0) {
            upd("products", pr.id, { stock: Math.max(0, pr.stock - c.q) });
          }
        });
      }

      S.cart = [];
      S.appliedCoupon = null;
      this.saveCart();
      this.openCart(false);
      this.showOrderConfirmation(o);
      if (pay === "UPI") setTimeout(() => Customer.showPayModal(o), 500);
    });
  },

  // ------------------------------------------
  // Customer Wishlist Controller
  // ------------------------------------------
  isInWishlist(id) {
    if (!Array.isArray(S.wishlist)) S.wishlist = [];
    return S.wishlist.some(item => (typeof item === "object" ? String(item.id) : String(item)) === String(id));
  },

  toggleWishlist(id, event) {
    if (event) {
      if (typeof event.stopPropagation === "function") event.stopPropagation();
      if (typeof event.preventDefault === "function") event.preventDefault();
    }
    if (!Array.isArray(S.wishlist)) S.wishlist = [];
    const p = products().find(x => String(x.id) === String(id));
    if (!p) return;

    const existingIndex = S.wishlist.findIndex(item => (typeof item === "object" ? String(item.id) : String(item)) === String(id));

    if (existingIndex > -1) {
      S.wishlist.splice(existingIndex, 1);
      toast(`Removed "${p.name}" from your wishlist 🤍`);
    } else {
      S.wishlist.unshift({
        id: p.id,
        addedAt: Date.now()
      });
      toast(`Saved "${p.name}" to your wishlist! 💖`);
    }

    this.saveWishlist();
    this.updateWishlistUI();

    // If wishlist drawer is open, re-render it
    const wdr = $("wdr");
    if (wdr && wdr.classList.contains("on")) {
      this.openWishlist(true);
    }
  },

  saveWishlist() {
    if (!Array.isArray(S.wishlist)) S.wishlist = [];
    saveLS("wishlist", S.wishlist);
    const count = S.wishlist.length;
    const wc = $("wc");
    if (wc) wc.textContent = count;
    const mobWc = $("mobWc");
    if (mobWc) mobWc.textContent = count;
  },

  updateWishlistUI() {
    // Update all floating heart buttons on page
    document.querySelectorAll(".card-wishlist-btn").forEach(btn => {
      const pid = btn.getAttribute("data-id");
      if (pid) {
        const active = this.isInWishlist(pid);
        btn.classList.toggle("active", active);
        btn.title = active ? "Remove from Wishlist" : "Save to Wishlist";
        const icon = btn.querySelector(".heart-icon");
        if (icon) icon.textContent = active ? "💖" : "🤍";
      }
    });

    // Update detail modal button if open
    const detailBtn = $("detailWishlistBtn");
    if (detailBtn) {
      const pid = detailBtn.getAttribute("data-id");
      if (pid) {
        const active = this.isInWishlist(pid);
        detailBtn.classList.toggle("active", active);
        detailBtn.innerHTML = active ? "💖 Saved in Wishlist" : "🤍 Save to Wishlist";
      }
    }
  },

  openWishlist(show = true) {
    const w = $("wdr");
    if (!w) return;
    if (!show) {
      w.classList.remove("on");
      if (document.body) document.body.classList.remove("wishlist-open");
      return;
    }

    // Close cart drawer if open
    const d = $("dr");
    if (d) {
      d.classList.remove("on");
      if (document.body) document.body.classList.remove("cart-open");
    }

    w.classList.add("on");
    if (document.body) document.body.classList.add("wishlist-open");

    const allProds = products();
    const items = S.wishlist.map(wItem => {
      const id = typeof wItem === "object" ? wItem.id : wItem;
      const prod = allProds.find(p => String(p.id) === String(id));
      return prod ? { ...prod, addedAt: wItem.addedAt } : null;
    }).filter(Boolean);

    w.innerHTML = `
      <button class="x" onclick="Customer.openWishlist(false)" title="Close Wishlist">×</button>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
        <span style="font-size:1.6rem">💖</span>
        <div>
          <h2 style="color:var(--br);margin:0;font-size:1.4rem">Saved Wishlist</h2>
          <small style="color:var(--mu)">${items.length} ${items.length === 1 ? 'handcrafted piece' : 'handcrafted pieces'}</small>
        </div>
      </div>
      <hr style="border:none;border-bottom:1px solid var(--ln);margin:12px 0 16px">

      ${!items.length ? `
        <div class="wishlist-empty-state">
          <div class="wishlist-empty-icon">✨👗</div>
          <h3 style="color:var(--br);margin:10px 0 6px">Your wishlist is empty</h3>
          <p style="color:var(--mu);font-size:0.86rem;line-height:1.5;max-width:290px;margin:0 auto 20px">
            Explore our curated fabrics, designer suits, and handcrafted ensembles. Tap the heart 🤍 on any piece to save it here!
          </p>
          <button class="btn p s" onclick="Customer.openWishlist(false); const s=$('shop'); if(s) s.scrollIntoView({behavior:'smooth'})">
            👗 Explore Boutique Catalogue
          </button>
        </div>
      ` : `
        <div class="wishlist-items-list">
          ${items.map(p => {
            const isOut = (Number(p.stock) || 0) <= 0;
            return `
              <div class="wishlist-item-card" id="witem_${p.id}">
                <div class="wishlist-item-thumb" onclick="Customer.openWishlist(false); Customer.openDetail('${p.id}')" title="Click to view full details">
                  ${p.img ? `<img src="${p.img}" alt="${E(p.name)}" loading="lazy">` : `<span style="font-size:1.8rem">${p.em || "👗"}</span>`}
                </div>
                <div class="wishlist-item-info">
                  <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:6px">
                    <span class="tag" style="font-size:0.65rem;padding:2px 7px">${E(p.cat)}</span>
                    <button class="wishlist-remove-btn" onclick="Customer.toggleWishlist('${p.id}', event)" title="Remove item from wishlist" aria-label="Remove">
                      ✕
                    </button>
                  </div>
                  <h4 class="wishlist-item-title" onclick="Customer.openWishlist(false); Customer.openDetail('${p.id}')">
                    ${E(p.name)}
                  </h4>
                  <small style="color:var(--mu);font-size:0.75rem">${E(p.fabric || 'Pure Fabric')}</small>
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px">
                    <b style="color:var(--br);font-size:0.98rem">${R(p.price)}</b>
                    <span style="font-size:0.75rem;font-weight:600;color:${isOut ? 'var(--bad)' : 'var(--ok)'}">
                      ${isOut ? '· Sold out' : '· In stock'}
                    </span>
                  </div>
                  <div style="margin-top:8px;display:flex;gap:6px">
                    <button class="btn s p" style="flex:1;padding:6px 10px;font-size:0.78rem" 
                      ${isOut ? "disabled style='opacity:0.5;cursor:not-allowed'" : ""} 
                      onclick="Customer.moveWishlistToCart('${p.id}')">
                      🛒 Add to Cart
                    </button>
                    <button class="btn s" style="padding:6px 10px;font-size:0.78rem" 
                      onclick="Customer.openWishlist(false); Customer.openDetail('${p.id}')">
                      Details
                    </button>
                  </div>
                </div>
              </div>
            `;
          }).join("")}
        </div>

        <div class="wishlist-footer-actions">
          <button class="btn p" style="width:100%;margin-bottom:8px" onclick="Customer.moveAllWishlistToCart()">
            🛍️ Move All In-Stock to Cart
          </button>
          <button class="btn s" style="width:100%;color:var(--mu)" onclick="Customer.clearWishlist()">
            Clear Wishlist
          </button>
        </div>
      `}
    `;
  },

  moveWishlistToCart(productId) {
    const p = products().find(x => String(x.id) === String(productId));
    if (!p) return;
    if ((Number(p.stock) || 0) <= 0) {
      return toast("This item is currently sold out 😔");
    }

    const colorList = (p.colors || "").split(",").map(c => c.trim()).filter(Boolean);
    const sizeList = (p.sizes || "").split(",").map(s => s.trim()).filter(Boolean);
    if (colorList.length > 1 || sizeList.length > 1 || p.cat === "Readymade") {
      this.openWishlist(false);
      this.openDetail(productId);
      toast("Please pick your size & shade to add to cart 📏");
      return;
    }

    this.addToCart(productId, sizeList[0] || "Standard", colorList[0] || "Standard");
    const idx = S.wishlist.findIndex(item => (typeof item === "object" ? String(item.id) : String(item)) === String(productId));
    if (idx > -1) {
      S.wishlist.splice(idx, 1);
      this.saveWishlist();
      this.updateWishlistUI();
    }

    this.openWishlist(false);
    this.openCart(true);
    toast(`Moved "${p.name}" to your cart! 🛍️`);
  },

  moveAllWishlistToCart() {
    const allProds = products();
    let movedCount = 0;
    const remainingWishlist = [];

    S.wishlist.forEach(wItem => {
      const id = typeof wItem === "object" ? wItem.id : wItem;
      const p = allProds.find(x => String(x.id) === String(id));
      if (!p || (Number(p.stock) || 0) <= 0) {
        remainingWishlist.push(wItem);
        return;
      }

      const colorList = (p.colors || "").split(",").map(c => c.trim()).filter(Boolean);
      const sizeList = (p.sizes || "").split(",").map(s => s.trim()).filter(Boolean);
      const chosenColor = colorList[0] || "Standard";
      const chosenSize = sizeList[0] || "Standard";

      const existing = S.cart.find(c => String(c.id) === String(p.id) && c.size === chosenSize && c.color === chosenColor);
      if (existing) {
        existing.q += 1;
      } else {
        S.cart.push({
          id: p.id,
          n: p.name,
          p: p.price,
          q: 1,
          size: chosenSize,
          color: chosenColor,
          variantId: null
        });
      }
      movedCount++;
    });

    if (movedCount > 0) {
      S.wishlist = remainingWishlist;
      this.saveWishlist();
      this.saveCart();
      this.updateWishlistUI();
      this.openWishlist(false);
      this.openCart(true);
      toast(`Moved ${movedCount} item(s) to your cart! 🛍️`);
    } else {
      toast("No in-stock items available to move right now.");
    }
  },

  clearWishlist() {
    if (!S.wishlist.length) return;
    if (confirm("Are you sure you want to clear your saved wishlist?")) {
      S.wishlist = [];
      this.saveWishlist();
      this.updateWishlistUI();
      this.openWishlist(true);
      toast("Wishlist cleared 🤍");
    }
  },

  // ------------------------------------------
  // Live Order Tracking with Tailor Stitches Animation
  // ------------------------------------------
  trackOrder(skipAnimation = false) {
    const tkInput = $("tk");
    const tpInput = $("tp");
    const no = tkInput ? tkInput.value.trim().toUpperCase() : "";
    const p = tpInput ? np(tpInput.value) : "";
    const resBox = $("tres");
    if (!resBox) return;

    if (!no) {
      toast("Please enter your Order ID (e.g. SD4K9XQ) 📋");
      if (tkInput) tkInput.focus();
      return;
    }
    if (p.length < 10) {
      toast("Please enter your 10-digit registered mobile number 📱");
      if (tpInput) tpInput.focus();
      return;
    }

    const o = orders().find(x => (x.no && x.no.toUpperCase() === no) && np(x.phone) === p);

    if (!o) {
      resBox.innerHTML = `
        <div class="couture-tracking-card" style="text-align:center;padding:28px 20px;border-color:color-mix(in srgb,var(--bad) 35%,var(--ln))">
          <div style="font-size:2.4rem;margin-bottom:10px">🔍🧵</div>
          <h3 style="color:var(--bad);margin:0 0 6px">No Order Found</h3>
          <p style="color:var(--mu);font-size:0.9rem;max-width:440px;margin:0 auto 16px;line-height:1.4">
            We couldn't find an active order matching ID <b>"${Security.escapeHTML(no)}"</b> and phone <b>"${Security.escapeHTML(p)}"</b>.
          </p>
          <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
            <button class="btn s" onclick="if($('tk')){$('tk').value='';$('tk').focus();}">Try Another Order ID</button>
            <a class="btn s g" href="https://wa.me/${typeof getIntlPhone === 'function' ? getIntlPhone(S.cfg.shopPhone) : S.cfg.shopPhone}?text=${encodeURIComponent('Hello Saifa Designs, could you please help me find my order status for Order ' + no + '?')}" target="_blank" rel="noopener">
              💬 Ask Atelier on WhatsApp
            </a>
          </div>
        </div>
      `;
      return;
    }

    // Interactive tailor cloth sewing animation sequence
    if (!skipAnimation) {
      const submitBtn = document.querySelector("#track .track button, #track .track-submit-btn");
      const originalBtnText = submitBtn ? submitBtn.innerHTML : "Check Live Status";
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '🪡 <span>Sewing Status...</span>';
      }

      resBox.innerHTML = `
        <div class="tailor-stitching-stage">
          <div class="cloth-fabric-patch">
            <div class="chalk-guide-line"></div>
            <svg class="stitching-svg-track" viewBox="0 0 460 70" preserveAspectRatio="none">
              <path d="M 20 35 L 440 35" class="animated-seam-thread" />
            </svg>
            <div class="tailor-needle-cursor">
              <div class="silver-needle">
                <div class="needle-eye-loop"></div>
                <div class="golden-thread-tail"></div>
              </div>
            </div>
          </div>
          <div class="stitching-status-caption">
            <span class="stitching-spinner-icon">🧵</span>
            <span id="stitchingMsgText">Tracing Master atelier stitching seams &amp; progress...</span>
          </div>
        </div>
      `;

      setTimeout(() => {
        const msgEl = $("stitchingMsgText");
        if (msgEl) msgEl.innerHTML = "🪡 Inspecting artisan hand detailing &amp; measurements fit...";
      }, 420);

      setTimeout(() => {
        const msgEl = $("stitchingMsgText");
        if (msgEl) msgEl.innerHTML = "✨ Master quality verification confirmed!";
      }, 880);

      setTimeout(() => {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnText;
        }
        this.renderTrackingResult(o);
      }, 1300);
    } else {
      this.renderTrackingResult(o);
    }
  },

  renderTrackingResult(o) {
    const resBox = $("tres");
    if (!resBox) return;

    this._lastTrackedOrderNo = o.no;

    const assignedWorker = workers().find(w => w.id == o.worker);
    const isStitch = o.type === "Stitch";
    const curStageIdx = WORK_PROGRESS_STAGES.indexOf(o.stage || "Cutting & Pattern Drafting");
    const isReady = o.status === "Ready";
    const isDelivered = o.status === "Delivered";
    const isCancelled = o.status === "Cancelled";

    resBox.innerHTML = `
      <div class="couture-tracking-card">
        <!-- Decorative golden running stitch seam -->
        <div class="couture-card-seam"></div>

        <!-- Header Row -->
        <div class="couture-header-row">
          <div>
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
              <span class="eyebrow" style="margin:0;font-size:0.65rem;padding:3px 9px">⚜️ SAIFA ATELIER · LIVE TRACKING</span>
              <span class="live" style="font-size:0.7rem;font-weight:700">LIVE SYNC</span>
            </div>
            <h2 style="font-size:1.4rem;margin:0 0 4px;font-family:'Playfair Display',serif;color:var(--tx)">
              👗 ${Security.escapeHTML(o.garment || (o.items && o.items.map(i=>i.n).join(', ')) || "Custom Tailoring")}
            </h2>
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
              <span class="couture-order-id-badge">
                #${Security.escapeHTML(o.no)}
                <button class="copy-id-btn" onclick="navigator.clipboard.writeText('${Security.escapeHTML(o.no)}');toast('Order ID copied! 📋')" title="Copy Order ID">📋 Copy</button>
              </span>
              <span style="font-size:0.82rem;color:var(--mu)">Client: <b>${Security.escapeHTML(o.customer)}</b></span>
            </div>
          </div>

          <div style="text-align:right">
            <div>
              ${isCancelled ? `
                <span class="pill bad" style="font-size:0.82rem;padding:5px 12px">✕ Cancelled</span>
              ` : isDelivered ? `
                <span class="pill ok" style="font-size:0.82rem;padding:5px 12px">✓ Delivered &amp; Completed</span>
              ` : isReady ? `
                <span class="pill ok" style="font-size:0.82rem;padding:5px 12px;font-weight:700">🎉 Ready for Trial &amp; Pickup</span>
              ` : `
                <span class="pill w" style="font-size:0.82rem;padding:5px 12px;font-weight:700">🧵 Handcrafting in Atelier</span>
              `}
            </div>
            ${o.due ? `
              <div style="margin-top:6px">
                <span class="pill" style="font-size:0.74rem;background:var(--sf2);color:var(--tx)">
                  📅 Due: <b>${Security.escapeHTML(o.due)}</b>
                </span>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- 6-Stage Tailor Stepper Journey -->
        ${isStitch ? `
          <div style="margin:18px 0 14px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
              <b style="font-size:0.86rem;color:var(--br)">🪡 Bespoke Couture Crafting Milestones:</b>
              <span class="pill ok" style="font-size:0.74rem">
                ${isReady ? 'Ready for Fitting' : Security.escapeHTML(o.stage || "Cutting & Pattern Drafting")}
              </span>
            </div>

            <div class="couture-stepper-track">
              ${WORK_PROGRESS_STAGES.map((st, sIdx) => {
                const isPast = sIdx < curStageIdx;
                const isCurr = sIdx === curStageIdx && !isDelivered && !isCancelled;
                return `
                  <div class="couture-step-item ${isPast ? 'completed' : (isCurr ? 'active' : '')}">
                    <div class="couture-step-icon">
                      ${isPast ? '✓' : (isCurr ? '🪡' : (sIdx + 1))}
                    </div>
                    <div class="couture-step-label">
                      ${Security.escapeHTML(st)}
                    </div>
                  </div>
                `;
              }).join("")}
            </div>

            ${(o.stageNote || o.workerNote) ? `
              <div style="font-size:0.82rem;background:color-mix(in srgb,var(--br) 6%,var(--sf2));padding:10px 14px;border-radius:12px;margin-top:10px;border-left:3px solid var(--br)">
                📝 <b>Artisan Note:</b> <i>"${Security.escapeHTML(o.stageNote || o.workerNote)}"</i>
              </div>
            ` : ''}
          </div>
        ` : `
          <!-- Shop readymade order timeline -->
          <div class="tl" style="margin:16px 0">
            ${ST.filter(s => s !== "Cancelled").map((s, i) => {
              const cur = ST.indexOf(o.status);
              return `<div class="${i <= cur ? "done" : ""}"><i></i>${s}</div>`;
            }).join("")}
          </div>
        `}

        <!-- Assigned Artisan Attribution & Quality Badge -->
        <div class="artisan-attribution-card">
          <div class="artisan-profile-group">
            <div class="artisan-avatar-sm" style="background:var(--sf2);display:flex;align-items:center;justify-content:center;font-size:1.1rem">
              ${assignedWorker && assignedWorker.img ? `<img src="${Security.escapeHTML(assignedWorker.img)}" style="width:100%;height:100%;object-fit:cover">` : (assignedWorker ? '🧵' : '⏳')}
            </div>
            <div>
              <span style="font-size:0.74rem;color:var(--mu);text-transform:uppercase;letter-spacing:0.04em;display:block">Assigned Artisan</span>
              <b style="font-size:0.92rem;color:var(--tx)">${assignedWorker ? Security.escapeHTML(assignedWorker.name) : "Awaiting Artisan Allocation"}</b>
              <small style="color:${assignedWorker ? 'var(--gd)' : 'var(--mu)'};font-weight:600;display:block">${assignedWorker ? Security.escapeHTML(assignedWorker.role) : "Atelier Master Queue"}</small>
            </div>
          </div>
          <div>
            ${assignedWorker ? (o.workerVerified === true ? `
              <span class="pill ok" style="font-size:0.75rem;padding:4px 10px">✓ Master Quality Verified</span>
            ` : `
              <span class="pill w" style="font-size:0.75rem;padding:4px 10px">🔍 In Active Tailoring</span>
            `) : `
              <span class="pill" style="font-size:0.75rem;padding:4px 10px;background:var(--sf2);color:var(--mu)">⏳ In Allocation Queue</span>
            `}
          </div>
        </div>

        <!-- Ordered Items Summary with Size & Color -->
        ${Array.isArray(o.items) && o.items.length > 0 ? `
          <div style="background:var(--sf2);border:1px solid var(--ln);border-radius:14px;padding:12px 14px;margin:14px 0">
            <div style="font-size:0.82rem;font-weight:700;color:var(--br);margin-bottom:8px">🛍️ Selected Items &amp; Specifications:</div>
            <div style="display:flex;flex-direction:column;gap:8px">
              ${o.items.map(it => `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px dashed var(--ln);font-size:0.84rem">
                  <div>
                    <b>${Security.escapeHTML(it.n)}</b>
                    <div style="font-size:0.74rem;color:var(--mu);margin-top:2px">
                      ${it.size ? `<span>📏 Size: <b style="color:var(--tx)">${Security.escapeHTML(it.size)}</b></span>` : ''}
                      ${it.size && it.color ? ` &nbsp;|&nbsp; ` : ''}
                      ${it.color ? `<span>🎨 Color: <b style="color:var(--tx)">${Security.escapeHTML(it.color)}</b></span>` : ''}
                    </div>
                  </div>
                  <div style="text-align:right">
                    <b>${it.q} × ${R(it.p)}</b>
                  </div>
                </div>
              `).join("")}
            </div>
          </div>
        ` : ''}

        <!-- Specs Snapshot: Fabric, Pricing, Measurements & Delivery -->
        <div class="order-specs-box">
          <div>
            <span style="color:var(--mu);font-size:0.72rem;display:block;text-transform:uppercase">Fabric &amp; Material</span>
            <b>${Security.escapeHTML(o.fabric || "Client's Own Fabric")}</b>
          </div>
          <div>
            <span style="color:var(--mu);font-size:0.72rem;display:block;text-transform:uppercase">Payment Status</span>
            <b style="color:${o.paid === 'Paid' ? 'var(--ok)' : 'var(--warn)'}">${Security.escapeHTML(o.paid)}</b> (${R(o.total)} via ${Security.escapeHTML(o.pay || 'UPI')})
          </div>
          ${isStitch && o.measure ? `
            <div>
              <span style="color:var(--mu);font-size:0.72rem;display:block;text-transform:uppercase">Fitting Fit Specs</span>
              <button class="btn s" onclick="Customer.showMeasurementsModal('${o.id}')" style="padding:3px 10px;font-size:0.74rem;margin-top:2px">
                📏 View Measurements
              </button>
            </div>
          ` : ''}
          ${o.address ? `
            <div>
              <span style="color:var(--mu);font-size:0.72rem;display:block;text-transform:uppercase">Destination / Trial</span>
              <span style="font-weight:600;font-size:0.82rem">${Security.escapeHTML(o.address)}</span>
            </div>
          ` : ''}
        </div>

        ${o.mapsUrl ? `
          <div style="margin:8px 0 12px;font-size:0.82rem">
            <a href="${Security.escapeHTML(o.mapsUrl)}" target="_blank" rel="noopener" style="color:var(--br);text-decoration:none;font-weight:600;display:inline-flex;align-items:center;gap:4px">
              📍 Open Delivery / Fitting Map Pin on Google Maps ➔
            </a>
          </div>
        ` : ''}

        ${isReady ? `
          <div style="background:color-mix(in srgb,var(--ok) 12%,var(--sf));border:1px solid var(--ok);border-radius:12px;padding:12px 14px;margin:12px 0;font-size:0.86rem;color:var(--tx)">
            🎉 <b>Your Outfit is Ready!</b> Please visit our boutique for your trial fitting, or reply on WhatsApp for courier dispatch.
          </div>
        ` : ''}

        <!-- Action Buttons Row -->
        <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap">
          <button class="btn s p" onclick="printInvoice('${o.id}')" style="flex:1">
            🧾 Official Receipt &amp; Specs
          </button>
          <a class="btn s g" href="${getAdminWhatsAppOrderLink(o)}" target="_blank" rel="noopener" style="flex:1">
            💬 WhatsApp Boutique Team
          </a>
          <button class="btn s" onclick="Customer.trackOrder(false)" title="Re-check live status with tailor animation">
            🔄 Refresh Status
          </button>
        </div>
      </div>
    `;

    resBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
  },

  showMeasurementsModal(orderId) {
    const o = orders().find(x => x.id == orderId);
    if (!o) return;
    const m = o.measure || {};

    modal(`
      <div style="text-align:left;padding:12px 6px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;border-bottom:1px solid var(--ln);padding-bottom:8px">
          <div>
            <h2 style="color:var(--br);margin:0;font-size:1.25rem">📏 Bespoke Fitting Specifications</h2>
            <small style="color:var(--mu)">Order #${Security.escapeHTML(o.no)} · ${Security.escapeHTML(o.customer)}</small>
          </div>
          <button class="btn s" onclick="closeM()">✕</button>
        </div>

        <div class="meas" style="margin:16px 0;gap:8px">
          ${(() => {
            const keys = Array.from(new Set([...(typeof getMeasurements === "function" ? getMeasurements() : MEAS), ...Object.keys(m)]));
            return keys.map(k => `
              <div style="background:var(--sf2);padding:10px 12px;border-radius:10px;border:1px solid var(--ln)">
                <small style="color:var(--mu);display:block;font-size:0.72rem;text-transform:uppercase;letter-spacing:0.04em">${k}</small>
                <b style="font-size:1.1rem;color:var(--tx)">${Security.escapeHTML(m[k] && m[k] !== '-' ? m[k] + '"' : '-')}</b>
              </div>
            `).join("");
          })()}
        </div>

        ${o.note ? `<div style="font-size:0.84rem;color:var(--tx);background:color-mix(in srgb,var(--br) 6%,var(--sf));padding:10px 14px;border-radius:10px;margin-bottom:14px">📝 <b>Special Styling Note:</b> <i>"${Security.escapeHTML(o.note)}"</i></div>` : ''}

        <button class="btn p" style="width:100%" onclick="closeM()">Done</button>
      </div>
    `);
  },

  checkUrlForTracking() {
    const hash = window.location.hash;
    if (hash && hash.includes("track?id=")) {
      const params = new URLSearchParams(hash.split("?")[1]);
      const id = params.get("id");
      const phone = params.get("phone");
      if (id && $("tk")) $("tk").value = id;
      if (phone && $("tp")) $("tp").value = phone;
      if (id && phone) this.trackOrder();
    }
  },

  // ------------------------------------------
  // AI Fashion Stylist Integration
  // ------------------------------------------
  async askStylist() {
    const q = $("aq").value.trim();
    if (!q) return toast("Please enter your outfit style requirement");
    const el = $("ao");
    el.style.display = "block";
    el.textContent = "Consulting SAIFA AI stylist...";
    const advice = await AI.getStylingAdvice(q);
    el.textContent = advice;
  },

  async askStylistForProduct(id) {
    const p = products().find(x => x.id == id);
    const el = $("pai");
    el.style.display = "block";
    el.textContent = "Finding ideal pairings and accessories...";
    const advice = await AI.getStylingAdvice(`Occasion wear styling for ${p.name} in ${p.colors}`);
    el.textContent = advice;
  },

  // ------------------------------------------
  // Front Page Initialization
  // ------------------------------------------
  renderTeam() {
    const tmg = $("tmg");
    const teamSec = $("team");
    if (!tmg) return;
    const members = team();
    if (!members || members.length === 0) {
      if (teamSec) teamSec.style.display = "none";
      tmg.innerHTML = "";
      return;
    }
    if (teamSec) teamSec.style.display = "";
    tmg.innerHTML = members.map(t => `
      <div class="team-card">
        <div class="team-card-inner">
          <div class="team-avatar-wrap">
            <div class="team-avatar-frame">
              ${t.img 
                ? `<img src="${Security.escapeHTML(t.img)}" alt="${Security.escapeHTML(t.name)}" loading="lazy">` 
                : `<div class="team-avatar-emoji">${t.em ? Security.escapeHTML(t.em) : "🧑‍💼"}</div>`}
            </div>
            <div class="team-badge" title="Verified Saifa Designs In-House Artisan">
              <span>🧵 Master Artisan</span>
            </div>
          </div>
          <div class="team-info">
            <h3 class="team-name">${Security.escapeHTML(t.name)}</h3>
            <div class="team-role-pill">
              <span>${Security.escapeHTML(t.role)}</span>
            </div>
            <p class="team-bio">${Security.escapeHTML(t.bio)}</p>
            <div class="team-card-footer">
              <span class="team-atelier-tag">✨ Saifa Designs Atelier</span>
            </div>
          </div>
        </div>
      </div>
    `).join("");
  },

  // ------------------------------------------
  // Tailoring-Themed Splash Screen Controller
  // ------------------------------------------
  initSplashScreen() {
    const splash = $("atelierSplashScreen");
    if (!splash) return;

    // Exclusively show on main homepage
    const path = (window.location.pathname || "").toLowerCase();
    const isOtherPage = path.includes("product.html") || path.includes("readymade.html");
    if (isOtherPage) {
      splash.style.display = "none";
      return;
    }

    // Respect user reduced-motion preferences
    const prefersReducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      splash.style.display = "none";
      return;
    }

    // Only display on the first visit in this browsing session
    try {
      if (sessionStorage.getItem("saifa_splash_shown")) {
        splash.style.display = "none";
        return;
      }
      sessionStorage.setItem("saifa_splash_shown", "1");
    } catch (e) {}

    splash.style.display = "flex";
    if (document.body) document.body.classList.add("splash-active");

    // Auto-dismiss after 4 seconds (approx 4–5s total with 0.55s smooth exit animation)
    this._splashTimer = setTimeout(() => {
      this.dismissSplashScreen();
    }, 4000);
  },

  dismissSplashScreen() {
    if (this._splashTimer) {
      clearTimeout(this._splashTimer);
      this._splashTimer = null;
    }
    const splash = $("atelierSplashScreen");
    if (!splash || splash.style.display === "none") {
      if (document.body) document.body.classList.remove("splash-active");
      return;
    }

    splash.classList.add("fade-out");
    setTimeout(() => {
      splash.style.display = "none";
      splash.classList.remove("fade-out");
      if (document.body) document.body.classList.remove("splash-active");
    }, 550);
  },

  // ------------------------------------------
  // Hanging Atelier Status Tag & Popover (Homepage Only)
  // ------------------------------------------
  toggleHangingTagDropdown(e) {
    if (e && e.stopPropagation) e.stopPropagation();
    const pop = $("hangingTagPopover");
    const container = $("hangingTagContainer");
    if (!pop) return;
    const isShowing = pop.style.display === "block";
    if (isShowing) {
      this.closeHangingTagDropdown(e);
    } else {
      this.renderHangingTagPopover();
      pop.style.display = "block";
      if (container) {
        container.setAttribute("aria-expanded", "true");
        container.classList.add("active");
      }
    }
  },

  closeHangingTagDropdown(e) {
    if (e && e.stopPropagation) e.stopPropagation();
    const pop = $("hangingTagPopover");
    const container = $("hangingTagContainer");
    if (pop) pop.style.display = "none";
    if (container) {
      container.setAttribute("aria-expanded", "false");
      container.classList.remove("active");
    }
  },

  renderHangingTagPopover() {
    const liveStatus = typeof getShopLiveStatus === "function" 
      ? getShopLiveStatus() 
      : { isOpen: true, isMondayClosed: false };
    const cfg = S.cfg || (typeof DEF !== "undefined" ? DEF : {});
    const now = new Date();

    const badgeEl = $("hangingPopBadge");
    const hoursEl = $("hangingPopHours");
    const mondayEl = $("hangingPopMonday");
    const nextEl = $("hangingPopNext");
    const localTimeEl = $("hangingPopLocalTime");

    let statusClass = "open";
    let statusBadgeText = "🟢 Atelier Open Now";

    if (liveStatus.isMondayClosed) {
      statusClass = "rest";
      statusBadgeText = "🟡 Monday Rest Day";
    } else if (liveStatus.isOpen) {
      statusClass = "open";
      statusBadgeText = "🟢 Atelier Open Now";
    } else {
      statusClass = "closed";
      statusBadgeText = "🔴 Atelier Closed";
    }

    if (badgeEl) {
      badgeEl.className = `tag-popover-badge ${statusClass}`;
      badgeEl.textContent = statusBadgeText;
    }

    if (hoursEl) {
      const oT = liveStatus.openTimeFormatted || (typeof formatTime12 === "function" ? formatTime12(cfg.openTime || "10:30") : "10:30 AM");
      const cT = liveStatus.closeTimeFormatted || (typeof formatTime12 === "function" ? formatTime12(cfg.closeTime || "21:00") : "9:00 PM");
      hoursEl.textContent = `${oT} – ${cT} (Tue–Sun)`;
    }

    if (mondayEl) {
      mondayEl.textContent = cfg.mondayClosed !== false 
        ? "Monday Closed (Weekly Atelier Rest Day)" 
        : "Open 7 Days a Week";
    }

    if (nextEl) {
      nextEl.textContent = liveStatus.nextActionNote || (liveStatus.isOpen ? "Open today · Walk-ins & bespoke consultations welcome" : "Opens tomorrow at 10:30 AM");
    }

    if (localTimeEl) {
      localTimeEl.textContent = `Local Time: ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}`;
    }
  },

  updateHangingShopStatus() {
    const wrap = $("hangingTagWrapper");
    if (!wrap) return;

    // Exclusively show on the main homepage
    const path = (typeof window !== "undefined" && window.location && window.location.pathname ? window.location.pathname : "").toLowerCase();
    const isOtherPage = path.includes("product.html") || path.includes("readymade.html");
    if (isOtherPage) {
      wrap.style.display = "none";
      return;
    }

    const liveStatus = typeof getShopLiveStatus === "function" 
      ? getShopLiveStatus() 
      : { isOpen: true, isMondayClosed: false };
    const statusEl = $("hangingTagStatus");
    const dotEl = $("hangingTagDot");
    const containerEl = $("hangingTagContainer");

    let statusText = "🟢 Atelier Open";
    let statusClass = "open";
    let titleTip = "Atelier Open";

    if (liveStatus.isMondayClosed) {
      statusText = "🟡 Rest Day";
      statusClass = "rest";
      titleTip = "Monday Atelier Rest Day · Reopens Tuesday 10:30 AM";
    } else if (liveStatus.isOpen) {
      statusText = "🟢 Atelier Open";
      statusClass = "open";
      titleTip = `Atelier Open · ${liveStatus.openTimeFormatted || '10:30 AM'} – ${liveStatus.closeTimeFormatted || '9:00 PM'}`;
    } else {
      statusText = "🔴 Atelier Closed";
      statusClass = "closed";
      titleTip = `Atelier Closed · ${liveStatus.nextActionNote || 'Opens at 10:30 AM'}`;
    }

    if (statusEl) statusEl.textContent = statusText;
    if (dotEl) dotEl.className = `tag-status-dot ${statusClass}`;
    if (containerEl) {
      containerEl.className = `hanging-tag-container status-${statusClass}`;
      containerEl.setAttribute("title", `Saifa Designs · ${titleTip} (Click for details)`);
    }

    // Keep popover live if currently opened by user
    const pop = $("hangingTagPopover");
    if (pop && pop.style.display === "block") {
      this.renderHangingTagPopover();
    }
  },

  startShopStatusAutoUpdater() {
    this.updateHangingShopStatus();
    if (!this._shopStatusInterval) {
      // Periodic check every 20 seconds to capture exact opening, closing, or midnight transitions
      this._shopStatusInterval = setInterval(() => {
        this.updateHangingShopStatus();
      }, 20000);
    }
  },

  renderFront() {
    this.renderShop();
    this.renderNewArrivals();
    this.renderTeam();
    this.renderCompactShopStatus();
    if (typeof this.renderCatalogue === "function" && $("catalogueGrid")) {
      this.renderCatalogue();
    }

    // Sync decorative hanging boutique garment tag (Atelier status: Open / Closed / Rest Day)
    this.updateHangingShopStatus();
    const c = S.cfg || DEF;
    const liveStatus = typeof getShopLiveStatus === "function" ? getShopLiveStatus() : { isOpen: true, label: "Open · 10:30 AM–9:00 PM", badgeClass: "open", message: "Boutique Open" };

    // Dynamically sync live shop status pill with operating schedule & Monday rest day
    const pill = $("shopStatusPill");
    const textEl = $("shopStatusText");
    const badgeEl = $("shopStatusBadge");
    if (pill && textEl) {
      pill.className = `shop-live-status-pill ${liveStatus.badgeClass}`;
      textEl.textContent = liveStatus.label;
      if (badgeEl) {
        badgeEl.textContent = liveStatus.isOpen ? "Atelier Open" : (liveStatus.isMondayClosed ? "Monday Closed" : "Atelier Closed");
      }
    }

    // Header Operating Hours Chips
    const hdrHours = $("hdrHoursText");
    if (hdrHours) {
      hdrHours.textContent = c.hours || "Tue–Sun 10:30 AM – 9:00 PM";
    }
    const hdrMon = $("hdrMondayText");
    if (hdrMon) {
      hdrMon.innerHTML = c.mondayClosed !== false 
        ? "<b>Mon Closed</b> (Atelier Rest Day)" 
        : "<b>Open 7 Days</b> (Atelier Open)";
    }

    // Announcement offer banner with live active offers
    const offerEl = $("offer");
    if (offerEl) {
      if (!liveStatus.isOpen && liveStatus.status === "Offline" && liveStatus.message) {
        offerEl.innerHTML = `⚠️ <b>Notice:</b> ${Security.escapeHTML(liveStatus.message)} (Online boutique orders active 24/7)`;
        offerEl.style.display = "block";
      } else {
        const bannerText = typeof getCurrentBannerOfferText === "function" 
          ? getCurrentBannerOfferText() 
          : (c.offerBanner || c.offer || "🎉 Festive Offer: Use code FESTIVE10 for 10% off on all readymade collections!");
        if (!bannerText || bannerText.trim() === "") {
          offerEl.style.display = "none";
        } else {
          offerEl.innerHTML = bannerText;
          offerEl.style.display = "block";
        }
      }
    }

    // Visit Our Boutique Studio & Atelier Card Details
    const infoEl = $("info");
    if (infoEl) {
      infoEl.innerHTML = `
        <li class="info-item">
          <span class="info-icon">📍</span>
          <div style="flex:1">
            <span class="info-lbl">Boutique Atelier Address</span>
            <div class="info-val" style="font-weight:600;color:var(--tx)">${E(c.address)}</div>
          </div>
        </li>
        <li class="info-item">
          <span class="info-icon">🕙</span>
          <div style="flex:1">
            <span class="info-lbl">Opening Hours</span>
            <div class="info-val">${E(c.hours)}</div>
          </div>
        </li>
        <li class="info-item">
          <span class="info-icon">🟢</span>
          <div style="flex:1">
            <span class="info-lbl">Live Boutique Status</span>
            <div class="info-val"><span class="pill ${liveStatus.badgeClass}" style="font-size:0.75rem">${Security.escapeHTML(liveStatus.label)}</span></div>
          </div>
        </li>
        <li class="info-item">
          <span class="info-icon">📅</span>
          <div style="flex:1">
            <span class="info-lbl">Monday Atelier Rest Day</span>
            <div class="info-val">${c.mondayClosed !== false ? "Artisan handcrafting & fabric curation (Online orders active 24/7)" : "Open for in-person fitting visits"}</div>
          </div>
        </li>
        <li class="info-item">
          <span class="info-icon">📞</span>
          <div style="flex:1">
            <span class="info-lbl">Direct Phone &amp; WhatsApp</span>
            <div class="info-val"><a href="tel:+${typeof getIntlPhone === 'function' ? getIntlPhone(c.shopPhone) : c.shopPhone}" style="color:var(--br);text-decoration:none;font-weight:700">${typeof formatPhone === 'function' ? Security.escapeHTML(formatPhone(c.shopPhone)) : '+' + Security.escapeHTML(c.shopPhone)}</a></div>
          </div>
        </li>
        <li class="info-item">
          <span class="info-icon">💳</span>
          <div style="flex:1">
            <span class="info-lbl">Instant UPI &amp; QR Payments</span>
            <div class="info-val"><code style="font-size:0.8rem;background:var(--sf);padding:2px 6px;border-radius:4px">${E(c.upi)}</code> · Scan Standee QR / Pay at Shop</div>
          </div>
        </li>
      `;
    }

    const mapUrl = c.map && c.map.trim() !== "" ? c.map : `https://maps.google.com/?q=${encodeURIComponent('Saifa Designs, ' + (c.address || ''))}`;
    if ($("mapl")) $("mapl").href = mapUrl;
    if ($("fmap")) $("fmap").href = mapUrl;

    const formattedPhone = typeof formatPhone === "function" ? formatPhone(c.shopPhone) : `+${c.shopPhone}`;
    const intlPhone = typeof getIntlPhone === "function" ? getIntlPhone(c.shopPhone) : String(c.shopPhone || "").replace(/\D/g, "");

    const waLink = `https://wa.me/${intlPhone}?text=${encodeURIComponent("Hello Saifa Designs, I would like to consult with your stylist regarding bespoke designs & outfits.")}`;
    if ($("wal")) $("wal").href = waLink;
    if ($("fwa")) $("fwa").href = `https://wa.me/${intlPhone}`;
    if ($("walBtnText")) $("walBtnText").innerHTML = `<span>💬 Chat on Official WhatsApp (${Security.escapeHTML(formattedPhone)})</span>`;
    if ($("contactPhoneSub")) $("contactPhoneSub").textContent = `Instant design consultation: ${formattedPhone}`;
    if ($("contactAddressSub")) $("contactAddressSub").textContent = c.address ? (c.address.length > 55 ? c.address.slice(0, 52) + "..." : c.address) : "Walk-ins, fitting trials & fabric curation";

    if ($("footCopy")) {
      $("footCopy").innerHTML = `© 2026 SAIFA DESIGNS · Ladies Tailor &amp; Boutique · 📍 ${Security.escapeHTML(c.address)} · 📞 ${Security.escapeHTML(formattedPhone)} · ${Security.escapeHTML(c.hours)}`;
    } else if ($("foot")) {
      $("foot").innerHTML = `© 2026 SAIFA DESIGNS · Ladies Tailor &amp; Boutique · 📍 ${Security.escapeHTML(c.address)} · 📞 ${Security.escapeHTML(formattedPhone)} · ${Security.escapeHTML(c.hours)}`;
    }
    if ($("footerAddressText")) $("footerAddressText").textContent = c.address;
    if ($("footerHoursText")) $("footerHoursText").textContent = c.hours;
    if ($("footerWaLink")) $("footerWaLink").href = waLink;

    // Dynamic Header Staff / Admin Button status
    const lgBtn = $("lg");
    if (lgBtn) {
      if (S.me && S.me.role === "admin") {
        lgBtn.innerHTML = '<span class="login-icon">👑</span> <span class="login-label">Admin Portal</span>';
        lgBtn.title = "Return to Admin Portal";
      } else if (S.me && S.me.role === "worker") {
        lgBtn.innerHTML = '<span class="login-icon">🧵</span> <span class="login-label">Tailor Portal</span>';
        lgBtn.title = "Return to Artisan Portal";
      } else {
        lgBtn.innerHTML = '<span class="login-icon">🔑</span> <span class="login-label">Staff Login</span>';
        lgBtn.title = "Staff & Artisan Portal Login";
      }
    }

    // Dynamically calculate and render customer rating system
    this.renderRatingWidget();

    const fsbox = $("fsbox");
    if (fsbox && (!fsbox.dataset || !fsbox.dataset.ok)) {
      fsbox.innerHTML = sForm("fs", false);
      if (fsbox.dataset) fsbox.dataset.ok = 1;
    }
    this.saveCart();
    this.saveWishlist();

    // Auto-sync active tracking card in real time if user is viewing their order status
    if (this._lastTrackedOrderNo) {
      const activeOrder = orders().find(x => x.no && x.no.toUpperCase() === this._lastTrackedOrderNo.toUpperCase());
      const resBox = $("tres");
      if (activeOrder && resBox && resBox.innerHTML.trim() !== "") {
        this.renderTrackingResult(activeOrder);
      }
    }
  },

  // ------------------------------------------
  // Real-Time Customer Rating & Trust System
  // ------------------------------------------
  renderRatingWidget() {
    const stats = typeof getShopRatingStats === "function" 
      ? getShopRatingStats() 
      : { average: 5.0, averageFormatted: "5.0", totalCount: 0, stars: 5, breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } };

    // 1. Big Score Display Number
    const bigScore = $("ratingBigScore");
    if (bigScore) {
      bigScore.textContent = stats.averageFormatted;
    }

    // 2. Stars Visual Row (e.g. ★★★★★)
    const starsRow = $("ratingStarsVisual");
    if (starsRow) {
      const fullStars = Math.min(5, Math.max(1, Math.round(stats.average)));
      starsRow.innerHTML = "★".repeat(fullStars) + "☆".repeat(5 - fullStars);
      starsRow.setAttribute("aria-label", `${stats.averageFormatted} out of 5 stars`);
    }

    // 3. Verified Count Label
    const countLabel = $("ratingCountLabel");
    if (countLabel) {
      if (stats.totalCount > 0) {
        countLabel.textContent = `Based on ${stats.totalCount} verified client rating${stats.totalCount === 1 ? '' : 's'}`;
      } else {
        countLabel.textContent = `Be the first verified client to rate our atelier!`;
      }
    }

    // 4. Hero & Stats Bar Chip
    const heroStat = $("heroRatingStat");
    if (heroStat) {
      heroStat.textContent = `${stats.averageFormatted} ★`;
    }
    const heroCount = $("heroRatingCount");
    if (heroCount) {
      heroCount.textContent = stats.totalCount > 0 ? `${stats.totalCount} Verified Ratings` : `New Boutique Atelier`;
    }
    const heroCust = $("heroCustStat");
    if (heroCust) {
      const custStats = typeof getGenuineCustomerStats === "function" ? getGenuineCustomerStats() : { displayCount: 0 };
      const genuineCount = (custStats.displayCount !== undefined) ? custStats.displayCount : 0;
      heroCust.textContent = `${genuineCount}+`;
    }

    // 5. Star Distribution Progress Bars
    const barsContainer = $("ratingBarsContainer");
    if (barsContainer) {
      let barsHtml = "";
      for (let s = 5; s >= 1; s--) {
        const count = stats.breakdown[s] || 0;
        const pct = stats.totalCount > 0 ? Math.round((count / stats.totalCount) * 100) : (s === 5 ? 100 : 0);
        barsHtml += `
          <div class="rating-bar-row">
            <span class="rating-bar-star-label">${s} ★</span>
            <div class="rating-bar-track">
              <div class="rating-bar-fill" style="width:${pct}%"></div>
            </div>
            <span class="rating-bar-pct-label">${count}</span>
          </div>
        `;
      }
      barsContainer.innerHTML = barsHtml;
    }
  },

  openRateBoutiqueModal() {
    modal(`
      <div style="padding:6px 4px">
        <div style="text-align:center;margin-bottom:16px">
          <div style="width:58px;height:58px;border-radius:50%;background:color-mix(in srgb,var(--gd) 18%,transparent);color:var(--gd);display:grid;place-items:center;font-size:2rem;margin:0 auto 10px;box-shadow:0 6px 20px color-mix(in srgb,var(--gd) 25%,transparent)">
            ⭐
          </div>
          <h2 style="color:var(--br);margin:0 0 4px;font-size:1.4rem">Rate Saifa Designs</h2>
          <p style="font-size:0.84rem;color:var(--mu);margin:0">
            Ladies Tailor, Boutique &amp; Bespoke Atelier
          </p>
        </div>

        <!-- Dynamic Order Verification & Existing Review Alert Notice -->
        <div id="existingReviewAlert" style="display:none;margin-bottom:14px;background:color-mix(in srgb,var(--ok) 12%,var(--sf));border:1px solid var(--ok);border-radius:12px;padding:10px 14px;font-size:0.84rem;color:var(--tx)">
          <span style="font-weight:700;color:var(--ok)">✓ Verified Purchase Record Found:</span>
          <span id="existingReviewAlertMsg">Order verified. Submit your review below.</span>
        </div>
        <div id="reviewEligibilityWarning" style="display:none;margin-bottom:14px;background:color-mix(in srgb,var(--warn) 12%,var(--sf));border:1px solid var(--warn);border-radius:12px;padding:10px 14px;font-size:0.84rem;color:var(--tx)">
          <span style="font-weight:700;color:var(--warn)">⚠️ Purchase Verification Notice:</span>
          <span id="reviewEligibilityMsg">Only verified clients with completed or paid purchases can submit a review.</span>
        </div>

        <!-- Interactive 1-5 Star Selector -->
        <div style="text-align:center;background:var(--sf2);padding:16px 12px;border-radius:14px;border:1px solid var(--ln);margin-bottom:16px">
          <label style="display:block;font-size:0.86rem;color:var(--tx);font-weight:700;margin-bottom:8px">
            Select Your Rating *
          </label>
          <div id="modalStarPicker" class="star-rating-picker" style="display:inline-flex;gap:8px;font-size:2.2rem;cursor:pointer">
            <span class="star-item on" data-star="1" onclick="Customer.setModalStar(1)">★</span>
            <span class="star-item on" data-star="2" onclick="Customer.setModalStar(2)">★</span>
            <span class="star-item on" data-star="3" onclick="Customer.setModalStar(3)">★</span>
            <span class="star-item on" data-star="4" onclick="Customer.setModalStar(4)">★</span>
            <span class="star-item on" data-star="5" onclick="Customer.setModalStar(5)">★</span>
          </div>
          <div id="modalStarFeedbackText" style="font-size:0.85rem;color:var(--br);font-weight:700;margin-top:6px">
            ⭐⭐⭐⭐⭐ Exceptional Fit &amp; Luxury Craftsmanship
          </div>
          <input type="hidden" id="rev_star" value="5">
        </div>

        <!-- Verification & Details Form -->
        <div class="g2">
          <div>
            <label>Mobile Number (For Purchase Verification) *</label>
            <input id="rev_phone" type="tel" placeholder="10-digit mobile number" maxlength="14" required style="margin-bottom:10px" oninput="Customer.onReviewPhoneInput(this.value)">
          </div>
          <div>
            <label>Your Full Name *</label>
            <input id="rev_name" placeholder="e.g. Fatima Sheikh" required style="margin-bottom:10px">
          </div>
        </div>

        <div id="eligibleOrdersWrap" style="display:none;margin-bottom:10px">
          <label>Select Verified Qualifying Order to Rate *</label>
          <select id="rev_order_id" style="width:100%"></select>
        </div>

        <div class="g2">
          <div>
            <label>Experience / Service Type</label>
            <select id="rev_service" style="margin-bottom:10px">
              <option value="Bespoke Stitching">✂️ Bespoke Custom Stitching</option>
              <option value="Readymade Ensemble">👗 Readymade Boutique Outfit</option>
              <option value="Bridal &amp; Festive Wear">👰 Bridal &amp; Festive Collection</option>
              <option value="Fabrics &amp; Materials">🧵 Luxury Fabrics by Meter</option>
              <option value="Fitting &amp; Alterations">♻️ Minor Alterations &amp; Fitting</option>
              <option value="Boutique Studio Visit">🏛️ Atelier Studio Walk-in Visit</option>
            </select>
          </div>
          <div>
            <label>Order Reference (Auto-linked)</label>
            <input id="rev_order_no" placeholder="Order ID" readonly style="margin-bottom:10px;background:var(--sf2);opacity:0.85">
          </div>
        </div>

        <div>
          <label>Written Review &amp; Private Feedback (Optional)</label>
          <textarea id="rev_comment" rows="3" placeholder="Share your experience about the fitting, stitching neatness, fabric feel, or boutique service..." style="margin-bottom:12px"></textarea>
        </div>

        <!-- Privacy & Verification Guarantee Badge -->
        <div style="background:var(--sf2);padding:10px 14px;border-radius:12px;border:1px solid var(--ln);font-size:0.8rem;color:var(--mu);margin-bottom:16px;display:flex;align-items:center;gap:10px">
          <span style="font-size:1.3rem">🔒</span>
          <div>
            <b>Client Privacy Guarantee:</b> Your written review and mobile number remain private with our atelier admin team. Only the aggregate star score and count appear on the public website.
          </div>
        </div>

        <div style="display:flex;gap:10px;justify-content:flex-end">
          <button class="btn" type="button" onclick="closeM()">Cancel</button>
          <button class="btn p" id="revSubmitBtn" type="button" style="padding:10px 20px;font-weight:700" onclick="Customer.submitRatingReview()">
            ⭐ Submit Verified Rating
          </button>
        </div>
      </div>
    `);
  },

  setModalStar(star) {
    const starInput = $("rev_star");
    if (starInput) starInput.value = star;

    const picker = $("modalStarPicker");
    if (picker) {
      const starSpans = picker.querySelectorAll(".star-item");
      starSpans.forEach(s => {
        const val = Number(s.dataset.star) || 1;
        if (val <= star) {
          s.classList.add("on");
          s.textContent = "★";
        } else {
          s.classList.remove("on");
          s.textContent = "☆";
        }
      });
    }

    const feedbackText = $("modalStarFeedbackText");
    if (feedbackText) {
      const labels = {
        5: "⭐⭐⭐⭐⭐ Exceptional Fit & Luxury Craftsmanship",
        4: "⭐⭐⭐⭐ Very Good Quality & Service",
        3: "⭐⭐⭐ Good / Average Experience",
        2: "⭐⭐ Needs Improvement",
        1: "⭐ Disappointed with Fit/Service"
      };
      feedbackText.textContent = labels[star] || `${star} Stars`;
    }
  },

  onReviewPhoneInput(rawPhone) {
    const clean = np(rawPhone);
    const alertBox = $("existingReviewAlert");
    const alertMsg = $("existingReviewAlertMsg");
    const warnBox = $("reviewEligibilityWarning");
    const warnMsg = $("reviewEligibilityMsg");
    const ordersWrap = $("eligibleOrdersWrap");
    const orderSelect = $("rev_order_id");
    const submitBtn = $("revSubmitBtn");

    if (clean.length === 10) {
      const eligibleOrders = typeof getEligibleOrdersForReview === "function" 
        ? getEligibleOrdersForReview(clean) 
        : orders().filter(o => np(o.phone) === clean && (o.paid === "Paid" || o.status === "Delivered"));

      if (!eligibleOrders.length) {
        if (ordersWrap) ordersWrap.style.display = "none";
        if (alertBox) alertBox.style.display = "none";
        if (warnBox && warnMsg) {
          warnMsg.textContent = `No qualifying completed or paid purchases found for ${clean}. In accordance with boutique policy, reviews can only be submitted after completing a purchase.`;
          warnBox.style.display = "block";
        }
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.style.opacity = "0.5";
          submitBtn.style.cursor = "not-allowed";
        }
        return;
      }

      // Qualifying orders found!
      if (warnBox) warnBox.style.display = "none";
      if (ordersWrap && orderSelect) {
        orderSelect.innerHTML = eligibleOrders.map(o => `
          <option value="${o.id}">
            Order #${o.no} · ${o.type === 'Stitch' ? (o.garment || 'Custom Stitching') : (o.item || 'Ready-to-Wear')} · ${R(o.total)} (${o.paid === 'Paid' ? 'Paid' : 'Delivered'})
          </option>
        `).join("");
        ordersWrap.style.display = "block";
      }

      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.style.opacity = "1";
        submitBtn.style.cursor = "pointer";
      }

      // Pre-fill name from customer/order record
      const primaryOrder = eligibleOrders[0];
      if (primaryOrder) {
        if ($("rev_name") && !$("rev_name").value) {
          $("rev_name").value = primaryOrder.customer || "";
        }
        if ($("rev_order_no")) {
          $("rev_order_no").value = primaryOrder.no || "";
        }
      }

      const existing = (reviews() || []).find(r => np(r.phone) === clean);
      if (existing) {
        if (alertBox && alertMsg) {
          const dateStr = existing.updatedAt ? new Date(existing.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";
          alertMsg.textContent = `Welcome back, ${existing.name || 'valued client'}! You previously rated us ${existing.rating}★ on ${dateStr}. Submitting will update your rating record.`;
          alertBox.style.display = "block";
        }
        if (submitBtn) submitBtn.innerHTML = "🔄 Update My Rating &amp; Review";
        if ($("rev_comment") && !$("rev_comment").value) $("rev_comment").value = existing.review || "";
        if (existing.rating) this.setModalStar(existing.rating);
      } else {
        if (alertBox && alertMsg) {
          alertMsg.textContent = `Verified client found! You have ${eligibleOrders.length} qualifying purchase record(s).`;
          alertBox.style.display = "block";
        }
        if (submitBtn) submitBtn.innerHTML = "⭐ Submit Verified Rating";
      }
      return;
    }

    if (warnBox) warnBox.style.display = "none";
    if (alertBox) alertBox.style.display = "none";
    if (ordersWrap) ordersWrap.style.display = "none";
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.style.opacity = "1";
      submitBtn.innerHTML = "⭐ Submit Verified Rating";
    }
  },

  async submitRatingReview() {
    const starVal = Number($("rev_star") ? $("rev_star").value : 5) || 5;
    const nameVal = $("rev_name") ? $("rev_name").value.trim() : "";
    const phoneVal = $("rev_phone") ? $("rev_phone").value.trim() : "";
    const cleanPhone = np(phoneVal);
    const serviceVal = $("rev_service") ? $("rev_service").value : "Bespoke Stitching";
    const commentVal = $("rev_comment") ? $("rev_comment").value.trim() : "";
    const orderIdVal = $("rev_order_id") ? $("rev_order_id").value : "";

    if (!nameVal || nameVal.length < 2) {
      return toast("Please enter your name");
    }
    if (cleanPhone.length !== 10) {
      return toast("Please enter a valid 10-digit mobile number");
    }

    if (typeof submitOrderVerifiedReview === "function") {
      const res = await submitOrderVerifiedReview(orderIdVal, cleanPhone, nameVal, starVal, commentVal, serviceVal);
      if (!res.ok) {
        return toast("⚠️ " + res.error);
      }
      closeM();
      toast(res.isUpdate 
        ? `Thank you ${nameVal}! Your verified rating was updated to ${starVal}★ 🔄` 
        : `Thank you ${nameVal}! Your verified ${starVal}★ rating has been recorded ⭐`);
      this.renderRatingWidget();
      return;
    }

    // Fallback if backend helper not mounted
    closeM();
    toast(`Thank you ${nameVal}! Your rating has been recorded ⭐`);
    this.renderRatingWidget();
  },

  // ------------------------------------------
  // Three.js Haute-Couture Mannequin & Real Sewing Thread Atelier
  // ------------------------------------------
  initThreeHero() {
    const h = $("stage");
    if (!h) return;
    try {
      const sc = new THREE.Scene();
      const cam = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
      cam.position.set(0, 0.2, 7.3);
      const r = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      r.setPixelRatio(Math.min(devicePixelRatio, 2));
      h.appendChild(r.domElement);

      // Warm couture atelier studio lighting
      sc.add(new THREE.AmbientLight(0xfff7ee, 0.82));
      const keyLight = new THREE.DirectionalLight(0xffffff, 1.15);
      keyLight.position.set(4, 5, 5);
      sc.add(keyLight);
      const fillLight = new THREE.DirectionalLight(0xffe2c4, 0.65);
      fillLight.position.set(-4, 2, 4);
      sc.add(fillLight);
      const rimLight = new THREE.PointLight(0xffb86b, 1.2, 25);
      rimLight.position.set(-3.5, 2.5, -2);
      sc.add(rimLight);

      const g = new THREE.Group();
      sc.add(g);

      // 1. Haute Couture Tailoring Dressmaker Mannequin Silhouette
      // Refined profile curve with contoured bustier, tapered cinched waist, and flared skirt
      const P = [
        [0, -1.85],
        [1.8, -1.85],
        [1.65, -1.5],
        [1.3, -1.05],
        [0.88, -0.5],
        [0.48, -0.05],
        [0.33, 0.22],   // Cinched waist
        [0.44, 0.58],   // Underbust
        [0.55, 0.88],   // Sweetheart bust peak
        [0.46, 1.15],   // Bodice collarbone
        [0.32, 1.32],
        [0.18, 1.48],   // Neck base
        [0.12, 1.62],
        [0, 1.62]
      ].map(p => new THREE.Vector2(p[0], p[1]));

      const dressGeo = new THREE.LatheGeometry(P, 84);
      const pos = dressGeo.attributes.position;
      // Procedural 16 heavy silk draping pleats & fluting folds along skirt
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        if (y < 0.2) {
          const a = Math.atan2(z, x);
          const depth = Math.min(1.0, (0.2 - y) / 1.7);
          const pleat = 1 + 0.058 * Math.sin(a * 16) * depth;
          pos.setX(i, x * pleat);
          pos.setZ(i, z * pleat);
        }
      }
      dressGeo.computeVertexNormals();

      // Royal silk velvet fabric
      const velvetMat = new THREE.MeshStandardMaterial({
        color: 0x8e1647,
        roughness: 0.38,
        metalness: 0.14,
        side: THREE.DoubleSide
      });
      const dress = new THREE.Mesh(dressGeo, velvetMat);
      g.add(dress);

      // Natural linen mannequin neck & upper chest
      const linenMat = new THREE.MeshStandardMaterial({
        color: 0xecd9c4,
        roughness: 0.75,
        metalness: 0.04
      });
      const neckDummy = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.17, 0.38, 24),
        linenMat
      );
      neckDummy.position.y = 1.68;
      g.add(neckDummy);

      // Polished brass neck finial topper
      const goldMat = new THREE.MeshStandardMaterial({
        color: 0xd9a93a,
        metalness: 0.92,
        roughness: 0.22
      });
      const finialBase = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 0.1, 24), goldMat);
      finialBase.position.y = 1.88;
      g.add(finialBase);
      const finialBall = new THREE.Mesh(new THREE.SphereGeometry(0.12, 24, 24), goldMat);
      finialBall.position.y = 1.98;
      g.add(finialBall);

      // Gold embroidered waistband / belt
      const belt = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.038, 16, 64), goldMat);
      belt.rotation.x = Math.PI / 2;
      belt.position.y = 0.22;
      g.add(belt);

      // Gold zari scalloped lace border at hem
      const hem = new THREE.Mesh(new THREE.TorusGeometry(1.8, 0.042, 16, 96), goldMat);
      hem.rotation.x = Math.PI / 2;
      hem.position.y = -1.85;
      g.add(hem);

      // Atelier brass measuring pole & cast pedestal base
      const standPole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.2, 18), goldMat);
      standPole.position.y = -2.1;
      g.add(standPole);
      const standBase = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.78, 0.1, 44), goldMat);
      standBase.position.y = -2.42;
      g.add(standBase);
      const standTier = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.48, 0.08, 36), goldMat);
      standTier.position.y = -2.34;
      g.add(standTier);

      // 2. Realistic Wooden Sewing Thread Spools (Reels) with Wound Silk Thread
      const spoolColors = [
        { c: 0xf5b041, label: "Gold Silk" },
        { c: 0x27ae60, label: "Emerald" },
        { c: 0x1abc9c, label: "Cyan Silk" },
        { c: 0xe74c3c, label: "Crimson" },
        { c: 0x8e44ad, label: "Royal Violet" }
      ];

      const woodMat = new THREE.MeshStandardMaterial({
        color: 0xa86532,
        roughness: 0.65,
        metalness: 0.08
      });

      const spools = [];
      spoolColors.forEach((sp, i) => {
        const spoolGroup = new THREE.Group();

        // Top wooden flange
        const topFlange = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.036, 24), woodMat);
        topFlange.position.y = 0.15;
        spoolGroup.add(topFlange);

        // Bottom wooden flange
        const botFlange = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.036, 24), woodMat);
        botFlange.position.y = -0.15;
        spoolGroup.add(botFlange);

        // Wound silk embroidery thread body
        const silkMat = new THREE.MeshStandardMaterial({
          color: sp.c,
          roughness: 0.24,
          metalness: 0.2,
          emissive: sp.c,
          emissiveIntensity: 0.1
        });
        const threadBody = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.26, 24), silkMat);
        spoolGroup.add(threadBody);

        // Center axle spool hole
        const centerHole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.36, 16), woodMat);
        spoolGroup.add(centerHole);

        const a = i * 1.256;
        spoolGroup.position.set(Math.cos(a) * 2.8, 0, Math.sin(a) * 1.4);
        spoolGroup.rotation.z = 0.18 * (i % 2 === 0 ? 1 : -1);
        sc.add(spoolGroup);
        spools.push(spoolGroup);
      });

      // 3. Authentic 3D Real Sewing Thread Strand (Tube Curve)
      // Originates at the gold spool, loops in space, threads through needle eye, spirals dress waist and trails down
      const threadPoints = [
        new THREE.Vector3(2.6, 0.2, 0.8),       // Spool source
        new THREE.Vector3(2.0, 0.65, 0.9),
        new THREE.Vector3(1.3, 0.95, 0.7),
        new THREE.Vector3(0.72, 0.82, 0.58),    // Approach needle
        new THREE.Vector3(0.55, 0.72, 0.52),    // Passes through needle eye
        new THREE.Vector3(0.42, 0.54, 0.44),    // Enters bodice seam
        new THREE.Vector3(0.36, 0.28, 0.36),    // Waist spiral loop 1
        new THREE.Vector3(-0.12, 0.22, 0.40),
        new THREE.Vector3(-0.38, 0.20, 0.15),
        new THREE.Vector3(-0.34, 0.16, -0.22),
        new THREE.Vector3(0.10, 0.14, -0.38),
        new THREE.Vector3(0.42, 0.10, -0.15),
        new THREE.Vector3(0.46, -0.05, 0.32),   // Waist spiral loop 2
        new THREE.Vector3(0.15, -0.25, 0.65),
        new THREE.Vector3(-0.55, -0.65, 0.85),  // Cascading along skirt pleat
        new THREE.Vector3(-0.95, -1.2, 1.15),
        new THREE.Vector3(-1.4, -1.65, 1.25),
        new THREE.Vector3(-1.75, -1.9, 0.95)    // Trailing on hem
      ];

      const threadCurve = new THREE.CatmullRomCurve3(threadPoints);
      const threadGeo = new THREE.TubeGeometry(threadCurve, 160, 0.024, 8, false);
      const threadMat = new THREE.MeshStandardMaterial({
        color: 0xf5b041,
        metalness: 0.35,
        roughness: 0.22,
        emissive: 0x664411,
        emissiveIntensity: 0.28
      });
      const threadTube = new THREE.Mesh(threadGeo, threadMat);
      g.add(threadTube);

      // 4. Chrome Silver Tailoring Needle
      const needleGroup = new THREE.Group();
      needleGroup.position.set(0.55, 0.72, 0.52);
      needleGroup.rotation.set(-0.35, 0.25, -0.75);

      const chromeMat = new THREE.MeshStandardMaterial({
        color: 0xf8f9fa,
        metalness: 0.98,
        roughness: 0.08
      });
      // Needle shaft
      const needleShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.62, 16), chromeMat);
      needleGroup.add(needleShaft);
      // Needle sharp point
      const needleTip = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.1, 16), chromeMat);
      needleTip.position.y = -0.36;
      needleTip.rotation.x = Math.PI;
      needleGroup.add(needleTip);
      // Needle eye hole (torus loop where thread threads through)
      const needleEye = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.007, 8, 20), chromeMat);
      needleEye.position.y = 0.29;
      needleGroup.add(needleEye);

      g.add(needleGroup);

      // 5. Golden Running Basting Stitches Along Princess Seams
      const bastingStitches = new THREE.Group();
      for (let s = 0; s < 12; s++) {
        const tVal = s / 11;
        const sy = 0.9 - tVal * 0.65;
        const sr = 0.52 - tVal * 0.18;
        const sa = 0.25 + (s % 2 === 0 ? 0.02 : -0.02);
        const stitch = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.055, 8), threadMat);
        stitch.position.set(Math.cos(sa) * sr, sy, Math.sin(sa) * sr);
        stitch.rotation.z = 0.2;
        bastingStitches.add(stitch);
      }
      g.add(bastingStitches);

      // 6. Sparkling Golden Sequins & Studio Dust Particles
      const sg = new THREE.BufferGeometry();
      const sa = [];
      for (let i = 0; i < 180; i++) {
        sa.push(
          (Math.random() - 0.5) * 9.5,
          (Math.random() - 0.5) * 6.5,
          (Math.random() - 0.5) * 5.5
        );
      }
      sg.setAttribute("position", new THREE.Float32BufferAttribute(sa, 3));
      const sparks = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xf5b041, size: 0.055 }));
      sc.add(sparks);

      function sz() {
        const w = h.clientWidth || 400, hh = h.clientHeight || 500;
        r.setSize(w, hh);
        cam.aspect = w / hh;
        cam.updateProjectionMatrix();
        sc.scale.setScalar(w < 360 ? 0.62 : (w < 500 ? 0.74 : 1));
      }
      sz();
      setTimeout(sz, 120);
      window.addEventListener("resize", sz);

      let dg = false, px = 0;
      h.addEventListener("pointerdown", e => { dg = true; px = e.clientX; });
      addEventListener("pointerup", () => (dg = false));
      addEventListener("pointermove", e => {
        if (dg) {
          g.rotation.y += (e.clientX - px) * 0.01;
          px = e.clientX;
        }
      });

      let t = 0;
      (function animate() {
        requestAnimationFrame(animate);
        t += 0.016;

        // Subtle organic breathing motion on mannequin
        if (!dg) g.rotation.y += 0.0055;
        g.position.y = Math.sin(t * 0.8) * 0.04;

        // Thread and needle subtle tension sway
        needleGroup.rotation.z = -0.75 + Math.sin(t * 1.5) * 0.06;
        needleGroup.position.y = 0.72 + Math.cos(t * 1.5) * 0.02;

        // Harmonic floating spools motion
        spools.forEach((s, i) => {
          s.position.y = Math.sin(t + i * 1.3) * 1.15;
          s.rotation.x += 0.015;
          s.rotation.y += 0.01;
        });

        sparks.rotation.y = t * 0.04;
        r.render(sc, cam);
      })();
    } catch (e) {
      console.warn("Three.js hero initialization:", e);
      h.innerHTML = '<div style="display:grid;place-items:center;height:100%;font-size:6rem">👗</div>';
    }
  }
};

// ------------------------------------------
// Custom Stitching Booking Form & Measurement Engine
// ------------------------------------------
function est(p) {
  const gEl = $(p + "g");
  const estEl = $(p + "est");
  if (!gEl || !estEl) return;
  const prices = (S.cfg && S.cfg.prices) || DEF.prices;
  const price = prices[gEl.value] || 0;
  estEl.textContent = R(price);
}

function prefill(p) {
  const phEl = $(p + "p");
  if (!phEl) return;
  const ph = np(phEl.value);
  if (ph.length === 10) {
    const c = custByPhone(ph);
    if (c) {
      if ($(p + "n") && !$(p + "n").value) $(p + "n").value = c.name || "";
      if ($(p + "a") && !$(p + "a").value) $(p + "a").value = c.address || "";
      const last = (c.measures || [])[0];
      if (last && last.m) {
        (typeof getMeasurements === "function" ? getMeasurements() : MEAS).forEach((m, i) => {
          const mEl = $(p + "m" + i);
          if (mEl && last.m[m]) mEl.value = last.m[m];
        });
      }
      toast(`Welcome back ${c.name}! Measurements & Client ID auto-loaded 📐`);
    }
  }
}

function sForm(p, admin = false) {
  const prices = (S.cfg && S.cfg.prices) || DEF.prices;
  const gs = Object.keys(prices);
  const defaultGarment = gs[0] || "Blouse";
  const defaultPrice = prices[defaultGarment] || 350;

  return `
    ${!admin ? `
      <div style="background:color-mix(in srgb, var(--br) 8%, var(--sf));border:1px solid color-mix(in srgb, var(--br) 25%, var(--ln));border-radius:14px;padding:14px 18px;margin-bottom:20px;display:flex;align-items:center;gap:14px">
        <span style="font-size:1.8rem">📏</span>
        <div style="font-size:0.88rem;line-height:1.45">
          <b style="color:var(--br)">Bespoke Master Tailoring with Saved Profile</b><br>
          <span style="color:var(--mu)">Enter your 10-digit mobile number below to automatically load your saved measurements, Client ID, and fitting history for instant booking.</span>
        </div>
      </div>
    ` : ""}

    <div class="g2">
      <div>
        <label>Full Name *</label>
        <input id="${p}n" placeholder="e.g. Ayesha Khan" ${admin ? `oninput="prefill('${p}')"` : `onblur="prefill('${p}')"`} required>
      </div>
      <div>
        <label>Mobile Number (10 digits) * ${admin ? `<small style="color:var(--br)">(Auto-fills client)</small>` : ""}</label>
        <input id="${p}p" type="tel" inputmode="numeric" placeholder="e.g. 9876543210" maxlength="10" oninput="prefill('${p}')" required>
      </div>
    </div>

    <label>Address / Boutique Trial Preference</label>
    <div style="position:relative">
      <input id="${p}a" placeholder="e.g. Flat 302, Green View Apts, Bandra (or 'Trial at Boutique')">
      <input id="${p}maplink" type="hidden">
    </div>
    <div class="map-actions-row">
      <button type="button" class="map-action-btn" onclick="Customer.detectCurrentLocation('${p}a', '${p}maplink')">
        📍 Detect My Current Location
      </button>
      <button type="button" class="map-action-btn" onclick="Customer.openMapLocationPicker('${p}a', '${p}maplink')">
        🗺️ Pin on Google Maps
      </button>
    </div>

    <div class="g2">
      <div>
        <label>Garment Type</label>
        <select id="${p}g" onchange="est('${p}')">
          ${gs.map(k => `<option value="${Security.escapeHTML(k)}">${Security.escapeHTML(k)} (from ${R(prices[k])})</option>`).join("")}
        </select>
      </div>
      <div>
        <label>Fabric Option</label>
        <select id="${p}f">
          <option value="Provide My Own Fabric">🧵 Provide My Own Fabric (I will deliver / courier)</option>
          <option value="Purchase Fabric from SAIFA">🛍️ Purchase Fabric from SAIFA Boutique</option>
          <option value="Boutique Consultation">✨ Stylist Fabric Consultation</option>
        </select>
      </div>
    </div>

    <div style="display:flex;justify-content:space-between;align-items:center;margin:18px 0 8px">
      <label style="margin:0;font-weight:600">Measurements (Inches)</label>
      <span style="font-size:0.78rem;color:var(--mu)">All standard points in inches (step 0.5)</span>
    </div>

    <div class="meas">
      ${(typeof getMeasurements === "function" ? getMeasurements() : MEAS).map((m, i) => `
        <div>
          <label style="font-size:0.75rem">${m}</label>
          <input id="${p}m${i}" type="number" step="0.5" inputmode="decimal" placeholder='e.g. 36"'>
        </div>
      `).join("")}
    </div>
    <p style="font-size:0.78rem;color:var(--mu);margin:6px 0 16px">
      💡 <i>Not sure about all measurements? Enter the ones you know or leave blank — our Master Tailor will call or measure you during trial.</i>
    </p>

    <label>Design &amp; Styling Instructions (Neckline, Back Cut, Padding, Latkans, Sleeve Style)</label>
    <textarea id="${p}note" rows="2" placeholder="e.g. Sweetheart neckline, deep back with dori & potli latkans, princess seam cut with cups, half sleeves..."></textarea>

    <div class="g2">
      <div>
        <label>Target Delivery / Trial Date</label>
        <input id="${p}due" type="date">
      </div>
      <div>
        <label>Payment Mode</label>
        <select id="${p}pay">
          <option value="UPI">📲 UPI / QR Code (GPay, PhonePe, Paytm)</option>
          <option value="Cash on Delivery">💵 Cash on Delivery / Trial</option>
          <option value="Pay at Shop">🏪 Pay at Boutique Counter</option>
        </select>
      </div>
    </div>

    <div style="display:flex;justify-content:space-between;align-items:center;background:var(--sf);border:1px solid var(--ln);border-radius:14px;padding:14px 18px;margin:18px 0 20px">
      <div>
        <span style="font-size:0.8rem;color:var(--mu);text-transform:uppercase;letter-spacing:0.05em">Estimated Stitching Charge</span><br>
        <span style="font-size:1.5rem;font-weight:700;color:var(--br)" id="${p}est">${R(defaultPrice)}</span>
      </div>
      <div style="text-align:right;font-size:0.8rem;color:var(--mu);line-height:1.4">
        ✨ Free Trial Fitting<br>
        ✂️ Complimentary Alterations
      </div>
    </div>

    <button class="btn p" style="width:100%;font-size:1.05rem;padding:14px" onclick="submitStitch('${p}', ${Boolean(admin)})">
      ${admin ? "💾 Register Stitching Order in Queue" : "Book Custom Stitching ✂️"}
    </button>
  `;
}

function submitStitch(p, admin = false) {
  const n = $(p + "n") ? $(p + "n").value.trim() : "";
  const ph = $(p + "p") ? np($(p + "p").value) : "";
  const a = $(p + "a") ? $(p + "a").value.trim() : "";

  if (!n) {
    toast("Please enter your name");
    if ($(p + "n")) $(p + "n").focus();
    return;
  }
  if (ph.length < 10) {
    toast("Please enter a valid 10-digit mobile number");
    if ($(p + "p")) $(p + "p").focus();
    return;
  }

  const g = $(p + "g") ? $(p + "g").value : "Blouse";
  const f = $(p + "f") ? $(p + "f").value : "Provide My Own Fabric";
  const m = {};
  const activeMeas = typeof getMeasurements === "function" ? getMeasurements() : MEAS;
  activeMeas.forEach((measName, i) => {
    const el = $(p + "m" + i);
    m[measName] = (el && el.value) ? el.value : "-";
  });
  const note = $(p + "note") ? $(p + "note").value.trim() : "";
  const due = $(p + "due") ? $(p + "due").value : "";
  const pay = $(p + "pay") ? $(p + "pay").value : "UPI";
  const prices = (S.cfg && S.cfg.prices) || DEF.prices;
  const total = prices[g] || 350;
  const mapsUrl = ($(p + "maplink") ? $(p + "maplink").value : "") || (a ? `https://www.google.com/maps?q=${encodeURIComponent(a)}` : "");

  placeOrder({
    type: "Stitch",
    customer: n,
    phone: ph,
    address: a || "Boutique Pickup / Trial",
    mapsUrl: mapsUrl,
    garment: g,
    fabric: f,
    measure: m,
    note,
    due,
    pay,
    total,
    stage: "Cutting & Pattern Drafting"
  }).then(o => {
    if (!o) return;
    if (!admin) {
      if ($(p + "n")) $(p + "n").value = "";
      if ($(p + "p")) $(p + "p").value = "";
      if ($(p + "a")) $(p + "a").value = "";
      if ($(p + "note")) $(p + "note").value = "";
      activeMeas.forEach((_, i) => {
        if ($(p + "m" + i)) $(p + "m" + i).value = "";
      });
      Customer.showOrderConfirmation(o);
      if (pay === "UPI") setTimeout(() => Customer.showPayModal(o), 500);
    } else {
      toast("Bespoke Stitching order registered in queue ✅");
      if (typeof panel === "function") panel();
    }
  });
}

// Global aliases to maintain complete backwards compatibility
function shop() { Customer.renderShop(); }
function cart(o) { Customer.openCart(Boolean(o)); }
function wishlist(o) { Customer.openWishlist(o !== false); }
function track() { Customer.trackOrder(); }
function stylist() { Customer.askStylist(); }
function renderFront() { Customer.renderFront(); }

window.sForm = sForm;
window.est = est;
window.prefill = prefill;
window.submitStitch = submitStitch;
window.Customer = Customer;
window.toggleStitch = () => Customer.toggleStitchingDropdown();
window.openStitch = () => Customer.openStitchingForm();
window.toggleHangingTag = (e) => Customer.toggleHangingTagDropdown(e);
window.wishlist = wishlist;
