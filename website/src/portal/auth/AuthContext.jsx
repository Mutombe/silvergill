import React, { createContext, useContext, useCallback, useMemo, useState } from 'react';
import * as db from '../data/db';
import { record } from '../data/activity';
import { ROLE_LABELS, ROLE_HOME, ROLE_AUDIENCE } from '../data/seed';

const SESSION_KEY = 'silvergill.portal.session';
const AuthContext = createContext(null);

/**
 * Restore a session from storage. Runs once, as a lazy useState initializer
 * rather than in an effect, so the first paint already knows whether the user
 * is signed in — no signed-out flash and no cascading render.
 */
function restoreSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const stored = JSON.parse(raw);
    const fresh = db.find('users', stored.id);
    // A deactivated account must not survive on an old session token.
    if (!fresh || fresh.active === false) return null;
    const { password: _password, ...safe } = fresh;
    return safe;
  } catch {
    // Corrupt session — treat as signed out.
    return null;
  }
}

/**
 * Session handling for the portal.
 *
 * `signIn` is the only place credentials are checked. Point it at
 * POST /api/auth/login (or MSAL, if you federate with the Business Central
 * tenant) and the rest of the portal is unchanged — it only ever reads
 * `user`, `role`, `can()` and `scope`.
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(restoreSession);
  const loading = false;

  const signIn = useCallback(async (email, password, remember = false) => {
    // Small delay so the button's loading state is visible and the swap to a
    // real network call does not change perceived behaviour.
    await new Promise((resolve) => setTimeout(resolve, 450));

    const match = db
      .read('users')
      .find((u) => u.email.toLowerCase() === String(email).trim().toLowerCase());

    if (!match || match.password !== password) {
      throw new Error('Those credentials were not recognised.');
    }
    if (match.active === false) {
      throw new Error('This account has been deactivated. Contact your administrator.');
    }

    const signedInAt = new Date().toISOString();
    db.update('users', match.id, { lastSignInAt: signedInAt });

    const { password: _password, ...safe } = match;
    const session = { ...safe, lastSignInAt: signedInAt, signedInAt };
    setUser(session);

    const store = remember ? localStorage : sessionStorage;
    store.setItem(SESSION_KEY, JSON.stringify(session));
    (remember ? sessionStorage : localStorage).removeItem(SESSION_KEY);

    record(session, 'auth.signin', session.id, `${session.name} signed in as ${ROLE_LABELS[session.role]}`);

    return session;
  }, []);

  const signOut = useCallback(() => {
    if (user) record(user, 'auth.signout', user.id, `${user.name} signed out`);
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
  }, [user]);

  /** Role check used by the sidebar and by ProtectedRoute. */
  const can = useCallback(
    (allowedRoles) => {
      if (!user) return false;
      if (user.role === 'admin') return true;
      if (!allowedRoles || allowedRoles.length === 0) return true;
      return allowedRoles.includes(user.role);
    },
    [user]
  );

  const value = useMemo(() => {
    const audience = user ? ROLE_AUDIENCE[user.role] : null;
    return {
      user,
      loading,
      signIn,
      signOut,
      can,
      isAuthenticated: Boolean(user),
      roleLabel: user ? ROLE_LABELS[user.role] : null,
      /** Where this role belongs after signing in. */
      home: user ? ROLE_HOME[user.role] || '/portal' : '/portal',
      audience,
      isStaff: audience === 'staff',
      isCustomer: audience === 'customer',
      isPartner: audience === 'partner',
      /**
       * Row-level scope. Every external account is pinned to exactly one
       * record; screens must filter on this and never on a URL parameter.
       */
      scope: {
        customerId: user?.customerId ?? null,
        supplierId: user?.supplierId ?? null,
      },
    };
  }, [user, loading, signIn, signOut, can]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside an AuthProvider');
  return ctx;
};
