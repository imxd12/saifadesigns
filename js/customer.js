// ==========================================
// SAIFA DESIGNS – CUSTOMER STOREFRONT & PORTAL
// ==========================================

const Customer = {
  init() {
    this.renderFront();
    this.checkUrlForTracking();
    this.checkUrlForStitching();
    this.initThreeHero();

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

    modal(`
      <h2 style="color:var(--br);margin-bottom:4px">Pay ${R(o.total)}</h2>
      <p style="color:var(--mu);margin-bottom:14px">Order <b>#${E(o.no)}</b> · Pay to <b>${E(c.payee)}</b></p>
      
      <div style="text-align:center">
        <div class="qr" id="qrb">
          ${customQR ? `<img id="payQrImg" src="${customQR}" style="display:block;max-width:220px;height:auto;margin:auto;border-radius:12px">` : ""}
        </div>
        <p style="font-size:0.82rem;color:var(--mu);margin:8px 0">
          UPI ID: <b>${E(c.upi)}</b>
        </p>
        <div style="display:flex;gap:8px;justify-content:center;margin:10px 0">
          <button class="btn s" onclick="Customer.downloadQR('${o.no}')">⬇ Download QR to Gallery</button>
        </div>
      </div>

      <a class="btn p" style="width:100%;margin:8px 0" href="${qrDataUrl}">📲 Pay with any UPI App (GPay, PhonePe, Paytm)</a>
      <p style="font-size:0.78rem;color:var(--mu);text-align:center">
        On mobile, tap the button to launch your UPI app. On computer, scan the QR code.
      </p>
      <button class="btn g" style="width:100%;margin-top:10px" onclick="Customer.markPaid('${o.id}')">✅ I Have Completed Payment</button>
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

  markPaid(id) {
    upd("orders", id, { paid: "Claimed" });
    closeM();
    toast("Payment claimed! Admin will confirm after verification 🙏");
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
      subcats = MATERIAL_SUBCATS;
    } else if (S.cat === "Readymade") {
      subcats = READYMADE_SUBCATS;
    } else {
      subcats = [...MATERIAL_SUBCATS.slice(0, 2), ...READYMADE_SUBCATS.slice(0, 2)];
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
            <button class="btn s p" ${p.stock < 1 ? "disabled" : ""} onclick="Customer.addToCart('${p.id}')">Add to Cart</button>
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
              <td><b>Tuesday – Sunday</b></td>
              <td style="text-align:right"><b>10:30 AM – 9:00 PM</b></td>
            </tr>
            <tr style="color:var(--bad)">
              <td><b>Monday</b></td>
              <td style="text-align:right"><b>Closed (Atelier Rest Day)</b></td>
            </tr>
          </table>
          <p style="font-size:0.76rem;color:var(--mu);margin:6px 0 0">
            * Monday is our dedicated artisan handcrafting and fabric sourcing rest day. Online orders &amp; bespoke WhatsApp inquiries remain open 24/7.
          </p>
        </div>

        <!-- Boutique Contact & Directions -->
        <div style="font-size:0.84rem;color:var(--mu);margin-bottom:16px;line-height:1.5">
          📍 ${Security.escapeHTML(c.address)}<br>
          📞 Phone: +${Security.escapeHTML(c.shopPhone)}
        </div>

        <div style="display:flex;gap:10px">
          <a class="btn p" style="flex:1" href="${c.map}" target="_blank" rel="noopener">📍 Open in Google Maps</a>
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

  openDetail(id) {
    const p = products().find(x => x.id == id);
    if (!p) return;
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
        <span class="tag">${E(p.cat)}</span>
        ${p.subcat ? `<span class="pill" style="font-size:0.72rem;padding:3px 10px;background:var(--sf2);color:var(--mu);font-weight:600">${E(p.subcat)}</span>` : ''}
      </div>
      <h2 style="margin:8px 0 4px;font-family:'Playfair Display',serif">${E(p.name)}</h2>
      <div class="pr" style="font-size:1.45rem;font-family:'Playfair Display',serif">${R(p.price)}</div>
      <p style="color:var(--mu);margin:10px 0;line-height:1.5">${E(p.desc)}</p>
      <table style="margin:12px 0">
        <tr><th>Fabric Spec</th><td><b>${E(p.fabric)}</b></td></tr>
        <tr><th>Available Colors</th><td>${E(p.colors)}</td></tr>
        <tr><th>Sizes</th><td>${E(p.sizes)}</td></tr>
        <tr><th>Stock Status</th><td>${p.stock > 0 ? `<span class="pill ok">${p.stock} units available</span>` : "<span class='pill bad'>Sold Out</span>"}</td></tr>
      </table>
      <p style="font-size:0.8rem;color:var(--mu);margin:10px 0">
        🧵 Complimentary minor alterations · Handcrafted finishing · UPI, Cash on Delivery, or Pay at boutique
      </p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px">
        <button class="btn p" ${p.stock < 1 ? "disabled" : ""} onclick="Customer.addToCart('${p.id}');closeM()">🛒 Add to Cart</button>
        ${p.img ? `<button class="btn" onclick="Customer.openFullImage('${p.img}', '${E(p.name)}')">🔍 View Full Photo</button>` : ''}
        <button class="btn" onclick="Customer.askStylistForProduct('${p.id}')">✨ How to Style</button>
      </div>
      <div id="pai" class="ai" style="display:none;margin-top:12px"></div>
    `);
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
  addToCart(id) {
    const p = products().find(x => x.id == id);
    if (!p) return;
    const item = S.cart.find(c => c.id == id);
    if (item) {
      if (item.q >= p.stock && p.stock > 0) return toast("Maximum available stock reached");
      item.q++;
    } else {
      S.cart.push({ id, n: p.name, p: p.price, q: 1 });
    }
    this.saveCart();
    toast("Added to cart 🛒");
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
      return;
    }
    d.classList.add("on");

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
        <div class="line">
          <span><b>${E(c.n)}</b><br><small style="color:var(--mu)">${R(c.p)} each</small></span>
          <span>
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
            <input id="cartCouponInput" placeholder="e.g. FESTIVE10" value="${S.appliedCoupon ? E(S.appliedCoupon.code) : ''}" style="margin:0;text-transform:uppercase">
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
    S.cart[i].q += d;
    if (S.cart[i].q < 1) S.cart.splice(i, 1);
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
      items: S.cart.map(c => ({ id: c.id, n: c.n, q: c.q, p: c.p })),
      total,
      pay
    }).then(o => {
      if (!o) return;
      // Deduct stock
      S.cart.forEach(c => {
        const pr = products().find(x => x.id == c.id);
        if (pr && pr.stock > 0) {
          upd("products", pr.id, { stock: Math.max(0, pr.stock - c.q) });
        }
      });

      S.cart = [];
      S.appliedCoupon = null;
      this.saveCart();
      this.openCart(false);
      this.showOrderConfirmation(o);
      if (pay === "UPI") setTimeout(() => Customer.showPayModal(o), 500);
    });
  },

  // ------------------------------------------
  // Live Order Tracking with Tailor Stitches Animation
  // ------------------------------------------
  trackOrder(skipAnimation = false) {
    const tkInput = $("tk");
    const tpInput = $("tp");
    let no = tkInput ? tkInput.value.trim().toUpperCase() : "";
    let p = tpInput ? np(tpInput.value) : "";
    const resBox = $("tres");
    if (!resBox) return;

    // Friendly auto-fallback to demo sample if both empty on click
    if (!no && !p) {
      if (tkInput) tkInput.value = "SD4K9XQ";
      if (tpInput) tpInput.value = "9811223344";
      no = "SD4K9XQ";
      p = "9811223344";
      toast("Loaded sample bespoke order for live tracking demo 🪡");
    }

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
            <a class="btn s g" href="https://wa.me/${S.cfg.shopPhone}?text=${encodeURIComponent('Hello Saifa Designs, could you please help me find my order status for Order ' + no + '?')}" target="_blank" rel="noopener">
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
            <div class="artisan-avatar-sm">
              ${assignedWorker && assignedWorker.img ? `<img src="${Security.escapeHTML(assignedWorker.img)}" style="width:100%;height:100%;object-fit:cover">` : '🧵'}
            </div>
            <div>
              <span style="font-size:0.74rem;color:var(--mu);text-transform:uppercase;letter-spacing:0.04em;display:block">Assigned Artisan</span>
              <b style="font-size:0.92rem;color:var(--tx)">${assignedWorker ? Security.escapeHTML(assignedWorker.name) : "Master Artisan Team"}</b>
              <small style="color:var(--gd);font-weight:600;display:block">${assignedWorker ? Security.escapeHTML(assignedWorker.role) : "Haute Couture Atelier"}</small>
            </div>
          </div>
          <div>
            ${o.workerVerified === true ? `
              <span class="pill ok" style="font-size:0.75rem;padding:4px 10px">✓ Master Quality Verified</span>
            ` : `
              <span class="pill w" style="font-size:0.75rem;padding:4px 10px">🔍 In Active Tailoring</span>
            `}
          </div>
        </div>

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
          ${MEAS.map(k => `
            <div style="background:var(--sf2);padding:10px 12px;border-radius:10px;border:1px solid var(--ln)">
              <small style="color:var(--mu);display:block;font-size:0.72rem;text-transform:uppercase;letter-spacing:0.04em">${k}</small>
              <b style="font-size:1.1rem;color:var(--tx)">${Security.escapeHTML(m[k] && m[k] !== '-' ? m[k] + '"' : '-')}</b>
            </div>
          `).join("")}
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
    if (!tmg) return;
    tmg.innerHTML = team().map(t => `
      <div class="tm">
        <div class="av">
          ${t.img ? `<img src="${t.img}" alt="${E(t.name)}">` : (t.em ? E(t.em) : E((t.name || "?")[0]))}
        </div>
        <h3>${E(t.name)}</h3>
        <div class="role">${E(t.role)}</div>
        <p>${E(t.bio)}</p>
      </div>
    `).join("");
  },

  renderFront() {
    this.renderShop();
    this.renderTeam();
    const c = S.cfg;

    // Dynamically sync live shop status pill with operating schedule & Monday rest day
    const liveStatus = typeof getShopLiveStatus === "function" ? getShopLiveStatus() : { isOpen: true, label: "Open · 10:30 AM–9:00 PM", badgeClass: "open", message: "Boutique Open" };
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

    const infoEl = $("info");
    if (infoEl) {
      infoEl.innerHTML = `
        <li class="info-item">
          <span class="info-icon">📍</span>
          <div style="flex:1">
            <span class="info-lbl">Boutique Address</span>
            <div class="info-val">${E(c.address)}</div>
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
            <div class="info-val">Artisan handcrafting & fabric curation (Online 24/7)</div>
          </div>
        </li>
        <li class="info-item">
          <span class="info-icon">📞</span>
          <div style="flex:1">
            <span class="info-lbl">Direct Phone & WhatsApp</span>
            <div class="info-val"><a href="tel:${E(c.shopPhone)}" style="color:var(--br);text-decoration:none;font-weight:600">+${E(c.shopPhone)}</a></div>
          </div>
        </li>
        <li class="info-item">
          <span class="info-icon">💳</span>
          <div style="flex:1">
            <span class="info-lbl">Instant UPI & QR Payments</span>
            <div class="info-val"><code style="font-size:0.8rem;background:var(--sf);padding:2px 6px;border-radius:4px">${E(c.upi)}</code> · Scan QR / Pay at Shop</div>
          </div>
        </li>
      `;
    }

    if ($("mapl")) $("mapl").href = c.map;
    if ($("fmap")) $("fmap").href = c.map;
    if ($("fwa")) $("fwa").href = "https://wa.me/" + c.shopPhone;
    if ($("wal")) $("wal").href = "https://wa.me/" + c.shopPhone;
    if ($("foot")) $("foot").textContent = `© 2026 SAIFA DESIGNS · Ladies Tailor & Boutique · ${c.hours}`;

    const fsbox = $("fsbox");
    if (fsbox && !fsbox.dataset.ok) {
      fsbox.innerHTML = sForm("fs", false);
      fsbox.dataset.ok = 1;
    }
    this.saveCart();
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
        MEAS.forEach((m, i) => {
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
      ${MEAS.map((m, i) => `
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
  MEAS.forEach((measName, i) => {
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
      MEAS.forEach((_, i) => {
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
