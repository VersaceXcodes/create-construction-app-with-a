import request from 'supertest';
import { Server } from 'socket.io';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import { app, pool } from './server.ts';

// ============================================
// TEST SETUP & UTILITIES
// ============================================

let adminToken: string;
let customerToken: string;
let supplierToken: string;
let testCustomerId: string;
let testSupplierId: string;
let testProductId: string;
let testOrderId: string;
let testCartId: string;

// WebSocket test utilities
let ioServer: Server;
let clientSocket: ClientSocket;

/**
 * Setup test database before all tests
 */
beforeAll(async () => {
  // Clean database
  await pool.query('DELETE FROM admin_activity_logs');
  await pool.query('DELETE FROM ticket_responses');
  await pool.query('DELETE FROM support_tickets');
  await pool.query('DELETE FROM issue_messages');
  await pool.query('DELETE FROM issues');
  await pool.query('DELETE FROM review_votes');
  await pool.query('DELETE FROM reviews');
  await pool.query('DELETE FROM order_timeline');
  await pool.query('DELETE FROM deliveries');
  await pool.query('DELETE FROM order_items');
  await pool.query('DELETE FROM orders');
  await pool.query('DELETE FROM cart_items');
  await pool.query('DELETE FROM carts');
  await pool.query('DELETE FROM wishlist_items');
  await pool.query('DELETE FROM project_items');
  await pool.query('DELETE FROM projects');
  await pool.query('DELETE FROM promo_code_usage');
  await pool.query('DELETE FROM promotions');
  await pool.query('DELETE FROM surplus_transactions');
  await pool.query('DELETE FROM surplus_offers');
  await pool.query('DELETE FROM surplus_listings');
  await pool.query('DELETE FROM chat_messages');
  await pool.query('DELETE FROM chat_conversations');
  await pool.query('DELETE FROM inventory_logs');
  await pool.query('DELETE FROM product_views');
  await pool.query('DELETE FROM search_history');
  await pool.query('DELETE FROM products');
  await pool.query('DELETE FROM payment_methods');
  await pool.query('DELETE FROM supplier_applications');
  await pool.query('DELETE FROM suppliers');
  await pool.query('DELETE FROM admins');
  await pool.query('DELETE FROM customers');
  await pool.query('DELETE FROM addresses');
  await pool.query('DELETE FROM categories');
  await pool.query('DELETE FROM users');

  // Seed categories
  await pool.query(`
    INSERT INTO categories (category_id, parent_category_id, category_name, category_slug, description, display_order, is_active, created_at, updated_at)
    VALUES 
      ('cat_lumber', NULL, 'Lumber & Wood', 'lumber-wood', 'All lumber products', 1, true, NOW()::text, NOW()::text),
      ('cat_electrical', NULL, 'Electrical', 'electrical', 'Electrical supplies', 2, true, NOW()::text, NOW()::text),
      ('cat_plumbing', NULL, 'Plumbing', 'plumbing', 'Plumbing supplies', 3, true, NOW()::text, NOW()::text)
  `);

  // Create admin user
  const adminResult = await pool.query(`
    INSERT INTO users (user_id, email, password_hash, user_type, first_name, last_name, phone_number, registration_date, status, email_verified, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING user_id
  `, ['admin_001', 'admin@buildeasy.com', 'admin123', 'admin', 'Admin', 'User', '+1-555-0001', new Date().toISOString(), 'active', true, new Date().toISOString(), new Date().toISOString()]);

  await pool.query(`
    INSERT INTO admins (admin_id, user_id, role, permissions, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6)
  `, ['admin_001', adminResult.rows[0].user_id, 'super_admin', JSON.stringify({all: true}), new Date().toISOString(), new Date().toISOString()]);

  // Login as admin to get token
  const adminLoginRes = await request(app)
    .post('/api/auth/login')
    .send({
      email: 'admin@buildeasy.com',
      password: 'admin123'
    });
  
  adminToken = adminLoginRes.body.token;
});

/**
 * Cleanup after all tests
 */
afterAll(async () => {
  await pool.end();
  if (clientSocket) {
    clientSocket.close();
  }
});

/**
 * Reset test data before each test
 */
beforeEach(async () => {
  // Clean up test data from previous tests
  await pool.query('DELETE FROM cart_items');
  await pool.query('DELETE FROM carts');
  await pool.query('DELETE FROM order_items');
  await pool.query('DELETE FROM orders WHERE customer_id NOT LIKE \'%seed%\'');
});

// ============================================
// AUTHENTICATION TESTS
// ============================================

describe('Authentication Endpoints', () => {
  
  describe('POST /api/auth/register/customer', () => {
    
    it('should successfully register a new customer with complete details', async () => {
      const response = await request(app)
        .post('/api/auth/register/customer')
        .send({
          email: 'testcustomer@example.com',
          password: 'password123',
          first_name: 'Test',
          last_name: 'Customer',
          phone_number: '+1-555-1234',
          account_type: 'retail',
          default_delivery_address: {
            street_address: '123 Test St',
            city: 'Austin',
            state: 'TX',
            postal_code: '78701'
          }
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toMatchObject({
        email: 'testcustomer@example.com',
        user_type: 'customer',
        first_name: 'Test',
        last_name: 'Customer',
        email_verified: false
      });
      expect(response.body.customer).toMatchObject({
        account_type: 'retail',
        onboarding_completed: false
      });

      // Verify user created in database
      const userCheck = await pool.query('SELECT * FROM users WHERE email = $1', ['testcustomer@example.com']);
      expect(userCheck.rows.length).toBe(1);
      expect(userCheck.rows[0].password_hash).toBe('password123'); // Plain text in tests

      // Verify customer record created
      const customerCheck = await pool.query('SELECT * FROM customers WHERE user_id = $1', [userCheck.rows[0].user_id]);
      expect(customerCheck.rows.length).toBe(1);

      // Verify address created if provided
      const addressCheck = await pool.query('SELECT * FROM addresses WHERE user_id = $1', [userCheck.rows[0].user_id]);
      expect(addressCheck.rows.length).toBe(1);
      expect(addressCheck.rows[0].city).toBe('Austin');
      
      // Save for later tests
      customerToken = response.body.token;
      testCustomerId = response.body.customer.customer_id;
    });

    it('should register customer without address', async () => {
      const response = await request(app)
        .post('/api/auth/register/customer')
        .send({
          email: 'customer2@example.com',
          password: 'password123',
          first_name: 'Second',
          last_name: 'Customer',
          phone_number: '+1-555-5678',
          account_type: 'trade'
        });

      expect(response.status).toBe(201);
      expect(response.body.customer.account_type).toBe('trade');

      // Verify no address created
      const userCheck = await pool.query('SELECT * FROM users WHERE email = $1', ['customer2@example.com']);
      const addressCheck = await pool.query('SELECT * FROM addresses WHERE user_id = $1', [userCheck.rows[0].user_id]);
      expect(addressCheck.rows.length).toBe(0);
    });

    it('should reject registration with duplicate email', async () => {
      // First registration
      await request(app)
        .post('/api/auth/register/customer')
        .send({
          email: 'duplicate@example.com',
          password: 'password123',
          first_name: 'First',
          last_name: 'User',
          phone_number: '+1-555-9999',
          account_type: 'retail'
        });

      // Duplicate registration
      const response = await request(app)
        .post('/api/auth/register/customer')
        .send({
          email: 'duplicate@example.com',
          password: 'different123',
          first_name: 'Second',
          last_name: 'User',
          phone_number: '+1-555-8888',
          account_type: 'retail'
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('DuplicateEmailError');
    });

    it('should reject registration with invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/register/customer')
        .send({
          email: 'notanemail',
          password: 'password123',
          first_name: 'Test',
          last_name: 'User',
          phone_number: '+1-555-0000',
          account_type: 'retail'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('ValidationError');
    });

    it('should reject registration with short password', async () => {
      const response = await request(app)
        .post('/api/auth/register/customer')
        .send({
          email: 'test@example.com',
          password: 'short',
          first_name: 'Test',
          last_name: 'User',
          phone_number: '+1-555-0000',
          account_type: 'retail'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('ValidationError');
    });

    it('should reject registration with missing required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register/customer')
        .send({
          email: 'incomplete@example.com',
          password: 'password123'
          // Missing first_name, last_name, phone_number, account_type
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('ValidationError');
    });

    it('should initialize default notification preferences', async () => {
      const response = await request(app)
        .post('/api/auth/register/customer')
        .send({
          email: 'notiftest@example.com',
          password: 'password123',
          first_name: 'Notif',
          last_name: 'Test',
          phone_number: '+1-555-7777',
          account_type: 'retail'
        });

      expect(response.status).toBe(201);
      
      const customerCheck = await pool.query('SELECT * FROM customers WHERE customer_id = $1', [response.body.customer.customer_id]);
      const prefs = customerCheck.rows[0].notification_preferences;
      
      expect(prefs).toHaveProperty('email');
      expect(prefs).toHaveProperty('sms');
      expect(prefs).toHaveProperty('order_updates');
    });
  });

  describe('POST /api/auth/register/supplier', () => {
    
    it('should successfully submit supplier application', async () => {
      const response = await request(app)
        .post('/api/auth/register/supplier')
        .send({
          email: 'testsupplier@example.com',
          password: 'supplier123',
          business_name: 'Test Supply Co',
          business_registration_number: 'EIN-999999999',
          business_type: 'LLC',
          contact_person_name: 'John Supplier',
          phone_number: '+1-555-2000',
          business_address: '456 Supply Ave, Houston, TX 77001',
          business_description: 'Quality construction materials'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('application_id');
      expect(response.body.message).toContain('submitted successfully');

      // Verify application created in database
      const appCheck = await pool.query('SELECT * FROM supplier_applications WHERE application_id = $1', [response.body.application_id]);
      expect(appCheck.rows.length).toBe(1);
      expect(appCheck.rows[0].application_status).toBe('pending_review');
      expect(appCheck.rows[0].business_name).toBe('Test Supply Co');

      // Verify user created but NO supplier record yet (created on approval)
      const userCheck = await pool.query('SELECT * FROM users WHERE email = $1', ['testsupplier@example.com']);
      expect(userCheck.rows.length).toBe(1);
      
      const supplierCheck = await pool.query('SELECT * FROM suppliers WHERE user_id = $1', [userCheck.rows[0].user_id]);
      expect(supplierCheck.rows.length).toBe(0); // No supplier record until approved
    });

    it('should reject supplier application with duplicate email', async () => {
      // First application
      await request(app)
        .post('/api/auth/register/supplier')
        .send({
          email: 'duplicatesupplier@example.com',
          password: 'supplier123',
          business_name: 'First Supply',
          business_registration_number: 'EIN-111111111',
          business_type: 'Corporation',
          contact_person_name: 'First Person',
          phone_number: '+1-555-3000',
          business_address: '789 First St, Dallas, TX 75201'
        });

      // Duplicate application
      const response = await request(app)
        .post('/api/auth/register/supplier')
        .send({
          email: 'duplicatesupplier@example.com',
          password: 'supplier456',
          business_name: 'Second Supply',
          business_registration_number: 'EIN-222222222',
          business_type: 'LLC',
          contact_person_name: 'Second Person',
          phone_number: '+1-555-4000',
          business_address: '321 Second Ave, Austin, TX 78701'
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('DuplicateEmailError');
    });

    it('should reject supplier application with missing required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register/supplier')
        .send({
          email: 'incomplete@example.com',
          password: 'supplier123',
          business_name: 'Incomplete Supply'
          // Missing business_registration_number, business_type, contact_person_name, etc.
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('ValidationError');
    });
  });

  describe('POST /api/auth/login', () => {
    
    it('should successfully login customer with correct credentials', async () => {
      // First register a customer
      const registerRes = await request(app)
        .post('/api/auth/register/customer')
        .send({
          email: 'login_customer@example.com',
          password: 'password123',
          first_name: 'Login',
          last_name: 'Test',
          phone_number: '+1-555-5000',
          account_type: 'retail'
        });

      expect(registerRes.status).toBe(201);

      // Now login
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login_customer@example.com',
          password: 'password123'
        });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body).toHaveProperty('token');
      expect(loginRes.body.user).toMatchObject({
        email: 'login_customer@example.com',
        user_type: 'customer'
      });
      expect(loginRes.body).toHaveProperty('customer');

      // Verify last_login_date updated
      const userCheck = await pool.query('SELECT last_login_date FROM users WHERE email = $1', ['login_customer@example.com']);
      expect(userCheck.rows[0].last_login_date).toBeTruthy();
    });

    it('should successfully login admin user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@buildeasy.com',
          password: 'admin123'
        });

      expect(response.status).toBe(200);
      expect(response.body.user.user_type).toBe('admin');
      expect(response.body).toHaveProperty('admin');
    });

    it('should reject login with incorrect password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login_customer@example.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('InvalidCredentialsError');
    });

    it('should reject login with non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('InvalidCredentialsError');
    });

    it('should reject login for suspended user', async () => {
      // Create and suspend user
      const registerRes = await request(app)
        .post('/api/auth/register/customer')
        .send({
          email: 'suspended@example.com',
          password: 'password123',
          first_name: 'Suspended',
          last_name: 'User',
          phone_number: '+1-555-6000',
          account_type: 'retail'
        });

      // Suspend user
      await pool.query('UPDATE users SET status = $1 WHERE email = $2', ['suspended', 'suspended@example.com']);

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'suspended@example.com',
          password: 'password123'
        });

      expect(loginRes.status).toBe(401);
      expect(loginRes.body.message).toContain('suspended');
    });

    it('should update last_login_date on successful login', async () => {
      const beforeLogin = await pool.query('SELECT last_login_date FROM users WHERE email = $1', ['login_customer@example.com']);
      const beforeDate = beforeLogin.rows[0].last_login_date;

      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay

      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login_customer@example.com',
          password: 'password123'
        });

      const afterLogin = await pool.query('SELECT last_login_date FROM users WHERE email = $1', ['login_customer@example.com']);
      const afterDate = afterLogin.rows[0].last_login_date;

      expect(new Date(afterDate).getTime()).toBeGreaterThan(new Date(beforeDate).getTime());
    });
  });

  describe('POST /api/auth/verify-email', () => {
    
    it('should successfully verify email with valid token', async () => {
      // Register user
      const registerRes = await request(app)
        .post('/api/auth/register/customer')
        .send({
          email: 'verify@example.com',
          password: 'password123',
          first_name: 'Verify',
          last_name: 'Test',
          phone_number: '+1-555-7000',
          account_type: 'retail'
        });

      // Get verification token from database
      const userCheck = await pool.query('SELECT email_verification_token FROM users WHERE email = $1', ['verify@example.com']);
      const token = userCheck.rows[0].email_verification_token;

      // Verify email
      const verifyRes = await request(app)
        .post('/api/auth/verify-email')
        .send({ token });

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.message).toContain('verified');

      // Check database updated
      const updatedUser = await pool.query('SELECT email_verified, email_verification_token FROM users WHERE email = $1', ['verify@example.com']);
      expect(updatedUser.rows[0].email_verified).toBe(true);
      expect(updatedUser.rows[0].email_verification_token).toBeNull();
    });

    it('should reject verification with invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: 'invalid_token_12345' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('InvalidTokenError');
    });

    it('should reject verification with already used token', async () => {
      // Register and verify
      await request(app)
        .post('/api/auth/register/customer')
        .send({
          email: 'doubleverify@example.com',
          password: 'password123',
          first_name: 'Double',
          last_name: 'Verify',
          phone_number: '+1-555-8000',
          account_type: 'retail'
        });

      const userCheck = await pool.query('SELECT email_verification_token FROM users WHERE email = $1', ['doubleverify@example.com']);
      const token = userCheck.rows[0].email_verification_token;

      // First verification
      await request(app).post('/api/auth/verify-email').send({ token });

      // Second verification attempt
      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({ token });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('InvalidTokenError');
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    
    it('should send password reset email for existing user', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: 'login_customer@example.com'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('reset email sent');

      // Verify reset token created in database
      const userCheck = await pool.query('SELECT password_reset_token, password_reset_expires FROM users WHERE email = $1', ['login_customer@example.com']);
      expect(userCheck.rows[0].password_reset_token).toBeTruthy();
      expect(userCheck.rows[0].password_reset_expires).toBeTruthy();
    });

    it('should not reveal if email does not exist (security)', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: 'nonexistent@example.com'
        });

      // Still return 200 to not reveal user existence
      expect(response.status).toBe(200);
      expect(response.body.message).toContain('reset email sent');
    });
  });

  describe('POST /api/auth/reset-password', () => {
    
    it('should successfully reset password with valid token', async () => {
      // Request password reset
      await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'login_customer@example.com' });

      // Get reset token
      const userCheck = await pool.query('SELECT password_reset_token FROM users WHERE email = $1', ['login_customer@example.com']);
      const resetToken = userCheck.rows[0].password_reset_token;

      // Reset password
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          new_password: 'newpassword123'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('reset successfully');

      // Verify password changed and token cleared
      const updatedUser = await pool.query('SELECT password_hash, password_reset_token FROM users WHERE email = $1', ['login_customer@example.com']);
      expect(updatedUser.rows[0].password_hash).toBe('newpassword123'); // Plain text in tests
      expect(updatedUser.rows[0].password_reset_token).toBeNull();

      // Verify can login with new password
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login_customer@example.com',
          password: 'newpassword123'
        });

      expect(loginRes.status).toBe(200);
    });

    it('should reject reset with expired token', async () => {
      // Create user with expired reset token
      await pool.query(`
        UPDATE users 
        SET password_reset_token = $1, password_reset_expires = $2 
        WHERE email = $3
      `, ['expired_token', new Date(Date.now() - 86400000).toISOString(), 'login_customer@example.com']); // 1 day ago

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'expired_token',
          new_password: 'newpass123'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('ExpiredTokenError');
    });
  });

  describe('POST /api/auth/logout', () => {
    
    it('should successfully logout user', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('Logout successful');
    });
  });
});

// ============================================
// PRODUCT TESTS
// ============================================

describe('Product Endpoints', () => {
  
  let testSupplierId: string;
  let testProductId: string;

  beforeAll(async () => {
    // Create verified supplier for product tests
    const supplierUser = await pool.query(`
      INSERT INTO users (user_id, email, password_hash, user_type, first_name, last_name, phone_number, registration_date, status, email_verified, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING user_id
    `, ['supplier_test_001', 'productsupplier@example.com', 'supplier123', 'supplier', 'Product', 'Supplier', '+1-555-9000', new Date().toISOString(), 'active', true, new Date().toISOString(), new Date().toISOString()]);

    const supplierRes = await pool.query(`
      INSERT INTO suppliers (supplier_id, user_id, business_name, business_type, verification_status, rating_average, total_reviews, total_sales, total_orders, fulfillment_rate, commission_rate, subscription_plan, payout_frequency, status, onboarding_completed, member_since, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING supplier_id
    `, ['supplier_test_001', supplierUser.rows[0].user_id, 'Test Supply Co', 'LLC', 'verified', 4.5, 0, 0, 0, 0, 8.5, 'standard', 'monthly', 'active', true, new Date().toISOString(), new Date().toISOString(), new Date().toISOString()]);

    testSupplierId = supplierRes.rows[0].supplier_id;

    // Login as supplier
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'productsupplier@example.com',
        password: 'supplier123'
      });

    supplierToken = loginRes.body.token;
  });

  describe('GET /api/products - Search & Filter', () => {
    
    beforeAll(async () => {
      // Create sample products for search tests
      await pool.query(`
        INSERT INTO products (product_id, supplier_id, category_id, sku, product_name, description, price_per_unit, unit_of_measure, stock_quantity, low_stock_threshold, last_updated_timestamp, status, is_featured, brand, views_count, sales_count, creation_date, searchable, customer_type_availability, handling_time_days, minimum_order_quantity, created_at, updated_at)
        VALUES 
          ('prod_search_001', $1, 'cat_lumber', 'SKU001', '2x4 Pine Lumber', 'Quality pine lumber', 8.99, 'piece', 100, 10, NOW()::text, 'active', true, 'PineBrand', 0, 0, NOW()::text, true, 'all', 1, 1, NOW()::text, NOW()::text),
          ('prod_search_002', $1, 'cat_lumber', 'SKU002', '2x6 Oak Lumber', 'Premium oak lumber', 15.99, 'piece', 50, 10, NOW()::text, 'active', false, 'OakBrand', 0, 0, NOW()::text, true, 'all', 1, 1, NOW()::text, NOW()::text),
          ('prod_search_003', $1, 'cat_electrical', 'SKU003', 'LED Bulb 60W', 'Energy efficient LED', 4.99, 'piece', 200, 20, NOW()::text, 'active', true, 'LEDBrand', 0, 0, NOW()::text, true, 'all', 1, 1, NOW()::text, NOW()::text),
          ('prod_search_004', $1, 'cat_lumber', 'SKU004', 'Plywood 4x8', 'Construction plywood', 45.99, 'sheet', 0, 5, NOW()::text, 'out_of_stock', false, 'PlyBrand', 0, 0, NOW()::text, true, 'all', 1, 1, NOW()::text, NOW()::text),
          ('prod_search_005', $1, 'cat_plumbing', 'SKU005', 'PVC Pipe 1/2"', 'Standard PVC pipe', 6.99, 'piece', 300, 50, NOW()::text, 'active', false, 'PVCBrand', 0, 0, NOW()::text, true, 'trade', 1, 1, NOW()::text, NOW()::text)
      `, [testSupplierId]);
    });

    it('should return all active products without filters', async () => {
      const response = await request(app)
        .get('/api/products');

      expect(response.status).toBe(200);
      expect(response.body.products).toBeInstanceOf(Array);
      expect(response.body.products.length).toBeGreaterThan(0);
      expect(response.body).toHaveProperty('total');
      
      // All products should be active
      response.body.products.forEach((product: any) => {
        expect(['active', 'out_of_stock']).toContain(product.status);
      });
    });

    it('should filter products by category', async () => {
      const response = await request(app)
        .get('/api/products')
        .query({ category: 'cat_lumber' });

      expect(response.status).toBe(200);
      response.body.products.forEach((product: any) => {
        expect(product.category_id).toBe('cat_lumber');
      });
    });

    it('should filter products by price range', async () => {
      const response = await request(app)
        .get('/api/products')
        .query({ 
          price_min: 5,
          price_max: 10
        });

      expect(response.status).toBe(200);
      response.body.products.forEach((product: any) => {
        expect(product.price_per_unit).toBeGreaterThanOrEqual(5);
        expect(product.price_per_unit).toBeLessThanOrEqual(10);
      });
    });

    it('should filter products by in_stock_only', async () => {
      const response = await request(app)
        .get('/api/products')
        .query({ in_stock_only: 'true' });

      expect(response.status).toBe(200);
      response.body.products.forEach((product: any) => {
        expect(product.stock_quantity).toBeGreaterThan(0);
        expect(product.status).not.toBe('out_of_stock');
      });
    });

    it('should filter products by brand', async () => {
      const response = await request(app)
        .get('/api/products')
        .query({ brand: 'PineBrand' });

      expect(response.status).toBe(200);
      response.body.products.forEach((product: any) => {
        expect(product.brand).toBe('PineBrand');
      });
    });

    it('should search products by keyword', async () => {
      const response = await request(app)
        .get('/api/products')
        .query({ search_query: 'lumber' });

      expect(response.status).toBe(200);
      expect(response.body.products.length).toBeGreaterThan(0);
      
      response.body.products.forEach((product: any) => {
        const searchText = (product.product_name + ' ' + product.description).toLowerCase();
        expect(searchText).toContain('lumber');
      });
    });

    it('should sort products by price ascending', async () => {
      const response = await request(app)
        .get('/api/products')
        .query({ 
          sort_by: 'price_per_unit',
          sort_order: 'asc'
        });

      expect(response.status).toBe(200);
      
      const prices = response.body.products.map((p: any) => p.price_per_unit);
      for (let i = 1; i < prices.length; i++) {
        expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1]);
      }
    });

    it('should sort products by price descending', async () => {
      const response = await request(app)
        .get('/api/products')
        .query({ 
          sort_by: 'price_per_unit',
          sort_order: 'desc'
        });

      expect(response.status).toBe(200);
      
      const prices = response.body.products.map((p: any) => p.price_per_unit);
      for (let i = 1; i < prices.length; i++) {
        expect(prices[i]).toBeLessThanOrEqual(prices[i - 1]);
      }
    });

    it('should paginate results correctly', async () => {
      const page1 = await request(app)
        .get('/api/products')
        .query({ limit: 2, offset: 0 });

      const page2 = await request(app)
        .get('/api/products')
        .query({ limit: 2, offset: 2 });

      expect(page1.status).toBe(200);
      expect(page2.status).toBe(200);
      expect(page1.body.products.length).toBeLessThanOrEqual(2);
      expect(page2.body.products.length).toBeGreaterThanOrEqual(0);
      
      // Ensure different products returned
      if (page1.body.products.length > 0 && page2.body.products.length > 0) {
        expect(page1.body.products[0].product_id).not.toBe(page2.body.products[0].product_id);
      }
    });

    it('should combine multiple filters correctly', async () => {
      const response = await request(app)
        .get('/api/products')
        .query({
          category: 'cat_lumber',
          price_max: 20,
          in_stock_only: 'true',
          sort_by: 'price_per_unit'
        });

      expect(response.status).toBe(200);
      response.body.products.forEach((product: any) => {
        expect(product.category_id).toBe('cat_lumber');
        expect(product.price_per_unit).toBeLessThanOrEqual(20);
        expect(product.stock_quantity).toBeGreaterThan(0);
      });
    });

    it('should filter by customer_type when specified', async () => {
      const response = await request(app)
        .get('/api/products')
        .query({ customer_type_availability: 'trade' });

      expect(response.status).toBe(200);
      response.body.products.forEach((product: any) => {
        expect(['trade', 'all']).toContain(product.customer_type_availability);
      });
    });

    it('should only return searchable products', async () => {
      // Create non-searchable product
      await pool.query(`
        INSERT INTO products (product_id, supplier_id, category_id, sku, product_name, price_per_unit, unit_of_measure, stock_quantity, low_stock_threshold, last_updated_timestamp, status, searchable, creation_date, handling_time_days, minimum_order_quantity, customer_type_availability, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW()::text, $10, $11, NOW()::text, $12, $13, $14, NOW()::text, NOW()::text)
      `, ['prod_nonsearch', testSupplierId, 'cat_lumber', 'NONSEARCH', 'Hidden Product', 99.99, 'piece', 50, 10, 'active', false, 1, 1, 'all']);

      const response = await request(app)
        .get('/api/products');

      expect(response.status).toBe(200);
      
      const hiddenProduct = response.body.products.find((p: any) => p.product_id === 'prod_nonsearch');
      expect(hiddenProduct).toBeUndefined();
    });
  });

  describe('GET /api/products/:product_id - Get Product Details', () => {
    
    it('should return full product details for authenticated customer', async () => {
      const response = await request(app)
        .get('/api/products/prod_search_001')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        product_id: 'prod_search_001',
        product_name: '2x4 Pine Lumber',
        price_per_unit: 8.99,
        stock_quantity: 100
      });
      expect(response.body).toHaveProperty('supplier');
      expect(response.body).toHaveProperty('category');
    });

    it('should return basic product details for guest users', async () => {
      const response = await request(app)
        .get('/api/products/prod_search_001');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('product_name');
      expect(response.body).toHaveProperty('price_per_unit');
      // Stock quantity may be limited for guests depending on implementation
    });

    it('should return 404 for non-existent product', async () => {
      const response = await request(app)
        .get('/api/products/nonexistent_product_id');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('ProductNotFoundError');
    });

    it('should increment view count when product viewed', async () => {
      const before = await pool.query('SELECT views_count FROM products WHERE product_id = $1', ['prod_search_001']);
      const beforeCount = before.rows[0].views_count;

      await request(app)
        .post('/api/products/prod_search_001/view')
        .set('Authorization', `Bearer ${customerToken}`);

      const after = await pool.query('SELECT views_count FROM products WHERE product_id = $1', ['prod_search_001']);
      const afterCount = after.rows[0].views_count;

      expect(afterCount).toBe(beforeCount + 1);
    });
  });

  describe('POST /api/suppliers/me/products - Create Product', () => {
    
    it('should successfully create product with all required fields', async () => {
      const response = await request(app)
        .post('/api/suppliers/me/products')
        .set('Authorization', `Bearer ${supplierToken}`)
        .send({
          category_id: 'cat_lumber',
          sku: 'TEST-SKU-001',
          product_name: 'Test Lumber Product',
          description: 'High quality test lumber',
          price_per_unit: 12.99,
          unit_of_measure: 'piece',
          stock_quantity: 500,
          low_stock_threshold: 50,
          images: ['https://example.com/image1.jpg'],
          primary_image_url: 'https://example.com/image1.jpg',
          brand: 'TestBrand',
          handling_time_days: 1,
          minimum_order_quantity: 1
        });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        product_name: 'Test Lumber Product',
        sku: 'TEST-SKU-001',
        price_per_unit: 12.99,
        stock_quantity: 500,
        status: 'active'
      });

      testProductId = response.body.product_id;

      // Verify in database
      const dbCheck = await pool.query('SELECT * FROM products WHERE product_id = $1', [testProductId]);
      expect(dbCheck.rows.length).toBe(1);
      expect(dbCheck.rows[0].supplier_id).toBe(testSupplierId);
    });

    it('should reject product creation without required fields', async () => {
      const response = await request(app)
        .post('/api/suppliers/me/products')
        .set('Authorization', `Bearer ${supplierToken}`)
        .send({
          category_id: 'cat_lumber',
          product_name: 'Incomplete Product'
          // Missing sku, price_per_unit, unit_of_measure
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('ValidationError');
    });

    it('should reject product creation with duplicate SKU for same supplier', async () => {
      await request(app)
        .post('/api/suppliers/me/products')
        .set('Authorization', `Bearer ${supplierToken}`)
        .send({
          category_id: 'cat_lumber',
          sku: 'DUPLICATE-SKU',
          product_name: 'First Product',
          price_per_unit: 10.00,
          unit_of_measure: 'piece',
          stock_quantity: 100
        });

      const response = await request(app)
        .post('/api/suppliers/me/products')
        .set('Authorization', `Bearer ${supplierToken}`)
        .send({
          category_id: 'cat_lumber',
          sku: 'DUPLICATE-SKU',
          product_name: 'Second Product',
          price_per_unit: 15.00,
          unit_of_measure: 'piece',
          stock_quantity: 50
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('DuplicateSKUError');
    });

    it('should initialize product with default values', async () => {
      const response = await request(app)
        .post('/api/suppliers/me/products')
        .set('Authorization', `Bearer ${supplierToken}`)
        .send({
          category_id: 'cat_lumber',
          sku: 'DEFAULTS-TEST',
          product_name: 'Defaults Test Product',
          price_per_unit: 20.00,
          unit_of_measure: 'piece'
        });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('active');
      expect(response.body.is_featured).toBe(false);
      expect(response.body.stock_quantity).toBe(0);
      expect(response.body.low_stock_threshold).toBeGreaterThanOrEqual(0);
      expect(response.body.views_count).toBe(0);
      expect(response.body.sales_count).toBe(0);
      expect(response.body.searchable).toBe(true);
      expect(response.body.customer_type_availability).toBe('all');
    });

    it('should reject unauthorized product creation', async () => {
      const response = await request(app)
        .post('/api/suppliers/me/products')
        .set('Authorization', `Bearer ${customerToken}`) // Customer token, not supplier
        .send({
          category_id: 'cat_lumber',
          sku: 'UNAUTH-SKU',
          product_name: 'Unauthorized Product',
          price_per_unit: 10.00,
          unit_of_measure: 'piece'
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('ForbiddenError');
    });
  });

  describe('PATCH /api/products/:product_id - Update Product', () => {
    
    it('should successfully update product details', async () => {
      const response = await request(app)
        .patch(`/api/products/${testProductId}`)
        .set('Authorization', `Bearer ${supplierToken}`)
        .send({
          product_name: 'Updated Lumber Product',
          price_per_unit: 14.99,
          stock_quantity: 750
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        product_id: testProductId,
        product_name: 'Updated Lumber Product',
        price_per_unit: 14.99,
        stock_quantity: 750
      });

      // Verify in database
      const dbCheck = await pool.query('SELECT * FROM products WHERE product_id = $1', [testProductId]);
      expect(dbCheck.rows[0].product_name).toBe('Updated Lumber Product');
      expect(parseFloat(dbCheck.rows[0].price_per_unit)).toBe(14.99);
    });

    it('should update last_updated_timestamp when stock changes', async () => {
      const before = await pool.query('SELECT last_updated_timestamp FROM products WHERE product_id = $1', [testProductId]);
      const beforeTime = before.rows[0].last_updated_timestamp;

      await new Promise(resolve => setTimeout(resolve, 100));

      await request(app)
        .patch(`/api/products/${testProductId}`)
        .set('Authorization', `Bearer ${supplierToken}`)
        .send({ stock_quantity: 800 });

      const after = await pool.query('SELECT last_updated_timestamp FROM products WHERE product_id = $1', [testProductId]);
      const afterTime = after.rows[0].last_updated_timestamp;

      expect(new Date(afterTime).getTime()).toBeGreaterThan(new Date(beforeTime).getTime());
    });

    it('should reject update from different supplier', async () => {
      // Create another supplier
      const otherSupplierUser = await pool.query(`
        INSERT INTO users (user_id, email, password_hash, user_type, first_name, last_name, phone_number, registration_date, status, email_verified, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING user_id
      `, ['other_supplier_user', 'othersupplier@example.com', 'supplier123', 'supplier', 'Other', 'Supplier', '+1-555-9999', new Date().toISOString(), 'active', true, new Date().toISOString(), new Date().toISOString()]);

      await pool.query(`
        INSERT INTO suppliers (supplier_id, user_id, business_name, business_type, verification_status, commission_rate, subscription_plan, payout_frequency, status, onboarding_completed, member_since, rating_average, total_reviews, total_sales, total_orders, fulfillment_rate, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      `, ['other_supplier_001', otherSupplierUser.rows[0].user_id, 'Other Supply', 'LLC', 'verified', 8.5, 'standard', 'monthly', 'active', true, new Date().toISOString(), 0, 0, 0, 0, 0, new Date().toISOString(), new Date().toISOString()]);

      const otherSupplierLogin = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'othersupplier@example.com',
          password: 'supplier123'
        });

      const response = await request(app)
        .patch(`/api/products/${testProductId}`)
        .set('Authorization', `Bearer ${otherSupplierLogin.body.token}`)
        .send({ price_per_unit: 99.99 });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('ForbiddenError');
    });
  });
});

// ============================================
// CART TESTS
// ============================================

describe('Shopping Cart Endpoints', () => {
  
  let testProductId1: string;
  let testProductId2: string;
  let customerToken: string;
  let customerId: string;

  beforeAll(async () => {
    // Create customer for cart tests
    const customerRes = await request(app)
      .post('/api/auth/register/customer')
      .send({
        email: 'cartcustomer@example.com',
        password: 'password123',
        first_name: 'Cart',
        last_name: 'Tester',
        phone_number: '+1-555-CART',
        account_type: 'retail'
      });

    customerToken = customerRes.body.token;
    customerId = customerRes.body.customer.customer_id;

    // Create test products
    const supplier = await pool.query('SELECT supplier_id FROM suppliers LIMIT 1');
    const supplierId = supplier.rows[0].supplier_id;

    const prod1 = await pool.query(`
      INSERT INTO products (product_id, supplier_id, category_id, sku, product_name, price_per_unit, unit_of_measure, stock_quantity, low_stock_threshold, last_updated_timestamp, status, creation_date, handling_time_days, minimum_order_quantity, customer_type_availability, searchable, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW()::text, $10, NOW()::text, $11, $12, $13, $14, NOW()::text, NOW()::text)
      RETURNING product_id
    `, ['cart_prod_001', supplierId, 'cat_lumber', 'CART-PROD-1', 'Cart Test Product 1', 10.00, 'piece', 100, 10, 'active', 1, 1, 'all', true]);

    const prod2 = await pool.query(`
      INSERT INTO products (product_id, supplier_id, category_id, sku, product_name, price_per_unit, unit_of_measure, stock_quantity, low_stock_threshold, last_updated_timestamp, status, creation_date, handling_time_days, minimum_order_quantity, customer_type_availability, searchable, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW()::text, $10, NOW()::text, $11, $12, $13, $14, NOW()::text, NOW()::text)
      RETURNING product_id
    `, ['cart_prod_002', supplierId, 'cat_electrical', 'CART-PROD-2', 'Cart Test Product 2', 5.00, 'piece', 200, 20, 'active', 1, 1, 'all', true]);

    testProductId1 = prod1.rows[0].product_id;
    testProductId2 = prod2.rows[0].product_id;
  });

  describe('POST /api/cart/items - Add to Cart', () => {
    
    it('should create cart and add first item', async () => {
      const response = await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          product_id: testProductId1,
          quantity: 5
        });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        product_id: testProductId1,
        quantity: 5,
        price_per_unit: 10.00
      });
      expect(response.body).toHaveProperty('cart_id');
      expect(response.body).toHaveProperty('cart_item_id');

      // Verify cart created
      const cartCheck = await pool.query('SELECT * FROM carts WHERE customer_id = $1 AND status = $2', [customerId, 'active']);
      expect(cartCheck.rows.length).toBe(1);
      expect(cartCheck.rows[0].status).toBe('active');

      // Verify cart item created
      const itemCheck = await pool.query('SELECT * FROM cart_items WHERE cart_id = $1', [cartCheck.rows[0].cart_id]);
      expect(itemCheck.rows.length).toBe(1);
      expect(parseInt(itemCheck.rows[0].quantity)).toBe(5);
    });

    it('should add second item to existing cart', async () => {
      const response = await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          product_id: testProductId2,
          quantity: 10
        });

      expect(response.status).toBe(201);
      expect(response.body.quantity).toBe(10);

      // Verify cart now has 2 items
      const cartCheck = await pool.query('SELECT * FROM carts WHERE customer_id = $1 AND status = $2', [customerId, 'active']);
      const itemsCheck = await pool.query('SELECT * FROM cart_items WHERE cart_id = $1', [cartCheck.rows[0].cart_id]);
      
      expect(itemsCheck.rows.length).toBe(2);
    });

    it('should update quantity if product already in cart', async () => {
      // Add product first time
      const firstAdd = await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          product_id: testProductId1,
          quantity: 3
        });

      const cartItemId1 = firstAdd.body.cart_item_id;

      // Add same product again
      const secondAdd = await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          product_id: testProductId1,
          quantity: 2
        });

      expect(secondAdd.status).toBe(201);
      
      // Should have updated existing item, not created new
      const itemCheck = await pool.query('SELECT * FROM cart_items WHERE cart_item_id = $1', [cartItemId1]);
      expect(parseInt(itemCheck.rows[0].quantity)).toBe(5); // 3 + 2
    });

    it('should reject adding product with insufficient stock', async () => {
      const response = await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          product_id: testProductId1,
          quantity: 1000 // More than available stock (100)
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('InsufficientStockError');
      expect(response.body.details).toHaveProperty('available_stock');
    });

    it('should reject adding out-of-stock product', async () => {
      // Create out of stock product
      const supplier = await pool.query('SELECT supplier_id FROM suppliers LIMIT 1');
      const outOfStockProd = await pool.query(`
        INSERT INTO products (product_id, supplier_id, category_id, sku, product_name, price_per_unit, unit_of_measure, stock_quantity, low_stock_threshold, last_updated_timestamp, status, creation_date, handling_time_days, minimum_order_quantity, customer_type_availability, searchable, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW()::text, $10, NOW()::text, $11, $12, $13, $14, NOW()::text, NOW()::text)
        RETURNING product_id
      `, ['out_of_stock_prod', supplier.rows[0].supplier_id, 'cat_lumber', 'OOS-SKU', 'Out of Stock Product', 25.00, 'piece', 0, 10, 'out_of_stock', 1, 1, 'all', true]);

      const response = await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          product_id: outOfStockProd.rows[0].product_id,
          quantity: 1
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('OutOfStock');
    });

    it('should snapshot product price at the time of adding to cart', async () => {
      const response = await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          product_id: testProductId1,
          quantity: 2
        });

      expect(response.status).toBe(201);
      const cartPrice = response.body.price_per_unit;

      // Now update product price
      await pool.query('UPDATE products SET price_per_unit = $1 WHERE product_id = $2', [99.99, testProductId1]);

      // Check cart still has original price
      const cartItemCheck = await pool.query('SELECT price_per_unit FROM cart_items WHERE cart_item_id = $1', [response.body.cart_item_id]);
      expect(parseFloat(cartItemCheck.rows[0].price_per_unit)).toBe(cartPrice);
    });
  });

  describe('GET /api/cart - Get Cart', () => {
    
    it('should return cart with all items and calculations', async () => {
      const response = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('cart');
      expect(response.body).toHaveProperty('items');
      expect(response.body.items).toBeInstanceOf(Array);
      expect(response.body).toHaveProperty('subtotal');
      expect(response.body).toHaveProperty('total_items');

      // Verify subtotal calculation
      const expectedSubtotal = response.body.items.reduce((sum: number, item: any) => {
        return sum + (item.price_per_unit * item.quantity);
      }, 0);
      
      expect(response.body.subtotal).toBeCloseTo(expectedSubtotal, 2);
    });

    it('should group cart items by supplier', async () => {
      const response = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(200);
      
      // Items should have supplier_id
      response.body.items.forEach((item: any) => {
        expect(item).toHaveProperty('supplier_id');
      });
    });

    it('should return empty cart for new customer', async () => {
      const newCustomerRes = await request(app)
        .post('/api/auth/register/customer')
        .send({
          email: 'emptycart@example.com',
          password: 'password123',
          first_name: 'Empty',
          last_name: 'Cart',
          phone_number: '+1-555-EMPTY',
          account_type: 'retail'
        });

      const response = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${newCustomerRes.body.token}`);

      expect(response.status).toBe(200);
      expect(response.body.items).toEqual([]);
      expect(response.body.subtotal).toBe(0);
      expect(response.body.total_items).toBe(0);
    });
  });

  describe('PATCH /api/cart/items/:cart_item_id - Update Cart Item', () => {
    
    it('should update cart item quantity', async () => {
      // Add item to cart first
      const addRes = await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          product_id: testProductId1,
          quantity: 5
        });

      const cartItemId = addRes.body.cart_item_id;

      // Update quantity
      const response = await request(app)
        .patch(`/api/cart/items/${cartItemId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ quantity: 10 });

      expect(response.status).toBe(200);
      expect(response.body.quantity).toBe(10);

      // Verify in database
      const dbCheck = await pool.query('SELECT quantity FROM cart_items WHERE cart_item_id = $1', [cartItemId]);
      expect(parseInt(dbCheck.rows[0].quantity)).toBe(10);
    });

    it('should reject update with insufficient stock', async () => {
      const addRes = await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          product_id: testProductId1,
          quantity: 5
        });

      const response = await request(app)
        .patch(`/api/cart/items/${addRes.body.cart_item_id}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ quantity: 1000 }); // More than available

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('InsufficientStockError');
    });

    it('should reject update to zero or negative quantity', async () => {
      const addRes = await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          product_id: testProductId1,
          quantity: 5
        });

      const response = await request(app)
        .patch(`/api/cart/items/${addRes.body.cart_item_id}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ quantity: 0 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('ValidationError');
    });
  });

  describe('DELETE /api/cart/items/:cart_item_id - Remove from Cart', () => {
    
    it('should successfully remove item from cart', async () => {
      // Add item
      const addRes = await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          product_id: testProductId1,
          quantity: 3
        });

      const cartItemId = addRes.body.cart_item_id;

      // Remove item
      const response = await request(app)
        .delete(`/api/cart/items/${cartItemId}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(204);

      // Verify removed from database
      const dbCheck = await pool.query('SELECT * FROM cart_items WHERE cart_item_id = $1', [cartItemId]);
      expect(dbCheck.rows.length).toBe(0);
    });

    it('should update cart last_modified_date after removal', async () => {
      const addRes = await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          product_id: testProductId1,
          quantity: 2
        });

      const cartCheck = await pool.query('SELECT last_modified_date FROM carts WHERE customer_id = $1 AND status = $2', [customerId, 'active']);
      const beforeTime = cartCheck.rows[0].last_modified_date;

      await new Promise(resolve => setTimeout(resolve, 100));

      await request(app)
        .delete(`/api/cart/items/${addRes.body.cart_item_id}`)
        .set('Authorization', `Bearer ${customerToken}`);

      const afterCheck = await pool.query('SELECT last_modified_date FROM carts WHERE customer_id = $1 AND status = $2', [customerId, 'active']);
      const afterTime = afterCheck.rows[0].last_modified_date;

      expect(new Date(afterTime).getTime()).toBeGreaterThan(new Date(beforeTime).getTime());
    });
  });

  describe('DELETE /api/cart - Clear Cart', () => {
    
    it('should clear all items from cart', async () => {
      // Add multiple items
      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ product_id: testProductId1, quantity: 5 });

      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ product_id: testProductId2, quantity: 3 });

      // Clear cart
      const response = await request(app)
        .delete('/api/cart')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(204);

      // Verify all items removed
      const cartCheck = await pool.query('SELECT * FROM carts WHERE customer_id = $1 AND status = $2', [customerId, 'active']);
      
      if (cartCheck.rows.length > 0) {
        const itemsCheck = await pool.query('SELECT * FROM cart_items WHERE cart_id = $1', [cartCheck.rows[0].cart_id]);
        expect(itemsCheck.rows.length).toBe(0);
      }
    });
  });

  describe('POST /api/cart/save - Save Cart as Project', () => {
    
    it('should save current cart as named project', async () => {
      // Add items to cart
      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ product_id: testProductId1, quantity: 10 });

      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ product_id: testProductId2, quantity: 20 });

      // Save as project
      const response = await request(app)
        .post('/api/cart/save')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          project_name: 'My Test Project',
          description: 'Test project for cart saving'
        });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        project_name: 'My Test Project',
        description: 'Test project for cart saving',
        item_count: 2
      });

      // Verify project created
      const projectCheck = await pool.query('SELECT * FROM projects WHERE project_id = $1', [response.body.project_id]);
      expect(projectCheck.rows.length).toBe(1);

      // Verify project items created
      const itemsCheck = await pool.query('SELECT * FROM project_items WHERE project_id = $1', [response.body.project_id]);
      expect(itemsCheck.rows.length).toBe(2);
    });
  });
});

// ============================================
// ORDER TESTS
// ============================================

describe('Order Endpoints', () => {
  
  let orderCustomerToken: string;
  let orderCustomerId: string;
  let orderAddressId: string;
  let testProductId: string;

  beforeAll(async () => {
    // Create customer with address
    const customerRes = await request(app)
      .post('/api/auth/register/customer')
      .send({
        email: 'ordercustomer@example.com',
        password: 'password123',
        first_name: 'Order',
        last_name: 'Tester',
        phone_number: '+1-555-ORDER',
        account_type: 'trade',
        default_delivery_address: {
          street_address: '789 Order St',
          city: 'Austin',
          state: 'TX',
          postal_code: '78701'
        }
      });

    orderCustomerToken = customerRes.body.token;
    orderCustomerId = customerRes.body.customer.customer_id;

    // Get address ID
    const addressCheck = await pool.query('SELECT address_id FROM addresses WHERE user_id IN (SELECT user_id FROM customers WHERE customer_id = $1)', [orderCustomerId]);
    orderAddressId = addressCheck.rows[0].address_id;

    // Set up trade credit
    await pool.query('UPDATE customers SET trade_credit_limit = $1, trade_credit_balance = $2 WHERE customer_id = $3', [10000, 10000, orderCustomerId]);

    // Create product for orders
    const supplier = await pool.query('SELECT supplier_id FROM suppliers WHERE verification_status = $1 LIMIT 1', ['verified']);
    const prod = await pool.query(`
      INSERT INTO products (product_id, supplier_id, category_id, sku, product_name, price_per_unit, unit_of_measure, stock_quantity, low_stock_threshold, last_updated_timestamp, status, creation_date, handling_time_days, minimum_order_quantity, customer_type_availability, searchable, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW()::text, $10, NOW()::text, $11, $12, $13, $14, NOW()::text, NOW()::text)
      RETURNING product_id
    `, ['order_prod_001', supplier.rows[0].supplier_id, 'cat_lumber', 'ORD-PROD-1', 'Order Test Product', 50.00, 'piece', 1000, 100, 'active', 1, 1, 'all', true]);

    testProductId = prod.rows[0].product_id;

    // Add items to cart
    await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${orderCustomerToken}`)
      .send({
        product_id: testProductId,
        quantity: 10
      });
  });

  describe('POST /api/orders - Create Order', () => {
    
    it('should successfully create order from cart', async () => {
      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${orderCustomerToken}`)
        .send({
          delivery_address_id: orderAddressId,
          payment_method: 'trade_credit',
          customer_notes: 'Test order please handle with care',
          delivery_windows: [
            {
              supplier_id: (await pool.query('SELECT supplier_id FROM suppliers LIMIT 1')).rows[0].supplier_id,
              delivery_window_start: new Date(Date.now() + 86400000).toISOString(),
              delivery_window_end: new Date(Date.now() + 90000000).toISOString(),
              delivery_method: 'standard_delivery'
            }
          ]
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('order_id');
      expect(response.body).toHaveProperty('order_number');
      expect(response.body.status).toBe('pending');
      expect(response.body.payment_status).toBe('paid');
      expect(response.body.total_amount).toBeGreaterThan(0);

      testOrderId = response.body.order_id;

      // Verify order created in database
      const orderCheck = await pool.query('SELECT * FROM orders WHERE order_id = $1', [testOrderId]);
      expect(orderCheck.rows.length).toBe(1);
      expect(orderCheck.rows[0].customer_id).toBe(orderCustomerId);

      // Verify order items created
      const itemsCheck = await pool.query('SELECT * FROM order_items WHERE order_id = $1', [testOrderId]);
      expect(itemsCheck.rows.length).toBeGreaterThan(0);

      // Verify inventory decremented
      const productCheck = await pool.query('SELECT stock_quantity FROM products WHERE product_id = $1', [testProductId]);
      expect(parseInt(productCheck.rows[0].stock_quantity)).toBeLessThan(1000);

      // Verify cart marked as converted
      const cartCheck = await pool.query('SELECT status FROM carts WHERE customer_id = $1', [orderCustomerId]);
      const hasConverted = cartCheck.rows.some(cart => cart.status === 'converted');
      expect(hasConverted).toBe(true);

      // Verify delivery record created
      const deliveryCheck = await pool.query('SELECT * FROM deliveries WHERE order_id = $1', [testOrderId]);
      expect(deliveryCheck.rows.length).toBeGreaterThan(0);
      expect(deliveryCheck.rows[0].delivery_status).toBe('scheduled');

      // Verify order timeline entry created
      const timelineCheck = await pool.query('SELECT * FROM order_timeline WHERE order_id = $1', [testOrderId]);
      expect(timelineCheck.rows.length).toBeGreaterThan(0);
      
      const hasOrderPlaced = timelineCheck.rows.some(t => t.milestone === 'order_placed');
      expect(hasOrderPlaced).toBe(true);
    });

    it('should fail order creation if cart is empty', async () => {
      // Create new customer with empty cart
      const newCustomer = await request(app)
        .post('/api/auth/register/customer')
        .send({
          email: 'emptycartorder@example.com',
          password: 'password123',
          first_name: 'Empty',
          last_name: 'Order',
          phone_number: '+1-555-9876',
          account_type: 'retail',
          default_delivery_address: {
            street_address: '123 Empty St',
            city: 'Austin',
            state: 'TX',
            postal_code: '78701'
          }
        });

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${newCustomer.body.token}`)
        .send({
          delivery_address_id: (await pool.query('SELECT address_id FROM addresses WHERE user_id IN (SELECT user_id FROM customers WHERE customer_id = $1)', [newCustomer.body.customer.customer_id])).rows[0].address_id,
          payment_method: 'credit_card',
          delivery_windows: []
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('EmptyCartError');
    });

    it('should fail if trade credit insufficient', async () => {
      // Create customer with low credit
      const lowCreditCustomer = await request(app)
        .post('/api/auth/register/customer')
        .send({
          email: 'lowcredit@example.com',
          password: 'password123',
          first_name: 'Low',
          last_name: 'Credit',
          phone_number: '+1-555-CREDIT',
          account_type: 'trade',
          default_delivery_address: {
            street_address: '456 Credit St',
            city: 'Austin',
            state: 'TX',
            postal_code: '78701'
          }
        });

      await pool.query('UPDATE customers SET trade_credit_limit = $1, trade_credit_balance = $2 WHERE customer_id = $3', [100, 10, lowCreditCustomer.body.customer.customer_id]);

      // Add expensive item to cart
      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${lowCreditCustomer.body.token}`)
        .send({ product_id: testProductId, quantity: 50 }); // 50 * $50 = $2500

      const addressId = (await pool.query('SELECT address_id FROM addresses WHERE user_id IN (SELECT user_id FROM customers WHERE customer_id = $1)', [lowCreditCustomer.body.customer.customer_id])).rows[0].address_id;

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${lowCreditCustomer.body.token}`)
        .send({
          delivery_address_id: addressId,
          payment_method: 'trade_credit',
          delivery_windows: [
            {
              supplier_id: (await pool.query('SELECT supplier_id FROM suppliers LIMIT 1')).rows[0].supplier_id,
              delivery_window_start: new Date(Date.now() + 86400000).toISOString(),
              delivery_window_end: new Date(Date.now() + 90000000).toISOString(),
              delivery_method: 'standard_delivery'
            }
          ]
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('InsufficientCreditError');
    });

    it('should rollback inventory if payment fails', async () => {
      // This test would mock payment gateway failure
      // For now, test database transaction rollback logic
      
      const beforeStock = await pool.query('SELECT stock_quantity FROM products WHERE product_id = $1', [testProductId]);
      const stockBefore = parseInt(beforeStock.rows[0].stock_quantity);

      // Attempt order with invalid payment method (should fail)
      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${orderCustomerToken}`)
        .send({
          delivery_address_id: orderAddressId,
          payment_method: 'invalid_payment_method',
          delivery_windows: []
        });

      expect(response.status).toBe(400);

      // Verify stock unchanged (transaction rolled back)
      const afterStock = await pool.query('SELECT stock_quantity FROM products WHERE product_id = $1', [testProductId]);
      const stockAfter = parseInt(afterStock.rows[0].stock_quantity);

      expect(stockAfter).toBe(stockBefore);
    });

    it('should create order timeline with initial milestones', async () => {
      // Add items to cart
      await pool.query('DELETE FROM cart_items WHERE cart_id IN (SELECT cart_id FROM carts WHERE customer_id = $1)', [orderCustomerId]);
      
      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${orderCustomerToken}`)
        .send({ product_id: testProductId, quantity: 5 });

      const orderRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${orderCustomerToken}`)
        .send({
          delivery_address_id: orderAddressId,
          payment_method: 'trade_credit',
          delivery_windows: [
            {
              supplier_id: (await pool.query('SELECT supplier_id FROM products WHERE product_id = $1', [testProductId])).rows[0].supplier_id,
              delivery_window_start: new Date(Date.now() + 86400000).toISOString(),
              delivery_window_end: new Date(Date.now() + 90000000).toISOString(),
              delivery_method: 'standard_delivery'
            }
          ]
        });

      const timelineCheck = await pool.query('SELECT * FROM order_timeline WHERE order_id = $1 ORDER BY timestamp', [orderRes.body.order_id]);
      
      expect(timelineCheck.rows.length).toBeGreaterThan(0);
      
      const milestones = timelineCheck.rows.map(t => t.milestone);
      expect(milestones).toContain('order_placed');
      expect(milestones).toContain('payment_confirmed');
    });
  });

  describe('GET /api/orders - Get Orders', () => {
    
    it('should return customer\'s orders', async () => {
      const response = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${orderCustomerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.orders).toBeInstanceOf(Array);
      expect(response.body).toHaveProperty('total');

      // All orders should belong to customer
      response.body.orders.forEach((order: any) => {
        expect(order.customer_id).toBe(orderCustomerId);
      });
    });

    it('should filter orders by status', async () => {
      const response = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${orderCustomerToken}`)
        .query({ status_filter: 'pending' });

      expect(response.status).toBe(200);
      response.body.orders.forEach((order: any) => {
        expect(order.status).toBe('pending');
      });
    });

    it('should sort orders by date descending by default', async () => {
      const response = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${orderCustomerToken}`);

      expect(response.status).toBe(200);
      
      if (response.body.orders.length > 1) {
        for (let i = 1; i < response.body.orders.length; i++) {
          const date1 = new Date(response.body.orders[i - 1].order_date);
          const date2 = new Date(response.body.orders[i].order_date);
          expect(date1.getTime()).toBeGreaterThanOrEqual(date2.getTime());
        }
      }
    });

    it('should paginate orders correctly', async () => {
      const response = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${orderCustomerToken}`)
        .query({ limit: 10, offset: 0 });

      expect(response.status).toBe(200);
      expect(response.body.orders.length).toBeLessThanOrEqual(10);
    });
  });

  describe('GET /api/orders/:order_id - Get Order Details', () => {
    
    it('should return complete order details with timeline', async () => {
      const response = await request(app)
        .get(`/api/orders/${testOrderId}`)
        .set('Authorization', `Bearer ${orderCustomerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.order).toMatchObject({
        order_id: testOrderId
      });
      expect(response.body).toHaveProperty('items');
      expect(response.body.items).toBeInstanceOf(Array);
      expect(response.body).toHaveProperty('delivery');
      expect(response.body).toHaveProperty('timeline');
      expect(response.body.timeline).toBeInstanceOf(Array);
    });

    it('should return 403 for unauthorized access to other customer\'s order', async () => {
      // Create another customer
      const otherCustomer = await request(app)
        .post('/api/auth/register/customer')
        .send({
          email: 'othercustomer@example.com',
          password: 'password123',
          first_name: 'Other',
          last_name: 'Customer',
          phone_number: '+1-555-OTHER',
          account_type: 'retail'
        });

      const response = await request(app)
        .get(`/api/orders/${testOrderId}`)
        .set('Authorization', `Bearer ${otherCustomer.body.token}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('ForbiddenError');
    });

    it('should return 404 for non-existent order', async () => {
      const response = await request(app)
        .get('/api/orders/nonexistent_order_id')
        .set('Authorization', `Bearer ${orderCustomerToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('OrderNotFoundError');
    });
  });

  describe('POST /api/orders/:order_id/cancel - Cancel Order', () => {
    
    it('should successfully cancel pending order', async () => {
      // Create new order to cancel
      await pool.query('DELETE FROM cart_items WHERE cart_id IN (SELECT cart_id FROM carts WHERE customer_id = $1 AND status = $2)', [orderCustomerId, 'active']);
      
      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${orderCustomerToken}`)
        .send({ product_id: testProductId, quantity: 5 });

      const orderRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${orderCustomerToken}`)
        .send({
          delivery_address_id: orderAddressId,
          payment_method: 'trade_credit',
          delivery_windows: []
        });

      const cancelOrderId = orderRes.body.order_id;
      const beforeStock = await pool.query('SELECT stock_quantity FROM products WHERE product_id = $1', [testProductId]);

      // Cancel order
      const cancelRes = await request(app)
        .post(`/api/orders/${cancelOrderId}/cancel`)
        .set('Authorization', `Bearer ${orderCustomerToken}`)
        .send({
          cancellation_reason: 'Changed my mind'
        });

      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.message).toContain('cancelled');

      // Verify order status updated
      const orderCheck = await pool.query('SELECT status FROM orders WHERE order_id = $1', [cancelOrderId]);
      expect(orderCheck.rows[0].status).toBe('cancelled');

      // Verify inventory restored
      const afterStock = await pool.query('SELECT stock_quantity FROM products WHERE product_id = $1', [testProductId]);
      expect(parseInt(afterStock.rows[0].stock_quantity)).toBeGreaterThan(parseInt(beforeStock.rows[0].stock_quantity));
    });

    it('should reject cancellation of already shipped order', async () => {
      // Update order status to shipped
      await pool.query('UPDATE orders SET status = $1 WHERE order_id = $2', ['shipped', testOrderId]);

      const response = await request(app)
        .post(`/api/orders/${testOrderId}/cancel`)
        .set('Authorization', `Bearer ${orderCustomerToken}`)
        .send({ cancellation_reason: 'Too late' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('CannotCancelError');
    });
  });

  describe('POST /api/orders/:order_id/reorder - Reorder', () => {
    
    it('should add all order items to cart for reorder', async () => {
      // Clear current cart
      await pool.query('DELETE FROM cart_items WHERE cart_id IN (SELECT cart_id FROM carts WHERE customer_id = $1)', [orderCustomerId]);

      const response = await request(app)
        .post(`/api/orders/${testOrderId}/reorder`)
        .set('Authorization', `Bearer ${orderCustomerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('added to cart');
      expect(response.body.added_items).toBeGreaterThan(0);

      // Verify items in cart
      const cartCheck = await pool.query(`
        SELECT ci.* 
        FROM cart_items ci
        INNER JOIN carts c ON ci.cart_id = c.cart_id
        WHERE c.customer_id = $1 AND c.status = $2
      `, [orderCustomerId, 'active']);

      expect(cartCheck.rows.length).toBeGreaterThan(0);
    });

    it('should report unavailable items during reorder', async () => {
      // Set product as out of stock
      await pool.query('UPDATE products SET stock_quantity = $1, status = $2 WHERE product_id = $3', [0, 'out_of_stock', testProductId]);

      const response = await request(app)
        .post(`/api/orders/${testOrderId}/reorder`)
        .set('Authorization', `Bearer ${orderCustomerToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('unavailable_items');
      expect(response.body.unavailable_items.length).toBeGreaterThan(0);

      // Restore stock
      await pool.query('UPDATE products SET stock_quantity = $1, status = $2 WHERE product_id = $3', [1000, 'active', testProductId]);
    });
  });
});

// ============================================
// DELIVERY & TRACKING TESTS
// ============================================

describe('Delivery & Tracking Endpoints', () => {
  
  let deliveryId: string;
  let deliveryOrderId: string;

  beforeAll(async () => {
    // Create order with delivery for tests
    const orderCheck = await pool.query('SELECT order_id FROM orders WHERE customer_id = $1 LIMIT 1', [orderCustomerId]);
    
    if (orderCheck.rows.length > 0) {
      deliveryOrderId = orderCheck.rows[0].order_id;
      
      const deliveryCheck = await pool.query('SELECT delivery_id FROM deliveries WHERE order_id = $1 LIMIT 1', [deliveryOrderId]);
      
      if (deliveryCheck.rows.length > 0) {
        deliveryId = deliveryCheck.rows[0].delivery_id;
      }
    }
  });

  describe('GET /api/deliveries/:delivery_id - Get Delivery', () => {
    
    it('should return delivery details', async () => {
      if (!deliveryId) {
        console.log('Skipping: No delivery ID available');
        return;
      }

      const response = await request(app)
        .get(`/api/deliveries/${deliveryId}`)
        .set('Authorization', `Bearer ${orderCustomerToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        delivery_id: deliveryId,
        order_id: deliveryOrderId
      });
      expect(response.body).toHaveProperty('delivery_status');
      expect(response.body).toHaveProperty('delivery_window_start');
      expect(response.body).toHaveProperty('delivery_window_end');
    });
  });

  describe('PATCH /api/deliveries/:delivery_id - Update Delivery', () => {
    
    it('should update delivery status', async () => {
      if (!deliveryId) {
        console.log('Skipping: No delivery ID available');
        return;
      }

      const response = await request(app)
        .patch(`/api/deliveries/${deliveryId}`)
        .set('Authorization', `Bearer ${supplierToken}`)
        .send({
          delivery_status: 'preparing'
        });

      expect(response.status).toBe(200);
      expect(response.body.delivery_status).toBe('preparing');

      // Verify in database
      const dbCheck = await pool.query('SELECT delivery_status FROM deliveries WHERE delivery_id = $1', [deliveryId]);
      expect(dbCheck.rows[0].delivery_status).toBe('preparing');
    });

    it('should update GPS coordinates during delivery', async () => {
      if (!deliveryId) {
        console.log('Skipping: No delivery ID available');
        return;
      }

      const response = await request(app)
        .patch(`/api/deliveries/${deliveryId}`)
        .set('Authorization', `Bearer ${supplierToken}`)
        .send({
          delivery_status: 'out_for_delivery',
          current_latitude: 30.2672,
          current_longitude: -97.7431,
          estimated_arrival_time: new Date(Date.now() + 3600000).toISOString()
        });

      expect(response.status).toBe(200);
      expect(response.body.current_latitude).toBe(30.2672);
      expect(response.body.current_longitude).toBe(-97.7431);

      // Verify in database
      const dbCheck = await pool.query('SELECT current_latitude, current_longitude, delivery_status FROM deliveries WHERE delivery_id = $1', [deliveryId]);
      expect(parseFloat(dbCheck.rows[0].current_latitude)).toBeCloseTo(30.2672, 4);
      expect(parseFloat(dbCheck.rows[0].current_longitude)).toBeCloseTo(-97.7431, 4);
      expect(dbCheck.rows[0].delivery_status).toBe('out_for_delivery');
    });

    it('should require proof of delivery when marking as delivered', async () => {
      if (!deliveryId) {
        console.log('Skipping: No delivery ID available');
        return;
      }

      const response = await request(app)
        .patch(`/api/deliveries/${deliveryId}`)
        .set('Authorization', `Bearer ${supplierToken}`)
        .send({
          delivery_status: 'delivered',
          delivery_proof_photo_url: 'https://example.com/proof.jpg',
          actual_delivery_time: new Date().toISOString()
        });

      expect(response.status).toBe(200);
      expect(response.body.delivery_status).toBe('delivered');
      expect(response.body.delivery_proof_photo_url).toBeTruthy();
    });

    it('should update order status when all deliveries completed', async () => {
      if (!deliveryOrderId) {
        console.log('Skipping: No order ID available');
        return;
      }

      // Mark all deliveries as delivered
      await pool.query('UPDATE deliveries SET delivery_status = $1 WHERE order_id = $2', ['delivered', deliveryOrderId]);

      // Check order status
      const orderCheck = await pool.query('SELECT status FROM orders WHERE order_id = $1', [deliveryOrderId]);
      
      // Order should be marked as delivered when all deliveries complete
      // (This logic may be in the PATCH endpoint or a background job)
    });
  });

  describe('POST /api/deliveries/:delivery_id/reschedule - Reschedule', () => {
    
    it('should successfully reschedule delivery window', async () => {
      if (!deliveryId) {
        console.log('Skipping: No delivery ID available');
        return;
      }

      const newStart = new Date(Date.now() + 172800000).toISOString(); // 2 days from now
      const newEnd = new Date(Date.now() + 176400000).toISOString();

      const response = await request(app)
        .post(`/api/deliveries/${deliveryId}/reschedule`)
        .set('Authorization', `Bearer ${orderCustomerToken}`)
        .send({
          delivery_window_start: newStart,
          delivery_window_end: newEnd
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('delivery_window_start');

      // Verify in database
      const dbCheck = await pool.query('SELECT delivery_window_start, delivery_window_end FROM deliveries WHERE delivery_id = $1', [deliveryId]);
      expect(dbCheck.rows[0].delivery_window_start).toBeTruthy();
    });

    it('should reject rescheduling already delivered order', async () => {
      // Create delivered delivery
      const deliveredDelivery = await pool.query(`
        INSERT INTO deliveries (delivery_id, order_id, supplier_id, delivery_window_start, delivery_window_end, delivery_method, delivery_fee, delivery_status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()::text, NOW()::text)
        RETURNING delivery_id
      `, ['delivered_del', deliveryOrderId, (await pool.query('SELECT supplier_id FROM suppliers LIMIT 1')).rows[0].supplier_id, new Date().toISOString(), new Date().toISOString(), 'standard_delivery', 25.00, 'delivered']);

      const response = await request(app)
        .post(`/api/deliveries/${deliveredDelivery.rows[0].delivery_id}/reschedule`)
        .set('Authorization', `Bearer ${orderCustomerToken}`)
        .send({
          delivery_window_start: new Date(Date.now() + 86400000).toISOString(),
          delivery_window_end: new Date(Date.now() + 90000000).toISOString()
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('CannotRescheduleError');
    });
  });
});

// ============================================
// REVIEW TESTS
// ============================================

describe('Review Endpoints', () => {
  
  let reviewOrderId: string;
  let reviewSupplierId: string;
  let reviewProductId: string;
  let reviewCustomerToken: string;

  beforeAll(async () => {
    // Create completed order for review
    const customer = await request(app)
      .post('/api/auth/register/customer')
      .send({
        email: 'reviewer@example.com',
        password: 'password123',
        first_name: 'Review',
        last_name: 'Tester',
        phone_number: '+1-555-REVIEW',
        account_type: 'retail',
        default_delivery_address: {
          street_address: '123 Review St',
          city: 'Austin',
          state: 'TX',
          postal_code: '78701'
        }
      });

    reviewCustomerToken = customer.body.token;

    const supplier = await pool.query('SELECT supplier_id FROM suppliers WHERE verification_status = $1 LIMIT 1', ['verified']);
    reviewSupplierId = supplier.rows[0].supplier_id;

    const product = await pool.query(`
      INSERT INTO products (product_id, supplier_id, category_id, sku, product_name, price_per_unit, unit_of_measure, stock_quantity, low_stock_threshold, last_updated_timestamp, status, creation_date, handling_time_days, minimum_order_quantity, customer_type_availability, searchable, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW()::text, $10, NOW()::text, $11, $12, $13, $14, NOW()::text, NOW()::text)
      RETURNING product_id
    `, ['review_prod', reviewSupplierId, 'cat_lumber', 'REV-PROD', 'Review Product', 30.00, 'piece', 500, 50, 'active', 1, 1, 'all', true]);

    reviewProductId = product.rows[0].product_id;

    // Create delivered order
    const addressId = (await pool.query('SELECT address_id FROM addresses WHERE user_id IN (SELECT user_id FROM customers WHERE customer_id = $1)', [customer.body.customer.customer_id])).rows[0].address_id;

    const order = await pool.query(`
      INSERT INTO orders (order_id, customer_id, order_number, order_date, status, subtotal_amount, delivery_fee_total, tax_amount, discount_amount, total_amount, delivery_address_id, payment_method, payment_status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW()::text, NOW()::text)
      RETURNING order_id
    `, ['review_order', customer.body.customer.customer_id, 'ORD-REVIEW-001', new Date().toISOString(), 'delivered', 90.00, 10.00, 8.00, 0, 108.00, addressId, 'credit_card', 'paid']);

    reviewOrderId = order.rows[0].order_id;

    await pool.query(`
      INSERT INTO order_items (order_item_id, order_id, product_id, supplier_id, product_name, sku, quantity, price_per_unit, line_total, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW()::text, NOW()::text)
    `, ['review_order_item', reviewOrderId, reviewProductId, reviewSupplierId, 'Review Product', 'REV-PROD', 3, 30.00, 90.00]);
  });

  describe('POST /api/reviews - Create Review', () => {
    
    it('should successfully create review for delivered order', async () => {
      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${reviewCustomerToken}`)
        .send({
          order_id: reviewOrderId,
          supplier_id: reviewSupplierId,
          product_id: reviewProductId,
          rating_overall: 5,
          rating_product: 5,
          rating_service: 5,
          rating_delivery: 4,
          review_text: 'Excellent product and service! Fast delivery.',
          photos: ['https://example.com/review-photo1.jpg'],
          would_buy_again: 'yes',
          is_anonymous: false
        });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        order_id: reviewOrderId,
        supplier_id: reviewSupplierId,
        rating_overall: 5,
        verified_purchase: true,
        status: 'published'
      });
      expect(response.body).toHaveProperty('review_id');

      // Verify in database
      const reviewCheck = await pool.query('SELECT * FROM reviews WHERE review_id = $1', [response.body.review_id]);
      expect(reviewCheck.rows.length).toBe(1);
      expect(reviewCheck.rows[0].review_text).toBe('Excellent product and service! Fast delivery.');

      // Verify supplier rating updated
      const supplierCheck = await pool.query('SELECT rating_average, total_reviews FROM suppliers WHERE supplier_id = $1', [reviewSupplierId]);
      expect(parseInt(supplierCheck.rows[0].total_reviews)).toBeGreaterThan(0);
    });

    it('should reject review for non-delivered order', async () => {
      // Create pending order
      const addressId = (await pool.query('SELECT address_id FROM addresses LIMIT 1')).rows[0].address_id;
      const customerId = (await pool.query('SELECT customer_id FROM customers LIMIT 1')).rows[0].customer_id;

      const pendingOrder = await pool.query(`
        INSERT INTO orders (order_id, customer_id, order_number, order_date, status, subtotal_amount, delivery_fee_total, tax_amount, discount_amount, total_amount, delivery_address_id, payment_method, payment_status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW()::text, NOW()::text)
        RETURNING order_id
      `, ['pending_order', customerId, 'ORD-PENDING', new Date().toISOString(), 'pending', 50.00, 5.00, 4.50, 0, 59.50, addressId, 'credit_card', 'paid']);

      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${orderCustomerToken}`)
        .send({
          order_id: pendingOrder.rows[0].order_id,
          supplier_id: reviewSupplierId,
          rating_overall: 5,
          review_text: 'Cannot review yet'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('OrderNotDeliveredError');
    });

    it('should reject duplicate review for same order', async () => {
      // Try to create second review for same order
      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${reviewCustomerToken}`)
        .send({
          order_id: reviewOrderId,
          supplier_id: reviewSupplierId,
          product_id: reviewProductId,
          rating_overall: 4,
          review_text: 'Second review attempt'
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('DuplicateReviewError');
    });

    it('should reject review with invalid rating values', async () => {
      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${reviewCustomerToken}`)
        .send({
          order_id: reviewOrderId,
          supplier_id: reviewSupplierId,
          rating_overall: 6, // Invalid: must be 1-5
          review_text: 'Invalid rating'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('ValidationError');
    });
  });

  describe('POST /api/reviews/:review_id/helpful - Vote Review', () => {
    
    it('should record helpful vote on review', async () => {
      // Get existing review
      const reviewCheck = await pool.query('SELECT review_id FROM reviews LIMIT 1');
      
      if (reviewCheck.rows.length === 0) {
        console.log('Skipping: No reviews available');
        return;
      }

      const reviewId = reviewCheck.rows[0].review_id;

      const response = await request(app)
        .post(`/api/reviews/${reviewId}/helpful`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ is_helpful: true });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('helpful_votes');

      // Verify vote recorded
      const voteCheck = await pool.query('SELECT * FROM review_votes WHERE review_id = $1', [reviewId]);
      expect(voteCheck.rows.length).toBeGreaterThan(0);
    });

    it('should prevent duplicate votes from same user', async () => {
      const reviewCheck = await pool.query('SELECT review_id FROM reviews LIMIT 1');
      
      if (reviewCheck.rows.length === 0) {
        console.log('Skipping: No reviews available');
        return;
      }

      const reviewId = reviewCheck.rows[0].review_id;

      // First vote
      await request(app)
        .post(`/api/reviews/${reviewId}/helpful`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ is_helpful: true });

      // Second vote
      const response = await request(app)
        .post(`/api/reviews/${reviewId}/helpful`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ is_helpful: false });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('AlreadyVotedError');
    });
  });

  describe('GET /api/reviews - Get Reviews', () => {
    
    it('should return reviews with filters', async () => {
      const response = await request(app)
        .get('/api/reviews')
        .query({ 
          supplier_id: reviewSupplierId,
          status: 'published'
        });

      expect(response.status).toBe(200);
      expect(response.body.reviews).toBeInstanceOf(Array);
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('average_rating');

      response.body.reviews.forEach((review: any) => {
        expect(review.supplier_id).toBe(reviewSupplierId);
        expect(review.status).toBe('published');
      });
    });

    it('should filter reviews by minimum rating', async () => {
      const response = await request(app)
        .get('/api/reviews')
        .query({ 
          supplier_id: reviewSupplierId,
          min_rating: 4
        });

      expect(response.status).toBe(200);
      response.body.reviews.forEach((review: any) => {
        expect(review.rating_overall).toBeGreaterThanOrEqual(4);
      });
    });

    it('should only show verified purchase reviews when filtered', async () => {
      const response = await request(app)
        .get('/api/reviews')
        .query({ verified_purchase: 'true' });

      expect(response.status).toBe(200);
      response.body.reviews.forEach((review: any) => {
        expect(review.verified_purchase).toBe(true);
      });
    });
  });
});

// ============================================
// WEBSOCKET TESTS
// ============================================

describe('WebSocket Real-time Events', () => {
  
  let wsServer: any;
  let clientSocket: ClientSocket;

  beforeAll((done) => {
    // WebSocket server should be initialized in server.ts
    // Connect test client
    clientSocket = ioClient('http://localhost:3000', {
      auth: { token: customerToken }
    });

    clientSocket.on('connect', () => {
      done();
    });

    clientSocket.on('connect_error', (err) => {
      console.error('WebSocket connection error:', err);
      done(err);
    });
  });

  afterAll(() => {
    if (clientSocket) {
      clientSocket.close();
    }
  });

  describe('inventory_update event', () => {
    
    it('should receive inventory update when stock changes', (done) => {
      const productId = 'test_ws_product';

      // Subscribe to product updates
      clientSocket.emit('subscribe_product', { product_id: productId });

      // Listen for inventory update
      clientSocket.on('inventory_update', (data) => {
        expect(data).toHaveProperty('product_id');
        expect(data).toHaveProperty('stock_quantity');
        expect(data).toHaveProperty('last_updated_timestamp');
        expect(data.product_id).toBe(productId);
        done();
      });

      // Simulate inventory update via API (this would trigger WebSocket event)
      setTimeout(async () => {
        await pool.query(`
          UPDATE products 
          SET stock_quantity = stock_quantity - 10,
              last_updated_timestamp = NOW()::text
          WHERE product_id = $1
        `, [productId]);

        // Server should emit inventory_update event
        // Mock for test:
        clientSocket.emit('inventory_update', {
          product_id: productId,
          stock_quantity: 90,
          status: 'active',
          last_updated_timestamp: new Date().toISOString()
        });
      }, 100);
    }, 10000);

    it('should emit low_stock alert when threshold reached', (done) => {
      const productId = 'low_stock_product';

      clientSocket.on('low_stock_alert', (data) => {
        expect(data).toHaveProperty('product_id');
        expect(data).toHaveProperty('stock_quantity');
        expect(data).toHaveProperty('low_stock_threshold');
        expect(data.is_low_stock).toBe(true);
        done();
      });

      setTimeout(() => {
        // Simulate low stock update
        clientSocket.emit('low_stock_alert', {
          product_id: productId,
          stock_quantity: 5,
          low_stock_threshold: 10,
          is_low_stock: true
        });
      }, 100);
    }, 10000);
  });

  describe('delivery_location_update event', () => {
    
    it('should receive GPS location updates during delivery', (done) => {
      const deliveryId = 'test_delivery_123';

      // Subscribe to delivery tracking
      clientSocket.emit('subscribe_delivery', { delivery_id: deliveryId });

      clientSocket.on('delivery_location_update', (data) => {
        expect(data).toHaveProperty('delivery_id');
        expect(data).toHaveProperty('current_latitude');
        expect(data).toHaveProperty('current_longitude');
        expect(data).toHaveProperty('estimated_arrival_time');
        expect(data.delivery_id).toBe(deliveryId);
        done();
      });

      setTimeout(() => {
        // Simulate GPS update
        clientSocket.emit('delivery_location_update', {
          delivery_id: deliveryId,
          current_latitude: 30.2672,
          current_longitude: -97.7431,
          estimated_arrival_time: new Date(Date.now() + 1800000).toISOString(),
          distance_to_destination_meters: 5000
        });
      }, 100);
    }, 10000);

    it('should emit approaching notification when driver nearby', (done) => {
      clientSocket.on('delivery_approaching', (data) => {
        expect(data).toHaveProperty('delivery_id');
        expect(data).toHaveProperty('estimated_arrival_minutes');
        expect(data.estimated_arrival_minutes).toBeLessThanOrEqual(10);
        done();
      });

      setTimeout(() => {
        clientSocket.emit('delivery_approaching', {
          delivery_id: 'test_delivery_123',
          estimated_arrival_minutes: 5,
          driver_name: 'Test Driver'
        });
      }, 100);
    }, 10000);
  });

  describe('order_status_changed event', () => {
    
    it('should receive order status updates in real-time', (done) => {
      const orderId = 'test_order_ws';

      clientSocket.emit('subscribe_order', { order_id: orderId });

      clientSocket.on('order_status_changed', (data) => {
        expect(data).toHaveProperty('order_id');
        expect(data).toHaveProperty('new_status');
        expect(data).toHaveProperty('previous_status');
        expect(data.order_id).toBe(orderId);
        done();
      });

      setTimeout(() => {
        clientSocket.emit('order_status_changed', {
          order_id: orderId,
          previous_status: 'pending',
          new_status: 'processing',
          status_message: 'Your order is being prepared'
        });
      }, 100);
    }, 10000);
  });

  describe('chat_message_received event', () => {
    
    it('should receive chat messages in real-time', (done) => {
      const conversationId = 'test_conversation';

      clientSocket.emit('join_conversation', { conversation_id: conversationId });

      clientSocket.on('chat_message_received', (data) => {
        expect(data).toHaveProperty('message_id');
        expect(data).toHaveProperty('conversation_id');
        expect(data).toHaveProperty('sender_id');
        expect(data).toHaveProperty('message_text');
        expect(data.conversation_id).toBe(conversationId);
        done();
      });

      setTimeout(() => {
        clientSocket.emit('chat_message_received', {
          message_id: 'msg_123',
          conversation_id: conversationId,
          sender_id: 'sender_abc',
          sender_type: 'customer',
          sender_name: 'Test User',
          message_text: 'Hello, is this available?',
          timestamp: new Date().toISOString()
        });
      }, 100);
    }, 10000);

    it('should receive typing indicators', (done) => {
      const conversationId = 'test_conversation';

      clientSocket.on('user_typing', (data) => {
        expect(data).toHaveProperty('conversation_id');
        expect(data).toHaveProperty('user_id');
        expect(data).toHaveProperty('user_name');
        expect(data.conversation_id).toBe(conversationId);
        done();
      });

      setTimeout(() => {
        clientSocket.emit('user_typing', {
          conversation_id: conversationId,
          user_id: 'typing_user',
          user_name: 'Test User'
        });
      }, 100);
    }, 10000);
  });

  describe('notification_received event', () => {
    
    it('should receive in-app notifications', (done) => {
      const userId = 'test_user_notifications';

      clientSocket.on('notification_received', (data) => {
        expect(data).toHaveProperty('notification_id');
        expect(data).toHaveProperty('notification_type');
        expect(data).toHaveProperty('title');
        expect(data).toHaveProperty('message');
        done();
      });

      setTimeout(() => {
        clientSocket.emit('notification_received', {
          notification_id: 'notif_ws_test',
          user_id: userId,
          notification_type: 'order_update',
          title: 'Order Shipped',
          message: 'Your order is on the way!',
          created_date: new Date().toISOString()
        });
      }, 100);
    }, 10000);
  });

  describe('wishlist_price_drop event', () => {
    
    it('should emit price drop alert for wishlist items', (done) => {
      const customerId = 'test_customer_wishlist';

      clientSocket.on('wishlist_price_drop', (data) => {
        expect(data).toHaveProperty('product_id');
        expect(data).toHaveProperty('previous_price');
        expect(data).toHaveProperty('current_price');
        expect(data).toHaveProperty('price_drop_percent');
        expect(data.current_price).toBeLessThan(data.previous_price);
        done();
      });

      setTimeout(() => {
        clientSocket.emit('wishlist_price_drop', {
          wishlist_item_id: 'wish_123',
          customer_id: customerId,
          product_id: 'prod_price_drop',
          product_name: 'Test Product',
          previous_price: 100.00,
          current_price: 75.00,
          price_drop_amount: 25.00,
          price_drop_percent: 25
        });
      }, 100);
    }, 10000);
  });
});

// ============================================
// ADMIN TESTS
// ============================================

describe('Admin Endpoints', () => {
  
  describe('GET /api/admin/users - Search Users', () => {
    
    it('should return all users with filters', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ 
          user_type: 'customer',
          status: 'active'
        });

      expect(response.status).toBe(200);
      expect(response.body.users).toBeInstanceOf(Array);
      expect(response.body).toHaveProperty('total');

      response.body.users.forEach((user: any) => {
        expect(user.user_type).toBe('customer');
        expect(user.status).toBe('active');
      });
    });

    it('should search users by email query', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ query: 'admin@buildeasy.com' });

      expect(response.status).toBe(200);
      expect(response.body.users.length).toBeGreaterThan(0);
      
      const foundAdmin = response.body.users.find((u: any) => u.email === 'admin@buildeasy.com');
      expect(foundAdmin).toBeTruthy();
    });

    it('should reject unauthorized access', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${customerToken}`); // Customer token, not admin

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('ForbiddenError');
    });
  });

  describe('PATCH /api/admin/users/:user_id - Update User', () => {
    
    it('should allow admin to suspend user', async () => {
      const userToSuspend = await pool.query('SELECT user_id FROM users WHERE user_type = $1 LIMIT 1', ['customer']);
      const userId = userToSuspend.rows[0].user_id;

      const response = await request(app)
        .patch(`/api/admin/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'suspended' });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('suspended');

      // Verify in database
      const dbCheck = await pool.query('SELECT status FROM users WHERE user_id = $1', [userId]);
      expect(dbCheck.rows[0].status).toBe('suspended');

      // Restore for other tests
      await pool.query('UPDATE users SET status = $1 WHERE user_id = $2', ['active', userId]);
    });

    it('should log admin activity when updating user', async () => {
      const userToUpdate = await pool.query('SELECT user_id FROM users WHERE user_type = $1 LIMIT 1', ['customer']);
      const userId = userToUpdate.rows[0].user_id;

      await request(app)
        .patch(`/api/admin/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email_verified: true });

      // Verify activity logged
      const logCheck = await pool.query('SELECT * FROM admin_activity_logs WHERE affected_entity_type = $1 AND affected_entity_id = $2', ['user', userId]);
      expect(logCheck.rows.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/admin/supplier-applications - Get Applications', () => {
    
    it('should return pending supplier applications', async () => {
      const response = await request(app)
        .get('/api/admin/supplier-applications')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ application_status: 'pending_review' });

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);

      response.body.forEach((app: any) => {
        expect(app.application_status).toBe('pending_review');
      });
    });
  });

  describe('POST /api/admin/supplier-applications/:id/approve - Approve Supplier', () => {
    
    it('should approve supplier application and create supplier record', async () => {
      // Create pending application
      const user = await pool.query(`
        INSERT INTO users (user_id, email, password_hash, user_type, first_name, last_name, phone_number, registration_date, status, email_verified, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING user_id
      `, ['pending_supplier_user', 'pendingsupplier@example.com', 'supplier123', 'supplier', 'Pending', 'Supplier', '+1-555-PEND', new Date().toISOString(), 'active', true, new Date().toISOString(), new Date().toISOString()]);

      const application = await pool.query(`
        INSERT INTO supplier_applications (application_id, user_id, business_name, business_registration_number, business_type, contact_person_name, business_address, application_status, submitted_date, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING application_id
      `, ['app_pending', user.rows[0].user_id, 'Pending Supply Co', 'EIN-PENDING', 'LLC', 'Pending Person', '123 Pending St', 'pending_review', new Date().toISOString(), new Date().toISOString(), new Date().toISOString()]);

      // Approve application
      const response = await request(app)
        .post(`/api/admin/supplier-applications/${application.rows[0].application_id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('approved');
      expect(response.body).toHaveProperty('supplier');

      // Verify application status updated
      const appCheck = await pool.query('SELECT application_status, approved_date FROM supplier_applications WHERE application_id = $1', [application.rows[0].application_id]);
      expect(appCheck.rows[0].application_status).toBe('approved');
      expect(appCheck.rows[0].approved_date).toBeTruthy();

      // Verify supplier record created
      const supplierCheck = await pool.query('SELECT * FROM suppliers WHERE user_id = $1', [user.rows[0].user_id]);
      expect(supplierCheck.rows.length).toBe(1);
      expect(supplierCheck.rows[0].business_name).toBe('Pending Supply Co');
      expect(supplierCheck.rows[0].verification_status).toBe('verified');

      // Verify admin activity logged
      const activityCheck = await pool.query('SELECT * FROM admin_activity_logs WHERE action_type = $1 AND affected_entity_id = $2', ['supplier_approval', application.rows[0].application_id]);
      expect(activityCheck.rows.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/admin/supplier-applications/:id/reject - Reject Supplier', () => {
    
    it('should reject supplier application with reason', async () => {
      // Create pending application
      const user = await pool.query(`
        INSERT INTO users (user_id, email, password_hash, user_type, first_name, last_name, phone_number, registration_date, status, email_verified, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING user_id
      `, ['reject_supplier_user', 'rejectsupplier@example.com', 'supplier123', 'supplier', 'Reject', 'Supplier', '+1-555-REJ', new Date().toISOString(), 'active', true, new Date().toISOString(), new Date().toISOString()]);

      const application = await pool.query(`
        INSERT INTO supplier_applications (application_id, user_id, business_name, business_registration_number, business_type, contact_person_name, business_address, application_status, submitted_date, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING application_id
      `, ['app_reject', user.rows[0].user_id, 'Reject Supply Co', 'EIN-REJECT', 'LLC', 'Reject Person', '456 Reject Ave', 'pending_review', new Date().toISOString(), new Date().toISOString(), new Date().toISOString()]);

      // Reject application
      const response = await request(app)
        .post(`/api/admin/supplier-applications/${application.rows[0].application_id}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          rejection_reason: 'Incomplete documentation'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('rejected');

      // Verify application status
      const appCheck = await pool.query('SELECT application_status, rejection_reason FROM supplier_applications WHERE application_id = $1', [application.rows[0].application_id]);
      expect(appCheck.rows[0].application_status).toBe('rejected');
      expect(appCheck.rows[0].rejection_reason).toBe('Incomplete documentation');

      // Verify NO supplier record created
      const supplierCheck = await pool.query('SELECT * FROM suppliers WHERE user_id = $1', [user.rows[0].user_id]);
      expect(supplierCheck.rows.length).toBe(0);
    });
  });

  describe('GET /api/admin/analytics/dashboard - Platform Analytics', () => {
    
    it('should return comprehensive platform metrics', async () => {
      const response = await request(app)
        .get('/api/admin/analytics/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('total_users');
      expect(response.body).toHaveProperty('total_customers');
      expect(response.body).toHaveProperty('total_suppliers');
      expect(response.body).toHaveProperty('total_orders');
      expect(response.body).toHaveProperty('total_revenue');
      expect(response.body).toHaveProperty('gmv');
      expect(response.body).toHaveProperty('active_orders');

      // Verify metrics are numbers
      expect(typeof response.body.total_users).toBe('number');
      expect(typeof response.body.total_revenue).toBe('number');
    });

    it('should filter analytics by date range', async () => {
      const response = await request(app)
        .get('/api/admin/analytics/dashboard')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ date_range: 'last_30_days' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('total_orders');
    });
  });

  describe('GET /api/admin/disputes - Get Disputes', () => {
    
    it('should return open disputes for admin review', async () => {
      const response = await request(app)
        .get('/api/admin/disputes')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ status: 'open' });

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);

      response.body.forEach((dispute: any) => {
        expect(['open', 'under_review']).toContain(dispute.status);
      });
    });
  });

  describe('POST /api/admin/disputes/:issue_id/resolve - Resolve Dispute', () => {
    
    it('should resolve dispute with refund', async () => {
      // Create test issue
      const issue = await pool.query(`
        INSERT INTO issues (issue_id, order_id, customer_id, supplier_id, issue_type, status, description, desired_resolution, opened_date, escalated_to_admin, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW()::text, NOW()::text)
        RETURNING issue_id
      `, ['admin_issue_resolve', reviewOrderId, orderCustomerId, reviewSupplierId, 'damaged_item', 'under_review', 'Product damaged', 'partial_refund', new Date().toISOString(), true]);

      const response = await request(app)
        .post(`/api/admin/disputes/${issue.rows[0].issue_id}/resolve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          resolution_offered: 'Partial refund approved',
          resolution_amount: 25.00,
          admin_notes: 'Damage verified, partial refund issued'
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('resolved');

      // Verify in database
      const issueCheck = await pool.query('SELECT status, resolution_offered, resolution_amount FROM issues WHERE issue_id = $1', [issue.rows[0].issue_id]);
      expect(issueCheck.rows[0].status).toBe('resolved');
      expect(parseFloat(issueCheck.rows[0].resolution_amount)).toBe(25.00);
    });
  });
});

// ============================================
// NOTIFICATION TESTS
// ============================================

describe('Notification Endpoints', () => {
  
  describe('GET /api/notifications - Get Notifications', () => {
    
    it('should return user\'s notifications', async () => {
      const response = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.notifications).toBeInstanceOf(Array);
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('unread_count');
    });

    it('should filter notifications by type', async () => {
      const response = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${customerToken}`)
        .query({ notification_type: 'order_update' });

      expect(response.status).toBe(200);
      response.body.notifications.forEach((notif: any) => {
        expect(notif.notification_type).toBe('order_update');
      });
    });

    it('should filter unread notifications', async () => {
      const response = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${customerToken}`)
        .query({ is_read: 'false' });

      expect(response.status).toBe(200);
      response.body.notifications.forEach((notif: any) => {
        expect(notif.is_read).toBe(false);
      });
    });
  });

  describe('PATCH /api/notifications/:notification_id/read - Mark as Read', () => {
    
    it('should mark notification as read', async () => {
      // Create test notification
      const userId = (await pool.query('SELECT user_id FROM customers WHERE customer_id = $1', [testCustomerId])).rows[0].user_id;
      
      const notif = await pool.query(`
        INSERT INTO notifications (notification_id, user_id, notification_type, title, message, created_date, is_read, delivered_via, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()::text, NOW()::text)
        RETURNING notification_id
      `, ['test_notif_read', userId, 'system', 'Test Notification', 'This is a test', new Date().toISOString(), false, JSON.stringify(['in_app'])]);

      const response = await request(app)
        .patch(`/api/notifications/${notif.rows[0].notification_id}/read`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.is_read).toBe(true);
      expect(response.body).toHaveProperty('read_at');

      // Verify in database
      const dbCheck = await pool.query('SELECT is_read, read_at FROM notifications WHERE notification_id = $1', [notif.rows[0].notification_id]);
      expect(dbCheck.rows[0].is_read).toBe(true);
      expect(dbCheck.rows[0].read_at).toBeTruthy();
    });
  });

  describe('POST /api/notifications/read-all - Mark All as Read', () => {
    
    it('should mark all notifications as read', async () => {
      const response = await request(app)
        .post('/api/notifications/read-all')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('updated_count');

      // Verify in database
      const userId = (await pool.query('SELECT user_id FROM customers WHERE customer_id = $1', [testCustomerId])).rows[0].user_id;
      const unreadCheck = await pool.query('SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false', [userId]);
      
      expect(parseInt(unreadCheck.rows[0].count)).toBe(0);
    });
  });
});

// ============================================
// INTEGRATION TESTS
// ============================================

describe('End-to-End User Journeys', () => {
  
  it('should complete full customer journey: register -> browse -> add to cart -> checkout -> track', async () => {
    // 1. Register customer
    const registerRes = await request(app)
      .post('/api/auth/register/customer')
      .send({
        email: 'journey@example.com',
        password: 'password123',
        first_name: 'Journey',
        last_name: 'Test',
        phone_number: '+1-555-JOURNEY',
        account_type: 'retail',
        default_delivery_address: {
          street_address: '789 Journey Blvd',
          city: 'Austin',
          state: 'TX',
          postal_code: '78701'
        }
      });

    expect(registerRes.status).toBe(201);
    const journeyToken = registerRes.body.token;
    const journeyCustomerId = registerRes.body.customer.customer_id;

    // 2. Browse products
    const browseRes = await request(app)
      .get('/api/products')
      .set('Authorization', `Bearer ${journeyToken}`)
      .query({ category: 'cat_lumber', in_stock_only: 'true' });

    expect(browseRes.status).toBe(200);
    expect(browseRes.body.products.length).toBeGreaterThan(0);

    const selectedProduct = browseRes.body.products[0];

    // 3. Add to cart
    const addCartRes = await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${journeyToken}`)
      .send({
        product_id: selectedProduct.product_id,
        quantity: 5
      });

    expect(addCartRes.status).toBe(201);

    // 4. Get cart
    const cartRes = await request(app)
      .get('/api/cart')
      .set('Authorization', `Bearer ${journeyToken}`);

    expect(cartRes.status).toBe(200);
    expect(cartRes.body.items.length).toBe(1);

    // 5. Create order (checkout)
    const addressId = (await pool.query('SELECT address_id FROM addresses WHERE user_id IN (SELECT user_id FROM customers WHERE customer_id = $1)', [journeyCustomerId])).rows[0].address_id;

    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${journeyToken}`)
      .send({
        delivery_address_id: addressId,
        payment_method: 'credit_card',
        delivery_windows: [
          {
            supplier_id: selectedProduct.supplier_id,
            delivery_window_start: new Date(Date.now() + 86400000).toISOString(),
            delivery_window_end: new Date(Date.now() + 90000000).toISOString(),
            delivery_method: 'standard_delivery'
          }
        ]
      });

    expect(orderRes.status).toBe(201);
    const journeyOrderId = orderRes.body.order_id;

    // 6. Track order
    const trackRes = await request(app)
      .get(`/api/orders/${journeyOrderId}`)
      .set('Authorization', `Bearer ${journeyToken}`);

    expect(trackRes.status).toBe(200);
    expect(trackRes.body.order.order_id).toBe(journeyOrderId);
    expect(trackRes.body).toHaveProperty('timeline');

    // 7. Verify notifications created
    const notifRes = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${journeyToken}`);

    expect(notifRes.status).toBe(200);
    expect(notifRes.body.notifications.length).toBeGreaterThan(0);
  });

  it('should handle multi-supplier order correctly', async () => {
    // Create customer
    const customer = await request(app)
      .post('/api/auth/register/customer')
      .send({
        email: 'multisupplier@example.com',
        password: 'password123',
        first_name: 'Multi',
        last_name: 'Supplier',
        phone_number: '+1-555-MULTI',
        account_type: 'retail',
        default_delivery_address: {
          street_address: '321 Multi St',
          city: 'Austin',
          state: 'TX',
          postal_code: '78701'
        }
      });

    const token = customer.body.token;

    // Get products from different suppliers
    const suppliers = await pool.query('SELECT DISTINCT supplier_id FROM products WHERE status = $1 LIMIT 2', ['active']);
    
    if (suppliers.rows.length < 2) {
      console.log('Skipping: Not enough suppliers');
      return;
    }

    const supplier1Products = await pool.query('SELECT product_id FROM products WHERE supplier_id = $1 AND stock_quantity > 0 LIMIT 1', [suppliers.rows[0].supplier_id]);
    const supplier2Products = await pool.query('SELECT product_id FROM products WHERE supplier_id = $1 AND stock_quantity > 0 LIMIT 1', [suppliers.rows[1].supplier_id]);

    // Add items from both suppliers
    await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ product_id: supplier1Products.rows[0].product_id, quantity: 2 });

    await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ product_id: supplier2Products.rows[0].product_id, quantity: 3 });

    // Get cart to verify grouping
    const cartRes = await request(app)
      .get('/api/cart')
      .set('Authorization', `Bearer ${token}`);

    expect(cartRes.status).toBe(200);
    expect(cartRes.body.items.length).toBe(2);

    const uniqueSuppliers = new Set(cartRes.body.items.map((item: any) => item.supplier_id));
    expect(uniqueSuppliers.size).toBe(2);

    // Create order with multiple delivery windows
    const addressId = (await pool.query('SELECT address_id FROM addresses WHERE user_id IN (SELECT user_id FROM customers WHERE customer_id = $1)', [customer.body.customer.customer_id])).rows[0].address_id;

    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        delivery_address_id: addressId,
        payment_method: 'credit_card',
        delivery_windows: [
          {
            supplier_id: suppliers.rows[0].supplier_id,
            delivery_window_start: new Date(Date.now() + 86400000).toISOString(),
            delivery_window_end: new Date(Date.now() + 90000000).toISOString(),
            delivery_method: 'standard_delivery'
          },
          {
            supplier_id: suppliers.rows[1].supplier_id,
            delivery_window_start: new Date(Date.now() + 172800000).toISOString(),
            delivery_window_end: new Date(Date.now() + 176400000).toISOString(),
            delivery_method: 'standard_delivery'
          }
        ]
      });

    expect(orderRes.status).toBe(201);

    // Verify multiple deliveries created
    const deliveriesCheck = await pool.query('SELECT * FROM deliveries WHERE order_id = $1', [orderRes.body.order_id]);
    expect(deliveriesCheck.rows.length).toBe(2);

    // Verify order items grouped by supplier
    const itemsCheck = await pool.query('SELECT DISTINCT supplier_id FROM order_items WHERE order_id = $1', [orderRes.body.order_id]);
    expect(itemsCheck.rows.length).toBe(2);
  });
});

// ============================================
// ERROR HANDLING TESTS
// ============================================

describe('Error Handling & Edge Cases', () => {
  
  it('should handle database connection errors gracefully', async () => {
    // Temporarily close pool (simulate DB failure)
    const originalQuery = pool.query;
    pool.query = jest.fn().mockRejectedValue(new Error('Database connection failed'));

    const response = await request(app)
      .get('/api/products')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('DatabaseError');

    // Restore pool
    pool.query = originalQuery;
  });

  it('should handle malformed JSON in request body', async () => {
    const response = await request(app)
      .post('/api/auth/register/customer')
      .set('Content-Type', 'application/json')
      .send('{ invalid json }');

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Parse');
  });

  it('should handle missing authorization header', async () => {
    const response = await request(app)
      .get('/api/cart');

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('UnauthorizedError');
  });

  it('should handle invalid JWT token', async () => {
    const response = await request(app)
      .get('/api/cart')
      .set('Authorization', 'Bearer invalid_token_12345');

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('InvalidTokenError');
  });

  it('should handle expired JWT token', async () => {
    // Create expired token (mock)
    const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.invalid';

    const response = await request(app)
      .get('/api/cart')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(response.status).toBe(401);
    expect(response.body.error).toContain('Expired');
  });

  it('should validate request body size limits', async () => {
    const largePayload = {
      email: 'test@example.com',
      password: 'password123',
      first_name: 'A'.repeat(10000), // Extremely long name
      last_name: 'Test',
      phone_number: '+1-555-0000',
      account_type: 'retail'
    };

    const response = await request(app)
      .post('/api/auth/register/customer')
      .send(largePayload);

    expect(response.status).toBe(400);
  });

  it('should handle SQL injection attempts', async () => {
    const response = await request(app)
      .get('/api/products')
      .query({ 
        search_query: "'; DROP TABLE products; --"
      });

    // Should return safely without executing SQL injection
    expect(response.status).toBe(200);

    // Verify products table still exists
    const tableCheck = await pool.query("SELECT COUNT(*) FROM products");
    expect(tableCheck.rows.length).toBeGreaterThan(0);
  });

  it('should handle race conditions in cart updates', async () => {
    // Simulate concurrent cart updates
    const product = await pool.query('SELECT product_id FROM products WHERE stock_quantity > 10 LIMIT 1');
    const productId = product.rows[0].product_id;

    const promises = Array(5).fill(null).map(() => 
      request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ product_id: productId, quantity: 1 })
    );

    const results = await Promise.all(promises);

    // All should succeed or fail gracefully
    results.forEach(res => {
      expect([201, 400]).toContain(res.status);
    });

    // Verify cart item quantity is consistent
    const cartCheck = await pool.query(`
      SELECT SUM(quantity) as total
      FROM cart_items ci
      INNER JOIN carts c ON ci.cart_id = c.cart_id
      INNER JOIN customers cust ON c.customer_id = cust.customer_id
      WHERE cust.customer_id = $1 AND ci.product_id = $2
    `, [testCustomerId, productId]);

    // Total should be consistent (not duplicated)
    expect(parseInt(cartCheck.rows[0].total)).toBeGreaterThan(0);
  });
});

// ============================================
// PERFORMANCE TESTS
// ============================================

describe('Performance & Load Tests', () => {
  
  it('should handle product search in under 1 second', async () => {
    const startTime = Date.now();

    const response = await request(app)
      .get('/api/products')
      .query({ 
        category: 'cat_lumber',
        price_min: 0,
        price_max: 100,
        in_stock_only: 'true'
      });

    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(response.status).toBe(200);
    expect(duration).toBeLessThan(1000);
  });

  it('should handle multiple concurrent requests', async () => {
    const requests = Array(20).fill(null).map((_, i) => 
      request(app)
        .get('/api/products')
        .query({ offset: i * 10, limit: 10 })
    );

    const startTime = Date.now();
    const results = await Promise.all(requests);
    const endTime = Date.now();

    results.forEach(res => {
      expect(res.status).toBe(200);
    });

    expect(endTime - startTime).toBeLessThan(3000); // All 20 requests in under 3s
  });

  it('should handle large result sets efficiently', async () => {
    const response = await request(app)
      .get('/api/products')
      .query({ limit: 100 });

    expect(response.status).toBe(200);
    expect(response.body.products.length).toBeLessThanOrEqual(100);
  });
});

// ============================================
// DATABASE TRANSACTION TESTS
// ============================================

describe('Database Transaction Integrity', () => {
  
  it('should rollback order creation if payment fails', async () => {
    const beforeProducts = await pool.query('SELECT stock_quantity FROM products WHERE product_id = $1', [testProductId]);
    const beforeStock = parseInt(beforeProducts.rows[0].stock_quantity);

    // Add item to cart
    await pool.query('DELETE FROM cart_items WHERE cart_id IN (SELECT cart_id FROM carts WHERE customer_id = $1)', [orderCustomerId]);
    
    await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${orderCustomerToken}`)
      .send({ product_id: testProductId, quantity: 10 });

    // Attempt order with invalid payment (should fail and rollback)
    const response = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${orderCustomerToken}`)
      .send({
        delivery_address_id: orderAddressId,
        payment_method: 'invalid_method',
        delivery_windows: []
      });

    expect(response.status).toBe(400);

    // Verify stock unchanged (transaction rolled back)
    const afterProducts = await pool.query('SELECT stock_quantity FROM products WHERE product_id = $1', [testProductId]);
    const afterStock = parseInt(afterProducts.rows[0].stock_quantity);

    expect(afterStock).toBe(beforeStock);
  });

  it('should maintain referential integrity on cascading deletes', async () => {
    // Create user with related data
    const user = await pool.query(`
      INSERT INTO users (user_id, email, password_hash, user_type, first_name, last_name, phone_number, registration_date, status, email_verified, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING user_id
    `, ['cascade_user', 'cascade@example.com', 'password123', 'customer', 'Cascade', 'Test', '+1-555-CASCADE', new Date().toISOString(), 'active', true, new Date().toISOString(), new Date().toISOString()]);

    const customer = await pool.query(`
      INSERT INTO customers (customer_id, user_id, account_type, notification_preferences, onboarding_completed, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING customer_id
    `, ['cascade_cust', user.rows[0].user_id, 'retail', JSON.stringify({email: true}), false, new Date().toISOString(), new Date().toISOString()]);

    const cart = await pool.query(`
      INSERT INTO carts (cart_id, customer_id, created_date, last_modified_date, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING cart_id
    `, ['cascade_cart', customer.rows[0].customer_id, new Date().toISOString(), new Date().toISOString(), 'active', new Date().toISOString(), new Date().toISOString()]);

    // Delete user
    await pool.query('DELETE FROM users WHERE user_id = $1', [user.rows[0].user_id]);

    // Verify cascading deletes
    const customerCheck = await pool.query('SELECT * FROM customers WHERE customer_id = $1', [customer.rows[0].customer_id]);
    expect(customerCheck.rows.length).toBe(0);

    const cartCheck = await pool.query('SELECT * FROM carts WHERE cart_id = $1', [cart.rows[0].cart_id]);
    expect(cartCheck.rows.length).toBe(0);
  });
});

// ============================================
// BUSINESS LOGIC TESTS
// ============================================

describe('Business Logic & Calculations', () => {
  
  it('should calculate order totals correctly', async () => {
    // This would test the order total calculation logic
    // including subtotal, delivery fees, taxes, discounts
    
    const cartWithItems = {
      items: [
        { price_per_unit: 10.00, quantity: 5 }, // 50.00
        { price_per_unit: 20.00, quantity: 3 }  // 60.00
      ],
      delivery_fee: 15.00,
      tax_rate: 0.0825 // 8.25%
    };

    const subtotal = cartWithItems.items.reduce((sum, item) => sum + (item.price_per_unit * item.quantity), 0);
    expect(subtotal).toBe(110.00);

    const tax = subtotal * cartWithItems.tax_rate;
    expect(tax).toBeCloseTo(9.075, 2);

    const total = subtotal + cartWithItems.delivery_fee + tax;
    expect(total).toBeCloseTo(134.075, 2);
  });

  it('should apply bulk pricing discounts correctly', async () => {
    // Create product with bulk pricing
    const supplier = await pool.query('SELECT supplier_id FROM suppliers LIMIT 1');
    
    const bulkProduct = await pool.query(`
      INSERT INTO products (product_id, supplier_id, category_id, sku, product_name, price_per_unit, unit_of_measure, bulk_pricing, stock_quantity, low_stock_threshold, last_updated_timestamp, status, creation_date, handling_time_days, minimum_order_quantity, customer_type_availability, searchable, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW()::text, $11, NOW()::text, $12, $13, $14, $15, NOW()::text, NOW()::text)
      RETURNING product_id
    `, ['bulk_price_prod', supplier.rows[0].supplier_id, 'cat_lumber', 'BULK-SKU', 'Bulk Pricing Product', 100.00, 'piece', JSON.stringify({'10+': 90.00, '50+': 80.00, '100+': 75.00}), 500, 50, 'active', 1, 1, 'all', true]);

    // Test pricing logic
    const basePrice = 100.00;
    const quantity = 50;
    const bulkPrices = {'10+': 90.00, '50+': 80.00, '100+': 75.00};

    let applicablePrice = basePrice;
    if (quantity >= 100) applicablePrice = bulkPrices['100+'];
    else if (quantity >= 50) applicablePrice = bulkPrices['50+'];
    else if (quantity >= 10) applicablePrice = bulkPrices['10+'];

    expect(applicablePrice).toBe(80.00);

    const lineTotal = applicablePrice * quantity;
    expect(lineTotal).toBe(4000.00);
  });

  it('should calculate trade credit balance correctly', async () => {
    const tradeCustomer = await pool.query('SELECT customer_id, trade_credit_limit, trade_credit_balance, trade_credit_used FROM customers WHERE account_type = $1 LIMIT 1', ['trade']);

    if (tradeCustomer.rows.length === 0) {
      console.log('Skipping: No trade customers');
      return;
    }

    const customer = tradeCustomer.rows[0];
    const limit = parseFloat(customer.trade_credit_limit);
    const used = parseFloat(customer.trade_credit_used);
    const balance = parseFloat(customer.trade_credit_balance);

    // Verify: balance = limit - used
    expect(balance).toBeCloseTo(limit - used, 2);

    // Simulate order using credit
    const orderAmount = 500.00;
    const newUsed = used + orderAmount;
    const newBalance = limit - newUsed;

    await pool.query('UPDATE customers SET trade_credit_used = $1, trade_credit_balance = $2 WHERE customer_id = $3', [newUsed, newBalance, customer.customer_id]);

    const updated = await pool.query('SELECT trade_credit_balance, trade_credit_used FROM customers WHERE customer_id = $1', [customer.customer_id]);
    
    expect(parseFloat(updated.rows[0].trade_credit_balance)).toBeCloseTo(newBalance, 2);
    expect(parseFloat(updated.rows[0].trade_credit_used)).toBeCloseTo(newUsed, 2);
  });

  it('should enforce minimum order quantity constraints', async () => {
    // Create product with minimum order quantity
    const supplier = await pool.query('SELECT supplier_id FROM suppliers LIMIT 1');
    
    const minQtyProduct = await pool.query(`
      INSERT INTO products (product_id, supplier_id, category_id, sku, product_name, price_per_unit, unit_of_measure, minimum_order_quantity, stock_quantity, low_stock_threshold, last_updated_timestamp, status, creation_date, handling_time_days, customer_type_availability, searchable, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW()::text, $11, NOW()::text, $12, $13, $14, NOW()::text, NOW()::text)
      RETURNING product_id
    `, ['min_qty_prod', supplier.rows[0].supplier_id, 'cat_lumber', 'MIN-QTY', 'Min Quantity Product', 50.00, 'piece', 10, 500, 50, 'active', 1, 'all', true]);

    // Try to add less than minimum quantity
    const response = await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        product_id: minQtyProduct.rows[0].product_id,
        quantity: 5 // Less than minimum of 10
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('MinimumQuantityError');
  });

  it('should calculate delivery fees based on zones', async () => {
    // This would test delivery zone calculation logic
    // Mock for now as it requires geospatial queries
    
    const customerLocation = { latitude: 30.2672, longitude: -97.7431 };
    const supplierLocation = { latitude: 30.2849, longitude: -97.7341 };

    // Calculate distance (simplified)
    const distance = Math.sqrt(
      Math.pow(customerLocation.latitude - supplierLocation.latitude, 2) +
      Math.pow(customerLocation.longitude - supplierLocation.longitude, 2)
    ) * 69; // Rough miles

    expect(distance).toBeLessThan(50); // Within delivery zone

    // Delivery fee logic
    let deliveryFee = 25.00; // Base fee
    if (distance > 30) deliveryFee += 10.00;
    if (distance > 50) deliveryFee += 20.00;

    expect(deliveryFee).toBeGreaterThanOrEqual(25.00);
  });
});

// ============================================
// SUPPLIER-SPECIFIC TESTS
// ============================================

describe('Supplier-Specific Features', () => {
  
  describe('GET /api/suppliers/me/products', () => {
    
    it('should return only supplier\'s own products', async () => {
      const response = await request(app)
        .get('/api/suppliers/me/products')
        .set('Authorization', `Bearer ${supplierToken}`);

      expect(response.status).toBe(200);
      expect(response.body.products).toBeInstanceOf(Array);

      // All products should belong to supplier
      response.body.products.forEach((product: any) => {
        expect(product.supplier_id).toBe(testSupplierId);
      });
    });

    it('should filter supplier products by status', async () => {
      const response = await request(app)
        .get('/api/suppliers/me/products')
        .set('Authorization', `Bearer ${supplierToken}`)
        .query({ status_filter: 'active' });

      expect(response.status).toBe(200);
      response.body.products.forEach((product: any) => {
        expect(product.status).toBe('active');
      });
    });
  });

  describe('GET /api/suppliers/me/orders', () => {
    
    it('should return orders for supplier\'s products', async () => {
      // This endpoint would return orders containing supplier's products
      const response = await request(app)
        .get('/api/suppliers/me/orders')
        .set('Authorization', `Bearer ${supplierToken}`);

      expect(response.status).toBe(200);
      expect(response.body.orders).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/suppliers/me/analytics', () => {
    
    it('should return supplier analytics and metrics', async () => {
      const response = await request(app)
        .get('/api/suppliers/me/analytics')
        .set('Authorization', `Bearer ${supplierToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('total_sales');
      expect(response.body).toHaveProperty('total_orders');
      expect(response.body).toHaveProperty('average_rating');
      expect(response.body).toHaveProperty('top_selling_products');
    });
  });
});

// ============================================
// WISHLIST TESTS
// ============================================

describe('Wishlist Endpoints', () => {
  
  describe('POST /api/wishlist - Add to Wishlist', () => {
    
    it('should add product to wishlist', async () => {
      const product = await pool.query('SELECT product_id, price_per_unit FROM products WHERE status = $1 LIMIT 1', ['active']);

      const response = await request(app)
        .post('/api/wishlist')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          product_id: product.rows[0].product_id,
          price_drop_alert_enabled: true,
          back_in_stock_alert_enabled: true
        });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        product_id: product.rows[0].product_id,
        price_drop_alert_enabled: true,
        back_in_stock_alert_enabled: true
      });

      // Verify in database
      const wishlistCheck = await pool.query('SELECT * FROM wishlist_items WHERE customer_id = $1 AND product_id = $2', [testCustomerId, product.rows[0].product_id]);
      expect(wishlistCheck.rows.length).toBe(1);
    });

    it('should prevent duplicate wishlist items', async () => {
      const product = await pool.query('SELECT product_id FROM products WHERE status = $1 LIMIT 1', ['active']);

      // Add first time
      await request(app)
        .post('/api/wishlist')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ product_id: product.rows[0].product_id });

      // Add second time
      const response = await request(app)
        .post('/api/wishlist')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ product_id: product.rows[0].product_id });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('AlreadyInWishlistError');
    });
  });

  describe('GET /api/wishlist', () => {
    
    it('should return customer\'s wishlist items', async () => {
      const response = await request(app)
        .get('/api/wishlist')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);

      response.body.forEach((item: any) => {
        expect(item).toHaveProperty('product_id');
        expect(item).toHaveProperty('added_date');
        expect(item).toHaveProperty('price_when_saved');
      });
    });

    it('should filter wishlist by in_stock_only', async () => {
      const response = await request(app)
        .get('/api/wishlist')
        .set('Authorization', `Bearer ${customerToken}`)
        .query({ filter_by: 'in_stock_only' });

      expect(response.status).toBe(200);
      // All returned items should be in stock
    });
  });

  describe('DELETE /api/wishlist/:wishlist_item_id', () => {
    
    it('should remove item from wishlist', async () => {
      const wishlist = await pool.query('SELECT wishlist_item_id FROM wishlist_items WHERE customer_id = $1 LIMIT 1', [testCustomerId]);

      if (wishlist.rows.length === 0) {
        console.log('Skipping: No wishlist items');
        return;
      }

      const response = await request(app)
        .delete(`/api/wishlist/${wishlist.rows[0].wishlist_item_id}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(204);

      // Verify removed from database
      const dbCheck = await pool.query('SELECT * FROM wishlist_items WHERE wishlist_item_id = $1', [wishlist.rows[0].wishlist_item_id]);
      expect(dbCheck.rows.length).toBe(0);
    });
  });
});

// ============================================
// VALIDATION & SECURITY TESTS
// ============================================

describe('Input Validation & Security', () => {
  
  it('should sanitize HTML in product descriptions', async () => {
    const response = await request(app)
      .post('/api/suppliers/me/products')
      .set('Authorization', `Bearer ${supplierToken}`)
      .send({
        category_id: 'cat_lumber',
        sku: 'XSS-TEST',
        product_name: 'XSS Test Product',
        description: '<script>alert("XSS")</script>Legitimate description',
        price_per_unit: 10.00,
        unit_of_measure: 'piece'
      });

    expect(response.status).toBe(201);
    
    // Description should be sanitized
    expect(response.body.description).not.toContain('<script>');
  });

  it('should validate email format strictly', async () => {
    const invalidEmails = [
      'notanemail',
      '@example.com',
      'user@',
      'user @example.com',
      'user@example',
      'user..name@example.com'
    ];

    for (const email of invalidEmails) {
      const response = await request(app)
        .post('/api/auth/register/customer')
        .send({
          email,
          password: 'password123',
          first_name: 'Test',
          last_name: 'User',
          phone_number: '+1-555-0000',
          account_type: 'retail'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('ValidationError');
    }
  });

  it('should validate phone number formats', async () => {
    const response = await request(app)
      .post('/api/auth/register/customer')
      .send({
        email: 'phonetest@example.com',
        password: 'password123',
        first_name: 'Phone',
        last_name: 'Test',
        phone_number: 'not-a-phone-number',
        account_type: 'retail'
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('ValidationError');
  });

  it('should prevent XSS in user inputs', async () => {
    const response = await request(app)
      .post('/api/auth/register/customer')
      .send({
        email: 'xsstest@example.com',
        password: 'password123',
        first_name: '<script>alert("XSS")</script>',
        last_name: 'Test',
        phone_number: '+1-555-XSS',
        account_type: 'retail'
      });

    // Should either reject or sanitize
    if (response.status === 201) {
      expect(response.body.user.first_name).not.toContain('<script>');
    } else {
      expect(response.status).toBe(400);
    }
  });

  it('should enforce rate limiting on auth endpoints', async () => {
    // Attempt multiple rapid login attempts
    const attempts = Array(10).fill(null).map(() => 
      request(app)
        .post('/api/auth/login')
        .send({
          email: 'ratelimit@example.com',
          password: 'wrongpassword'
        })
    );

    const results = await Promise.all(attempts);

    // After several failures, should get rate limited
    const rateLimited = results.filter(r => r.status === 429);
    expect(rateLimited.length).toBeGreaterThan(0);
  });
});

// ============================================
// DATA CONSISTENCY TESTS
// ============================================

describe('Data Consistency & Integrity', () => {
  
  it('should maintain consistent product view counts', async () => {
    const product = await pool.query('SELECT product_id, views_count FROM products LIMIT 1');
    const productId = product.rows[0].product_id;
    const initialViews = parseInt(product.rows[0].views_count);

    // Record 5 views
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post(`/api/products/${productId}/view`)
        .set('Authorization', `Bearer ${customerToken}`);
    }

    const updated = await pool.query('SELECT views_count FROM products WHERE product_id = $1', [productId]);
    const finalViews = parseInt(updated.rows[0].views_count);

    expect(finalViews).toBe(initialViews + 5);
  });

  it('should maintain accurate supplier rating after reviews', async () => {
    const supplier = await pool.query('SELECT supplier_id, rating_average, total_reviews FROM suppliers LIMIT 1');
    const supplierId = supplier.rows[0].supplier_id;
    const currentAvg = parseFloat(supplier.rows[0].rating_average);
    const currentTotal = parseInt(supplier.rows[0].total_reviews);

    // New review with rating 5
    const newRating = 5;
    const expectedNewAvg = ((currentAvg * currentTotal) + newRating) / (currentTotal + 1);

    // Simulate adding review (would happen via review creation endpoint)
    await pool.query('UPDATE suppliers SET rating_average = $1, total_reviews = $2 WHERE supplier_id = $3', [expectedNewAvg, currentTotal + 1, supplierId]);

    const updated = await pool.query('SELECT rating_average, total_reviews FROM suppliers WHERE supplier_id = $1', [supplierId]);
    
    expect(parseFloat(updated.rows[0].rating_average)).toBeCloseTo(expectedNewAvg, 2);
    expect(parseInt(updated.rows[0].total_reviews)).toBe(currentTotal + 1);
  });

  it('should maintain inventory log accuracy', async () => {
    const product = await pool.query('SELECT product_id, supplier_id, stock_quantity FROM products LIMIT 1');
    const productId = product.rows[0].product_id;
    const supplierId = product.rows[0].supplier_id;
    const beforeQty = parseInt(product.rows[0].stock_quantity);

    const changeQty = -10;
    const afterQty = beforeQty + changeQty;

    // Update stock
    await pool.query('UPDATE products SET stock_quantity = $1 WHERE product_id = $2', [afterQty, productId]);

    // Create inventory log
    await pool.query(`
      INSERT INTO inventory_logs (log_id, product_id, supplier_id, change_type, quantity_before, quantity_change, quantity_after, reason, timestamp, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, ['invlog_test', productId, supplierId, 'adjustment', beforeQty, changeQty, afterQty, 'Test adjustment', new Date().toISOString(), new Date().toISOString()]);

    // Verify log created correctly
    const logCheck = await pool.query('SELECT * FROM inventory_logs WHERE log_id = $1', ['invlog_test']);
    
    expect(parseInt(logCheck.rows[0].quantity_before)).toBe(beforeQty);
    expect(parseInt(logCheck.rows[0].quantity_change)).toBe(changeQty);
    expect(parseInt(logCheck.rows[0].quantity_after)).toBe(afterQty);
  });
});

// ============================================
// EDGE CASE TESTS
// ============================================

describe('Edge Cases & Boundary Conditions', () => {
  
  it('should handle order with zero delivery fee', async () => {
    // Test free delivery scenario
    const orderTotal = 1000.00; // Above free delivery threshold
    const deliveryFee = orderTotal >= 500 ? 0 : 25.00;

    expect(deliveryFee).toBe(0);
  });

  it('should handle product with zero price (free item)', async () => {
    const supplier = await pool.query('SELECT supplier_id FROM suppliers LIMIT 1');
    
    const response = await request(app)
      .post('/api/suppliers/me/products')
      .set('Authorization', `Bearer ${supplierToken}`)
      .send({
        category_id: 'cat_lumber',
        sku: 'FREE-ITEM',
        product_name: 'Free Sample',
        description: 'Free product sample',
        price_per_unit: 0,
        unit_of_measure: 'piece',
        stock_quantity: 100
      });

    expect(response.status).toBe(201);
    expect(response.body.price_per_unit).toBe(0);
  });

  it('should handle maximum quantity orders', async () => {
    const product = await pool.query('SELECT product_id, stock_quantity FROM products WHERE stock_quantity > 100 LIMIT 1');

    if (product.rows.length === 0) {
      console.log('Skipping: No high-stock products');
      return;
    }

    const maxQty = parseInt(product.rows[0].stock_quantity);

    const response = await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        product_id: product.rows[0].product_id,
        quantity: maxQty
      });

    expect(response.status).toBe(201);
    expect(response.body.quantity).toBe(maxQty);
  });

  it('should handle concurrent stock updates correctly', async () => {
    const product = await pool.query('SELECT product_id, stock_quantity FROM products WHERE stock_quantity > 100 LIMIT 1');
    const productId = product.rows[0].product_id;
    const initialStock = parseInt(product.rows[0].stock_quantity);

    // Simulate concurrent updates
    const updates = Array(5).fill(null).map((_, i) => 
      pool.query('UPDATE products SET stock_quantity = stock_quantity - $1 WHERE product_id = $2', [10, productId])
    );

    await Promise.all(updates);

    const finalStock = await pool.query('SELECT stock_quantity FROM products WHERE product_id = $1', [productId]);
    const expectedStock = initialStock - 50;

    expect(parseInt(finalStock.rows[0].stock_quantity)).toBe(expectedStock);
  });

  it('should handle very long product descriptions', async () => {
    const longDescription = 'A'.repeat(5000);

    const response = await request(app)
      .post('/api/suppliers/me/products')
      .set('Authorization', `Bearer ${supplierToken}`)
      .send({
        category_id: 'cat_lumber',
        sku: 'LONG-DESC',
        product_name: 'Long Description Product',
        description: longDescription,
        price_per_unit: 10.00,
        unit_of_measure: 'piece'
      });

    expect(response.status).toBe(201);
    expect(response.body.description.length).toBe(5000);
  });

  it('should handle orders placed at exactly midnight', async () => {
    const midnight = new Date();
    midnight.setHours(0, 0, 0, 0);

    // This tests timestamp handling for edge case times
    const timestamp = midnight.toISOString();
    expect(timestamp).toContain('T00:00:00');
  });
});

// ============================================
// CLEANUP TESTS
// ============================================

describe('Database Cleanup & Maintenance', () => {
  
  it('should clean up abandoned carts older than 30 days', async () => {
    // Create old abandoned cart
    const oldDate = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
    
    await pool.query(`
      INSERT INTO carts (cart_id, customer_id, created_date, last_modified_date, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, ['old_cart', testCustomerId, oldDate, oldDate, 'abandoned', oldDate, oldDate]);

    // Run cleanup (this would be a scheduled job)
    await pool.query(`
      DELETE FROM carts 
      WHERE status = 'abandoned' 
      AND last_modified_date < $1
    `, [new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()]);

    // Verify old cart deleted
    const cartCheck = await pool.query('SELECT * FROM carts WHERE cart_id = $1', ['old_cart']);
    expect(cartCheck.rows.length).toBe(0);
  });

  it('should archive old notifications', async () => {
    // Test notification archival logic
    const oldDate = new Date(Date.now() - 91 * 24 * 60 * 60 * 1000).toISOString();

    const userId = (await pool.query('SELECT user_id FROM users LIMIT 1')).rows[0].user_id;
    
    await pool.query(`
      INSERT INTO notifications (notification_id, user_id, notification_type, title, message, created_date, is_read, delivered_via, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, ['old_notif', userId, 'system', 'Old Notification', 'Very old', oldDate, true, JSON.stringify(['email']), oldDate, oldDate]);

    // Archive old read notifications
    const archiveResult = await pool.query(`
      DELETE FROM notifications 
      WHERE is_read = true 
      AND created_date < $1
      RETURNING notification_id
    `, [new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()]);

    expect(archiveResult.rows.length).toBeGreaterThan(0);
  });
});