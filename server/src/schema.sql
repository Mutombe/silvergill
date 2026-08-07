-- Silvergill operations schema.
--
-- Mirrors the collections the portal already reads, so the client's shape does
-- not have to change — only where the data comes from.
--
-- Two rules run through the whole design:
--   · every externally-visible record carries the owner it is scoped to
--     (customer_id or supplier_id), so the API can filter server-side rather
--     than trusting the browser;
--   · ids are the human-readable references the business already uses
--     (SHP-24118, INV-40118), because they appear on paperwork.

create table if not exists customers (
  id            text primary key,
  name          text not null,
  bc_no         text,
  entity        text not null,
  terms         text,
  credit_limit  numeric(14,2) default 0,
  created_at    timestamptz not null default now()
);

create table if not exists suppliers (
  id       text primary key,
  name     text not null,
  type     text,
  entity   text,
  rating   numeric(3,2),
  bc_no    text
);

create table if not exists users (
  id             text primary key,
  name           text not null,
  email          citext unique not null,
  password_hash  text not null,
  role           text not null check (role in ('admin','management','ops','sales','driver','supplier','client')),
  entity         text,
  title          text,
  customer_id    text references customers(id) on delete set null,
  supplier_id    text references suppliers(id) on delete set null,
  active         boolean not null default true,
  last_sign_in_at timestamptz,
  created_at     timestamptz not null default now(),
  -- An external account without its scope record would see everything or
  -- nothing; neither is acceptable, so the database refuses it.
  constraint client_needs_customer check (role <> 'client' or customer_id is not null),
  constraint supplier_needs_supplier check (role <> 'supplier' or supplier_id is not null)
);

create table if not exists drivers (
  id         text primary key,
  name       text not null,
  licence    text,
  expiry     date,
  entity     text,
  vehicle_id text,
  score      integer,
  phone      text
);

create table if not exists vehicles (
  id                   text primary key,
  reg                  text not null,
  make                 text,
  model                text,
  year                 integer,
  type                 text,
  odometer             integer default 0,
  entity               text,
  status               text,
  driver_id            text references drivers(id) on delete set null,
  last_service_km      integer,
  service_interval_km  integer,
  fuel_tank_l          integer,
  tyres                jsonb not null default '[]'::jsonb
);

alter table drivers
  drop constraint if exists drivers_vehicle_fk;
alter table drivers
  add constraint drivers_vehicle_fk
  foreign key (vehicle_id) references vehicles(id) on delete set null;

create table if not exists shipments (
  id               text primary key,
  customer_id      text not null references customers(id) on delete restrict,
  commodity        text,
  weight_tons      numeric(10,2),
  origin           text,
  destination      text,
  mode             text,
  port             text,
  border           text,
  vehicle_id       text references vehicles(id) on delete set null,
  driver_id        text references drivers(id) on delete set null,
  status           text not null default 'Planned',
  entity           text,
  revenue          numeric(14,2) default 0,
  cost             numeric(14,2) default 0,
  dispatched_at    date,
  eta_at           date,
  bc_order_no      text,
  current_location text,
  container_no     text,
  truck_reg        text,
  driver_phone     text,
  tracking_token   text unique,
  created_at       timestamptz not null default now()
);

create index if not exists shipments_customer_idx on shipments(customer_id);
create index if not exists shipments_token_idx on shipments(tracking_token);
create index if not exists shipments_status_idx on shipments(status);

create table if not exists shipment_events (
  id            text primary key,
  shipment_id   text not null references shipments(id) on delete cascade,
  type          text not null default 'update',
  label         text not null,
  location_text text,
  status_hint   text,
  source        text,
  confidence    integer,
  approved      boolean not null default false,
  raw_text      text,
  matched_by    text,
  at            timestamptz not null default now(),
  approved_at   timestamptz
);

create index if not exists shipment_events_shipment_idx on shipment_events(shipment_id);
create index if not exists shipment_events_approved_idx on shipment_events(approved);

create table if not exists inbox_queue (
  id          text primary key,
  shipment_id text references shipments(id) on delete cascade,
  source      text,
  raw_text    text,
  from_phone  text,
  matched_by  text,
  confidence  integer,
  extraction  jsonb,
  status      text not null default 'pending',
  received_at timestamptz not null default now(),
  approved_at timestamptz
);

create table if not exists quotations (
  id            text primary key,
  customer_id   text not null references customers(id) on delete restrict,
  commodity     text,
  origin        text,
  destination   text,
  weight_tons   numeric(10,2),
  mode          text,
  port          text,
  insurance     boolean default false,
  insured_value numeric(14,2),
  status        text not null default 'Draft',
  total         numeric(14,2),
  margin        numeric(6,2),
  created_by    text references users(id) on delete set null,
  created_at    date not null default current_date,
  responded_at  timestamptz
);

create index if not exists quotations_customer_idx on quotations(customer_id);

create table if not exists invoices (
  id          text primary key,
  customer_id text not null references customers(id) on delete restrict,
  shipment_id text references shipments(id) on delete set null,
  entity      text,
  issued_at   date,
  due_at      date,
  amount      numeric(14,2) not null default 0,
  paid_amount numeric(14,2) not null default 0,
  currency    text not null default 'USD',
  status      text not null default 'Outstanding',
  bc_no       text,
  lines       jsonb not null default '[]'::jsonb
);

create index if not exists invoices_customer_idx on invoices(customer_id);

create table if not exists bookings (
  id          text primary key,
  customer_id text not null references customers(id) on delete restrict,
  commodity   text,
  weight_tons numeric(10,2),
  origin_code text,
  port_code   text,
  mode_code   text,
  ready_date  date,
  notes       text,
  reference   text,
  status      text not null default 'Requested',
  raised_by   text references users(id) on delete set null,
  raised_at   timestamptz not null default now(),
  shipment_id text references shipments(id) on delete set null
);

create index if not exists bookings_customer_idx on bookings(customer_id);

create table if not exists documents (
  id          text primary key,
  shipment_id text references shipments(id) on delete cascade,
  type        text,
  file_name   text,
  status      text not null default 'Needs Review',
  confidence  numeric(4,3),
  uploaded_at timestamptz not null default now(),
  bc_ref      text,
  fields      jsonb not null default '{}'::jsonb
);

create index if not exists documents_shipment_idx on documents(shipment_id);

create table if not exists jobs (
  id             text primary key,
  shipment_id    text references shipments(id) on delete set null,
  supplier_id    text not null references suppliers(id) on delete restrict,
  description    text,
  status         text not null default 'Offered',
  value          numeric(14,2),
  currency       text not null default 'USD',
  issued_at      date,
  due_at         date,
  responded_at   timestamptz,
  last_update    text,
  last_update_at timestamptz
);

create index if not exists jobs_supplier_idx on jobs(supplier_id);

create table if not exists supplier_invoices (
  id             text primary key,
  supplier_id    text not null references suppliers(id) on delete restrict,
  job_id         text references jobs(id) on delete set null,
  invoice_number text,
  amount         numeric(14,2),
  currency       text not null default 'USD',
  status         text not null default 'Submitted',
  submitted_at   timestamptz not null default now(),
  notes          text,
  bc_ref         text
);

create index if not exists supplier_invoices_supplier_idx on supplier_invoices(supplier_id);

create table if not exists rate_requests (
  id          text primary key,
  lane        text,
  commodity   text,
  weight_tons numeric(10,2),
  mode_code   text,
  needed_by   date,
  status      text not null default 'Open',
  raised_by   text references users(id) on delete set null,
  raised_at   timestamptz not null default now(),
  invited     jsonb not null default '[]'::jsonb,
  responses   jsonb not null default '[]'::jsonb,
  awarded_to  text references suppliers(id) on delete set null
);

create table if not exists job_cards (
  id           text primary key,
  vehicle_id   text not null references vehicles(id) on delete cascade,
  status       text not null default 'Open',
  priority     text,
  fault        text,
  odometer     integer,
  parts        jsonb not null default '[]'::jsonb,
  labour_hours numeric(6,2),
  labour_rate  numeric(8,2),
  raised_by    text references users(id) on delete set null,
  raised_at    timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists job_cards_vehicle_idx on job_cards(vehicle_id);

create table if not exists service_records (
  id           text primary key,
  vehicle_id   text not null references vehicles(id) on delete cascade,
  type         text,
  odometer     integer,
  cost         numeric(12,2),
  performed_at date,
  notes        text
);

create table if not exists fuel_logs (
  id         text primary key,
  vehicle_id text not null references vehicles(id) on delete cascade,
  driver_id  text references drivers(id) on delete set null,
  litres     numeric(10,2),
  cost       numeric(12,2),
  odometer   integer,
  station    text,
  logged_at  timestamptz not null default now(),
  synced     boolean not null default false
);

create table if not exists inspections (
  id           text primary key,
  vehicle_id   text not null references vehicles(id) on delete cascade,
  driver_id    text references drivers(id) on delete set null,
  odometer     integer,
  checks       jsonb not null default '{}'::jsonb,
  notes        text,
  photos       jsonb not null default '[]'::jsonb,
  inspected_at timestamptz not null default now(),
  synced       boolean not null default false
);

create table if not exists incidents (
  id          text primary key,
  shipment_id text references shipments(id) on delete set null,
  vehicle_id  text references vehicles(id) on delete set null,
  driver_id   text references drivers(id) on delete set null,
  type        text,
  severity    text,
  description text,
  location    text,
  photos      jsonb not null default '[]'::jsonb,
  status      text not null default 'Open',
  reported_at timestamptz not null default now(),
  synced      boolean not null default false
);

create table if not exists pods (
  id          text primary key,
  shipment_id text not null references shipments(id) on delete cascade,
  driver_id   text references drivers(id) on delete set null,
  received_by text,
  notes       text,
  photos      jsonb not null default '[]'::jsonb,
  signature   text,
  lat         double precision,
  lng         double precision,
  captured_at timestamptz not null default now(),
  synced      boolean not null default false
);

create index if not exists pods_shipment_idx on pods(shipment_id);

create table if not exists notifications (
  id          text primary key,
  for_roles   jsonb,
  for_user_id text references users(id) on delete cascade,
  severity    text not null default 'info',
  title       text not null,
  body        text,
  link        text,
  read        boolean not null default false,
  at          timestamptz not null default now()
);

create index if not exists notifications_user_idx on notifications(for_user_id);

create table if not exists audit_log (
  id        text primary key,
  user_id   text references users(id) on delete set null,
  user_name text,
  role      text,
  action    text not null,
  entity    text,
  summary   text,
  at        timestamptz not null default now()
);

create index if not exists audit_log_at_idx on audit_log(at desc);

create table if not exists alert_rules (
  id         text primary key,
  name       text not null,
  metric     text,
  target     text,
  comparator text,
  threshold  numeric(10,2),
  channel    text,
  active     boolean not null default true
);

create table if not exists sync_queue (
  id         text primary key,
  entity     text,
  endpoint   text,
  record_id  text,
  label      text,
  payload    jsonb,
  status     text not null default 'pending',
  attempts   integer not null default 0,
  queued_at  timestamptz not null default now(),
  posted_at  timestamptz,
  bc_ref     text,
  error      text
);
