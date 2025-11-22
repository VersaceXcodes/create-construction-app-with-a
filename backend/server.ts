import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { Pool } from 'pg';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

// Type definitions
interface UserPayload extends JwtPayload {
  user_id: string;
  customer_id?: string;
  supplier_id?: string;
  admin_id?: string;
}

interface UserData {
  user_id: string;
  email: string;
  user_type: 'customer' | 'supplier' | 'admin';
  first_name: string;
  last_name: string;
  status: string;
  customer_id?: string;
  supplier_id?: string;
  admin_id?: string;
  customer?: any;
  supplier?: any;
  admin?: any;
}

interface AuthRequest extends Request {
  user?: UserData;
}

interface AuthSocket extends Socket {
  user?: UserData;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { DATABASE_URL, PGHOST, PGDATABASE, PGUSER, PGPASSWORD, PGPORT = 5432, JWT_SECRET = 'buildeasy-dev-secret-key', PORT = 3000 } = process.env;

const pool = new Pool(
  DATABASE_URL
    ? { 
        connectionString: DATABASE_URL, 
        ssl: { rejectUnauthorized: false } 
      }
    : {
        host: PGHOST,
        database: PGDATABASE,
        user: PGUSER,
        password: PGPASSWORD,
        port: Number(PGPORT),
        ssl: { rejectUnauthorized: false },
      }
);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    credentials: true
  }
});

const isDist = path.basename(__dirname) === 'dist';
const publicDir = isDist
  ? path.resolve(__dirname, '..', 'public')
  : path.resolve(__dirname, 'public');

app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use(morgan('combined'));

const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'AccessDenied', message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as UserPayload;
    const result = await pool.query('SELECT user_id, email, user_type, first_name, last_name, status FROM users WHERE user_id = $1', [decoded.user_id]);
    
    if (result.rows.length === 0 || result.rows[0].status !== 'active') {
      return res.status(401).json({ error: 'InvalidToken', message: 'Invalid or inactive user' });
    }

    req.user = result.rows[0];
    
    // Set role IDs from token
    req.user.customer_id = decoded.customer_id;
    req.user.supplier_id = decoded.supplier_id;
    req.user.admin_id = decoded.admin_id;
    
    // If customer_id not in token but user is a customer, fetch it from database
    if (!req.user.customer_id && req.user.user_type === 'customer') {
      const customerResult = await pool.query('SELECT customer_id FROM customers WHERE user_id = $1', [req.user.user_id]);
      if (customerResult.rows.length > 0) {
        req.user.customer_id = customerResult.rows[0].customer_id;
      }
    }
    
    // If supplier_id not in token but user is a supplier, fetch it from database
    if (!req.user.supplier_id && req.user.user_type === 'supplier') {
      const supplierResult = await pool.query('SELECT supplier_id FROM suppliers WHERE user_id = $1', [req.user.user_id]);
      if (supplierResult.rows.length > 0) {
        req.user.supplier_id = supplierResult.rows[0].supplier_id;
      }
    }
    
    // If admin_id not in token but user is an admin, fetch it from database
    if (!req.user.admin_id && req.user.user_type === 'admin') {
      const adminResult = await pool.query('SELECT admin_id FROM admins WHERE user_id = $1', [req.user.user_id]);
      if (adminResult.rows.length > 0) {
        req.user.admin_id = adminResult.rows[0].admin_id;
      }
    }
    
    next();
  } catch (error) {
    return res.status(403).json({ error: 'InvalidToken', message: 'Invalid or expired token' });
  }
};

const requireCustomer = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.user_type !== 'customer') {
    return res.status(403).json({ error: 'Forbidden', message: 'Customer access required' });
  }
  next();
};

const requireSupplier = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.user_type !== 'supplier') {
    return res.status(403).json({ error: 'Forbidden', message: 'Supplier access required' });
  }
  next();
};

const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.user_type !== 'admin') {
    return res.status(403).json({ error: 'Forbidden', message: 'Admin access required' });
  }
  next();
};

// Helper to safely convert query params to string
const asString = (value: any): string | undefined => {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') return value[0];
  return undefined;
};

// Helper to safely convert query params to number
const asNumber = (value: any, defaultValue: number = 0): number => {
  const str = asString(value);
  if (!str) return defaultValue;
  const num = parseInt(str, 10);
  return isNaN(num) ? defaultValue : num;
};

app.post('/api/auth/register/customer', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { email, password, first_name, last_name, phone_number, account_type, default_delivery_address } = req.body;

    if (!email || !password || !first_name || !last_name || !phone_number || !account_type) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'ValidationError', message: 'Missing required fields' });
    }

    const existingUser = await client.query('SELECT user_id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existingUser.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'DuplicateEmailError', message: 'Email already exists' });
    }

    const user_id = uuidv4();
    const customer_id = uuidv4();
    const email_verification_token = uuidv4();
    const now = new Date().toISOString();

    await client.query(
      'INSERT INTO users (user_id, email, password_hash, user_type, first_name, last_name, phone_number, registration_date, status, email_verified, email_verification_token, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)',
      [user_id, email.toLowerCase(), password, 'customer', first_name, last_name, phone_number, now, 'active', false, email_verification_token, now, now]
    );

    const notification_preferences = JSON.stringify({
      email: true,
      sms: true,
      push: true,
      order_updates: true,
      promotions: true
    });

    let default_address_id = null;
    if (default_delivery_address && default_delivery_address.street_address) {
      const address_id = uuidv4();
      await client.query(
        'INSERT INTO addresses (address_id, user_id, full_name, phone_number, street_address, city, state, postal_code, country, is_default, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)',
        [address_id, user_id, `${first_name} ${last_name}`, phone_number, default_delivery_address.street_address, default_delivery_address.city || '', default_delivery_address.state || '', default_delivery_address.postal_code || '', 'USA', true, now, now]
      );
      default_address_id = address_id;
    }

    await client.query(
      'INSERT INTO customers (customer_id, user_id, account_type, default_delivery_address_id, trade_credit_limit, trade_credit_balance, trade_credit_used, notification_preferences, onboarding_completed, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
      [customer_id, user_id, account_type, default_address_id, 0, 0, 0, notification_preferences, false, now, now]
    );

    await client.query('COMMIT');

    const token = jwt.sign({ user_id, user_type: 'customer', customer_id }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      token,
      user: {
        user_id,
        email: email.toLowerCase(),
        user_type: 'customer',
        first_name,
        last_name,
        status: 'active',
        email_verified: false
      },
      customer: {
        customer_id,
        account_type,
        onboarding_completed: false
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  } finally {
    client.release();
  }
});

app.post('/api/auth/register/supplier', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { email, password, business_name, business_registration_number, business_type, contact_person_name, phone_number, business_address, business_description } = req.body;

    if (!email || !password || !business_name || !business_registration_number || !business_type || !contact_person_name || !phone_number || !business_address) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'ValidationError', message: 'Missing required fields' });
    }

    const existingUser = await client.query('SELECT user_id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existingUser.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'DuplicateEmailError', message: 'Email already exists' });
    }

    const user_id = uuidv4();
    const application_id = uuidv4();
    const email_verification_token = uuidv4();
    const now = new Date().toISOString();

    const nameParts = contact_person_name.split(' ');
    const first_name = nameParts[0] || contact_person_name;
    const last_name = nameParts.slice(1).join(' ') || '';

    await client.query(
      'INSERT INTO users (user_id, email, password_hash, user_type, first_name, last_name, phone_number, registration_date, status, email_verified, email_verification_token, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)',
      [user_id, email.toLowerCase(), password, 'supplier', first_name, last_name, phone_number, now, 'active', false, email_verification_token, now, now]
    );

    const verification_checklist = JSON.stringify({
      business_registration_verified: false,
      tax_id_verified: false,
      address_verified: false,
      identity_verified: false,
      background_check_completed: false
    });

    await client.query(
      'INSERT INTO supplier_applications (application_id, user_id, business_name, business_registration_number, business_type, contact_person_name, business_address, business_description, application_status, verification_checklist, submitted_date, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)',
      [application_id, user_id, business_name, business_registration_number, business_type, contact_person_name, business_address, business_description || '', 'pending_review', verification_checklist, now, now, now]
    );

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Supplier application submitted successfully. You will be notified once reviewed.',
      application_id
    });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  } finally {
    client.release();
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'ValidationError', message: 'Email and password required' });
    }

    const userResult = await pool.query(
      'SELECT user_id, email, password_hash, user_type, first_name, last_name, phone_number, profile_photo_url, registration_date, last_login_date, status, email_verified FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'InvalidCredentials', message: 'Invalid email or password' });
    }

    const user = userResult.rows[0];

    if (user.password_hash !== password) {
      return res.status(401).json({ error: 'InvalidCredentials', message: 'Invalid email or password' });
    }

    if (user.status !== 'active') {
      return res.status(401).json({ error: 'AccountInactive', message: 'Account is not active' });
    }

    const now = new Date().toISOString();
    await pool.query('UPDATE users SET last_login_date = $1, updated_at = $2 WHERE user_id = $3', [now, now, user.user_id]);

    let roleData: any = {};
    let roleId: string | null = null;

    if (user.user_type === 'customer') {
      const customerResult = await pool.query('SELECT * FROM customers WHERE user_id = $1', [user.user_id]);
      if (customerResult.rows.length > 0) {
        roleData.customer = customerResult.rows[0];
        roleId = customerResult.rows[0].customer_id;
      } else {
        return res.status(404).json({ 
          error: 'CustomerProfileNotFound', 
          message: 'Customer profile not found. Please contact support.' 
        });
      }
    } else if (user.user_type === 'supplier') {
      const supplierResult = await pool.query('SELECT * FROM suppliers WHERE user_id = $1', [user.user_id]);
      if (supplierResult.rows.length > 0) {
        roleData.supplier = supplierResult.rows[0];
        roleId = supplierResult.rows[0].supplier_id;
      } else {
        return res.status(404).json({ 
          error: 'SupplierProfileNotFound', 
          message: 'Supplier profile not found. Your application may still be pending approval.' 
        });
      }
    } else if (user.user_type === 'admin') {
      const adminResult = await pool.query('SELECT * FROM admins WHERE user_id = $1', [user.user_id]);
      if (adminResult.rows.length > 0) {
        roleData.admin = adminResult.rows[0];
        roleId = adminResult.rows[0].admin_id;
      } else {
        return res.status(404).json({ 
          error: 'AdminProfileNotFound', 
          message: 'Admin profile not found. Please contact support.' 
        });
      }
    }

    const tokenPayload: any = { user_id: user.user_id, user_type: user.user_type };
    if (user.user_type === 'customer') tokenPayload.customer_id = roleId;
    if (user.user_type === 'supplier') tokenPayload.supplier_id = roleId;
    if (user.user_type === 'admin') tokenPayload.admin_id = roleId;

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        user_id: user.user_id,
        email: user.email,
        user_type: user.user_type,
        first_name: user.first_name,
        last_name: user.last_name,
        phone_number: user.phone_number,
        profile_photo_url: user.profile_photo_url,
        status: user.status,
        email_verified: user.email_verified
      },
      ...roleData
    });
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.post('/api/auth/logout', authenticateToken, (req, res) => {
  res.json({ message: 'Logout successful' });
});

app.post('/api/auth/verify-email', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'ValidationError', message: 'Token required' });
    }

    const now = new Date().toISOString();
    const result = await pool.query(
      'UPDATE users SET email_verified = true, email_verification_token = NULL, updated_at = $1 WHERE email_verification_token = $2 RETURNING user_id',
      [now, token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'InvalidToken', message: 'Invalid or expired verification token' });
    }

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.post('/api/auth/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;

    const user = await pool.query('SELECT user_id, email_verified FROM users WHERE email = $1', [email.toLowerCase()]);
    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'UserNotFound', message: 'User not found' });
    }

    if (user.rows[0].email_verified) {
      return res.json({ message: 'Email already verified' });
    }

    const email_verification_token = uuidv4();
    const now = new Date().toISOString();
    await pool.query(
      'UPDATE users SET email_verification_token = $1, updated_at = $2 WHERE user_id = $3',
      [email_verification_token, now, user.rows[0].user_id]
    );

    res.json({ message: 'Verification email sent' });
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    const user = await pool.query('SELECT user_id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (user.rows.length === 0) {
      return res.json({ message: 'Password reset email sent' });
    }

    const password_reset_token = uuidv4();
    const now = new Date().toISOString();
    const expires = new Date(Date.now() + 3600000).toISOString();

    await pool.query(
      'UPDATE users SET password_reset_token = $1, password_reset_expires = $2, updated_at = $3 WHERE user_id = $4',
      [password_reset_token, expires, now, user.rows[0].user_id]
    );

    res.json({ message: 'Password reset email sent' });
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, new_password } = req.body;

    if (!token || !new_password) {
      return res.status(400).json({ error: 'ValidationError', message: 'Token and new password required' });
    }

    const now = new Date().toISOString();
    const result = await pool.query(
      'UPDATE users SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL, updated_at = $2 WHERE password_reset_token = $3 AND password_reset_expires > $4 RETURNING user_id',
      [new_password, now, token, now]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'InvalidToken', message: 'Invalid or expired reset token' });
    }

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.get('/api/users/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query('SELECT user_id, email, user_type, first_name, last_name, phone_number, profile_photo_url, registration_date, last_login_date, status, email_verified, created_at, updated_at FROM users WHERE user_id = $1', [req.user.user_id]);
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.patch('/api/users/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { first_name, last_name, phone_number, profile_photo_url } = req.body;
    const now = new Date().toISOString();

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (first_name !== undefined) {
      updates.push(`first_name = $${paramCount++}`);
      values.push(first_name);
    }
    if (last_name !== undefined) {
      updates.push(`last_name = $${paramCount++}`);
      values.push(last_name);
    }
    if (phone_number !== undefined) {
      updates.push(`phone_number = $${paramCount++}`);
      values.push(phone_number);
    }
    if (profile_photo_url !== undefined) {
      updates.push(`profile_photo_url = $${paramCount++}`);
      values.push(profile_photo_url);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'ValidationError', message: 'No fields to update' });
    }

    updates.push(`updated_at = $${paramCount++}`);
    values.push(now);
    values.push(req.user.user_id);

    const result = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE user_id = $${paramCount} RETURNING user_id, email, user_type, first_name, last_name, phone_number, profile_photo_url, registration_date, last_login_date, status, email_verified, created_at, updated_at`,
      values
    );

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.post('/api/users/me/change-password', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'ValidationError', message: 'Current and new password required' });
    }

    const user = await pool.query('SELECT password_hash FROM users WHERE user_id = $1', [req.user.user_id]);
    
    if (user.rows[0].password_hash !== current_password) {
      return res.status(401).json({ error: 'InvalidPassword', message: 'Current password incorrect' });
    }

    const now = new Date().toISOString();
    await pool.query('UPDATE users SET password_hash = $1, updated_at = $2 WHERE user_id = $3', [new_password, now, req.user.user_id]);

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.get('/api/users/:user_id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT user_id, email, user_type, first_name, last_name, phone_number, profile_photo_url, registration_date, status, email_verified FROM users WHERE user_id = $1',
      [req.params.user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'UserNotFound', message: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.get('/api/customers/me', authenticateToken, requireCustomer, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM customers WHERE user_id = $1', [req.user.user_id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'CustomerNotFound', message: 'Customer not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.patch('/api/customers/me', authenticateToken, requireCustomer, async (req: AuthRequest, res: Response) => {
  try {
    const { account_type, default_delivery_address_id, preferred_brands, preferred_suppliers, preferred_categories, notification_preferences, onboarding_completed } = req.body;
    const now = new Date().toISOString();

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (account_type) {
      updates.push(`account_type = $${paramCount++}`);
      values.push(account_type);
    }
    if (default_delivery_address_id !== undefined) {
      updates.push(`default_delivery_address_id = $${paramCount++}`);
      values.push(default_delivery_address_id);
    }
    if (preferred_brands !== undefined) {
      updates.push(`preferred_brands = $${paramCount++}`);
      values.push(JSON.stringify(preferred_brands));
    }
    if (preferred_suppliers !== undefined) {
      updates.push(`preferred_suppliers = $${paramCount++}`);
      values.push(JSON.stringify(preferred_suppliers));
    }
    if (preferred_categories !== undefined) {
      updates.push(`preferred_categories = $${paramCount++}`);
      values.push(JSON.stringify(preferred_categories));
    }
    if (notification_preferences !== undefined) {
      updates.push(`notification_preferences = $${paramCount++}`);
      values.push(JSON.stringify(notification_preferences));
    }
    if (onboarding_completed !== undefined) {
      updates.push(`onboarding_completed = $${paramCount++}`);
      values.push(onboarding_completed);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'ValidationError', message: 'No fields to update' });
    }

    updates.push(`updated_at = $${paramCount++}`);
    values.push(now);
    values.push(req.user.user_id);

    const result = await pool.query(
      `UPDATE customers SET ${updates.join(', ')} WHERE user_id = $${paramCount} RETURNING *`,
      values
    );

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.get('/api/addresses', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC', [req.user.user_id]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.post('/api/addresses', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { label, full_name, phone_number, street_address, apt_suite, city, state, postal_code, country, address_type, delivery_instructions, is_default } = req.body;

    if (!full_name || !phone_number || !street_address || !city || !state || !postal_code) {
      return res.status(400).json({ error: 'ValidationError', message: 'Missing required fields' });
    }

    const address_id = uuidv4();
    const now = new Date().toISOString();

    if (is_default) {
      await pool.query('UPDATE addresses SET is_default = false, updated_at = $1 WHERE user_id = $2', [now, req.user.user_id]);
    }

    const result = await pool.query(
      'INSERT INTO addresses (address_id, user_id, label, full_name, phone_number, street_address, apt_suite, city, state, postal_code, country, address_type, delivery_instructions, is_default, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING *',
      [address_id, req.user.user_id, label, full_name, phone_number, street_address, apt_suite, city, state, postal_code, country || 'USA', address_type, delivery_instructions, is_default || false, now, now]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.get('/api/addresses/:address_id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM addresses WHERE address_id = $1 AND user_id = $2', [req.params.address_id, req.user.user_id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'AddressNotFound', message: 'Address not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.patch('/api/addresses/:address_id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { label, full_name, phone_number, street_address, apt_suite, city, state, postal_code, address_type, delivery_instructions, is_default } = req.body;
    const now = new Date().toISOString();

    if (is_default) {
      await pool.query('UPDATE addresses SET is_default = false, updated_at = $1 WHERE user_id = $2', [now, req.user.user_id]);
    }

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (label !== undefined) { updates.push(`label = $${paramCount++}`); values.push(label); }
    if (full_name !== undefined) { updates.push(`full_name = $${paramCount++}`); values.push(full_name); }
    if (phone_number !== undefined) { updates.push(`phone_number = $${paramCount++}`); values.push(phone_number); }
    if (street_address !== undefined) { updates.push(`street_address = $${paramCount++}`); values.push(street_address); }
    if (apt_suite !== undefined) { updates.push(`apt_suite = $${paramCount++}`); values.push(apt_suite); }
    if (city !== undefined) { updates.push(`city = $${paramCount++}`); values.push(city); }
    if (state !== undefined) { updates.push(`state = $${paramCount++}`); values.push(state); }
    if (postal_code !== undefined) { updates.push(`postal_code = $${paramCount++}`); values.push(postal_code); }
    if (address_type !== undefined) { updates.push(`address_type = $${paramCount++}`); values.push(address_type); }
    if (delivery_instructions !== undefined) { updates.push(`delivery_instructions = $${paramCount++}`); values.push(delivery_instructions); }
    if (is_default !== undefined) { updates.push(`is_default = $${paramCount++}`); values.push(is_default); }

    updates.push(`updated_at = $${paramCount++}`);
    values.push(now);
    values.push(req.params.address_id);
    values.push(req.user.user_id);

    const result = await pool.query(
      `UPDATE addresses SET ${updates.join(', ')} WHERE address_id = $${paramCount} AND user_id = $${paramCount + 1} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'AddressNotFound', message: 'Address not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.delete('/api/addresses/:address_id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query('DELETE FROM addresses WHERE address_id = $1 AND user_id = $2 RETURNING address_id', [req.params.address_id, req.user.user_id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'AddressNotFound', message: 'Address not found' });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.get('/api/payment-methods', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query('SELECT payment_method_id, user_id, payment_type, card_brand, card_last_four, card_expiry_month, card_expiry_year, cardholder_name, billing_address_id, is_default, created_at, updated_at FROM payment_methods WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC', [req.user.user_id]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.post('/api/payment-methods', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { payment_type, card_brand, card_last_four, card_expiry_month, card_expiry_year, cardholder_name, billing_address_id, payment_token, is_default } = req.body;

    if (!payment_type) {
      return res.status(400).json({ error: 'ValidationError', message: 'Payment type required' });
    }

    const payment_method_id = uuidv4();
    const now = new Date().toISOString();

    if (is_default) {
      await pool.query('UPDATE payment_methods SET is_default = false, updated_at = $1 WHERE user_id = $2', [now, req.user.user_id]);
    }

    const result = await pool.query(
      'INSERT INTO payment_methods (payment_method_id, user_id, payment_type, card_brand, card_last_four, card_expiry_month, card_expiry_year, cardholder_name, billing_address_id, payment_token, is_default, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING payment_method_id, user_id, payment_type, card_brand, card_last_four, card_expiry_month, card_expiry_year, cardholder_name, billing_address_id, is_default, created_at, updated_at',
      [payment_method_id, req.user.user_id, payment_type, card_brand, card_last_four, card_expiry_month, card_expiry_year, cardholder_name, billing_address_id, payment_token, is_default || false, now, now]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.patch('/api/payment-methods/:payment_method_id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { card_expiry_month, card_expiry_year, billing_address_id, is_default } = req.body;
    const now = new Date().toISOString();

    if (is_default) {
      await pool.query('UPDATE payment_methods SET is_default = false, updated_at = $1 WHERE user_id = $2', [now, req.user.user_id]);
    }

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (card_expiry_month !== undefined) { updates.push(`card_expiry_month = $${paramCount++}`); values.push(card_expiry_month); }
    if (card_expiry_year !== undefined) { updates.push(`card_expiry_year = $${paramCount++}`); values.push(card_expiry_year); }
    if (billing_address_id !== undefined) { updates.push(`billing_address_id = $${paramCount++}`); values.push(billing_address_id); }
    if (is_default !== undefined) { updates.push(`is_default = $${paramCount++}`); values.push(is_default); }

    updates.push(`updated_at = $${paramCount++}`);
    values.push(now);
    values.push(req.params.payment_method_id);
    values.push(req.user.user_id);

    const result = await pool.query(
      `UPDATE payment_methods SET ${updates.join(', ')} WHERE payment_method_id = $${paramCount} AND user_id = $${paramCount + 1} RETURNING payment_method_id, user_id, payment_type, card_brand, card_last_four, card_expiry_month, card_expiry_year, cardholder_name, billing_address_id, is_default, created_at, updated_at`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'PaymentMethodNotFound', message: 'Payment method not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.delete('/api/payment-methods/:payment_method_id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query('DELETE FROM payment_methods WHERE payment_method_id = $1 AND user_id = $2 RETURNING payment_method_id', [req.params.payment_method_id, req.user.user_id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'PaymentMethodNotFound', message: 'Payment method not found' });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.get('/api/products', async (req, res) => {
  try {
    const search_query = asString(req.query.search_query);
    const category = asString(req.query.category);
    const supplier_id = asString(req.query.supplier_id);
    const brand = asString(req.query.brand);
    const status = asString(req.query.status);
    const is_featured = asString(req.query.is_featured);
    const price_min = asString(req.query.price_min);
    const price_max = asString(req.query.price_max);
    const in_stock_only = asString(req.query.in_stock_only);
    const supplier_rating_min = asString(req.query.supplier_rating_min);
    const brands = asString(req.query.brands);
    const delivery_speed = asString(req.query.delivery_speed);
    const supplier_distance_max = asString(req.query.supplier_distance_max);
    const deals_only = asString(req.query.deals_only);
    const tags = asString(req.query.tags);
    const customer_type_availability = asString(req.query.customer_type_availability);
    const sort_by = asString(req.query.sort_by) || 'created_at';
    const sort_order = asString(req.query.sort_order) || 'desc';
    
    // Coerce query params to prevent 400 errors
    const limit = Math.min(asNumber(req.query.limit, 50), 100);
    const offset = asNumber(req.query.offset, 0);

    let query = `
      SELECT 
        p.product_id, p.supplier_id, p.category_id, p.sku, p.product_name, p.description,
        p.price_per_unit, p.unit_of_measure, p.stock_quantity, p.last_updated_timestamp,
        p.primary_image_url, p.brand, p.views_count, p.sales_count, p.status, p.is_featured,
        s.business_name, s.rating_average, s.logo_url,
        c.category_name
      FROM products p
      INNER JOIN suppliers s ON p.supplier_id = s.supplier_id
      INNER JOIN categories c ON p.category_id = c.category_id
      WHERE p.status = 'active'
        AND p.searchable = true
        AND s.status = 'active'
        AND s.verification_status = 'verified'
    `;

    const params = [];
    let paramCount = 1;

    if (search_query) {
      query += ` AND (p.product_name ILIKE $${paramCount} OR p.description ILIKE $${paramCount} OR p.tags::text ILIKE $${paramCount})`;
      params.push(`%${search_query}%`);
      paramCount++;
    }

    if (category) {
      query += ` AND p.category_id = $${paramCount}`;
      params.push(category);
      paramCount++;
    }

    if (supplier_id) {
      query += ` AND p.supplier_id = $${paramCount}`;
      params.push(supplier_id);
      paramCount++;
    }

    if (brand) {
      query += ` AND p.brand = $${paramCount}`;
      params.push(brand);
      paramCount++;
    }

    if (price_min) {
      query += ` AND p.price_per_unit >= $${paramCount}`;
      params.push(parseFloat(price_min));
      paramCount++;
    }

    if (price_max) {
      query += ` AND p.price_per_unit <= $${paramCount}`;
      params.push(parseFloat(price_max));
      paramCount++;
    }

    if (in_stock_only === 'true') {
      query += ` AND p.stock_quantity > 0`;
    }

    if (supplier_rating_min) {
      query += ` AND s.rating_average >= $${paramCount}`;
      params.push(parseFloat(supplier_rating_min));
      paramCount++;
    }

    if (is_featured === 'true') {
      query += ` AND p.is_featured = true`;
    }

    if (customer_type_availability && customer_type_availability !== 'all') {
      query += ` AND (p.customer_type_availability = $${paramCount} OR p.customer_type_availability = 'all')`;
      params.push(customer_type_availability);
      paramCount++;
    }

    const orderByMap = {
      price_per_unit: 'p.price_per_unit',
      created_at: 'p.creation_date',
      sales_count: 'p.sales_count',
      product_name: 'p.product_name',
      views_count: 'p.views_count'
    };

    const orderBy = orderByMap[sort_by] || 'p.creation_date';
    query += ` ORDER BY ${orderBy} ${sort_order === 'asc' ? 'ASC' : 'DESC'}`;

    query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit);
    params.push(offset);

    const result = await pool.query(query, params);

    const countQuery = query.substring(0, query.indexOf('ORDER BY')).replace(/SELECT .* FROM/, 'SELECT COUNT(*) as total FROM');
    const countResult = await pool.query(countQuery, params.slice(0, -2));

    res.json({
      products: result.rows,
      total: parseInt(countResult.rows[0].total),
      limit: asNumber(limit, 50),
      offset: asNumber(offset, 0)
    });
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.get('/api/products/:product_id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, s.business_name, s.rating_average, s.logo_url, s.response_time_average, c.category_name
       FROM products p
       INNER JOIN suppliers s ON p.supplier_id = s.supplier_id
       INNER JOIN categories c ON p.category_id = c.category_id
       WHERE p.product_id = $1`,
      [req.params.product_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'ProductNotFound', message: 'Product not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.patch('/api/products/:product_id', authenticateToken, requireSupplier, async (req: AuthRequest, res: Response) => {
  try {
    const { product_name, description, price_per_unit, stock_quantity, status, images, primary_image_url, is_featured, tags } = req.body;
    const now = new Date().toISOString();

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (product_name !== undefined) { updates.push(`product_name = $${paramCount++}`); values.push(product_name); }
    if (description !== undefined) { updates.push(`description = $${paramCount++}`); values.push(description); }
    if (price_per_unit !== undefined) { updates.push(`price_per_unit = $${paramCount++}`); values.push(price_per_unit); }
    if (stock_quantity !== undefined) {
      const oldStock = await pool.query('SELECT stock_quantity, supplier_id FROM products WHERE product_id = $1', [req.params.product_id]);
      if (oldStock.rows.length > 0) {
        const log_id = uuidv4();
        await pool.query(
          'INSERT INTO inventory_logs (log_id, product_id, supplier_id, change_type, quantity_before, quantity_change, quantity_after, reason, performed_by, timestamp, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
          [log_id, req.params.product_id, oldStock.rows[0].supplier_id, 'adjustment', oldStock.rows[0].stock_quantity, stock_quantity - oldStock.rows[0].stock_quantity, stock_quantity, 'Manual update', req.user.user_id, now, now]
        );
      }
      updates.push(`stock_quantity = $${paramCount++}`);
      values.push(stock_quantity);
      updates.push(`last_updated_timestamp = $${paramCount++}`);
      values.push(now);
    }
    if (status !== undefined) { updates.push(`status = $${paramCount++}`); values.push(status); }
    if (images !== undefined) { updates.push(`images = $${paramCount++}`); values.push(JSON.stringify(images)); }
    if (primary_image_url !== undefined) { updates.push(`primary_image_url = $${paramCount++}`); values.push(primary_image_url); }
    if (is_featured !== undefined) { updates.push(`is_featured = $${paramCount++}`); values.push(is_featured); }
    if (tags !== undefined) { updates.push(`tags = $${paramCount++}`); values.push(JSON.stringify(tags)); }

    updates.push(`updated_at = $${paramCount++}`);
    values.push(now);
    values.push(req.params.product_id);
    values.push(req.user.supplier_id);

    const result = await pool.query(
      `UPDATE products SET ${updates.join(', ')} WHERE product_id = $${paramCount} AND supplier_id = $${paramCount + 1} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'ProductNotFound', message: 'Product not found' });
    }

    if (stock_quantity !== undefined) {
      io.to(`product:${req.params.product_id}`).emit('inventory_update', {
        product_id: req.params.product_id,
        stock_quantity: result.rows[0].stock_quantity,
        status: result.rows[0].status,
        last_updated_timestamp: result.rows[0].last_updated_timestamp,
        timestamp: now
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.post('/api/products/:product_id/view', async (req: AuthRequest, res: Response) => {
  try {
    const view_id = uuidv4();
    const now = new Date().toISOString();
    const user_id = req.user ? req.user.user_id : null;

    await pool.query(
      'INSERT INTO product_views (view_id, product_id, user_id, session_id, referrer, view_timestamp, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [view_id, req.params.product_id, user_id, req.headers['x-session-id'] || uuidv4(), req.headers.referer || 'direct', now, now]
    );

    await pool.query('UPDATE products SET views_count = views_count + 1, updated_at = $1 WHERE product_id = $2', [now, req.params.product_id]);

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.get('/api/products/compare', async (req, res) => {
  try {
    const product_ids = asString(req.query.product_ids);
    if (!product_ids) {
      return res.status(400).json({ error: 'ValidationError', message: 'product_ids required' });
    }

    const ids = product_ids.split(',').slice(0, 5);
    const result = await pool.query(
      `SELECT p.*, s.business_name, s.rating_average, c.category_name
       FROM products p
       INNER JOIN suppliers s ON p.supplier_id = s.supplier_id
       INNER JOIN categories c ON p.category_id = c.category_id
       WHERE p.product_id = ANY($1)`,
      [ids]
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.get('/api/categories', async (req, res) => {
  try {
    const { parent_category_id, is_active } = req.query;
    let query = 'SELECT * FROM categories WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (parent_category_id !== undefined) {
      if (parent_category_id === 'null' || parent_category_id === '') {
        query += ' AND parent_category_id IS NULL';
      } else {
        query += ` AND parent_category_id = $${paramCount}`;
        params.push(parent_category_id);
        paramCount++;
      }
    }

    if (is_active !== undefined) {
      query += ` AND is_active = $${paramCount}`;
      params.push(is_active === 'true');
      paramCount++;
    }

    query += ' ORDER BY display_order ASC, category_name ASC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.get('/api/categories/:category_id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories WHERE category_id = $1', [req.params.category_id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'CategoryNotFound', message: 'Category not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.get('/api/categories/:category_id/products', async (req, res) => {
  try {
    // Coerce query params
    const limit = Math.min(asNumber(req.query.limit, 50), 100);
    const offset = asNumber(req.query.offset, 0);
    
    const result = await pool.query(
      `SELECT p.*, s.business_name, s.rating_average
       FROM products p
       INNER JOIN suppliers s ON p.supplier_id = s.supplier_id
       WHERE p.category_id = $1 AND p.status = 'active' AND p.searchable = true
       ORDER BY p.creation_date DESC
       LIMIT $2 OFFSET $3`,
      [req.params.category_id, limit, offset]
    );

    const countResult = await pool.query(
      'SELECT COUNT(*) as total FROM products WHERE category_id = $1 AND status = \'active\' AND searchable = true',
      [req.params.category_id]
    );

    res.json({
      products: result.rows,
      total: parseInt(countResult.rows[0].total)
    });
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.get('/api/suppliers', async (req, res) => {
  try {
    const query = asString(req.query.query);
    const business_type = asString(req.query.business_type);
    const verification_status = asString(req.query.verification_status);
    const status = asString(req.query.status);
    const subscription_plan = asString(req.query.subscription_plan);
    const min_rating = asString(req.query.min_rating);
    const service_area = asString(req.query.service_area);
    const sort_by = asString(req.query.sort_by) || 'rating_average';
    const sort_order = asString(req.query.sort_order) || 'desc';
    
    // Coerce query params
    const limit = Math.min(asNumber(req.query.limit, 50), 100);
    const offset = asNumber(req.query.offset, 0);

    let sqlQuery = 'SELECT * FROM suppliers WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (query) {
      sqlQuery += ` AND business_name ILIKE $${paramCount}`;
      params.push(`%${query}%`);
      paramCount++;
    }

    if (business_type) {
      sqlQuery += ` AND business_type = $${paramCount}`;
      params.push(business_type);
      paramCount++;
    }

    if (verification_status) {
      sqlQuery += ` AND verification_status = $${paramCount}`;
      params.push(verification_status);
      paramCount++;
    }

    if (status) {
      sqlQuery += ` AND status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (subscription_plan) {
      sqlQuery += ` AND subscription_plan = $${paramCount}`;
      params.push(subscription_plan);
      paramCount++;
    }

    if (min_rating) {
      sqlQuery += ` AND rating_average >= $${paramCount}`;
      params.push(parseFloat(min_rating));
      paramCount++;
    }

    const orderByMap = {
      rating_average: 'rating_average',
      total_sales: 'total_sales',
      created_at: 'created_at',
      business_name: 'business_name'
    };

    const orderBy = orderByMap[sort_by] || 'rating_average';
    sqlQuery += ` ORDER BY ${orderBy} ${sort_order === 'asc' ? 'ASC' : 'DESC'}`;
    sqlQuery += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit);
    params.push(offset);

    const result = await pool.query(sqlQuery, params);

    const countQuery = sqlQuery.substring(0, sqlQuery.indexOf('ORDER BY')).replace(/SELECT \* FROM/, 'SELECT COUNT(*) as total FROM');
    const countResult = await pool.query(countQuery, params.slice(0, -2));

    res.json({
      suppliers: result.rows,
      total: parseInt(countResult.rows[0].total)
    });
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

// IMPORTANT: /me route must come BEFORE /:supplier_id to prevent "me" from being treated as a supplier_id
app.get('/api/suppliers/me', authenticateToken, requireSupplier, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM suppliers WHERE user_id = $1', [req.user.user_id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'SupplierNotFound', message: 'Supplier profile not found' });
    }
    // Ensure numeric fields are properly typed
    const supplier = result.rows[0];
    supplier.rating_average = Number(supplier.rating_average) || 0;
    supplier.total_reviews = Number(supplier.total_reviews) || 0;
    supplier.total_sales = Number(supplier.total_sales) || 0;
    supplier.total_orders = Number(supplier.total_orders) || 0;
    supplier.fulfillment_rate = Number(supplier.fulfillment_rate) || 0;
    supplier.response_time_average = supplier.response_time_average !== null ? Number(supplier.response_time_average) : null;
    res.json(supplier);
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.get('/api/suppliers/:supplier_id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM suppliers WHERE supplier_id = $1', [req.params.supplier_id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'SupplierNotFound', message: 'Supplier not found' });
    }
    // Ensure numeric fields are properly typed
    const supplier = result.rows[0];
    supplier.rating_average = Number(supplier.rating_average) || 0;
    supplier.total_reviews = Number(supplier.total_reviews) || 0;
    supplier.total_sales = Number(supplier.total_sales) || 0;
    supplier.total_orders = Number(supplier.total_orders) || 0;
    supplier.fulfillment_rate = Number(supplier.fulfillment_rate) || 0;
    supplier.response_time_average = supplier.response_time_average !== null ? Number(supplier.response_time_average) : null;
    res.json(supplier);
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.patch('/api/suppliers/me', authenticateToken, requireSupplier, async (req: AuthRequest, res: Response) => {
  try {
    const { business_name, business_description, logo_url, cover_photo_url, operating_hours, service_areas, return_policy, shipping_policy, minimum_order_value, onboarding_completed } = req.body;
    const now = new Date().toISOString();

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (business_name !== undefined) { updates.push(`business_name = $${paramCount++}`); values.push(business_name); }
    if (business_description !== undefined) { updates.push(`business_description = $${paramCount++}`); values.push(business_description); }
    if (logo_url !== undefined) { updates.push(`logo_url = $${paramCount++}`); values.push(logo_url); }
    if (cover_photo_url !== undefined) { updates.push(`cover_photo_url = $${paramCount++}`); values.push(cover_photo_url); }
    if (operating_hours !== undefined) { updates.push(`operating_hours = $${paramCount++}`); values.push(JSON.stringify(operating_hours)); }
    if (service_areas !== undefined) { updates.push(`service_areas = $${paramCount++}`); values.push(JSON.stringify(service_areas)); }
    if (return_policy !== undefined) { updates.push(`return_policy = $${paramCount++}`); values.push(return_policy); }
    if (shipping_policy !== undefined) { updates.push(`shipping_policy = $${paramCount++}`); values.push(shipping_policy); }
    if (minimum_order_value !== undefined) { updates.push(`minimum_order_value = $${paramCount++}`); values.push(minimum_order_value); }
    if (onboarding_completed !== undefined) { updates.push(`onboarding_completed = $${paramCount++}`); values.push(onboarding_completed); }

    updates.push(`updated_at = $${paramCount++}`);
    values.push(now);
    values.push(req.user.user_id);

    const result = await pool.query(
      `UPDATE suppliers SET ${updates.join(', ')} WHERE user_id = $${paramCount} RETURNING *`,
      values
    );

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

// IMPORTANT: /me/products route must come BEFORE /:supplier_id/products
app.get('/api/suppliers/me/products', authenticateToken, requireSupplier, async (req: AuthRequest, res: Response) => {
  try {
    const { status_filter, category_filter, search_query, sort_by = 'date_added', limit = 50, offset = 0 } = req.query;
    let query = 'SELECT * FROM products WHERE supplier_id = $1';
    const params = [req.user.supplier_id];
    let paramCount = 2;

    if (status_filter) {
      query += ` AND status = $${paramCount}`;
      params.push(asString(status_filter));
      paramCount++;
    }

    if (category_filter) {
      query += ` AND category_id = $${paramCount}`;
      params.push(asString(category_filter));
      paramCount++;
    }

    if (search_query) {
      query += ` AND (product_name ILIKE $${paramCount} OR sku ILIKE $${paramCount})`;
      params.push(`%${search_query}%`);
      paramCount++;
    }

    const orderByMap: Record<string, string> = {
      date_added: 'creation_date',
      sales: 'sales_count',
      views: 'views_count',
      name: 'product_name'
    };
    
    const sortByStr = asString(sort_by) || 'date_added';
    query += ` ORDER BY ${orderByMap[sortByStr] || 'creation_date'} DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(String(limit));
    params.push(String(offset));

    const result = await pool.query(query, params);

    const countQuery = query.substring(0, query.indexOf('ORDER BY')).replace(/SELECT \* FROM/, 'SELECT COUNT(*) as total FROM');
    const countResult = await pool.query(countQuery, params.slice(0, -2));

    res.json({
      products: result.rows,
      total: parseInt(countResult.rows[0].total)
    });
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.post('/api/suppliers/me/products', authenticateToken, requireSupplier, async (req: AuthRequest, res: Response) => {
  try {
    const { category_id, sku, product_name, description, key_features, specifications, price_per_unit, unit_of_measure, bulk_pricing, stock_quantity, low_stock_threshold, images, primary_image_url, brand, minimum_order_quantity, handling_time_days } = req.body;

    if (!category_id || !sku || !product_name || !price_per_unit || !unit_of_measure) {
      return res.status(400).json({ error: 'ValidationError', message: 'Missing required fields' });
    }

    const product_id = uuidv4();
    const now = new Date().toISOString();

    const result = await pool.query(
      `INSERT INTO products (
        product_id, supplier_id, category_id, sku, product_name, description, key_features, specifications,
        price_per_unit, unit_of_measure, bulk_pricing, stock_quantity, low_stock_threshold,
        last_updated_timestamp, images, primary_image_url, status, is_featured, brand,
        minimum_order_quantity, handling_time_days, views_count, sales_count, creation_date,
        searchable, customer_type_availability, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28)
      RETURNING *`,
      [
        product_id, req.user.supplier_id, category_id, sku, product_name, description, JSON.stringify(key_features),
        JSON.stringify(specifications), price_per_unit, unit_of_measure, JSON.stringify(bulk_pricing),
        stock_quantity || 0, low_stock_threshold || 10, now, JSON.stringify(images), primary_image_url,
        'active', false, brand, minimum_order_quantity || 1, handling_time_days || 1, 0, 0, now,
        true, 'all', now, now
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.get('/api/suppliers/:supplier_id/products', async (req, res) => {
  try {
    const { status, category, limit = 50, offset = 0 } = req.query;
    let query = 'SELECT * FROM products WHERE supplier_id = $1';
    const params = [req.params.supplier_id];
    let paramCount = 2;

    if (status) {
      query += ` AND status = $${paramCount}`;
      params.push(asString(status));
      paramCount++;
    }

    if (category) {
      query += ` AND category_id = $${paramCount}`;
      params.push(asString(category));
      paramCount++;
    }

    query += ` ORDER BY creation_date DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(String(limit));
    params.push(String(offset));

    const result = await pool.query(query, params);

    const countQuery = query.substring(0, query.indexOf('ORDER BY')).replace(/SELECT \* FROM/, 'SELECT COUNT(*) as total FROM');
    const countResult = await pool.query(countQuery, params.slice(0, -2));

    res.json({
      products: result.rows,
      total: parseInt(countResult.rows[0].total)
    });
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.get('/api/cart', authenticateToken, requireCustomer, async (req: AuthRequest, res: Response) => {
  try {
    const cartResult = await pool.query(
      'SELECT * FROM carts WHERE customer_id = $1 AND status = \'active\' ORDER BY created_date DESC LIMIT 1',
      [req.user.customer_id]
    );

    if (cartResult.rows.length === 0) {
      return res.json({ cart: null, items: [], subtotal: 0, total_items: 0 });
    }

    const cart = cartResult.rows[0];
    const itemsResult = await pool.query(
      `SELECT ci.*, p.product_name, p.primary_image_url, p.stock_quantity, p.status as product_status, s.business_name
       FROM cart_items ci
       INNER JOIN products p ON ci.product_id = p.product_id
       INNER JOIN suppliers s ON ci.supplier_id = s.supplier_id
       WHERE ci.cart_id = $1`,
      [cart.cart_id]
    );

    const subtotal = itemsResult.rows.reduce((sum, item) => sum + (parseFloat(item.quantity) * parseFloat(item.price_per_unit)), 0);

    res.json({
      cart,
      items: itemsResult.rows,
      subtotal,
      total_items: itemsResult.rows.reduce((sum, item) => sum + parseInt(item.quantity, 10), 0)
    });
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.delete('/api/cart', authenticateToken, requireCustomer, async (req: AuthRequest, res: Response) => {
  try {
    const cartResult = await pool.query('SELECT cart_id FROM carts WHERE customer_id = $1 AND status = \'active\'', [req.user.customer_id]);
    if (cartResult.rows.length > 0) {
      await pool.query('DELETE FROM cart_items WHERE cart_id = $1', [cartResult.rows[0].cart_id]);
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.post('/api/cart/items', authenticateToken, requireCustomer, async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { product_id, quantity } = req.body;

    if (!product_id || !quantity || quantity < 1) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'ValidationError', message: 'Invalid product_id or quantity' });
    }

    const productResult = await client.query(
      'SELECT product_id, supplier_id, product_name, price_per_unit, stock_quantity, minimum_order_quantity, maximum_order_quantity, status FROM products WHERE product_id = $1 FOR UPDATE',
      [product_id]
    );

    if (productResult.rows.length === 0 || productResult.rows[0].status !== 'active') {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'ProductNotFound', message: 'Product not found or inactive' });
    }

    const product = productResult.rows[0];

    if (product.stock_quantity < quantity) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'InsufficientStock', message: 'Insufficient stock', details: { available_stock: product.stock_quantity, requested_quantity: quantity } });
    }

    let cartResult = await client.query(
      'SELECT cart_id FROM carts WHERE customer_id = $1 AND status = \'active\' LIMIT 1',
      [req.user.customer_id]
    );

    let cart_id;
    const now = new Date().toISOString();

    if (cartResult.rows.length === 0) {
      cart_id = uuidv4();
      await client.query(
        'INSERT INTO carts (cart_id, customer_id, created_date, last_modified_date, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [cart_id, req.user.customer_id, now, now, 'active', now, now]
      );
    } else {
      cart_id = cartResult.rows[0].cart_id;
    }

    const existingItemResult = await client.query(
      'SELECT cart_item_id, quantity FROM cart_items WHERE cart_id = $1 AND product_id = $2',
      [cart_id, product_id]
    );

    let cartItem;
    if (existingItemResult.rows.length > 0) {
      const newQuantity = existingItemResult.rows[0].quantity + quantity;
      const updateResult = await client.query(
        'UPDATE cart_items SET quantity = $1, updated_at = $2 WHERE cart_item_id = $3 RETURNING *',
        [newQuantity, now, existingItemResult.rows[0].cart_item_id]
      );
      cartItem = updateResult.rows[0];
    } else {
      const cart_item_id = uuidv4();
      const insertResult = await client.query(
        'INSERT INTO cart_items (cart_item_id, cart_id, product_id, supplier_id, quantity, price_per_unit, added_date, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
        [cart_item_id, cart_id, product_id, product.supplier_id, quantity, product.price_per_unit, now, now, now]
      );
      cartItem = insertResult.rows[0];
    }

    await client.query('UPDATE carts SET last_modified_date = $1, updated_at = $2 WHERE cart_id = $3', [now, now, cart_id]);

    await client.query('COMMIT');

    res.status(201).json(cartItem);
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  } finally {
    client.release();
  }
});

app.patch('/api/cart/items/:cart_item_id', authenticateToken, requireCustomer, async (req: AuthRequest, res: Response) => {
  try {
    const { quantity } = req.body;

    if (!quantity || quantity < 1) {
      return res.status(400).json({ error: 'ValidationError', message: 'Valid quantity required' });
    }

    const now = new Date().toISOString();
    const result = await pool.query(
      'UPDATE cart_items SET quantity = $1, updated_at = $2 WHERE cart_item_id = $3 RETURNING *',
      [quantity, now, req.params.cart_item_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'CartItemNotFound', message: 'Cart item not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.delete('/api/cart/items/:cart_item_id', authenticateToken, requireCustomer, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query('DELETE FROM cart_items WHERE cart_item_id = $1 RETURNING cart_item_id', [req.params.cart_item_id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'CartItemNotFound', message: 'Cart item not found' });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.post('/api/cart/save', authenticateToken, requireCustomer, async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { project_name, description } = req.body;

    if (!project_name) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'ValidationError', message: 'Project name required' });
    }

    const cartResult = await client.query(
      'SELECT cart_id FROM carts WHERE customer_id = $1 AND status = \'active\' LIMIT 1',
      [req.user.customer_id]
    );

    if (cartResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'CartNotFound', message: 'No active cart found' });
    }

    const cart_id = cartResult.rows[0].cart_id;
    const project_id = uuidv4();
    const now = new Date().toISOString();

    const itemsResult = await client.query('SELECT * FROM cart_items WHERE cart_id = $1', [cart_id]);
    const total_value = itemsResult.rows.reduce((sum, item) => sum + (item.quantity * item.price_per_unit), 0);

    await client.query(
      'INSERT INTO projects (project_id, customer_id, project_name, description, total_value, item_count, created_date, last_updated_date, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
      [project_id, req.user.customer_id, project_name, description, total_value, itemsResult.rows.length, now, now, now, now]
    );

    for (const item of itemsResult.rows) {
      const project_item_id = uuidv4();
      await client.query(
        'INSERT INTO project_items (project_item_id, project_id, product_id, quantity, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6)',
        [project_item_id, project_id, item.product_id, item.quantity, now, now]
      );
    }

    await client.query('COMMIT');

    const projectResult = await client.query('SELECT * FROM projects WHERE project_id = $1', [project_id]);
    res.status(201).json(projectResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  } finally {
    client.release();
  }
});

app.get('/api/wishlist', authenticateToken, requireCustomer, async (req: AuthRequest, res: Response) => {
  try {
    const { sort_by = 'date_added', filter_by } = req.query;
    let query = `
      SELECT w.*, p.product_name, p.price_per_unit, p.stock_quantity, p.primary_image_url, p.status,
             s.business_name, s.rating_average
      FROM wishlist_items w
      INNER JOIN products p ON w.product_id = p.product_id
      INNER JOIN suppliers s ON p.supplier_id = s.supplier_id
      WHERE w.customer_id = $1
    `;
    const params = [req.user.customer_id];

    if (filter_by === 'in_stock_only') {
      query += ' AND p.stock_quantity > 0';
    } else if (filter_by === 'price_drops') {
      query += ' AND p.price_per_unit < w.price_when_saved';
    }

    query += ` ORDER BY ${sort_by === 'price' ? 'p.price_per_unit ASC' : 'w.added_date DESC'}`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.post('/api/wishlist', authenticateToken, requireCustomer, async (req: AuthRequest, res: Response) => {
  try {
    const { product_id, price_drop_alert_enabled, back_in_stock_alert_enabled } = req.body;

    if (!product_id) {
      return res.status(400).json({ error: 'ValidationError', message: 'product_id required' });
    }

    const productResult = await pool.query('SELECT price_per_unit FROM products WHERE product_id = $1', [product_id]);
    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: 'ProductNotFound', message: 'Product not found' });
    }

    const wishlist_item_id = uuidv4();
    const now = new Date().toISOString();

    const result = await pool.query(
      'INSERT INTO wishlist_items (wishlist_item_id, customer_id, product_id, added_date, price_when_saved, price_drop_alert_enabled, back_in_stock_alert_enabled, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
      [wishlist_item_id, req.user.customer_id, product_id, now, productResult.rows[0].price_per_unit, price_drop_alert_enabled !== false, back_in_stock_alert_enabled !== false, now, now]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.patch('/api/wishlist/:wishlist_item_id', authenticateToken, requireCustomer, async (req: AuthRequest, res: Response) => {
  try {
    const { price_drop_alert_enabled, back_in_stock_alert_enabled } = req.body;
    const now = new Date().toISOString();

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (price_drop_alert_enabled !== undefined) { updates.push(`price_drop_alert_enabled = $${paramCount++}`); values.push(price_drop_alert_enabled); }
    if (back_in_stock_alert_enabled !== undefined) { updates.push(`back_in_stock_alert_enabled = $${paramCount++}`); values.push(back_in_stock_alert_enabled); }

    updates.push(`updated_at = $${paramCount++}`);
    values.push(now);
    values.push(req.params.wishlist_item_id);
    values.push(req.user.customer_id);

    const result = await pool.query(
      `UPDATE wishlist_items SET ${updates.join(', ')} WHERE wishlist_item_id = $${paramCount} AND customer_id = $${paramCount + 1} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'WishlistItemNotFound', message: 'Wishlist item not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.delete('/api/wishlist/:wishlist_item_id', authenticateToken, requireCustomer, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query('DELETE FROM wishlist_items WHERE wishlist_item_id = $1 AND customer_id = $2 RETURNING wishlist_item_id', [req.params.wishlist_item_id, req.user.customer_id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'WishlistItemNotFound', message: 'Wishlist item not found' });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.get('/api/projects', authenticateToken, requireCustomer, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM projects WHERE customer_id = $1 ORDER BY last_updated_date DESC', [req.user.customer_id]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.post('/api/projects', authenticateToken, requireCustomer, async (req: AuthRequest, res: Response) => {
  try {
    const { project_name, description } = req.body;

    if (!project_name) {
      return res.status(400).json({ error: 'ValidationError', message: 'Project name required' });
    }

    const project_id = uuidv4();
    const now = new Date().toISOString();

    const result = await pool.query(
      'INSERT INTO projects (project_id, customer_id, project_name, description, total_value, item_count, created_date, last_updated_date, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
      [project_id, req.user.customer_id, project_name, description, 0, 0, now, now, now, now]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.get('/api/projects/:project_id', authenticateToken, requireCustomer, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM projects WHERE project_id = $1 AND customer_id = $2', [req.params.project_id, req.user.customer_id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'ProjectNotFound', message: 'Project not found' });
    }

    const itemsResult = await pool.query(
      `SELECT pi.*, p.product_name, p.price_per_unit, p.stock_quantity, p.primary_image_url
       FROM project_items pi
       INNER JOIN products p ON pi.product_id = p.product_id
       WHERE pi.project_id = $1`,
      [req.params.project_id]
    );

    res.json({
      project: result.rows[0],
      items: itemsResult.rows
    });
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.patch('/api/projects/:project_id', authenticateToken, requireCustomer, async (req: AuthRequest, res: Response) => {
  try {
    const { project_name, description } = req.body;
    const now = new Date().toISOString();

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (project_name !== undefined) { updates.push(`project_name = $${paramCount++}`); values.push(project_name); }
    if (description !== undefined) { updates.push(`description = $${paramCount++}`); values.push(description); }

    updates.push(`last_updated_date = $${paramCount++}`);
    values.push(now);
    updates.push(`updated_at = $${paramCount++}`);
    values.push(now);
    values.push(req.params.project_id);
    values.push(req.user.customer_id);

    const result = await pool.query(
      `UPDATE projects SET ${updates.join(', ')} WHERE project_id = $${paramCount} AND customer_id = $${paramCount + 1} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'ProjectNotFound', message: 'Project not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.delete('/api/projects/:project_id', authenticateToken, requireCustomer, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query('DELETE FROM projects WHERE project_id = $1 AND customer_id = $2 RETURNING project_id', [req.params.project_id, req.user.customer_id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'ProjectNotFound', message: 'Project not found' });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.post('/api/projects/:project_id/load-to-cart', authenticateToken, requireCustomer, async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const itemsResult = await client.query(
      'SELECT * FROM project_items WHERE project_id = $1',
      [req.params.project_id]
    );

    if (itemsResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'ProjectEmpty', message: 'Project has no items' });
    }

    let cartResult = await client.query(
      'SELECT cart_id FROM carts WHERE customer_id = $1 AND status = \'active\' LIMIT 1',
      [req.user.customer_id]
    );

    let cart_id;
    const now = new Date().toISOString();

    if (cartResult.rows.length === 0) {
      cart_id = uuidv4();
      await client.query(
        'INSERT INTO carts (cart_id, customer_id, created_date, last_modified_date, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [cart_id, req.user.customer_id, now, now, 'active', now, now]
      );
    } else {
      cart_id = cartResult.rows[0].cart_id;
    }

    let added = 0;
    const unavailable = [];

    for (const item of itemsResult.rows) {
      const productResult = await client.query(
        'SELECT product_id, supplier_id, price_per_unit, stock_quantity, status FROM products WHERE product_id = $1',
        [item.product_id]
      );

      if (productResult.rows.length === 0 || productResult.rows[0].status !== 'active' || productResult.rows[0].stock_quantity < item.quantity) {
        unavailable.push(item.product_id);
        continue;
      }

      const product = productResult.rows[0];
      const cart_item_id = uuidv4();
      await client.query(
        'INSERT INTO cart_items (cart_item_id, cart_id, product_id, supplier_id, quantity, price_per_unit, added_date, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
        [cart_item_id, cart_id, item.product_id, product.supplier_id, item.quantity, product.price_per_unit, now, now, now]
      );
      added++;
    }

    await client.query('COMMIT');

    res.json({
      message: 'Project loaded to cart',
      added_items: added,
      unavailable_items: unavailable
    });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  } finally {
    client.release();
  }
});

app.get('/api/orders', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { status_filter, date_range, supplier_id, sort_by = 'order_date', sort_order = 'desc' } = req.query;
    
    // Coerce query params
    const limit = Math.min(asNumber(req.query.limit, 50) || 50, 100);
    const offset = asNumber(req.query.offset, 0) || 0;

    let query = '';
    let countQuery = '';
    let params: any[] = [];
    let paramCount = 1;

    // Different queries for customers vs suppliers
    if (req.user?.user_type === 'customer') {
      query = 'SELECT * FROM orders WHERE customer_id = $1';
      countQuery = 'SELECT COUNT(*) as total FROM orders WHERE customer_id = $1';
      params = [req.user.customer_id];
      paramCount = 2;

      if (status_filter) {
        const statusClause = ` AND status = $${paramCount}`;
        query += statusClause;
        countQuery += statusClause;
        params.push(asString(status_filter));
        paramCount++;
      }
    } else if (req.user?.user_type === 'supplier') {
      // For suppliers, get orders that contain their products
      query = `SELECT DISTINCT o.* FROM orders o
               INNER JOIN order_items oi ON o.order_id = oi.order_id
               WHERE oi.supplier_id = $1`;
      countQuery = `SELECT COUNT(DISTINCT o.order_id) as total FROM orders o
                    INNER JOIN order_items oi ON o.order_id = oi.order_id
                    WHERE oi.supplier_id = $1`;
      params = [req.user.supplier_id];
      paramCount = 2;

      if (status_filter) {
        const statusClause = ` AND o.status = $${paramCount}`;
        query += statusClause;
        countQuery += statusClause;
        params.push(asString(status_filter));
        paramCount++;
      }
    } else {
      return res.status(403).json({ error: 'Forbidden', message: 'Customer or Supplier access required' });
    }

    // Add ORDER BY with correct table reference
    const tablePrefix = req.user?.user_type === 'supplier' ? 'o.' : '';
    query += ` ORDER BY ${tablePrefix}${sort_by === 'total_amount' ? 'total_amount' : 'order_date'} ${sort_order === 'asc' ? 'ASC' : 'DESC'}`;
    query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(String(limit));
    params.push(String(offset));

    const result = await pool.query(query, params);
    const countResult = await pool.query(countQuery, params.slice(0, -2));

    res.json({
      orders: result.rows,
      total: parseInt(countResult.rows[0].total)
    });
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.post('/api/orders', authenticateToken, requireCustomer, async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { delivery_address_id, payment_method, promo_code_used, customer_notes, delivery_windows } = req.body;

    if (!delivery_address_id || !payment_method) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'ValidationError', message: 'Missing required fields' });
    }

    const cartResult = await client.query(
      'SELECT cart_id FROM carts WHERE customer_id = $1 AND status = \'active\' LIMIT 1',
      [req.user.customer_id]
    );

    if (cartResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'CartEmpty', message: 'No active cart found' });
    }

    const cart_id = cartResult.rows[0].cart_id;
    const itemsResult = await client.query(
      `SELECT ci.*, p.product_name, p.sku, p.stock_quantity, p.status
       FROM cart_items ci
       INNER JOIN products p ON ci.product_id = p.product_id
       WHERE ci.cart_id = $1
       FOR UPDATE OF p`,
      [cart_id]
    );

    if (itemsResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'CartEmpty', message: 'Cart is empty' });
    }

    for (const item of itemsResult.rows) {
      if (item.status !== 'active' || item.stock_quantity < item.quantity) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'StockValidationError', message: 'Some items are no longer available', details: { product_id: item.product_id, available: item.stock_quantity, requested: item.quantity } });
      }
    }

    const subtotal = itemsResult.rows.reduce((sum, item) => sum + (item.quantity * item.price_per_unit), 0);
    const delivery_fee_total = 50;
    const tax_amount = subtotal * 0.08;
    const discount_amount = 0;
    const total_amount = subtotal + delivery_fee_total + tax_amount - discount_amount;

    const order_id = uuidv4();
    const order_number = `ORD-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;
    const now = new Date().toISOString();

    /*
    @@need:external-api: Payment gateway API (Stripe/PayPal) to process payment authorization.
    Should accept amount, currency, payment_method_token and return payment transaction ID.
    Mock response returns simulated successful transaction.
    */
    const payment_transaction_id = `txn_mock_${Date.now()}`;

    await client.query(
      'INSERT INTO orders (order_id, customer_id, order_number, order_date, status, subtotal_amount, delivery_fee_total, tax_amount, discount_amount, total_amount, delivery_address_id, payment_method, payment_status, payment_transaction_id, promo_code_used, customer_notes, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)',
      [order_id, req.user.customer_id, order_number, now, 'pending', subtotal, delivery_fee_total, tax_amount, discount_amount, total_amount, delivery_address_id, payment_method, 'paid', payment_transaction_id, promo_code_used, customer_notes, now, now]
    );

    for (const item of itemsResult.rows) {
      const order_item_id = uuidv4();
      await client.query(
        'INSERT INTO order_items (order_item_id, order_id, product_id, supplier_id, product_name, sku, quantity, price_per_unit, line_total, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
        [order_item_id, order_id, item.product_id, item.supplier_id, item.product_name, item.sku, item.quantity, item.price_per_unit, item.quantity * item.price_per_unit, now, now]
      );

      await client.query(
        'UPDATE products SET stock_quantity = stock_quantity - $1, last_updated_timestamp = $2, updated_at = $3 WHERE product_id = $4',
        [item.quantity, now, now, item.product_id]
      );
    }

    const suppliers = [...new Set(itemsResult.rows.map(item => item.supplier_id))];
    for (const supplier_id of suppliers) {
      const delivery_id = uuidv4();
      const deliveryWindow = delivery_windows?.find(dw => dw.supplier_id === supplier_id) || {};
      await client.query(
        'INSERT INTO deliveries (delivery_id, order_id, supplier_id, delivery_window_start, delivery_window_end, delivery_method, delivery_fee, delivery_status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
        [delivery_id, order_id, supplier_id, deliveryWindow.delivery_window_start || new Date(Date.now() + 86400000 * 2).toISOString(), deliveryWindow.delivery_window_end || new Date(Date.now() + 86400000 * 2 + 14400000).toISOString(), deliveryWindow.delivery_method || 'standard_delivery', delivery_fee_total / suppliers.length, 'scheduled', now, now]
      );
    }

    const timeline_id = uuidv4();
    await client.query(
      'INSERT INTO order_timeline (timeline_id, order_id, milestone, status, timestamp, description, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [timeline_id, order_id, 'order_placed', 'completed', now, 'Order placed successfully', now]
    );

    const notif_id = uuidv4();
    await client.query(
      'INSERT INTO notifications (notification_id, user_id, notification_type, title, message, related_entity_type, related_entity_id, action_url, created_date, is_read, delivered_via, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)',
      [notif_id, req.user.user_id, 'order_update', 'Order Placed', `Your order ${order_number} has been placed`, 'order', order_id, `/orders/${order_id}`, now, false, JSON.stringify(['in_app', 'email']), now, now]
    );

    await client.query('UPDATE carts SET status = $1, updated_at = $2 WHERE cart_id = $3', ['converted', now, cart_id]);

    await client.query('COMMIT');

    const orderResult = await client.query('SELECT * FROM orders WHERE order_id = $1', [order_id]);

    res.status(201).json(orderResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  } finally {
    client.release();
  }
});

app.get('/api/orders/:order_id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const orderResult = await pool.query('SELECT * FROM orders WHERE order_id = $1', [req.params.order_id]);
    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'OrderNotFound', message: 'Order not found' });
    }

    const order = orderResult.rows[0];

    if (req.user.user_type === 'customer' && order.customer_id !== req.user.customer_id) {
      return res.status(403).json({ error: 'Forbidden', message: 'Access denied' });
    }

    const itemsResult = await pool.query('SELECT * FROM order_items WHERE order_id = $1', [req.params.order_id]);
    const deliveryResult = await pool.query('SELECT * FROM deliveries WHERE order_id = $1', [req.params.order_id]);
    const timelineResult = await pool.query('SELECT milestone, status, timestamp, description FROM order_timeline WHERE order_id = $1 ORDER BY timestamp ASC', [req.params.order_id]);

    res.json({
      order,
      items: itemsResult.rows,
      delivery: deliveryResult.rows[0] || null,
      timeline: timelineResult.rows
    });
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.patch('/api/orders/:order_id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { status, payment_status } = req.body;
    const now = new Date().toISOString();

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (status !== undefined) { updates.push(`status = $${paramCount++}`); values.push(status); }
    if (payment_status !== undefined) { updates.push(`payment_status = $${paramCount++}`); values.push(payment_status); }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'ValidationError', message: 'No fields to update' });
    }

    updates.push(`updated_at = $${paramCount++}`);
    values.push(now);
    values.push(req.params.order_id);

    const result = await pool.query(
      `UPDATE orders SET ${updates.join(', ')} WHERE order_id = $${paramCount} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'OrderNotFound', message: 'Order not found' });
    }

    if (status) {
      const timeline_id = uuidv4();
      await pool.query(
        'INSERT INTO order_timeline (timeline_id, order_id, milestone, status, timestamp, description, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [timeline_id, req.params.order_id, status, 'completed', now, `Order status updated to ${status}`, now]
      );

      io.to(`order:${req.params.order_id}`).emit('order_status_changed', {
        order_id: req.params.order_id,
        order_number: result.rows[0].order_number,
        new_status: status,
        timestamp: now
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.post('/api/orders/:order_id/cancel', authenticateToken, requireCustomer, async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const orderResult = await client.query('SELECT * FROM orders WHERE order_id = $1 AND customer_id = $2', [req.params.order_id, req.user.customer_id]);
    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'OrderNotFound', message: 'Order not found' });
    }

    const order = orderResult.rows[0];
    if (!['pending', 'processing'].includes(order.status)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'CannotCancel', message: 'Order cannot be cancelled at this stage' });
    }

    const now = new Date().toISOString();
    await client.query('UPDATE orders SET status = $1, updated_at = $2 WHERE order_id = $3', ['cancelled', now, req.params.order_id]);

    const timeline_id = uuidv4();
    await client.query(
      'INSERT INTO order_timeline (timeline_id, order_id, milestone, status, timestamp, description, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [timeline_id, req.params.order_id, 'cancelled', 'completed', now, 'Order cancelled by customer', now]
    );

    await client.query('COMMIT');

    res.json({ message: 'Order cancelled successfully', refund_status: 'processing' });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  } finally {
    client.release();
  }
});

app.get('/api/orders/:order_id/timeline', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT milestone, status, timestamp, description FROM order_timeline WHERE order_id = $1 ORDER BY timestamp ASC',
      [req.params.order_id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.post('/api/orders/:order_id/reorder', authenticateToken, requireCustomer, async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const itemsResult = await client.query(
      'SELECT product_id, supplier_id, quantity FROM order_items WHERE order_id = $1',
      [req.params.order_id]
    );

    if (itemsResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'OrderNotFound', message: 'Order not found' });
    }

    let cartResult = await client.query(
      'SELECT cart_id FROM carts WHERE customer_id = $1 AND status = \'active\' LIMIT 1',
      [req.user.customer_id]
    );

    let cart_id;
    const now = new Date().toISOString();

    if (cartResult.rows.length === 0) {
      cart_id = uuidv4();
      await client.query(
        'INSERT INTO carts (cart_id, customer_id, created_date, last_modified_date, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [cart_id, req.user.customer_id, now, now, 'active', now, now]
      );
    } else {
      cart_id = cartResult.rows[0].cart_id;
    }

    let added = 0;
    const unavailable = [];

    for (const item of itemsResult.rows) {
      const productResult = await client.query(
        'SELECT product_id, supplier_id, price_per_unit, stock_quantity, status FROM products WHERE product_id = $1',
        [item.product_id]
      );

      if (productResult.rows.length === 0 || productResult.rows[0].status !== 'active' || productResult.rows[0].stock_quantity < item.quantity) {
        unavailable.push({ product_id: item.product_id });
        continue;
      }

      const product = productResult.rows[0];
      const cart_item_id = uuidv4();
      await client.query(
        'INSERT INTO cart_items (cart_item_id, cart_id, product_id, supplier_id, quantity, price_per_unit, added_date, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
        [cart_item_id, cart_id, item.product_id, product.supplier_id, item.quantity, product.price_per_unit, now, now, now]
      );
      added++;
    }

    await client.query('COMMIT');

    res.json({
      message: 'Items added to cart',
      added_items: added,
      unavailable_items: unavailable
    });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  } finally {
    client.release();
  }
});

app.get('/api/deliveries/:delivery_id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM deliveries WHERE delivery_id = $1', [req.params.delivery_id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'DeliveryNotFound', message: 'Delivery not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.patch('/api/deliveries/:delivery_id', authenticateToken, async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { delivery_status, current_latitude, current_longitude, estimated_arrival_time, delivery_proof_photo_url } = req.body;
    const now = new Date().toISOString();

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (delivery_status !== undefined) { updates.push(`delivery_status = $${paramCount++}`); values.push(delivery_status); }
    if (current_latitude !== undefined) { updates.push(`current_latitude = $${paramCount++}`); values.push(current_latitude); }
    if (current_longitude !== undefined) { updates.push(`current_longitude = $${paramCount++}`); values.push(current_longitude); }
    if (estimated_arrival_time !== undefined) { updates.push(`estimated_arrival_time = $${paramCount++}`); values.push(estimated_arrival_time); }
    if (delivery_proof_photo_url !== undefined) { updates.push(`delivery_proof_photo_url = $${paramCount++}`); values.push(delivery_proof_photo_url); }

    if (delivery_status === 'delivered') {
      updates.push(`actual_delivery_time = $${paramCount++}`);
      values.push(now);
    }

    updates.push(`updated_at = $${paramCount++}`);
    values.push(now);
    values.push(req.params.delivery_id);

    const result = await client.query(
      `UPDATE deliveries SET ${updates.join(', ')} WHERE delivery_id = $${paramCount} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'DeliveryNotFound', message: 'Delivery not found' });
    }

    const delivery = result.rows[0];

    if (current_latitude !== undefined && current_longitude !== undefined) {
      io.to(`delivery:${req.params.delivery_id}`).emit('delivery_location_updated', {
        delivery_id: req.params.delivery_id,
        current_latitude,
        current_longitude,
        estimated_arrival_time: delivery.estimated_arrival_time,
        timestamp: now
      });
    }

    if (delivery_status) {
      const timeline_id = uuidv4();
      await client.query(
        'INSERT INTO order_timeline (timeline_id, order_id, milestone, status, timestamp, description, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [timeline_id, delivery.order_id, delivery_status, 'completed', now, `Delivery status: ${delivery_status}`, now]
      );
    }

    await client.query('COMMIT');

    res.json(delivery);
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  } finally {
    client.release();
  }
});

app.post('/api/deliveries/:delivery_id/reschedule', authenticateToken, requireCustomer, async (req: AuthRequest, res: Response) => {
  try {
    const { delivery_window_start, delivery_window_end } = req.body;

    if (!delivery_window_start || !delivery_window_end) {
      return res.status(400).json({ error: 'ValidationError', message: 'Delivery window required' });
    }

    const now = new Date().toISOString();
    const result = await pool.query(
      'UPDATE deliveries SET delivery_window_start = $1, delivery_window_end = $2, updated_at = $3 WHERE delivery_id = $4 RETURNING *',
      [delivery_window_start, delivery_window_end, now, req.params.delivery_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'DeliveryNotFound', message: 'Delivery not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.get('/api/reviews', async (req, res) => {
  try {
    const { product_id, supplier_id, customer_id, min_rating, status = 'published', verified_purchase, sort_by = 'review_date', sort_order = 'desc' } = req.query;
    
    // Coerce query params
    const limit = Math.min(asNumber(req.query.limit, 50) || 50, 100);
    const offset = asNumber(req.query.offset, 0) || 0;

    let query = 'SELECT * FROM reviews WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (product_id) {
      query += ` AND product_id = $${paramCount}`;
      params.push(product_id);
      paramCount++;
    }

    if (supplier_id) {
      query += ` AND supplier_id = $${paramCount}`;
      params.push(supplier_id);
      paramCount++;
    }

    if (customer_id) {
      query += ` AND customer_id = $${paramCount}`;
      params.push(customer_id);
      paramCount++;
    }

    if (min_rating) {
      query += ` AND rating_overall >= $${paramCount}`;
      params.push(asNumber(min_rating));
      paramCount++;
    }

    if (status) {
      query += ` AND status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (verified_purchase !== undefined) {
      query += ` AND verified_purchase = $${paramCount}`;
      params.push(verified_purchase === 'true');
      paramCount++;
    }

    const orderByMap: Record<string, string> = {
      review_date: 'review_date',
      rating_overall: 'rating_overall',
      helpful_votes: 'helpful_votes'
    };
    
    const sortByStr = asString(sort_by) || 'review_date';
    query += ` ORDER BY ${orderByMap[sortByStr] || 'review_date'} ${sort_order === 'asc' ? 'ASC' : 'DESC'}`;
    query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit);
    params.push(offset);

    const result = await pool.query(query, params);

    const avgQuery = status ? `SELECT AVG(rating_overall) as average_rating FROM reviews WHERE status = '${status}'` : 'SELECT AVG(rating_overall) as average_rating FROM reviews';
    const avgResult = await pool.query(avgQuery);

    const countQuery = query.substring(0, query.indexOf('ORDER BY')).replace(/SELECT \* FROM/, 'SELECT COUNT(*) as total FROM');
    const countResult = await pool.query(countQuery, params.slice(0, -2));

    res.json({
      reviews: result.rows,
      total: parseInt(countResult.rows[0].total),
      average_rating: parseFloat(avgResult.rows[0].average_rating) || 0
    });
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.post('/api/reviews', authenticateToken, requireCustomer, async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { order_id, supplier_id, product_id, rating_overall, rating_product, rating_service, rating_delivery, review_text, photos, would_buy_again, is_anonymous } = req.body;

    if (!order_id || !supplier_id || !rating_overall) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'ValidationError', message: 'Missing required fields' });
    }

    const orderResult = await client.query(
      'SELECT customer_id, status FROM orders WHERE order_id = $1',
      [order_id]
    );

    if (orderResult.rows.length === 0 || orderResult.rows[0].customer_id !== req.user.customer_id) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Forbidden', message: 'Cannot review this order' });
    }

    if (orderResult.rows[0].status !== 'delivered') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'OrderNotDelivered', message: 'Order must be delivered to review' });
    }

    const review_id = uuidv4();
    const now = new Date().toISOString();

    const result = await client.query(
      'INSERT INTO reviews (review_id, order_id, customer_id, supplier_id, product_id, rating_overall, rating_product, rating_service, rating_delivery, review_text, photos, helpful_votes, verified_purchase, would_buy_again, is_anonymous, review_date, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19) RETURNING *',
      [review_id, order_id, req.user.customer_id, supplier_id, product_id, rating_overall, rating_product, rating_service, rating_delivery, review_text, JSON.stringify(photos), 0, true, would_buy_again, is_anonymous || false, now, 'published', now, now]
    );

    await client.query(
      'UPDATE suppliers SET total_reviews = total_reviews + 1, rating_average = (SELECT AVG(rating_overall) FROM reviews WHERE supplier_id = $1 AND status = \'published\'), updated_at = $2 WHERE supplier_id = $1',
      [supplier_id, now]
    );

    await client.query('COMMIT');

    res.status(201).json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  } finally {
    client.release();
  }
});

app.get('/api/reviews/:review_id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM reviews WHERE review_id = $1', [req.params.review_id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'ReviewNotFound', message: 'Review not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.patch('/api/reviews/:review_id', authenticateToken, requireCustomer, async (req: AuthRequest, res: Response) => {
  try {
    const { review_text, photos } = req.body;
    const now = new Date().toISOString();

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (review_text !== undefined) { updates.push(`review_text = $${paramCount++}`); values.push(review_text); }
    if (photos !== undefined) { updates.push(`photos = $${paramCount++}`); values.push(JSON.stringify(photos)); }

    updates.push(`updated_at = $${paramCount++}`);
    values.push(now);
    values.push(req.params.review_id);
    values.push(req.user.customer_id);

    const result = await pool.query(
      `UPDATE reviews SET ${updates.join(', ')} WHERE review_id = $${paramCount} AND customer_id = $${paramCount + 1} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'ReviewNotFound', message: 'Review not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.delete('/api/reviews/:review_id', authenticateToken, requireCustomer, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query('DELETE FROM reviews WHERE review_id = $1 AND customer_id = $2 RETURNING review_id', [req.params.review_id, req.user.customer_id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'ReviewNotFound', message: 'Review not found' });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.post('/api/reviews/:review_id/helpful', authenticateToken, async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { is_helpful } = req.body;
    const vote_id = uuidv4();
    const now = new Date().toISOString();

    const existingVote = await client.query(
      'SELECT vote_id FROM review_votes WHERE review_id = $1 AND user_id = $2',
      [req.params.review_id, req.user.user_id]
    );

    if (existingVote.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'AlreadyVoted', message: 'You have already voted on this review' });
    }

    await client.query(
      'INSERT INTO review_votes (vote_id, review_id, user_id, is_helpful, created_at) VALUES ($1, $2, $3, $4, $5)',
      [vote_id, req.params.review_id, req.user.user_id, is_helpful, now]
    );

    if (is_helpful) {
      await client.query('UPDATE reviews SET helpful_votes = helpful_votes + 1, updated_at = $1 WHERE review_id = $2', [now, req.params.review_id]);
    }

    const reviewResult = await client.query('SELECT helpful_votes FROM reviews WHERE review_id = $1', [req.params.review_id]);

    await client.query('COMMIT');

    res.json({
      message: 'Vote recorded',
      helpful_votes: reviewResult.rows[0]?.helpful_votes || 0
    });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  } finally {
    client.release();
  }
});

app.post('/api/reviews/:review_id/response', authenticateToken, requireSupplier, async (req: AuthRequest, res: Response) => {
  try {
    const { supplier_response } = req.body;

    if (!supplier_response) {
      return res.status(400).json({ error: 'ValidationError', message: 'Response text required' });
    }

    const now = new Date().toISOString();
    const result = await pool.query(
      'UPDATE reviews SET supplier_response = $1, supplier_response_date = $2, updated_at = $3 WHERE review_id = $4 AND supplier_id = $5 RETURNING *',
      [supplier_response, now, now, req.params.review_id, req.user.supplier_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'ReviewNotFound', message: 'Review not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.get('/api/notifications', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { notification_type, is_read } = req.query;
    
    // Coerce query params
    const limit = Math.min(asNumber(req.query.limit, 50) || 50, 100);
    const offset = asNumber(req.query.offset, 0) || 0;

    let query = 'SELECT * FROM notifications WHERE user_id = $1';
    const params = [req.user.user_id];
    let paramCount = 2;

    if (notification_type) {
      query += ` AND notification_type = $${paramCount}`;
      params.push(asString(notification_type));
      paramCount++;
    }

    if (is_read !== undefined) {
      query += ` AND is_read = $${paramCount}`;
      const isReadStr = asString(is_read);
      params.push(String(isReadStr === 'true'));
      paramCount++;
    }

    query += ` ORDER BY created_date DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(String(limit));
    params.push(String(offset));

    const result = await pool.query(query, params);

    const unreadResult = await pool.query(
      'SELECT COUNT(*) as unread_count FROM notifications WHERE user_id = $1 AND is_read = false',
      [req.user.user_id]
    );

    const countQuery = query.substring(0, query.indexOf('ORDER BY')).replace(/SELECT \* FROM/, 'SELECT COUNT(*) as total FROM');
    const countResult = await pool.query(countQuery, params.slice(0, -2));

    res.json({
      notifications: result.rows,
      total: parseInt(countResult.rows[0].total),
      unread_count: parseInt(unreadResult.rows[0].unread_count)
    });
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.patch('/api/notifications/:notification_id/read', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const now = new Date().toISOString();
    const result = await pool.query(
      'UPDATE notifications SET is_read = true, read_at = $1, updated_at = $2 WHERE notification_id = $3 AND user_id = $4 RETURNING *',
      [now, now, req.params.notification_id, req.user.user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'NotificationNotFound', message: 'Notification not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.post('/api/notifications/read-all', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const now = new Date().toISOString();
    const result = await pool.query(
      'UPDATE notifications SET is_read = true, read_at = $1, updated_at = $2 WHERE user_id = $3 AND is_read = false',
      [now, now, req.user.user_id]
    );

    res.json({
      message: 'All notifications marked as read',
      updated_count: result.rowCount
    });
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.get('/api/issues', authenticateToken, requireCustomer, async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.query;
    let query = 'SELECT * FROM issues WHERE customer_id = $1';
    const params = [req.user.customer_id];

    if (status) {
      query += ' AND status = $2';
      params.push(asString(status));
    }

    query += ' ORDER BY opened_date DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.post('/api/issues', authenticateToken, requireCustomer, async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { order_id, issue_type, affected_items, description, evidence_photos, desired_resolution } = req.body;

    if (!order_id || !issue_type || !description || !desired_resolution) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'ValidationError', message: 'Missing required fields' });
    }

    const orderResult = await client.query(
      'SELECT customer_id, order_id FROM orders WHERE order_id = $1',
      [order_id]
    );

    if (orderResult.rows.length === 0 || orderResult.rows[0].customer_id !== req.user.customer_id) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Forbidden', message: 'Cannot report issue for this order' });
    }

    const orderItemResult = await client.query(
      'SELECT DISTINCT supplier_id FROM order_items WHERE order_id = $1 LIMIT 1',
      [order_id]
    );

    const supplier_id = orderItemResult.rows[0]?.supplier_id || 'unknown';

    const issue_id = uuidv4();
    const now = new Date().toISOString();

    const result = await client.query(
      'INSERT INTO issues (issue_id, order_id, customer_id, supplier_id, issue_type, affected_items, status, description, evidence_photos, desired_resolution, opened_date, escalated_to_admin, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *',
      [issue_id, order_id, req.user.customer_id, supplier_id, issue_type, JSON.stringify(affected_items), 'open', description, JSON.stringify(evidence_photos), desired_resolution, now, false, now, now]
    );

    await client.query('COMMIT');

    res.status(201).json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  } finally {
    client.release();
  }
});

app.get('/api/issues/:issue_id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM issues WHERE issue_id = $1', [req.params.issue_id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'IssueNotFound', message: 'Issue not found' });
    }

    const issue = result.rows[0];

    if (req.user.user_type === 'customer' && issue.customer_id !== req.user.customer_id) {
      return res.status(403).json({ error: 'Forbidden', message: 'Access denied' });
    }

    const messagesResult = await pool.query(
      'SELECT * FROM issue_messages WHERE issue_id = $1 ORDER BY timestamp ASC',
      [req.params.issue_id]
    );

    res.json({
      issue,
      messages: messagesResult.rows
    });
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.post('/api/issues/:issue_id/messages', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { message_text, attachments } = req.body;

    if (!message_text) {
      return res.status(400).json({ error: 'ValidationError', message: 'Message text required' });
    }

    const message_id = uuidv4();
    const now = new Date().toISOString();
    const sender_type = req.user.user_type;

    const result = await pool.query(
      'INSERT INTO issue_messages (message_id, issue_id, sender_id, sender_type, message_text, attachments, timestamp, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [message_id, req.params.issue_id, req.user.user_id, sender_type, message_text, JSON.stringify(attachments), now, now]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.post('/api/issues/:issue_id/accept-resolution', authenticateToken, requireCustomer, async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const now = new Date().toISOString();
    const result = await client.query(
      'UPDATE issues SET resolution_accepted = true, resolution_accepted_date = $1, status = $2, resolved_date = $3, updated_at = $4 WHERE issue_id = $5 AND customer_id = $6 RETURNING *',
      [now, 'resolved', now, now, req.params.issue_id, req.user.customer_id]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'IssueNotFound', message: 'Issue not found' });
    }

    await client.query('COMMIT');

    res.json({
      message: 'Resolution accepted',
      issue: result.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  } finally {
    client.release();
  }
});

app.post('/api/issues/:issue_id/escalate', authenticateToken, requireCustomer, async (req: AuthRequest, res: Response) => {
  try {
    const now = new Date().toISOString();
    const result = await pool.query(
      'UPDATE issues SET escalated_to_admin = true, status = $1, updated_at = $2 WHERE issue_id = $3 AND customer_id = $4 RETURNING *',
      ['under_review', now, req.params.issue_id, req.user.customer_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'IssueNotFound', message: 'Issue not found' });
    }

    res.json({ message: 'Issue escalated to admin' });
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.get('/api/chat/conversations', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { conversation_type, status } = req.query;
    let query = 'SELECT * FROM chat_conversations WHERE ';
    const params = [];
    let paramCount = 1;

    if (req.user.user_type === 'customer') {
      query += `customer_id = $${paramCount}`;
      params.push(req.user.customer_id);
      paramCount++;
    } else if (req.user.user_type === 'supplier') {
      query += `supplier_id = $${paramCount}`;
      params.push(req.user.supplier_id);
      paramCount++;
    } else if (req.user.user_type === 'admin') {
      query += `admin_id = $${paramCount}`;
      params.push(req.user.admin_id);
      paramCount++;
    }

    if (conversation_type) {
      query += ` AND conversation_type = $${paramCount}`;
      params.push(conversation_type);
      paramCount++;
    }

    if (status) {
      query += ` AND status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    query += ' ORDER BY last_message_at DESC NULLS LAST';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.post('/api/chat/conversations', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { conversation_type, supplier_id, related_entity_type, related_entity_id } = req.body;

    if (!conversation_type) {
      return res.status(400).json({ error: 'ValidationError', message: 'Conversation type required' });
    }

    const conversation_id = uuidv4();
    const now = new Date().toISOString();

    let customer_id = null;
    let admin_id = null;
    let supplier_id_value = supplier_id || null;

    if (req.user.user_type === 'customer') {
      customer_id = req.user.customer_id;
    } else if (req.user.user_type === 'supplier') {
      supplier_id_value = req.user.supplier_id;
    } else if (req.user.user_type === 'admin') {
      admin_id = req.user.admin_id;
    }

    const result = await pool.query(
      'INSERT INTO chat_conversations (conversation_id, customer_id, supplier_id, admin_id, conversation_type, related_entity_type, related_entity_id, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
      [conversation_id, customer_id, supplier_id_value, admin_id, conversation_type, related_entity_type, related_entity_id, 'active', now, now]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.get('/api/chat/conversations/:conversation_id/messages', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const limit = asNumber(req.query.limit, 50); const offset = asNumber(req.query.offset, 0);

    const result = await pool.query(
      'SELECT * FROM chat_messages WHERE conversation_id = $1 ORDER BY timestamp DESC LIMIT $2 OFFSET $3',
      [req.params.conversation_id, limit, offset]
    );

    res.json(result.rows.reverse());
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.post('/api/chat/conversations/:conversation_id/messages', authenticateToken, async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { message_text, attachments } = req.body;

    if (!message_text) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'ValidationError', message: 'Message text required' });
    }

    const message_id = uuidv4();
    const now = new Date().toISOString();
    const sender_type = req.user.user_type;

    const result = await client.query(
      'INSERT INTO chat_messages (message_id, conversation_id, sender_id, sender_type, message_text, attachments, is_read, timestamp, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
      [message_id, req.params.conversation_id, req.user.user_id, sender_type, message_text, JSON.stringify(attachments), false, now, now]
    );

    await client.query(
      'UPDATE chat_conversations SET last_message_at = $1, updated_at = $2 WHERE conversation_id = $3',
      [now, now, req.params.conversation_id]
    );

    const convResult = await client.query(
      'SELECT customer_id, supplier_id, admin_id FROM chat_conversations WHERE conversation_id = $1',
      [req.params.conversation_id]
    );

    await client.query('COMMIT');

    const message = result.rows[0];
    const conv = convResult.rows[0];

    io.to(`conversation:${req.params.conversation_id}`).emit('chat_message_received', {
      message_id: message.message_id,
      conversation_id: message.conversation_id,
      sender_id: message.sender_id,
      sender_type: message.sender_type,
      sender_name: `${req.user.first_name} ${req.user.last_name}`,
      message_text: message.message_text,
      attachments: JSON.parse(message.attachments || '[]'),
      timestamp: message.timestamp,
      is_read: message.is_read
    });

    res.status(201).json(message);
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  } finally {
    client.release();
  }
});

app.get('/api/surplus', async (req, res) => {
  try {
    const { query, category_id, condition, price_min, price_max, shipping_available, status = 'active', sort_by = 'created_date', sort_order = 'desc' } = req.query;
    
    // Coerce query params
    const limit = Math.min(asNumber(req.query.limit, 50) || 50, 100);
    const offset = asNumber(req.query.offset, 0) || 0;

    let sqlQuery = 'SELECT * FROM surplus_listings WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (query) {
      sqlQuery += ` AND (product_name ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
      params.push(`%${query}%`);
      paramCount++;
    }

    if (category_id) {
      sqlQuery += ` AND category_id = $${paramCount}`;
      params.push(category_id);
      paramCount++;
    }

    if (condition) {
      sqlQuery += ` AND condition = $${paramCount}`;
      params.push(condition);
      paramCount++;
    }

    if (price_min) {
      sqlQuery += ` AND asking_price >= $${paramCount}`;
      const priceMinStr = asString(price_min);
      params.push(priceMinStr ? parseFloat(priceMinStr) : 0);
      paramCount++;
    }

    if (price_max) {
      sqlQuery += ` AND asking_price <= $${paramCount}`;
      const priceMaxStr = asString(price_max);
      params.push(priceMaxStr ? parseFloat(priceMaxStr) : 0);
      paramCount++;
    }

    if (shipping_available !== undefined) {
      sqlQuery += ` AND shipping_available = $${paramCount}`;
      params.push(shipping_available === 'true');
      paramCount++;
    }

    if (status) {
      sqlQuery += ` AND status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    const orderByMap: Record<string, string> = {
      created_date: 'created_date',
      asking_price: 'asking_price',
      views_count: 'views_count'
    };
    
    const sortByStr = asString(sort_by) || 'created_date';
    sqlQuery += ` ORDER BY ${orderByMap[sortByStr] || 'created_date'} ${sort_order === 'asc' ? 'ASC' : 'DESC'}`;
    sqlQuery += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit);
    params.push(offset);

    const result = await pool.query(sqlQuery, params);

    const countQuery = sqlQuery.substring(0, sqlQuery.indexOf('ORDER BY')).replace(/SELECT \* FROM/, 'SELECT COUNT(*) as total FROM');
    const countResult = await pool.query(countQuery, params.slice(0, -2));

    res.json({
      listings: result.rows,
      total: parseInt(countResult.rows[0].total)
    });
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.post('/api/surplus', authenticateToken, requireCustomer, async (req: AuthRequest, res: Response) => {
  try {
    const { product_name, category_id, description, condition, photos, asking_price, original_price, price_type, quantity, pickup_location, pickup_instructions, shipping_available, shipping_rate, reason_for_selling } = req.body;

    if (!product_name || !category_id || !description || !condition || !asking_price) {
      return res.status(400).json({ error: 'ValidationError', message: 'Missing required fields' });
    }

    const listing_id = uuidv4();
    const now = new Date().toISOString();

    const result = await pool.query(
      'INSERT INTO surplus_listings (listing_id, seller_id, product_name, category_id, description, condition, photos, asking_price, original_price, price_type, quantity, pickup_location, pickup_instructions, shipping_available, shipping_rate, status, reason_for_selling, views_count, created_date, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21) RETURNING *',
      [listing_id, req.user.customer_id, product_name, category_id, description, condition, JSON.stringify(photos), asking_price, original_price, price_type || 'fixed', quantity || 1, pickup_location, pickup_instructions, shipping_available || false, shipping_rate, 'active', reason_for_selling, 0, now, now, now]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.get('/api/surplus/:listing_id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM surplus_listings WHERE listing_id = $1', [req.params.listing_id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'ListingNotFound', message: 'Listing not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.patch('/api/surplus/:listing_id', authenticateToken, requireCustomer, async (req: AuthRequest, res: Response) => {
  try {
    const { description, photos, asking_price, quantity, status } = req.body;
    const now = new Date().toISOString();

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (description !== undefined) { updates.push(`description = $${paramCount++}`); values.push(description); }
    if (photos !== undefined) { updates.push(`photos = $${paramCount++}`); values.push(JSON.stringify(photos)); }
    if (asking_price !== undefined) { updates.push(`asking_price = $${paramCount++}`); values.push(asking_price); }
    if (quantity !== undefined) { updates.push(`quantity = $${paramCount++}`); values.push(quantity); }
    if (status !== undefined) { updates.push(`status = $${paramCount++}`); values.push(status); }

    updates.push(`updated_at = $${paramCount++}`);
    values.push(now);
    values.push(req.params.listing_id);
    values.push(req.user.customer_id);

    const result = await pool.query(
      `UPDATE surplus_listings SET ${updates.join(', ')} WHERE listing_id = $${paramCount} AND seller_id = $${paramCount + 1} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'ListingNotFound', message: 'Listing not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.delete('/api/surplus/:listing_id', authenticateToken, requireCustomer, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query('DELETE FROM surplus_listings WHERE listing_id = $1 AND seller_id = $2 RETURNING listing_id', [req.params.listing_id, req.user.customer_id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'ListingNotFound', message: 'Listing not found' });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.get('/api/surplus/my-listings', authenticateToken, requireCustomer, async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.query;
    let query = 'SELECT * FROM surplus_listings WHERE seller_id = $1';
    const params = [req.user.customer_id];

    if (status) {
      query += ' AND status = $2';
      params.push(asString(status));
    }

    query += ' ORDER BY created_date DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.post('/api/surplus/:listing_id/offers', authenticateToken, requireCustomer, async (req: AuthRequest, res: Response) => {
  try {
    const { offer_amount, message } = req.body;

    if (!offer_amount) {
      return res.status(400).json({ error: 'ValidationError', message: 'Offer amount required' });
    }

    const offer_id = uuidv4();
    const now = new Date().toISOString();

    const result = await pool.query(
      'INSERT INTO surplus_offers (offer_id, listing_id, buyer_id, offer_amount, message, status, created_date, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
      [offer_id, req.params.listing_id, req.user.customer_id, offer_amount, message, 'pending', now, now, now]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.get('/api/promotions', async (req, res) => {
  try {
    const { supplier_id, promotion_type } = req.query;
    const now = new Date().toISOString();

    let query = 'SELECT * FROM promotions WHERE is_active = true AND start_date <= $1 AND end_date >= $1';
    const params = [now];
    let paramCount = 2;

    if (supplier_id) {
      query += ` AND supplier_id = $${paramCount}`;
      params.push(asString(supplier_id));
      paramCount++;
    }

    if (promotion_type) {
      query += ` AND promotion_type = $${paramCount}`;
      params.push(asString(promotion_type));
      paramCount++;
    }

    query += ' ORDER BY start_date DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.post('/api/promotions/validate', async (req, res) => {
  try {
    const { promo_code, cart_total } = req.body;

    if (!promo_code) {
      return res.status(400).json({ error: 'ValidationError', message: 'Promo code required' });
    }

    const now = new Date().toISOString();
    const result = await pool.query(
      'SELECT * FROM promotions WHERE promo_code = $1 AND is_active = true AND start_date <= $2 AND end_date >= $2',
      [promo_code.toUpperCase(), now]
    );

    if (result.rows.length === 0) {
      return res.json({ valid: false, message: 'Invalid or expired promo code' });
    }

    const promo = result.rows[0];
    let discount_amount = 0;

    if (promo.minimum_purchase_amount && cart_total < promo.minimum_purchase_amount) {
      return res.json({ valid: false, message: `Minimum purchase of $${promo.minimum_purchase_amount} required` });
    }

    if (promo.discount_type === 'percentage') {
      discount_amount = (cart_total * promo.discount_value) / 100;
      if (promo.maximum_discount_amount) {
        discount_amount = Math.min(discount_amount, promo.maximum_discount_amount);
      }
    } else {
      discount_amount = promo.discount_value;
    }

    res.json({
      valid: true,
      promotion: promo,
      discount_amount,
      message: 'Promo code applied successfully'
    });
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.get('/api/support/tickets', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.query;
    let query = 'SELECT * FROM support_tickets WHERE user_id = $1';
    const params = [req.user.user_id];

    if (status) {
      query += ' AND status = $2';
      params.push(asString(status));
    }

    query += ' ORDER BY created_date DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.post('/api/support/tickets', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { order_id, issue_category, subject, message, attachments, priority } = req.body;

    if (!issue_category || !subject || !message) {
      return res.status(400).json({ error: 'ValidationError', message: 'Missing required fields' });
    }

    const ticket_id = uuidv4();
    const now = new Date().toISOString();

    const result = await pool.query(
      'INSERT INTO support_tickets (ticket_id, user_id, order_id, issue_category, subject, message, attachments, status, priority, created_date, last_updated_date, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *',
      [ticket_id, req.user.user_id, order_id, issue_category, subject, message, JSON.stringify(attachments), 'open', priority || 'normal', now, now, now, now]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.get('/api/support/tickets/:ticket_id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM support_tickets WHERE ticket_id = $1', [req.params.ticket_id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'TicketNotFound', message: 'Ticket not found' });
    }

    const responsesResult = await pool.query(
      'SELECT * FROM ticket_responses WHERE ticket_id = $1 ORDER BY timestamp ASC',
      [req.params.ticket_id]
    );

    res.json({
      ticket: result.rows[0],
      responses: responsesResult.rows
    });
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.post('/api/support/tickets/:ticket_id/responses', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { message, attachments } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'ValidationError', message: 'Message required' });
    }

    const response_id = uuidv4();
    const now = new Date().toISOString();
    const responder_type = req.user.user_type;

    const result = await pool.query(
      'INSERT INTO ticket_responses (response_id, ticket_id, responder_id, responder_type, message, attachments, is_internal_note, timestamp, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
      [response_id, req.params.ticket_id, req.user.user_id, responder_type, message, JSON.stringify(attachments), false, now, now]
    );

    await pool.query('UPDATE support_tickets SET last_updated_date = $1, updated_at = $2 WHERE ticket_id = $3', [now, now, req.params.ticket_id]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.get('/api/admin/users', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { query, user_type, status, email_verified, limit = 50, offset = 0 } = req.query;
    
    const limitNum = asNumber(limit, 50);
    const offsetNum = asNumber(offset, 0);

    let sqlQuery = 'SELECT user_id, email, user_type, first_name, last_name, phone_number, registration_date, last_login_date, status, email_verified, created_at FROM users WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;

    if (query) {
      sqlQuery += ` AND (email ILIKE $${paramCount} OR first_name ILIKE $${paramCount} OR last_name ILIKE $${paramCount})`;
      params.push(`%${asString(query)}%`);
      paramCount++;
    }

    if (user_type) {
      sqlQuery += ` AND user_type = $${paramCount}`;
      params.push(asString(user_type));
      paramCount++;
    }

    if (status) {
      sqlQuery += ` AND status = $${paramCount}`;
      params.push(asString(status));
      paramCount++;
    }

    if (email_verified !== undefined) {
      sqlQuery += ` AND email_verified = $${paramCount}`;
      const emailVerifiedStr = asString(email_verified);
      params.push(emailVerifiedStr === 'true');
      paramCount++;
    }

    sqlQuery += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limitNum);
    params.push(offsetNum);

    const result = await pool.query(sqlQuery, params);

    const countQuery = sqlQuery.substring(0, sqlQuery.indexOf('ORDER BY')).replace(/SELECT .* FROM/, 'SELECT COUNT(*) as total FROM');
    const countResult = await pool.query(countQuery, params.slice(0, -2));

    res.json({
      users: result.rows,
      total: parseInt(countResult.rows[0].total)
    });
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.patch('/api/admin/users/:user_id', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { status, email_verified } = req.body;
    const now = new Date().toISOString();

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (status !== undefined) { updates.push(`status = $${paramCount++}`); values.push(status); }
    if (email_verified !== undefined) { updates.push(`email_verified = $${paramCount++}`); values.push(email_verified); }

    updates.push(`updated_at = $${paramCount++}`);
    values.push(now);
    values.push(req.params.user_id);

    const result = await client.query(
      `UPDATE users SET ${updates.join(', ')} WHERE user_id = $${paramCount} RETURNING user_id, email, user_type, first_name, last_name, status, email_verified`,
      values
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'UserNotFound', message: 'User not found' });
    }

    const log_id = uuidv4();
    await client.query(
      'INSERT INTO admin_activity_logs (log_id, admin_id, action_type, action_description, affected_entity_type, affected_entity_id, previous_values, new_values, timestamp, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
      [log_id, req.user.admin_id, 'user_update', `Updated user ${req.params.user_id}`, 'user', req.params.user_id, JSON.stringify({}), JSON.stringify(req.body), now, now]
    );

    await client.query('COMMIT');

    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  } finally {
    client.release();
  }
});

app.get('/api/admin/supplier-applications', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { application_status, assigned_reviewer } = req.query;

    let query = 'SELECT * FROM supplier_applications WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (application_status) {
      query += ` AND application_status = $${paramCount}`;
      params.push(application_status);
      paramCount++;
    }

    if (assigned_reviewer) {
      query += ` AND assigned_reviewer_id = $${paramCount}`;
      params.push(assigned_reviewer);
      paramCount++;
    }

    query += ' ORDER BY submitted_date DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.get('/api/admin/supplier-applications/:application_id', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM supplier_applications WHERE application_id = $1', [req.params.application_id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'ApplicationNotFound', message: 'Application not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.patch('/api/admin/supplier-applications/:application_id', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { application_status, assigned_reviewer_id, verification_checklist, rejection_reason } = req.body;
    const now = new Date().toISOString();

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (application_status !== undefined) { updates.push(`application_status = $${paramCount++}`); values.push(application_status); }
    if (assigned_reviewer_id !== undefined) { updates.push(`assigned_reviewer_id = $${paramCount++}`); values.push(assigned_reviewer_id); }
    if (verification_checklist !== undefined) { updates.push(`verification_checklist = $${paramCount++}`); values.push(JSON.stringify(verification_checklist)); }
    if (rejection_reason !== undefined) { updates.push(`rejection_reason = $${paramCount++}`); values.push(rejection_reason); }

    if (application_status === 'approved' || application_status === 'rejected') {
      updates.push(`reviewed_date = $${paramCount++}`);
      values.push(now);
    }

    updates.push(`updated_at = $${paramCount++}`);
    values.push(now);
    values.push(req.params.application_id);

    const result = await pool.query(
      `UPDATE supplier_applications SET ${updates.join(', ')} WHERE application_id = $${paramCount} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'ApplicationNotFound', message: 'Application not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.post('/api/admin/supplier-applications/:application_id/approve', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const appResult = await client.query(
      'SELECT * FROM supplier_applications WHERE application_id = $1',
      [req.params.application_id]
    );

    if (appResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'ApplicationNotFound', message: 'Application not found' });
    }

    const app = appResult.rows[0];
    const now = new Date().toISOString();

    await client.query(
      'UPDATE supplier_applications SET application_status = $1, reviewed_date = $2, approved_date = $3, updated_at = $4 WHERE application_id = $5',
      ['approved', now, now, now, req.params.application_id]
    );

    const supplier_id = uuidv4();
    const supplierResult = await client.query(
      'INSERT INTO suppliers (supplier_id, user_id, business_name, business_registration_number, business_type, business_description, verification_status, rating_average, total_reviews, total_sales, total_orders, fulfillment_rate, commission_rate, subscription_plan, payout_frequency, status, onboarding_completed, member_since, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20) RETURNING *',
      [supplier_id, app.user_id, app.business_name, app.business_registration_number, app.business_type, app.business_description, 'verified', 0, 0, 0, 0, 0, 8.5, 'standard', 'monthly', 'active', false, now, now, now]
    );

    await client.query('COMMIT');

    res.json({
      message: 'Supplier application approved',
      supplier: supplierResult.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  } finally {
    client.release();
  }
});

app.post('/api/admin/supplier-applications/:application_id/reject', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { rejection_reason } = req.body;

    if (!rejection_reason) {
      return res.status(400).json({ error: 'ValidationError', message: 'Rejection reason required' });
    }

    const now = new Date().toISOString();
    const result = await pool.query(
      'UPDATE supplier_applications SET application_status = $1, rejection_reason = $2, reviewed_date = $3, updated_at = $4 WHERE application_id = $5 RETURNING *',
      ['rejected', rejection_reason, now, now, req.params.application_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'ApplicationNotFound', message: 'Application not found' });
    }

    res.json({ message: 'Application rejected' });
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.get('/api/admin/orders', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { status_filter, value_range, issue_flag, limit = 50, offset = 0 } = req.query;
    
    const limitNum = asNumber(limit, 50);
    const offsetNum = asNumber(offset, 0);

    let query = 'SELECT * FROM orders WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;

    if (status_filter) {
      query += ` AND status = $${paramCount}`;
      params.push(asString(status_filter));
      paramCount++;
    }

    query += ` ORDER BY order_date DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limitNum);
    params.push(offsetNum);

    const result = await pool.query(query, params);

    const countQuery = query.substring(0, query.indexOf('ORDER BY')).replace(/SELECT \* FROM/, 'SELECT COUNT(*) as total FROM');
    const countResult = await pool.query(countQuery, params.slice(0, -2));

    res.json({
      orders: result.rows,
      total: parseInt(countResult.rows[0].total)
    });
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.get('/api/admin/disputes', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { status, issue_type, assigned_admin } = req.query;

    let query = 'SELECT * FROM issues WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (status) {
      query += ` AND status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (issue_type) {
      query += ` AND issue_type = $${paramCount}`;
      params.push(issue_type);
      paramCount++;
    }

    if (assigned_admin) {
      query += ` AND assigned_admin_id = $${paramCount}`;
      params.push(assigned_admin);
      paramCount++;
    }

    query += ' ORDER BY opened_date DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.post('/api/admin/disputes/:issue_id/resolve', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { resolution_offered, resolution_amount, admin_notes } = req.body;

    if (!resolution_offered) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'ValidationError', message: 'Resolution required' });
    }

    const now = new Date().toISOString();
    const result = await client.query(
      'UPDATE issues SET resolution_offered = $1, resolution_amount = $2, status = $3, assigned_admin_id = $4, updated_at = $5 WHERE issue_id = $6 RETURNING *',
      [resolution_offered, resolution_amount, 'resolved', req.user.admin_id, now, req.params.issue_id]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'IssueNotFound', message: 'Issue not found' });
    }

    const log_id = uuidv4();
    await client.query(
      'INSERT INTO admin_activity_logs (log_id, admin_id, action_type, action_description, affected_entity_type, affected_entity_id, timestamp, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [log_id, req.user.admin_id, 'dispute_resolution', `Resolved issue ${req.params.issue_id}`, 'issue', req.params.issue_id, now, now]
    );

    await client.query('COMMIT');

    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  } finally {
    client.release();
  }
});

app.get('/api/admin/reviews/flagged', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT r.*, f.flag_reason, f.flagged_date
       FROM reviews r
       INNER JOIN flagged_content f ON r.review_id = f.content_id
       WHERE f.content_type = 'review' AND f.status = 'pending'
       ORDER BY f.flagged_date DESC`
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.post('/api/admin/reviews/:review_id/moderate', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { action, reason } = req.body;

    if (!action) {
      return res.status(400).json({ error: 'ValidationError', message: 'Action required' });
    }

    const now = new Date().toISOString();
    const newStatus = action === 'reject' ? 'rejected' : (action === 'flag' ? 'flagged' : 'published');

    const result = await pool.query(
      'UPDATE reviews SET status = $1, updated_at = $2 WHERE review_id = $3 RETURNING *',
      [newStatus, now, req.params.review_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'ReviewNotFound', message: 'Review not found' });
    }

    res.json({ message: `Review ${action}ed successfully` });
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.get('/api/admin/payouts', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { supplier_id, status } = req.query;

    let query = 'SELECT * FROM payouts WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (supplier_id) {
      query += ` AND supplier_id = $${paramCount}`;
      params.push(supplier_id);
      paramCount++;
    }

    if (status) {
      query += ` AND status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    query += ' ORDER BY scheduled_date DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.post('/api/admin/payouts', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { supplier_id, amount, scheduled_date, included_orders, platform_commission, net_amount } = req.body;

    if (!supplier_id || !amount || !scheduled_date) {
      return res.status(400).json({ error: 'ValidationError', message: 'Missing required fields' });
    }

    const payout_id = uuidv4();
    const now = new Date().toISOString();

    const result = await pool.query(
      'INSERT INTO payouts (payout_id, supplier_id, amount, status, scheduled_date, included_orders, platform_commission, net_amount, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
      [payout_id, supplier_id, amount, 'scheduled', scheduled_date, JSON.stringify(included_orders), platform_commission || 0, net_amount || amount, now, now]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.get('/api/admin/analytics/dashboard', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { metric_type, date_range } = req.query;

    const totalUsersResult = await pool.query('SELECT COUNT(*) as total FROM users');
    const totalCustomersResult = await pool.query('SELECT COUNT(*) as total FROM customers');
    const totalSuppliersResult = await pool.query('SELECT COUNT(*) as total FROM suppliers');
    const totalOrdersResult = await pool.query('SELECT COUNT(*) as total FROM orders');
    const totalRevenueResult = await pool.query('SELECT SUM(total_amount) as total FROM orders WHERE payment_status = \'paid\'');
    const gmvResult = await pool.query('SELECT SUM(subtotal_amount) as gmv FROM orders WHERE payment_status = \'paid\'');
    const activeOrdersResult = await pool.query('SELECT COUNT(*) as total FROM orders WHERE status IN (\'pending\', \'processing\', \'shipped\', \'in_transit\')');
    const pendingDisputesResult = await pool.query('SELECT COUNT(*) as total FROM issues WHERE status IN (\'open\', \'under_review\')');

    res.json({
      total_users: parseInt(totalUsersResult.rows[0].total),
      total_customers: parseInt(totalCustomersResult.rows[0].total),
      total_suppliers: parseInt(totalSuppliersResult.rows[0].total),
      total_orders: parseInt(totalOrdersResult.rows[0].total),
      total_revenue: parseFloat(totalRevenueResult.rows[0].total) || 0,
      gmv: parseFloat(gmvResult.rows[0].gmv) || 0,
      active_orders: parseInt(activeOrdersResult.rows[0].total),
      pending_disputes: parseInt(pendingDisputesResult.rows[0].total)
    });
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.get('/api/admin/settings', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { setting_category } = req.query;

    let query = 'SELECT * FROM platform_settings WHERE 1=1';
    const params = [];

    if (setting_category) {
      query += ' AND setting_category = $1';
      params.push(setting_category);
    }

    query += ' ORDER BY setting_key ASC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.put('/api/admin/settings', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { setting_key, setting_value, setting_category } = req.body;

    if (!setting_key || !setting_value) {
      return res.status(400).json({ error: 'ValidationError', message: 'Setting key and value required' });
    }

    const now = new Date().toISOString();
    const existingResult = await pool.query('SELECT setting_id FROM platform_settings WHERE setting_key = $1', [setting_key]);

    if (existingResult.rows.length > 0) {
      await pool.query(
        'UPDATE platform_settings SET setting_value = $1, last_updated_by = $2, updated_at = $3 WHERE setting_key = $4',
        [JSON.stringify(setting_value), req.user.admin_id, now, setting_key]
      );
    } else {
      const setting_id = uuidv4();
      await pool.query(
        'INSERT INTO platform_settings (setting_id, setting_key, setting_value, setting_category, last_updated_by, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [setting_id, setting_key, JSON.stringify(setting_value), setting_category || 'general', req.user.admin_id, now, now]
      );
    }

    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

io.use((socket: AuthSocket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication required'));
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as UserData;
    socket.user = decoded;
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket: AuthSocket) => {
  console.log(`User connected: ${socket.user?.user_id}`);

  socket.join(`user:${socket.user?.user_id}`);

  socket.on('subscribe_product', ({ product_id }) => {
    socket.join(`product:${product_id}`);
  });

  socket.on('unsubscribe_product', ({ product_id }) => {
    socket.leave(`product:${product_id}`);
  });

  socket.on('subscribe_order', ({ order_id }) => {
    socket.join(`order:${order_id}`);
  });

  socket.on('subscribe_delivery', ({ delivery_id }) => {
    socket.join(`delivery:${delivery_id}`);
  });

  socket.on('join_conversation', ({ conversation_id }) => {
    socket.join(`conversation:${conversation_id}`);
  });

  socket.on('leave_conversation', ({ conversation_id }) => {
    socket.leave(`conversation:${conversation_id}`);
  });

  socket.on('send_message', async ({ conversation_id, message_text, attachments }) => {
    try {
      const message_id = uuidv4();
      const now = new Date().toISOString();
      const sender_type = socket.user?.user_type;

      await pool.query(
        'INSERT INTO chat_messages (message_id, conversation_id, sender_id, sender_type, message_text, attachments, is_read, timestamp, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
        [message_id, conversation_id, socket.user?.user_id, sender_type, message_text, JSON.stringify(attachments || []), false, now, now]
      );

      await pool.query(
        'UPDATE chat_conversations SET last_message_at = $1, updated_at = $2 WHERE conversation_id = $3',
        [now, now, conversation_id]
      );

      io.to(`conversation:${conversation_id}`).emit('chat_message_received', {
        message_id,
        conversation_id,
        sender_id: socket.user.user_id,
        sender_type,
        message_text,
        attachments: attachments || [],
        timestamp: now,
        is_read: false
      });
    } catch (error) {
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  socket.on('user_typing', ({ conversation_id }) => {
    socket.to(`conversation:${conversation_id}`).emit('user_typing', {
      conversation_id,
      user_id: socket.user?.user_id,
      is_typing: true
    });
  });

  socket.on('user_stopped_typing', ({ conversation_id }) => {
    socket.to(`conversation:${conversation_id}`).emit('user_typing', {
      conversation_id,
      user_id: socket.user?.user_id,
      is_typing: false
    });
  });

  socket.on('mark_message_read', async ({ message_id }) => {
    try {
      const now = new Date().toISOString();
      await pool.query(
        'UPDATE chat_messages SET is_read = true, read_at = $1 WHERE message_id = $2',
        [now, message_id]
      );

      const msgResult = await pool.query('SELECT conversation_id FROM chat_messages WHERE message_id = $1', [message_id]);
      if (msgResult.rows.length > 0) {
        io.to(`conversation:${msgResult.rows[0].conversation_id}`).emit('chat_message_read', {
          message_id,
          read_at: now
        });
      }
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  });

  socket.on('mark_notification_read', async ({ notification_id }) => {
    try {
      const now = new Date().toISOString();
      await pool.query(
        'UPDATE notifications SET is_read = true, read_at = $1, updated_at = $2 WHERE notification_id = $3 AND user_id = $4',
        [now, now, notification_id, socket.user?.user_id]
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.user.user_id}`);
  });
});

// Serve static files (must come after API routes)
app.use(express.static(publicDir));

// Catch-all route for SPA (must be last)
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

export { app, pool };

httpServer.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Server running on port ${PORT} and listening on 0.0.0.0`);
});