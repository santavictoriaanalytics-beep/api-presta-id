'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  TrendingUp, 
  ShoppingBag, 
  ArrowUpRight,
  UserPlus,
  ArrowRight,
  Database,
  Search,
  Activity
} from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  doc, 
  getDoc, 
  collection, 
  getDocs, 
  setDoc, 
  query,
  orderBy
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [stats, setStats] = useState([]);
  const [isUsingCache, setIsUsingCache] = useState(false);

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      
      // Try to load from cache
      const saved = localStorage.getItem('b2b_cache');
      let b2bData = null;
      if (saved) {
        try {
          b2bData = JSON.parse(saved);
          setIsUsingCache(true);
        } catch (e) {
          console.error('Cache error');
        }
      }

      // If no local cache, try to load from Cloud Firestore
      if (!b2bData) {
        try {
          const q = query(collection(db, 'b2b_data'), orderBy('syncedAt', 'desc'));
          const snapshot = await getDocs(q);
          const docs = [];
          snapshot.forEach(doc => docs.push(doc.data()));
          if (docs.length > 0) {
            b2bData = { customers: docs };
            setIsUsingCache(true);
            localStorage.setItem('b2b_cache', JSON.stringify(b2bData));
          }
        } catch (e) {
          console.error("Cloud load failed", e);
        }
      }

      try {
        if (b2bData) {
          const customerList = Array.isArray(b2bData.customers) ? b2bData.customers : (b2bData.customers?.customers || []);
          
          const sortedCustomers = [...customerList].sort((a, b) => {
            const dateA = a.last_purchase ? new Date(a.last_purchase).getTime() : 0;
            const dateB = b.last_purchase ? new Date(b.last_purchase).getTime() : 0;
            return dateB - dateA;
          });

          setCustomers(sortedCustomers.slice(0, 8));

          const now = new Date();
          const thisMonth = now.toISOString().substring(0, 7);
          const b2bCount = customerList.length;
          
          const monthlyOrders = customerList.reduce((acc, c) => {
              return acc + (c.orders || []).filter(o => o.date_add.startsWith(thisMonth)).length;
          }, 0);

          const totalSpent = customerList.reduce((acc, c) => acc + (parseFloat(c.total_spent) || 0), 0);

          setStats([
            { name: 'Clientes B2B', value: b2bCount, icon: Users, trend: '+4%', color: '#3b82f6' },
            { name: 'Ventas Totales B2B', value: totalSpent.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }), icon: TrendingUp, trend: '+12%', color: '#8b5cf6' },
            { name: 'Pedidos (Mes Actual)', value: monthlyOrders, icon: ShoppingBag, trend: '+8%', color: '#22c55e' },
            { name: 'Estado Sincro', value: 'En Caché', icon: Database, trend: 'Veloz', color: '#f59e0b' },
          ]);
        } else {
          setStats([
            { name: 'Clientes B2B', value: '—', icon: Users, trend: '—', color: '#3b82f6' },
            { name: 'Ventas Totales B2B', value: '—', icon: TrendingUp, trend: '—', color: '#8b5cf6' },
            { name: 'Pedidos (Mes Actual)', value: '—', icon: ShoppingBag, trend: '—', color: '#22c55e' },
            { name: 'Estado Sincro', value: 'Sin Datos', icon: Database, trend: 'Escanea Web', color: '#f59e0b' },
          ]);
        }
      } catch (err) {
        console.error('Dashboard load failed:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
        <div className="pulsing" style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>Cargando dashboard...</div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="stats-grid">
        {stats.map((item) => (
          <div key={item.name} className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div style={{ background: `${item.color}20`, padding: '0.75rem', borderRadius: '12px' }}>
                <item.icon size={24} color={item.color} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#22c55e', fontSize: '0.85rem', fontWeight: 600 }}>
                 <ArrowUpRight size={14} /> {item.trend}
              </div>
            </div>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
               {item.name}
            </span>
            <div className="stat-value" style={{ marginTop: '0.5rem', fontSize: '1.5rem', fontWeight: 700 }}>{item.value}</div>
          </div>
        ))}
      </div>

      <div className="dashboard-main-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
        <div className="glass-card" style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Última Actividad B2B</h3>
            <Link href="/dashboard/customers">
              <button style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                Ver todo <ArrowRight size={16} />
              </button>
            </Link>
          </div>
          
          <div style={{ overflowX: 'auto' }}>
            <table className="modern-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left' }}>
                  <th style={{ padding: '0 1rem 1rem', fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Cliente</th>
                  <th style={{ padding: '0 1rem 1rem', fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Última Compra</th>
                  <th style={{ padding: '0 1rem 1rem', fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Total Acumulado</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id}>
                    <td>
                       <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{c.company || c.fullname}</div>
                       <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{c.email}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.85rem' }}>
                        {c.last_purchase ? new Date(c.last_purchase).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' }) : '—'}
                      </div>
                    </td>
                    <td>
                       <div style={{ fontWeight: 700, color: '#22c55e', fontSize: '0.9rem' }}>
                          {parseFloat(c.total_spent || 0).toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 })}
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-card" style={{ background: isUsingCache ? 'linear-gradient(180deg, rgba(34, 197, 94, 0.05) 0%, transparent 100%)' : 'rgba(255,255,255,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{ padding: '0.5rem', background: isUsingCache ? 'rgba(34, 197, 94, 0.1)' : 'rgba(148, 163, 184, 0.1)', borderRadius: '8px' }}>
                <Activity size={20} color={isUsingCache ? '#22c55e' : '#94a3b8'} />
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Estado de la Información</h3>
            </div>
            
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: '1.6' }}>
              {isUsingCache 
                ? 'Estás utilizando la base de datos local escaneada. El rendimiento es óptimo y los análisis mensuales son instantáneos.' 
                : 'Estás conectado en tiempo real. Para habilitar búsquedas avanzadas y análisis mensuales rápidos, sincroniza los datos.'}
            </p>

            <Link href="/dashboard/customers">
              <button 
                className="glass-button" 
                style={{ 
                  width: '100%', 
                  padding: '0.85rem', 
                  borderRadius: '12px', 
                  background: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  color: '#60a5fa',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {isUsingCache ? 'Actualizar Escáner' : 'Escanear Ahora'}
              </button>
            </Link>
          </div>
          
          <div className="glass-card" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)', color: '#fff', border: 'none' }}>
             <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Análisis Inteligente</h3>
             <p style={{ fontSize: '0.8rem', opacity: 0.9, marginBottom: '1.5rem' }}>Usa la pestaña de Análisis para comparar el crecimiento mensual de tus clientes B2B.</p>
             <Link href="/dashboard/analytics">
               <button style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', border: 'none', background: '#fff', color: '#000', fontWeight: 700, cursor: 'pointer' }}>
                 Ver Estadísticas
               </button>
             </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
