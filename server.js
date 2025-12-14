const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cookie = require('cookie');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');

const app = express();
app.use(express.json());

// NOTE: in dev we allow all origins. In production set specific origin.
app.use(cors({ origin: true, credentials: true }));

const SAP_BASE = 'https://my430301-api.s4hana.cloud.sap/sap/opu/odata/sap/YY1_GATEINWARD_OUTWARDDETA_CDS';
const SAP_BASE_WEIGHTBRIDGE = 'https://my430301-api.s4hana.cloud.sap/sap/opu/odata/sap/YY1_CAPTURINGWEIGHTDETAILS_CDS';
const SAP_BASE_InitialRegistration = 'https://my430301-api.s4hana.cloud.sap/sap/opu/odata/sap/YY1_INITIALREGISTRATION_CDS';
const SAP_BASE_UserAccess = 'https://my430301-api.s4hana.cloud.sap/sap/opu/odata/sap/YY1_USERACCESS_CDS';
const SAP_USER = 'BTPINTEGRATION';
const SAP_PASS = 'BTPIntegration@1234567890';

const SAP_BASE_PO = 'https://my430243-api.s4hana.cloud.sap/sap/opu/odata4/sap/api_purchaseorder_2/srvd_a2x/sap/purchaseorder/0001/';
const SAP_BASE_SO = 'https://my430243-api.s4hana.cloud.sap/sap/opu/odata/sap/API_SALES_ORDER_SRV';
const SAP_BASE_OBD ='https://my430243-api.s4hana.cloud.sap/sap/opu/odata/sap/API_OUTBOUND_DELIVERY_SRV;v=0002'
const SAP_BASE_BILLING = 'https://my430243-api.s4hana.cloud.sap/sap/opu/odata4/sap/api_billingdocument/srvd_a2x/sap/billingdocument/0001/';
const SAP_BASE_BILLING_PDF = 'https://my430243-api.s4hana.cloud.sap/sap/opu/odata/sap/API_BILLING_DOCUMENT_SRV';
const SAP_USER_ST = 'BTPDEV_INTEGRATION4';
const SAP_PASS_ST = 'Fq3imbvLy-EdchaDM@wKt<jjH&]T]AU8CzMNsM\\4';


if (!SAP_BASE || !SAP_USER || !SAP_PASS) {
  console.warn('Make sure SAP_BASE, SAP_USER and SAP_PASS env vars are set');
}

const sapAxios = axios.create({
  baseURL: SAP_BASE,
  auth: { 
    username: SAP_USER, 
    password: SAP_PASS 
  }
});

const sapAxiosWeight = axios.create({
  baseURL: SAP_BASE_WEIGHTBRIDGE,
  auth: { 
    username: SAP_USER, 
    password: SAP_PASS 
  }
});



const sapAxiosInitialRegistration = axios.create({
  baseURL: SAP_BASE_InitialRegistration,
  auth: { 
    username: SAP_USER, 
    password: SAP_PASS 
  }
});
const sapAxiosUserAccess = axios.create({
  baseURL: SAP_BASE_UserAccess,
  auth: { 
    username: SAP_USER, 
    password: SAP_PASS 
  }
});


const sapAxiosPO = axios.create({
  baseURL: SAP_BASE_PO,
  auth: { 
    username: SAP_USER_ST, 
    password: SAP_PASS_ST 
  }
});
const sapAxiosSO = axios.create({ 
  baseURL: SAP_BASE_SO,
  auth: { 
    username: SAP_USER_ST, 
    password: SAP_PASS_ST 
  }
});
const sapAxiosOBD = axios.create({
  baseURL: SAP_BASE_OBD,
  auth: { 
    username: SAP_USER_ST, 
    password: SAP_PASS_ST 
  }
});
const sapAxiosBilling = axios.create({
  baseURL: SAP_BASE_BILLING,
  auth: { 
    username: SAP_USER_ST, 
    password: SAP_PASS_ST 
  }
});
const sapAxiosBillingPDF = axios.create({
  baseURL: SAP_BASE_BILLING_PDF,
  auth: {
    username: SAP_USER_ST,
    password: SAP_PASS_ST
  }
});
/* ---------- Utility helpers ---------- */

async function fetchCsrfToken() {
  try {
    const res = await sapAxios.get('/', {
      headers: { 'x-csrf-token': 'Fetch' },
      validateStatus: () => true,
    });
    const token = res.headers['x-csrf-token'];
    const setCookie = res.headers['set-cookie'] || res.headers['Set-Cookie'] || [];
    const cookies = Array.isArray(setCookie)
      ? setCookie
          .map(c => {
            try {
              const parsed = cookie.parse(c);
              return Object.entries(parsed).map(([k, v]) => `${k}=${v}`).join('; ');
            } catch (e) {
              return c.split(';')[0];
            }
          })
          .join('; ')
      : (setCookie || '').toString();
    return { token, cookies };
  } catch (err) {
    console.error('fetchCsrfToken error', err?.response?.status, err?.message);
    throw err;
  }
}

async function fetchCsrfTokenWeight() {
  try {
    const res = await sapAxiosWeight.get('/', {
      headers: { 'x-csrf-token': 'Fetch' },
      validateStatus: () => true,
    });
    const token = res.headers['x-csrf-token'];
    const setCookie = res.headers['set-cookie'] || res.headers['Set-Cookie'] || [];
    const cookies = Array.isArray(setCookie)
      ? setCookie
          .map(c => {
            try {
              const parsed = cookie.parse(c);
              return Object.entries(parsed).map(([k, v]) => `${k}=${v}`).join('; ');
            } catch (e) {
              return c.split(';')[0];
            }
          })
          .join('; ')
      : (setCookie || '').toString();
    return { token, cookies };
  } catch (err) {
    console.error('fetchCsrfTokenWeight error', err?.response?.status, err?.message);
    throw err;
  }
}

/**
 * Fetch CSRF token + cookies for Initial Registration OData service.
 */
async function fetchCsrfTokenInitialRegistration() {
  try {
    const res = await sapAxiosInitialRegistration.get('/', {
      headers: { 'x-csrf-token': 'Fetch' },
      validateStatus: () => true,
    });
    const token = res.headers['x-csrf-token'];
    const setCookie = res.headers['set-cookie'] || res.headers['Set-Cookie'] || [];
    const cookies = Array.isArray(setCookie)
      ? setCookie
          .map(c => {
            try {
              const parsed = cookie.parse(c);
              return Object.entries(parsed).map(([k, v]) => `${k}=${v}`).join('; ');
            } catch (e) {
              return c.split(';')[0];
            }
          })
          .join('; ')
      : (setCookie || '').toString();

    if (!token) {
      console.warn('[WARN] No CSRF token returned for Initial Registration fetch');
    }
    return { token, cookies };
  } catch (err) {
    console.error('fetchCsrfTokenInitialRegistration error', err?.response?.status, err?.message);
    throw err;
  }
}

function sanitizePayloadForSapServerSide(input) {
  const payload = JSON.parse(JSON.stringify(input || {}));

  // Remove undefined/null and empty strings for top-level keys
  // BUT PRESERVE WeightDocNumber (the correct SAP field name)
  Object.keys(payload).forEach(k => {
    // Skip WeightDocNumber - let SAP validate it
    if (k === 'WeightDocNumber') return;
    
    if (payload[k] === undefined || payload[k] === null) delete payload[k];
    if (typeof payload[k] === 'string' && payload[k].trim() === '') delete payload[k];
  });

  // Normalize date if only date provided
  if (payload.GateEntryDate && payload.GateEntryDate.length === 10) {
    payload.GateEntryDate = `${payload.GateEntryDate}T00:00:00`;
  }
  if (payload.GateOutDate && payload.GateOutDate.length === 10) {
    payload.GateOutDate = `${payload.GateOutDate}T00:00:00`;
  }

  // Numeric cleaning for vendor weights and balances if provided as header-level fields
  for (let i = 1; i <= 5; i++) {
    const suffix = i === 1 ? '' : String(i);
    const wKey = `VendorInvoiceWeight${suffix}`;
    const bKey = `BalanceQty${suffix}`;

    if (wKey in payload) {
      const raw = payload[wKey];
      if (raw === '' || raw === null || raw === undefined) delete payload[wKey];
      else {
        const cleaned = String(raw).replace(/,/g, '').trim();
        const normalized = cleaned.replace(',', '.');
        if (/^-?\d+(\.\d+)?$/.test(normalized)) {
          payload[wKey] = normalized;
        } else {
          delete payload[wKey];
        }
      }
    }

    if (bKey in payload) {
      const raw = payload[bKey];
      if (raw === '' || raw === null || raw === undefined) delete payload[bKey];
      else {
        const cleaned = String(raw).replace(/,/g, '').trim();
        const normalized = cleaned.replace(',', '.');
        if (/^-?\d+(\.\d+)?$/.test(normalized)) {
          payload[bKey] = normalized;
        } else {
          delete payload[bKey];
        }
      }
    }
  }

  // Clean other numeric fields (TruckCapacity, TareWeight, GrossWeight, NetWeght, etc.)
  const numericFields = [
    'TruckCapacity', 'TareWeight', 'GrossWeight', 'NetWeght', 
    'DifferenceBT', 'ToleranceWeight', 'ActuallyWeight'
  ];
  
  numericFields.forEach(field => {
    if (field in payload) {
      const raw = payload[field];
      if (raw === '' || raw === null || raw === undefined) {
        delete payload[field];
      } else {
        const cleaned = String(raw).replace(/,/g, '').trim();
        const normalized = cleaned.replace(',', '.');
        if (/^-?\d+(\.\d+)?$/.test(normalized)) {
          payload[field] = normalized;
        } else {
          delete payload[field];
        }
      }
    }
  });

  return payload;
}

/* ---------- GateEntryNumber generator helpers ---------- */

// Mutex for atomic number generation
const { Mutex } = require('async-mutex');
const gateNumberMutex = new Mutex();

// Build prefix like '251' (YY + series code)
function buildPrefixFromYearAndCode(yearInput, codeInput) {
  const now = new Date();
  const year = (yearInput && String(yearInput).length === 4) ? String(yearInput) : String(now.getFullYear());
  const yy = year.slice(-2);
  const code = String(codeInput || '1');
  return `${yy}${code}`; //2510000001
}

function computeNextGateEntryNumber(prefix, latestGateNumber) {
  const suffixLength = 7; // 3(prefix) + 7 = 10 digits
  if (!latestGateNumber) return `${prefix}${String(1).padStart(suffixLength, '0')}`;
  const suffix = latestGateNumber.slice(prefix.length);
  const next = (parseInt(suffix, 10) || 0) + 1;
  return `${prefix}${String(next).padStart(suffixLength, '0')}`;
}

function computeNextWeightDocNumber(prefix, latestWeightNumber) {
  const suffixLength = 7; // 3(prefix) + 7 = 10 digits
  if (!latestWeightNumber) return `${prefix}${String(1).padStart(suffixLength, '0')}`; // FIXED
  const suffix = latestWeightNumber.slice(prefix.length); // FIXED
  const next = (parseInt(suffix, 10) || 0) + 1;
  return `${prefix}${String(next).padStart(suffixLength, '0')}`;
}

// Fetch latest gate entry number from SAP matching the prefix
async function getLatestGateEntryNumberFromSap(prefix) {
  try {
    const filter = `startswith(GateEntryNumber,'${prefix}')`;
    const path = `/YY1_GATEINWARD_OUTWARDDETA?$filter=${filter}&$orderby=GateEntryNumber desc&$top=1&$format=json`;
    const resp = await sapAxios.get(path);
    const results = resp.data?.d?.results || [];
    return results.length > 0 ? results[0].GateEntryNumber : null;
  } catch (err) {
    console.error('getLatestGateEntryNumberFromSap error', err?.message);
    return null;
  }
}

// Fetch latest weight document number from SAP matching the prefix
async function getLatestWeightDocNumberFromSap(prefix) {
  try {
    const filter = `startswith(WeightDocNumber,'${prefix}')`;
    const path = `/YY1_CAPTURINGWEIGHTDETAILS?$filter=${filter}&$orderby=WeightDocNumber desc&$top=1&$format=json`;
    console.log('[DEBUG] Fetching latest WeightDocNumber with path:', path);
    
    const resp = await sapAxiosWeight.get(path);
    console.log('[DEBUG] Weight query response:', JSON.stringify(resp.data, null, 2));
    
    const results = resp.data?.d?.results || [];
    const latestNumber = results.length > 0 ? results[0].WeightDocNumber : null;
    console.log('[DEBUG] Latest WeightDocNumber found:', latestNumber);
    
    return latestNumber;
  } catch (err) {
    console.error('getLatestWeightDocNumberFromSap error', err?.response?.status, err?.response?.data || err?.message);
    return null;
  }
}

/* ---------- API Routes ---------- */

// Simple request logger for debugging
app.use((req, res, next) => {
  console.log(`[API] ${req.method} ${req.originalUrl}`);
  if (Object.keys(req.body || {}).length) console.log(' body:', JSON.stringify(req.body));
  next();
});

// GET next gate number: /api/next-gatenumber?year=2025&code=3
app.get('/api/next-gatenumber', async (req, res) => {
  try {
    const { year, code } = req.query;
    const prefix = buildPrefixFromYearAndCode(year, code);
    const latest = await getLatestGateEntryNumberFromSap(prefix);
    const nextNumber = computeNextGateEntryNumber(prefix, latest);
    return res.json({ next: nextNumber });
  } catch (e) {
    console.error('next-gatenumber error', e?.response?.data || e.message);
    res.status(500).json({ error: e?.response?.data || e.message });
  }
});

// GET next weight number: /api/next-weightnumber?year=2025&code=1
app.get('/api/next-weightnumber', async (req, res) => {
  try {
    const { year, code } = req.query;
    const prefix = buildPrefixFromYearAndCode(year, code);
    console.log('[DEBUG] Generating next weight number for prefix:', prefix);
    
    const latest = await getLatestWeightDocNumberFromSap(prefix);
    const nextNumber = computeNextWeightDocNumber(prefix, latest);
    
    console.log('[DEBUG] Next WeightDocNumber:', nextNumber);
    return res.json({ next: nextNumber });
  } catch (e) {
    console.error('next-weightnumber error', e?.response?.data || e.message);
    res.status(500).json({ error: e?.response?.data || e.message });
  }
});

/* GET headers with query forwarding */
app.get('/api/headers', async (req, res) => {
  try {
    const rawQuery = (req.originalUrl || '').split('?')[1] || '';
    const sapPath = rawQuery ? `/YY1_GATEINWARD_OUTWARDDETA?${rawQuery}` : '/YY1_GATEINWARD_OUTWARDDETA?$top=50&$format=json';
    console.log('[API] forwarding to SAP ->', sapPath);
    const resp = await sapAxios.get(sapPath);
    res.json(resp.data);
  } catch (err) {
    console.error('Error fetching gate entry:', err?.response?.status, err?.response?.data || err?.message);
    res.status(500).json({ error: err?.response?.data || err?.message || 'Failed to fetch gate entry details' });
  }
});

/* GET header by GUID */
app.get('/api/headers/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const resp = await sapAxios.get(`/YY1_GATEINWARD_OUTWARDDETA(guid'${id}')?$format=json`);
    res.json(resp.data);
  } catch (err) {
    console.error(err?.response?.status, err?.response?.data || err.message);
    res.status(err?.response?.status || 500).json({ error: err?.response?.data || err?.message });
  }
});


/* GET items for a header */
app.get('/api/headers/:id/items', async (req, res) => {
  const id = req.params.id;
  try {
    const path = `/YY1_GATEINWARD_OUTWARDDETA(guid'${id}')/to_GateEntryItems?$format=json`;
    const resp = await sapAxios.get(path);
    res.json(resp.data);
  } catch (err) {
    console.error(err?.response?.status, err?.response?.data || err.message);
    res.status(err?.response?.status || 500).json({ error: err?.response?.data || err?.message });
  }
});

// POST new header (deep insert with items) - Gate Entry
app.post('/api/headers', async (req, res) => {
  // Only one request at a time can generate and assign a GateEntryNumber
  await gateNumberMutex.runExclusive(async () => {
    try {
      const input = sanitizePayloadForSapServerSide(req.body);

      // Generate GateEntryNumber if not present
      if (!input.GateEntryNumber) {
        // You may want to get year/code from input or use defaults
        const year = input.GateEntryDate ? String(input.GateEntryDate).slice(0, 4) : (new Date()).getFullYear();
        const code = input.SeriesCode || '1';
        const prefix = buildPrefixFromYearAndCode(year, code);
        const latest = await getLatestGateEntryNumberFromSap(prefix);
        input.GateEntryNumber = computeNextGateEntryNumber(prefix, latest);
      }

      const { token, cookies } = await fetchCsrfToken();
      const resp = await sapAxios.post('/YY1_GATEINWARD_OUTWARDDETA', input, {
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': token,
          Cookie: cookies,
        },
      });
      res.status(resp.status).json(resp.data);
    } catch (err) {
      console.error('POST header error', err?.response?.status, err?.response?.data || err?.message);
      res.status(err?.response?.status || 500).json({ error: err?.response?.data || err?.message });
    }
  });
});

/* POST Material Inward - Weight Bridge */
app.post('/api/headers/material/in', async (req, res) => {
  try {
    const input = sanitizePayloadForSapServerSide(req.body);
    
    // Ensure WeightDocNumber exists (SAP requires it)
    // Note: The field is WeightDocNumber (not WeightDocumentNumber)
    if (!input.WeightDocNumber) {
      console.error('[ERROR] WeightDocNumber is missing!');
      return res.status(400).json({ 
        error: 'WeightDocNumber is required. Please ensure it is generated on the frontend.' 
      });
    }

    const { token, cookies } = await fetchCsrfTokenWeight();

    console.log('[DEBUG] Sanitized payload for Material Inward:', JSON.stringify(input, null, 2));

    const resp = await sapAxiosWeight.post('/YY1_CAPTURINGWEIGHTDETAILS', input, {
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': token,
        Cookie: cookies,
      },
    });

    res.status(resp.status).json(resp.data);
  } catch (err) {
    console.error('POST Material Inward error', err?.response?.status, err?.response?.data || err?.message);
    res.status(err?.response?.status || 500).json({ error: err?.response?.data || err?.message });
  }
});

// /* POST Material Outward - Weight Bridge */
// app.post('/api/headers/material/out', async (req, res) => {
//   try {
//     const input = sanitizePayloadForSapServerSide(req.body);
    
//     // Ensure WeightDocNumber exists (SAP requires it)
//     if (!input.WeightDocNumber) {
//       console.error('[ERROR] WeightDocNumber is missing!');
//       return res.status(400).json({ 
//         error: 'WeightDocNumber is required. Please ensure it is generated on the frontend.' 
//       });
//     }

//     const { token, cookies } = await fetchCsrfTokenWeight();

//     console.log('[DEBUG] Sanitized payload for Material Outward:', JSON.stringify(input, null, 2));

//     const resp = await sapAxiosWeight.post('/YY1_CAPTURINGWEIGHTDETAILS', input, {
//       headers: {
//         'Content-Type': 'application/json',
//         'x-csrf-token': token,
//         Cookie: cookies,
//       },
//     });

//     res.status(resp.status).json(resp.data);
//   } catch (err) {
//     console.error('POST Material Outward error', err?.response?.status, err?.response?.data || err?.message);
//     res.status(err?.response?.status || 500).json({ error: err?.response?.data || err?.message });
//   }
// });

/* PATCH update header */
app.patch('/api/headers/:id', async (req, res) => {
  const id = req.params.id;
  const body = sanitizePayloadForSapServerSide(req.body);
  try {
    const { token, cookies } = await fetchCsrfToken();
    const path = `/YY1_GATEINWARD_OUTWARDDETA(guid'${id}')`;
    const resp = await sapAxios.patch(path, body, {
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': token,
        Cookie: cookies,
      },
      validateStatus: status => status < 500
    });
    if (resp.status === 204) return res.status(204).send();
    res.status(resp.status).json(resp.data);
  } catch (err) {
    console.error('PATCH header error', err?.response?.status, err?.response?.data || err?.message);
    res.status(err?.response?.status || 500).json({ error: err?.response?.data || err?.message });
  }
});

app.post('/api/headers/:id/pdf', async (req, res) => {
  const id = req.params.id;
  try {
    const resp = await sapAxios.get(`/YY1_GATEINWARD_OUTWARDDETA(guid'${id}')?$format=json`);
    const data = resp.data?.d || resp.data;

    const fields = [
      { label: "Internal Transfer Posting Entry", value: data.GateEntryNumber },
      { label: "Internal Transfer Posting Date", value: (data.GateEntryDate || '').slice(0, 10) },
      { label: "Vehicle Number", value: data.VehicleNumber },
      { label: "Transporter Name", value: data.TransporterName },
      { label: "Driver Name", value: data.DriverName },
      { label: "Gross Weight", value: data.GrossWeight },
      { label: "Tare Weight", value: data.TareWeight },
      { label: "Net Weight", value: data.NetWeight },
      { label: "Outward Time", value: data.OutwardTime },
      { label: "Remarks", value: data.Remarks },
    ];

    const doc = new PDFDocument({ margin: 40 });
    res.setHeader('Content-disposition', 'attachment; filename="header.pdf"');
    res.setHeader('Content-type', 'application/pdf');
    doc.pipe(res); // <-- Pipe before writing content!

    // Draw border rectangle
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const borderMargin = 20;
    doc.rect(borderMargin, borderMargin, pageWidth - 2 * borderMargin, pageHeight - 2 * borderMargin).stroke();

    // Title
    doc.fontSize(20).font('Helvetica-Bold').text('Truck Internal Transfer Posting Details', {
      align: 'center',
      underline: true
    });
    doc.moveDown(1.5);

    // Draw a line under the title
    doc.moveTo(borderMargin + 10, 80).lineTo(pageWidth - borderMargin - 10, 80).stroke();

    // Content
    let y = 100;
    fields.forEach(({ label, value }) => {
      doc.font('Helvetica-Bold').fontSize(13).text(`${label}:`, borderMargin + 30, y, { continued: true });
      doc.font('Helvetica').fontSize(13).text(` ${value ?? ''}`);
      y += 28;
      // Optional: draw a light line between fields
      doc.moveTo(borderMargin + 25, y - 6).lineTo(pageWidth - borderMargin - 25, y - 6).dash(1, { space: 2 }).stroke().undash();
    });

    // Footer (optional)
    doc.fontSize(10).fillColor('gray').text('Generated by Truck Internal Transfer Posting System', borderMargin, pageHeight - borderMargin - 10, { align: 'center' });

    doc.end(); // <-- End after all content is written
  } catch (err) {
    console.error('PDF generation error:', err);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});
/* POST create item under existing header */
app.post('/api/headers/:id/items', async (req, res) => {
  const id = req.params.id;
  const item = req.body;
  try {
    const { token, cookies } = await fetchCsrfToken();

    const resp = await sapAxios.post('/YY1_GATEENTRYITEMS_GATEINWA000', {
      ...item,
      SAP_PARENT_UUID: id
    }, {
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': token,
        Cookie: cookies,
      }
    });

    res.status(resp.status).json(resp.data);
  } catch (err) {
    console.error('POST item error', err?.response?.status, err?.response?.data || err?.message);
    res.status(err?.response?.status || 500).json({ error: err?.response?.data || err?.message });
  }
});

/* PATCH update item */
app.patch('/api/items/:id', async (req, res) => {
  const id = req.params.id;
  const body = req.body;
  try {
    const { token, cookies } = await fetchCsrfToken();
    const path = `/YY1_GATEENTRYITEMS_GATEINWA000(guid'${id}')`;
    const resp = await sapAxios.patch(path, body, {
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': token,
        Cookie: cookies,
      },
      validateStatus: status => status < 500
    });
    if (resp.status === 204) return res.status(204).send();
    res.status(resp.status).json(resp.data);
  } catch (err) {
    console.error('PATCH item error', err?.response?.status, err?.response?.data || err?.message);
    res.status(err?.response?.status || 500).json({ error: err?.response?.data || err?.message });
  }
});

/* DELETE item */
app.delete('/api/items/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const { token, cookies } = await fetchCsrfToken();
    const path = `/YY1_GATEENTRYITEMS_GATEINWA000(guid'${id}')`;
    const resp = await sapAxios.delete(path, {
      headers: {
        'x-csrf-token': token,
        Cookie: cookies,
      },
      validateStatus: status => status < 500
    });
    if (resp.status === 204) return res.status(204).send();
    res.status(resp.status).json(resp.data);
  } catch (err) {
    console.error('DELETE item error', err?.response?.status, err?.response?.data || err?.message);
    res.status(err?.response?.status || 500).json({ error: err?.response?.data || err?.message });
  }
});




const SAP_URL2 =
  "https://my430301-api.s4hana.cloud.sap/sap/opu/odata/sap/YY1_CAPTURINGWEIGHTDETAILS_CDS/YY1_CAPTURINGWEIGHTDETAILS";
const SAP_USER2 = "BTPINTEGRATION";
const SAP_PASS2 = "BTPIntegration@1234567890";
app.get("/api/header/weightdetails", async (req, res) => {
  try {
    const gateNumber = req.query.gateEntryNumber || req.query.GateEntryNumber;
    if (!gateNumber) {
      return res.status(400).json({ error: "Missing required parameter: gateNumber" });
    }

    // Proper OData filter string
    const filter = `$filter=GateEntryNumber eq '${gateNumber}'&$format=json`;
    const fullUrl = `${SAP_URL2}?${filter}`;

    console.log("[INFO] Fetching SAP Weight Details →", fullUrl);

    // Perform the SAP OData request
    const response = await axios.get(fullUrl, {
      auth: { username: SAP_USER2, password: SAP_PASS2 },
      headers: { Accept: "application/json" },
      validateStatus: () => true // prevents throwing error on 4xx
    });

    if (response.status >= 400) {
      console.error("[SAP ERROR]", response.status, response.data);
      return res.status(response.status).json({
        error: response.data || `SAP returned status ${response.status}`
      });
    }

    // Parse SAP OData V2 format
    const results =
      response.data?.d?.results || response.data?.value || (response.data?.d ? [response.data.d] : []);

    console.log(`[INFO] SAP returned ${results.length} record(s)`);

    // Filter only Indicators = "I" (Inward)
    const filteredResults = results.filter((r) => (r.Indicators || "").toUpperCase() === "I");

    // Return consistent JSON
    return res.json({
      d: {
        results: filteredResults
      }
    });
  } catch (error) {
    console.error("[API ERROR]", error.response?.status, error.response?.data || error.message);
    return res.status(error.response?.status || 500).json({
      error: error.response?.data || error.message || "Failed to fetch SAP data"
    });
  }
});


// GET Material Outward records (Indicators='O')
app.get("/api/header/weightdetails/outward", async (req, res) => {
  try {
    const gateNumber = req.query.gateEntryNumber || req.query.GateEntryNumber;
    if (!gateNumber) {
      return res.status(400).json({ error: "Missing required parameter: gateEntryNumber" });
    }

    const filter = `$filter=GateEntryNumber eq '${gateNumber}'&$format=json`;
    const fullUrl = `${SAP_URL2}?${filter}`;

    console.log("[INFO] Fetching SAP Weight Details (Outward) →", fullUrl);

    const response = await axios.get(fullUrl, {
      auth: { username: SAP_USER2, password: SAP_PASS2 },
      headers: { Accept: "application/json" },
      validateStatus: () => true
    });

    if (response.status >= 400) {
      console.error("[SAP ERROR]", response.status, response.data);
      return res.status(response.status).json({
        error: response.data || `SAP returned status ${response.status}`
      });
    }

    const results =
      response.data?.d?.results || response.data?.value || (response.data?.d ? [response.data.d] : []);

    console.log(`[INFO] SAP returned ${results.length} record(s)`);

    // Filter only Indicators = "O" (Outward)
    const filteredResults = results.filter((r) => (r.Indicators || "").toUpperCase() === "O");

    return res.json({
      d: {
        results: filteredResults
      }
    });
  } catch (error) {
    console.error("[API ERROR]", error.response?.status, error.response?.data || error.message);
    return res.status(error.response?.status || 500).json({
      error: error.response?.data || error.message || "Failed to fetch SAP data"
    });
  }
});

// GET Material Outward records by Vendor Invoice Number (Indicators='O')
app.get("/api/weightdetails/vendorinvoice/:VendorInvoiceNumber", async (req, res) => {
  try {
    const vendorInvoiceNumber = req.params.VendorInvoiceNumber;
    if (!vendorInvoiceNumber) {
      return res.status(400).json({ error: "Missing required parameter: vendorInvoiceNumber" });
    }

    const filter = `$filter=VendorInvoiceNumber eq '${vendorInvoiceNumber}'&$format=json`;
    const fullUrl = `${SAP_URL2}?${filter}`;

    console.log("[INFO] Fetching SAP Weight Details (Outward by VendorInvoiceNumber) →", fullUrl);

    const response = await axios.get(fullUrl, {
      auth: { username: SAP_USER2, password: SAP_PASS2 },
      headers: { Accept: "application/json" },
      validateStatus: () => true
    });

    if (response.status >= 400) {
      console.error("[SAP ERROR]", response.status, response.data);
      return res.status(response.status).json({
        error: response.data || `SAP returned status ${response.status}`
      });
    }

    const results =
      response.data?.d?.results || response.data?.value || (response.data?.d ? [response.data.d] : []);

    console.log(`[INFO] SAP returned ${results.length} record(s)`);

    // Filter only Indicators = "O" (Outward)
    const filteredResults = results.filter((r) => (r.Indicators || "").toUpperCase() === "O");

return res.json({ d: { results } });
  } catch (error) {
    console.error("[API ERROR]", error.response?.status, error.response?.data || error.message);
    return res.status(error.response?.status || 500).json({
      error: error.response?.data || error.message || "Failed to fetch SAP data"
    });
  }
});



/* PATCH Update Material Inward (for tare weight) */
app.patch('/api/headers/material/:uuid', async (req, res) => {
  const uuid = req.params.uuid;
  const body = sanitizePayloadForSapServerSide(req.body);
  try {
    const { token, cookies } = await fetchCsrfTokenWeight();
    
    // REMOVE $format=json from PATCH - SAP doesn't allow query options on updates
    const path = `/YY1_CAPTURINGWEIGHTDETAILS(guid'${uuid}')`;
    
    console.log('[DEBUG] Updating Material Inward:', path);
    console.log('[DEBUG] Update payload:', JSON.stringify(body, null, 2));
    
    const resp = await sapAxiosWeight.patch(path, body, {
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': token,
        'If-Match': '*', // to avoid 412 Precondition Failed
        Cookie: cookies,
      },
      validateStatus: status => status < 500
    });
    
    if (resp.status === 204) return res.status(204).send();
    res.status(resp.status).json(resp.data);
  } catch (err) {
    console.error('PATCH Material Inward error', err?.response?.status, err?.response?.data || err?.message);
    res.status(err?.response?.status || 500).json({ error: err?.response?.data || err?.message });
  }
});



// Example: PATCH /api/headers/material/:docNumber
app.patch('/api/headers/material/obd/:docNumber', async (req, res) => {
  const docNumber = req.params.docNumber;
  const updateFields = sanitizePayloadForSapServerSide(req.body);
  try {
    // 1. Fetch the record by WeightDocNumber to get the UUID
    const getResp = await sapAxiosWeight.get(`/YY1_CAPTURINGWEIGHTDETAILS?$filter=WeightDocNumber eq '${docNumber}'&$format=json`);
    const results = getResp.data?.d?.results || [];
    if (!results.length) return res.status(404).json({ error: 'Record not found' });
    const uuid = results[0].SAP_UUID || results[0].UUID || results[0].Guid || results[0].GUID;
    if (!uuid) return res.status(400).json({ error: 'UUID not found for this record' });


    // 2. Fetch the full record, merge, and PATCH using the UUID
    const fullResp = await sapAxiosWeight.get(`/YY1_CAPTURINGWEIGHTDETAILS(guid'${uuid}')?$format=json`);
    const existing = fullResp.data?.d || fullResp.data;
    const merged = { ...existing, ...updateFields };
    delete merged.__metadata;
    delete merged.__proto__;

    // Ensure WeightDocNumber is always the original docNumber (max 10 chars, not UUID)
    if (typeof merged.WeightDocNumber === 'string' && merged.WeightDocNumber.length > 10) {
      merged.WeightDocNumber = docNumber;
    }

    const { token, cookies } = await fetchCsrfTokenWeight();
    const path = `/YY1_CAPTURINGWEIGHTDETAILS(guid'${uuid}')`;

    const resp = await sapAxiosWeight.patch(path, merged, {
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': token,
        'If-Match': '*',
        Cookie: cookies,
      },
      validateStatus: status => status < 500
    });

    if (resp.status === 204) return res.status(204).send();
    res.status(resp.status).json(resp.data);
  } catch (err) {
    console.error('PATCH Material Inward error', err?.response?.status, err?.response?.data || err?.message);
    res.status(err?.response?.status || 500).json({ error: err?.response?.data || err?.message });
  }
});


// Build Initial Registration prefix like '25' + '00000000' for year 2025
function buildInitialRegPrefix(yearInput) {
  const now = new Date();
  const year = (yearInput && String(yearInput).length === 4) ? String(yearInput) : String(now.getFullYear());
  return year.slice(-2) + '00000000';
}

// Build Initial Registration prefix like '25' for year 2025
function buildInitialRegPrefix(yearInput) {
  const now = new Date();
  const year = (yearInput && String(yearInput).length === 4) ? String(yearInput) : String(now.getFullYear());
  return year.slice(-2); // Just the 2-digit year
}

// Compute next Initial Registration number
function computeNextInitialRegNumber(yearPrefix, latestRegNumber) {
  const suffixLength = 8; // 8 digits after year = total 10 digits
  
  if (!latestRegNumber) {
    // First number for this year
    return `${yearPrefix}${String(1).padStart(suffixLength, '0')}`;
  }
  
  // Extract current suffix
  const currentSuffix = latestRegNumber.slice(2); // Remove first 2 characters (year)
  const currentSuffixNum = parseInt(currentSuffix, 10);
  
  if (isNaN(currentSuffixNum)) {
    // Invalid number, start from 1
    return `${yearPrefix}${String(1).padStart(suffixLength, '0')}`;
  }
  
  // Compute next suffix
  const nextSuffixNum = currentSuffixNum + 1;
  
  // Format back to 8 digits
  const nextSuffix = String(nextSuffixNum).padStart(suffixLength, '0');
  
  return `${yearPrefix}${nextSuffix}`;
}

// Fetch latest Initial Registration number from SAP matching the year prefix
async function getLatestInitialRegNumberFromSap(yearPrefix) {
  try {
    // Filter by year prefix (first 2 digits)
    const filter = `startswith(RegistrationNumber,'${yearPrefix}')`;
    const path = `/YY1_INITIALREGISTRATION?$filter=${filter}&$orderby=RegistrationNumber desc&$top=1&$format=json`;
    console.log('[DEBUG] Fetching latest Initial Registration number from SAP:', path);
    const resp = await sapAxiosInitialRegistration.get(path);
    
    // Handle different OData response formats
    let results = [];
    if (resp.data && resp.data.d && resp.data.d.results) {
      results = resp.data.d.results;
    } else if (resp.data && resp.data.value) {
      results = resp.data.value;
    }
    
    const latestNumber = results.length > 0 ? results[0].RegistrationNumber : null;
    console.log('[DEBUG] Latest Initial Registration number found:', latestNumber);
    return latestNumber;
  } catch (e) {
    console.error('Error fetching latest Initial Registration number', e);
    return null;
  }
}

// Utility: Generate Initial Registration Number (year-based series)
const getNextInitialRegNumber = async (yearInput) => {
  const yearPrefix = buildInitialRegPrefix(yearInput);
  console.log('[DEBUG] Year prefix:', yearPrefix);
  
  const latest = await getLatestInitialRegNumberFromSap(yearPrefix);
  console.log('[DEBUG] Latest number from SAP:', latest);
  
  const nextNumber = computeNextInitialRegNumber(yearPrefix, latest);
  console.log('[DEBUG] Computed next number:', nextNumber);
  
  return nextNumber;
};

// Mutex for atomic Initial Registration number generation
//const { Mutex } = require('async-mutex');
const initialRegMutex = new Mutex();

// Initial Registration POST
app.post('/api/initial-registration', async (req, res) => {
  await initialRegMutex.runExclusive(async () => {
    try {
      console.log('[DEBUG] Initial Registration request received:', req.body);
      // Use year from payload if present, else current year
      const year = req.body.RegistrationYear || (req.body.RegistrationDate ? String(req.body.RegistrationDate).slice(0, 4) : (new Date()).getFullYear());
      // Generate RegistrationNumber
      const registrationNumber = await getNextInitialRegNumber(year);
      console.log('[DEBUG] Generated RegistrationNumber:', registrationNumber);
      // Remove BalanceQty from payload if present
      const { BalanceQty, ...rest } = req.body;
      const input = sanitizePayloadForSapServerSide({ ...rest, RegistrationNumber: registrationNumber });
      console.log('[DEBUG] Payload to SAP:', input);
      const { token, cookies } = await fetchCsrfTokenInitialRegistration();
      const resp = await sapAxiosInitialRegistration.post('/YY1_INITIALREGISTRATION', input, {
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': token,
          Cookie: cookies,
        },
      });
      console.log('[DEBUG] SAP response:', resp.data);
      res.status(resp.status).json({ ...resp.data, RegistrationNumber: registrationNumber });
    } catch (err) {
      console.error('POST Initial Registration error', err?.response?.status, err?.response?.data || err?.message);
      res.status(err?.response?.status || 500).json({ error: err?.response?.data || err?.message });
    }
  });
});

/* GET Initial Registration list with optional search and count */
app.get('/api/initial-registrations', async (req, res) => {
  try {
    const top = Math.min(parseInt(req.query.top, 10) || 50, 200); // safety cap
    const search = (req.query.search || '').trim();
    const wantCount = String(req.query.count || 'false').toLowerCase() === 'true';

    // Build OData $filter using substringof (OData V2 compatible)
    let filterExpr = '';
    if (search) {
      const s = search.replace(/'/g, "''"); // escape single quotes for OData
      // Use substringof instead of contains - OData V2 syntax
      const clauses = [
        `substringof('${s}',RegistrationNumber)`,
        `substringof('${s}',SalesDocument2)`,
        `substringof('${s}',VehicleNumber)`,
        `substringof('${s}',Transporter)`,
        `substringof('${s}',SAP_Description)`
      ];
      filterExpr = clauses.join(' or ');
    }

    let path = `/YY1_INITIALREGISTRATION?$format=json&$top=${top}`;
    if (filterExpr) path += `&$filter=${encodeURIComponent(filterExpr)}`;
    if (wantCount) path += `&$inlinecount=allpages`;

    console.log('[DEBUG] Initial Registration query path:', path);

    const resp = await sapAxiosInitialRegistration.get(path);

    // Normalize OData V2 shape
    const d = resp.data?.d || {};
    let results = Array.isArray(d.results) ? d.results : (Array.isArray(resp.data?.value) ? resp.data.value : []);
    const count = d.__count != null ? Number(d.__count) : results.length;

    // --- RemainingQty always shows total available quantity ---
    // Group by SO (SalesDocument2 or SalesDocument), sum ExpectedQty
    const soGroups = {};
    results.forEach(r => {
      const so = r.SalesDocument2 || r.SalesDocument;
      if (!so) return;
      if (!soGroups[so]) soGroups[so] = { totalQty: 0 };
      soGroups[so].totalQty += Number(r.ExpectedQty) || 0;
    });
    // Attach RemainingQty (totalQty) to each record
    results = results.map(r => {
      const so = r.SalesDocument2 || r.SalesDocument;
      if (so && soGroups[so]) {
        return { ...r, RemainingQty: soGroups[so].totalQty };
      }
      return r;
    });

    return res.json({ d: { __count: count, results } });
  } catch (err) {
    console.error('GET Initial Registrations error', err?.response?.status, err?.response?.data || err?.message);
    res.status(err?.response?.status || 500).json({ error: err?.response?.data || err?.message });
  }
});

/* GET Initial Registration list with multiple vehicle number filter */
app.get('/api/truck-registrations', async (req, res) => {
  try {
    const top = Math.min(parseInt(req.query.top, 10) || 50, 200);
    const search = (req.query.search || '').trim();
    const vehicleNumbers = (req.query.vehicleNumbers || '').trim(); // comma-separated: "1,2,3"
    const wantCount = String(req.query.count || 'false').toLowerCase() === 'true';

    let filterConditions = [];

    // General search
    if (search) {
      const s = search.replace(/'/g, "''");
      const clauses = [
        `substringof('${s}',SalesDocument)`,
        `substringof('${s}',VehicleNumber)`,
        `substringof('${s}',Transporter)`,
        `substringof('${s}',SAP_Description)`
      ];
      filterConditions.push(`(${clauses.join(' or ')})`);
    }

    // Multiple Vehicle Numbers filter (OR condition)
    if (vehicleNumbers) {
      const vnArray = vehicleNumbers.split(',').map(vn => vn.trim()).filter(vn => vn);
      if (vnArray.length > 0) {
        const vehicleConditions = vnArray.map(vn => {
          const cleanVn = vn.replace(/'/g, "''");
          return `substringof('${cleanVn}',VehicleNumber)`; // Contains any of the numbers
          // OR use exact match: `VehicleNumber eq '${cleanVn}'`
        });
        filterConditions.push(`(${vehicleConditions.join(' or ')})`);
      }
    }

    let path = `/YY1_INITIALREGISTRATION?$format=json&$top=${top}`;
    
    if (filterConditions.length > 0) {
      const filterExpr = filterConditions.join(' and ');
      path += `&$filter=${encodeURIComponent(filterExpr)}`;
    }
    
    if (wantCount) path += `&$inlinecount=allpages`;

    console.log('[DEBUG] Query path:', path);

    const resp = await sapAxiosInitialRegistration.get(path);

    const d = resp.data?.d || {};
    const results = Array.isArray(d.results) ? d.results : (Array.isArray(resp.data?.value) ? resp.data.value : []);
    const count = d.__count != null ? Number(d.__count) : results.length;

    return res.json({ d: { __count: count, results } });
  } catch (err) {
    console.error('GET Initial Registrations error', err?.response?.status, err?.response?.data || err?.message);
    res.status(err?.response?.status || 500).json({ error: err?.response?.data || err?.message });
  }
});

/* PATCH Update Initial Registration (e.g., change Status to Failed) */
app.patch('/api/initial-registration/:uuid', async (req, res) => {
  const uuid = req.params.uuid;
  const body = sanitizePayloadForSapServerSide(req.body);
  try {
    const { token, cookies } = await fetchCsrfTokenInitialRegistration();
    const path = `/YY1_INITIALREGISTRATION(guid'${uuid}')`;
    
    console.log('[DEBUG] Updating Initial Registration:', path, body);
    
    const resp = await sapAxiosInitialRegistration.patch(path, body, {
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': token,
        Cookie: cookies,
      },
      validateStatus: status => status < 500
    });
    
    if (resp.status === 204) return res.status(204).send();
    res.status(resp.status).json(resp.data);
  } catch (err) {
    console.error('PATCH Initial Registration error', err?.response?.status, err?.response?.data || err?.message);
    res.status(err?.response?.status || 500).json({ error: err?.response?.data || err?.message });
  }
});

// Email configuration (add before app.listen)
const transporter = nodemailer.createTransport({
  service: 'gmail', // or 'outlook', 'yahoo', etc.
  auth: {
    user: 'chinnasukumar056@gmail.com', // Replace with your Gmail
    pass: 'fjzb fxne zvoe xnae'      // Replace with Gmail App Password (not regular password)
  }
});

// Email notification endpoint
app.post('/api/send-notification', async (req, res) => {
  try {
    const { gateEntryNumber, weightDocNumber, vehicleNumber, grossWeight, date } = req.body;

    const mailOptions = {
      from: 'chinnasukumar056@gmail.com',
      to: 'n.sukumar056@gmail.com',
      subject: `✅ Gate Entry Created - ${gateEntryNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f5f5f5;">
          <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #4CAF50; margin-bottom: 20px;">✅ New Gate Entry Created</h2>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 12px 0; font-weight: bold; color: #555;">Gate Entry Number:</td>
                <td style="padding: 12px 0; color: #333;">${gateEntryNumber}</td>
              </tr>
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 12px 0; font-weight: bold; color: #555;">Weight Document Number:</td>
                <td style="padding: 12px 0; color: #333;">${weightDocNumber || 'N/A'}</td>
              </tr>
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 12px 0; font-weight: bold; color: #555;">Vehicle Number:</td>
                <td style="padding: 12px 0; color: #333;">${vehicleNumber}</td>
              </tr>
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 12px 0; font-weight: bold; color: #555;">Gross Weight:</td>
                <td style="padding: 12px 0; color: #333;">${grossWeight ? grossWeight + ' MT' : 'N/A'}</td>
              </tr>
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 12px 0; font-weight: bold; color: #555;">Date:</td>
                <td style="padding: 12px 0; color: #333;">${date}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0; font-weight: bold; color: #555;">Created At:</td>
                <td style="padding: 12px 0; color: #333;">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
              </tr>
            </table>
            
            <div style="margin-top: 30px; padding: 15px; background: #e8f5e9; border-left: 4px solid #4CAF50; border-radius: 5px;">
              <p style="margin: 0; color: #2e7d32;">
                <strong>Status:</strong> Gate Entry and Weight Document created successfully in SAP system.
              </p>
            </div>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('✅ Email notification sent successfully');
    res.json({ success: true, message: 'Email sent successfully' });
  } catch (error) {
    console.error('❌ Email send error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Parse SAP error into user-friendly message
 * Converts technical SAP errors into simple messages clients can understand
 */
function parseSapErrorToFriendlyMessage(err) {
  try {
    // Extract error data from various possible structures
    const errData = err?.response?.data?.error?.error || err?.response?.data?.error || err?.response?.data;
    
    if (!errData) {
      return err?.message || 'An unexpected error occurred';
    }

    // Extract the main error message
    const message = errData.message?.value || errData.message || '';
    
    // Common SAP error patterns and their friendly translations
    const patterns = [
      {
        // Property validation errors - extract field name and value
        regex: /Property '(\w+)' at offset '\d+' has invalid value '([^']+)'/i,
        format: (match) => {
          const fieldName = match[1];
          const invalidValue = match[2];
          
          // Convert technical field names to user-friendly names
          const fieldMap = {
            'PurchaseOrderNumber': 'Purchase Order 1',
            'PurchaseOrderNumber2': 'Purchase Order 2',
            'PurchaseOrderNumber3': 'Purchase Order 3',
            'PurchaseOrderNumber4': 'Purchase Order 4',
            'PurchaseOrderNumber5': 'Purchase Order 5',
            'Material': 'Material 1',
            'Material2': 'Material 2',
            'Material3': 'Material 3',
            'Material4': 'Material 4',
            'Material5': 'Material 5',
            'MaterialDescription': 'Material Description 1',
            'MaterialDescription2': 'Material Description 2',
            'MaterialDescription3': 'Material Description 3',
            'MaterialDescription4': 'Material Description 4',
            'MaterialDescription5': 'Material Description 5',
            'Vendor': 'Vendor 1',
            'Vendor2': 'Vendor 2',
            'Vendor3': 'Vendor 3',
            'Vendor4': 'Vendor 4',
            'Vendor5': 'Vendor 5',
            'VendorName': 'Vendor Name 1',
            'VendorName2': 'Vendor Name 2',
            'VendorName3': 'Vendor Name 3',
            'VendorName4': 'Vendor Name 4',
            'VendorName5': 'Vendor Name 5',
            'VendorInvoiceNumber': 'Vendor Invoice Number 1',
            'VendorInvoiceNumber2': 'Vendor Invoice Number 2',
            'VendorInvoiceNumber3': 'Vendor Invoice Number 3',
            'VendorInvoiceNumber4': 'Vendor Invoice Number 4',
            'VendorInvoiceNumber5': 'Vendor Invoice Number 5',
            'VendorInvoiceWeight': 'Vendor Invoice Weight 1',
            'VendorInvoiceWeight2': 'Vendor Invoice Weight 2',
            'VendorInvoiceWeight3': 'Vendor Invoice Weight 3',
            'VendorInvoiceWeight4': 'Vendor Invoice Weight 4',
            'VendorInvoiceWeight5': 'Vendor Invoice Weight 5',
            'VendorInvoiceDate': 'Vendor Invoice Date 1',
            'VendorInvoiceDate2': 'Vendor Invoice Date 2',
            'VendorInvoiceDate3': 'Vendor Invoice Date 3',
            'VendorInvoiceDate4': 'Vendor Invoice Date 4',
            'VendorInvoiceDate5': 'Vendor Invoice Date 5',
            'BalanceQty': 'Balance Quantity 1',
            'BalanceQty2': 'Balance Quantity 2',
            'BalanceQty3': 'Balance Quantity 3',
            'BalanceQty4': 'Balance Quantity 4',
            'BalanceQty5': 'Balance Quantity 5',
            'GateEntryNumber': 'Gate Entry Number',
            'WeightDocNumber': 'Weight Document Number',
            'VehicleNumber': 'Vehicle Number',
            'TruckNumber': 'Truck Number',
            'GateEntryDate': 'Gate Entry Date',
            'FiscalYear': 'Fiscal Year',
            'TransporterCode': 'Transporter Code',
            'TransporterName': 'Transporter Name',
            'DriverName': 'Driver Name',
            'DriverPhoneNumber': 'Driver Phone Number',
            'LRGCNumber': 'LR/GC Number',
            'TruckCapacity': 'Truck Capacity',
            'TareWeight': 'Tare Weight',
            'GrossWeight': 'Gross Weight',
            'NetWeght': 'Net Weight'
          };
          
          const friendlyFieldName = fieldMap[fieldName] || fieldName.replace(/([A-Z])/g, ' $1').trim();
          return `${friendlyFieldName} has invalid value '${invalidValue}'. Please check and correct it.`;
        }
      },
      {
        // Required field errors
        regex: /Property '(\w+)' is required|mandatory field '(\w+)'/i,
        format: (match) => {
          const fieldName = match[1] || match[2];
          return `${fieldName.replace(/([A-Z])/g, ' $1').trim()} is required. Please provide a value.`;
        }
      },
      {
        // Duplicate key errors
        regex: /duplicate.*key|already exists|unique constraint/i,
        format: () => 'This record already exists in the system. Please check your data.'
      },
      {
        // Type mismatch errors
        regex: /type mismatch|invalid type|cannot convert/i,
        format: () => 'Invalid data type provided. Please check that all fields have the correct format.'
      },
      {
        // Date format errors
        regex: /invalid date|date format|cannot parse date/i,
        format: () => 'Invalid date format. Please use the correct date format (YYYY-MM-DD).'
      },
      {
        // Numeric validation errors
        regex: /invalid numeric|not a number|numeric overflow/i,
        format: () => 'Invalid number format. Please enter a valid numeric value.'
      }
    ];

    // Try to match patterns
    for (const pattern of patterns) {
      const match = message.match(pattern.regex);
      if (match) {
        return pattern.format(match);
      }
    }

    // If no pattern matches but we have a clean message, return it
    if (message && message.length < 200 && !message.includes('{')) {
      return message;
    }

    // Default fallback message
    return 'An error occurred while processing your request. Please check your input and try again.';
    
  } catch (parseError) {
    console.error('Error parsing SAP error:', parseError);
    return 'An unexpected error occurred. Please contact support if the issue persists.';
  }
}

// backend/server.js or routes file

app.get('/api/po-suggestions', async (req, res) => {
  const query = req.query.query || '';
  const limit = parseInt(req.query.limit) || 10;

  if (!query || query.length < 1) {
    return res.json({ items: [] });
  }

  try {
    let sapPath;
    if (query.length <= 10) {
      sapPath = `/PurchaseOrder?$filter=startswith(PurchaseOrder, '${query}')&$top=${limit}&$select=PurchaseOrder,Supplier,PurchaseOrderDate&$format=json`;
    } else {
      sapPath = `/PurchaseOrder?$filter=substringof('${query}', PurchaseOrder) eq true&$top=${limit}&$select=PurchaseOrder,Supplier,PurchaseOrderDate&$format=json`;
    }

    console.log('SAP Query:', sapPath);
    const response = await sapAxiosPO.get(sapPath);

    const suggestions = response.data.value.map(po => ({
      PurchaseOrder: po.PurchaseOrder,
      Supplier: po.Supplier,
      PurchaseOrderDate: po.PurchaseOrderDate
    }));

    res.json({ items: suggestions });
  } catch (error) {
    // Add this for better debugging:
    console.error('Error fetching PO suggestions:', error?.response?.data || error.message || error);
    res.status(500).json({ error: 'Failed to fetch PO suggestions', details: error?.response?.data || error.message || error });
  }
});

app.get('/api/purchaseorder/:poNumber', async (req, res) => {
  const poNumber = req.params.poNumber;
  try {
    const headerPath = `/PurchaseOrder?$filter=PurchaseOrder eq '${poNumber}'&$top=1&$format=json`;
    const itemPath = `/PurchaseOrderItem?$filter=PurchaseOrder eq '${poNumber}'&$format=json`;

    const [headerResponse, itemResponse] = await Promise.all([
      sapAxiosPO.get(headerPath),
      sapAxiosPO.get(itemPath)
    ]);

    const headerData = headerResponse.data.value?.[0] || {};
    const items = itemResponse.data.value || [];

    res.json({
      ...headerData,
      items: items
    });
  } catch (error) {
    console.error('Error fetching PO and items:', error);
    res.status(500).json({ error: 'Failed to fetch PO and items' });
  }
});


// Get PO details by SupplierRespSalesPersonName (header first, then items)
app.get('/api/po-permitnumber/:permitnumber', async (req, res) => {
  const permitnumber = req.params.permitnumber;
  try {
    // 1. Get header by SupplierRespSalesPersonName
    const headerPath = `/PurchaseOrder?$filter=SupplierRespSalesPersonName eq '${permitnumber}'&$top=1&$format=json`;
    const headerResponse = await sapAxiosPO.get(headerPath);
    const headerData = headerResponse.data.value?.[0];
    if (!headerData || !headerData.PurchaseOrder) {
      return res.status(404).json({ error: 'No PO found for given salesPersonName' });
    }
    // 2. Now get line items by PO number
    const poNumToUse = headerData.PurchaseOrder;
    const itemPath = `/PurchaseOrderItem?$filter=PurchaseOrder eq '${poNumToUse}'&$format=json`;
    const itemResponse = await sapAxiosPO.get(itemPath);
    const items = itemResponse.data.value || [];
    return res.json({ ...headerData, items });
  } catch (error) {
    console.error('Error fetching PO by salesPersonName:', error);
    res.status(500).json({ error: 'Failed to fetch PO and items by salesPersonName' });
  }
});


app.post('/api/user-credentials', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  try {
    const path = `/YY1_USERACCESS?$filter=UserName eq '${username}' and Password eq '${password}'`;
    const response = await sapAxiosUserAccess.get(path, {
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }
    });
    let results = [];
    if (response.data && response.data.value) {
      results = response.data.value;
    } else if (response.data && response.data.d && response.data.d.results) {
      results = response.data.d.results;
    } else if (response.data && response.data.d) {
      results = [response.data.d];
    } else {
      results = response.data || [];
    }
    if (results.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    // Return user info (never return password)
    const { UserName, RoleCode, ModuleWise } = results[0];
    return res.json({ success: true, user: { UserName, RoleCode, ModuleWise } });
  } catch (error) {
    console.error('User credential check error:', error);
    return res.status(500).json({ error: 'Failed to check credentials' });
  }
});

//Sales Order Details
// GET /api/salesorders?search=12
app.get('/api/salesorders/:soNumber', async (req, res) => {
  const soNumber = req.params.soNumber;
  try {
    // Expand items using $expand=to_Item
    const path = `/A_SalesOrder('${soNumber}')?$expand=to_Item&$format=json`;
    const resp = await sapAxiosSO.get(path);
    const so = resp.data?.d || {};
    // Flatten items
    const items = so.to_Item?.results || [];
    res.json({
      SalesDocument: so.SalesOrder,
      ...so,
      items
    });
  } catch (err) {
    console.error('SO fetch error', err?.response?.data || err.message);
    res.status(500).json({ error: 'Failed to fetch sales order' });
  }
});


// GET /api/salesorders?search=12
app.get('/api/salesorders', async (req, res) => {
  const search = (req.query.search || '').trim();
  if (!search) {
    return res.status(400).json({ error: 'Missing search parameter' });
  }
  try {
    // 1. Fetch SO headers matching the search
    const filter = `substringof('${search}',SalesOrder)`;
    const headerPath = `/A_SalesOrder?$filter=${filter}&$top=10&$format=json`;
    const headerResp = await sapAxiosSO.get(headerPath);
    const headers = headerResp.data?.d?.results || [];

    // 2. For each SO, fetch its line items
    // Collect all SO numbers
    const soNumbers = headers.map(h => h.SalesOrder);
    if (soNumbers.length === 0) return res.json([]);

    // Fetch all line items for these SOs in one call (OData V2: use 'or' in filter)
    const itemFilter = soNumbers.map(so => `SalesOrder eq '${so}'`).join(' or ');
    const itemPath = `/A_SalesOrderItem?$filter=${encodeURIComponent(itemFilter)}&$format=json`;
    const itemResp = await sapAxiosSO.get(itemPath);
    const items = itemResp.data?.d?.results || [];

    // 3. Group items by SO number
    const itemsBySO = {};
    items.forEach(item => {
      if (!itemsBySO[item.SalesOrder]) itemsBySO[item.SalesOrder] = [];
      itemsBySO[item.SalesOrder].push(item);
    });

    // 4. Build response: for each SO, include header fields and line items
    const result = headers.map(h => ({
      SalesDocument: h.SalesOrder,
      Customer: h.SoldToParty,
      CustomerName: h.SoldToPartyName,
      // Add more header fields if needed
      items: (itemsBySO[h.SalesOrder] || []).map(li => ({
        Material: li.Material,
        MaterialDescription: li.MaterialDescription,
        BalanceQty: li.ConfdDelivQtyInOrderQtyUnit, // or the correct field for balance qty
        // Add more line item fields if needed
      }))
    }));

    res.json(result);
  } catch (err) {
    console.error('SO suggest error', err?.response?.data || err.message);
    res.status(500).json({ error: 'Failed to fetch SO suggestions' });
  }
});

// Fetch CSRF token for Outbound Delivery OData service
async function fetchCsrfTokenOutboundDelivery() {
  try {
    const res = await sapAxiosOBD.get('/', {
      headers: { 'x-csrf-token': 'Fetch' },
      validateStatus: () => true,
    });
    const token = res.headers['x-csrf-token'];
    const setCookie = res.headers['set-cookie'] || res.headers['Set-Cookie'] || [];
    const cookies = Array.isArray(setCookie)
      ? setCookie
          .map(c => {
            try {
              const parsed = cookie.parse(c);
              return Object.entries(parsed).map(([k, v]) => `${k}=${v}`).join('; ');
            } catch (e) {
              return c.split(';')[0];
            }
          })
          .join('; ')
      : (setCookie || '').toString();
    return { token, cookies };
  } catch (err) {
    console.error('fetchCsrfTokenOutboundDelivery error', err?.response?.status, err?.message);
    throw err;
  }
}

// POST Outbound Delivery
// app.post('/api/outbounddelivery', async (req, res) => {
//   try {
//     const input = sanitizePayloadForSapServerSide(req.body);
//     const { token, cookies } = await fetchCsrfTokenOutboundDelivery();
//     const resp = await sapAxiosOBD.post('/A_OutbDeliveryHeader', input, {
//       headers: {
//         'Content-Type': 'application/json',
//         'x-csrf-token': token,
//         Cookie: cookies
//       }

//     });
//     res.status(resp.status).json(resp.data);
//   } catch (err) {
//     console.error('Outbound Delivery post error', err?.response?.status, err?.response?.data || err.message);
//     res.status(err?.response?.status || 500).json({ error: err?.response?.data || err?.message || 'Failed to create outbound delivery' });
//   }
// });
app.post('/api/materialoutward-full', async (req, res) => {
  try {
    // ...existing code...

    // 1. Create Outbound Delivery
    const outboundInput = sanitizePayloadForSapServerSide(req.body.outboundDelivery);
    const { token: obdToken, cookies: obdCookies } = await fetchCsrfTokenOutboundDelivery();
    const obdResp = await sapAxiosOBD.post('/A_OutbDeliveryHeader', outboundInput, {
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': obdToken,
        Cookie: obdCookies
      }
    });

    // Extract Outbound Delivery Number
    const outboundDeliveryNumber =
      obdResp.data?.d?.DeliveryDocument ||
      obdResp.data?.DeliveryDocument ||
      obdResp.data?.d?.DeliveryNumber ||
      obdResp.data?.DeliveryNumber ||
      null;

    // 2. Create Weight Document only if Outbound Delivery succeeded
    const weightInput = sanitizePayloadForSapServerSide(req.body.weightDocument);
    const { token: weightToken, cookies: weightCookies } = await fetchCsrfTokenWeight();
    const weightResp = await sapAxiosWeight.post('/YY1_CAPTURINGWEIGHTDETAILS', weightInput, {
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': weightToken,
        Cookie: weightCookies,
      },
    });

    // Extract Weight Document Number and Gate Entry Number
    const weightDocNumber =
      weightResp.data?.d?.WeightDocNumber ||
      weightResp.data?.WeightDocNumber ||
      null;
    const gateEntryNumber =
      weightResp.data?.d?.GateEntryNumber ||
      weightResp.data?.GateEntryNumber ||
      null;

    // 3. Return both results
    res.json({
      success: true,
      outboundDeliveryNumber,
      weightDocNumber,
      gateEntryNumber
    });
  } catch (err) {
    // Use friendly SAP error parser for client clarity
    const friendlyMsg = parseSapErrorToFriendlyMessage(err);
    res.status(500).json({ success: false, error: friendlyMsg });
  }
});
// Fetch CSRF token for Goods Issue OData service
async function fetchCsrfTokenGoodsIssue() {
  try {
    const res = await sapAxiosOBD.get('/', {
      headers: { 'x-csrf-token': 'Fetch' },
      validateStatus: () => true,
    });
    const token = res.headers['x-csrf-token'];
    const setCookie = res.headers['set-cookie'] || res.headers['Set-Cookie'] || [];
    const cookies = Array.isArray(setCookie)
      ? setCookie
          .map(c => {
            try {
              const parsed = cookie.parse(c);
              return Object.entries(parsed).map(([k, v]) => `${k}=${v}`).join('; ');
            } catch (e) {
              return c.split(';')[0];
            }
          })
          .join('; ')
      : (setCookie || '').toString();
    return { token, cookies };
  } catch (err) {
    console.error('fetchCsrfTokenGoodsIssue error', err?.response?.status, err?.message);
    throw err;
  }
}

// PATCH Outbound Delivery Item
app.patch('/api/outbounddelivery/:deliveryDocument/items/:itemNumber', async (req, res) => {
  const deliveryDocument = req.params.deliveryDocument;
  const itemNumber = req.params.itemNumber;
  const { ActualDeliveryQuantity, ActualDeliveryQtyUnit } = req.body;
  if (!ActualDeliveryQuantity) {
    return res.status(400).json({ error: "ActualDeliveryQuantity is required" });
  }
  try {
    const { token, cookies } = await fetchCsrfTokenOutboundDelivery();
    // PATCH to the item entity
    const path = `/A_OutbDeliveryItem(DeliveryDocument='${deliveryDocument}',DeliveryDocumentItem='${itemNumber}')`;
    const payload = {
      ActualDeliveryQuantity: ActualDeliveryQuantity
    };
    if (ActualDeliveryQtyUnit) payload.ActualDeliveryQtyUnit = ActualDeliveryQtyUnit;
    const resp = await sapAxiosOBD.patch(path, payload, {
      headers: {
        'Content-Type': 'application/json', 
        'x-csrf-token': token,
        'If-Match': '*',
        Cookie: cookies
      },
      validateStatus: status => status < 500
    });
    if (resp.status === 204) return res.status(204).send();
    res.status(resp.status).json(resp.data);
  } catch (err) {
    console.error('Outbound Delivery Item PATCH error', err?.response?.status, err?.response?.data || err.message);
    res.status(err?.response?.status || 500).json({ error: err?.response?.data || err?.message || 'Failed to update outbound delivery item' });
  }
});


// // requires: const fs = require('fs'); at top of file
// const fs = require('fs');
// app.post('/api/goodsissue-and-invoice', async (req, res) => {
//   try {
//     const deliveryDocument = req.body.DeliveryDocument;
//     if (!deliveryDocument) return res.status(400).json({ error: "DeliveryDocument required" });

//     const { token, cookies } = await fetchCsrfTokenGoodsIssue();

//     // 1) Post Goods Issue
//     const giUrl = `/PostGoodsIssue?DeliveryDocument='${encodeURIComponent(deliveryDocument)}'`;
//     console.log('Posting Goods Issue ->', giUrl);
//     const goodsIssueResp = await sapAxiosOBD.post(giUrl, {}, {
//       headers: { 'Content-Type': 'application/json', 'x-csrf-token': token, 'If-Match': '*', Cookie: cookies }
//     });
//     const goodsIssueNumber = goodsIssueResp.data?.GoodsIssueNumber || goodsIssueResp.data?.DeliveryDocument || deliveryDocument;
//     console.log('Goods Issue status:', goodsIssueResp.status, 'inferred:', goodsIssueNumber);
//     if (![200,201,204].includes(goodsIssueResp.status)) {
//       return res.status(goodsIssueResp.status).json({ error: 'Goods issue failed', details: goodsIssueResp.data });
//     }

//     // 2) Create Billing Document
//     const billingPayload = {
//       _Control: { DefaultBillingDocumentType: 'F2', AutomPostingToAcctgIsDisabled: false },
//       _Reference: [{ SDDocument: deliveryDocument, SDDocumentCategory: 'J' }]
//     };
//     const billingUrl = `/BillingDocument/SAP__self.CreateFromSDDocument?DeliveryDocument='${encodeURIComponent(deliveryDocument)}'`;
//     console.log('Creating billing ->', billingUrl);
//     const billingResp = await sapAxiosBilling.post(billingUrl, billingPayload, {
//       headers: { 'Content-Type': 'application/json', 'x-csrf-token': token, 'If-Match': '*', Cookie: cookies }
//     });

//     console.log('Billing resp status:', billingResp.status);
//     try { console.log('Billing data preview:', JSON.stringify(billingResp.data).slice(0,1000)); }
//     catch(e){ console.log('Billing raw preview:', String(billingResp.data).slice(0,1000)); }

//     let billingDocNumber =
//       billingResp.data?.BillingDocument ||
//       (Array.isArray(billingResp.data?.value) && billingResp.data.value[0]?.BillingDocument) ||
//       (billingResp.data?.d?.BillingDocument) || undefined;

//     // if 204 or missing, try Location header + fallback search
//     if (!billingDocNumber && billingResp.status === 204) {
//       const loc = billingResp.headers?.location || billingResp.headers?.Location;
//       console.log('Billing returned 204; Location=', loc);
//       if (loc) {
//         const m = loc.match(/BillingDocument['"\(=]*['"]?(\d+)['"]?\)?/);
//         if (m) billingDocNumber = m[1];
//       }
//     }
//     if (!billingDocNumber) {
//       try {
//         const searchResp = await sapAxiosBilling.get(`/BillingDocument?$filter=SDDocument eq '${encodeURIComponent(deliveryDocument)}'&$format=json`);
//         const found = searchResp.data?.d?.results || searchResp.data?.value || [];
//         if (Array.isArray(found) && found.length > 0) {
//           billingDocNumber = found[0].BillingDocument || found[0].BillingDocumentNumber;
//           console.log('Found billing via search:', billingDocNumber);
//         }
//       } catch (e) { console.warn('Billing search failed:', e?.message || e); }
//     }

//     console.log('Final BillingDoc:', billingDocNumber);
//     if (!billingDocNumber) {
//       return res.status(500).json({ error: 'Billing doc number not found', billingRespPreview: String(billingResp.data).slice(0,1000), headers: billingResp.headers });
//     }

//     // ---------- PDF retrieval with retries and saving debug files ----------
//     const { XMLParser } = require('fast-xml-parser');
//     const parser = new XMLParser({ ignoreAttributes:false, attributeNamePrefix:'@_', textNodeName:'#text', parseTagValue:false, parseAttributeValue:false });

//     function findBillingBinary(node) {
//       if (node == null) return null;
//       if (typeof node === 'string') { if (node.trim().startsWith('JVBER')) return node.trim(); return null; }
//       if (Buffer.isBuffer(node)) { const s = node.toString('utf8').trim(); if (s.startsWith('JVBER')) return s; }
//       if (Array.isArray(node)) { for (const el of node) { const f = findBillingBinary(el); if (f) return f; } return null; }
//       if (typeof node === 'object') {
//         for (const k of Object.keys(node)) {
//           const val = node[k];
//           const key = k.includes(':') ? k.split(':').pop() : k;
//           if (key === 'BillingDocumentBinary') {
//             if (typeof val === 'string' && val.trim()) return val.trim();
//             if (val && typeof val === 'object') {
//               if ('#text' in val && typeof val['#text'] === 'string' && val['#text'].trim()) return val['#text'].trim();
//               if ('text' in val && typeof val['text'] === 'string' && val['text'].trim()) return val['text'].trim();
//             }
//           }
//           const nested = findBillingBinary(val);
//           if (nested) return nested;
//         }
//       }
//       return null;
//     }

//     async function fetchPdfAttempt() {
//       const pdfUrl = `/GetPDF?BillingDocument='${billingDocNumber}'`;
//       const pdfResponse = await sapAxiosBillingPDF.get(pdfUrl, {
//         headers: { 'x-csrf-token': token, Cookie: cookies, Accept: 'application/xml, text/xml, */*' },
//         responseType: 'text',
//         timeout: 40000
//       });

//       // Save raw xml for inspection
//       try {
//         const tmpXmlPath = `./tmp_Billing_${billingDocNumber}_raw.xml`;
//         fs.writeFileSync(tmpXmlPath, pdfResponse.data);
//         console.log('Saved raw SAP XML ->', tmpXmlPath);
//       } catch(e){ console.warn('Could not save raw XML:', e?.message || e); }

//       const parsed = parser.parse(pdfResponse.data);
//       const base64 = findBillingBinary(parsed);
//       if (!base64) return { ok:false, reason:'noBase64', rawPreview: String(pdfResponse.data).substring(0,1200) };

//       // normalize
//       let b64clean = base64.toString().replace(/\s+/g, '').replace(/^"|"$/g,'');
//       // Log first 200 characters (safe)
//       console.log('base64 preview (first200):', b64clean.substring(0,200));

//       // sanity
//       if (!b64clean) return { ok:false, reason:'emptyBase64' };
//       if (!b64clean.includes('JVBER')) return { ok:false, reason:'noJVBER', sample: b64clean.substring(0,200) };

//       // decode once
//       let pdfBuffer = Buffer.from(b64clean, 'base64');

//       // If decode yields ASCII starting with JVBER, it's double-encoded -> decode again
//       const firstAscii = pdfBuffer.toString('utf8',0,6);
//       if (firstAscii && firstAscii.trim().startsWith('JVBER')) {
//         console.log('Detected outer decode contains ASCII JVBER -> doing second decode');
//         try {
//           const second = Buffer.from(pdfBuffer.toString('utf8'), 'base64');
//           if (second && second.length > 0) pdfBuffer = second;
//         } catch(e) { console.warn('Second decode failed:', e?.message || e); }
//       }

//       // Save decoded pdf for inspection (even if small)
//       try {
//         const tmpPdfPath = `./tmp_Billing_${billingDocNumber}_decoded.pdf`;
//         fs.writeFileSync(tmpPdfPath, pdfBuffer);
//         console.log('Saved decoded PDF ->', tmpPdfPath);
//       } catch(e){ console.warn('Could not save decoded PDF:', e?.message || e); }

//       // magic and size checks
//       const magic = pdfBuffer.toString('utf8',0,5);
//       console.log('pdfBuffer length:', pdfBuffer.length, 'magic:', JSON.stringify(magic));
//       if (magic !== '%PDF-') return { ok:false, reason:'badMagic', magic, length: pdfBuffer.length };
//       if (pdfBuffer.length < 5000) return { ok:false, reason:'tooSmall', length: pdfBuffer.length };

//       return { ok:true, buffer: pdfBuffer, length: pdfBuffer.length };
//     }

//     // longer retry: up to ~30s
//     let pdfResult = null;
//     const maxRetries = 20;
//     for (let i=0;i<maxRetries;i++) {
//       pdfResult = await fetchPdfAttempt();
//       if (pdfResult && pdfResult.ok) break;
//       console.log(`PDF not ready (${i+1}/${maxRetries}) reason=${pdfResult?.reason || 'none'}`);
//       await new Promise(r=>setTimeout(r, 1500));
//     }

//     if (!pdfResult || !pdfResult.ok) {
//       console.error('PDF extraction failed after retries:', pdfResult);
//       return res.status(502).json({ error:'PDF extraction failed', billingDoc: billingDocNumber, debug: pdfResult });
//     }

//     // send pdf
//     const buffer = pdfResult.buffer;
//     res.setHeader('Content-Type','application/pdf');
//     res.setHeader('Content-Disposition', `attachment; filename="Billing_${billingDocNumber}.pdf"`);
//     res.setHeader('Content-Length', String(buffer.length));
//     res.setHeader('X-Goods-Issue-Number', goodsIssueNumber);
//     res.setHeader('X-Billing-Document-Number', billingDocNumber);
//     res.setHeader('Access-Control-Expose-Headers','X-Goods-Issue-Number, X-Billing-Document-Number');
//     console.log('Returning PDF length:', buffer.length);
//     return res.status(200).send(buffer);

//   } catch (err) {
//     console.error('Handler error:', err?.response?.status || '', err?.message || err);
//     const status = err?.response?.status || 500;
//     return res.status(status).json({ error: err?.message || 'Internal server error' });
//   }
// });



app.post('/api/goodsissue-and-invoice', async (req, res) => {
  try {
    const deliveryDocument = req.body.DeliveryDocument;
    if (!deliveryDocument) {
      return res.status(400).json({ error: "DeliveryDocument parameter is required" });
    }

    // 1. Post Goods Issue
    const { token, cookies } = await fetchCsrfTokenGoodsIssue();
    const url = `/PostGoodsIssue?DeliveryDocument='${encodeURIComponent(deliveryDocument)}'`;
    const goodsIssueResp = await sapAxiosOBD.post(url, {}, {
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': token,
        'If-Match': '*',
        Cookie: cookies
      }
    });

    // 2. If successful, create billing document
    if (goodsIssueResp.status === 201 || goodsIssueResp.status === 200) {
      const billingPayload = {
        "_Control": {
          "DefaultBillingDocumentType": "F2",
          "AutomPostingToAcctgIsDisabled": false,
        },
        "_Reference": [
          {
            "SDDocument": deliveryDocument,
            "SDDocumentCategory": "J"
          }
        ]
      };
      const billingUrl = `/BillingDocument/SAP__self.CreateFromSDDocument?DeliveryDocument='${encodeURIComponent(deliveryDocument)}'`;
      const billingResp = await sapAxiosBilling.post(billingUrl, billingPayload, {
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': token,
          'If-Match': '*',
          Cookie: cookies
        }
      });

  console.log('Billing response status:', billingResp.status, 'data:', billingResp.data);    
if (billingResp.status === 201 || billingResp.status === 200 || billingResp.status === 204) {
        const billingDocNumber = billingResp.data?.BillingDocument || 
    (Array.isArray(billingResp.data?.value) && billingResp.data.value.length > 0 ? 
      billingResp.data.value[0].BillingDocument : undefined);
  
  console.log('Billing Document Number:', billingDocNumber);
  
  if (!billingDocNumber) {
    console.error('Billing document number is missing in response:', billingResp.data);
    return res.status(500).json({
      error: 'Billing document number is missing in SAP response',
      details: billingResp.data
    });
  }
  
  console.log(`✅ Billing document ${billingDocNumber} created`);

  // Wait for SAP to process the document
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Download PDF (SAP returns XML with base64 PDF)
  try {
    const { XMLParser } = require("fast-xml-parser");
    function findBillingBinary(obj) {
      if (obj == null) return null;
      if (typeof obj === "string") {
        if (obj.trim().startsWith("JVBER")) return obj;
        return null;
      }
      if (typeof obj !== "object") return null;
      for (const key of Object.keys(obj)) {
        const val = obj[key];
        const shortKey = key.includes(":") ? key.split(":").pop() : key;
        if (shortKey === "BillingDocumentBinary") {
          if (typeof val === "string") return val;
          if (val && typeof val === "object") {
            if ("#text" in val) return val["#text"];
            if ("text" in val) return val["text"];
            const s = JSON.stringify(val);
            if (s && s.includes("JVBER")) {
              const m = s.match(/JVBER[^\"]*/);
              if (m) return m[0];
            }
          }
        }
        const found = findBillingBinary(val);
        if (found) return found;
      }
      return null;
    }

    const pdfUrl = `/GetPDF?BillingDocument='${billingDocNumber}'`;
    const pdfResponse = await sapAxiosBillingPDF.get(pdfUrl, {
      headers: {
        'x-csrf-token': token,
        'Cookie': cookies,
        'Accept': 'application/xml, text/xml, */*'
      },
      responseType: 'text',
      timeout: 30000
    });

    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
    const parsed = parser.parse(pdfResponse.data);
    const base64 = findBillingBinary(parsed);
    if (!base64) {
      console.error("BillingDocumentBinary not found in SAP response. Raw SAP response:\n", pdfResponse.data.substring(0, 1000));
      throw new Error("BillingDocumentBinary not found in SAP response");
    }
    const b64clean = base64.toString().replace(/\s+/g, "");
    const pdfBuffer = Buffer.from(b64clean, "base64");

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Billing_${billingDocNumber}.pdf"`);
    res.setHeader('X-Goods-Issue-Number', deliveryDocument || '');
    res.setHeader('X-Billing-Document-Number', billingDocNumber);
    res.setHeader('Access-Control-Expose-Headers', 'X-Goods-Issue-Number, X-Billing-Document-Number');
console.log('Base64 PDF (first 500 chars):', b64clean.substring(0, 500));
console.log('PDF buffer length:', pdfBuffer.length);
if (!pdfBuffer || pdfBuffer.length < 1000) {
  console.error('PDF buffer is too small, likely invalid.');
}
    // Send PDF buffer directly
    res.send(pdfBuffer);
    // Send PDF as email attachment
try {
  await transporter.sendMail({
    from: 'chinnasukumar056@gmail.com',
    to: 'n.sukumar056@gmail.com', // or dynamic recipient
    subject: `Billing Document PDF - ${billingDocNumber}`,
    text: `Please find attached the billing document PDF for Delivery Document: ${deliveryDocument}`,
    attachments: [
      {
        filename: `Billing_${billingDocNumber}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }
    ]
  });
  console.log('✅ Billing PDF emailed successfully');
} catch (mailErr) {
  console.error('❌ Failed to send billing PDF email:', mailErr);
}
    
    console.log(`📄 PDF for ${billingDocNumber} downloaded automatically`);
    
  } catch (pdfError) {
    console.error(`PDF download failed for ${billingDocNumber}:`, pdfError.message);
    // Fallback: Return JSON response
    if (!res.headersSent) {
      return res.status(201).json({
        success: true,
        billingDocument: billingDocNumber,
        message: 'Billing created but PDF download failed',
        error: pdfError.message || 'PDF download failed',
        goodsIssueNumber: deliveryDocument
      });
    }
  }
} else {
        return res.status(billingResp.status).json({ error: 'Billing creation failed', details: billingResp.data });
      }
    } else {
      return res.status(goodsIssueResp.status).json({ error: 'Goods issue failed', details: goodsIssueResp.data });
    }
  } catch (err) {
    // Only log serializable error info
    const status = err?.response?.status;
    const data = err?.response?.data;
    const message = err?.message;
    console.error('Goods Issue + Invoice error', status, message, data);
res.status(status || 500).json({
  error: message
});
  }
});

// Start server
const port = process.env.PORT || 4600;
app.listen(port, () => console.log(`Server running on http://localhost:${port}`));


