import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '@/store/main';
import { 
  Mail, 
  Facebook, 
  Twitter, 
  Linkedin, 
  Shield, 
  CheckCircle,
  Lock,
  Award,
  Phone,
  MapPin
} from 'lucide-react';

const GV_Footer: React.FC = () => {
  // ============================================================================
  // GLOBAL STATE ACCESS (Individual selectors - CRITICAL for Zustand)
  // ============================================================================
  
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
  const userType = useAppStore(state => state.authentication_state.authentication_status.user_type);

  // ============================================================================
  // LOCAL STATE - Newsletter Form
  // ============================================================================
  
  const [newsletter_email, setNewsletterEmail] = useState('');
  const [is_submitting, setIsSubmitting] = useState(false);
  const [success_message, setSuccessMessage] = useState<string | null>(null);
  const [error_message, setErrorMessage] = useState<string | null>(null);

  // ============================================================================
  // NEWSLETTER SIGNUP HANDLER
  // ============================================================================
  
  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous messages
    setSuccessMessage(null);
    setErrorMessage(null);
    
    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newsletter_email)) {
      setErrorMessage('Please enter a valid email address');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // NOTE: Backend endpoint POST /api/marketing/newsletter/subscribe is MISSING
      // This is a placeholder implementation ready for backend integration
      
      /* FUTURE IMPLEMENTATION - Uncomment when backend endpoint is ready:
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/marketing/newsletter/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: newsletter_email,
          subscription_source: 'footer',
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Subscription failed');
      }
      
      const data = await response.json();
      */
      
      // TEMPORARY: Simulate successful subscription
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSuccessMessage('Thank you for subscribing! Check your inbox for confirmation.');
      setNewsletterEmail('');
      
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to subscribe. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================================================
  // CURRENT YEAR FOR COPYRIGHT
  // ============================================================================
  
  const currentYear = new Date().getFullYear();

  // ============================================================================
  // RENDER
  // ============================================================================
  
  return (
    <>
      <footer className="bg-gray-900 border-t border-gray-800">
        {/* Main Footer Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
            
            {/* ============================================ */}
            {/* COLUMN 1: Company Information */}
            {/* ============================================ */}
            
            <div className="lg:col-span-2">
              <Link to="/" className="inline-block">
                <h2 className="text-2xl font-bold text-white mb-2">BuildEasy</h2>
              </Link>
              <p className="text-sm text-gray-400 mb-4">
                Your trusted construction supply marketplace
              </p>
              
              {/* Platform Stats */}
              <div className="space-y-2 mb-6">
                <div className="flex items-center text-sm text-gray-400">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  <span>100+ verified suppliers nationwide</span>
                </div>
                <div className="flex items-center text-sm text-gray-400">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  <span>10,000+ construction products</span>
                </div>
                <div className="flex items-center text-sm text-gray-400">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  <span>5,000+ orders delivered on time</span>
                </div>
              </div>
              
              {/* Contact Info */}
              <div className="space-y-2">
                <div className="flex items-center text-sm text-gray-400">
                  <Phone className="h-4 w-4 mr-2" />
                  <span>1-800-BUILD-EZ</span>
                </div>
                <div className="flex items-center text-sm text-gray-400">
                  <Mail className="h-4 w-4 mr-2" />
                  <a href="mailto:support@buildeasy.com" className="hover:text-white transition-colors">
                    support@buildeasy.com
                  </a>
                </div>
                <div className="flex items-center text-sm text-gray-400">
                  <MapPin className="h-4 w-4 mr-2" />
                  <span>Nationwide Service</span>
                </div>
              </div>
            </div>
            
            {/* ============================================ */}
            {/* COLUMN 2: For Buyers */}
            {/* ============================================ */}
            
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-white mb-4">
                For Buyers
              </h3>
              <ul className="space-y-3">
                <li>
                  <Link 
                    to="/products" 
                    className="text-sm text-gray-300 hover:text-white transition-colors"
                  >
                    Browse Products
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/how-it-works" 
                    className="text-sm text-gray-300 hover:text-white transition-colors"
                  >
                    How It Works
                  </Link>
                </li>
                {isAuthenticated && userType === 'customer' && (
                  <>
                    <li>
                      <Link 
                        to="/orders" 
                        className="text-sm text-gray-300 hover:text-white transition-colors"
                      >
                        Track My Orders
                      </Link>
                    </li>
                    <li>
                      <Link 
                        to="/wishlist" 
                        className="text-sm text-gray-300 hover:text-white transition-colors"
                      >
                        My Wishlist
                      </Link>
                    </li>
                    <li>
                      <Link 
                        to="/projects" 
                        className="text-sm text-gray-300 hover:text-white transition-colors"
                      >
                        My Projects
                      </Link>
                    </li>
                  </>
                )}
                <li>
                  <Link 
                    to="/surplus" 
                    className="text-sm text-gray-300 hover:text-white transition-colors"
                  >
                    Surplus Marketplace
                  </Link>
                </li>
                {!isAuthenticated && (
                  <li>
                    <Link 
                      to="/register/customer" 
                      className="text-sm text-blue-400 hover:text-blue-300 font-medium transition-colors"
                    >
                      Sign Up Free →
                    </Link>
                  </li>
                )}
              </ul>
            </div>
            
            {/* ============================================ */}
            {/* COLUMN 3: For Sellers */}
            {/* ============================================ */}
            
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-white mb-4">
                For Sellers
              </h3>
              <ul className="space-y-3">
                {!isAuthenticated || userType !== 'supplier' ? (
                  <>
                    <li>
                      <Link 
                        to="/register/supplier" 
                        className="text-sm text-gray-300 hover:text-white transition-colors"
                      >
                        Become a Supplier
                      </Link>
                    </li>
                    <li>
                      <Link 
                        to="/how-it-works" 
                        className="text-sm text-gray-300 hover:text-white transition-colors"
                      >
                        How to Sell
                      </Link>
                    </li>
                  </>
                ) : null}
                
                {isAuthenticated && userType === 'supplier' && (
                  <>
                    <li>
                      <Link 
                        to="/supplier/dashboard" 
                        className="text-sm text-gray-300 hover:text-white transition-colors"
                      >
                        Supplier Dashboard
                      </Link>
                    </li>
                    <li>
                      <Link 
                        to="/supplier/orders" 
                        className="text-sm text-gray-300 hover:text-white transition-colors"
                      >
                        Manage Orders
                      </Link>
                    </li>
                    <li>
                      <Link 
                        to="/supplier/products" 
                        className="text-sm text-gray-300 hover:text-white transition-colors"
                      >
                        Manage Products
                      </Link>
                    </li>
                    <li>
                      <Link 
                        to="/supplier/analytics" 
                        className="text-sm text-gray-300 hover:text-white transition-colors"
                      >
                        Analytics
                      </Link>
                    </li>
                  </>
                )}
                
                <li>
                  <Link 
                    to="/supplier/education" 
                    className="text-sm text-gray-300 hover:text-white transition-colors"
                  >
                    Growth Resources
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/about" 
                    className="text-sm text-gray-300 hover:text-white transition-colors"
                  >
                    Pricing & Plans
                  </Link>
                </li>
              </ul>
            </div>
            
            {/* ============================================ */}
            {/* COLUMN 4: Support & Company */}
            {/* ============================================ */}
            
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-white mb-4">
                Support
              </h3>
              <ul className="space-y-3">
                <li>
                  <Link 
                    to="/help" 
                    className="text-sm text-gray-300 hover:text-white transition-colors"
                  >
                    Help Center
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/contact" 
                    className="text-sm text-gray-300 hover:text-white transition-colors"
                  >
                    Contact Us
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/support" 
                    className="text-sm text-gray-300 hover:text-white transition-colors"
                  >
                    Customer Support
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/about" 
                    className="text-sm text-gray-300 hover:text-white transition-colors"
                  >
                    About BuildEasy
                  </Link>
                </li>
                <li>
                  <a 
                    href="#careers" 
                    className="text-sm text-gray-300 hover:text-white transition-colors"
                  >
                    Careers
                  </a>
                </li>
              </ul>
            </div>
          </div>
          
          {/* ============================================ */}
          {/* NEWSLETTER SIGNUP SECTION */}
          {/* ============================================ */}
          
          <div className="mt-12 pt-8 border-t border-gray-800">
            <div className="max-w-md mx-auto lg:mx-0">
              <h3 className="text-lg font-semibold text-white mb-2">
                Stay Updated
              </h3>
              <p className="text-sm text-gray-400 mb-4">
                Get exclusive deals, new supplier alerts, and construction tips delivered to your inbox
              </p>
              
              <form onSubmit={handleNewsletterSubmit} className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="email"
                    value={newsletter_email}
                    onChange={(e) => {
                      setNewsletterEmail(e.target.value);
                      setErrorMessage(null); // Clear error when typing
                    }}
                    placeholder="Enter your email"
                    disabled={is_submitting}
                    className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Email address for newsletter"
                  />
                  <button
                    type="submit"
                    disabled={is_submitting || !newsletter_email}
                    className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center"
                  >
                    {is_submitting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Subscribing...
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4 mr-2" />
                        Subscribe
                      </>
                    )}
                  </button>
                </div>
                
                {/* Success Message */}
                {success_message && (
                  <div className="flex items-start bg-green-900/30 border border-green-700 text-green-400 px-4 py-3 rounded-lg">
                    <CheckCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                    <p className="text-sm">{success_message}</p>
                  </div>
                )}
                
                {/* Error Message */}
                {error_message && (
                  <div className="bg-red-900/30 border border-red-700 text-red-400 px-4 py-3 rounded-lg">
                    <p className="text-sm">{error_message}</p>
                  </div>
                )}
                
                <p className="text-xs text-gray-500">
                  By subscribing, you agree to our{' '}
                  <Link to="/privacy" className="text-blue-400 hover:text-blue-300 underline">
                    Privacy Policy
                  </Link>
                  . Unsubscribe anytime.
                </p>
              </form>
              
              {/* Social Media Links */}
              <div className="mt-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
                  Follow Us
                </p>
                <div className="flex space-x-4">
                  <a
                    href="https://facebook.com/buildeasy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white transition-colors"
                    aria-label="Follow us on Facebook"
                  >
                    <Facebook className="h-5 w-5" />
                  </a>
                  <a
                    href="https://twitter.com/buildeasy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white transition-colors"
                    aria-label="Follow us on Twitter"
                  >
                    <Twitter className="h-5 w-5" />
                  </a>
                  <a
                    href="https://linkedin.com/company/buildeasy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white transition-colors"
                    aria-label="Follow us on LinkedIn"
                  >
                    <Linkedin className="h-5 w-5" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* ============================================ */}
        {/* LEGAL & TRUST SECTION */}
        {/* ============================================ */}
        
        <div className="border-t border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {/* Trust Badges */}
            <div className="flex flex-wrap items-center justify-center gap-6 mb-6">
              <div className="flex items-center text-gray-400">
                <Lock className="h-5 w-5 text-green-500 mr-2" />
                <span className="text-sm font-medium">SSL Secure</span>
              </div>
              <div className="flex items-center text-gray-400">
                <Shield className="h-5 w-5 text-blue-500 mr-2" />
                <span className="text-sm font-medium">Verified Suppliers</span>
              </div>
              <div className="flex items-center text-gray-400">
                <Award className="h-5 w-5 text-yellow-500 mr-2" />
                <span className="text-sm font-medium">100% Satisfaction Guarantee</span>
              </div>
            </div>
            
            {/* Legal Links */}
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mb-4">
              <Link 
                to="/terms" 
                className="text-xs text-gray-400 hover:text-white transition-colors"
              >
                Terms of Service
              </Link>
              <span className="text-gray-700">|</span>
              <Link 
                to="/privacy" 
                className="text-xs text-gray-400 hover:text-white transition-colors"
              >
                Privacy Policy
              </Link>
              <span className="text-gray-700">|</span>
              <a 
                href="#cookie-policy" 
                className="text-xs text-gray-400 hover:text-white transition-colors"
              >
                Cookie Policy
              </a>
              <span className="text-gray-700">|</span>
              <a 
                href="#accessibility" 
                className="text-xs text-gray-400 hover:text-white transition-colors"
              >
                Accessibility
              </a>
            </div>
            
            {/* Copyright */}
            <div className="text-center">
              <p className="text-xs text-gray-500">
                © {currentYear} BuildEasy. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
};

export default GV_Footer;