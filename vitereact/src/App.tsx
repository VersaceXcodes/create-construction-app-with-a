import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAppStore } from '@/store/main';

// Global Views
import GV_TopNav_Guest from '@/components/views/GV_TopNav_Guest';
import GV_TopNav_Customer from '@/components/views/GV_TopNav_Customer';
import GV_TopNav_Supplier from '@/components/views/GV_TopNav_Supplier';
import GV_TopNav_Admin from '@/components/views/GV_TopNav_Admin';
import GV_Footer from '@/components/views/GV_Footer';
import GV_MiniCart_Customer from '@/components/views/GV_MiniCart_Customer';
import GV_ChatWidget from '@/components/views/GV_ChatWidget';

// Unique Views - Guest/Public
import UV_Landing from '@/components/views/UV_Landing';
import UV_Catalog from '@/components/views/UV_Catalog';
import UV_ProductDetail_Guest from '@/components/views/UV_ProductDetail_Guest';
import UV_ProductDetail_Customer from '@/components/views/UV_ProductDetail_Customer';
import UV_SupplierProfile_Guest from '@/components/views/UV_SupplierProfile_Guest';
import UV_SupplierProfile_Customer from '@/components/views/UV_SupplierProfile_Customer';
import UV_Registration_AccountTypeSelect from '@/components/views/UV_Registration_AccountTypeSelect';
import UV_Registration_Customer from '@/components/views/UV_Registration_Customer';
import UV_Registration_Supplier from '@/components/views/UV_Registration_Supplier';
import UV_Login from '@/components/views/UV_Login';
import UV_ForgotPassword from '@/components/views/UV_ForgotPassword';
import UV_ResetPassword from '@/components/views/UV_ResetPassword';

// Unique Views - Customer
import UV_CustomerOnboarding from '@/components/views/UV_CustomerOnboarding';
import UV_CustomerDashboard from '@/components/views/UV_CustomerDashboard';
import UV_ProductComparison from '@/components/views/UV_ProductComparison';
import UV_CartPage from '@/components/views/UV_CartPage';
import UV_Wishlist from '@/components/views/UV_Wishlist';
import UV_MyProjects from '@/components/views/UV_MyProjects';
import UV_ProjectDetail from '@/components/views/UV_ProjectDetail';
import UV_Checkout from '@/components/views/UV_Checkout';
import UV_OrderConfirmation from '@/components/views/UV_OrderConfirmation';
import UV_OrderDashboard from '@/components/views/UV_OrderDashboard';
import UV_OrderDetail from '@/components/views/UV_OrderDetail';
import UV_NotificationCenter from '@/components/views/UV_NotificationCenter';
import UV_AccountSettings from '@/components/views/UV_AccountSettings';
import UV_MyReviews from '@/components/views/UV_MyReviews';
import UV_IssueSubmit from '@/components/views/UV_IssueSubmit';
import UV_IssueDetail from '@/components/views/UV_IssueDetail';
import UV_SupportContact from '@/components/views/UV_SupportContact';
import UV_SurplusMarketplace_Browse from '@/components/views/UV_SurplusMarketplace_Browse';
import UV_SurplusListing_Detail from '@/components/views/UV_SurplusListing_Detail';
import UV_SurplusListing_Create from '@/components/views/UV_SurplusListing_Create';
import UV_MySurplusListings from '@/components/views/UV_MySurplusListings';
import UV_TradeCredit_Application from '@/components/views/UV_TradeCredit_Application';
import UV_TradeCredit_Dashboard from '@/components/views/UV_TradeCredit_Dashboard';

// Unique Views - Supplier
import UV_SupplierOnboarding from '@/components/views/UV_SupplierOnboarding';
import UV_SupplierDashboard from '@/components/views/UV_SupplierDashboard';
import UV_ProductManagement_Supplier from '@/components/views/UV_ProductManagement_Supplier';
import UV_ProductAdd_Supplier from '@/components/views/UV_ProductAdd_Supplier';
import UV_ProductEdit_Supplier from '@/components/views/UV_ProductEdit_Supplier';
import UV_ProductBulkUpload_Supplier from '@/components/views/UV_ProductBulkUpload_Supplier';
import UV_InventoryManagement_Supplier from '@/components/views/UV_InventoryManagement_Supplier';
import UV_OrderManagement_Supplier from '@/components/views/UV_OrderManagement_Supplier';
import UV_OrderDetail_Supplier from '@/components/views/UV_OrderDetail_Supplier';
import UV_DeliveryManagement_Supplier from '@/components/views/UV_DeliveryManagement_Supplier';
import UV_PricingPromotions_Supplier from '@/components/views/UV_PricingPromotions_Supplier';
import UV_SupplierMessages from '@/components/views/UV_SupplierMessages';
import UV_ReviewsManagement_Supplier from '@/components/views/UV_ReviewsManagement_Supplier';
import UV_SupplierAnalytics from '@/components/views/UV_SupplierAnalytics';
import UV_SupplierFinancials from '@/components/views/UV_SupplierFinancials';
import UV_SupplierSettings from '@/components/views/UV_SupplierSettings';
import UV_SupplierEducation from '@/components/views/UV_SupplierEducation';

// Unique Views - Admin
import UV_AdminDashboard from '@/components/views/UV_AdminDashboard';
import UV_AdminUserManagement_Customers from '@/components/views/UV_AdminUserManagement_Customers';
import UV_AdminUserManagement_Suppliers from '@/components/views/UV_AdminUserManagement_Suppliers';
import UV_AdminSupplierApplications from '@/components/views/UV_AdminSupplierApplications';
import UV_AdminProductModeration from '@/components/views/UV_AdminProductModeration';
import UV_AdminOrderOversight from '@/components/views/UV_AdminOrderOversight';
import UV_AdminDisputeManagement from '@/components/views/UV_AdminDisputeManagement';
import UV_AdminReviewModeration from '@/components/views/UV_AdminReviewModeration';
import UV_AdminFinancials from '@/components/views/UV_AdminFinancials';
import UV_AdminPlatformSettings from '@/components/views/UV_AdminPlatformSettings';
import UV_AdminAnalytics from '@/components/views/UV_AdminAnalytics';
import UV_AdminCommunication from '@/components/views/UV_AdminCommunication';
import UV_AdminTeamManagement from '@/components/views/UV_AdminTeamManagement';
import UV_AdminSystemLogs from '@/components/views/UV_AdminSystemLogs';
import UV_AdminMaintenanceMode from '@/components/views/UV_AdminMaintenanceMode';

// Unique Views - Help/Legal
import UV_KnowledgeBase from '@/components/views/UV_KnowledgeBase';
import UV_HowItWorks from '@/components/views/UV_HowItWorks';
import UV_Contact from '@/components/views/UV_Contact';
import UV_About from '@/components/views/UV_About';
import UV_TermsOfService from '@/components/views/UV_TermsOfService';
import UV_PrivacyPolicy from '@/components/views/UV_PrivacyPolicy';

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

// ============================================================================
// ROOT REDIRECT COMPONENT
// ============================================================================

const RootRedirect: React.FC = () => {
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
  const userType = useAppStore(state => state.authentication_state.authentication_status.user_type);
  
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  // Redirect based on user type
  if (userType === 'customer') {
    return <Navigate to="/dashboard" replace />;
  } else if (userType === 'supplier') {
    return <Navigate to="/supplier/dashboard" replace />;
  } else if (userType === 'admin') {
    return <Navigate to="/admin" replace />;
  }
  
  return <Navigate to="/" replace />;
};

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
            <GuestLayout>
              <UV_Landing />
            </GuestLayout>
          } />
          
          {/* Product Catalog */}
          <Route path="/products" element={
            <GuestLayout>
              <UV_Catalog />
            </GuestLayout>
          } />
          
          {/* Product Detail (Auth-Aware) */}
          <Route path="/product/:product_id" element={
            <GuestLayout>
              <ProductDetailRoute />
            </GuestLayout>
          } />
          
          {/* Supplier Profile (Auth-Aware) */}
          <Route path="/supplier/:supplier_id" element={
            <GuestLayout>
              <SupplierProfileRoute />
            </GuestLayout>
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
            <GuestLayout>
              <UV_KnowledgeBase />
            </GuestLayout>
          } />
          
          <Route path="/how-it-works" element={
            <GuestLayout>
              <UV_HowItWorks />
            </GuestLayout>
          } />
          
          <Route path="/contact" element={
            <GuestLayout>
              <UV_Contact />
            </GuestLayout>
          } />
          
          <Route path="/about" element={
            <GuestLayout>
              <UV_About />
            </GuestLayout>
          } />
          
          <Route path="/terms" element={
            <GuestLayout>
              <UV_TermsOfService />
            </GuestLayout>
          } />
          
          <Route path="/privacy" element={
            <GuestLayout>
              <UV_PrivacyPolicy />
            </GuestLayout>
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