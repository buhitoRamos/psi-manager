-- Función RPC optimizada que incluye información de deuda y próxima cita
-- Ejecutar en consola SQL de Supabase

CREATE OR REPLACE FUNCTION get_patients_with_debt_and_next_appointment(user_id_param BIGINT)
RETURNS TABLE(
  id BIGINT,
  name TEXT,
  last_name TEXT,
  tel TEXT,
  email TEXT,
  dir TEXT,
  age TEXT,
  health_insurance TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ,
  total_appointments DECIMAL(10,2),
  total_payments DECIMAL(10,2),
  debt DECIMAL(10,2),
  has_debt BOOLEAN,
  next_appointment_id BIGINT,
  next_appointment_date TIMESTAMPTZ,
  next_appointment_status TEXT,
  next_appointment_amount DECIMAL(10,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.last_name,
    p.tel,
    p.email,
    p.dir,
    p.age,
    p.health_insurance,
    p.reason,
    p.created_at,
    -- Solo contar turnos finalizados o cancelados (sesiones realizadas)
    COALESCE(SUM(CASE WHEN a.status IN ('finalizado', 'cancelado') THEN a.amount ELSE 0 END), 0) as total_appointments,
    COALESCE(SUM(c.payment), 0) as total_payments,
    -- Calcular deuda solo con turnos finalizados/cancelados
    COALESCE(SUM(CASE WHEN a.status IN ('finalizado', 'cancelado') THEN a.amount ELSE 0 END), 0) - COALESCE(SUM(c.payment), 0) as debt,
    (COALESCE(SUM(CASE WHEN a.status IN ('finalizado', 'cancelado') THEN a.amount ELSE 0 END), 0) - COALESCE(SUM(c.payment), 0)) > 0 as has_debt,
    -- Información de la próxima cita (en_espera y fecha futura)
    next_apt.id as next_appointment_id,
    next_apt.date as next_appointment_date,
    next_apt.status as next_appointment_status,
    next_apt.amount as next_appointment_amount
  FROM patients p
  LEFT JOIN appointments a ON p.id = a.patient_id AND a.user_id = user_id_param
  LEFT JOIN contributions c ON p.id = c.patient_id AND c.user_id = user_id_param
  LEFT JOIN LATERAL (
    SELECT apt.id, apt.date, apt.status, apt.amount
    FROM appointments apt
    WHERE apt.patient_id = p.id 
      AND apt.user_id = user_id_param 
      AND apt.status = 'en_espera'
      AND apt.date >= NOW()
    ORDER BY apt.date ASC
    LIMIT 1
  ) next_apt ON true
  WHERE p.user_id = user_id_param
  GROUP BY p.id, p.name, p.last_name, p.tel, p.email, p.dir, p.age, p.health_insurance, p.reason, p.created_at,
           next_apt.id, next_apt.date, next_apt.status, next_apt.amount
  ORDER BY p.name, p.last_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE '✅ Función para obtener pacientes con resumen de deuda y próxima cita creada correctamente.';
END $$;