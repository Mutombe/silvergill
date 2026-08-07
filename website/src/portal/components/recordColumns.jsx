import React from 'react';

import * as db from '../data/db';
import { commodities, transportModes, ROLE_LABELS } from '../data/seed';
import { Badge, money, num, dateLabel, timeLabel, statusTone } from './ui';
import RecordLink from './RecordLink';

/* ===========================================================================
   Shared column definitions.

   Declared once so the same record looks the same everywhere it appears — in
   its own module, in a related section on someone else's detail page, in a
   search result. Identifiers render as links, so every table is a set of
   doorways rather than a wall of text.
   =========================================================================== */

const commodityName = (code) => commodities.find((c) => c.code === code)?.name ?? code;
const modeName = (code) => transportModes.find((m) => m.code === code)?.name ?? code;
const customerName = (id) => db.find('customers', id)?.name ?? null;
const supplierName = (id) => db.find('suppliers', id)?.name ?? null;
const vehicleReg = (id) => db.find('vehicles', id)?.reg ?? null;
const driverName = (id) => db.find('drivers', id)?.name ?? null;

/** The identifier column — always a link to the record's own page. */
const idColumn = (entity, label = 'Reference', key = 'id') => ({
  key,
  label,
  sortValue: (r) => r[key],
  render: (r) => (
    <RecordLink entity={entity} id={r.id} className="tabular-nums">
      {r[key]}
    </RecordLink>
  ),
});

const statusColumn = (key = 'status') => ({
  key,
  label: 'Status',
  render: (r) => (r[key] ? <Badge tone={statusTone(r[key])}>{r[key]}</Badge> : null),
});

export const RELATED_COLUMNS = {
  shipments: [
    idColumn('shipments', 'Consignment'),
    {
      key: 'customerId',
      label: 'Customer',
      maxWidth: '12rem',
      sortValue: (r) => customerName(r.customerId),
      render: (r) => <RecordLink entity="customers" id={r.customerId} />,
    },
    {
      key: 'route',
      label: 'Route',
      maxWidth: '18rem',
      sortValue: (r) => r.origin,
      render: (r) => (
        <span className="text-xs text-silver-500">
          {r.origin} → {r.destination}
        </span>
      ),
    },
    { key: 'weightTons', label: 'Tonnes', align: 'right', total: (r) => r.weightTons },
    { key: 'etaAt', label: 'ETA', render: (r) => dateLabel(r.etaAt) },
    statusColumn(),
    {
      key: 'revenue',
      label: 'Value',
      align: 'right',
      render: (r) => money(r.revenue),
      total: (r) => r.revenue,
      totalRender: (sum) => money(sum),
    },
  ],

  customers: [
    idColumn('customers', 'Customer', 'name'),
    { key: 'bcNo', label: 'Account', mono: true },
    { key: 'entity', label: 'Entity' },
    { key: 'terms', label: 'Terms' },
    {
      key: 'creditLimit',
      label: 'Credit limit',
      align: 'right',
      render: (r) => money(r.creditLimit),
      total: (r) => r.creditLimit,
      totalRender: (sum) => money(sum),
    },
  ],

  quotations: [
    idColumn('quotations', 'Quotation'),
    {
      key: 'customerId',
      label: 'Customer',
      maxWidth: '12rem',
      sortValue: (r) => customerName(r.customerId),
      render: (r) => <RecordLink entity="customers" id={r.customerId} />,
    },
    {
      key: 'lane',
      label: 'Lane',
      maxWidth: '16rem',
      sortValue: (r) => r.origin,
      render: (r) => <span className="text-xs text-silver-500">{r.origin} → {r.destination}</span>,
    },
    { key: 'weightTons', label: 'Tonnes', align: 'right' },
    { key: 'createdAt', label: 'Issued', render: (r) => dateLabel(r.createdAt) },
    { key: 'margin', label: 'Margin', align: 'right', render: (r) => `${num(r.margin, 1)}%` },
    {
      key: 'total',
      label: 'Value',
      align: 'right',
      render: (r) => money(r.total),
      total: (r) => r.total,
      totalRender: (sum) => money(sum),
    },
    statusColumn(),
  ],

  invoices: [
    idColumn('invoices', 'Invoice'),
    {
      key: 'customerId',
      label: 'Customer',
      maxWidth: '12rem',
      sortValue: (r) => customerName(r.customerId),
      render: (r) => <RecordLink entity="customers" id={r.customerId} />,
    },
    {
      key: 'shipmentId',
      label: 'Consignment',
      render: (r) => <RecordLink entity="shipments" id={r.shipmentId} />,
    },
    { key: 'issuedAt', label: 'Issued', render: (r) => dateLabel(r.issuedAt) },
    { key: 'dueAt', label: 'Due', render: (r) => dateLabel(r.dueAt) },
    {
      key: 'amount',
      label: 'Amount',
      align: 'right',
      render: (r) => money(r.amount),
      total: (r) => r.amount,
      totalRender: (sum) => money(sum),
    },
    {
      key: 'balance',
      label: 'Balance',
      align: 'right',
      sortValue: (r) => (r.amount ?? 0) - (r.paidAmount ?? 0),
      render: (r) => money((r.amount ?? 0) - (r.paidAmount ?? 0)),
      total: (r) => (r.amount ?? 0) - (r.paidAmount ?? 0),
      totalRender: (sum) => money(sum),
    },
    statusColumn(),
  ],

  documents: [
    idColumn('documents', 'File', 'fileName'),
    { key: 'type', label: 'Type' },
    {
      key: 'shipmentId',
      label: 'Consignment',
      render: (r) => <RecordLink entity="shipments" id={r.shipmentId} />,
    },
    { key: 'uploadedAt', label: 'Filed', render: (r) => timeLabel(r.uploadedAt) },
    {
      key: 'confidence',
      label: 'Confidence',
      align: 'right',
      render: (r) => (r.confidence != null ? `${Math.round(r.confidence * 100)}%` : null),
    },
    statusColumn(),
  ],

  vehicles: [
    idColumn('vehicles', 'Vehicle', 'reg'),
    {
      key: 'model',
      label: 'Model',
      maxWidth: '12rem',
      sortValue: (r) => `${r.make} ${r.model}`,
      render: (r) => <span className="text-xs text-silver-500">{r.make} {r.model}</span>,
    },
    { key: 'type', label: 'Type' },
    { key: 'odometer', label: 'Odometer', align: 'right', render: (r) => `${num(r.odometer)} km` },
    {
      key: 'driverId',
      label: 'Driver',
      sortValue: (r) => driverName(r.driverId),
      render: (r) => <RecordLink entity="drivers" id={r.driverId} />,
    },
    { key: 'entity', label: 'Entity' },
    statusColumn(),
  ],

  drivers: [
    idColumn('drivers', 'Driver', 'name'),
    { key: 'licence', label: 'Licence', mono: true },
    { key: 'expiry', label: 'Expires', render: (r) => dateLabel(r.expiry) },
    {
      key: 'vehicleId',
      label: 'Vehicle',
      sortValue: (r) => vehicleReg(r.vehicleId),
      render: (r) => <RecordLink entity="vehicles" id={r.vehicleId} />,
    },
    { key: 'entity', label: 'Entity' },
    { key: 'score', label: 'Behaviour', align: 'right' },
  ],

  suppliers: [
    idColumn('suppliers', 'Contractor', 'name'),
    { key: 'type', label: 'Type', maxWidth: '12rem' },
    { key: 'entity', label: 'Entity' },
    { key: 'bcNo', label: 'BC vendor', mono: true },
    { key: 'rating', label: 'Rating', align: 'right', render: (r) => num(r.rating, 1) },
  ],

  jobs: [
    idColumn('jobs', 'Work order'),
    {
      key: 'supplierId',
      label: 'Contractor',
      maxWidth: '14rem',
      sortValue: (r) => supplierName(r.supplierId),
      render: (r) => <RecordLink entity="suppliers" id={r.supplierId} />,
    },
    {
      key: 'shipmentId',
      label: 'Consignment',
      render: (r) => <RecordLink entity="shipments" id={r.shipmentId} />,
    },
    { key: 'description', label: 'Scope', maxWidth: '20rem' },
    { key: 'dueAt', label: 'Due', render: (r) => dateLabel(r.dueAt) },
    {
      key: 'value',
      label: 'Value',
      align: 'right',
      render: (r) => money(r.value, r.currency),
      total: (r) => r.value,
      totalRender: (sum) => money(sum),
    },
    statusColumn(),
  ],

  jobCards: [
    idColumn('jobCards', 'Job card'),
    {
      key: 'vehicleId',
      label: 'Vehicle',
      sortValue: (r) => vehicleReg(r.vehicleId),
      render: (r) => <RecordLink entity="vehicles" id={r.vehicleId} />,
    },
    { key: 'priority', label: 'Priority', render: (r) => <Badge tone={r.priority === 'Critical' || r.priority === 'High' ? 'critical' : r.priority === 'Medium' ? 'warning' : 'neutral'}>{r.priority}</Badge> },
    { key: 'fault', label: 'Fault', maxWidth: '22rem' },
    { key: 'raisedAt', label: 'Raised', render: (r) => timeLabel(r.raisedAt) },
    statusColumn(),
  ],

  supplierInvoices: [
    idColumn('supplierInvoices', 'Invoice', 'invoiceNumber'),
    {
      key: 'supplierId',
      label: 'Contractor',
      maxWidth: '14rem',
      sortValue: (r) => supplierName(r.supplierId),
      render: (r) => <RecordLink entity="suppliers" id={r.supplierId} />,
    },
    { key: 'jobId', label: 'Work order', render: (r) => <RecordLink entity="jobs" id={r.jobId} /> },
    { key: 'submittedAt', label: 'Submitted', render: (r) => dateLabel(r.submittedAt) },
    {
      key: 'amount',
      label: 'Amount',
      align: 'right',
      render: (r) => money(r.amount, r.currency),
      total: (r) => r.amount,
      totalRender: (sum) => money(sum),
    },
    statusColumn(),
  ],

  bookings: [
    idColumn('bookings', 'Booking'),
    { key: 'reference', label: 'Your reference' },
    { key: 'commodity', label: 'Commodity', render: (r) => commodityName(r.commodity) },
    { key: 'weightTons', label: 'Tonnes', align: 'right', total: (r) => r.weightTons },
    { key: 'modeCode', label: 'Mode', render: (r) => modeName(r.modeCode) },
    { key: 'readyDate', label: 'Ready', render: (r) => dateLabel(r.readyDate) },
    {
      key: 'shipmentId',
      label: 'Consignment',
      render: (r) => <RecordLink entity="shipments" id={r.shipmentId} />,
    },
    statusColumn(),
  ],

  rateRequests: [
    idColumn('rateRequests', 'Request'),
    { key: 'lane', label: 'Lane', maxWidth: '18rem' },
    { key: 'weightTons', label: 'Tonnes', align: 'right' },
    { key: 'neededBy', label: 'Needed by', render: (r) => dateLabel(r.neededBy) },
    {
      key: 'responses',
      label: 'Responses',
      align: 'right',
      sortValue: (r) => (r.responses || []).length,
      render: (r) => `${(r.responses || []).length} of ${(r.invited || []).length}`,
    },
    statusColumn(),
  ],

  users: [
    idColumn('users', 'User', 'name'),
    { key: 'email', label: 'Email', maxWidth: '14rem' },
    { key: 'role', label: 'Role', render: (r) => ROLE_LABELS[r.role] || r.role },
    { key: 'entity', label: 'Entity' },
    { key: 'lastSignInAt', label: 'Last sign-in', render: (r) => timeLabel(r.lastSignInAt) },
  ],

  incidents: [
    idColumn('incidents', 'Incident'),
    { key: 'type', label: 'Type' },
    {
      key: 'severity',
      label: 'Severity',
      render: (r) => <Badge tone={r.severity === 'High' || r.severity === 'Critical' ? 'critical' : 'warning'}>{r.severity}</Badge>,
    },
    { key: 'location', label: 'Location', maxWidth: '14rem' },
    {
      key: 'vehicleId',
      label: 'Vehicle',
      sortValue: (r) => vehicleReg(r.vehicleId),
      render: (r) => <RecordLink entity="vehicles" id={r.vehicleId} />,
    },
    { key: 'reportedAt', label: 'Reported', render: (r) => timeLabel(r.reportedAt) },
    statusColumn(),
  ],

  fuelLogs: [
    idColumn('fuelLogs', 'Log'),
    {
      key: 'vehicleId',
      label: 'Vehicle',
      sortValue: (r) => vehicleReg(r.vehicleId),
      render: (r) => <RecordLink entity="vehicles" id={r.vehicleId} />,
    },
    { key: 'station', label: 'Station', maxWidth: '12rem' },
    { key: 'litres', label: 'Litres', align: 'right', total: (r) => r.litres },
    {
      key: 'cost',
      label: 'Cost',
      align: 'right',
      render: (r) => money(r.cost),
      total: (r) => r.cost,
      totalRender: (sum) => money(sum),
    },
    { key: 'odometer', label: 'Odometer', align: 'right', render: (r) => num(r.odometer) },
    { key: 'loggedAt', label: 'Logged', render: (r) => timeLabel(r.loggedAt) },
  ],

  inspections: [
    idColumn('inspections', 'Inspection'),
    {
      key: 'vehicleId',
      label: 'Vehicle',
      sortValue: (r) => vehicleReg(r.vehicleId),
      render: (r) => <RecordLink entity="vehicles" id={r.vehicleId} />,
    },
    {
      key: 'driverId',
      label: 'Driver',
      sortValue: (r) => driverName(r.driverId),
      render: (r) => <RecordLink entity="drivers" id={r.driverId} />,
    },
    { key: 'odometer', label: 'Odometer', align: 'right', render: (r) => num(r.odometer) },
    {
      key: 'result',
      label: 'Result',
      sortValue: (r) => Object.values(r.checks || {}).filter((v) => v === 'fail').length,
      render: (r) => {
        const fails = Object.values(r.checks || {}).filter((v) => v === 'fail').length;
        const advs = Object.values(r.checks || {}).filter((v) => v === 'advisory').length;
        return <Badge tone={fails ? 'critical' : advs ? 'warning' : 'good'}>
          {fails ? `${fails} failed` : advs ? `${advs} advisory` : 'All pass'}
        </Badge>;
      },
    },
    { key: 'inspectedAt', label: 'Inspected', render: (r) => timeLabel(r.inspectedAt) },
  ],

  serviceRecords: [
    idColumn('serviceRecords', 'Record'),
    {
      key: 'vehicleId',
      label: 'Vehicle',
      sortValue: (r) => vehicleReg(r.vehicleId),
      render: (r) => <RecordLink entity="vehicles" id={r.vehicleId} />,
    },
    { key: 'type', label: 'Type' },
    { key: 'odometer', label: 'Odometer', align: 'right', render: (r) => num(r.odometer) },
    { key: 'performedAt', label: 'Date', render: (r) => dateLabel(r.performedAt) },
    {
      key: 'cost',
      label: 'Cost',
      align: 'right',
      render: (r) => money(r.cost),
      total: (r) => r.cost,
      totalRender: (sum) => money(sum),
    },
  ],

  pods: [
    idColumn('pods', 'POD'),
    {
      key: 'shipmentId',
      label: 'Consignment',
      render: (r) => <RecordLink entity="shipments" id={r.shipmentId} />,
    },
    { key: 'receivedBy', label: 'Received by', maxWidth: '12rem' },
    {
      key: 'driverId',
      label: 'Driver',
      sortValue: (r) => driverName(r.driverId),
      render: (r) => <RecordLink entity="drivers" id={r.driverId} />,
    },
    { key: 'capturedAt', label: 'Captured', render: (r) => timeLabel(r.capturedAt) },
  ],

  shipmentEvents: [
    { key: 'at', label: 'When', render: (r) => timeLabel(r.at), width: '9rem' },
    {
      key: 'shipmentId',
      label: 'Consignment',
      render: (r) => <RecordLink entity="shipments" id={r.shipmentId} />,
    },
    { key: 'type', label: 'Type' },
    {
      key: 'label',
      label: 'Event',
      maxWidth: '24rem',
      render: (r) => <RecordLink entity="shipmentEvents" id={r.id}>{r.label}</RecordLink>,
    },
    { key: 'locationText', label: 'Location' },
    { key: 'confidence', label: 'Confidence', align: 'right', render: (r) => `${num(r.confidence)}%` },
  ],

  auditLog: [
    { key: 'at', label: 'When', render: (r) => timeLabel(r.at), width: '9rem' },
    {
      key: 'userName',
      label: 'User',
      maxWidth: '10rem',
      render: (r) => <RecordLink entity="users" id={r.userId}>{r.userName}</RecordLink>,
    },
    { key: 'action', label: 'Action', render: (r) => <code className="text-[11px] text-silver-500">{r.action}</code> },
    { key: 'summary', label: 'Detail', maxWidth: '26rem' },
  ],
};

export { idColumn, statusColumn };
