import React from 'react';
import { useState, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { 
  MapPin, 
  Phone, 
  Mail, 
  Clock, 
  Send, 
  CheckCircle,
  Building2,
  Globe,
  MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';
import SEOHead from '../components/shared/SEOHead';
import PageHero from '../components/shared/PageHero';
import { siteConfig, branches } from '../data/content';
import { IoCheckmarkDoneCircleOutline } from "react-icons/io5";
import { GiWorld } from "react-icons/gi";

const Contact = () => {
  const formRef = useRef(null);
  const isInView = useInView(formRef, { once: true, margin: "-100px" });
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    service: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsSubmitting(false);
    setIsSubmitted(true);
    toast.success('Message sent successfully! We\'ll get back to you soon.');
    
    // Reset form after delay
    setTimeout(() => {
      setFormData({
        name: '',
        email: '',
        phone: '',
        company: '',
        service: '',
        message: ''
      });
      setIsSubmitted(false);
    }, 3000);
  };

  const contactInfo = [
    {
      icon: Phone,
      title: 'Phone',
      details: [siteConfig.contact.phone, siteConfig.contact.phone2],
      action: `tel:${siteConfig.contact.phone}`
    },
    {
      icon: Mail,
      title: 'Email',
      details: [siteConfig.contact.email],
      action: `mailto:${siteConfig.contact.email}`
    },
    {
      icon: MapPin,
      title: 'Head Office',
      details: [siteConfig.contact.address],
      action: '#map'
    },
    {
      icon: Clock,
      title: 'Business Hours',
      details: ['Monday - Friday: 8:00 AM - 5:00 PM', 'Saturday: 8:00 AM - 1:00 PM'],
      action: null
    }
  ];

  const services = [
    'Road Freight',
    'Port & Shipping Agency',
    'Rail Freight',
    'Customs Clearing',
    'Freight Forwarding',
    'Project Cargo',
    'Other'
  ];

  return (
    <>
      <SEOHead
        title="Contact Us - Silvergill Logistics"
        description="Get in touch with Silvergill Logistics for all your logistics needs in Zimbabwe and Sub-Saharan Africa. Request a quote or inquire about our services."
        keywords="contact Silvergill, logistics quote Zimbabwe, freight services contact, shipping inquiry"
      />

      <PageHero
        title="Contact Us"
        subtitle="Get in touch with our team for a personalized logistics solution"
        variant="gradient"
      />

      {/* Contact Info Cards */}
      <section className="section-padding bg-white relative">
        <div className="container-custom">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {contactInfo.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <a
                  href={item.action || '#'}
                  className={`block p-6 bg-silver-50 rounded-2xl hover:bg-primary-50 transition-all duration-300 group h-full ${
                    !item.action ? 'pointer-events-none' : ''
                  }`}
                >
                  <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <item.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="font-display font-semibold text-silver-900 mb-2">
                    {item.title}
                  </h3>
                  {item.details.map((detail, i) => (
                    <p key={i} className="text-silver-600 text-sm">
                      {detail}
                    </p>
                  ))}
                </a>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form & Map Section */}
      <section ref={formRef} className="section-padding bg-silver-50 relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary-100/30 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent-cyan/10 rounded-full blur-3xl" />
        </div>

        <div className="container-custom relative">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16">
            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.6 }}
            >
              <div className="bg-white rounded-3xl shadow-xl p-8 lg:p-10">
                <div className="flex items-center gap-3 mb-2">
                  <MessageSquare className="w-6 h-6 text-primary-500" />
                  <span className="text-primary-600 font-medium">Send us a message</span>
                </div>
                <h2 className="text-2xl md:text-3xl font-display font-bold text-silver-900 mb-2">
                  Request a Quote
                </h2>
                <p className="text-silver-600 mb-8">
                  Fill out the form below and our team will get back to you within 24 hours.
                </p>

                {isSubmitted ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-12"
                  >
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <IoCheckmarkDoneCircleOutline className="w-10 h-10 text-green-600" />
                    </div>
                    <h3 className="text-xl font-display font-semibold text-silver-900 mb-2">
                      Message Sent Successfully!
                    </h3>
                    <p className="text-silver-600">
                      Thank you for reaching out. We'll respond shortly.
                    </p>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-medium text-silver-700 mb-2">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          required
                          className="w-full px-4 py-3 border border-silver-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                          placeholder="John Doe"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-silver-700 mb-2">
                          Email Address *
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          required
                          className="w-full px-4 py-3 border border-silver-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                          placeholder="john@example.com"
                        />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-medium text-silver-700 mb-2">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          className="w-full px-4 py-3 border border-silver-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                          placeholder="+263 xxx xxx xxx"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-silver-700 mb-2">
                          Company Name
                        </label>
                        <input
                          type="text"
                          name="company"
                          value={formData.company}
                          onChange={handleChange}
                          className="w-full px-4 py-3 border border-silver-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                          placeholder="Your Company"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-silver-700 mb-2">
                        Service Required *
                      </label>
                      <select
                        name="service"
                        value={formData.service}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 border border-silver-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all bg-white"
                      >
                        <option value="">Select a service</option>
                        {services.map((service, index) => (
                          <option key={index} value={service}>
                            {service}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-silver-700 mb-2">
                        Message *
                      </label>
                      <textarea
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        required
                        rows={5}
                        className="w-full px-4 py-3 border border-silver-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all resize-none"
                        placeholder="Tell us about your logistics needs..."
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full btn-primary justify-center disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Sending...
                        </>
                      ) : (
                        <>
                          Send Message
                          <Send className="ml-2 w-5 h-5" />
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </motion.div>

            {/* Map & Branch Info */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="space-y-6"
            >
              {/* Map */}
              <div id="map" className="bg-white rounded-3xl shadow-xl overflow-hidden h-[300px] lg:h-[350px]">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3798.858641855086!2d31.04749!3d-17.82936!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTfCsDQ5JzQ1LjciUyAzMcKwMDInNTEuMCJF!5e0!3m2!1sen!2szw!4v1234567890"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen=""
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Silvergill Logistics Location"
                />
              </div>

              {/* Branch Locations */}
              <div className="bg-white rounded-3xl shadow-xl p-6 lg:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <GiWorld className="w-6 h-6 text-primary-500" />
                  <h3 className="text-xl font-display font-bold text-silver-900">
                    Our Branches
                  </h3>
                </div>

                <div className="space-y-4">
                  {branches.map((branch, index) => (
                    <div
                      key={index}
                      className="flex gap-4 p-4 bg-silver-50 rounded-xl hover:bg-primary-50 transition-colors"
                    >
                      <div className="flex-shrink-0 w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-primary-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-silver-900">{branch.city}</h4>
                        <p className="text-sm text-silver-600">{branch.address}</p>
                        <p className="text-sm text-primary-600">{branch.phone}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Contact */}
              <div className="bg-gradient-to-br from-primary-600 to-primary-700 rounded-3xl p-6 lg:p-8 text-white">
                <h3 className="text-xl font-display font-bold mb-4">
                  Need Immediate Assistance?
                </h3>
                <p className="text-primary-100 mb-6">
                  Our logistics experts are available to help you with urgent shipments and queries.
                </p>
                <a
                  href={`tel:${siteConfig.contact.phone}`}
                  className="inline-flex items-center gap-2 bg-white text-primary-600 px-6 py-3 rounded-xl font-semibold hover:bg-primary-50 transition-colors"
                >
                  <Phone className="w-5 h-5" />
                  Call Now: {siteConfig.contact.phone}
                </a>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* FAQ Preview */}
      <section className="section-padding bg-white">
        <div className="container-custom">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-block px-4 py-2 bg-primary-100 text-primary-700 text-sm font-medium rounded-full mb-4"
            >
              Frequently Asked Questions
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-3xl md:text-4xl font-display font-bold text-silver-900"
            >
              Common Questions
            </motion.h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {[
              {
                q: "What areas do you service?",
                a: "We provide logistics services across Zimbabwe and Sub-Saharan Africa, with specialized routes to South African ports and regional destinations."
              },
              {
                q: "How can I track my shipment?",
                a: "Contact our customer service team with your tracking reference number, and we'll provide real-time updates on your shipment status."
              },
              {
                q: "What types of cargo do you handle?",
                a: "We handle all types of cargo including bulk minerals, agricultural products, machinery, and general freight via road and rail."
              },
              {
                q: "How do I get a quote?",
                a: "Simply fill out the contact form above or call us directly. Provide details about your cargo, origin, and destination for an accurate quote."
              }
            ].map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="p-6 bg-silver-50 rounded-2xl"
              >
                <h4 className="font-display font-semibold text-silver-900 mb-2">
                  {faq.q}
                </h4>
                <p className="text-silver-600 text-sm">
                  {faq.a}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
};

export default Contact;
