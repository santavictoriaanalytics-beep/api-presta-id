import Link from 'next/link';
import { Database, ShieldCheck, Zap, ArrowRight } from 'lucide-react';

export default function LandingPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(circle at top right, #1e293b, #020617)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
      
      <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '1rem', borderRadius: '20px', marginBottom: '2rem' }}>
         <Database size={48} color="#3b82f6" />
      </div>

      <h1 style={{ fontSize: '3.5rem', fontWeight: 800, letterSpacing: '-0.04em', marginBottom: '1rem', background: 'linear-gradient(to bottom, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        PrestaMonitor Panel
      </h1>
      
      <p style={{ fontSize: '1.25rem', color: '#94a3b8', maxWidth: '600px', marginBottom: '3rem' }}>
        El panel administrativo definitivo para el análisis y monitoreo de clientes B2B en PrestaShop 1.7, 8 y 9.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem', maxWidth: '800px', marginBottom: '4rem' }}>
         <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#3b82f6', marginBottom: '0.5rem' }}><ShieldCheck size={28} style={{ margin: '0 auto' }} /></div>
            <h4 style={{ fontWeight: 600 }}>Seguro</h4>
            <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Conexión directa v&iacute;a Webservice API</p>
         </div>
         <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#3b82f6', marginBottom: '0.5rem' }}><Zap size={28} style={{ margin: '0 auto' }} /></div>
            <h4 style={{ fontWeight: 600 }}>Rápido</h4>
            <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Optimizado con Next.js App Router</p>
         </div>
      </div>

      <Link href="/dashboard" style={{ textDecoration: 'none' }}>
        <button className="glass-card" style={{ padding: '1rem 2.5rem', fontSize: '1.1rem', fontWeight: 700, background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', transition: 'transform 0.2s' }}>
          Entrar al Panel <ArrowRight size={20} />
        </button>
      </Link>

      <div style={{ marginTop: '4rem', fontSize: '0.85rem', color: '#475569' }}>
         Compatible con PrestaShop 1.7.x | 8.x | 9.x
      </div>
    </div>
  );
}
