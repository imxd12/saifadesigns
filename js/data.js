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
  offer: "✨ Bespoke Ladies Tailoring, Designer Suits & Luxury Fabrics · Welcome to Saifa Designs!",
  qrImage: "", // Custom uploaded UPI QR code
  materialSubcats: [
    "Pure Silk & Banarasi",
    "Flowy Georgette & Chiffon",
    "Breathable Cotton & Linen",
    "Embroidered Organza & Net"
  ],
  readymadeSubcats: [
    "Bridal & Party Lehengas",
    "Designer Salwar Suits",
    "Anarkalis & Kurtis",
    "Pre-pleated Ready Sarees",
    "Readymade Padded Blouses"
  ],
  measurements: ["Bust", "Waist", "Hip", "Length", "Shoulder", "Sleeve"]
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

const SEED_TEAM = [];
const SEED_WORKERS = [];
const SEED_COUPONS = [];
const SEED_ORDERS = [];


