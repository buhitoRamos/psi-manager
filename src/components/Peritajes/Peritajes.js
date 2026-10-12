import React, { useState, useEffect, useContext } from 'react';
import toast from 'react-hot-toast';
import { AuthContext } from '../../App';
import supabaseRest from '../../lib/supabaseRest';
import ConfirmModal from '../ConfirmModal/ConfirmModal';
import './Peritajes.css';

// Extraer user_id del token (patrón repetido en el proyecto)
function extractUserIdFromToken(token) {
  if (!token) return null;
  const parts = token.split('-');
  if (parts.length >= 2 && parts[0] === 'user') {
    const userId = parseInt(parts[1], 10);
    return isNaN(userId) ? null : userId;
  }
  return null;
}

// Normalizar texto (quita acentos) para búsqueda insensible a tildes
function normalizeText(text) {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function formatDate(dateString) {
  if (!dateString) return '—';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatCurrency(amount) {
  const n = Number(amount);
  if (isNaN(n)) return '—';
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n);
}

// Convierte un valor de fecha (string o Date) a 'YYYY-MM-DD' para inputs type=date
function toDateInput(value) {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Formulario inicial vacío con todos los campos de las 3 tablas
const emptyForm = {
  // peritado
  nombre: '',
  apellido: '',
  fechaPericia: '',
  fechaMaximaEntrega: '',
  conclusion: '',
  // juzgado
  fuero: '',
  distrito: '',
  nombreJuez: '',
  apellidoJuez: '',
  numeroExpediente: '',
  fechaAceptado: '',
  fechaFinalizado: '',
  // estado
  estado: '',
  importeDepositado: '',
  fechaDeposito: ''
};

function Peritajes() {
  const { token, isAuthenticated } = useContext(AuthContext);
  const [userId, setUserId] = useState(null);
  const [peritados, setPeritados] = useState([]);
  const [juzgados, setJuzgados] = useState([]);
  const [estados, setEstados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Formulario (crear/editar)
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null); // peritado en edición, o null
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Confirmación de borrado
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, peritado: null });

  useEffect(() => {
    if (!isAuthenticated) {
      setError('No hay sesión activa');
      setLoading(false);
      return;
    }
    const uid = extractUserIdFromToken(token);
    if (!uid) {
      setError('No se pudo obtener el ID del usuario');
      setLoading(false);
      return;
    }
    setUserId(uid);
    loadData(uid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, token]);

  async function loadData(uid) {
    setLoading(true);
    setError(null);
    try {
      const [p, j, e] = await Promise.all([
        supabaseRest.getPeritadosByUserId(uid),
        supabaseRest.getJuzgadosByUserId(uid),
        supabaseRest.getEstadosByUserId(uid)
      ]);
      setPeritados(p || []);
      setJuzgados(j || []);
      setEstados(e || []);
    } catch (err) {
      console.error('[Peritajes] Error cargando datos:', err);
      setError(err.message || 'Error al cargar los peritajes');
    } finally {
      setLoading(false);
    }
  }

  // Encuentra el juzgado y estado asociados a un peritado
  function getJuzgadoDePeritado(peritado) {
    return juzgados.find((j) => j.id === peritado.juzgadoID || j.peritadoID === peritado.id) || null;
  }
  function getEstadoDePeritado(peritado) {
    return estados.find((e) => e.id === peritado.estadoID || e.peritadoID === peritado.id) || null;
  }

  function openNewForm() {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  }

  function openEditForm(peritado) {
    const juzgado = getJuzgadoDePeritado(peritado);
    const estado = getEstadoDePeritado(peritado);
    setEditing(peritado);
    setForm({
      nombre: peritado.nombre || '',
      apellido: peritado.apellido || '',
      fechaPericia: toDateInput(peritado.fechaPericia),
      fechaMaximaEntrega: toDateInput(peritado.fechaMaximaEntrega),
      conclusion: peritado.conclusion || '',
      fuero: juzgado?.fuero || '',
      distrito: juzgado?.distrito || '',
      nombreJuez: juzgado?.nombreJuez || '',
      apellidoJuez: juzgado?.apellidoJuez || '',
      numeroExpediente: juzgado?.numeroExpediente || '',
      fechaAceptado: toDateInput(juzgado?.fechaAceptado),
      fechaFinalizado: toDateInput(juzgado?.fechaFinalizado),
      estado: estado?.estado || '',
      importeDepositado: estado?.importeDepositado != null ? String(estado.importeDepositado) : '',
      fechaDeposito: toDateInput(estado?.fechaDeposito)
    });
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditing(null);
    setSaving(false);
  }

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.nombre || !form.apellido) {
      toast.error('Nombre y apellido son obligatorios');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        // ---- Editar: actualizar las 3 entidades existentes ----
        const juzgado = getJuzgadoDePeritado(editing);
        const estado = getEstadoDePeritado(editing);

        await supabaseRest.updatePeritado(editing.id, {
          nombre: form.nombre.trim(),
          apellido: form.apellido.trim(),
          fechaPericia: form.fechaPericia || null,
          fechaMaximaEntrega: form.fechaMaximaEntrega || null,
          conclusion: form.conclusion.trim() || ''
        });

        if (juzgado) {
          await supabaseRest.updateJuzgado(juzgado.id, {
            fuero: form.fuero.trim(),
            distrito: form.distrito.trim(),
            nombreJuez: form.nombreJuez.trim(),
            apellidoJuez: form.apellidoJuez.trim(),
            numeroExpediente: form.numeroExpediente.trim(),
            fechaAceptado: form.fechaAceptado || null,
            fechaFinalizado: form.fechaFinalizado || null
          });
        }

        if (estado) {
          await supabaseRest.updateEstado(estado.id, {
            estado: form.estado.trim(),
            importeDepositado: form.importeDepositado ? Number(form.importeDepositado) : null,
            fechaDeposito: form.fechaDeposito || null
          });
        }

        toast.success('Peritaje actualizado');
      } else {
        // ---- Crear: peritado → juzgado → estado, y vincular ----
        const peritado = await supabaseRest.createPeritado({
          nombre: form.nombre.trim(),
          apellido: form.apellido.trim(),
          fechaPericia: form.fechaPericia || null,
          fechaMaximaEntrega: form.fechaMaximaEntrega || null,
          conclusion: form.conclusion.trim() || '',
          userID: userId
        });

        const juzgado = await supabaseRest.createJuzgado({
          fuero: form.fuero.trim(),
          distrito: form.distrito.trim(),
          nombreJuez: form.nombreJuez.trim(),
          apellidoJuez: form.apellidoJuez.trim(),
          numeroExpediente: form.numeroExpediente.trim(),
          fechaAceptado: form.fechaAceptado || null,
          fechaFinalizado: form.fechaFinalizado || null,
          peritadoID: peritado.id,
          userID: userId
        });

        const estado = await supabaseRest.createEstado({
          estado: form.estado.trim(),
          importeDepositado: form.importeDepositado ? Number(form.importeDepositado) : null,
          fechaDeposito: form.fechaDeposito || null,
          peritadoID: peritado.id,
          juzgadoID: juzgado.id,
          userID: userId
        });

        // Vincular bidireccionalmente
        await supabaseRest.updatePeritado(peritado.id, { juzgadoID: juzgado.id, estadoID: estado.id });
        await supabaseRest.updateJuzgado(juzgado.id, { estadoID: estado.id });

        toast.success('Peritaje creado');
      }
      closeForm();
      loadData(userId);
    } catch (err) {
      console.error('[Peritajes] Error guardando:', err);
      toast.error('Error al guardar el peritaje');
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(peritado) {
    setConfirmModal({ isOpen: true, peritado });
  }

  async function confirmDelete() {
    const peritado = confirmModal.peritado;
    setConfirmModal({ isOpen: false, peritado: null });
    try {
      const juzgado = getJuzgadoDePeritado(peritado);
      const estado = getEstadoDePeritado(peritado);
      if (estado) await supabaseRest.deleteEstado(estado.id);
      if (juzgado) await supabaseRest.deleteJuzgado(juzgado.id);
      await supabaseRest.deletePeritado(peritado.id);
      toast.success('Peritaje eliminado');
      loadData(userId);
    } catch (err) {
      console.error('[Peritajes] Error eliminando:', err);
      toast.error('Error al eliminar el peritaje');
    }
  }

  // Filtrar por búsqueda (nombre, apellido, número de expediente, distrito)
  const filtered = peritados.filter((p) => {
    if (!searchTerm) return true;
    const s = normalizeText(searchTerm);
    const juzgado = getJuzgadoDePeritado(p);
    return (
      normalizeText(p.nombre).includes(s) ||
      normalizeText(p.apellido).includes(s) ||
      normalizeText(juzgado?.numeroExpediente).includes(s) ||
      normalizeText(juzgado?.distrito).includes(s)
    );
  });

  if (loading) {
    return <div className="peritajes-container">Cargando peritajes...</div>;
  }

  if (error) {
    return (
      <div className="peritajes-container">
        <div className="peritajes-error">
          <h3>Error</h3>
          <p>{error}</p>
          <button onClick={() => loadData(userId)} className="peritajes-retry-btn">Reintentar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="peritajes-container">
      <div className="peritajes-header">
        <h2>Peritajes</h2>
        <p className="peritajes-user-info">Usuario ID: {userId}</p>

        <div className="peritajes-controls">
          <div className="peritajes-search">
            <input
              type="text"
              placeholder="Buscar por nombre, apellido, expediente o distrito..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="peritajes-search-input"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="peritajes-search-clear" title="Limpiar búsqueda">✕</button>
            )}
          </div>
          <button onClick={openNewForm} className="peritajes-new-btn">+ Nuevo Peritaje</button>
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="peritajes-grid">
          {filtered.map((p) => {
            const juzgado = getJuzgadoDePeritado(p);
            const estado = getEstadoDePeritado(p);
            return (
              <div key={p.id} className="peritado-card">
                <div className="peritado-header">
                  <h4 className="peritado-name">{juzgado?.numeroExpediente || 'Sin expediente'}</h4>
                </div>
                <div className="peritado-body">
                  <div className="peritado-field">
                    <span className="peritado-label">Fecha de pericia</span>
                    <span className="peritado-value">{formatDate(p.fechaPericia)}</span>
                  </div>
                  <div className="peritado-field">
                    <span className="peritado-label">Estado</span>
                    <span className="peritado-value">{estado?.estado || '—'}</span>
                  </div>
                  <div className="peritado-field">
                    <span className="peritado-label">Fecha máxima de entrega</span>
                    <span className="peritado-value">{formatDate(p.fechaMaximaEntrega)}</span>
                  </div>
                  {p.conclusion && (
                    <div className="peritado-field">
                      <span className="peritado-label">Conclusión</span>
                      <span className="peritado-value">{p.conclusion}</span>
                    </div>
                  )}
                  {juzgado && (juzgado.fuero || juzgado.distrito) && (
                    <div className="peritado-field">
                      <span className="peritado-label">Juzgado</span>
                      <span className="peritado-value">
                        {[juzgado.fuero, juzgado.distrito].filter(Boolean).join(' · ') || '—'}
                      </span>
                    </div>
                  )}
                  {estado && estado.importeDepositado != null && (
                    <div className="peritado-field">
                      <span className="peritado-label">Importe depositado</span>
                      <span className="peritado-value">{formatCurrency(estado.importeDepositado)}</span>
                    </div>
                  )}
                </div>
                <div className="peritado-actions">
                  <button className="peritado-edit-btn" onClick={() => openEditForm(p)}>✏️ Editar</button>
                  <button className="peritado-delete-btn" onClick={() => handleDelete(p)}>🗑️ Eliminar</button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="peritajes-empty">
          <h3>No hay peritajes registrados</h3>
          <p>Los peritajes que registres aparecerán aquí.</p>
          <button onClick={openNewForm} className="peritajes-new-btn">Registrar Primer Peritaje</button>
        </div>
      )}

      {/* Modal de formulario */}
      {formOpen && (
        <div className="peritajes-form-overlay">
          <div className="peritajes-form-modal">
            <div className="peritajes-form-header">
              <h3>{editing ? 'Editar Peritaje' : 'Nuevo Peritaje'}</h3>
              <button onClick={closeForm} className="peritajes-form-close">✕</button>
            </div>
            <form onSubmit={handleSave} className="peritajes-form">
              {/* Sección Peritado */}
              <div className="form-section">
                <h4 className="form-section-title">👤 Peritado</h4>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Nombre *</label>
                    <input type="text" value={form.nombre} onChange={(e) => handleChange('nombre', e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>Apellido *</label>
                    <input type="text" value={form.apellido} onChange={(e) => handleChange('apellido', e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>Fecha de pericia</label>
                    <input type="date" value={form.fechaPericia} onChange={(e) => handleChange('fechaPericia', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Fecha máxima de entrega</label>
                    <input type="date" value={form.fechaMaximaEntrega} onChange={(e) => handleChange('fechaMaximaEntrega', e.target.value)} />
                  </div>
                  <div className="form-group full-width">
                    <label>Conclusión</label>
                    <textarea rows="3" value={form.conclusion} onChange={(e) => handleChange('conclusion', e.target.value)} placeholder="Conclusión del peritaje (opcional)" />
                  </div>
                </div>
              </div>

              {/* Sección Juzgado */}
              <div className="form-section">
                <h4 className="form-section-title">⚖️ Juzgado</h4>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Fuero</label>
                    <select value={form.fuero} onChange={(e) => handleChange('fuero', e.target.value)}>
                      <option value="">Seleccionar fuero...</option>
                      <option value="Fuero Laboral">Fuero Laboral</option>
                      <option value="Fuero Penal">Fuero Penal</option>
                      <option value="Fuero de Familia">Fuero de Familia</option>
                      <option value="Fuero Contencioso Administrativo">Fuero Contencioso Administrativo</option>
                      <option value="Fuero de la Seguridad Social">Fuero de la Seguridad Social</option>
                      <option value="Fueros Federales">Fueros Federales</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Distrito</label>
                    <input type="text" value={form.distrito} onChange={(e) => handleChange('distrito', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Nombre del juez</label>
                    <input type="text" value={form.nombreJuez} onChange={(e) => handleChange('nombreJuez', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Apellido del juez</label>
                    <input type="text" value={form.apellidoJuez} onChange={(e) => handleChange('apellidoJuez', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Número de expediente</label>
                    <input type="text" value={form.numeroExpediente} onChange={(e) => handleChange('numeroExpediente', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Aceptación del Cargo</label>
                    <input type="date" value={form.fechaAceptado} onChange={(e) => handleChange('fechaAceptado', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Fecha finalizado</label>
                    <input type="date" value={form.fechaFinalizado} onChange={(e) => handleChange('fechaFinalizado', e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Sección Estado */}
              <div className="form-section">
                <h4 className="form-section-title">📋 Estado / Seguimiento</h4>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Estado</label>
                    <select value={form.estado} onChange={(e) => handleChange('estado', e.target.value)}>
                      <option value="">Seleccionar estado...</option>
                      <option value="en proceso">En proceso</option>
                      <option value="esperando fecha entrevista">Esperando fecha entrevista</option>
                      <option value="enviado a SCBA">Enviado a SCBA</option>
                      <option value="finalizado">Finalizado</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Importe depositado ($)</label>
                    <input type="number" min="0" step="1" value={form.importeDepositado} onChange={(e) => handleChange('importeDepositado', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Fecha de depósito</label>
                    <input type="date" value={form.fechaDeposito} onChange={(e) => handleChange('fechaDeposito', e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="peritajes-form-actions">
                <button type="button" onClick={closeForm} className="btn-cancel" disabled={saving}>Cancelar</button>
                <button type="submit" className="btn-save" disabled={saving}>
                  {saving ? 'Guardando...' : editing ? 'Actualizar' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de confirmación de borrado */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, peritado: null })}
        onConfirm={confirmDelete}
        title="Eliminar Peritaje"
        message={`¿Estás seguro de que quieres eliminar a ${confirmModal.peritado?.nombre || ''} ${confirmModal.peritado?.apellido || ''}? Se eliminarán también su juzgado y estado asociados. Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        type="danger"
      />
    </div>
  );
}

export default Peritajes;
