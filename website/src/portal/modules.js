// Single source of truth for the portal's module registry.
// The sidebar, the dashboard tiles and the route guards all read from here,
// so adding a module means adding one entry and one <Route>.

export const modules = [
  /* ===== Customer-facing ===== */
  {
    key: 'my',
    number: null,
    path: '/portal/my',
    name: 'My Shipments',
    short: 'My Shipments',
    icon: 'PackageSearch',
    roles: ['client'],
    group: 'Your account',
    blurb: 'Track every consignment, with live status and predicted arrival.',
  },
  {
    key: 'myQuotes',
    number: null,
    path: '/portal/my/quotes',
    name: 'Quotations & Bookings',
    short: 'Quotes & Bookings',
    icon: 'FileSignature',
    roles: ['client'],
    group: 'Your account',
    blurb: 'Review quotations, accept them, and raise a new booking.',
  },
  {
    key: 'myDocs',
    number: null,
    path: '/portal/my/documents',
    name: 'Documents & PODs',
    short: 'Documents',
    icon: 'FolderOpen',
    roles: ['client'],
    group: 'Your account',
    blurb: 'Proof of delivery, bills of lading and customs paperwork.',
  },
  {
    key: 'myBilling',
    number: null,
    path: '/portal/my/billing',
    name: 'Invoices & Statements',
    short: 'Billing',
    icon: 'ReceiptText',
    roles: ['client'],
    group: 'Your account',
    blurb: 'Invoices, balances and your account statement.',
  },

  /* ===== Staff ===== */
  {
    key: 'dashboard',
    number: null,
    path: '/portal',
    name: 'Dashboard',
    short: 'Dashboard',
    icon: 'LayoutDashboard',
    roles: ['management', 'ops', 'sales', 'driver'],
    group: 'Operations',
    blurb: 'Live operating picture across both entities.',
  },
  {
    key: 'ops',
    number: 4,
    path: '/portal/operations',
    name: 'Operations Mobile App',
    short: 'Field Operations',
    icon: 'Smartphone',
    roles: ['ops', 'driver', 'management'],
    group: 'Operations',
    blurb: 'Proof of delivery, signatures, QR scanning, incidents, fuel and inspections — offline capable.',
  },
  {
    key: 'quotes',
    number: 5,
    path: '/portal/quotations',
    name: 'Customer Quotation Engine',
    short: 'Quotations',
    icon: 'Calculator',
    roles: ['sales', 'management'],
    group: 'Commercial',
    blurb: 'Instant priced quotations with transit time, documentation and margin.',
  },
  {
    key: 'tracking',
    number: null,
    path: '/portal/tracking',
    name: 'Live Tracking',
    short: 'Live Tracking',
    icon: 'Radar',
    roles: ['ops', 'sales', 'management', 'driver'],
    group: 'Operations',
    blurb: 'Every consignment on one map, with position, corridor and predicted arrival.',
  },
  {
    key: 'inbox',
    number: null,
    path: '/portal/inbox',
    name: 'AI Update Inbox',
    short: 'Update Inbox',
    icon: 'Sparkles',
    roles: ['ops', 'management'],
    group: 'Operations',
    blurb: 'WhatsApp, voice notes and screenshots matched to a consignment and structured into events.',
  },
  {
    key: 'docs',
    number: 6,
    path: '/portal/documents',
    name: 'AI Document Processing',
    short: 'Documents',
    icon: 'ScanText',
    roles: ['ops', 'sales', 'management'],
    group: 'Operations',
    blurb: 'Extract Bills of Lading, invoices, CD1s and permits straight into Business Central.',
  },
  {
    key: 'fleet',
    number: 7,
    path: '/portal/fleet',
    name: 'Fleet Maintenance Platform',
    short: 'Fleet',
    icon: 'Wrench',
    roles: ['ops', 'management'],
    group: 'Operations',
    blurb: 'Service schedules, tyres, fuel analytics, driver behaviour and predictive maintenance.',
  },
  {
    key: 'suppliers',
    number: 8,
    path: '/portal/suppliers',
    name: 'Supplier & Contractor Portal',
    short: 'Suppliers',
    icon: 'Handshake',
    roles: ['ops', 'supplier', 'management'],
    group: 'Operations',
    blurb: 'Job offers, rate requests, document upload and invoicing without the email chain.',
  },
  {
    key: 'group',
    number: 9,
    path: '/portal/group',
    name: 'Mauritius–Zimbabwe Group Portal',
    short: 'Group View',
    icon: 'Globe2',
    roles: ['management'],
    group: 'Executive',
    blurb: 'Consolidated revenue, cross-border profitability, budget variance and currency exposure.',
  },
  {
    key: 'analytics',
    number: 10,
    path: '/portal/analytics',
    name: 'Predictive Logistics Analytics',
    short: 'Predictive',
    icon: 'TrendingUp',
    roles: ['ops', 'sales', 'management'],
    group: 'Executive',
    blurb: 'Border delays, port congestion, rail availability, shipment risk and demand forecasting.',
  },

  /* ===== Administration ===== */
  {
    key: 'admin',
    number: null,
    path: '/portal/admin',
    name: 'Admin Panel',
    short: 'Admin Panel',
    icon: 'ShieldCheck',
    roles: ['admin'],
    adminOnly: true,
    group: 'Administration',
    blurb: 'Users, roles and permissions, audit trail, integration settings and system health.',
  },
];

export const moduleByKey = (key) => modules.find((m) => m.key === key);

/**
 * Modules a given role may open, in sidebar order.
 *
 * Admin sees everything operational plus the admin panel, but never the
 * customer-facing screens — those are scoped to a single customer record and
 * would be meaningless (and misleading) without one.
 */
export function modulesForRole(role) {
  if (!role) return [];
  if (role === 'admin') return modules.filter((m) => !m.roles?.includes('client'));
  return modules.filter((m) => !m.roles || m.roles.includes(role));
}

/** The same list, bucketed by `group`, for a sectioned sidebar. */
export function groupedModulesForRole(role) {
  const list = modulesForRole(role);
  const order = ['Your account', 'Operations', 'Commercial', 'Executive', 'Administration'];
  const buckets = new Map();
  for (const item of list) {
    const key = item.group || 'Other';
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(item);
  }
  return [...buckets.entries()]
    .sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]))
    .map(([group, items]) => ({ group, items }));
}
