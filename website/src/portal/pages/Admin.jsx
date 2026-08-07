import React, { useMemo, useState } from 'react';
import * as Icons from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '../auth/AuthContext';
import { useCollection, usePendingSync, useOnlineStatus } from '../hooks';
import * as db from '../data/db';
import { patch as patchApi, post } from '../data/api';
import { record } from '../data/activity';
import { BC_ENDPOINTS } from '../data/bcClient';
import { modules } from '../modules';
import { ROLES, ROLE_LABELS, ROLE_DESCRIPTIONS, ROLE_AUDIENCE } from '../data/seed';

import {
  Badge, Button, Card, DataTable, Drawer, EmptyState, Field, Input, Select,
  SearchInput, SectionHeading, StatCard, Tabs, Toggle, timeLabel, num, DensityProvider,
} from '../components/ui';
import ModuleHeader from '../components/ModuleHeader';
import ErpDashboard from './admin/ErpDashboard';

/* ===========================================================================
   Admin panel — the only place accounts, permissions and integration settings
   can be changed. Every mutation here writes an audit entry.
   =========================================================================== */

const Admin = () => {
  const [tab, setTab] = useState('erp');

  const users = useCollection('users');
  const auditLog = useCollection('auditLog');
  const pending = usePendingSync();

  const inactive = users.filter((u) => u.active === false);

  return (
    // The whole admin area runs compact: a finance director should see rows,
    // not whitespace. Every padding below derives from this one setting.
    <DensityProvider value="compact" className="space-y-4 max-w-[1600px]">
      <ModuleHeader
        title="Admin Panel"
        blurb="Accounts, roles and permissions, the audit trail, Business Central integration and system health."
        pending={pending}
      />

      <Tabs
        tabs={[
          { key: 'erp', label: 'ERP dashboard' },
          { key: 'overview', label: 'System' },
          { key: 'users', label: 'Users', count: users.length },
          { key: 'roles', label: 'Roles & permissions' },
          { key: 'audit', label: 'Audit trail', count: auditLog.length },
          { key: 'integration', label: 'Integration' },
          { key: 'data', label: 'Data' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'erp' && <ErpDashboard />}
      {tab === 'overview' && <Overview users={users} inactive={inactive} auditLog={auditLog} />}
      {tab === 'users' && <UserAdmin users={users} />}
      {tab === 'roles' && <RolesMatrix users={users} />}
      {tab === 'audit' && <AuditTrail entries={auditLog} />}
      {tab === 'integration' && <Integration />}
      {tab === 'data' && <DataAdmin />}
    </DensityProvider>
  );
};

/* ===== Overview ===== */

const Overview = ({ users, inactive, auditLog }) => {
  const online = useOnlineStatus();
  const queue = useCollection('syncQueue');
  const shipments = useCollection('shipments');
  const documents = useCollection('documents');

  const failed = queue.filter((q) => q.status === 'failed');
  const pending = queue.filter((q) => q.status === 'pending');

  const collections = [
    { name: 'Users', key: 'users' },
    { name: 'Customers', key: 'customers' },
    { name: 'Shipments', key: 'shipments' },
    { name: 'Quotations', key: 'quotations' },
    { name: 'Documents', key: 'documents' },
    { name: 'Invoices', key: 'invoices' },
    { name: 'Vehicles', key: 'vehicles' },
    { name: 'Job cards', key: 'jobCards' },
    { name: 'Suppliers', key: 'suppliers' },
    { name: 'Work orders', key: 'jobs' },
    { name: 'Bookings', key: 'bookings' },
    { name: 'Audit entries', key: 'auditLog' },
  ];

  const health = [
    {
      name: 'Portal application',
      status: 'Operational',
      tone: 'good',
      detail: 'All modules responding.',
    },
    {
      name: 'Connectivity',
      status: online ? 'Online' : 'Offline',
      tone: online ? 'good' : 'warning',
      detail: online ? 'Device has a live connection.' : 'Captures are queueing locally.',
    },
    {
      name: 'Business Central sync',
      status: failed.length ? 'Degraded' : pending.length ? 'Backlog' : 'Operational',
      tone: failed.length ? 'critical' : pending.length ? 'warning' : 'good',
      detail: failed.length
        ? `${failed.length} record(s) failed to post.`
        : pending.length
        ? `${pending.length} record(s) waiting.`
        : 'Queue is empty.',
    },
    {
      name: 'Document extraction',
      status: 'Operational',
      tone: 'good',
      detail: `${documents.filter((d) => d.status === 'Needs Review').length} awaiting human review.`,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Accounts"
          value={users.length}
          icon={Icons.Users}
          deltaLabel={inactive.length ? `${inactive.length} deactivated` : 'all active'}
        />
        <StatCard
          label="Sync backlog"
          value={pending.length + failed.length}
          icon={Icons.RefreshCw}
          tone={failed.length ? 'critical' : pending.length ? 'warning' : 'good'}
          deltaLabel={failed.length ? `${failed.length} failed` : 'nothing failed'}
        />
        <StatCard label="Shipments on file" value={shipments.length} icon={Icons.Ship} />
        <StatCard
          label="Audit entries"
          value={auditLog.length}
          icon={Icons.ScrollText}
          deltaLabel="since deployment"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <SectionHeading title="System health" />
          <div className="space-y-3">
            {health.map((item) => (
              <div
                key={item.name}
                className="flex items-start justify-between gap-3 p-3.5 rounded-xl border border-silver-200"
              >
                <div>
                  <p className="text-sm font-medium text-silver-900">{item.name}</p>
                  <p className="text-xs text-silver-500 mt-0.5">{item.detail}</p>
                </div>
                <Badge tone={item.tone}>{item.status}</Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <SectionHeading title="Record counts" description="What is currently held in the store." />
          <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
            {collections.map((collection) => (
              <div key={collection.key} className="flex justify-between text-sm py-1.5 border-b border-silver-100">
                <span className="text-silver-500">{collection.name}</span>
                <span className="font-medium text-silver-900 tabular-nums">
                  {num(db.read(collection.key).length)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card padded={false}>
        <div className="table-card-head">
          <SectionHeading title="Latest activity" description="The ten most recent audited actions." />
        </div>
        <DataTable
          columns={[
            { key: 'at', label: 'When', render: (r) => timeLabel(r.at) },
            { key: 'userName', label: 'User', render: (r) => <span className="font-medium text-silver-900">{r.userName}</span> },
            { key: 'role', label: 'Role', render: (r) => <Badge tone="neutral">{ROLE_LABELS[r.role] || r.role}</Badge> },
            { key: 'action', label: 'Action', render: (r) => <code className="text-xs text-silver-500">{r.action}</code> },
            { key: 'summary', label: 'Detail' },
          ]}
          rows={[...auditLog].sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 10)}
          empty="Nothing recorded yet."
        />
      </Card>
    </div>
  );
};

/* ===== Users ===== */

const BLANK_USER = {
  name: '', email: '', password: '', role: 'ops', entity: 'Zimbabwe',
  title: '', customerId: '', supplierId: '', active: true,
};

const UserAdmin = ({ users }) => {
  const { user: me } = useAuth();
  const customers = useCollection('customers');
  const suppliers = useCollection('suppliers');

  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(BLANK_USER);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter(
      (u) =>
        (!roleFilter || u.role === roleFilter) &&
        (!q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.title || '').toLowerCase().includes(q))
    );
  }, [users, query, roleFilter]);

  const openNew = () => {
    setForm(BLANK_USER);
    setEditing('new');
  };

  const openEdit = (row) => {
    setForm({ ...BLANK_USER, ...row, password: '' });
    setEditing(row.id);
  };

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const save = async (event) => {
    event.preventDefault();

    const payload = {
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      role: form.role,
      entity: form.entity,
      title: form.title.trim(),
      active: form.active,
      customerId: form.role === 'client' ? form.customerId || null : null,
      supplierId: form.role === 'supplier' ? form.supplierId || null : null,
    };

    // An external account without its scope record would see nothing — or, if
    // a screen forgot to filter, everything. Refuse to create one.
    if (payload.role === 'client' && !payload.customerId) {
      toast.error('A customer account must be linked to a customer record.');
      return;
    }
    if (payload.role === 'supplier' && !payload.supplierId) {
      toast.error('A contractor account must be linked to a supplier record.');
      return;
    }

    const clash = users.find((u) => u.email === payload.email && u.id !== editing);
    if (clash) {
      toast.error('That email address is already in use.');
      return;
    }

    // Accounts are created and changed on the server. The password is posted
    // once and hashed there; it is never held in the browser's store, and the
    // API refuses these calls for anyone who is not an administrator — the
    // checks above are courtesy, not enforcement.
    try {
      if (editing === 'new') {
        if (!form.password || form.password.length < 8) {
          toast.error('Set a password of at least eight characters.');
          return;
        }
        await post('/api/users', { ...payload, password: form.password });
        toast.success(`${payload.name} created`, { description: ROLE_LABELS[payload.role] });
      } else {
        const changes = { name: payload.name, title: payload.title, entity: payload.entity,
                          role: payload.role, active: payload.active };
        if (form.password) changes.password = form.password;
        await patchApi(`/api/users/${encodeURIComponent(editing)}`, changes);
        toast.success(`${payload.name} updated`);
      }
      await db.refresh('users');
      setEditing(null);
    } catch (err) {
      toast.error('That could not be saved', { description: err.message });
    }
  };

  const toggleActive = async (row) => {
    if (row.id === me.id) {
      toast.error('You cannot deactivate your own account.');
      return;
    }
    const next = !row.active;
    try {
      await patchApi(`/api/users/${encodeURIComponent(row.id)}`, { active: next });
      await db.refresh('users');
      toast.success(`${row.name} ${next ? 'reactivated' : 'deactivated'}`, {
        description: next
          ? 'They can sign in again.'
          : 'Their next request is rejected — an open session does not survive this.',
      });
    } catch (err) {
      toast.error('That could not be saved', { description: err.message });
    }
  };

  return (
    <>
      <Card padded={false}>
        <div className="table-card-head">
          <SectionHeading
            title="User accounts"
            description="Staff, contractors and customers. External accounts must be pinned to their own record."
            action={
              <Button size="sm" icon={Icons.UserPlus} onClick={openNew}>
                Add user
              </Button>
            }
          />
          <div className="flex flex-wrap gap-3 mb-5">
            <div className="flex-1 min-w-[14rem]">
              <SearchInput value={query} onChange={setQuery} placeholder="Search name, email or title…" />
            </div>
            <div className="w-48">
              <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                <option value="">All roles</option>
                {Object.values(ROLES).map((role) => (
                  <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                ))}
              </Select>
            </div>
          </div>
        </div>

        <DataTable
          onRowClick={openEdit}
          sortable
          pageSize={12}
          initialSort={{ key: 'name', dir: 'asc' }}
          minWidth={860}
          columns={[
            {
              key: 'name',
              label: 'User',
              maxWidth: '15rem',
              sortValue: (r) => r.name,
              render: (r) => (
                <span className="flex items-center gap-2.5 min-w-0">
                  <span className="w-7 h-7 rounded-lg bg-silver-100 text-silver-600 text-[10px] font-bold flex items-center justify-center shrink-0">
                    {(r.name || '?').split(' ').map((p) => p[0]).slice(0, 2).join('')}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-medium text-silver-900 truncate">{r.name}</span>
                    <span className="block text-[11px] text-silver-400 truncate">{r.email}</span>
                  </span>
                </span>
              ),
            },
            {
              key: 'role',
              label: 'Role',
              sortValue: (r) => ROLE_LABELS[r.role] || r.role,
              render: (r) => (
                <Badge tone={r.role === 'admin' ? 'violet' : ROLE_AUDIENCE[r.role] === 'staff' ? 'info' : 'neutral'}>
                  {ROLE_LABELS[r.role] || r.role}
                </Badge>
              ),
            },
            {
              key: 'title',
              label: 'Position',
              maxWidth: '13rem',
              render: (r) => <span className="text-[11px] text-silver-500">{r.title}</span>,
            },
            { key: 'entity', label: 'Entity' },
            {
              key: 'lastSignInAt',
              label: 'Last sign-in',
              render: (r) => (r.lastSignInAt ? timeLabel(r.lastSignInAt) : <span className="text-silver-300">Never</span>),
            },
            {
              key: 'active',
              label: 'Status',
              sortValue: (r) => (r.active === false ? 'Deactivated' : 'Active'),
              render: (r) => (
                <Badge tone={r.active === false ? 'critical' : 'good'}>
                  {r.active === false ? 'Deactivated' : 'Active'}
                </Badge>
              ),
            },
            {
              key: 'action',
              label: '',
              sortable: false,
              align: 'right',
              render: (r) => (
                <button
                  onClick={(e) => { e.stopPropagation(); toggleActive(r); }}
                  className="text-[11px] font-medium text-silver-500 hover:text-primary-600 border border-silver-200 rounded-lg px-2 py-1 whitespace-nowrap"
                >
                  {r.active === false ? 'Reactivate' : 'Deactivate'}
                </button>
              ),
            },
          ]}
          rows={filtered}
          empty="No accounts match that filter."
          emptyDescription="Clear the search or role filter to see every account."
        />
      </Card>

      <Drawer
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'Add a user' : 'Edit user'}
        subtitle={editing === 'new' ? 'They can sign in as soon as you save.' : form.email}
        footer={
          <div className="flex gap-3">
            <Button className="flex-1" icon={Icons.Check} onClick={save}>
              {editing === 'new' ? 'Create account' : 'Save changes'}
            </Button>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
          </div>
        }
      >
        <form onSubmit={save} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Full name" required>
              <Input value={form.name} onChange={set('name')} required />
            </Field>
            <Field label="Email" required>
              <Input type="email" value={form.email} onChange={set('email')} required />
            </Field>
          </div>

          <Field label="Position / job title">
            <Input value={form.title} onChange={set('title')} placeholder="e.g. Operations Controller" />
          </Field>

          <Field label="Role" required hint={ROLE_DESCRIPTIONS[form.role]}>
            <Select value={form.role} onChange={set('role')}>
              {Object.values(ROLES).map((role) => (
                <option key={role} value={role}>{ROLE_LABELS[role]}</option>
              ))}
            </Select>
          </Field>

          {form.role === 'client' && (
            <Field label="Linked customer" required hint="This account will only ever see this customer's records.">
              <Select value={form.customerId} onChange={set('customerId')} required>
                <option value="">Select a customer…</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.bcNo})</option>
                ))}
              </Select>
            </Field>
          )}

          {form.role === 'supplier' && (
            <Field label="Linked contractor" required hint="This account will only ever see this contractor's work.">
              <Select value={form.supplierId} onChange={set('supplierId')} required>
                <option value="">Select a contractor…</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.bcNo})</option>
                ))}
              </Select>
            </Field>
          )}

          <Field label="Entity" required>
            <Select value={form.entity} onChange={set('entity')}>
              <option>Zimbabwe</option>
              <option>Mauritius</option>
              <option>Group</option>
              <option>Contractor</option>
            </Select>
          </Field>

          <Field
            label={editing === 'new' ? 'Password' : 'New password'}
            required={editing === 'new'}
            hint={editing === 'new' ? 'At least eight characters.' : 'Leave blank to keep the current password.'}
          >
            <Input type="text" value={form.password} onChange={set('password')} placeholder="••••••••" />
          </Field>

          <Toggle
            checked={form.active}
            onChange={(v) => setForm((f) => ({ ...f, active: v }))}
            label="Account active"
            description="A deactivated account cannot sign in and its sessions stop working."
          />
        </form>
      </Drawer>
    </>
  );
};

/* ===== Roles & permissions ===== */

const RolesMatrix = ({ users }) => {
  const roleList = Object.values(ROLES);

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        {roleList.map((role) => {
          const count = users.filter((u) => u.role === role).length;
          const allowed = modules.filter((m) => (role === 'admin' ? !m.roles?.includes('client') : !m.roles || m.roles.includes(role)));
          return (
            <Card key={role}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <p className="font-display font-semibold text-silver-900">{ROLE_LABELS[role]}</p>
                <Badge tone={ROLE_AUDIENCE[role] === 'staff' ? 'info' : ROLE_AUDIENCE[role] === 'customer' ? 'violet' : 'neutral'}>
                  {ROLE_AUDIENCE[role]}
                </Badge>
              </div>
              <p className="text-xs text-silver-500 mb-4">{ROLE_DESCRIPTIONS[role]}</p>
              <div className="flex justify-between text-sm pt-3 border-t border-silver-100">
                <span className="text-silver-500">Accounts</span>
                <span className="font-semibold text-silver-900 tabular-nums">{count}</span>
              </div>
              <div className="flex justify-between text-sm mt-1.5">
                <span className="text-silver-500">Modules</span>
                <span className="font-semibold text-silver-900 tabular-nums">{allowed.length}</span>
              </div>
            </Card>
          );
        })}
      </div>

      <Card padded={false}>
        <div className="table-card-head">
          <SectionHeading
            title="Permission matrix"
            description="Which role can open which module. Admin inherits every staff module."
          />
        </div>
        <div className="overflow-x-auto custom-scroll">
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className="border-b border-silver-200">
                <th className="px-5 md:px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-silver-500">
                  Module
                </th>
                {roleList.map((role) => (
                  <th
                    key={role}
                    className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider text-silver-500"
                  >
                    {role}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {modules.map((module) => (
                <tr key={module.key} className="border-b border-silver-100 last:border-0 hover:bg-silver-50/60">
                  <td className="px-5 md:px-6 py-3">
                    <span className="font-medium text-silver-900">{module.short}</span>
                    {module.number && (
                      <span className="text-xs text-silver-400 ml-2">Module {module.number}</span>
                    )}
                  </td>
                  {roleList.map((role) => {
                    const allowed =
                      role === 'admin'
                        ? !module.roles?.includes('client')
                        : !module.roles || module.roles.includes(role);
                    return (
                      <td key={role} className="px-3 py-3 text-center">
                        {allowed ? (
                          <Icons.Check size={16} className="text-emerald-600 inline" aria-label="Allowed" />
                        ) : (
                          <Icons.Minus size={16} className="text-silver-300 inline" aria-label="Not allowed" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

/* ===== Audit trail ===== */

const AuditTrail = ({ entries }) => {
  const [query, setQuery] = useState('');
  const [action, setAction] = useState('');

  const actions = useMemo(() => [...new Set(entries.map((e) => e.action))].sort(), [entries]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...entries]
      .sort((a, b) => new Date(b.at) - new Date(a.at))
      .filter(
        (e) =>
          (!action || e.action === action) &&
          (!q ||
            e.userName.toLowerCase().includes(q) ||
            e.summary.toLowerCase().includes(q) ||
            (e.entity || '').toLowerCase().includes(q))
      );
  }, [entries, query, action]);

  const exportCsv = () => {
    const rows = [
      ['Timestamp', 'User', 'Role', 'Action', 'Entity', 'Summary'],
      ...filtered.map((e) => [e.at, e.userName, e.role, e.action, e.entity || '', `"${e.summary.replace(/"/g, '""')}"`]),
    ];
    const blob = new Blob([rows.map((r) => r.join(',')).join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `silvergill-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`${filtered.length} entries exported`);
  };

  return (
    <Card padded={false}>
      <div className="table-card-head">
        <SectionHeading
          title="Audit trail"
          description="Every sign-in, capture, approval and administrative change."
          action={
            <Button size="sm" variant="secondary" icon={Icons.Download} onClick={exportCsv}>
              Export CSV
            </Button>
          }
        />
        <div className="flex flex-wrap gap-3 mb-5">
          <div className="flex-1 min-w-[14rem]">
            <SearchInput value={query} onChange={setQuery} placeholder="Search user, record or description…" />
          </div>
          <div className="w-56">
            <Select value={action} onChange={(e) => setAction(e.target.value)}>
              <option value="">All actions</option>
              {actions.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      <DataTable
        sortable
        pageSize={15}
        showDensityToggle
        initialSort={{ key: 'at', dir: 'desc' }}
        minWidth={900}
        columns={[
          { key: 'at', label: 'When', width: '9rem', render: (r) => timeLabel(r.at) },
          {
            key: 'userName',
            label: 'User',
            maxWidth: '10rem',
            render: (r) => <span className="font-medium text-silver-900">{r.userName}</span>,
          },
          { key: 'role', label: 'Role', render: (r) => ROLE_LABELS[r.role] || r.role },
          {
            key: 'action',
            label: 'Action',
            render: (r) => <code className="text-[11px] text-silver-500">{r.action}</code>,
          },
          { key: 'entity', label: 'Record', mono: true, maxWidth: '9rem' },
          { key: 'summary', label: 'Detail', maxWidth: '26rem' },
        ]}
        rows={filtered}
        empty="Nothing matches that filter."
        emptyDescription="Try a different action type, or clear the search."
      />
    </Card>
  );
};

/* ===== Integration ===== */

const Integration = () => {
  const queue = useCollection('syncQueue');
  const [settings, setSettings] = useState({
    tenant: 'silvergill.onmicrosoft.com',
    environment: 'Production',
    companyZw: 'Silvergill Logistics (Pvt) Ltd',
    companyMu: 'Silvergill Mauritius Ltd',
    baseUrl: 'https://api.businesscentral.dynamics.com/v2.0',
    autoPost: true,
    confidenceGate: 85,
  });

  const set = (key) => (e) => setSettings((s) => ({ ...s, [key]: e.target.value }));

  const save = () => {
    toast.success('Integration settings saved', {
      description: 'These are held locally until the API layer is connected.',
    });
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card>
        <SectionHeading
          title="Business Central connection"
          description="Where the portal posts its records."
        />
        <div className="space-y-4">
          <Field label="Tenant">
            <Input value={settings.tenant} onChange={set('tenant')} />
          </Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Environment">
              <Select value={settings.environment} onChange={set('environment')}>
                <option>Production</option>
                <option>Sandbox</option>
              </Select>
            </Field>
            <Field label="API base URL">
              <Input value={settings.baseUrl} onChange={set('baseUrl')} />
            </Field>
          </div>
          <Field label="Zimbabwe company">
            <Input value={settings.companyZw} onChange={set('companyZw')} />
          </Field>
          <Field label="Mauritius company">
            <Input value={settings.companyMu} onChange={set('companyMu')} />
          </Field>

          <div className="pt-2 space-y-4 border-t border-silver-200">
            <Toggle
              checked={settings.autoPost}
              onChange={(v) => setSettings((s) => ({ ...s, autoPost: v }))}
              label="Post automatically when a connection returns"
              description="Off means someone must press Sync BC."
            />
            <Field
              label="Document confidence gate"
              hint="Extractions below this go to a human before they can post."
            >
              <Input
                type="number"
                min="50"
                max="100"
                value={settings.confidenceGate}
                onChange={set('confidenceGate')}
              />
            </Field>
          </div>

          <Button icon={Icons.Save} onClick={save}>
            Save settings
          </Button>

          <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-900">
            <Icons.Info size={16} className="mt-0.5 shrink-0" />
            The portal is running against its local store. Replace <code>dispatch()</code> in{' '}
            <code>data/bcClient.js</code> with an authenticated call to post for real.
          </div>
        </div>
      </Card>

      <div className="space-y-6">
        <Card>
          <SectionHeading title="Endpoint map" description="Which record type lands where." />
          <div className="space-y-2">
            {Object.entries(BC_ENDPOINTS).map(([entity, endpoint]) => (
              <div key={entity} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-silver-200">
                <span className="text-sm font-medium text-silver-800 capitalize">{entity}</span>
                <code className="text-xs text-silver-500 truncate">{endpoint}</code>
              </div>
            ))}
          </div>
        </Card>

        <Card padded={false}>
          <div className="table-card-head">
            <SectionHeading title="Sync queue" description="Everything captured, and where it got to." />
          </div>
          <DataTable
            columns={[
              { key: 'label', label: 'Record', render: (r) => <span className="font-medium text-silver-900">{r.label}</span> },
              { key: 'entity', label: 'Type', render: (r) => <span className="capitalize">{r.entity}</span> },
              { key: 'queuedAt', label: 'Queued', render: (r) => timeLabel(r.queuedAt) },
              { key: 'attempts', label: 'Tries', align: 'right' },
              {
                key: 'status',
                label: 'Status',
                render: (r) => (
                  <Badge tone={r.status === 'posted' ? 'good' : r.status === 'failed' ? 'critical' : 'warning'}>
                    {r.status === 'posted' ? r.bcRef || 'Posted' : r.status}
                  </Badge>
                ),
              },
            ]}
            rows={queue}
            empty="Nothing has been queued."
          />
        </Card>
      </div>
    </div>
  );
};

/* ===== Data management ===== */

/** Collections worth putting in a snapshot. Reference data is skipped. */
const EXPORTABLE = [
  'shipments', 'shipmentEvents', 'quotations', 'invoices', 'bookings', 'documents',
  'jobs', 'supplierInvoices', 'rateRequests', 'jobCards', 'serviceRecords',
  'fuelLogs', 'inspections', 'incidents', 'pods', 'inboxQueue', 'auditLog',
  'customers', 'suppliers', 'vehicles', 'drivers',
];

const DataAdmin = () => {
  const { user: me } = useAuth();
  const [confirming, setConfirming] = useState(false);

  const exportAll = () => {
    // A snapshot of what this account is authorised to see, not of the
    // database — the server has already decided which rows reached us.
    const snapshot = { exportedAt: new Date().toISOString(), exportedBy: me?.email ?? null };
    for (const collection of EXPORTABLE) snapshot[collection] = db.read(collection);

    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `silvergill-portal-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    record(me, 'data.export', null, 'Exported a portal snapshot');
    toast.success('Export downloaded');
  };

  const reset = () => {
    db.resetStore();
    setConfirming(false);
    toast.success('Outbox cleared', {
      description: 'Unsent captures on this device have been discarded. Nothing on the server changed.',
    });
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card>
        <SectionHeading title="Export" description="A JSON snapshot of everything loaded for you." />
        <p className="text-sm text-silver-600 mb-5">
          Useful for handing a dataset to a developer or an auditor. It contains what your account
          is authorised to read and nothing more — photos and signatures are included as data URLs,
          so the file can be large.
        </p>
        <Button icon={Icons.Download} onClick={exportAll}>
          Export what I can see
        </Button>
      </Card>

      <Card>
        <SectionHeading
          title="Clear this device"
          description="Discard captures still waiting to sync."
        />
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-800 mb-5">
          <Icons.TriangleAlert size={16} className="mt-0.5 shrink-0" />
          This discards proofs of delivery, incidents, fuel logs and inspections captured offline on
          this device that have <strong>not</strong> reached the server yet. They cannot be
          recovered. Records already synced are untouched.
        </div>

        {confirming ? (
          <div className="flex gap-3">
            <Button variant="danger" icon={Icons.Trash2} onClick={reset}>
              Yes, discard the outbox
            </Button>
            <Button variant="secondary" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button variant="secondary" icon={Icons.RotateCcw} onClick={() => setConfirming(true)}>
            Clear the outbox
          </Button>
        )}
      </Card>
    </div>
  );
};

export default Admin;
