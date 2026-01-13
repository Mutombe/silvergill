import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

const PageHero = ({ 
  title, 
  subtitle, 
  breadcrumbs = [], 
  backgroundImage = null,
  variant = 'default' // default, gradient, image
}) => {
  const variants = {
    default: 'bg-silver-50',
    gradient: 'bg-gradient-to-br from-silver-900 via-silver-800 to-primary-900 text-white',
    image: 'relative text-white'
  };

  return (
    <section className={`relative overflow-hidden ${variants[variant]}`}>
      {/* Background Image for image variant */}
      {variant === 'image' && backgroundImage && (
        <>
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${backgroundImage})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-silver-900/90 via-silver-900/80 to-silver-900/70" />
        </>
      )}

      {/* Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {variant === 'default' && (
          <>
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary-100 rounded-full opacity-50 blur-3xl" />
            <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-accent-cyan/20 rounded-full blur-3xl" />
          </>
        )}
        {variant === 'gradient' && (
          <>
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent-cyan/10 rounded-full blur-3xl" />
          </>
        )}
        
        {/* Grid Pattern */}
        <svg 
          className="absolute inset-0 w-full h-full opacity-[0.03]" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
              <path d="M 32 0 L 0 0 0 32" fill="none" stroke="currentColor" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <div className="relative container-custom py-20 md:py-28">
        {/* Breadcrumbs */}
        {breadcrumbs.length > 0 && (
          <motion.nav
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6"
            aria-label="Breadcrumb"
          >
            <ol className="flex items-center gap-2 text-sm">
              <li>
                <Link 
                  to="/" 
                  className={`flex items-center gap-1 transition-colors ${
                    variant === 'default' 
                      ? 'text-silver-500 hover:text-primary-600' 
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  <Home size={14} />
                  <span>Home</span>
                </Link>
              </li>
              {breadcrumbs.map((crumb, index) => (
                <li key={index} className="flex items-center gap-2">
                  <ChevronRight 
                    size={14} 
                    className={variant === 'default' ? 'text-silver-400' : 'text-white/50'} 
                  />
                  {index === breadcrumbs.length - 1 ? (
                    <span className={variant === 'default' ? 'text-silver-900 font-medium' : 'text-white font-medium'}>
                      {crumb.label}
                    </span>
                  ) : (
                    <Link 
                      to={crumb.path} 
                      className={`transition-colors ${
                        variant === 'default' 
                          ? 'text-silver-500 hover:text-primary-600' 
                          : 'text-white/70 hover:text-white'
                      }`}
                    >
                      {crumb.label}
                    </Link>
                  )}
                </li>
              ))}
            </ol>
          </motion.nav>
        )}

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className={`text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-4 ${
            variant === 'default' ? 'text-silver-900' : 'text-white'
          }`}
        >
          {title}
        </motion.h1>

        {/* Subtitle */}
        {subtitle && (
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className={`text-lg md:text-xl max-w-2xl ${
              variant === 'default' ? 'text-silver-600' : 'text-white/80'
            }`}
          >
            {subtitle}
          </motion.p>
        )}

        {/* Decorative Line */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="mt-8 w-24 h-1 bg-gradient-to-r from-primary-500 to-accent-cyan rounded-full origin-left"
        />
      </div>
    </section>
  );
};

export default PageHero;
