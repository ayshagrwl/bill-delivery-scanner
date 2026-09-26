/**
 * =========================================================================
 * BILL DELIVERY & COLLECTION TRACKER - GOOGLE APPS SCRIPT BACKEND
 * =========================================================================
 * Version: 2.0.0
 * 
 * Features:
 * - Scan bill & parse QR code (handles formatted amounts with commas)
 * - Fast single-tap delivery recording
 * - Full exception recording (Delivered + Payment, Not Delivered, Returns)
 * - Batch offline queue synchronization
 * - Today's route & metrics API for mobile dashboard
 * - Connection health check (ping)
 * - Automated Dashboard generation with formulas & KPI formatting
 * - Delivery agent attribution & timestamping
 * 
 * Deployment:
 * 1. Extensions -> Apps Script
 * 2. Paste this code into Code.gs
 * 3. Deploy -> New deployment -> Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 4. Copy the /exec URL into index.html
 * =========================================================================
 */

const BILL_SHEET = 'Scanned Bills';
const LOG_SHEET = 'Delivery Log';
const DASHBOARD_SHEET = 'Dashboard';

const BILL_HEADERS = [
  'Invoice No',
  'Party Name',
  'Bill Amount',
  'QR Raw Data',
  'First Scanned At',
  'Status',
  'Action Date/Time',
  'Paid Amount',
  'Payment Mode',
  'Return Type',
  'Return Amount',
  'Reason',
  'Remark',
  'Delivered By',
  'Payment Ref',
  'Last Updated At'
];

const LOG_HEADERS = [
  'Log ID',
  'Invoice No',
  'Party Name',
  'Bill Amount',
  'Status',
  'Action Date/Time',
  'Paid Amount',
  'Payment Mode',
  'Return Type',
  'Return Amount',
  'Reason',
  'Remark',
  'Delivered By',
  'Payment Ref'
];

/**
 * Handle incoming GET requests (supports JSONP and JSON response)
 */
function doGet(e) {
  try {
    initializeSystem();
    const action = (e && e.parameter && e.parameter.action) || 'ping';
    const callback = e && e.parameter && e.parameter.callback;

    let result;

    switch (action) {
      case 'ping':
        result = {
          success: true,
          status: 'online',
          timestamp: new Date().toISOString(),
          version: '2.0.0',
          message: 'Bill Delivery Tracker API is active.'
        };
        break;

      case 'scan':
        result = scanBill(e.parameter.qr || '', e.parameter.deliveryPerson || '');
        break;

      case 'update':
        result = updateBill({
          invoiceNo: e.parameter.invoiceNo || '',
          status: e.parameter.status || '',
          paidAmount: e.parameter.paidAmount || '',
          paymentMode: e.parameter.paymentMode || '',
          returnType: e.parameter.returnType || '',
          returnAmount: e.parameter.returnAmount || '',
          reason: e.parameter.reason || '',
          remark: e.parameter.remark || '',
          deliveryPerson: e.parameter.deliveryPerson || '',
          paymentRef: e.parameter.paymentRef || ''
        });
        break;

      case 'batch_sync':
        result = batchSyncBills(e.parameter.batchData || '[]');
        break;

      case 'today':
      case 'list':
        result = getTodayBills(e.parameter.date || '');
        break;

      case 'summary':
        result = getSummaryMetrics();
        break;

      case 'search':
      case 'find':
        result = searchBills(e.parameter.query || '', e.parameter.deliveryPerson || '');
        break;

      default:
        result = {
          success: false,
          error: 'Invalid API action: ' + action
        };
    }

    return sendResponse_(result, callback);

  } catch (error) {
    const errorResult = {
      success: false,
      error: error.message || String(error)
    };
    return sendResponse_(errorResult, e && e.parameter && e.parameter.callback);
  }
}

/**
 * Handle incoming POST requests for large batch syncs or updates
 */
function doPost(e) {
  try {
    initializeSystem();
    let body = {};
    if (e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }

    const action = body.action || (e && e.parameter && e.parameter.action) || 'ping';
    let result;

    switch (action) {
      case 'batch_sync':
        result = batchSyncBills(body.batchData || []);
        break;
      case 'update':
        result = updateBill(body);
        break;
      case 'scan':
        result = scanBill(body.qr || '', body.deliveryPerson || '');
        break;
      case 'search':
      case 'find':
        result = searchBills(body.query || '', body.deliveryPerson || '');
        break;
      default:
        result = { success: true, timestamp: new Date().toISOString() };
    }

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.message || String(error)
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Send either JSONP (for cross-origin script tags) or JSON response
 */
function sendResponse_(data, callback) {
  if (callback) {
    const safeCallback = String(callback).replace(/[^a-zA-Z0-9_.$]/g, '');
    return ContentService
      .createTextOutput(safeCallback + '(' + JSON.stringify(data) + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  } else {
    return ContentService
      .createTextOutput(JSON.stringify(data))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Initialize Sheets and create Dashboard if not present
 */
function initializeSystem() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Scanned Bills Sheet
  let billSheet = ss.getSheetByName(BILL_SHEET);
  if (!billSheet) {
    billSheet = ss.insertSheet(BILL_SHEET);
  }

  if (billSheet.getLastRow() === 0) {
    billSheet.getRange(1, 1, 1, BILL_HEADERS.length).setValues([BILL_HEADERS]);
    formatHeader_(billSheet, '#1e293b');
    billSheet.setFrozenRows(1);
    billSheet.getRange(1, 3, 1000, 1).setNumberFormat('₹#,##0.00'); // Bill Amount
    billSheet.getRange(1, 8, 1000, 1).setNumberFormat('₹#,##0.00'); // Paid Amount
    billSheet.getRange(1, 11, 1000, 1).setNumberFormat('₹#,##0.00'); // Return Amount
  }

  // 2. Delivery Log Sheet
  let logSheet = ss.getSheetByName(LOG_SHEET);
  if (!logSheet) {
    logSheet = ss.insertSheet(LOG_SHEET);
  }

  if (logSheet.getLastRow() === 0) {
    logSheet.getRange(1, 1, 1, LOG_HEADERS.length).setValues([LOG_HEADERS]);
    formatHeader_(logSheet, '#334155');
    logSheet.setFrozenRows(1);
    logSheet.getRange(1, 4, 1000, 1).setNumberFormat('₹#,##0.00');
    logSheet.getRange(1, 7, 1000, 1).setNumberFormat('₹#,##0.00');
    logSheet.getRange(1, 10, 1000, 1).setNumberFormat('₹#,##0.00');
  }

  // 3. Dashboard Sheet
  createDashboard_();
}

/**
 * Parse QR raw string:
 * Format: "Invoice,Party,Amount" (Amount may contain commas, e.g., "1,300.00" or "30,099.00")
 */
function parseQR(qrRaw) {
  qrRaw = String(qrRaw || '').trim();

  if (!qrRaw) {
    throw new Error('QR data is empty.');
  }

  const firstComma = qrRaw.indexOf(',');
  if (firstComma === -1) {
    throw new Error('Invalid QR: Missing invoice separator.');
  }

  const secondComma = qrRaw.indexOf(',', firstComma + 1);
  if (secondComma === -1) {
    throw new Error('Invalid QR: Missing party separator.');
  }

  const invoiceNo = qrRaw.substring(0, firstComma).trim();
  const partyName = qrRaw.substring(firstComma + 1, secondComma).trim();
  const amountText = qrRaw.substring(secondComma + 1).trim();

  const cleanAmount = amountText
    .replace(/,/g, '')
    .replace(/₹/g, '')
    .replace(/\s/g, '')
    .trim();

  const amount = Number(cleanAmount);

  if (!invoiceNo) {
    throw new Error('Invoice number is missing in QR.');
  }
  if (!partyName) {
    throw new Error('Party name is missing in QR.');
  }
  if (!amountText) {
    throw new Error('Amount is missing in QR.');
  }
  if (isNaN(amount) || amount < 0) {
    throw new Error('Invalid numeric amount in QR: ' + amountText);
  }

  return {
    invoiceNo: invoiceNo,
    partyName: partyName,
    amount: amount,
    raw: qrRaw,
    amountText: amountText
  };
}

/**
 * Scan a bill QR code.
 * If already scanned, returns current state. If new, adds record as Pending.
 */
function scanBill(qrRaw, deliveryPerson) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const parsed = parseQR(qrRaw);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(BILL_SHEET);
    const rows = sheet.getDataRange().getValues();

    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][0]).trim() === parsed.invoiceNo) {
        return {
          success: true,
          existing: true,
          invoiceNo: rows[i][0],
          partyName: rows[i][1],
          amount: Number(rows[i][2]),
          raw: rows[i][3],
          firstScannedAt: rows[i][4],
          status: rows[i][5] || 'Pending',
          actionDateTime: rows[i][6] || '',
          paidAmount: rows[i][7] !== '' ? Number(rows[i][7]) : '',
          paymentMode: rows[i][8] || '',
          returnType: rows[i][9] || '',
          returnAmount: rows[i][10] !== '' ? Number(rows[i][10]) : '',
          reason: rows[i][11] || '',
          remark: rows[i][12] || '',
          deliveredBy: rows[i][13] || '',
          paymentRef: rows[i][14] || '',
          lastUpdatedAt: rows[i][15] || ''
        };
      }
    }

    const now = new Date();
    sheet.appendRow([
      parsed.invoiceNo,
      parsed.partyName,
      parsed.amount,
      parsed.raw,
      now,
      'Pending',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      deliveryPerson || '',
      '',
      now
    ]);

    return {
      success: true,
      existing: false,
      invoiceNo: parsed.invoiceNo,
      partyName: parsed.partyName,
      amount: parsed.amount,
      raw: parsed.raw,
      status: 'Pending',
      firstScannedAt: now,
      deliveredBy: deliveryPerson || ''
    };

  } finally {
    lock.releaseLock();
  }
}

/**
 * Update a bill's delivery status and append a record to Delivery Log
 */
function updateBill(data) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(BILL_SHEET);
    const logSheet = ss.getSheetByName(LOG_SHEET);

    const invoiceNo = String(data.invoiceNo || '').trim();
    if (!invoiceNo) {
      throw new Error('Invoice number is required.');
    }

    const rows = sheet.getDataRange().getValues();
    let rowNumber = -1;
    let bill = null;

    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][0]).trim() === invoiceNo) {
        rowNumber = i + 1;
        bill = {
          invoiceNo: rows[i][0],
          partyName: rows[i][1],
          amount: Number(rows[i][2])
        };
        break;
      }
    }

    if (rowNumber === -1) {
      throw new Error('Invoice not found: ' + invoiceNo);
    }

    const status = data.status || 'Pending';

    let paidAmount = '';
    if (data.paidAmount !== '' && data.paidAmount !== undefined && data.paidAmount !== null) {
      paidAmount = Number(data.paidAmount);
      if (isNaN(paidAmount) || paidAmount < 0) {
        throw new Error('Invalid paid amount.');
      }
    }

    let returnAmount = '';
    if (data.returnAmount !== '' && data.returnAmount !== undefined && data.returnAmount !== null) {
      returnAmount = Number(data.returnAmount);
      if (isNaN(returnAmount) || returnAmount < 0) {
        throw new Error('Invalid return amount.');
      }
    }

    const now = new Date();
    const deliveryPerson = data.deliveryPerson || '';
    const paymentRef = data.paymentRef || '';

    // Update Scanned Bills row
    sheet.getRange(rowNumber, 6, 1, 11).setValues([[
      status,
      now,
      paidAmount,
      data.paymentMode || '',
      data.returnType || '',
      returnAmount,
      data.reason || '',
      data.remark || '',
      deliveryPerson,
      paymentRef,
      now
    ]]);

    // Log to Delivery Log
    const logId = 'LOG-' + Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyyMMdd-HHmmss') + '-' + Math.floor(1000 + Math.random() * 9000);

    logSheet.appendRow([
      logId,
      bill.invoiceNo,
      bill.partyName,
      bill.amount,
      status,
      now,
      paidAmount,
      data.paymentMode || '',
      data.returnType || '',
      returnAmount,
      data.reason || '',
      data.remark || '',
      deliveryPerson,
      paymentRef
    ]);

    return {
      success: true,
      invoiceNo: bill.invoiceNo,
      partyName: bill.partyName,
      amount: bill.amount,
      status: status,
      paidAmount: paidAmount,
      paymentMode: data.paymentMode || '',
      returnType: data.returnType || '',
      returnAmount: returnAmount,
      reason: data.reason || '',
      remark: data.remark || '',
      deliveredBy: deliveryPerson,
      timestamp: now.toISOString()
    };

  } finally {
    lock.releaseLock();
  }
}

/**
 * Batch synchronize offline queue actions
 */
function batchSyncBills(batchDataRaw) {
  let items = [];
  if (typeof batchDataRaw === 'string') {
    try {
      items = JSON.parse(batchDataRaw);
    } catch (e) {
      items = [];
    }
  } else if (Array.isArray(batchDataRaw)) {
    items = batchDataRaw;
  }

  if (!items || items.length === 0) {
    return { success: true, processedCount: 0, results: [] };
  }

  const results = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    try {
      if (item.action === 'scan' || item.type === 'scan') {
        const scanRes = scanBill(item.qr, item.deliveryPerson);
        results.push({ id: item.id || item.invoiceNo, success: true, scanResult: scanRes });
      } else {
        // default to update
        const updateRes = updateBill(item);
        results.push({ id: item.id || item.invoiceNo, success: true, updateResult: updateRes });
      }
    } catch (err) {
      results.push({ id: item.id || item.invoiceNo, success: false, error: err.message });
    }
  }

  return {
    success: true,
    processedCount: results.filter(r => r.success).length,
    failedCount: results.filter(r => !r.success).length,
    results: results
  };
}

/**
 * Search bills in Scanned Bills sheet by invoice number (e.g. last 4 digits, partial, or full invoice)
 */
function searchBills(query, deliveryPerson) {
  const queryStr = String(query || '').trim();
  if (!queryStr) {
    return { success: false, error: 'Search query is required.' };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(BILL_SHEET);
  if (!sheet) {
    return { success: false, error: 'Scanned Bills sheet not found.' };
  }

  const rows = sheet.getDataRange().getValues();
  const cleanQuery = queryStr.toLowerCase();
  const queryDigits = cleanQuery.replace(/\D/g, '');
  const matches = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const inv = String(row[0] || '').trim();
    if (!inv) continue;

    const invLower = inv.toLowerCase();
    const invDigits = invLower.replace(/\D/g, '');

    const matchesLast = invLower.endsWith(cleanQuery);
    const matchesContains = invLower.includes(cleanQuery);
    const matchesDigits = (queryDigits.length >= 2 && invDigits.endsWith(queryDigits));

    if (matchesLast || matchesContains || matchesDigits) {
      matches.push({
        invoiceNo: row[0],
        partyName: row[1],
        amount: Number(row[2]) || 0,
        raw: row[3] || '',
        firstScannedAt: row[4] || '',
        status: row[5] || 'Pending',
        actionDateTime: row[6] || '',
        paidAmount: row[7] !== '' ? Number(row[7]) : '',
        paymentMode: row[8] || '',
        returnType: row[9] || '',
        returnAmount: row[10] !== '' ? Number(row[10]) : '',
        reason: row[11] || '',
        remark: row[12] || '',
        deliveredBy: row[13] || '',
        paymentRef: row[14] || '',
        lastUpdatedAt: row[15] || ''
      });
    }
  }

  return {
    success: true,
    query: queryStr,
    count: matches.length,
    bills: matches
  };
}

/**
 * Fetch bills scanned today and return aggregated route metrics
 */
function getTodayBills(dateStr) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(BILL_SHEET);
  const rows = sheet.getDataRange().getValues();

  let targetDate = new Date();
  if (dateStr) {
    targetDate = new Date(dateStr);
  }

  const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0);
  const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);

  const bills = [];
  let totalBills = 0;
  let deliveredCount = 0;
  let pendingCount = 0;
  let notDeliveredCount = 0;
  let returnedCount = 0;
  let totalValue = 0;
  let deliveredValue = 0;
  let cashCollected = 0;
  let upiCollected = 0;
  let totalCollected = 0;
  let returnTotal = 0;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const firstScanned = row[4] ? new Date(row[4]) : null;
    const actionDate = row[6] ? new Date(row[6]) : null;

    // Check if bill was scanned or updated today
    const matchesToday = (firstScanned && firstScanned >= startOfDay && firstScanned <= endOfDay) ||
                         (actionDate && actionDate >= startOfDay && actionDate <= endOfDay);

    if (matchesToday) {
      totalBills++;
      const status = String(row[5] || 'Pending').trim();
      const amount = Number(row[2]) || 0;
      const paid = Number(row[7]) || 0;
      const paymentMode = String(row[8] || '').trim();
      const retAmt = Number(row[10]) || 0;

      totalValue += amount;

      if (status === 'Delivered') {
        deliveredCount++;
        deliveredValue += amount;
      } else if (status === 'Pending') {
        pendingCount++;
      } else if (status === 'Not Delivered') {
        notDeliveredCount++;
      } else if (status === 'Returned') {
        returnedCount++;
      }

      if (paid > 0) {
        totalCollected += paid;
        const mode = paymentMode.toLowerCase();
        if (mode === 'cash') {
          cashCollected += paid;
        } else if (mode === 'upi' || mode === 'online' || mode.includes('upi') || mode.includes('online')) {
          upiCollected += paid;
        }
      }

      if (retAmt > 0) {
        returnTotal += retAmt;
      }

      bills.push({
        invoiceNo: row[0],
        partyName: row[1],
        amount: amount,
        raw: row[3],
        firstScannedAt: row[4],
        status: status,
        actionDateTime: row[6],
        paidAmount: row[7],
        paymentMode: paymentMode,
        returnType: row[9],
        returnAmount: row[10],
        reason: row[11],
        remark: row[12],
        deliveredBy: row[13],
        paymentRef: row[14],
        lastUpdatedAt: row[15]
      });
    }
  }

  // Sort latest first
  bills.reverse();

  return {
    success: true,
    date: startOfDay.toISOString(),
    metrics: {
      totalBills: totalBills,
      deliveredCount: deliveredCount,
      pendingCount: pendingCount,
      notDeliveredCount: notDeliveredCount,
      returnedCount: returnedCount,
      deliveryRate: totalBills > 0 ? (deliveredCount / totalBills) : 0,
      totalValue: totalValue,
      deliveredValue: deliveredValue,
      totalCollected: totalCollected,
      cashCollected: cashCollected,
      upiCollected: upiCollected,
      returnTotal: returnTotal,
      unpaidDelivered: Math.max(0, deliveredValue - totalCollected)
    },
    bills: bills
  };
}

/**
 * Summary metrics helper
 */
function getSummaryMetrics() {
  return getTodayBills('');
}

/**
 * Build Dashboard Sheet with professional layout and KPI formulas
 */
function createDashboard_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(DASHBOARD_SHEET);
  if (!sheet) sheet = ss.insertSheet(DASHBOARD_SHEET);

  if (sheet.getLastRow() > 0) return;

  // Title Banner
  sheet.getRange('A1:H1').merge();
  sheet.getRange('A1')
    .setValue('🚀 BILL DELIVERY & COLLECTION LIVE DASHBOARD')
    .setFontSize(16)
    .setFontWeight('bold')
    .setBackground('#0f172a')
    .setFontColor('#ffffff')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');
  sheet.setRowHeight(1, 44);

  sheet.getRange('A3').setValue('Dashboard Date:').setFontWeight('bold');
  sheet.getRange('B3').setFormula('=TODAY()').setNumberFormat('yyyy-mm-dd');

  // KPI Section 1: Volumes
  sheet.getRange('A5:B5').merge().setValue('TOTAL BILLS').setFontWeight('bold').setBackground('#e2e8f0');
  sheet.getRange('A6:B6').merge().setFormula('=COUNTIFS(\'Scanned Bills\'!E:E,">="&B3,\'Scanned Bills\'!E:E,"<"&B3+1)').setFontSize(14).setFontWeight('bold').setHorizontalAlignment('center');

  sheet.getRange('D5:E5').merge().setValue('DELIVERED').setFontWeight('bold').setBackground('#dcfce7').setFontColor('#166534');
  sheet.getRange('D6:E6').merge().setFormula('=COUNTIFS(\'Scanned Bills\'!G:G,">="&B3,\'Scanned Bills\'!G:G,"<"&B3+1,\'Scanned Bills\'!F:F,"Delivered")').setFontSize(14).setFontWeight('bold').setFontColor('#166534').setHorizontalAlignment('center');

  sheet.getRange('G5:H5').merge().setValue('PENDING').setFontWeight('bold').setBackground('#fef3c7').setFontColor('#92400e');
  sheet.getRange('G6:H6').merge().setFormula('=COUNTIF(\'Scanned Bills\'!F:F,"Pending")').setFontSize(14).setFontWeight('bold').setFontColor('#92400e').setHorizontalAlignment('center');

  // KPI Section 2: Exceptions
  sheet.getRange('A8:B8').merge().setValue('NOT DELIVERED').setFontWeight('bold').setBackground('#fee2e2').setFontColor('#991b1b');
  sheet.getRange('A9:B9').merge().setFormula('=COUNTIFS(\'Scanned Bills\'!G:G,">="&B3,\'Scanned Bills\'!G:G,"<"&B3+1,\'Scanned Bills\'!F:F,"Not Delivered")').setFontSize(13).setHorizontalAlignment('center');

  sheet.getRange('D8:E8').merge().setValue('RETURNED').setFontWeight('bold').setBackground('#fce7f3').setFontColor('#9d174d');
  sheet.getRange('D9:E9').merge().setFormula('=COUNTIFS(\'Scanned Bills\'!G:G,">="&B3,\'Scanned Bills\'!G:G,"<"&B3+1,\'Scanned Bills\'!F:F,"Returned")').setFontSize(13).setHorizontalAlignment('center');

  sheet.getRange('G8:H8').merge().setValue('DELIVERY RATE').setFontWeight('bold').setBackground('#f1f5f9');
  sheet.getRange('G9:H9').merge().setFormula('=IFERROR(D6/A6,0)').setFontSize(13).setFontWeight('bold').setNumberFormat('0.0%').setHorizontalAlignment('center');

  // KPI Section 3: Financials
  sheet.getRange('A12').setValue('TOTAL BILL VALUE').setFontWeight('bold');
  sheet.getRange('B12').setFormula('=SUMIFS(\'Scanned Bills\'!C:C,\'Scanned Bills\'!E:E,">="&B3,\'Scanned Bills\'!E:E,"<"&B3+1)').setNumberFormat('₹#,##0.00');

  sheet.getRange('D12').setValue('DELIVERED VALUE').setFontWeight('bold');
  sheet.getRange('E12').setFormula('=SUMIFS(\'Scanned Bills\'!C:C,\'Scanned Bills\'!G:G,">="&B3,\'Scanned Bills\'!G:G,"<"&B3+1,\'Scanned Bills\'!F:F,"Delivered")').setNumberFormat('₹#,##0.00');

  sheet.getRange('G12').setValue('TOTAL COLLECTED').setFontWeight('bold');
  sheet.getRange('H12').setFormula('=SUMIFS(\'Scanned Bills\'!H:H,\'Scanned Bills\'!G:G,">="&B3,\'Scanned Bills\'!G:G,"<"&B3+1)').setNumberFormat('₹#,##0.00').setFontWeight('bold');

  sheet.getRange('A14').setValue('RETURN VALUE').setFontWeight('bold');
  sheet.getRange('B14').setFormula('=SUMIFS(\'Scanned Bills\'!K:K,\'Scanned Bills\'!G:G,">="&B3,\'Scanned Bills\'!G:G,"<"&B3+1)').setNumberFormat('₹#,##0.00');

  sheet.getRange('D14').setValue('UNPAID DELIVERED').setFontWeight('bold');
  sheet.getRange('E14').setFormula('=MAX(0,E12-H12)').setNumberFormat('₹#,##0.00');

  sheet.getRange('G14').setValue('COLLECTION %').setFontWeight('bold');
  sheet.getRange('H14').setFormula('=IFERROR(H12/E12,0)').setNumberFormat('0.0%').setFontWeight('bold');

  sheet.autoResizeColumns(1, 8);
}

function formatHeader_(sheet, bgColor) {
  sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .setFontWeight('bold')
    .setFontColor('#ffffff')
    .setBackground(bgColor || '#1e293b')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');
  sheet.setRowHeight(1, 32);
}

/**
 * Self test in Apps Script editor
 */
function testParser() {
  const tests = [
    'IN-FY26/27-3504,Milk ChaCha,405.00',
    'IN-FY26/27-3505,ABC Store,1,300.00',
    'IN-FY26/27-3506,ABC Store,30,099.00'
  ];

  tests.forEach(function(qr) {
    const res = parseQR(qr);
    Logger.log('Parsed: ' + res.invoiceNo + ' | ' + res.partyName + ' | ₹' + res.amount);
  });
}
