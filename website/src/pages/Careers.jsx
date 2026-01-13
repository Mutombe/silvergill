import React from 'react';
import { useState, useRef } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  MapPin, Clock, Briefcase, ChevronDown, 
  CheckCircle, Users, Heart, TrendingUp,
  Award, Coffee, Laptop, ArrowRight, Send
} from 'lucide-react';
import SEOHead from '../components/shared/SEOHead';
import PageHero from '../components/shared/PageHero';
import { siteConfig, careers } from '../data/content';
import { IoCheckmarkDoneCircleOutline } from "react-icons/io5";

const Careers = () => {
  const [expandedJob, setExpandedJob] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const benefitsRef = useRef(null);
  const benefitsInView = useInView(benefitsRef, { once: true, margin: "-100px" });

  const departments = ['All', 'Operations', 'Finance', 'Sales', 'IT', 'HR'];

  const benefits = [
    {
      icon: Heart,
      title: "Health & Wellness",
      description: "Comprehensive medical aid coverage for you and your family"
    },
    {
      icon: TrendingUp,
      title: "Career Growth",
      description: "Clear progression paths and continuous learning opportunities"
    },
    {
      icon: Award,
      title: "Recognition",
      description: "Performance bonuses and employee recognition programs"
    },
    {
      icon: Coffee,
      title: "Work-Life Balance",
      description: "Flexible working arrangements and paid time off"
    },
    {
      icon: Laptop,
      title: "Modern Tools",
      description: "Latest technology and equipment to do your best work"
    },
    {
      icon: Users,
      title: "Team Culture",
      description: "Collaborative environment with regular team activities"
    }
  ];

  const filteredJobs = selectedDepartment === 'All'
    ? careers
    : careers.filter(job => job.department === selectedDepartment);

  const values = [
    "We value diversity and inclusion",
    "We invest in employee development",
    "We promote from within",
    "We celebrate achievements together"
  ];

  return (
    <>
      <SEOHead
        title="Careers | Silvergill Logistics"
        description="Join the Silvergill Logistics team. Explore career opportunities in logistics, operations, and management across Zimbabwe and the SADC region."
        keywords="Silvergill careers, logistics jobs Zimbabwe, freight forwarding jobs, supply chain careers"
        canonicalUrl={`${siteConfig.url}/careers`}
      />

      <PageHero
        title="Careers"
        subtitle="Build your career with Zimbabwe's leading logistics provider"
        breadcrumbs={[{ label: "Careers", href: "/careers" }]}
        variant="gradient"
      />

      {/* Why Join Us */}
      <section className="section-padding bg-white">
        <div className="container-custom">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <motion.span
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="inline-block px-4 py-2 bg-primary-100 text-primary-700 text-sm font-medium rounded-full mb-4"
              >
                Why Join Us
              </motion.span>
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="text-3xl md:text-4xl font-display font-bold text-silver-900 mb-6"
              >
                Build Your Future With Silvergill
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="text-silver-600 mb-8"
              >
                At Silvergill, we believe our people are our greatest asset. We offer 
                a dynamic work environment where talent is nurtured, innovation is 
                encouraged, and success is rewarded.
              </motion.p>

              <div className="space-y-3">
                {values.map((value, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                    className="flex items-center gap-3"
                  >
                    <IoCheckmarkDoneCircleOutline className="w-5 h-5 text-primary-500 flex-shrink-0" />
                    <span className="text-silver-700">{value}</span>
                  </motion.div>
                ))}
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="rounded-2xl overflow-hidden">
                    <img
                      src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&q=80"
                      alt="Team collaboration"
                      className="w-full h-48 object-cover"
                    />
                  </div>
                  <div className="rounded-2xl overflow-hidden">
                    <img
                      src="https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=400&q=80"
                      alt="Office environment"
                      className="w-full h-64 object-cover"
                    />
                  </div>
                </div>
                <div className="space-y-4 pt-8">
                  <div className="rounded-2xl overflow-hidden">
                    <img
                      src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=400&q=80"
                      alt="Team meeting"
                      className="w-full h-64 object-cover"
                    />
                  </div>
                  <div className="rounded-2xl overflow-hidden">
                    <img
                      src="https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&q=80"
                      alt="Professional growth"
                      className="w-full h-48 object-cover"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section ref={benefitsRef} className="section-padding bg-silver-50">
        <div className="container-custom">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              animate={benefitsInView ? { opacity: 1, y: 0 } : {}}
              className="inline-block px-4 py-2 bg-primary-100 text-primary-700 text-sm font-medium rounded-full mb-4"
            >
              Benefits & Perks
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={benefitsInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.1 }}
              className="text-3xl md:text-4xl font-display font-bold text-silver-900"
            >
              What We Offer
            </motion.h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={benefitsInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="group p-6 bg-white rounded-2xl hover:shadow-xl transition-all duration-300"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <benefit.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-display font-bold text-silver-900 mb-2">
                  {benefit.title}
                </h3>
                <p className="text-silver-600 text-sm">{benefit.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Job Listings */}
      <section className="section-padding bg-white">
        <div className="container-custom">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-block px-4 py-2 bg-primary-100 text-primary-700 text-sm font-medium rounded-full mb-4"
            >
              Open Positions
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-3xl md:text-4xl font-display font-bold text-silver-900 mb-4"
            >
              Current Opportunities
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-silver-600"
            >
              Explore our open positions and find the perfect role for your skills and aspirations.
            </motion.p>
          </div>

          {/* Department Filter */}
          <div className="flex items-center justify-center gap-2 mb-12 overflow-x-auto pb-2">
            {departments.map((dept) => (
              <button
                key={dept}
                onClick={() => setSelectedDepartment(dept)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedDepartment === dept
                    ? 'bg-primary-600 text-white'
                    : 'bg-silver-100 text-silver-600 hover:bg-silver-200'
                }`}
              >
                {dept}
              </button>
            ))}
          </div>

          {/* Job Cards */}
          {filteredJobs.length > 0 ? (
            <div className="space-y-4 max-w-3xl mx-auto">
              {filteredJobs.map((job, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-silver-50 rounded-2xl overflow-hidden"
                >
                  {/* Job Header */}
                  <button
                    onClick={() => setExpandedJob(expandedJob === index ? null : index)}
                    className="w-full p-6 text-left flex items-center justify-between hover:bg-silver-100 transition-colors"
                  >
                    <div>
                      <h3 className="text-lg font-display font-bold text-silver-900 mb-2">
                        {job.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-silver-500">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {job.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Briefcase className="w-4 h-4" />
                          {job.type}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {job.posted}
                        </span>
                      </div>
                    </div>
                    <ChevronDown className={`w-5 h-5 text-silver-400 transition-transform duration-300 ${
                      expandedJob === index ? 'rotate-180' : ''
                    }`} />
                  </button>

                  {/* Job Details */}
                  <AnimatePresence>
                    {expandedJob === index && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="px-6 pb-6 border-t border-silver-200 pt-6">
                          <p className="text-silver-600 mb-6">{job.description}</p>

                          <h4 className="font-display font-semibold text-silver-900 mb-3">
                            Requirements
                          </h4>
                          <ul className="space-y-2 mb-6">
                            {job.requirements.map((req, rIndex) => (
                              <li key={rIndex} className="flex items-start gap-2">
                                <IoCheckmarkDoneCircleOutline className="w-4 h-4 text-primary-500 mt-0.5 flex-shrink-0" />
                                <span className="text-silver-600 text-sm">{req}</span>
                              </li>
                            ))}
                          </ul>

                          <Link
                            to="/contact"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors"
                          >
                            Apply Now
                            <ArrowRight className="w-4 h-4" />
                          </Link>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <div className="w-16 h-16 bg-silver-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Briefcase className="w-8 h-8 text-silver-400" />
              </div>
              <h3 className="text-xl font-display font-bold text-silver-900 mb-2">No positions available</h3>
              <p className="text-silver-600 mb-4">No open positions in this department at the moment.</p>
              <button
                onClick={() => setSelectedDepartment('All')}
                className="text-primary-600 font-medium hover:underline"
              >
                View all positions
              </button>
            </motion.div>
          )}
        </div>
      </section>

      {/* Application CTA */}
      <section className="section-padding bg-gradient-to-br from-silver-900 via-silver-800 to-primary-900 text-white">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-6"
            >
              <Send className="w-8 h-8 text-primary-300" />
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-3xl md:text-4xl font-display font-bold mb-4"
            >
              Don't See the Right Position?
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-silver-300 mb-8"
            >
              We're always looking for talented individuals to join our team. Send us your CV 
              and we'll keep you in mind for future opportunities.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <a
                href={`mailto:${siteConfig.contact.email}?subject=General Application`}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-primary-600 font-semibold rounded-xl hover:bg-silver-100 transition-colors"
              >
                <Send className="w-5 h-5" />
                Send Your CV
              </a>
              <Link
                to="/contact"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/10 text-white font-semibold rounded-xl hover:bg-white/20 transition-colors backdrop-blur-sm"
              >
                Contact HR Team
              </Link>
            </motion.div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Careers;
