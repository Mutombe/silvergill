// Site-wide content data
export const siteConfig = {
  name: "Silvergill",
  tagline: "Providing reliable solutions to your logistics needs",
  description: "Zimbabwe's Leading Integrated Logistics Solution Provider",
  logo: "/logo.png",
  contact: {
    phone: ["+263 8612 002 020", "+263 780 525 624", "+263 716 038 905"],
    email: "info@silvergill.com",
    address: "National Railways of Zimbabwe Complex, Seke Road, Harare, Zimbabwe"
  },
  social: {
    linkedin: "https://www.linkedin.com/company/silvergill",
    twitter: "https://twitter.com/silvergill",
    facebook: "https://facebook.com/silvergill",
    instagram: "https://instagram.com/silvergill"
  }
};

export const navLinks = [
  { name: "Home", path: "/" },
  { name: "About Us", path: "/about" },
  { name: "Our Services", path: "/services" },
  { name: "Branches", path: "/branches" },
  { name: "Media", path: "/media" },
  { name: "Gallery", path: "/gallery" },
  { name: "Careers", path: "/careers" },
  { name: "Contact Us", path: "/contact" }
];

export const services = [
  {
    id: 1,
    title: "Internal & Export Logistics",
    description: "Experience seamless supply chain solutions with our Internal & Export Logistics expertise. Effortless, efficient, and tailored for your needs. We handle the complete movement of goods from origin to destination.",
    icon: "Truck",
    features: ["End-to-end supply chain management", "Customs documentation", "Real-time tracking", "Dedicated account management"],
    image: "/Man@Work-1.png"
  },
  {
    id: 2,
    title: "Port Handling and Storage",
    description: "Unlock the power of efficient Port Handling and Storage solutions. Trust us for safe, secure, and streamlined cargo management at major ports across the region.",
    icon: "Anchor",
    features: ["Secure warehousing facilities", "Cargo consolidation", "Container management", "24/7 port operations"],
    image: "/Loading-1.png"
  },
  {
    id: 3,
    title: "Ocean Freight Logistics",
    description: "Reliable Ocean Freight Logistics: Your gateway to global shipping excellence. Seamlessly navigate international waters with our expertise and comprehensive solutions.",
    icon: "Ship",
    features: ["FCL & LCL shipping", "Multi-modal transport", "Global network coverage", "Competitive freight rates"],
    image: "/Ship-Logistics-4-1.png"
  },
  {
    id: 4,
    title: "Mineral Export Permit Application",
    description: "Simplify your application and processing with our expertise. Your gateway to seamless mineral export procedures with full regulatory compliance.",
    icon: "FileCheck",
    features: ["Permit acquisition", "Regulatory compliance", "Documentation support", "Government liaison"],
    image: "/raw-lithium-e1672867268425-1.png"
  },
  {
    id: 5,
    title: "CD1 Processing",
    description: "Effortless CD1 Processing: Streamline your paperwork with our expert services. Simplify compliance and expedite your business operations with accurate documentation.",
    icon: "ClipboardCheck",
    features: ["Fast processing times", "Accuracy guarantee", "Full compliance support", "Expert consultation"],
    image: "/7.jpg"
  },
  {
    id: 6,
    title: "International Shipping",
    description: "Managing the logistics and transportation of goods internationally, including arranging shipping, tracking, and delivery to destinations worldwide.",
    icon: "Globe",
    features: ["Door-to-door delivery", "Cargo insurance", "Shipment tracking", "Multi-destination routing"],
    image: "/k19.jpg"
  }
];

export const stats = [
  { number: "15+", label: "Years Experience", suffix: "" },
  { number: "500", label: "Clients Served", suffix: "+" },
  { number: "50", label: "Countries Reached", suffix: "+" },
  { number: "99", label: "Delivery Success Rate", suffix: "%" }
];

export const values = [
  {
    title: "Professionalism",
    description: "In everything we do, we apply the highest possible standards of workmanship and ethics.",
    icon: "Award"
  },
  {
    title: "Customer Care",
    description: "We are responsive to our clients' needs and expectations, going above and beyond.",
    icon: "Heart"
  },
  {
    title: "Team Work",
    description: "We encourage team effort; every member of staff is equally important to our growth.",
    icon: "Users"
  },
  {
    title: "Integrity",
    description: "We abide by all rules and regulations of the jurisdictions in which we operate.",
    icon: "Shield"
  },
  {
    title: "Individual Respect",
    description: "We cherish divergent views in individuals who form our team.",
    icon: "UserCheck"
  }
];

export const branches = [
  {
    id: 1,
    name: "Silvergill Head Office",
    address: "NRZ Complex Seke Road, Harare, Zimbabwe",
    city: "Harare",
    isHeadquarters: true,
    coordinates: { lat: -17.8292, lng: 31.0522 }
  },
  {
    id: 2,
    name: "Silvergill Gweru Mineral Hub",
    address: "8th Street Gweru",
    city: "Gweru",
    isHeadquarters: false,
    coordinates: { lat: -19.4500, lng: 29.8167 }
  },
  {
    id: 3,
    name: "Silvergill Zvishavane Mineral Hub",
    address: "CG Warehouse, Ireland Road, Zvishavane",
    city: "Zvishavane",
    isHeadquarters: false,
    coordinates: { lat: -20.3333, lng: 30.0333 }
  }
];

export const newsArticles = [
  {
    id: 1,
    title: "Merry Christmas!!",
    date: "December 24, 2025",
    excerpt: "Season's greetings from the entire Silvergill family. Wishing you a prosperous new year ahead.",
    image: "https://images.unsplash.com/photo-1482517967863-00e15c9b44be?w=800",
    category: "Announcement"
  },
  {
    id: 2,
    title: "SILVERGILL at the Project Blue Critical Materials Conference",
    date: "September 24, 2025",
    excerpt: "SILVERGILL was honoured to be part of the Project Blue 'Critical Materials Conference: Ferroalloys 2025' in Johannesburg.",
    image: "1.jpg",
    category: "Events"
  },
  {
    id: 3,
    title: "CEO Eng. Clara Sadomba at Johannesburg Conference",
    date: "August 22, 2025",
    excerpt: "Join Eng. Clara Sadomba at the Project Blue, Johannesburg Critical Materials Conference as she engages in the Chromium Session!",
    image: "2.jpg",
    category: "Leadership"
  },
  {
    id: 4,
    title: "Africa Day 2025 Celebrations",
    date: "May 25, 2025",
    excerpt: "Celebrating Africa Day and the spirit of Pan-African unity and progress.",
    image: "s3.jpg",
    category: "Celebration"
  },
  {
    id: 5,
    title: "SILVERGILL AT ZITF 2025",
    date: "April 26, 2025",
    excerpt: "The Minister of Transport and Infrastructure Development visited SILVERGILL ZITF 2025 exhibition stand.",
    image: "5.jpg",
    category: "Trade Shows"
  },
  {
    id: 6,
    title: "Zimbabwe 45th Independence",
    date: "April 18, 2025",
    excerpt: "Celebrating 45 years of Zimbabwe's independence and national pride.",
    image: "https://images.unsplash.com/photo-1569974507005-6dc61f97fb5c?w=800",
    category: "National"
  },
  {
    id: 7,
    title: "Stakeholder Engagements in Maputo",
    date: "February 22, 2025",
    excerpt: "SILVERGILL team recently embarked on a routine stakeholder engagement in Maputo, Mozambique.",
    image: "6.jpg",
    category: "Business"
  },
  {
    id: 8,
    title: "African Mining Indaba 2025",
    date: "February 8, 2025",
    excerpt: "CEO Eng. Clara Sadomba at African Mining Indaba 2025 in Cape Town, South Africa.",
    image: "7.png",
    category: "Industry"
  }
];

export const galleryImages = [
  {
    id: 1,
    src: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800",
    alt: "Logistics operations",
    category: "Operations"
  },
  {
    id: 2,
    src: "https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?w=800",
    alt: "Shipping containers",
    category: "Shipping"
  },
  {
    id: 3,
    src: "https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=800",
    alt: "Rail transport",
    category: "Rail"
  },
  {
    id: 4,
    src: "https://images.unsplash.com/photo-1519003722824-194d4455a60c?w=800",
    alt: "Port operations",
    category: "Port"
  },
  {
    id: 5,
    src: "7.jpg",
    alt: "Mining minerals",
    category: "Mining"
  },
  {
    id: 6,
    src: "https://images.unsplash.com/photo-1605745341112-85968b19335b?w=800",
    alt: "Cargo ship",
    category: "Shipping"
  },
  {
    id: 7,
    src: "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=800",
    alt: "Warehouse storage",
    category: "Storage"
  },
  {
    id: 8,
    src: "https://images.unsplash.com/photo-1553413077-190dd305871c?w=800",
    alt: "Truck fleet",
    category: "Transport"
  },
  {
    id: 9,
    src: "https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=800",
    alt: "Office building",
    category: "Office"
  },
  {
    id: 10,
    src: "https://images.unsplash.com/photo-1493946740644-2d8a1f1a6aff?w=800",
    alt: "Train cargo",
    category: "Rail"
  },
  {
    id: 11,
    src: "https://images.unsplash.com/photo-1591768793355-74d04bb6608f?w=800",
    alt: "Port crane",
    category: "Port"
  },
  {
    id: 12,
    src: "Loaded-Wagons2-768x1024.jpg",
    alt: "Mining site",
    category: "Mining"
  }
];

export const careers = [
  {
    id: 1,
    title: "Senior Logistics Coordinator",
    department: "Operations",
    location: "Harare",
    type: "Full-time",
    description: "Manage and coordinate complex logistics operations across multiple sites. Lead a team of logistics specialists in ensuring seamless supply chain operations.",
    requirements: [
      "5+ years experience in logistics",
      "Strong leadership skills",
      "Excellent communication abilities",
      "Proficiency in logistics software"
    ]
  },
  {
    id: 2,
    title: "Customs Documentation Specialist",
    department: "Compliance",
    location: "Harare",
    type: "Full-time",
    description: "Handle all customs documentation and ensure regulatory compliance for import/export operations.",
    requirements: [
      "3+ years in customs documentation",
      "Knowledge of Zimbabwe customs regulations",
      "Attention to detail",
      "Strong analytical skills"
    ]
  },
  {
    id: 3,
    title: "Fleet Operations Manager",
    department: "Transport",
    location: "Gweru",
    type: "Full-time",
    description: "Oversee the management and maintenance of our fleet operations. Ensure optimal vehicle utilization and driver coordination.",
    requirements: [
      "7+ years in fleet management",
      "Valid commercial driving license",
      "Experience with fleet tracking systems",
      "Strong organizational skills"
    ]
  },
  {
    id: 4,
    title: "Business Development Executive",
    department: "Sales",
    location: "Harare",
    type: "Full-time",
    description: "Drive new business acquisition and maintain client relationships. Identify market opportunities in the mining sector.",
    requirements: [
      "4+ years in B2B sales",
      "Experience in logistics/mining industry",
      "Proven track record of meeting targets",
      "Excellent networking skills"
    ]
  }
];

export const testimonials = [
  {
    id: 1,
    quote: "Silvergill has transformed our supply chain operations. Their expertise in mineral logistics is unmatched in Zimbabwe.",
    author: "Mining Operations Director",
    company: "Leading Mining Corporation"
  },
  {
    id: 2,
    quote: "Professional, reliable, and always delivering on time. Silvergill is our trusted logistics partner for all export operations.",
    author: "Export Manager",
    company: "Industrial Minerals Ltd"
  },
  {
    id: 3,
    quote: "The team's knowledge of regulatory requirements and documentation has saved us countless hours and potential complications.",
    author: "Compliance Officer",
    company: "Chrome Industries"
  }
];

export const faqData = [
  {
    question: "What services does Silvergill offer?",
    answer: "Silvergill offers comprehensive logistics solutions including internal & export logistics, port handling and storage, ocean freight logistics, mineral export permit application and processing, CD1 processing, and international shipping."
  },
  {
    question: "Where are Silvergill's offices located?",
    answer: "Our head office is located at the National Railways of Zimbabwe Complex on Seke Road in Harare. We also have mineral hubs in Gweru and Zvishavane."
  },
  {
    question: "What industries does Silvergill serve?",
    answer: "We primarily serve the mining industry, specializing in the movement of bulk minerals and commodities. We also support various industrial sectors requiring bulk logistics solutions."
  },
  {
    question: "How can I get a quote for logistics services?",
    answer: "You can request a quote by contacting us via phone at +263 8612 002 020 or through our contact form. Our team will assess your requirements and provide a tailored solution."
  },
  {
    question: "Does Silvergill handle international shipments?",
    answer: "Yes, we have extensive experience in international shipping and work with ports across Sub-Saharan Africa to ensure your goods reach their global destinations efficiently."
  }
];
