'use client';

import React, { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  collection, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  query,
  orderBy
} from 'firebase/firestore';
import { 
  Settings, 
  Save, 
  Link as LinkIcon, 
  Key, 
  CheckCircle2, 
  AlertCircle, 
  ShieldAlert, 
  Users, 
  UserPlus, 
  Trash2, 
  ShieldCheck,
  Mail
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('ps'); // 'ps' or 'users'
  const [url, setUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState('loading');
  
  // Users Management State
  const [usersList, setUsersList] = useState([]);
  const [newUser, setNewUser] = useState({ email: '', role: 'viewer' });
  const [isAddingUser, setIsAddingUser] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const currentRole = userDoc.data().role || 'viewer';
            setRole(currentRole);
            if (currentRole === 'superadmin') {
              fetchUsers();
            }
          } else {
            setRole('viewer');
          }
        } catch (e) {
          setRole('viewer');
        }
      } else {
        setRole('unauthorized');
      }
    });

    // Load current config from Firestore
    const loadGlobalConfig = async () => {
      try {
        const configDoc = await getDoc(doc(db, 'config', 'prestashop'));
        if (configDoc.exists()) {
          const data = configDoc.data();
          if (data.url) setUrl(data.url);
          if (data.apiKey) setApiKey(data.apiKey);
          // Sync with localStorage for the client library
          localStorage.setItem('ps_url', data.url || '');
          localStorage.setItem('ps_key', data.apiKey || '');
        }
      } catch (e) {
        console.error("Error loading config from cloud", e);
      }
    };
    loadGlobalConfig();

    return () => unsubscribe();
  }, []);

  const fetchUsers = async () => {
    try {
      const q = query(collection(db, 'users'), orderBy('email'));
      const querySnapshot = await getDocs(q);
      const docs = [];
      querySnapshot.forEach(doc => {
        docs.push({ id: doc.id, ...doc.data() });
      });
      setUsersList(docs);
    } catch (e) {
      console.error("Error fetching users", e);
    }
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: '', message: '' });

    try {
      // Save for current browser
      localStorage.setItem('ps_url', url);
      localStorage.setItem('ps_key', apiKey);
      
      // Save to Cloud for all admins
      await setDoc(doc(db, 'config', 'prestashop'), {
        url,
        apiKey,
        updatedAt: new Date().toISOString(),
        updatedBy: auth.currentUser?.email
      });

      setStatus({ type: 'success', message: 'Configuración guardada en la NUBE con éxito.' });
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', message: 'No se pudo guardar la configuración en la nube.' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!newUser.email) return;

    try {
      // Nota: Aquí creamos la entrada en Firestore. El usuario deberá registrarse
      // con ese email y el sistema le asignará el rol automáticamente.
      const userRef = doc(collection(db, 'users')); // Creamos con ID aleatorio temporal si no tenemos el UID
      // Idealmente, usamos el email como ID si el usuario no existe aún para facilidades de búsqueda
      const id = newUser.email.replace(/\./g, '_');
      await setDoc(doc(db, 'users', id), {
        email: newUser.email,
        role: newUser.role,
        isPreAuthorized: true
      });
      setNewUser({ email: '', role: 'viewer' });
      setIsAddingUser(false);
      fetchUsers();
    } catch (e) {
      console.error("Error adding user", e);
    }
  };

  const handleDeleteUser = async (id) => {
    if (confirm('¿Estás seguro de eliminar a este usuario?')) {
      try {
        await deleteDoc(doc(db, 'users', id));
        fetchUsers();
      } catch (e) {
        console.error("Error deleting user", e);
      }
    }
  };

  const handleChangeRole = async (id, newRole) => {
    try {
      await updateDoc(doc(db, 'users', id), { role: newRole });
      fetchUsers();
    } catch (e) {
      console.error("Error changing role", e);
    }
  };

  if (role === 'loading') {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Verificando permisos...</div>;
  }

  if (role !== 'superadmin') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', textAlign: 'center' }}>
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '2rem', borderRadius: '50%', marginBottom: '1.5rem' }}>
          <ShieldAlert size={60} color="#ef4444" />
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>Acceso Restringido</h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '400px' }}>
          Solo los <b>Super Administradores</b> pueden acceder a la configuración global.
        </p>
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ maxWidth: '1000px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.5rem' }}>Panel de Control Admin</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Gestione la conexión con PrestaShop y los permisos de usuario.</p>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <button 
          onClick={() => setActiveTab('ps')}
          className="glass-card"
          style={{ 
            padding: '0.75rem 1.5rem', 
            background: activeTab === 'ps' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)',
            color: activeTab === 'ps' ? 'white' : 'var(--text-secondary)',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Settings size={18} /> Conexión PrestaShop
        </button>
        <button 
          onClick={() => setActiveTab('users')}
          className="glass-card"
          style={{ 
            padding: '0.75rem 1.5rem', 
            background: activeTab === 'users' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)',
            color: activeTab === 'users' ? 'white' : 'var(--text-secondary)',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Users size={18} /> Gestión de Usuarios
        </button>
      </div>

      {activeTab === 'ps' ? (
        <div className="glass-card" style={{ padding: '2.5rem' }}>
          <form onSubmit={handleSaveConfig} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <LinkIcon size={16} /> URL de la Tienda
              </label>
              <input 
                type="url" 
                placeholder="https://tu-tienda.com" 
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="input-modern"
                required
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Key size={16} /> Webservice API Key
              </label>
              <input 
                type="password" 
                placeholder="Ingrese su clave de 64 caracteres" 
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="input-modern"
                required
              />
            </div>

            {status.message && (
              <div style={{ 
                padding: '1rem', 
                borderRadius: '12px', 
                background: status.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                border: `1px solid ${status.type === 'success' ? '#22c55e' : '#ef4444'}`,
                color: status.type === 'success' ? '#22c55e' : '#ef4444',
                fontSize: '0.9rem'
              }}>
                {status.message}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary" style={{ cursor: loading ? 'not-allowed' : 'pointer' }}>
              <Save size={20} /> {loading ? 'Guardando...' : 'Guardar Configuración'}
            </button>
          </form>
        </div>
      ) : (
        <div className="glass-card" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h4 style={{ fontWeight: 700 }}>Usuarios Autorizados</h4>
            <button 
              onClick={() => setIsAddingUser(!isAddingUser)}
              className="btn-secondary"
              style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
            >
              <UserPlus size={16} /> Añadir Usuario
            </button>
          </div>

          {isAddingUser && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} style={{ marginBottom: '2rem', padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '15px', border: '1px dashed rgba(255,255,255,0.1)' }}>
              <form onSubmit={handleAddUser} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.5rem' }}>Email</label>
                  <input 
                    type="email" 
                    value={newUser.email}
                    onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                    placeholder="ejemplo@correo.com"
                    className="input-modern"
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.5rem' }}>Rol</label>
                  <select 
                    value={newUser.role}
                    onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                    className="input-modern"
                    style={{ background: '#1e293b' }}
                  >
                    <option value="viewer">Visualizador</option>
                    <option value="superadmin">Super Admin</option>
                  </select>
                </div>
                <button type="submit" className="btn-primary" style={{ padding: '0.75rem 1.5rem' }}>Autorizar</button>
              </form>
            </motion.div>
          )}

          <div className="users-table-container">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  <th style={{ padding: '1rem' }}>USUARIO</th>
                  <th style={{ padding: '1rem' }}>ROL</th>
                  <th style={{ padding: '1rem' }}>ESTADO</th>
                  <th style={{ padding: '1rem', textAlign: 'right' }}>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {usersList.map((u) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div className="user-avatar" style={{ width: '32px', height: '32px', fontSize: '12px' }}>{u.email?.[0].toUpperCase()}</div>
                        <span style={{ fontSize: '0.9rem' }}>{u.email}</span>
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <select 
                        value={u.role}
                        onChange={(e) => handleChangeRole(u.id, e.target.value)}
                        style={{ background: 'none', border: 'none', color: u.role === 'superadmin' ? '#fbbf24' : '#94a3b8', fontSize: '0.85rem', cursor: 'pointer', outline: 'none' }}
                      >
                        <option value="viewer" style={{ background: '#0f172a' }}>Visualizador</option>
                        <option value="superadmin" style={{ background: '#0f172a' }}>Super Admin</option>
                      </select>
                    </td>
                    <td style={{ padding: '1rem' }}>
                       <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', background: 'rgba(34, 197, 94, 0.1)', color: '#4ade80', borderRadius: '20px' }}>Activo</span>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <button 
                        onClick={() => handleDeleteUser(u.id)}
                        disabled={u.email === auth.currentUser?.email}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', opacity: u.email === auth.currentUser?.email ? 0.3 : 1 }}
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <style jsx>{`
        .input-modern {
          padding: 1rem;
          border: 1px solid rgba(255,255,255,0.05);
          background: rgba(255,255,255,0.02);
          color: white;
          border-radius: 12px;
          outline: none;
          transition: all 0.2s;
          width: 100%;
        }
        .input-modern:focus {
          border-color: var(--accent-primary);
          background: rgba(255,255,255,0.05);
        }
        .btn-primary {
          background: var(--accent-primary);
          border: none;
          color: white;
          padding: 1rem 2rem;
          border-radius: 12px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.2s;
        }
        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }
        .btn-secondary {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          color: white;
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
