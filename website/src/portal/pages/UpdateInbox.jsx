import React, { useMemo, useRef, useState } from 'react';
import * as Icons from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '../auth/AuthContext';
import { useCollection } from '../hooks';
import * as db from '../data/db';
import { post } from '../data/api';
import { record, notify } from '../data/activity';
import { matchShipment, MATCH_METHODS } from '../engine/matching';
import {
  extractEventHosted, scoreConfidence, SOURCE_CONFIDENCE, SOURCE_LABEL,
  EVENT_TYPE_LABEL, describeExtractionPath, EVENT_TOOL_SCHEMA,
} from '../engine/events';

import {
  Badge, Button, Card, DataTable, Drawer, EmptyState, Field, Input, ProgressBar,
  Select, TextArea, SectionHeading, StatCard, Tabs, timeLabel,
} from '../components/ui';
import ModuleHeader from '../components/ModuleHeader';

/* ===========================================================================
   AI Update Inbox
   Drop in any field update — a driver's WhatsApp message, a coordinator note,
   a dictated voice note, a tracking screenshot — and it is matched to a
   consignment, structured into one event, scored, and queued for approval.
   Nothing reaches a customer without a human saying yes.
   =========================================================================== */

const SOURCE_ICON = {
  whatsapp: Icons.MessageCircle,
  screenshot: Icons.Image,
  voice: Icons.Mic,
  coordinator: Icons.User,
  carrier_api: Icons.Rss,
  manual: Icons.PenLine,
  email: Icons.Mail,
};

const TYPE_TONE = {
  delivered: 'good',
  border_cross: 'info',
  departed: 'info',
  arrived: 'info',
  location: 'neutral',
  delay: 'warning',
  exception: 'critical',
  update: 'neutral',
  note: 'neutral',
};

const SAMPLES = [
  {
    label: 'Driver, delayed at the border',
    source: 'whatsapp',
    phone: '+263 771 204 887',
    text: 'Boss still at beitbridge, delay is now about 6 hours, the scanner queue is not moving. ETA durban tomorrow evening.',
  },
  {
    label: 'Driver, cleared the border',
    source: 'whatsapp',
    phone: '+263 772 118 440',
    text: 'We have cleared Forbes now, stamped out 11:20, moving to Beira.',
  },
  {
    label: 'Coordinator, delivery confirmed',
    source: 'coordinator',
    phone: '',
    text: 'SHP-24122 offloaded at Curepipe this morning, customer signed, all 12 tons accounted for.',
  },
  {
    label: 'Breakdown on the road',
    source: 'whatsapp',
    phone: '+263 774 660 418',
    text: 'AGH 8842 has broken down near Kadoma, air compressor again. Waiting for recovery, delay maybe 4 hours.',
  },
  {
    label: 'Container reference only',
    source: 'email',
    phone: '',
    text: 'Please note container TGHU 550913-8 has been positioned at the Durban terminal awaiting vessel.',
  },
];

const UpdateInbox = () => {
  const { user } = useAuth();
  const shipments = useCollection('shipments');
  const drivers = useCollection('drivers');
  const vehicles = useCollection('vehicles');
  const queue = useCollection('inboxQueue');
  const events = useCollection('shipmentEvents');

  const [tab, setTab] = useState('capture');

  const pending = queue.filter((q) => q.status === 'pending');

  return (
    <div className="space-y-6 max-w-[1400px]">
      <ModuleHeader
        title="AI Update Inbox"
        blurb="Every field update — WhatsApp, voice note, screenshot or email — matched to a consignment, structured into one event, and held for approval before the customer sees it."
        pending={pending.length}
      />

      <Tabs
        tabs={[
          { key: 'capture', label: 'New update' },
          { key: 'queue', label: 'Approval queue', count: pending.length },
          { key: 'timeline', label: 'Event timeline', count: events.length },
          { key: 'how', label: 'How it works' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'capture' && (
        <Capture shipments={shipments} drivers={drivers} vehicles={vehicles} user={user} />
      )}
      {tab === 'queue' && <ApprovalQueue queue={queue} shipments={shipments} user={user} />}
      {tab === 'timeline' && <Timeline events={events} shipments={shipments} />}
      {tab === 'how' && <HowItWorks />}
    </div>
  );
};

/* ===== Capture ===== */

const Capture = ({ shipments, drivers, vehicles, user }) => {
  const [source, setSource] = useState('whatsapp');
  const [text, setText] = useState('');
  const [phone, setPhone] = useState('');
  const [shipmentId, setShipmentId] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);
  const fileRef = useRef(null);

  const speechSupported =
    typeof window !== 'undefined' &&
    Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);

  /** On-device dictation. Nothing is uploaded — the browser does the transcription. */
  const toggleDictation = () => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      toast.error('Dictation is not supported in this browser', {
        description: 'Use Chrome on the handset, or type the update.',
      });
      return;
    }
    const recognition = new Recognition();
    recognition.lang = 'en-GB';
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((r) => r[0].transcript)
        .join(' ')
        .trim();
      setText((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };
    recognition.onerror = () => {
      setListening(false);
      toast.error('Could not hear that', { description: 'Check the microphone permission.' });
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
    setSource('voice');
    toast.success('Listening — speak the update');
  };

  const handleImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSource('screenshot');
    toast.info('Screenshot attached', {
      description: 'Reading text off an image needs the hosted vision model. Paste or dictate the text to run the matcher now.',
    });
    event.target.value = '';
  };

  const process = async () => {
    if (!text.trim()) {
      toast.error('Nothing to process', { description: 'Type, dictate, or load a sample update.' });
      return;
    }
    setBusy(true);

    // 1. Which consignment — deterministic, never guessed by a model.
    const match = matchShipment({
      text,
      shipmentId: shipmentId || null,
      phone,
      shipments,
      drivers,
      vehicles,
    });

    // 2. What happened — hosted extraction, falling back to the local rules.
    //    Telling the model what we already matched keeps it from re-deriving a
    //    reference it can only get wrong.
    const context = match.shipment
      ? `${match.shipment.id}, ${match.shipment.origin} to ${match.shipment.destination}, `
        + `currently ${match.shipment.status}`
      : null;
    const extraction = await extractEventHosted(text, { context });

    if (!extraction) {
      setBusy(false);
      toast.error('Nothing could be read from that update');
      return;
    }

    const confidence = scoreConfidence(source, extraction);

    setResult({ match, extraction, confidence, source, text, phone });
    setBusy(false);

    if (!match.shipment && match.candidates.length) {
      toast.warning(`${match.candidates.length} consignments match that number`, {
        description: 'Pick the right one before queueing.',
      });
    } else if (!match.shipment) {
      toast.error('No consignment matched', {
        description: 'Quote a reference, container or registration — or choose one manually.',
      });
    } else {
      toast.success(`Matched ${match.shipment.id}`, { description: MATCH_METHODS[match.by] });
    }
  };

  const queueIt = () => {
    const target = result.match.shipment;
    const entry = db.insert('inboxQueue', {
      shipmentId: target.id,
      source: result.source,
      rawText: result.text,
      fromPhone: result.phone || null,
      matchedBy: result.match.by,
      confidence: result.confidence,
      extraction: result.extraction,
      receivedAt: new Date().toISOString(),
      status: 'pending',
    });

    record(user, 'inbox.queue', target.id, `Update queued on ${target.id} — ${result.extraction.label}`);
    notify({
      forRoles: ['ops'],
      severity: result.extraction.type === 'exception' ? 'critical' : 'info',
      title: `Update awaiting approval on ${target.id}`,
      body: result.extraction.label,
      link: '/portal/inbox',
    });

    toast.success(`Queued as ${entry.id}`, { description: 'Approve it to publish to the customer.' });
    setResult(null);
    setText('');
    setPhone('');
    setShipmentId('');
  };

  const loadSample = (sample) => {
    setText(sample.text);
    setSource(sample.source);
    setPhone(sample.phone);
    setShipmentId('');
    setResult(null);
  };

  return (
    <div className="grid xl:grid-cols-2 gap-6">
      {/* ===== Input ===== */}
      <Card>
        <SectionHeading
          title="New update"
          description="However it arrived — paste it, dictate it, or attach a screenshot."
        />

        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Source" hint={`Trust score ${SOURCE_CONFIDENCE[source] ?? 70}%`}>
              <Select value={source} onChange={(e) => setSource(e.target.value)}>
                {Object.keys(SOURCE_CONFIDENCE).map((key) => (
                  <option key={key} value={key}>{SOURCE_LABEL[key]}</option>
                ))}
              </Select>
            </Field>
            <Field label="Sender number" hint="Used to match the assigned driver.">
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+263 771 204 887"
              />
            </Field>
          </div>

          <Field label="The update" required>
            <TextArea
              rows={6}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste the WhatsApp message, or press Dictate and speak…"
            />
          </Field>

          <div className="flex flex-wrap gap-2">
            <Button
              variant={listening ? 'danger' : 'secondary'}
              size="sm"
              icon={listening ? Icons.Square : Icons.Mic}
              onClick={toggleDictation}
              disabled={!speechSupported && !listening}
              title={speechSupported ? 'Transcribed on this device' : 'Not supported in this browser'}
            >
              {listening ? 'Stop dictation' : 'Dictate'}
            </Button>
            <Button variant="secondary" size="sm" icon={Icons.Image} onClick={() => fileRef.current?.click()}>
              Attach screenshot
            </Button>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} className="hidden" />
          </div>

          <Field label="Consignment" hint="Leave blank to let the matcher work it out.">
            <Select value={shipmentId} onChange={(e) => setShipmentId(e.target.value)}>
              <option value="">Match automatically</option>
              {shipments.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id} — {s.destination}
                </option>
              ))}
            </Select>
          </Field>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-silver-400 mb-2">
              Try a real-world example
            </p>
            <div className="flex flex-wrap gap-2">
              {SAMPLES.map((sample) => (
                <button
                  key={sample.label}
                  onClick={() => loadSample(sample)}
                  className="text-xs px-2.5 py-1.5 rounded-lg border border-silver-200 text-silver-600 hover:border-primary-300 hover:text-primary-600 transition-colors"
                >
                  {sample.label}
                </button>
              ))}
            </div>
          </div>

          <Button size="lg" className="w-full" onClick={process} disabled={busy} icon={busy ? undefined : Icons.Sparkles}>
            {busy ? 'Matching and reading…' : 'Process update'}
          </Button>
        </div>
      </Card>

      {/* ===== Result ===== */}
      <div>
        {!result ? (
          <Card>
            <EmptyState
              icon={Icons.Inbox}
              title="Nothing processed yet"
              description="Load one of the examples on the left to watch a raw WhatsApp message become a structured, matched, scored event."
            />
          </Card>
        ) : (
          <Card>
            <SectionHeading title="Result" description="Check it, then queue it for approval." />

            {/* Step 1 — match */}
            <div
              className={`p-4 rounded-xl border mb-4 ${
                result.match.shipment
                  ? 'border-emerald-200 bg-emerald-50/50'
                  : 'border-amber-200 bg-amber-50/50'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-1.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-silver-500">
                  1 · Consignment match
                </p>
                {result.match.by && <Badge tone="good">{MATCH_METHODS[result.match.by]}</Badge>}
              </div>
              {result.match.shipment ? (
                <>
                  <p className="font-display font-bold text-silver-900 tabular-nums">
                    {result.match.shipment.id}
                  </p>
                  <p className="text-sm text-silver-600 mt-0.5">
                    {result.match.shipment.origin} → {result.match.shipment.destination}
                  </p>
                </>
              ) : result.match.candidates.length ? (
                <>
                  <p className="text-sm text-amber-900 mb-2.5">
                    That number is on {result.match.candidates.length} live consignments. Which one?
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {result.match.candidates.map((c) => (
                      <button
                        key={c.id}
                        onClick={() =>
                          setResult((r) => ({ ...r, match: { shipment: c, by: 'selected', candidates: [] } }))
                        }
                        className="text-xs px-2.5 py-1.5 rounded-lg border border-amber-300 text-amber-900 hover:bg-amber-100"
                      >
                        {c.id} — {c.destination}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm text-amber-900">
                  Nothing matched. Choose a consignment on the left and process again.
                </p>
              )}
            </div>

            {/* Step 2 — extraction */}
            <div className="p-4 rounded-xl border border-silver-200 mb-4">
              <div className="flex items-start justify-between gap-3 mb-2.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-silver-500">
                  2 · Structured event
                </p>
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Which extractor answered. The operator is approving this,
                      so they are entitled to know what read it. */}
                  <Badge tone={result.extraction.extractedBy === 'model' ? 'info' : 'neutral'}>
                    {result.extraction.extractedBy === 'model' ? 'Model' : 'Rules'}
                  </Badge>
                  <Badge tone={TYPE_TONE[result.extraction.type]}>
                    {EVENT_TYPE_LABEL[result.extraction.type]}
                  </Badge>
                </div>
              </div>

              <p className="font-medium text-silver-900 mb-3">{result.extraction.label}</p>

              <div className="space-y-2">
                {[
                  ['Location', result.extraction.location_text],
                  ['Status change', result.extraction.status_hint],
                  ['Reference found', result.extraction.reference],
                  ['ETA stated', result.extraction.eta],
                  [
                    'Delay',
                    result.extraction.delay_minutes
                      ? result.extraction.delay_minutes >= 60
                        ? `${(result.extraction.delay_minutes / 60).toFixed(1)} hours`
                        : `${result.extraction.delay_minutes} minutes`
                      : null,
                  ],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-4 text-sm">
                    <span className="text-silver-500">{label}</span>
                    <span className={value ? 'text-silver-900 font-medium' : 'text-silver-300'}>
                      {value || 'not stated'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Step 3 — confidence */}
            <div className="p-4 rounded-xl border border-silver-200 mb-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-silver-500 mb-3">
                3 · Confidence
              </p>
              <div className="space-y-2.5">
                <ProgressBar
                  value={SOURCE_CONFIDENCE[result.source] ?? 70}
                  label={`Source — ${SOURCE_LABEL[result.source]}`}
                  tone={(SOURCE_CONFIDENCE[result.source] ?? 70) >= 80 ? 'good' : 'warning'}
                />
                <ProgressBar
                  value={result.extraction.extraction_confidence * 100}
                  label="Extraction quality"
                  tone={result.extraction.extraction_confidence >= 0.8 ? 'good' : 'warning'}
                />
                <ProgressBar
                  value={result.confidence}
                  label="Combined"
                  tone={result.confidence >= 80 ? 'good' : result.confidence >= 60 ? 'warning' : 'critical'}
                />
              </div>
            </div>

            <Button
              className="w-full"
              icon={Icons.Send}
              onClick={queueIt}
              disabled={!result.match.shipment}
            >
              Queue for approval
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
};

/* ===== Approval queue ===== */

const ApprovalQueue = ({ queue, shipments, user }) => {
  const [open, setOpen] = useState(null);
  const [edited, setEdited] = useState('');

  const pending = queue.filter((q) => q.status === 'pending');

  const openItem = (item) => {
    setOpen(item);
    setEdited(item.extraction?.label || '');
  };

  // Approving is one call, not four. The server writes the event, moves the
  // consignment, closes the queue item and notifies the customer inside a
  // single handler — which is the only way those four things cannot end up
  // disagreeing with each other because a browser lost signal halfway.
  const approve = async (item, labelOverride) => {
    const label = labelOverride ?? item.extraction.label;
    try {
      await post(`/api/inbox/${encodeURIComponent(item.id)}/approve`, { label });
    } catch (err) {
      toast.error('Not published', { description: err.message });
      return;
    }
    await Promise.all(['inboxQueue', 'shipments', 'shipmentEvents', 'notifications'].map(db.refresh));
    toast.success('Published', { description: `${item.shipmentId} updated and the customer notified.` });
    setOpen(null);
  };

  const reject = async (item) => {
    try {
      await post(`/api/inbox/${encodeURIComponent(item.id)}/reject`);
    } catch (err) {
      toast.error('Not rejected', { description: err.message });
      return;
    }
    await db.refresh('inboxQueue');
    toast.success('Rejected', { description: 'Nothing was published.' });
    setOpen(null);
  };

  if (!pending.length) {
    return (
      <Card>
        <EmptyState
          icon={Icons.CheckCheck}
          title="Queue is clear"
          description="Processed updates waiting on a human land here. Nothing reaches a customer until someone approves it."
        />
      </Card>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Awaiting approval" value={pending.length} icon={Icons.Inbox} tone="warning" />
        <StatCard
          label="Low confidence"
          value={pending.filter((q) => q.confidence < 70).length}
          icon={Icons.ShieldQuestion}
          tone={pending.some((q) => q.confidence < 70) ? 'warning' : 'good'}
          deltaLabel="check these first"
        />
        <StatCard
          label="Exceptions"
          value={pending.filter((q) => ['exception', 'delay'].includes(q.extraction?.type)).length}
          icon={Icons.TriangleAlert}
          tone={pending.some((q) => ['exception', 'delay'].includes(q.extraction?.type)) ? 'critical' : 'good'}
        />
        <StatCard
          label="From WhatsApp"
          value={pending.filter((q) => q.source === 'whatsapp').length}
          icon={Icons.MessageCircle}
        />
      </div>

      <div className="space-y-4">
        {pending.map((item) => {
          const SourceIcon = SOURCE_ICON[item.source] || Icons.Inbox;
          return (
            <Card key={item.id} className="cursor-pointer card-hover" onClick={() => openItem(item)}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex gap-4 min-w-0">
                  <span className="w-10 h-10 rounded-xl bg-silver-100 flex items-center justify-center shrink-0">
                    <SourceIcon size={17} className="text-silver-500" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-medium text-silver-900 tabular-nums">{item.shipmentId}</span>
                      <Badge tone={TYPE_TONE[item.extraction?.type]}>
                        {EVENT_TYPE_LABEL[item.extraction?.type] || 'Update'}
                      </Badge>
                      <Badge tone="neutral">{MATCH_METHODS[item.matchedBy] || 'matched'}</Badge>
                    </div>
                    <p className="font-medium text-silver-800">{item.extraction?.label}</p>
                    <p className="text-sm text-silver-500 mt-1 italic line-clamp-2">“{item.rawText}”</p>
                    <p className="text-xs text-silver-400 mt-1.5">
                      {SOURCE_LABEL[item.source]} · {timeLabel(item.receivedAt)}
                      {item.fromPhone ? ` · ${item.fromPhone}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <p className="text-[11px] uppercase tracking-wider text-silver-400">Confidence</p>
                    <p
                      className={`text-lg font-display font-bold tabular-nums ${
                        item.confidence >= 80
                          ? 'text-[#006300]'
                          : item.confidence >= 60
                          ? 'text-[#b07800]'
                          : 'text-[#d03b3b]'
                      }`}
                    >
                      {item.confidence}%
                    </p>
                  </div>
                  <Icons.ChevronRight size={18} className="text-silver-300" />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Drawer
        open={Boolean(open)}
        onClose={() => setOpen(null)}
        title={open ? `Review — ${open.shipmentId}` : ''}
        subtitle={open ? `${SOURCE_LABEL[open.source]} · ${timeLabel(open.receivedAt)}` : ''}
        footer={
          open && (
            <div className="flex gap-3">
              <Button className="flex-1" icon={Icons.Check} onClick={() => approve(open, edited)}>
                Approve &amp; publish
              </Button>
              <Button variant="secondary" icon={Icons.X} onClick={() => reject(open)}>
                Reject
              </Button>
            </div>
          )
        }
      >
        {open && (
          <div className="space-y-5">
            <div className="p-4 rounded-xl bg-silver-50 border border-silver-200">
              <p className="text-xs font-semibold uppercase tracking-wider text-silver-400 mb-1.5">
                What actually came in
              </p>
              <p className="text-sm text-silver-700 italic">“{open.rawText}”</p>
              {open.fromPhone && (
                <p className="text-xs text-silver-400 mt-2">From {open.fromPhone}</p>
              )}
            </div>

            <Field
              label="Customer-facing summary"
              hint="This is the wording the customer will read. Edit it freely."
            >
              <TextArea rows={2} value={edited} onChange={(e) => setEdited(e.target.value)} />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              {[
                ['Event type', EVENT_TYPE_LABEL[open.extraction?.type]],
                ['Location', open.extraction?.location_text || '—'],
                ['Status change', open.extraction?.status_hint || 'none'],
                ['Matched by', MATCH_METHODS[open.matchedBy] || '—'],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-[11px] uppercase tracking-wider text-silver-400">{label}</p>
                  <p className="text-sm font-medium text-silver-800 mt-0.5">{value}</p>
                </div>
              ))}
            </div>

            {open.extraction?.status_hint && (
              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-primary-50 border border-primary-200 text-sm text-primary-900">
                <Icons.Info size={16} className="mt-0.5 shrink-0" />
                Approving will move {open.shipmentId} to{' '}
                <span className="font-semibold">{open.extraction.status_hint}</span>
                {open.extraction.location_text ? ` and place it at ${open.extraction.location_text}` : ''}, then
                notify the customer.
              </div>
            )}

            <ProgressBar
              value={open.confidence}
              label="Combined confidence"
              tone={open.confidence >= 80 ? 'good' : open.confidence >= 60 ? 'warning' : 'critical'}
            />
          </div>
        )}
      </Drawer>
    </>
  );
};

/* ===== Timeline ===== */

const Timeline = ({ events, shipments }) => {
  const [filter, setFilter] = useState('');

  const rows = useMemo(
    () =>
      [...events]
        .filter((e) => !filter || e.shipmentId === filter)
        .sort((a, b) => new Date(b.at) - new Date(a.at)),
    [events, filter]
  );

  return (
    <Card padded={false}>
      <div className="table-card-head">
        <SectionHeading
          title="Published events"
          description="The consignment history a customer sees. Every row was approved by a person."
          action={
            <div className="w-56">
              <Select value={filter} onChange={(e) => setFilter(e.target.value)}>
                <option value="">All consignments</option>
                {shipments.map((s) => (
                  <option key={s.id} value={s.id}>{s.id}</option>
                ))}
              </Select>
            </div>
          }
        />
      </div>
      <DataTable
        columns={[
          { key: 'at', label: 'When', render: (r) => timeLabel(r.at) },
          { key: 'shipmentId', label: 'Consignment', mono: true },
          {
            key: 'type',
            label: 'Type',
            render: (r) => <Badge tone={TYPE_TONE[r.type]}>{EVENT_TYPE_LABEL[r.type] || r.type}</Badge>,
          },
          { key: 'label', label: 'Event', render: (r) => <span className="text-silver-800">{r.label}</span> },
          { key: 'locationText', label: 'Location', render: (r) => r.locationText || '—' },
          {
            key: 'source',
            label: 'Source',
            render: (r) => <span className="text-xs text-silver-500">{SOURCE_LABEL[r.source] || r.source}</span>,
          },
          {
            key: 'confidence',
            label: 'Confidence',
            align: 'right',
            render: (r) => `${r.confidence}%`,
          },
        ]}
        rows={rows}
        empty="No events published yet."
      />
    </Card>
  );
};

/* ===== How it works ===== */

const HowItWorks = () => (
  <div className="grid lg:grid-cols-2 gap-6">
    <Card>
      <SectionHeading
        title="The pipeline"
        description="Deliberately ordered so the model only does the part a model is good at."
      />
      <ol className="space-y-4">
        {Object.values(describeExtractionPath()).map((step, i) => (
          <li key={step} className="flex gap-4">
            <span className="w-7 h-7 rounded-lg bg-primary-50 text-primary-700 text-sm font-bold flex items-center justify-center shrink-0">
              {i + 1}
            </span>
            <p className="text-sm text-silver-700">{step}</p>
          </li>
        ))}
      </ol>

      <div className="mt-6 p-4 rounded-xl bg-silver-50 border border-silver-200 text-sm text-silver-600">
        <p className="font-medium text-silver-800 mb-1.5">Why matching comes first</p>
        Working out <em>which</em> consignment an update belongs to is a lookup with reliable keys —
        a reference, a container, a registration, a phone number. That is faster, cheaper and more
        correct as code. The model is only asked <em>what happened</em>.
      </div>

      <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-900">
        <p className="font-medium mb-1.5">Why nothing auto-publishes</p>
        A forwarded WhatsApp message is the least reliable input in the business. Everything is
        scored and queued; a person approves before a customer is told anything.
      </div>
    </Card>

    <Card>
      <SectionHeading
        title="Source trust"
        description="How much each channel is believed before a human looks."
      />
      <div className="space-y-2.5 mb-6">
        {Object.entries(SOURCE_CONFIDENCE)
          .sort((a, b) => b[1] - a[1])
          .map(([key, value]) => (
            <ProgressBar
              key={key}
              value={value}
              label={SOURCE_LABEL[key]}
              tone={value >= 85 ? 'good' : value >= 70 ? 'primary' : 'warning'}
            />
          ))}
      </div>

      <div className="pt-5 border-t border-silver-200">
        <p className="text-xs font-semibold uppercase tracking-wider text-silver-400 mb-2.5">
          Model contract
        </p>
        <p className="text-sm text-silver-600 mb-3">
          The model is <em>forced</em> to call one tool, so it must answer with typed JSON rather
          than prose that has to be parsed:
        </p>
        <pre className="text-[11px] bg-silver-900 text-silver-100 rounded-xl p-3.5 overflow-x-auto custom-scroll">
{JSON.stringify(
  { name: EVENT_TOOL_SCHEMA.name, required: EVENT_TOOL_SCHEMA.input_schema.required,
    properties: Object.keys(EVENT_TOOL_SCHEMA.input_schema.properties) },
  null, 2
)}
        </pre>
        <p className="text-xs text-silver-400 mt-3">
          The API key never leaves the server; the browser posts to{' '}
          <code>/api/events/extract</code> and gets back a plain object. If the model is
          unavailable the local rules answer instead and the event is tagged{' '}
          <strong>Rules</strong> — an update at three in the morning from a border post still gets
          queued.
        </p>
      </div>
    </Card>
  </div>
);

export default UpdateInbox;
