const express = require('express');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const dns = require('dns').promises;
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const { MongoClient } = require('mongodb');
require('dotenv').config();
const app = express();

app.get('/sitemap.xml', (req, res) => {
  res.status(200);
  res.set({
    'Content-Type': 'application/xml; charset=utf-8',
    'Cache-Control': 'no-cache'
  });

  const today = new Date().toISOString().split('T')[0];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">

  <url>
    <loc>https://vasukinfc.in/</loc>
    <lastmod>${today}</lastmod>
    <priority>1.0</priority>
  </url>

  <url>
    <loc>https://vasukinfc.in/collection.html</loc>
    <lastmod>${today}</lastmod>
    <priority>0.9</priority>
  </url>

  <url>
    <loc>https://vasukinfc.in/design.html</loc>
    <lastmod>${today}</lastmod>
    <priority>0.7</priority>
  </url>

  <url>
    <loc>https://vasukinfc.in/track-order.html</loc>
    <lastmod>${today}</lastmod>
    <priority>0.7</priority>
  </url>

  <url>
    <loc>https://vasukinfc.in/nfc-business-card-jaipur.html</loc>
    <lastmod>${today}</lastmod>
    <priority>0.9</priority>
  </url>

  <url>
    <loc>https://vasukinfc.in/digital-visiting-card-jaipur.html</loc>
    <lastmod>${today}</lastmod>
    <priority>0.8</priority>
  </url>

  <url>
    <loc>https://vasukinfc.in/google-review-card.html</loc>
    <lastmod>${today}</lastmod>
    <priority>0.8</priority>
  </url>

  <url><loc>https://vasukinfc.in/nfc-card-printing-jaipur.html</loc><lastmod>${today}</lastmod><priority>0.9</priority></url>
  <url><loc>https://vasukinfc.in/google-review-stand-jaipur.html</loc><lastmod>${today}</lastmod><priority>0.8</priority></url>
  <url><loc>https://vasukinfc.in/hotel-key-card-printing-jaipur.html</loc><lastmod>${today}</lastmod><priority>0.8</priority></url>
  <url><loc>https://vasukinfc.in/nfc-ring-jaipur.html</loc><lastmod>${today}</lastmod><priority>0.8</priority></url>
  <url><loc>https://vasukinfc.in/custom-tshirt-printing-jaipur.html</loc><lastmod>${today}</lastmod><priority>0.7</priority></url>

  <url>
    <loc>https://vasukinfc.in/metal-nfc-card.html</loc>
    <lastmod>${today}</lastmod>
    <priority>0.8</priority>
  </url>

  <url>
    <loc>https://vasukinfc.in/qr-business-card.html</loc>
    <lastmod>${today}</lastmod>
    <priority>0.8</priority>
  </url>

  <url>
    <loc>https://vasukinfc.in/founder.html</loc>
    <lastmod>${today}</lastmod>
    <priority>0.7</priority>
  </url>

  <url>
    <loc>https://vasukinfc.in/contact.html</loc>
    <lastmod>${today}</lastmod>
    <priority>0.7</priority>
  </url>

</urlset>`;

  res.send(sitemap);
});

app.get('/robots.txt', (req, res) => {
  res.status(200);
  res.set({
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
  });

  res.send(`User-agent: *
Allow: /

Disallow: /login.html
Disallow: /register.html
Disallow: /admin.html
Disallow: /admin-panel.html
Disallow: /admin-login.html

Sitemap: https://vasukinfc.in/sitemap.xml`);
});

app.get('/products.html', (req, res) => {
  res.redirect(301, '/collection.html');
});

app.get('/colection.html', (req, res) => {
  res.redirect(301, '/collection.html');
});

app.get('/desin.html', (req, res) => {
  res.redirect(301, '/design.html');
});

app.use(express.json({ limit: '15mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;
const KEY_ID = process.env.RAZORPAY_KEY_ID;
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'vasukinfc@gmail.com';
const ADMIN_WHATSAPP = process.env.ADMIN_WHATSAPP || '';
const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_SECURE = String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER || ADMIN_EMAIL;
const BREVO_API_KEY = process.env.BREVO_API_KEY || '';
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || '';
const WHATSAPP_API_VERSION = process.env.WHATSAPP_API_VERSION || 'v20.0';
const STORE_NAME = 'VASUKI NFC';
const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');
const AUTH_SECRET = process.env.AUTH_SECRET || KEY_SECRET || 'vasuki-dev-secret-change-this';

// MongoDB Atlas
const MONGODB_URI = process.env.MONGODB_URI || '';
const DB_NAME = process.env.MONGODB_DB_NAME || 'vasukinfc';
let mongoClient;
let db;
let usersCollection;
let ordersCollection;

async function connectMongo() {
  if (!MONGODB_URI) {
    console.warn('⚠️ MongoDB skipped. Add MONGODB_URI in Render Environment. JSON fallback will be used.');
    return null;
  }

  if (db) return db;

  mongoClient = new MongoClient(MONGODB_URI, {
    serverSelectionTimeoutMS: 15000,
    connectTimeoutMS: 15000,
    socketTimeoutMS: 45000
  });

  await mongoClient.connect();
  db = mongoClient.db(DB_NAME);
  usersCollection = db.collection('users');
  ordersCollection = db.collection('orders');

  await usersCollection.createIndex({ id: 1 }, { unique: true });
  await usersCollection.createIndex({ mobile: 1 }, { unique: true, sparse: true });
  await usersCollection.createIndex({ emailLower: 1 }, { unique: true, sparse: true });
  await ordersCollection.createIndex({ localOrderId: 1 }, { unique: true });
  await ordersCollection.createIndex({ razorpayOrderId: 1 });
  await ordersCollection.createIndex({ token: 1 }, { unique: true, sparse: true });
  await ordersCollection.createIndex({ userId: 1 });
  await ordersCollection.createIndex({ 'customer.mobile': 1 });

  console.log('✅ MongoDB connected');
  return db;
}

const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
app.use('/uploads', express.static(UPLOADS_DIR));

if (!KEY_ID || !KEY_SECRET) {
  console.warn('⚠️ Razorpay keys missing. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in Render Environment Variables.');
}

const razorpay = new Razorpay({ key_id: KEY_ID || 'missing_key_id', key_secret: KEY_SECRET || 'missing_key_secret' });
const RAZORPAY_MODE = KEY_ID
  ? KEY_ID.startsWith('rzp_live_')
    ? 'LIVE'
    : KEY_ID.startsWith('rzp_test_')
      ? 'TEST'
      : 'UNKNOWN'
  : 'NOT_CONFIGURED';

console.log(`💳 Razorpay mode: ${RAZORPAY_MODE}`);
const PRODUCT_PRICES = new Map([
  ['Digital Profile Only', { price: 499, unit: 'pc' }],
  ['Basic QR Card', { price: 599, unit: 'pc' }],
  ['QR Code Visiting Card', { price: 599, unit: 'pc' }],
  ['Normal Visiting Card', { price: 599, unit: 'pc' }],
  ['Premium NFC Card', { price: 1199, unit: 'pc' }],
  ['Premium Visiting Card', { price: 1199, unit: 'pc' }],
  ['Google Review NFC Card', { price: 449, unit: 'pc' }],
  ['Instagram NFC Card', { price: 449, unit: 'pc' }],
  ['WhatsApp NFC Card', { price: 449, unit: 'pc' }],
  ['Shop Owner Smart Card', { price: 1299, unit: 'pc' }],
  ['QR Stand', { price: 1299, unit: 'pc' }],
  ['Google Review Stand', { price: 1299, unit: 'pc' }],
  ['Google Review Stand / QR Stand', { price: 1299, unit: 'pc' }],
  ['Restaurant QR Menu Card', { price: 1499, unit: 'pc' }],
  ['NFC Ring', { price: 1499, unit: 'pc' }],
  ['Wooden NFC Card', { price: 1599, unit: 'pc' }],
  ['Metal NFC Card', { price: 1999, unit: 'pc' }],
  ['Metal Visiting Card', { price: 1999, unit: 'pc' }],
  ['VASUKI NFC Matte Grey', { price: 1199, unit: 'pc' }],
  ['VASUKI NFC™ Matte Grey', { price: 1199, unit: 'pc' }],
  ['VASUKI NFC Business Pro', { price: 1299, unit: 'pc' }]
]);

const DELIVERY_CHARGE = 79;
const FAST_DELIVERY_EXTRA = 99;

const ORDERS_FILE = path.join(__dirname, 'orders.json');
const USERS_FILE = path.join(__dirname, 'users.json');

function readOrders() {
  if (!fs.existsSync(ORDERS_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8')); } catch { return []; }
}
function writeOrders(orders) { fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2)); }
function readUsers() {
  if (!fs.existsSync(USERS_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')); } catch { return []; }
}
function writeUsers(users) { fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2)); }

function cleanPhone(phone = '') { return String(phone).replace(/\D/g, ''); }
function validateIndianMobile(phone = '') {
  const mobile = cleanPhone(phone);
  if (!/^[6-9]\d{9}$/.test(mobile)) throw new Error('Please enter a valid 10 digit Indian mobile number');
  return mobile;
}
function normalizeEmail(email = '') { return String(email || '').trim().toLowerCase(); }

const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'mailinator.com','tempmail.com','temp-mail.org','10minutemail.com','guerrillamail.com',
  'yopmail.com','trashmail.com','getnada.com','sharklasers.com','fakeinbox.com',
  'throwawaymail.com','maildrop.cc','dispostable.com','moakt.com','mintemail.com',
  'tempmail.net','temp-mail.com','temporary-mail.net','emailondeck.com','mailnesia.com',
  'mailcatch.com','mail.tm','inboxkitten.com','tempmailo.com','1secmail.com',
  '1secmail.net','1secmail.org','burnermail.io','anonaddy.com','simplelogin.com'
]);

function isValidEmailFormat(email = '') {
  const value = normalizeEmail(email);
  if (!value || value.length > 254) return false;
  if (value.includes('..')) return false;
  return /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i.test(value);
}

async function validateRealEmail(email = '') {
  const emailLower = normalizeEmail(email);
  if (!isValidEmailFormat(emailLower)) throw new Error('Please enter a valid email address');
  const domain = emailLower.split('@')[1];
  if (!domain || DISPOSABLE_EMAIL_DOMAINS.has(domain)) throw new Error('Temporary or fake email addresses are not allowed');
  try {
    const records = await dns.resolveMx(domain);
    if (!records || records.length === 0) throw new Error('no mx');
  } catch (err) {
    // Some valid domains may not expose MX but accept mail on A/AAAA. Check those as fallback.
    try {
      const records = await dns.resolve(domain);
      if (!records || records.length === 0) throw new Error('no dns');
    } catch {
      throw new Error('Please enter a real working email address');
    }
  }
  return emailLower;
}
function publicUser(u) {
  return {
    id: u.id,
    fullName: u.fullName,
    mobile: u.mobile,
    email: u.email || '',
    referralCode: u.referralCode || ''
  };
}
function makeReferralCodeCandidate(fullName = '', mobile = '') {
  const namePart = String(fullName || 'USER').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 4) || 'USER';
  const mobilePart = cleanPhone(mobile).slice(-4) || String(Date.now()).slice(-4);
  const randomPart = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `VSK${namePart}${mobilePart}${randomPart}`;
}
async function referralCodeExists(code) {
  if (!code) return false;
  if (usersCollection) return Boolean(await usersCollection.findOne({ referralCode: code }));
  return readUsers().some(u => String(u.referralCode || '').toUpperCase() === String(code).toUpperCase());
}
async function generateUniqueReferralCode(fullName = '', mobile = '') {
  for (let i = 0; i < 10; i += 1) {
    const code = makeReferralCodeCandidate(fullName, mobile);
    if (!(await referralCodeExists(code))) return code;
  }
  return `VSK${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
}
async function ensureReferralCode(user) {
  if (!user) return null;
  if (user.referralCode) return user;
  const referralCode = await generateUniqueReferralCode(user.fullName, user.mobile);
  return updateUserById(user.id, { set: { referralCode } });
}
function normalizeReferralCode(code = '') {
  return String(code || '').trim().toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 24);
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(String(password), salt, 120000, 64, 'sha512').toString('hex');
  return { salt, hash };
}
function createOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}
function hashOtp(email, otp) {
  return crypto.createHash('sha256').update(`${normalizeEmail(email)}:${String(otp)}:${AUTH_SECRET}`).digest('hex');
}
function verifyOtp(email, otp, hash) {
  if (!otp || !hash) return false;
  return crypto.timingSafeEqual(Buffer.from(hashOtp(email, otp)), Buffer.from(hash));
}
async function sendEmailOtp(user, otp) {
  if (!emailReady()) {
    throw new Error('Email OTP service is not configured. Please add BREVO_API_KEY or SMTP details in Render Environment Variables.');
  }
  const html = `<h2>VASUKI NFC Email Verification</h2>
  <p>Hello ${user.fullName || 'Customer'},</p>
  <p>Your email verification OTP is:</p>
  <h1 style="letter-spacing:6px">${otp}</h1>
  <p>This OTP is valid for 10 minutes.</p>
  <p>If you did not create an account, please ignore this email.</p>`;
  await sendEmailNotification('Verify your VASUKI NFC account', html, user.email);
}
function verifyPassword(password, user) {
  if (!user || !user.salt || !user.passwordHash) return false;
  const check = hashPassword(password, user.salt).hash;
  return crypto.timingSafeEqual(Buffer.from(check), Buffer.from(user.passwordHash));
}
function signToken(user) {
  const payload = Buffer.from(JSON.stringify({ uid: user.id, exp: Date.now() + 1000 * 60 * 60 * 24 * 30 })).toString('base64url');
  const sig = crypto.createHmac('sha256', AUTH_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

async function findUserById(id) {
  if (usersCollection) return usersCollection.findOne({ id });
  return readUsers().find(u => u.id === id) || null;
}
async function findUserForLogin(loginId) {
  const emailLower = normalizeEmail(loginId);
  const mobile = cleanPhone(loginId);
  if (usersCollection) {
    return usersCollection.findOne({
      $or: [
        { mobile },
        { emailLower }
      ]
    });
  }
  return readUsers().find(u => u.mobile === mobile || normalizeEmail(u.email) === emailLower) || null;
}
async function findExistingUser({ mobile, email }) {
  const cleanMobile = validateIndianMobile(mobile);
  const emailLower = normalizeEmail(email);
  const conditions = [{ mobile: cleanMobile }];
  if (emailLower) conditions.push({ emailLower });

  if (usersCollection) return usersCollection.findOne({ $or: conditions });
  return readUsers().find(u => u.mobile === cleanMobile || (emailLower && normalizeEmail(u.email) === emailLower)) || null;
}
async function saveUser(user) {
  if (usersCollection) {
    await usersCollection.insertOne(user);
    return user;
  }
  const users = readUsers();
  users.push(user);
  writeUsers(users);
  return user;
}
async function updateUserById(id, patch) {
  if (usersCollection) {
    await usersCollection.updateOne({ id }, { $set: patch.set || {}, $unset: patch.unset || {} });
    return usersCollection.findOne({ id });
  }
  const users = readUsers();
  const index = users.findIndex(u => u.id === id);
  if (index === -1) return null;
  users[index] = { ...users[index], ...(patch.set || {}) };
  Object.keys(patch.unset || {}).forEach(k => delete users[index][k]);
  writeUsers(users);
  return users[index];
}
async function findUserByEmail(email) {
  const emailLower = normalizeEmail(email);
  if (!emailLower) return null;
  if (usersCollection) return usersCollection.findOne({ emailLower });
  return readUsers().find(u => normalizeEmail(u.email) === emailLower || u.emailLower === emailLower) || null;
}
async function findUserByReferralCode(code) {
  const referralCode = normalizeReferralCode(code);
  if (!referralCode) return null;
  if (usersCollection) return usersCollection.findOne({ referralCode });
  return readUsers().find(u => String(u.referralCode || '').toUpperCase() === referralCode) || null;
}

async function userFromToken(token) {
  if (!token || !token.includes('.')) return null;
  const [payload, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', AUTH_SECRET).update(payload).digest('base64url');
  if (sig !== expected) return null;
  let data;
  try { data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')); } catch { return null; }
  if (!data.uid || Date.now() > data.exp) return null;
  return findUserById(data.uid);
}
async function getAuthUser(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  return userFromToken(token);
}
async function requireAuth(req, res, next) {
  const user = await getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Login required' });
  req.user = user;
  next();
}

function publicUploadUrl(upload) {
  if (!upload) return '-';
  return upload.url || upload.path || '-';
}
function orderSummary(o) {
  return {
    token: o.token || '-',
    status: o.paymentStatus,
    customer: o.customer?.fullName,
    mobile: o.customer?.mobile,
    total: o.total,
    deliveryCharge: o.deliveryCharge || 0,
    deliveryType: o.deliveryType || 'standard',
    referralCode: o.customer?.referralCode || '',
    referrerName: o.customer?.referrerName || '',
    createdAt: o.createdAt,
    verifiedAt: o.verifiedAt,
    items: o.items,
    designUpload: o.designUpload ? { originalName: o.designUpload.originalName, url: publicUploadUrl(o.designUpload) } : null,
    customerDesign: o.customerDesign || {}
  };
}
function tokenFromCount(count) { return `VSK-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`; }

function saveUploadedDesign(file) {
  if (!file || !file.dataUrl) return null;
  const match = String(file.dataUrl).match(/^data:([\w/+.-]+);base64,(.+)$/);
  if (!match) throw new Error('Invalid design upload file');
  const mime = match[1].toLowerCase();
  const allowed = new Map([
    ['image/png', 'png'], ['image/jpeg', 'jpg'], ['image/jpg', 'jpg'], ['image/webp', 'webp'], ['application/pdf', 'pdf']
  ]);
  if (!allowed.has(mime)) throw new Error('Only JPG, PNG, WEBP or PDF design upload allowed');
  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length > 8 * 1024 * 1024) throw new Error('Design upload max 8MB allowed');
  const safeOriginal = String(file.name || 'customer-design').replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 80);
  const ext = allowed.get(mime);
  const filename = `design-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
  const filepath = path.join(UPLOADS_DIR, filename);
  fs.writeFileSync(filepath, buffer);
  return {
    originalName: safeOriginal,
    fileName: filename,
    mime,
    size: buffer.length,
    path: `/uploads/${filename}`,
    url: PUBLIC_BASE_URL ? `${PUBLIC_BASE_URL}/uploads/${filename}` : `/uploads/${filename}`
  };
}
function validateCustomer(c = {}) {
  const required = ['fullName', 'mobile', 'email', 'city', 'state', 'pincode', 'deliveryAddress'];
  for (const key of required) if (!String(c[key] || '').trim()) throw new Error(`${key} is required`);
  validateIndianMobile(c.mobile);
  if (!isValidEmailFormat(c.email)) throw new Error('Please enter a valid email address');
  if (!/^\d{6}$/.test(cleanPhone(c.pincode))) throw new Error('Pincode must be 6 digits');
  c.referralCode = normalizeReferralCode(c.referralCode || '');
}
function calculateAmount(items = [], customer = {}) {
  if (!Array.isArray(items) || items.length === 0) throw new Error('Cart is empty');
  let subtotal = 0;
  let qty = 0;
  const safeItems = items.map(item => {
    const prod = PRODUCT_PRICES.get(item.name);
    if (!prod) throw new Error(`Invalid product: ${item.name}`);
    const itemQty = Math.max(1, Math.min(99, parseInt(item.qty || 1, 10)));
    subtotal += prod.price * itemQty;
    qty += itemQty;
    return { name: item.name, cat: item.cat || '', price: prod.price, unit: prod.unit, qty: itemQty };
  });
  const discountRate = qty >= 5 ? 0.20 : qty >= 3 ? 0.15 : 0;
  const discount = discountRate ? Math.round(subtotal * discountRate) : 0;
  const deliveryType = String(customer.deliveryType || 'standard').toLowerCase() === 'fast' ? 'fast' : 'standard';
  const deliveryCharge = DELIVERY_CHARGE + (deliveryType === 'fast' ? FAST_DELIVERY_EXTRA : 0);
  const total = subtotal - discount + deliveryCharge;
  return { subtotal, discount, discountRate, deliveryCharge, deliveryType, total, qty, safeItems };
}

async function saveOrder(order) {
  if (ordersCollection) {
    await ordersCollection.insertOne(order);
    return order;
  }
  const orders = readOrders();
  orders.push(order);
  writeOrders(orders);
  return order;
}
async function findOrderForPayment(localOrderId, razorpayOrderId) {
  if (ordersCollection) return ordersCollection.findOne({ localOrderId, razorpayOrderId });
  return readOrders().find(o => o.localOrderId === localOrderId && o.razorpayOrderId === razorpayOrderId) || null;
}
async function successOrderCount() {
  if (ordersCollection) return ordersCollection.countDocuments({ paymentStatus: 'SUCCESS' });
  return readOrders().filter(o => o.paymentStatus === 'SUCCESS').length;
}
async function markOrderSuccess(localOrderId, razorpayOrderId, paymentId, token) {
  const update = {
    paymentStatus: 'SUCCESS',
    token,
    paymentId,
    verifiedAt: new Date().toISOString()
  };
  if (ordersCollection) {
    await ordersCollection.updateOne({ localOrderId, razorpayOrderId }, { $set: update });
    return ordersCollection.findOne({ localOrderId, razorpayOrderId });
  }
  const orders = readOrders();
  const idx = orders.findIndex(o => o.localOrderId === localOrderId && o.razorpayOrderId === razorpayOrderId);
  if (idx === -1) return null;
  orders[idx] = { ...orders[idx], ...update };
  writeOrders(orders);
  return orders[idx];
}
async function findOrdersByTokenOrMobile(token, mobile) {
  if (ordersCollection) {
    const conditions = [];
    if (token) conditions.push({ token });
    if (mobile) conditions.push({ 'customer.mobile': mobile });
    if (!conditions.length) return [];
    return ordersCollection.find({ $or: conditions }).sort({ createdAt: -1 }).toArray();
  }
  return readOrders()
    .filter(o => (token && String(o.token || '').toUpperCase() === token) || (mobile && cleanPhone(o.customer?.mobile) === mobile))
    .reverse();
}
async function findMyOrders(user) {
  if (ordersCollection) {
    return ordersCollection.find({
      paymentStatus: 'SUCCESS',
      $or: [
        { userId: user.id },
        { 'customer.mobile': user.mobile }
      ]
    }).sort({ createdAt: -1 }).toArray();
  }
  return readOrders()
    .filter(o => o.userId === user.id || cleanPhone(o.customer?.mobile) === user.mobile)
    .filter(o => o.paymentStatus === 'SUCCESS')
    .reverse();
}
async function allOrders() {
  if (ordersCollection) return ordersCollection.find({}).sort({ createdAt: -1 }).toArray();
  return readOrders().reverse();
}

function emailReady() { return Boolean(BREVO_API_KEY || (SMTP_HOST && SMTP_USER && SMTP_PASS)); }
function parseSender(value = '') {
  const raw = String(value || '').trim() || ADMIN_EMAIL;
  const match = raw.match(/^(.*?)<([^>]+)>$/);
  if (match) {
    return { name: match[1].trim() || STORE_NAME, email: match[2].trim() };
  }
  return { name: STORE_NAME, email: raw };
}
function buildTextFromHtml(html = '') {
  return String(html)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}
function whatsappReady() { return WHATSAPP_PHONE_NUMBER_ID && WHATSAPP_ACCESS_TOKEN; }
function normalizeWhatsApp(phone = '') {
  let n = cleanPhone(phone);
  if (n.length === 10) n = '91' + n;
  return n;
}
async function sendEmailByBrevoApi(subject, html, to = ADMIN_EMAIL) {
  const sender = parseSender(SMTP_FROM);
  const payload = {
    sender,
    to: [{ email: String(to).trim() }],
    subject,
    htmlContent: html,
    textContent: buildTextFromHtml(html)
  };
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': BREVO_API_KEY,
      'accept': 'application/json',
      'content-type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`Brevo API email failed: ${response.status} ${body}`);
  }
  return body ? JSON.parse(body) : { success: true };
}
async function sendEmailBySmtp(subject, html, to = ADMIN_EMAIL) {
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    connectionTimeout: 20000,
    greetingTimeout: 20000,
    socketTimeout: 30000
  });
  const sender = SMTP_FROM.includes('<') ? SMTP_FROM : `VASUKI NFC <${SMTP_FROM}>`;
  return transporter.sendMail({ from: sender, to, subject, html });
}
async function sendEmailNotification(subject, html, to = ADMIN_EMAIL) {
  if (!emailReady()) {
    console.log('ℹ️ Email notification skipped. Add BREVO_API_KEY or SMTP details in Render Environment.');
    return { skipped: true };
  }
  if (BREVO_API_KEY) return sendEmailByBrevoApi(subject, html, to);
  return sendEmailBySmtp(subject, html, to);
}
async function sendWhatsAppText(to, body) {
  const phone = normalizeWhatsApp(to);
  if (!phone) return { skipped: true };
  if (!whatsappReady()) {
    console.log('ℹ️ WhatsApp notification skipped. Add WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN in Render Environment.');
    return { skipped: true };
  }
  const response = await fetch(`https://graph.facebook.com/${WHATSAPP_API_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to: phone, type: 'text', text: { preview_url: false, body } })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`WhatsApp send failed: ${data?.error?.message || response.status}`);
  return data;
}
function orderText(order) {
  const items = (order.items || []).map(i => `${i.name} × ${i.qty}`).join(', ');
  return `Order: ${order.token || order.localOrderId}
Customer: ${order.customer?.fullName}
Mobile: ${order.customer?.mobile}
Total: ₹${order.total}
Delivery: ₹${order.deliveryCharge || 0} (${order.deliveryType === 'fast' ? 'Fast delivery' : 'Standard delivery'})
Discount: ₹${order.discount || 0}${order.discountRate ? ` (${Math.round(order.discountRate * 100)}% off)` : ''}
Referral Code: ${order.customer?.referralCode || '-'}
Items: ${items}
Track: ${PUBLIC_BASE_URL}/track-order.html?token=${encodeURIComponent(order.token || '')}`;
}
async function notifyAdminRegistration(user) {
  const subject = `New registration - ${user.fullName}`;
  const text = `New customer registered on VASUKI NFC

Name: ${user.fullName}
Mobile: ${user.mobile}
Email: ${user.email || '-'}
Time: ${user.createdAt}`;
  const html = text.replace(/\n/g, '<br>');
  await Promise.allSettled([
    sendEmailNotification(subject, html, ADMIN_EMAIL),
    ADMIN_WHATSAPP ? sendWhatsAppText(ADMIN_WHATSAPP, text) : Promise.resolve({ skipped: true })
  ]).then(results => results.forEach(r => { if (r.status === 'rejected') console.error(r.reason); }));
}
async function notifyAdminPaidOrder(order) {
  const subject = `New Paid Order Received | Vasuki NFC`;
  const itemsHtml = (order.items || [])
    .map(item => `<li>${item.name} × ${item.qty} - ₹${item.price * item.qty}</li>`)
    .join('');
  const referralCode = order.customer?.referralCode || '-';
  const html = `
    <h2>New Paid Order Received</h2>
    <p><b>Customer Name:</b> ${order.customer?.fullName || '-'}</p>
    <p><b>Email:</b> ${order.customer?.email || '-'}</p>
    <p><b>Mobile:</b> ${order.customer?.mobile || '-'}</p>
    <hr>
    <p><b>Order Token:</b> ${order.token || '-'}</p>
    <p><b>Payment ID:</b> ${order.paymentId || '-'}</p>
    <p><b>Subtotal:</b> ₹${order.subtotal || 0}</p>
    <p><b>Discount:</b> ₹${order.discount || 0}${order.discountRate ? ` (${Math.round(order.discountRate * 100)}% off)` : ''}</p>
    <p><b>Total Amount:</b> ₹${order.total || 0}</p>
    <p><b>Delivery Charge:</b> ₹${order.deliveryCharge || 0}</p>
    <p><b>Delivery Type:</b> ${order.deliveryType === 'fast' ? 'Fast Delivery' : 'Standard Delivery'}</p>
    <p><b>Referral Code Used:</b> ${referralCode}</p>
    <p><b>Referral Cashback:</b> Review manually after payment and order confirmation. Eligible range is ₹100 to ₹300.</p>
    <h3>Products</h3>
    <ul>${itemsHtml || '<li>No items found</li>'}</ul>
    <h3>Delivery Address</h3>
    <p>
      ${order.customer?.deliveryAddress || '-'}<br>
      ${order.customer?.city || ''}, ${order.customer?.state || ''} - ${order.customer?.pincode || ''}
    </p>
    <p><b>Track Order:</b> ${PUBLIC_BASE_URL}/track-order.html?token=${encodeURIComponent(order.token || '')}</p>
    <br>
    <p>Regards,<br>Vasuki NFC System</p>
  `;
  const whatsappText = `✅ New paid order on Vasuki NFC

Order Token: ${order.token || '-'}
Name: ${order.customer?.fullName || '-'}
Mobile: ${order.customer?.mobile || '-'}
Email: ${order.customer?.email || '-'}
Subtotal: ₹${order.subtotal || 0}
Discount: ₹${order.discount || 0}${order.discountRate ? ` (${Math.round(order.discountRate * 100)}% off)` : ''}
Amount: ₹${order.total || 0}
Payment ID: ${order.paymentId || '-'}
Referral Code Used: ${referralCode}
Delivery: ${order.deliveryType === 'fast' ? 'Fast Delivery' : 'Standard Delivery'}
Address: ${order.customer?.deliveryAddress || '-'}`;
  await Promise.allSettled([
    sendEmailNotification(subject, html, ADMIN_EMAIL),
    ADMIN_WHATSAPP ? sendWhatsAppText(ADMIN_WHATSAPP, whatsappText) : Promise.resolve({ skipped: true })
  ]).then(results => results.forEach(r => { if (r.status === 'rejected') console.error(r.reason); }));
}
async function notifyCustomerPaidOrder(order) {
  const subject = `Thank you for your order | Vasuki NFC`;
  const itemsHtml = (order.items || [])
    .map(item => `<li>${item.name} × ${item.qty} - ₹${item.price * item.qty}</li>`)
    .join('');
  const referralCode = order.customer?.referralCode || '';
  const referralNote = referralCode
    ? `<p><b>Referral Code Applied:</b> ${referralCode}</p><p>Referral cashback will be reviewed after order confirmation. Eligible cashback is ₹100 to ₹300 as per the referral terms.</p>`
    : '<p>No referral code was applied to this order.</p>';
  const html = `
    <h2>Thank you for your order!</h2>
    <p>Hi ${order.customer?.fullName || 'Customer'},</p>
    <p>Your payment has been received successfully. Your Vasuki NFC order is now confirmed.</p>
    <hr>
    <p><b>Order Token:</b> ${order.token || '-'}</p>
    <p><b>Payment ID:</b> ${order.paymentId || '-'}</p>
    <p><b>Subtotal:</b> ₹${order.subtotal || 0}</p>
    <p><b>Discount:</b> ₹${order.discount || 0}${order.discountRate ? ` (${Math.round(order.discountRate * 100)}% off)` : ''}</p>
    <p><b>Amount Paid:</b> ₹${order.total || 0}</p>
    <p><b>Delivery Charge Included:</b> ₹${order.deliveryCharge || 0}</p>
    <p><b>Delivery Type:</b> ${order.deliveryType === 'fast' ? 'Fast Delivery' : 'Standard Delivery'}</p>
    ${referralNote}
    <h3>Your Products</h3>
    <ul>${itemsHtml || '<li>No items found</li>'}</ul>
    <p>You can track your order here:</p>
    <p><a href="${PUBLIC_BASE_URL}/track-order.html?token=${encodeURIComponent(order.token || '')}">Track My Order</a></p>
    <p>Our team will contact you shortly for design confirmation and delivery details.</p>
    <br>
    <p>Regards,<br>Vasuki NFC</p>
  `;
  const whatsappMsg = `Thank you for your order from Vasuki NFC ✅

Your payment has been received successfully.

Order Token: ${order.token || '-'}
Subtotal: ₹${order.subtotal || 0}
Discount: ₹${order.discount || 0}${order.discountRate ? ` (${Math.round(order.discountRate * 100)}% off)` : ''}
Amount Paid: ₹${order.total || 0}
Delivery Charge Included: ₹${order.deliveryCharge || 0}
Referral Code: ${referralCode || '-'}

Track Order:
${PUBLIC_BASE_URL}/track-order.html?token=${encodeURIComponent(order.token || '')}

Our team will contact you shortly for design confirmation.`;
  await Promise.allSettled([
    order.customer?.email ? sendEmailNotification(subject, html, order.customer.email) : Promise.resolve({ skipped: true }),
    sendWhatsAppText(order.customer?.mobile, whatsappMsg)
  ]).then(results => results.forEach(r => { if (r.status === 'rejected') console.error(r.reason); }));
}

app.post('/api/register', async (req, res) => {
  try {
    const { fullName, mobile, email, password } = req.body || {};
    if (!String(fullName || '').trim()) throw new Error('Full name is required');
    validateIndianMobile(mobile);
    if (!email || !String(email).trim()) throw new Error('Email address is required');
    if (!password || String(password).length < 6) throw new Error('Password must be at least 6 characters');

    const cleanMobile = validateIndianMobile(mobile);
    const emailLower = await validateRealEmail(email);
    const existing = await findExistingUser({ mobile: cleanMobile, email: emailLower });
    if (existing && existing.emailVerified === true) throw new Error('Account already exists. Please login.');
    if (existing && existing.emailVerified !== true) throw new Error('This email or mobile is already registered but not verified. Please use Resend OTP or contact support.');

    const hp = hashPassword(password);
    const otp = createOtp();
    const referralCode = await generateUniqueReferralCode(fullName, cleanMobile);
    const user = {
      id: `USR-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      fullName: String(fullName).trim(),
      mobile: cleanMobile,
      email: String(email || '').trim(),
      emailLower: emailLower || undefined,
      emailVerified: false,
      referralCode,
      emailOtpHash: hashOtp(emailLower, otp),
      emailOtpExpiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      salt: hp.salt,
      passwordHash: hp.hash,
      createdAt: new Date().toISOString()
    };

    await sendEmailOtp(user, otp);
    await saveUser(user);
    notifyAdminRegistration(user).catch(console.error);
    res.json({ verifyRequired: true, email: user.email, message: 'OTP sent to your email. Please verify to activate your account.' });
  } catch (err) {
    console.error('Register error:', err);
    res.status(400).json({ error: err.message || 'Unable to register' });
  }
});

app.post('/api/verify-email', async (req, res) => {
  try {
    const { email, otp } = req.body || {};
    const emailLower = normalizeEmail(email);
    if (!isValidEmailFormat(emailLower)) throw new Error('Please enter a valid email address');
    if (!/^\d{6}$/.test(String(otp || '').trim())) throw new Error('Please enter the 6 digit OTP');
    const user = await findUserByEmail(emailLower);
    if (!user) throw new Error('Account not found. Please register again.');
    if (user.emailVerified === true) {
      const readyUser = await ensureReferralCode(user);
      return res.json({ token: signToken(readyUser), user: publicUser(readyUser), message: 'Email already verified' });
    }
    if (!user.emailOtpExpiresAt || Date.now() > new Date(user.emailOtpExpiresAt).getTime()) {
      throw new Error('OTP expired. Please register again or request a new OTP.');
    }
    if (!verifyOtp(emailLower, String(otp).trim(), user.emailOtpHash)) throw new Error('Invalid OTP');
    const updated = await updateUserById(user.id, {
      set: { emailVerified: true, verifiedAt: new Date().toISOString() },
      unset: { emailOtpHash: '', emailOtpExpiresAt: '' }
    });
    const readyUser = await ensureReferralCode(updated);
    res.json({ token: signToken(readyUser), user: publicUser(readyUser), message: 'Email verified successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Email verification failed' });
  }
});

app.post('/api/resend-email-otp', async (req, res) => {
  try {
    const { email } = req.body || {};
    const emailLower = await validateRealEmail(email);
    const user = await findUserByEmail(emailLower);
    if (!user) throw new Error('Account not found. Please register first.');
    if (user.emailVerified === true) throw new Error('Email is already verified. Please login.');
    const otp = createOtp();
    await sendEmailOtp(user, otp);
    await updateUserById(user.id, {
      set: { emailOtpHash: hashOtp(emailLower, otp), emailOtpExpiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString() }
    });
    res.json({ success: true, message: 'New OTP sent to your email.' });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Unable to resend OTP' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { mobile, email, identity, password } = req.body || {};
    const loginId = String(identity || mobile || email || '').trim().toLowerCase();
    if (!loginId) throw new Error('Mobile number or email is required');
    if (loginId.includes('@')) await validateRealEmail(loginId);
    if (!loginId.includes('@')) validateIndianMobile(loginId);
    const user = await findUserForLogin(loginId);
    if (!user || !verifyPassword(password, user)) throw new Error('Invalid login details. Please check your email/mobile and password');
    if (user.email && user.emailVerified !== true) throw new Error('Email is not verified. Please verify your email before login.');
    const readyUser = await ensureReferralCode(user);
    res.json({ token: signToken(readyUser), user: publicUser(readyUser) });
  } catch (err) {
    res.status(401).json({ error: err.message || 'Unable to login' });
  }
});

app.get('/api/me', requireAuth, async (req, res) => {
  const readyUser = await ensureReferralCode(req.user);
  res.json({ user: publicUser(readyUser) });
});

app.get('/api/my-orders', requireAuth, async (req, res) => {
  const orders = await findMyOrders(req.user);
  res.json(orders.map(orderSummary));
});

app.post('/api/create-order', async (req, res) => {
  try {
    if (!KEY_ID || !KEY_SECRET) throw new Error('Razorpay is not connected. Add keys in Render Environment Variables.');
    const { customer, items, designUpload, customerDesign } = req.body;
    const authUser = await getAuthUser(req);
    if (!authUser) return res.status(401).json({ error: 'Login or registration is required for checkout' });
    if (customer && !String(customer.email || '').trim() && authUser.email) customer.email = authUser.email;
    validateCustomer(customer);
    if (customer.referralCode) {
      const referrer = await findUserByReferralCode(customer.referralCode);
      if (!referrer) throw new Error('Invalid referral code. Please check the code and try again.');
      if (referrer.id === authUser.id) throw new Error('You cannot use your own referral code.');
      customer.referralCode = referrer.referralCode;
      customer.referrerUserId = referrer.id;
      customer.referrerName = referrer.fullName || '';
    }
    const savedDesignUpload = saveUploadedDesign(designUpload);
    const calc = calculateAmount(items, customer);
    const localOrderId = `LOCAL-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    const rzOrder = await razorpay.orders.create({
      amount: calc.total * 100,
      currency: 'INR',
      receipt: localOrderId,
      notes: { store: STORE_NAME, customerName: customer.fullName, mobile: customer.mobile, userId: authUser.id }
    });

    await saveOrder({
      localOrderId,
      razorpayOrderId: rzOrder.id,
      userId: authUser.id,
      customer,
      customerDesign: customerDesign || {},
      designUpload: savedDesignUpload,
      items: calc.safeItems,
      subtotal: calc.subtotal,
      discount: calc.discount,
      discountRate: calc.discountRate,
      deliveryCharge: calc.deliveryCharge,
      deliveryType: calc.deliveryType,
      total: calc.total,
      paymentStatus: 'CREATED',
      createdAt: new Date().toISOString()
    });

    res.json({ keyId: KEY_ID, localOrderId, razorpayOrderId: rzOrder.id, amount: rzOrder.amount, currency: rzOrder.currency });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || 'Unable to create order' });
  }
});

app.post('/api/verify-payment', async (req, res) => {
  try {
    if (!KEY_ID || !KEY_SECRET) throw new Error('Razorpay is not connected. Add keys in Render Environment Variables.');
    const { localOrderId, razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
    const order = await findOrderForPayment(localOrderId, razorpay_order_id);
    if (!order) throw new Error('Order not found');

    const generated = crypto.createHmac('sha256', KEY_SECRET).update(`${order.razorpayOrderId}|${razorpay_payment_id}`).digest('hex');
    if (generated !== razorpay_signature) throw new Error('Payment signature verification failed');

    const count = await successOrderCount();
    const token = tokenFromCount(count);
    const updatedOrder = await markOrderSuccess(localOrderId, razorpay_order_id, razorpay_payment_id, token);

    notifyAdminPaidOrder(updatedOrder).catch(console.error);
    notifyCustomerPaidOrder(updatedOrder).catch(console.error);
    res.json({ success: true, token, amount: updatedOrder.total, paymentId: razorpay_payment_id, contactEmail: ADMIN_EMAIL });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || 'Unable to verify payment' });
  }
});

app.get('/api/orders', async (req, res) => {
  const token = String(req.query.token || '').trim().toUpperCase();
  const mobile = cleanPhone(req.query.mobile || '');
  if (!token && !mobile) return res.status(400).json({ error: 'Token or mobile number required' });
  const orders = await findOrdersByTokenOrMobile(token, mobile);
  res.json(orders.map(orderSummary));
});

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    store: STORE_NAME,
    db: Boolean(db),
    razorpayMode: RAZORPAY_MODE,
    time: new Date().toISOString()
  });
});

app.get('/api/products', (req, res) => {
  res.json(Array.from(PRODUCT_PRICES.entries()).map(([name, data]) => ({ name, ...data })));
});

app.get('/api/admin/orders', async (req, res) => {
  const pin = String(req.query.pin || req.headers['x-admin-pin'] || '');
  const expected = String(process.env.ADMIN_PIN || '');
  if (!expected || pin !== expected) return res.status(401).json({ error: 'Admin PIN required' });
  const orders = await allOrders();
  res.json(orders.map(orderSummary));
});

connectMongo()
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err);
    console.log('⚠️ MongoDB is unavailable. Server is starting with JSON fallback.');
  })
  .finally(() => {
    app.listen(PORT, () => {
      const base = PUBLIC_BASE_URL || `Port ${PORT}`;
      console.log(`✅ Vasuki NFC server live: ${base}`);
    });
  });
