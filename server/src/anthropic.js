// Hosted event extraction.
//
// The portal's local extractor is a set of regexes: fast, offline, and honest
// about what it can do. This is the other half — the same contract, answered by
// a model that can read a sentence it has never seen a rule for, and can read a
// tracking screenshot.
//
// Reliability comes from forcing the tool call. The model is not asked to
// "reply in JSON" and then parsed hopefully; it is given exactly one tool and
// told it must call it, so the response either validates against the schema or
// the request failed. There is no middle case to defend against.
//
// The API key lives here and only here. It is read from the environment, never
// logged, and never sent to the browser — the browser talks to /api/events/
// extract, which is authenticated and rate-limited, and gets back a plain
// object.

import Anthropic from '@anthropic-ai/sdk';

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-5';

/** The one tool the model is allowed to call. Mirrors EVENT_TOOL_SCHEMA in the portal. */
export const EVENT_TOOL = {
  name: 'record_shipment_event',
  description: 'Record one structured logistics event extracted from a shipment update.',
  input_schema: {
    type: 'object',
    properties: {
      type: {
        type: 'string',
        enum: ['update', 'location', 'border_cross', 'departed', 'arrived',
               'delay', 'exception', 'delivered', 'note'],
        description: 'What kind of thing happened.',
      },
      label: {
        type: 'string',
        description: "Short, client-facing summary, e.g. 'Crossed Beitbridge into Zimbabwe'.",
      },
      // The optional fields are genuinely optional: omitting one is how the
      // model says "not stated". Asking for an empty string instead invites it
      // to fill the field with something, which is the one thing we do not
      // want from an extractor whose output reaches a customer.
      location_text: {
        type: 'string',
        description: "Place or landmark if stated (e.g. 'Musina', 'Beitbridge Border'). Omit this field entirely if no place is named.",
      },
      status_hint: {
        type: 'string',
        enum: ['Planned', 'In Transit', 'At Border', 'Awaiting Rail', 'On Water', 'Delayed', 'Delivered'],
        description: 'New consignment status, only if clearly implied. Omit this field entirely otherwise.',
      },
      reference: {
        type: 'string',
        description: 'Any consignment reference, container number or truck registration mentioned. Omit this field entirely if none.',
      },
      eta: {
        type: 'string',
        description: 'ETA if stated, in the words used. Omit this field entirely if none.',
      },
      delay_minutes: { type: 'integer', description: 'Delay in minutes if stated; 0 otherwise.' },
      extraction_confidence: {
        type: 'number',
        description: 'How confident you are in this reading, 0 to 1. Be honest: a vague or '
          + 'ambiguous message should score low even when you have to pick a type.',
      },
    },
    required: ['type', 'label', 'delay_minutes', 'extraction_confidence'],
    additionalProperties: false,
  },
};

const SYSTEM = [
  'You convert messy logistics updates from Southern African road, rail and sea freight',
  'into ONE structured consignment event.',
  '',
  'Use ONLY information present in the input. Never invent a location, a status or an ETA.',
  'If something is not stated, return an empty string (or 0 for delay_minutes) rather than a guess.',
  'Keep the label factual, concise and fit to show a customer — no filler, no speculation.',
  '',
  'Context that changes how you read these messages:',
  '· Beitbridge, Forbes, Machipanda, Chirundu, Plumtree and Nyamapanda are border posts.',
  '  "cleared Forbes" or "through Beitbridge" is a border crossing, not a position update.',
  '· Musina is the South African side of Beitbridge; Machipanda is the Mozambican side of Forbes.',
  '· Beira, Durban, Walvis Bay, Nacala and Dar es Salaam are ports.',
  '· Messages are often written in haste on a phone, with abbreviations and no punctuation.',
  '  Read them for meaning, but do not read anything into them that is not there.',
].join('\n');

let client = null;

/** Configured only when a key is present; the caller falls back when it is not. */
export const configured = () => Boolean(process.env.ANTHROPIC_API_KEY);

function getClient() {
  if (!client) client = new Anthropic(); // reads ANTHROPIC_API_KEY
  return client;
}

/**
 * Fragments of the model's own tool-call syntax. These occasionally bleed into
 * a string field, and the result is shown to a customer on a public tracking
 * page — so anything carrying one is discarded rather than displayed.
 */
const LEAKED = /<\/?(antml|parameter|function_calls|invoke)\b|\bname="[a-z_]+"/i;

/** Normalise the model's answer to exactly the shape the portal already renders. */
function normalise(input) {
  const str = (v) => {
    const s = typeof v === 'string' ? v.trim() : '';
    if (!s || LEAKED.test(s)) return null;
    return s;
  };
  const confidence = Number(input.extraction_confidence);
  return {
    type: input.type || 'update',
    label: str(input.label) || 'Update',
    location_text: str(input.location_text),
    status_hint: str(input.status_hint),
    reference: str(input.reference),
    eta: str(input.eta),
    delay_minutes: Number.isFinite(input.delay_minutes) ? input.delay_minutes : 0,
    extraction_confidence: Number.isFinite(confidence)
      ? Math.min(0.99, Math.max(0.05, Number(confidence.toFixed(2))))
      : 0.6,
  };
}

/**
 * Extract one event from a field update.
 *
 * @param {object}  args
 * @param {string}  args.text        The message as received.
 * @param {string} [args.imageBase64] A tracking screenshot, base64, no data: prefix.
 * @param {string} [args.mediaType]  image/png, image/jpeg, image/gif or image/webp.
 * @param {string} [args.context]    What we already know about the consignment.
 * @returns {Promise<object>} Same shape as the portal's local extractEvent().
 */
export async function extractEvent({ text, imageBase64, mediaType, context } = {}) {
  const content = [];

  if (imageBase64) {
    content.push({
      type: 'image',
      source: { type: 'base64', media_type: mediaType || 'image/png', data: imageBase64 },
    });
  }
  content.push({
    type: 'text',
    text: context
      ? `Known consignment details: ${context}\n\nUpdate received:\n${text || '(image only)'}`
      : `Update received:\n${text || '(image only)'}`,
  });

  const message = await getClient().messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: SYSTEM,
    // Extraction is a narrow task; low effort keeps it quick without giving up
    // the reasoning that makes it better than the regexes.
    output_config: { effort: 'low' },
    tools: [EVENT_TOOL],
    tool_choice: { type: 'tool', name: EVENT_TOOL.name },
    messages: [{ role: 'user', content }],
  });

  // A safety decline arrives as a normal 200 with no tool call — treat it as a
  // failed extraction so the caller falls back rather than crashing.
  if (message.stop_reason === 'refusal') {
    const err = new Error('the model declined to read that update');
    err.code = 'refusal';
    throw err;
  }

  const call = message.content.find(
    (block) => block.type === 'tool_use' && block.name === EVENT_TOOL.name
  );
  if (!call) {
    const err = new Error('the model returned no structured event');
    err.code = 'no_tool_use';
    throw err;
  }

  return { ...normalise(call.input), model: message.model, usage: message.usage };
}
