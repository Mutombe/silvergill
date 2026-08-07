// Document understanding for logistics paperwork.
//
// Two stages, both deterministic and inspectable:
//   1. classify() scores the text against per-type keyword sets.
//   2. extract()  pulls named fields with per-field patterns.
//
// This runs against document TEXT. In production the text comes from OCR and a
// vision model — see `describeProductionPath()` at the bottom for exactly where
// that call goes. The field schema, confidence model, review queue and BC
// posting below are all production shapes and do not change when you swap the
// text source.

export const DOCUMENT_TYPES = {
  'Bill of Lading': {
    keywords: ['bill of lading', 'b/l', 'shipper', 'consignee', 'vessel', 'port of loading', 'port of discharge', 'notify party', 'freight prepaid'],
    fields: {
      documentNumber: [/(?:b\/l|bill of lading)\s*(?:no\.?|number|#)?\s*[:-]?\s*([A-Z0-9/-]{6,})/i],
      shipper: [/shipper\s*[:-]?\s*(.+)/i],
      consignee: [/consignee\s*[:-]?\s*(.+)/i],
      vessel: [/vessel(?:\s*\/\s*voyage)?\s*[:-]?\s*(.+)/i],
      portOfLoading: [/port of loading\s*[:-]?\s*(.+)/i],
      portOfDischarge: [/port of discharge\s*[:-]?\s*(.+)/i],
      containerNo: [/container\s*(?:no\.?|number)?\s*[:-]?\s*([A-Z]{4}\s?\d{6,7}[\s-]?\d?)/i],
      grossWeightKg: [/gross weight\s*[:-]?\s*([\d,.]+)\s*(?:kgs?|kilograms?)?/i],
      freightTerms: [/freight\s*[:-]?\s*(prepaid|collect)/i],
    },
    bcTarget: 'Posted Sales Shipment · attach to shipment',
  },

  'Commercial Invoice': {
    keywords: ['commercial invoice', 'invoice no', 'invoice date', 'vat', 'subtotal', 'total due', 'terms of payment', 'unit price'],
    fields: {
      invoiceNumber: [/invoice\s*(?:no\.?|number|#)\s*[:-]?\s*([A-Z0-9/-]+)/i],
      invoiceDate: [/invoice date\s*[:-]?\s*([0-9]{1,2}[/\s-][A-Za-z0-9]{1,9}[/\s-][0-9]{2,4})/i],
      supplier: [/(?:supplier|seller|from)\s*[:-]?\s*(.+)/i],
      currency: [/currency\s*[:-]?\s*([A-Z]{3})/i, /\b(USD|ZAR|EUR|MUR|ZWG)\b/],
      netAmount: [/(?:net|subtotal|sub-total)\s*[:-]?\s*(?:[A-Z]{3}\s*)?\$?\s*([\d,]+\.?\d{0,2})/i],
      vatAmount: [/(?:vat|tax)\s*(?:\(\d+%\))?\s*[:-]?\s*(?:[A-Z]{3}\s*)?\$?\s*([\d,]+\.?\d{0,2})/i],
      totalAmount: [/(?:total(?:\s*due)?|grand total|amount due)\s*[:-]?\s*(?:[A-Z]{3}\s*)?\$?\s*([\d,]+\.?\d{0,2})/i],
    },
    bcTarget: 'Purchase Invoice · vendor ledger',
  },

  'Packing List': {
    keywords: ['packing list', 'packages', 'net weight', 'gross weight', 'marks and numbers', 'carton', 'pallet', 'dimensions'],
    fields: {
      documentNumber: [/(?:packing list|p\/l)\s*(?:no\.?|number|#)?\s*[:-]?\s*([A-Z0-9/-]+)/i],
      totalPackages: [/(?:total\s*)?(?:packages|cartons|pallets|bales)\s*[:-]?\s*([\d,]+)/i],
      netWeightKg: [/net weight\s*[:-]?\s*([\d,.]+)/i],
      grossWeightKg: [/gross weight\s*[:-]?\s*([\d,.]+)/i],
      volumeCbm: [/(?:volume|measurement|cbm)\s*[:-]?\s*([\d,.]+)/i],
      marks: [/marks(?:\s*(?:and|&)\s*numbers)?\s*[:-]?\s*(.+)/i],
    },
    bcTarget: 'Warehouse Receipt lines',
  },

  'Export Permit': {
    keywords: ['export permit', 'permit no', 'ministry of mines', 'authorised to export', 'validity', 'permit holder', 'quantity permitted'],
    fields: {
      permitNumber: [/permit\s*(?:no\.?|number|#)\s*[:-]?\s*([A-Z0-9/-]+)/i],
      holder: [/(?:permit holder|issued to|exporter)\s*[:-]?\s*(.+)/i],
      commodity: [/(?:commodity|mineral|product)\s*[:-]?\s*(.+)/i],
      quantity: [/quantity(?:\s*permitted)?\s*[:-]?\s*([\d,.]+\s*(?:mt|tonnes?|tons?|kg)?)/i],
      validFrom: [/valid(?:\s*from)?\s*[:-]?\s*([0-9]{1,2}[/\s-][A-Za-z0-9]{1,9}[/\s-][0-9]{2,4})/i],
      validTo: [/(?:valid\s*(?:to|until)|expiry|expires)\s*[:-]?\s*([0-9]{1,2}[/\s-][A-Za-z0-9]{1,9}[/\s-][0-9]{2,4})/i],
      destinationCountry: [/destination(?:\s*country)?\s*[:-]?\s*(.+)/i],
    },
    bcTarget: 'Shipment compliance record',
  },

  'CD1 Form': {
    keywords: ['cd1', 'exchange control', 'authorised dealer', 'reserve bank of zimbabwe', 'acquittal', 'declaration of export'],
    fields: {
      cd1Number: [/cd\s*1\s*(?:no\.?|number|#)?\s*[:-]?\s*([A-Z0-9/-]+)/i, /\b(CD1[/-][0-9/-]+)\b/i],
      exporter: [/exporter\s*[:-]?\s*(.+)/i],
      authorisedDealer: [/authoris?ed dealer\s*[:-]?\s*(.+)/i],
      commodity: [/(?:commodity|goods|description)\s*[:-]?\s*(.+)/i],
      valueUSD: [/(?:value|fob value|declared value)\s*[:-]?\s*(?:USD\s*)?\$?\s*([\d,]+\.?\d{0,2})/i],
      destinationCountry: [/(?:destination|country of destination)\s*[:-]?\s*(.+)/i],
      expiryDate: [/(?:expiry|valid until|acquittal by)\s*[:-]?\s*([0-9]{1,2}[/\s-][A-Za-z0-9]{1,9}[/\s-][0-9]{2,4})/i],
    },
    bcTarget: 'Exchange control register · acquittal tracking',
  },

  'Customs Declaration': {
    keywords: ['sad 500', 'bill of entry', 'customs', 'tariff', 'zimra', 'sars', 'duty', 'declarant', 'hs code'],
    fields: {
      entryNumber: [/(?:entry|declaration)\s*(?:no\.?|number|#)\s*[:-]?\s*([A-Z0-9/-]+)/i],
      declarant: [/declarant\s*[:-]?\s*(.+)/i],
      hsCode: [/(?:hs|tariff)\s*code\s*[:-]?\s*([\d.]{4,})/i],
      customsValue: [/(?:customs value|value for duty)\s*[:-]?\s*(?:[A-Z]{3}\s*)?\$?\s*([\d,]+\.?\d{0,2})/i],
      dutyPayable: [/(?:duty|duties)\s*(?:payable)?\s*[:-]?\s*(?:[A-Z]{3}\s*)?\$?\s*([\d,]+\.?\d{0,2})/i],
      officeOfEntry: [/(?:office|port) of entry\s*[:-]?\s*(.+)/i],
    },
    bcTarget: 'Landed cost / item charge',
  },
};

const FIELD_LABELS = {
  documentNumber: 'Document number', shipper: 'Shipper', consignee: 'Consignee',
  vessel: 'Vessel / voyage', portOfLoading: 'Port of loading', portOfDischarge: 'Port of discharge',
  containerNo: 'Container number', grossWeightKg: 'Gross weight (kg)', freightTerms: 'Freight terms',
  invoiceNumber: 'Invoice number', invoiceDate: 'Invoice date', supplier: 'Supplier',
  currency: 'Currency', netAmount: 'Net amount', vatAmount: 'VAT', totalAmount: 'Total',
  totalPackages: 'Total packages', netWeightKg: 'Net weight (kg)', volumeCbm: 'Volume (m³)', marks: 'Marks & numbers',
  permitNumber: 'Permit number', holder: 'Permit holder', commodity: 'Commodity', quantity: 'Quantity',
  validFrom: 'Valid from', validTo: 'Valid to', destinationCountry: 'Destination country',
  cd1Number: 'CD1 number', exporter: 'Exporter', authorisedDealer: 'Authorised dealer', valueUSD: 'Declared value (USD)',
  expiryDate: 'Expiry date', entryNumber: 'Entry number', declarant: 'Declarant', hsCode: 'HS / tariff code',
  customsValue: 'Customs value', dutyPayable: 'Duty payable', officeOfEntry: 'Office of entry',
};

export const fieldLabel = (key) =>
  FIELD_LABELS[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());

/** Score the text against every type and return the best match with runners-up. */
export function classify(text) {
  const haystack = text.toLowerCase();

  const scores = Object.entries(DOCUMENT_TYPES)
    .map(([type, spec]) => {
      const hits = spec.keywords.filter((kw) => haystack.includes(kw));
      return { type, score: hits.length / spec.keywords.length, hits };
    })
    .sort((a, b) => b.score - a.score);

  return { best: scores[0], all: scores };
}

/**
 * Extract fields for a given type.
 * Each field carries its own confidence so the review queue can be targeted at
 * the handful of values that actually need a human, not the whole document.
 */
export function extract(text, type) {
  const spec = DOCUMENT_TYPES[type];
  if (!spec) return { fields: {}, confidence: 0 };

  const lines = text.split(/\r?\n/);
  const fields = {};

  for (const [key, patterns] of Object.entries(spec.fields)) {
    let value = null;
    let confidence = 0;

    for (const pattern of patterns) {
      // Try line by line first — labels and values usually share a line, and
      // this stops a greedy `.+` from swallowing the rest of the page.
      for (const line of lines) {
        const match = line.match(pattern);
        if (match?.[1]) {
          value = match[1].trim().replace(/\s{2,}/g, ' ').replace(/[|;]+$/, '').trim();
          confidence = 0.94;
          break;
        }
      }
      if (value) break;

      const match = text.match(pattern);
      if (match?.[1]) {
        value = match[1].trim().split(/\r?\n/)[0].trim();
        confidence = 0.71; // matched across lines — weaker signal
        break;
      }
    }

    if (value && value.length > 90) {
      value = value.slice(0, 90).trim();
      confidence = Math.min(confidence, 0.62);
    }

    fields[key] = { value: value || '', confidence: value ? confidence : 0 };
  }

  const found = Object.values(fields).filter((f) => f.value);
  const overall = found.length
    ? found.reduce((sum, f) => sum + f.confidence, 0) / Object.keys(fields).length
    : 0;

  return {
    fields,
    confidence: Number(overall.toFixed(2)),
    missing: Object.keys(fields).filter((k) => !fields[k].value),
    bcTarget: spec.bcTarget,
  };
}

/** One call: classify then extract. */
export function processDocument(text, typeHint = null) {
  const classification = classify(text);
  const type = typeHint || (classification.best.score > 0.15 ? classification.best.type : null);

  if (!type) {
    return {
      type: null,
      classification,
      confidence: 0,
      fields: {},
      missing: [],
      status: 'Unrecognised',
    };
  }

  const result = extract(text, type);

  // Anything under 0.85, or with a missing mandatory-looking field, goes to a
  // human before it touches the ledger.
  const status = result.confidence >= 0.85 && result.missing.length <= 1 ? 'Ready to post' : 'Needs review';

  return { type, classification, ...result, status };
}

/**
 * Where the real model call goes.
 *
 *   const image = await fileToBase64(file);
 *   const response = await fetch('/api/documents/extract', {
 *     method: 'POST',
 *     body: JSON.stringify({ image, mediaType: file.type }),
 *   });
 *   const { text } = await response.json();   // OCR or vision transcription
 *   return processDocument(text);
 *
 * The server side would send the page image to a vision model with the field
 * schema above as a tool definition, so the model returns typed JSON rather
 * than prose. Everything downstream of `processDocument` is unchanged.
 */
export function describeProductionPath() {
  return {
    step1: 'Upload page images / PDF to the extraction service',
    step2: 'Vision model transcribes and returns typed fields against this schema',
    step3: 'Confidence gate — below 0.85 routes to the review queue',
    step4: 'Approved records post to Business Central via the OData endpoint',
  };
}

/* ===== Sample documents, so the module can be demonstrated without paperwork ===== */

export const SAMPLE_DOCUMENTS = [
  {
    name: 'Bill of Lading — Beira to Rotterdam',
    fileName: 'BL-BEW-114873.pdf',
    text: `MAERSK LINE
BILL OF LADING

Bill of Lading No: BL-BEW-114873
Shipper: Zimplats Holdings Limited, Ngezi Mine, Mhondoro, Zimbabwe
Consignee: Glencore International AG, Baarermattstrasse 3, Baar, Switzerland
Notify Party: Same as consignee
Vessel / Voyage: MV Kota Nabil / 0442E
Port of Loading: Beira, Mozambique
Port of Discharge: Rotterdam, Netherlands
Container No: MSCU 774183-4
Description of Goods: Chrome ore in bulk, 34 metric tonnes
Gross Weight: 34,000 KGS
Freight: Prepaid
Place and Date of Issue: Beira, 29 July 2026`,
  },
  {
    name: 'Commercial Invoice — clearing agent',
    fileName: 'INV-BCS-20419.pdf',
    text: `BEITBRIDGE CLEARING SERVICES (PTY) LTD
VAT Reg: 10023998-4

COMMERCIAL INVOICE

Invoice No: INV-BCS-20419
Invoice Date: 02/08/2026
Supplier: Beitbridge Clearing Services (Pty) Ltd
Bill To: Silvergill Logistics, NRZ Complex, Seke Road, Harare
Currency: USD

Description                          Qty      Unit Price     Amount
Customs clearance - export entry      1         850.00        850.00
Gate and scanner fees                 1         145.00        145.00
Agency handling                       1         255.00        255.00

Subtotal: 1,250.00
VAT (0%): 0.00
Total Due: USD 1,250.00

Terms of Payment: 30 days from invoice date`,
  },
  {
    name: 'CD1 Form — lithium export',
    fileName: 'CD1-2026-04488.pdf',
    text: `RESERVE BANK OF ZIMBABWE
EXCHANGE CONTROL - DECLARATION OF EXPORT
FORM CD1

CD1 No: CD1/2026/04488
Exporter: Karo Mining Resources (Private) Limited
Authorised Dealer: Stanbic Bank Zimbabwe Limited
Commodity: Lithium Concentrate (spodumene, 5.5% Li2O)
Quantity: 30.00 MT
Declared Value: USD 900,000.00
Country of Destination: South Africa
Port of Exit: Beitbridge
Date of Issue: 27 July 2026
Acquittal by: 27/10/2026`,
  },
  {
    name: 'Export Permit — chrome ore',
    fileName: 'MMMD-EP-77120.pdf',
    text: `MINISTRY OF MINES AND MINING DEVELOPMENT
REPUBLIC OF ZIMBABWE

MINERAL EXPORT PERMIT

Permit No: MMMD-EP-77120
Permit Holder: Zimplats Holdings Limited
Commodity: Chrome Ore (lumpy, 42% Cr2O3)
Quantity Permitted: 5,000 MT
Valid From: 01/07/2026
Valid Until: 31/12/2026
Destination Country: Netherlands
Conditions: Subject to royalty settlement and CD1 acquittal.

The holder is authorised to export the mineral described above.`,
  },
  {
    name: 'Packing List — tobacco bales',
    fileName: 'PL-TSF-99121.pdf',
    text: `TOBACCO SALES FLOOR LIMITED
PACKING LIST

Packing List No: PL-TSF-99121
Marks and Numbers: TSF/HRE/2026/0447-0469
Total Packages: 220 bales
Net Weight: 21,340 KGS
Gross Weight: 22,000 KGS
Measurement: 68.40 CBM
Consignee: Universal Leaf Africa
Destination: Beira, Mozambique`,
  },
];
