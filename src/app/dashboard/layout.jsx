'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { 
  Users, 
  LayoutDashboard, 
  BarChart3, 
  Building2, 
  Settings, 
  LogOut,
  Database,
  Menu,
  X,
  HelpCircle,
  UserPlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState('viewer');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        try {
          const userRef = doc(db, 'users', currentUser.uid);
          const userDoc = await getDoc(userRef);
          
          if (userDoc.exists()) {
             setRole(userDoc.data().role || 'viewer');
          } else {
             // Si no existe, lo creamos como el primer administrador
             // Esto conectará tu usuario a la base de datos automáticamente
             const initialData = {
               email: currentUser.email,
               role: 'superadmin',
               createdAt: new Date().toISOString()
             };
             await setDoc(userRef, initialData);
             setRole('superadmin');
             console.log('Usuario conectado exitosamente a Firestore');
          }
        } catch (e) {
          console.error('Error de conexión con Firebase:', e);
          setRole('viewer');
        }
      } else {
        router.push('/login');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Logout error', error);
    }
  };

  const menuItems = [
    { name: 'Vista General', icon: LayoutDashboard, href: '/dashboard' },
    { name: 'Clientes B2B', icon: Users, href: '/dashboard/customers' },
    { name: 'Análisis Mensual', icon: BarChart3, href: '/dashboard/analytics' },
    { name: 'Ayuda / FAQ', icon: HelpCircle, href: '/dashboard/help' },
    ...(role === 'superadmin' ? [
      { name: 'Configuración', icon: Settings, href: '/dashboard/settings' },
      { name: 'Gestión de Equipo', icon: UserPlus, href: '/dashboard/team' }
    ] : []),
  ];

  const closeMenu = () => setIsMobileMenuOpen(false);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#030409', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="pulsing" style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>Verificando acceso...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-layout" style={{ background: 'radial-gradient(circle at top right, rgba(59, 130, 246, 0.05), transparent), radial-gradient(circle at bottom left, rgba(139, 92, 246, 0.05), transparent)' }}>
      
      {/* Mobile Toggle Button ... remains same ... */}
      <button 
        className="mobile-menu-btn" 
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        style={{ zIndex: 110 }}
      >
        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeMenu}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', zIndex: 90 }}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`sidebar modern-sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-icon">
             <Database size={22} color="white" />
          </div>
          <span className="brand-text">P+ MONITOR</span>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.name} href={item.href} style={{ textDecoration: 'none' }} onClick={closeMenu}>
                <motion.div 
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  className={`nav-item-modern ${isActive ? 'active' : ''}`}
                >
                  <div className="nav-icon-wrapper">
                    <item.icon size={18} />
                  </div>
                  <span>{item.name}</span>
                  {isActive && <motion.div layoutId="active-pill" className="active-pill" />}
                </motion.div>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile-mini">
            <div className="user-avatar">{user?.email?.[0].toUpperCase() || 'U'}</div>
            <div className="user-info">
              <span className="user-name" style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email || 'Admin'}</span>
              <span className="user-role" style={{ color: role === 'superadmin' ? '#f59e0b' : '#94a3b8' }}>
                {role === 'superadmin' ? 'Super Admin' : 'Visualizador'}
              </span>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            <LogOut size={18} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <header className="main-header">
           <div className="header-titles">
              <h2 className="header-title">
                {menuItems.find(i => i.href === pathname)?.name || 'Panel de Control'}
              </h2>
              <p className="header-subtitle">Monitorizando datos B2B en tiempo real</p>
           </div>
           <div className="header-actions">
              <div className="api-status">
                 <span className="status-dot pulsing"></span>
                 <span className="status-text">Seguro (Firebase)</span>
              </div>
           </div>
        </header>
        
        <div className="content-container">
          <motion.div
             initial={{ opacity: 0, y: 15 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.5, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
