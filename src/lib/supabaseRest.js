// Helper utilities to query Supabase REST (PostgREST) directly using fetch.
// Usage: import { selectUsersByUser, insertUser, updateUserPass } from './lib/supabaseRest'
// WARNING: Using the ANON key from the client is public-facing; ensure RLS/policies are correct
// and do NOT expose or use service_role keys here.

const DEFAULT_SUPABASE_URL = 'https://ljynujodigqqujjvyoud.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqeW51am9kaWdxcXVqanZ5b3VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0MTY4NTAsImV4cCI6MjA3Njk5Mjg1MH0.oCSsBjWbZl7w81E67H3VV3in7gX5tJAVPWZM2EG9UEo';

const SUPABASE_URL = (process.env.REACT_APP_SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/+$/,'');
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;
// Developer convenience: when set to 'true', any found user will be accepted
// regardless of the `valid` flag returned by RPCs. ONLY enable for local testing.
const DEV_AUTH_BYPASS = (process.env.REACT_APP_AUTH_DEV_BYPASS || 'false') === 'true';

function headers(contentType = 'application/json') {
  const h = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    Accept: 'application/json'
  };
  if (contentType) h['Content-Type'] = contentType;
  return h;
}




async function fetchDelete(path) {
  const url = `${SUPABASE_URL}${path}`;
  const res = await fetch(url, { method: 'DELETE', headers: headers('application/json') });
  if (!res.ok) throw new Error(`Supabase DELETE ${res.status}: ${await res.text()}`);
  return res.json();
}

// Examples for table `users` (columns: id, user, pass)
export async function selectUsersByUser(username) {
  console.debug('userName:', username);
  // GET /rest/v1/users?select=id,user,pass&user=eq.<username>
  // Use the eq.'value' form and percent-encode the username. This avoids issues with
  // characters that would otherwise be interpreted by the URL parser.
  // e.g. user=eq.'cc' -> encoded as user=eq.%27cc%27
  const path = `/rest/v1/users?select=id,user,pass&user=eq.%27${encodeURIComponent(username)}%27`;
  const url = `${SUPABASE_URL}${path}`;
  // Debugging: log the URL being requested (dev only)
  // eslint-disable-next-line no-console
  console.debug('[supabaseRest] GET', url);
  const res = await fetch(url, { method: 'GET', headers: headers(null) });
  if (!res.ok) {
    // eslint-disable-next-line no-console
    console.debug('[supabaseRest] response-status', res.status, await res.text());
    throw new Error(`Supabase GET ${res.status}`);
  }
  const json = await res.json();
  // eslint-disable-next-line no-console
  console.debug('[supabaseRest] response-json', json);
  return json;
}

export async function insertUser({ user, pass }) {
  // POST /rest/v1/users with Prefer: return=representation to get inserted row
  const path = `/rest/v1/users`;
  const url = `${SUPABASE_URL}${path}`;
  const res = await fetch(url, { 
    method: 'POST', 
    headers: {
      ...headers('application/json'),
      'Prefer': 'return=representation'
    }, 
    body: JSON.stringify({ user, pass }) 
  });
  if (!res.ok) throw new Error(`Supabase POST ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function updateUserPass(id, newPass) {
  // PATCH /rest/v1/users?id=eq.<id> with Prefer: return=representation
  const path = `/rest/v1/users?id=eq.${encodeURIComponent(id)}`;
  const url = `${SUPABASE_URL}${path}`;
  const res = await fetch(url, { 
    method: 'PATCH', 
    headers: {
      ...headers('application/json'),
      'Prefer': 'return=representation'
    }, 
    body: JSON.stringify({ pass: newPass }) 
  });
  if (!res.ok) throw new Error(`Supabase PATCH ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function deleteUser(id) {
  const path = `/rest/v1/users?id=eq.${encodeURIComponent(id)}`;
  return fetchDelete(path);
}

// Call an RPC (Postgres function) named <fnName>
export async function callRpc(fnName, params = {}) {
  const url = `${SUPABASE_URL}/rest/v1/rpc/${fnName}`;
  const res = await fetch(url, { method: 'POST', headers: headers('application/json'), body: JSON.stringify(params) });
  if (!res.ok) {
    // Try to parse JSON error body for structured info
    let text = await res.text();
    try {
      const json = JSON.parse(text);
      const err = new Error(json.message || `Supabase RPC ${res.status}`);
      err.code = json.code;
      err.details = json.details;
      err.hint = json.hint;
      throw err;
    } catch (e) {
      // not JSON
      throw new Error(`Supabase RPC ${res.status}: ${text}`);
    }
  }
  return res.json();
}

/**
 * authCheck calls a Postgres RPC function `auth_check(u text, p text)` which should
 * return a row like { valid: boolean, user_id: int, user_name: text } or an empty array.
 * Create the RPC in your Supabase SQL editor (see sql/auth_check.sql included).
 */
export async function authCheck(username, password) {
  // Try secure RPC (uses pgcrypto/crypt) first, then fall back to legacy auth_check
  try {
    const res = await callRpc('auth_check_secure', { u: username, p: password });
   console.warn('res;',res);
    if (Array.isArray(res) && res.length > 0) {
      if (DEV_AUTH_BYPASS) {
        // force valid for dev bypass
        const forced = { ...res[0], valid: true };
        return forced;
      }
      return res[0];
    }
  } catch (err) {
    console.warn('[supabaseRest] auth_check_secure failed, falling back to auth_check:', err);
    // If PostgREST reports ambiguous overloads or function-not-found (PGRST203/PGRST202),
    // try a direct table query and do a plaintext comparison as a last-resort fallback.
    const code = err && err.code ? err.code : null;
    const msg = err && err.message ? err.message : String(err);
    if (code === 'PGRST203' || code === 'PGRST202' || msg.includes('Could not choose the best candidate') || msg.includes('Could not find the function')) {
      try {
        const rows = await selectUsersByUser(username);
        console.warn('row:', rows);
        if (Array.isArray(rows) && rows.length > 0) {
          const row = rows[0];
          // If password stored in DB equals provided password (plaintext storage), accept.
          if (row.pass === password) {
            return { valid: true, user_id: row.id, user_name: row.user };
          }
          // If stored pass looks like a crypt/bcrypt hash (starts with $), we cannot verify client-side.
          if (typeof row.pass === 'string' && row.pass.startsWith('$')) {
            // Return known-failure so caller can show an informative message.
            return { valid: false, user_id: row.id, user_name: row.user };
          }
        }
      } catch (tblErr) {
        // eslint-disable-next-line no-console
        console.debug('[supabaseRest] fallback table lookup failed:', tblErr);
      }
    }
  }

  try {
    const res2 = await callRpc('auth_check', { u: username, p: password });
    console.warn('res2;',res2);
    if (Array.isArray(res2) && res2.length > 0) {
      if (DEV_AUTH_BYPASS) return { ...res2[0], valid: true };
      return res2[0];
    }
  } catch (err2) {
    // eslint-disable-next-line no-console
    console.debug('[supabaseRest] auth_check fallback failed:', err2.message || err2);
  }

  // Last-resort: try a temporary plaintext RPC if present (auth_check_plain).
  try {
    const res3 = await callRpc('auth_check_plain', { u: username, p: password });
    if (Array.isArray(res3) && res3.length > 0) {
      if (DEV_AUTH_BYPASS) return { ...res3[0], valid: true };
      return res3[0];
    }
  } catch (err3) {
    // eslint-disable-next-line no-console
    console.debug('[supabaseRest] auth_check_plain failed or not present:', err3.message || err3);
  }

  return null;
}

/**
 * getPatientsByUserId obtiene todos los pacientes filtrados por user_id
 * usando RPC de Supabase (igual que authCheck)
 */
export async function getPatientsByUserId(userId) {
  try {
    // Usar RPC get_patients_by_user_id igual que auth_check
    const result = await callRpc('get_patients_by_user_id', { user_id_param: userId });
    // eslint-disable-next-line no-console
    console.debug('[supabaseRest] getPatientsByUserId result:', result);
    
    // El RPC devuelve directamente el array de pacientes
    return Array.isArray(result) ? result : [];
    
  } catch (err) {
    // eslint-disable-next-line no-console
    console.debug('[supabaseRest] getPatientsByUserId failed:', err.message || err);
    throw err;
  }
}

// Raw SQL is NOT supported via REST; if you need complex queries use RPC functions or the
// Supabase client. Remember to enforce RLS and do server-side checks for sensitive ops.

/**
 * updatePatient actualiza los datos de un paciente específico
 */
async function updatePatient(patientId, patientData) {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/patients?id=eq.${patientId}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(patientData)
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('Error updating patient:', data);
      throw new Error(data.message || 'Error al actualizar el paciente');
    }
    
    return data[0];
  } catch (error) {
    console.error('Error in updatePatient:', error);
    throw error;
  }
}

const supabaseRest = {
  selectUsersByUser,
  insertUser,
  updateUserPass,
  deleteUser,
  callRpc,
  getPatientsByUserId,
  updatePatient,
  /**
   * createPatient inserta un nuevo paciente y retorna la fila creada.
   * Requiere que las políticas RLS permitan insert con el anon key para la tabla patients.
   */
  async createPatient(patientData) {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/patients`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(patientData)
      });
      const data = await response.json();
      if (!response.ok) {
        console.error('Error creating patient:', data);
        throw new Error(data.message || 'Error al crear el paciente');
      }
      return data[0];
    } catch (err) {
      console.error('Error in createPatient:', err);
      throw err;
    }
  },

  /**
   * deletePatient elimina un paciente por su ID.
   * Usa el ANON_KEY para las políticas RLS.
   */
  async deletePatient(patientId, userId) {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/patients?id=eq.${patientId}&user_id=eq.${userId}`, {
        method: 'DELETE',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const data = await response.json();
        console.error('Error deleting patient:', data);
        throw new Error(data.message || 'Error al eliminar el paciente');
      }
      
      return true;
    } catch (err) {
      console.error('Error in deletePatient:', err);
      throw err;
    }
  },

  /**
   * createAppointment crea una nueva cita usando la función RPC de Supabase
   */
  async createAppointment(appointmentData) {
    try {
      // Usar la función RPC create_appointment
      const result = await callRpc('create_appointment', {
        patient_id_param: appointmentData.patient_id,
        user_id_param: appointmentData.user_id,
        date_param: appointmentData.date,
        frequency_param: appointmentData.frequency || 'unica',
        status_param: appointmentData.status || 'en_espera',
        amount_param: appointmentData.amount || 0,
        observation_param: appointmentData.observation || null
      });

      console.debug('[supabaseRest] createAppointment result:', result);
      
      // El RPC devuelve directamente el objeto de la cita creada
      return Array.isArray(result) ? result[0] : result;
      
    } catch (err) {
      console.error('[supabaseRest] createAppointment failed:', err.message || err);
      throw err;
    }
  },

  /**
   * createRecurringAppointments crea turnos recurrentes usando RPC optimizada
   */
  async createRecurringAppointments(appointmentData, clearExisting = false) {
    try {
      // Usar la función RPC create_recurring_appointments
      const result = await callRpc('create_recurring_appointments', {
        patient_id_param: appointmentData.patient_id,
        user_id_param: appointmentData.user_id,
        start_date_param: appointmentData.date,
        frequency_param: appointmentData.frequency,
        status_param: appointmentData.status || 'en_espera',
        amount_param: appointmentData.amount || 0,
        observation_param: appointmentData.observation || null,
        clear_existing: clearExisting
      });

      console.debug('[supabaseRest] createRecurringAppointments result:', result);
      
      // El RPC devuelve un array de todas las citas creadas
      const appointments = Array.isArray(result) ? result : (result ? [result] : []);
      
      // Verificar si hay información sobre turnos eliminados
      let deletedCount = 0;
      if (appointments.length > 0 && appointments[0] && typeof appointments[0] === 'object') {
        deletedCount = appointments[0].deleted_count || 0;
      }
      
      return {
        appointments,
        deletedCount,
        createdCount: appointments.length
      };
      
    } catch (err) {
      console.error('[supabaseRest] createRecurringAppointments failed:', err.message || err);
      throw err;
    }
  },

  /**
   * getAppointmentsByUserId obtiene todas las citas de un usuario
   */
  async getAppointmentsByUserId(userId) {
    try {
      const result = await callRpc('get_appointments_by_user_id', { user_id_param: userId });
      console.debug('[supabaseRest] getAppointmentsByUserId result:', result);
      
      return Array.isArray(result) ? result : [];
      
    } catch (err) {
      console.error('[supabaseRest] getAppointmentsByUserId failed:', err.message || err);
      throw err;
    }
  },

  /**
   * getAppointmentsByPatientId obtiene todas las citas de un paciente específico
   */
  async getAppointmentsByPatientId(patientId, userId) {
    try {
      const result = await callRpc('get_appointments_by_patient_id', { 
        patient_id_param: patientId,
        user_id_param: userId 
      });
      console.debug('[supabaseRest] getAppointmentsByPatientId result:', result);
      
      return Array.isArray(result) ? result : [];
      
    } catch (err) {
      console.error('[supabaseRest] getAppointmentsByPatientId failed:', err.message || err);
      throw err;
    }
  },

  /**
   * updateAppointment actualiza una cita existente usando RPC
   */
  async updateAppointment(appointmentId, appointmentData, userId) {
    try {
      // Usar la función RPC update_appointment
      const result = await callRpc('update_appointment', {
        appointment_id_param: appointmentId,
        user_id_param: userId,
        date_param: appointmentData.date,
        frequency_param: appointmentData.frequency || 'unica',
        status_param: appointmentData.status || 'en_espera',
        amount_param: appointmentData.amount || 0,
        observation_param: appointmentData.observation || null
      });

      console.debug('[supabaseRest] updateAppointment result:', result);
      
      return Array.isArray(result) ? result[0] : result;
    } catch (error) {
      console.error('Error in updateAppointment:', error);
      throw error;
    }
  },

  /**
   * deleteRecurringAppointments elimina turnos recurrentes futuros
   */
  async deleteRecurringAppointments(patientId, userId, startDate, frequency) {
    try {
      const result = await callRpc('delete_recurring_appointments', {
        patient_id_param: patientId,
        user_id_param: userId,
        start_date_param: startDate,
        frequency_param: frequency
      });

      console.debug('[supabaseRest] deleteRecurringAppointments result:', result);
      
      return Array.isArray(result) ? result[0] : result;
      
    } catch (err) {
      console.error('[supabaseRest] deleteRecurringAppointments failed:', err.message || err);
      throw err;
    }
  },

  /**
   * deleteAppointmentsByDateRange elimina turnos en un rango de fechas
   */
  async deleteAppointmentsByDateRange(patientId, userId, startDate, endDate) {
    try {
      const result = await callRpc('delete_appointments_by_date_range', {
        patient_id_param: patientId,
        user_id_param: userId,
        start_date_param: startDate,
        end_date_param: endDate
      });

      console.debug('[supabaseRest] deleteAppointmentsByDateRange result:', result);
      
      return Array.isArray(result) ? result[0] : result;
      
    } catch (err) {
      console.error('[supabaseRest] deleteAppointmentsByDateRange failed:', err.message || err);
      throw err;
    }
  },

  /**
   * deleteAppointment elimina una cita por su ID usando RPC
   */
  async deleteAppointment(appointmentId, userId) {
    try {
      // Usar la función RPC delete_appointment
      const result = await callRpc('delete_appointment', {
        appointment_id_param: appointmentId,
        user_id_param: userId
      });

      console.debug('[supabaseRest] deleteAppointment result:', result);
      
      return result;
    } catch (err) {
      console.error('Error in deleteAppointment:', err);
      throw err;
    }
  },

  /**
   * deletePendingAppointmentsByPatient elimina todos los turnos pendientes de un paciente
   * Usa la función RPC delete_pending_appointments_by_patient_v2 para trabajar con autenticación personalizada
   */
  async deletePendingAppointmentsByPatient(patientId, userId) {
    try {
      const token = localStorage.getItem('token');

      if (!token) {
        throw new Error('No hay token de autenticación. Por favor, inicia sesión nuevamente.');
      }

      // Obtener el userId actual si no se proporciona
      let currentUserId = userId;
      if (!currentUserId) {
        // Si no se proporciona userId, intentar obtenerlo del token o localStorage
        currentUserId = localStorage.getItem('userId');
        if (!currentUserId) {
          throw new Error('No se pudo determinar el ID del usuario');
        }
      }

      // Usar la función RPC compatible para eliminar turnos pendientes
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/delete_pending_appointments_by_patient_v2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          patient_id_param: parseInt(patientId, 10),
          user_id_param: parseInt(currentUserId, 10)
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.debug('[supabaseRest] deletePendingAppointmentsByPatient result:', result);
      
      // La función RPC devuelve un array con un objeto que contiene deleted_count y deleted_ids
      const resultData = Array.isArray(result) ? result[0] : result;
      
      return {
        deletedCount: resultData.deleted_count || 0,
        deletedIds: resultData.deleted_ids || []
      };
    } catch (err) {
      console.error('Error in deletePendingAppointmentsByPatient:', err);
      throw err;
    }
  },

  /**
   * FUNCIONES PARA PAGOS
   */

  /**
   * createPayment crea un nuevo pago, con soporte para vincular con turnos específicos
   */
  async createPayment(paymentData) {
    try {
      // Si incluye appointment_id, usar la nueva función RPC
      if (paymentData.appointment_id) {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/create_payment_with_appointment`, {
          method: 'POST',
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            patient_id_param: paymentData.patient_id,
            user_id_param: paymentData.user_id,
            amount_param: paymentData.amount,
            payment_method_param: paymentData.payment_method || 'sesion',
            notes_param: paymentData.notes,
            appointment_id_param: paymentData.appointment_id
          })
        });

        const data = await response.json();

        if (!response.ok) {
          console.error('Error creating payment with appointment:', data);
          throw new Error(data.message || 'Error al crear el pago de sesión');
        }

        console.debug('[supabaseRest] createPayment with appointment result:', data[0]);
        return data[0];
      } else {
        // Método tradicional para pagos sin vincular a turnos
        // Asegurar que todos los campos requeridos estén presentes
        const normalizedPaymentData = {
          patient_id: paymentData.patient_id,
          user_id: paymentData.user_id,
          payment: paymentData.amount || paymentData.payment, // Compatibilidad con ambos nombres
          contribution_ob: paymentData.notes || paymentData.contribution_ob || '',
          payment_method: paymentData.payment_method || 'efectivo',
          payment_date: paymentData.payment_date || new Date().toISOString(),
          appointment_id: null // Explícitamente null para pagos tradicionales
        };

        const response = await fetch(`${SUPABASE_URL}/rest/v1/contributions`, {
          method: 'POST',
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(normalizedPaymentData)
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          console.error('Error creating payment:', data);
          throw new Error(data.message || 'Error al crear el pago');
        }
        
        console.debug('[supabaseRest] createPayment result:', data[0]);
        return data[0];
      }
    } catch (err) {
      console.error('Error in createPayment:', err);
      throw err;
    }
  },

  /**
   * getPaymentsByUserId obtiene todos los pagos de un usuario con información de turnos
   */
  async getPaymentsByUserId(userId) {
    try {
      // Usar la nueva función RPC que incluye información de turnos
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_session_payments_by_user`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id_param: userId
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error('Error getting payments:', data);
        throw new Error(data.message || 'Error al obtener los pagos');
      }

      // Mapear los datos para mantener compatibilidad con el formato anterior
      const mappedData = data.map(payment => ({
        id: payment.id,
        created_at: payment.created_at,
        patient_id: payment.patient_id,
        user_id: payment.user_id,
        payment: payment.payment,
        amount: payment.payment, // Alias para compatibilidad
        contribution_ob: payment.notes,
        notes: payment.notes,
        payment_method: payment.payment_method,
        appointment_id: payment.appointment_id,
        patient_name: payment.patient_name,
        patient_last_name: payment.patient_last_name,
        appointment_date: payment.appointment_date
      }));
      
      console.debug('[supabaseRest] getPaymentsByUserId result:', mappedData);
      return mappedData;
    } catch (err) {
      console.error('Error in getPaymentsByUserId:', err);
      throw err;
    }
  },

  /**
   * updatePayment actualiza un pago existente
   */
  async updatePayment(paymentId, paymentData, userId) {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/contributions?id=eq.${paymentId}&user_id=eq.${userId}`, {
        method: 'PATCH',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(paymentData)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error('Error updating payment:', data);
        throw new Error(data.message || 'Error al actualizar el pago');
      }
      
      console.debug('[supabaseRest] updatePayment result:', data[0]);
      return data[0];
    } catch (err) {
      console.error('Error in updatePayment:', err);
      throw err;
    }
  },

  /**
   * deletePayment elimina un pago por su ID
   */
  async deletePayment(paymentId, userId) {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/contributions?id=eq.${paymentId}&user_id=eq.${userId}`, {
        method: 'DELETE',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const data = await response.json();
        console.error('Error deleting payment:', data);
        throw new Error(data.message || 'Error al eliminar el pago');
      }
      
      console.debug('[supabaseRest] deletePayment success');
      return true;
    } catch (err) {
      console.error('Error in deletePayment:', err);
      throw err;
    }
  },

  /**
   * getPatientDebt calcula la deuda de un paciente específico
   * Deuda = suma de appointments finalizados/cancelados - suma de contributions.payment
   */
  async getPatientDebt(patientId, userId) {
    try {
      // Obtener todos los appointments del paciente
      const appointments = await this.getAppointmentsByPatientId(patientId, userId);
      // Solo contar turnos finalizados o cancelados (sesiones realizadas)
      const totalAppointments = appointments.reduce((sum, appointment) => {
        if (appointment.status === 'finalizado' || appointment.status === 'cancelado') {
          return sum + (parseFloat(appointment.amount) || 0);
        }
        return sum;
      }, 0);

      // Obtener todos los payments del paciente
      const response = await fetch(`${SUPABASE_URL}/rest/v1/contributions?patient_id=eq.${patientId}&user_id=eq.${userId}`, {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      const payments = await response.json();
      
      if (!response.ok) {
        console.error('Error getting patient payments:', payments);
        throw new Error(payments.message || 'Error al obtener los pagos del paciente');
      }

      const totalPayments = payments.reduce((sum, payment) => {
        return sum + (parseFloat(payment.payment) || 0);
      }, 0);

      const debt = totalAppointments - totalPayments;
      
      console.debug('[supabaseRest] getPatientDebt result:', {
        patientId,
        totalAppointments,
        totalPayments,
        debt
      });

      return {
        totalAppointments,
        totalPayments,
        debt,
        hasDebt: debt > 0
      };
    } catch (err) {
      console.error('Error in getPatientDebt:', err);
      throw err;
    }
  },

  /**
   * getPatientsWithDebt obtiene todos los pacientes con información de deuda
   * Usa método manual con consultas separadas
   */
  async getPatientsWithDebt(userId) {
    try {
      // Obtener todos los pacientes
      const patients = await this.getPatientsByUserId(userId);
      
      // Calcular deuda para cada paciente
      const patientsWithDebt = await Promise.all(
        patients.map(async (patient) => {
          try {
            const debtInfo = await this.getPatientDebt(patient.id, userId);
            return {
              ...patient,
              ...debtInfo
            };
          } catch (error) {
            console.error(`Error calculating debt for patient ${patient.id}:`, error);
            return {
              ...patient,
              totalAppointments: 0,
              totalPayments: 0,
              debt: 0,
              hasDebt: false
            };
          }
        })
      );

      return patientsWithDebt;
    } catch (err) {
      console.error('Error in getPatientsWithDebt:', err);
      throw err;
    }
  },

  /**
   * getNextAppointmentForPatient obtiene la próxima cita pendiente de un paciente
   */
  async getNextAppointmentForPatient(patientId, userId) {
    try {
      const appointments = await this.getAppointmentsByPatientId(patientId, userId);
      
      // Filtrar solo turnos en estado "en_espera" y ordenar por fecha
      const futureAppointments = appointments
        .filter(appointment => appointment.status === 'en_espera')
        .filter(appointment => new Date(appointment.date) >= new Date()) // Solo fechas futuras o de hoy
        .sort((a, b) => new Date(a.date) - new Date(b.date));
      
      return futureAppointments.length > 0 ? futureAppointments[0] : null;
    } catch (err) {
      console.error('Error in getNextAppointmentForPatient:', err);
      return null;
    }
  },

  /**
   * getPatientsWithNextAppointmentManual obtiene pacientes usando múltiples consultas (método manual)
   */
  async getPatientsWithNextAppointmentManual(userId) {
    try {
      // Primero obtener pacientes con deuda
      const patientsWithDebt = await this.getPatientsWithDebt(userId);
      
      // Agregar información de próxima cita para cada paciente
      const patientsWithNextAppointment = await Promise.all(
        patientsWithDebt.map(async (patient) => {
          try {
            const nextAppointment = await this.getNextAppointmentForPatient(patient.id, userId);
            return {
              ...patient,
              nextAppointment: nextAppointment
            };
          } catch (error) {
            console.error(`Error getting next appointment for patient ${patient.id}:`, error);
            return {
              ...patient,
              nextAppointment: null
            };
          }
        })
      );

      console.debug('[supabaseRest] getPatientsWithNextAppointmentManual result:', patientsWithNextAppointment);
      return patientsWithNextAppointment;
    } catch (err) {
      console.error('Error in getPatientsWithNextAppointmentManual:', err);
      throw err;
    }
  },

  /**
   * getPatientsWithNextAppointment obtiene todos los pacientes con información de deuda y próxima cita
   * Usa el método manual con consultas separadas
   */
  async getPatientsWithNextAppointment(userId) {
    try {
      return await this.getPatientsWithNextAppointmentManual(userId);
    } catch (err) {
      console.error('Error in getPatientsWithNextAppointment:', err);
      throw err;
    }
  }
};

export default supabaseRest;
