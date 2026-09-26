# Bill Delivery & Collection Tracker
## Project Specification, Workflow, Data Structure, and Implementation Notes

---

## 1. Project Goal

Build a lightweight mobile web app for tracking delivery of sales bills/invoices.

The system is designed for a business where sales invoices already contain a QR code. The delivery person scans the QR code on the bill, and the system automatically reads the invoice information.

The primary workflow must be extremely fast:

> **Scan → Tap Delivered → Scan next bill**

The delivery person should not have to enter payment, return, or remarks for a normal delivery. Only exception cases should require additional data entry.

---

## 2. Current QR Code Format

The QR code returns plain text in this format:

```text
IN-FY26/27-3504,Milk ChaCha,405.00
```

This represents:

- **Invoice No:** `IN-FY26/27-3504`
- **Party Name:** `Milk ChaCha`
- **Bill Amount:** `405.00`

The QR can also contain comma-separated amounts, for example:

```text
IN-FY26/27-3505,ABC Store,1,300.00
```

or:

```text
IN-FY26/27-3506,ABC Store,30,099.00
```

### Parsing rule

The QR structure is:

```text
Invoice,Party,Amount
```

But the amount itself may contain commas.

Therefore the parser MUST use:

1. First comma = end of invoice number
2. Second comma = end of party name
3. Everything after the second comma = amount

Examples:

```text
IN-FY26/27-3505,ABC Store,1,300.00
```

becomes:

```text
Invoice No = IN-FY26/27-3505
Party Name = ABC Store
Amount Text = 1,300.00
Numeric Amount = 1300
```

```text
IN-FY26/27-3506,ABC Store,30,099.00
```

becomes:

```text
Invoice No = IN-FY26/27-3506
Party Name = ABC Store
Amount Text = 30,099.00
Numeric Amount = 30099
```

The original QR text must also be preserved in the database.

---

## 3. Important QR Design Decision

No pre-existing sales database is required.

The **QR code itself is the source of bill information**.

When a bill is scanned for the first time:

```text
QR
 ↓
Parse Invoice / Party / Amount
 ↓
Create new bill record
 ↓
Status = Pending
```

This means the initial Google Sheet can be completely blank.

---

## 4. System Architecture

The camera cannot reliably be hosted inside the Google Apps Script HTML sandbox because browser camera access (`getUserMedia`) is restricted there.

Therefore the system is split into two layers:

```text
                 PHONE
                   |
                   v
        +---------------------+
        | Standalone Scanner  |
        | HTTPS Web Page      |
        |                     |
        | Camera + QR Scanner |
        +----------+----------+
                   |
                   | QR text
                   v
        +---------------------+
        | Google Apps Script  |
        | Backend / API       |
        +----------+----------+
                   |
                   v
        +---------------------+
        | Google Spreadsheet  |
        |                     |
        | Scanned Bills       |
        | Delivery Log        |
        | Dashboard           |
        +---------------------+
```

### Scanner hosting

Recommended:

- GitHub Pages
- Cloudflare Pages
- Another HTTPS static-hosting service

The scanner page needs normal browser camera access.

### Google Apps Script responsibility

Google Apps Script remains responsible for:

- Parsing QR data
- Creating new bill records
- Finding existing invoices
- Updating delivery status
- Recording payments
- Recording returns
- Recording remarks
- Maintaining the action log
- Feeding the dashboard

---

## 5. Required Google Spreadsheet Sheets

The system uses three sheets.

### A. `Scanned Bills`

This contains the current/latest state of each invoice.

Columns:

| Column | Field |
|---|---|
| A | Invoice No |
| B | Party Name |
| C | Bill Amount |
| D | QR Raw Data |
| E | First Scanned At |
| F | Status |
| G | Action Date/Time |
| H | Paid Amount |
| I | Payment Mode |
| J | Return Type |
| K | Return Amount |
| L | Reason |
| M | Remark |
| N | Last Updated At |

Possible statuses:

- Pending
- Delivered
- Not Delivered
- Returned

---

### B. `Delivery Log`

This is the permanent action history.

Columns:

| Column | Field |
|---|---|
| A | Log ID |
| B | Invoice No |
| C | Party Name |
| D | Bill Amount |
| E | Status |
| F | Action Date/Time |
| G | Paid Amount |
| H | Payment Mode |
| I | Return Type |
| J | Return Amount |
| K | Reason |
| L | Remark |

This preserves history even if an invoice is later updated.

Example:

```text
Invoice 3504
10:30 → Delivered → ₹0
12:15 → Updated → Delivered → ₹200 Cash
```

The `Scanned Bills` sheet contains the current state, while `Delivery Log` preserves the history.

---

### C. `Dashboard`

The dashboard is generated automatically from the scanned bill data.

Suggested metrics:

- Total bills
- Delivered
- Pending
- Not Delivered
- Returned
- Delivery rate
- Total bill value
- Delivered bill value
- Amount collected
- Return value
- Unpaid delivered value
- Collection percentage

Potential future sections:

- Today's pending bills
- Party-wise delivery
- Date-wise delivery
- Delivery-person-wise delivery
- Cash collection
- UPI collection
- Returned bills
- Outstanding bills

---

## 6. Fast Delivery Workflow

This is the most important workflow.

```text
Open app
  ↓
Camera already open
  ↓
Scan QR
  ↓
Bill details appear
  ↓
Tap "DELIVERED"
  ↓
Save immediately
  ↓
Camera ready for next bill
```

No payment entry. No remark entry. No confirmation form.

This should be the default.

---

## 7. Exception Workflows

### A. Delivered + payment collected

Use:

```text
Scan
 ↓
More Options
 ↓
Delivered + Payment Collected
 ↓
Enter amount
 ↓
Select payment mode
 ↓
Save
```

Payment modes:

- Cash
- UPI
- Cheque
- Bank

Paid amount is optional for normal delivery.

---

### B. Not Delivered

Use:

```text
Scan
 ↓
More Options
 ↓
Not Delivered
 ↓
Select reason
 ↓
Optional remark
 ↓
Save
```

Possible reasons:

- Shop Closed
- Party Not Available
- Refused
- Wrong Address
- Other

---

### C. Returned

Use:

```text
Scan
 ↓
More Options
 ↓
Returned
 ↓
Return details
 ↓
Save
```

Return types:

- Full Bill
- Partial Product Return

Return amount is recorded.

Possible reasons:

- Product Return
- Damaged Product
- Other

---

## 8. Fast Scanner Requirements

The scanner must be designed for repeated field use.

### Requirements

- Rear camera by default
- QR scanner starts automatically
- High scanning frame rate
- Large QR scanning box
- Same QR should not trigger repeatedly while still in view
- After a successful action, immediately prepare for next scan
- Minimal UI between scans
- Normal delivery should require one tap after scanning

---

## 9. Camera Selection Requirement

Some phones expose multiple rear cameras:

- Main / 1×
- Ultrawide / 0.5×
- Telephoto
- Macro

Using only:

```javascript
facingMode: "environment"
```

means the browser may choose any rear-facing camera, including ultrawide.

The scanner should therefore:

1. Request camera permission
2. Get available cameras
3. Prefer the main/rear/wide camera
4. Avoid labels containing:
   - ultra
   - ultrawide
   - macro
   - telephoto
   - tele
5. Fall back safely if camera labels are not descriptive

Important limitation:

On some iPhones/Safari versions, individual camera lens names may not be exposed to JavaScript. In those situations, selecting the exact 1× lens cannot always be guaranteed.

A future enhancement can use device zoom constraints where supported.

---

## 10. Duplicate Scan Protection

The scanner should ignore the same QR if it is scanned repeatedly within a short window.

Suggested:

```text
Same QR within ~2 seconds → ignore
```

This prevents the same invoice from being processed multiple times just because it remains in front of the camera for multiple frames.

---

## 11. Existing Invoice Handling

Every invoice number is assumed to be unique.

When a QR is scanned:

```text
Invoice exists?
  |
  +-- NO  → create new record
  |
  +-- YES → show existing record
```

If already processed, the user should see the current status.

Example:

```text
Invoice: IN-FY26/27-3504
Party: Milk ChaCha
Amount: ₹405.00
Status: Delivered
```

The user can then use More Options to update/correct the record if necessary.

---

## 12. Raw QR Preservation

Every scanned QR should preserve the exact original string in:

```text
QR Raw Data
```

Example:

```text
IN-FY26/27-3506,ABC Store,30,099.00
```

This is important for:

- Auditing
- Debugging
- Future QR format changes
- Verifying what the scanner actually received

---

## 13. Current QR Parser Logic

Use the first two commas as separators.

```javascript
function parseQR(qrRaw) {

  qrRaw = String(qrRaw || '').trim();

  if (!qrRaw) {
    throw new Error('QR data is empty.');
  }

  const firstComma = qrRaw.indexOf(',');

  if (firstComma === -1) {
    throw new Error('QR does not contain the invoice separator.');
  }

  const secondComma = qrRaw.indexOf(
    ',',
    firstComma + 1
  );

  if (secondComma === -1) {
    throw new Error('QR does not contain the party separator.');
  }

  const invoiceNo = qrRaw
    .substring(0, firstComma)
    .trim();

  const partyName = qrRaw
    .substring(
      firstComma + 1,
      secondComma
    )
    .trim();

  const amountText = qrRaw
    .substring(secondComma + 1)
    .trim();

  const cleanAmount = amountText
    .replace(/,/g, '')
    .replace(/₹/g, '')
    .trim();

  const amount = Number(cleanAmount);

  if (!invoiceNo) {
    throw new Error('Invoice number is missing.');
  }

  if (!partyName) {
    throw new Error('Party name is missing.');
  }

  if (!amountText) {
    throw new Error('Amount is missing.');
  }

  if (isNaN(amount)) {
    throw new Error(
      'Could not read amount: ' + amountText
    );
  }

  return {
    invoiceNo: invoiceNo,
    partyName: partyName,
    amount: amount,
    raw: qrRaw,
    amountText: amountText
  };
}
```

---

## 14. API Design

The scanner communicates with the Apps Script backend using the web app `/exec` URL.

### Scan endpoint

```text
?action=scan&qr=<encoded QR text>
```

Returns parsed information such as:

```json
{
  "success": true,
  "existing": false,
  "invoiceNo": "IN-FY26/27-3504",
  "partyName": "Milk ChaCha",
  "amount": 405,
  "raw": "IN-FY26/27-3504,Milk ChaCha,405.00",
  "status": "Pending"
}
```

### Update endpoint

```text
?action=update
&invoiceNo=<invoice>
&status=<status>
&paidAmount=<amount>
&paymentMode=<mode>
&returnType=<type>
&returnAmount=<amount>
&reason=<reason>
&remark=<remark>
```

The Apps Script backend updates:

1. Current state in `Scanned Bills`
2. Permanent history in `Delivery Log`

### Search endpoint

```text
?action=search&query=<last 4 digits or invoice query>
```

Searches `Scanned Bills` sheet by invoice number (matches last digits or substring).
Returns array of matching bill records.

---

## 15. Recommended Apps Script Deployment

Google Apps Script should be deployed as:

```text
Deploy → New Deployment → Web App
```

Use:

```text
Execute as: Me
Who has access: Anyone
```

The resulting `/exec` URL must be placed into the scanner page.

Example:

```javascript
const API_URL =
  "https://script.google.com/macros/s/DEPLOYMENT_ID/exec";
```

Important:

When Code.gs changes, the deployed web app may still run the previous version.

Use:

```text
Deploy → Manage deployments → Edit
→ New version → Deploy
```

Then refresh the scanner page.

---

## 16. Recommended Scanner Hosting

The scanner HTML should not be hosted inside Apps Script if camera access is required.

Use an HTTPS static host such as:

### GitHub Pages

Example:

```text
https://yourusername.github.io/bill-delivery-scanner/
```

Or:

### Cloudflare Pages

The key requirement is a normal HTTPS page where browser camera permissions work.

---

## 17. Scanner Library

Current implementation uses:

```html
<script src="https://unpkg.com/html5-qrcode"
        type="text/javascript"></script>
```

The library handles:

- Camera access
- QR detection
- Continuous scanning
- QR box configuration

---

## 18. Recommended Scanner Camera Code

A robust version starts by requesting permission and then enumerating cameras.

```javascript
async function startScanner() {

  if (scannerRunning) return;

  try {

    const stream =
      await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
      });

    stream.getTracks().forEach(
      track => track.stop()
    );

    const cameras =
      await Html5Qrcode.getCameras();

    if (!cameras || cameras.length === 0) {
      throw new Error('No camera found.');
    }

    const avoidWords = [
      'ultra',
      'ultrawide',
      'ultra wide',
      'macro',
      'telephoto',
      'tele'
    ];

    const preferredWords = [
      'wide',
      'main',
      'back',
      'rear'
    ];

    let selectedCamera = null;

    for (let camera of cameras) {

      const label =
        camera.label.toLowerCase();

      const shouldAvoid =
        avoidWords.some(
          word => label.includes(word)
        );

      if (shouldAvoid) continue;

      const looksLikeMain =
        preferredWords.some(
          word => label.includes(word)
        );

      if (looksLikeMain) {
        selectedCamera = camera;
        break;
      }
    }

    if (!selectedCamera) {
      selectedCamera =
        cameras[cameras.length - 1];
    }

    scanner =
      new Html5Qrcode('reader');

    await scanner.start(

      selectedCamera.id,

      {
        fps: 15,

        qrbox: function(width, height) {

          const size =
            Math.floor(
              Math.min(width, height) * 0.70
            );

          return {
            width: size,
            height: size
          };
        },

        aspectRatio: 1.0
      },

      qrSuccess,

      function() {}

    );

    scannerRunning = true;

  } catch (error) {

    console.error(error);

    showError(
      'Could not start the main camera: ' +
      error.message
    );
  }
}
```

---

## 19. Important Camera Error Encountered

Initially the scanner used:

```javascript
facingMode: {
  ideal: "environment"
}
```

This produced an error:

```text
Camera could not start. facingMode should be string or object with exact as key.
```

The compatible form for the `html5-qrcode` configuration is:

```javascript
facingMode: "environment"
```

However, because some phones have multiple rear cameras, the final approach should use explicit camera enumeration and selection rather than relying only on `facingMode`.

---

## 20. Normal Delivery UI

The preferred mobile UI is:

```text
+----------------------------+
|       Bill Delivery        |
|     Scan → Deliver → Next  |
+----------------------------+

        CAMERA VIEW

+----------------------------+
| IN-FY26/27-3504            |
| Milk ChaCha                |
|                            |
| ₹405.00                    |
|                            |
| Status: Pending            |
+----------------------------+

+----------------------------+
|       ✓ DELIVERED          |
+----------------------------+

+----------------------------+
|       More Options         |
+----------------------------+
```

---

## 21. More Options UI

```text
Other Actions

[ Not Delivered ]

[ Returned ]

[ Delivered + Payment Collected ]

[ Back ]
```

---

## 22. Payment Form

For collected money:

```text
Paid Amount
[ __________ ]

Payment Mode
[ Cash ▼ ]

[ Save ]
```

Payment modes:

- Cash
- UPI
- Cheque
- Bank

---

## 23. Return Form

For returns:

```text
Return Type
[ Full Bill ▼ ]

Return Amount
[ __________ ]

Reason
[ Product Return ▼ ]

Remark
[ __________ ]

[ Save ]
```

Possible return types:

- Full Bill
- Partial Product Return

---

## 24. Not Delivered Form

```text
Reason
[ Shop Closed ▼ ]

Remark
[ __________ ]

[ Save ]
```

---

## 25. Dashboard Concept

The first version of the dashboard should show:

```text
BILL DELIVERY & COLLECTION DASHBOARD

Dashboard Date: 11-Aug-2026

TOTAL BILLS      DELIVERED      PENDING
48               35             8

NOT DELIVERED    RETURNED      DELIVERY RATE
3                2             72.9%

BILL VALUE       DELIVERED VALUE     AMOUNT COLLECTED
₹284,500         ₹215,000            ₹79,500

RETURN VALUE     UNPAID DELIVERED    COLLECTION %
₹12,500          ₹135,500            36.9%
```

Future dashboard improvements:

- Date filter
- Salesman filter
- Party filter
- Today's pending
- Collection by payment mode
- Return analysis
- Delivery-person performance
- Party-wise performance
- Daily/weekly/monthly charts

---

## 26. Core Design Principle

The application should prioritize **speed over data entry**.

### Normal path

```text
SCAN
 ↓
DELIVERED
 ↓
NEXT
```

### Exception path

```text
SCAN
 ↓
MORE OPTIONS
 ↓
ENTER ADDITIONAL INFORMATION
 ↓
SAVE
```

This keeps routine delivery fast while retaining enough information for accounting and operational tracking.

---

## 27. Future Improvements

Recommended after the basic pipeline is stable:

### Delivery person identity

Add:

```text
Delivered By
```

so reports can be filtered by salesperson/driver.

### Today's route

Show:

- Bills scanned today
- Delivered
- Pending
- Returns
- Collections

### Pending list

A mobile page showing only invoices that are still:

```text
Pending
Not Delivered
```

### Search

Search by:

- Invoice number
- Party name

### Edit history

Allow an authorized user to correct an existing record.

### Payment reconciliation

Separate:

- Bill amount
- Collected amount
- Remaining amount

### Multiple payments

If required later, move payment events into their own transaction table rather than storing only one current payment value.

### Authentication

If the app will be exposed outside the delivery team, introduce authentication/user identification.

---

## 28. End-to-End Example

QR:

```text
IN-FY26/27-3506,ABC Store,30,099.00
```

Scan result:

```text
Invoice No: IN-FY26/27-3506
Party Name: ABC Store
Bill Amount: ₹30,099.00
Status: Pending
```

User taps:

```text
✓ DELIVERED
```

Current sheet:

```text
Invoice No: IN-FY26/27-3506
Party Name: ABC Store
Bill Amount: 30099
QR Raw Data: IN-FY26/27-3506,ABC Store,30,099.00
Status: Delivered
```

No other input is required.

The scanner then returns to the camera.

---

## 29. Key Technical Decisions

### Source of truth

QR code for initial bill data.

### Current state

`Scanned Bills`

### History

`Delivery Log`

### Analytics

`Dashboard`

### Camera

Standalone HTTPS scanner page.

### Backend

Google Apps Script.

### Database

Google Sheets.

### QR parsing

First two commas are separators; everything after second comma is amount.

### Normal delivery

One-tap Delivered.

### Exceptions

Additional form.

### Duplicate scan protection

Temporary same-QR lock.

---

## 30. Current Project Status

The project has already been tested conceptually around the following issues:

- QR returns invoice, party, amount
- QR can contain comma-formatted amounts
- Apps Script camera access is restricted
- Standalone HTTPS scanner is the correct camera architecture
- Camera may select ultrawide on multi-lens phones
- Main camera should be preferred where the browser exposes camera labels
- Normal delivery should require minimal input
- Payment/return/not-delivered information should be captured only when needed
- Raw QR payload should always be preserved

---

## 31. Recommended Next Build Step

Once the scanner + Apps Script pipeline is stable, the next version should add:

1. A dedicated **Today's Delivery** dashboard in the mobile web app.
2. Delivery person selection/login.
3. Pending bill list.
4. Payment collection summary.
5. Party-wise and date-wise reporting.
6. Better camera selection including a manual **1× / 0.5× / 2×** option on devices that expose zoom/lens controls.
7. An optional offline queue so scans/actions are not lost in weak-network areas.

---

## 32. Final Intended User Experience

The finished application should feel like a purpose-built delivery scanning app:

```text
OPEN APP
   ↓
CAMERA READY
   ↓
SCAN BILL
   ↓
BILL DETAILS
   ↓
✓ DELIVERED
   ↓
SAVED
   ↓
CAMERA READY
   ↓
SCAN NEXT BILL
```

Exceptions are handled separately without slowing down the normal workflow.
