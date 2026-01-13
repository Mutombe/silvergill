import React from 'react';
import { useState, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Calendar, Clock, ArrowRight, Tag, Search, 
  Filter, ChevronDown 
} from 'lucide-react';
import SEOHead from '../components/shared/SEOHead';
import PageHero from '../components/shared/PageHero';
import { siteConfig, newsArticles } from '../data/content';

const Media = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  const gridRef = useRef(null);
  const gridInView = useInView(gridRef, { once: true, margin: "-100px" });

  const categories = ['All', 'Company News', 'Industry Updates', 'Press Releases', 'Events'];

  const filteredArticles = newsArticles.filter(article => {
    const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          article.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || article.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const featuredArticle = newsArticles[0];

  return (
    <>
      <SEOHead
        title="Media & News | Silvergill Logistics"
        description="Stay updated with the latest news, press releases, and industry insights from Silvergill Logistics. Read about our achievements, events, and logistics industry trends."
        keywords="Silvergill news, logistics news Zimbabwe, freight industry updates, logistics press releases"
        canonicalUrl={`${siteConfig.url}/media`}
      />

      <PageHero
        title="Media & News"
        subtitle="Stay updated with the latest from Silvergill Logistics"
        breadcrumbs={[{ label: "Media", href: "/media" }]}
        variant="gradient"
      />

      {/* Featured Article */}
      <section className="section-padding bg-white">
        <div className="container-custom">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative rounded-3xl overflow-hidden"
          >
            <div className="grid lg:grid-cols-2">
              {/* Image */}
              <div className="relative h-64 lg:h-auto">
                <img
                  src={featuredArticle.image}
                  alt={featuredArticle.title}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-silver-900/80 to-transparent lg:hidden" />
              </div>

              {/* Content */}
              <div className="p-8 lg:p-12 bg-gradient-to-br from-silver-900 via-silver-800 to-primary-900 text-white">
                <span className="inline-block px-3 py-1 bg-primary-500/20 text-primary-300 text-sm font-medium rounded-full mb-4">
                  Featured Story
                </span>
                <span className="inline-block px-3 py-1 bg-white/10 text-silver-300 text-sm rounded-full mb-4 ml-2">
                  {featuredArticle.category}
                </span>

                <h2 className="text-2xl lg:text-3xl font-display font-bold mb-4">
                  {featuredArticle.title}
                </h2>
                <p className="text-silver-300 mb-6 line-clamp-3">
                  {featuredArticle.excerpt}
                </p>

                <div className="flex items-center gap-6 mb-6 text-sm text-silver-400">
                  <span className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {featuredArticle.date}
                  </span>
                  <span className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {featuredArticle.readTime}
                  </span>
                </div>

                <button className="inline-flex items-center gap-2 text-primary-300 hover:text-primary-200 font-medium transition-colors group">
                  Read Full Story
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Search and Filter */}
      <section className="py-8 bg-silver-50 border-y border-silver-200">
        <div className="container-custom">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Search */}
            <div className="relative w-full md:w-96">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-silver-400" />
              <input
                type="text"
                placeholder="Search news..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white border border-silver-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors"
              />
            </div>

            {/* Filter Toggle (Mobile) */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="md:hidden flex items-center gap-2 px-4 py-3 bg-white border border-silver-200 rounded-xl"
            >
              <Filter className="w-5 h-5 text-silver-600" />
              <span className="text-silver-700">Filters</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>

            {/* Category Pills (Desktop) */}
            <div className="hidden md:flex items-center gap-2 overflow-x-auto pb-1">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === category
                      ? 'bg-primary-600 text-white'
                      : 'bg-white text-silver-600 hover:bg-silver-100'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Mobile Filters */}
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden mt-4 flex flex-wrap gap-2"
            >
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => {
                    setSelectedCategory(category);
                    setShowFilters(false);
                  }}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    selectedCategory === category
                      ? 'bg-primary-600 text-white'
                      : 'bg-white text-silver-600 hover:bg-silver-100'
                  }`}
                >
                  {category}
                </button>
              ))}
            </motion.div>
          )}
        </div>
      </section>

      {/* Articles Grid */}
      <section ref={gridRef} className="section-padding bg-silver-50">
        <div className="container-custom">
          {filteredArticles.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredArticles.map((article, index) => (
                <motion.article
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  animate={gridInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300"
                >
                  {/* Article Image */}
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={article.image}
                      alt={article.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-4 left-4">
                      <span className="px-3 py-1 bg-white/90 backdrop-blur-sm text-silver-700 text-xs font-medium rounded-full">
                        {article.category}
                      </span>
                    </div>
                  </div>

                  {/* Article Content */}
                  <div className="p-6">
                    <div className="flex items-center gap-4 mb-3 text-sm text-silver-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {article.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {article.readTime}
                      </span>
                    </div>

                    <h3 className="text-lg font-display font-bold text-silver-900 mb-2 line-clamp-2 group-hover:text-primary-600 transition-colors">
                      {article.title}
                    </h3>
                    <p className="text-silver-600 text-sm mb-4 line-clamp-2">
                      {article.excerpt}
                    </p>

                    <button className="inline-flex items-center gap-2 text-primary-600 font-medium text-sm group/btn">
                      Read More
                      <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </motion.article>
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <div className="w-16 h-16 bg-silver-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-silver-400" />
              </div>
              <h3 className="text-xl font-display font-bold text-silver-900 mb-2">No articles found</h3>
              <p className="text-silver-600">Try adjusting your search or filter criteria</p>
            </motion.div>
          )}
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="section-padding bg-white">
        <div className="container-custom">
          <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-3xl p-8 md:p-12 relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
            </div>

            <div className="relative max-w-2xl mx-auto text-center">
              <h2 className="text-2xl md:text-3xl font-display font-bold text-white mb-4">
                Subscribe to Our Newsletter
              </h2>
              <p className="text-primary-100 mb-8">
                Get the latest news, industry insights, and company updates delivered directly to your inbox.
              </p>

              <form className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 px-4 py-3 rounded-xl bg-white/10 backdrop-blur-sm text-white placeholder:text-primary-200 border border-white/20 focus:outline-none focus:ring-2 focus:ring-white/30"
                />
                <button
                  type="submit"
                  className="px-6 py-3 bg-white text-primary-600 font-semibold rounded-xl hover:bg-silver-50 transition-colors"
                >
                  Subscribe
                </button>
              </form>

              <p className="text-xs text-primary-200 mt-4">
                By subscribing, you agree to our Privacy Policy. Unsubscribe anytime.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Press Contact */}
      <section className="section-padding bg-silver-50">
        <div className="container-custom">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <motion.span
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="inline-block px-4 py-2 bg-primary-100 text-primary-700 text-sm font-medium rounded-full mb-4"
              >
                Press Inquiries
              </motion.span>
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="text-3xl md:text-4xl font-display font-bold text-silver-900 mb-4"
              >
                Media & Press Contact
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="text-silver-600 mb-6"
              >
                For press inquiries, interview requests, or media resources, please contact our communications team.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className="space-y-4"
              >
                <a
                  href={`mailto:${siteConfig.contact.email}`}
                  className="flex items-center gap-3 p-4 bg-white rounded-xl hover:shadow-md transition-shadow"
                >
                  <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                    <Tag className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <p className="text-sm text-silver-500">Press Email</p>
                    <p className="text-silver-900 font-medium">{siteConfig.contact.email}</p>
                  </div>
                </a>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="rounded-2xl overflow-hidden shadow-xl">
                <img
                  src="https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&q=80"
                  alt="Press and Media"
                  className="w-full h-80 object-cover"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Media;
