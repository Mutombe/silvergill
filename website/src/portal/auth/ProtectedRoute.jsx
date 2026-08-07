import React, { useEffect } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { LogIn, ShieldAlert } from 'lucide-react';

import { useAuth } from './AuthContext';
import { useAuthModal } from './AuthModalContext';
import { Button } from '../components/ui';
import { siteConfig } from '../../data/content';

/**
 * Gates a portal route on an active session and, optionally, on role.
 *
 * Rather than bouncing to a login page, an unauthenticated visitor keeps the
 * URL they asked for and gets the sign-in dialog over a holding screen — so
 * after signing in they land exactly where they meant to.
 */
const ProtectedRoute = ({ roles, children }) => {
  const { isAuthenticated, loading, can, roleLabel, home } = useAuth();
  const { openAuth } = useAuthModal();
  const location = useLocation();

  const needsSignIn = !loading && !isAuthenticated;

  useEffect(() => {
    if (needsSignIn) {
      openAuth({
        audience: location.pathname.startsWith('/portal/my') ? 'customer' : 'staff',
        redirectTo: location.pathname,
      });
    }
  }, [needsSignIn, openAuth, location.pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-silver-50">
        <div className="loader" />
      </div>
    );
  }

  if (needsSignIn) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-silver-50 px-6 text-center">
        <img src={siteConfig.logo} alt={siteConfig.name} className="h-10 w-auto mb-8" />
        <div className="w-14 h-14 rounded-2xl bg-primary-50 border border-primary-200 flex items-center justify-center mb-5">
          <LogIn className="text-primary-600" size={24} />
        </div>
        <h2 className="text-2xl font-display font-bold text-silver-900 mb-2">Sign in to continue</h2>
        <p className="text-silver-500 max-w-md mb-7">
          This part of the portal needs an account. Sign in and you will be taken
          straight to the page you asked for.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Button
            icon={LogIn}
            onClick={() => openAuth({ audience: 'staff', redirectTo: location.pathname })}
          >
            Sign in
          </Button>
          <Link to="/" className="btn-secondary text-sm">
            Back to the website
          </Link>
        </div>
      </div>
    );
  }

  if (roles && !can(roles)) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center px-6">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mb-5">
          <ShieldAlert className="text-amber-600" size={28} />
        </div>
        <h2 className="text-2xl font-display font-bold text-silver-900 mb-2">
          Not available on your profile
        </h2>
        <p className="text-silver-600 max-w-md mb-6">
          This module is restricted. Your account is signed in as{' '}
          <span className="font-medium text-silver-800">{roleLabel}</span>. Speak to
          the group IT administrator if you need access.
        </p>
        <Link to={home} className="btn-primary text-sm">
          Back to your dashboard
        </Link>
      </div>
    );
  }

  return children;
};

/**
 * The `/portal` index. Roles that own a different landing screen — customers,
 * admins, drivers, contractors — are forwarded to it; the operational roles
 * whose home *is* `/portal` render the staff dashboard passed as children.
 * (Redirecting unconditionally would loop for those roles.)
 */
export const RoleLanding = ({ children }) => {
  const { home } = useAuth();
  if (home && home !== '/portal') return <Navigate to={home} replace />;
  return children;
};

export default ProtectedRoute;
