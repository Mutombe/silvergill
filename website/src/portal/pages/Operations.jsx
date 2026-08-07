import React, { useMemo, useState } from 'react';
import * as Icons from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '../auth/AuthContext';
import { useCollection, useOnlineStatus } from '../hooks';
import * as db from '../data/db';
import { enqueue, BC_ENDPOINTS } from '../data/bcClient';
// Aliased: several handlers below already use `record` for the row they just
// inserted, so the audit helper takes an unambiguous name.
import { record as audit, notify } from '../data/activity';

import {
  Badge, Button, Card, DataTable, EmptyState, Field, Input, Select, StatCard, TextArea,
  SectionHeading, Tabs, statusTone, timeLabel, dateLabel, num,
} from '../components/ui';
import SignaturePad from '../components/SignaturePad';
import PhotoCapture from '../components/PhotoCapture';
import QRScanner from '../components/QRScanner';
import ModuleHeader from '../components/ModuleHeader';

/* ===========================================================================
   Module 4 — Operations Mobile App
   Built mobile-first: single column, large tap targets, and every capture is
   written to the device first and queued for Business Central second. Nothing
   here requires a connection.
   =========================================================================== */

const INSPECTION_CHECKS = [
  { key: 'tyres', label: 'Tyres & wheels' },
  { key: 'brakes', label: 'Brakes & air system' },
  { key: 'lights', label: 'Lights & indicators' },
  { key: 'fluids', label: 'Oil, coolant & fluids' },
  { key: 'coupling', label: 'Fifth wheel / coupling' },
  { key: 'bodywork', label: 'Bodywork & mirrors' },
  { key: 'loadSecuring', label: 'Load securing & straps' },
  { key: 'documents', label: 'Documents & permits' },
];

const INCIDENT_TYPES = ['Delay', 'Breakdown', 'Accident', 'Damage to Cargo', 'Theft / Pilferage', 'Documentation Issue', 'Other'];
const SEVERITIES = ['Low', 'Medium', 'High', 'Critical'];

const Operations = () => {
  const { user } = useAuth();
  const online = useOnlineStatus();

  const shipments = useCollection('shipments');
  const customers = useCollection('customers');
  const vehicles = useCollection('vehicles');
  const drivers = useCollection('drivers');
  const pods = useCollection('pods');
  const incidents = useCollection('incidents');
  const fuelLogs = useCollection('fuelLogs');
  const inspections = useCollection('inspections');
  const queue = useCollection('syncQueue');

  const [tab, setTab] = useState('run');

  // A driver only sees their own vehicle and their own captures.
  const myDriver = useMemo(
    () => drivers.find((d) => d.name === user?.name) || null,
    [drivers, user]
  );
  const scopedShipments = useMemo(
    () => (myDriver ? shipments.filter((s) => s.driverId === myDriver.id) : shipments),
    [shipments, myDriver]
  );

  const pendingQueue = queue.filter((q) => q.status !== 'posted');

  const tabs = [
    { key: 'run', label: 'Run sheet', count: scopedShipments.filter((s) => s.status !== 'Delivered').length },
    { key: 'pod', label: 'Proof of Delivery', count: pods.length },
    { key: 'incident', label: 'Incident', count: incidents.filter((i) => i.status === 'Open').length },
    { key: 'fuel', label: 'Fuel', count: fuelLogs.length },
    { key: 'inspection', label: 'Inspection', count: inspections.length },
    { key: 'queue', label: 'Sync queue', count: pendingQueue.length },
  ];

  return (
    <div className="max-w-5xl space-y-6">
      <ModuleHeader
        number={4}
        title="Operations Mobile App"
        blurb="Capture proof of delivery, report incidents, log fuel and run vehicle inspections — on the road, with or without signal."
        online={online}
        pending={pendingQueue.length}
      />

      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      {tab === 'run' && (
        <RunSheet
          shipments={scopedShipments}
          customers={customers}
          vehicles={vehicles}
          onCapture={() => setTab('pod')}
        />
      )}
      {tab === 'pod' && (
        <PodCapture
          shipments={scopedShipments}
          pods={pods}
          driverId={myDriver?.id}
          drivers={drivers}
          user={user}
        />
      )}
      {tab === 'incident' && (
        <IncidentReport
          shipments={scopedShipments}
          vehicles={vehicles}
          incidents={incidents}
          driverId={myDriver?.id}
        />
      )}
      {tab === 'fuel' && (
        <FuelLog vehicles={vehicles} fuelLogs={fuelLogs} driverId={myDriver?.id} defaultVehicle={myDriver?.vehicleId} />
      )}
      {tab === 'inspection' && (
        <VehicleInspection
          vehicles={vehicles}
          inspections={inspections}
          driverId={myDriver?.id}
          defaultVehicle={myDriver?.vehicleId}
          user={user}
        />
      )}
      {tab === 'queue' && <SyncQueue queue={queue} />}
    </div>
  );
};

/* ===========================================================================
   Run sheet — what this driver is carrying today, in delivery order.
   Ordered by ETA so the top card is always the next drop.
   =========================================================================== */

const RunSheet = ({ shipments, customers, vehicles, onCapture }) => {
  const open = shipments
    .filter((s) => s.status !== 'Delivered')
    .sort((a, b) => new Date(a.etaAt || 0) - new Date(b.etaAt || 0));

  const done = shipments.filter((s) => s.status === 'Delivered');
  const customerName = (id) => customers.find((c) => c.id === id)?.name || '—';
  const reg = (id) => vehicles.find((v) => v.id === id)?.reg;

  if (!open.length) {
    return (
      <Card>
        <EmptyState
          icon={Icons.PackageCheck}
          title="Nothing outstanding"
          description={
            done.length
              ? `All ${done.length} consignment${done.length === 1 ? '' : 's'} on your sheet have been delivered.`
              : 'No consignments are assigned to you.'
          }
        />
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Drops outstanding" value={open.length} icon={Icons.MapPin} />
        <StatCard label="Delivered" value={done.length} icon={Icons.PackageCheck} tone="good" />
        <StatCard
          label="Tonnes on board"
          value={num(open.reduce((sum, s) => sum + s.weightTons, 0))}
          icon={Icons.Weight}
        />
        <StatCard
          label="Next ETA"
          value={open[0] ? dateLabel(open[0].etaAt) : '—'}
          icon={Icons.Clock}
          deltaLabel={open[0]?.destination}
        />
      </div>

      <div className="space-y-4">
        {open.map((shipment, index) => (
          <Card key={shipment.id} className={index === 0 ? 'border-primary-300 ring-1 ring-primary-200' : ''}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex gap-4 min-w-0">
                <span
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold ${
                    index === 0 ? 'bg-primary-600 text-white' : 'bg-silver-100 text-silver-500'
                  }`}
                >
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="font-display font-bold text-silver-900 tabular-nums">{shipment.id}</p>
                    <Badge tone={statusTone(shipment.status)}>{shipment.status}</Badge>
                    {index === 0 && <Badge tone="info">Next drop</Badge>}
                  </div>
                  <p className="text-sm text-silver-600">{customerName(shipment.customerId)}</p>
                  <p className="text-sm text-silver-500 mt-1.5">
                    {shipment.origin}
                    <Icons.ArrowRight size={12} className="inline mx-1.5 text-silver-300" />
                    <span className="text-silver-800 font-medium">{shipment.destination}</span>
                  </p>
                  <p className="text-xs text-silver-400 mt-1.5 tabular-nums">
                    {shipment.weightTons}t
                    {reg(shipment.vehicleId) ? ` · ${reg(shipment.vehicleId)}` : ''} · ETA{' '}
                    {dateLabel(shipment.etaAt)}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button size="sm" icon={Icons.PenLine} onClick={onCapture}>
                  Capture POD
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

/* ===========================================================================
   Proof of delivery
   =========================================================================== */

const PodCapture = ({ shipments, pods, driverId, drivers, user }) => {
  const [shipmentId, setShipmentId] = useState('');
  const [receivedBy, setReceivedBy] = useState('');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState([]);
  const [signature, setSignature] = useState(null);
  const [coords, setCoords] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);

  const deliverable = shipments.filter((s) => s.status !== 'Delivered');
  const driverName = (id) => drivers.find((d) => d.id === id)?.name || '—';

  const grabLocation = () => {
    if (!navigator.geolocation) {
      toast.error('This device has no location service.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
        toast.success('Location tagged');
      },
      () => toast.error('Could not read location', { description: 'Delivery can still be captured without it.' }),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleScan = (code) => {
    const match = shipments.find((s) => s.id.toUpperCase() === code.toUpperCase());
    if (match) {
      setShipmentId(match.id);
      setScanning(false);
      toast.success(`Matched ${match.id}`, { description: match.destination });
    } else {
      toast.error(`No shipment matches ${code}`, { description: 'Check the label or pick from the list.' });
    }
  };

  const reset = () => {
    setShipmentId('');
    setReceivedBy('');
    setNotes('');
    setPhotos([]);
    setSignature(null);
    setCoords(null);
  };

  const submit = (event) => {
    event.preventDefault();
    if (!signature) {
      toast.error('A signature is required', { description: 'Ask the consignee to sign before you submit.' });
      return;
    }
    setSaving(true);

    const record = db.insert('pods', {
      shipmentId,
      driverId,
      receivedBy,
      notes,
      photos,
      signature,
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
      capturedAt: new Date().toISOString(),
      synced: false,
    });

    // Mark the shipment delivered locally so the driver sees it move immediately.
    db.update('shipments', shipmentId, { status: 'Delivered' });

    enqueue({
      entity: 'pod',
      endpoint: BC_ENDPOINTS.pod,
      recordId: record.id,
      label: `POD ${shipmentId}`,
      payload: {
        shipmentNo: shipmentId,
        receivedBy,
        signatureBase64: signature?.slice(0, 40) + '…',
        attachments: photos.length,
        capturedAt: record.capturedAt,
      },
    });

    audit(user, 'pod.capture', shipmentId, `Proof of delivery captured for ${shipmentId}, signed by ${receivedBy}`);

    // Tell the customer their freight has landed — this is what makes the
    // client portal feel live rather than a static report.
    const shipment = db.find('shipments', shipmentId);
    if (shipment) {
      db.read('users')
        .filter((u) => u.role === 'client' && u.customerId === shipment.customerId)
        .forEach((clientUser) =>
          notify({
            forUserId: clientUser.id,
            severity: 'info',
            title: `${shipmentId} delivered`,
            body: `Signed for by ${receivedBy} at ${shipment.destination}. Proof of delivery is in your portal.`,
            link: '/portal/my/documents',
          })
        );
    }

    setSaving(false);
    reset();
    toast.success('Proof of delivery captured', {
      description: 'Queued for Business Central. The customer has been notified.',
    });
  };

  return (
    <div className="grid lg:grid-cols-5 gap-6">
      <Card className="lg:col-span-3">
        <SectionHeading
          title="Capture a delivery"
          description="Scan the label, collect a signature, attach photos."
        />

        <form onSubmit={submit} className="space-y-5">
          <Field label="Shipment" required hint="Scan the label or choose from your run sheet.">
            <div className="flex gap-2">
              <Select value={shipmentId} onChange={(e) => setShipmentId(e.target.value)} required>
                <option value="">Select a shipment…</option>
                {deliverable.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.id} — {s.destination}
                  </option>
                ))}
              </Select>
              <Button
                type="button"
                variant={scanning ? 'dark' : 'secondary'}
                icon={Icons.QrCode}
                onClick={() => setScanning((v) => !v)}
              >
                Scan
              </Button>
            </div>
          </Field>

          {scanning && (
            <div className="p-4 rounded-2xl bg-silver-50 border border-silver-200">
              <QRScanner onScan={handleScan} />
            </div>
          )}

          <Field label="Received by" required hint="Full name of the person accepting the cargo.">
            <Input
              value={receivedBy}
              onChange={(e) => setReceivedBy(e.target.value)}
              placeholder="e.g. M. Chizema"
              required
            />
          </Field>

          <Field label="Consignee signature" required>
            <SignaturePad onChange={setSignature} />
          </Field>

          <Field label="Photos" hint="Seal, cargo condition, delivery note.">
            <PhotoCapture photos={photos} onChange={setPhotos} />
          </Field>

          <Field label="Notes">
            <TextArea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Discrepancies, damage, seal numbers…"
            />
          </Field>

          <div className="flex items-center justify-between gap-3 flex-wrap p-3.5 rounded-xl bg-silver-50 border border-silver-200">
            <div className="flex items-center gap-2.5 text-sm text-silver-600">
              <Icons.MapPin size={16} className="text-silver-400" />
              {coords ? (
                <span className="tabular-nums">
                  {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
                  <span className="text-silver-400 ml-1.5">±{Math.round(coords.accuracy)}m</span>
                </span>
              ) : (
                'No location tagged'
              )}
            </div>
            <Button type="button" size="sm" variant="secondary" onClick={grabLocation}>
              {coords ? 'Re-tag' : 'Tag location'}
            </Button>
          </div>

          <div className="flex gap-3">
            <Button type="submit" size="lg" className="flex-1" disabled={saving || !shipmentId}>
              {saving ? 'Saving…' : 'Submit proof of delivery'}
            </Button>
            <Button type="button" size="lg" variant="secondary" onClick={reset}>
              Clear
            </Button>
          </div>
        </form>
      </Card>

      <Card className="lg:col-span-2" padded={false}>
        <div className="table-card-head">
          <SectionHeading title="Recent deliveries" description="Captured on this device." />
        </div>
        {pods.length === 0 ? (
          <EmptyState title="No deliveries captured yet" icon={Icons.PackageCheck} />
        ) : (
          <div className="divide-y divide-silver-100">
            {pods.map((pod) => (
              <div key={pod.id} className="px-5 md:px-6 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-silver-900 tabular-nums">{pod.shipmentId}</p>
                    <p className="text-sm text-silver-500 mt-0.5">
                      Signed by {pod.receivedBy} · {driverName(pod.driverId)}
                    </p>
                    <p className="text-xs text-silver-400 mt-1">{timeLabel(pod.capturedAt)}</p>
                    {pod.notes && (
                      <p className="text-xs text-silver-500 mt-2 italic line-clamp-2">“{pod.notes}”</p>
                    )}
                  </div>
                  <Badge tone={pod.synced ? 'good' : 'warning'} icon={pod.synced ? Icons.Check : Icons.Clock}>
                    {pod.synced ? 'Posted' : 'Queued'}
                  </Badge>
                </div>
                {(pod.signature || pod.photos?.length > 0) && (
                  <div className="flex items-center gap-2 mt-3">
                    {pod.signature && (
                      <img
                        src={pod.signature}
                        alt="Signature"
                        className="h-10 w-24 object-contain bg-silver-50 rounded-lg border border-silver-200"
                      />
                    )}
                    {pod.photos?.slice(0, 3).map((photo, i) => (
                      <img
                        key={i}
                        src={photo.dataUrl}
                        alt=""
                        className="h-10 w-10 object-cover rounded-lg border border-silver-200"
                      />
                    ))}
                    {pod.photos?.length > 3 && (
                      <span className="text-xs text-silver-400">+{pod.photos.length - 3}</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

/* ===========================================================================
   Incident reporting
   =========================================================================== */

const IncidentReport = ({ shipments, vehicles, incidents, driverId }) => {
  const [form, setForm] = useState({
    type: 'Delay',
    severity: 'Medium',
    shipmentId: '',
    vehicleId: '',
    location: '',
    description: '',
  });
  const [photos, setPhotos] = useState([]);

  const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }));

  const submit = (event) => {
    event.preventDefault();
    const record = db.insert('incidents', {
      ...form,
      shipmentId: form.shipmentId || null,
      vehicleId: form.vehicleId || null,
      driverId,
      photos,
      reportedAt: new Date().toISOString(),
      status: 'Open',
      synced: false,
    });

    enqueue({
      entity: 'incident',
      endpoint: BC_ENDPOINTS.incident,
      recordId: record.id,
      label: `${form.type} — ${form.location || 'no location'}`,
      payload: { ...form, attachments: photos.length },
    });

    setForm({ type: 'Delay', severity: 'Medium', shipmentId: '', vehicleId: '', location: '', description: '' });
    setPhotos([]);
    toast.success('Incident reported', { description: 'Operations has been notified and it is queued for BC.' });
  };

  const severityTone = { Low: 'neutral', Medium: 'warning', High: 'critical', Critical: 'critical' };

  return (
    <div className="grid lg:grid-cols-5 gap-6">
      <Card className="lg:col-span-3">
        <SectionHeading title="Report an incident" description="Delays, breakdowns, damage or theft." />

        <form onSubmit={submit} className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Type" required>
              <Select value={form.type} onChange={set('type')}>
                {INCIDENT_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </Select>
            </Field>
            <Field label="Severity" required>
              <Select value={form.severity} onChange={set('severity')}>
                {SEVERITIES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Shipment" hint="Leave blank if not cargo related.">
              <Select value={form.shipmentId} onChange={set('shipmentId')}>
                <option value="">None</option>
                {shipments.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.id}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Vehicle">
              <Select value={form.vehicleId} onChange={set('vehicleId')}>
                <option value="">None</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.reg} — {v.make} {v.model}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Location" required>
            <Input
              value={form.location}
              onChange={set('location')}
              placeholder="e.g. Beitbridge Border Post, bay 4"
              required
            />
          </Field>

          <Field label="What happened" required>
            <TextArea
              rows={4}
              value={form.description}
              onChange={set('description')}
              placeholder="Be specific — time, cause, who was informed, what is needed."
              required
            />
          </Field>

          <Field label="Photos" hint="Damage, queue, paperwork.">
            <PhotoCapture photos={photos} onChange={setPhotos} label="Add" />
          </Field>

          <Button type="submit" size="lg" className="w-full" icon={Icons.Send}>
            Report incident
          </Button>
        </form>
      </Card>

      <Card className="lg:col-span-2" padded={false}>
        <div className="table-card-head">
          <SectionHeading title="Recent incidents" />
        </div>
        {incidents.length === 0 ? (
          <EmptyState title="No incidents reported" icon={Icons.ShieldCheck} />
        ) : (
          <div className="divide-y divide-silver-100">
            {incidents.map((incident) => (
              <div key={incident.id} className="px-5 md:px-6 py-4">
                <div className="flex items-start justify-between gap-3 mb-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge tone={severityTone[incident.severity]}>{incident.severity}</Badge>
                    <span className="text-sm font-medium text-silver-800">{incident.type}</span>
                  </div>
                  <Badge tone={statusTone(incident.status)}>{incident.status}</Badge>
                </div>
                <p className="text-sm text-silver-600">{incident.description}</p>
                <p className="text-xs text-silver-400 mt-1.5">
                  {incident.location} · {timeLabel(incident.reportedAt)}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

/* ===========================================================================
   Fuel logging
   =========================================================================== */

const FuelLog = ({ vehicles, fuelLogs, driverId, defaultVehicle }) => {
  const [vehicleId, setVehicleId] = useState(defaultVehicle || '');
  const [litres, setLitres] = useState('');
  const [cost, setCost] = useState('');
  const [odometer, setOdometer] = useState('');
  const [station, setStation] = useState('');

  const vehicle = vehicles.find((v) => v.id === vehicleId);
  const perLitre = litres && cost ? Number(cost) / Number(litres) : null;

  // Consumption against the last fill on this vehicle — the number that
  // actually tells a driver whether something is wrong.
  const lastFill = fuelLogs
    .filter((f) => f.vehicleId === vehicleId)
    .sort((a, b) => new Date(b.loggedAt) - new Date(a.loggedAt))[0];
  const distance = lastFill && odometer ? Number(odometer) - lastFill.odometer : null;
  const consumption = distance > 0 && litres ? (Number(litres) / distance) * 100 : null;

  const submit = (event) => {
    event.preventDefault();
    if (vehicle && Number(odometer) < vehicle.odometer) {
      toast.error('Odometer is lower than the last recorded reading', {
        description: `${vehicle.reg} last read ${num(vehicle.odometer)} km.`,
      });
      return;
    }

    const record = db.insert('fuelLogs', {
      vehicleId,
      driverId,
      litres: Number(litres),
      cost: Number(cost),
      odometer: Number(odometer),
      station,
      loggedAt: new Date().toISOString(),
      synced: false,
    });

    db.update('vehicles', vehicleId, { odometer: Number(odometer) });

    enqueue({
      entity: 'fuelLog',
      endpoint: BC_ENDPOINTS.fuelLog,
      recordId: record.id,
      label: `Fuel ${vehicle?.reg} — ${litres}L`,
      payload: { vehicle: vehicle?.reg, litres: Number(litres), amount: Number(cost), odometer: Number(odometer) },
    });

    setLitres('');
    setCost('');
    setOdometer('');
    setStation('');
    toast.success('Fuel logged', { description: 'Queued as an item journal line for Business Central.' });
  };

  return (
    <div className="grid lg:grid-cols-5 gap-6">
      <Card className="lg:col-span-3">
        <SectionHeading title="Log a fill" description="Litres, cost and odometer at the pump." />

        <form onSubmit={submit} className="space-y-5">
          <Field label="Vehicle" required>
            <Select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} required>
              <option value="">Select a vehicle…</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.reg} — {v.make} {v.model}
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="Litres" required>
              <Input
                type="number"
                step="0.1"
                min="1"
                value={litres}
                onChange={(e) => setLitres(e.target.value)}
                placeholder="480"
                required
              />
            </Field>
            <Field label="Total cost (USD)" required>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="686.40"
                required
              />
            </Field>
            <Field
              label="Odometer (km)"
              required
              hint={vehicle ? `Last: ${num(vehicle.odometer)}` : undefined}
            >
              <Input
                type="number"
                min="0"
                value={odometer}
                onChange={(e) => setOdometer(e.target.value)}
                placeholder={vehicle ? String(vehicle.odometer) : '412300'}
                required
              />
            </Field>
          </div>

          <Field label="Station" required>
            <Input
              value={station}
              onChange={(e) => setStation(e.target.value)}
              placeholder="e.g. Puma Chegutu"
              required
            />
          </Field>

          {(perLitre || consumption) && (
            <div className="grid sm:grid-cols-3 gap-3 p-4 rounded-xl bg-primary-50/60 border border-primary-200">
              {perLitre && (
                <div>
                  <p className="text-xs text-silver-500 uppercase tracking-wider">Price / litre</p>
                  <p className="text-lg font-display font-bold text-silver-900 tabular-nums">
                    ${perLitre.toFixed(2)}
                  </p>
                </div>
              )}
              {distance > 0 && (
                <div>
                  <p className="text-xs text-silver-500 uppercase tracking-wider">Distance</p>
                  <p className="text-lg font-display font-bold text-silver-900 tabular-nums">
                    {num(distance)} km
                  </p>
                </div>
              )}
              {consumption && (
                <div>
                  <p className="text-xs text-silver-500 uppercase tracking-wider">Consumption</p>
                  <p
                    className={`text-lg font-display font-bold tabular-nums ${
                      consumption > 45 ? 'text-[#d03b3b]' : 'text-silver-900'
                    }`}
                  >
                    {consumption.toFixed(1)} L/100km
                  </p>
                </div>
              )}
            </div>
          )}

          <Button type="submit" size="lg" className="w-full" icon={Icons.Fuel}>
            Log fuel
          </Button>
        </form>
      </Card>

      <Card className="lg:col-span-2" padded={false}>
        <div className="table-card-head">
          <SectionHeading title="Recent fills" />
        </div>
        <DataTable
          dense
          columns={[
            {
              key: 'vehicle',
              label: 'Vehicle',
              render: (r) => vehicles.find((v) => v.id === r.vehicleId)?.reg || '—',
            },
            { key: 'litres', label: 'Litres', align: 'right', render: (r) => num(r.litres, 1) },
            { key: 'cost', label: 'Cost', align: 'right', render: (r) => `$${num(r.cost, 2)}` },
            {
              key: 'synced',
              label: '',
              render: (r) => (
                <Badge tone={r.synced ? 'good' : 'warning'}>{r.synced ? 'Posted' : 'Queued'}</Badge>
              ),
            },
          ]}
          rows={fuelLogs}
          empty="No fills logged."
        />
      </Card>
    </div>
  );
};

/* ===========================================================================
   Vehicle inspection
   =========================================================================== */

const VehicleInspection = ({ vehicles, inspections, driverId, defaultVehicle, user }) => {
  const blank = Object.fromEntries(INSPECTION_CHECKS.map((c) => [c.key, 'pass']));
  const [vehicleId, setVehicleId] = useState(defaultVehicle || '');
  const [odometer, setOdometer] = useState('');
  const [checks, setChecks] = useState(blank);
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState([]);

  const failures = Object.values(checks).filter((v) => v === 'fail').length;
  const advisories = Object.values(checks).filter((v) => v === 'advisory').length;
  const vehicle = vehicles.find((v) => v.id === vehicleId);

  const submit = (event) => {
    event.preventDefault();
    const record = db.insert('inspections', {
      vehicleId,
      driverId,
      odometer: Number(odometer),
      checks,
      notes,
      photos,
      inspectedAt: new Date().toISOString(),
      synced: false,
    });

    // A failed item grounds the vehicle and raises a workshop job card. This
    // is the whole point of a daily check — the failure has to go somewhere.
    if (failures > 0) {
      db.update('vehicles', vehicleId, { status: 'Workshop' });

      const failed = INSPECTION_CHECKS.filter((c) => checks[c.key] === 'fail').map((c) => c.label);
      const card = db.insert('jobCards', {
        vehicleId,
        status: 'Open',
        priority: failed.some((f) => /brake|tyre/i.test(f)) ? 'Critical' : 'High',
        raisedAt: new Date().toISOString(),
        raisedBy: user?.id,
        fault: `Daily check failed: ${failed.join(', ')}.${notes ? ` ${notes}` : ''}`,
        odometer: Number(odometer),
        parts: [],
        labourHours: 2,
        labourRate: 45,
        completedAt: null,
        fromInspection: record.id,
      });

      audit(user,'inspection.fail', vehicleId, `${vehicle?.reg} grounded — ${failures} failed item(s), job card ${card.id} raised`);
      notify({
        forRoles: ['ops', 'management'],
        severity: 'critical',
        title: `${vehicle?.reg} grounded`,
        body: `${failed.join(', ')}. Job card ${card.id} is open.`,
        link: '/portal/fleet',
      });

      toast.warning(`${vehicle?.reg} grounded`, {
        description: `${failures} failed item${failures === 1 ? '' : 's'} — job card ${card.id} raised.`,
      });
    } else {
      audit(user,'inspection.pass', vehicleId, `${vehicle?.reg} passed its daily check`);
      toast.success('Inspection recorded', { description: 'Vehicle cleared for the road.' });
    }

    enqueue({
      entity: 'inspection',
      endpoint: BC_ENDPOINTS.inspection,
      recordId: record.id,
      label: `Inspection ${vehicle?.reg}`,
      payload: { vehicle: vehicle?.reg, odometer: Number(odometer), failures, advisories, checks },
    });

    setChecks(blank);
    setNotes('');
    setPhotos([]);
    setOdometer('');
  };

  const OPTIONS = [
    { value: 'pass', label: 'Pass', active: 'bg-emerald-600 text-white border-emerald-600' },
    { value: 'advisory', label: 'Advisory', active: 'bg-amber-500 text-white border-amber-500' },
    { value: 'fail', label: 'Fail', active: 'bg-red-600 text-white border-red-600' },
  ];

  return (
    <div className="grid lg:grid-cols-5 gap-6">
      <Card className="lg:col-span-3">
        <SectionHeading
          title="Daily vehicle check"
          description="Any failed item grounds the vehicle automatically."
        />

        <form onSubmit={submit} className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Vehicle" required>
              <Select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} required>
                <option value="">Select a vehicle…</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.reg} — {v.make} {v.model}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Odometer (km)" required>
              <Input
                type="number"
                value={odometer}
                onChange={(e) => setOdometer(e.target.value)}
                placeholder={vehicle ? String(vehicle.odometer) : '412300'}
                required
              />
            </Field>
          </div>

          <div className="space-y-2">
            {INSPECTION_CHECKS.map((check) => (
              <div
                key={check.key}
                className="flex items-center justify-between gap-3 p-3 rounded-xl border border-silver-200"
              >
                <span className="text-sm text-silver-700">{check.label}</span>
                <div className="flex gap-1 shrink-0">
                  {OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setChecks((c) => ({ ...c, [check.key]: opt.value }))}
                      className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                        checks[check.key] === opt.value
                          ? opt.active
                          : 'bg-white text-silver-500 border-silver-200 hover:border-silver-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {(failures > 0 || advisories > 0) && (
            <div
              className={`flex items-start gap-2.5 p-3.5 rounded-xl border text-sm ${
                failures > 0
                  ? 'bg-red-50 border-red-200 text-red-800'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}
            >
              <Icons.TriangleAlert size={16} className="mt-0.5 shrink-0" />
              <span>
                {failures > 0 ? (
                  <>
                    <span className="font-semibold">{failures} failed item{failures === 1 ? '' : 's'}.</span>{' '}
                    Submitting will ground {vehicle?.reg || 'this vehicle'} and raise a workshop job.
                  </>
                ) : (
                  <>
                    <span className="font-semibold">{advisories} advisory item{advisories === 1 ? '' : 's'}.</span>{' '}
                    Logged for the next service.
                  </>
                )}
              </span>
            </div>
          )}

          <Field label="Notes">
            <TextArea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Detail on any advisory or failure…" />
          </Field>

          <Field label="Photos">
            <PhotoCapture photos={photos} onChange={setPhotos} label="Add" />
          </Field>

          <Button type="submit" size="lg" className="w-full" icon={Icons.ClipboardCheck}>
            Submit inspection
          </Button>
        </form>
      </Card>

      <Card className="lg:col-span-2" padded={false}>
        <div className="table-card-head">
          <SectionHeading title="Recent inspections" />
        </div>
        {inspections.length === 0 ? (
          <EmptyState title="No inspections recorded" icon={Icons.ClipboardList} />
        ) : (
          <div className="divide-y divide-silver-100">
            {inspections.map((inspection) => {
              const fails = Object.values(inspection.checks).filter((v) => v === 'fail').length;
              const advs = Object.values(inspection.checks).filter((v) => v === 'advisory').length;
              return (
                <div key={inspection.id} className="px-5 md:px-6 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-silver-900">
                        {vehicles.find((v) => v.id === inspection.vehicleId)?.reg || '—'}
                      </p>
                      <p className="text-xs text-silver-400 mt-0.5 tabular-nums">
                        {num(inspection.odometer)} km · {timeLabel(inspection.inspectedAt)}
                      </p>
                    </div>
                    <Badge tone={fails ? 'critical' : advs ? 'warning' : 'good'}>
                      {fails ? `${fails} failed` : advs ? `${advs} advisory` : 'All pass'}
                    </Badge>
                  </div>
                  {inspection.notes && (
                    <p className="text-xs text-silver-500 mt-2 italic">“{inspection.notes}”</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};

/* ===========================================================================
   Sync queue — makes offline behaviour visible instead of magical
   =========================================================================== */

const SyncQueue = ({ queue }) => (
  <Card padded={false}>
    <div className="table-card-head">
      <SectionHeading
        title="Business Central sync queue"
        description="Everything captured on this device and where it is in the pipeline."
      />
    </div>
    <DataTable
      columns={[
        { key: 'label', label: 'Record', render: (r) => <span className="font-medium text-silver-900">{r.label}</span> },
        { key: 'entity', label: 'Type', render: (r) => <span className="capitalize">{r.entity}</span> },
        {
          key: 'endpoint',
          label: 'BC endpoint',
          render: (r) => <code className="text-xs text-silver-500">{r.endpoint}</code>,
        },
        { key: 'queuedAt', label: 'Queued', render: (r) => timeLabel(r.queuedAt) },
        { key: 'attempts', label: 'Attempts', align: 'right' },
        {
          key: 'status',
          label: 'Status',
          render: (r) => (
            <Badge
              tone={r.status === 'posted' ? 'good' : r.status === 'failed' ? 'critical' : 'warning'}
              icon={r.status === 'posted' ? Icons.Check : r.status === 'failed' ? Icons.X : Icons.Clock}
            >
              {r.status === 'posted' ? `Posted ${r.bcRef || ''}` : r.status}
            </Badge>
          ),
        },
      ]}
      rows={queue}
      empty="Nothing has been captured on this device yet."
    />
  </Card>
);

export default Operations;
