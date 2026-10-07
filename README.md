# 📦 Bill Delivery Tracker (v2.0)

A lightning-fast, mobile-first Web App / PWA designed for delivery drivers and field executives to scan sales bill QR codes, record deliveries in a single tap, track cash/UPI collections, and synchronize data directly with Google Sheets.

---

## 🌟 Key Features (v2.0)

- **📤 1st Scan: Send for Delivery (Dispatch - Default Workflow)**:
  - Opens directly in rapid batch dispatch mode before the driver leaves the warehouse/store.
  - Continuous scanning without pausing: scan bill $\rightarrow$ beep & haptic confirmation $\rightarrow$ auto-registered as *Sent for Delivery / Pending* $\rightarrow$ camera stays live for the next bill.
  - Live route pill display: `📦 14 Bills Prepped for Delivery • ₹18,400 Total`.
  - 1-tap switch to **🚚 2nd Scan: Customer Delivery**.
- **⚡ iPhone Camera Lag Fix (Hardware-Accelerated Vision Engine)**:
  - Leverages native **`window.BarcodeDetector`** on iOS Safari (iOS 17+ and modern WebKit) running directly on Apple's Vision Neural Engine (**2–5ms decode time per frame**, instant detection).
  - Explicit WebRTC constraints `{ facingMode: { ideal: "environment" } }` automatically select the primary **1× wide autofocus camera** on multi-lens iPhones (eliminating telephoto/macro blur).
  - Fallback to optimized `Html5Qrcode` with non-telephoto camera filtering.
- **📱 Minimalist, Compact Viewfinder (~170px)**:
  - Height reduced from 280px to **170px** in a sleek letterbox format with a 130px reticle.
  - Fits the camera, active bill card, and 4-digit search dock on mobile screens without vertical scrolling.
- **📊 Simpler & Better Daily Dashboard (Single-Day Focus)**:
  - **Visual Run-Rate Progress Bar**: Displays today's delivery percentage (e.g. `85% Complete • 17 of 20 Delivered`).
  - **Essential Daily Cash Tally**:
    - 💵 **Cash in Hand**: Big bold green card showing exact physical cash collected for turn-in.
    - 📱 **UPI / Online**: Bold indigo card showing payments confirmed in the bank.
    - ⏳ **Credit / Unpaid**: Direct balance due tracking.
  - **In-List 1-Tap Quick Action Buttons**: Directly mark deliveries from the list with `[💵 Cash]` or `[📱 Online]` without re-scanning.
  - **📲 1-Tap WhatsApp Shift Handover**: Generates an executive daily text summary ready to send to the owner or accounts.
- **⚡ 5 Dedicated Doorstep Delivery Options**:
  - 💵 **Cash**: 1-tap full cash collection.
  - 📱 **Online**: 1-tap full Online/UPI collection.
  - 🌗 **Partial Received**: Enter collected amount, live balance due calculator, and Cash/Online mode.
  - 📦 **Delivered**: 1-tap credit delivery (unpaid / pay later).
  - ⏳ **Not Delivered**: Instant reason selection (Shop Closed, Party Not Available, Refused, etc.).
- **🔍 Bottom 4-Digit Search Dock**: If the camera is broken, lighting is dark, or QR code is damaged, enter just the last 4 digits of the invoice (e.g. `3504`) at the bottom of the screen to find and process the bill instantly in both Dispatch and Delivery modes.

---

## 🏗️ Architecture

```text
       Phone / PWA (GitHub Pages / Cloudflare Pages / Local)
                             |
             QR Code Scan / Offline Queue Buffer
                             |
                    JSONP / CORS API
                             v
           Google Apps Script Web App (/exec)
                             |
                             v
           Google Spreadsheet Database
           ├── 1. Scanned Bills  (Current state of all bills)
           ├── 2. Delivery Log   (Immutable audit history log)
           └── 3. Dashboard      (Automated KPIs & metrics)
```

---

## 📑 QR Code Format & Specification

The invoice QR code contains comma-separated data:

```text
Invoice_No,Party_Name,Amount
```

*Note: The amount may contain commas and decimal points.*

### Examples:
- `IN-FY26/27-3504,Milk ChaCha,405.00`
- `IN-FY26/27-3505,ABC Store,1,300.00`
- `IN-FY26/27-3506,ABC Store,30,099.00`
- `IN-FY26/27-3507,Metro Supermarket,8,750.50`

---

## 🖥️ Desktop Web App (Hardware 2D Barcode Scanner Station)

When opened on a desktop, laptop, or warehouse terminal, the app automatically runs the **Desktop 2D Station** ([`desktop.html`](./desktop.html)):

- **🚫 Zero Webcam Usage**: Completely disables camera requests and permissions on desktop.
- **🎯 2D Barcode & QR Scanner Integration**:
  - Connect any USB, 2.4G wireless, or Bluetooth 2D barcode scanner (Honeywell, Zebra, Netum, Tera, Inateck, etc.).
  - Global HID keyboard wedge listener with rapid burst detection (<45ms) and auto-focus protection — scan anywhere on the screen without clicking.
  - Visual emerald pulse wave on every scan.
  - Built-in Web Audio API synthesizer for crisp POS cash register chimes and error tones.
- **⚡ Two Daily Modes**:
  1. **📤 Dispatch Mode (Morning Staging)**: Pull trigger on 100 bills continuously. Every bill is registered as *Pending / Dispatched* in <0.1s with zero mouse clicks.
  2. **🚚 Delivery Mode (Doorstep & Evening Reconciliation)**: Scan bill $\rightarrow$ Active Bill Inspector pops up $\rightarrow$ Press `1` for Cash, `2` for Online/UPI, `3` for Credit, `4` for Partial, `5` for Not Delivered.
- **📊 Daily Command Center & Live Ledger**:
  - 4 Real-time KPI Cards: Total Outward Bills, **Physical Cash in Hand (to turn in)**, Bank UPI, Pending.
  - Live searchable table with instant last-4-digits search (shortcut `/`), status filter pills, and inline 1-click settlement buttons.
  - 1-Tap Daily WhatsApp Handover Summary, Printable Manifest, and CSV Export.

---

## 🚀 Quick Setup & Deployment Guide

### Step 1: Set up Google Sheets & Apps Script Backend
1. Open a new Google Spreadsheet at [sheets.new](https://sheets.new).
2. Go to **Extensions** → **Apps Script**.
3. Delete any default code in `Code.gs` and replace it with the code from [`Code.gs`](./Code.gs).
4. Click **Save** (💾).
5. Click **Deploy** → **New deployment**.
6. Select **Web app** (gear icon ⚙️).
   - **Description**: `Bill Delivery API v2`
   - **Execute as**: `Me`
   - **Who has access**: `Anyone`
7. Click **Deploy**, authorize permissions when prompted, and copy the Web App URL (ends with `/exec`).

### Step 2: Configure & Host Web App
1. Open `desktop.html` on your laptop, or `index.html` on your phone (or host on **GitHub Pages**, **Vercel**, or **Cloudflare Pages**).
2. Tap the **⚙️ Settings** button.
3. Paste your Google Apps Script `/exec` URL into the **API URL** input and click **Save**.
4. Click **📡 Test Connection** to verify connection.
5. Set your **Operator / Delivery Person Name** (e.g. `Ramesh Kumar #4`).

---

## 🧪 Testing Without a Physical Scanner / Google Sheet

You can test the entire app immediately:
1. Open `desktop.html` in your browser.
2. Under **🧪 Test & Simulate 2D Scan** on the left panel, choose any sample bill or paste a custom string.
3. Click **⚡ Simulate Scan** (or click **📦 Seed 6 Demo Bills** in Settings) to test the live ledger, cash tally, and 1-click delivery actions!

---

## 📂 Project Files

- [`desktop.html`](./desktop.html) — Desktop Web App for USB/Bluetooth 2D barcode scanners (no camera).
- [`index.html`](./index.html) — Mobile web app / PWA camera scanner frontend with auto-desktop detection.
- [`Code.gs`](./Code.gs) — Google Apps Script backend API with batch sync & dashboard generator.
- [`Bill_Delivery_Tracker_Project_Specification.md`](./Bill_Delivery_Tracker_Project_Specification.md) — Comprehensive technical documentation and specifications.
- [`README.md`](./README.md) — Quick start and deployment instructions.

