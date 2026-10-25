// ==========================================
// SAIFA DESIGNS – SMART AI SUITE
// ==========================================

const AI = {
  // 1. Core prompt evaluator (Claude API with intelligent local fallback)
  async ask(prompt, systemContext = "") {
    if (typeof sample === "function") {
      try {
        let full = systemContext ? systemContext + "\n\n" + prompt : prompt;
        const res = await sample(full, { cache: false });
        if (res && res.text) return res.text;
      } catch (e) {}
    }
    return null; // Signals to use built-in smart generative logic
  },

  // 2. Front-end Fashion & Outfit Stylist
  async getStylingAdvice(userQuery) {
    const q = (userQuery || "").toLowerCase();
    const prods = products();

    // Check if Claude is available
    const prompt = `You are the lead luxury stylist at SAIFA DESIGNS, a premium Indian ladies' tailor & boutique.
Catalogue: ${prods.map(p => `${p.name} (${p.cat}, ₹${p.price}, ${p.colors}, fabric: ${p.fabric})`).join("; ")}.
Customer asks: "${userQuery}".
Provide an encouraging, culturally nuanced fashion consultation in under 120 words mentioning matching jewellery, footwear, dupatta draping, and whether custom stitching is advised.`;

    const aiRes = await this.ask(prompt);
    if (aiRes) return aiRes;

    // Smart Local Boutique Consultant Engine
    let matches = prods.filter(p => {
      const text = (p.name + " " + p.cat + " " + p.fabric + " " + p.colors + " " + p.desc).toLowerCase();
      return q.split(/\s+/).some(word => word.length > 2 && text.includes(word));
    });

    if (!matches.length) matches = prods.slice(0, 3);
    const top = matches[0];

    const accessories = [
      "antique gold chandbalis and embroidered mojris",
      "kundan choker set with sleek glass bangles",
      "pearl drop earrings and a raw silk potli bag",
      "oxidized silver jhumkis and a classic leather clutch"
    ];
    const acc = accessories[Math.floor(Math.random() * accessories.length)];

    return `✨ **Saifa Stylist Recommendation:**
Based on your choice, we love the **${top.name}** (${R(top.price)} in ${top.colors}). 
- **Occasion:** Perfect for festive gatherings, family weddings, or dinner soirees.
- **Pairing:** Style this with ${acc}.
- **Tailoring Tip:** We recommend a boat-neck or sweetheart neckline with delicate piping. Our master tailor can customize the sleeves and fit to perfection within 5–7 days!`;
  },

  // 3. Automated Fabric Meterage & Tailoring Calculator
  calculateFabric(garment, height = 64, bust = 36, options = {}) {
    const g = (garment || "").toLowerCase();
    let mainFabric = 2.5;
    let asterLining = 2.0;
    let canCan = 0;
    let laceBorder = 3.0;
    let advice = "";

    if (g.includes("lehenga")) {
      const flare = options.flare || "Grand 4-Meter Flare";
      mainFabric = options.heavyFlare ? 6.0 : 4.5;
      asterLining = 3.5;
      canCan = 2.5;
      laceBorder = 5.5;
      advice = `For a ${bust}" bust and ${height}" height with ${flare}, we recommend 80 GSM canvas for waist belt stiffness and 2 layers of nylon can-can for volume.`;
    } else if (g.includes("anarkali") || g.includes("gown")) {
      mainFabric = 4.0;
      asterLining = 3.0;
      laceBorder = 4.0;
      advice = `Floor-length flared gown with 16-kali cutting requires minimum 44" width fabric. Crepe or butter silk recommended for lining.`;
    } else if (g.includes("blouse")) {
      mainFabric = bust > 38 ? 1.0 : 0.85;
      asterLining = mainFabric;
      laceBorder = 1.5;
      advice = `Princess cut padded blouse with elbow sleeves. Requires 0.85m to 1m pure cotton aster lining for breathable sweat absorption.`;
    } else if (g.includes("salwar") || g.includes("suit")) {
      mainFabric = 4.5; // Top 2.5m + Bottom 2m
      asterLining = 2.5;
      laceBorder = 2.5;
      advice = `Straight kurti with Afghani/Pant bottom. Include 0.5m extra if planning designer bell sleeves or organza cuffs.`;
    } else {
      mainFabric = 2.5;
      asterLining = 2.0;
      advice = `Standard pattern requirement based on average Indian women's height proportions.`;
    }

    return {
      garment,
      mainFabricMeters: mainFabric,
      asterLiningMeters: asterLining,
      canCanMeters: canCan,
      laceBorderMeters: laceBorder,
      advice
    };
  },

  // 4. AI Business Intelligence & Health Audit
  async generateBusinessAudit() {
    const os = orders();
    const rev = os.reduce((a, x) => a + (Number(x.total) || 0), 0);
    const openOrders = os.filter(x => !["Delivered", "Cancelled"].includes(x.status));
    const stitchingOrders = os.filter(x => x.type === "Stitch" && x.status !== "Delivered");
    const lowStock = products().filter(p => p.stock < 5);
    const claimedPayments = os.filter(x => x.paid === "Claimed");
    const totalCusts = custs().length;

    const prompt = `You are an elite Indian fashion retail & boutique management consultant.
Orders count: ${os.length}, Total revenue: ₹${rev}, Open active orders: ${openOrders.length}, Stitching queue: ${stitchingOrders.length},
Low stock garments: ${lowStock.map(p => p.name + `(${p.stock})`).join(", ") || "None"},
Unverified claimed UPI payments: ${claimedPayments.length}, Total registered clients: ${totalCusts}.
Provide a sharp, 5-point strategic audit:
1. Cash Flow & Verification
2. Stitching Bottlenecks
3. Stock Reorder Priority
4. Festive Demand Projection
5. Loyalty & Re-order retention.
Keep concise under 180 words.`;

    const aiRes = await this.ask(prompt);
    if (aiRes) return aiRes;

    // High quality intelligent local evaluation
    const avgOrderVal = os.length ? Math.round(rev / os.length) : 0;
    return `📊 **SAIFA DESIGNS Strategic Business Audit:**

1. **Revenue & Average Basket:** Total earned is ${R(rev)} across ${os.length} orders (Avg Order Value: ${R(avgOrderVal)}). High-margin stitching accounts for significant profitability.
2. **Payment Verification:** ${claimedPayments.length} order(s) are currently marked as "Claimed" by customers. Verify your bank SMS/UPI app and transition these to "Paid" to avoid processing delays.
3. **Production Pipeline:** ${stitchingOrders.length} bespoke stitching orders are in queue. Ensure tailors prioritize orders with deadlines falling in the next 48 hours.
4. **Inventory Health:** ${lowStock.length ? `⚠️ ${lowStock.length} items are running low on stock (${lowStock.map(p => p.name).join(", ")}). Reorder silk & georgette bundles before wedding rush.` : "✅ Material and ready-to-wear inventory levels are healthy."}
5. **Customer Retention:** You have ${totalCusts} repeat customer profile(s) with saved measurements. Broadcast your active coupons to stimulate pre-festive reorders.`;
  },

  // 5. WhatsApp Marketing Broadcast Drafter
  generateWhatsAppCampaign(campaignType = "festive", couponCode = "FESTIVE10") {
    const shop = S.cfg;
    if (campaignType === "wedding") {
      return `✨ *EXCLUSIVE BRIDAL & WEDDING WEAR AT SAIFA DESIGNS* ✨

Dear Valued Customer,
Planning your special look for upcoming wedding functions? From bespoke bridal lehengas to hand-embroidered party suits, your perfect fit awaits!

🌟 *Special Boutique Offer:*
Use Coupon Code: *${couponCode}* to get instant discounts on your order!
🧵 Saved measurements on file: No re-measurement needed!
📍 Visit us: ${shop.address}
📞 Inquiries & Booking: +${shop.shopPhone}

Tap here to browse designs: ${window.location.href.split('#')[0]}#shop`;
    }

    if (campaignType === "ready") {
      return `👗 *JUST ARRIVED: NEW READYMADE SUITS & SAREES* 👗

Refresh your festive wardrobe with SAIFA DESIGNS' newest designer collection:
✔️ Pure Banarasi Silk & Breathable Georgette
✔️ Pre-pleated 1-Minute Sarees
✔️ Free minor alterations included!

🎁 Use code *${couponCode}* at checkout.
Order today with instant UPI payment & door delivery:
${window.location.href.split('#')[0]}`;
    }

    // Default festive
    return `🎉 *SAIFA DESIGNS FESTIVE CELEBRATION SALE!* 🎉

Get ready for celebrations with customized suits, kurtis and designer lehengas tailored to your exact measurements!

✂️ Special Festive Discount:
Apply coupon *${couponCode}* during checkout for exclusive savings!
💬 Need styling advice? Reply directly to this WhatsApp message or visit our boutique.
📍 ${shop.address}
⏱ Hours: ${shop.hours}`;
  },

  // 6. Customer Order Update Message Drafter
  draftCustomerUpdate(order, messageType = "ready") {
    if (!order) return "";
    const name = order.customer || "Valued Customer";
    const no = order.no;
    const shop = S.cfg;

    if (messageType === "ready") {
      return `Salaam / Hello ${name} Ji! 🌸
Good news! Your order *#${no}* (${order.type === 'Stitch' ? order.garment : 'Boutique Order'}) is *READY* for trial & pickup at SAIFA DESIGNS.

📍 Address: ${shop.address}
🕙 Timing: ${shop.hours}
We look forward to seeing you! Let us know if you need home delivery instead.`;
    }

    if (messageType === "delivered") {
      return `Hello ${name} Ji,
Your order *#${no}* has been successfully delivered! We hope you love the fit and finish. 👗✨

Your measurements are securely saved under Customer ID *${order.cid}* for seamless future bookings. Minor alteration support is always available. Thank you for choosing SAIFA DESIGNS!`;
    }

    if (messageType === "stitching") {
      return `Hello ${name} Ji,
Our master tailor has started cutting and stitching your ${order.garment} (Order *#${no}*). Target completion date is ${order.due || 'this week'}. You can track status anytime on our website using your order ID. Thank you!`;
    }

    // Default status update
    return `Hello ${name} Ji, update from SAIFA DESIGNS: Your order *#${no}* is currently in *${order.status}* status. Payment status: ${order.paid}. Order total: ${R(order.total)}. For any queries, contact us at +${shop.shopPhone}.`;
  },

  // 7. Procedural Cloth / Fabric Pattern Generator
  // Generates a rich SVG data URL of Indian ethnic garments & fabrics
  generateClothSvg(garmentType, primaryColor = "#8e1647", accentColor = "#d9a93a") {
    const g = (garmentType || "").toLowerCase();
    let motif = "";
    
    // Create floral / paisley zari motifs
    for (let i = 0; i < 6; i++) {
      const cy = 60 + i * 45;
      motif += `<circle cx="80" cy="${cy}" r="12" fill="none" stroke="${accentColor}" stroke-width="2" opacity="0.7"/>
                <path d="M 80 ${cy-18} Q 100 ${cy} 80 ${cy+18} Q 60 ${cy} 80 ${cy-18}" fill="${accentColor}" opacity="0.35"/>
                <circle cx="220" cy="${cy}" r="12" fill="none" stroke="${accentColor}" stroke-width="2" opacity="0.7"/>
                <path d="M 220 ${cy-18} Q 240 ${cy} 220 ${cy+18} Q 200 ${cy} 220 ${cy-18}" fill="${accentColor}" opacity="0.35"/>`;
    }

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 350" width="300" height="350">
      <defs>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${primaryColor}" />
          <stop offset="60%" stop-color="${primaryColor}" stop-opacity="0.85" />
          <stop offset="100%" stop-color="#1a0a14" />
        </linearGradient>
        <linearGradient id="goldLace" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="${accentColor}" />
          <stop offset="50%" stop-color="#fff2a8" />
          <stop offset="100%" stop-color="${accentColor}" />
        </linearGradient>
      </defs>
      <!-- Fabric Base -->
      <rect width="300" height="350" fill="url(#bgGrad)" rx="16"/>
      
      <!-- Weave Texture Lines -->
      <g stroke="#ffffff" stroke-width="0.5" opacity="0.08">
        ${Array.from({length: 35}).map((_, i) => `<line x1="0" y1="${i*10}" x2="300" y2="${i*10}"/>`).join("")}
      </g>

      <!-- Embroidery / Zari Borders -->
      <rect x="0" y="300" width="300" height="50" fill="url(#goldLace)" opacity="0.88"/>
      <line x1="0" y1="300" x2="300" y2="300" stroke="#fff" stroke-width="1.5"/>
      <line x1="0" y1="345" x2="300" y2="345" stroke="#fff" stroke-width="1.5"/>
      
      <!-- Motif Elements -->
      ${motif}

      <!-- Center Silhouette Badge -->
      <g transform="translate(110, 110)">
        <circle cx="40" cy="40" r="46" fill="#000000" opacity="0.25"/>
        <circle cx="40" cy="40" r="42" fill="none" stroke="url(#goldLace)" stroke-width="3"/>
        <text x="40" y="48" font-size="34" text-anchor="middle" fill="#ffffff">${g.includes("lehenga") ? "👰" : g.includes("saree") ? "🥻" : g.includes("kurti") ? "👗" : "🧵"}</text>
      </g>
      
      <!-- Tag Overlay -->
      <rect x="18" y="18" width="130" height="24" rx="12" fill="#ffffff" opacity="0.9"/>
      <text x="83" y="34" font-family="sans-serif" font-size="11" font-weight="bold" text-anchor="middle" fill="${primaryColor}">AI DESIGN FABRIC</text>
    </svg>`;

    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }
};
