#!/bin/bash

# Function to remove unused import from a specific line
remove_import() {
    local file=$1
    local import_name=$2
    # Remove from import statement
    sed -i "s/, ${import_name}//g; s/${import_name}, //g; s/{ ${import_name} }/{ }/g" "$file"
    # Clean up empty braces
    sed -i "s/import { } from/\/\/ import removed from/g" "$file"
}

# Function to comment out unused variable
comment_var() {
    local file=$1
    local var_name=$2
    sed -i "s/^(\s*)const ${var_name}/\/\/ \1const ${var_name} - unused/g" "$file"
}

cd /app/vitereact/src/components/views

# UV_AdminCommunication.tsx
sed -i '181s/const currentUser/\/\/ const currentUser/' UV_AdminCommunication.tsx
sed -i '188s/, setSelectedCampaign//' UV_AdminCommunication.tsx
sed -i '236s/const { unreadCount, lastActivity }/const { unreadCount }/' UV_AdminCommunication.tsx

# UV_AdminDashboard.tsx
sed -i '1s/, useEffect//' UV_AdminDashboard.tsx
sed -i '115s/, authToken//' UV_AdminDashboard.tsx
sed -i '130s/, authToken//' UV_AdminDashboard.tsx
sed -i '136s/, authToken//' UV_AdminDashboard.tsx
sed -i '142s/, authToken//' UV_AdminDashboard.tsx
sed -i '177s/const metricView/\/\/ const metricView/' UV_AdminDashboard.tsx
sed -i '179s/const \[localLoadingStates, setLocalLoadingStates\]/\/\/ const [localLoadingStates, setLocalLoadingStates]/' UV_AdminDashboard.tsx
sed -i '324s/const getStatusColor/\/\/ const getStatusColor/' UV_AdminDashboard.tsx

echo "Fixed AdminDashboard"

# UV_AdminDisputeManagement.tsx
sed -i '170s/const navigate/\/\/ const navigate/' UV_AdminDisputeManagement.tsx
sed -i '176s/const currentUser/\/\/ const currentUser/' UV_AdminDisputeManagement.tsx

echo "Fixed AdminDisputeManagement"

# UV_AdminFinancials.tsx - Remove unused imports
sed -i 's/CheckCircle, //g' UV_AdminFinancials.tsx
sed -i 's/ChevronDown, //g; s/ChevronRight, //g; s/Search, //g' UV_AdminFinancials.tsx
sed -i '231s/const supplierIdParam/\/\/ const supplierIdParam/' UV_AdminFinancials.tsx
sed -i '235s/const currentUser/\/\/ const currentUser/' UV_AdminFinancials.tsx
sed -i '421s/const formatDateTime/\/\/ const formatDateTime/' UV_AdminFinancials.tsx

echo "Fixed AdminFinancials"

# UV_AdminMaintenanceMode.tsx
sed -i 's/, Clock//g' UV_AdminMaintenanceMode.tsx

# UV_AdminPlatformSettings.tsx
sed -i 's/X, //g' UV_AdminPlatformSettings.tsx
sed -i '160s/const currentUser/\/\/ const currentUser/' UV_AdminPlatformSettings.tsx

echo "Fixed AdminPlatformSettings"

# UV_AdminProductModeration.tsx
sed -i '1s/, useEffect//' UV_AdminProductModeration.tsx
sed -i 's/Filter, //g; s/, Edit//g' UV_AdminProductModeration.tsx
sed -i '77s/const currentUser/\/\/ const currentUser/' UV_AdminProductModeration.tsx
sed -i '129s/, productsError//' UV_AdminProductModeration.tsx

echo "Fixed AdminProductModeration"

# UV_AdminReviewModeration.tsx  
sed -i '1s/, useCallback//' UV_AdminReviewModeration.tsx
sed -i 's/Search, //g; s/BarChart3, //g' UV_AdminReviewModeration.tsx
sed -i '163s/const currentUser/\/\/ const currentUser/' UV_AdminReviewModeration.tsx

echo "Fixed AdminReviewModeration"

# UV_AdminSupplierApplications.tsx
sed -i '1s/, useMemo//' UV_AdminSupplierApplications.tsx
sed -i 's/Mail, //g; s/Phone, //g; s/Search, //g' UV_AdminSupplierApplications.tsx
sed -i '149s/const navigate/\/\/ const navigate/' UV_AdminSupplierApplications.tsx
sed -i '155s/const currentUser/\/\/ const currentUser/' UV_AdminSupplierApplications.tsx

echo "Fixed AdminSupplierApplications"

# UV_AdminSystemLogs.tsx
sed -i '1s/, useEffect//' UV_AdminSystemLogs.tsx
sed -i '2s/, Link//' UV_AdminSystemLogs.tsx
sed -i 's/Filter, //g; s/WifiOff, //g' UV_AdminSystemLogs.tsx
sed -i '289s/const currentUser/\/\/ const currentUser/' UV_AdminSystemLogs.tsx

echo "Fixed AdminSystemLogs"

# UV_AdminTeamManagement.tsx
sed -i '152s/token,/\/\/ token,/' UV_AdminTeamManagement.tsx
sed -i '153s/filters,/\/\/ filters,/' UV_AdminTeamManagement.tsx
sed -i '259s/, refetchUsers//' UV_AdminTeamManagement.tsx

echo "Fixed AdminTeamManagement"

# UV_AdminUserManagement_Customers.tsx
sed -i '1s/, useMemo//' UV_AdminUserManagement_Customers.tsx
sed -i '192s/const navigate/\/\/ const navigate/' UV_AdminUserManagement_Customers.tsx

echo "Fixed AdminUserManagement_Customers"

# UV_CartPage.tsx
sed -i '1s/, useEffect//' UV_CartPage.tsx

echo "Fixed CartPage"

# UV_Catalog.tsx
sed -i '1s/, useEffect//' UV_Catalog.tsx

echo "Fixed Catalog"

# UV_Checkout.tsx
sed -i '419s/const finalPaymentMethodId/\/\/ const finalPaymentMethodId/' UV_Checkout.tsx
sed -i '438s/, window_id//' UV_Checkout.tsx
sed -i '528s/const selectedPaymentMethod/\/\/ const selectedPaymentMethod/' UV_Checkout.tsx
sed -i '804s/, idx//' UV_Checkout.tsx

echo "Fixed Checkout"

# UV_Contact.tsx
sed -i '199s/, authToken//' UV_Contact.tsx
sed -i '244s/const openChat/\/\/ const openChat/' UV_Contact.tsx

echo "Fixed Contact"

# UV_CustomerDashboard.tsx
sed -i '1s/useState, //' UV_CustomerDashboard.tsx
sed -i 's/DollarSign, //g' UV_CustomerDashboard.tsx
sed -i '256s/, wishlistLoading//' UV_CustomerDashboard.tsx
sed -i '268s/, projectsLoading//' UV_CustomerDashboard.tsx

echo "Fixed CustomerDashboard"

# UV_DeliveryManagement_Supplier.tsx - nothing to change, just type unused

# UV_HowItWorks.tsx
sed -i '1s/, useEffect//' UV_HowItWorks.tsx

echo "Fixed HowItWorks"

# UV_InventoryManagement_Supplier.tsx
sed -i '170s/const currentUser/\/\/ const currentUser/' UV_InventoryManagement_Supplier.tsx
sed -i '188s/const \[syncStatus, setSyncStatus\]/\/\/ const [syncStatus, setSyncStatus]/' UV_InventoryManagement_Supplier.tsx
sed -i '204s/const \[showMovementLog, setShowMovementLog\]/\/\/ const [showMovementLog, setShowMovementLog]/' UV_InventoryManagement_Supplier.tsx

echo "Fixed InventoryManagement_Supplier"

# UV_IssueDetail.tsx
sed -i 's/Clock, //g; s/User, //g' UV_IssueDetail.tsx
sed -i '222s/const navigate/\/\/ const navigate/' UV_IssueDetail.tsx
sed -i '227s/const currentUser/\/\/ const currentUser/' UV_IssueDetail.tsx
sed -i '243s/, refetchIssue//' UV_IssueDetail.tsx

echo "Fixed IssueDetail"

# UV_IssueSubmit.tsx
sed -i '151s/const customerId/\/\/ const customerId/' UV_IssueSubmit.tsx

echo "Fixed IssueSubmit"

# UV_KnowledgeBase.tsx
sed -i 's/ChevronDown, //g; s/ChevronUp, //g' UV_KnowledgeBase.tsx
sed -i '302s/const navigate/\/\/ const navigate/' UV_KnowledgeBase.tsx
sed -i '310s/const \[sidebarExpanded, setSidebarExpanded\]/\/\/ const [sidebarExpanded, setSidebarExpanded]/' UV_KnowledgeBase.tsx
sed -i '431s/data,/\/\/ data,/' UV_KnowledgeBase.tsx
sed -i '489s/const handleBackToSearch/\/\/ const handleBackToSearch/' UV_KnowledgeBase.tsx

echo "Fixed KnowledgeBase"

# UV_Landing.tsx
sed -i 's/TrendingUp, //g' UV_Landing.tsx
sed -i '142s/, productsError//' UV_Landing.tsx
sed -i '152s/, categoriesError//' UV_Landing.tsx
sed -i '162s/, suppliersError//' UV_Landing.tsx

echo "Fixed Landing"

# UV_MyProjects.tsx
sed -i '175s/, project_id//' UV_MyProjects.tsx

echo "Fixed MyProjects"

# UV_MyReviews.tsx
sed -i 's/, ImageIcon//g' UV_MyReviews.tsx

echo "Fixed MyReviews"

# UV_MySurplusListings.tsx
sed -i '211s/const currentUser/\/\/ const currentUser/' UV_MySurplusListings.tsx
sed -i '227s/const \[selectedListingIds, setSelectedListingIds\]/\/\/ const [selectedListingIds, setSelectedListingIds]/' UV_MySurplusListings.tsx

echo "Fixed MySurplusListings"

# UV_NotificationCenter.tsx
sed -i '1s/, useEffect//' UV_NotificationCenter.tsx
sed -i '2s/Link, //' UV_NotificationCenter.tsx
sed -i 's/Trash2, //g; s/Filter, //g' UV_NotificationCenter.tsx
sed -i '213s/const currentUser/\/\/ const currentUser/' UV_NotificationCenter.tsx
sed -i '214s/const globalNotificationState/\/\/ const globalNotificationState/' UV_NotificationCenter.tsx

echo "Fixed NotificationCenter"

# UV_OrderConfirmation.tsx
sed -i 's/CreditCard, //g' UV_OrderConfirmation.tsx

echo "Fixed OrderConfirmation"

# UV_OrderDashboard.tsx
sed -i '79s/search_query,/\/\/ search_query,/' UV_OrderDashboard.tsx
sed -i '118s/const currentUser/\/\/ const currentUser/' UV_OrderDashboard.tsx
sed -i '126s/const navigate/\/\/ const navigate/' UV_OrderDashboard.tsx

echo "Fixed OrderDashboard"

# UV_OrderDetail.tsx
sed -i '195s/const currentUser/\/\/ const currentUser/' UV_OrderDetail.tsx
sed -i '196s/const customerId/\/\/ const customerId/' UV_OrderDetail.tsx
sed -i '229s/refetch,/\/\/ refetch,/' UV_OrderDetail.tsx

echo "Fixed OrderDetail"

# UV_OrderDetail_Supplier.tsx
sed -i 's/MapPin, //g; s/Calendar, //g' UV_OrderDetail_Supplier.tsx
sed -i '301s/const handleUpdateTracking/\/\/ const handleUpdateTracking/' UV_OrderDetail_Supplier.tsx

echo "Fixed OrderDetail_Supplier"

# UV_OrderManagement_Supplier.tsx
sed -i 's/Filter, //g' UV_OrderManagement_Supplier.tsx
sed -i '154s/rejectionReason,/\/\/ rejectionReason,/' UV_OrderManagement_Supplier.tsx
sed -i '208s/const currentUser/\/\/ const currentUser/' UV_OrderManagement_Supplier.tsx
sed -i '209s/const supplierProfile/\/\/ const supplierProfile/' UV_OrderManagement_Supplier.tsx
sed -i '216s/const navigate/\/\/ const navigate/' UV_OrderManagement_Supplier.tsx

echo "Fixed OrderManagement_Supplier"

# UV_PrivacyPolicy.tsx
sed -i '440s/const version/\/\/ const version/' UV_PrivacyPolicy.tsx
sed -i '445s/const \[loading_state, setLoadingState\]/\/\/ const [loading_state, setLoadingState]/' UV_PrivacyPolicy.tsx
sed -i '486s/const currentUser/\/\/ const currentUser/' UV_PrivacyPolicy.tsx

echo "Fixed PrivacyPolicy"

# UV_ProductAdd_Supplier.tsx
sed -i '1s/, useCallback//' UV_ProductAdd_Supplier.tsx
sed -i 's/Save, //g' UV_ProductAdd_Supplier.tsx
sed -i '134s/const currentUser/\/\/ const currentUser/' UV_ProductAdd_Supplier.tsx

echo "Fixed ProductAdd_Supplier"

# UV_ProductBulkUpload_Supplier.tsx
sed -i '69s/const navigate/\/\/ const navigate/' UV_ProductBulkUpload_Supplier.tsx

echo "Fixed ProductBulkUpload_Supplier"

# UV_ProductComparison.tsx
sed -i '105s/const \[viewMode, setViewMode\]/\/\/ const [viewMode, setViewMode]/' UV_ProductComparison.tsx

echo "Fixed ProductComparison"

# UV_ProductDetail_Customer.tsx
sed -i 's/Share2, //g; s/MapPin, //g; s/Award, //g; s/MessageCircle, //g; s/Package, //g' UV_ProductDetail_Customer.tsx
sed -i '187s/const currentUser/\/\/ const currentUser/' UV_ProductDetail_Customer.tsx
sed -i '203s/const \[showReviewForm, /\/\/ const [showReviewForm, /' UV_ProductDetail_Customer.tsx
sed -i '222s/const \[wsSocket, /\/\/ const [wsSocket, /' UV_ProductDetail_Customer.tsx
sed -i '233s/, supplierLoading//' UV_ProductDetail_Customer.tsx
sed -i '303s/const submitReviewMutation/\/\/ const submitReviewMutation/' UV_ProductDetail_Customer.tsx

echo "Fixed ProductDetail_Customer"

# UV_ProductDetail_Guest.tsx
sed -i 's/Heart, //g; s/Share2, //g; s/MapPin, //g; s/Clock, //g' UV_ProductDetail_Guest.tsx

echo "Fixed ProductDetail_Guest"

# UV_ProductEdit_Supplier.tsx
sed -i 's/, ImageIcon//g' UV_ProductEdit_Supplier.tsx
sed -i '251s/updated_product,/\/\/ updated_product,/' UV_ProductEdit_Supplier.tsx

echo "Fixed ProductEdit_Supplier"

# UV_ProductManagement_Supplier.tsx
sed -i '1s/, useMemo//' UV_ProductManagement_Supplier.tsx
sed -i 's/Filter, //g; s/ChevronDown, //g' UV_ProductManagement_Supplier.tsx
sed -i '162s/const currentUser/\/\/ const currentUser/' UV_ProductManagement_Supplier.tsx
sed -i '361s/const formatDate/\/\/ const formatDate/' UV_ProductManagement_Supplier.tsx

echo "Fixed ProductManagement_Supplier"

# UV_ProjectDetail.tsx
sed -i 's/, Trash2//g' UV_ProjectDetail.tsx

echo "Fixed ProjectDetail (imports)"

# UV_Registration_Customer.tsx
sed -i '134s/const return_url/\/\/ const return_url/' UV_Registration_Customer.tsx
sed -i '181s/data,/\/\/ data,/' UV_Registration_Customer.tsx
sed -i '359s/const isFormValid/\/\/ const isFormValid/' UV_Registration_Customer.tsx

echo "Fixed Registration_Customer"

# UV_Registration_Supplier.tsx
sed -i '172s/data,/\/\/ data,/' UV_Registration_Supplier.tsx

echo "Fixed Registration_Supplier"

# UV_ResetPassword.tsx
sed -i '142s/data,/\/\/ data,/' UV_ResetPassword.tsx

echo "Fixed ResetPassword"

# UV_ReviewsManagement_Supplier.tsx
sed -i '128s/const currentUser/\/\/ const currentUser/' UV_ReviewsManagement_Supplier.tsx

echo "Fixed ReviewsManagement_Supplier"

# UV_SupplierAnalytics.tsx
sed -i 's/PieChart, //g' UV_SupplierAnalytics.tsx
sed -i '202s/const currentUser/\/\/ const currentUser/' UV_SupplierAnalytics.tsx
sed -i '216s/, setComparisonEnabled//' UV_SupplierAnalytics.tsx
sed -i '221s/, setExportFormat//' UV_SupplierAnalytics.tsx
sed -i '817s/, idx//' UV_SupplierAnalytics.tsx
sed -i '871s/, idx//' UV_SupplierAnalytics.tsx

echo "Fixed SupplierAnalytics"

# UV_SupplierDashboard.tsx
sed -i '150s/const currentUser/\/\/ const currentUser/' UV_SupplierDashboard.tsx
sed -i '155s/const date_range/\/\/ const date_range/' UV_SupplierDashboard.tsx
sed -i '255s/const todayStart/\/\/ const todayStart/' UV_SupplierDashboard.tsx
sed -i '256s/const weekStart/\/\/ const weekStart/' UV_SupplierDashboard.tsx
sed -i '257s/const monthStart/\/\/ const monthStart/' UV_SupplierDashboard.tsx
sed -i '258s/const yearStart/\/\/ const yearStart/' UV_SupplierDashboard.tsx

echo "Fixed SupplierDashboard"

# UV_SupplierEducation.tsx
sed -i 's/Download, //g; s/ExternalLink, //g' UV_SupplierEducation.tsx
sed -i '206s/const \[selectedResource, /\/\/ const [selectedResource, /' UV_SupplierEducation.tsx

echo "Fixed SupplierEducation"

# UV_SupplierFinancials.tsx
sed -i '2s/Link, //' UV_SupplierFinancials.tsx
sed -i 's/CreditCard, //g' UV_SupplierFinancials.tsx
sed -i '180s/const currentUser/\/\/ const currentUser/' UV_SupplierFinancials.tsx
sed -i '182s/const authToken/\/\/ const authToken/' UV_SupplierFinancials.tsx
sed -i '195s/const \[modal_open, setModalOpen\]/\/\/ const [modal_open, setModalOpen]/' UV_SupplierFinancials.tsx

echo "Fixed SupplierFinancials"

# UV_SupplierMessages.tsx
sed -i 's/Filter, //g; s/Archive, //g; s/Star, //g; s/ThumbsUp, //g' UV_SupplierMessages.tsx
sed -i '149s/const currentUser/\/\/ const currentUser/' UV_SupplierMessages.tsx

echo "Fixed SupplierMessages (vars)"

# UV_SupplierOnboarding.tsx
sed -i 's/, ShoppingCart//g' UV_SupplierOnboarding.tsx
sed -i '99s/const currentUser/\/\/ const currentUser/' UV_SupplierOnboarding.tsx

echo "Fixed SupplierOnboarding"

# UV_SupplierProfile_Guest.tsx
sed -i 's/MapPin, //g; s/Phone, //g; s/Mail, //g; s/Filter, //g' UV_SupplierProfile_Guest.tsx
sed -i '236s/const navigate/\/\/ const navigate/' UV_SupplierProfile_Guest.tsx

echo "Fixed SupplierProfile_Guest"

# UV_SupplierSettings.tsx
sed -i 's/Upload, //g; s/Edit2, //g' UV_SupplierSettings.tsx
sed -i '124s/, authToken//' UV_SupplierSettings.tsx
sed -i '129s/data,/\/\/ data,/; s/, authToken//' UV_SupplierSettings.tsx
sed -i '134s/const updateTeamMember = async (memberId: string, data:/\/\/ const updateTeamMember = async (memberId: string, data:/; s/, authToken//' UV_SupplierSettings.tsx
sed -i '139s/memberId: string,/\/\/ memberId: string,/; s/, authToken//' UV_SupplierSettings.tsx
sed -i '154s/const currentUser/\/\/ const currentUser/' UV_SupplierSettings.tsx
sed -i '155s/const supplierProfileGlobal/\/\/ const supplierProfileGlobal/' UV_SupplierSettings.tsx
sed -i '356s/const defaultPermissions/\/\/ const defaultPermissions/' UV_SupplierSettings.tsx

echo "Fixed SupplierSettings (vars)"

# UV_SupportContact.tsx
sed -i '1s/, useEffect//' UV_SupportContact.tsx
sed -i '96s/const navigate/\/\/ const navigate/' UV_SupportContact.tsx
sed -i '688s/, url//' UV_SupportContact.tsx

echo "Fixed SupportContact"

# UV_SurplusListing_Create.tsx
sed -i '1s/, useEffect//' UV_SurplusListing_Create.tsx

echo "Fixed SurplusListing_Create"

# UV_SurplusListing_Detail.tsx
sed -i '1s/useState, //' UV_SurplusListing_Detail.tsx
sed -i '1s/, useEffect//' UV_SurplusListing_Detail.tsx
sed -i '81s/const fetchSurplusListing/\/\/ const fetchSurplusListing/' UV_SurplusListing_Detail.tsx
sed -i '88s/const fetchSellerProfile/\/\/ const fetchSellerProfile/' UV_SurplusListing_Detail.tsx
sed -i '91s/const customerResponse/\/\/ const customerResponse/' UV_SurplusListing_Detail.tsx
sed -i '107s/const fetchCategory/\/\/ const fetchCategory/' UV_SurplusListing_Detail.tsx
sed -i '113s/const fetchSimilarListings/\/\/ const fetchSimilarListings/' UV_SurplusListing_Detail.tsx

echo "Fixed SurplusListing_Detail"

# UV_SurplusMarketplace_Browse.tsx
sed -i 's/ChevronDown, //g; s/Filter, //g; s/CheckCircle2, //g' UV_SurplusMarketplace_Browse.tsx

echo "Fixed SurplusMarketplace_Browse"

# UV_TermsOfService.tsx
sed -i '492s/const current_version/\/\/ const current_version/' UV_TermsOfService.tsx
sed -i '693s/, index//' UV_TermsOfService.tsx
sed -i '774s/, index//' UV_TermsOfService.tsx

echo "Fixed TermsOfService"

# UV_TradeCredit_Application.tsx
sed -i '102s/const validateApplication/\/\/ const validateApplication/' UV_TradeCredit_Application.tsx
sed -i '168s/const currentUser/\/\/ const currentUser/' UV_TradeCredit_Application.tsx
sed -i '174s/const \[existing_application_id, /\/\/ const [existing_application_id, /' UV_TradeCredit_Application.tsx
sed -i '248s/error,/\/\/ error,/' UV_TradeCredit_Application.tsx
sed -i '265s/data,/\/\/ data,/' UV_TradeCredit_Application.tsx

echo "Fixed TradeCredit_Application"

# UV_TradeCredit_Dashboard.tsx
sed -i 's/Calendar, //g' UV_TradeCredit_Dashboard.tsx
sed -i '71s/, customer_id//' UV_TradeCredit_Dashboard.tsx
sed -i '103s/token,/\/\/ token,/' UV_TradeCredit_Dashboard.tsx
sed -i '104s/customer_id,/\/\/ customer_id,/' UV_TradeCredit_Dashboard.tsx
sed -i '105s/date_from,/\/\/ date_from,/' UV_TradeCredit_Dashboard.tsx
sed -i '106s/date_to,/\/\/ date_to,/' UV_TradeCredit_Dashboard.tsx
sed -i '139s/token,/\/\/ token,/' UV_TradeCredit_Dashboard.tsx
sed -i '140s/payment_data,/\/\/ payment_data,/' UV_TradeCredit_Dashboard.tsx
sed -i '153s/token,/\/\/ token,/' UV_TradeCredit_Dashboard.tsx
sed -i '154s/request_data,/\/\/ request_data,/' UV_TradeCredit_Dashboard.tsx
sed -i '170s/const currentUser/\/\/ const currentUser/' UV_TradeCredit_Dashboard.tsx
sed -i '178s/const \[showPaymentModal, /\/\/ const [showPaymentModal, /' UV_TradeCredit_Dashboard.tsx
sed -i '179s/const \[showIncreaseModal, /\/\/ const [showIncreaseModal, /' UV_TradeCredit_Dashboard.tsx

echo "Fixed TradeCredit_Dashboard"

# UV_Wishlist.tsx - nothing to change, just type unused

echo "Phase 1 complete - removed unused variables and imports"
