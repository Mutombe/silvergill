import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight, AlertCircle, CheckCircle2, Lock, Mail, ShieldCheck, X, Building2, Truck, UserCog,
} from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from './AuthContext';
import { Button, Field, Input, Select, TextArea, Toggle } from '../components/ui';
import { ROLE_HOME } from '../data/seed';
import { siteConfig } from '../../data/content';

/* ===========================================================================
   Authentication modal.
   One dialog, three panels: sign in, request access, reset password. It opens
   over whatever the visitor was looking at, and on success routes them to the
   landing screen their role owns.
   =========================================================================== */

const AUDIENCE_COPY = {
  customer: {
    icon: Building2,
    heading: 'Customer portal',
    lines: [
      'Track every consignment in real time',
      'Download proof of delivery and documents',
      'View quotations, invoices and statements',
    ],
  },
  staff: {
    icon: UserCog,
    heading: 'Staff portal',
    lines: [
      'Field capture that works without signal',
      'Quotations, documents, fleet and analytics',
      'Everything posts back into Business Central',
    ],
  },
  partner: {
    icon: Truck,
    heading: 'Contractor portal',
    lines: [
      'Accept work orders and update status',
      'Upload documents and submit invoices',
      'No more email chains',
    ],
  },
};

const AuthModal = ({ open, onClose, audience = 'staff', initialPanel = 'signin', redirectTo = null }) => {
  const { signIn, isAuthenticated, home } = useAuth();
  const navigate = useNavigate();

  const [panel, setPanel] = useState(initialPanel);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [request, setRequest] = useState({ name: '', company: '', email: '', phone: '', kind: 'Customer', message: '' });

  const reset = useCallback(() => {
    setPanel(initialPanel);
    setPassword('');
    setError(null);
    setBusy(false);
    setSent(false);
  }, [initialPanel]);

  // Close on Escape, and lock background scroll while open.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  useEffect(() => {
    if (open) reset();
  }, [open, reset]);

  // A visitor who is already signed in gets sent on rather than shown a form.
  useEffect(() => {
    if (open && isAuthenticated) {
      onClose();
      navigate(home);
    }
  }, [open, isAuthenticated, home, navigate, onClose]);

  const submitSignIn = async (event) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const session = await signIn(email, password, remember);
      toast.success(`Welcome back, ${session.name.split(' ')[0]}`, {
        description: ROLE_LABELS[session.role],
      });
      onClose();
      // Honour the page they were trying to reach; otherwise send them to the
      // landing screen their role owns.
      navigate(redirectTo || ROLE_HOME[session.role] || '/portal', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const submitRequest = async (event) => {
    event.preventDefault();
    setBusy(true);
    await new Promise((r) => setTimeout(r, 600));
    setBusy(false);
    setSent(true);
  };

  const submitReset = async (event) => {
    event.preventDefault();
    setBusy(true);
    await new Promise((r) => setTimeout(r, 600));
    setBusy(false);
    setSent(true);
  };

  if (!open) return null;

  const copy = AUDIENCE_COPY[audience] || AUDIENCE_COPY.staff;
  const AudienceIcon = copy.icon;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-silver-950/60 modal-backdrop"
          onClick={onClose}
          aria-hidden
        />

        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          role="dialog"
          aria-modal="true"
          aria-label="Sign in to the Silvergill portal"
          className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex"
        >
          {/* Brand rail */}
          <div className="relative hidden md:flex w-[42%] shrink-0 flex-col justify-between p-8 bg-silver-900 text-white overflow-hidden">
            <div
              className="absolute inset-0 bg-cover bg-center opacity-20"
              style={{ backgroundImage: 'url(/Ship-Logistics-4-1.png)' }}
            />
            <div className="absolute inset-0 bg-gradient-to-br from-silver-900 via-silver-900/95 to-primary-900/80" />
            <div className="absolute -top-24 -right-24 w-72 h-72 bg-primary-500/20 rounded-full blur-3xl" />

            <div className="relative">
              <img src={siteConfig.logo} alt={siteConfig.name} className="h-9 w-auto brightness-0 invert" />
            </div>

            <div className="relative">
              <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center mb-5">
                <AudienceIcon size={20} className="text-primary-300" />
              </div>
              <h2 className="text-2xl font-display font-bold leading-tight mb-3">{copy.heading}</h2>
              <ul className="space-y-2.5 text-sm text-white/70">
                {copy.lines.map((line) => (
                  <li key={line} className="flex items-start gap-2.5">
                    <ShieldCheck size={15} className="text-primary-400 mt-0.5 shrink-0" />
                    {line}
                  </li>
                ))}
              </ul>
            </div>

            <p className="relative text-xs text-white/40">
              Harare · Port Louis · {new Date().getFullYear()}
            </p>
          </div>

          {/* Form panel */}
          <div className="flex-1 min-w-0 flex flex-col">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 w-9 h-9 rounded-lg flex items-center justify-center text-silver-400 hover:text-silver-700 hover:bg-silver-100 transition-colors"
              aria-label="Close"
            >
              <X size={18} />
            </button>

            <div className="flex-1 overflow-y-auto custom-scroll p-7 sm:p-9">
              {panel === 'signin' && (
                <>
                  <img src={siteConfig.logo} alt={siteConfig.name} className="h-8 w-auto mb-6 md:hidden" />
                  <h2 className="text-2xl font-display font-bold text-silver-900 mb-1.5">Sign in</h2>
                  <p className="text-silver-500 text-sm mb-7">
                    Customers, staff, drivers and contracted suppliers.
                  </p>

                  <form onSubmit={submitSignIn} className="space-y-4">
                    <Field label="Email address" required>
                      <div className="relative">
                        <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-silver-400" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@company.com"
                          autoComplete="username"
                          className="input-field pl-10"
                          required
                          autoFocus
                        />
                      </div>
                    </Field>

                    <Field label="Password" required>
                      <div className="relative">
                        <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-silver-400" />
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          autoComplete="current-password"
                          className="input-field pl-10"
                          required
                        />
                      </div>
                    </Field>

                    {error && (
                      <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
                        <AlertCircle size={16} className="mt-0.5 shrink-0" />
                        {error}
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <Toggle checked={remember} onChange={setRemember} label="Keep me signed in" />
                      <button
                        type="button"
                        onClick={() => { setPanel('reset'); setSent(false); }}
                        className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                      >
                        Forgot password?
                      </button>
                    </div>

                    <Button type="submit" size="lg" className="w-full" disabled={busy} icon={busy ? undefined : ArrowRight}>
                      {busy ? 'Checking…' : 'Sign in'}
                    </Button>
                  </form>

                  <p className="text-sm text-silver-500 mt-5 text-center">
                    No account yet?{' '}
                    <button
                      onClick={() => { setPanel('request'); setSent(false); }}
                      className="text-primary-600 hover:text-primary-700 font-medium"
                    >
                      Request access
                    </button>
                  </p>

                </>
              )}

              {panel === 'request' && (
                <>
                  <h2 className="text-2xl font-display font-bold text-silver-900 mb-1.5">Request access</h2>
                  <p className="text-silver-500 text-sm mb-7">
                    Tell us who you are and we will set the account up.
                  </p>

                  {sent ? (
                    <div className="text-center py-10">
                      <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-5">
                        <CheckCircle2 className="text-emerald-600" size={26} />
                      </div>
                      <h3 className="font-display font-semibold text-lg text-silver-900 mb-2">Request received</h3>
                      <p className="text-sm text-silver-500 max-w-sm mx-auto mb-7">
                        Our team will be in touch on {request.email || 'the address you gave'} within one
                        working day.
                      </p>
                      <Button variant="secondary" onClick={() => setPanel('signin')}>
                        Back to sign in
                      </Button>
                    </div>
                  ) : (
                    <form onSubmit={submitRequest} className="space-y-4">
                      <Field label="I am a" required>
                        <Select
                          value={request.kind}
                          onChange={(e) => setRequest((r) => ({ ...r, kind: e.target.value }))}
                        >
                          <option>Customer</option>
                          <option>Contractor / Supplier</option>
                          <option>Silvergill staff member</option>
                        </Select>
                      </Field>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <Field label="Full name" required>
                          <Input
                            value={request.name}
                            onChange={(e) => setRequest((r) => ({ ...r, name: e.target.value }))}
                            required
                          />
                        </Field>
                        <Field label="Company" required>
                          <Input
                            value={request.company}
                            onChange={(e) => setRequest((r) => ({ ...r, company: e.target.value }))}
                            required
                          />
                        </Field>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <Field label="Work email" required>
                          <Input
                            type="email"
                            value={request.email}
                            onChange={(e) => setRequest((r) => ({ ...r, email: e.target.value }))}
                            required
                          />
                        </Field>
                        <Field label="Phone">
                          <Input
                            value={request.phone}
                            onChange={(e) => setRequest((r) => ({ ...r, phone: e.target.value }))}
                          />
                        </Field>
                      </div>
                      <Field label="What do you need access to?">
                        <TextArea
                          value={request.message}
                          onChange={(e) => setRequest((r) => ({ ...r, message: e.target.value }))}
                          placeholder="e.g. tracking our chrome shipments to Beira and downloading PODs"
                        />
                      </Field>
                      <div className="flex gap-3">
                        <Button type="submit" size="lg" className="flex-1" disabled={busy}>
                          {busy ? 'Sending…' : 'Send request'}
                        </Button>
                        <Button type="button" size="lg" variant="secondary" onClick={() => setPanel('signin')}>
                          Cancel
                        </Button>
                      </div>
                    </form>
                  )}
                </>
              )}

              {panel === 'reset' && (
                <>
                  <h2 className="text-2xl font-display font-bold text-silver-900 mb-1.5">Reset password</h2>
                  <p className="text-silver-500 text-sm mb-7">
                    We will send a reset link to your registered address.
                  </p>

                  {sent ? (
                    <div className="text-center py-10">
                      <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-5">
                        <CheckCircle2 className="text-emerald-600" size={26} />
                      </div>
                      <h3 className="font-display font-semibold text-lg text-silver-900 mb-2">Check your inbox</h3>
                      <p className="text-sm text-silver-500 max-w-sm mx-auto mb-7">
                        If {email || 'that address'} matches an account, a reset link is on its way.
                      </p>
                      <Button variant="secondary" onClick={() => setPanel('signin')}>
                        Back to sign in
                      </Button>
                    </div>
                  ) : (
                    <form onSubmit={submitReset} className="space-y-4">
                      <Field label="Email address" required>
                        <div className="relative">
                          <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-silver-400" />
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="input-field pl-10"
                            required
                            autoFocus
                          />
                        </div>
                      </Field>
                      <div className="flex gap-3">
                        <Button type="submit" size="lg" className="flex-1" disabled={busy}>
                          {busy ? 'Sending…' : 'Send reset link'}
                        </Button>
                        <Button type="button" size="lg" variant="secondary" onClick={() => setPanel('signin')}>
                          Cancel
                        </Button>
                      </div>
                    </form>
                  )}
                </>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

export default AuthModal;
