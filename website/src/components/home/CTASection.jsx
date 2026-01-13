import React from 'react';
import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Phone, Mail, MapPin } from 'lucide-react';
import { siteConfig } from '../../data/content';

const CTASection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="relative py-24 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ 
            backgroundImage: 'url(https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=1600&q=80)' 
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary-900/95 via-silver-900/90 to-primary-900/95" />
      </div>

      {/* Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 100, repeat: Infinity, ease: 'linear' }}
          className="absolute -top-24 -right-24 w-96 h-96 border border-white/10 rounded-full"
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 80, repeat: Infinity, ease: 'linear' }}
          className="absolute -bottom-12 -left-12 w-64 h-64 border border-white/10 rounded-full"
        />
      </div>

      <div className="container-custom relative">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="text-white">
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5 }}
              className="inline-block px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm font-medium mb-6"
            >
              Ready to Get Started?
            </motion.span>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-3xl md:text-4xl lg:text-5xl font-display font-bold mb-6"
            >
              Let's Move Your{' '}
              <span className="text-primary-400">Business Forward</span>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg text-silver-300 mb-8 max-w-lg"
            >
              Partner with Zimbabwe's leading integrated logistics provider. 
              Get in touch today for a customized solution that meets your specific needs.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <Link
                to="/contact"
                className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-silver-900 font-display font-semibold rounded-xl hover:bg-primary-50 transition-all"
              >
                Request a Quote
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <a
                href={`tel:${siteConfig.contact.phone[0].replace(/\s/g, '')}`}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 backdrop-blur-sm text-white font-display font-semibold rounded-xl border border-white/20 hover:bg-white/20 transition-all"
              >
                <Phone size={18} />
                Call Us Now
              </a>
            </motion.div>
          </div>

          {/* Right - Contact Cards */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="space-y-4"
          >
            {/* Phone Card */}
            <a 
              href={`tel:${siteConfig.contact.phone[0].replace(/\s/g, '')}`}
              className="block p-6 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10 hover:bg-white/15 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary-500/20 rounded-xl group-hover:bg-primary-500/30 transition-colors">
                  <Phone className="w-6 h-6 text-primary-400" />
                </div>
                <div className="text-white">
                  <p className="text-sm text-silver-400 mb-1">Call us directly</p>
                  <p className="text-lg font-semibold">{siteConfig.contact.phone[0]}</p>
                </div>
                <ArrowRight className="ml-auto text-silver-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </div>
            </a>

            {/* Email Card */}
            <a 
              href={`mailto:${siteConfig.contact.email}`}
              className="block p-6 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10 hover:bg-white/15 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary-500/20 rounded-xl group-hover:bg-primary-500/30 transition-colors">
                  <Mail className="w-6 h-6 text-primary-400" />
                </div>
                <div className="text-white">
                  <p className="text-sm text-silver-400 mb-1">Email us</p>
                  <p className="text-lg font-semibold">{siteConfig.contact.email}</p>
                </div>
                <ArrowRight className="ml-auto text-silver-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </div>
            </a>

            {/* Location Card */}
            <a 
              href={`https://maps.google.com/?q=${encodeURIComponent(siteConfig.contact.address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-6 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10 hover:bg-white/15 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary-500/20 rounded-xl group-hover:bg-primary-500/30 transition-colors">
                  <MapPin className="w-6 h-6 text-primary-400" />
                </div>
                <div className="text-white flex-1">
                  <p className="text-sm text-silver-400 mb-1">Visit our office</p>
                  <p className="text-lg font-semibold">Harare, Zimbabwe</p>
                </div>
                <ArrowRight className="ml-auto text-silver-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </div>
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
