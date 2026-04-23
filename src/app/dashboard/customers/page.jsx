'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Search, 
  Filter, 
  Mail, 
  Calendar, 
  ChevronRight, 
  MoreHorizontal,
  Building2,
  FileText,
  AlertCircle,
  Phone,
  MapPin,
  ExternalLink,
  Users,
  ShoppingBag,
  Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '@/lib/firebase';
import { collection, getDocs, setDoc, doc } from 'firebase/firestore';

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerDetails, setCustomerDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  
  // Filtering state
  const [month, setMonth] = useState(''); // '' means all time
  const [year, setYear] = useState(new Date().getFullYear().toString());
  
  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState('');
  const [isUsingCache, setIsUsingCache] = useState(false);
  const [cachedData, setCachedData] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'last_purchase', direction: 'desc' });
  const [showExplanation, setShowExplanation] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  // Load Cache on Mount
  useEffect(() => {
    const initData = async () => {
      const saved = localStorage.getItem('b2b_cache');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const customersArray = Array.isArray(parsed.customers) ? parsed.customers : (parsed.customers?.customers || []);
          setCachedData({ ...parsed, customers: customersArray });
          setIsUsingCache(true);
          setTotal(customersArray.length);
        } catch (e) {
          console.error("Malformed cache", e);
        }
      } else {
        // Try to load from Cloud if local is empty
        setLoading(true);
        try {
          const snapshot = await getDocs(collection(db, 'b2b_data'));
          const docs = [];
          snapshot.forEach(doc => docs.push(doc.data()));
          if (docs.length > 0) {
            const cacheObj = {
              timestamp: new Date().toISOString(),
              customers: docs
            };
            setCachedData(cacheObj);
            setIsUsingCache(true);
            setTotal(docs.length);
            localStorage.setItem('b2b_cache', JSON.stringify(cacheObj));
          }
        } catch (e) {
          console.error("Error loading from cloud", e);
        } finally {
          setLoading(false);
        }
      }
    };
    initData();
  }, []);

  const handleSync = async () => {
    setSyncError('');
    
    // Validate credentials before starting
    const psUrl = localStorage.getItem('ps_url');
    const psKey = localStorage.getItem('ps_key');
    if (!psUrl || !psKey) {
      setSyncError('⚠️ Credenciales no configuradas. Ve a Configuración e ingresa la URL y la API Key de tu tienda PrestaShop.');
      return;
    }

    setIsSyncing(true);
    try {
      const { PrestaShopClient } = await import('@/lib/prestashop');
      const client = new PrestaShopClient(psUrl, psKey);
      const scanResult = await client.scanB2B();
      const b2bCustomers = scanResult.customers || [];
      
      if (b2bCustomers && b2bCustomers.length > 0) {
        // Save to LocalStorage
        const cacheObj = {
          timestamp: new Date().toISOString(),
          customers: b2bCustomers
        };
        localStorage.setItem('b2b_cache', JSON.stringify(cacheObj));
        setCachedData(cacheObj);
        setIsUsingCache(true);
        setPage(1);
        setTotal(b2bCustomers.length);

        // Save to Firestore Cloud (One doc per customer for durability)
        const batchSize = 100;
        for (let i = 0; i < Math.min(b2bCustomers.length, 1000); i += batchSize) {
            const chunk = b2bCustomers.slice(i, i + batchSize);
            await Promise.all(chunk.map(c => 
                setDoc(doc(db, 'b2b_data', String(c.id)), {
                    ...c,
                    syncedAt: new Date().toISOString()
                }, { merge: true })
            ));
        }
      }
    } catch (err) {
      console.error('Sync failed:', err);
      setSyncError(`Error durante el escaneo: ${err.message || 'Error desconocido. Verifica tu URL y API Key en Configuración.'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSort = (key) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const fetchCustomers = async (p = 1) => {
    // En modo estático, siempre usamos el caché o invitamos a escanear
    if (isUsingCache && cachedData) return;
    setLoading(false);
  };

  useEffect(() => {
    if (!isUsingCache) {
      fetchCustomers(page);
    }
  }, [page, month, year, isUsingCache]);

  const handleNextPage = () => {
    if (hasMore) setPage(prev => prev + 1);
  };

  const handlePrevPage = () => {
    if (page > 1) setPage(prev => prev - 1);
  };

  // Local Filtering & Sorting Logic
  const getDisplayCustomers = () => {
    let results = [];
    
    if (!isUsingCache || !cachedData || !Array.isArray(cachedData.customers)) {
       results = customers.filter(c => {
         return (c.fullname || '').toLowerCase().includes(search.toLowerCase()) || 
                (c.company || '').toLowerCase().includes(search.toLowerCase()) ||
                (c.vat_number || '').includes(search);
       });
    } else {
      // Filter by month/year LOCALLY from orders in cache
      results = cachedData.customers.map(c => {
         if (month === '') return c;

         const targetMonthStr = `${year}-${month}`;
         const monthlyOrders = (c.orders || []).filter(o => o.date_add.startsWith(targetMonthStr));
         
         if (monthlyOrders.length === 0) return null; // Didn't buy this month

         const monthlyTotal = monthlyOrders.reduce((sum, o) => sum + parseFloat(o.total_paid || 0), 0);
         return {
           ...c,
           total_spent: monthlyTotal,
           order_count: monthlyOrders.length,
           last_purchase: monthlyOrders[0].date_add
         };
      }).filter(Boolean);

      // Search filter
      results = results.filter(c => {
        return (c.fullname || '').toLowerCase().includes(search.toLowerCase()) || 
               (c.company || '').toLowerCase().includes(search.toLowerCase()) ||
               (c.vat_number || '').includes(search);
      });
    }

    // Apply Sorting
    results.sort((a, b) => {
      let valA = a[sortConfig.key];
      let valB = b[sortConfig.key];

      if (sortConfig.key === 'total_spent' || sortConfig.key === 'order_count') {
        valA = parseFloat(valA || 0);
        valB = parseFloat(valB || 0);
      } else if (sortConfig.key === 'last_purchase' || sortConfig.key === 'date_add') {
        valA = valA ? new Date(valA).getTime() : 0;
        valB = valB ? new Date(valB).getTime() : 0;
      } else {
        valA = String(valA || '').toLowerCase();
        valB = String(valB || '').toLowerCase();
      }

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    // Pagination
    if (isUsingCache) {
      const pageSize = 50;
      const start = (page - 1) * pageSize;
      return results.slice(start, start + pageSize);
    }
    
    return results;
  };

  const filteredCustomers = getDisplayCustomers();

  // Update total/hasMore when using cache
  useEffect(() => {
    if (isUsingCache && cachedData && Array.isArray(cachedData.customers)) {
        let results = cachedData.customers;
        if (month !== '') {
            const targetMonthStr = `${year}-${month}`;
            results = results.filter(c => (c.orders || []).some(o => o.date_add.startsWith(targetMonthStr)));
        }
        setTotal(results.length);
        setHasMore(results.length > page * 50);
    }
  }, [isUsingCache, cachedData, month, year, page]);

  const handleSelect = async (customer) => {
    // En modo estático, los detalles ya están en el objeto del cliente (incluyendo pedidos escaneados)
    setSelectedCustomer(customer);
    setCustomerDetails(customer);
  };

  const months = [
    { v: '01', n: 'Enero' }, { v: '02', n: 'Febrero' }, { v: '03', n: 'Marzo' },
    { v: '04', n: 'Abril' }, { v: '05', n: 'Mayo' }, { v: '06', n: 'Junio' },
    { v: '07', n: 'Julio' }, { v: '08', n: 'Agosto' }, { v: '09', n: 'Septiembre' },
    { v: '10', n: 'Octubre' }, { v: '11', n: 'Noviembre' }, { v: '12', n: 'Diciembre' }
  ];

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', gap: '1rem', flexWrap: 'wrap' }}>
         <div style={{ flex: 1, minWidth: '300px' }}>
            <h3 style={{ fontSize: '1.75rem', fontWeight: 700, background: 'linear-gradient(to right, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '0.25rem' }}>
                Directorio B2B {total > 0 && <span style={{ fontSize: '1rem', color: 'var(--accent-primary)', opacity: 0.8 }}>({total} total)</span>}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Gestión y monitoreo de cuentas corporativas.
              <button 
                onClick={() => setShowExplanation(!showExplanation)}
                style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, textDecoration: 'underline' }}
              >
                ¿Cómo funciona el Escáner?
              </button>
            </p>
         </div>
         
         <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
             <button 
                onClick={handleSync} 
                disabled={isSyncing}
                className={`glass-button sync-btn ${isSyncing ? 'loading' : ''}`}
                style={{ 
                  padding: '0.5rem 1.25rem', 
                  borderRadius: '12px', 
                  background: isSyncing ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  color: '#60a5fa',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  cursor: isSyncing ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease'
                }}
             >
                <div style={{ animation: isSyncing ? 'spin 1s linear infinite' : 'none', display: 'flex' }}>
                   <Activity size={16} />
                </div>
                {isSyncing ? 'Escaneando...' : 'Escanear Web'}
             </button>

             <div 
               onClick={() => cachedData && setIsUsingCache(!isUsingCache)}
               style={{ 
                 padding: '0.5rem 1rem', 
                 borderRadius: '12px', 
                 background: isUsingCache ? 'rgba(34, 197, 94, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                 border: `1px solid ${isUsingCache ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255, 255, 255, 0.1)'}`,
                 color: isUsingCache ? '#4ade80' : 'var(--text-secondary)',
                 fontSize: '0.85rem',
                 fontWeight: 600,
                 cursor: cachedData ? 'pointer' : 'not-allowed',
                 display: 'flex',
                 alignItems: 'center',
                 gap: '0.5rem',
                 opacity: cachedData ? 1 : 0.5
               }}
             >
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isUsingCache ? '#4ade80' : '#94a3b8' }}></div>
                {isUsingCache ? 'Modo Local (Veloz)' : 'Modo Live'}
             </div>
         </div>
      </div>

      <AnimatePresence>
        {showExplanation && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ overflow: 'hidden', marginBottom: '2rem' }}
          >
            <div className="glass-card" style={{ background: 'rgba(59, 130, 246, 0.03)', border: '1px solid rgba(59, 130, 246, 0.1)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                <div>
                  <h4 style={{ color: '#60a5fa', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 700 }}>🔍 EL ESCÁNER</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                    Busca en toda tu base de datos de PrestaShop (hasta 30,000 registros) para identificar quiénes son B2B analizando RUTs y nombres de empresa. Guarda todo en tu navegador para que el sistema vuele.
                  </p>
                </div>
                <div>
                  <h4 style={{ color: '#4ade80', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 700 }}>⚡ MODO LOCAL (CACHÉ)</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                    Usa los datos guardados en tu PC. Es instantáneo y permite filtrar meses sin esperar al servidor. <strong>Úsalo para análisis rápido y comparativas mensuales.</strong>
                  </p>
                </div>
                <div>
                  <h4 style={{ color: '#94a3b8', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 700 }}>🌐 MODO LIVE</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                    Consulta directamente a PrestaShop en tiempo real. Es más lento pero te asegura ver al cliente que se acaba de registrar en este mismo segundo.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {syncError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{ marginBottom: '1.5rem' }}
          >
            <div style={{
              padding: '1rem 1.25rem',
              borderRadius: '12px',
              background: 'rgba(251, 191, 36, 0.08)',
              border: '1px solid rgba(251, 191, 36, 0.25)',
              color: '#fbbf24',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              flexWrap: 'wrap'
            }}>
              <span>{syncError}</span>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexShrink: 0 }}>
                <Link href="/dashboard/settings" style={{ color: '#fbbf24', fontWeight: 700, fontSize: '0.8rem', textDecoration: 'underline' }}>
                  Ir a Configuración →
                </Link>
                <button onClick={() => setSyncError('')} style={{ background: 'none', border: 'none', color: '#fbbf24', cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }}>✕</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
            <div className="glass-card" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: '12px' }}>
                <Calendar size={16} color="var(--text-secondary)" />
                <select 
                  value={month} 
                  onChange={(e) => { setMonth(e.target.value); setPage(1); }}
                  style={{ background: 'none', border: 'none', color: 'white', outline: 'none', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  <option value="" style={{ color: '#333' }}>Todos los meses</option>
                  {months.map(m => <option key={m.v} value={m.v} style={{ color: '#333' }}>{m.n}</option>)}
                </select>
                <select 
                  value={year} 
                  onChange={(e) => { setYear(e.target.value); setPage(1); }}
                  style={{ background: 'none', border: 'none', color: 'white', outline: 'none', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  <option value="2026" style={{ color: '#333' }}>2026</option>
                  <option value="2025" style={{ color: '#333' }}>2025</option>
                  <option value="2024" style={{ color: '#333' }}>2024</option>
                  <option value="2023" style={{ color: '#333' }}>2023</option>
                </select>
            </div>

            <div className="glass-card" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', borderRadius: '12px', minWidth: '280px' }}>
                <Search size={18} color="var(--text-secondary)" />
                <input 
                type="text" 
                placeholder="Filtrar por RUT o nombre..." 
                className="transparent-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ background: 'none', border: 'none', outline: 'none', color: 'white', width: '100%', fontSize: '0.9rem' }}
                />
            </div>
      </div>

      <div className="customer-grid-container">
        
        {/* Table View */}
        <div className="glass-card table-section" style={{ padding: '0', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
            <table className="modern-table" style={{ borderSpacing: '0', width: '100%' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <th 
                    onClick={() => handleSort('fullname')}
                    style={{ padding: '1.25rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    CLIENTE / EMPRESA {sortConfig.key === 'fullname' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600, textAlign: 'left' }}>IDENTIFICACIÓN</th>
                  <th 
                    onClick={() => handleSort('total_spent')}
                    style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600, textAlign: 'left', cursor: 'pointer' }}
                  >
                    TOTAL GASTADO {sortConfig.key === 'total_spent' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    onClick={() => handleSort('last_purchase')}
                    style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600, textAlign: 'left', cursor: 'pointer' }}
                  >
                    ÚLTIMA COMPRA {sortConfig.key === 'last_purchase' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th style={{ width: '60px' }}></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                   <tr><td colSpan="5" style={{ textAlign: 'center', padding: '6rem' }}>
                      <div className="pulsing" style={{ color: 'var(--accent-primary)', fontSize: '1rem', fontWeight: 600 }}>Sincronizando con PrestaShop...</div>
                   </td></tr>
                ) : (
                  <>
                    {filteredCustomers.map(c => (
                       <tr key={c.id} onClick={() => handleSelect(c)} style={{ cursor: 'pointer', transition: 'background 0.2s' }} className={selectedCustomer?.id === c.id ? 'active-row' : ''}>
                         <td style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                            <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#fff', marginBottom: '0.2rem' }}>{c.company || c.fullname}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                               <Users size={12} opacity={0.6} /> {c.fullname}
                            </div>
                         </td>
                         <td style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                            {c.vat_number ? (
                               <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <Building2 size={14} color="#6366f1" />
                                  <span style={{ fontSize: '0.85rem', color: '#cbd5e1', letterSpacing: '0.01em' }}>{c.vat_number}</span>
                               </div>
                            ) : (
                               <span style={{ color: '#f87171', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(248, 113, 113, 0.05)', padding: '0.2rem 0.5rem', borderRadius: '4px', width: 'fit-content' }}>
                                  <AlertCircle size={12} /> DATOS INCOMPLETOS
                               </span>
                            )}
                         </td>
                         <td style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                            <div style={{ fontWeight: 700, color: '#22c55e', fontSize: '0.9rem' }}>
                               {parseFloat(c.total_spent || 0).toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}
                            </div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{c.order_count} pedidos</div>
                         </td>
                         <td style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                               <Calendar size={14} color="#94a3b8" />
                               <span style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>{c.last_purchase ? new Date(c.last_purchase).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Sin pedidos'}</span>
                            </div>
                         </td>
                         <td style={{ paddingRight: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.03)', textAlign: 'right' }}>
                            <ChevronRight size={18} color="rgba(255,255,255,0.2)" />
                         </td>
                       </tr>
                    ))}
                    {filteredCustomers.length === 0 && (
                       <tr><td colSpan="5" style={{ textAlign: 'center', padding: '6rem', color: 'var(--text-secondary)' }}>No hay resultados B2B en esta página.</td></tr>
                    )}
                  </>
                )}
              </tbody>
            </table>
            
            {!loading && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1.5rem', gap: '2rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <button 
                  onClick={handlePrevPage} 
                  disabled={page === 1}
                  className="glass-button"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)', borderRadius: '8px', padding: '0.5rem 1rem', color: 'white', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.3 : 1 }}
                >
                  Anterior
                </button>
                <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Página {page}</span>
                <button 
                  onClick={handleNextPage} 
                  disabled={!hasMore}
                  className="glass-button"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)', borderRadius: '8px', padding: '0.5rem 1rem', color: 'white', cursor: !hasMore ? 'not-allowed' : 'pointer', opacity: !hasMore ? 0.3 : 1 }}
                >
                  Siguiente
                </button>
              </div>
            )}
        </div>

        {/* Detail Panel */}
        <AnimatePresence>
          {selectedCustomer && (
            <motion.div 
               initial={{ x: 20, opacity: 0 }}
               animate={{ x: 0, opacity: 1 }}
               exit={{ x: 20, opacity: 0 }}
               className="glass-card" 
               style={{ position: 'sticky', top: '0', background: 'var(--bg-secondary)', borderLeft: '2px solid var(--accent-primary)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
                 <h4 style={{ fontWeight: 600 }}>Detalle del Cliente</h4>
                 <button onClick={() => { setSelectedCustomer(null); setCustomerDetails(null); }} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>✕</button>
              </div>

              {loadingDetails ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                   <div className="skeleton" style={{ height: '80px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)' }}></div>
                   <div className="skeleton" style={{ height: '40px', background: 'rgba(255,255,255,0.03)' }}></div>
                   <div className="skeleton" style={{ height: '150px', background: 'rgba(255,255,255,0.02)' }}></div>
                </div>
              ) : (
                <div className="fade-in">
                  <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                     <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'var(--accent-primary)', margin: '0 auto 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 700 }}>
                        {selectedCustomer.fullname[0]}
                     </div>
                     <h3 style={{ fontSize: '1.1rem' }}>{selectedCustomer.fullname}</h3>
                     <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{selectedCustomer.company || 'Cuenta Particular'}</p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem' }}>
                        <Mail size={16} color="var(--text-secondary)" /> {selectedCustomer.email}
                     </div>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem' }}>
                        <Phone size={16} color="var(--text-secondary)" /> {selectedCustomer.phone || 'Sin teléfono'}
                     </div>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem' }}>
                        <MapPin size={16} color="var(--text-secondary)" /> {selectedCustomer.city || 'Sin Comuna'} {selectedCustomer.address ? `(${selectedCustomer.address})` : ''}
                     </div>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem' }}>
                        <Calendar size={16} color="var(--text-secondary)" /> Registrado: {new Date(selectedCustomer.date_add).toLocaleDateString()}
                     </div>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem' }}>
                        <Building2 size={16} color="var(--text-secondary)" /> RUT/IVA: {selectedCustomer.vat_number || 'No registrado'}
                     </div>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem', marginTop: '0.5rem', padding: '0.75rem', background: 'rgba(34, 197, 94, 0.05)', borderRadius: '10px', border: '1px solid rgba(34, 197, 94, 0.1)' }}>
                        <ShoppingBag size={16} color="#22c55e" /> 
                        <span style={{ fontWeight: 600 }}>Total Histórico:</span>
                        <span style={{ color: '#22c55e', fontWeight: 800, fontSize: '1rem' }}>
                           {parseFloat(selectedCustomer.total_spent || 0).toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}
                        </span>
                     </div>
                  </div>

                  <a 
                    href={selectedCustomer.ps_link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        gap: '0.5rem', 
                        width: '100%', 
                        padding: '0.75rem', 
                        background: 'rgba(255,255,255,0.05)', 
                        border: '1px solid var(--border-glass)', 
                        borderRadius: '10px',
                        color: 'white',
                        textDecoration: 'none',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        marginBottom: '1.5rem'
                    }}
                  >
                     Ver en PrestaShop <ExternalLink size={14} />
                  </a>

                  <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '1.5rem' }}>
                     <h5 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FileText size={16} /> ÚLTIMAS COMPRAS ({customerDetails?.orders?.length || 0})
                     </h5>
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '300px', overflowY: 'auto' }}>
                        {customerDetails?.orders?.map(order => {
                          const isExpanded = expandedOrderId === order.id;
                          return (
                            <div 
                              key={order.id} 
                              onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                              style={{ 
                                padding: '0.85rem', 
                                background: isExpanded ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)', 
                                borderRadius: '10px',
                                cursor: 'pointer',
                                border: isExpanded ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid transparent',
                                transition: 'all 0.2s ease',
                                marginBottom: '0.5rem'
                              }}
                            >
                               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                  <div>
                                     <div style={{ fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        Pedido #{order.id} {order.reference && <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>({order.reference})</span>}
                                     </div>
                                     <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{new Date(order.date_add).toLocaleDateString()}</div>
                                  </div>
                                  <div style={{ textAlign: 'right' }}>
                                     <div style={{ fontWeight: 700, color: '#22c55e', fontSize: '0.9rem' }}>
                                         {parseFloat(order.total_paid).toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}
                                     </div>
                                     <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>{order.payment}</div>
                                  </div>
                               </div>

                               {isExpanded && (
                                  <motion.div 
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.75rem', marginTop: '0.75rem' }}
                                  >
                                     <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        <ShoppingBag size={12} /> Productos
                                     </div>
                                     <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                        {(() => {
                                           const items = order.items ? (Array.isArray(order.items) ? order.items : [order.items]) : [];
                                           return items.map((item, idx) => (
                                              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', background: 'rgba(0,0,0,0.1)', padding: '0.5rem 0.75rem', borderRadius: '8px' }}>
                                                 <div style={{ flex: 1, paddingRight: '0.5rem' }}>
                                                    <span style={{ fontWeight: 800, color: 'white' }}>{item.product_quantity}x</span> {item.product_name}
                                                    <div style={{ fontSize: '0.65rem', opacity: 0.5 }}>Ref: {item.product_reference || 'N/A'}</div>
                                                 </div>
                                                 <div style={{ fontWeight: 700, color: '#fff' }}>
                                                    {parseFloat(item.unit_price_tax_incl || item.product_price || 0).toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}
                                                 </div>
                                              </div>
                                           ));
                                        })()}
                                        {(!order.items || (Array.isArray(order.items) && order.items.length === 0)) && (
                                           <div style={{ fontSize: '0.7rem', opacity: 0.5, fontStyle: 'italic', textAlign: 'center', padding: '0.5rem' }}>
                                              Detalle no disponible. Realiza un nuevo escaneo para actualizar la base de datos.
                                           </div>
                                        )}
                                     </div>
                                  </motion.div>
                               )}
                            </div>
                          );
                        })}
                        {(!customerDetails?.orders || customerDetails.orders.length === 0) && (
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem' }}>No hay pedidos anteriores.</p>
                        )}
                     </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
