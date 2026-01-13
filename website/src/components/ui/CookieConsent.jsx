import React from 'react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cookie, X, Settings } from 'lucide-react';

const CookieConsent = ({ onOpenCookies }) => {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('silvergill-cookie-consent');
    if (!consent) {
      // Delay showing the banner for better UX
      const timer = setTimeout(() => setShowBanner(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const acceptAll = () => {
    localStorage.setItem('silvergill-cookie-consent', JSON.stringify({
      essential: true,
      analytics: true,
      marketing: true,
      accepted: true,
      date: new Date().toISOString()
    }));
    setShowBanner(false);
  };

  const acceptEssential = () => {
    localStorage.setItem('silvergill-cookie-consent', JSON.stringify({
      essential: true,
      analytics: false,
      marketing: false,
      accepted: true,
      date: new Date().toISOString()
    }));
    setShowBanner(false);
  };

  const openSettings = () => {
    setShowBanner(false);
    onOpenCookies();
  };

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6"
        >
          <div className="container-custom">
            <div className="relative bg-white rounded-2xl shadow-2xl border border-silver-100 overflow-hidden">
              {/* Decorative gradient */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-500 via-accent-cyan to-primary-400" />
              
              <div className="p-6 md:p-8">
                <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
                  {/* Icon & Text */}
                  <div className="flex items-start gap-4 flex-1">
                    <div className="flex-shrink-0 p-3 bg-primary-100 rounded-xl">
                      <Cookie className="w-6 h-6 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-display font-semibold text-silver-900 mb-2">
                        We Value Your Privacy
                      </h3>
                      <p className="text-silver-600 text-sm leading-relaxed max-w-2xl">
                        We use cookies to enhance your browsing experience, serve personalized content, and analyze our traffic. 
                        By clicking "Accept All", you consent to our use of cookies. You can manage your preferences or learn more in our Cookie Policy.
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
                    <button
                      onClick={openSettings}
                      className="flex items-center justify-center gap-2 px-5 py-3 text-silver-600 font-medium rounded-xl border border-silver-200 hover:border-silver-300 hover:bg-silver-50 transition-colors"
                    >
                      <Settings size={18} />
                      Customize
                    </button>
                    <button
                      onClick={acceptEssential}
                      className="px-5 py-3 text-silver-700 font-medium rounded-xl bg-silver-100 hover:bg-silver-200 transition-colors"
                    >
                      Essential Only
                    </button>
                    <button
                      onClick={acceptAll}
                      className="px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-500 text-white font-medium rounded-xl shadow-lg shadow-primary-500/25 hover:shadow-xl hover:shadow-primary-500/30 transition-all"
                    >
                      Accept All
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CookieConsent;
