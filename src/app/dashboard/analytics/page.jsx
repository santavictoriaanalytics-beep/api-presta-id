'use client';

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  MapPin, 
  PieChart as PieIcon, 
  Activity,
  ArrowRight,
  ChevronRight,
  Percent,
  ShieldCheck as ShieldIcon,
  Calendar,
  Building2,
  Users as UsersIcon
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function AnalyticsPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isUsingCache, setIsUsingCache] = useState(false);
  const [month, setMonth] = useState(''); // '' means all time
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [lastSync, setLastSync] = useState(null);

  const loadAnalytics = async () => {
    setLoading(true);
    
    const saved = localStorage.getItem('b2b_cache');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.timestamp) setLastSync(parsed.timestamp);
        const customersArray = Array.isArray(parsed.customers) ? parsed.customers : (parsed.customers?.customers || []);
        setCustomers(customersArray);
        setIsUsingCache(true);
        setLoading(false);
        return;
      } catch (e) { console.error('Cache error'); }
    }

    try {
      const res = await fetch('/api/customers?limit=0,200');
      const data = await res.json();
      if (Array.isArray(data.customers)) {
        setCustomers(data.customers);
      }
    } catch (err) {
      console.error('Failed to fetch analytics data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();

    const handleRefresh = () => loadAnalytics();
    window.addEventListener('b2b-cache-updated', handleRefresh);
    window.addEventListener('storage', (e) => {
      if (e.key === 'b2b_cache') handleRefresh();
    });

    return () => {
      window.removeEventListener('b2b-cache-updated', handleRefresh);
      window.removeEventListener('storage', handleRefresh);
    };
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
        <div className="pulsing" style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>Cargando análisis avanzado...</div>
      </div>
    );
  }

  const getFilteredData = () => {
    const dataset = Array.isArray(customers) ? customers : [];
    if (month === '') return dataset;
    
    const targetMonthStr = `${year}-${month}`;
    return dataset.map(c => {
      const monthlyOrders = (c.orders || []).filter(o => o.date_add.startsWith(targetMonthStr));
      if (monthlyOrders.length === 0) return null;
      return {
        ...c,
        period_spent: monthlyOrders.reduce((sum, o) => sum + parseFloat(o.total_paid || 0), 0),
        period_orders: monthlyOrders.length
      };
    }).filter(Boolean);
  };

  const filteredData = getFilteredData();
  const b2bCount = filteredData.filter(c => c.type === 'B2B').length;
  const totalRevenue = filteredData.reduce((sum, c) => sum + (c.period_spent || parseFloat(c.total_spent) || 0), 0);
  
  // 2. City Distribution (Top 5)
  const cityMap = {};
  filteredData.forEach(c => {
    if (c.city) cityMap[c.city] = (cityMap[c.city] || 0) + 1;
  });
  const topCities = Object.entries(cityMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // 3. Data Completeness (VAT for B2B)
  const b2bWithVat = filteredData.filter(c => c.type === 'B2B' && c.vat_number).length;
  const vatCompleteness = b2bCount > 0 ? Math.round((b2bWithVat / b2bCount) * 100) : 0;

  // 4. Top Customers for Period
  const topCustomers = [...filteredData]
    .sort((a, b) => {
      const valA = a.period_spent !== undefined ? a.period_spent : parseFloat(a.total_spent || 0);
      const valB = b.period_spent !== undefined ? b.period_spent : parseFloat(b.total_spent || 0);
      return valB - valA;
    })
    .slice(0, 4);

  const months = [
    { v: '01', n: 'Enero' }, { v: '02', n: 'Febrero' }, { v: '03', n: 'Marzo' },
    { v: '04', n: 'Abril' }, { v: '05', n: 'Mayo' }, { v: '06', n: 'Junio' },
    { v: '07', n: 'Julio' }, { v: '08', n: 'Agosto' }, { v: '09', n: 'Septiembre' },
    { v: '10', n: 'Octubre' }, { v: '11', n: 'Noviembre' }, { v: '12', n: 'Diciembre' }
  ];

  return (
    <div className="fade-in">
      {/* Header Filters */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Rendimiento del Segmento</h3>
          {lastSync && (
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.25rem' }}>
              Base de datos: {new Date(lastSync).toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button 
            onClick={loadAnalytics}
            style={{ 
              background: 'rgba(255,255,255,0.05)', 
              border: '1px solid rgba(255,255,255,0.1)', 
              color: 'var(--text-secondary)', 
              padding: '0.5rem 1rem', 
              borderRadius: '12px', 
              fontSize: '0.8rem', 
              fontWeight: 600, 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Activity size={14} /> Recargar Datos
          </button>

          <div className="glass-card" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: '12px' }}>
            <Calendar size={16} color="var(--text-secondary)" />
            <select 
              value={month} 
              onChange={(e) => setMonth(e.target.value)}
              style={{ background: 'none', border: 'none', color: 'white', outline: 'none', cursor: 'pointer', fontSize: '0.85rem' }}
            >
              <option value="" style={{ color: '#333' }}>Histórico Total</option>
              {months.map(m => <option key={m.v} value={m.v} style={{ color: '#333' }}>{m.n}</option>)}
            </select>
            <select 
              value={year} 
              onChange={(e) => setYear(e.target.value)}
              style={{ background: 'none', border: 'none', color: 'white', outline: 'none', cursor: 'pointer', fontSize: '0.85rem' }}
            >
              <option value="2026" style={{ color: '#333' }}>2026</option>
              <option value="2025" style={{ color: '#333' }}>2025</option>
              <option value="2024" style={{ color: '#333' }}>2024</option>
            </select>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        
        {/* Revenue Stats */}
        <div className="glass-card analysis-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={20} color="var(--accent-primary)" /> Ingresos {month ? months.find(m => m.v === month).n : 'Totales'}
            </h3>
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem' }}>
            {totalRevenue.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 })}
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Total transaccionado por {filteredData.length} clientes B2B.
          </p>
          
          <div className="progress-container" style={{ marginTop: '2rem' }}>
             <motion.div 
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                className="progress-bar"
             />
          </div>
        </div>

        {/* Data Quality */}
        <div className="glass-card analysis-card">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldIcon size={20} color="#22c55e" /> Integridad Fiscal B2B
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
             <div style={{ position: 'relative', display: 'inline-block' }}>
                <svg width="100" height="100" viewBox="0 0 100 100">
                   <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                   <motion.circle 
                     cx="50" cy="50" r="44" fill="none" stroke="#22c55e" strokeWidth="6" 
                     initial={{ strokeDasharray: "0 276" }}
                     animate={{ strokeDasharray: `${276 * (vatCompleteness / 100)} 276` }}
                     transition={{ duration: 1.5, ease: "easeInOut" }}
                     transform="rotate(-90 50 50)" 
                     strokeLinecap="round" 
                   />
                </svg>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                   <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>{vatCompleteness}%</div>
                </div>
             </div>
             <div>
                <p style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 600 }}>Cuentas con RUT</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{b2bWithVat} de {b2bCount} empresas verificadas.</p>
             </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
        
        {/* Top Clients by Revenue */}
        <div className="glass-card">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Building2 size={20} color="var(--accent-primary)" /> Top Clientes ({month ? months.find(m => m.v === month).n : 'Histórico'})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {topCustomers.map((c, idx) => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700 }}>
                    {idx + 1}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{c.company || c.fullname}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{c.period_orders || c.order_count} compras</div>
                  </div>
                </div>
                <div style={{ fontWeight: 700, color: '#22c55e' }}>
                  {(c.period_spent !== undefined ? c.period_spent : parseFloat(c.total_spent || 0)).toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Geo Distribution */}
        <div className="glass-card">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MapPin size={20} color="var(--accent-primary)" /> Segmentación Geográfica
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            {topCities.map(([city, count], idx) => (
              <div key={city} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ width: '110px', fontSize: '0.85rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{city}</span>
                <div style={{ flex: 1, height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(count / (topCities[0] ? topCities[0][1] : 1)) * 100}%` }}
                    transition={{ duration: 0.8, delay: idx * 0.1 }}
                    style={{ height: '100%', background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)', borderRadius: '4px' }}
                  />
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{count}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
