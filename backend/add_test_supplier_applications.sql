-- Add test supplier applications with different statuses for E2E testing

-- First, add test users for the applicants (if they don't exist)
INSERT INTO users (user_id, email, password_hash, user_type, first_name, last_name, phone_number, profile_photo_url, registration_date, last_login_date, status, email_verified, email_verification_token, password_reset_token, password_reset_expires, created_at, updated_at) 
VALUES
('user_014', 'test.applicant1@example.com', 'password123', 'supplier', 'Test', 'Applicant One', '+1-555-0401', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400', '2024-01-26T10:00:00Z', '2024-01-26T10:00:00Z', 'active', true, NULL, NULL, NULL, '2024-01-26T10:00:00Z', '2024-01-26T10:00:00Z'),
('user_015', 'test.applicant2@example.com', 'password123', 'supplier', 'Test', 'Applicant Two', '+1-555-0402', 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=400', '2024-01-27T11:00:00Z', '2024-01-27T11:00:00Z', 'active', true, NULL, NULL, NULL, '2024-01-27T11:00:00Z', '2024-01-27T11:00:00Z'),
('user_016', 'test.applicant3@example.com', 'password123', 'supplier', 'Test', 'Applicant Three', '+1-555-0403', 'https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?w=400', '2024-01-28T12:00:00Z', '2024-01-28T12:00:00Z', 'active', true, NULL, NULL, NULL, '2024-01-28T12:00:00Z', '2024-01-28T12:00:00Z'),
('user_017', 'test.applicant4@example.com', 'password123', 'supplier', 'Test', 'Applicant Four', '+1-555-0404', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400', '2024-01-29T13:00:00Z', '2024-01-29T13:00:00Z', 'active', true, NULL, NULL, NULL, '2024-01-29T13:00:00Z', '2024-01-29T13:00:00Z')
ON CONFLICT (user_id) DO NOTHING;

-- Add supplier applications with different statuses
INSERT INTO supplier_applications (application_id, user_id, business_name, business_registration_number, business_type, contact_person_name, business_address, business_description, submitted_documents, application_status, assigned_reviewer_id, verification_checklist, rejection_reason, submitted_date, reviewed_date, approved_date, created_at, updated_at) 
VALUES
-- Pending Review Application
('app_003', 'user_014', 'Quality Construction Materials LLC', 'EIN-345678901', 'LLC', 'Test Applicant One', '300 Builder Ave, Dallas, TX 75201', 'Specialized in high-quality construction materials and equipment for commercial projects', '{"business_license": "doc_006", "insurance": "doc_007", "tax_id": "doc_008"}', 'pending_review', NULL, '{}', NULL, '2024-01-26T10:00:00Z', NULL, NULL, '2024-01-26T10:00:00Z', '2024-01-26T10:00:00Z'),

-- Another Pending Review Application
('app_004', 'user_015', 'Premier Building Supplies Co', 'EIN-456789012', 'Corporation', 'Test Applicant Two', '400 Industrial Blvd, San Antonio, TX 78201', 'Leading provider of premium building materials with 15 years of industry experience', '{"business_license": "doc_009", "insurance": "doc_010", "tax_id": "doc_011"}', 'pending_review', NULL, '{}', NULL, '2024-01-27T11:00:00Z', NULL, NULL, '2024-01-27T11:00:00Z', '2024-01-27T11:00:00Z'),

-- Under Review Application
('app_005', 'user_016', 'Texas Wholesale Materials Inc', 'EIN-567890123', 'Corporation', 'Test Applicant Three', '500 Supply Chain Dr, Fort Worth, TX 76101', 'Wholesale distributor of construction materials serving the entire Texas region', '{"business_license": "doc_012", "insurance": "doc_013", "tax_id": "doc_014"}', 'under_review', 'admin_001', '{"business_license": true, "insurance": true, "tax_id": false, "background_check": false}', NULL, '2024-01-28T12:00:00Z', '2024-01-29T09:00:00Z', NULL, '2024-01-28T12:00:00Z', '2024-01-29T09:00:00Z'),

-- Another Under Review Application
('app_006', 'user_017', 'Elite Hardware & Tools Supply', 'EIN-678901234', 'LLC', 'Test Applicant Four', '600 Commerce Pkwy, Austin, TX 78704', 'Comprehensive supplier of hardware, tools, and construction equipment for contractors', '{"business_license": "doc_015", "insurance": "doc_016", "tax_id": "doc_017"}', 'under_review', 'admin_001', '{"business_license": true, "insurance": true, "tax_id": true, "background_check": false}', NULL, '2024-01-29T13:00:00Z', '2024-01-30T10:00:00Z', NULL, '2024-01-29T13:00:00Z', '2024-01-30T10:00:00Z')
ON CONFLICT (application_id) DO NOTHING;
