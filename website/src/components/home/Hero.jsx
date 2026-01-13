import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const HeroHex = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      subtitle: 'Integrated',
      title: 'SILVERGILL',
      description: 'Your trusted logistics partner across Sub-Saharan Africa. We deliver excellence in rail, road, and maritime freight solutions.',
      bgImage: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1920&q=80',
      images: [
        'Ship-Logistics-5.png',
        'https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?w=600&q=80',
        'https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=600&q=80',
        '7.jpg',
        '23.jpg',
      ]
    },
    {
      subtitle: 'Reliable',
      title: 'LOGISTICS',
      description: 'Specializing in bulk minerals, commodities, and project cargo with industry-leading reliability and efficiency.',
      bgImage: 'https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?w=1920&q=80',
      images: [
        'https://images.unsplash.com/photo-1519003722824-194d4455a60c?w=600&q=80',
        'Loading-1.png',
        'https://images.unsplash.com/photo-1605745341112-85968b19335b?w=600&q=80',
        'Man@Work-1.png',
        'Offloading-2.jpg',
      ]
    },
    {
      subtitle: 'Efficient',
      title: 'SOLUTIONS',
      description: 'End-to-end integrated solutions combining market access with world-class service to keep your business moving.',
      bgImage: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=1920&q=80',
      images: [
        'https://images.unsplash.com/photo-1493946740644-2d8a1f1a6aff?w=600&q=80',
        'k19.jpg',
        'raw-lithium-e1672867268425-1.png',
        'https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=600&q=80',
        'Ship-Logistics-4-1.png',
      ]
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 7000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % slides.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);

  const current = slides[currentSlide];

  const socialLinks = [
    { name: 'Export', href: '#' },
    { name: 'Port', href: '#' },
    { name: 'Ocean', href: '#' },
    { name: 'Minerals', href: '#' },
  ];

  const hexClip = 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)';

  const layoutHex = (row, col, size, gap = 10) => {
    const height = size * 1.1547;
    const xStep = size + gap;
    const yStep = (height * 0.75) + gap;
    const xOffset = (row % 2 === 1) ? (xStep / 2) : 0;

    return {
      width: `${size}px`,
      height: `${height}px`,
      left: `${col * xStep + xOffset}px`,
      top: `${row * yStep}px`,
      clipPath: hexClip,
    };
  };

  return (
    <section className="relative min-h-screen overflow-hidden bg-[#0f3a52]">
      {/* Background Image */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`bg-${currentSlide}`}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.5 }}
          className="absolute inset-0"
        >
          <img
            src={current.bgImage}
            alt=""
            className="w-full h-full object-cover"
          />
        </motion.div>
      </AnimatePresence>

      {/* Overlays */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0f3a52]/95 via-[#134965]/90 to-[#1a5a7a]/85" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0a2a3d]/80 via-[#0a2a3d]/50 to-transparent" />

      {/* Main Container - FLEX COLUMN on Mobile, ROW on Desktop */}
      {/* Added pb-20 to ensure scrolling room on mobile */}
      <div className="relative z-10 min-h-screen flex flex-col lg:flex-row items-start lg:justify-between px-6 lg:px-12 xl:px-20 pt-32 lg:pt-48 pb-20 lg:pb-0">
        
        {/* Left Content Text */}
        <div className="w-full lg:w-[45%] relative z-20">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.6 }}
            >
              <motion.span
                className="block text-2xl md:text-3xl lg:text-4xl text-[#7dd3fc] mb-1"
                style={{ fontFamily: "'Playfair Display', Georgia, serif", fontStyle: 'italic' }}
              >
                {current.subtitle}
              </motion.span>
              
              <motion.h1
                className="text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold text-white tracking-tight leading-[0.9] mb-6"
                style={{ fontFamily: "'Outfit', sans-serif" }}
              >
                {current.title}
              </motion.h1>
              
              <motion.p className="text-gray-300/90 text-sm md:text-base max-w-[400px] leading-relaxed">
                {current.description}
              </motion.p>
            </motion.div>
          </AnimatePresence>

          {/* Navigation Buttons */}
          <div className="flex items-center gap-2 mt-8">
            <button onClick={prevSlide} className="w-10 h-10 border border-white/30 flex items-center justify-center text-white/60 hover:text-white hover:border-white/60 transition-all">
              <ChevronLeft size={18} />
            </button>
            <button onClick={nextSlide} className="w-10 h-10 border border-white/30 flex items-center justify-center text-white/60 hover:text-white hover:border-white/60 transition-all">
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Social Links */}
          <div className="hidden lg:flex items-center gap-6 mt-10">
            {socialLinks.map((social, index) => (
              <a key={index} href={social.href} className="text-xs text-gray-400/80 hover:text-[#7dd3fc] transition-colors tracking-[0.15em] uppercase">
                {social.name}
              </a>
            ))}
          </div>
        </div>

        {/* =============================================
            DESKTOP HONEYCOMB GRID
            =============================================
        */}
        <div className="hidden lg:block relative w-[600px] h-[500px] xl:-mr-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="relative w-full h-full"
            >
              {/* Desktop Layout: Standard Cluster */}
              <motion.div className="absolute" style={layoutHex(0, 0, 160, 15)} initial={{opacity:0, scale:0.8}} animate={{opacity:1, scale:1}} transition={{delay:0.1}}>
                <img src={current.images[0]} alt="" className="w-full h-full object-cover" />
              </motion.div>
              <motion.div className="absolute" style={layoutHex(0, 1, 160, 15)} initial={{opacity:0, scale:0.8}} animate={{opacity:1, scale:1}} transition={{delay:0.2}}>
                <img src={current.images[1]} alt="" className="w-full h-full object-cover" />
              </motion.div>
              <motion.div className="absolute" style={layoutHex(1, 0, 160, 15)} initial={{opacity:0, scale:0.8}} animate={{opacity:1, scale:1}} transition={{delay:0.3}}>
                <img src={current.images[2]} alt="" className="w-full h-full object-cover" />
              </motion.div>
              <motion.div className="absolute z-10" style={layoutHex(1, 1, 160, 15)} initial={{opacity:0, scale:0.8}} animate={{opacity:1, scale:1}} transition={{delay:0.4}}>
                <Link to="/contact" className="block w-full h-full bg-gradient-to-br from-[#7dd3fc] to-[#38bdf8] hover:from-[#a5e4fd] hover:to-[#5bcefa] transition-all duration-300 group">
                  <span className="absolute inset-0 flex flex-col items-center justify-center text-[#0a2a3d] font-bold">
                    <span className="text-sm tracking-[0.2em] group-hover:scale-105 transition-transform">GET A</span>
                    <span className="text-2xl tracking-[0.15em] mt-1 group-hover:scale-105 transition-transform">QUOTE</span>
                  </span>
                </Link>
              </motion.div>
              <motion.div className="absolute" style={layoutHex(1, 2, 160, 15)} initial={{opacity:0, scale:0.8}} animate={{opacity:1, scale:1}} transition={{delay:0.5}}>
                <img src={current.images[3]} alt="" className="w-full h-full object-cover" />
              </motion.div>
              <motion.div className="absolute" style={layoutHex(2, 1, 160, 15)} initial={{opacity:0, scale:0.8}} animate={{opacity:1, scale:1}} transition={{delay:0.6}}>
                <img src={current.images[4]} alt="" className="w-full h-full object-cover" />
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* =============================================
            MOBILE HONEYCOMB GRID - FIXED
            =============================================
            Changes: 
            1. Position relative (not absolute) so it sits BELOW text.
            2. Uses same layout logic as desktop, just scaled down (size=85)
            3. Centered with mx-auto
        */}
        <div className="lg:hidden relative w-[300px] h-[350px] mt-12 mx-auto z-20">
          <AnimatePresence mode="wait">
            <motion.div
              key={`mob-${currentSlide}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="relative w-full h-full"
            >
              {/* Row 0 */}
              <motion.div className="absolute" style={layoutHex(0, 0, 90, 8)} initial={{opacity:0, scale:0.8}} animate={{opacity:1, scale:1}} transition={{delay:0.1}}>
                  <img src={current.images[0]} alt="" className="w-full h-full object-cover" />
              </motion.div>
              <motion.div className="absolute" style={layoutHex(0, 1, 90, 8)} initial={{opacity:0, scale:0.8}} animate={{opacity:1, scale:1}} transition={{delay:0.2}}>
                  <img src={current.images[1]} alt="" className="w-full h-full object-cover" />
              </motion.div>

              {/* Row 1 */}
              <motion.div className="absolute" style={layoutHex(1, 0, 90, 8)} initial={{opacity:0, scale:0.8}} animate={{opacity:1, scale:1}} transition={{delay:0.3}}>
                  <img src={current.images[2]} alt="" className="w-full h-full object-cover" />
              </motion.div>
              
              {/* CTA - Center */}
              <motion.div className="absolute z-10" style={layoutHex(1, 1, 90, 8)} initial={{opacity:0, scale:0.8}} animate={{opacity:1, scale:1}} transition={{delay:0.4}}>
                  <Link to="/contact" className="block w-full h-full bg-gradient-to-br from-[#7dd3fc] to-[#38bdf8] flex items-center justify-center font-bold text-[#0a2a3d]">
                    <span className="flex flex-col items-center"><span className="text-[10px] tracking-widest">GET A</span><span className="text-sm tracking-widest">QUOTE</span></span>
                  </Link>
              </motion.div>

              <motion.div className="absolute" style={layoutHex(1, 2, 90, 8)} initial={{opacity:0, scale:0.8}} animate={{opacity:1, scale:1}} transition={{delay:0.5}}>
                  <img src={current.images[3]} alt="" className="w-full h-full object-cover" />
              </motion.div>

              {/* Row 2 */}
              <motion.div className="absolute" style={layoutHex(2, 1, 90, 8)} initial={{opacity:0, scale:0.8}} animate={{opacity:1, scale:1}} transition={{delay:0.6}}>
                  <img src={current.images[4]} alt="" className="w-full h-full object-cover" />
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </div>

      </div>

      {/* Slide Indicators */}
      <div className="absolute bottom-6 left-6 lg:left-12 z-30 flex items-center gap-2">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              index === currentSlide ? 'bg-[#7dd3fc] w-8' : 'bg-white/30 w-1.5 hover:bg-white/50'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;1,400;1,500&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap');
      `}</style>
    </section>
  );
};

export default HeroHex;