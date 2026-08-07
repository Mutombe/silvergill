// Seed data for the Silvergill Operations Portal.
// Replace this module with real API calls when the Business Central backend is live.

export const ROLES = {
  ADMIN: 'admin',
  MANAGEMENT: 'management',
  OPS: 'ops',
  SALES: 'sales',
  DRIVER: 'driver',
  SUPPLIER: 'supplier',
  CLIENT: 'client',
};

export const ROLE_LABELS = {
  admin: 'System Administrator',
  management: 'Executive Management',
  ops: 'Operations',
  sales: 'Sales & Commercial',
  driver: 'Field / Driver',
  supplier: 'Supplier / Contractor',
  client: 'Customer',
};

/** Who each role is, in one line — shown on the login modal and in admin. */
export const ROLE_DESCRIPTIONS = {
  admin: 'Full access, plus user administration and system settings.',
  management: 'Group reporting, consolidated finance and every operating module.',
  ops: 'Day-to-day movements, documents, fleet and contractors.',
  sales: 'Quotations, customers and commercial pipeline.',
  driver: 'Field capture only — deliveries, incidents, fuel and inspections.',
  supplier: 'Own work orders, documents and invoices. Nothing else.',
  client: 'Own shipments, quotations, documents and invoices. Nothing else.',
};

/** Which landing screen a role lands on after signing in. */
export const ROLE_HOME = {
  admin: '/portal/admin',
  management: '/portal',
  ops: '/portal',
  sales: '/portal',
  driver: '/portal/operations',
  supplier: '/portal/suppliers',
  client: '/portal/my',
};

/** Whether the account is staff, an external contractor, or a customer. */
export const ROLE_AUDIENCE = {
  admin: 'staff',
  management: 'staff',
  ops: 'staff',
  sales: 'staff',
  driver: 'staff',
  supplier: 'partner',
  client: 'customer',
};

// Demo credentials. Passwords are stored in plain text ONLY because this is a
// front-end demo store; the real implementation authenticates against the API.
export const users = [
  {
    id: 'u-001',
    name: 'Tendai Moyo',
    email: 'admin@silvergill.com',
    password: 'silvergill',
    role: ROLES.ADMIN,
    entity: 'Zimbabwe',
    title: 'Group IT Administrator',
  },
  {
    id: 'u-002',
    name: 'Rumbidzai Chikafu',
    email: 'management@silvergill.com',
    password: 'silvergill',
    role: ROLES.MANAGEMENT,
    entity: 'Group',
    title: 'Chief Operating Officer',
  },
  {
    id: 'u-003',
    name: 'Farai Nyathi',
    email: 'ops@silvergill.com',
    password: 'silvergill',
    role: ROLES.OPS,
    entity: 'Zimbabwe',
    title: 'Operations Controller',
  },
  {
    id: 'u-004',
    name: 'Nyasha Dube',
    email: 'sales@silvergill.com',
    password: 'silvergill',
    role: ROLES.SALES,
    entity: 'Zimbabwe',
    title: 'Commercial Manager',
  },
  {
    id: 'u-005',
    name: 'Blessing Matare',
    email: 'driver@silvergill.com',
    password: 'silvergill',
    role: ROLES.DRIVER,
    entity: 'Zimbabwe',
    title: 'Long Haul Driver — AEB 4471',
  },
  {
    id: 'u-006',
    name: 'Kagiso Ndlovu',
    email: 'supplier@silvergill.com',
    password: 'silvergill',
    role: ROLES.SUPPLIER,
    entity: 'Contractor',
    title: 'Beitbridge Clearing Services (Pty) Ltd',
    supplierId: 'sup-002',
  },
  {
    id: 'u-007',
    name: 'Chipo Mangwiro',
    email: 'client@zimplats.com',
    password: 'silvergill',
    role: ROLES.CLIENT,
    entity: 'Zimbabwe',
    title: 'Logistics Manager, Zimplats Holdings',
    customerId: 'c-001',
  },
  {
    id: 'u-008',
    name: 'Devraj Callychurn',
    email: 'client@iotrading.mu',
    password: 'silvergill',
    role: ROLES.CLIENT,
    entity: 'Mauritius',
    title: 'Supply Chain Lead, Indian Ocean Trading Co',
    customerId: 'c-004',
  },
].map((user) => ({
  // Every account carries an activation flag and a last-seen stamp so the
  // admin panel has something real to manage.
  active: true,
  lastSignInAt: null,
  createdAt: '2026-01-15',
  ...user,
}));

export const commodities = [
  { code: 'CHR', name: 'Chrome Ore', hazard: false, densityFactor: 1.0, permit: 'Mineral Export Permit' },
  { code: 'LIT', name: 'Lithium Concentrate', hazard: false, densityFactor: 1.05, permit: 'Mineral Export Permit' },
  { code: 'TOB', name: 'Tobacco (Baled)', hazard: false, densityFactor: 0.45, permit: 'TIMB Export Licence' },
  { code: 'GRN', name: 'Grain / Maize', hazard: false, densityFactor: 0.75, permit: 'GMB Movement Permit' },
  { code: 'FTL', name: 'Fertiliser', hazard: true, densityFactor: 0.9, permit: 'Hazardous Goods Declaration' },
  { code: 'GEN', name: 'General Cargo', hazard: false, densityFactor: 0.6, permit: null },
  { code: 'FUL', name: 'Fuel / Petroleum', hazard: true, densityFactor: 0.84, permit: 'ZERA Fuel Transit Permit' },
  { code: 'GRA', name: 'Granite Blocks', hazard: false, densityFactor: 1.4, permit: 'Mineral Export Permit' },
];

export const ports = [
  { code: 'BEW', name: 'Beira', country: 'Mozambique', distanceKmFromHarare: 610, congestionIndex: 0.42 },
  { code: 'DUR', name: 'Durban', country: 'South Africa', distanceKmFromHarare: 1680, congestionIndex: 0.68 },
  { code: 'WVB', name: 'Walvis Bay', country: 'Namibia', distanceKmFromHarare: 2100, congestionIndex: 0.21 },
  { code: 'NLA', name: 'Nacala', country: 'Mozambique', distanceKmFromHarare: 1450, congestionIndex: 0.35 },
  { code: 'MRU', name: 'Port Louis', country: 'Mauritius', distanceKmFromHarare: 0, congestionIndex: 0.18 },
  { code: 'DAR', name: 'Dar es Salaam', country: 'Tanzania', distanceKmFromHarare: 2020, congestionIndex: 0.74 },
];

export const borders = [
  { code: 'BBR', name: 'Beitbridge', route: 'ZW → ZA', baselineHours: 14 },
  { code: 'FBS', name: 'Forbes / Machipanda', route: 'ZW → MZ', baselineHours: 6 },
  { code: 'CHR', name: 'Chirundu', route: 'ZW → ZM', baselineHours: 9 },
  { code: 'PLB', name: 'Plumtree', route: 'ZW → BW', baselineHours: 5 },
  { code: 'NYA', name: 'Nyamapanda', route: 'ZW → MZ', baselineHours: 7 },
];

export const transportModes = [
  { code: 'ROAD', name: 'Road Freight', ratePerTonKm: 0.085, avgSpeedKmh: 45 },
  { code: 'RAIL', name: 'Rail (NRZ)', ratePerTonKm: 0.048, avgSpeedKmh: 22 },
  { code: 'MULTI', name: 'Multimodal (Road + Rail)', ratePerTonKm: 0.062, avgSpeedKmh: 30 },
  { code: 'SEA', name: 'Ocean Freight', ratePerTonKm: 0.011, avgSpeedKmh: 33 },
  { code: 'AIR', name: 'Air Freight', ratePerTonKm: 1.42, avgSpeedKmh: 750 },
];

export const customers = [
  { id: 'c-001', name: 'Zimplats Holdings', bcNo: 'CUST-10023', entity: 'Zimbabwe', terms: '30 Days', creditLimit: 450000 },
  { id: 'c-002', name: 'Karo Mining Resources', bcNo: 'CUST-10044', entity: 'Zimbabwe', terms: '45 Days', creditLimit: 620000 },
  { id: 'c-003', name: 'Tobacco Sales Floor Ltd', bcNo: 'CUST-10071', entity: 'Zimbabwe', terms: '14 Days', creditLimit: 180000 },
  { id: 'c-004', name: 'Indian Ocean Trading Co', bcNo: 'CUST-20011', entity: 'Mauritius', terms: '30 Days', creditLimit: 300000 },
  { id: 'c-005', name: 'Sable Chemicals', bcNo: 'CUST-10088', entity: 'Zimbabwe', terms: '30 Days', creditLimit: 275000 },
  { id: 'c-006', name: 'Mauritius Freight Partners', bcNo: 'CUST-20034', entity: 'Mauritius', terms: '60 Days', creditLimit: 510000 },
];

export const vehicles = [
  {
    id: 'v-001', reg: 'AEB 4471', make: 'Scania', model: 'R500 Horse', year: 2021, type: 'Truck Tractor',
    odometer: 412300, entity: 'Zimbabwe', status: 'In Service', driverId: 'd-001',
    lastServiceKm: 402000, serviceIntervalKm: 15000, fuelTankL: 600,
    tyres: [
      { pos: 'Steer L', serial: 'TY-88231', treadMm: 6.2, fittedKm: 388000 },
      { pos: 'Steer R', serial: 'TY-88232', treadMm: 5.8, fittedKm: 388000 },
      { pos: 'Drive 1L', serial: 'TY-90114', treadMm: 9.1, fittedKm: 401000 },
      { pos: 'Drive 1R', serial: 'TY-90115', treadMm: 8.7, fittedKm: 401000 },
      { pos: 'Drive 2L', serial: 'TY-90116', treadMm: 3.1, fittedKm: 372000 },
      { pos: 'Drive 2R', serial: 'TY-90117', treadMm: 4.4, fittedKm: 372000 },
    ],
  },
  {
    id: 'v-002', reg: 'AFG 1120', make: 'Volvo', model: 'FH16', year: 2019, type: 'Truck Tractor',
    odometer: 688450, entity: 'Zimbabwe', status: 'In Service', driverId: 'd-002',
    lastServiceKm: 676000, serviceIntervalKm: 15000, fuelTankL: 700,
    tyres: [
      { pos: 'Steer L', serial: 'TY-71002', treadMm: 4.0, fittedKm: 651000 },
      { pos: 'Steer R', serial: 'TY-71003', treadMm: 4.2, fittedKm: 651000 },
      { pos: 'Drive 1L', serial: 'TY-77410', treadMm: 7.5, fittedKm: 670000 },
      { pos: 'Drive 1R', serial: 'TY-77411', treadMm: 7.9, fittedKm: 670000 },
    ],
  },
  {
    id: 'v-003', reg: 'AGH 8842', make: 'Freightliner', model: 'Argosy', year: 2017, type: 'Truck Tractor',
    odometer: 921100, entity: 'Zimbabwe', status: 'Workshop', driverId: 'd-003',
    lastServiceKm: 918000, serviceIntervalKm: 12000, fuelTankL: 550,
    tyres: [
      { pos: 'Steer L', serial: 'TY-55901', treadMm: 2.4, fittedKm: 880000 },
      { pos: 'Steer R', serial: 'TY-55902', treadMm: 2.1, fittedKm: 880000 },
    ],
  },
  {
    id: 'v-004', reg: 'ADM 2207', make: 'MAN', model: 'TGS 26.440', year: 2022, type: 'Rigid 10T',
    odometer: 154800, entity: 'Zimbabwe', status: 'In Service', driverId: 'd-004',
    lastServiceKm: 150000, serviceIntervalKm: 20000, fuelTankL: 400,
    tyres: [
      { pos: 'Steer L', serial: 'TY-99010', treadMm: 11.0, fittedKm: 140000 },
      { pos: 'Steer R', serial: 'TY-99011', treadMm: 10.6, fittedKm: 140000 },
    ],
  },
  {
    id: 'v-005', reg: 'MU 7741', make: 'Isuzu', model: 'FVR 900', year: 2020, type: 'Rigid 8T',
    odometer: 96200, entity: 'Mauritius', status: 'In Service', driverId: 'd-005',
    lastServiceKm: 88000, serviceIntervalKm: 10000, fuelTankL: 200,
    tyres: [
      { pos: 'Steer L', serial: 'TY-40021', treadMm: 8.0, fittedKm: 80000 },
      { pos: 'Steer R', serial: 'TY-40022', treadMm: 7.6, fittedKm: 80000 },
    ],
  },
];

export const drivers = [
  { id: 'd-001', name: 'Blessing Matare', licence: 'ZW-CL4-882134', expiry: '2027-03-14', entity: 'Zimbabwe', vehicleId: 'v-001', score: 88, phone: '+263 772 118 440' },
  { id: 'd-002', name: 'Tapiwa Gumbo', licence: 'ZW-CL4-771020', expiry: '2026-09-02', entity: 'Zimbabwe', vehicleId: 'v-002', score: 74, phone: '+263 771 204 887' },
  { id: 'd-003', name: 'Simba Chirwa', licence: 'ZW-CL4-660418', expiry: '2026-08-30', entity: 'Zimbabwe', vehicleId: 'v-003', score: 61, phone: '+263 774 660 418' },
  { id: 'd-004', name: 'Prosper Zvavamwe', licence: 'ZW-CL4-903377', expiry: '2028-01-19', entity: 'Zimbabwe', vehicleId: 'v-004', score: 93, phone: '+263 778 903 377' },
  { id: 'd-005', name: 'Ashvin Ramgoolam', licence: 'MU-HGV-11204', expiry: '2027-06-11', entity: 'Mauritius', vehicleId: 'v-005', score: 90, phone: '+230 5941 2208' },
];

export const suppliers = [
  { id: 'sup-001', name: 'National Railways of Zimbabwe', type: 'Rail Operator', entity: 'Zimbabwe', rating: 3.6, bcNo: 'VEND-3001' },
  { id: 'sup-002', name: 'Beitbridge Clearing Services (Pty) Ltd', type: 'Clearing Agent', entity: 'Zimbabwe', rating: 4.4, bcNo: 'VEND-3012' },
  { id: 'sup-003', name: 'Manica Freight Mozambique', type: 'Port Agent', entity: 'Mozambique', rating: 4.1, bcNo: 'VEND-3020' },
  { id: 'sup-004', name: 'Highveld Transport Co-op', type: 'Sub-contract Transporter', entity: 'Zimbabwe', rating: 3.9, bcNo: 'VEND-3033' },
  { id: 'sup-005', name: 'Port Louis Warehousing Ltd', type: 'Warehouse', entity: 'Mauritius', rating: 4.7, bcNo: 'VEND-4002' },
];

export const shipments = [
  {
    id: 'SHP-24118', customerId: 'c-001', commodity: 'CHR', weightTons: 34,
    origin: 'Ngezi Mine, Mhondoro', destination: 'Beira Port, Mozambique',
    mode: 'ROAD', port: 'BEW', border: 'FBS', vehicleId: 'v-001', driverId: 'd-001',
    status: 'In Transit', entity: 'Zimbabwe', revenue: 18600, cost: 13120,
    dispatchedAt: '2026-07-29', etaAt: '2026-08-06', bcOrderNo: 'SO-104882',
    currentLocation: 'Mutare', containerNo: 'MSCU 774182-3', truckReg: 'AEB 4471',
    driverPhone: '+263 772 118 440', trackingToken: 'SGT-4A7F2C',
  },
  {
    id: 'SHP-24119', customerId: 'c-002', commodity: 'LIT', weightTons: 30,
    origin: 'Arcadia Mine, Goromonzi', destination: 'Durban Port, South Africa',
    mode: 'MULTI', port: 'DUR', border: 'BBR', vehicleId: 'v-002', driverId: 'd-002',
    status: 'At Border', entity: 'Zimbabwe', revenue: 41200, cost: 30440,
    dispatchedAt: '2026-07-27', etaAt: '2026-08-05', bcOrderNo: 'SO-104884',
    currentLocation: 'Beitbridge Border', containerNo: 'TGHU 550913-8', truckReg: 'AFG 1120',
    driverPhone: '+263 771 204 887', trackingToken: 'SGT-9B31E4',
  },
  {
    id: 'SHP-24120', customerId: 'c-003', commodity: 'TOB', weightTons: 22,
    origin: 'Harare Tobacco Floors', destination: 'Beira Port, Mozambique',
    mode: 'ROAD', port: 'BEW', border: 'FBS', vehicleId: 'v-004', driverId: 'd-004',
    status: 'Delivered', entity: 'Zimbabwe', revenue: 12400, cost: 8100,
    dispatchedAt: '2026-07-20', etaAt: '2026-07-26', bcOrderNo: 'SO-104861',
    currentLocation: 'Beira Port', containerNo: 'MRKU 220417-1', truckReg: 'ADM 2207',
    driverPhone: '+263 778 903 377', trackingToken: 'SGT-2D66A1',
  },
  {
    id: 'SHP-24121', customerId: 'c-005', commodity: 'FTL', weightTons: 28,
    origin: 'Beira Port, Mozambique', destination: 'Kwekwe, Zimbabwe',
    mode: 'RAIL', port: 'BEW', border: 'FBS', vehicleId: null, driverId: null,
    status: 'Awaiting Rail', entity: 'Zimbabwe', revenue: 15900, cost: 11700,
    dispatchedAt: '2026-08-01', etaAt: '2026-08-12', bcOrderNo: 'SO-104890',
    currentLocation: 'Beira Port', containerNo: null, truckReg: null,
    driverPhone: null, trackingToken: 'SGT-7C0B95',
  },
  {
    id: 'SHP-24122', customerId: 'c-004', commodity: 'GEN', weightTons: 12,
    origin: 'Port Louis, Mauritius', destination: 'Curepipe Distribution Centre',
    mode: 'ROAD', port: 'MRU', border: null, vehicleId: 'v-005', driverId: 'd-005',
    status: 'In Transit', entity: 'Mauritius', revenue: 6800, cost: 4020,
    dispatchedAt: '2026-08-02', etaAt: '2026-08-04', bcOrderNo: 'SO-204119',
    currentLocation: 'Port Louis', containerNo: null, truckReg: 'MU 7741',
    driverPhone: '+230 5941 2208', trackingToken: 'SGT-5E82F0',
  },
  {
    id: 'SHP-24123', customerId: 'c-006', commodity: 'GEN', weightTons: 18,
    origin: 'Port Louis, Mauritius', destination: 'Durban Port, South Africa',
    mode: 'SEA', port: 'DUR', border: null, vehicleId: null, driverId: null,
    status: 'On Water', entity: 'Mauritius', revenue: 22400, cost: 16850,
    dispatchedAt: '2026-07-24', etaAt: '2026-08-09', bcOrderNo: 'SO-204124',
    currentLocation: null, containerNo: 'CMAU 881120-4', truckReg: null,
    driverPhone: null, trackingToken: 'SGT-1F44D7',
  },
  {
    id: 'SHP-24124', customerId: 'c-001', commodity: 'GRA', weightTons: 40,
    origin: 'Mutoko Quarry', destination: 'Walvis Bay, Namibia',
    mode: 'ROAD', port: 'WVB', border: 'PLB', vehicleId: 'v-003', driverId: 'd-003',
    status: 'Planned', entity: 'Zimbabwe', revenue: 33800, cost: 26900,
    dispatchedAt: null, etaAt: '2026-08-18', bcOrderNo: 'SO-104897',
    currentLocation: null, containerNo: null, truckReg: 'AGH 8842',
    driverPhone: '+263 774 660 418', trackingToken: 'SGT-8A19C3',
  },
];

/**
 * Structured events on a consignment's timeline. Everything that reaches a
 * customer lands here first, and only once approved.
 */
export const shipmentEvents = [
  {
    id: 'EVT-9001', shipmentId: 'SHP-24118', type: 'departed',
    label: 'Departed Ngezi Mine loaded with 34t chrome ore',
    locationText: 'Ngezi', statusHint: 'In Transit', source: 'coordinator',
    confidence: 90, approved: true, rawText: 'Loaded and left the mine 06:40, 34 tons on board.',
    at: '2026-07-29T06:45:00Z', approvedAt: '2026-07-29T07:02:00Z', matchedBy: 'selected',
  },
  {
    id: 'EVT-9002', shipmentId: 'SHP-24118', type: 'location',
    label: 'Now at Mutare, approaching Forbes',
    locationText: 'Mutare', statusHint: 'In Transit', source: 'whatsapp',
    confidence: 62, approved: true, rawText: 'Boss we are now in Mutare, going to the border now',
    at: '2026-08-01T14:20:00Z', approvedAt: '2026-08-01T14:35:00Z', matchedBy: 'phone',
  },
  {
    id: 'EVT-9003', shipmentId: 'SHP-24119', type: 'border_cross',
    label: 'Arrived at Beitbridge, in the ZIMRA scanner queue',
    locationText: 'Beitbridge', statusHint: 'At Border', source: 'whatsapp',
    confidence: 65, approved: true, rawText: 'At beitbridge since 4am, scanner queue very long',
    at: '2026-07-30T04:40:00Z', approvedAt: '2026-07-30T05:10:00Z', matchedBy: 'phone',
  },
  {
    id: 'EVT-9004', shipmentId: 'SHP-24120', type: 'delivered',
    label: 'Delivered to Beira Port, signed by M. Chizema',
    locationText: 'Beira', statusHint: 'Delivered', source: 'manual',
    confidence: 95, approved: true, rawText: 'POD captured on the handset.',
    at: '2026-07-26T09:12:00Z', approvedAt: '2026-07-26T09:12:00Z', matchedBy: 'selected',
  },
];

/** Field updates awaiting a human before they reach the customer. */
export const inboxQueue = [
  {
    id: 'INB-5001', shipmentId: 'SHP-24119', source: 'whatsapp',
    rawText: 'Still at beitbridge, delay about 11 hours now. Scanner is down since morning. ETA durban tomorrow evening.',
    fromPhone: '+263 771 204 887', matchedBy: 'phone', confidence: 62,
    extraction: {
      type: 'delay', label: 'Delayed 11.0 hours at Beitbridge', location_text: 'Beitbridge',
      status_hint: 'Delayed', reference: null, eta: 'tomorrow evening', delay_minutes: 660,
      extraction_confidence: 0.95,
    },
    receivedAt: '2026-08-04T09:15:00Z', status: 'pending',
  },
  {
    id: 'INB-5002', shipmentId: 'SHP-24122', source: 'voice',
    rawText: 'We have offloaded at Curepipe, everything is fine, customer has signed.',
    fromPhone: '+230 5941 2208', matchedBy: 'phone', confidence: 76,
    extraction: {
      type: 'delivered', label: 'Delivered to Curepipe', location_text: 'Curepipe',
      status_hint: 'Delivered', reference: null, eta: null, delay_minutes: 0,
      extraction_confidence: 0.95,
    },
    receivedAt: '2026-08-04T11:40:00Z', status: 'pending',
  },
];

export const jobs = [
  {
    id: 'JOB-5511', shipmentId: 'SHP-24121', supplierId: 'sup-001',
    description: 'Rail haulage — Beira to Kwekwe, 28t fertiliser, 2 wagons',
    status: 'Offered', value: 7400, currency: 'USD', issuedAt: '2026-08-01', dueAt: '2026-08-12',
  },
  {
    id: 'JOB-5512', shipmentId: 'SHP-24119', supplierId: 'sup-002',
    description: 'Customs clearance — Beitbridge export, lithium concentrate',
    status: 'Accepted', value: 1250, currency: 'USD', issuedAt: '2026-07-27', dueAt: '2026-08-05',
  },
  {
    id: 'JOB-5513', shipmentId: 'SHP-24118', supplierId: 'sup-003',
    description: 'Port handling & stevedoring — Beira, 34t chrome ore',
    status: 'In Progress', value: 3100, currency: 'USD', issuedAt: '2026-07-29', dueAt: '2026-08-07',
  },
  {
    id: 'JOB-5514', shipmentId: 'SHP-24124', supplierId: 'sup-004',
    description: 'Sub-contract haulage — Mutoko to Plumtree, 40t granite',
    status: 'Offered', value: 9800, currency: 'USD', issuedAt: '2026-08-03', dueAt: '2026-08-18',
  },
  {
    id: 'JOB-5515', shipmentId: 'SHP-24123', supplierId: 'sup-005',
    description: 'Bonded warehousing — 18t general cargo, 14 days',
    status: 'Completed', value: 2200, currency: 'USD', issuedAt: '2026-07-18', dueAt: '2026-08-01',
  },
];

export const supplierInvoices = [
  {
    id: 'SINV-2201', supplierId: 'sup-002', jobId: 'JOB-5512', invoiceNumber: 'INV-BCS-20419',
    amount: 1250, currency: 'USD', status: 'Approved', submittedAt: '2026-08-02T09:15:00Z',
    documents: [], notes: 'Beitbridge export clearance, SHP-24119.', bcRef: 'PINV-77201',
  },
  {
    id: 'SINV-2202', supplierId: 'sup-005', jobId: 'JOB-5515', invoiceNumber: 'INV-PLW-8841',
    amount: 2200, currency: 'USD', status: 'Submitted', submittedAt: '2026-08-01T11:40:00Z',
    documents: [], notes: '14 days bonded storage.', bcRef: null,
  },
];

export const pods = [
  {
    id: 'POD-9001', shipmentId: 'SHP-24120', driverId: 'd-004',
    receivedBy: 'M. Chizema', notes: 'All 22 bales accounted for. Seal intact.',
    photos: [], signature: null, lat: -19.8436, lng: 34.8389,
    capturedAt: '2026-07-26T09:12:00Z', synced: true,
  },
];

export const incidents = [
  {
    id: 'INC-4401', shipmentId: 'SHP-24119', vehicleId: 'v-002', driverId: 'd-002',
    type: 'Delay', severity: 'Medium',
    description: 'Held at Beitbridge — ZIMRA scanner queue, 11 hours and counting.',
    location: 'Beitbridge Border Post', photos: [],
    reportedAt: '2026-07-30T04:40:00Z', status: 'Open', synced: true,
  },
  {
    id: 'INC-4402', shipmentId: null, vehicleId: 'v-003', driverId: 'd-003',
    type: 'Breakdown', severity: 'High',
    description: 'Air compressor failure on the A5 near Kadoma. Recovery dispatched.',
    location: 'A5, 12km east of Kadoma', photos: [],
    reportedAt: '2026-07-31T13:05:00Z', status: 'Resolved', synced: true,
  },
];

export const fuelLogs = [
  { id: 'FL-7701', vehicleId: 'v-001', driverId: 'd-001', litres: 480, cost: 686.4, odometer: 411100, station: 'Puma Chegutu', loggedAt: '2026-07-29T06:20:00Z', synced: true },
  { id: 'FL-7702', vehicleId: 'v-001', driverId: 'd-001', litres: 510, cost: 749.7, odometer: 412300, station: 'Total Mutare', loggedAt: '2026-08-01T15:40:00Z', synced: true },
  { id: 'FL-7703', vehicleId: 'v-002', driverId: 'd-002', litres: 620, cost: 905.2, odometer: 687200, station: 'Engen Beitbridge', loggedAt: '2026-07-28T11:10:00Z', synced: true },
  { id: 'FL-7704', vehicleId: 'v-004', driverId: 'd-004', litres: 310, cost: 443.3, odometer: 154100, station: 'Zuva Msasa', loggedAt: '2026-07-25T07:55:00Z', synced: true },
  { id: 'FL-7705', vehicleId: 'v-005', driverId: 'd-005', litres: 180, cost: 291.6, odometer: 95800, station: 'Shell Port Louis', loggedAt: '2026-08-02T08:30:00Z', synced: true },
];

export const inspections = [
  {
    id: 'INS-3301', vehicleId: 'v-001', driverId: 'd-001', odometer: 412300,
    checks: { tyres: 'pass', brakes: 'pass', lights: 'pass', fluids: 'pass', coupling: 'pass', bodywork: 'advisory', loadSecuring: 'pass', documents: 'pass' },
    notes: 'Minor scuff to nearside fairing, no action required.',
    photos: [], inspectedAt: '2026-07-29T05:40:00Z', synced: true,
  },
  {
    id: 'INS-3302', vehicleId: 'v-003', driverId: 'd-003', odometer: 921100,
    checks: { tyres: 'fail', brakes: 'advisory', lights: 'pass', fluids: 'pass', coupling: 'pass', bodywork: 'pass', loadSecuring: 'pass', documents: 'pass' },
    notes: 'Both steer tyres below 3mm. Vehicle grounded pending replacement.',
    photos: [], inspectedAt: '2026-07-31T06:15:00Z', synced: true,
  },
];

export const serviceRecords = [
  { id: 'SVC-2201', vehicleId: 'v-001', type: 'A-Service', odometer: 402000, cost: 840, performedAt: '2026-06-14', notes: 'Oil, filters, brake adjustment.' },
  { id: 'SVC-2202', vehicleId: 'v-002', type: 'B-Service', odometer: 676000, cost: 1620, performedAt: '2026-06-28', notes: 'Full service plus injector clean.' },
  { id: 'SVC-2203', vehicleId: 'v-003', type: 'Repair', odometer: 918000, cost: 3450, performedAt: '2026-07-31', notes: 'Air compressor replacement — roadside failure.' },
  { id: 'SVC-2204', vehicleId: 'v-004', type: 'A-Service', odometer: 150000, cost: 610, performedAt: '2026-07-02', notes: 'Routine.' },
  { id: 'SVC-2205', vehicleId: 'v-005', type: 'A-Service', odometer: 88000, cost: 390, performedAt: '2026-05-19', notes: 'Routine — Mauritius workshop.' },
];

export const quotations = [
  {
    id: 'QT-8801', customerId: 'c-002', commodity: 'LIT', origin: 'Arcadia Mine, Goromonzi',
    destination: 'Durban Port, South Africa', weightTons: 30, mode: 'MULTI', port: 'DUR',
    insurance: true, insuredValue: 900000, status: 'Accepted', createdAt: '2026-07-22',
    createdBy: 'u-004', total: 41200, margin: 26.1,
  },
  {
    id: 'QT-8802', customerId: 'c-006', commodity: 'GEN', origin: 'Port Louis, Mauritius',
    destination: 'Durban Port, South Africa', weightTons: 18, mode: 'SEA', port: 'DUR',
    insurance: true, insuredValue: 240000, status: 'Sent', createdAt: '2026-07-30',
    createdBy: 'u-004', total: 22400, margin: 24.8,
  },
];

export const documents = [
  {
    id: 'DOC-6601', shipmentId: 'SHP-24118', type: 'Bill of Lading', fileName: 'BL-BEW-114872.pdf',
    status: 'Posted', confidence: 0.97, uploadedAt: '2026-07-29T10:02:00Z', bcRef: 'PDOC-88120',
    fields: {
      documentNumber: 'BL-BEW-114872', shipper: 'Zimplats Holdings', consignee: 'Glencore International AG',
      vessel: 'MV Kota Nabil', portOfLoading: 'Beira', portOfDischarge: 'Rotterdam',
      grossWeightKg: '34000', containerNo: 'MSCU 774182-3', freightTerms: 'Prepaid',
    },
  },
  {
    id: 'DOC-6602', shipmentId: 'SHP-24119', type: 'CD1 Form', fileName: 'CD1-2026-04471.pdf',
    status: 'Needs Review', confidence: 0.78, uploadedAt: '2026-07-28T08:44:00Z', bcRef: null,
    fields: {
      cd1Number: 'CD1/2026/04471', exporter: 'Karo Mining Resources', authorisedDealer: 'Stanbic Bank Zimbabwe',
      commodity: 'Lithium Concentrate', valueUSD: '900000', destinationCountry: 'South Africa',
      expiryDate: '2026-10-28',
    },
  },
  {
    id: 'DOC-6603', shipmentId: 'SHP-24120', type: 'Commercial Invoice', fileName: 'INV-TSF-99120.pdf',
    status: 'Posted', confidence: 0.94, uploadedAt: '2026-07-21T14:20:00Z', bcRef: 'PDOC-88099',
    fields: {
      invoiceNumber: 'INV-TSF-99120', supplier: 'Tobacco Sales Floor Ltd', currency: 'USD',
      netAmount: '12400.00', vatAmount: '0.00', totalAmount: '12400.00', invoiceDate: '2026-07-21',
    },
  },
];

export const syncQueue = [];

/* ===========================================================================
   Customer-facing records — the client portal reads these, always scoped to
   the signed-in user's own customerId.
   =========================================================================== */

export const invoices = [
  {
    id: 'INV-40118', customerId: 'c-001', shipmentId: 'SHP-24118', entity: 'Zimbabwe',
    issuedAt: '2026-07-30', dueAt: '2026-08-29', amount: 18600, currency: 'USD',
    status: 'Outstanding', bcNo: 'SI-104882', paidAmount: 0,
    lines: [
      { description: 'Road freight — Ngezi to Beira, 34t chrome ore', amount: 14200 },
      { description: 'Port handling & stevedoring — Beira', amount: 3100 },
      { description: 'Customs clearance — Forbes', amount: 980 },
      { description: 'Documentation & filing', amount: 320 },
    ],
  },
  {
    id: 'INV-40119', customerId: 'c-003', shipmentId: 'SHP-24120', entity: 'Zimbabwe',
    issuedAt: '2026-07-26', dueAt: '2026-08-09', amount: 12400, currency: 'USD',
    status: 'Paid', bcNo: 'SI-104861', paidAmount: 12400,
    lines: [
      { description: 'Road freight — Harare to Beira, 22t tobacco', amount: 10600 },
      { description: 'Port handling — Beira', amount: 1480 },
      { description: 'Documentation & filing', amount: 320 },
    ],
  },
  {
    id: 'INV-40120', customerId: 'c-004', shipmentId: 'SHP-24122', entity: 'Mauritius',
    issuedAt: '2026-08-03', dueAt: '2026-09-02', amount: 6800, currency: 'USD',
    status: 'Outstanding', bcNo: 'SI-204119', paidAmount: 0,
    lines: [
      { description: 'Road freight — Port Louis to Curepipe, 12t general', amount: 5900 },
      { description: 'Handling & documentation', amount: 900 },
    ],
  },
  {
    id: 'INV-40121', customerId: 'c-001', shipmentId: 'SHP-24124', entity: 'Zimbabwe',
    issuedAt: '2026-06-28', dueAt: '2026-07-28', amount: 9450, currency: 'USD',
    status: 'Overdue', bcNo: 'SI-104790', paidAmount: 4000,
    lines: [{ description: 'Road freight — Mutoko to Plumtree, part settlement outstanding', amount: 9450 }],
  },
];

/** Booking requests raised by customers from their own portal. */
export const bookings = [
  {
    id: 'BKG-3301', customerId: 'c-001', commodity: 'CHR', weightTons: 34,
    originCode: 'NGZ', portCode: 'BEW', modeCode: 'ROAD',
    readyDate: '2026-08-12', notes: 'Two loads, second to follow the week after.',
    status: 'Confirmed', raisedBy: 'u-007', raisedAt: '2026-08-01T08:20:00Z',
    shipmentId: 'SHP-24118', reference: 'ZIM-PO-88412',
  },
  {
    id: 'BKG-3302', customerId: 'c-004', commodity: 'GEN', weightTons: 12,
    originCode: 'PTL', portCode: 'MRU', modeCode: 'ROAD',
    readyDate: '2026-08-08', notes: 'Palletised, forklift available both ends.',
    status: 'Requested', raisedBy: 'u-008', raisedAt: '2026-08-03T13:05:00Z',
    shipmentId: null, reference: 'IOT-4471',
  },
];

/* ===========================================================================
   Workshop job cards — module 7 turns a failed inspection into one of these.
   =========================================================================== */

export const jobCards = [
  {
    id: 'JC-1101', vehicleId: 'v-003', status: 'In Progress', priority: 'High',
    raisedAt: '2026-07-31T13:40:00Z', raisedBy: 'u-003',
    fault: 'Air compressor failure — roadside breakdown on the A5.',
    odometer: 921100,
    parts: [
      { name: 'Air compressor assembly', qty: 1, unitCost: 2450 },
      { name: 'Compressor gasket set', qty: 1, unitCost: 85 },
      { name: 'Coolant, 20L', qty: 1, unitCost: 62 },
    ],
    labourHours: 6.5, labourRate: 45, completedAt: null,
  },
  {
    id: 'JC-1102', vehicleId: 'v-003', status: 'Open', priority: 'Critical',
    raisedAt: '2026-07-31T06:20:00Z', raisedBy: 'u-003',
    fault: 'Both steer tyres below 3mm — vehicle grounded at daily check.',
    odometer: 921100,
    parts: [{ name: 'Steer tyre 315/80R22.5', qty: 2, unitCost: 480 }],
    labourHours: 2, labourRate: 45, completedAt: null,
  },
  {
    id: 'JC-1103', vehicleId: 'v-002', status: 'Completed', priority: 'Medium',
    raisedAt: '2026-06-28T09:00:00Z', raisedBy: 'u-003',
    fault: 'B-service due plus injector rough-running complaint.',
    odometer: 676000,
    parts: [
      { name: 'Oil filter', qty: 1, unitCost: 38 },
      { name: 'Fuel filter set', qty: 1, unitCost: 96 },
      { name: 'Engine oil 40L', qty: 1, unitCost: 310 },
    ],
    labourHours: 8, labourRate: 45, completedAt: '2026-06-28T17:30:00Z',
  },
];

/* ===========================================================================
   Rate requests — module 8 puts one lane out to several contractors at once.
   =========================================================================== */

export const rateRequests = [
  {
    id: 'RFQ-7701', lane: 'Mutoko Quarry → Walvis Bay', commodity: 'GRA', weightTons: 40,
    modeCode: 'ROAD', neededBy: '2026-08-18', status: 'Open',
    raisedAt: '2026-08-03T10:00:00Z', raisedBy: 'u-003',
    invited: ['sup-004', 'sup-001'],
    responses: [
      { supplierId: 'sup-004', amount: 9800, currency: 'USD', transitDays: 6, note: 'Two units available from Monday.', respondedAt: '2026-08-03T15:20:00Z' },
    ],
  },
  {
    id: 'RFQ-7702', lane: 'Beira → Kwekwe', commodity: 'FTL', weightTons: 28,
    modeCode: 'RAIL', neededBy: '2026-08-12', status: 'Awarded',
    raisedAt: '2026-07-30T08:00:00Z', raisedBy: 'u-003',
    invited: ['sup-001', 'sup-003'],
    awardedTo: 'sup-001',
    responses: [
      { supplierId: 'sup-001', amount: 7400, currency: 'USD', transitDays: 11, note: '2 wagons, subject to allocation.', respondedAt: '2026-07-30T14:10:00Z' },
      { supplierId: 'sup-003', amount: 8150, currency: 'USD', transitDays: 9, note: 'Includes port transfer.', respondedAt: '2026-07-31T09:45:00Z' },
    ],
  },
];

/* ===========================================================================
   Cross-cutting: audit trail, notifications, budgets.
   =========================================================================== */

export const auditLog = [
  {
    id: 'AUD-0001', userId: 'u-003', userName: 'Farai Nyathi', role: 'ops',
    action: 'inspection.fail', entity: 'v-003', summary: 'AGH 8842 grounded — 1 failed inspection item',
    at: '2026-07-31T06:15:00Z',
  },
  {
    id: 'AUD-0002', userId: 'u-004', userName: 'Nyasha Dube', role: 'sales',
    action: 'quotation.create', entity: 'QT-8802', summary: 'Quotation QT-8802 raised for Mauritius Freight Partners',
    at: '2026-07-30T11:22:00Z',
  },
  {
    id: 'AUD-0003', userId: 'u-006', userName: 'Kagiso Ndlovu', role: 'supplier',
    action: 'job.accept', entity: 'JOB-5512', summary: 'Work order JOB-5512 accepted',
    at: '2026-07-27T16:40:00Z',
  },
];

export const notifications = [
  {
    id: 'NTF-0001', forRoles: ['ops', 'management'], forUserId: null,
    severity: 'critical', title: 'AGH 8842 grounded',
    body: 'Both steer tyres below the 3mm legal limit. Two job cards are open.',
    link: '/portal/fleet', at: '2026-07-31T06:16:00Z', read: false,
  },
  {
    id: 'NTF-0002', forRoles: ['ops', 'sales', 'management'], forUserId: null,
    severity: 'warning', title: 'Beitbridge wait climbing',
    body: 'Projected 27h in four weeks against a 14h baseline. Three loads routed through it.',
    link: '/portal/analytics', at: '2026-08-02T07:00:00Z', read: false,
  },
  {
    id: 'NTF-0003', forRoles: ['client'], forUserId: 'u-007',
    severity: 'info', title: 'SHP-24118 has cleared Forbes',
    body: 'Your chrome ore consignment is on the Beira leg. ETA unchanged.',
    link: '/portal/my', at: '2026-08-01T09:30:00Z', read: false,
  },
  {
    id: 'NTF-0004', forRoles: ['client'], forUserId: 'u-007',
    severity: 'warning', title: 'Invoice INV-40121 is overdue',
    body: 'A balance of $5,450 was due on 28 July.',
    link: '/portal/my/billing', at: '2026-07-29T06:00:00Z', read: false,
  },
];

/** Monthly budget by entity — module 9 compares this against actuals. */
export const budgets = [
  { month: 'Feb', zwRevenue: 400000, muRevenue: 130000 },
  { month: 'Mar', zwRevenue: 430000, muRevenue: 140000 },
  { month: 'Apr', zwRevenue: 460000, muRevenue: 150000 },
  { month: 'May', zwRevenue: 490000, muRevenue: 160000 },
  { month: 'Jun', zwRevenue: 520000, muRevenue: 170000 },
  { month: 'Jul', zwRevenue: 550000, muRevenue: 180000 },
];

/** Alert rules — module 10 evaluates these against the live outlook. */
export const alertRules = [
  {
    id: 'ALR-01', name: 'Beitbridge wait over 20 hours', metric: 'border', target: 'BBR',
    comparator: 'above', threshold: 20, channel: 'Portal + email', active: true,
  },
  {
    id: 'ALR-02', name: 'Durban dwell over 7 days', metric: 'port', target: 'DUR',
    comparator: 'above', threshold: 7, channel: 'Portal', active: true,
  },
  {
    id: 'ALR-03', name: 'Rail allocation below 50%', metric: 'rail', target: 'NRZ',
    comparator: 'below', threshold: 50, channel: 'Portal + email', active: true,
  },
  {
    id: 'ALR-04', name: 'Weekly demand above 1,800t', metric: 'demand', target: 'Group',
    comparator: 'above', threshold: 1800, channel: 'Portal', active: false,
  },
];

export const marketSignals = {
  // Rolling 12-week series used by the analytics module.
  weeks: ['W22', 'W23', 'W24', 'W25', 'W26', 'W27', 'W28', 'W29', 'W30', 'W31', 'W32', 'W33'],
  borderWaitHours: {
    BBR: [11, 13, 12, 16, 18, 15, 14, 17, 21, 19, 22, 24],
    FBS: [5, 6, 6, 7, 5, 6, 8, 7, 6, 6, 7, 6],
    CHR: [8, 9, 11, 10, 9, 12, 11, 10, 9, 11, 12, 13],
    PLB: [4, 5, 4, 5, 6, 5, 4, 5, 5, 6, 5, 5],
    NYA: [7, 7, 8, 6, 7, 7, 9, 8, 7, 8, 8, 7],
  },
  portDwellDays: {
    BEW: [3.1, 3.4, 3.0, 3.6, 4.0, 3.8, 3.5, 3.9, 4.2, 4.4, 4.1, 4.6],
    DUR: [5.2, 5.6, 6.1, 5.9, 6.4, 6.8, 7.1, 6.9, 7.4, 7.8, 8.1, 8.4],
    WVB: [2.0, 2.1, 1.9, 2.2, 2.0, 2.3, 2.1, 2.0, 2.2, 2.1, 2.3, 2.2],
    NLA: [3.8, 4.0, 3.7, 3.9, 4.1, 4.0, 4.3, 4.2, 4.0, 4.4, 4.3, 4.5],
    MRU: [1.6, 1.7, 1.5, 1.8, 1.6, 1.7, 1.9, 1.8, 1.7, 1.6, 1.8, 1.7],
    DAR: [6.8, 7.2, 7.0, 7.6, 8.0, 7.9, 8.3, 8.6, 8.4, 9.0, 9.2, 9.5],
  },
  railWagonAvailability: [72, 68, 74, 66, 61, 58, 64, 59, 54, 51, 48, 45],
  demandTons: [1180, 1240, 1310, 1290, 1360, 1420, 1390, 1470, 1520, 1580, 1610, 1690],
};

export const monthlyFinancials = [
  { month: 'Feb', zwRevenue: 412000, zwCost: 301000, muRevenue: 138000, muCost: 96000, intercompany: 22000 },
  { month: 'Mar', zwRevenue: 448000, zwCost: 322000, muRevenue: 151000, muCost: 103000, intercompany: 26500 },
  { month: 'Apr', zwRevenue: 471000, zwCost: 341000, muRevenue: 144000, muCost: 101000, intercompany: 24800 },
  { month: 'May', zwRevenue: 502000, zwCost: 358000, muRevenue: 168000, muCost: 112000, intercompany: 31200 },
  { month: 'Jun', zwRevenue: 528000, zwCost: 379000, muRevenue: 175000, muCost: 118000, intercompany: 29400 },
  { month: 'Jul', zwRevenue: 561000, zwCost: 397000, muRevenue: 192000, muCost: 124000, intercompany: 35100 },
];

export const fxRates = [
  { pair: 'USD/ZWG', rate: 26.84, change: -1.9 },
  { pair: 'USD/MUR', rate: 46.12, change: 0.4 },
  { pair: 'USD/ZAR', rate: 17.68, change: -0.8 },
  { pair: 'EUR/USD', rate: 1.09, change: 0.2 },
];
