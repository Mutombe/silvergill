import React, { useMemo, useRef, useState } from 'react';
import * as Icons from 'lucide-react';
import { toast } from 'sonner';

import { useCollection } from '../hooks';
import * as db from '../data/db';
import { enqueue, BC_ENDPOINTS } from '../data/bcClient';
import {
  processDocument, DOCUMENT_TYPES, SAMPLE_DOCUMENTS, fieldLabel, describeProductionPath,
} from '../engine/extraction';

import { requiredDocumentsForShipment } from '../engine/pricing';
import {
  Badge, Button, Card, DataTable, Drawer, EmptyState, Field, Input, Select,
  SectionHeading, StatCard, Tabs, ProgressBar, statusTone, timeLabel,
} from '../components/ui';
import ModuleHeader from '../components/ModuleHeader';

/* ===========================================================================
   Module 6 — AI Document Processing
   Upload or paste a document; it is classified, its fields are extracted with
   per-field confidence, and anything the model is unsure about is routed to a
   review queue before it can post to Business Central.
   =========================================================================== */

const Documents = () => {
  const documents = useCollection('documents');
  const shipments = useCollection('shipments');

  const [tab, setTab] = useState('process');
  const needsReview = documents.filter((d) => d.status === 'Needs Review');

  const compliance = useMemo(() => buildCompliance(shipments, documents), [shipments, documents]);
  const incomplete = compliance.filter((c) => c.missing.length > 0);

  return (
    <div className="space-y-6 max-w-[1400px]">
      <ModuleHeader
        number={6}
        title="AI Document Processing"
        blurb="Bills of Lading, invoices, packing lists, permits, CD1s and customs entries — read, checked and posted without re-keying."
      />

      <Tabs
        tabs={[
          { key: 'process', label: 'Process a document' },
          { key: 'review', label: 'Review queue', count: needsReview.length },
          { key: 'compliance', label: 'Compliance', count: incomplete.length },
          { key: 'library', label: 'Document library', count: documents.length },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'process' && <Processor shipments={shipments} />}
      {tab === 'review' && <ReviewQueue documents={needsReview} />}
      {tab === 'compliance' && <Compliance rows={compliance} />}
      {tab === 'library' && <Library documents={documents} />}
    </div>
  );
};

/* ===========================================================================
   Compliance — which consignment is missing which document, and what is
   about to expire. The pack comes from the same rules the quotation used.
   =========================================================================== */

const EXPIRY_FIELDS = ['expiryDate', 'validTo'];

function buildCompliance(shipments, documents) {
  return shipments
    .filter((s) => s.status !== 'Delivered' || documents.some((d) => d.shipmentId === s.id))
    .map((shipment) => {
      const required = requiredDocumentsForShipment(shipment).filter((d) => d.mandatory);
      const filed = documents.filter((d) => d.shipmentId === shipment.id);
      const filedTypes = new Set(filed.map((d) => d.type));

      // Match loosely: "CD1 Form (Exchange Control)" in the pack is the same
      // thing as the "CD1 Form" the extractor classifies.
      const isFiled = (name) =>
        [...filedTypes].some(
          (type) => name.toLowerCase().includes(type.toLowerCase()) || type.toLowerCase().includes(name.split(' (')[0].toLowerCase())
        );

      const missing = required.filter((doc) => !isFiled(doc.name));

      const expiring = filed
        .map((doc) => {
          const key = EXPIRY_FIELDS.find((f) => doc.fields?.[f]);
          if (!key) return null;
          const raw = typeof doc.fields[key] === 'object' ? doc.fields[key].value : doc.fields[key];
          const parsed = parseLooseDate(raw);
          if (!parsed) return null;
          const days = Math.round((parsed - Date.now()) / 86400000);
          return days <= 60 ? { doc, days, on: parsed } : null;
        })
        .filter(Boolean);

      return {
        id: shipment.id,
        shipment,
        required,
        filed,
        missing,
        expiring,
        completeness: required.length ? ((required.length - missing.length) / required.length) * 100 : 100,
      };
    })
    .sort((a, b) => a.completeness - b.completeness);
}

/** Parses dd/mm/yyyy and dd-mm-yyyy as well as ISO. */
function parseLooseDate(value) {
  if (!value) return null;
  const iso = new Date(value);
  if (!Number.isNaN(iso.getTime()) && /^\d{4}-/.test(value)) return iso;
  const match = String(value).match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (!match) return Number.isNaN(iso.getTime()) ? null : iso;
  const [, d, m, y] = match;
  const year = y.length === 2 ? 2000 + Number(y) : Number(y);
  const date = new Date(year, Number(m) - 1, Number(d));
  return Number.isNaN(date.getTime()) ? null : date;
}

const Compliance = ({ rows }) => {
  const [open, setOpen] = useState(null);

  const blocked = rows.filter((r) => r.missing.length > 0);
  const expiringSoon = rows.flatMap((r) => r.expiring.map((e) => ({ ...e, shipment: r.shipment })));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Consignments tracked"
          value={rows.length}
          icon={Icons.FolderCheck}
        />
        <StatCard
          label="Missing documents"
          value={blocked.reduce((sum, r) => sum + r.missing.length, 0)}
          icon={Icons.FileWarning}
          tone={blocked.length ? 'warning' : 'good'}
          deltaLabel={`across ${blocked.length} consignment${blocked.length === 1 ? '' : 's'}`}
        />
        <StatCard
          label="Expiring within 60 days"
          value={expiringSoon.length}
          icon={Icons.CalendarClock}
          tone={expiringSoon.some((e) => e.days < 14) ? 'critical' : expiringSoon.length ? 'warning' : 'good'}
        />
        <StatCard
          label="Fully documented"
          value={rows.filter((r) => r.missing.length === 0).length}
          icon={Icons.CheckCheck}
          tone="good"
        />
      </div>

      {expiringSoon.length > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900">
          <Icons.CalendarClock size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-sm">Documents approaching expiry</p>
            <ul className="text-sm mt-1 space-y-0.5">
              {expiringSoon.map((item) => (
                <li key={item.doc.id}>
                  {item.doc.type} on {item.shipment.id} —{' '}
                  {item.days < 0 ? `expired ${Math.abs(item.days)} days ago` : `${item.days} days left`}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <Card padded={false}>
        <div className="table-card-head">
          <SectionHeading
            title="Document completeness by consignment"
            description="The required pack is derived from commodity, mode, border and port — the same rules the quotation used."
          />
        </div>
        <DataTable
          onRowClick={setOpen}
          columns={[
            { key: 'id', label: 'Consignment', render: (r) => <span className="font-medium tabular-nums">{r.id}</span> },
            {
              key: 'route',
              label: 'Route',
              render: (r) => <span className="text-xs text-silver-500">{r.shipment.origin} → {r.shipment.destination}</span>,
            },
            { key: 'status', label: 'Status', render: (r) => <Badge tone={statusTone(r.shipment.status)}>{r.shipment.status}</Badge> },
            {
              key: 'completeness',
              label: 'Pack complete',
              render: (r) => (
                <div className="w-32">
                  <ProgressBar
                    value={r.completeness}
                    tone={r.completeness === 100 ? 'good' : r.completeness >= 60 ? 'warning' : 'critical'}
                  />
                </div>
              ),
            },
            {
              key: 'missing',
              label: 'Missing',
              align: 'right',
              render: (r) =>
                r.missing.length === 0 ? (
                  <Badge tone="good" icon={Icons.Check}>Complete</Badge>
                ) : (
                  <Badge tone="critical">{r.missing.length} outstanding</Badge>
                ),
            },
          ]}
          rows={rows}
          empty="No consignments to check."
        />
      </Card>

      <Drawer
        open={Boolean(open)}
        onClose={() => setOpen(null)}
        title={open?.id}
        subtitle={open ? `${open.shipment.origin} → ${open.shipment.destination}` : ''}
      >
        {open && (
          <div className="space-y-6">
            <ProgressBar
              value={open.completeness}
              label="Mandatory pack complete"
              tone={open.completeness === 100 ? 'good' : open.completeness >= 60 ? 'warning' : 'critical'}
            />

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-silver-400 mb-3">
                Required documents
              </p>
              <div className="space-y-2">
                {open.required.map((doc) => {
                  const missing = open.missing.some((m) => m.name === doc.name);
                  return (
                    <div
                      key={doc.name}
                      className={`flex items-start gap-2.5 p-3 rounded-xl border ${
                        missing ? 'border-red-200 bg-red-50/50' : 'border-silver-200'
                      }`}
                    >
                      {missing ? (
                        <Icons.X size={15} className="text-red-500 mt-0.5 shrink-0" />
                      ) : (
                        <Icons.Check size={15} className="text-emerald-600 mt-0.5 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className={`text-sm font-medium ${missing ? 'text-red-800' : 'text-silver-800'}`}>
                          {doc.name}
                        </p>
                        <p className="text-xs text-silver-500 mt-0.5">
                          {doc.who} {missing ? '· not yet filed' : '· on file'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {open.filed.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-silver-400 mb-3">
                  Filed against this consignment
                </p>
                <div className="space-y-2">
                  {open.filed.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-silver-200">
                      <span className="min-w-0">
                        <span className="block text-sm text-silver-800 truncate">{doc.type}</span>
                        <span className="block text-xs text-silver-400 truncate">{doc.fileName}</span>
                      </span>
                      <Badge tone={statusTone(doc.status)}>{doc.status}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
};

/* ===== Processing ===== */

const Processor = ({ shipments }) => {
  const fileRef = useRef(null);
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState('');
  const [typeHint, setTypeHint] = useState('');
  const [shipmentId, setShipmentId] = useState('');
  const [result, setResult] = useState(null);
  const [edits, setEdits] = useState({});
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!text.trim()) {
      toast.error('Nothing to read', { description: 'Paste the document text or load a sample.' });
      return;
    }
    setBusy(true);
    // Stand-in for the extraction round trip.
    await new Promise((resolve) => setTimeout(resolve, 700));
    const output = processDocument(text, typeHint || null);
    setResult(output);
    setEdits(Object.fromEntries(Object.entries(output.fields).map(([k, v]) => [k, v.value])));
    setBusy(false);

    if (!output.type) {
      toast.error('Document type not recognised', { description: 'Pick the type manually and run it again.' });
    } else {
      toast.success(`Read as ${output.type}`, {
        description: `${Math.round(output.confidence * 100)}% confidence · ${output.status}`,
      });
    }
  };

  const loadFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    if (file.type.startsWith('text/') || /\.(txt|csv|json|eml)$/i.test(file.name)) {
      setText(await file.text());
      toast.success('File loaded');
    } else {
      // PDFs and photographs need OCR, which lives on the server.
      toast.warning('This file needs OCR', {
        description: 'PDFs and photos are transcribed by the extraction service. Paste the text or load a sample to try the parser now.',
      });
    }
    event.target.value = '';
  };

  const loadSample = (sample) => {
    setText(sample.text);
    setFileName(sample.fileName);
    setResult(null);
    setTypeHint('');
  };

  const post = () => {
    const record = db.insert('documents', {
      shipmentId: shipmentId || null,
      type: result.type,
      fileName: fileName || 'pasted-document.txt',
      status: 'Posted',
      confidence: result.confidence,
      uploadedAt: new Date().toISOString(),
      bcRef: null,
      fields: edits,
    });

    enqueue({
      entity: 'document',
      endpoint: BC_ENDPOINTS.document,
      recordId: record.id,
      label: `${result.type} — ${fileName || record.id}`,
      payload: { documentType: result.type, shipmentNo: shipmentId, fields: edits, target: result.bcTarget },
    });

    toast.success('Posted to Business Central', { description: result.bcTarget });
    setResult(null);
    setText('');
    setFileName('');
    setShipmentId('');
  };

  const sendToReview = () => {
    db.insert('documents', {
      shipmentId: shipmentId || null,
      type: result.type,
      fileName: fileName || 'pasted-document.txt',
      status: 'Needs Review',
      confidence: result.confidence,
      uploadedAt: new Date().toISOString(),
      bcRef: null,
      fields: edits,
    });
    toast.success('Sent to the review queue');
    setResult(null);
    setText('');
  };

  return (
    <div className="grid xl:grid-cols-2 gap-6">
      {/* ===== Input ===== */}
      <Card>
        <SectionHeading title="Source document" description="Upload, paste, or try a sample." />

        <div className="space-y-4">
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full py-8 rounded-2xl border-2 border-dashed border-silver-300 hover:border-primary-400 hover:bg-primary-50/30 transition-colors flex flex-col items-center gap-2 text-silver-500 hover:text-primary-600"
          >
            <Icons.Upload size={24} />
            <span className="text-sm font-medium">{fileName || 'Choose a file'}</span>
            <span className="text-xs text-silver-400">PDF, image or text</span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.txt,.csv,.json,.eml,image/*"
            onChange={loadFile}
            className="hidden"
          />

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-silver-400 mb-2">
              Or load a sample
            </p>
            <div className="flex flex-wrap gap-2">
              {SAMPLE_DOCUMENTS.map((sample) => (
                <button
                  key={sample.fileName}
                  onClick={() => loadSample(sample)}
                  className="text-xs px-2.5 py-1.5 rounded-lg border border-silver-200 text-silver-600 hover:border-primary-300 hover:text-primary-600 transition-colors"
                >
                  {sample.name.split(' — ')[0]}
                </button>
              ))}
            </div>
          </div>

          <Field label="Document text" hint="What the extraction service returns after OCR.">
            <textarea
              rows={12}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="input-field font-mono text-xs leading-relaxed resize-y custom-scroll"
              placeholder="Paste the document text here…"
            />
          </Field>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Type" hint="Leave blank to let it classify.">
              <Select value={typeHint} onChange={(e) => setTypeHint(e.target.value)}>
                <option value="">Detect automatically</option>
                {Object.keys(DOCUMENT_TYPES).map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </Select>
            </Field>
            <Field label="Link to shipment">
              <Select value={shipmentId} onChange={(e) => setShipmentId(e.target.value)}>
                <option value="">Not linked</option>
                {shipments.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.id} — {s.destination}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Button size="lg" className="w-full" onClick={run} disabled={busy} icon={busy ? undefined : Icons.ScanText}>
            {busy ? 'Reading document…' : 'Extract fields'}
          </Button>
        </div>
      </Card>

      {/* ===== Output ===== */}
      <div className="space-y-6">
        {!result ? (
          <Card>
            <EmptyState
              icon={Icons.FileScan}
              title="No document processed yet"
              description="Load a sample on the left and press Extract fields to see classification, per-field confidence and the Business Central target."
            />
            <div className="mt-2 pt-5 border-t border-silver-200">
              <p className="text-xs font-semibold uppercase tracking-wider text-silver-400 mb-3">
                How this runs in production
              </p>
              <ol className="space-y-2">
                {Object.values(describeProductionPath()).map((step, i) => (
                  <li key={step} className="flex gap-3 text-sm text-silver-600">
                    <span className="w-5 h-5 rounded-md bg-silver-100 text-silver-500 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          </Card>
        ) : (
          <>
            <Card>
              <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <Badge tone={result.status === 'Ready to post' ? 'good' : 'warning'}>
                      {result.status}
                    </Badge>
                    {result.missing?.length > 0 && (
                      <Badge tone="neutral">{result.missing.length} field(s) not found</Badge>
                    )}
                  </div>
                  <h3 className="text-xl font-display font-bold text-silver-900">
                    {result.type || 'Unrecognised document'}
                  </h3>
                  {result.bcTarget && (
                    <p className="text-sm text-silver-500 mt-1">→ {result.bcTarget}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs uppercase tracking-wider text-silver-400">Confidence</p>
                  <p
                    className={`text-2xl font-display font-bold tabular-nums ${
                      result.confidence >= 0.85 ? 'text-[#006300]' : 'text-[#b07800]'
                    }`}
                  >
                    {Math.round(result.confidence * 100)}%
                  </p>
                </div>
              </div>

              {result.classification && (
                <div className="mb-5 p-4 rounded-xl bg-silver-50 border border-silver-200">
                  <p className="text-xs font-semibold uppercase tracking-wider text-silver-400 mb-2.5">
                    Classification scores
                  </p>
                  <div className="space-y-2">
                    {result.classification.all.slice(0, 3).map((score) => (
                      <ProgressBar
                        key={score.type}
                        value={score.score * 100}
                        label={score.type}
                        tone={score.type === result.type ? 'primary' : 'warning'}
                      />
                    ))}
                  </div>
                </div>
              )}

              {result.type && (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wider text-silver-400 mb-3">
                    Extracted fields — edit anything the model got wrong
                  </p>
                  <div className="space-y-2.5">
                    {Object.entries(result.fields).map(([key, field]) => (
                      <div key={key} className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <label className="block text-xs text-silver-500 mb-1">{fieldLabel(key)}</label>
                          <input
                            className={`input-field text-sm ${
                              !field.value ? 'border-amber-300 bg-amber-50/40' : ''
                            }`}
                            value={edits[key] ?? ''}
                            onChange={(e) => setEdits((prev) => ({ ...prev, [key]: e.target.value }))}
                            placeholder="Not found — key it in"
                          />
                        </div>
                        <div className="w-16 shrink-0 pt-6 text-right">
                          <span
                            className={`text-xs font-semibold tabular-nums ${
                              field.confidence >= 0.9
                                ? 'text-[#006300]'
                                : field.confidence > 0
                                ? 'text-[#b07800]'
                                : 'text-silver-300'
                            }`}
                          >
                            {field.confidence ? `${Math.round(field.confidence * 100)}%` : '—'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-3 mt-6">
                    <Button icon={Icons.Check} onClick={post} className="flex-1">
                      Post to Business Central
                    </Button>
                    <Button variant="secondary" icon={Icons.UserCheck} onClick={sendToReview}>
                      Send for review
                    </Button>
                  </div>
                </>
              )}
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

/* ===== Review queue ===== */

const ReviewQueue = ({ documents }) => {
  const [open, setOpen] = useState(null);
  const [edits, setEdits] = useState({});

  const openDoc = (doc) => {
    setOpen(doc);
    setEdits({ ...doc.fields });
  };

  const approve = () => {
    db.update('documents', open.id, { fields: edits, status: 'Posted', confidence: 1 });
    enqueue({
      entity: 'document',
      endpoint: BC_ENDPOINTS.document,
      recordId: open.id,
      label: `${open.type} — ${open.fileName}`,
      payload: { documentType: open.type, fields: edits, reviewedByHuman: true },
    });
    toast.success('Approved and queued for Business Central');
    setOpen(null);
  };

  if (!documents.length) {
    return (
      <Card>
        <EmptyState
          icon={Icons.CheckCheck}
          title="Nothing waiting for review"
          description="Documents extracted above 85% confidence post straight through."
        />
      </Card>
    );
  }

  return (
    <>
      <Card padded={false}>
        <div className="table-card-head">
          <SectionHeading
            title="Waiting on a human"
            description="Low confidence or a missing field. Nothing here has touched the ledger."
          />
        </div>
        <DataTable
          onRowClick={openDoc}
          columns={[
            { key: 'fileName', label: 'File', render: (r) => <span className="font-medium text-silver-900">{r.fileName}</span> },
            { key: 'type', label: 'Type' },
            { key: 'shipmentId', label: 'Shipment', render: (r) => r.shipmentId || '—' },
            {
              key: 'confidence',
              label: 'Confidence',
              align: 'right',
              render: (r) => (
                <span className={r.confidence >= 0.85 ? 'text-[#006300]' : 'text-[#b07800]'}>
                  {Math.round(r.confidence * 100)}%
                </span>
              ),
            },
            { key: 'uploadedAt', label: 'Uploaded', render: (r) => timeLabel(r.uploadedAt) },
            { key: 'action', label: '', render: () => <Icons.ChevronRight size={16} className="text-silver-300" /> },
          ]}
          rows={documents}
        />
      </Card>

      <Drawer
        open={Boolean(open)}
        onClose={() => setOpen(null)}
        title={open?.type}
        subtitle={open?.fileName}
        footer={
          <div className="flex gap-3">
            <Button className="flex-1" icon={Icons.Check} onClick={approve}>
              Approve & post
            </Button>
            <Button variant="secondary" onClick={() => setOpen(null)}>
              Cancel
            </Button>
          </div>
        }
      >
        {open && (
          <div className="space-y-4">
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-900">
              <Icons.TriangleAlert size={16} className="mt-0.5 shrink-0" />
              Extracted at {Math.round(open.confidence * 100)}% confidence. Check every value against
              the original before approving.
            </div>
            {Object.entries(edits).map(([key, value]) => (
              <Field key={key} label={fieldLabel(key)}>
                <Input
                  value={typeof value === 'object' ? value.value : value}
                  onChange={(e) => setEdits((prev) => ({ ...prev, [key]: e.target.value }))}
                />
              </Field>
            ))}
          </div>
        )}
      </Drawer>
    </>
  );
};

/* ===== Library ===== */

const Library = ({ documents }) => {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return documents;
    return documents.filter(
      (d) =>
        d.fileName.toLowerCase().includes(q) ||
        d.type.toLowerCase().includes(q) ||
        JSON.stringify(d.fields).toLowerCase().includes(q)
    );
  }, [documents, query]);

  return (
    <Card padded={false}>
      <div className="table-card-head">
        <SectionHeading
          title="Document library"
          description="Everything processed, searchable by any extracted value."
          action={
            <div className="w-64">
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search fields…" />
            </div>
          }
        />
      </div>
      <DataTable
        columns={[
          { key: 'fileName', label: 'File', render: (r) => <span className="font-medium text-silver-900">{r.fileName}</span> },
          { key: 'type', label: 'Type' },
          { key: 'shipmentId', label: 'Shipment', render: (r) => r.shipmentId || '—' },
          {
            key: 'key',
            label: 'Key value',
            render: (r) => {
              const first = Object.values(r.fields || {}).find(Boolean);
              return <span className="text-xs text-silver-500">{typeof first === 'object' ? first.value : first}</span>;
            },
          },
          { key: 'bcRef', label: 'BC reference', render: (r) => r.bcRef || '—' },
          { key: 'status', label: 'Status', render: (r) => <Badge tone={statusTone(r.status)}>{r.status}</Badge> },
        ]}
        rows={filtered}
        empty="Nothing matches that search."
      />
    </Card>
  );
};

export default Documents;
