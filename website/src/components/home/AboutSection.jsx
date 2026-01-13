import React from 'react';
import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Target, Eye, Star, CheckCircle, Play } from 'lucide-react';
import { IoCheckmarkDoneCircleOutline } from "react-icons/io5";
import { MdStarPurple500 } from "react-icons/md";

const AboutSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const features = [
    {
      icon: Eye,
      title: "Our Vision",
      description: "To be the most preferred Integrated Logistics Service Provider offering efficient and effective solutions for Zimbabwe."
    },
    {
      icon: Target,
      title: "Our Mission",
      description: "SILVERGILL is committed to providing total quality logistical services and solutions to our clients globally."
    },
    {
      icon: MdStarPurple500,
      title: "Our Promise",
      description: "End-to-end integrated logistics solutions combined with market access, enabling customers to grow."
    }
  ];

  const highlights = [
    "Rail-based cargo specialists",
    "Full regulatory compliance",
    "Real-time shipment tracking",
    "Dedicated account managers"
  ];

  return (
    <section ref={ref} className="section-padding bg-silver-50 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Gradient blobs */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary-50/50 via-transparent to-accent-cyan/10" />
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary-100/40 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-accent-cyan/20 rounded-full blur-3xl" />
        
        {/* Subtle pattern */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.015]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="aboutPattern" width="100" height="100" patternUnits="userSpaceOnUse">
              <circle cx="50" cy="50" r="1" fill="currentColor" className="text-silver-900"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#aboutPattern)" />
        </svg>
      </div>

      <div className="container-custom relative">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left - Creative Image Composition */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="relative order-2 lg:order-1"
          >
            <div className="relative">
              {/* Main Image */}
              <div className="relative">
                {/* Background shape */}
                <div className="absolute -inset-4 bg-gradient-to-br from-primary-200/50 to-accent-cyan/30 rounded-[2.5rem] rotate-3" />
                
                {/* Primary Image */}
                <div className="relative rounded-[2rem] overflow-hidden shadow-2xl">
                  {/* IMAGE NOTE: A professional team photo or workplace shot showing Silvergill employees 
                      collaborating in a modern office or logistics center. Should convey professionalism, 
                      teamwork, and the human side of the business. */}
                  <img
                    src="/Loading-1.png"
                    alt="Silvergill Logistics Team"
                    className="w-full h-[450px] object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-silver-900/60 via-silver-900/20 to-transparent" />
                  
                  {/* Video Play Button Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      className="group w-20 h-20 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-xl"
                    >
                      <Play size={28} className="text-primary-600 ml-1 group-hover:text-primary-700" fill="currentColor" />
                    </motion.button>
                  </div>
                </div>
              </div>

              {/* Floating Success Rate Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="absolute -bottom-6 -right-6 lg:-right-10"
              >
                <div className="bg-white rounded-2xl shadow-xl p-6 border border-silver-100">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/30">
                      <IoCheckmarkDoneCircleOutline className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <div className="text-3xl font-display font-bold text-silver-900">99%</div>
                      <div className="text-sm text-silver-500">Success Rate</div>
                    </div>
                  </div>
                  <p className="text-sm text-silver-600 max-w-[180px]">
                    Industry-leading reliability in every shipment
                  </p>
                </div>
              </motion.div>

              {/* Secondary Image - Floating */}
              <motion.div
                animate={{ y: [0, -10, 0], rotate: [0, 2, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -top-8 -left-8 lg:-top-12 lg:-left-12 w-32 h-32 lg:w-40 lg:h-40"
              >
                <div className="w-full h-full rounded-2xl overflow-hidden shadow-xl border-4 border-white rotate-6">
                  {/* IMAGE NOTE: Aerial view of freight trains or rail yard, showing the rail logistics 
                      specialty. Should be dynamic and show scale of operations. */}
                  <img
                    src="https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=400&q=80"
                    alt="Rail Operations"
                    className="w-full h-full object-cover"
                  />
                </div>
              </motion.div>

              {/* Experience Badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={isInView ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.5, delay: 0.6 }}
                className="absolute top-8 right-8 lg:top-12 lg:right-12"
              >
                <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-full w-24 h-24 flex flex-col items-center justify-center text-white shadow-lg shadow-primary-500/30">
                  <span className="text-2xl font-display font-bold">15+</span>
                  <span className="text-xs text-primary-100">Years</span>
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* Right - Content */}
          <div className="order-1 lg:order-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5 }}
              className="flex items-center gap-3 mb-4"
            >
              <span className="w-12 h-[2px] bg-primary-500" />
              <span className="text-primary-600 font-semibold tracking-wide uppercase text-sm">
                About Silvergill
              </span>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-silver-900 mb-6 leading-tight"
            >
              Your Trusted Partner in{' '}
              <span className="relative inline-block">
                <span className="relative z-10 text-primary-600">African Logistics</span>
                <motion.span
                  initial={{ scaleX: 0 }}
                  animate={isInView ? { scaleX: 1 } : {}}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  className="absolute bottom-1 left-0 w-full h-3 bg-primary-100 -z-0 origin-left"
                />
              </span>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg text-silver-600 mb-8 leading-relaxed"
            >
              SILVERGILL is an integrated Logistics Solution Provider offering logistics services 
              across Sub-Saharan Africa, specializing in the movement of bulk minerals and bulk 
              commodities via rail. Through our well-established network, we are specialists in 
              rail-based solutions for all break and loose bulk cargo movements.
            </motion.p>

            {/* Highlights Grid */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="grid grid-cols-2 gap-3 mb-8"
            >
              {highlights.map((item, index) => (
                <div key={index} className="flex items-center gap-2 text-silver-700">
                  <div className="w-5 h-5 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <IoCheckmarkDoneCircleOutline size={12} className="text-primary-600" />
                  </div>
                  <span className="text-sm font-medium">{item}</span>
                </div>
              ))}
            </motion.div>

            {/* Features - Compact Cards */}
            <div className="space-y-4 mb-8">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
                  className="group flex gap-4 p-4 bg-white rounded-xl border border-silver-100 hover:border-primary-200 hover:shadow-lg transition-all duration-300"
                >
                  <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-primary-100 to-primary-50 rounded-xl flex items-center justify-center group-hover:from-primary-500 group-hover:to-primary-600 transition-all duration-300">
                    <feature.icon className="w-6 h-6 text-primary-600 group-hover:text-white transition-colors duration-300" />
                  </div>
                  <div>
                    <h4 className="font-display font-semibold text-silver-900 mb-1">
                      {feature.title}
                    </h4>
                    <p className="text-silver-600 text-sm line-clamp-2">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.7 }}
            >
              <Link
                to="/about"
                className="group inline-flex items-center gap-2 px-8 py-4 bg-silver-900 text-white font-display font-semibold rounded-xl hover:bg-primary-600 transition-colors"
              >
                Learn More About Us
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
