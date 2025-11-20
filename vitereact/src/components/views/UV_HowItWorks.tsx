import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAppStore } from '@/store/main';
import { 
  ShoppingCart, 
  Store, 
  Search, 
  Package, 
  Truck, 
  CheckCircle, 
  DollarSign, 
  BarChart, 
  Clock, 
  Shield, 
  Star,
  TrendingUp,
  Users,
  MapPin,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface ProcessStep {
  step_number: number;
  title: string;
  description: string;
  icon_url: string;
  features: string[];
  illustration_url: string | null;
}

interface Benefit {
  benefit_id: string;
  title: string;
  description: string;
  icon_url: string;
  details: string[];
}

interface SuccessMetrics {
  total_suppliers: number;
  total_products: number;
  orders_completed: number;
  customer_satisfaction: number;
  average_delivery_time: string;
  cities_served: number;
}

interface CustomerTestimonial {
  testimonial_id: string;
  customer_name: string;
  customer_type: string;
  quote: string;
  rating: number;
  location: string;
  project_details: string | null;
}

interface SupplierTestimonial {
  testimonial_id: string;
  supplier_name: string;
  business_type: string;
  quote: string;
  results: string;
  location: string;
}

interface Testimonials {
  customer_testimonials: CustomerTestimonial[];
  supplier_testimonials: SupplierTestimonial[];
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const fetchPlatformStatistics = async (): Promise<SuccessMetrics> => {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
  const response = await fetch(`${API_BASE_URL}/api/platform/public-stats`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch platform statistics');
  }
  
  const data = await response.json();
  
  return {
    total_suppliers: data.verified_supplier_count || 0,
    total_products: data.active_product_count || 0,
    orders_completed: data.total_completed_orders || 0,
    customer_satisfaction: data.average_customer_rating || 0,
    average_delivery_time: `${data.average_delivery_time_days || 0} days`,
    cities_served: data.service_area_city_count || 0
  };
};

const fetchTestimonials = async (user_type: string): Promise<Testimonials> => {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
  const response = await fetch(
    `${API_BASE_URL}/api/testimonials?user_type=${user_type}&featured_only=true&limit=6`
  );
  
  if (!response.ok) {
    // Return empty testimonials on error
    return {
      customer_testimonials: [],
      supplier_testimonials: []
    };
  }
  
  const data = await response.json();
  
  return {
    customer_testimonials: (data.testimonials || [])
      .filter((t: any) => t.user_type === 'customer')
      .map((testimonial: any) => ({
        testimonial_id: testimonial.testimonial_id,
        customer_name: testimonial.customer_name,
        customer_type: testimonial.customer_account_type,
        quote: testimonial.testimonial_text,
        rating: testimonial.overall_rating,
        location: testimonial.location,
        project_details: testimonial.project_description
      })),
    supplier_testimonials: (data.testimonials || [])
      .filter((t: any) => t.user_type === 'supplier')
      .map((testimonial: any) => ({
        testimonial_id: testimonial.testimonial_id,
        supplier_name: testimonial.business_name,
        business_type: testimonial.business_type,
        quote: testimonial.testimonial_text,
        results: testimonial.business_results,
        location: testimonial.location
      }))
  };
};

// Static process steps data
const getProcessSteps = () => ({
  buyer_steps: [
    {
      step_number: 1,
      title: "Browse & Search",
      description: "Search thousands of construction materials from 100+ verified suppliers in one unified marketplace.",
      icon_url: "",
      features: [
        "Real-time inventory from multiple suppliers",
        "Advanced filtering by category, price, location",
        "Compare products side-by-side",
        "Save favorites to wishlist"
      ],
      illustration_url: null
    },
    {
      step_number: 2,
      title: "Compare & Select",
      description: "Compare prices, delivery times, and supplier ratings to make informed decisions.",
      icon_url: "",
      features: [
        "Transparent pricing with no hidden fees",
        "Supplier ratings and verified reviews",
        "Delivery window selection",
        "Bulk pricing options"
      ],
      illustration_url: null
    },
    {
      step_number: 3,
      title: "Checkout",
      description: "Secure checkout with multiple payment options and flexible delivery scheduling.",
      icon_url: "",
      features: [
        "Multi-supplier cart management",
        "Trade credit options available",
        "Schedule preferred delivery windows",
        "Secure payment processing"
      ],
      illustration_url: null
    },
    {
      step_number: 4,
      title: "Track & Receive",
      description: "Real-time order tracking with GPS delivery updates and proof of delivery.",
      icon_url: "",
      features: [
        "Live GPS tracking when out for delivery",
        "SMS and email notifications",
        "Photo proof of delivery",
        "Easy reordering from history"
      ],
      illustration_url: null
    }
  ],
  seller_steps: [
    {
      step_number: 1,
      title: "Apply & Verify",
      description: "Submit your supplier application with business verification for trusted marketplace access.",
      icon_url: "",
      features: [
        "Quick application process",
        "Business verification for trust",
        "Dedicated onboarding support",
        "Multiple subscription tiers"
      ],
      illustration_url: null
    },
    {
      step_number: 2,
      title: "Setup Your Shop",
      description: "Create your digital storefront with product listings, pricing, and delivery zones.",
      icon_url: "",
      features: [
        "Easy product catalog management",
        "Bulk upload via CSV",
        "Custom pricing and promotions",
        "Delivery zone configuration"
      ],
      illustration_url: null
    },
    {
      step_number: 3,
      title: "Receive Orders",
      description: "Get instant notifications for new orders and manage fulfillment efficiently.",
      icon_url: "",
      features: [
        "Real-time order notifications",
        "Order management dashboard",
        "Direct customer communication",
        "Flexible delivery scheduling"
      ],
      illustration_url: null
    },
    {
      step_number: 4,
      title: "Grow Your Business",
      description: "Access analytics, manage finances, and expand your customer base.",
      icon_url: "",
      features: [
        "Sales analytics and insights",
        "Automated payouts",
        "Customer reviews and ratings",
        "Marketing promotion tools"
      ],
      illustration_url: null
    }
  ]
});

// Static benefits data
const getPlatformBenefits = () => ({
  buyer_benefits: [
    {
      benefit_id: "b1",
      title: "Real-Time Inventory",
      description: "See exact stock levels updated every minute",
      icon_url: "",
      details: [
        "Live stock updates across all suppliers",
        "No more calling around to check availability",
        "Back-in-stock alerts for wishlist items",
        "Reserve items by adding to cart"
      ]
    },
    {
      benefit_id: "b2",
      title: "Transparent Pricing",
      description: "Compare prices instantly across multiple suppliers",
      icon_url: "",
      details: [
        "See all costs upfront - no hidden fees",
        "Bulk pricing options clearly displayed",
        "Price drop alerts on saved items",
        "Trade pricing for professional accounts"
      ]
    },
    {
      benefit_id: "b3",
      title: "Reliable Delivery",
      description: "Schedule delivery windows that work for your project",
      icon_url: "",
      details: [
        "Choose your preferred delivery time",
        "GPS tracking when out for delivery",
        "SMS alerts 5 minutes before arrival",
        "Photo proof of delivery"
      ]
    },
    {
      benefit_id: "b4",
      title: "Trusted Suppliers",
      description: "Buy from verified, rated suppliers with confidence",
      icon_url: "",
      details: [
        "All suppliers verified and vetted",
        "Read verified customer reviews",
        "Supplier response time displayed",
        "Secure payment processing"
      ]
    }
  ],
  seller_benefits: [
    {
      benefit_id: "s1",
      title: "Reach More Customers",
      description: "Get discovered by thousands of active buyers",
      icon_url: "",
      details: [
        "Appear in searches across the platform",
        "Target professional and retail customers",
        "Featured product opportunities",
        "Marketing promotion tools"
      ]
    },
    {
      benefit_id: "s2",
      title: "Easy Order Management",
      description: "Streamline your order process with powerful tools",
      icon_url: "",
      details: [
        "Instant order notifications",
        "Centralized dashboard for all orders",
        "Direct customer messaging",
        "Automated inventory sync"
      ]
    },
    {
      benefit_id: "s3",
      title: "Grow Sales",
      description: "Tools to increase revenue and expand your business",
      icon_url: "",
      details: [
        "Analytics on best-selling products",
        "Create custom promotions and deals",
        "Volume discounting capabilities",
        "Trade customer access"
      ]
    },
    {
      benefit_id: "s4",
      title: "Fast Payments",
      description: "Automated payouts with transparent commission",
      icon_url: "",
      details: [
        "Weekly, bi-weekly, or monthly payouts",
        "Low 8.5% platform commission",
        "Detailed financial reporting",
        "Secure payment processing"
      ]
    }
  ]
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_HowItWorks: React.FC = () => {
  const [searchParams] = useSearchParams();
  
  // CRITICAL: Individual selectors
  const userType = useAppStore(state => state.authentication_state.authentication_status.user_type);
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  
  // Determine active user type view from URL or auth state
  const urlUserType = searchParams.get('user_type');
  const [activeUserTypeView, setActiveUserTypeView] = useState<'guest' | 'customer' | 'supplier'>(
    (urlUserType as any) || (userType === 'customer' ? 'customer' : userType === 'supplier' ? 'supplier' : 'guest')
  );
  
  const highlightedStepParam = searchParams.get('process_step');
  const [highlightedStep, setHighlightedStep] = useState<number | null>(
    highlightedStepParam ? parseInt(highlightedStepParam) : null
  );
  
  // Static data
  const processSteps = getProcessSteps();
  const platformBenefits = getPlatformBenefits();
  
  // Fetch platform statistics
  const { data: successMetrics, isLoading: isLoadingMetrics } = useQuery({
    queryKey: ['platform-statistics'],
    queryFn: fetchPlatformStatistics,
    staleTime: 60000, // 1 minute
    refetchOnWindowFocus: false
  });
  
  // Fetch testimonials
  const { data: testimonials, isLoading: isLoadingTestimonials } = useQuery({
    queryKey: ['testimonials', activeUserTypeView],
    queryFn: () => fetchTestimonials(activeUserTypeView),
    staleTime: 300000, // 5 minutes
    refetchOnWindowFocus: false
  });
  
  // Get display content based on active view
  const currentSteps = activeUserTypeView === 'supplier' 
    ? processSteps.seller_steps 
    : processSteps.buyer_steps;
  
  const currentBenefits = activeUserTypeView === 'supplier'
    ? platformBenefits.seller_benefits
    : platformBenefits.buyer_benefits;
  
  const currentTestimonials = activeUserTypeView === 'supplier'
    ? testimonials?.supplier_testimonials || []
    : testimonials?.customer_testimonials || [];
  
  // Track page engagement
  const trackEngagement = async (engagementType: string, elementId: string) => {
    if (!authToken) return; // Only track for authenticated users
    
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
      await fetch(`${API_BASE_URL}/api/analytics/page-engagement`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          page_type: 'how_it_works',
          user_type: activeUserTypeView,
          engagement_type: engagementType,
          content_element: elementId
        })
      });
    } catch (error) {
      // Silently fail - analytics is not critical
      console.error('Analytics tracking error:', error);
    }
  };
  
  // Handle user type switch
  const switchUserType = (type: 'customer' | 'supplier') => {
    setActiveUserTypeView(type);
    setHighlightedStep(null);
    trackEngagement('user_type_switch', type);
  };
  
  // Handle step click for highlighting
  const handleStepClick = (stepNumber: number) => {
    setHighlightedStep(stepNumber);
    trackEngagement('step_click', `step_${stepNumber}`);
  };

  return (
    <>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-100 py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              How BuildEasy Works
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
              {activeUserTypeView === 'supplier' 
                ? 'Grow your construction supply business with our trusted marketplace platform'
                : 'Order construction materials from verified suppliers with transparent pricing and real-time tracking'
              }
            </p>
            
            {/* User Type Switcher */}
            <div className="flex justify-center space-x-4 mb-8">
              <button
                onClick={() => switchUserType('customer')}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                  activeUserTypeView !== 'supplier'
                    ? 'bg-blue-600 text-white shadow-lg hover:shadow-xl hover:bg-blue-700'
                    : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-blue-300'
                }`}
              >
                <ShoppingCart className="inline-block size-5 mr-2" />
                For Buyers
              </button>
              <button
                onClick={() => switchUserType('supplier')}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                  activeUserTypeView === 'supplier'
                    ? 'bg-blue-600 text-white shadow-lg hover:shadow-xl hover:bg-blue-700'
                    : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-blue-300'
                }`}
              >
                <Store className="inline-block size-5 mr-2" />
                For Suppliers
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Platform Statistics */}
      {!isLoadingMetrics && successMetrics && (
        <section className="bg-white py-12 border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
              <div className="text-center">
                <div className="text-3xl lg:text-4xl font-bold text-blue-600 mb-2">
                  {successMetrics.total_suppliers}+
                </div>
                <div className="text-sm text-gray-600 font-medium">Verified Suppliers</div>
              </div>
              
              <div className="text-center">
                <div className="text-3xl lg:text-4xl font-bold text-blue-600 mb-2">
                  {(successMetrics.total_products / 1000).toFixed(1)}K+
                </div>
                <div className="text-sm text-gray-600 font-medium">Products Available</div>
              </div>
              
              <div className="text-center">
                <div className="text-3xl lg:text-4xl font-bold text-blue-600 mb-2">
                  {(successMetrics.orders_completed / 1000).toFixed(1)}K+
                </div>
                <div className="text-sm text-gray-600 font-medium">Orders Completed</div>
              </div>
              
              <div className="text-center">
                <div className="text-3xl lg:text-4xl font-bold text-blue-600 mb-2">
                  {successMetrics.customer_satisfaction.toFixed(1)}
                  <Star className="inline-block size-6 ml-1 text-yellow-400 fill-yellow-400" />
                </div>
                <div className="text-sm text-gray-600 font-medium">Customer Rating</div>
              </div>
              
              <div className="text-center">
                <div className="text-3xl lg:text-4xl font-bold text-blue-600 mb-2">
                  {successMetrics.average_delivery_time}
                </div>
                <div className="text-sm text-gray-600 font-medium">Avg. Delivery</div>
              </div>
              
              <div className="text-center">
                <div className="text-3xl lg:text-4xl font-bold text-blue-600 mb-2">
                  {successMetrics.cities_served}+
                </div>
                <div className="text-sm text-gray-600 font-medium">Cities Served</div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Process Steps */}
      <section className="py-16 lg:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              {activeUserTypeView === 'supplier' 
                ? 'How to Start Selling'
                : 'How to Order Materials'
              }
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              {activeUserTypeView === 'supplier'
                ? 'Four simple steps to reach more customers and grow your business'
                : 'Four simple steps from search to delivery'
              }
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {currentSteps.map((step) => {
              const IconComponent = step.step_number === 1 ? Search
                : step.step_number === 2 ? Package
                : step.step_number === 3 ? ShoppingCart
                : Truck;
              
              const isHighlighted = highlightedStep === step.step_number;
              
              return (
                <div
                  key={step.step_number}
                  onClick={() => handleStepClick(step.step_number)}
                  className={`bg-white rounded-xl p-6 lg:p-8 shadow-lg border transition-all duration-200 cursor-pointer ${
                    isHighlighted 
                      ? 'border-blue-500 shadow-xl transform scale-105' 
                      : 'border-gray-100 hover:shadow-xl hover:border-blue-200'
                  }`}
                >
                  <div className="mb-4">
                    <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                      <IconComponent className="size-8 text-blue-600" />
                    </div>
                    <div className="text-sm font-semibold text-blue-600 mb-2">
                      Step {step.step_number}
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">
                      {step.title}
                    </h3>
                    <p className="text-gray-600 leading-relaxed mb-4">
                      {step.description}
                    </p>
                  </div>
                  
                  <ul className="space-y-2">
                    {step.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start text-sm text-gray-700">
                        <CheckCircle2 className="size-4 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Key Benefits */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              {activeUserTypeView === 'supplier' 
                ? 'Why Suppliers Choose BuildEasy'
                : 'Why Customers Love BuildEasy'
              }
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
            {currentBenefits.map((benefit) => {
              const BenefitIcon = benefit.benefit_id === 'b1' || benefit.benefit_id === 's1' ? TrendingUp
                : benefit.benefit_id === 'b2' || benefit.benefit_id === 's2' ? DollarSign
                : benefit.benefit_id === 'b3' || benefit.benefit_id === 's3' ? BarChart
                : Shield;
              
              return (
                <div 
                  key={benefit.benefit_id}
                  className="flex gap-6 p-6 rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-200"
                  onMouseEnter={() => trackEngagement('benefit_hover', benefit.benefit_id)}
                >
                  <div className="flex-shrink-0">
                    <div className="w-14 h-14 bg-blue-100 rounded-lg flex items-center justify-center">
                      <BenefitIcon className="size-7 text-blue-600" />
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {benefit.title}
                    </h3>
                    <p className="text-gray-600 mb-4 leading-relaxed">
                      {benefit.description}
                    </p>
                    <ul className="space-y-2">
                      {benefit.details.map((detail, idx) => (
                        <li key={idx} className="flex items-start text-sm text-gray-700">
                          <CheckCircle className="size-4 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      {!isLoadingTestimonials && currentTestimonials.length > 0 && (
        <section className="py-16 lg:py-24 bg-gradient-to-br from-blue-50 to-indigo-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                What {activeUserTypeView === 'supplier' ? 'Suppliers' : 'Customers'} Say
              </h2>
              <p className="text-lg text-gray-600">
                Real experiences from our platform users
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {currentTestimonials.slice(0, 6).map((testimonial: any) => (
                <div 
                  key={testimonial.testimonial_id}
                  className="bg-white rounded-xl p-6 shadow-lg border border-gray-100"
                >
                  <div className="flex items-center mb-4">
                    {activeUserTypeView !== 'supplier' && 'rating' in testimonial && (
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i}
                            className={`size-4 ${
                              i < testimonial.rating 
                                ? 'text-yellow-400 fill-yellow-400' 
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <p className="text-gray-700 mb-4 leading-relaxed italic">
                    "{testimonial.quote}"
                  </p>
                  
                  <div className="pt-4 border-t border-gray-100">
                    <p className="font-semibold text-gray-900">
                      {activeUserTypeView === 'supplier' 
                        ? testimonial.supplier_name 
                        : testimonial.customer_name
                      }
                    </p>
                    {activeUserTypeView === 'supplier' ? (
                      <>
                        <p className="text-sm text-gray-600">{testimonial.business_type}</p>
                        <p className="text-sm text-blue-600 font-medium mt-1">{testimonial.results}</p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-gray-600">{testimonial.customer_type}</p>
                        {testimonial.project_details && (
                          <p className="text-sm text-gray-500 mt-1">{testimonial.project_details}</p>
                        )}
                      </>
                    )}
                    <p className="text-sm text-gray-500 mt-1 flex items-center">
                      <MapPin className="size-3 mr-1" />
                      {testimonial.location}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Visual Demo Section */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              See It In Action
            </h2>
            <p className="text-lg text-gray-600">
              Watch how easy it is to {activeUserTypeView === 'supplier' ? 'manage your shop' : 'order materials'}
            </p>
          </div>

          <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl p-8 lg:p-12 border border-gray-300">
            <div className="aspect-video bg-white rounded-xl shadow-xl flex items-center justify-center border border-gray-200">
              <div className="text-center">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Package className="size-10 text-blue-600" />
                </div>
                <p className="text-gray-600 font-medium">
                  {activeUserTypeView === 'supplier' 
                    ? 'Interactive supplier dashboard demo'
                    : 'Interactive ordering process demo'
                  }
                </p>
                <p className="text-sm text-gray-500 mt-2">Coming soon</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Safety Section */}
      <section className="py-16 lg:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Built on Trust & Reliability
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
              {activeUserTypeView === 'supplier'
                ? 'We protect your business and ensure you get paid on time'
                : 'We verify every supplier and secure every transaction'
              }
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl p-6 text-center shadow-lg border border-gray-100">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="size-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {activeUserTypeView === 'supplier' ? 'Secure Payments' : 'Verified Suppliers'}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {activeUserTypeView === 'supplier'
                  ? 'Automated payouts with transparent commission structure'
                  : 'All suppliers verified and background checked'
                }
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 text-center shadow-lg border border-gray-100">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="size-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {activeUserTypeView === 'supplier' ? 'Customer Support' : 'Dedicated Support'}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {activeUserTypeView === 'supplier'
                  ? '24/7 support for order and platform issues'
                  : 'Live chat, phone, and email support available'
                }
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 text-center shadow-lg border border-gray-100">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="size-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {activeUserTypeView === 'supplier' ? 'Quick Onboarding' : 'Fast Delivery'}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {activeUserTypeView === 'supplier'
                  ? 'Start selling within 2-3 business days after approval'
                  : 'Same-day and next-day delivery options available'
                }
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 lg:py-24 bg-blue-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
            {activeUserTypeView === 'supplier'
              ? 'Ready to Grow Your Business?'
              : 'Ready to Get Started?'
            }
          </h2>
          <p className="text-xl text-blue-100 mb-8 leading-relaxed">
            {activeUserTypeView === 'supplier'
              ? 'Join hundreds of suppliers already thriving on BuildEasy'
              : 'Join thousands of customers ordering smarter with BuildEasy'
            }
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            {activeUserTypeView === 'supplier' ? (
              <>
                <Link
                  to="/register/supplier"
                  onClick={() => trackEngagement('cta_click', 'register_supplier')}
                  className="inline-flex items-center justify-center px-8 py-4 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Apply as Supplier
                  <ArrowRight className="ml-2 size-5" />
                </Link>
                <Link
                  to="/contact"
                  className="inline-flex items-center justify-center px-8 py-4 bg-blue-700 text-white font-semibold rounded-lg hover:bg-blue-800 transition-all duration-200 border-2 border-blue-400"
                >
                  Talk to Sales
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/register/customer"
                  onClick={() => trackEngagement('cta_click', 'register_customer')}
                  className="inline-flex items-center justify-center px-8 py-4 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Sign Up Free
                  <ArrowRight className="ml-2 size-5" />
                </Link>
                <Link
                  to="/products"
                  className="inline-flex items-center justify-center px-8 py-4 bg-blue-700 text-white font-semibold rounded-lg hover:bg-blue-800 transition-all duration-200 border-2 border-blue-400"
                >
                  Browse Products
                </Link>
              </>
            )}
          </div>

          <p className="text-blue-100 text-sm mt-6">
            No credit card required • Free to join • Cancel anytime
          </p>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 lg:py-24 bg-white border-t border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-6">
            {activeUserTypeView === 'supplier' ? (
              <>
                <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    How much does it cost to join?
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    BuildEasy charges an 8.5% commission on completed sales. No monthly fees, no setup costs. You only pay when you make a sale.
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    How long does verification take?
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    Most supplier applications are reviewed within 2-3 business days. We'll notify you via email once your application is approved.
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    When do I get paid?
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    Choose weekly, bi-weekly, or monthly automatic payouts. Funds are deposited directly to your bank account after successful delivery confirmation.
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Can I set my own prices and delivery areas?
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    Yes! You have full control over your pricing, promotions, delivery zones, and service areas. Set custom pricing for trade vs retail customers.
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Is there a minimum order amount?
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    No platform minimum. Individual suppliers may have their own minimums which are clearly displayed before checkout.
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    How accurate is the delivery tracking?
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    We provide real-time GPS tracking when your delivery is out for delivery. You'll receive SMS alerts when the driver is 5 minutes away.
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    What payment methods do you accept?
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    We accept all major credit cards, debit cards, and offer trade credit accounts for verified professional customers. All payments are processed securely.
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    What if I have an issue with my order?
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    Contact the supplier directly through our messaging system or report an issue through your order page. Our support team is also available 24/7 to help resolve any problems.
                  </p>
                </div>
              </>
            )}
          </div>

          <div className="text-center mt-12">
            <Link 
              to="/help"
              className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
            >
              View All Help Articles
              <ArrowRight className="ml-2 size-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
};

export default UV_HowItWorks;