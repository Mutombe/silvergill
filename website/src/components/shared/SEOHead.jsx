import React from 'react';
import { useEffect } from 'react';

const SEOHead = ({ 
  title, 
  description, 
  keywords = [], 
  canonical = null,
  ogImage = '/logo.png',
  ogType = 'website',
  noindex = false
}) => {
  useEffect(() => {
    // Update document title
    const fullTitle = title 
      ? `${title} | Silvergill Logistics` 
      : 'Silvergill | Zimbabwe\'s Leading Integrated Logistics Solution Provider';
    document.title = fullTitle;

    // Helper to update or create meta tags
    const updateMetaTag = (name, content, isProperty = false) => {
      const attribute = isProperty ? 'property' : 'name';
      let element = document.querySelector(`meta[${attribute}="${name}"]`);
      
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, name);
        document.head.appendChild(element);
      }
      
      element.setAttribute('content', content);
    };

    // Update meta description
    if (description) {
      updateMetaTag('description', description);
      updateMetaTag('og:description', description, true);
      updateMetaTag('twitter:description', description, true);
    }

    // Update keywords - normalize to array first
    const keywordsArray = Array.isArray(keywords) 
      ? keywords 
      : typeof keywords === 'string' 
        ? keywords.split(',').map(k => k.trim()).filter(Boolean)
        : [];
    
    if (keywordsArray.length > 0) {
      updateMetaTag('keywords', keywordsArray.join(', '));
    }

    // Update robots
    if (noindex) {
      updateMetaTag('robots', 'noindex, nofollow');
    } else {
      updateMetaTag('robots', 'index, follow');
    }

    // Update canonical URL
    if (canonical) {
      let linkElement = document.querySelector('link[rel="canonical"]');
      if (!linkElement) {
        linkElement = document.createElement('link');
        linkElement.setAttribute('rel', 'canonical');
        document.head.appendChild(linkElement);
      }
      linkElement.setAttribute('href', canonical);
    }

    // Update Open Graph tags
    updateMetaTag('og:title', fullTitle, true);
    updateMetaTag('og:type', ogType, true);
    updateMetaTag('og:image', ogImage, true);
    updateMetaTag('og:url', window.location.href, true);

    // Update Twitter tags
    updateMetaTag('twitter:card', 'summary_large_image', true);
    updateMetaTag('twitter:title', fullTitle, true);
    updateMetaTag('twitter:image', ogImage, true);

    // Cleanup function
    return () => {
      // Reset to default title on unmount if needed
    };
  }, [title, description, keywords, canonical, ogImage, ogType, noindex]);

  // This component doesn't render anything
  return null;
};

export default SEOHead;