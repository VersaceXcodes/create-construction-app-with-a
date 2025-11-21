import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { 
  Search, 
  ShoppingCart, 
  
  Clock, 
  Shield, 
  CheckCircle,
  Package,
  Truck,
  DollarSign,
  Star,
  ArrowRight,
  ChevronRight
} from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS (from Zod schemas)
// ============================================================================

interface Product {
  product_id: string;
  product_name: string;
  price_per_unit: number;
  primary_image_url: string | null;
  supplier_id: string;
  stock_quantity: number;
  status: string;
  brand: string | null;
  unit_of_measure: string;
  business_name?: string;
  rating_average?: number;
}

interface Category {
  category_id: string;
  category_name: string;
  category_slug: string;
  icon_url: string | null;
  display_order: number;
}

interface Supplier {
  supplier_id: string;
  business_name: string;
  logo_url: string | null;
  rating_average: number;
  total_reviews: number;
  verification_status: string;
}

interface ProductsResponse {
  products: Product[];
  total: number;
  limit: number;
  offset: number;
}

interface SuppliersResponse {
  suppliers: Supplier[];
  total: number;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const fetchFeaturedProducts = async (): Promise<Product[]> => {
  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
  const response = await axios.get<ProductsResponse>(`${API_BASE}/products`, {
    params: {
      is_featured: 'true',
      status: 'active',
      limit: 12,
      sort_by: 'sales_count',
      sort_order: 'desc'
    }
  });
  return response.data.products;
};

const fetchFeaturedCategories = async (): Promise<Category[]> => {
  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
  const response = await axios.get<Category[]>(`${API_BASE}/categories`, {
    params: {
      is_active: 'true',
      limit: 100,
      sort_by: 'display_order',
      sort_order: 'asc'
    }
  });
  return response.data;
};

const fetchFeaturedSuppliers = async (): Promise<SuppliersResponse> => {
  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
  const response = await axios.get<SuppliersResponse>(`${API_BASE}/suppliers`, {
    params: {
      verification_status: 'verified',
      status: 'active',
      limit: 12,
      sort_by: 'rating_average',
      sort_order: 'desc'
    }
  });
  return response.data;
};

// ============================================================================
// COMPONENT
// ============================================================================

const UV_Landing: React.FC = () => {
  const navigate = useNavigate();
  
  // CRITICAL: Individual selectors to prevent infinite loops
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
  const userType = useAppStore(state => state.authentication_state.authentication_status.user_type);
  const isAuthLoading = useAppStore(state => state.authentication_state.authentication_status.is_loading);
  
  // Redirect authenticated users to their dashboards
  useEffect(() => {
    if (!isAuthLoading && isAuthenticated) {
      if (userType === 'customer') {
        navigate('/dashboard', { replace: true });
      } else if (userType === 'supplier') {
        navigate('/supplier/dashboard', { replace: true });
      } else if (userType === 'admin') {
        navigate('/admin', { replace: true });
      }
    }
  }, [isAuthenticated, userType, isAuthLoading, navigate]);
  
  // React Query for data fetching
  const { 
    data: products = [], 
    isLoading: productsLoading,
    error: productsError // eslint-disable-line @typescript-eslint/no-unused-vars 
  } = useQuery({
    queryKey: ['featured-products'],
    queryFn: fetchFeaturedProducts,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  const { 
    data: categories = [], 
    isLoading: categoriesLoading,
    error: categoriesError // eslint-disable-line @typescript-eslint/no-unused-vars 
  } = useQuery({
    queryKey: ['featured-categories'],
    queryFn: fetchFeaturedCategories,
    staleTime: 30 * 60 * 1000, // 30 minutes (categories change rarely)
  });
  
  const { 
    data: suppliersData, 
    isLoading: suppliersLoading,
    error: suppliersError // eslint-disable-line @typescript-eslint/no-unused-vars 
  } = useQuery({
    queryKey: ['featured-suppliers'],
    queryFn: fetchFeaturedSuppliers,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
  
  const suppliers = suppliersData?.suppliers || [];
  const totalSuppliers = suppliersData?.total || 0;
  
  // Calculate platform stats
  const platformStats = {
    total_suppliers: totalSuppliers,
    total_products: products.length > 0 ? 10000 : 0, // Using approximation from featured products
    total_reviews: suppliers.reduce((sum, s) => sum + s.total_reviews, 0)
  };
  
  // Don't render if authenticated (will redirect)
  if (isAuthenticated && !isAuthLoading) {
    return null;
  }
  
  return (
    <>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-50 via-white to-indigo-50 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Hero Content */}
            <div className="space-y-8">
              <div className="space-y-4">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                  Your Complete <span className="text-blue-600">Construction Supply</span> Marketplace
                </h1>
                <p className="text-xl text-gray-600 leading-relaxed">
                  Order from 100+ verified suppliers. Compare prices instantly. Track every delivery in real-time.
                </p>
              </div>
              
              {/* Trust Indicators */}
              <div className="flex flex-wrap gap-6">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-gray-700 font-medium">Real-time Inventory</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-gray-700 font-medium">Transparent Pricing</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-gray-700 font-medium">Verified Suppliers</span>
                </div>
              </div>
              
              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center px-8 py-4 bg-blue-600 text-white font-semibold rounded-lg shadow-lg hover:bg-blue-700 hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                >
                  Sign Up Free
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
                <Link
                  to="/products"
                  className="inline-flex items-center justify-center px-8 py-4 bg-white text-gray-900 font-semibold rounded-lg border-2 border-gray-300 hover:border-blue-500 hover:shadow-lg transition-all duration-200"
                >
                  Browse Products
                </Link>
              </div>
              
              {/* Platform Stats */}
              {!isAuthLoading && (
                <div className="flex flex-wrap gap-6 pt-4">
                  <div className="flex items-center space-x-2 text-gray-600">
                    <Shield className="w-5 h-5 text-blue-600" />
                    <span className="font-medium">{platformStats.total_suppliers}+ Suppliers</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-600">
                    <Package className="w-5 h-5 text-blue-600" />
                    <span className="font-medium">{platformStats.total_products.toLocaleString()}+ Products</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-600">
                    <Star className="w-5 h-5 text-blue-600" />
                    <span className="font-medium">{platformStats.total_reviews.toLocaleString()}+ Reviews</span>
                  </div>
                </div>
              )}
            </div>
            
            {/* Hero Image/Illustration */}
            <div className="hidden lg:block">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-3xl transform rotate-3 opacity-10"></div>
                <div className="relative bg-white rounded-2xl shadow-2xl p-8 space-y-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                      <Search className="w-8 h-8 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Search & Compare</h3>
                      <p className="text-gray-600 text-sm">Find the best prices instantly</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                      <ShoppingCart className="w-8 h-8 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Order Online</h3>
                      <p className="text-gray-600 text-sm">Secure checkout in minutes</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
                      <Truck className="w-8 h-8 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Track Delivery</h3>
                      <p className="text-gray-600 text-sm">Real-time GPS tracking</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* How It Works Section */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              How BuildEasy Works
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Simple, transparent, and reliable construction supply ordering in 3 easy steps
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            {/* Step 1 */}
            <div className="relative">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
                  <Search className="w-10 h-10 text-blue-600" />
                </div>
                <div className="space-y-2">
                  <div className="inline-flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full text-sm font-bold">
                    1
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Search & Compare</h3>
                  <p className="text-gray-600">
                    Browse thousands of construction materials from verified suppliers. Compare prices, stock levels, and delivery times in one place.
                  </p>
                </div>
              </div>
              <div className="hidden md:block absolute top-10 right-0 transform translate-x-1/2">
                <ChevronRight className="w-8 h-8 text-gray-300" />
              </div>
            </div>
            
            {/* Step 2 */}
            <div className="relative">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                  <ShoppingCart className="w-10 h-10 text-green-600" />
                </div>
                <div className="space-y-2">
                  <div className="inline-flex items-center justify-center w-8 h-8 bg-green-600 text-white rounded-full text-sm font-bold">
                    2
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Order Online</h3>
                  <p className="text-gray-600">
                    Add items to cart, select your delivery window, and complete secure checkout. Get instant confirmation and order tracking.
                  </p>
                </div>
              </div>
              <div className="hidden md:block absolute top-10 right-0 transform translate-x-1/2">
                <ChevronRight className="w-8 h-8 text-gray-300" />
              </div>
            </div>
            
            {/* Step 3 */}
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center">
                <Truck className="w-10 h-10 text-purple-600" />
              </div>
              <div className="space-y-2">
                <div className="inline-flex items-center justify-center w-8 h-8 bg-purple-600 text-white rounded-full text-sm font-bold">
                  3
                </div>
                <h3 className="text-xl font-bold text-gray-900">Track & Receive</h3>
                <p className="text-gray-600">
                  Get real-time delivery tracking with GPS. Know exactly when your materials will arrive at your job site.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Shop by Category Section */}
      <section className="py-16 lg:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Shop by Category
            </h2>
            <p className="text-xl text-gray-600">
              Browse our complete range of construction materials
            </p>
          </div>
          
          {categoriesLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl p-6 shadow-lg animate-pulse">
                  <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-6">
              {categories.slice(0, 8).map((category) => (
                <Link
                  key={category.category_id}
                  to={`/products?category=${category.category_id}`}
                  className="group bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 border border-gray-100"
                >
                  <div className="flex flex-col items-center space-y-4">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                      <Package className="w-8 h-8 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 text-center group-hover:text-blue-600 transition-colors">
                      {category.category_name}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>
          )}
          
          <div className="text-center mt-12">
            <Link
              to="/products"
              className="inline-flex items-center text-blue-600 hover:text-blue-700 font-semibold text-lg"
            >
              View All Categories
              <ChevronRight className="ml-2 w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>
      
      {/* Featured Products Section */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Featured Products
            </h2>
            <p className="text-xl text-gray-600">
              Top-rated materials from our verified suppliers
            </p>
          </div>
          
          {productsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-pulse">
                  <div className="aspect-square bg-gray-200"></div>
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {products.slice(0, 8).map((product) => (
                <Link
                  key={product.product_id}
                  to={`/product/${product.product_id}`}
                  className="group bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-xl hover:border-blue-300 transition-all duration-200"
                >
                  {/* Product Image */}
                  <div className="aspect-square bg-gray-100 overflow-hidden">
                    {product.primary_image_url ? (
                      <img
                        src={product.primary_image_url}
                        alt={product.product_name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-200">
                        <Package className="w-16 h-16 text-gray-400" />
                      </div>
                    )}
                  </div>
                  
                  {/* Product Info */}
                  <div className="p-4 space-y-3">
                    <h3 className="font-semibold text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
                      {product.product_name}
                    </h3>
                    
                    <div className="flex items-baseline space-x-2">
                      <span className="text-2xl font-bold text-gray-900">
                        ${Number(product.price_per_unit).toFixed(2)}
                      </span>
                      <span className="text-sm text-gray-600">
                        per {product.unit_of_measure}
                      </span>
                    </div>
                    
                    {/* Stock Badge */}
                    <div className="flex items-center justify-between">
                      {product.stock_quantity > 0 ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          In Stock
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Out of Stock
                        </span>
                      )}
                      
                      {product.rating_average && (
                      <div className="flex items-center space-x-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < Math.floor(Number(product.rating_average))
                                ? 'text-yellow-400 fill-current'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                        <span className="ml-2 text-sm font-medium text-gray-700">
                          {Number(product.rating_average).toFixed(1)}
                        </span>
                      </div>
                      )}
                    </div>
                    
                    {product.business_name && (
                      <p className="text-sm text-gray-600 truncate">
                        by {product.business_name}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
          
          <div className="text-center mt-12">
            <Link
              to="/products"
              className="inline-flex items-center px-8 py-4 bg-gray-100 text-gray-900 font-semibold rounded-lg hover:bg-gray-200 transition-colors duration-200"
            >
              View All Products
              <ChevronRight className="ml-2 w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>
      
      {/* Value Propositions Section */}
      <section className="py-16 lg:py-24 bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Why Choose BuildEasy?
            </h2>
            <p className="text-xl text-gray-600">
              The smarter way to source construction materials
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Value Prop 1 */}
            <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-100">
              <div className="w-14 h-14 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
                <Clock className="w-7 h-7 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Real-Time Inventory
              </h3>
              <p className="text-gray-600">
                See exact stock levels updated in real-time. No more calling suppliers or ordering unavailable items.
              </p>
            </div>
            
            {/* Value Prop 2 */}
            <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-100">
              <div className="w-14 h-14 bg-green-100 rounded-lg flex items-center justify-center mb-6">
                <DollarSign className="w-7 h-7 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Transparent Pricing
              </h3>
              <p className="text-gray-600">
                Compare prices across multiple suppliers instantly. Always know you're getting the best deal.
              </p>
            </div>
            
            {/* Value Prop 3 */}
            <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-100">
              <div className="w-14 h-14 bg-purple-100 rounded-lg flex items-center justify-center mb-6">
                <Truck className="w-7 h-7 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Reliable Delivery
              </h3>
              <p className="text-gray-600">
                Schedule delivery windows that work for you. Track your order with live GPS updates.
              </p>
            </div>
            
            {/* Value Prop 4 */}
            <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-100">
              <div className="w-14 h-14 bg-yellow-100 rounded-lg flex items-center justify-center mb-6">
                <Shield className="w-7 h-7 text-yellow-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Verified Suppliers
              </h3>
              <p className="text-gray-600">
                All suppliers are thoroughly vetted and verified. Read real reviews from contractors like you.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Featured Suppliers Section */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Trusted Suppliers
            </h2>
            <p className="text-xl text-gray-600">
              Verified construction supply businesses you can rely on
            </p>
          </div>
          
          {suppliersLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl p-6 shadow-lg border border-gray-200 animate-pulse">
                  <div className="w-20 h-20 bg-gray-200 rounded-full mx-auto mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mx-auto"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {suppliers.slice(0, 8).map((supplier) => (
                <Link
                  key={supplier.supplier_id}
                  to={`/supplier/${supplier.supplier_id}`}
                  className="group bg-white rounded-xl p-6 shadow-lg hover:shadow-2xl transition-all duration-200 border border-gray-100 hover:border-blue-300"
                >
                  <div className="flex flex-col items-center space-y-4">
                    {/* Supplier Logo */}
                    <div className="w-20 h-20 bg-gray-100 rounded-full overflow-hidden flex items-center justify-center">
                      {supplier.logo_url ? (
                        <img
                          src={supplier.logo_url}
                          alt={supplier.business_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 text-gray-400 flex items-center justify-center">
                          <Shield className="w-8 h-8" />
                        </div>
                      )}
                    </div>
                    
                    {/* Supplier Info */}
                    <div className="text-center space-y-2">
                      <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {supplier.business_name}
                      </h3>
                      
                      <div className="flex items-center justify-center space-x-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < Math.floor(Number(supplier.rating_average))
                                ? 'text-yellow-400 fill-current'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                        <span className="ml-2 text-sm font-medium text-gray-700">
                          {Number(supplier.rating_average).toFixed(1)}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-600">
                        {supplier.total_reviews} reviews
                      </p>
                      
                      {supplier.verification_status === 'verified' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Verified
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
          
          <div className="text-center mt-12">
            <Link
              to="/products"
              className="inline-flex items-center px-8 py-4 bg-gray-100 text-gray-900 font-semibold rounded-lg hover:bg-gray-200 transition-colors duration-200"
            >
              Explore All Suppliers
              <ChevronRight className="ml-2 w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>
      
      {/* Final CTA Section */}
      <section className="py-16 lg:py-24 bg-gradient-to-r from-blue-600 to-indigo-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-5xl font-bold text-white mb-6 leading-tight">
            Ready to Transform Your Supply Ordering?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of contractors saving time and money with BuildEasy
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="inline-flex items-center justify-center px-10 py-5 bg-white text-blue-600 font-bold rounded-lg shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-200 text-lg"
            >
              Get Started Free
              <ArrowRight className="ml-3 w-6 h-6" />
            </Link>
            <Link
              to="/how-it-works"
              className="inline-flex items-center justify-center px-10 py-5 bg-blue-500 text-white font-bold rounded-lg border-2 border-white hover:bg-blue-400 transition-all duration-200 text-lg"
            >
              Learn More
            </Link>
          </div>
          
          <div className="mt-8 flex flex-wrap justify-center gap-8 text-blue-100">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5" />
              <span>Free to join</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5" />
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default UV_Landing;