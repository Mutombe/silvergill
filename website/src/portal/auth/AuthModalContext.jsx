import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import AuthModal from './AuthModal';

const AuthModalContext = createContext(null);

/**
 * Makes the sign-in dialog available from anywhere — the marketing navbar, a
 * call-to-action in the footer, or a deep link into a portal URL that the
 * visitor has no session for.
 */
export const AuthModalProvider = ({ children }) => {
  const [state, setState] = useState({ open: false, audience: 'staff', panel: 'signin', redirectTo: null });

  const openAuth = useCallback((options = {}) => {
    setState({
      open: true,
      audience: options.audience || 'staff',
      panel: options.panel || 'signin',
      redirectTo: options.redirectTo || null,
    });
  }, []);

  const closeAuth = useCallback(() => setState((s) => ({ ...s, open: false })), []);

  const value = useMemo(() => ({ openAuth, closeAuth, isOpen: state.open }), [openAuth, closeAuth, state.open]);

  return (
    <AuthModalContext.Provider value={value}>
      {children}
      <AuthModal
        open={state.open}
        onClose={closeAuth}
        audience={state.audience}
        initialPanel={state.panel}
        redirectTo={state.redirectTo}
      />
    </AuthModalContext.Provider>
  );
};

export const useAuthModal = () => {
  const ctx = useContext(AuthModalContext);
  if (!ctx) throw new Error('useAuthModal must be used inside an AuthModalProvider');
  return ctx;
};
