CREATE OR REPLACE FUNCTION dashboard_metrics(p_staff_id uuid)
RETURNS TABLE(
  upcoming_appointments integer,
  product_usage_needed integer,
  low_stock integer,
  orders_today integer
) AS $$
BEGIN
  RETURN QUERY
    SELECT
      (SELECT COUNT(*) FROM bookings
         WHERE staff_id = p_staff_id
           AND appointment_date >= NOW()
           AND appointment_date < NOW() + INTERVAL '7 days'),
      (SELECT COUNT(*) FROM product_usage_sessions
         WHERE staff_id = p_staff_id
           AND completed = false),
      (SELECT COUNT(*) FROM products
         WHERE is_active = true
           AND current_stock <= min_threshold),
      (SELECT COUNT(*) FROM orders
         WHERE staff_id = p_staff_id
           AND created_at::date = CURRENT_DATE);
END;
$$ LANGUAGE plpgsql STABLE;
