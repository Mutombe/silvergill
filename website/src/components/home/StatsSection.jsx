import React from 'react';
import { useRef, useEffect, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { stats } from '../../data/content';

const AnimatedCounter = ({ end, suffix = '', duration = 2 }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;

    const endValue = parseInt(end);
    const increment = endValue / (duration * 60);
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= endValue) {
        setCount(endValue);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, 1000 / 60);

    return () => clearInterval(timer);
  }, [isInView, end, duration]);

  return (
    <span ref={ref}>
      {count}
      {suffix}
    </span>
  );
};

const StatsSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <section ref={ref} className="relative py-20 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-silver-900 via-silver-800 to-primary-900">
        {/* Decorative Elements */}
        <div className="absolute inset-0 opacity-20">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="statsPattern" width="60" height="60" patternUnits="userSpaceOnUse">
                <circle cx="30" cy="30" r="1.5" fill="currentColor" className="text-white"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#statsPattern)" />
          </svg>
        </div>
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent-cyan/10 rounded-full blur-3xl" />
      </div>

      <div className="container-custom relative">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="text-center"
            >
              <div className="relative inline-block mb-4">
                {/* Number with gradient */}
                <div className="text-5xl md:text-6xl lg:text-7xl font-display font-bold text-white">
                  <AnimatedCounter 
                    end={stat.number.replace(/\D/g, '')} 
                    suffix={stat.suffix}
                  />
                </div>
                {/* Decorative underline */}
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-12 h-1 bg-gradient-to-r from-primary-500 to-accent-cyan rounded-full" />
              </div>
              <p className="text-silver-300 font-medium text-lg">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Bottom tagline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-16 text-center"
        >
          <p className="text-xl md:text-2xl text-silver-300 font-display max-w-3xl mx-auto">
            Trusted by leading mining companies across{' '}
            <span className="text-white font-semibold">Sub-Saharan Africa</span>
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default StatsSection;
