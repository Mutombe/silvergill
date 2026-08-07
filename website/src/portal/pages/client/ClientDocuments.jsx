import React, { useMemo, useState } from 'react';
import * as Icons from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '../../auth/AuthContext';
import { useCollection } from '../../hooks';
import { fieldLabel } from '../../engine/extraction';

import {
  Badge, Button, Card, DataTable, Drawer, EmptyState, SearchInput,
  SectionHeading, Tabs, statusTone, timeLabel, dateLabel,
} from '../../components/ui';

/* ===========================================================================
   Customer document library — everything filed against their own consignments,
   plus the signed PODs. Scoped by customerId via the shipments they own.
   =========================================================================== */

const ClientDocuments = () => {
  const { scope } = useAuth();
  const shipments = useCollection('shipments');
  const documents = useCollection('documents');
  const pods = useCollection('pods');

  const [tab, setTab] = useState('documents');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(null);

  // The set of consignments this customer owns is the security boundary.
  const myShipmentIds = useMemo(
    () => new Set(shipments.filter((s) => s.customerId === scope.customerId).map((s) => s.id)),
    [shipments, scope.customerId]
  );

  const myDocuments = useMemo(
    () => documents.filter((d) => d.shipmentId && myShipmentIds.has(d.shipmentId)),
    [documents, myShipmentIds]
  );

  const myPods = useMemo(
    () => pods.filter((p) => myShipmentIds.has(p.shipmentId)),
    [pods, myShipmentIds]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return myDocuments;
    return myDocuments.filter(
      (d) =>
        d.fileName.toLowerCase().includes(q) ||
        d.type.toLowerCase().includes(q) ||
        (d.shipmentId || '').toLowerCase().includes(q) ||
        JSON.stringify(d.fields || {}).toLowerCase().includes(q)
    );
  }, [myDocuments, query]);

  const download = (doc) => {
    // A real deployment streams the stored original from the document service.
    const payload = JSON.stringify({ document: doc.type, shipment: doc.shipmentId, fields: doc.fields }, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${doc.fileName.replace(/\.[^.]+$/, '')}-extract.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Download started', { description: doc.fileName });
  };

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold text-silver-900">
          Documents & Proof of Delivery
        </h1>
        <p className="text-silver-500 mt-1.5 max-w-2xl">
          Every document filed against your consignments, searchable by any value on it.
        </p>
      </div>

      <Tabs
        tabs={[
          { key: 'documents', label: 'Documents', count: myDocuments.length },
          { key: 'pods', label: 'Proof of delivery', count: myPods.length },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'documents' && (
        <Card padded={false}>
          <div className="table-card-head">
            <SectionHeading
              title="Document library"
              action={
                <div className="w-full sm:w-64">
                  <SearchInput value={query} onChange={setQuery} placeholder="Search any field…" />
                </div>
              }
            />
          </div>
          {myDocuments.length === 0 ? (
            <EmptyState
              icon={Icons.FolderOpen}
              title="No documents filed yet"
              description="Bills of lading, invoices and customs paperwork appear here as we process them."
            />
          ) : (
            <DataTable
              onRowClick={setOpen}
              columns={[
                { key: 'type', label: 'Document', render: (r) => <span className="font-medium text-silver-900">{r.type}</span> },
                { key: 'fileName', label: 'File', render: (r) => <span className="text-xs text-silver-500">{r.fileName}</span> },
                { key: 'shipmentId', label: 'Consignment', mono: true },
                { key: 'uploadedAt', label: 'Filed', render: (r) => timeLabel(r.uploadedAt) },
                { key: 'status', label: 'Status', render: (r) => <Badge tone={statusTone(r.status)}>{r.status}</Badge> },
                {
                  key: 'action',
                  label: '',
                  render: (r) => (
                    <button
                      onClick={(e) => { e.stopPropagation(); download(r); }}
                      className="text-silver-400 hover:text-primary-600 p-1"
                      aria-label={`Download ${r.fileName}`}
                    >
                      <Icons.Download size={16} />
                    </button>
                  ),
                },
              ]}
              rows={filtered}
              empty="Nothing matches that search."
            />
          )}
        </Card>
      )}

      {tab === 'pods' && (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
          {myPods.length === 0 ? (
            <Card className="md:col-span-2 xl:col-span-3">
              <EmptyState
                icon={Icons.PenLine}
                title="No signed deliveries yet"
                description="A proof of delivery appears here the moment your consignment is signed for."
              />
            </Card>
          ) : (
            myPods.map((pod) => (
              <Card key={pod.id}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="font-display font-bold text-silver-900 tabular-nums">{pod.shipmentId}</p>
                    <p className="text-xs text-silver-400 mt-0.5">{timeLabel(pod.capturedAt)}</p>
                  </div>
                  <Badge tone="good" icon={Icons.Check}>Signed</Badge>
                </div>

                <p className="text-sm text-silver-600">
                  Received by <span className="font-medium text-silver-800">{pod.receivedBy}</span>
                </p>
                {pod.notes && <p className="text-xs text-silver-500 mt-1.5 italic">“{pod.notes}”</p>}

                {pod.signature && (
                  <img
                    src={pod.signature}
                    alt="Consignee signature"
                    className="mt-3 h-16 w-full object-contain bg-silver-50 rounded-lg border border-silver-200"
                  />
                )}

                {pod.photos?.length > 0 && (
                  <div className="flex gap-2 mt-3">
                    {pod.photos.slice(0, 4).map((photo, i) => (
                      <img
                        key={i}
                        src={photo.dataUrl}
                        alt=""
                        className="h-12 w-12 object-cover rounded-lg border border-silver-200"
                      />
                    ))}
                  </div>
                )}

                {pod.lat && (
                  <p className="text-[11px] text-silver-400 mt-3 tabular-nums flex items-center gap-1.5">
                    <Icons.MapPin size={11} />
                    {pod.lat.toFixed(4)}, {pod.lng.toFixed(4)}
                  </p>
                )}
              </Card>
            ))
          )}
        </div>
      )}

      <Drawer
        open={Boolean(open)}
        onClose={() => setOpen(null)}
        title={open?.type}
        subtitle={open?.fileName}
        footer={
          open && (
            <Button className="w-full" icon={Icons.Download} onClick={() => download(open)}>
              Download
            </Button>
          )
        }
      >
        {open && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-silver-400">Consignment</p>
                <p className="text-sm font-medium text-silver-800 mt-0.5 tabular-nums">{open.shipmentId}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-silver-400">Filed</p>
                <p className="text-sm font-medium text-silver-800 mt-0.5">{dateLabel(open.uploadedAt)}</p>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-silver-400 mb-2.5">
                Document detail
              </p>
              <div className="space-y-2">
                {Object.entries(open.fields || {}).map(([key, value]) => (
                  <div key={key} className="flex justify-between gap-4 text-sm py-2 border-b border-silver-100 last:border-0">
                    <span className="text-silver-500">{fieldLabel(key)}</span>
                    <span className="text-silver-900 font-medium text-right">
                      {typeof value === 'object' ? value.value : value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default ClientDocuments;
