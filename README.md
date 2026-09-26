# 📦 Bill Delivery Tracker (v2.0)

A lightning-fast, mobile-first Web App / PWA designed for delivery drivers and field executives to scan sales bill QR codes, record deliveries in a single tap, track cash/UPI collections, and synchronize data directly with Google Sheets.

---

## 🌟 Key Features

- **⚡ 2-Stage Scan Workflow**:
  - **📤 1st Scan: Send for Delivery (Dispatch)**: Ultra-fast continuous batch scanning before driver leaves. Automatically registers bills as *Sent for Delivery / Pending* without pausing.
  - **🚚 2nd Scan: Customer Delivery**: Scanned at customer's shop with 5 dedicated 1-tap action buttons.
- **⚡ 5 Dedicated Delivery Options**:
  - 💵 **Cash**: 1-tap full cash collection.
  - 📱 **Online**: 1-tap full Online/UPI collection.
  - 🌗 **Partial Received**: Enter collected amount, real-time balance due indicator, and Cash/Online mode.
  - 📦 **Delivered**: 1-tap credit delivery (unpaid / pay later).
  - ⏳ **Not Delivered**: Instant reason selection (Shop Closed, Party Not Available, Refused, etc.).
- **🔍 Bottom 4-Digit Search Dock**: If the camera is broken, lighting is dark, or QR code is damaged, enter just the last 4 digits of the invoice (e.g. `3504`) at the bottom of the screen to find the bill and record delivery immediately.
- **📷 Smart Camera & Lens Selector**: Automatic main lens selection (avoids macro/ultrawide), flashlight/torch toggle for dark stairwells/shops, and image file upload fallback.
- **🔊 Synthesized Sound & Haptics**: Built-in Web Audio scanner beeps, harmonious success chimes, and tactile vibration feedback.
- **🔄 Offline-First with Auto-Sync**: Automatically buffers scans when in poor network zones (basements/remote shops) and auto-syncs when reconnected.
- **📋 Live Today's Route & KPIs**: Real-time summary cards (Scanned, Delivered, Pending, Total Value, Collected), search filter, and status filter chips.
- **💰 End-of-Day Settlement Report**: Instant tally of Cash in Hand, UPI collections, and unpaid balances with one-tap **WhatsApp/Clipboard share**.
- **🧪 Built-in Test Lab & Simulator**: Instant QR generator and scan simulator to test every workflow without physical printed bills or a camera.
- **📊 Auto-Dashboard in Google Sheets**: Formatted Google Sheet dashboard with live formulas, KPIs, and formatted currency columns.

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

### Step 2: Configure & Host Mobile Web App
1. Open `index.html` on your mobile browser, or host it on **GitHub Pages**, **Vercel**, or **Cloudflare Pages**.
2. Tap the **⚙️ Settings** tab in the app.
3. Paste your Google Apps Script `/exec` URL into the **API URL** input and click **Save URL**.
4. Click **📡 Test Connection** to verify connection.
5. Set your **Delivery Person Name / ID** (e.g. `Ramesh Kumar #4`).

---

## 🧪 Testing Without a Camera / Google Sheet

You can test the entire app immediately using the built-in **Test Lab**:
1. Open `index.html` in any browser.
2. Tap the **🧪 Test Lab** tab.
3. Tap **"Seed 6 Sample Bills"** to instantly test the Today's Route and Settlement screens.
4. Or select any preset test invoice and tap **⚡ Simulate Scan** to experience the 1-tap delivery flow!

---

## 📂 Project Files

- [`index.html`](./index.html) — Mobile web app / PWA scanner frontend.
- [`Code.gs`](./Code.gs) — Google Apps Script backend API with batch sync & dashboard generator.
- [`Bill_Delivery_Tracker_Project_Specification.md`](./Bill_Delivery_Tracker_Project_Specification.md) — Comprehensive technical documentation and specifications.
- [`README.md`](./README.md) — Quick start and deployment instructions.
