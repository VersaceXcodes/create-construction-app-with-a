-- ============================================
-- CREATE TABLES
-- ============================================

-- Users table (base table, no dependencies)
CREATE TABLE users (
    user_id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    user_type VARCHAR(50) NOT NULL,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    phone_number VARCHAR(50),
    profile_photo_url TEXT,
    registration_date VARCHAR(255) NOT NULL,
    last_login_date VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    email_verified BOOLEAN NOT NULL DEFAULT false,
    email_verification_token VARCHAR(255),
    password_reset_token VARCHAR(255),
    password_reset_expires VARCHAR(255),
    created_at VARCHAR(255) NOT NULL,
    updated_at VARCHAR(255) NOT NULL
);

-- Addresses table (depends on users)
CREATE TABLE addresses (
    address_id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    label VARCHAR(100),
    full_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(50) NOT NULL,
    street_address TEXT NOT NULL,
    apt_suite VARCHAR(100),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    country VARCHAR(100) NOT NULL DEFAULT 'USA',
    address_type VARCHAR(50),
    delivery_instructions TEXT,
    is_default BOOLEAN NOT NULL DEFAULT false,
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    created_at VARCHAR(255) NOT NULL,
    updated_at VARCHAR(255) NOT NULL
);

-- Categories table (no dependencies)
CREATE TABLE categories (
    category_id VARCHAR(255) PRIMARY KEY,
    parent_category_id VARCHAR(255) REFERENCES categories(category_id) ON DELETE SET NULL,
    category_name VARCHAR(255) NOT NULL,
    category_slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    icon_url TEXT,
    display_order NUMERIC NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at VARCHAR(255) NOT NULL,
    updated_at VARCHAR(255) NOT NULL
);

-- Customers table (depends on users, addresses)
CREATE TABLE customers (
    customer_id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    account_type VARCHAR(50) NOT NULL,
    default_delivery_address_id VARCHAR(255) REFERENCES addresses(address_id) ON DELETE SET NULL,
    trade_credit_limit NUMERIC DEFAULT 0,
    trade_credit_balance NUMERIC DEFAULT 0,
    trade_credit_used NUMERIC DEFAULT 0,
    trade_credit_terms TEXT,
    trade_credit_status VARCHAR(50),
    preferred_brands JSONB,
    preferred_suppliers JSONB,
    preferred_categories JSONB,
    notification_preferences JSONB NOT NULL,
    onboarding_completed BOOLEAN NOT NULL DEFAULT false,
    created_at VARCHAR(255) NOT NULL,
    updated_at VARCHAR(255) NOT NULL
);

-- Suppliers table (depends on users)
CREATE TABLE suppliers (
    supplier_id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    business_name VARCHAR(255) NOT NULL,
    business_registration_number VARCHAR(255),
    business_type VARCHAR(100) NOT NULL,
    business_description TEXT,
    logo_url TEXT,
    cover_photo_url TEXT,
    verification_status VARCHAR(50) NOT NULL DEFAULT 'pending',
    verification_documents JSONB,
    rating_average NUMERIC NOT NULL DEFAULT 0,
    total_reviews NUMERIC NOT NULL DEFAULT 0,
    total_sales NUMERIC NOT NULL DEFAULT 0,
    total_orders NUMERIC NOT NULL DEFAULT 0,
    fulfillment_rate NUMERIC NOT NULL DEFAULT 0,
    response_time_average NUMERIC,
    bank_account_info TEXT,
    payout_frequency VARCHAR(50) NOT NULL DEFAULT 'monthly',
    commission_rate NUMERIC NOT NULL,
    subscription_plan VARCHAR(50) NOT NULL,
    operating_hours JSONB,
    service_areas JSONB,
    return_policy TEXT,
    shipping_policy TEXT,
    minimum_order_value NUMERIC,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    onboarding_completed BOOLEAN NOT NULL DEFAULT false,
    member_since VARCHAR(255) NOT NULL,
    created_at VARCHAR(255) NOT NULL,
    updated_at VARCHAR(255) NOT NULL
);

-- Admins table (depends on users)
CREATE TABLE admins (
    admin_id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    role VARCHAR(100) NOT NULL,
    permissions JSONB NOT NULL,
    created_at VARCHAR(255) NOT NULL,
    updated_at VARCHAR(255) NOT NULL
);

-- Products table (depends on suppliers, categories)
CREATE TABLE products (
    product_id VARCHAR(255) PRIMARY KEY,
    supplier_id VARCHAR(255) NOT NULL REFERENCES suppliers(supplier_id) ON DELETE CASCADE,
    category_id VARCHAR(255) NOT NULL REFERENCES categories(category_id) ON DELETE RESTRICT,
    sku VARCHAR(255) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    description TEXT,
    key_features JSONB,
    specifications JSONB,
    price_per_unit NUMERIC NOT NULL,
    unit_of_measure VARCHAR(50) NOT NULL,
    bulk_pricing JSONB,
    cost_price NUMERIC,
    stock_quantity NUMERIC NOT NULL DEFAULT 0,
    low_stock_threshold NUMERIC NOT NULL DEFAULT 10,
    last_updated_timestamp VARCHAR(255) NOT NULL,
    expected_restock_date VARCHAR(255),
    images JSONB,
    primary_image_url TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    is_featured BOOLEAN NOT NULL DEFAULT false,
    tags JSONB,
    brand VARCHAR(255),
    dimensions JSONB,
    weight NUMERIC,
    material VARCHAR(255),
    compliance_certifications JSONB,
    warranty_information TEXT,
    minimum_order_quantity NUMERIC NOT NULL DEFAULT 1,
    maximum_order_quantity NUMERIC,
    available_delivery_methods JSONB,
    handling_time_days NUMERIC NOT NULL DEFAULT 1,
    views_count NUMERIC NOT NULL DEFAULT 0,
    sales_count NUMERIC NOT NULL DEFAULT 0,
    creation_date VARCHAR(255) NOT NULL,
    searchable BOOLEAN NOT NULL DEFAULT true,
    customer_type_availability VARCHAR(50) NOT NULL DEFAULT 'all',
    created_at VARCHAR(255) NOT NULL,
    updated_at VARCHAR(255) NOT NULL
);

-- Payment methods table (depends on users, addresses)
CREATE TABLE payment_methods (
    payment_method_id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    payment_type VARCHAR(50) NOT NULL,
    card_brand VARCHAR(50),
    card_last_four VARCHAR(4),
    card_expiry_month VARCHAR(2),
    card_expiry_year VARCHAR(4),
    cardholder_name VARCHAR(255),
    billing_address_id VARCHAR(255) REFERENCES addresses(address_id) ON DELETE SET NULL,
    payment_token TEXT,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at VARCHAR(255) NOT NULL,
    updated_at VARCHAR(255) NOT NULL
);

-- Carts table (depends on customers)
CREATE TABLE carts (
    cart_id VARCHAR(255) PRIMARY KEY,
    customer_id VARCHAR(255) NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
    saved_cart_name VARCHAR(255),
    created_date VARCHAR(255) NOT NULL,
    last_modified_date VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at VARCHAR(255) NOT NULL,
    updated_at VARCHAR(255) NOT NULL
);

-- Cart items table (depends on carts, products, suppliers)
CREATE TABLE cart_items (
    cart_item_id VARCHAR(255) PRIMARY KEY,
    cart_id VARCHAR(255) NOT NULL REFERENCES carts(cart_id) ON DELETE CASCADE,
    product_id VARCHAR(255) NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
    supplier_id VARCHAR(255) NOT NULL REFERENCES suppliers(supplier_id) ON DELETE CASCADE,
    quantity NUMERIC NOT NULL,
    price_per_unit NUMERIC NOT NULL,
    added_date VARCHAR(255) NOT NULL,
    created_at VARCHAR(255) NOT NULL,
    updated_at VARCHAR(255) NOT NULL
);

-- Orders table (depends on customers, addresses)
CREATE TABLE orders (
    order_id VARCHAR(255) PRIMARY KEY,
    customer_id VARCHAR(255) NOT NULL REFERENCES customers(customer_id) ON DELETE RESTRICT,
    order_number VARCHAR(255) UNIQUE NOT NULL,
    order_date VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    subtotal_amount NUMERIC NOT NULL,
    delivery_fee_total NUMERIC NOT NULL,
    tax_amount NUMERIC NOT NULL,
    discount_amount NUMERIC NOT NULL DEFAULT 0,
    total_amount NUMERIC NOT NULL,
    delivery_address_id VARCHAR(255) NOT NULL REFERENCES addresses(address_id) ON DELETE RESTRICT,
    payment_method VARCHAR(50) NOT NULL,
    payment_status VARCHAR(50) NOT NULL,
    payment_transaction_id VARCHAR(255),
    promo_code_used VARCHAR(255),
    customer_notes TEXT,
    created_at VARCHAR(255) NOT NULL,
    updated_at VARCHAR(255) NOT NULL
);

-- Order items table (depends on orders, products, suppliers)
CREATE TABLE order_items (
    order_item_id VARCHAR(255) PRIMARY KEY,
    order_id VARCHAR(255) NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    product_id VARCHAR(255) NOT NULL REFERENCES products(product_id) ON DELETE RESTRICT,
    supplier_id VARCHAR(255) NOT NULL REFERENCES suppliers(supplier_id) ON DELETE RESTRICT,
    product_name VARCHAR(255) NOT NULL,
    sku VARCHAR(255) NOT NULL,
    quantity NUMERIC NOT NULL,
    price_per_unit NUMERIC NOT NULL,
    line_total NUMERIC NOT NULL,
    created_at VARCHAR(255) NOT NULL,
    updated_at VARCHAR(255) NOT NULL
);

-- Deliveries table (depends on orders, suppliers)
CREATE TABLE deliveries (
    delivery_id VARCHAR(255) PRIMARY KEY,
    order_id VARCHAR(255) NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    supplier_id VARCHAR(255) NOT NULL REFERENCES suppliers(supplier_id) ON DELETE RESTRICT,
    delivery_window_start VARCHAR(255) NOT NULL,
    delivery_window_end VARCHAR(255) NOT NULL,
    delivery_method VARCHAR(50) NOT NULL,
    delivery_fee NUMERIC NOT NULL,
    delivery_status VARCHAR(50) NOT NULL,
    tracking_number VARCHAR(255),
    carrier VARCHAR(255),
    driver_name VARCHAR(255),
    driver_phone VARCHAR(50),
    estimated_arrival_time VARCHAR(255),
    actual_delivery_time VARCHAR(255),
    delivery_proof_photo_url TEXT,
    delivery_signature TEXT,
    delivery_notes TEXT,
    current_latitude NUMERIC(10, 7),
    current_longitude NUMERIC(10, 7),
    created_at VARCHAR(255) NOT NULL,
    updated_at VARCHAR(255) NOT NULL
);

-- Order timeline table (depends on orders)
CREATE TABLE order_timeline (
    timeline_id VARCHAR(255) PRIMARY KEY,
    order_id VARCHAR(255) NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    milestone VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL,
    timestamp VARCHAR(255) NOT NULL,
    description TEXT,
    performed_by VARCHAR(255),
    created_at VARCHAR(255) NOT NULL
);

-- Reviews table (depends on orders, customers, suppliers, products)
CREATE TABLE reviews (
    review_id VARCHAR(255) PRIMARY KEY,
    order_id VARCHAR(255) NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    customer_id VARCHAR(255) NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
    supplier_id VARCHAR(255) NOT NULL REFERENCES suppliers(supplier_id) ON DELETE CASCADE,
    product_id VARCHAR(255) REFERENCES products(product_id) ON DELETE SET NULL,
    rating_overall NUMERIC NOT NULL,
    rating_product NUMERIC,
    rating_service NUMERIC,
    rating_delivery NUMERIC,
    review_text TEXT,
    photos JSONB,
    helpful_votes NUMERIC NOT NULL DEFAULT 0,
    verified_purchase BOOLEAN NOT NULL DEFAULT true,
    would_buy_again VARCHAR(50),
    is_anonymous BOOLEAN NOT NULL DEFAULT false,
    review_date VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'published',
    supplier_response TEXT,
    supplier_response_date VARCHAR(255),
    created_at VARCHAR(255) NOT NULL,
    updated_at VARCHAR(255) NOT NULL
);

-- Review votes table (depends on reviews, users)
CREATE TABLE review_votes (
    vote_id VARCHAR(255) PRIMARY KEY,
    review_id VARCHAR(255) NOT NULL REFERENCES reviews(review_id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    is_helpful BOOLEAN NOT NULL,
    created_at VARCHAR(255) NOT NULL
);

-- Wishlist items table (depends on customers, products)
CREATE TABLE wishlist_items (
    wishlist_item_id VARCHAR(255) PRIMARY KEY,
    customer_id VARCHAR(255) NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
    product_id VARCHAR(255) NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
    added_date VARCHAR(255) NOT NULL,
    price_when_saved NUMERIC NOT NULL,
    price_drop_alert_enabled BOOLEAN NOT NULL DEFAULT true,
    back_in_stock_alert_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at VARCHAR(255) NOT NULL,
    updated_at VARCHAR(255) NOT NULL
);

-- Projects table (depends on customers)
CREATE TABLE projects (
    project_id VARCHAR(255) PRIMARY KEY,
    customer_id VARCHAR(255) NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
    project_name VARCHAR(255) NOT NULL,
    description TEXT,
    total_value NUMERIC NOT NULL DEFAULT 0,
    item_count NUMERIC NOT NULL DEFAULT 0,
    created_date VARCHAR(255) NOT NULL,
    last_updated_date VARCHAR(255) NOT NULL,
    created_at VARCHAR(255) NOT NULL,
    updated_at VARCHAR(255) NOT NULL
);

-- Project items table (depends on projects, products)
CREATE TABLE project_items (
    project_item_id VARCHAR(255) PRIMARY KEY,
    project_id VARCHAR(255) NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
    product_id VARCHAR(255) NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
    quantity NUMERIC NOT NULL,
    created_at VARCHAR(255) NOT NULL,
    updated_at VARCHAR(255) NOT NULL
);

-- Notifications table (depends on users)
CREATE TABLE notifications (
    notification_id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    notification_type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    related_entity_type VARCHAR(100),
    related_entity_id VARCHAR(255),
    action_url TEXT,
    created_date VARCHAR(255) NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at VARCHAR(255),
    delivered_via JSONB,
    created_at VARCHAR(255) NOT NULL,
    updated_at VARCHAR(255) NOT NULL
);

-- Issues table (depends on orders, customers, suppliers, admins)
CREATE TABLE issues (
    issue_id VARCHAR(255) PRIMARY KEY,
    order_id VARCHAR(255) NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    customer_id VARCHAR(255) NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
    supplier_id VARCHAR(255) NOT NULL REFERENCES suppliers(supplier_id) ON DELETE CASCADE,
    issue_type VARCHAR(100) NOT NULL,
    affected_items JSONB,
    status VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    evidence_photos JSONB,
    desired_resolution VARCHAR(255) NOT NULL,
    resolution_offered TEXT,
    resolution_amount NUMERIC,
    resolution_accepted BOOLEAN,
    resolution_accepted_date VARCHAR(255),
    opened_date VARCHAR(255) NOT NULL,
    resolved_date VARCHAR(255),
    escalated_to_admin BOOLEAN NOT NULL DEFAULT false,
    assigned_admin_id VARCHAR(255) REFERENCES admins(admin_id) ON DELETE SET NULL,
    created_at VARCHAR(255) NOT NULL,
    updated_at VARCHAR(255) NOT NULL
);

-- Issue messages table (depends on issues, users)
CREATE TABLE issue_messages (
    message_id VARCHAR(255) PRIMARY KEY,
    issue_id VARCHAR(255) NOT NULL REFERENCES issues(issue_id) ON DELETE CASCADE,
    sender_id VARCHAR(255) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    sender_type VARCHAR(50) NOT NULL,
    message_text TEXT NOT NULL,
    attachments JSONB,
    timestamp VARCHAR(255) NOT NULL,
    created_at VARCHAR(255) NOT NULL
);

-- Chat conversations table (depends on customers, suppliers, admins)
CREATE TABLE chat_conversations (
    conversation_id VARCHAR(255) PRIMARY KEY,
    customer_id VARCHAR(255) REFERENCES customers(customer_id) ON DELETE CASCADE,
    supplier_id VARCHAR(255) REFERENCES suppliers(supplier_id) ON DELETE CASCADE,
    admin_id VARCHAR(255) REFERENCES admins(admin_id) ON DELETE CASCADE,
    conversation_type VARCHAR(50) NOT NULL,
    related_entity_type VARCHAR(100),
    related_entity_id VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    last_message_at VARCHAR(255),
    created_at VARCHAR(255) NOT NULL,
    updated_at VARCHAR(255) NOT NULL
);

-- Chat messages table (depends on chat_conversations, users)
CREATE TABLE chat_messages (
    message_id VARCHAR(255) PRIMARY KEY,
    conversation_id VARCHAR(255) NOT NULL REFERENCES chat_conversations(conversation_id) ON DELETE CASCADE,
    sender_id VARCHAR(255) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    sender_type VARCHAR(50) NOT NULL,
    message_text TEXT NOT NULL,
    attachments JSONB,
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at VARCHAR(255),
    timestamp VARCHAR(255) NOT NULL,
    created_at VARCHAR(255) NOT NULL
);

-- Surplus listings table (depends on customers, categories)
CREATE TABLE surplus_listings (
    listing_id VARCHAR(255) PRIMARY KEY,
    seller_id VARCHAR(255) NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
    product_name VARCHAR(255) NOT NULL,
    category_id VARCHAR(255) NOT NULL REFERENCES categories(category_id) ON DELETE RESTRICT,
    description TEXT NOT NULL,
    condition VARCHAR(50) NOT NULL,
    photos JSONB,
    asking_price NUMERIC NOT NULL,
    original_price NUMERIC,
    price_type VARCHAR(50) NOT NULL DEFAULT 'fixed',
    quantity NUMERIC NOT NULL DEFAULT 1,
    pickup_location TEXT,
    pickup_instructions TEXT,
    shipping_available BOOLEAN NOT NULL DEFAULT false,
    shipping_rate NUMERIC,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    reason_for_selling TEXT,
    views_count NUMERIC NOT NULL DEFAULT 0,
    created_date VARCHAR(255) NOT NULL,
    created_at VARCHAR(255) NOT NULL,
    updated_at VARCHAR(255) NOT NULL
);

-- Surplus offers table (depends on surplus_listings, customers)
CREATE TABLE surplus_offers (
    offer_id VARCHAR(255) PRIMARY KEY,
    listing_id VARCHAR(255) NOT NULL REFERENCES surplus_listings(listing_id) ON DELETE CASCADE,
    buyer_id VARCHAR(255) NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
    offer_amount NUMERIC NOT NULL,
    message TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    counter_offer_amount NUMERIC,
    created_date VARCHAR(255) NOT NULL,
    created_at VARCHAR(255) NOT NULL,
    updated_at VARCHAR(255) NOT NULL
);

-- Surplus transactions table (depends on surplus_listings, customers, addresses)
CREATE TABLE surplus_transactions (
    transaction_id VARCHAR(255) PRIMARY KEY,
    listing_id VARCHAR(255) NOT NULL REFERENCES surplus_listings(listing_id) ON DELETE RESTRICT,
    buyer_id VARCHAR(255) NOT NULL REFERENCES customers(customer_id) ON DELETE RESTRICT,
    seller_id VARCHAR(255) NOT NULL REFERENCES customers(customer_id) ON DELETE RESTRICT,
    final_price NUMERIC NOT NULL,
    payment_status VARCHAR(50) NOT NULL,
    escrow_status VARCHAR(50) NOT NULL,
    pickup_or_shipping VARCHAR(50) NOT NULL,
    delivery_address_id VARCHAR(255) REFERENCES addresses(address_id) ON DELETE SET NULL,
    tracking_number VARCHAR(255),
    item_received_confirmed BOOLEAN NOT NULL DEFAULT false,
    received_confirmation_date VARCHAR(255),
    payment_released_date VARCHAR(255),
    buyer_rating NUMERIC,
    seller_rating NUMERIC,
    created_at VARCHAR(255) NOT NULL,
    updated_at VARCHAR(255) NOT NULL
);

-- Promotions table (depends on suppliers)
CREATE TABLE promotions (
    promotion_id VARCHAR(255) PRIMARY KEY,
    supplier_id VARCHAR(255) NOT NULL REFERENCES suppliers(supplier_id) ON DELETE CASCADE,
    promotion_name VARCHAR(255) NOT NULL,
    promotion_type VARCHAR(50) NOT NULL,
    discount_type VARCHAR(50) NOT NULL,
    discount_value NUMERIC NOT NULL,
    applicable_products JSONB,
    applicable_categories JSONB,
    minimum_purchase_amount NUMERIC,
    maximum_discount_amount NUMERIC,
    promo_code VARCHAR(100) UNIQUE,
    usage_limit_total NUMERIC,
    usage_limit_per_customer NUMERIC,
    usage_count NUMERIC NOT NULL DEFAULT 0,
    start_date VARCHAR(255) NOT NULL,
    end_date VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at VARCHAR(255) NOT NULL,
    updated_at VARCHAR(255) NOT NULL
);

-- Promo code usage table (depends on promotions, customers, orders)
CREATE TABLE promo_code_usage (
    usage_id VARCHAR(255) PRIMARY KEY,
    promotion_id VARCHAR(255) NOT NULL REFERENCES promotions(promotion_id) ON DELETE CASCADE,
    customer_id VARCHAR(255) NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
    order_id VARCHAR(255) NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    discount_applied NUMERIC NOT NULL,
    used_date VARCHAR(255) NOT NULL,
    created_at VARCHAR(255) NOT NULL
);

-- Payouts table (depends on suppliers)
CREATE TABLE payouts (
    payout_id VARCHAR(255) PRIMARY KEY,
    supplier_id VARCHAR(255) NOT NULL REFERENCES suppliers(supplier_id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    status VARCHAR(50) NOT NULL,
    scheduled_date VARCHAR(255) NOT NULL,
    processed_date VARCHAR(255),
    transaction_reference VARCHAR(255),
    included_orders JSONB,
    platform_commission NUMERIC NOT NULL,
    net_amount NUMERIC NOT NULL,
    failure_reason TEXT,
    created_at VARCHAR(255) NOT NULL,
    updated_at VARCHAR(255) NOT NULL
);

-- Financial transactions table (depends on suppliers, orders)
CREATE TABLE financial_transactions (
    transaction_id VARCHAR(255) PRIMARY KEY,
    supplier_id VARCHAR(255) REFERENCES suppliers(supplier_id) ON DELETE CASCADE,
    order_id VARCHAR(255) REFERENCES orders(order_id) ON DELETE CASCADE,
    transaction_type VARCHAR(100) NOT NULL,
    amount NUMERIC NOT NULL,
    commission_amount NUMERIC,
    net_amount NUMERIC,
    description TEXT,
    transaction_date VARCHAR(255) NOT NULL,
    created_at VARCHAR(255) NOT NULL
);

-- Inventory logs table (depends on products, suppliers, users)
CREATE TABLE inventory_logs (
    log_id VARCHAR(255) PRIMARY KEY,
    product_id VARCHAR(255) NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
    supplier_id VARCHAR(255) NOT NULL REFERENCES suppliers(supplier_id) ON DELETE CASCADE,
    change_type VARCHAR(50) NOT NULL,
    quantity_before NUMERIC NOT NULL,
    quantity_change NUMERIC NOT NULL,
    quantity_after NUMERIC NOT NULL,
    reason TEXT,
    reference_id VARCHAR(255),
    performed_by VARCHAR(255) REFERENCES users(user_id) ON DELETE SET NULL,
    timestamp VARCHAR(255) NOT NULL,
    created_at VARCHAR(255) NOT NULL
);

-- Search history table (depends on users, products)
CREATE TABLE search_history (
    search_id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) REFERENCES users(user_id) ON DELETE CASCADE,
    search_query TEXT NOT NULL,
    filters_applied JSONB,
    results_count NUMERIC NOT NULL,
    clicked_product_id VARCHAR(255) REFERENCES products(product_id) ON DELETE SET NULL,
    search_timestamp VARCHAR(255) NOT NULL,
    created_at VARCHAR(255) NOT NULL
);

-- Product views table (depends on products, users)
CREATE TABLE product_views (
    view_id VARCHAR(255) PRIMARY KEY,
    product_id VARCHAR(255) NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
    user_id VARCHAR(255) REFERENCES users(user_id) ON DELETE SET NULL,
    session_id VARCHAR(255),
    referrer TEXT,
    view_timestamp VARCHAR(255) NOT NULL,
    time_spent_seconds NUMERIC,
    created_at VARCHAR(255) NOT NULL
);

-- Support tickets table (depends on users, orders, admins)
CREATE TABLE support_tickets (
    ticket_id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    order_id VARCHAR(255) REFERENCES orders(order_id) ON DELETE SET NULL,
    issue_category VARCHAR(100) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    attachments JSONB,
    status VARCHAR(50) NOT NULL DEFAULT 'open',
    priority VARCHAR(50) NOT NULL DEFAULT 'normal',
    assigned_admin_id VARCHAR(255) REFERENCES admins(admin_id) ON DELETE SET NULL,
    created_date VARCHAR(255) NOT NULL,
    last_updated_date VARCHAR(255) NOT NULL,
    resolved_date VARCHAR(255),
    customer_satisfaction_rating NUMERIC,
    created_at VARCHAR(255) NOT NULL,
    updated_at VARCHAR(255) NOT NULL
);

-- Ticket responses table (depends on support_tickets, users)
CREATE TABLE ticket_responses (
    response_id VARCHAR(255) PRIMARY KEY,
    ticket_id VARCHAR(255) NOT NULL REFERENCES support_tickets(ticket_id) ON DELETE CASCADE,
    responder_id VARCHAR(255) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    responder_type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    attachments JSONB,
    is_internal_note BOOLEAN NOT NULL DEFAULT false,
    timestamp VARCHAR(255) NOT NULL,
    created_at VARCHAR(255) NOT NULL
);

-- Supplier applications table (depends on users, admins)
CREATE TABLE supplier_applications (
    application_id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    business_name VARCHAR(255) NOT NULL,
    business_registration_number VARCHAR(255),
    business_type VARCHAR(100) NOT NULL,
    contact_person_name VARCHAR(255) NOT NULL,
    business_address TEXT NOT NULL,
    business_description TEXT,
    submitted_documents JSONB,
    application_status VARCHAR(50) NOT NULL DEFAULT 'pending_review',
    assigned_reviewer_id VARCHAR(255) REFERENCES admins(admin_id) ON DELETE SET NULL,
    verification_checklist JSONB,
    rejection_reason TEXT,
    submitted_date VARCHAR(255) NOT NULL,
    reviewed_date VARCHAR(255),
    approved_date VARCHAR(255),
    created_at VARCHAR(255) NOT NULL,
    updated_at VARCHAR(255) NOT NULL
);

-- Admin activity logs table (depends on admins)
CREATE TABLE admin_activity_logs (
    log_id VARCHAR(255) PRIMARY KEY,
    admin_id VARCHAR(255) NOT NULL REFERENCES admins(admin_id) ON DELETE CASCADE,
    action_type VARCHAR(100) NOT NULL,
    action_description TEXT NOT NULL,
    affected_entity_type VARCHAR(100),
    affected_entity_id VARCHAR(255),
    previous_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(50),
    user_agent TEXT,
    timestamp VARCHAR(255) NOT NULL,
    created_at VARCHAR(255) NOT NULL
);

-- Flagged content table (depends on users, admins)
CREATE TABLE flagged_content (
    flag_id VARCHAR(255) PRIMARY KEY,
    content_type VARCHAR(100) NOT NULL,
    content_id VARCHAR(255) NOT NULL,
    flagged_by_user_id VARCHAR(255) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    flag_reason VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    reviewed_by_admin_id VARCHAR(255) REFERENCES admins(admin_id) ON DELETE SET NULL,
    admin_action VARCHAR(100),
    admin_notes TEXT,
    flagged_date VARCHAR(255) NOT NULL,
    reviewed_date VARCHAR(255),
    created_at VARCHAR(255) NOT NULL,
    updated_at VARCHAR(255) NOT NULL
);

-- Platform settings table (depends on admins)
CREATE TABLE platform_settings (
    setting_id VARCHAR(255) PRIMARY KEY,
    setting_key VARCHAR(255) UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    setting_category VARCHAR(100) NOT NULL,
    description TEXT,
    last_updated_by VARCHAR(255) REFERENCES admins(admin_id) ON DELETE SET NULL,
    created_at VARCHAR(255) NOT NULL,
    updated_at VARCHAR(255) NOT NULL
);

-- Delivery zones table (depends on suppliers)
CREATE TABLE delivery_zones (
    zone_id VARCHAR(255) PRIMARY KEY,
    supplier_id VARCHAR(255) NOT NULL REFERENCES suppliers(supplier_id) ON DELETE CASCADE,
    zone_name VARCHAR(255) NOT NULL,
    postal_codes JSONB,
    radius_miles NUMERIC,
    center_latitude NUMERIC(10, 7),
    center_longitude NUMERIC(10, 7),
    created_at VARCHAR(255) NOT NULL,
    updated_at VARCHAR(255) NOT NULL
);

-- ============================================
-- SEED DATA
-- ============================================

-- Seed Users
INSERT INTO users (user_id, email, password_hash, user_type, first_name, last_name, phone_number, profile_photo_url, registration_date, last_login_date, status, email_verified, email_verification_token, password_reset_token, password_reset_expires, created_at, updated_at) VALUES
('user_001', 'john.contractor@example.com', 'password123', 'customer', 'John', 'Smith', '+1-555-0101', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400', '2024-01-15T10:00:00Z', '2024-01-20T15:30:00Z', 'active', true, NULL, NULL, NULL, '2024-01-15T10:00:00Z', '2024-01-20T15:30:00Z'),
('user_002', 'sarah.builder@example.com', 'password123', 'customer', 'Sarah', 'Johnson', '+1-555-0102', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400', '2024-01-16T11:00:00Z', '2024-01-21T09:15:00Z', 'active', true, NULL, NULL, NULL, '2024-01-16T11:00:00Z', '2024-01-21T09:15:00Z'),
('user_003', 'mike.renovator@example.com', 'password123', 'customer', 'Michael', 'Williams', '+1-555-0103', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400', '2024-01-17T12:00:00Z', '2024-01-22T14:20:00Z', 'active', true, NULL, NULL, NULL, '2024-01-17T12:00:00Z', '2024-01-22T14:20:00Z'),
('user_004', 'emily.homeowner@example.com', 'password123', 'customer', 'Emily', 'Brown', '+1-555-0104', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400', '2024-01-18T13:00:00Z', '2024-01-23T16:45:00Z', 'active', true, NULL, NULL, NULL, '2024-01-18T13:00:00Z', '2024-01-23T16:45:00Z'),
('user_005', 'david.tradecustomer@example.com', 'password123', 'customer', 'David', 'Martinez', '+1-555-0105', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400', '2024-01-19T14:00:00Z', '2024-01-24T10:30:00Z', 'active', true, NULL, NULL, NULL, '2024-01-19T14:00:00Z', '2024-01-24T10:30:00Z'),
('user_006', 'supplier.acme@example.com', 'supplier123', 'supplier', 'James', 'Anderson', '+1-555-0201', 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400', '2024-01-10T09:00:00Z', '2024-01-25T08:00:00Z', 'active', true, NULL, NULL, NULL, '2024-01-10T09:00:00Z', '2024-01-25T08:00:00Z'),
('user_007', 'supplier.buildpro@example.com', 'supplier123', 'supplier', 'Lisa', 'Taylor', '+1-555-0202', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400', '2024-01-11T10:00:00Z', '2024-01-25T09:30:00Z', 'active', true, NULL, NULL, NULL, '2024-01-11T10:00:00Z', '2024-01-25T09:30:00Z'),
('user_008', 'supplier.timbertrade@example.com', 'supplier123', 'supplier', 'Robert', 'Wilson', '+1-555-0203', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400', '2024-01-12T11:00:00Z', '2024-01-25T11:00:00Z', 'active', true, NULL, NULL, NULL, '2024-01-12T11:00:00Z', '2024-01-25T11:00:00Z'),
('user_009', 'supplier.electricplus@example.com', 'supplier123', 'supplier', 'Jennifer', 'Moore', '+1-555-0204', 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=400', '2024-01-13T12:00:00Z', '2024-01-25T13:45:00Z', 'active', true, NULL, NULL, NULL, '2024-01-13T12:00:00Z', '2024-01-25T13:45:00Z'),
('user_010', 'supplier.plumbmaster@example.com', 'supplier123', 'supplier', 'William', 'Garcia', '+1-555-0205', 'https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?w=400', '2024-01-14T13:00:00Z', '2024-01-25T15:20:00Z', 'active', true, NULL, NULL, NULL, '2024-01-14T13:00:00Z', '2024-01-25T15:20:00Z'),
('user_011', 'admin.super@example.com', 'admin123', 'admin', 'Admin', 'Superuser', '+1-555-0301', 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=400', '2024-01-01T08:00:00Z', '2024-01-25T17:00:00Z', 'active', true, NULL, NULL, NULL, '2024-01-01T08:00:00Z', '2024-01-25T17:00:00Z'),
('user_012', 'admin.support@example.com', 'admin123', 'admin', 'Support', 'Admin', '+1-555-0302', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400', '2024-01-02T09:00:00Z', '2024-01-25T16:30:00Z', 'active', true, NULL, NULL, NULL, '2024-01-02T09:00:00Z', '2024-01-25T16:30:00Z'),
('user_013', 'admin.finance@example.com', 'admin123', 'admin', 'Finance', 'Manager', '+1-555-0303', 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=400', '2024-01-03T10:00:00Z', '2024-01-25T14:15:00Z', 'active', true, NULL, NULL, NULL, '2024-01-03T10:00:00Z', '2024-01-25T14:15:00Z');

-- Seed Addresses
INSERT INTO addresses (address_id, user_id, label, full_name, phone_number, street_address, apt_suite, city, state, postal_code, country, address_type, delivery_instructions, is_default, latitude, longitude, created_at, updated_at) VALUES
('addr_001', 'user_001', 'Work Site', 'John Smith', '+1-555-0101', '123 Construction Blvd', 'Site A', 'Austin', 'TX', '78701', 'USA', 'commercial', 'Deliver to job site trailer', true, 30.2672, -97.7431, '2024-01-15T10:05:00Z', '2024-01-15T10:05:00Z'),
('addr_002', 'user_001', 'Home', 'John Smith', '+1-555-0101', '456 Residential St', 'Apt 2B', 'Austin', 'TX', '78702', 'USA', 'residential', 'Leave at front door', false, 30.2589, -97.7251, '2024-01-15T10:10:00Z', '2024-01-15T10:10:00Z'),
('addr_003', 'user_002', 'Office', 'Sarah Johnson', '+1-555-0102', '789 Builder Ave', 'Suite 100', 'Houston', 'TX', '77001', 'USA', 'commercial', 'Call upon arrival', true, 29.7604, -95.3698, '2024-01-16T11:05:00Z', '2024-01-16T11:05:00Z'),
('addr_004', 'user_003', 'Main Site', 'Michael Williams', '+1-555-0103', '321 Renovation Dr', NULL, 'Dallas', 'TX', '75201', 'USA', 'commercial', 'Gate code 1234', true, 32.7767, -96.7970, '2024-01-17T12:05:00Z', '2024-01-17T12:05:00Z'),
('addr_005', 'user_004', 'Home', 'Emily Brown', '+1-555-0104', '654 Suburban Ln', NULL, 'San Antonio', 'TX', '78201', 'USA', 'residential', 'Ring doorbell', true, 29.4241, -98.4936, '2024-01-18T13:05:00Z', '2024-01-18T13:05:00Z'),
('addr_006', 'user_005', 'Warehouse', 'David Martinez', '+1-555-0105', '987 Industrial Pkwy', 'Unit 5', 'Fort Worth', 'TX', '76101', 'USA', 'commercial', 'Use loading dock B', true, 32.7555, -97.3308, '2024-01-19T14:05:00Z', '2024-01-19T14:05:00Z'),
('addr_007', 'user_006', 'Warehouse', 'Acme Supply Co', '+1-555-0201', '100 Distribution Way', NULL, 'Austin', 'TX', '78703', 'USA', 'warehouse', NULL, true, 30.2849, -97.7341, '2024-01-10T09:05:00Z', '2024-01-10T09:05:00Z'),
('addr_008', 'user_007', 'Main Facility', 'BuildPro Materials', '+1-555-0202', '200 Supply Rd', NULL, 'Houston', 'TX', '77002', 'USA', 'warehouse', NULL, true, 29.7589, -95.3677, '2024-01-11T10:05:00Z', '2024-01-11T10:05:00Z');

-- Seed Categories
INSERT INTO categories (category_id, parent_category_id, category_name, category_slug, description, icon_url, display_order, is_active, created_at, updated_at) VALUES
('cat_001', NULL, 'Lumber & Wood', 'lumber-wood', 'All types of lumber, plywood, and wood products', 'https://images.unsplash.com/photo-1610700613737-64bc650155e3?w=200', 1, true, '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z'),
('cat_002', NULL, 'Electrical', 'electrical', 'Electrical supplies, wiring, and fixtures', 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=200', 2, true, '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z'),
('cat_003', NULL, 'Plumbing', 'plumbing', 'Pipes, fixtures, and plumbing supplies', 'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=200', 3, true, '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z'),
('cat_004', NULL, 'Tools & Equipment', 'tools-equipment', 'Power tools, hand tools, and equipment', 'https://images.unsplash.com/photo-1530124566582-a618bc2615dc?w=200', 4, true, '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z'),
('cat_005', NULL, 'Hardware & Fasteners', 'hardware-fasteners', 'Nails, screws, bolts, and general hardware', 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=200', 5, true, '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z'),
('cat_006', NULL, 'Paint & Finishes', 'paint-finishes', 'Paint, stains, and finishing products', 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=200', 6, true, '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z'),
('cat_007', NULL, 'Flooring', 'flooring', 'Hardwood, tile, carpet, and flooring materials', 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=200', 7, true, '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z'),
('cat_008', NULL, 'Roofing & Siding', 'roofing-siding', 'Roofing materials, shingles, and siding', 'https://images.unsplash.com/photo-1632778149955-e80f8ceca2e8?w=200', 8, true, '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z'),
('cat_009', 'cat_001', 'Dimensional Lumber', 'dimensional-lumber', 'Standard dimensional lumber in various sizes', 'https://images.unsplash.com/photo-1610700613737-64bc650155e3?w=200', 1, true, '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z'),
('cat_010', 'cat_001', 'Plywood & Panels', 'plywood-panels', 'Plywood, OSB, and panel products', 'https://images.unsplash.com/photo-1608054565515-5394f8d44c02?w=200', 2, true, '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z');

-- Seed Customers
INSERT INTO customers (customer_id, user_id, account_type, default_delivery_address_id, trade_credit_limit, trade_credit_balance, trade_credit_used, trade_credit_terms, trade_credit_status, preferred_brands, preferred_suppliers, preferred_categories, notification_preferences, onboarding_completed, created_at, updated_at) VALUES
('cust_001', 'user_001', 'trade', 'addr_001', 50000, 50000, 0, 'Net 30', 'approved', '["DeWalt", "Milwaukee", "Makita"]', '["sup_001", "sup_002"]', '["cat_001", "cat_004"]', '{"email": true, "sms": true, "push": true, "order_updates": true, "promotions": true}', true, '2024-01-15T10:00:00Z', '2024-01-15T10:00:00Z'),
('cust_002', 'user_002', 'trade', 'addr_003', 75000, 65000, 10000, 'Net 45', 'approved', '["Simpson", "USG", "James Hardie"]', '["sup_002", "sup_003"]', '["cat_001", "cat_008"]', '{"email": true, "sms": true, "push": false, "order_updates": true, "promotions": false}', true, '2024-01-16T11:00:00Z', '2024-01-16T11:00:00Z'),
('cust_003', 'user_003', 'trade', 'addr_004', 30000, 22000, 8000, 'Net 30', 'approved', '["Bosch", "Festool"]', '["sup_001"]', '["cat_004", "cat_006"]', '{"email": true, "sms": false, "push": true, "order_updates": true, "promotions": true}', true, '2024-01-17T12:00:00Z', '2024-01-17T12:00:00Z'),
('cust_004', 'user_004', 'retail', 'addr_005', 0, 0, 0, NULL, NULL, '["Behr", "Sherwin Williams"]', '[]', '["cat_006", "cat_007"]', '{"email": true, "sms": true, "push": true, "order_updates": true, "promotions": true}', true, '2024-01-18T13:00:00Z', '2024-01-18T13:00:00Z'),
('cust_005', 'user_005', 'trade', 'addr_006', 100000, 80000, 20000, 'Net 60', 'approved', '["Kohler", "Moen", "Delta"]', '["sup_005"]', '["cat_003"]', '{"email": true, "sms": true, "push": true, "order_updates": true, "promotions": false}', true, '2024-01-19T14:00:00Z', '2024-01-19T14:00:00Z');

-- Seed Suppliers
INSERT INTO suppliers (supplier_id, user_id, business_name, business_registration_number, business_type, business_description, logo_url, cover_photo_url, verification_status, verification_documents, rating_average, total_reviews, total_sales, total_orders, fulfillment_rate, response_time_average, bank_account_info, payout_frequency, commission_rate, subscription_plan, operating_hours, service_areas, return_policy, shipping_policy, minimum_order_value, status, onboarding_completed, member_since, created_at, updated_at) VALUES
('sup_001', 'user_006', 'Acme Building Supply Co', 'EIN-123456789', 'Corporation', 'Leading supplier of construction materials in Texas', 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400', 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=1200', 'verified', '{"business_license": "doc_001", "insurance": "doc_002", "tax_id": "doc_003"}', 4.7, 156, 2450000, 890, 98.5, 2.3, 'encrypted_bank_info', 'weekly', 8.5, 'premium', '{"monday": "8:00-18:00", "tuesday": "8:00-18:00", "wednesday": "8:00-18:00", "thursday": "8:00-18:00", "friday": "8:00-18:00", "saturday": "9:00-14:00", "sunday": "closed"}', '["Austin", "Houston", "Dallas", "San Antonio"]', 'Returns accepted within 30 days with receipt. 15% restocking fee applies.', 'Free delivery on orders over $500 within 50 miles. Same-day delivery available.', 100, 'active', true, '2024-01-10T09:00:00Z', '2024-01-10T09:00:00Z', '2024-01-25T08:00:00Z'),
('sup_002', 'user_007', 'BuildPro Materials Inc', 'EIN-234567890', 'LLC', 'Premium lumber and building materials supplier', 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=400', 'https://images.unsplash.com/photo-1590496793907-4102a7b17e89?w=1200', 'verified', '{"business_license": "doc_004", "insurance": "doc_005", "tax_id": "doc_006"}', 4.8, 203, 3200000, 1245, 99.2, 1.8, 'encrypted_bank_info', 'bi-weekly', 7.5, 'premium', '{"monday": "7:00-19:00", "tuesday": "7:00-19:00", "wednesday": "7:00-19:00", "thursday": "7:00-19:00", "friday": "7:00-19:00", "saturday": "8:00-16:00", "sunday": "closed"}', '["Houston", "Galveston", "Sugar Land"]', 'Full refund within 14 days on unused materials. No restocking fee.', 'Free delivery on orders over $300. Next-day delivery guaranteed.', 75, 'active', true, '2024-01-11T10:00:00Z', '2024-01-11T10:00:00Z', '2024-01-25T09:30:00Z'),
('sup_003', 'user_008', 'TimberTrade Wholesale', 'EIN-345678901', 'Partnership', 'Wholesale lumber and timber products', 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400', 'https://images.unsplash.com/photo-1590496793907-4102a7b17e89?w=1200', 'verified', '{"business_license": "doc_007", "insurance": "doc_008", "tax_id": "doc_009"}', 4.6, 89, 1800000, 567, 97.3, 3.5, 'encrypted_bank_info', 'monthly', 9.0, 'standard', '{"monday": "7:30-17:30", "tuesday": "7:30-17:30", "wednesday": "7:30-17:30", "thursday": "7:30-17:30", "friday": "7:30-17:30", "saturday": "closed", "sunday": "closed"}', '["Dallas", "Fort Worth", "Arlington"]', 'Returns accepted within 7 days. Must be in original condition. 20% restocking fee.', 'Delivery available Monday-Friday. $50 flat rate within 30 miles.', 150, 'active', true, '2024-01-12T11:00:00Z', '2024-01-12T11:00:00Z', '2024-01-25T11:00:00Z'),
('sup_004', 'user_009', 'ElectricPlus Supply', 'EIN-456789012', 'Corporation', 'Complete electrical supplies and equipment', 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400', 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=1200', 'verified', '{"business_license": "doc_010", "insurance": "doc_011", "tax_id": "doc_012"}', 4.9, 178, 2100000, 934, 99.5, 1.5, 'encrypted_bank_info', 'weekly', 8.0, 'premium', '{"monday": "8:00-18:00", "tuesday": "8:00-18:00", "wednesday": "8:00-18:00", "thursday": "8:00-18:00", "friday": "8:00-18:00", "saturday": "9:00-13:00", "sunday": "closed"}', '["Austin", "Round Rock", "Georgetown"]', 'Returns within 30 days with original packaging. No restocking fee on defective items.', 'Same-day delivery on orders placed before 2 PM. Free delivery over $250.', 50, 'active', true, '2024-01-13T12:00:00Z', '2024-01-13T12:00:00Z', '2024-01-25T13:45:00Z'),
('sup_005', 'user_010', 'PlumbMaster Distributors', 'EIN-567890123', 'LLC', 'Professional plumbing supplies and fixtures', 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=400', 'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=1200', 'verified', '{"business_license": "doc_013", "insurance": "doc_014", "tax_id": "doc_015"}', 4.7, 124, 1900000, 678, 98.0, 2.8, 'encrypted_bank_info', 'bi-weekly', 8.5, 'standard', '{"monday": "7:00-18:00", "tuesday": "7:00-18:00", "wednesday": "7:00-18:00", "thursday": "7:00-18:00", "friday": "7:00-18:00", "saturday": "8:00-15:00", "sunday": "closed"}', '["San Antonio", "New Braunfels", "Seguin"]', 'Returns accepted within 21 days. 10% restocking fee on special orders.', 'Local delivery available. Free on orders over $400. Rush delivery available for extra fee.', 100, 'active', true, '2024-01-14T13:00:00Z', '2024-01-14T13:00:00Z', '2024-01-25T15:20:00Z');

-- Seed Admins
INSERT INTO admins (admin_id, user_id, role, permissions, created_at, updated_at) VALUES
('admin_001', 'user_011', 'super_admin', '{"users": {"create": true, "read": true, "update": true, "delete": true}, "suppliers": {"create": true, "read": true, "update": true, "delete": true}, "orders": {"create": true, "read": true, "update": true, "delete": true}, "products": {"create": true, "read": true, "update": true, "delete": true}, "settings": {"create": true, "read": true, "update": true, "delete": true}}', '2024-01-01T08:00:00Z', '2024-01-01T08:00:00Z'),
('admin_002', 'user_012', 'support_admin', '{"users": {"create": false, "read": true, "update": true, "delete": false}, "orders": {"create": false, "read": true, "update": true, "delete": false}, "tickets": {"create": true, "read": true, "update": true, "delete": false}, "issues": {"create": false, "read": true, "update": true, "delete": false}}', '2024-01-02T09:00:00Z', '2024-01-02T09:00:00Z'),
('admin_003', 'user_013', 'finance_admin', '{"suppliers": {"create": false, "read": true, "update": false, "delete": false}, "orders": {"create": false, "read": true, "update": false, "delete": false}, "payouts": {"create": true, "read": true, "update": true, "delete": false}, "transactions": {"create": true, "read": true, "update": true, "delete": false}}', '2024-01-03T10:00:00Z', '2024-01-03T10:00:00Z');

-- Seed Products
INSERT INTO products (product_id, supplier_id, category_id, sku, product_name, description, key_features, specifications, price_per_unit, unit_of_measure, bulk_pricing, cost_price, stock_quantity, low_stock_threshold, last_updated_timestamp, expected_restock_date, images, primary_image_url, status, is_featured, tags, brand, dimensions, weight, material, compliance_certifications, warranty_information, minimum_order_quantity, maximum_order_quantity, available_delivery_methods, handling_time_days, views_count, sales_count, creation_date, searchable, customer_type_availability, created_at, updated_at) VALUES
('prod_001', 'sup_001', 'cat_009', 'LUM-2X4-8-SPF', '2x4x8 SPF Lumber', 'Premium grade spruce-pine-fir dimensional lumber, kiln-dried', '["Kiln-dried", "Premium grade", "Straight and true", "Ideal for framing"]', '{"grade": "Premium", "moisture_content": "19%", "species": "SPF"}', 8.99, 'piece', '{"10+": 8.49, "50+": 7.99, "100+": 7.49}', 6.50, 850, 100, '2024-01-25T10:00:00Z', NULL, '["https://images.unsplash.com/photo-1610700613737-64bc650155e3?w=800", "https://images.unsplash.com/photo-1608054565515-5394f8d44c02?w=800"]', 'https://images.unsplash.com/photo-1610700613737-64bc650155e3?w=800', 'active', true, '["lumber", "framing", "construction", "wood"]', 'Standard Lumber', '{"length": 96, "width": 3.5, "height": 1.5, "unit": "inches"}', 13.5, 'SPF Wood', '[]', '1 year warranty against defects', 1, 1000, '["standard_delivery", "pickup", "rush_delivery"]', 1, 458, 234, '2024-01-10T09:00:00Z', true, 'all', '2024-01-10T09:00:00Z', '2024-01-25T10:00:00Z'),
('prod_002', 'sup_001', 'cat_009', 'LUM-2X6-10-SPF', '2x6x10 SPF Lumber', 'High-quality dimensional lumber for structural applications', '["Structural grade", "Kiln-dried", "Smooth finish", "Load-bearing"]', '{"grade": "No. 2 or Better", "moisture_content": "19%", "species": "SPF"}', 14.99, 'piece', '{"10+": 14.25, "50+": 13.50, "100+": 12.99}', 10.50, 620, 80, '2024-01-25T10:00:00Z', NULL, '["https://images.unsplash.com/photo-1610700613737-64bc650155e3?w=800"]', 'https://images.unsplash.com/photo-1610700613737-64bc650155e3?w=800', 'active', false, '["lumber", "structural", "framing"]', 'Standard Lumber', '{"length": 120, "width": 5.5, "height": 1.5, "unit": "inches"}', 22, 'SPF Wood', '[]', '1 year warranty', 1, 500, '["standard_delivery", "pickup"]', 1, 312, 178, '2024-01-10T09:00:00Z', true, 'all', '2024-01-10T09:00:00Z', '2024-01-25T10:00:00Z'),
('prod_003', 'sup_002', 'cat_010', 'PLY-4X8-3/4-BC', '3/4" BC Plywood 4x8', 'Sanded plywood sheet, one side smooth for finishing', '["Sanded smooth", "BC grade", "Interior/exterior", "Strong and durable"]', '{"thickness": "0.75 inch", "grade": "BC", "veneer": "Pine/Fir"}', 52.99, 'sheet', '{"10+": 50.99, "25+": 48.99, "50+": 46.99}', 38.50, 385, 50, '2024-01-25T11:00:00Z', NULL, '["https://images.unsplash.com/photo-1608054565515-5394f8d44c02?w=800"]', 'https://images.unsplash.com/photo-1608054565515-5394f8d44c02?w=800', 'active', true, '["plywood", "sheet goods", "panels"]', 'PremierPly', '{"length": 96, "width": 48, "thickness": 0.75, "unit": "inches"}', 67, 'Plywood', '["CARB2"]', '1 year warranty against delamination', 1, 200, '["standard_delivery", "pickup"]', 1, 289, 156, '2024-01-11T10:00:00Z', true, 'all', '2024-01-11T10:00:00Z', '2024-01-25T11:00:00Z'),
('prod_004', 'sup_004', 'cat_002', 'ELEC-RMX-12-2-250', '12/2 NM-B Romex Wire 250ft', 'Non-metallic sheathed cable for residential wiring', '["UL listed", "Copper conductors", "PVC jacket", "Indoor rated"]', '{"gauge": "12 AWG", "conductors": 2, "type": "NM-B", "voltage": "600V"}', 89.99, 'roll', '{"5+": 85.99, "10+": 82.99}', 65.00, 145, 20, '2024-01-25T12:00:00Z', NULL, '["https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800"]', 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800', 'active', false, '["electrical", "wire", "romex", "cable"]', 'Southwire', '{"length": 250, "unit": "feet"}', 24, 'Copper/PVC', '["UL", "CSA"]', 'Manufacturer warranty', 1, 100, '["standard_delivery", "pickup"]', 1, 234, 87, '2024-01-13T12:00:00Z', true, 'all', '2024-01-13T12:00:00Z', '2024-01-25T12:00:00Z'),
('prod_005', 'sup_004', 'cat_002', 'ELEC-LED-BULB-60W', 'LED Light Bulb 60W Equivalent', 'Energy-efficient LED bulb, 800 lumens, soft white', '["Energy Star rated", "Long lasting", "Dimmable", "Soft white 2700K"]', '{"wattage": "9W", "equivalent": "60W", "lumens": 800, "base": "E26"}', 4.99, 'piece', '{"10+": 4.49, "50+": 3.99, "100+": 3.49}', 2.80, 1250, 200, '2024-01-25T12:00:00Z', NULL, '["https://images.unsplash.com/photo-1550985616-10810253b84d?w=800"]', 'https://images.unsplash.com/photo-1550985616-10810253b84d?w=800', 'active', true, '["led", "lighting", "bulb", "energy-efficient"]', 'Philips', '{"height": 4.4, "diameter": 2.4, "unit": "inches"}', 0.15, 'Glass/Plastic', '["Energy Star", "FCC"]', '3 year warranty', 1, 1000, '["standard_delivery", "pickup"]', 1, 678, 456, '2024-01-13T12:00:00Z', true, 'all', '2024-01-13T12:00:00Z', '2024-01-25T12:00:00Z'),
('prod_006', 'sup_005', 'cat_003', 'PLMB-PVC-SCH40-1/2-10', '1/2" PVC Schedule 40 Pipe 10ft', 'Standard PVC pipe for plumbing applications', '["NSF certified", "Corrosion resistant", "Easy to cut", "Standard Schedule 40"]', '{"diameter": "0.5 inch", "schedule": 40, "material": "PVC"}', 6.49, 'piece', '{"10+": 5.99, "50+": 5.49}', 4.20, 560, 75, '2024-01-25T13:00:00Z', NULL, '["https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=800"]', 'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=800', 'active', false, '["plumbing", "pvc", "pipe"]', 'Charlotte Pipe', '{"length": 120, "diameter": 0.5, "unit": "inches"}', 3.2, 'PVC', '["NSF", "ASTM"]', 'Manufacturer warranty', 1, 500, '["standard_delivery", "pickup"]', 1, 189, 112, '2024-01-14T13:00:00Z', true, 'all', '2024-01-14T13:00:00Z', '2024-01-25T13:00:00Z'),
('prod_007', 'sup_005', 'cat_003', 'PLMB-KOHLER-VALVE', 'Kohler Single Handle Faucet', 'Premium kitchen faucet with pull-down spray', '["Ceramic disc valve", "High-arc spout", "Pull-down spray", "Spot resist finish"]', '{"finish": "Stainless Steel", "valve_type": "Ceramic Disc", "holes": 1}', 189.99, 'piece', '[]', 125.00, 78, 15, '2024-01-25T13:00:00Z', '2024-02-10T00:00:00Z', '["https://images.unsplash.com/photo-1585314062340-f1711f7763e8?w=800"]', 'https://images.unsplash.com/photo-1585314062340-f1711f7763e8?w=800', 'active', true, '["plumbing", "faucet", "kitchen", "kohler"]', 'Kohler', '{"height": 15.5, "reach": 8.5, "spout_height": 10, "unit": "inches"}', 4.5, 'Metal/Plastic', '["ADA", "ASME"]', 'Limited lifetime warranty', 1, 50, '["standard_delivery", "pickup"]', 2, 345, 67, '2024-01-14T13:00:00Z', true, 'all', '2024-01-14T13:00:00Z', '2024-01-25T13:00:00Z'),
('prod_008', 'sup_001', 'cat_005', 'HW-SCREW-DRY-3', '3" Drywall Screws (5lb Box)', 'Coarse thread drywall screws for wood studs', '["Sharp point", "Bugle head", "Phosphate coated", "Bulk pack"]', '{"length": "3 inches", "thread": "Coarse", "material": "Steel"}', 24.99, 'box', '{"5+": 23.99, "10+": 22.99}', 16.50, 425, 50, '2024-01-25T14:00:00Z', NULL, '["https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=800"]', 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=800', 'active', false, '["hardware", "screws", "drywall", "fasteners"]', 'GRK Fasteners', '{"box_weight": 5, "unit": "pounds"}', 5, 'Steel', '[]', 'N/A', 1, 200, '["standard_delivery", "pickup"]', 1, 267, 189, '2024-01-10T09:00:00Z', true, 'all', '2024-01-10T09:00:00Z', '2024-01-25T14:00:00Z'),
('prod_009', 'sup_002', 'cat_006', 'PAINT-SW-INT-GAL', 'Sherwin Williams Interior Paint Gallon', 'Premium interior latex paint, eggshell finish', '["Low VOC", "Excellent coverage", "Washable", "Mildew resistant"]', '{"finish": "Eggshell", "type": "Latex", "coverage": "400 sq ft"}', 44.99, 'gallon', '{"5+": 42.99, "10+": 40.99}', 28.00, 315, 40, '2024-01-25T15:00:00Z', NULL, '["https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=800"]', 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=800', 'active', true, '["paint", "interior", "latex", "eggshell"]', 'Sherwin Williams', '{"volume": 1, "unit": "gallon"}', 11, 'Latex Paint', '["Green Guard", "Low VOC"]', 'Satisfaction guarantee', 1, 100, '["standard_delivery", "pickup"]', 1, 445, 198, '2024-01-11T10:00:00Z', true, 'all', '2024-01-11T10:00:00Z', '2024-01-25T15:00:00Z'),
('prod_010', 'sup_003', 'cat_007', 'FLOOR-OAK-SOLID-3/4', 'Solid Oak Hardwood Flooring 3/4"', 'Premium red oak solid hardwood, unfinished', '["Solid hardwood", "Unfinished", "Tongue and groove", "Select grade"]', '{"thickness": "0.75 inch", "width": "2.25 inch", "species": "Red Oak", "grade": "Select"}', 5.99, 'sq_ft', '{"100+": 5.49, "500+": 4.99, "1000+": 4.49}', 3.80, 2850, 200, '2024-01-25T16:00:00Z', NULL, '["https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800"]', 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800', 'active', true, '["flooring", "hardwood", "oak", "wood floor"]', 'Anderson Hardwood', '{"thickness": 0.75, "width": 2.25, "length": 84, "unit": "inches"}', 2.5, 'Red Oak', '["CARB2"]', '10 year warranty', 100, 10000, '["standard_delivery"]', 2, 512, 234, '2024-01-12T11:00:00Z', true, 'trade', '2024-01-12T11:00:00Z', '2024-01-25T16:00:00Z');

-- Seed Payment Methods
INSERT INTO payment_methods (payment_method_id, user_id, payment_type, card_brand, card_last_four, card_expiry_month, card_expiry_year, cardholder_name, billing_address_id, payment_token, is_default, created_at, updated_at) VALUES
('pm_001', 'user_001', 'credit_card', 'Visa', '4242', '12', '2026', 'John Smith', 'addr_002', 'tok_visa_4242', true, '2024-01-15T10:15:00Z', '2024-01-15T10:15:00Z'),
('pm_002', 'user_002', 'credit_card', 'Mastercard', '5555', '08', '2027', 'Sarah Johnson', 'addr_003', 'tok_mc_5555', true, '2024-01-16T11:15:00Z', '2024-01-16T11:15:00Z'),
('pm_003', 'user_003', 'trade_credit', NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2024-01-17T12:15:00Z', '2024-01-17T12:15:00Z'),
('pm_004', 'user_004', 'debit_card', 'Visa', '1234', '06', '2025', 'Emily Brown', 'addr_005', 'tok_debit_1234', true, '2024-01-18T13:15:00Z', '2024-01-18T13:15:00Z');

-- Seed Carts
INSERT INTO carts (cart_id, customer_id, saved_cart_name, created_date, last_modified_date, status, created_at, updated_at) VALUES
('cart_001', 'cust_001', NULL, '2024-01-24T09:00:00Z', '2024-01-25T10:30:00Z', 'active', '2024-01-24T09:00:00Z', '2024-01-25T10:30:00Z'),
('cart_002', 'cust_002', 'Kitchen Renovation Project', '2024-01-23T14:00:00Z', '2024-01-25T11:15:00Z', 'saved', '2024-01-23T14:00:00Z', '2024-01-25T11:15:00Z'),
('cart_003', 'cust_003', NULL, '2024-01-25T08:30:00Z', '2024-01-25T12:45:00Z', 'active', '2024-01-25T08:30:00Z', '2024-01-25T12:45:00Z');

-- Seed Cart Items
INSERT INTO cart_items (cart_item_id, cart_id, product_id, supplier_id, quantity, price_per_unit, added_date, created_at, updated_at) VALUES
('ci_001', 'cart_001', 'prod_001', 'sup_001', 50, 7.99, '2024-01-24T09:00:00Z', '2024-01-24T09:00:00Z', '2024-01-24T09:00:00Z'),
('ci_002', 'cart_001', 'prod_002', 'sup_001', 25, 13.50, '2024-01-25T10:30:00Z', '2024-01-25T10:30:00Z', '2024-01-25T10:30:00Z'),
('ci_003', 'cart_002', 'prod_007', 'sup_005', 3, 189.99, '2024-01-23T14:00:00Z', '2024-01-23T14:00:00Z', '2024-01-23T14:00:00Z'),
('ci_004', 'cart_002', 'prod_009', 'sup_002', 8, 42.99, '2024-01-25T11:15:00Z', '2024-01-25T11:15:00Z', '2024-01-25T11:15:00Z'),
('ci_005', 'cart_003', 'prod_005', 'sup_004', 20, 3.99, '2024-01-25T08:30:00Z', '2024-01-25T08:30:00Z', '2024-01-25T08:30:00Z');

-- Seed Orders
INSERT INTO orders (order_id, customer_id, order_number, order_date, status, subtotal_amount, delivery_fee_total, tax_amount, discount_amount, total_amount, delivery_address_id, payment_method, payment_status, payment_transaction_id, promo_code_used, customer_notes, created_at, updated_at) VALUES
('order_001', 'cust_001', 'ORD-2024-001', '2024-01-20T14:30:00Z', 'delivered', 1245.50, 75.00, 102.43, 50.00, 1372.93, 'addr_001', 'trade_credit', 'paid', 'txn_001', 'FIRST10', 'Please deliver before 3 PM', '2024-01-20T14:30:00Z', '2024-01-23T16:00:00Z'),
('order_002', 'cust_002', 'ORD-2024-002', '2024-01-21T10:15:00Z', 'delivered', 2890.75, 150.00, 244.47, 0, 3285.22, 'addr_003', 'trade_credit', 'paid', 'txn_002', NULL, NULL, '2024-01-21T10:15:00Z', '2024-01-26T15:00:00Z'),
('order_003', 'cust_003', 'ORD-2024-003', '2024-01-22T09:45:00Z', 'processing', 567.85, 50.00, 50.82, 0, 668.67, 'addr_004', 'credit_card', 'paid', 'txn_003', NULL, 'Contact before delivery', '2024-01-22T09:45:00Z', '2024-01-22T09:45:00Z'),
('order_004', 'cust_004', 'ORD-2024-004', '2024-01-23T15:20:00Z', 'delivered', 389.92, 25.00, 34.16, 15.00, 434.08, 'addr_005', 'debit_card', 'paid', 'txn_004', 'SAVE15', NULL, '2024-01-23T15:20:00Z', '2024-01-24T17:30:00Z'),
('order_005', 'cust_005', 'ORD-2024-005', '2024-01-24T11:30:00Z', 'shipped', 1567.88, 100.00, 140.83, 0, 1808.71, 'addr_006', 'trade_credit', 'paid', 'txn_005', NULL, 'Use loading dock entrance', '2024-01-24T11:30:00Z', '2024-01-25T08:45:00Z'),
('order_006', 'cust_002', 'ORD-2024-006', '2024-01-25T14:30:00Z', 'pending', 1349.50, 75.00, 114.20, 0, 1538.70, 'addr_003', 'credit_card', 'paid', 'txn_006', NULL, 'Please call before delivery', '2024-01-25T14:30:00Z', '2024-01-25T14:30:00Z'),
('order_007', 'cust_003', 'ORD-2024-007', '2024-01-25T15:45:00Z', 'processing', 897.45, 50.00, 80.48, 0, 1027.93, 'addr_004', 'trade_credit', 'paid', 'txn_007', NULL, NULL, '2024-01-25T15:45:00Z', '2024-01-25T16:00:00Z'),
('order_008', 'cust_001', 'ORD-2024-008', '2024-01-26T09:15:00Z', 'pending', 674.75, 50.00, 60.53, 0, 785.28, 'addr_001', 'debit_card', 'paid', 'txn_008', NULL, 'Deliver to side entrance', '2024-01-26T09:15:00Z', '2024-01-26T09:15:00Z');

-- Seed Order Items
INSERT INTO order_items (order_item_id, order_id, product_id, supplier_id, product_name, sku, quantity, price_per_unit, line_total, created_at, updated_at) VALUES
('oi_001', 'order_001', 'prod_001', 'sup_001', '2x4x8 SPF Lumber', 'LUM-2X4-8-SPF', 100, 7.49, 749.00, '2024-01-20T14:30:00Z', '2024-01-20T14:30:00Z'),
('oi_002', 'order_001', 'prod_003', 'sup_002', '3/4" BC Plywood 4x8', 'PLY-4X8-3/4-BC', 10, 48.99, 489.90, '2024-01-20T14:30:00Z', '2024-01-20T14:30:00Z'),
('oi_003', 'order_001', 'prod_008', 'sup_001', '3" Drywall Screws (5lb Box)', 'HW-SCREW-DRY-3', 2, 23.99, 47.98, '2024-01-20T14:30:00Z', '2024-01-20T14:30:00Z'),
('oi_004', 'order_002', 'prod_010', 'sup_003', 'Solid Oak Hardwood Flooring 3/4"', 'FLOOR-OAK-SOLID-3/4', 600, 4.49, 2694.00, '2024-01-21T10:15:00Z', '2024-01-21T10:15:00Z'),
('oi_005', 'order_002', 'prod_009', 'sup_002', 'Sherwin Williams Interior Paint Gallon', 'PAINT-SW-INT-GAL', 5, 40.99, 204.95, '2024-01-21T10:15:00Z', '2024-01-21T10:15:00Z'),
('oi_006', 'order_003', 'prod_005', 'sup_004', 'LED Light Bulb 60W Equivalent', 'ELEC-LED-BULB-60W', 100, 3.49, 349.00, '2024-01-22T09:45:00Z', '2024-01-22T09:45:00Z'),
('oi_007', 'order_003', 'prod_004', 'sup_004', '12/2 NM-B Romex Wire 250ft', 'ELEC-RMX-12-2-250', 2, 85.99, 171.98, '2024-01-22T09:45:00Z', '2024-01-22T09:45:00Z'),
('oi_008', 'order_004', 'prod_009', 'sup_002', 'Sherwin Williams Interior Paint Gallon', 'PAINT-SW-INT-GAL', 8, 42.99, 343.92, '2024-01-23T15:20:00Z', '2024-01-23T15:20:00Z'),
('oi_009', 'order_005', 'prod_007', 'sup_005', 'Kohler Single Handle Faucet', 'PLMB-KOHLER-VALVE', 6, 189.99, 1139.94, '2024-01-24T11:30:00Z', '2024-01-24T11:30:00Z'),
('oi_010', 'order_005', 'prod_006', 'sup_005', '1/2" PVC Schedule 40 Pipe 10ft', 'PLMB-PVC-SCH40-1/2-10', 75, 5.49, 411.75, '2024-01-24T11:30:00Z', '2024-01-24T11:30:00Z'),
('oi_011', 'order_006', 'prod_002', 'sup_001', '2x6x10 SPF Lumber', 'LUM-2X6-10-SPF', 90, 14.99, 1349.10, '2024-01-25T14:30:00Z', '2024-01-25T14:30:00Z'),
('oi_012', 'order_007', 'prod_001', 'sup_001', '2x4x8 SPF Lumber', 'LUM-2X4-8-SPF', 80, 7.49, 599.20, '2024-01-25T15:45:00Z', '2024-01-25T15:45:00Z'),
('oi_013', 'order_007', 'prod_008', 'sup_001', '3" Drywall Screws (5lb Box)', 'HW-SCREW-DRY-3', 12, 24.99, 299.88, '2024-01-25T15:45:00Z', '2024-01-25T15:45:00Z'),
('oi_014', 'order_008', 'prod_002', 'sup_001', '2x6x10 SPF Lumber', 'LUM-2X6-10-SPF', 45, 14.99, 674.55, '2024-01-26T09:15:00Z', '2024-01-26T09:15:00Z');

-- Seed Deliveries
INSERT INTO deliveries (delivery_id, order_id, supplier_id, delivery_window_start, delivery_window_end, delivery_method, delivery_fee, delivery_status, tracking_number, carrier, driver_name, driver_phone, estimated_arrival_time, actual_delivery_time, delivery_proof_photo_url, delivery_signature, delivery_notes, current_latitude, current_longitude, created_at, updated_at) VALUES
('del_001', 'order_001', 'sup_001', '2024-01-23T14:00:00Z', '2024-01-23T18:00:00Z', 'standard_delivery', 75.00, 'delivered', 'TRK001234567', 'Acme Delivery', 'Tom Driver', '+1-555-0901', '2024-01-23T15:30:00Z', '2024-01-23T15:45:00Z', 'https://images.unsplash.com/photo-1566576721346-d4a3b4eaeb55?w=800', 'data:image/png;base64,signature', 'Left at job site as instructed', 30.2672, -97.7431, '2024-01-20T14:30:00Z', '2024-01-23T15:45:00Z'),
('del_002', 'order_002', 'sup_003', '2024-01-25T09:00:00Z', '2024-01-25T17:00:00Z', 'freight', 150.00, 'delivered', 'TRK001234568', 'XPO Logistics', 'Mike Trucker', '+1-555-0902', '2024-01-25T14:00:00Z', '2024-01-26T14:30:00Z', 'https://images.unsplash.com/photo-1566576721346-d4a3b4eaeb55?w=800', 'data:image/png;base64,signature3', 'Delivered successfully to office', 29.7604, -95.3698, '2024-01-21T10:15:00Z', '2024-01-26T14:30:00Z'),
('del_003', 'order_003', 'sup_004', '2024-01-22T13:00:00Z', '2024-01-22T15:00:00Z', 'same_day', 50.00, 'scheduled', 'TRK001234569', 'ElectricPlus Delivery', NULL, NULL, '2024-01-22T14:00:00Z', NULL, NULL, NULL, NULL, NULL, NULL, '2024-01-22T09:45:00Z', '2024-01-22T09:45:00Z'),
('del_004', 'order_004', 'sup_002', '2024-01-24T10:00:00Z', '2024-01-24T18:00:00Z', 'standard_delivery', 25.00, 'delivered', 'TRK001234570', 'BuildPro Delivery', 'Jim Courier', '+1-555-0903', '2024-01-24T16:00:00Z', '2024-01-24T16:15:00Z', 'https://images.unsplash.com/photo-1566576721346-d4a3b4eaeb55?w=800', 'data:image/png;base64,signature2', 'Delivered to front porch', 29.4241, -98.4936, '2024-01-23T15:20:00Z', '2024-01-24T16:15:00Z'),
('del_005', 'order_005', 'sup_005', '2024-01-25T08:00:00Z', '2024-01-25T12:00:00Z', 'scheduled', 100.00, 'out_for_delivery', 'TRK001234571', 'PlumbMaster Delivery', 'Steve Carrier', '+1-555-0904', '2024-01-25T10:00:00Z', NULL, NULL, NULL, NULL, 29.5000, -98.4000, '2024-01-24T11:30:00Z', '2024-01-25T08:00:00Z'),
('del_006', 'order_006', 'sup_001', '2025-11-24T10:00:00Z', '2025-11-24T14:00:00Z', 'standard_delivery', 75.00, 'scheduled', NULL, NULL, NULL, NULL, '2025-11-24T12:00:00Z', NULL, NULL, NULL, NULL, NULL, NULL, '2024-01-25T14:30:00Z', '2024-01-25T14:30:00Z'),
('del_007', 'order_007', 'sup_001', '2025-11-23T08:00:00Z', '2025-11-23T12:00:00Z', 'standard_delivery', 50.00, 'scheduled', NULL, NULL, NULL, NULL, '2025-11-23T10:00:00Z', NULL, NULL, NULL, NULL, NULL, NULL, '2024-01-25T16:00:00Z', '2024-01-25T16:00:00Z'),
('del_008', 'order_008', 'sup_001', '2025-11-25T09:00:00Z', '2025-11-25T13:00:00Z', 'standard_delivery', 50.00, 'preparing', NULL, NULL, NULL, NULL, '2025-11-25T11:00:00Z', NULL, NULL, NULL, NULL, NULL, NULL, '2024-01-26T09:15:00Z', '2024-01-26T09:15:00Z'),
('del_009', 'order_006', 'sup_001', '2025-11-22T14:00:00Z', '2025-11-22T18:00:00Z', 'standard_delivery', 75.00, 'out_for_delivery', 'TRK001234572', 'Acme Delivery', 'John Smith', '+1-555-0905', '2025-11-22T16:00:00Z', NULL, NULL, NULL, 'Currently en route to delivery location', 30.2672, -97.7431, '2025-11-22T09:00:00Z', '2025-11-22T14:00:00Z'),
('del_010', 'order_007', 'sup_001', '2025-11-26T10:00:00Z', '2025-11-26T14:00:00Z', 'standard_delivery', 50.00, 'scheduled', NULL, NULL, NULL, NULL, '2025-11-26T12:00:00Z', NULL, NULL, NULL, NULL, NULL, NULL, '2025-11-22T08:00:00Z', '2025-11-22T08:00:00Z');

-- Seed Order Timeline
INSERT INTO order_timeline (timeline_id, order_id, milestone, status, timestamp, description, performed_by, created_at) VALUES
('tl_001', 'order_001', 'order_placed', 'completed', '2024-01-20T14:30:00Z', 'Order placed and payment received', 'cust_001', '2024-01-20T14:30:00Z'),
('tl_002', 'order_001', 'payment_confirmed', 'completed', '2024-01-20T14:31:00Z', 'Payment confirmed - Trade credit applied', 'system', '2024-01-20T14:31:00Z'),
('tl_003', 'order_001', 'processing', 'completed', '2024-01-20T15:00:00Z', 'Order being prepared for shipment', 'sup_001', '2024-01-20T15:00:00Z'),
('tl_004', 'order_001', 'shipped', 'completed', '2024-01-21T09:00:00Z', 'Order shipped - Tracking: TRK001234567', 'sup_001', '2024-01-21T09:00:00Z'),
('tl_005', 'order_001', 'out_for_delivery', 'completed', '2024-01-23T14:00:00Z', 'Out for delivery', 'carrier', '2024-01-23T14:00:00Z'),
('tl_006', 'order_001', 'delivered', 'completed', '2024-01-23T15:45:00Z', 'Successfully delivered to job site', 'carrier', '2024-01-23T15:45:00Z'),
('tl_007', 'order_002', 'order_placed', 'completed', '2024-01-21T10:15:00Z', 'Order placed', 'cust_002', '2024-01-21T10:15:00Z'),
('tl_008', 'order_002', 'payment_confirmed', 'completed', '2024-01-21T10:16:00Z', 'Payment confirmed', 'system', '2024-01-21T10:16:00Z'),
('tl_009', 'order_002', 'processing', 'completed', '2024-01-21T14:00:00Z', 'Order processing', 'sup_003', '2024-01-21T14:00:00Z'),
('tl_010', 'order_002', 'shipped', 'completed', '2024-01-24T08:00:00Z', 'Freight shipment dispatched', 'sup_003', '2024-01-24T08:00:00Z'),
('tl_011', 'order_002', 'in_transit', 'completed', '2024-01-25T09:00:00Z', 'Shipment in transit', 'carrier', '2024-01-25T09:00:00Z'),
('tl_019', 'order_002', 'delivered', 'completed', '2024-01-26T14:30:00Z', 'Successfully delivered to Houston office', 'carrier', '2024-01-26T14:30:00Z'),
('tl_012', 'order_006', 'order_placed', 'completed', '2024-01-25T14:30:00Z', 'Order placed and payment received', 'cust_002', '2024-01-25T14:30:00Z'),
('tl_013', 'order_006', 'payment_confirmed', 'completed', '2024-01-25T14:31:00Z', 'Payment confirmed - Credit card', 'system', '2024-01-25T14:31:00Z'),
('tl_014', 'order_007', 'order_placed', 'completed', '2024-01-25T15:45:00Z', 'Order placed and payment received', 'cust_003', '2024-01-25T15:45:00Z'),
('tl_015', 'order_007', 'payment_confirmed', 'completed', '2024-01-25T15:46:00Z', 'Payment confirmed - Trade credit', 'system', '2024-01-25T15:46:00Z'),
('tl_016', 'order_007', 'processing', 'in_progress', '2024-01-25T16:00:00Z', 'Order being prepared for shipment', 'sup_001', '2024-01-25T16:00:00Z'),
('tl_017', 'order_008', 'order_placed', 'completed', '2024-01-26T09:15:00Z', 'Order placed and payment received', 'cust_001', '2024-01-26T09:15:00Z'),
('tl_018', 'order_008', 'payment_confirmed', 'completed', '2024-01-26T09:16:00Z', 'Payment confirmed - Debit card', 'system', '2024-01-26T09:16:00Z');

-- Seed Reviews
INSERT INTO reviews (review_id, order_id, customer_id, supplier_id, product_id, rating_overall, rating_product, rating_service, rating_delivery, review_text, photos, helpful_votes, verified_purchase, would_buy_again, is_anonymous, review_date, status, supplier_response, supplier_response_date, created_at, updated_at) VALUES
('rev_001', 'order_001', 'cust_001', 'sup_001', 'prod_001', 5, 5, 5, 5, 'Excellent quality lumber, arrived on time and in perfect condition. The delivery driver was professional and placed everything exactly where we needed it. Will definitely order again!', '["https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=800"]', 12, true, 'yes', false, '2024-01-24T10:00:00Z', 'published', 'Thank you so much for your kind review! We''re thrilled you had a great experience. Looking forward to serving you again!', '2024-01-24T14:00:00Z', '2024-01-24T10:00:00Z', '2024-01-24T14:00:00Z'),
('rev_002', 'order_001', 'cust_001', 'sup_001', 'prod_003', 5, 5, 5, 5, 'Top quality plywood sheets. No warping, clean cuts. Perfect for the cabinets we''re building.', '[]', 8, true, 'yes', false, '2024-01-24T10:15:00Z', 'published', NULL, NULL, '2024-01-24T10:15:00Z', '2024-01-24T10:15:00Z'),
('rev_003', 'order_004', 'cust_004', 'sup_002', 'prod_009', 4, 5, 4, 4, 'Great paint quality and coverage. Color was exactly what I wanted. Delivery was a day later than expected but the paint itself is excellent.', '["https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=800"]', 5, true, 'yes', false, '2024-01-25T09:00:00Z', 'published', 'We appreciate your feedback and apologize for the delay. We''re working on improving our delivery times. Glad you''re happy with the paint quality!', '2024-01-25T11:00:00Z', '2024-01-25T09:00:00Z', '2024-01-25T11:00:00Z');

-- Seed Review Votes
INSERT INTO review_votes (vote_id, review_id, user_id, is_helpful, created_at) VALUES
('rv_001', 'rev_001', 'user_002', true, '2024-01-24T11:00:00Z'),
('rv_002', 'rev_001', 'user_003', true, '2024-01-24T12:00:00Z'),
('rv_003', 'rev_001', 'user_005', true, '2024-01-24T15:00:00Z'),
('rv_004', 'rev_002', 'user_003', true, '2024-01-24T13:00:00Z'),
('rv_005', 'rev_003', 'user_001', true, '2024-01-25T10:00:00Z');

-- Seed Wishlist Items
INSERT INTO wishlist_items (wishlist_item_id, customer_id, product_id, added_date, price_when_saved, price_drop_alert_enabled, back_in_stock_alert_enabled, created_at, updated_at) VALUES
('wish_001', 'cust_001', 'prod_007', '2024-01-22T14:00:00Z', 189.99, true, true, '2024-01-22T14:00:00Z', '2024-01-22T14:00:00Z'),
('wish_002', 'cust_001', 'prod_010', '2024-01-23T09:00:00Z', 5.99, true, false, '2024-01-23T09:00:00Z', '2024-01-23T09:00:00Z'),
('wish_003', 'cust_002', 'prod_005', '2024-01-21T16:00:00Z', 4.99, true, true, '2024-01-21T16:00:00Z', '2024-01-21T16:00:00Z'),
('wish_004', 'cust_003', 'prod_004', '2024-01-24T11:00:00Z', 89.99, false, true, '2024-01-24T11:00:00Z', '2024-01-24T11:00:00Z'),
('wish_005', 'cust_004', 'prod_010', '2024-01-25T08:00:00Z', 5.99, true, true, '2024-01-25T08:00:00Z', '2024-01-25T08:00:00Z');

-- Seed Projects
INSERT INTO projects (project_id, customer_id, project_name, description, total_value, item_count, created_date, last_updated_date, created_at, updated_at) VALUES
('proj_001', 'cust_001', 'Main Street Office Renovation', 'Complete renovation of 5000 sq ft office space including flooring, drywall, and electrical', 45670.50, 8, '2024-01-18T10:00:00Z', '2024-01-25T14:00:00Z', '2024-01-18T10:00:00Z', '2024-01-25T14:00:00Z'),
('proj_002', 'cust_002', 'Residential Complex - Phase 2', 'Materials list for 12-unit residential building', 125800.00, 15, '2024-01-15T09:00:00Z', '2024-01-24T16:00:00Z', '2024-01-15T09:00:00Z', '2024-01-24T16:00:00Z'),
('proj_003', 'cust_003', 'Kitchen Remodel - Johnson Residence', 'Full kitchen renovation with custom cabinets', 18900.75, 6, '2024-01-20T11:00:00Z', '2024-01-25T10:00:00Z', '2024-01-20T11:00:00Z', '2024-01-25T10:00:00Z');

-- Seed Project Items
INSERT INTO project_items (project_item_id, project_id, product_id, quantity, created_at, updated_at) VALUES
('pi_001', 'proj_001', 'prod_001', 500, '2024-01-18T10:05:00Z', '2024-01-18T10:05:00Z'),
('pi_002', 'proj_001', 'prod_005', 200, '2024-01-18T10:10:00Z', '2024-01-18T10:10:00Z'),
('pi_003', 'proj_001', 'prod_010', 2500, '2024-01-18T10:15:00Z', '2024-01-18T10:15:00Z'),
('pi_004', 'proj_002', 'prod_001', 2000, '2024-01-15T09:05:00Z', '2024-01-15T09:05:00Z'),
('pi_005', 'proj_002', 'prod_003', 150, '2024-01-15T09:10:00Z', '2024-01-15T09:10:00Z'),
('pi_006', 'proj_003', 'prod_007', 4, '2024-01-20T11:05:00Z', '2024-01-20T11:05:00Z');

-- Seed Notifications
INSERT INTO notifications (notification_id, user_id, notification_type, title, message, related_entity_type, related_entity_id, action_url, created_date, is_read, read_at, delivered_via, created_at, updated_at) VALUES
('notif_001', 'user_001', 'order_update', 'Order Delivered', 'Your order ORD-2024-001 has been successfully delivered', 'order', 'order_001', '/orders/order_001', '2024-01-23T15:45:00Z', true, '2024-01-23T16:00:00Z', '["email", "push"]', '2024-01-23T15:45:00Z', '2024-01-23T16:00:00Z'),
('notif_002', 'user_002', 'order_update', 'Order Shipped', 'Your order ORD-2024-002 is now in transit', 'order', 'order_002', '/orders/order_002', '2024-01-24T08:00:00Z', true, '2024-01-24T09:00:00Z', '["email", "sms"]', '2024-01-24T08:00:00Z', '2024-01-24T09:00:00Z'),
('notif_003', 'user_004', 'promotion', 'Special Sale - 20% Off Paint', 'Don''t miss our weekend paint sale! Use code PAINT20', 'promotion', 'promo_001', '/promotions', '2024-01-25T08:00:00Z', false, NULL, '["push", "email"]', '2024-01-25T08:00:00Z', '2024-01-25T08:00:00Z'),
('notif_004', 'user_001', 'price_drop', 'Price Drop Alert', 'The Kohler Faucet in your wishlist is now $169.99', 'product', 'prod_007', '/products/prod_007', '2024-01-25T10:00:00Z', false, NULL, '["email"]', '2024-01-25T10:00:00Z', '2024-01-25T10:00:00Z'),
('notif_005', 'user_003', 'back_in_stock', 'Back in Stock', 'LED Light Bulbs are back in stock!', 'product', 'prod_005', '/products/prod_005', '2024-01-25T12:00:00Z', true, '2024-01-25T13:00:00Z', '["email", "push"]', '2024-01-25T12:00:00Z', '2024-01-25T13:00:00Z');

-- Seed Promotions
INSERT INTO promotions (promotion_id, supplier_id, promotion_name, promotion_type, discount_type, discount_value, applicable_products, applicable_categories, minimum_purchase_amount, maximum_discount_amount, promo_code, usage_limit_total, usage_limit_per_customer, usage_count, start_date, end_date, is_active, created_at, updated_at) VALUES
('promo_001', 'sup_002', 'Paint Weekend Sale', 'seasonal', 'percentage', 20, '["prod_009"]', '["cat_006"]', 100, 100, 'PAINT20', 500, 1, 34, '2024-01-25T00:00:00Z', '2024-01-28T23:59:59Z', true, '2024-01-20T10:00:00Z', '2024-01-25T08:00:00Z'),
('promo_002', 'sup_001', 'Lumber Bulk Discount', 'volume_discount', 'percentage', 15, NULL, '["cat_001"]', 1000, 500, 'LUMBER15', 1000, 5, 78, '2024-01-15T00:00:00Z', '2024-02-15T23:59:59Z', true, '2024-01-10T09:00:00Z', '2024-01-25T10:00:00Z'),
('promo_003', 'sup_004', 'First Order Discount', 'new_customer', 'percentage', 10, NULL, NULL, 50, 50, 'FIRST10', NULL, 1, 156, '2024-01-01T00:00:00Z', '2024-12-31T23:59:59Z', true, '2024-01-01T00:00:00Z', '2024-01-25T12:00:00Z'),
('promo_004', 'sup_005', 'Trade Customer Special', 'trade_exclusive', 'fixed', 25, NULL, '["cat_003"]', 500, NULL, 'TRADE25', NULL, 3, 45, '2024-01-20T00:00:00Z', '2024-02-20T23:59:59Z', true, '2024-01-15T10:00:00Z', '2024-01-25T13:00:00Z');

-- Seed Promo Code Usage
INSERT INTO promo_code_usage (usage_id, promotion_id, customer_id, order_id, discount_applied, used_date, created_at) VALUES
('pcu_001', 'promo_003', 'cust_001', 'order_001', 50.00, '2024-01-20T14:30:00Z', '2024-01-20T14:30:00Z'),
('pcu_002', 'promo_004', 'cust_004', 'order_004', 15.00, '2024-01-23T15:20:00Z', '2024-01-23T15:20:00Z');

-- Seed Surplus Listings
INSERT INTO surplus_listings (listing_id, seller_id, product_name, category_id, description, condition, photos, asking_price, original_price, price_type, quantity, pickup_location, pickup_instructions, shipping_available, shipping_rate, status, reason_for_selling, views_count, created_date, created_at, updated_at) VALUES
('slst_001', 'cust_001', 'Unused Brazilian Cherry Hardwood', 'cat_007', 'Left over from completed project. 250 sq ft of premium Brazilian cherry hardwood flooring. Never installed, still in original boxes.', 'new', '["https://images.unsplash.com/photo-1615971677499-5467cbab01c0?w=800", "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800"]', 1200, 1850, 'negotiable', 250, 'Austin, TX - North side', 'Call 30 minutes before pickup. Will help with loading.', true, 150, 'active', 'Project completed, material left over', 45, '2024-01-22T14:00:00Z', '2024-01-22T14:00:00Z', '2024-01-25T10:00:00Z'),
('slst_002', 'cust_002', 'Commercial Grade Door Hardware', 'cat_005', '50 sets of Schlage commercial door handles and locks. Removed during renovation. All in working condition.', 'used', '["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800"]', 750, 1200, 'fixed', 50, 'Houston, TX - Downtown', 'Industrial building, loading dock available', true, 75, 'active', 'Building renovation, upgraded to keyless entry', 28, '2024-01-23T10:00:00Z', '2024-01-23T10:00:00Z', '2024-01-25T11:00:00Z'),
('slst_003', 'cust_003', '2" PVC Pipes Bundle', 'cat_003', 'Bundle of 2" schedule 40 PVC pipes, various lengths from 5-10 feet. Total about 200 linear feet. Over-ordered for project.', 'new', '["https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=800"]', 180, 280, 'negotiable', 1, 'Dallas, TX - East Dallas', 'Pickup from residential location, street parking available', false, NULL, 'active', 'Over-ordered for project', 67, '2024-01-24T09:00:00Z', '2024-01-24T09:00:00Z', '2024-01-25T12:00:00Z');

-- Seed Surplus Offers
INSERT INTO surplus_offers (offer_id, listing_id, buyer_id, offer_amount, message, status, counter_offer_amount, created_date, created_at, updated_at) VALUES
('soff_001', 'slst_001', 'cust_004', 1050, 'Hi, I''m interested in the flooring. Would you accept $1050? I can pick up this weekend.', 'pending', NULL, '2024-01-24T15:00:00Z', '2024-01-24T15:00:00Z', '2024-01-24T15:00:00Z'),
('soff_002', 'slst_002', 'cust_005', 600, 'Interested in all 50 sets. Can you do $600?', 'countered', 700, '2024-01-24T11:00:00Z', '2024-01-24T11:00:00Z', '2024-01-24T16:00:00Z'),
('soff_003', 'slst_003', 'cust_001', 180, 'I''ll take it at asking price. Can pick up tomorrow.', 'accepted', NULL, '2024-01-25T08:00:00Z', '2024-01-25T08:00:00Z', '2024-01-25T09:00:00Z');

-- Seed Surplus Transactions
INSERT INTO surplus_transactions (transaction_id, listing_id, buyer_id, seller_id, final_price, payment_status, escrow_status, pickup_or_shipping, delivery_address_id, tracking_number, item_received_confirmed, received_confirmation_date, payment_released_date, buyer_rating, seller_rating, created_at, updated_at) VALUES
('strn_001', 'slst_003', 'cust_001', 'cust_003', 180, 'escrowed', 'held', 'pickup', NULL, NULL, false, NULL, NULL, NULL, NULL, '2024-01-25T09:30:00Z', '2024-01-25T09:30:00Z');

-- Seed Payouts
INSERT INTO payouts (payout_id, supplier_id, amount, status, scheduled_date, processed_date, transaction_reference, included_orders, platform_commission, net_amount, failure_reason, created_at, updated_at) VALUES
('pay_001', 'sup_001', 1320.48, 'completed', '2024-01-22T00:00:00Z', '2024-01-22T10:00:00Z', 'WIRE_20240122_001', '["order_001"]', 112.19, 1208.29, NULL, '2024-01-20T14:30:00Z', '2024-01-22T10:00:00Z'),
('pay_002', 'sup_002', 734.87, 'completed', '2024-01-25T00:00:00Z', '2024-01-25T09:00:00Z', 'WIRE_20240125_001', '["order_004"]', 62.39, 672.48, NULL, '2024-01-23T15:20:00Z', '2024-01-25T09:00:00Z'),
('pay_003', 'sup_003', 2899.22, 'scheduled', '2024-01-26T00:00:00Z', NULL, NULL, '["order_002"]', 261.00, 2638.22, NULL, '2024-01-21T10:15:00Z', '2024-01-25T10:00:00Z');

-- Seed Financial Transactions
INSERT INTO financial_transactions (transaction_id, supplier_id, order_id, transaction_type, amount, commission_amount, net_amount, description, transaction_date, created_at) VALUES
('ftxn_001', 'sup_001', 'order_001', 'order_payment', 1320.48, 112.19, 1208.29, 'Payment for order ORD-2024-001', '2024-01-20T14:31:00Z', '2024-01-20T14:31:00Z'),
('ftxn_002', 'sup_002', 'order_002', 'order_payment', 2899.22, 261.00, 2638.22, 'Payment for order ORD-2024-002', '2024-01-21T10:16:00Z', '2024-01-21T10:16:00Z'),
('ftxn_003', 'sup_004', 'order_003', 'order_payment', 668.67, 53.49, 615.18, 'Payment for order ORD-2024-003', '2024-01-22T09:46:00Z', '2024-01-22T09:46:00Z'),
('ftxn_004', 'sup_002', 'order_004', 'order_payment', 434.08, 36.88, 397.20, 'Payment for order ORD-2024-004', '2024-01-23T15:21:00Z', '2024-01-23T15:21:00Z'),
('ftxn_005', 'sup_005', 'order_005', 'order_payment', 1808.71, 153.74, 1654.97, 'Payment for order ORD-2024-005', '2024-01-24T11:31:00Z', '2024-01-24T11:31:00Z');

-- Seed Inventory Logs
INSERT INTO inventory_logs (log_id, product_id, supplier_id, change_type, quantity_before, quantity_change, quantity_after, reason, reference_id, performed_by, timestamp, created_at) VALUES
('invlog_001', 'prod_001', 'sup_001', 'sale', 950, -100, 850, 'Sold via order', 'order_001', 'user_006', '2024-01-20T14:30:00Z', '2024-01-20T14:30:00Z'),
('invlog_002', 'prod_003', 'sup_002', 'sale', 395, -10, 385, 'Sold via order', 'order_001', 'user_007', '2024-01-20T14:30:00Z', '2024-01-20T14:30:00Z'),
('invlog_003', 'prod_010', 'sup_003', 'sale', 3450, -600, 2850, 'Sold via order', 'order_002', 'user_008', '2024-01-21T10:15:00Z', '2024-01-21T10:15:00Z'),
('invlog_004', 'prod_005', 'sup_004', 'sale', 1350, -100, 1250, 'Sold via order', 'order_003', 'user_009', '2024-01-22T09:45:00Z', '2024-01-22T09:45:00Z'),
('invlog_005', 'prod_001', 'sup_001', 'restock', 850, 200, 1050, 'Regular restock from warehouse', NULL, 'user_006', '2024-01-24T08:00:00Z', '2024-01-24T08:00:00Z');

-- Seed Search History
INSERT INTO search_history (search_id, user_id, search_query, filters_applied, results_count, clicked_product_id, search_timestamp, created_at) VALUES
('srch_001', 'user_001', 'lumber 2x4', '{"category": "cat_001", "supplier": "sup_001"}', 8, 'prod_001', '2024-01-19T10:00:00Z', '2024-01-19T10:00:00Z'),
('srch_002', 'user_002', 'hardwood flooring', '{"category": "cat_007", "price_max": 7.00}', 5, 'prod_010', '2024-01-20T14:00:00Z', '2024-01-20T14:00:00Z'),
('srch_003', 'user_003', 'led bulbs', '{"brand": "Philips"}', 12, 'prod_005', '2024-01-21T11:00:00Z', '2024-01-21T11:00:00Z'),
('srch_004', 'user_004', 'paint interior', '{"category": "cat_006"}', 15, 'prod_009', '2024-01-22T15:00:00Z', '2024-01-22T15:00:00Z'),
('srch_005', NULL, 'plumbing faucet', '{}', 24, 'prod_007', '2024-01-23T09:00:00Z', '2024-01-23T09:00:00Z');

-- Seed Product Views
INSERT INTO product_views (view_id, product_id, user_id, session_id, referrer, view_timestamp, time_spent_seconds, created_at) VALUES
('pv_001', 'prod_001', 'user_001', 'sess_12345', 'search', '2024-01-19T10:05:00Z', 145, '2024-01-19T10:05:00Z'),
('pv_002', 'prod_003', 'user_001', 'sess_12345', 'related_products', '2024-01-19T10:10:00Z', 89, '2024-01-19T10:10:00Z'),
('pv_003', 'prod_010', 'user_002', 'sess_23456', 'search', '2024-01-20T14:05:00Z', 234, '2024-01-20T14:05:00Z'),
('pv_004', 'prod_005', 'user_003', 'sess_34567', 'category_browse', '2024-01-21T11:05:00Z', 67, '2024-01-21T11:05:00Z'),
('pv_005', 'prod_009', 'user_004', 'sess_45678', 'search', '2024-01-22T15:05:00Z', 198, '2024-01-22T15:05:00Z');

-- Seed Support Tickets
INSERT INTO support_tickets (ticket_id, user_id, order_id, issue_category, subject, message, attachments, status, priority, assigned_admin_id, created_date, last_updated_date, resolved_date, customer_satisfaction_rating, created_at, updated_at) VALUES
('tkt_001', 'user_001', 'order_001', 'delivery', 'Delivery scheduled outside requested window', 'I requested delivery between 1-3 PM but it was scheduled for 2-6 PM. Can this be adjusted?', '[]', 'resolved', 'normal', 'admin_002', '2024-01-21T10:00:00Z', '2024-01-21T14:00:00Z', '2024-01-21T14:00:00Z', 5, '2024-01-21T10:00:00Z', '2024-01-21T14:00:00Z'),
('tkt_002', 'user_004', 'order_004', 'product_quality', 'One paint can arrived damaged', 'One of the paint cans in my order has a dented lid and some paint leaked. Can I get a replacement?', '["https://images.unsplash.com/photo-1587293852726-70cdb56c2866?w=800"]', 'resolved', 'high', 'admin_002', '2024-01-24T09:00:00Z', '2024-01-24T16:00:00Z', '2024-01-24T16:00:00Z', 4, '2024-01-24T09:00:00Z', '2024-01-24T16:00:00Z'),
('tkt_003', 'user_002', NULL, 'account', 'Unable to update credit limit', 'I''m trying to increase my trade credit limit but the form isn''t working. Getting an error message.', '["https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800"]', 'open', 'normal', 'admin_002', '2024-01-25T11:00:00Z', '2024-01-25T11:00:00Z', NULL, NULL, '2024-01-25T11:00:00Z', '2024-01-25T11:00:00Z');

-- Seed Ticket Responses
INSERT INTO ticket_responses (response_id, ticket_id, responder_id, responder_type, message, attachments, is_internal_note, timestamp, created_at) VALUES
('tr_001', 'tkt_001', 'user_011', 'admin', 'Thank you for reaching out. I''ve contacted the delivery team and they''ve adjusted your delivery window to 1-3 PM as requested. You should receive a confirmation email shortly.', '[]', false, '2024-01-21T11:00:00Z', '2024-01-21T11:00:00Z'),
('tr_002', 'tkt_001', 'user_001', 'customer', 'Perfect, thank you so much for the quick resolution!', '[]', false, '2024-01-21T11:30:00Z', '2024-01-21T11:30:00Z'),
('tr_003', 'tkt_002', 'user_012', 'admin', 'I''m sorry to hear about the damaged can. I''ve processed a replacement which will be delivered tomorrow at no charge. You can keep the damaged can for touch-ups if needed.', '[]', false, '2024-01-24T10:00:00Z', '2024-01-24T10:00:00Z'),
('tr_004', 'tkt_002', 'user_004', 'customer', 'Thank you! That''s great service.', '[]', false, '2024-01-24T10:30:00Z', '2024-01-24T10:30:00Z'),
('tr_005', 'tkt_003', 'user_012', 'admin', 'We''re looking into the technical issue with the credit limit form. I''ll escalate this to our tech team and get back to you within 24 hours.', '[]', false, '2024-01-25T12:00:00Z', '2024-01-25T12:00:00Z');

-- Seed Supplier Applications
INSERT INTO supplier_applications (application_id, user_id, business_name, business_registration_number, business_type, contact_person_name, business_address, business_description, submitted_documents, application_status, assigned_reviewer_id, verification_checklist, rejection_reason, submitted_date, reviewed_date, approved_date, created_at, updated_at) VALUES
('app_001', 'user_006', 'Acme Building Supply Co', 'EIN-123456789', 'Corporation', 'James Anderson', '100 Distribution Way, Austin, TX 78703', 'Leading supplier of construction materials', '{"business_license": "doc_001", "insurance": "doc_002"}', 'approved', 'admin_001', '{"business_license": true, "insurance": true, "tax_id": true, "background_check": true}', NULL, '2024-01-05T10:00:00Z', '2024-01-08T14:00:00Z', '2024-01-10T09:00:00Z', '2024-01-05T10:00:00Z', '2024-01-10T09:00:00Z'),
('app_002', 'user_007', 'BuildPro Materials Inc', 'EIN-234567890', 'LLC', 'Lisa Taylor', '200 Supply Rd, Houston, TX 77002', 'Premium building materials', '{"business_license": "doc_004", "insurance": "doc_005"}', 'approved', 'admin_001', '{"business_license": true, "insurance": true, "tax_id": true, "background_check": true}', NULL, '2024-01-06T11:00:00Z', '2024-01-09T15:00:00Z', '2024-01-11T10:00:00Z', '2024-01-06T11:00:00Z', '2024-01-11T10:00:00Z');

-- Seed Admin Activity Logs
INSERT INTO admin_activity_logs (log_id, admin_id, action_type, action_description, affected_entity_type, affected_entity_id, previous_values, new_values, ip_address, user_agent, timestamp, created_at) VALUES
('alog_001', 'admin_001', 'supplier_approval', 'Approved supplier application', 'supplier_application', 'app_001', '{"status": "pending_review"}', '{"status": "approved"}', '192.168.1.100', 'Mozilla/5.0', '2024-01-10T09:00:00Z', '2024-01-10T09:00:00Z'),
('alog_002', 'admin_001', 'supplier_approval', 'Approved supplier application', 'supplier_application', 'app_002', '{"status": "under_review"}', '{"status": "approved"}', '192.168.1.100', 'Mozilla/5.0', '2024-01-11T10:00:00Z', '2024-01-11T10:00:00Z'),
('alog_003', 'admin_002', 'issue_resolution', 'Resolved customer support ticket', 'support_ticket', 'tkt_001', '{"status": "open"}', '{"status": "resolved"}', '192.168.1.101', 'Mozilla/5.0', '2024-01-21T14:00:00Z', '2024-01-21T14:00:00Z'),
('alog_004', 'admin_002', 'issue_resolution', 'Resolved product quality issue', 'support_ticket', 'tkt_002', '{"status": "open"}', '{"status": "resolved"}', '192.168.1.101', 'Mozilla/5.0', '2024-01-24T16:00:00Z', '2024-01-24T16:00:00Z');

-- Seed Flagged Content
INSERT INTO flagged_content (flag_id, content_type, content_id, flagged_by_user_id, flag_reason, description, status, reviewed_by_admin_id, admin_action, admin_notes, flagged_date, reviewed_date, created_at, updated_at) VALUES
('flag_001', 'review', 'rev_003', 'user_001', 'inappropriate', 'Review contains potentially false claims about delivery times', 'reviewed', 'admin_002', 'no_action', 'Review checked - claims are substantiated and within acceptable range of criticism', '2024-01-25T14:00:00Z', '2024-01-25T16:00:00Z', '2024-01-25T14:00:00Z', '2024-01-25T16:00:00Z');

-- Seed Platform Settings
INSERT INTO platform_settings (setting_id, setting_key, setting_value, setting_category, description, last_updated_by, created_at, updated_at) VALUES
('set_001', 'commission_rate_default', '{"value": 8.5, "unit": "percentage"}', 'financial', 'Default commission rate for new suppliers', 'admin_001', '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z'),
('set_002', 'free_delivery_threshold', '{"value": 300, "currency": "USD"}', 'delivery', 'Minimum order value for free delivery', 'admin_001', '2024-01-01T00:00:00Z', '2024-01-15T10:00:00Z'),
('set_003', 'trade_credit_default_terms', '{"value": 30, "unit": "days"}', 'financial', 'Default payment terms for trade customers', 'admin_003', '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z'),
('set_004', 'max_wishlist_items', '{"value": 100}', 'user_limits', 'Maximum number of items a user can add to wishlist', 'admin_001', '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z');

-- Seed Delivery Zones
INSERT INTO delivery_zones (zone_id, supplier_id, zone_name, postal_codes, radius_miles, center_latitude, center_longitude, created_at, updated_at) VALUES
('zone_001', 'sup_001', 'Austin Metro', '["78701", "78702", "78703", "78704", "78705"]', 25, 30.2672, -97.7431, '2024-01-10T09:00:00Z', '2024-01-10T09:00:00Z'),
('zone_002', 'sup_001', 'Greater Austin', '["78717", "78729", "78750", "78759"]', 50, 30.2672, -97.7431, '2024-01-10T09:00:00Z', '2024-01-10T09:00:00Z'),
('zone_003', 'sup_002', 'Houston Central', '["77001", "77002", "77003", "77004"]', 30, 29.7604, -95.3698, '2024-01-11T10:00:00Z', '2024-01-11T10:00:00Z'),
('zone_004', 'sup_004', 'Austin/Round Rock', '["78701", "78681", "78665"]', 35, 30.2672, -97.7431, '2024-01-13T12:00:00Z', '2024-01-13T12:00:00Z');

-- Seed Chat Conversations
INSERT INTO chat_conversations (conversation_id, customer_id, supplier_id, admin_id, conversation_type, related_entity_type, related_entity_id, status, last_message_at, created_at, updated_at) VALUES
('conv_001', 'cust_001', 'sup_001', NULL, 'customer_supplier', 'order', 'order_001', 'closed', '2024-01-20T16:00:00Z', '2024-01-20T14:00:00Z', '2024-01-20T16:00:00Z'),
('conv_002', 'cust_002', 'sup_003', NULL, 'customer_supplier', 'product', 'prod_010', 'active', '2024-01-25T10:00:00Z', '2024-01-24T09:00:00Z', '2024-01-25T10:00:00Z'),
('conv_003', 'cust_004', NULL, 'admin_002', 'customer_support', 'ticket', 'tkt_002', 'closed', '2024-01-24T11:00:00Z', '2024-01-24T09:00:00Z', '2024-01-24T11:00:00Z');

-- Seed Chat Messages
INSERT INTO chat_messages (message_id, conversation_id, sender_id, sender_type, message_text, attachments, is_read, read_at, timestamp, created_at) VALUES
('msg_001', 'conv_001', 'user_001', 'customer', 'Hi, can you confirm the delivery time for my order?', '[]', true, '2024-01-20T14:05:00Z', '2024-01-20T14:00:00Z', '2024-01-20T14:00:00Z'),
('msg_002', 'conv_001', 'user_006', 'supplier', 'Yes, we''re scheduled for delivery tomorrow between 2-6 PM. Driver will call 30 minutes before arrival.', '[]', true, '2024-01-20T14:10:00Z', '2024-01-20T14:08:00Z', '2024-01-20T14:08:00Z'),
('msg_003', 'conv_001', 'user_001', 'customer', 'Perfect, thank you!', '[]', true, '2024-01-20T14:15:00Z', '2024-01-20T14:12:00Z', '2024-01-20T14:12:00Z'),
('msg_004', 'conv_002', 'user_002', 'customer', 'Do you have this flooring in stock for immediate delivery?', '[]', true, '2024-01-24T09:00:00Z', '2024-01-24T09:00:00Z', '2024-01-24T09:00:00Z'),
('msg_005', 'conv_002', 'user_008', 'supplier', 'Yes, we have 2,850 sq ft in stock. We can deliver as early as tomorrow.', '[]', true, '2024-01-24T09:30:00Z', '2024-01-24T09:15:00Z', '2024-01-24T09:15:00Z');

-- Seed Issues
INSERT INTO issues (issue_id, order_id, customer_id, supplier_id, issue_type, affected_items, status, description, evidence_photos, desired_resolution, resolution_offered, resolution_amount, resolution_accepted, resolution_accepted_date, opened_date, resolved_date, escalated_to_admin, assigned_admin_id, created_at, updated_at) VALUES
('issue_001', 'order_004', 'cust_004', 'sup_002', 'damaged_product', '["oi_008"]', 'resolved', 'One paint can arrived with a dented lid and leaked paint', '["https://images.unsplash.com/photo-1587293852726-70cdb56c2866?w=800"]', 'replacement', 'Free replacement sent with expedited shipping', 42.99, true, '2024-01-24T11:00:00Z', '2024-01-24T09:00:00Z', '2024-01-24T16:00:00Z', false, NULL, '2024-01-24T09:00:00Z', '2024-01-24T16:00:00Z');

-- Seed Issue Messages
INSERT INTO issue_messages (message_id, issue_id, sender_id, sender_type, message_text, attachments, timestamp, created_at) VALUES
('imsg_001', 'issue_001', 'user_004', 'customer', 'One of my paint cans was damaged during delivery. The lid is dented and some paint leaked out.', '["https://images.unsplash.com/photo-1587293852726-70cdb56c2866?w=800"]', '2024-01-24T09:00:00Z', '2024-01-24T09:00:00Z'),
('imsg_002', 'issue_001', 'user_007', 'supplier', 'We apologize for the inconvenience. We''re sending a replacement can via expedited shipping at no charge. You should receive it tomorrow.', '[]', '2024-01-24T10:00:00Z', '2024-01-24T10:00:00Z'),
('imsg_003', 'issue_001', 'user_004', 'customer', 'Thank you! That works perfectly.', '[]', '2024-01-24T10:30:00Z', '2024-01-24T10:30:00Z');