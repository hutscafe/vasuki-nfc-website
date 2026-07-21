# Vasuki NFC - Public Razorpay Ready

This version is ready for public hosting. It includes a premium Vasuki UI and connected backend flow.

## Main features

- Vasuki premium style color theme and hero look
- Razorpay secure checkout
- Order token after successful payment
- Order tracking using token or mobile number
- Customer design/logo upload
- Email set: vasukinfc@gmail.com
- WhatsApp order option removed
- Collection link: /collection.html
- Design link: /design.html
- Mobile hover off, laptop/computer hover on

## Public hosting

Do not run this project on GitHub Pages because it requires a backend/API/Razorpay server. Deploy it on Render.

Render settings:

```bash
Build Command: npm install
Start Command: npm start
```

Environment Variables:

```text
NODE_ENV=production
PUBLIC_BASE_URL=https://your-render-app-name.onrender.com
ADMIN_EMAIL=vasukinfc@gmail.com
AUTH_SECRET=change-this-long-random-secret
RAZORPAY_KEY_ID=rzp_live_your_key_id
RAZORPAY_KEY_SECRET=your_live_key_secret
ADMIN_PIN=change-this-admin-pin
```

## Razorpay connection

Add the Razorpay secret key only in Render Environment Variables. Do not add secret keys in HTML or GitHub.

Useful files:

- `server.js` - backend + Razorpay + order tracking
- `public/index.html` - home page
- `public/collection.html` - collection page
- `public/design.html` - design page
- `RAZORPAY_RENDER_SETUP.txt` - step-by-step setup

## Order storage

Orders are saved in `orders.json` for small tests. You can use MongoDB for production.
