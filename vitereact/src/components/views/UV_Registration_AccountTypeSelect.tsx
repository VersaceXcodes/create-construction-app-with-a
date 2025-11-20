import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Store, CheckCircle2 } from 'lucide-react';

const UV_Registration_AccountTypeSelect: React.FC = () => {
  // ============================================================================
  // LOCAL STATE
  // ============================================================================
  const [selected_account_type, setSelectedAccountType] = useState<string | null>(null);
  const [hover_state, setHoverState] = useState<string | null>(null);
  
  const navigate = useNavigate();

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  
  const handleCustomerSelect = () => {
    setSelectedAccountType('customer');
    navigate('/register/customer');
  };

  const handleSupplierSelect = () => {
    setSelectedAccountType('supplier');
    navigate('/register/supplier');
  };

  // ============================================================================
  // RENDER
  // ============================================================================
  
  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl w-full">
          {/* Header Section */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 leading-tight">
              Join BuildEasy
            </h1>
            <p className="text-xl text-gray-600">
              Choose how you want to use our platform
            </p>
          </div>

          {/* Account Type Selection Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {/* CUSTOMER ACCOUNT CARD */}
            <button
              onClick={handleCustomerSelect}
              onMouseEnter={() => setHoverState('customer')}
              onMouseLeave={() => setHoverState(null)}
              className={`
                group relative bg-white rounded-2xl shadow-lg border-2 transition-all duration-300 ease-in-out
                hover:shadow-2xl hover:scale-105 hover:border-blue-500
                p-8 text-left cursor-pointer
                ${hover_state === 'customer' ? 'border-blue-500 shadow-2xl transform scale-105' : 'border-gray-200'}
                ${selected_account_type === 'customer' ? 'ring-4 ring-blue-200' : ''}
              `}
            >
              {/* Icon */}
              <div className="mb-6">
                <div className={`
                  inline-flex items-center justify-center w-20 h-20 rounded-2xl transition-all duration-300
                  ${hover_state === 'customer' ? 'bg-blue-600 shadow-lg' : 'bg-blue-100'}
                `}>
                  <ShoppingCart 
                    className={`
                      w-10 h-10 transition-colors duration-300
                      ${hover_state === 'customer' ? 'text-white' : 'text-blue-600'}
                    `} 
                  />
                </div>
              </div>

              {/* Title */}
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                I want to buy construction materials
              </h2>

              {/* Subtitle */}
              <p className="text-gray-600 mb-6">
                Perfect for contractors, builders, and DIY enthusiasts looking for quality materials
              </p>

              {/* Benefits List */}
              <div className="space-y-3 mb-8">
                <div className="flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700 text-sm">
                    Compare suppliers and find the best prices instantly
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700 text-sm">
                    Real-time inventory updates from 100+ verified suppliers
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700 text-sm">
                    Track every delivery with live GPS updates
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700 text-sm">
                    Secure payments with multiple options
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <div className={`
                inline-flex items-center justify-center w-full px-6 py-3 rounded-lg font-semibold text-base transition-all duration-300
                ${hover_state === 'customer' 
                  ? 'bg-blue-600 text-white shadow-lg' 
                  : 'bg-blue-600 text-white'
                }
              `}>
                Create Customer Account
                <svg 
                  className="ml-2 w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>

              {/* Hover Indicator */}
              {hover_state === 'customer' && (
                <div className="absolute top-4 right-4">
                  <div className="bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    Select
                  </div>
                </div>
              )}
            </button>

            {/* SUPPLIER ACCOUNT CARD */}
            <button
              onClick={handleSupplierSelect}
              onMouseEnter={() => setHoverState('supplier')}
              onMouseLeave={() => setHoverState(null)}
              className={`
                group relative bg-white rounded-2xl shadow-lg border-2 transition-all duration-300 ease-in-out
                hover:shadow-2xl hover:scale-105 hover:border-indigo-500
                p-8 text-left cursor-pointer
                ${hover_state === 'supplier' ? 'border-indigo-500 shadow-2xl transform scale-105' : 'border-gray-200'}
                ${selected_account_type === 'supplier' ? 'ring-4 ring-indigo-200' : ''}
              `}
            >
              {/* Icon */}
              <div className="mb-6">
                <div className={`
                  inline-flex items-center justify-center w-20 h-20 rounded-2xl transition-all duration-300
                  ${hover_state === 'supplier' ? 'bg-indigo-600 shadow-lg' : 'bg-indigo-100'}
                `}>
                  <Store 
                    className={`
                      w-10 h-10 transition-colors duration-300
                      ${hover_state === 'supplier' ? 'text-white' : 'text-indigo-600'}
                    `} 
                  />
                </div>
              </div>

              {/* Title */}
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                I want to sell construction materials
              </h2>

              {/* Subtitle */}
              <p className="text-gray-600 mb-6">
                Perfect for supply shops, distributors, and wholesalers ready to grow
              </p>

              {/* Benefits List */}
              <div className="space-y-3 mb-8">
                <div className="flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700 text-sm">
                    Reach thousands of contractors and builders nationwide
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700 text-sm">
                    Manage inventory and orders from one powerful dashboard
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700 text-sm">
                    Grow your sales with automated marketing tools
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700 text-sm">
                    Flexible payout options with transparent pricing
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <div className={`
                inline-flex items-center justify-center w-full px-6 py-3 rounded-lg font-semibold text-base transition-all duration-300
                ${hover_state === 'supplier' 
                  ? 'bg-indigo-600 text-white shadow-lg' 
                  : 'bg-indigo-600 text-white'
                }
              `}>
                Create Supplier Account
                <svg 
                  className="ml-2 w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>

              {/* Hover Indicator */}
              {hover_state === 'supplier' && (
                <div className="absolute top-4 right-4">
                  <div className="bg-indigo-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    Select
                  </div>
                </div>
              )}
            </button>
          </div>

          {/* Sign In Link */}
          <div className="text-center pt-6 border-t border-gray-200">
            <p className="text-gray-600">
              Already have an account?{' '}
              <Link 
                to="/login" 
                className="font-semibold text-blue-600 hover:text-blue-700 transition-colors duration-200"
              >
                Sign in
              </Link>
            </p>
          </div>

          {/* Trust Indicators */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <div className="flex flex-col items-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">100+</div>
                <div className="text-sm text-gray-600">Verified Suppliers</div>
              </div>
              <div className="flex flex-col items-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">10,000+</div>
                <div className="text-sm text-gray-600">Products Available</div>
              </div>
              <div className="flex flex-col items-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">4.8★</div>
                <div className="text-sm text-gray-600">Average Rating</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_Registration_AccountTypeSelect;