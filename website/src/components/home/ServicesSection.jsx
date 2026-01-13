import React from 'react';
import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  ArrowRight, 
  ArrowUpRight,
  Truck, 
  Anchor, 
  Ship, 
  FileCheck, 
  ClipboardCheck, 
  Globe 
} from 'lucide-react';
import { services } from '../../data/content';
import { GiWorld } from "react-icons/gi";

const iconMap = {
  Truck,
  Anchor,
  Ship,
  FileCheck,
  ClipboardCheck,
  Globe
};

const ServicesSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  // Featured services for highlight cards
  const featuredServices = services.slice(0, 3);
  const otherServices = services.slice(3);

  return (
    <section ref={ref} className="section-padding bg-white relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Top right gradient blob */}
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-primary-100/60 to-accent-cyan/20 rounded-full blur-3xl" />
        {/* Bottom left gradient blob */}
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-silver-100/80 to-primary-50/40 rounded-full blur-3xl" />
        {/* Subtle grid pattern */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.02]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="serviceGrid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="currentColor" strokeWidth="1" className="text-silver-900"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#serviceGrid)" />
        </svg>
      </div>

      <div className="container-custom relative">
        {/* Section Header - Split Layout */}
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 mb-16 lg:mb-20">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5 }}
              className="flex items-center gap-3 mb-4"
            >
              <span className="w-12 h-[2px] bg-primary-500" />
              <span className="text-primary-600 font-semibold tracking-wide uppercase text-sm">
                Our Services
              </span>
            </motion.div>
            
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-silver-900 leading-tight"
            >
              Transport Solutions
              <br />
              <span className="relative">
                For{' '}
                <span className="relative inline-block">
                  <span className="relative z-10 text-primary-600">Business</span>
                  <motion.span
                    initial={{ scaleX: 0 }}
                    animate={isInView ? { scaleX: 1 } : {}}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className="absolute bottom-2 left-0 w-full h-3 bg-primary-100 -z-0 origin-left"
                  />
                </span>
              </span>
            </motion.h2>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-col justify-end"
          >
            <p className="text-lg text-silver-600 leading-relaxed mb-6">
              Logistics is the process of efficiently moving goods from Point A to Point B. 
              Success demands minute attention to details, from packaging to warehousing to transportation.
              We handle it all.
            </p>
            <Link
              to="/services"
              className="group inline-flex items-center gap-2 text-primary-600 font-semibold hover:gap-3 transition-all"
            >
              View All Services
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        </div>

        {/* Featured Services - Large Cards */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 mb-12">
          {featuredServices.map((service, index) => {
            const IconComponent = iconMap[service.icon];
            
            return (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 40 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.1 * index }}
                className="group relative"
              >
                <Link to="/services" className="block h-full">
                  {/* Card */}
                  <div className="relative h-full bg-gradient-to-br from-silver-50 to-white rounded-3xl overflow-hidden border border-silver-100 transition-all duration-500 hover:shadow-2xl hover:shadow-primary-500/10 hover:-translate-y-2">
                    {/* Number Badge */}
                    <div className="absolute top-6 left-6 z-10">
                      <span className="text-7xl font-display font-bold text-silver-100 group-hover:text-primary-100 transition-colors duration-500">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="relative p-8 pt-20">
                      {/* Icon */}
                      <div className="relative mb-6">
                        <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/25 group-hover:shadow-primary-500/40 group-hover:scale-110 transition-all duration-500">
                          <IconComponent className="w-8 h-8 text-white" />
                        </div>
                        {/* Decorative ring */}
                        <div className="absolute -inset-2 border-2 border-dashed border-primary-200 rounded-2xl opacity-0 group-hover:opacity-100 group-hover:rotate-12 transition-all duration-500" />
                      </div>

                      {/* Title & Description */}
                      <h3 className="text-xl font-display font-bold text-silver-900 mb-3 group-hover:text-primary-700 transition-colors">
                        {service.title}
                      </h3>
                      
                      <p className="text-silver-600 mb-6 line-clamp-3">
                        {service.description}
                      </p>

                      {/* Features List */}
                      <ul className="space-y-2 mb-6">
                        {service.features.slice(0, 3).map((feature, idx) => (
                          <li key={idx} className="flex items-center gap-3 text-sm text-silver-500">
                            <span className="w-1.5 h-1.5 bg-primary-500 rounded-full flex-shrink-0" />
                            <span className="line-clamp-1">{feature}</span>
                          </li>
                        ))}
                      </ul>

                      {/* Arrow Link */}
                      <div className="flex items-center justify-between pt-4 border-t border-silver-100">
                        <span className="text-sm font-medium text-primary-600">Learn more</span>
                        <div className="w-10 h-10 bg-primary-50 rounded-full flex items-center justify-center group-hover:bg-primary-500 transition-colors duration-300">
                          <ArrowUpRight size={18} className="text-primary-600 group-hover:text-white transition-colors duration-300" />
                        </div>
                      </div>
                    </div>

                    {/* Hover Accent Line */}
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-primary-500 to-accent-cyan scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>

        {/* Other Services - Compact List */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="bg-gradient-to-br from-silver-900 to-silver-800 rounded-3xl p-8 lg:p-12"
        >
          <div className="grid lg:grid-cols-12 gap-8 items-center">
            {/* Left Content */}
            <div className="lg:col-span-4">
              <h3 className="text-2xl lg:text-3xl font-display font-bold text-white mb-4">
                More Specialized Services
              </h3>
              <p className="text-silver-400 mb-6">
                From permit processing to international shipping, we've got you covered with comprehensive logistics solutions.
              </p>
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-silver-900 font-semibold rounded-xl hover:bg-primary-50 transition-colors"
              >
                Get a Quote
                <ArrowRight size={16} />
              </Link>
            </div>

            {/* Right - Service List */}
            <div className="lg:col-span-8">
              <div className="grid sm:grid-cols-3 gap-4">
                {otherServices.map((service, index) => {
                  const IconComponent = iconMap[service.icon];
                  
                  return (
                    <Link
                      key={service.id}
                      to="/services"
                      className="group p-5 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-primary-500/20 to-accent-cyan/20 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:from-primary-500/30 group-hover:to-accent-cyan/30 transition-all">
                          <IconComponent className="w-6 h-6 text-primary-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-display font-semibold text-white mb-1 line-clamp-2 group-hover:text-primary-300 transition-colors">
                            {service.title}
                          </h4>
                          <span className="inline-flex items-center gap-1 text-sm text-silver-400 group-hover:text-white transition-colors">
                            Learn more
                            <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ServicesSection;
