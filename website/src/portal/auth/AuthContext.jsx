import React, { createContext, useContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as db from '../data/db';
import { get, getToken, onUnauthorised, post, setToken } from '../data/api';
import { ROLE_LABELS, ROLE_HOME, ROLE_AUDIENCE } from '../data/seed';

const AuthContext = createContext(null);

/**
 * Session handling for the portal.
 *
 * Credentials are checked in exactly one place — the API. The browser holds a
 * signed token and a copy of the user record; it holds no password and no
 * authority. Every decision this file makes about what a person can see is a
 * convenience for the interface, not a security boundary: the server applies
 * the same rules again, in SQL, on every request.
 *
 * Signing in is two steps that must both succeed before the portal renders:
 * authenticate, then load the data this account is entitled to. Showing a
 * dashboard before its rows have arrived would mean showing zeros that are not
 * true.
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  // Start busy only if there is a token to check — a first-time visitor should
  // see the site immediately, not a spinner.
  const [loading, setLoading] = useState(() => Boolean(getToken()));
  const [ready, setReady] = useState(false);
  const mounted = useRef(true);

  useEffect(() => () => { mounted.current = false; }, []);

  // Restore an existing session. The token alone is not trusted: the server is
  // asked who it belongs to, which also revokes a deactivated account the
  // moment it is deactivated rather than when its token expires.
  useEffect(() => {
    let cancelled = false;
    if (!getToken()) {
      setReady(true);
      return undefined;
    }

    (async () => {
      try {
        const { user: me } = await get('/api/auth/me');
        if (cancelled) return;
        await db.hydrate(me);
        if (cancelled) return;
        setUser(me);
      } catch {
        // Expired, revoked or unreachable — treat as signed out and let them
        // sign in again rather than half-loading a stale session.
        setToken(null);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setReady(true);
        }
      }
    })();

    return () => { cancelled = true; };
  }, []);

  // If the API ever rejects our token mid-session, drop the session and the
  // cached rows together. Leaving the rows on screen would be showing data we
  // are no longer authorised to hold.
  useEffect(() => onUnauthorised(() => {
    if (!mounted.current) return;
    db.clearStore();
    setUser(null);
  }), []);

  const signIn = useCallback(async (email, password, remember = false) => {
    const result = await post(
      '/api/auth/login',
      { email: String(email).trim(), password },
      { auth: false }
    );

    setToken(result.token, remember);
    // Load first, then commit the session, so the portal never paints against
    // an empty store.
    await db.hydrate(result.user);
    setUser(result.user);
    return result.user;
  }, []);

  const signOut = useCallback(async () => {
    try {
      await post('/api/auth/logout');
    } catch {
      // Signing out must always succeed locally, even offline.
    }
    setToken(null);
    db.clearStore();
    setUser(null);
  }, []);

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
      ready,
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
       * Row-level scope, for shaping the interface. The server enforces the
       * same scope in SQL — this is not what keeps one customer out of
       * another's consignments.
       */
      scope: {
        customerId: user?.customerId ?? null,
        supplierId: user?.supplierId ?? null,
      },
    };
  }, [user, loading, ready, signIn, signOut, can]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside an AuthProvider');
  return ctx;
};
