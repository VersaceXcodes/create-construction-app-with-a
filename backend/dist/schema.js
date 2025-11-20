import { z } from 'zod';
// ============================================
// USER SCHEMAS
// ============================================
export const userSchema = z.object({
    user_id: z.string(),
    email: z.string().email(),
    password_hash: z.string(),
    user_type: z.enum(['customer', 'supplier', 'admin']),
    first_name: z.string().nullable(),
    last_name: z.string().nullable(),
    phone_number: z.string().nullable(),
    profile_photo_url: z.string().url().nullable(),
    registration_date: z.coerce.date(),
    last_login_date: z.coerce.date().nullable(),
    status: z.enum(['active', 'inactive', 'suspended']),
    email_verified: z.boolean(),
    email_verification_token: z.string().nullable(),
    password_reset_token: z.string().nullable(),
    password_reset_expires: z.coerce.date().nullable(),
    created_at: z.coerce.date(),
    updated_at: z.coerce.date()
});
export const createUserInputSchema = z.object({
    email: z.string().email().min(1).max(255),
    password: z.string().min(8).max(100),
    user_type: z.enum(['customer', 'supplier', 'admin']),
    first_name: z.string().min(1).max(255).nullable(),
    last_name: z.string().min(1).max(255).nullable(),
    phone_number: z.string().max(50).nullable(),
    profile_photo_url: z.string().url().nullable()
});
export const updateUserInputSchema = z.object({
    user_id: z.string(),
    email: z.string().email().min(1).max(255).optional(),
    first_name: z.string().min(1).max(255).nullable().optional(),
    last_name: z.string().min(1).max(255).nullable().optional(),
    phone_number: z.string().max(50).nullable().optional(),
    profile_photo_url: z.string().url().nullable().optional(),
    status: z.enum(['active', 'inactive', 'suspended']).optional()
});
export const searchUserInputSchema = z.object({
    query: z.string().optional(),
    user_type: z.enum(['customer', 'supplier', 'admin']).optional(),
    status: z.enum(['active', 'inactive', 'suspended']).optional(),
    email_verified: z.boolean().optional(),
    limit: z.number().int().positive().default(50),
    offset: z.number().int().nonnegative().default(0),
    sort_by: z.enum(['created_at', 'email', 'last_login_date']).default('created_at'),
    sort_order: z.enum(['asc', 'desc']).default('desc')
});
// ============================================
// ADDRESS SCHEMAS
// ============================================
export const addressSchema = z.object({
    address_id: z.string(),
    user_id: z.string(),
    label: z.string().nullable(),
    full_name: z.string(),
    phone_number: z.string(),
    street_address: z.string(),
    apt_suite: z.string().nullable(),
    city: z.string(),
    state: z.string(),
    postal_code: z.string(),
    country: z.string(),
    address_type: z.string().nullable(),
    delivery_instructions: z.string().nullable(),
    is_default: z.boolean(),
    latitude: z.number().nullable(),
    longitude: z.number().nullable(),
    created_at: z.coerce.date(),
    updated_at: z.coerce.date()
});
export const createAddressInputSchema = z.object({
    user_id: z.string(),
    label: z.string().max(100).nullable(),
    full_name: z.string().min(1).max(255),
    phone_number: z.string().min(1).max(50),
    street_address: z.string().min(1).max(500),
    apt_suite: z.string().max(100).nullable(),
    city: z.string().min(1).max(100),
    state: z.string().min(1).max(100),
    postal_code: z.string().min(1).max(20),
    country: z.string().min(1).max(100),
    address_type: z.enum(['residential', 'commercial', 'warehouse']).nullable(),
    delivery_instructions: z.string().max(500).nullable(),
    is_default: z.boolean().default(false),
    latitude: z.number().min(-90).max(90).nullable(),
    longitude: z.number().min(-180).max(180).nullable()
});
export const updateAddressInputSchema = z.object({
    address_id: z.string(),
    label: z.string().max(100).nullable().optional(),
    full_name: z.string().min(1).max(255).optional(),
    phone_number: z.string().min(1).max(50).optional(),
    street_address: z.string().min(1).max(500).optional(),
    apt_suite: z.string().max(100).nullable().optional(),
    city: z.string().min(1).max(100).optional(),
    state: z.string().min(1).max(100).optional(),
    postal_code: z.string().min(1).max(20).optional(),
    address_type: z.enum(['residential', 'commercial', 'warehouse']).nullable().optional(),
    delivery_instructions: z.string().max(500).nullable().optional(),
    is_default: z.boolean().optional(),
    latitude: z.number().min(-90).max(90).nullable().optional(),
    longitude: z.number().min(-180).max(180).nullable().optional()
});
export const searchAddressInputSchema = z.object({
    user_id: z.string().optional(),
    address_type: z.enum(['residential', 'commercial', 'warehouse']).optional(),
    is_default: z.boolean().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postal_code: z.string().optional(),
    limit: z.number().int().positive().default(50),
    offset: z.number().int().nonnegative().default(0)
});
// ============================================
// CATEGORY SCHEMAS
// ============================================
export const categorySchema = z.object({
    category_id: z.string(),
    parent_category_id: z.string().nullable(),
    category_name: z.string(),
    category_slug: z.string(),
    description: z.string().nullable(),
    icon_url: z.string().nullable(),
    display_order: z.number(),
    is_active: z.boolean(),
    created_at: z.coerce.date(),
    updated_at: z.coerce.date()
});
export const createCategoryInputSchema = z.object({
    category_name: z.string().min(1).max(255),
    category_slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/),
    parent_category_id: z.string().nullable(),
    description: z.string().max(1000).nullable(),
    icon_url: z.string().url().nullable(),
    display_order: z.number().int().nonnegative().default(0),
    is_active: z.boolean().default(true)
});
export const updateCategoryInputSchema = z.object({
    category_id: z.string(),
    category_name: z.string().min(1).max(255).optional(),
    category_slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/).optional(),
    parent_category_id: z.string().nullable().optional(),
    description: z.string().max(1000).nullable().optional(),
    icon_url: z.string().url().nullable().optional(),
    display_order: z.number().int().nonnegative().optional(),
    is_active: z.boolean().optional()
});
export const searchCategoryInputSchema = z.object({
    query: z.string().optional(),
    parent_category_id: z.string().optional(),
    is_active: z.boolean().optional(),
    limit: z.number().int().positive().default(100),
    offset: z.number().int().nonnegative().default(0),
    sort_by: z.enum(['display_order', 'category_name', 'created_at']).default('display_order'),
    sort_order: z.enum(['asc', 'desc']).default('asc')
});
// ============================================
// CUSTOMER SCHEMAS
// ============================================
export const customerSchema = z.object({
    customer_id: z.string(),
    user_id: z.string(),
    account_type: z.enum(['retail', 'trade']),
    default_delivery_address_id: z.string().nullable(),
    trade_credit_limit: z.number().nullable(),
    trade_credit_balance: z.number().nullable(),
    trade_credit_used: z.number().nullable(),
    trade_credit_terms: z.string().nullable(),
    trade_credit_status: z.enum(['approved', 'pending', 'rejected', 'suspended']).nullable(),
    preferred_brands: z.array(z.string()).nullable(),
    preferred_suppliers: z.array(z.string()).nullable(),
    preferred_categories: z.array(z.string()).nullable(),
    notification_preferences: z.object({
        email: z.boolean(),
        sms: z.boolean(),
        push: z.boolean(),
        order_updates: z.boolean(),
        promotions: z.boolean()
    }),
    onboarding_completed: z.boolean(),
    created_at: z.coerce.date(),
    updated_at: z.coerce.date()
});
export const createCustomerInputSchema = z.object({
    user_id: z.string(),
    account_type: z.enum(['retail', 'trade']),
    default_delivery_address_id: z.string().nullable(),
    trade_credit_limit: z.number().nonnegative().nullable(),
    trade_credit_terms: z.string().max(500).nullable(),
    preferred_brands: z.array(z.string()).nullable(),
    preferred_suppliers: z.array(z.string()).nullable(),
    preferred_categories: z.array(z.string()).nullable(),
    notification_preferences: z.object({
        email: z.boolean().default(true),
        sms: z.boolean().default(true),
        push: z.boolean().default(true),
        order_updates: z.boolean().default(true),
        promotions: z.boolean().default(true)
    }).default({
        email: true,
        sms: true,
        push: true,
        order_updates: true,
        promotions: true
    })
});
export const updateCustomerInputSchema = z.object({
    customer_id: z.string(),
    account_type: z.enum(['retail', 'trade']).optional(),
    default_delivery_address_id: z.string().nullable().optional(),
    trade_credit_limit: z.number().nonnegative().nullable().optional(),
    trade_credit_terms: z.string().max(500).nullable().optional(),
    trade_credit_status: z.enum(['approved', 'pending', 'rejected', 'suspended']).nullable().optional(),
    preferred_brands: z.array(z.string()).nullable().optional(),
    preferred_suppliers: z.array(z.string()).nullable().optional(),
    preferred_categories: z.array(z.string()).nullable().optional(),
    notification_preferences: z.object({
        email: z.boolean(),
        sms: z.boolean(),
        push: z.boolean(),
        order_updates: z.boolean(),
        promotions: z.boolean()
    }).optional(),
    onboarding_completed: z.boolean().optional()
});
export const searchCustomerInputSchema = z.object({
    query: z.string().optional(),
    account_type: z.enum(['retail', 'trade']).optional(),
    trade_credit_status: z.enum(['approved', 'pending', 'rejected', 'suspended']).optional(),
    onboarding_completed: z.boolean().optional(),
    limit: z.number().int().positive().default(50),
    offset: z.number().int().nonnegative().default(0),
    sort_by: z.enum(['created_at', 'trade_credit_limit']).default('created_at'),
    sort_order: z.enum(['asc', 'desc']).default('desc')
});
// ============================================
// SUPPLIER SCHEMAS
// ============================================
export const supplierSchema = z.object({
    supplier_id: z.string(),
    user_id: z.string(),
    business_name: z.string(),
    business_registration_number: z.string().nullable(),
    business_type: z.string(),
    business_description: z.string().nullable(),
    logo_url: z.string().nullable(),
    cover_photo_url: z.string().nullable(),
    verification_status: z.enum(['pending', 'verified', 'rejected']),
    verification_documents: z.record(z.string()).nullable(),
    rating_average: z.number(),
    total_reviews: z.number(),
    total_sales: z.number(),
    total_orders: z.number(),
    fulfillment_rate: z.number(),
    response_time_average: z.number().nullable(),
    bank_account_info: z.string().nullable(),
    payout_frequency: z.enum(['weekly', 'bi-weekly', 'monthly']),
    commission_rate: z.number(),
    subscription_plan: z.enum(['basic', 'standard', 'premium']),
    operating_hours: z.record(z.string()).nullable(),
    service_areas: z.array(z.string()).nullable(),
    return_policy: z.string().nullable(),
    shipping_policy: z.string().nullable(),
    minimum_order_value: z.number().nullable(),
    status: z.enum(['active', 'inactive', 'suspended']),
    onboarding_completed: z.boolean(),
    member_since: z.coerce.date(),
    created_at: z.coerce.date(),
    updated_at: z.coerce.date()
});
export const createSupplierInputSchema = z.object({
    user_id: z.string(),
    business_name: z.string().min(1).max(255),
    business_registration_number: z.string().max(255).nullable(),
    business_type: z.enum(['Corporation', 'LLC', 'Partnership', 'Sole Proprietorship']),
    business_description: z.string().max(2000).nullable(),
    logo_url: z.string().url().nullable(),
    cover_photo_url: z.string().url().nullable(),
    commission_rate: z.number().min(0).max(100),
    subscription_plan: z.enum(['basic', 'standard', 'premium']),
    payout_frequency: z.enum(['weekly', 'bi-weekly', 'monthly']).default('monthly'),
    operating_hours: z.record(z.string()).nullable(),
    service_areas: z.array(z.string()).nullable(),
    return_policy: z.string().max(2000).nullable(),
    shipping_policy: z.string().max(2000).nullable(),
    minimum_order_value: z.number().nonnegative().nullable()
});
export const updateSupplierInputSchema = z.object({
    supplier_id: z.string(),
    business_name: z.string().min(1).max(255).optional(),
    business_description: z.string().max(2000).nullable().optional(),
    logo_url: z.string().url().nullable().optional(),
    cover_photo_url: z.string().url().nullable().optional(),
    verification_status: z.enum(['pending', 'verified', 'rejected']).optional(),
    payout_frequency: z.enum(['weekly', 'bi-weekly', 'monthly']).optional(),
    commission_rate: z.number().min(0).max(100).optional(),
    subscription_plan: z.enum(['basic', 'standard', 'premium']).optional(),
    operating_hours: z.record(z.string()).nullable().optional(),
    service_areas: z.array(z.string()).nullable().optional(),
    return_policy: z.string().max(2000).nullable().optional(),
    shipping_policy: z.string().max(2000).nullable().optional(),
    minimum_order_value: z.number().nonnegative().nullable().optional(),
    status: z.enum(['active', 'inactive', 'suspended']).optional(),
    onboarding_completed: z.boolean().optional()
});
export const searchSupplierInputSchema = z.object({
    query: z.string().optional(),
    business_type: z.enum(['Corporation', 'LLC', 'Partnership', 'Sole Proprietorship']).optional(),
    verification_status: z.enum(['pending', 'verified', 'rejected']).optional(),
    status: z.enum(['active', 'inactive', 'suspended']).optional(),
    subscription_plan: z.enum(['basic', 'standard', 'premium']).optional(),
    min_rating: z.number().min(0).max(5).optional(),
    service_area: z.string().optional(),
    limit: z.number().int().positive().default(50),
    offset: z.number().int().nonnegative().default(0),
    sort_by: z.enum(['rating_average', 'total_sales', 'created_at', 'business_name']).default('rating_average'),
    sort_order: z.enum(['asc', 'desc']).default('desc')
});
// ============================================
// ADMIN SCHEMAS
// ============================================
export const adminSchema = z.object({
    admin_id: z.string(),
    user_id: z.string(),
    role: z.string(),
    permissions: z.record(z.any()),
    created_at: z.coerce.date(),
    updated_at: z.coerce.date()
});
export const createAdminInputSchema = z.object({
    user_id: z.string(),
    role: z.enum(['super_admin', 'support_admin', 'finance_admin', 'content_admin']),
    permissions: z.record(z.any())
});
export const updateAdminInputSchema = z.object({
    admin_id: z.string(),
    role: z.enum(['super_admin', 'support_admin', 'finance_admin', 'content_admin']).optional(),
    permissions: z.record(z.any()).optional()
});
// ============================================
// PRODUCT SCHEMAS
// ============================================
export const productSchema = z.object({
    product_id: z.string(),
    supplier_id: z.string(),
    category_id: z.string(),
    sku: z.string(),
    product_name: z.string(),
    description: z.string().nullable(),
    key_features: z.array(z.string()).nullable(),
    specifications: z.record(z.any()).nullable(),
    price_per_unit: z.number(),
    unit_of_measure: z.string(),
    bulk_pricing: z.record(z.number()).nullable(),
    cost_price: z.number().nullable(),
    stock_quantity: z.number(),
    low_stock_threshold: z.number(),
    last_updated_timestamp: z.coerce.date(),
    expected_restock_date: z.coerce.date().nullable(),
    images: z.array(z.string()).nullable(),
    primary_image_url: z.string().nullable(),
    status: z.enum(['active', 'inactive', 'out_of_stock', 'discontinued']),
    is_featured: z.boolean(),
    tags: z.array(z.string()).nullable(),
    brand: z.string().nullable(),
    dimensions: z.record(z.any()).nullable(),
    weight: z.number().nullable(),
    material: z.string().nullable(),
    compliance_certifications: z.array(z.string()).nullable(),
    warranty_information: z.string().nullable(),
    minimum_order_quantity: z.number(),
    maximum_order_quantity: z.number().nullable(),
    available_delivery_methods: z.array(z.string()).nullable(),
    handling_time_days: z.number(),
    views_count: z.number(),
    sales_count: z.number(),
    creation_date: z.coerce.date(),
    searchable: z.boolean(),
    customer_type_availability: z.enum(['all', 'retail', 'trade']),
    created_at: z.coerce.date(),
    updated_at: z.coerce.date()
});
export const createProductInputSchema = z.object({
    supplier_id: z.string(),
    category_id: z.string(),
    sku: z.string().min(1).max(255),
    product_name: z.string().min(1).max(255),
    description: z.string().max(5000).nullable(),
    key_features: z.array(z.string().max(500)).max(20).nullable(),
    specifications: z.record(z.any()).nullable(),
    price_per_unit: z.number().positive(),
    unit_of_measure: z.string().min(1).max(50),
    bulk_pricing: z.record(z.number().positive()).nullable(),
    cost_price: z.number().positive().nullable(),
    stock_quantity: z.number().int().nonnegative().default(0),
    low_stock_threshold: z.number().int().nonnegative().default(10),
    expected_restock_date: z.coerce.date().nullable(),
    images: z.array(z.string().url()).max(10).nullable(),
    primary_image_url: z.string().url().nullable(),
    status: z.enum(['active', 'inactive', 'out_of_stock', 'discontinued']).default('active'),
    is_featured: z.boolean().default(false),
    tags: z.array(z.string().max(50)).max(20).nullable(),
    brand: z.string().max(255).nullable(),
    dimensions: z.record(z.any()).nullable(),
    weight: z.number().positive().nullable(),
    material: z.string().max(255).nullable(),
    compliance_certifications: z.array(z.string().max(100)).nullable(),
    warranty_information: z.string().max(1000).nullable(),
    minimum_order_quantity: z.number().int().positive().default(1),
    maximum_order_quantity: z.number().int().positive().nullable(),
    available_delivery_methods: z.array(z.string()).nullable(),
    handling_time_days: z.number().int().positive().default(1),
    searchable: z.boolean().default(true),
    customer_type_availability: z.enum(['all', 'retail', 'trade']).default('all')
});
export const updateProductInputSchema = z.object({
    product_id: z.string(),
    category_id: z.string().optional(),
    product_name: z.string().min(1).max(255).optional(),
    description: z.string().max(5000).nullable().optional(),
    key_features: z.array(z.string().max(500)).max(20).nullable().optional(),
    specifications: z.record(z.any()).nullable().optional(),
    price_per_unit: z.number().positive().optional(),
    bulk_pricing: z.record(z.number().positive()).nullable().optional(),
    stock_quantity: z.number().int().nonnegative().optional(),
    low_stock_threshold: z.number().int().nonnegative().optional(),
    expected_restock_date: z.coerce.date().nullable().optional(),
    images: z.array(z.string().url()).max(10).nullable().optional(),
    primary_image_url: z.string().url().nullable().optional(),
    status: z.enum(['active', 'inactive', 'out_of_stock', 'discontinued']).optional(),
    is_featured: z.boolean().optional(),
    tags: z.array(z.string().max(50)).max(20).nullable().optional(),
    weight: z.number().positive().nullable().optional(),
    material: z.string().max(255).nullable().optional(),
    warranty_information: z.string().max(1000).nullable().optional(),
    minimum_order_quantity: z.number().int().positive().optional(),
    maximum_order_quantity: z.number().int().positive().nullable().optional(),
    handling_time_days: z.number().int().positive().optional(),
    searchable: z.boolean().optional(),
    customer_type_availability: z.enum(['all', 'retail', 'trade']).optional()
});
export const searchProductInputSchema = z.object({
    query: z.string().optional(),
    category_id: z.string().optional(),
    supplier_id: z.string().optional(),
    brand: z.string().optional(),
    status: z.enum(['active', 'inactive', 'out_of_stock', 'discontinued']).optional(),
    is_featured: z.boolean().optional(),
    min_price: z.number().nonnegative().optional(),
    max_price: z.number().positive().optional(),
    in_stock: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
    customer_type_availability: z.enum(['all', 'retail', 'trade']).optional(),
    limit: z.number().int().positive().default(50),
    offset: z.number().int().nonnegative().default(0),
    sort_by: z.enum(['price_per_unit', 'created_at', 'sales_count', 'product_name', 'views_count']).default('created_at'),
    sort_order: z.enum(['asc', 'desc']).default('desc')
});
// ============================================
// PAYMENT METHOD SCHEMAS
// ============================================
export const paymentMethodSchema = z.object({
    payment_method_id: z.string(),
    user_id: z.string(),
    payment_type: z.enum(['credit_card', 'debit_card', 'trade_credit']),
    card_brand: z.string().nullable(),
    card_last_four: z.string().nullable(),
    card_expiry_month: z.string().nullable(),
    card_expiry_year: z.string().nullable(),
    cardholder_name: z.string().nullable(),
    billing_address_id: z.string().nullable(),
    payment_token: z.string().nullable(),
    is_default: z.boolean(),
    created_at: z.coerce.date(),
    updated_at: z.coerce.date()
});
export const createPaymentMethodInputSchema = z.object({
    user_id: z.string(),
    payment_type: z.enum(['credit_card', 'debit_card', 'trade_credit']),
    card_brand: z.string().max(50).nullable(),
    card_last_four: z.string().length(4).nullable(),
    card_expiry_month: z.string().length(2).regex(/^(0[1-9]|1[0-2])$/).nullable(),
    card_expiry_year: z.string().length(4).regex(/^\d{4}$/).nullable(),
    cardholder_name: z.string().max(255).nullable(),
    billing_address_id: z.string().nullable(),
    payment_token: z.string().nullable(),
    is_default: z.boolean().default(false)
});
export const updatePaymentMethodInputSchema = z.object({
    payment_method_id: z.string(),
    card_expiry_month: z.string().length(2).regex(/^(0[1-9]|1[0-2])$/).nullable().optional(),
    card_expiry_year: z.string().length(4).regex(/^\d{4}$/).nullable().optional(),
    billing_address_id: z.string().nullable().optional(),
    is_default: z.boolean().optional()
});
// ============================================
// CART SCHEMAS
// ============================================
export const cartSchema = z.object({
    cart_id: z.string(),
    customer_id: z.string(),
    saved_cart_name: z.string().nullable(),
    created_date: z.coerce.date(),
    last_modified_date: z.coerce.date(),
    status: z.enum(['active', 'saved', 'abandoned', 'converted']),
    created_at: z.coerce.date(),
    updated_at: z.coerce.date()
});
export const createCartInputSchema = z.object({
    customer_id: z.string(),
    saved_cart_name: z.string().max(255).nullable()
});
export const updateCartInputSchema = z.object({
    cart_id: z.string(),
    saved_cart_name: z.string().max(255).nullable().optional(),
    status: z.enum(['active', 'saved', 'abandoned', 'converted']).optional()
});
// ============================================
// CART ITEM SCHEMAS
// ============================================
export const cartItemSchema = z.object({
    cart_item_id: z.string(),
    cart_id: z.string(),
    product_id: z.string(),
    supplier_id: z.string(),
    quantity: z.number(),
    price_per_unit: z.number(),
    added_date: z.coerce.date(),
    created_at: z.coerce.date(),
    updated_at: z.coerce.date()
});
export const createCartItemInputSchema = z.object({
    cart_id: z.string(),
    product_id: z.string(),
    supplier_id: z.string(),
    quantity: z.number().int().positive(),
    price_per_unit: z.number().positive()
});
export const updateCartItemInputSchema = z.object({
    cart_item_id: z.string(),
    quantity: z.number().int().positive()
});
// ============================================
// ORDER SCHEMAS
// ============================================
export const orderSchema = z.object({
    order_id: z.string(),
    customer_id: z.string(),
    order_number: z.string(),
    order_date: z.coerce.date(),
    status: z.enum(['pending', 'processing', 'shipped', 'in_transit', 'delivered', 'cancelled', 'refunded']),
    subtotal_amount: z.number(),
    delivery_fee_total: z.number(),
    tax_amount: z.number(),
    discount_amount: z.number(),
    total_amount: z.number(),
    delivery_address_id: z.string(),
    payment_method: z.enum(['credit_card', 'debit_card', 'trade_credit']),
    payment_status: z.enum(['pending', 'paid', 'failed', 'refunded']),
    payment_transaction_id: z.string().nullable(),
    promo_code_used: z.string().nullable(),
    customer_notes: z.string().nullable(),
    created_at: z.coerce.date(),
    updated_at: z.coerce.date()
});
export const createOrderInputSchema = z.object({
    customer_id: z.string(),
    delivery_address_id: z.string(),
    payment_method: z.enum(['credit_card', 'debit_card', 'trade_credit']),
    promo_code_used: z.string().max(100).nullable(),
    customer_notes: z.string().max(1000).nullable()
});
export const updateOrderInputSchema = z.object({
    order_id: z.string(),
    status: z.enum(['pending', 'processing', 'shipped', 'in_transit', 'delivered', 'cancelled', 'refunded']).optional(),
    payment_status: z.enum(['pending', 'paid', 'failed', 'refunded']).optional(),
    payment_transaction_id: z.string().nullable().optional()
});
export const searchOrderInputSchema = z.object({
    customer_id: z.string().optional(),
    order_number: z.string().optional(),
    status: z.enum(['pending', 'processing', 'shipped', 'in_transit', 'delivered', 'cancelled', 'refunded']).optional(),
    payment_status: z.enum(['pending', 'paid', 'failed', 'refunded']).optional(),
    date_from: z.coerce.date().optional(),
    date_to: z.coerce.date().optional(),
    min_total: z.number().nonnegative().optional(),
    max_total: z.number().positive().optional(),
    limit: z.number().int().positive().default(50),
    offset: z.number().int().nonnegative().default(0),
    sort_by: z.enum(['order_date', 'total_amount']).default('order_date'),
    sort_order: z.enum(['asc', 'desc']).default('desc')
});
// ============================================
// ORDER ITEM SCHEMAS
// ============================================
export const orderItemSchema = z.object({
    order_item_id: z.string(),
    order_id: z.string(),
    product_id: z.string(),
    supplier_id: z.string(),
    product_name: z.string(),
    sku: z.string(),
    quantity: z.number(),
    price_per_unit: z.number(),
    line_total: z.number(),
    created_at: z.coerce.date(),
    updated_at: z.coerce.date()
});
export const createOrderItemInputSchema = z.object({
    order_id: z.string(),
    product_id: z.string(),
    supplier_id: z.string(),
    product_name: z.string().min(1).max(255),
    sku: z.string().min(1).max(255),
    quantity: z.number().int().positive(),
    price_per_unit: z.number().positive()
});
// ============================================
// DELIVERY SCHEMAS
// ============================================
export const deliverySchema = z.object({
    delivery_id: z.string(),
    order_id: z.string(),
    supplier_id: z.string(),
    delivery_window_start: z.coerce.date(),
    delivery_window_end: z.coerce.date(),
    delivery_method: z.enum(['standard_delivery', 'express_delivery', 'same_day', 'pickup', 'freight']),
    delivery_fee: z.number(),
    delivery_status: z.enum(['scheduled', 'preparing', 'out_for_delivery', 'delivered', 'failed', 'cancelled']),
    tracking_number: z.string().nullable(),
    carrier: z.string().nullable(),
    driver_name: z.string().nullable(),
    driver_phone: z.string().nullable(),
    estimated_arrival_time: z.coerce.date().nullable(),
    actual_delivery_time: z.coerce.date().nullable(),
    delivery_proof_photo_url: z.string().nullable(),
    delivery_signature: z.string().nullable(),
    delivery_notes: z.string().nullable(),
    current_latitude: z.number().nullable(),
    current_longitude: z.number().nullable(),
    created_at: z.coerce.date(),
    updated_at: z.coerce.date()
});
export const createDeliveryInputSchema = z.object({
    order_id: z.string(),
    supplier_id: z.string(),
    delivery_window_start: z.coerce.date(),
    delivery_window_end: z.coerce.date(),
    delivery_method: z.enum(['standard_delivery', 'express_delivery', 'same_day', 'pickup', 'freight']),
    delivery_fee: z.number().nonnegative(),
    tracking_number: z.string().max(255).nullable(),
    carrier: z.string().max(255).nullable()
});
export const updateDeliveryInputSchema = z.object({
    delivery_id: z.string(),
    delivery_status: z.enum(['scheduled', 'preparing', 'out_for_delivery', 'delivered', 'failed', 'cancelled']).optional(),
    driver_name: z.string().max(255).nullable().optional(),
    driver_phone: z.string().max(50).nullable().optional(),
    estimated_arrival_time: z.coerce.date().nullable().optional(),
    actual_delivery_time: z.coerce.date().nullable().optional(),
    delivery_proof_photo_url: z.string().url().nullable().optional(),
    delivery_signature: z.string().nullable().optional(),
    delivery_notes: z.string().max(1000).nullable().optional(),
    current_latitude: z.number().min(-90).max(90).nullable().optional(),
    current_longitude: z.number().min(-180).max(180).nullable().optional()
});
// ============================================
// REVIEW SCHEMAS
// ============================================
export const reviewSchema = z.object({
    review_id: z.string(),
    order_id: z.string(),
    customer_id: z.string(),
    supplier_id: z.string(),
    product_id: z.string().nullable(),
    rating_overall: z.number(),
    rating_product: z.number().nullable(),
    rating_service: z.number().nullable(),
    rating_delivery: z.number().nullable(),
    review_text: z.string().nullable(),
    photos: z.array(z.string()).nullable(),
    helpful_votes: z.number(),
    verified_purchase: z.boolean(),
    would_buy_again: z.enum(['yes', 'no', 'maybe']).nullable(),
    is_anonymous: z.boolean(),
    review_date: z.coerce.date(),
    status: z.enum(['pending', 'published', 'rejected', 'flagged']),
    supplier_response: z.string().nullable(),
    supplier_response_date: z.coerce.date().nullable(),
    created_at: z.coerce.date(),
    updated_at: z.coerce.date()
});
export const createReviewInputSchema = z.object({
    order_id: z.string(),
    customer_id: z.string(),
    supplier_id: z.string(),
    product_id: z.string().nullable(),
    rating_overall: z.number().int().min(1).max(5),
    rating_product: z.number().int().min(1).max(5).nullable(),
    rating_service: z.number().int().min(1).max(5).nullable(),
    rating_delivery: z.number().int().min(1).max(5).nullable(),
    review_text: z.string().max(2000).nullable(),
    photos: z.array(z.string().url()).max(5).nullable(),
    would_buy_again: z.enum(['yes', 'no', 'maybe']).nullable(),
    is_anonymous: z.boolean().default(false)
});
export const updateReviewInputSchema = z.object({
    review_id: z.string(),
    review_text: z.string().max(2000).nullable().optional(),
    photos: z.array(z.string().url()).max(5).nullable().optional(),
    status: z.enum(['pending', 'published', 'rejected', 'flagged']).optional(),
    supplier_response: z.string().max(1000).nullable().optional()
});
export const searchReviewInputSchema = z.object({
    product_id: z.string().optional(),
    supplier_id: z.string().optional(),
    customer_id: z.string().optional(),
    min_rating: z.number().int().min(1).max(5).optional(),
    status: z.enum(['pending', 'published', 'rejected', 'flagged']).optional(),
    verified_purchase: z.boolean().optional(),
    limit: z.number().int().positive().default(50),
    offset: z.number().int().nonnegative().default(0),
    sort_by: z.enum(['review_date', 'rating_overall', 'helpful_votes']).default('review_date'),
    sort_order: z.enum(['asc', 'desc']).default('desc')
});
// ============================================
// NOTIFICATION SCHEMAS
// ============================================
export const notificationSchema = z.object({
    notification_id: z.string(),
    user_id: z.string(),
    notification_type: z.string(),
    title: z.string(),
    message: z.string(),
    related_entity_type: z.string().nullable(),
    related_entity_id: z.string().nullable(),
    action_url: z.string().nullable(),
    created_date: z.coerce.date(),
    is_read: z.boolean(),
    read_at: z.coerce.date().nullable(),
    delivered_via: z.array(z.string()).nullable(),
    created_at: z.coerce.date(),
    updated_at: z.coerce.date()
});
export const createNotificationInputSchema = z.object({
    user_id: z.string(),
    notification_type: z.enum(['order_update', 'promotion', 'price_drop', 'back_in_stock', 'system', 'message']),
    title: z.string().min(1).max(255),
    message: z.string().min(1).max(1000),
    related_entity_type: z.string().max(100).nullable(),
    related_entity_id: z.string().nullable(),
    action_url: z.string().url().nullable(),
    delivered_via: z.array(z.enum(['email', 'sms', 'push'])).nullable()
});
export const updateNotificationInputSchema = z.object({
    notification_id: z.string(),
    is_read: z.boolean()
});
export const searchNotificationInputSchema = z.object({
    user_id: z.string().optional(),
    notification_type: z.enum(['order_update', 'promotion', 'price_drop', 'back_in_stock', 'system', 'message']).optional(),
    is_read: z.boolean().optional(),
    date_from: z.coerce.date().optional(),
    date_to: z.coerce.date().optional(),
    limit: z.number().int().positive().default(50),
    offset: z.number().int().nonnegative().default(0),
    sort_by: z.enum(['created_date']).default('created_date'),
    sort_order: z.enum(['asc', 'desc']).default('desc')
});
// ============================================
// WISHLIST ITEM SCHEMAS
// ============================================
export const wishlistItemSchema = z.object({
    wishlist_item_id: z.string(),
    customer_id: z.string(),
    product_id: z.string(),
    added_date: z.coerce.date(),
    price_when_saved: z.number(),
    price_drop_alert_enabled: z.boolean(),
    back_in_stock_alert_enabled: z.boolean(),
    created_at: z.coerce.date(),
    updated_at: z.coerce.date()
});
export const createWishlistItemInputSchema = z.object({
    customer_id: z.string(),
    product_id: z.string(),
    price_when_saved: z.number().positive(),
    price_drop_alert_enabled: z.boolean().default(true),
    back_in_stock_alert_enabled: z.boolean().default(true)
});
export const updateWishlistItemInputSchema = z.object({
    wishlist_item_id: z.string(),
    price_drop_alert_enabled: z.boolean().optional(),
    back_in_stock_alert_enabled: z.boolean().optional()
});
// ============================================
// PROJECT SCHEMAS
// ============================================
export const projectSchema = z.object({
    project_id: z.string(),
    customer_id: z.string(),
    project_name: z.string(),
    description: z.string().nullable(),
    total_value: z.number(),
    item_count: z.number(),
    created_date: z.coerce.date(),
    last_updated_date: z.coerce.date(),
    created_at: z.coerce.date(),
    updated_at: z.coerce.date()
});
export const createProjectInputSchema = z.object({
    customer_id: z.string(),
    project_name: z.string().min(1).max(255),
    description: z.string().max(2000).nullable()
});
export const updateProjectInputSchema = z.object({
    project_id: z.string(),
    project_name: z.string().min(1).max(255).optional(),
    description: z.string().max(2000).nullable().optional()
});
// ============================================
// PROMOTION SCHEMAS
// ============================================
export const promotionSchema = z.object({
    promotion_id: z.string(),
    supplier_id: z.string(),
    promotion_name: z.string(),
    promotion_type: z.string(),
    discount_type: z.enum(['percentage', 'fixed']),
    discount_value: z.number(),
    applicable_products: z.array(z.string()).nullable(),
    applicable_categories: z.array(z.string()).nullable(),
    minimum_purchase_amount: z.number().nullable(),
    maximum_discount_amount: z.number().nullable(),
    promo_code: z.string().nullable(),
    usage_limit_total: z.number().nullable(),
    usage_limit_per_customer: z.number().nullable(),
    usage_count: z.number(),
    start_date: z.coerce.date(),
    end_date: z.coerce.date(),
    is_active: z.boolean(),
    created_at: z.coerce.date(),
    updated_at: z.coerce.date()
});
export const createPromotionInputSchema = z.object({
    supplier_id: z.string(),
    promotion_name: z.string().min(1).max(255),
    promotion_type: z.enum(['seasonal', 'volume_discount', 'new_customer', 'trade_exclusive']),
    discount_type: z.enum(['percentage', 'fixed']),
    discount_value: z.number().positive(),
    applicable_products: z.array(z.string()).nullable(),
    applicable_categories: z.array(z.string()).nullable(),
    minimum_purchase_amount: z.number().nonnegative().nullable(),
    maximum_discount_amount: z.number().positive().nullable(),
    promo_code: z.string().max(100).regex(/^[A-Z0-9]+$/).nullable(),
    usage_limit_total: z.number().int().positive().nullable(),
    usage_limit_per_customer: z.number().int().positive().nullable(),
    start_date: z.coerce.date(),
    end_date: z.coerce.date(),
    is_active: z.boolean().default(true)
});
export const updatePromotionInputSchema = z.object({
    promotion_id: z.string(),
    promotion_name: z.string().min(1).max(255).optional(),
    discount_value: z.number().positive().optional(),
    minimum_purchase_amount: z.number().nonnegative().nullable().optional(),
    maximum_discount_amount: z.number().positive().nullable().optional(),
    usage_limit_total: z.number().int().positive().nullable().optional(),
    usage_limit_per_customer: z.number().int().positive().nullable().optional(),
    end_date: z.coerce.date().optional(),
    is_active: z.boolean().optional()
});
// ============================================
// SUPPORT TICKET SCHEMAS
// ============================================
export const supportTicketSchema = z.object({
    ticket_id: z.string(),
    user_id: z.string(),
    order_id: z.string().nullable(),
    issue_category: z.string(),
    subject: z.string(),
    message: z.string(),
    attachments: z.array(z.string()).nullable(),
    status: z.enum(['open', 'in_progress', 'resolved', 'closed']),
    priority: z.enum(['low', 'normal', 'high', 'urgent']),
    assigned_admin_id: z.string().nullable(),
    created_date: z.coerce.date(),
    last_updated_date: z.coerce.date(),
    resolved_date: z.coerce.date().nullable(),
    customer_satisfaction_rating: z.number().nullable(),
    created_at: z.coerce.date(),
    updated_at: z.coerce.date()
});
export const createSupportTicketInputSchema = z.object({
    user_id: z.string(),
    order_id: z.string().nullable(),
    issue_category: z.enum(['delivery', 'product_quality', 'payment', 'account', 'technical', 'other']),
    subject: z.string().min(1).max(255),
    message: z.string().min(1).max(5000),
    attachments: z.array(z.string().url()).max(5).nullable(),
    priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal')
});
export const updateSupportTicketInputSchema = z.object({
    ticket_id: z.string(),
    status: z.enum(['open', 'in_progress', 'resolved', 'closed']).optional(),
    assigned_admin_id: z.string().nullable().optional(),
    customer_satisfaction_rating: z.number().int().min(1).max(5).nullable().optional()
});
// ============================================
// SURPLUS LISTING SCHEMAS
// ============================================
export const surplusListingSchema = z.object({
    listing_id: z.string(),
    seller_id: z.string(),
    product_name: z.string(),
    category_id: z.string(),
    description: z.string(),
    condition: z.enum(['new', 'like_new', 'used', 'refurbished']),
    photos: z.array(z.string()).nullable(),
    asking_price: z.number(),
    original_price: z.number().nullable(),
    price_type: z.enum(['fixed', 'negotiable', 'auction']),
    quantity: z.number(),
    pickup_location: z.string().nullable(),
    pickup_instructions: z.string().nullable(),
    shipping_available: z.boolean(),
    shipping_rate: z.number().nullable(),
    status: z.enum(['active', 'sold', 'expired', 'removed']),
    reason_for_selling: z.string().nullable(),
    views_count: z.number(),
    created_date: z.coerce.date(),
    created_at: z.coerce.date(),
    updated_at: z.coerce.date()
});
export const createSurplusListingInputSchema = z.object({
    seller_id: z.string(),
    product_name: z.string().min(1).max(255),
    category_id: z.string(),
    description: z.string().min(1).max(5000),
    condition: z.enum(['new', 'like_new', 'used', 'refurbished']),
    photos: z.array(z.string().url()).max(10).nullable(),
    asking_price: z.number().positive(),
    original_price: z.number().positive().nullable(),
    price_type: z.enum(['fixed', 'negotiable', 'auction']).default('fixed'),
    quantity: z.number().int().positive().default(1),
    pickup_location: z.string().max(500).nullable(),
    pickup_instructions: z.string().max(1000).nullable(),
    shipping_available: z.boolean().default(false),
    shipping_rate: z.number().nonnegative().nullable(),
    reason_for_selling: z.string().max(1000).nullable()
});
export const updateSurplusListingInputSchema = z.object({
    listing_id: z.string(),
    description: z.string().min(1).max(5000).optional(),
    photos: z.array(z.string().url()).max(10).nullable().optional(),
    asking_price: z.number().positive().optional(),
    quantity: z.number().int().positive().optional(),
    pickup_instructions: z.string().max(1000).nullable().optional(),
    shipping_available: z.boolean().optional(),
    shipping_rate: z.number().nonnegative().nullable().optional(),
    status: z.enum(['active', 'sold', 'expired', 'removed']).optional()
});
export const searchSurplusListingInputSchema = z.object({
    query: z.string().optional(),
    category_id: z.string().optional(),
    condition: z.enum(['new', 'like_new', 'used', 'refurbished']).optional(),
    min_price: z.number().nonnegative().optional(),
    max_price: z.number().positive().optional(),
    shipping_available: z.boolean().optional(),
    status: z.enum(['active', 'sold', 'expired', 'removed']).optional(),
    limit: z.number().int().positive().default(50),
    offset: z.number().int().nonnegative().default(0),
    sort_by: z.enum(['created_date', 'asking_price', 'views_count']).default('created_date'),
    sort_order: z.enum(['asc', 'desc']).default('desc')
});
// ============================================
// PAYOUT SCHEMAS
// ============================================
export const payoutSchema = z.object({
    payout_id: z.string(),
    supplier_id: z.string(),
    amount: z.number(),
    status: z.enum(['scheduled', 'processing', 'completed', 'failed']),
    scheduled_date: z.coerce.date(),
    processed_date: z.coerce.date().nullable(),
    transaction_reference: z.string().nullable(),
    included_orders: z.array(z.string()).nullable(),
    platform_commission: z.number(),
    net_amount: z.number(),
    failure_reason: z.string().nullable(),
    created_at: z.coerce.date(),
    updated_at: z.coerce.date()
});
export const createPayoutInputSchema = z.object({
    supplier_id: z.string(),
    amount: z.number().positive(),
    scheduled_date: z.coerce.date(),
    included_orders: z.array(z.string()).nullable(),
    platform_commission: z.number().nonnegative(),
    net_amount: z.number().positive()
});
export const updatePayoutInputSchema = z.object({
    payout_id: z.string(),
    status: z.enum(['scheduled', 'processing', 'completed', 'failed']).optional(),
    processed_date: z.coerce.date().nullable().optional(),
    transaction_reference: z.string().max(255).nullable().optional(),
    failure_reason: z.string().max(1000).nullable().optional()
});
export const searchPayoutInputSchema = z.object({
    supplier_id: z.string().optional(),
    status: z.enum(['scheduled', 'processing', 'completed', 'failed']).optional(),
    date_from: z.coerce.date().optional(),
    date_to: z.coerce.date().optional(),
    limit: z.number().int().positive().default(50),
    offset: z.number().int().nonnegative().default(0),
    sort_by: z.enum(['scheduled_date', 'amount']).default('scheduled_date'),
    sort_order: z.enum(['asc', 'desc']).default('desc')
});
//# sourceMappingURL=schema.js.map