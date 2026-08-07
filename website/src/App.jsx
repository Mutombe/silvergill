import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import Layout from './components/layout/Layout';

// Public pages
import Home from './pages/Home';
import About from './pages/About';
import Services from './pages/Services';
import Branches from './pages/Branches';
import Media from './pages/Media';
import Gallery from './pages/Gallery';
import Careers from './pages/Careers';
import Contact from './pages/Contact';
import Track from './pages/Track';

// Portal shell
import { AuthProvider } from './portal/auth/AuthContext';
import { AuthModalProvider } from './portal/auth/AuthModalContext';
import ProtectedRoute, { RoleLanding } from './portal/auth/ProtectedRoute';
import PortalLayout from './portal/components/PortalLayout';
import { moduleByKey } from './portal/modules';

// Staff modules
import Dashboard from './portal/pages/Dashboard';
import Operations from './portal/pages/Operations';
import Quotations from './portal/pages/Quotations';
import Documents from './portal/pages/Documents';
import Fleet from './portal/pages/Fleet';
import Suppliers from './portal/pages/Suppliers';
import Group from './portal/pages/Group';
import Analytics from './portal/pages/Analytics';
import Tracking from './portal/pages/Tracking';
import UpdateInbox from './portal/pages/UpdateInbox';
import Admin from './portal/pages/Admin';
import RecordDetail from './portal/pages/RecordDetail';

// Customer modules
import ClientDashboard from './portal/pages/client/ClientDashboard';
import ClientQuotes from './portal/pages/client/ClientQuotes';
import ClientDocuments from './portal/pages/client/ClientDocuments';
import ClientBilling from './portal/pages/client/ClientBilling';

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

/** Public marketing site — keeps the existing chrome. */
const PublicSite = () => (
  <Layout>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/about" element={<About />} />
      <Route path="/services" element={<Services />} />
      <Route path="/branches" element={<Branches />} />
      <Route path="/media" element={<Media />} />
      <Route path="/gallery" element={<Gallery />} />
      <Route path="/careers" element={<Careers />} />
      <Route path="/contact" element={<Contact />} />

      {/* 404 - Redirect to home */}
      <Route path="*" element={<Home />} />
    </Routes>
  </Layout>
);

/** Route element for a portal module, gated on the roles in the registry. */
const Module = ({ moduleKey, children }) => (
  <ProtectedRoute roles={moduleByKey(moduleKey)?.roles}>{children}</ProtectedRoute>
);

function App() {
  return (
    <AuthProvider>
      <AuthModalProvider>
        <Toaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{
            duration: 4000,
            style: {
              fontFamily: 'DM Sans, sans-serif',
            },
          }}
        />
        <ScrollToTop />

        <Routes>
          {/* Public consignment tracking — no login, shareable link. */}
          <Route path="/track" element={<Track />} />
          <Route path="/track/:token" element={<Track />} />

          {/* Sign-in now happens in a modal; the old URL keeps working. */}
          <Route path="/portal/login" element={<Navigate to="/portal" replace />} />

          <Route
            path="/portal"
            element={
              <ProtectedRoute>
                <PortalLayout />
              </ProtectedRoute>
            }
          >
            {/* The index forwards each role to the screen it owns. */}
            <Route
              index
              element={
                <RoleLanding>
                  <Dashboard />
                </RoleLanding>
              }
            />

            {/* Customer portal */}
            <Route path="my" element={<Module moduleKey="my"><ClientDashboard /></Module>} />
            <Route path="my/quotes" element={<Module moduleKey="myQuotes"><ClientQuotes /></Module>} />
            <Route path="my/documents" element={<Module moduleKey="myDocs"><ClientDocuments /></Module>} />
            <Route path="my/billing" element={<Module moduleKey="myBilling"><ClientBilling /></Module>} />

            {/* Staff modules */}
            <Route path="operations" element={<Module moduleKey="ops"><Operations /></Module>} />
            <Route path="tracking" element={<Module moduleKey="tracking"><Tracking /></Module>} />
            <Route path="inbox" element={<Module moduleKey="inbox"><UpdateInbox /></Module>} />
            <Route path="quotations" element={<Module moduleKey="quotes"><Quotations /></Module>} />
            <Route path="documents" element={<Module moduleKey="docs"><Documents /></Module>} />
            <Route path="fleet" element={<Module moduleKey="fleet"><Fleet /></Module>} />
            <Route path="suppliers" element={<Module moduleKey="suppliers"><Suppliers /></Module>} />
            <Route path="group" element={<Module moduleKey="group"><Group /></Module>} />
            <Route path="analytics" element={<Module moduleKey="analytics"><Analytics /></Module>} />

            {/* Administration */}
            <Route path="admin" element={<Module moduleKey="admin"><Admin /></Module>} />

            {/* One route, every record. Access is checked per record against
                the registry, so a customer cannot open someone else's page. */}
            <Route path="records/:entity/:id" element={<RecordDetail />} />

            {/* Unknown portal path — send them to their own landing screen. */}
            <Route path="*" element={<RoleLanding><Dashboard /></RoleLanding>} />
          </Route>

          {/* ===== Public site ===== */}
          <Route path="/*" element={<PublicSite />} />
        </Routes>
      </AuthModalProvider>
    </AuthProvider>
  );
}

export default App;
