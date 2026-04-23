'use client';

import React, { useState, useEffect } from 'react';
import { 
  UserPlus, 
  Mail, 
  Shield, 
  ShieldCheck, 
  Trash2, 
  AlertCircle,
  CheckCircle2,
  Loader2,
  MoreVertical
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, onSnapshot } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';

export default function TeamPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({ email: '', role: 'viewer', displayName: '' });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(usersList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAddUser = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage({ text: '', type: '' });

    try {
      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ 
          text: `✅ Miembro invitado. CLAVE TEMPORAL: ${data.tempPassword}. Por favor, entrégala al usuario.`, 
          type: 'success' 
        });
        setFormData({ email: '', role: 'viewer', displayName: '' });
        setTimeout(() => setShowAddForm(false), 8000); // Más tiempo para copiar
      } else {
        setMessage({ text: `❌ Error: ${data.error}`, type: 'error' });
      }
    } catch (err) {
      setMessage({ text: '❌ Error de conexión con el servidor.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="team-container" style={{ padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0, background: 'linear-gradient(90deg, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Miembros del Equipo
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Gestiona quién tiene acceso al panel de análisis.</p>
        </div>
        
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="glass-button"
          style={{ 
            background: 'var(--accent-primary)', 
            color: 'white', 
            border: 'none', 
            padding: '0.75rem 1.25rem', 
            borderRadius: '12px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: 'pointer'
          }}
        >
          <UserPlus size={18} />
          Invitar Miembro
        </button>
      </div>

      <AnimatePresence>
        {showAddForm && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="glass-card"
            style={{ marginBottom: '2rem', overflow: 'hidden', border: '1px solid var(--accent-primary)' }}
          >
            <form onSubmit={handleAddUser} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', padding: '1.5rem' }}>
              <div className="input-group">
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Nombre Completo</label>
                <input 
                  type="text" 
                  value={formData.displayName}
                  onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                  placeholder="Ej: Juan Pérez"
                  required
                  style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: 'white' }}
                />
              </div>
              <div className="input-group">
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Correo Electrónico</label>
                <input 
                  type="email" 
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="email@ejemplo.com"
                  required
                  style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: 'white' }}
                />
              </div>
              <div className="input-group">
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Rol de Acceso</label>
                <select 
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: 'white' }}
                >
                  <option value="viewer" style={{ background: '#0f172a' }}>Visualizador (Solo Lectura)</option>
                  <option value="admin" style={{ background: '#0f172a' }}>Administrador (Gestión)</option>
                  <option value="superadmin" style={{ background: '#0f172a' }}>Super Admin (Control Total)</option>
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button 
                  type="submit" 
                  disabled={submitting}
                  style={{ 
                    width: '100%', 
                    padding: '0.75rem', 
                    background: 'white', 
                    color: 'black', 
                    border: 'none', 
                    borderRadius: '8px', 
                    fontWeight: 700,
                    cursor: submitting ? 'not-allowed' : 'pointer' 
                  }}
                >
                  {submitting ? 'Enviando invitación...' : 'Enviar Invitación'}
                </button>
              </div>
              {message.text && (
                <div style={{ gridColumn: '1 / -1', padding: '1rem', borderRadius: '8px', background: message.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: message.type === 'success' ? '#4ade80' : '#f87171', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                  {message.text}
                </div>
              )}
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-glass)', background: 'rgba(255,255,255,0.02)' }}>
              <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Usuario</th>
              <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Rol</th>
              <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Estado</th>
              <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="4" style={{ padding: '3rem', textAlign: 'center' }}>
                  <Loader2 className="spinning" style={{ margin: '0 auto', color: 'var(--accent-primary)' }} />
                </td>
              </tr>
            ) : users.map((u) => (
              <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <td style={{ padding: '1rem 1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 600 }}>
                      {u.displayName?.[0] || u.email[0].toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{u.displayName || 'Sin Nombre'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{u.email}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '1rem 1.5rem' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.25rem 0.6rem', borderRadius: '20px', fontSize: '0.7rem', background: u.role === 'superadmin' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(59, 130, 246, 0.1)', color: u.role === 'superadmin' ? '#f59e0b' : '#3b82f6', border: '1px solid currentColor' }}>
                    {u.role === 'superadmin' ? <ShieldCheck size={12} /> : <Shield size={12} />}
                    {u.role.toUpperCase()}
                  </div>
                </td>
                <td style={{ padding: '1rem 1.5rem' }}>
                  <span style={{ fontSize: '0.8rem', color: '#4ade80', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80' }}></div>
                    Activo
                  </span>
                </td>
                <td style={{ padding: '1rem 1.5rem' }}>
                   <button style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                      <MoreVertical size={16} />
                   </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
