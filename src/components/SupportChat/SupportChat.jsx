import React, { useState, useRef, useEffect } from 'react';
import './SupportChat.css';
import { uploadPaymentReceipt } from '../../lib/membershipPayments';

const EDGE_FUNCTION_URL =
  process.env.REACT_APP_SUPPORT_CHAT_URL ||
  'https://ljynujodigqqujjvyoud.supabase.co/functions/v1/support-chat';

const SUPABASE_ANON_KEY =
  process.env.REACT_APP_SUPABASE_ANON_KEY ||
  require('../../lib/supabaseClient').SUPABASE_ANON_KEY;

const WELCOME =
  '¡Hola! 🦉 Soy Buhobot Soporte. ¿En qué te puedo ayudar con la app?';

function SupportChat({ appId, userEmail }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem(`support-chat-${appId}`);
      return saved ? JSON.parse(saved) : [{ role: 'assistant', content: WELCOME }];
    } catch {
      return [{ role: 'assistant', content: WELCOME }];
    }
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  useEffect(() => {
    const openSupportChat = () => setOpen(true);
    window.addEventListener('psi-support-chat:open', openSupportChat);
    return () => window.removeEventListener('psi-support-chat:open', openSupportChat);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(`support-chat-${appId}`, JSON.stringify(messages.slice(-60)));
    } catch {
      /* storage lleno: ignorar */
    }
  }, [messages, appId]);

  const send = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const next = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          app: appId,
          messages: next
            .filter((m) => m.role === 'user' || m.role === 'assistant')
            .map((m) => ({ role: m.role, content: m.content })),
          user_email: userEmail || localStorage.getItem('user_email') || null,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.detail || data.error || 'Error de conexión');
      }
      setMessages([...next, { role: 'assistant', content: data.reply || '…' }]);
    } catch (err) {
      setError('No pude conectarme con soporte. Probá de nuevo en un momento 🙏');
      console.error('[SupportChat]', err);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([{ role: 'assistant', content: WELCOME }]);
    setError(null);
  };

  const sendReceipt = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || loading) return;

    const email = userEmail || localStorage.getItem('user_email');
    if (!email) {
      setError('Iniciá sesión para enviar un comprobante de pago.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await uploadPaymentReceipt(email, file);
      setMessages((current) => [
        ...current,
        { role: 'user', content: `📎 Comprobante adjunto: ${file.name}` },
        {
          role: 'assistant',
          content:
            'Recibí el comprobante y se lo envié al administrador para que lo revise. El pago todavía no está confirmado.',
        },
      ]);
    } catch (err) {
      setError(err.message || 'No se pudo enviar el comprobante. Probá de nuevo.');
      console.error('[SupportChat receipt]', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="support-chat-widget">
      {open && (
        <div className="support-chat-panel">
          <div className="support-chat-header">
            <span className="support-chat-title">🦉 Buhobot Soporte</span>
            <div className="support-chat-header-actions">
              <button
                className="support-chat-clear"
                onClick={clearChat}
                title="Limpiar conversación"
              >
                🧹
              </button>
              <button
                className="support-chat-close"
                onClick={() => setOpen(false)}
                title="Cerrar"
              >
                ✕
              </button>
            </div>
          </div>
          <div className="support-chat-messages">
            {messages.map((m, i) => (
              <div key={i} className={`support-chat-msg ${m.role}`}>
                {m.content}
              </div>
            ))}
            {loading && (
              <div className="support-chat-msg assistant support-chat-typing">
                <span></span>
                <span></span>
                <span></span>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
          {error && <div className="support-chat-error">{error}</div>}
          <form className="support-chat-input-row" onSubmit={send}>
            <input
              ref={fileInputRef}
              className="support-chat-file-input"
              type="file"
              accept="application/pdf,image/jpeg,image/png"
              onChange={sendReceipt}
              aria-label="Adjuntar comprobante"
            />
            <button
              className="support-chat-attach"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading || !(userEmail || localStorage.getItem('user_email'))}
              title="Adjuntar comprobante PDF, JPG o PNG"
              aria-label="Adjuntar comprobante"
            >
              📎
            </button>
            <input
              className="support-chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribí tu consulta…"
              disabled={loading}
              maxLength={4000}
            />
            <button
              className="support-chat-send"
              type="submit"
              disabled={loading || !input.trim()}
            >
              ➤
            </button>
          </form>
        </div>
      )}
      <button
        className="support-chat-fab"
        onClick={() => setOpen((o) => !o)}
        title="Soporte Técnico"
      >
        {open ? '✕' : '💬'}
      </button>
    </div>
  );
}

export default SupportChat;
