import React from 'react';
import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { 
  Target, Eye, Star, Users, Award, TrendingUp, 
  Shield, Clock, Handshake, CheckCircle 
} from 'lucide-react';
import SEOHead from '../components/shared/SEOHead';
import PageHero from '../components/shared/PageHero';
import { siteConfig, values } from '../data/content';
import { IoCheckmarkDoneCircleOutline } from "react-icons/io5";
import { MdStarPurple500 } from "react-icons/md";

const About = () => {
  const storyRef = useRef(null);
  const valuesRef = useRef(null);
  const teamRef = useRef(null);
  
  const storyInView = useInView(storyRef, { once: true, margin: "-100px" });
  const valuesInView = useInView(valuesRef, { once: true, margin: "-100px" });
  const teamInView = useInView(teamRef, { once: true, margin: "-100px" });

  const milestones = [
    { year: "2008", title: "Foundation", description: "Silvergill Logistics was established in Harare, Zimbabwe" },
    { year: "2012", title: "Regional Expansion", description: "Extended operations to cover the entire SADC region" },
    { year: "2016", title: "Rail Specialization", description: "Became the leading rail logistics provider in Zimbabwe" },
    { year: "2020", title: "Digital Transformation", description: "Implemented advanced tracking and management systems" },
    { year: "2024", title: "Market Leadership", description: "Recognized as Zimbabwe's premier integrated logistics provider" }
  ];

  const leadership = [
    {
      name: "Executive Management",
      role: "Strategic Leadership",
      description: "Our executive team brings decades of combined experience in logistics, supply chain management, and business development across Africa.",
      image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&q=80"
    },
    {
      name: "Operations Team",
      role: "Service Excellence",
      description: "Dedicated professionals ensuring seamless execution of all logistics operations with precision and reliability.",
      image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&q=80"
    },
    {
      name: "Client Relations",
      role: "Customer Success",
      description: "Our client-focused team works tirelessly to understand and exceed customer expectations at every touchpoint.",
      image: "https://images.unsplash.com/photo-1551836022-deb4988cc6c0?w=400&q=80"
    }
  ];

  const valueIcons = {
    "Integrity": Shield,
    "Excellence": Award,
    "Reliability": Clock,
    "Partnership": Handshake
  };

  return (
    <>
      <SEOHead
        title="About Us | Silvergill Logistics"
        description="Learn about Silvergill Logistics - Zimbabwe's leading integrated logistics provider with over 15 years of experience in freight forwarding, customs clearing, and rail transport services."
        keywords="about Silvergill, logistics company Zimbabwe, freight company history, African logistics provider"
        canonicalUrl={`${siteConfig.url}/about`}
      />

      <PageHero
        title="About Silvergill"
        subtitle="Your trusted partner in African logistics, delivering excellence since 2008"
        breadcrumbs={[{ label: "About", href: "/about" }]}
        variant="gradient"
      />

      {/* Story Section */}
      <section ref={storyRef} className="section-padding bg-white">
        <div className="container-custom">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Content */}
            <div>
              <motion.span
                initial={{ opacity: 0, y: 20 }}
                animate={storyInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5 }}
                className="inline-block px-4 py-2 bg-primary-100 text-primary-700 text-sm font-medium rounded-full mb-4"
              >
                Our Story
              </motion.span>

              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={storyInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-3xl md:text-4xl font-display font-bold text-silver-900 mb-6"
              >
                Building Zimbabwe's Logistics Future
              </motion.h2>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={storyInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="space-y-4 text-silver-600"
              >
                <p>
                  SILVERGILL is an integrated Logistics Solution Provider offering logistics 
                  services across Sub-Saharan Africa, specializing in the movement of bulk 
                  minerals and bulk commodities via rail.
                </p>
                <p>
                  Through our well-established network, we are specialists in rail-based solutions 
                  for all break and loose bulk cargo movements. Our comprehensive services include 
                  freight forwarding, customs clearing, warehousing, and end-to-end supply chain 
                  management.
                </p>
                <p>
                  We pride ourselves on delivering efficient, reliable, and cost-effective logistics 
                  solutions that enable our clients to focus on their core business operations while 
                  we handle the complexities of cargo movement across borders.
                </p>
              </motion.div>

              {/* Vision & Mission */}
              <div className="mt-8 space-y-4">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={storyInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="flex gap-4 p-4 bg-silver-50 rounded-xl"
                >
                  <div className="flex-shrink-0 w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                    <Eye className="w-6 h-6 text-primary-600" />
                  </div>
                  <div>
                    <h4 className="font-display font-semibold text-silver-900 mb-1">Our Vision</h4>
                    <p className="text-sm text-silver-600">
                      To be the most preferred Integrated Logistics Service Provider offering 
                      efficient and effective solutions for Zimbabwe.
                    </p>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={storyInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  className="flex gap-4 p-4 bg-silver-50 rounded-xl"
                >
                  <div className="flex-shrink-0 w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                    <Target className="w-6 h-6 text-primary-600" />
                  </div>
                  <div>
                    <h4 className="font-display font-semibold text-silver-900 mb-1">Our Mission</h4>
                    <p className="text-sm text-silver-600">
                      SILVERGILL is committed to providing total quality logistical services 
                      and solutions to our clients globally.
                    </p>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Image */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={storyInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.8 }}
              className="relative"
            >
              <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                <img
                  src="https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=800&q=80"
                  alt="Silvergill Logistics Operations"
                  className="w-full h-[500px] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-silver-900/40 to-transparent" />
              </div>
              
              {/* Floating Stats Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={storyInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="absolute -bottom-6 -left-6 p-6 bg-white rounded-2xl shadow-xl"
              >
                <div className="flex items-center gap-8">
                  <div className="text-center">
                    <div className="text-3xl font-display font-bold gradient-text">15+</div>
                    <div className="text-sm text-silver-500">Years</div>
                  </div>
                  <div className="w-px h-12 bg-silver-200" />
                  <div className="text-center">
                    <div className="text-3xl font-display font-bold gradient-text">500+</div>
                    <div className="text-sm text-silver-500">Clients</div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="section-padding bg-silver-50">
        <div className="container-custom">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-block px-4 py-2 bg-primary-100 text-primary-700 text-sm font-medium rounded-full mb-4"
            >
              Our Journey
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-3xl md:text-4xl font-display font-bold text-silver-900"
            >
              Milestones of Excellence
            </motion.h2>
          </div>

          <div className="relative">
            {/* Timeline Line */}
            <div className="hidden lg:block absolute left-1/2 transform -translate-x-px top-0 bottom-0 w-0.5 bg-primary-200" />

            <div className="space-y-12">
              {milestones.map((milestone, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className={`flex flex-col lg:flex-row items-center gap-8 ${
                    index % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'
                  }`}
                >
                  <div className={`flex-1 ${index % 2 === 0 ? 'lg:text-right' : 'lg:text-left'}`}>
                    <div className="bg-white p-6 rounded-2xl shadow-lg inline-block">
                      <span className="text-sm font-medium text-primary-600">{milestone.year}</span>
                      <h3 className="text-xl font-display font-bold text-silver-900 mt-1">
                        {milestone.title}
                      </h3>
                      <p className="text-silver-600 mt-2">{milestone.description}</p>
                    </div>
                  </div>

                  {/* Center Dot */}
                  <div className="relative z-10 w-4 h-4 bg-primary-500 rounded-full ring-4 ring-primary-100" />

                  <div className="flex-1" />
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section ref={valuesRef} className="section-padding bg-white">
        <div className="container-custom">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              animate={valuesInView ? { opacity: 1, y: 0 } : {}}
              className="inline-block px-4 py-2 bg-primary-100 text-primary-700 text-sm font-medium rounded-full mb-4"
            >
              Our Core Values
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={valuesInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.1 }}
              className="text-3xl md:text-4xl font-display font-bold text-silver-900"
            >
              What Drives Us Forward
            </motion.h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => {
              const IconComponent = valueIcons[value.title] || MdStarPurple500;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  animate={valuesInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="group p-6 bg-silver-50 rounded-2xl hover:bg-white hover:shadow-xl transition-all duration-300"
                >
                  <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <IconComponent className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-display font-bold text-silver-900 mb-2">
                    {value.title}
                  </h3>
                  <p className="text-silver-600">{value.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Team Section 
      <section ref={teamRef} className="section-padding bg-gradient-to-br from-silver-900 via-silver-800 to-primary-900 text-white">
        <div className="container-custom">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              animate={teamInView ? { opacity: 1, y: 0 } : {}}
              className="inline-block px-4 py-2 bg-white/10 text-primary-300 text-sm font-medium rounded-full mb-4 backdrop-blur-sm"
            >
              Our Team
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={teamInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.1 }}
              className="text-3xl md:text-4xl font-display font-bold"
            >
              Meet the People Behind Our Success
            </motion.h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {leadership.map((member, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={teamInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="group"
              >
                <div className="relative rounded-2xl overflow-hidden mb-4">
                  <img
                    src={member.image}
                    alt={member.name}
                    className="w-full h-72 object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-silver-900/80 to-transparent" />
                </div>
                <h3 className="text-xl font-display font-bold">{member.name}</h3>
                <p className="text-primary-400 font-medium mb-2">{member.role}</p>
                <p className="text-silver-300 text-sm">{member.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>*/}

      {/* Why Choose Us */}
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
                Why Choose Us
              </motion.span>
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="text-3xl md:text-4xl font-display font-bold text-silver-900 mb-6"
              >
                The Silvergill Advantage
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="text-silver-600 mb-8"
              >
                With over 15 years of experience in the logistics industry, we've built 
                a reputation for excellence, reliability, and customer-focused service 
                delivery across Sub-Saharan Africa.
              </motion.p>

              <div className="space-y-4">
                {[
                  "Comprehensive end-to-end logistics solutions",
                  "Specialized rail transport expertise",
                  "Strategic partnerships across the SADC region",
                  "Advanced tracking and monitoring systems",
                  "Dedicated customer support team",
                  "Competitive and transparent pricing"
                ].map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + index * 0.05 }}
                    className="flex items-center gap-3"
                  >
                    <IoCheckmarkDoneCircleOutline className="w-5 h-5 text-primary-500 flex-shrink-0" />
                    <span className="text-silver-700">{item}</span>
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
                      src="https://images.unsplash.com/photo-1519003722824-194d4455a60c?w=400&q=80"
                      alt="Container shipping"
                      className="w-full h-48 object-cover"
                    />
                  </div>
                  <div className="rounded-2xl overflow-hidden">
                    <img
                      src="/Loaded-Wagons2-768x1024.jpg"
                      alt="Warehouse operations"
                      className="w-full h-64 object-cover"
                    />
                  </div>
                </div>
                <div className="space-y-4 pt-8">
                  <div className="rounded-2xl overflow-hidden">
                    <img
                      src="https://images.unsplash.com/photo-1605745341112-85968b19335b?w=400&q=80"
                      alt="Rail transport"
                      className="w-full h-64 object-cover"
                    />
                  </div>
                  <div className="rounded-2xl overflow-hidden">
                    <img
                      src="Loading2.jpg"
                      alt="Logistics team"
                      className="w-full h-48 object-cover"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </>
  );
};

export default About;
