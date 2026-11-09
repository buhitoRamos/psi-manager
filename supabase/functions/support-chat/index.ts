// Edge Function central: chatbot de soporte multi-app (Buho Systems).
// Cada app registra su identidad, planes, T&C y su propio Supabase.
// El modelo es configurable: OLLAMA_MODEL (default gemma4:31b-cloud) vía ollama cloud.
// Políticas del support bot forzadas en código: T&C completos, "SÍ" explícito,
// verificación de email antes de crear, notificación al admin por Telegram, clave 1810.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { type BillingPeriod, calculateBillingPeriod } from "./billing.ts";

const MODEL = Deno.env.get("OLLAMA_MODEL") ?? "gemma4:31b-cloud";
const OLLAMA_API_KEY = Deno.env.get("OLLAMA_API_KEY") ?? "";
const OLLAMA_URL = Deno.env.get("OLLAMA_BASE_URL") ?? "https://ollama.com/v1/chat/completions";
const TG_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
const TG_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID") ?? "";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const JSON_HEADERS = { ...CORS, "Content-Type": "application/json" };

const MAX_HISTORY = 60;
const MAX_MSG_CHARS = 8000;
const MAX_TOOL_ROUNDS = 6;
const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;
const PAYMENT_ALIAS = "martin.g.lopez";
const PAYMENT_REMINDER_DAYS = 3;

// ---------- Registro de apps ----------

type AppDef = {
  id: string;
  name: string;
  tagline: string;
  features: { basica: string; pro: string };
  terms: string; // con placeholders {fecha_actual} {fecha_vencimiento} {fecha_limite_pago}
  supabaseUrl: string;
  serviceRoleKey: string;
  freeUsersEnv: string;
  incrementSessionVersion?: boolean; // Sound-Book: invalida sesiones al resetear
};

function appRegistry(): Record<string, AppDef> {
  const apps: Record<string, AppDef> = {
    "psi-manager": {
      id: "psi-manager",
      name: "Psi Manager",
      tagline:
        "la app de gestión profesional para psicólogos de Buho Systems (pacientes, turnos, cobros, reportes; Google Calendar en el plan Pro)",
      features: {
        basica: "gestión de pacientes, turnos, cobros e informes",
        pro: "todo lo anterior + sincronización con Google Calendar",
      },
      terms: `📋 *Términos y Condiciones — Psi Manager*

1. El uso de la app es exclusivo para la gestión profesional del usuario registrado.
2. Los datos ingresados son responsabilidad del usuario. No nos hacemos cargo por información incorrecta o incompleta.
3. La suscripción se cobra mensualmente. **Tanto el plan Básico como el Pro tienen el primer mes gratis** desde hoy ({fecha_actual}) hasta el {fecha_vencimiento} inclusive. A partir del segundo mes, el pago debe realizarse antes del {fecha_limite_pago} y enviar comprobante para mantener el acceso.
4. El plan Básico ($10.000) incluye gestión de pacientes, turnos, cobros e informes. El plan Pro ($15.000) suma sincronización con Google Calendar.
5. El upgrade de plan se cobra de forma proporcional al mes en curso.
6. Podemos suspender el acceso ante falta de pago o uso indebido de la plataforma.
7. Nos reservamos el derecho de modificar precios con preaviso de 15 días.
8. La clave de acceso es personal e intransferible. El usuario debe cambiarla al primer ingreso.
9. No nos responsabilizamos por interrupciones del servicio por causas ajenas (fallas de servidor, internet, etc.).
10. El uso de la app implica la aceptación de estos términos.

¿Aceptás los Términos y Condiciones? (Sí/No)`,
      supabaseUrl: "https://ljynujodigqqujjvyoud.supabase.co",
      serviceRoleKey: Deno.env.get("PSI_SERVICE_ROLE_KEY") ?? "",
      freeUsersEnv: "PSI_FREE_USERS_EMAILS",
    },
    "sound-book": {
      id: "sound-book",
      name: "Sound-Book",
      tagline:
        "la app de gestión para productores musicales de Buho Systems (clientes, trabajos, cobros, ganancias; Google Calendar en el plan Pro)",
      features: {
        basica: "gestión de clientes, trabajos, cobros y ganancias",
        pro: "todo lo anterior + sincronización con Google Calendar",
      },
      terms: `📋 *Términos y Condiciones — Sound-Book*

1. El uso de la app es exclusivo para la gestión profesional del usuario registrado.
2. Los datos ingresados son responsabilidad del usuario. No nos hacemos cargo por información incorrecta o incompleta.
3. La suscripción se cobra mensualmente. **Tanto el plan Básico como el Pro tienen el primer mes gratis** desde hoy ({fecha_actual}) hasta el {fecha_vencimiento} inclusive. A partir del segundo mes, el pago debe realizarse antes del {fecha_limite_pago} y enviar comprobante para mantener el acceso.
4. El plan Básico ($10.000) incluye gestión de clientes, trabajos, cobros y ganancias. El plan Pro ($15.000) suma sincronización con Google Calendar.
5. El upgrade de plan se cobra de forma proporcional al mes en curso.
6. Podemos suspender el acceso ante falta de pago o uso indebido de la plataforma.
7. Nos reservamos el derecho de modificar precios con preaviso de 15 días.
8. La clave de acceso es personal e intransferible. El usuario debe cambiarla al primer ingreso.
9. No nos responsabilizamos por interrupciones del servicio por causas ajenas (fallas de servidor, internet, etc.).
10. El uso de la app implica la aceptación de estos términos.

¿Aceptás los Términos y Condiciones? (Sí/No)`,
      supabaseUrl: "https://owzpmzoqvmikdmebnxww.supabase.co",
      serviceRoleKey: Deno.env.get("SOUND_SERVICE_ROLE_KEY") ?? "",
      freeUsersEnv: "SOUND_FREE_USERS_EMAILS",
      incrementSessionVersion: true,
    },
  };
  return apps;
}

// ---------- Helpers ----------

function fmt(d: Date): string {
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function firstFreeMonthExpiry(reference = new Date()): Date {
  const signupDate = reference.toISOString().slice(0, 10);
  const expiryDate = calculateBillingPeriod(`${signupDate}T00:00:00Z`, signupDate).firstDueDate;
  return new Date(`${expiryDate}T12:00:00Z`);
}

function buildTerms(app: AppDef): string {
  const hoy = new Date();
  const venc = firstFreeMonthExpiry(hoy);
  return app.terms
    .replaceAll("{fecha_actual}", fmt(hoy))
    .replaceAll("{fecha_vencimiento}", fmt(venc))
    .replaceAll("{fecha_limite_pago}", fmt(venc));
}

async function telegram(text: string): Promise<boolean> {
  if (!TG_TOKEN || !TG_CHAT_ID) return false;
  try {
    const r = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: TG_CHAT_ID, text }),
    });
    return r.ok;
  } catch {
    return false;
  }
}

function argentinaDateParts(
  date: Date,
): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: string) => Number(parts.find((item) => item.type === type)?.value);
  return { year: part("year"), month: part("month"), day: part("day") };
}

async function getMembershipStatus(
  app: AppDef,
  email: string,
): Promise<Response> {
  const freeUsers = Deno.env.get(app.freeUsersEnv);
  if (freeUsers === undefined) {
    console.error(`[membership-status] ${app.freeUsersEnv} is not configured`);
    return new Response(
      JSON.stringify({
        error: "No se pudo verificar la elegibilidad de la membresía.",
      }),
      {
        status: 503,
        headers: JSON_HEADERS,
      },
    );
  }
  if (
    freeUsers.split(",").map((value) => value.trim().toLowerCase()).includes(
      email,
    )
  ) {
    return new Response(JSON.stringify({ show: false }), {
      status: 200,
      headers: JSON_HEADERS,
    });
  }

  const db = createClient(app.supabaseUrl, app.serviceRoleKey);
  const { data: users, error: userError } = await db
    .from("users")
    .select("id, created_at, role")
    .eq("user", email)
    .limit(1);
  if (userError) {
    console.error("[membership-status] user lookup failed:", userError.message);
    return new Response(
      JSON.stringify({ error: "No se pudo consultar la membresía." }),
      {
        status: 502,
        headers: JSON_HEADERS,
      },
    );
  }
  const user = users?.[0];
  if (!user || typeof user.created_at !== "string") {
    return new Response(
      JSON.stringify({ error: "No se encontró la cuenta." }),
      {
        status: 404,
        headers: JSON_HEADERS,
      },
    );
  }

  let period: BillingPeriod;
  try {
    const today = argentinaDateParts(new Date());
    const todayString = `${today.year}-${String(today.month).padStart(2, "0")}-${String(today.day).padStart(2, "0")}`;
    period = calculateBillingPeriod(user.created_at, todayString);
  } catch (error) {
    console.error("[membership-status] invalid billing dates:", error);
    return new Response(
      JSON.stringify({ error: "La fecha de alta de la cuenta no es válida." }),
      {
        status: 500,
        headers: JSON_HEADERS,
      },
    );
  }

  if (period.daysUntilDue < 0 || period.daysUntilDue > PAYMENT_REMINDER_DAYS) {
    return new Response(JSON.stringify({ show: false }), {
      status: 200,
      headers: JSON_HEADERS,
    });
  }

  const due = new Date(`${period.dueDate}T00:00:00Z`);
  const paymentWindowStart = new Date(due.getTime() - 5 * 86_400_000)
    .toISOString();
  const paymentWindowEnd = new Date(due.getTime() + 86_400_000).toISOString();
  const { data: payments, error: paymentError } = await db
    .from("admin_payments")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "completed")
    .gte("created_at", paymentWindowStart)
    .lt("created_at", paymentWindowEnd)
    .limit(1);
  if (paymentError) {
    console.error(
      "[membership-status] payment lookup failed:",
      paymentError.message,
    );
    return new Response(
      JSON.stringify({ error: "No se pudo verificar el estado del pago." }),
      {
        status: 502,
        headers: JSON_HEADERS,
      },
    );
  }
  if (payments?.length) {
    return new Response(JSON.stringify({ show: false }), {
      status: 200,
      headers: JSON_HEADERS,
    });
  }

  return new Response(
    JSON.stringify({
      show: true,
      due_date: period.dueDate,
      days_until_due: period.daysUntilDue,
      is_first_month: period.dueDate === period.firstDueDate,
      plan: user.role === "google" ? "Pro" : "Básico",
      amount: user.role === "google" ? 15000 : 10000,
      alias: PAYMENT_ALIAS,
    }),
    { status: 200, headers: JSON_HEADERS },
  );
}

async function forwardPaymentReceipt(
  app: AppDef,
  email: string,
  file: File,
): Promise<Response> {
  if (!TG_TOKEN || !TG_CHAT_ID) {
    return new Response(
      JSON.stringify({
        error: "El envío de comprobantes no está configurado.",
      }),
      {
        status: 503,
        headers: JSON_HEADERS,
      },
    );
  }
  if (!file.size || file.size > MAX_RECEIPT_BYTES) {
    return new Response(
      JSON.stringify({ error: "El archivo debe pesar menos de 10 MB." }),
      {
        status: 413,
        headers: JSON_HEADERS,
      },
    );
  }
  const allowedTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);
  if (!allowedTypes.has(file.type)) {
    return new Response(
      JSON.stringify({ error: "Adjuntá un comprobante en PDF, JPG o PNG." }),
      {
        status: 415,
        headers: JSON_HEADERS,
      },
    );
  }

  const db = createClient(app.supabaseUrl, app.serviceRoleKey);
  const { data: users, error: userError } = await db
    .from("users")
    .select("first_name, last_name, phone")
    .eq("user", email)
    .limit(1);
  if (userError) {
    console.error("[payment-receipt] user lookup failed:", userError.message);
    return new Response(
      JSON.stringify({ error: "No se pudo validar la cuenta." }),
      {
        status: 502,
        headers: JSON_HEADERS,
      },
    );
  }
  const user = users?.[0];
  if (!user) {
    return new Response(
      JSON.stringify({
        error: "No se encontró la cuenta para asociar el comprobante.",
      }),
      {
        status: 404,
        headers: JSON_HEADERS,
      },
    );
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100) ||
    "comprobante";
  const form = new FormData();
  form.set("chat_id", TG_CHAT_ID);
  form.set("document", file, safeName);
  form.set(
    "caption",
    `💳 COMPROBANTE DE PAGO\nApp: ${app.name}\nCliente: ${user.first_name ?? ""} ${
      user.last_name ?? ""
    }\nEmail: ${email}\nTeléfono: ${
      user.phone ?? "No registrado"
    }\n\nPendiente de revisión; no confirmar automáticamente.`,
  );

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${TG_TOKEN}/sendDocument`,
      {
        method: "POST",
        body: form,
      },
    );
    const result = await response.json();
    if (!response.ok || !result.ok) {
      console.error(
        "[payment-receipt] Telegram rejected document:",
        result.description ?? response.status,
      );
      return new Response(
        JSON.stringify({
          error: "No se pudo enviar el comprobante. Probá de nuevo más tarde.",
        }),
        {
          status: 502,
          headers: JSON_HEADERS,
        },
      );
    }
  } catch (error) {
    console.error("[payment-receipt] Telegram request failed:", error);
    return new Response(
      JSON.stringify({
        error: "No se pudo enviar el comprobante. Probá de nuevo más tarde.",
      }),
      {
        status: 502,
        headers: JSON_HEADERS,
      },
    );
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: JSON_HEADERS,
  });
}

// Verifica que los T&C fueron enviados y aceptados explícitamente después.
function tcAccepted(history: Array<{ role: string; content: string }>): boolean {
  const marker = "Términos y Condiciones — ";
  const acceptRe =
    /(^|[^a-záéíóúñ])(s[ií]|acepto|acept[óo]|ok|okay|dale|de acuerdo|confirmo|por supuesto)([^a-záéíóúñ]|$)/i;
  let lastTermsIdx = -1;
  for (let i = 0; i < history.length; i++) {
    const m = history[i];
    if (m.role === "assistant" && m.content.includes(marker)) lastTermsIdx = i;
  }
  if (lastTermsIdx === -1) return false;
  for (let i = lastTermsIdx + 1; i < history.length; i++) {
    const m = history[i];
    if (m.role === "user" && acceptRe.test(m.content.trim())) return true;
  }
  return false;
}

// ---------- System prompt ----------

function systemPrompt(app: AppDef, userCtx: string): string {
  return `Sos Buhobot Soporte 🦉, el asistente de soporte técnico de ${app.name}, ${app.tagline}.

## IDENTIDAD
- Amable, cercano y paciente. Usás emojis. Español rioplatense ("vos", "tenés", "querés").
- Sos resolutivo: primero intentás resolver con lo que la app ya tiene.
- Cerrá con: "¡Cualquier cosa, acá estamos! Equipo de Buho Systems 🦉"

## SCOPE ESTRICTO — REGLA ABSOLUTA
Tu ÚNICA función es responder sobre ${app.name}: uso, acceso, alta, upgrade, bugs, planes.
Si el cliente pregunta algo fuera de scope, respondé EXACTAMENTE:
"Mi función es darte soporte con ${app.name} 😊 Si tu consulta es sobre la app, con gusto te ayudo."
PROHIBIDO responder sobre otros temas, otras apps o conocimiento general.

## PRECIOS Y PLANES
- Básica $10.000/mes: ${app.features.basica}.
- Pro $15.000/mes: ${app.features.pro}.
- AMBOS planes tienen el PRIMER MES GRATIS. Mencionarlo SIEMPRE que hables de planes o altas.
- Upgrade Básica→Pro: diferencia proporcional de $5.000 según días restantes. NUNCA confirmar un upgrade sin autorización del administrador (usá notify_admin).

## FLUJO DE ALTA — IRREUNCIABLE
1. Pedir: Nombre, Apellido, Email, Plan (Básica o Pro) y Teléfono (con código de país). DNI opcional ("¿Tenés un DNI? No es obligatorio, sirve por si algún día necesitás recuperar tu cuenta 😊").
2. APENAS tengas todos los datos, llamá a send_terms y enviale el texto COMPLETO de los T&C SIN modificarlo ni resumirlo. NO esperes nada más.
3. Esperar "SÍ" explícito. Si duda o dice NO → NO crear la cuenta. Re-preguntar con amabilidad.
4. Verificar el email con check_email ANTES de crear.
5. Crear la cuenta con create_account.
6. Confirmar al cliente: clave inicial 1810, cambiarla al primer ingreso, primer mes gratis.

## REGLAS
- Email SIEMPRE en minúsculas.
- No repetir datos que ya tengas del contexto del usuario logueado.
- Reset de clave: SOLO para el email del usuario logueado. Para cualquier otro email → notify_admin y decile que el administrador lo va a contactar.
- NUNCA confirmar pagos ni registrar comprobantes: eso lo verifica el administrador. Si el cliente menciona un pago, avisale que el administrador lo confirma.
- Para transferencias, indicá el alias martin.g.lopez y pedí que adjunten el comprobante con el botón 📎 del chat. El primer mes es gratis.
- Si adjuntan un comprobante desde el chat, confirmá solo la recepción y aclarales que el administrador debe revisarlo; no confirmes el pago.
- No prometer fechas de fix para bugs. Reportarlos con notify_admin (subject "🐛 BUG") con el máximo detalle.
- No dar información de otros usuarios.
- Nunca mencionar el nombre del administrador: decís "el administrador".
- Renovaciones: se cobran el día del aniversario de la cuenta cada mes. Ante falta de pago la cuenta puede suspenderse; las reactivaciones las confirma el administrador.

## CONTEXTO DEL CLIENTE
${userCtx}`;
}

// ---------- Tools ----------

const TOOLS = [
  {
    type: "function",
    function: {
      name: "send_terms",
      description:
        "Devuelve el texto COMPLETO de los Términos y Condiciones con las fechas calculadas. Enviaselo al cliente SIN modificarlo ni resumirlo.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "check_email",
      description:
        "Verifica si un email ya tiene cuenta. Usar SIEMPRE antes de crear una cuenta.",
      parameters: {
        type: "object",
        properties: { email: { type: "string", description: "Email en minúsculas" } },
        required: ["email"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_account",
      description:
        "Crea una cuenta nueva. SOLO después de enviar los T&C, recibir aceptación explícita (SÍ) del cliente y verificar que el email no existe.",
      parameters: {
        type: "object",
        properties: {
          first_name: { type: "string" },
          last_name: { type: "string" },
          email: { type: "string", description: "En minúsculas" },
          plan: { type: "string", enum: ["basica", "pro"] },
          dni: { type: "string", description: "DNI o string vacío" },
          phone: {
            type: "string",
            description: "Teléfono con código de país, solo dígitos (ej: 5491156553411)",
          },
        },
        required: ["first_name", "last_name", "email", "plan", "phone"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "reset_password",
      description:
        "Restablece la clave de un usuario a la clave genérica 1810. Solo para el email del usuario logueado en la sesión actual.",
      parameters: {
        type: "object",
        properties: { email: { type: "string", description: "Email en minúsculas" } },
        required: ["email"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "notify_admin",
      description:
        "Notifica al administrador por Telegram. Usar para bugs, escalados, upgrades a autorizar, resets de terceros o cualquier intervención del admin.",
      parameters: {
        type: "object",
        properties: {
          subject: {
            type: "string",
            description: "Título corto. Ej: 🐛 BUG, 🆕 ALTA, 🔑 RESET, 💳 PAGO, ⬆️ UPGRADE",
          },
          message: { type: "string", description: "Detalles completos" },
        },
        required: ["subject", "message"],
      },
    },
  },
];

// ---------- Tool implementations ----------

async function checkEmail(app: AppDef, args: { email?: string }) {
  const email = String(args.email ?? "").trim().toLowerCase();
  if (!email) return { error: "Falta el email." };
  const db = createClient(app.supabaseUrl, app.serviceRoleKey);
  const { data } = await db.from("users").select("id").eq("user", email).limit(1);
  return { exists: Array.isArray(data) && data.length > 0 };
}

async function createAccount(
  app: AppDef,
  args: {
    first_name?: string;
    last_name?: string;
    email?: string;
    plan?: string;
    dni?: string;
    phone?: string;
  },
  history: Array<{ role: string; content: string }>,
) {
  const email = String(args.email ?? "").trim().toLowerCase();
  const plan = String(args.plan ?? "").toLowerCase();
  const firstName = String(args.first_name ?? "").trim();
  const lastName = String(args.last_name ?? "").trim();
  const dni = String(args.dni ?? "").trim();
  const phone = String(args.phone ?? "").replace(/\D/g, "");

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Email inválido." };
  if (plan !== "basica" && plan !== "pro") return { error: "Plan inválido (basica o pro)." };
  if (!firstName || !lastName) return { error: "Falta nombre o apellido." };
  if (!phone) return { error: "Falta el teléfono." };

  if (!tcAccepted(history)) {
    return {
      error:
        "FLUJO_INCOMPLETO: los T&C no fueron enviados o no hubo aceptación explícita. Llamá a send_terms, enviale el texto completo y esperá el SÍ del cliente antes de crear la cuenta.",
    };
  }

  const db = createClient(app.supabaseUrl, app.serviceRoleKey);
  const { data: existing } = await db.from("users").select("id").eq("user", email).limit(1);
  if (existing && existing.length > 0) {
    return {
      error: `El email ${email} ya tiene cuenta en ${app.name}. Ofrecé restablecer la clave si la olvidó.`,
    };
  }

  const row = {
    user: email,
    pass: "1810",
    first_name: firstName,
    last_name: lastName,
    dni,
    phone,
    role: plan === "pro" ? "google" : "",
  };

  const { data: inserted, error } = await db.from("users").insert(row).select().single();
  if (error) return { error: "Error al crear la cuenta: " + error.message };

  const venc = firstFreeMonthExpiry();
  await telegram(
    `🆕 NUEVO USUARIO CREADO\nApp: ${app.name}\nCliente: ${firstName} ${lastName}\nPlan: ${
      plan === "pro" ? "Pro" : "Básica"
    }\nTeléfono: ${phone}\nEmail: ${email}\nDNI: ${dni || "No proporcionado"}`,
  );

  return {
    ok: true,
    user_id: inserted?.id ?? null,
    instructions: `Confirmale al cliente: cuenta creada 🎉, clave inicial 1810 (cambiarla apenas ingrese), primer mes gratis hasta el ${fmt(
      venc,
    )}.`,
  };
}

async function resetPassword(app: AppDef, args: { email?: string }, sessionEmail: string | null) {
  const email = String(args.email ?? "").trim().toLowerCase();
  if (!email) return { error: "Falta el email." };

  if (!sessionEmail || sessionEmail.toLowerCase() !== email) {
    await telegram(
      `🔑 RESET SOLICITADO (requiere autorización)\nApp: ${app.name}\nEmail: ${email}\nMotivo: solicitado desde el chat por un usuario cuya sesión no coincide con ese email.`,
    );
    return {
      needs_admin: true,
      message:
        "El restablecimiento para ese email requiere autorización del administrador. Ya le avisé; te va a contactar en breve.",
    };
  }

  const db = createClient(app.supabaseUrl, app.serviceRoleKey);
  const { data: existing } = await db.from("users").select("id").eq("user", email).limit(1);
  if (!existing || existing.length === 0) {
    return { error: `No hay cuenta con ese email en ${app.name}.` };
  }

  const patch: Record<string, unknown> = { pass: "1810" };
  if (app.incrementSessionVersion) {
    const { data: u } = await db
      .from("users")
      .select("session_version")
      .eq("user", email)
      .limit(1);
    const current = (u && u[0]?.session_version) || 1;
    patch.session_version = current + 1;
  }

  const { error } = await db.from("users").update(patch).eq("user", email);
  if (error) return { error: "Error al restablecer: " + error.message };

  await telegram(
    `🔑 CLAVE RESTABLECIDA\nApp: ${app.name}\nEmail: ${email}\nOrigen: chat de la app (usuario logueado).`,
  );
  return {
    ok: true,
    message: "Clave restablecida a 1810. Decile al cliente que la cambie apenas ingrese.",
  };
}

async function notifyAdmin(app: AppDef, args: { subject?: string; message?: string }) {
  const sent = await telegram(
    `${String(args.subject ?? "📣 AVISO")} — ${app.name}\n\n${String(args.message ?? "")}`,
  );
  return sent
    ? { ok: true }
    : { error: "No se pudo notificar al administrador. Decile al cliente que intente más tarde." };
}

async function executeTool(
  app: AppDef,
  name: string,
  args: Record<string, unknown>,
  history: Array<{ role: string; content: string }>,
  sessionEmail: string | null,
): Promise<Record<string, unknown>> {
  try {
    switch (name) {
      case "send_terms":
        return { terms: buildTerms(app), note: "Enviale este texto COMPLETO sin modificar." };
      case "check_email":
        return await checkEmail(app, args as { email?: string });
      case "create_account":
        return await createAccount(app, args as Parameters<typeof createAccount>[1], history);
      case "reset_password":
        return await resetPassword(app, args as { email?: string }, sessionEmail);
      case "notify_admin":
        return await notifyAdmin(app, args as { subject?: string; message?: string });
      default:
        return { error: `Herramienta desconocida: ${name}` };
    }
  } catch (err) {
    return { error: `Error interno: ${err instanceof Error ? err.message : String(err)}` };
  }
}

// ---------- Ollama ----------

type ChatMessage = {
  role: string;
  content?: string;
  tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }>;
};

async function callOllama(messages: ChatMessage[], withTools: boolean): Promise<ChatMessage> {
  const r = await fetch(OLLAMA_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OLLAMA_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      ...(withTools ? { tools: TOOLS } : {}),
      stream: false,
    }),
  });
  if (!r.ok) {
    throw new Error(`Ollama ${r.status}: ${(await r.text()).slice(0, 300)}`);
  }
  const data = await r.json();
  return data.choices?.[0]?.message ?? { role: "assistant", content: "" };
}

// ---------- Handler ----------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: JSON_HEADERS,
    });
  }

  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return new Response(JSON.stringify({ error: "Formulario inválido." }), {
        status: 400,
        headers: JSON_HEADERS,
      });
    }
    const appId = String(form.get("app") ?? "");
    const app = appRegistry()[appId];
    const email = String(form.get("user_email") ?? "").trim().toLowerCase();
    const file = form.get("file");
    if (form.get("action") !== "payment_receipt") {
      return new Response(
        JSON.stringify({ error: "Acción de formulario no válida." }),
        {
          status: 400,
          headers: JSON_HEADERS,
        },
      );
    }
    if (!app || !app.serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "App desconocida o no configurada." }),
        {
          status: 404,
          headers: JSON_HEADERS,
        },
      );
    }
    if (
      !email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ||
      !(file instanceof File)
    ) {
      return new Response(
        JSON.stringify({
          error: "Faltan datos válidos para enviar el comprobante.",
        }),
        {
          status: 400,
          headers: JSON_HEADERS,
        },
      );
    }
    return await forwardPaymentReceipt(app, email, file);
  }

  let body: { app?: unknown; action?: unknown; messages?: unknown; user_email?: unknown };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "JSON inválido" }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  const appId = typeof body.app === "string" ? body.app : "";
  const app = appRegistry()[appId];
  if (!app || !app.serviceRoleKey) {
    return new Response(JSON.stringify({ error: "App desconocida o no configurada" }), {
      status: 404,
      headers: JSON_HEADERS,
    });
  }

  const sessionEmail =
    typeof body.user_email === "string" && body.user_email.includes("@")
      ? body.user_email.trim().toLowerCase()
      : null;
  if (body.action === "membership_status") {
    if (!sessionEmail) {
      return new Response(
        JSON.stringify({ error: "Iniciá sesión para consultar tu membresía." }),
        {
          status: 400,
          headers: JSON_HEADERS,
        },
      );
    }
    return await getMembershipStatus(app, sessionEmail);
  }

  if (!OLLAMA_API_KEY) {
    return new Response(
      JSON.stringify({ error: "OLLAMA_API_KEY no configurada" }),
      {
        status: 500,
        headers: JSON_HEADERS,
      },
    );
  }

  const rawHistory = Array.isArray(body.messages) ? (body.messages as ChatMessage[]) : [];
  const history = rawHistory
    .filter(
      (m) =>
        m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.length > 0 &&
        m.content.length <= MAX_MSG_CHARS,
    )
    .slice(-MAX_HISTORY)
    .map((m) => ({ role: m.role as string, content: m.content as string }));

  if (history.length === 0 || history[history.length - 1].role !== "user") {
    return new Response(JSON.stringify({ error: "Historial inválido" }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  // Contexto del usuario logueado
  let userCtx = "El cliente NO está logueado (posible nuevo cliente).";
  if (sessionEmail) {
    const db = createClient(app.supabaseUrl, app.serviceRoleKey);
    const { data } = await db
      .from("users")
      .select("first_name, last_name, role, phone")
      .eq("user", sessionEmail)
      .limit(1);
    if (data && data.length > 0) {
      const u = data[0];
      userCtx = `El cliente está logueado: ${u.first_name ?? ""} ${u.last_name ?? ""}, email ${sessionEmail}, plan ${
        u.role === "google" ? "Pro" : "Básica"
      }, teléfono ${u.phone || "no registrado"}.`;
    } else {
      userCtx = `El cliente dice estar logueado como ${sessionEmail} pero no se encontró la cuenta.`;
    }
  }

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt(app, userCtx) },
    ...history,
  ];

  try {
    let final: ChatMessage = { role: "assistant", content: "" };
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const msg = await callOllama(messages, true);
      if (!msg.tool_calls || msg.tool_calls.length === 0) {
        final = msg;
        break;
      }
      messages.push(msg);
      for (const tc of msg.tool_calls) {
        let args: Record<string, unknown> = {};
        try {
          args = tc.function.arguments ? JSON.parse(tc.function.arguments) : {};
        } catch {
          args = {};
        }
        const result = await executeTool(app, tc.function.name, args, history, sessionEmail);
        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify(result),
        } as unknown as ChatMessage);
      }
    }

    // Forzar respuesta textual si el loop terminó sin contenido útil
    if (!(final.content ?? "").trim()) {
      final = await callOllama(messages, false);
    }

    return new Response(JSON.stringify({ reply: final.content ?? "", model: MODEL }), {
      status: 200,
      headers: JSON_HEADERS,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: "Error del asistente",
        detail: err instanceof Error ? err.message : String(err),
      }),
      { status: 502, headers: JSON_HEADERS },
    );
  }
});
