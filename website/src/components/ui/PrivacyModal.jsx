import React from 'react';
import Modal from './Modal';
import { Shield, Lock, Eye, Database, Users, Globe } from 'lucide-react';
import { GiWorld } from "react-icons/gi";

const PrivacyModal = ({ isOpen, onClose }) => {
  const sections = [
    {
      icon: Database,
      title: "Information We Collect",
      content: `We collect information you provide directly to us, including:
      
• Personal identification information (name, email address, phone number)
• Company information for business inquiries
• Communication preferences
• Information submitted through contact forms
• Feedback and correspondence

We may also automatically collect certain information when you visit our website, including IP address, browser type, operating system, and browsing behavior.`
    },
    {
      icon: Eye,
      title: "How We Use Your Information",
      content: `We use the information we collect to:

• Respond to your inquiries and provide customer support
• Process and manage logistics services
• Send you updates about our services and promotions (with your consent)
• Improve our website and services
• Comply with legal obligations
• Detect and prevent fraudulent activities`
    },
    {
      icon: Users,
      title: "Information Sharing",
      content: `We do not sell, trade, or rent your personal information to third parties. We may share your information with:

• Service providers who assist in our operations
• Legal authorities when required by law
• Business partners with your explicit consent
• Professional advisors (lawyers, accountants, auditors)

All third parties are required to maintain the confidentiality of your information.`
    },
    {
      icon: Lock,
      title: "Data Security",
      content: `We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. These measures include:

• Encryption of sensitive data
• Secure server infrastructure
• Regular security assessments
• Access controls and authentication
• Employee training on data protection

While we strive to protect your information, no method of transmission over the Internet is 100% secure.`
    },
    {
      icon: GiWorld,
      title: "Your Rights",
      content: `You have the right to:

• Access your personal information
• Correct inaccurate data
• Request deletion of your data
• Opt-out of marketing communications
• Withdraw consent at any time
• Lodge a complaint with supervisory authorities

To exercise these rights, please contact us using the information provided below.`
    },
    {
      icon: Shield,
      title: "Contact Us",
      content: `If you have any questions about this Privacy Policy or our data practices, please contact us:

Silvergill Logistics
National Railways of Zimbabwe Complex
Seke Road, Harare, Zimbabwe

Phone: +263 8612 002 020
Email: privacy@silvergill.com

This policy was last updated on January 1, 2025.`
    }
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Privacy Policy" size="lg">
      <div className="space-y-8">
        {/* Introduction */}
        <div className="prose prose-silver max-w-none">
          <p className="text-silver-600 leading-relaxed">
            At Silvergill Logistics, we are committed to protecting your privacy and ensuring the security of your personal information. 
            This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website or use our services.
          </p>
          <p className="text-silver-600 leading-relaxed">
            By using our website and services, you consent to the data practices described in this policy. 
            We encourage you to read this policy carefully and contact us if you have any questions.
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-6">
          {sections.map((section, index) => (
            <div 
              key={index}
              className="p-6 bg-silver-50 rounded-xl border border-silver-100"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-primary-100 rounded-lg">
                  <section.icon className="w-5 h-5 text-primary-600" />
                </div>
                <h3 className="text-lg font-display font-semibold text-silver-900">
                  {section.title}
                </h3>
              </div>
              <div className="text-silver-600 text-sm leading-relaxed whitespace-pre-line">
                {section.content}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="pt-6 border-t border-silver-200">
          <p className="text-sm text-silver-500 text-center">
            © {new Date().getFullYear()} Silvergill Logistics. All rights reserved.
          </p>
        </div>
      </div>
    </Modal>
  );
};

export default PrivacyModal;
