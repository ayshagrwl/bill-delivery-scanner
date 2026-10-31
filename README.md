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

When opened on a desktop browser, laptop, or billing terminal, the application automatically routes to the **Desktop 2D Station** ([`desktop.html`](./desktop.html)):

- **🚫 Zero Webcam Usage**: Completely eliminates camera permissions and CPU-heavy video decoding on desktops.
- **🎯 2D Hardware Barcode/QR Scanner Integration**:
  - Compatible with any USB, 2.4G wireless, or Bluetooth 2D barcode scanner (Honeywell, Zebra, Netum, TVS, Syble, Tera, Eyoyo, Inateck, etc.).
  - **Smart Burst Interceptor**: Hardware 2D scanners type characters with $<45\text{ms}$ inter-key latency. Even if the operator's cursor is accidentally focused inside a search bar or text field, the scanner burst is automatically detected, extracted, cleanly cleared from the text input, and processed as a bill scan without jamming or polluting input fields.
  - Supports both `Enter` and `Tab` terminators, as well as automatic timer flushes for scanners with no suffix.
  - Visual emerald pulse card and crisp Web Audio synthesizer sound effects (high chime on dispatch, double chime on settlement, warning buzzer on errors).
- **⚡ Two Fast Operating Modes**:
  1. **📤 1st Scan (Outward Dispatch - Morning Staging)**:
     - Rapid continuous scanning: Scan bill $\rightarrow$ chime $\rightarrow$ registered as *Dispatched / Pending* in $<0.1\text{s}$ $\rightarrow$ instantly ready for the next bill.
  2. **🚚 2nd Scan (Delivery Settle - Counter / Evening Reconciliation)**:
     - Scan bill $\rightarrow$ Active Bill Inspector pops up $\rightarrow$ Press `1` for Full Cash, `2` for Full UPI, `3` for Credit, `4` for Partial Payment, `5` for Not Delivered / Exception.
- **⚡ Fast Manual Entry Dock (Identical to Mobile with Live Autocomplete)**:
  - If a bill QR code is torn, smudged, or missing, operators can enter the invoice manually.
  - **Live 4-Digit Search Autocomplete**: As you type the invoice number or last 4 digits (e.g. `3504`), matching bills appear as instant clickable chips showing party name, bill amount, and status pill.
  - **Google Sheets Remote Search Fallback**: If a bill was prepped on another phone/device and isn't in local cache, clicking *"Search in Google Sheets ➔"* looks it up from the backend spreadsheet immediately.
  - **Full Manual Creation**: Enter Invoice #, Party Name, Amount, pick Date (Today, Yesterday, Custom), and click 1-touch Dispatch or Settle buttons.
- **📊 Daily Command Center & Multi-Day Ledger**:
  - **4 Financial KPI Cards**: Total Outward Bills & Value, **💵 Physical Cash in Hand (reconciliation tally for turn-in)**, 📱 Bank UPI / Online, ⏳ Pending Credit.
  - **Overdue Multi-Day Reconciliation**: High-visibility warning banner and tab for bills from previous days that remain Pending.
  - **Interactive Ledger**: Searchable (`/` hotkey), date filters (*Today*, *Yesterday*, *Overdue*, *Custom Date*), status pills (*All*, *Pending*, *Delivered*, *Cash*, *Online*, *Exceptions*), and inline 1-click settlement buttons on every table row.
  - **Export & Handover**: 1-Click WhatsApp shift handover summary, printable daily manifest, and CSV export.

### ⌨️ Desktop Keyboard Shortcuts Reference

| Shortcut | Action | Where Active |
|---|---|---|
| **`F1`** | Switch to **1st Scan (Outward Dispatch)** | Anywhere |
| **`F2`** | Switch to **2nd Scan (Delivery Settlement)** | Anywhere |
| **`1`** | Settle with **💵 Full Cash** | When Active Bill is displayed |
| **`2`** | Settle with **📱 Full Online / UPI** | When Active Bill is displayed |
| **`3`** | Settle as **📦 Delivered (Credit / Pay Later)** | When Active Bill is displayed |
| **`4`** | Open **🌗 Partial Payment Modal** | When Active Bill is displayed |
| **`5`** | Mark **⏳ Not Delivered / Store Closed** | When Active Bill is displayed |
| **`/`** | Focus **Search Input** | Anywhere (when not typing) |
| **`Enter`** | Add to Dispatch Manifest or Submit Cash Delivery | In Fast Manual Entry Dock |
| **`Esc`** | Dismiss Active Bill or Close Open Modals | Anywhere |

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

