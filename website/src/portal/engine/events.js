// Shipment event extraction.
//
// Turns a messy field update — a driver's WhatsApp message, a clearing agent's
// note, a transcribed voice note, a tracking screenshot — into ONE structured
// shipment event that operations can review and approve.
//
// Two implementations of the same contract:
//   · extractEvent()      runs locally, deterministic, no network, always available
//   · EVENT_TOOL_SCHEMA   the tool definition for the hosted model call
//
// Everything downstream (matching, the approval queue, applying the event to a
// shipment) is identical either way, so switching the extractor on changes the
// accuracy of `label` and `location_text` and nothing else.

/**
 * The tool the model is forced to call. Forcing a tool call is what makes the
 * output reliable JSON rather than prose that has to be parsed.
 */
export const EVENT_TOOL_SCHEMA = {
  name: 'record_shipment_event',
  description: 'Record one structured logistics event extracted from a shipment update.',
  input_schema: {
    type: 'object',
    properties: {
      type: {
        type: 'string',
        enum: ['update', 'location', 'border_cross', 'departed', 'arrived', 'delay', 'exception', 'delivered', 'note'],
      },
      label: {
        type: 'string',
        description: "Short, client-facing summary, e.g. 'Crossed Beitbridge into Zimbabwe'.",
      },
      location_text: {
        type: 'string',
        description: "Place or landmark if stated (e.g. 'Musina', 'Beitbridge Border'); empty if none.",
      },
      status_hint: {
        type: 'string',
        enum: ['', 'Planned', 'In Transit', 'At Border', 'Awaiting Rail', 'On Water', 'Delayed', 'Delivered'],
        description: 'New shipment status only if clearly implied; otherwise empty.',
      },
      reference: { type: 'string', description: 'Any shipment ref, container or truck reg mentioned; empty if none.' },
      eta: { type: 'string', description: 'ETA if stated; empty if none.' },
      delay_minutes: { type: 'integer', description: 'Delay in minutes if stated; 0 otherwise.' },
    },
    required: ['type', 'label'],
  },
};

export const EVENT_SYSTEM_PROMPT =
  'You convert messy logistics updates into ONE structured shipment event. Use ONLY information ' +
  'present in the input — never invent a location, status, or ETA. If something is not stated, leave ' +
  'it empty or zero. Keep the label factual and concise.';

/**
 * How much a source is trusted before a human looks at it. An API feed is
 * near-certain; a forwarded WhatsApp message is the least reliable thing in
 * the business, and is scored accordingly.
 */
export const SOURCE_CONFIDENCE = {
  carrier_api: 100,
  screenshot: 90,
  manual: 90,
  voice: 80,
  coordinator: 80,
  whatsapp: 65,
  email: 75,
};

export const SOURCE_LABEL = {
  carrier_api: 'Carrier API',
  screenshot: 'Screenshot',
  manual: 'Keyed in',
  voice: 'Voice note',
  coordinator: 'Coordinator',
  whatsapp: 'WhatsApp',
  email: 'Email',
};

export const EVENT_TYPE_LABEL = {
  update: 'Update',
  location: 'Position',
  border_cross: 'Border crossing',
  departed: 'Departed',
  arrived: 'Arrived',
  delay: 'Delay',
  exception: 'Exception',
  delivered: 'Delivered',
  note: 'Note',
};

/* ===========================================================================
   Local extraction
   =========================================================================== */

const PLACES = [
  'Beitbridge', 'Musina', 'Forbes', 'Machipanda', 'Mutare', 'Beira', 'Durban',
  'Johannesburg', 'Chirundu', 'Plumtree', 'Nyamapanda', 'Masvingo', 'Gweru',
  'Kwekwe', 'Bulawayo', 'Harare', 'Walvis Bay', 'Ngezi', 'Goromonzi', 'Mutoko',
  'Hwange', 'Port Louis', 'Curepipe', 'Chegutu', 'Kadoma', 'Nacala', 'Dar es Salaam',
];

/** Crossings the fleet actually uses — "cleared Forbes" means a border event. */
const BORDER_POSTS = ['Beitbridge', 'Forbes', 'Machipanda', 'Chirundu', 'Plumtree', 'Nyamapanda', 'Musina'];
const BORDER_NAME_RE = new RegExp(`\\b(${BORDER_POSTS.join('|')})\\b`, 'i');
const CLEARED_RE = /\b(cleared|clearing|crossed|through|stamped)\b/i;

const TYPE_RULES = [
  { type: 'delivered', re: /\b(delivered|offloaded|off-loaded|unloaded at|signed for|handed over|dropped off)\b/i },
  {
    type: 'border_cross',
    // Either explicit border wording, or "cleared/crossed" naming a real post.
    test: (t) =>
      /\b(cleared (the )?border|border post|customs cleared|through the border|stamped out|stamped in|crossed into)\b/i.test(t) ||
      (CLEARED_RE.test(t) && BORDER_NAME_RE.test(t)),
  },
  { type: 'delay', re: /\b(delay|delayed|held up|stuck|queue|queuing|waiting|breakdown|broken down|slow)\b/i },
  { type: 'exception', re: /\b(accident|damage|damaged|theft|stolen|seized|detained|impounded|leak|spill|rejected)\b/i },
  { type: 'departed', re: /\b(departed|left|set off|pulled out|on the road|loaded and (?:left|moving))\b/i },
  { type: 'arrived', re: /\b(arrived|reached|got to|at the (?:port|depot|yard|gate))\b/i },
  { type: 'location', re: /\b(now (?:at|in|near)|currently (?:at|in|near)|passing|approaching|position)\b/i },
];

const STATUS_RULES = [
  { status: 'Delivered', re: /\b(delivered|offloaded|off-loaded|signed for|handed over)\b/i },
  { status: 'At Border', re: /\b(at (the )?border|border post|at beitbridge|at forbes|at chirundu|at plumtree|customs queue)\b/i },
  { status: 'Delayed', re: /\b(delay|delayed|held up|stuck|breakdown|broken down)\b/i },
  { status: 'On Water', re: /\b(sailed|on the vessel|vessel departed|at sea|on water)\b/i },
  { status: 'Awaiting Rail', re: /\b(awaiting (?:wagons?|rail)|no wagons|wagon allocation)\b/i },
  { status: 'In Transit', re: /\b(in transit|on the road|moving|en route|departed|left)\b/i },
];

/** "3 hours", "45 min", "2hrs" → minutes. */
function parseDelayMinutes(text) {
  const hours = text.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)\b/i);
  const mins = text.match(/(\d+)\s*(?:minutes?|mins?)\b/i);
  let total = 0;
  if (hours) total += Math.round(parseFloat(hours[1]) * 60);
  if (mins) total += parseInt(mins[1], 10);
  return total;
}

function findPlace(text) {
  const hit = PLACES.find((p) => new RegExp(`\\b${p.replace(/\s/g, '\\s')}\\b`, 'i').test(text));
  return hit || null;
}

function findReference(text) {
  const upper = text.toUpperCase();
  const shipmentRef = upper.match(/\bSHP-\d{3,}\b/);
  if (shipmentRef) return shipmentRef[0];
  const container = upper.match(/\b[A-Z]{4}\s?\d{6,7}[-\s]?\d?\b/);
  if (container) return container[0].trim();
  const truck = upper.match(/\b[A-Z]{3}\s?\d{4}\b/);
  if (truck) return truck[0].trim();
  return null;
}

function findEta(text) {
  const explicit = text.match(/\beta[:\s]+([^.\n,;]{3,40})/i);
  if (explicit) return explicit[1].trim();
  const tomorrow = text.match(/\b(tomorrow(?:\s+\w+)?|tonight|this evening|by \w+day)\b/i);
  return tomorrow ? tomorrow[1] : null;
}

/** Build a short, client-facing sentence out of what was actually found. */
function buildLabel(type, place, delayMinutes, text) {
  const where = place ? ` at ${place}` : '';
  switch (type) {
    case 'delivered':
      return `Delivered${place ? ` to ${place}` : ''}`;
    case 'border_cross':
      return `Cleared ${place || 'the border'}`;
    case 'delay':
      return delayMinutes
        ? `Delayed ${delayMinutes >= 60 ? `${(delayMinutes / 60).toFixed(1)} hours` : `${delayMinutes} minutes`}${where}`
        : `Delayed${where}`;
    case 'exception':
      return `Exception reported${where}`;
    case 'departed':
      return `Departed${place ? ` ${place}` : ''}`;
    case 'arrived':
      return `Arrived${where}`;
    case 'location':
      return place ? `Now at ${place}` : 'Position update';
    default: {
      const first = text.trim().split(/(?<=[.!?])\s/)[0] || text.trim();
      return first.length > 90 ? `${first.slice(0, 88)}…` : first;
    }
  }
}

/**
 * Extract one structured event from an update.
 * Deterministic and offline — the same text always yields the same event.
 */
export function extractEvent(text) {
  const raw = String(text || '').trim();
  if (!raw) return null;

  // A rule matches on either a regex or a predicate, whichever it declares.
  const typeRule = TYPE_RULES.find((r) => (r.test ? r.test(raw) : r.re.test(raw)));
  const type = typeRule ? typeRule.type : 'update';

  const statusRule = STATUS_RULES.find((r) => r.re.test(raw));
  const place = findPlace(raw);
  const delayMinutes = /\b(delay|delayed|held|stuck|waiting|queue)\b/i.test(raw) ? parseDelayMinutes(raw) : 0;

  // Confidence in the extraction itself, separate from confidence in the source.
  let confidence = 0.55;
  if (typeRule) confidence += 0.2;
  if (place) confidence += 0.15;
  if (statusRule) confidence += 0.1;

  return {
    type,
    label: buildLabel(type, place, delayMinutes, raw),
    location_text: place,
    status_hint: statusRule ? statusRule.status : null,
    reference: findReference(raw),
    eta: findEta(raw),
    delay_minutes: delayMinutes,
    extraction_confidence: Math.min(0.95, Number(confidence.toFixed(2))),
  };
}

/**
 * Where the hosted model call goes, if you want vision (tracking screenshots)
 * and better free-text handling than the rules above give you.
 *
 *   const res = await fetch('/api/events/extract', {
 *     method: 'POST',
 *     body: JSON.stringify({ text, imageBase64, mediaType }),
 *   });
 *   return res.json();   // same shape extractEvent() returns
 *
 * Server side, that endpoint posts to the Anthropic Messages API with
 * `tools: [EVENT_TOOL_SCHEMA]` and `tool_choice: { type: 'tool', name:
 * 'record_shipment_event' }`, so the model must answer with typed JSON. Keep
 * the key on the server — never ship it to the browser.
 */
export function describeExtractionPath() {
  return {
    step1: 'Deterministic match resolves WHICH shipment the update belongs to',
    step2: 'Extractor structures WHAT happened — locally, or via the vision model',
    step3: 'Source confidence + extraction confidence set the review threshold',
    step4: 'A human approves; only then does it reach the customer',
  };
}

/** Combined confidence: how much the source is trusted × how clean the parse was. */
export function scoreConfidence(source, extraction) {
  const sourceScore = (SOURCE_CONFIDENCE[source] ?? 70) / 100;
  const parseScore = extraction?.extraction_confidence ?? 0.5;
  return Math.round(sourceScore * parseScore * 100);
}
