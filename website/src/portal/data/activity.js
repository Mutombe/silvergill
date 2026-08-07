// Audit trail and notification fan-out.
//
// Every action worth answering "who did that, and when?" goes through
// `record()`. Anything a person needs to be told about goes through `notify()`.
// Both are deliberately thin — swap the bodies for API calls and the modules
// above them do not change.

import * as db from './db';

/**
 * Write an audit entry.
 * `actor` is the signed-in user object; passing it explicitly keeps this
 * callable from anywhere without a React context.
 */
export function record(actor, action, entity, summary) {
  if (!actor) return null;
  return db.insert('auditLog', {
    userId: actor.id,
    userName: actor.name,
    role: actor.role,
    action,
    entity: entity || null,
    summary,
    at: new Date().toISOString(),
  });
}

/**
 * Raise a notification.
 * Target either a set of roles, a single user, or both — a client-specific
 * alert wants `forUserId`, an operational one wants `forRoles`.
 */
export function notify({ forRoles = null, forUserId = null, severity = 'info', title, body, link = null }) {
  return db.insert('notifications', {
    forRoles,
    forUserId,
    severity,
    title,
    body,
    link,
    at: new Date().toISOString(),
    read: false,
  });
}

/** Notifications this user should see, newest first. */
export function inboxFor(user, all) {
  if (!user) return [];
  return all
    .filter((n) => {
      if (n.forUserId) return n.forUserId === user.id;
      if (!n.forRoles) return true;
      // An admin sees staff notifications but not another customer's mail.
      if (user.role === 'admin') return !n.forRoles.includes('client');
      return n.forRoles.includes(user.role);
    })
    .sort((a, b) => new Date(b.at) - new Date(a.at));
}

export function markRead(id) {
  db.update('notifications', id, { read: true });
}

export function markAllRead(user, all) {
  inboxFor(user, all)
    .filter((n) => !n.read)
    .forEach((n) => db.update('notifications', n.id, { read: true }));
}
