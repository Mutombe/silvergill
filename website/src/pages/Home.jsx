import React from 'react';
import SEOHead from '../components/shared/SEOHead';
import HeroHex from '../components/home/Hero';
import ServicesSection from '../components/home/ServicesSection';
import StatsSection from '../components/home/StatsSection';
import AboutSection from '../components/home/AboutSection';
import CTASection from '../components/home/CTASection';
import { siteConfig } from '../data/content';

const Home = () => {
  return (
    <>
      <SEOHead
        title={`${siteConfig.name} - Zimbabwe's Leading Integrated Logistics Provider`}
        description="Silvergill Logistics offers comprehensive logistics solutions across Sub-Saharan Africa. Specializing in rail transport, customs clearing, freight forwarding, and warehousing services."
        keywords="logistics Zimbabwe, freight forwarding, customs clearing, rail transport, cargo services, warehousing Harare, African logistics"
        canonicalUrl={siteConfig.url}
      />
      
      {/* Hero Section */}
      <HeroHex />
      
      {/* Services Overview */}
      <ServicesSection />
      
      {/* Stats Counter Section */}
      <StatsSection />
      
      {/* About Preview */}
      <AboutSection />
      
      {/* Call to Action */}
      <CTASection />
    </>
  );
};

export default Home;
