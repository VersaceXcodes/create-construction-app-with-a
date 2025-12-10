import React, { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAppStore } from '@/store/main';

// Global Views - Keep these as regular imports since they're used frequently
import GV_TopNav_Guest from '@/components/views/GV_TopNav_Guest';
import GV_TopNav_Customer from '@/components/views/GV_TopNav_Customer';
import GV_TopNav_Supplier from '@/components/views/GV_TopNav_Supplier';
import GV_TopNav_Admin from '@/components/views/GV_TopNav_Admin';
import GV_Footer from '@/components/views/GV_Footer';
import GV_MiniCart_Customer from '@/components/views/GV_MiniCart_Customer';
import GV_ChatWidget from '@/components/views/GV_ChatWidget';

// Lazy load all page components for code splitting
// Unique Views - Guest/Public
const UV_Landing = lazy(() => import('@/components/views/UV_Landing'));
const UV_Catalog = lazy(() => import('@/components/views/UV_Catalog'));
const UV_ProductDetail_Guest = lazy(() => import('@/components/views/UV_ProductDetail_Guest'));
const UV_ProductDetail_Customer = lazy(() => import('@/components/views/UV_ProductDetail_Customer'));
const UV_SupplierProfile_Guest = lazy(() => import('@/components/views/UV_SupplierProfile_Guest'));
const UV_SupplierProfile_Customer = lazy(() => import('@/components/views/UV_SupplierProfile_Customer'));
const UV_Registration_AccountTypeSelect = lazy(() => import('@/components/views/UV_Registration_AccountTypeSelect'));
const UV_Registration_Customer = lazy(() => import('@/components/views/UV_Registration_Customer'));
const UV_Registration_Supplier = lazy(() => import('@/components/views/UV_Registration_Supplier'));
const UV_Login = lazy(() => import('@/components/views/UV_Login'));
const UV_ForgotPassword = lazy(() => import('@/components/views/UV_ForgotPassword'));
const UV_ResetPassword = lazy(() => import('@/components/views/UV_ResetPassword'));

// Unique Views - Customer
const UV_CustomerOnboarding = lazy(() => import('@/components/views/UV_CustomerOnboarding'));
const UV_CustomerDashboard = lazy(() => import('@/components/views/UV_CustomerDashboard'));
const UV_ProductComparison = lazy(() => import('@/components/views/UV_ProductComparison'));
const UV_CartPage = lazy(() => import('@/components/views/UV_CartPage'));
const UV_Wishlist = lazy(() => import('@/components/views/UV_Wishlist'));
const UV_MyProjects = lazy(() => import('@/components/views/UV_MyProjects'));
const UV_ProjectDetail = lazy(() => import('@/components/views/UV_ProjectDetail'));
const UV_Checkout = lazy(() => import('@/components/views/UV_Checkout'));
const UV_OrderConfirmation = lazy(() => import('@/components/views/UV_OrderConfirmation'));
const UV_OrderDashboard = lazy(() => import('@/components/views/UV_OrderDashboard'));
const UV_OrderDetail = lazy(() => import('@/components/views/UV_OrderDetail'));
const UV_NotificationCenter = lazy(() => import('@/components/views/UV_NotificationCenter'));
const UV_AccountSettings = lazy(() => import('@/components/views/UV_AccountSettings'));
const UV_MyReviews = lazy(() => import('@/components/views/UV_MyReviews'));
const UV_IssueSubmit = lazy(() => import('@/components/views/UV_IssueSubmit'));
const UV_IssueDetail = lazy(() => import('@/components/views/UV_IssueDetail'));
const UV_SupportContact = lazy(() => import('@/components/views/UV_SupportContact'));
const UV_SurplusMarketplace_Browse = lazy(() => import('@/components/views/UV_SurplusMarketplace_Browse'));
const UV_SurplusListing_Detail = lazy(() => import('@/components/views/UV_SurplusListing_Detail'));
const UV_SurplusListing_Create = lazy(() => import('@/components/views/UV_SurplusListing_Create'));
const UV_MySurplusListings = lazy(() => import('@/components/views/UV_MySurplusListings'));
const UV_TradeCredit_Application = lazy(() => import('@/components/views/UV_TradeCredit_Application'));
const UV_TradeCredit_Dashboard = lazy(() => import('@/components/views/UV_TradeCredit_Dashboard'));

// Unique Views - Supplier
const UV_SupplierOnboarding = lazy(() => import('@/components/views/UV_SupplierOnboarding'));
const UV_SupplierDashboard = lazy(() => import('@/components/views/UV_SupplierDashboard'));
const UV_ProductManagement_Supplier = lazy(() => import('@/components/views/UV_ProductManagement_Supplier'));
const UV_ProductAdd_Supplier = lazy(() => import('@/components/views/UV_ProductAdd_Supplier'));
const UV_ProductEdit_Supplier = lazy(() => import('@/components/views/UV_ProductEdit_Supplier'));
const UV_ProductBulkUpload_Supplier = lazy(() => import('@/components/views/UV_ProductBulkUpload_Supplier'));
const UV_InventoryManagement_Supplier = lazy(() => import('@/components/views/UV_InventoryManagement_Supplier'));
const UV_OrderManagement_Supplier = lazy(() => import('@/components/views/UV_OrderManagement_Supplier'));
const UV_OrderDetail_Supplier = lazy(() => import('@/components/views/UV_OrderDetail_Supplier'));
const UV_DeliveryManagement_Supplier = lazy(() => import('@/components/views/UV_DeliveryManagement_Supplier'));
const UV_PricingPromotions_Supplier = lazy(() => import('@/components/views/UV_PricingPromotions_Supplier'));
const UV_SupplierMessages = lazy(() => import('@/components/views/UV_SupplierMessages'));
const UV_ReviewsManagement_Supplier = lazy(() => import('@/components/views/UV_ReviewsManagement_Supplier'));
const UV_SupplierAnalytics = lazy(() => import('@/components/views/UV_SupplierAnalytics'));
const UV_SupplierFinancials = lazy(() => import('@/components/views/UV_SupplierFinancials'));
const UV_SupplierSettings = lazy(() => import('@/components/views/UV_SupplierSettings'));
const UV_SupplierEducation = lazy(() => import('@/components/views/UV_SupplierEducation'));

// Unique Views - Admin
const UV_AdminDashboard = lazy(() => import('@/components/views/UV_AdminDashboard'));
const UV_AdminUserManagement_Customers = lazy(() => import('@/components/views/UV_AdminUserManagement_Customers'));
const UV_AdminUserManagement_Suppliers = lazy(() => import('@/components/views/UV_AdminUserManagement_Suppliers'));
const UV_AdminSupplierApplications = lazy(() => import('@/components/views/UV_AdminSupplierApplications'));
const UV_AdminProductModeration = lazy(() => import('@/components/views/UV_AdminProductModeration'));
const UV_AdminOrderOversight = lazy(() => import('@/components/views/UV_AdminOrderOversight'));
const UV_AdminDisputeManagement = lazy(() => import('@/components/views/UV_AdminDisputeManagement'));
const UV_AdminReviewModeration = lazy(() => import('@/components/views/UV_AdminReviewModeration'));
const UV_AdminFinancials = lazy(() => import('@/components/views/UV_AdminFinancials'));
const UV_AdminPlatformSettings = lazy(() => import('@/components/views/UV_AdminPlatformSettings'));
const UV_AdminAnalytics = lazy(() => import('@/components/views/UV_AdminAnalytics'));
const UV_AdminCommunication = lazy(() => import('@/components/views/UV_AdminCommunication'));
const UV_AdminTeamManagement = lazy(() => import('@/components/views/UV_AdminTeamManagement'));
const UV_AdminSystemLogs = lazy(() => import('@/components/views/UV_AdminSystemLogs'));
const UV_AdminMaintenanceMode = lazy(() => import('@/components/views/UV_AdminMaintenanceMode'));

// Unique Views - Help/Legal
const UV_KnowledgeBase = lazy(() => import('@/components/views/UV_KnowledgeBase'));
const UV_HowItWorks = lazy(() => import('@/components/views/UV_HowItWorks'));
const UV_Contact = lazy(() => import('@/components/views/UV_Contact'));
const UV_About = lazy(() => import('@/components/views/UV_About'));
const UV_TermsOfService = lazy(() => import('@/components/views/UV_TermsOfService'));
const UV_PrivacyPolicy = lazy(() => import('@/components/views/UV_PrivacyPolicy'));

// ============================================================================
// QUERY CLIENT SETUP
// ============================================================================

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// ============================================================================
// LOADING SPINNER COMPONENT
// ============================================================================

const LoadingSpinner: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="flex flex-col items-center space-y-4">
      <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
      <p className="text-gray-600 font-medium">Loading...</p>
    </div>
  </div>
);

// ============================================================================
// PROTECTED ROUTE COMPONENT
// ============================================================================

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'customer' | 'supplier' | 'admin';
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  // CRITICAL: Individual selectors to avoid infinite loops
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
  const isLoading = useAppStore(state => state.authentication_state.authentication_status.is_loading);
  const userType = useAppStore(state => state.authentication_state.authentication_status.user_type);
  
  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  // Role-based access control
  if (requiredRole && userType !== requiredRole) {
    // Redirect to appropriate dashboard based on user type
    if (userType === 'customer') {
      return <Navigate to="/dashboard" replace />;
    } else if (userType === 'supplier') {
      return <Navigate to="/supplier/dashboard" replace />;
    } else if (userType === 'admin') {
      return <Navigate to="/admin" replace />;
    }
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

// ============================================================================
// DYNAMIC PRODUCT DETAIL ROUTE (AUTH-AWARE)
// ============================================================================

const ProductDetailRoute: React.FC = () => {
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
  
  if (isAuthenticated) {
    return <UV_ProductDetail_Customer />;
  }
  
  return <UV_ProductDetail_Guest />;
};

// ============================================================================
// DYNAMIC SUPPLIER PROFILE ROUTE (AUTH-AWARE)
// ============================================================================

const SupplierProfileRoute: React.FC = () => {
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
  
  if (isAuthenticated) {
    return <UV_SupplierProfile_Customer />;
  }
  
  return <UV_SupplierProfile_Guest />;
};

// ============================================================================
// LAYOUT WRAPPERS
// ============================================================================

// Guest Layout: TopNav + Content + Footer
const GuestLayout: React.FC<{ children: React.ReactNode; showFooter?: boolean }> = ({ 
  children, 
  showFooter = true 
}) => (
  <div className="min-h-screen flex flex-col bg-gray-50">
    <GV_TopNav_Guest />
    <main className="flex-1 pt-16">
      {children}
    </main>
    {showFooter && <GV_Footer />}
  </div>
);

// Customer Layout: TopNav + Content + Footer + MiniCart + Chat
const CustomerLayout: React.FC<{ children: React.ReactNode; showFooter?: boolean; showMiniCart?: boolean; showChat?: boolean }> = ({ 
  children, 
  showFooter = true,
  showMiniCart = true,
  showChat = true
}) => (
  <div className="min-h-screen flex flex-col bg-gray-50">
    <GV_TopNav_Customer />
    <main className="flex-1 pt-16">
      {children}
    </main>
    {showFooter && <GV_Footer />}
    {showMiniCart && <GV_MiniCart_Customer />}
    {showChat && <GV_ChatWidget />}
  </div>
);

// Supplier Layout: TopNav + Content + Footer + Chat
const SupplierLayout: React.FC<{ children: React.ReactNode; showFooter?: boolean; showChat?: boolean }> = ({ 
  children, 
  showFooter = true,
  showChat = true
}) => (
  <div className="min-h-screen flex flex-col bg-gray-50">
    <GV_TopNav_Supplier />
    <main className="flex-1 pt-16">
      {children}
    </main>
    {showFooter && <GV_Footer />}
    {showChat && <GV_ChatWidget />}
  </div>
);

// Admin Layout: TopNav + Content (no footer, no chat)
const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen flex flex-col bg-gray-100">
    <GV_TopNav_Admin />
    <main className="flex-1 pt-16">
      {children}
    </main>
  </div>
);

// Auth-Aware Public Layout: Shows appropriate nav based on auth status and user role
const AuthAwarePublicLayout: React.FC<{ children: React.ReactNode; showFooter?: boolean }> = ({ 
  children, 
  showFooter = true 
}) => {
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
  const userType = useAppStore(state => state.authentication_state.authentication_status.user_type);
  
  // If authenticated, show appropriate layout based on user type
  if (isAuthenticated) {
    if (userType === 'customer') {
      return (
        <CustomerLayout showFooter={showFooter} showMiniCart={true} showChat={true}>
          {children}
        </CustomerLayout>
      );
    }
    
    if (userType === 'supplier') {
      return (
        <SupplierLayout showFooter={showFooter} showChat={true}>
          {children}
        </SupplierLayout>
      );
    }
    
    if (userType === 'admin') {
      return (
        <AdminLayout>
          {children}
        </AdminLayout>
      );
    }
  }
  
  // Not authenticated - use GuestLayout
  return (
    <GuestLayout showFooter={showFooter}>
      {children}
    </GuestLayout>
  );
};

// ============================================================================
// ROOT REDIRECT COMPONENT
// ============================================================================

// RootRedirect component removed - not used in routes

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================

const App: React.FC = () => {
  // CRITICAL: Individual selectors, no object destructuring
  const isLoading = useAppStore(state => state.authentication_state.authentication_status.is_loading);
  const initializeAuth = useAppStore(state => state.initialize_auth);
  
  useEffect(() => {
    // Initialize auth state when app loads
    initializeAuth();
  }, [initializeAuth]);
  
  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  return (
    <Router>
      <QueryClientProvider client={queryClient}>
        <Routes>
          {/* ============================================ */}
          {/* GUEST / PUBLIC ROUTES */}
          {/* ============================================ */}
          
          {/* Landing Page */}
          <Route path="/" element={
            <AuthAwarePublicLayout>
              <UV_Landing />
            </AuthAwarePublicLayout>
          } />
          
          {/* Product Catalog */}
          <Route path="/products" element={
            <AuthAwarePublicLayout>
              <UV_Catalog />
            </AuthAwarePublicLayout>
          } />
          
          {/* Product Detail (Auth-Aware) */}
          <Route path="/product/:product_id" element={
            <AuthAwarePublicLayout>
              <ProductDetailRoute />
            </AuthAwarePublicLayout>
          } />
          
          {/* Supplier Profile (Auth-Aware) */}
          <Route path="/supplier/:supplier_id" element={
            <AuthAwarePublicLayout>
              <SupplierProfileRoute />
            </AuthAwarePublicLayout>
          } />
          
          {/* Registration Flow */}
          <Route path="/register" element={
            <GuestLayout showFooter={false}>
              <UV_Registration_AccountTypeSelect />
            </GuestLayout>
          } />
          
          <Route path="/register/customer" element={
            <GuestLayout showFooter={false}>
              <UV_Registration_Customer />
            </GuestLayout>
          } />
          
          <Route path="/register/supplier" element={
            <GuestLayout showFooter={false}>
              <UV_Registration_Supplier />
            </GuestLayout>
          } />
          
          {/* Authentication */}
          <Route path="/login" element={
            <GuestLayout showFooter={false}>
              <UV_Login />
            </GuestLayout>
          } />
          
          <Route path="/forgot-password" element={
            <GuestLayout showFooter={false}>
              <UV_ForgotPassword />
            </GuestLayout>
          } />
          
          <Route path="/reset-password" element={
            <GuestLayout showFooter={false}>
              <UV_ResetPassword />
            </GuestLayout>
          } />
          
          {/* Help & Legal Pages */}
          <Route path="/help" element={
            <AuthAwarePublicLayout>
              <UV_KnowledgeBase />
            </AuthAwarePublicLayout>
          } />
          
          <Route path="/how-it-works" element={
            <AuthAwarePublicLayout>
              <UV_HowItWorks />
            </AuthAwarePublicLayout>
          } />
          
          <Route path="/contact" element={
            <AuthAwarePublicLayout>
              <UV_Contact />
            </AuthAwarePublicLayout>
          } />
          
          <Route path="/about" element={
            <AuthAwarePublicLayout>
              <UV_About />
            </AuthAwarePublicLayout>
          } />
          
          <Route path="/terms" element={
            <AuthAwarePublicLayout>
              <UV_TermsOfService />
            </AuthAwarePublicLayout>
          } />
          
          <Route path="/privacy" element={
            <AuthAwarePublicLayout>
              <UV_PrivacyPolicy />
            </AuthAwarePublicLayout>
          } />
          
          {/* ============================================ */}
          {/* CUSTOMER PROTECTED ROUTES */}
          {/* ============================================ */}
          
          {/* Customer Dashboard */}
          <Route path="/dashboard" element={
            <ProtectedRoute requiredRole="customer">
              <CustomerLayout>
                <UV_CustomerDashboard />
              </CustomerLayout>
            </ProtectedRoute>
          } />
          
          {/* Customer Onboarding */}
          <Route path="/onboarding" element={
            <ProtectedRoute requiredRole="customer">
              <CustomerLayout showFooter={false} showMiniCart={false} showChat={false}>
                <UV_CustomerOnboarding />
              </CustomerLayout>
            </ProtectedRoute>
          } />
          
          {/* Product Comparison */}
          <Route path="/compare" element={
            <ProtectedRoute requiredRole="customer">
              <CustomerLayout>
                <UV_ProductComparison />
              </CustomerLayout>
            </ProtectedRoute>
          } />
          
          {/* Cart */}
          <Route path="/cart" element={
            <ProtectedRoute requiredRole="customer">
              <CustomerLayout showMiniCart={false}>
                <UV_CartPage />
              </CustomerLayout>
            </ProtectedRoute>
          } />
          
          {/* Wishlist */}
          <Route path="/wishlist" element={
            <ProtectedRoute requiredRole="customer">
              <CustomerLayout>
                <UV_Wishlist />
              </CustomerLayout>
            </ProtectedRoute>
          } />
          
          {/* Projects */}
          <Route path="/projects" element={
            <ProtectedRoute requiredRole="customer">
              <CustomerLayout>
                <UV_MyProjects />
              </CustomerLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/projects/:project_id" element={
            <ProtectedRoute requiredRole="customer">
              <CustomerLayout>
                <UV_ProjectDetail />
              </CustomerLayout>
            </ProtectedRoute>
          } />
          
          {/* Checkout */}
          <Route path="/checkout" element={
            <ProtectedRoute requiredRole="customer">
              <CustomerLayout showFooter={false} showMiniCart={false} showChat={false}>
                <UV_Checkout />
              </CustomerLayout>
            </ProtectedRoute>
          } />
          
          {/* Order Confirmation */}
          <Route path="/order-confirmation" element={
            <ProtectedRoute requiredRole="customer">
              <CustomerLayout showFooter={false} showMiniCart={false}>
                <UV_OrderConfirmation />
              </CustomerLayout>
            </ProtectedRoute>
          } />
          
          {/* Orders */}
          <Route path="/orders" element={
            <ProtectedRoute requiredRole="customer">
              <CustomerLayout>
                <UV_OrderDashboard />
              </CustomerLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/orders/:order_id" element={
            <ProtectedRoute requiredRole="customer">
              <CustomerLayout>
                <UV_OrderDetail />
              </CustomerLayout>
            </ProtectedRoute>
          } />
          
          {/* Notifications */}
          <Route path="/notifications" element={
            <ProtectedRoute requiredRole="customer">
              <CustomerLayout>
                <UV_NotificationCenter />
              </CustomerLayout>
            </ProtectedRoute>
          } />
          
          {/* Account Settings */}
          <Route path="/account" element={
            <ProtectedRoute requiredRole="customer">
              <CustomerLayout>
                <UV_AccountSettings />
              </CustomerLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/account/reviews" element={
            <ProtectedRoute requiredRole="customer">
              <CustomerLayout>
                <UV_MyReviews />
              </CustomerLayout>
            </ProtectedRoute>
          } />
          
          {/* Issues */}
          <Route path="/report-issue" element={
            <ProtectedRoute requiredRole="customer">
              <CustomerLayout>
                <UV_IssueSubmit />
              </CustomerLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/issues/:issue_id" element={
            <ProtectedRoute requiredRole="customer">
              <CustomerLayout>
                <UV_IssueDetail />
              </CustomerLayout>
            </ProtectedRoute>
          } />
          
          {/* Support */}
          <Route path="/support" element={
            <ProtectedRoute requiredRole="customer">
              <CustomerLayout>
                <UV_SupportContact />
              </CustomerLayout>
            </ProtectedRoute>
          } />
          
          {/* Surplus Marketplace */}
          <Route path="/surplus" element={
            <ProtectedRoute requiredRole="customer">
              <CustomerLayout>
                <UV_SurplusMarketplace_Browse />
              </CustomerLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/surplus/:listing_id" element={
            <ProtectedRoute requiredRole="customer">
              <CustomerLayout>
                <UV_SurplusListing_Detail />
              </CustomerLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/surplus/create" element={
            <ProtectedRoute requiredRole="customer">
              <CustomerLayout>
                <UV_SurplusListing_Create />
              </CustomerLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/surplus/my-listings" element={
            <ProtectedRoute requiredRole="customer">
              <CustomerLayout>
                <UV_MySurplusListings />
              </CustomerLayout>
            </ProtectedRoute>
          } />
          
          {/* Trade Credit */}
          <Route path="/trade-credit/apply" element={
            <ProtectedRoute requiredRole="customer">
              <CustomerLayout showFooter={false}>
                <UV_TradeCredit_Application />
              </CustomerLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/trade-credit" element={
            <ProtectedRoute requiredRole="customer">
              <CustomerLayout>
                <UV_TradeCredit_Dashboard />
              </CustomerLayout>
            </ProtectedRoute>
          } />
          
          {/* ============================================ */}
          {/* SUPPLIER PROTECTED ROUTES */}
          {/* ============================================ */}
          
          {/* Supplier Dashboard */}
          <Route path="/supplier/dashboard" element={
            <ProtectedRoute requiredRole="supplier">
              <SupplierLayout>
                <UV_SupplierDashboard />
              </SupplierLayout>
            </ProtectedRoute>
          } />
          
          {/* Supplier Onboarding */}
          <Route path="/supplier/onboarding" element={
            <ProtectedRoute requiredRole="supplier">
              <SupplierLayout showFooter={false} showChat={false}>
                <UV_SupplierOnboarding />
              </SupplierLayout>
            </ProtectedRoute>
          } />
          
          {/* Product Management */}
          <Route path="/supplier/products" element={
            <ProtectedRoute requiredRole="supplier">
              <SupplierLayout>
                <UV_ProductManagement_Supplier />
              </SupplierLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/supplier/products/add" element={
            <ProtectedRoute requiredRole="supplier">
              <SupplierLayout showFooter={false}>
                <UV_ProductAdd_Supplier />
              </SupplierLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/supplier/products/:product_id/edit" element={
            <ProtectedRoute requiredRole="supplier">
              <SupplierLayout showFooter={false}>
                <UV_ProductEdit_Supplier />
              </SupplierLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/supplier/products/bulk-upload" element={
            <ProtectedRoute requiredRole="supplier">
              <SupplierLayout showFooter={false}>
                <UV_ProductBulkUpload_Supplier />
              </SupplierLayout>
            </ProtectedRoute>
          } />
          
          {/* Inventory Management */}
          <Route path="/supplier/inventory" element={
            <ProtectedRoute requiredRole="supplier">
              <SupplierLayout>
                <UV_InventoryManagement_Supplier />
              </SupplierLayout>
            </ProtectedRoute>
          } />
          
          {/* Order Management */}
          <Route path="/supplier/orders" element={
            <ProtectedRoute requiredRole="supplier">
              <SupplierLayout>
                <UV_OrderManagement_Supplier />
              </SupplierLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/supplier/orders/:order_id" element={
            <ProtectedRoute requiredRole="supplier">
              <SupplierLayout>
                <UV_OrderDetail_Supplier />
              </SupplierLayout>
            </ProtectedRoute>
          } />
          
          {/* Delivery Management */}
          <Route path="/supplier/delivery" element={
            <ProtectedRoute requiredRole="supplier">
              <SupplierLayout>
                <UV_DeliveryManagement_Supplier />
              </SupplierLayout>
            </ProtectedRoute>
          } />
          
          {/* Pricing & Promotions */}
          <Route path="/supplier/pricing" element={
            <ProtectedRoute requiredRole="supplier">
              <SupplierLayout>
                <UV_PricingPromotions_Supplier />
              </SupplierLayout>
            </ProtectedRoute>
          } />
          
          {/* Messages */}
          <Route path="/supplier/messages" element={
            <ProtectedRoute requiredRole="supplier">
              <SupplierLayout>
                <UV_SupplierMessages />
              </SupplierLayout>
            </ProtectedRoute>
          } />
          
          {/* Reviews */}
          <Route path="/supplier/reviews" element={
            <ProtectedRoute requiredRole="supplier">
              <SupplierLayout>
                <UV_ReviewsManagement_Supplier />
              </SupplierLayout>
            </ProtectedRoute>
          } />
          
          {/* Analytics */}
          <Route path="/supplier/analytics" element={
            <ProtectedRoute requiredRole="supplier">
              <SupplierLayout>
                <UV_SupplierAnalytics />
              </SupplierLayout>
            </ProtectedRoute>
          } />
          
          {/* Financials */}
          <Route path="/supplier/financials" element={
            <ProtectedRoute requiredRole="supplier">
              <SupplierLayout>
                <UV_SupplierFinancials />
              </SupplierLayout>
            </ProtectedRoute>
          } />
          
          {/* Settings */}
          <Route path="/supplier/settings" element={
            <ProtectedRoute requiredRole="supplier">
              <SupplierLayout>
                <UV_SupplierSettings />
              </SupplierLayout>
            </ProtectedRoute>
          } />
          
          {/* Education */}
          <Route path="/supplier/education" element={
            <ProtectedRoute requiredRole="supplier">
              <SupplierLayout>
                <UV_SupplierEducation />
              </SupplierLayout>
            </ProtectedRoute>
          } />
          
          {/* ============================================ */}
          {/* ADMIN PROTECTED ROUTES */}
          {/* ============================================ */}
          
          {/* Admin Dashboard */}
          <Route path="/admin" element={
            <ProtectedRoute requiredRole="admin">
              <AdminLayout>
                <UV_AdminDashboard />
              </AdminLayout>
            </ProtectedRoute>
          } />
          
          {/* User Management */}
          <Route path="/admin/customers" element={
            <ProtectedRoute requiredRole="admin">
              <AdminLayout>
                <UV_AdminUserManagement_Customers />
              </AdminLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/admin/suppliers" element={
            <ProtectedRoute requiredRole="admin">
              <AdminLayout>
                <UV_AdminUserManagement_Suppliers />
              </AdminLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/admin/supplier-applications" element={
            <ProtectedRoute requiredRole="admin">
              <AdminLayout>
                <UV_AdminSupplierApplications />
              </AdminLayout>
            </ProtectedRoute>
          } />
          
          {/* Content Moderation */}
          <Route path="/admin/products" element={
            <ProtectedRoute requiredRole="admin">
              <AdminLayout>
                <UV_AdminProductModeration />
              </AdminLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/admin/orders" element={
            <ProtectedRoute requiredRole="admin">
              <AdminLayout>
                <UV_AdminOrderOversight />
              </AdminLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/admin/disputes" element={
            <ProtectedRoute requiredRole="admin">
              <AdminLayout>
                <UV_AdminDisputeManagement />
              </AdminLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/admin/reviews" element={
            <ProtectedRoute requiredRole="admin">
              <AdminLayout>
                <UV_AdminReviewModeration />
              </AdminLayout>
            </ProtectedRoute>
          } />
          
          {/* Financials */}
          <Route path="/admin/financials" element={
            <ProtectedRoute requiredRole="admin">
              <AdminLayout>
                <UV_AdminFinancials />
              </AdminLayout>
            </ProtectedRoute>
          } />
          
          {/* Platform Settings */}
          <Route path="/admin/settings" element={
            <ProtectedRoute requiredRole="admin">
              <AdminLayout>
                <UV_AdminPlatformSettings />
              </AdminLayout>
            </ProtectedRoute>
          } />
          
          {/* Analytics */}
          <Route path="/admin/analytics" element={
            <ProtectedRoute requiredRole="admin">
              <AdminLayout>
                <UV_AdminAnalytics />
              </AdminLayout>
            </ProtectedRoute>
          } />
          
          {/* Communication */}
          <Route path="/admin/communication" element={
            <ProtectedRoute requiredRole="admin">
              <AdminLayout>
                <UV_AdminCommunication />
              </AdminLayout>
            </ProtectedRoute>
          } />
          
          {/* Team Management */}
          <Route path="/admin/team" element={
            <ProtectedRoute requiredRole="admin">
              <AdminLayout>
                <UV_AdminTeamManagement />
              </AdminLayout>
            </ProtectedRoute>
          } />
          
          {/* System Logs */}
          <Route path="/admin/system-logs" element={
            <ProtectedRoute requiredRole="admin">
              <AdminLayout>
                <UV_AdminSystemLogs />
              </AdminLayout>
            </ProtectedRoute>
          } />
          
          {/* Maintenance Mode */}
          <Route path="/admin/maintenance" element={
            <ProtectedRoute requiredRole="admin">
              <AdminLayout>
                <UV_AdminMaintenanceMode />
              </AdminLayout>
            </ProtectedRoute>
          } />
          
          {/* ============================================ */}
          {/* CATCH-ALL / 404 */}
          {/* ============================================ */}
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </QueryClientProvider>
    </Router>
  );
};

export default App;