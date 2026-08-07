import React from 'react';
import { useState, useEffect } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Phone, ChevronDown, LogIn, LayoutDashboard, UserCog, PackageSearch } from 'lucide-react';
import { siteConfig, navLinks } from '../../data/content';
import { TiThMenuOutline } from "react-icons/ti";
import { useAuth } from '../../portal/auth/AuthContext';
import { useAuthModal } from '../../portal/auth/AuthModalContext';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const { isAuthenticated, home } = useAuth();
  const { openAuth } = useAuthModal();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [location]);

  return (
    <>
      {/* Top Bar */}
      <div className="hidden lg:block bg-silver-900 text-white py-2">
        <div className="container-custom flex justify-between items-center text-sm">
          <p className="text-silver-300">
            {siteConfig.tagline}
          </p>
          <div className="flex items-center gap-6">
            {!isAuthenticated && (
              <button
                onClick={() => openAuth({ audience: 'staff' })}
                className="flex items-center gap-2 text-silver-300 hover:text-primary-400 transition-colors"
              >
                <UserCog size={14} />
                <span>Staff &amp; contractor portal</span>
              </button>
            )}
            <a
              href={`tel:${siteConfig.contact.phone[0].replace(/\s/g, '')}`}
              className="flex items-center gap-2 hover:text-primary-400 transition-colors"
            >
              <Phone size={14} />
              <span>{siteConfig.contact.phone[0]}</span>
            </a>
            <div className="flex items-center gap-3">
              <a 
                href={siteConfig.social.linkedin} 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-primary-400 transition-colors"
                aria-label="LinkedIn"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </a>
              <a 
                href={siteConfig.social.facebook} 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-primary-400 transition-colors"
                aria-label="Facebook"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
              <a 
                href={siteConfig.social.twitter} 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-primary-400 transition-colors"
                aria-label="Twitter"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <motion.nav
        initial={false}
        animate={{
          backgroundColor: scrolled ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 1)',
          backdropFilter: scrolled ? 'blur(12px)' : 'blur(0px)',
          boxShadow: scrolled ? '0 4px 30px rgba(0, 0, 0, 0.1)' : '0 0 0 rgba(0, 0, 0, 0)',
        }}
        className="sticky top-0 z-50 border-b border-silver-100"
      >
        <div className="container-custom">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link to="/" className="flex-shrink-0">
              <motion.img
                whileHover={{ scale: 1.02 }}
                src={siteConfig.logo}
                alt={siteConfig.name}
                className="h-12 w-auto"
              />
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => (
                <NavLink
                  key={link.path}
                  to={link.path}
                  className={({ isActive }) =>
                    `px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300 ${
                      isActive
                        ? 'text-primary-600 bg-primary-50'
                        : 'text-silver-600 hover:text-primary-600 hover:bg-silver-50'
                    }`
                  }
                >
                  {link.name}
                </NavLink>
              ))}
            </div>

            {/* CTA Buttons - Desktop */}
            <div className="hidden lg:flex items-center gap-3">
              <Link
                to="/track"
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-silver-600 hover:text-primary-600 rounded-xl border border-silver-200 hover:border-primary-300 transition-all"
              >
                <PackageSearch size={15} />
                Track
              </Link>
              {isAuthenticated ? (
                <Link
                  to={home}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-silver-600 hover:text-primary-600 rounded-xl border border-silver-200 hover:border-primary-300 transition-all"
                >
                  <LayoutDashboard size={15} />
                  My Portal
                </Link>
              ) : (
                <button
                  onClick={() => openAuth({ audience: 'customer' })}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-silver-600 hover:text-primary-600 rounded-xl border border-silver-200 hover:border-primary-300 transition-all"
                >
                  <LogIn size={15} />
                  Client Login
                </button>
              )}
              <Link
                to="/contact"
                className="btn-primary text-sm"
              >
                Get a Quote
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="lg:hidden p-2 rounded-lg text-silver-600 hover:text-primary-600 hover:bg-silver-100 transition-colors"
              aria-label="Toggle menu"
            >
              {isOpen ? <X size={24} /> : <TiThMenuOutline size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="lg:hidden border-t border-silver-100 bg-white overflow-hidden"
            >
              <div className="container-custom py-4 space-y-1">
                {navLinks.map((link, index) => (
                  <motion.div
                    key={link.path}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <NavLink
                      to={link.path}
                      className={({ isActive }) =>
                        `block px-4 py-3 rounded-lg font-medium transition-colors ${
                          isActive
                            ? 'text-primary-600 bg-primary-50'
                            : 'text-silver-600 hover:text-primary-600 hover:bg-silver-50'
                        }`
                      }
                    >
                      {link.name}
                    </NavLink>
                  </motion.div>
                ))}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: navLinks.length * 0.05 }}
                  className="pt-4 space-y-2"
                >
                  <Link
                    to="/contact"
                    className="btn-primary w-full text-center"
                  >
                    Get a Quote
                  </Link>
                  <Link to="/track" className="btn-secondary w-full text-center gap-2">
                    <PackageSearch size={16} />
                    Track a consignment
                  </Link>
                  {isAuthenticated ? (
                    <Link to={home} className="btn-secondary w-full text-center gap-2">
                      <LayoutDashboard size={16} />
                      My Portal
                    </Link>
                  ) : (
                    <>
                      <button
                        onClick={() => { setIsOpen(false); openAuth({ audience: 'customer' }); }}
                        className="btn-secondary w-full text-center gap-2"
                      >
                        <LogIn size={16} />
                        Client Login
                      </button>
                      <button
                        onClick={() => { setIsOpen(false); openAuth({ audience: 'staff' }); }}
                        className="btn-ghost w-full text-center gap-2 text-sm"
                      >
                        <UserCog size={16} />
                        Staff & contractor sign-in
                      </button>
                    </>
                  )}
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: (navLinks.length + 1) * 0.05 }}
                  className="pt-4 border-t border-silver-100 mt-4"
                >
                  <a 
                    href={`tel:${siteConfig.contact.phone[0].replace(/\s/g, '')}`}
                    className="flex items-center gap-2 px-4 py-2 text-silver-600"
                  >
                    <Phone size={18} />
                    <span>{siteConfig.contact.phone[0]}</span>
                  </a>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>
    </>
  );
};

export default Navbar;
