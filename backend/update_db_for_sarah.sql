-- Update order_002 to delivered status for sarah.builder@example.com
UPDATE orders SET status = 'delivered', updated_at = '2024-01-26T15:00:00Z' WHERE order_id = 'order_002';

-- Update delivery status for order_002
UPDATE deliveries SET delivery_status = 'delivered', actual_delivery_time = '2024-01-26T14:30:00Z', delivery_proof_photo_url = 'https://images.unsplash.com/photo-1566576721346-d4a3b4eaeb55?w=800', delivery_signature = 'data:image/png;base64,signature3', delivery_notes = 'Delivered successfully to office', updated_at = '2024-01-26T14:30:00Z' WHERE delivery_id = 'del_002';

-- Add timeline entry for delivered status
INSERT INTO order_timeline (timeline_id, order_id, milestone, status, timestamp, description, performed_by, created_at) VALUES
('tl_019', 'order_002', 'delivered', 'completed', '2024-01-26T14:30:00Z', 'Successfully delivered to Houston office', 'carrier', '2024-01-26T14:30:00Z');
