CREATE OR REPLACE FUNCTION public.total_revenue_for_user(user_id uuid)
RETURNS TABLE(staff_name text, total_revenue numeric) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.first_name || ' ' || s.last_name AS staff_name,
    SUM(o.total_amount) AS total_revenue
  FROM public.orders o
  JOIN public.staff s ON s.id = o.staff_id
  WHERE (user_id IS NULL OR user_id = s.user_id)
  GROUP BY s.first_name, s.last_name;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.total_appointments_for_user(user_id uuid)
RETURNS TABLE(staff_name text, appointment_count integer) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.first_name || ' ' || s.last_name,
    COUNT(b.id)::int
  FROM public.bookings b
  JOIN public.staff s ON s.id = b.staff_id
  WHERE (user_id IS NULL OR user_id = s.user_id)
  GROUP BY s.first_name, s.last_name;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.upcoming_appointments(user_id uuid)
RETURNS TABLE(staff_name text, appointment_date timestamp, customer_name text) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.first_name || ' ' || s.last_name,
    b.appointment_date,
    b.customer_name
  FROM public.bookings b
  JOIN public.staff s ON s.id = b.staff_id
  WHERE
    (user_id IS NULL OR user_id = s.user_id)
    AND b.appointment_date > now()
    AND b.status = 'scheduled'
  ORDER BY b.appointment_date ASC;
END;
$$ LANGUAGE plpgsql;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
