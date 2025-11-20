import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAppStore } from '@/store/main';

// ============================================================================
// INTERFACE DEFINITIONS
// ============================================================================

interface TeamMember {
  member_id: string;
  name: string;
  role: string;
  bio: string;
  image_url: string | null;
  linkedin_url: string | null;
}

interface CompanyStats {
  founding_year: number;
  team_size: number;
  suppliers_served: number;
  orders_processed: number;
  customer_satisfaction: number;
}

interface ContentSection {
  id: string;
  title: string;
  content: string;
  image_url: string | null;
}

interface PageContent {
  title: string;
  sections: ContentSection[];
  last_updated: string;
}

// ============================================================================
// HARDCODED CONTENT (Would come from API in production)
// ============================================================================

const COMPANY_CONTENT: PageContent = {
  title: 'About BuildEasy',
  sections: [
    {
      id: 'overview',
      title: 'Revolutionizing Construction Supply',
      content: 'BuildEasy is transforming how construction professionals and DIY enthusiasts source materials. We connect buyers with verified suppliers across the nation, providing real-time inventory, transparent pricing, and reliable delivery tracking—all in one seamless platform.',
      image_url: null
    },
    {
      id: 'story',
      title: 'Our Story',
      content: 'Founded in 2024, BuildEasy emerged from a simple frustration: finding and purchasing construction materials shouldn\'t be this hard. Our founders, experienced contractors and tech entrepreneurs, witnessed firsthand the inefficiencies plaguing the construction supply industry—scattered suppliers, unclear pricing, unreliable stock information, and delivery uncertainty.\n\nWe built BuildEasy to solve these challenges. By aggregating multiple suppliers into one unified marketplace, implementing real-time inventory synchronization, and providing transparent end-to-end tracking, we\'re making construction supply purchasing as simple as ordering anything else online.',
      image_url: null
    },
    {
      id: 'mission',
      title: 'Our Mission',
      content: 'To empower builders—from professional contractors to weekend DIYers—with instant access to verified construction materials at transparent prices, backed by reliable delivery and exceptional service. We believe every project deserves the right materials delivered on time, every time.',
      image_url: null
    },
    {
      id: 'vision',
      title: 'Our Vision',
      content: 'To become the nation\'s most trusted construction supply marketplace, where finding, comparing, and purchasing materials is effortless, where suppliers thrive through increased reach and efficiency, and where every build starts with confidence.',
      image_url: null
    },
    {
      id: 'values',
      title: 'Our Values',
      content: 'Transparency First: Clear pricing, real stock levels, honest timelines.\n\nReliability Always: Verified suppliers, guaranteed delivery windows, real-time tracking.\n\nSimplicity Matters: Minimal clicks, intuitive experiences, no hidden fees.\n\nTrust Through Action: Every promise kept, every issue resolved, every feedback heard.\n\nGrowth Together: Supporting suppliers to scale, helping customers build better, growing the industry.',
      image_url: null
    }
  ],
  last_updated: new Date().toISOString()
};

const TEAM_MEMBERS: TeamMember[] = [
  {
    member_id: 'tm_001',
    name: 'Sarah Johnson',
    role: 'Co-Founder & CEO',
    bio: 'Former general contractor with 15+ years in commercial construction. Sarah led teams building over $200M in projects before founding BuildEasy to solve the procurement challenges she experienced daily.',
    image_url: null,
    linkedin_url: null
  },
  {
    member_id: 'tm_002',
    name: 'Michael Chen',
    role: 'Co-Founder & CTO',
    bio: 'Tech entrepreneur with exits in logistics and marketplaces. Michael previously built real-time supply chain platforms at Amazon and brings deep expertise in inventory management systems and marketplace dynamics.',
    image_url: null,
    linkedin_url: null
  },
  {
    member_id: 'tm_003',
    name: 'Jennifer Martinez',
    role: 'VP of Supplier Success',
    bio: 'Former regional manager at a national building supply chain with 12+ years in supplier relations. Jennifer ensures our supplier partners have the tools and support to grow their business on BuildEasy.',
    image_url: null,
    linkedin_url: null
  },
  {
    member_id: 'tm_004',
    name: 'David Thompson',
    role: 'VP of Product',
    bio: 'Product leader with experience at construction tech startups. David focuses on building features that contractors actually need, not just what sounds good in a pitch deck.',
    image_url: null,
    linkedin_url: null
  }
];

const COMPANY_STATS: CompanyStats = {
  founding_year: 2024,
  team_size: 24,
  suppliers_served: 102,
  orders_processed: 1247,
  customer_satisfaction: 4.7
};

const COMPANY_MILESTONES = [
  {
    year: '2024',
    quarter: 'Q1',
    title: 'Platform Launch',
    description: 'BuildEasy officially launches with 50+ verified suppliers across Texas'
  },
  {
    year: '2024',
    quarter: 'Q2',
    title: '100 Suppliers Milestone',
    description: 'Reached 100+ verified suppliers serving major metro areas'
  },
  {
    year: '2024',
    quarter: 'Q3',
    title: '1,000 Orders Delivered',
    description: 'Processed and delivered over 1,000 construction supply orders with 98% on-time delivery'
  },
  {
    year: '2024',
    quarter: 'Q4',
    title: 'Trade Credit Launch',
    description: 'Introduced trade credit program for professional contractors, unlocking $2M+ in purchasing power'
  }
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_About: React.FC = () => {
  // URL params
  const [searchParams, setSearchParams] = useSearchParams();
  const sectionParam = searchParams.get('section') || 'overview';

  // Local state
  const [active_section, setActiveSection] = useState<string>(sectionParam);
  const [loading_state] = useState<boolean>(false);
  const [error_message] = useState<string | null>(null);
  const [page_content] = useState<PageContent>(COMPANY_CONTENT);
  const [team_members] = useState<TeamMember[]>(TEAM_MEMBERS);
  const [company_stats] = useState<CompanyStats>(COMPANY_STATS);

  // Global state access (individual selectors to avoid loops)
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Sync active section with URL parameter
  useEffect(() => {
    if (sectionParam !== active_section) {
      setActiveSection(sectionParam);
      scrollToSection(sectionParam);
    }
  }, [sectionParam]);

  // Track page view on mount (placeholder for future analytics)
  useEffect(() => {
    // Would call: POST /api/v1/analytics/page-view
    // For now, just log
    console.log('About page viewed at:', new Date().toISOString());
  }, []);

  // ============================================================================
  // ACTIONS
  // ============================================================================

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const navHeight = 80; // Account for fixed navigation
      const elementPosition = element.getBoundingClientRect().top + window.scrollY;
      const offsetPosition = elementPosition - navHeight;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  const handleSectionClick = (sectionId: string) => {
    setActiveSection(sectionId);
    setSearchParams({ section: sectionId });
    scrollToSection(sectionId);
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <>
      <div className="min-h-screen bg-white">
        {/* Hero Section */}
        <div className="relative bg-gradient-to-br from-blue-600 to-blue-800 text-white py-20 lg:py-32">
          <div className="absolute inset-0 bg-black opacity-10"></div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                Building the Future of <br className="hidden sm:block" />
                Construction Supply
              </h1>
              <p className="text-xl md:text-2xl text-blue-100 max-w-3xl mx-auto leading-relaxed">
                Connecting verified suppliers with builders nationwide through technology, transparency, and trust
              </p>
              
              {/* Company Stats Banner */}
              <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6 lg:gap-8 max-w-5xl mx-auto">
                <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-6 border border-white border-opacity-20">
                  <div className="text-3xl lg:text-4xl font-bold">{company_stats.founding_year}</div>
                  <div className="text-blue-100 text-sm mt-1">Founded</div>
                </div>
                <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-6 border border-white border-opacity-20">
                  <div className="text-3xl lg:text-4xl font-bold">{company_stats.suppliers_served}+</div>
                  <div className="text-blue-100 text-sm mt-1">Verified Suppliers</div>
                </div>
                <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-6 border border-white border-opacity-20">
                  <div className="text-3xl lg:text-4xl font-bold">{company_stats.orders_processed.toLocaleString()}+</div>
                  <div className="text-blue-100 text-sm mt-1">Orders Delivered</div>
                </div>
                <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-6 border border-white border-opacity-20">
                  <div className="text-3xl lg:text-4xl font-bold">{company_stats.customer_satisfaction}/5.0</div>
                  <div className="text-blue-100 text-sm mt-1">Satisfaction Rating</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section Navigation (Desktop Sticky) */}
        <div className="sticky top-16 z-10 bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex overflow-x-auto py-4 space-x-8">
              {page_content.sections.map(section => (
                <button
                  key={section.id}
                  onClick={() => handleSectionClick(section.id)}
                  className={`whitespace-nowrap text-sm font-medium transition-colors pb-2 border-b-2 ${
                    active_section === section.id
                      ? 'text-blue-600 border-blue-600'
                      : 'text-gray-600 border-transparent hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  {section.title}
                </button>
              ))}
              <button
                onClick={() => handleSectionClick('team')}
                className={`whitespace-nowrap text-sm font-medium transition-colors pb-2 border-b-2 ${
                  active_section === 'team'
                    ? 'text-blue-600 border-blue-600'
                    : 'text-gray-600 border-transparent hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                Our Team
              </button>
              <button
                onClick={() => handleSectionClick('milestones')}
                className={`whitespace-nowrap text-sm font-medium transition-colors pb-2 border-b-2 ${
                  active_section === 'milestones'
                    ? 'text-blue-600 border-blue-600'
                    : 'text-gray-600 border-transparent hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                Milestones
              </button>
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          {/* Loading State */}
          {loading_state && (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600"></div>
            </div>
          )}

          {/* Error State */}
          {error_message && (
            <div className="max-w-3xl mx-auto">
              <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-lg">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error_message}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Content Sections */}
          {!loading_state && !error_message && (
            <div className="space-y-24">
              {/* Overview Section */}
              <section id="overview" className="scroll-mt-32">
                <div className="max-w-4xl mx-auto">
                  <div className="text-center mb-12">
                    <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6">
                      {page_content.sections[0].title}
                    </h2>
                    <p className="text-lg lg:text-xl text-gray-600 leading-relaxed">
                      {page_content.sections[0].content}
                    </p>
                  </div>

                  {/* Trust Indicators */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
                      <div className="flex items-center justify-center w-12 h-12 bg-blue-600 rounded-lg mb-4">
                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Verified Suppliers</h3>
                      <p className="text-gray-600 text-sm leading-relaxed">Every supplier undergoes rigorous verification including business registration, tax ID, and background checks.</p>
                    </div>

                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100">
                      <div className="flex items-center justify-center w-12 h-12 bg-green-600 rounded-lg mb-4">
                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Real-Time Inventory</h3>
                      <p className="text-gray-600 text-sm leading-relaxed">Live stock levels updated every 30 seconds. No more showing up to find items out of stock.</p>
                    </div>

                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-100">
                      <div className="flex items-center justify-center w-12 h-12 bg-purple-600 rounded-lg mb-4">
                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Transparent Pricing</h3>
                      <p className="text-gray-600 text-sm leading-relaxed">Compare prices across suppliers instantly. No hidden fees. What you see is what you pay.</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Story Section */}
              <section id="story" className="scroll-mt-32">
                <div className="max-w-4xl mx-auto">
                  <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6">
                    {page_content.sections[1].title}
                  </h2>
                  <div className="prose prose-lg max-w-none text-gray-600 leading-relaxed">
                    {page_content.sections[1].content.split('\n\n').map((paragraph, index) => (
                      <p key={index} className="mb-4">{paragraph}</p>
                    ))}
                  </div>

                  {/* The Problem/Solution Card */}
                  <div className="mt-12 grid md:grid-cols-2 gap-8">
                    <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-lg">
                      <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                        <svg className="w-6 h-6 text-red-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        The Problem
                      </h3>
                      <ul className="space-y-2 text-gray-700">
                        <li className="flex items-start">
                          <span className="text-red-500 mr-2">•</span>
                          <span>Hours wasted calling suppliers for availability</span>
                        </li>
                        <li className="flex items-start">
                          <span className="text-red-500 mr-2">•</span>
                          <span>No price transparency or comparison</span>
                        </li>
                        <li className="flex items-start">
                          <span className="text-red-500 mr-2">•</span>
                          <span>Unreliable delivery windows causing delays</span>
                        </li>
                        <li className="flex items-start">
                          <span className="text-red-500 mr-2">•</span>
                          <span>Limited supplier options in one location</span>
                        </li>
                      </ul>
                    </div>

                    <div className="bg-green-50 border-l-4 border-green-500 p-6 rounded-lg">
                      <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                        <svg className="w-6 h-6 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Our Solution
                      </h3>
                      <ul className="space-y-2 text-gray-700">
                        <li className="flex items-start">
                          <span className="text-green-500 mr-2">✓</span>
                          <span>Real-time inventory across 100+ suppliers</span>
                        </li>
                        <li className="flex items-start">
                          <span className="text-green-500 mr-2">✓</span>
                          <span>Instant price comparison in one view</span>
                        </li>
                        <li className="flex items-start">
                          <span className="text-green-500 mr-2">✓</span>
                          <span>Guaranteed delivery windows with GPS tracking</span>
                        </li>
                        <li className="flex items-start">
                          <span className="text-green-500 mr-2">✓</span>
                          <span>Nationwide supplier network at your fingertips</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </section>

              {/* Mission & Vision Section */}
              <section id="mission" className="scroll-mt-32">
                <div className="max-w-4xl mx-auto">
                  <div className="grid md:grid-cols-2 gap-12">
                    {/* Mission */}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 lg:p-10 border border-blue-100">
                      <div className="flex items-center justify-center w-16 h-16 bg-blue-600 rounded-xl mb-6">
                        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                        </svg>
                      </div>
                      <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-4">
                        {page_content.sections[2].title}
                      </h2>
                      <p className="text-gray-700 leading-relaxed">
                        {page_content.sections[2].content}
                      </p>
                    </div>

                    {/* Vision */}
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-8 lg:p-10 border border-purple-100">
                      <div className="flex items-center justify-center w-16 h-16 bg-purple-600 rounded-xl mb-6">
                        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </div>
                      <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-4">
                        {page_content.sections[3].title}
                      </h2>
                      <p className="text-gray-700 leading-relaxed">
                        {page_content.sections[3].content}
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Values Section */}
              <section id="values" className="scroll-mt-32">
                <div className="max-w-4xl mx-auto">
                  <div className="text-center mb-12">
                    <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6">
                      {page_content.sections[4].title}
                    </h2>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    {page_content.sections[4].content.split('\n\n').map((value, index) => {
                      const [valueTitle, ...valueContent] = value.split(': ');
                      const icons = [
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>,
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>,
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                      ];
                      
                      return (
                        <div key={index} className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-200">
                          <div className="flex items-start">
                            <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                              {icons[index % icons.length]}
                            </div>
                            <div className="ml-4">
                              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                {valueTitle}
                              </h3>
                              <p className="text-gray-600 text-sm leading-relaxed">
                                {valueContent.join(': ')}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>

              {/* Team Section */}
              <section id="team" className="scroll-mt-32 bg-gray-50 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
                <div className="max-w-6xl mx-auto">
                  <div className="text-center mb-12">
                    <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                      Meet Our Team
                    </h2>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                      Experienced professionals from construction, technology, and logistics working together to revolutionize the supply chain
                    </p>
                  </div>

                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {team_members.map(member => (
                      <div key={member.member_id} className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100 hover:shadow-2xl transition-all duration-200">
                        {/* Profile Image Placeholder */}
                        <div className="bg-gradient-to-br from-blue-600 to-blue-800 h-64 flex items-center justify-center text-white">
                          <div className="text-center">
                            <div className="w-24 h-24 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
                              <span className="text-4xl font-bold">
                                {member.name.split(' ').map(n => n[0]).join('')}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Team Member Info */}
                        <div className="p-6">
                          <h3 className="text-xl font-bold text-gray-900 mb-1">
                            {member.name}
                          </h3>
                          <p className="text-blue-600 font-medium text-sm mb-4">
                            {member.role}
                          </p>
                          <p className="text-gray-600 text-sm leading-relaxed">
                            {member.bio}
                          </p>
                          
                          {member.linkedin_url && (
                            <div className="mt-4">
                              <a
                                href={member.linkedin_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium"
                              >
                                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                                </svg>
                                LinkedIn
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Join Our Team CTA */}
                  <div className="mt-12 text-center">
                    <div className="inline-block bg-white rounded-xl px-8 py-6 shadow-lg border border-gray-200">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        Join Our Growing Team
                      </h3>
                      <p className="text-gray-600 mb-4">
                        We're always looking for talented individuals passionate about transforming construction
                      </p>
                      <Link
                        to="/contact"
                        className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200"
                      >
                        View Open Positions
                        <svg className="ml-2 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                </div>
              </section>

              {/* Milestones Section */}
              <section id="milestones" className="scroll-mt-32">
                <div className="max-w-4xl mx-auto">
                  <div className="text-center mb-12">
                    <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                      Our Journey
                    </h2>
                    <p className="text-lg text-gray-600">
                      Key milestones in building the future of construction supply
                    </p>
                  </div>

                  {/* Timeline */}
                  <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-blue-200 hidden md:block"></div>

                    <div className="space-y-8">
                      {COMPANY_MILESTONES.map((milestone, index) => (
                        <div key={index} className="relative pl-0 md:pl-20">
                          {/* Timeline dot */}
                          <div className="absolute left-6 top-2 w-5 h-5 rounded-full bg-blue-600 border-4 border-white shadow-lg hidden md:block"></div>

                          {/* Milestone card */}
                          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-200">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-3">
                              <div className="flex items-center space-x-3 mb-2 md:mb-0">
                                <span className="bg-blue-100 text-blue-800 text-sm font-semibold px-3 py-1 rounded-full">
                                  {milestone.year}
                                </span>
                                <span className="text-gray-500 text-sm font-medium">
                                  {milestone.quarter}
                                </span>
                              </div>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">
                              {milestone.title}
                            </h3>
                            <p className="text-gray-600 leading-relaxed">
                              {milestone.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              {/* Trust & Recognition Section */}
              <section className="scroll-mt-32 bg-gray-50 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
                <div className="max-w-6xl mx-auto">
                  <div className="text-center mb-12">
                    <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                      Trusted by Builders Nationwide
                    </h2>
                    <p className="text-lg text-gray-600">
                      Building credibility through verified partnerships and industry recognition
                    </p>
                  </div>

                  {/* Trust Indicators Grid */}
                  <div className="grid md:grid-cols-3 gap-8">
                    <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-100 text-center">
                      <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mx-auto mb-4">
                        <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        Verified & Secure
                      </h3>
                      <p className="text-gray-600 leading-relaxed">
                        PCI DSS Level 1 compliant with bank-grade security. All supplier credentials verified.
                      </p>
                    </div>

                    <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-100 text-center">
                      <div className="flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mx-auto mb-4">
                        <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        Fair Pricing
                      </h3>
                      <p className="text-gray-600 leading-relaxed">
                        Transparent commission structure. Suppliers keep more, buyers pay less.
                      </p>
                    </div>

                    <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-100 text-center">
                      <div className="flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mx-auto mb-4">
                        <svg className="w-8 h-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        24/7 Support
                      </h3>
                      <p className="text-gray-600 leading-relaxed">
                        Dedicated customer success team ready to help via chat, phone, or email.
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* CTA Section */}
              <section className="scroll-mt-32">
                <div className="max-w-4xl mx-auto">
                  <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-12 lg:p-16 text-center text-white shadow-2xl">
                    <h2 className="text-3xl lg:text-4xl font-bold mb-6">
                      Ready to Simplify Your Supply Chain?
                    </h2>
                    <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto leading-relaxed">
                      Join thousands of builders who trust BuildEasy for their construction materials
                    </p>
                    
                    <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
                      {!isAuthenticated ? (
                        <>
                          <Link
                            to="/register"
                            className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 bg-white text-blue-600 font-semibold rounded-lg hover:bg-gray-50 transition-all duration-200 shadow-lg hover:shadow-xl"
                          >
                            Get Started Free
                            <svg className="ml-2 w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                          </Link>
                          <Link
                            to="/how-it-works"
                            className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 bg-transparent text-white font-semibold rounded-lg border-2 border-white hover:bg-white hover:text-blue-600 transition-all duration-200"
                          >
                            Learn How It Works
                          </Link>
                        </>
                      ) : (
                        <>
                          <Link
                            to="/products"
                            className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 bg-white text-blue-600 font-semibold rounded-lg hover:bg-gray-50 transition-all duration-200 shadow-lg hover:shadow-xl"
                          >
                            Start Shopping
                            <svg className="ml-2 w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                          </Link>
                          <Link
                            to="/contact"
                            className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 bg-transparent text-white font-semibold rounded-lg border-2 border-white hover:bg-white hover:text-blue-600 transition-all duration-200"
                          >
                            Contact Us
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>

        {/* Back to Top Button */}
        <div className="fixed bottom-8 right-8">
          <button
            onClick={() => {
              window.scrollTo({ top: 0, behavior: 'smooth' });
              setActiveSection('overview');
              setSearchParams({ section: 'overview' });
            }}
            className="bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-all duration-200 hover:shadow-xl"
            aria-label="Back to top"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
};

export default UV_About;