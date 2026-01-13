import React from 'react';
import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from './Navbar';
import Footer from './Footer';
import CookieConsent from '../ui/CookieConsent';
import PrivacyModal from '../ui/PrivacyModal';
import CookiesModal from '../ui/CookiesModal';

const Layout = ({ children }) => {
  const location = useLocation();
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showCookies, setShowCookies] = useState(false);

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <AnimatePresence mode="wait">
        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="flex-1"
        >
          {children}
        </motion.main>
      </AnimatePresence>

      <Footer 
        onOpenPrivacy={() => setShowPrivacy(true)}
        onOpenCookies={() => setShowCookies(true)}
      />

      {/* Cookie Consent Banner */}
      <CookieConsent onOpenCookies={() => setShowCookies(true)} />

      {/* Privacy Policy Modal */}
      <PrivacyModal 
        isOpen={showPrivacy} 
        onClose={() => setShowPrivacy(false)} 
      />

      {/* Cookies Policy Modal */}
      <CookiesModal 
        isOpen={showCookies} 
        onClose={() => setShowCookies(false)} 
      />
    </div>
  );
};

export default Layout;
