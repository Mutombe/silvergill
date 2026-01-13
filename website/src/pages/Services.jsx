import React from 'react';
import { useState, useRef } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Truck, Ship, Anchor, FileCheck, ClipboardCheck, Globe,
  ArrowRight, CheckCircle, Phone, Mail, ChevronDown
} from 'lucide-react';
import SEOHead from '../components/shared/SEOHead';
import PageHero from '../components/shared/PageHero';
import { siteConfig, services } from '../data/content';
import { IoCheckmarkDoneCircleOutline } from "react-icons/io5";
import { GiWorld } from "react-icons/gi";

const iconMap = {
  Truck,
  Ship,
  Anchor,
  FileCheck,
  ClipboardCheck,
  GiWorld
};

const Services = () => {
  const [expandedService, setExpandedService] = useState(null);
  const processRef = useRef(null);
  const processInView = useInView(processRef, { once: true, margin: "-100px" });

  const processSteps = [
    {
      step: "01",
      title: "Consultation",
      description: "We assess your logistics needs and develop a customized solution"
    },
    {
      step: "02",
      title: "Planning",
      description: "Detailed route planning, documentation, and timeline establishment"
    },
    {
      step: "03",
      title: "Execution",
      description: "Professional handling and transport of your cargo with real-time tracking"
    },
    {
      step: "04",
      title: "Delivery",
      description: "Safe and timely delivery with complete documentation and reporting"
    }
  ];

  return (
    <>
      <SEOHead
        title="Our Services | Silvergill Logistics"
        description="Comprehensive logistics services including rail transport, customs clearing, freight forwarding, warehousing, and port agency services across Sub-Saharan Africa."
        keywords="logistics services Zimbabwe, freight forwarding, customs clearing, rail transport, warehousing services, cargo handling"
        canonicalUrl={`${siteConfig.url}/services`}
      />

      <PageHero
        title="Our Services"
        subtitle="Comprehensive logistics solutions tailored to your business needs"
        breadcrumbs={[{ label: "Services", href: "/services" }]}
        variant="gradient"
      />

      {/* Services Grid */}
      <section className="section-padding bg-white">
        <div className="container-custom">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-block px-4 py-2 bg-primary-100 text-primary-700 text-sm font-medium rounded-full mb-4"
            >
              What We Offer
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-3xl md:text-4xl font-display font-bold text-silver-900 mb-4"
            >
              End-to-End Logistics Solutions
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-silver-600"
            >
              From customs clearing to final delivery, we provide comprehensive logistics 
              services that keep your supply chain moving efficiently across borders.
            </motion.p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service, index) => {
              const IconComponent = iconMap[service.icon] || Truck;
              const isExpanded = expandedService === index;

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="group"
                >
                  <div className="h-full bg-silver-50 rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300">
                    {/* Service Image */}
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={service.image}
                        alt={service.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-silver-900/70 to-transparent" />
                      <div className="absolute bottom-4 left-4">
                        <div className="w-12 h-12 bg-white/90 backdrop-blur-sm rounded-xl flex items-center justify-center">
                          <IconComponent className="w-6 h-6 text-primary-600" />
                        </div>
                      </div>
                    </div>

                    {/* Service Content */}
                    <div className="p-6">
                      <h3 className="text-xl font-display font-bold text-silver-900 mb-2">
                        {service.title}
                      </h3>
                      <p className="text-silver-600 mb-4">{service.description}</p>

                      {/* Features Toggle */}
                      <button
                        onClick={() => setExpandedService(isExpanded ? null : index)}
                        className="flex items-center justify-between w-full text-primary-600 font-medium group/btn"
                      >
                        <span>View Features</span>
                        <ChevronDown 
                          className={`w-5 h-5 transition-transform duration-300 ${
                            isExpanded ? 'rotate-180' : ''
                          }`} 
                        />
                      </button>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                          >
                            <ul className="pt-4 space-y-2">
                              {service.features.map((feature, fIndex) => (
                                <li key={fIndex} className="flex items-start gap-2">
                                  <IoCheckmarkDoneCircleOutline className="w-4 h-4 text-primary-500 mt-0.5 flex-shrink-0" />
                                  <span className="text-sm text-silver-600">{feature}</span>
                                </li>
                              ))}
                            </ul>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Rail Transport Highlight */}
      <section className="section-padding bg-gradient-to-br from-silver-900 via-silver-800 to-primary-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent-cyan/10 rounded-full blur-3xl" />
        </div>

        <div className="container-custom relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <motion.span
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="inline-block px-4 py-2 bg-white/10 text-primary-300 text-sm font-medium rounded-full mb-4 backdrop-blur-sm"
              >
                Specialized Service
              </motion.span>
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="text-3xl md:text-4xl font-display font-bold mb-6"
              >
                Rail Transport Excellence
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="text-silver-300 mb-8"
              >
                As specialists in rail-based logistics, we offer unmatched expertise in 
                moving bulk minerals and commodities across Sub-Saharan Africa. Our 
                established rail networks provide cost-effective and efficient solutions 
                for high-volume cargo movements.
              </motion.p>

              <div className="grid grid-cols-2 gap-6 mb-8">
                {[
                  { value: "50+", label: "Countries Served" },
                  { value: "1M+", label: "Tons Transported" },
                  { value: "24/7", label: "Operations" },
                  { value: "99%", label: "On-Time Delivery" }
                ].map((stat, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                    className="p-4 bg-white/5 rounded-xl backdrop-blur-sm"
                  >
                    <div className="text-2xl font-display font-bold text-primary-400">{stat.value}</div>
                    <div className="text-sm text-silver-400">{stat.label}</div>
                  </motion.div>
                ))}
              </div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5 }}
              >
                <Link to="/contact" className="btn-primary">
                  Get Rail Transport Quote
                  <ArrowRight size={18} className="ml-2" />
                </Link>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="rounded-2xl overflow-hidden shadow-2xl">
                <img
                  src="https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=800&q=80"
                  alt="Rail Transport"
                  className="w-full h-[400px] object-cover"
                />
              </div>
              <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-gradient-to-br from-primary-500/30 to-accent-cyan/30 rounded-2xl -z-10" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section ref={processRef} className="section-padding bg-silver-50">
        <div className="container-custom">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              animate={processInView ? { opacity: 1, y: 0 } : {}}
              className="inline-block px-4 py-2 bg-primary-100 text-primary-700 text-sm font-medium rounded-full mb-4"
            >
              How It Works
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={processInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.1 }}
              className="text-3xl md:text-4xl font-display font-bold text-silver-900"
            >
              Our Simple Process
            </motion.h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {processSteps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={processInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: index * 0.15 }}
                className="relative"
              >
                {/* Connector Line */}
                {index < processSteps.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-1/2 w-full h-0.5 bg-primary-200" />
                )}

                <div className="relative bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center mb-4 mx-auto">
                    <span className="text-2xl font-display font-bold text-white">{step.step}</span>
                  </div>
                  <h3 className="text-xl font-display font-bold text-silver-900 text-center mb-2">
                    {step.title}
                  </h3>
                  <p className="text-silver-600 text-center text-sm">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section-padding bg-white">
        <div className="container-custom">
          <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-3xl p-8 md:p-12 lg:p-16 relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent-cyan/10 rounded-full blur-3xl" />
            </div>

            <div className="relative grid lg:grid-cols-2 gap-8 items-center">
              <div className="text-white">
                <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
                  Need a Custom Logistics Solution?
                </h2>
                <p className="text-primary-100 mb-6">
                  Our team of experts is ready to design a tailored logistics strategy 
                  that meets your specific business requirements.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link 
                    to="/contact" 
                    className="inline-flex items-center justify-center px-6 py-3 bg-white text-primary-600 font-semibold rounded-xl hover:bg-silver-50 transition-colors duration-200"
                  >
                    Get Free Quote
                    <ArrowRight size={18} className="ml-2" />
                  </Link>
                  <a 
                    href={`tel:${siteConfig.contact.phone}`}
                    className="inline-flex items-center justify-center px-6 py-3 bg-white/10 text-white font-semibold rounded-xl hover:bg-white/20 transition-colors duration-200 backdrop-blur-sm"
                  >
                    <Phone size={18} className="mr-2" />
                    Call Us Now
                  </a>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 lg:justify-end">
                <div className="p-6 bg-white/10 rounded-2xl backdrop-blur-sm">
                  <Phone className="w-8 h-8 text-primary-200 mb-3" />
                  <p className="text-sm text-primary-200">Call us anytime</p>
                  <p className="text-lg font-semibold text-white">{siteConfig.contact.phone}</p>
                </div>
                <div className="p-6 bg-white/10 rounded-2xl backdrop-blur-sm">
                  <Mail className="w-8 h-8 text-primary-200 mb-3" />
                  <p className="text-sm text-primary-200">Email us at</p>
                  <p className="text-lg font-semibold text-white">{siteConfig.contact.email}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Services;
