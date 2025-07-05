CREATE OR REPLACE FUNCTION dashboard_metrics()
RETURNS TABLE(
  upcoming_appointments integer,
  product_usage_needed integer,
  low_stock integer,
  orders_today integer
) AS $$
BEGIN
  SELECT COUNT(*)
    INTO upcoming_appointments
    FROM bookings
    WHERE appointment_date >= NOW()
      AND appointment_date < NOW() + INTERVAL '7 days';

  SELECT COUNT(*)
    INTO product_usage_needed
    FROM product_usage_sessions
    WHERE completed = false;

  SELECT COUNT(*)
    INTO low_stock
    FROM products
    WHERE is_active = true
      AND current_stock <= min_threshold;

  SELECT COUNT(*)
    INTO orders_today
    FROM orders
    WHERE created_at::date = CURRENT_DATE;

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;
