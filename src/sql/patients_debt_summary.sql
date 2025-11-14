-- Función RPC para calcular la deuda de todos los pacientes de un usuario
-- Solo cuenta turnos finalizados o cancelados (sesiones realizadas)
-- Los turnos "en_espera" no generan deuda hasta que se completen
-- Ejecutar en consola SQL de Supabase

CREATE OR REPLACE FUNCTION get_patients_with_debt_summary(user_id_param BIGINT)
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
  has_debt BOOLEAN
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
    (COALESCE(SUM(CASE WHEN a.status IN ('finalizado', 'cancelado') THEN a.amount ELSE 0 END), 0) - COALESCE(SUM(c.payment), 0)) > 0 as has_debt
  FROM patients p
  LEFT JOIN appointments a ON p.id = a.patient_id AND a.user_id = user_id_param
  LEFT JOIN contributions c ON p.id = c.patient_id AND c.user_id = user_id_param
  WHERE p.user_id = user_id_param
  GROUP BY p.id, p.name, p.last_name, p.tel, p.email, p.dir, p.age, p.health_insurance, p.reason, p.created_at
  ORDER BY p.name, p.last_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE '✅ Función para obtener pacientes con resumen de deuda creada correctamente.';
END $$;