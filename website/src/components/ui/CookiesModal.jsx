import React from 'react';
import { useState, useEffect } from 'react';
import Modal from './Modal';
import { Cookie, Shield, BarChart3, Target, Check } from 'lucide-react';
import { toast } from 'sonner';

const CookiesModal = ({ isOpen, onClose }) => {
  const [preferences, setPreferences] = useState({
    essential: true,
    analytics: true,
    marketing: false
  });

  useEffect(() => {
    const saved = localStorage.getItem('silvergill-cookie-consent');
    if (saved) {
      const parsed = JSON.parse(saved);
      setPreferences({
        essential: true, // Always true
        analytics: parsed.analytics ?? true,
        marketing: parsed.marketing ?? false
      });
    }
  }, [isOpen]);

  const savePreferences = () => {
    localStorage.setItem('silvergill-cookie-consent', JSON.stringify({
      ...preferences,
      accepted: true,
      date: new Date().toISOString()
    }));
    toast.success('Cookie preferences saved successfully');
    onClose();
  };

  const cookieTypes = [
    {
      id: 'essential',
      icon: Shield,
      name: 'Essential Cookies',
      description: 'These cookies are necessary for the website to function and cannot be switched off. They are usually only set in response to actions made by you which amount to a request for services.',
      required: true,
      examples: ['Session management', 'Security tokens', 'Load balancing']
    },
    {
      id: 'analytics',
      icon: BarChart3,
      name: 'Analytics Cookies',
      description: 'These cookies allow us to count visits and traffic sources so we can measure and improve the performance of our site. They help us know which pages are the most and least popular.',
      required: false,
      examples: ['Page views', 'User journey tracking', 'Performance metrics']
    },
    {
      id: 'marketing',
      icon: Target,
      name: 'Marketing Cookies',
      description: 'These cookies may be set through our site by our advertising partners. They may be used by those companies to build a profile of your interests and show you relevant adverts.',
      required: false,
      examples: ['Retargeting ads', 'Social media integration', 'Personalized content']
    }
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cookie Settings" size="lg">
      <div className="space-y-8">
        {/* Introduction */}
        <div className="flex items-start gap-4 p-5 bg-primary-50 rounded-xl border border-primary-100">
          <div className="p-2 bg-primary-100 rounded-lg">
            <Cookie className="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <h3 className="text-lg font-display font-semibold text-silver-900 mb-2">
              About Cookies
            </h3>
            <p className="text-silver-600 text-sm leading-relaxed">
              Cookies are small text files that are placed on your device when you visit a website. 
              They help us provide you with a better experience by remembering your preferences, 
              analyzing how you use our site, and personalizing content.
            </p>
          </div>
        </div>

        {/* Cookie Categories */}
        <div className="space-y-4">
          <h3 className="text-lg font-display font-semibold text-silver-900">
            Manage Cookie Preferences
          </h3>
          
          {cookieTypes.map((cookie) => (
            <div 
              key={cookie.id}
              className="p-5 bg-white rounded-xl border border-silver-200 hover:border-silver-300 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1">
                  <div className="p-2 bg-silver-100 rounded-lg">
                    <cookie.icon className="w-5 h-5 text-silver-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-display font-semibold text-silver-900">
                        {cookie.name}
                      </h4>
                      {cookie.required && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-silver-100 text-silver-600 rounded-full">
                          Required
                        </span>
                      )}
                    </div>
                    <p className="text-silver-600 text-sm leading-relaxed mb-3">
                      {cookie.description}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {cookie.examples.map((example, idx) => (
                        <span 
                          key={idx}
                          className="px-2 py-1 text-xs bg-silver-50 text-silver-500 rounded-md"
                        >
                          {example}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Toggle Switch */}
                <button
                  onClick={() => {
                    if (!cookie.required) {
                      setPreferences(prev => ({
                        ...prev,
                        [cookie.id]: !prev[cookie.id]
                      }));
                    }
                  }}
                  disabled={cookie.required}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                    preferences[cookie.id] 
                      ? 'bg-primary-500' 
                      : 'bg-silver-300'
                  } ${cookie.required ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                  aria-label={`Toggle ${cookie.name}`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${
                      preferences[cookie.id] ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  >
                    {preferences[cookie.id] && (
                      <Check size={12} className="absolute inset-0 m-auto text-primary-500" />
                    )}
                  </span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Additional Information */}
        <div className="p-5 bg-silver-50 rounded-xl border border-silver-100">
          <h4 className="font-display font-semibold text-silver-900 mb-3">
            How to Manage Cookies in Your Browser
          </h4>
          <p className="text-silver-600 text-sm leading-relaxed mb-3">
            In addition to the controls we provide, you can manage cookies through your browser settings. 
            Most browsers allow you to block or delete cookies. Please note that blocking certain cookies 
            may impact your experience on our website.
          </p>
          <div className="flex flex-wrap gap-3">
            <a 
              href="https://support.google.com/chrome/answer/95647" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-primary-600 hover:text-primary-700 hover:underline"
            >
              Chrome
            </a>
            <a 
              href="https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-primary-600 hover:text-primary-700 hover:underline"
            >
              Firefox
            </a>
            <a 
              href="https://support.apple.com/guide/safari/manage-cookies-and-website-data-sfri11471/mac" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-primary-600 hover:text-primary-700 hover:underline"
            >
              Safari
            </a>
            <a 
              href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-primary-600 hover:text-primary-700 hover:underline"
            >
              Edge
            </a>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-silver-200">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-3 text-silver-600 font-medium rounded-xl border border-silver-200 hover:bg-silver-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={savePreferences}
            className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-500 text-white font-medium rounded-xl shadow-lg shadow-primary-500/25 hover:shadow-xl transition-all"
          >
            Save Preferences
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default CookiesModal;
