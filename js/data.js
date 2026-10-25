// ==========================================
// SAIFA DESIGNS – DATA & CONSTANTS
// ==========================================

const MEAS = ["Bust", "Waist", "Hip", "Length", "Shoulder", "Sleeve"];
const ST = ["New", "Confirmed", "Stitching", "Ready", "Out for delivery", "Delivered", "Cancelled"];
const PAY = ["Unpaid", "Claimed", "Paid"];
const PAY_MODES = ["UPI", "Cash on Delivery", "Pay at Shop", "Bank Transfer"];

const CRAFT_ROLES = [
  "Master Cutting & Pattern Master",
  "Blouse & Choli Specialist",
  "Salwar Suit & Kurti Tailor",
  "Bridal Lehenga & Anarkali Specialist",
  "Zardozi & Resham Hand Embroidery",
  "Machine Embroidery & Aari Work",
  "Pico, Fall, Hemming & Latkan Finishing",
  "Alterations & Custom Fitting Master",
  "Client Measurement & Styling Associate",
  "Other (Specify Custom Craft...)"
];

const WORK_PROGRESS_STAGES = [
  "Cutting & Pattern Drafting",
  "Core Stitching & Assembly",
  "Embroidery & Hand Detailing",
  "Latkan, Pico & Hem Finishing",
  "Master Quality Check",
  "Ready for Trial & Delivery"
];

const MATERIAL_SUBCATS = [
  "All Materials",
  "Pure Silk & Banarasi",
  "Flowy Georgette & Chiffon",
  "Breathable Cotton & Linen",
  "Embroidered Organza & Net"
];

const READYMADE_SUBCATS = [
  "All Readymade",
  "Bridal & Party Lehengas",
  "Designer Salwar Suits",
  "Anarkalis & Kurtis",
  "Pre-pleated Ready Sarees",
  "Readymade Padded Blouses"
];

const DEF = {
  prices: {
    "Blouse": 350,
    "Salwar Suit": 700,
    "Lehenga": 2500,
    "Gown / Anarkali": 1800,
    "Kurti": 450,
    "Saree Fall & Pico": 120,
    "Alteration": 80
  },
  pay: {
    "Blouse": 120,
    "Salwar Suit": 250,
    "Lehenga": 700,
    "Gown / Anarkali": 500,
    "Kurti": 150,
    "Saree Fall & Pico": 30,
    "Alteration": 40,
    "Readymade": 0
  },
  admin: {
    u: "admin",
    p: "saifa@123",
    pHash: "46f8832a8298711cb635c94ebc4fae4a773e35a1a1f0a28fbe54b8d80f81d58e" // SHA-256 for saifa@123
  },
  upi: "saifadesigns@okhdfcbank",
  payee: "SAIFA DESIGNS",
  shopPhone: "919999999999",
  address: "Shop No. 12, Gulshan Market, Main Road, New Delhi 110025",
  shopStatus: "Auto", // "Auto" (follows opening hours & Monday closure), "Online" (Force Open), "Offline" (Force Closed)
  openTime: "10:30",  // 10:30 AM
  closeTime: "21:00", // 9:00 PM
  mondayClosed: true, // Automatic Monday closure
  hours: "Tue–Sun 10:30 AM – 9:00 PM (Monday Atelier Rest Day)",
  offlineNotice: "Our boutique atelier is currently closed. We reopen at 10:30 AM. You can still explore fabrics, customize measurements, and save your fitting profile!",
  map: "https://maps.google.com/?q=Saifa+Designs",
  offer: "🎉 Festive Offer: Use code FESTIVE10 for 10% off on all readymade collections!",
  qrImage: "" // Custom uploaded UPI QR code
};

const SEED_PROD = [
  {
    id: "s1",
    name: "Banarasi Silk Material",
    cat: "Material",
    subcat: "Pure Silk & Banarasi",
    price: 1800,
    stock: 25,
    fabric: "Pure silk, 2.5m",
    colors: "Maroon, Gold",
    sizes: "2.5 m",
    desc: "Rich golden zari weave on fine silk, ideal for bridal blouses, party lehengas and festive dupattas.",
    em: "🧵",
    hx: "#8e1647",
    img: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "s2",
    name: "Georgette Suit Material",
    cat: "Material",
    subcat: "Flowy Georgette & Chiffon",
    price: 950,
    stock: 40,
    fabric: "Georgette, 3-pc",
    colors: "Teal, Pink",
    sizes: "3-pc set",
    desc: "Flowy, lightweight party material with intricate digital prints and dyed matching dupatta.",
    em: "🧶",
    hx: "#0f6b5c",
    img: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "s3",
    name: "Cotton Printed Material",
    cat: "Material",
    subcat: "Breathable Cotton & Linen",
    price: 650,
    stock: 60,
    fabric: "Soft breathable cotton",
    colors: "Indigo, Mustard",
    sizes: "3-pc set",
    desc: "Comfortable handblock printed Jaipur cotton material, perfect for daily and summer office wear.",
    em: "🌸",
    hx: "#d9622b",
    img: "https://images.unsplash.com/photo-1609357605129-26f69add5d6e?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "s9",
    name: "Embroidered Organza Tissue Fabric",
    cat: "Material",
    subcat: "Embroidered Organza & Net",
    price: 1350,
    stock: 20,
    fabric: "Sheer Organza Silk with Resham Embroidery, 3m",
    colors: "Lavender, Rose Gold",
    sizes: "3.0 m",
    desc: "Crisp ethereal organza fabric studded with delicate floral resham embroidery and scalloped borders.",
    em: "✨",
    hx: "#9c27b0",
    img: "https://images.unsplash.com/photo-1610030469668-935a8947e25d?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "s4",
    name: "Embroidered Anarkali Kurti",
    cat: "Readymade",
    subcat: "Anarkalis & Kurtis",
    price: 1450,
    stock: 15,
    fabric: "Rayon + resham threadwork",
    colors: "Wine, Navy",
    sizes: "S, M, L, XL, XXL",
    desc: "Floor-length flowy Anarkali silhouette with heavy neckline embroidery and side potli ties.",
    em: "👗",
    hx: "#7a2a78",
    img: "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "s5",
    name: "Designer Salwar Suit",
    cat: "Readymade",
    subcat: "Designer Salwar Suits",
    price: 2200,
    stock: 10,
    fabric: "Chanderi silk with lining",
    colors: "Peach, Mint",
    sizes: "M, L, XL",
    desc: "Ready-to-wear 3-piece Chanderi suit paired with embroidered organza dupatta and cigarette pants.",
    em: "👘",
    hx: "#2a8f7a",
    img: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "s6",
    name: "Bridal Lehenga Choli",
    cat: "Readymade",
    subcat: "Bridal & Party Lehengas",
    price: 12500,
    stock: 4,
    fabric: "Micro velvet + Net flare",
    colors: "Crimson Red, Antique Gold",
    sizes: "Semi-stitched (Free size)",
    desc: "Grand bridal lehenga with heavy zardozi hand embroidery, double dupatta set and layered can-can.",
    em: "👰",
    hx: "#b3122e",
    img: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "s7",
    name: "Pleated Ready Saree",
    cat: "Readymade",
    subcat: "Pre-pleated Ready Sarees",
    price: 1650,
    stock: 12,
    fabric: "Satin silk finish",
    colors: "Dusty Rose, Emerald",
    sizes: "Free size (Waist 28–42)",
    desc: "One-minute pre-pleated cocktail saree with stitched waistband and matching unstitched blouse piece.",
    em: "🥻",
    hx: "#d1517f",
    img: "https://images.unsplash.com/photo-1610030469668-935a8947e25d?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "s8",
    name: "Padded Readymade Blouse",
    cat: "Readymade",
    subcat: "Readymade Padded Blouses",
    price: 550,
    stock: 30,
    fabric: "Cotton stretch lycra",
    colors: "Black, Gold, Maroon",
    sizes: "Bust 32–42 extendable",
    desc: "Comfort fit padded blouse with front hooks, deep round neck and internal 2-inch alteration margins.",
    em: "👚",
    hx: "#444",
    img: "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=600&q=80"
  }
];

const SEED_TEAM = [
  {
    id: "t1",
    name: "Saifa Khatun",
    role: "Founder & Creative Director",
    bio: "Over 18 years shaping modest high-fashion and bespoke tailoring for ladies across India.",
    em: "👩‍💼",
    ord: 1,
    img: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80"
  },
  {
    id: "t2",
    name: "Farhan Siddiqui",
    role: "Store & Operations Manager",
    bio: "Ensures punctual delivery, inventory quality checks and VIP customer assistance.",
    em: "🧑‍💼",
    ord: 2,
    img: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=300&q=80"
  },
  {
    id: "t3",
    name: "Master Aslam Khan",
    role: "Chief Pattern & Cutting Master",
    bio: "Specialist in bridal lehengas, princess cut blouses, and accurate fit drafting.",
    em: "🧵",
    ord: 3,
    img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80"
  }
];

const SEED_WORKERS = [
  {
    id: "w1",
    name: "Master Aslam",
    wid: "w101@saifadesigns",
    pin: "15081988", // DOB DDMMYYYY format
    dob: "1988-08-15",
    aadhaar: "839210492817",
    address: "H-42, Batla House, Jamia Nagar, Okhla, New Delhi 110025",
    role: "Master Cutting & Pattern Master",
    phone: "9811223344",
    status: "Active",
    joined: "2023-01-10",
    wages: { "Blouse": 140, "Salwar Suit": 270, "Lehenga": 750, "Gown / Anarkali": 550, "Kurti": 160, "Saree Fall & Pico": 35, "Alteration": 45 },
    img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80"
  },
  {
    id: "w2",
    name: "Zoya Begum",
    wid: "w102@saifadesigns",
    pin: "24051994", // DOB DDMMYYYY format
    dob: "1994-05-24",
    aadhaar: "749201948271",
    address: "Plot 18, Gali No. 3, Zakir Nagar, New Delhi 110025",
    role: "Zardozi & Resham Hand Embroidery",
    phone: "9822334455",
    status: "Active",
    joined: "2023-05-18",
    wages: { "Blouse": 120, "Salwar Suit": 250, "Lehenga": 700, "Gown / Anarkali": 500, "Kurti": 150, "Saree Fall & Pico": 30, "Alteration": 40 },
    img: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80"
  },
  {
    id: "w3",
    name: "Raju Tailor",
    wid: "w103@saifadesigns",
    pin: "10111991", // DOB DDMMYYYY format
    dob: "1991-11-10",
    aadhaar: "629184729182",
    address: "Flat 102, Noor Nagar Extension, New Delhi 110025",
    role: "Salwar Suit & Kurti Tailor",
    phone: "9833445566",
    status: "Active",
    joined: "2023-09-01",
    wages: { "Blouse": 120, "Salwar Suit": 250, "Lehenga": 700, "Gown / Anarkali": 500, "Kurti": 150, "Saree Fall & Pico": 30, "Alteration": 40 },
    img: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80"
  }
];

const SEED_COUPONS = [
  {
    id: "cp1",
    code: "FESTIVE10",
    type: "percent",
    val: 10,
    minOrder: 500,
    maxUses: 150,
    usedCount: 28,
    validTill: "2026-12-31",
    active: true,
    desc: "10% off on all items above ₹500"
  },
  {
    id: "cp2",
    code: "BRIDAL500",
    type: "flat",
    val: 500,
    minOrder: 3000,
    maxUses: 50,
    usedCount: 12,
    validTill: "2026-12-31",
    active: true,
    desc: "Flat ₹500 discount on bridal & premium stitching above ₹3000"
  },
  {
    id: "cp3",
    code: "WELCOME50",
    type: "flat",
    val: 50,
    minOrder: 300,
    maxUses: 200,
    usedCount: 64,
    validTill: "2026-12-31",
    active: true,
    desc: "Flat ₹50 off for new boutique visitors"
  }
];

const SEED_ORDERS = [
  {
    id: "ord_demo_1",
    no: "SD4K9XQ",
    type: "Stitch",
    customer: "Ayesha Khan",
    phone: "9811223344",
    address: "Boutique Pickup & Fitting Trial, New Delhi",
    mapsUrl: "https://maps.google.com/?q=Saifa+Designs",
    garment: "Bridal Lehenga & Handcrafted Blouse",
    fabric: "Pure Banarasi Silk with Golden Zari",
    measure: { Bust: "36", Waist: "30", Hip: "40", Length: "42", Shoulder: "15", Sleeve: "17" },
    note: "Princess cut blouse, deep back with heavy handcrafted latkans and matching lining.",
    due: "2026-11-10",
    pay: "UPI",
    total: 3500,
    paid: "Paid",
    status: "Stitching",
    stage: "Embroidery & Hand Detailing",
    worker: "w1",
    workerVerified: true,
    stageNote: "Zardozi border embroidery and sleeve sequin detailing in master atelier.",
    ts: Date.now() - 86400000 * 2,
    history: [
      { status: "New", at: Date.now() - 86400000 * 2, note: "Order placed online" },
      { status: "Stitching", at: Date.now() - 86400000 * 1, note: "Cutting completed, hand embroidery in progress" }
    ]
  },
  {
    id: "ord_demo_2",
    no: "SD7M2B9",
    type: "Stitch",
    customer: "Fatima Zehra",
    phone: "9822334455",
    address: "Boutique Trial & Delivery, Jamia Nagar, New Delhi",
    mapsUrl: "https://maps.google.com/?q=Jamia+Nagar+New+Delhi",
    garment: "Designer Anarkali Suit",
    fabric: "Georgette with Silk Inner",
    measure: { Bust: "38", Waist: "32", Hip: "42", Length: "48", Shoulder: "15.5", Sleeve: "19" },
    note: "Floor-length flair with delicate neckline piping and organza dupatta hem.",
    due: "2026-11-05",
    pay: "UPI",
    total: 2100,
    paid: "Paid",
    status: "Ready",
    stage: "Ready for Trial & Delivery",
    worker: "w2",
    workerVerified: true,
    stageNote: "Final master pressing completed. Ready for trial fitting.",
    ts: Date.now() - 86400000 * 4,
    history: [
      { status: "New", at: Date.now() - 86400000 * 4, note: "Order placed" },
      { status: "Stitching", at: Date.now() - 86400000 * 3, note: "Stitching assembly started" },
      { status: "Ready", at: Date.now() - 86400000 * 1, note: "Finished and ready for customer pickup" }
    ]
  }
];

