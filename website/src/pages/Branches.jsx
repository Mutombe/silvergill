import React, { useState, useRef, useEffect } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { 
  MapPin, Phone, Mail, Clock, Globe, 
  Building2, ChevronRight, Navigation, ExternalLink,
  Truck, Ship, Train, ArrowRight, CheckCircle
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import SEOHead from '../components/shared/SEOHead';
import PageHero from '../components/shared/PageHero';
import { siteConfig, branches } from '../data/content';

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom marker icon
const createCustomIcon = (isActive) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width: 40px;
        height: 40px;
        background: ${isActive ? 'linear-gradient(135deg, #0ea5e9, #0284c7)' : 'linear-gradient(135deg, #64748b, #475569)'};
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        border: 3px solid white;
      ">
        <svg style="transform: rotate(45deg); width: 18px; height: 18px; color: white;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
        </svg>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40],
  });
};

// Map center controller component
const MapController = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1.5 });
  }, [center, zoom, map]);
  return null;
};

const Branches = () => {
  const [selectedBranch, setSelectedBranch] = useState(0);
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef(null);
  const mapInView = useInView(mapRef, { once: true, margin: "-100px" });
  const ctaRef = useRef(null);
  const ctaInView = useInView(ctaRef, { once: true, margin: "-100px" });

  // Branch coordinates and enhanced data
  const branchData = [
    {
      ...branches[0],
      coords: [-17.8292, 31.0522],
      image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=80",
      services: ["Road Freight", "Rail Freight", "Customs Clearing"],
      teamSize: "45+ Staff"
    },
    {
      ...branches[1],
      coords: [-20.1325, 28.6265],
      image: "https://images.unsplash.com/photo-1554435493-93422e8220c8?w=800&q=80",
      services: ["Road Freight", "Warehousing", "Distribution"],
      teamSize: "25+ Staff"
    },
    {
      ...branches[2],
      coords: [-19.8436, 34.8389],
      image: "https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=800&q=80",
      services: ["Port Agency", "Shipping", "Freight Forwarding"],
      teamSize: "30+ Staff"
    }
  ];

  const regions = [
    { name: "Zimbabwe", cities: ["Harare", "Bulawayo", "Mutare"], flag: "🇿🇼" },
    { name: "Mozambique", cities: ["Beira", "Maputo"], flag: "🇲🇿" },
    { name: "South Africa", cities: ["Johannesburg", "Durban"], flag: "🇿🇦" },
    { name: "Zambia", cities: ["Lusaka", "Ndola"], flag: "🇿🇲" },
    { name: "Botswana", cities: ["Gaborone", "Francistown"], flag: "🇧🇼" }
  ];

  const currentBranch = branchData[selectedBranch];

  useEffect(() => {
    // Small delay for map initialization
    const timer = setTimeout(() => setMapReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <SEOHead
        title="Our Branches | Silvergill Logistics"
        description="Find Silvergill Logistics offices across Zimbabwe and the SADC region. Locations in Harare, Bulawayo, and Beira to serve your logistics needs."
        keywords="Silvergill locations, logistics office Harare, freight office Bulawayo, logistics Beira, African logistics network"
        canonicalUrl={`${siteConfig.url}/branches`}
      />

      <PageHero
        title="Our Branches"
        subtitle="Strategically located across Sub-Saharan Africa to serve you better"
        breadcrumbs={[{ label: "Branches", href: "/branches" }]}
        variant="gradient"
      />

      {/* Interactive Map Section */}
      <section className="py-20 bg-white relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-[0.02]">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>

        <div className="container-custom relative">
          {/* Section Header */}
          <div className="text-center max-w-2xl mx-auto mb-12">
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-block px-4 py-2 bg-primary-100 text-primary-700 text-sm font-medium rounded-full mb-4"
            >
              Our Locations
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-silver-900 mb-4"
            >
              Find Us <span className="gradient-text">Near You</span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-silver-600 text-lg"
            >
              With offices across key logistics hubs, we're always within reach 
              to support your supply chain operations.
            </motion.p>
          </div>

          {/* Map and Branch Details Grid */}
          <div className="grid lg:grid-cols-5 gap-8">
            {/* Branch Selector Cards */}
            <div className="lg:col-span-2 space-y-4">
              {branchData.map((branch, index) => (
                <motion.button
                  key={index}
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => setSelectedBranch(index)}
                  className={`w-full text-left rounded-2xl transition-all duration-500 overflow-hidden ${
                    selectedBranch === index
                      ? 'ring-2 ring-primary-500 shadow-xl'
                      : 'hover:shadow-lg'
                  }`}
                >
                  <div className={`p-5 ${
                    selectedBranch === index
                      ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white'
                      : 'bg-silver-50 text-silver-900 hover:bg-silver-100'
                  }`}>
                    <div className="flex items-start gap-4">
                      {/* Branch Image Thumbnail */}
                      <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                        <img 
                          src={branch.image} 
                          alt={branch.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-display font-bold text-lg truncate">{branch.city}</h3>
                          {branch.isHeadquarters && (
                            <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                              selectedBranch === index 
                                ? 'bg-white/20 text-white' 
                                : 'bg-primary-100 text-primary-700'
                            }`}>
                              HQ
                            </span>
                          )}
                        </div>
                        <p className={`text-sm mb-2 ${
                          selectedBranch === index ? 'text-primary-100' : 'text-silver-500'
                        }`}>
                          {branch.address}
                        </p>
                        <div className="flex items-center gap-3 text-xs">
                          <span className={`flex items-center gap-1 ${
                            selectedBranch === index ? 'text-primary-200' : 'text-silver-400'
                          }`}>
                            <Phone className="w-3 h-3" />
                            {branch.phone}
                          </span>
                        </div>
                      </div>

                      <ChevronRight className={`w-5 h-5 flex-shrink-0 transition-transform duration-300 ${
                        selectedBranch === index ? 'rotate-90 text-white' : 'text-silver-400'
                      }`} />
                    </div>

                    {/* Expanded Details */}
                    <AnimatePresence>
                      {selectedBranch === index && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div className="pt-4 mt-4 border-t border-white/20">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="text-primary-200 text-xs mb-1">Services</p>
                                <div className="flex flex-wrap gap-1">
                                  {branch.services.map((service, i) => (
                                    <span key={i} className="px-2 py-0.5 bg-white/10 rounded text-xs">
                                      {service}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <p className="text-primary-200 text-xs mb-1">Team Size</p>
                                <p className="font-semibold">{branch.teamSize}</p>
                              </div>
                            </div>
                            
                            <div className="flex gap-2 mt-4">
                              <a
                                href={`tel:${branch.phone}`}
                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors"
                              >
                                <Phone className="w-4 h-4" />
                                Call
                              </a>
                              <a
                                href={`mailto:${branch.email}`}
                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors"
                              >
                                <Mail className="w-4 h-4" />
                                Email
                              </a>
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(branch.address)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white text-primary-600 hover:bg-primary-50 rounded-lg text-sm font-semibold transition-colors"
                              >
                                <Navigation className="w-4 h-4" />
                                Directions
                              </a>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.button>
              ))}
            </div>

            {/* Interactive Map */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="lg:col-span-3"
            >
              <div className="bg-silver-100 rounded-3xl overflow-hidden shadow-2xl h-[500px] relative">
                {mapReady && (
                  <MapContainer
                    center={currentBranch.coords}
                    zoom={6}
                    style={{ height: '100%', width: '100%' }}
                    zoomControl={false}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <MapController center={currentBranch.coords} zoom={10} />
                    
                    {branchData.map((branch, index) => (
                      <Marker
                        key={index}
                        position={branch.coords}
                        icon={createCustomIcon(selectedBranch === index)}
                        eventHandlers={{
                          click: () => setSelectedBranch(index),
                        }}
                      >
                        <Popup>
                          <div className="p-2 min-w-[200px]">
                            <h4 className="font-bold text-silver-900 mb-1">{branch.name}</h4>
                            <p className="text-sm text-silver-600 mb-2">{branch.address}</p>
                            <a 
                              href={`tel:${branch.phone}`}
                              className="text-primary-600 text-sm font-medium hover:underline"
                            >
                              {branch.phone}
                            </a>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                  </MapContainer>
                )}

                {/* Map Overlay Info Card */}
                <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-72 z-[1000]">
                  <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-primary-600" />
                      </div>
                      <div>
                        <p className="text-xs text-silver-500">Currently Viewing</p>
                        <h4 className="font-bold text-silver-900">{currentBranch.city}</h4>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-silver-600">
                      <Clock className="w-4 h-4" />
                      <span>Mon-Fri: 8AM - 5PM</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Regional Coverage */}
      <section ref={mapRef} className="py-20 bg-gradient-to-br from-silver-900 via-silver-800 to-primary-900 text-white relative overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent-cyan/10 rounded-full blur-3xl" />
        
        {/* Animated Background Grid */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '50px 50px'
          }} />
        </div>

        <div className="container-custom relative">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              animate={mapInView ? { opacity: 1, y: 0 } : {}}
              className="inline-block px-4 py-2 bg-white/10 text-primary-300 text-sm font-medium rounded-full mb-4 backdrop-blur-sm"
            >
              Regional Network
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={mapInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.1 }}
              className="text-3xl md:text-4xl lg:text-5xl font-display font-bold mb-4"
            >
              Our Coverage Across <span className="text-primary-400">Africa</span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={mapInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.2 }}
              className="text-silver-300 text-lg"
            >
              Strategic partnerships and established networks enable us to serve 
              clients throughout the SADC region and beyond.
            </motion.p>
          </div>

          {/* Stats Row */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={mapInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16"
          >
            {[
              { value: "5+", label: "Countries", icon: Globe },
              { value: "15+", label: "Cities Covered", icon: MapPin },
              { value: "100+", label: "Team Members", icon: Building2 },
              { value: "24/7", label: "Support Available", icon: Clock }
            ].map((stat, index) => (
              <div key={index} className="text-center p-6 bg-white/5 rounded-2xl backdrop-blur-sm">
                <stat.icon className="w-8 h-8 text-primary-400 mx-auto mb-3" />
                <div className="text-3xl md:text-4xl font-display font-bold mb-1">{stat.value}</div>
                <div className="text-silver-400 text-sm">{stat.label}</div>
              </div>
            ))}
          </motion.div>

          {/* Region Cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
            {regions.map((region, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={mapInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.4 + index * 0.1 }}
                className="group p-6 bg-white/5 rounded-2xl backdrop-blur-sm hover:bg-white/10 transition-all duration-300 hover:-translate-y-1"
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">{region.flag}</span>
                  <h3 className="font-display font-bold text-lg">{region.name}</h3>
                </div>
                <ul className="space-y-2">
                  {region.cities.map((city, cIndex) => (
                    <li key={cIndex} className="flex items-center gap-2 text-silver-300 text-sm group-hover:text-white transition-colors">
                      <CheckCircle className="w-3 h-3 text-primary-400" />
                      {city}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Enhanced CTA Section */}
      <section ref={ctaRef} className="py-24 bg-white relative overflow-hidden">
        {/* Background Design */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gradient-to-b from-primary-50 to-transparent rounded-full blur-3xl opacity-50" />
        </div>

        <div className="container-custom relative">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={ctaInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            {/* Main CTA Card */}
            <div className="relative bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 rounded-[2.5rem] overflow-hidden">
              {/* Decorative Elements */}
              <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-2xl translate-x-1/2 -translate-y-1/2" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent-cyan/10 rounded-full blur-2xl -translate-x-1/2 translate-y-1/2" />
              
              {/* Grid Pattern */}
              <div className="absolute inset-0 opacity-10">
                <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5"/>
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />
                </svg>
              </div>

              <div className="relative px-8 py-16 md:px-16 md:py-20">
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                  {/* Left Content */}
                  <div>
                    <motion.div
                      initial={{ opacity: 0, x: -30 }}
                      animate={ctaInView ? { opacity: 1, x: 0 } : {}}
                      transition={{ delay: 0.2 }}
                    >
                      <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full text-primary-200 text-sm font-medium mb-6 backdrop-blur-sm">
                        <Truck className="w-4 h-4" />
                        Ready to Ship?
                      </span>
                      
                      <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-white mb-6 leading-tight">
                        Let's Move Your
                        <br />
                        <span className="text-primary-300">Business Forward</span>
                      </h2>
                      
                      <p className="text-primary-100 text-lg mb-8 max-w-lg">
                        Whether you need road freight, rail transport, or complete supply chain solutions, 
                        our team is ready to create a customized logistics plan for your business.
                      </p>

                      {/* Feature Pills */}
                      <div className="flex flex-wrap gap-3 mb-8">
                        {["Free Quote", "24/7 Support", "Track Shipments", "Custom Solutions"].map((feature, i) => (
                          <span key={i} className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full text-white text-sm">
                            <CheckCircle className="w-4 h-4 text-primary-300" />
                            {feature}
                          </span>
                        ))}
                      </div>

                      {/* CTA Buttons */}
                      <div className="flex flex-col sm:flex-row gap-4">
                        <a
                          href="/contact"
                          className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-primary-600 font-bold rounded-xl hover:bg-primary-50 transition-all duration-300 shadow-lg hover:shadow-xl"
                        >
                          Get a Free Quote
                          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </a>
                        <a
                          href={`tel:${siteConfig.contact.phone}`}
                          className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 text-white font-semibold rounded-xl hover:bg-white/20 transition-all duration-300 backdrop-blur-sm"
                        >
                          <Phone className="w-5 h-5" />
                          Call Us Now
                        </a>
                      </div>
                    </motion.div>
                  </div>

                  {/* Right - Contact Cards */}
                  <motion.div
                    initial={{ opacity: 0, x: 30 }}
                    animate={ctaInView ? { opacity: 1, x: 0 } : {}}
                    transition={{ delay: 0.4 }}
                    className="space-y-4"
                  >
                    {branchData.map((branch, index) => (
                      <div
                        key={index}
                        className="group p-5 bg-white/10 backdrop-blur-sm rounded-2xl hover:bg-white/15 transition-all duration-300"
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-white/30 transition-colors">
                            <Building2 className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-display font-bold text-white">{branch.city}</h4>
                              {branch.isHeadquarters && (
                                <span className="px-2 py-0.5 bg-primary-400 text-primary-900 text-[10px] font-bold rounded-full">
                                  HEAD OFFICE
                                </span>
                              )}
                            </div>
                            <p className="text-primary-200 text-sm mb-3">{branch.address}</p>
                            <div className="flex items-center gap-4 text-sm">
                              <a href={`tel:${branch.phone}`} className="flex items-center gap-1 text-white hover:text-primary-300 transition-colors">
                                <Phone className="w-3 h-3" />
                                {branch.phone}
                              </a>
                              <a href={`mailto:${branch.email}`} className="flex items-center gap-1 text-white hover:text-primary-300 transition-colors">
                                <Mail className="w-3 h-3" />
                                Email
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Additional Info Card */}
                    <div className="p-5 bg-gradient-to-r from-accent-cyan/20 to-primary-400/20 backdrop-blur-sm rounded-2xl border border-white/10">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                          <Globe className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-white font-semibold">International Shipments?</p>
                          <p className="text-primary-200 text-sm">We cover 15+ cities across 5 countries</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Leaflet CSS Override for custom styling */}
      <style>{`
        .leaflet-container {
          font-family: 'DM Sans', sans-serif;
        }
        .leaflet-popup-content-wrapper {
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.15);
        }
        .leaflet-popup-tip {
          box-shadow: none;
        }
        .custom-marker {
          background: transparent;
          border: none;
        }
      `}</style>
    </>
  );
};

export default Branches;