'use client';

import React, { useState } from 'react';
import { 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  BookOpen, 
  Zap, 
  ShieldCheck, 
  Database,
  TrendingUp,
  Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const FAQItem = ({ question, answer, icon: Icon }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="glass-card" style={{ padding: '0', overflow: 'hidden', marginBottom: '1rem', border: `1px solid ${isOpen ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255, 255, 255, 0.05)'}` }}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{ 
          width: '100%', 
          padding: '1.25rem 1.5rem', 
          background: 'none', 
          border: 'none', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          cursor: 'pointer',
          textAlign: 'left'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ color: isOpen ? '#60a5fa' : 'var(--text-secondary)' }}>
            <Icon size={20} />
          </div>
          <span style={{ fontSize: '1rem', fontWeight: 600, color: isOpen ? '#fff' : '#cbd5e1' }}>{question}</span>
        </div>
        {isOpen ? <ChevronUp size={18} color="#94a3b8" /> : <ChevronDown size={18} color="#94a3b8" />}
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <div style={{ padding: '0 1.5rem 1.5rem 3.5rem', fontSize: '0.9rem', color: '#94a3b8', lineHeight: '1.6' }}>
              {answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function HelpPage() {
  const faqs = [
    {
      question: "¿Qué es el Escáner Web y por qué debo usarlo?",
      icon: Zap,
      answer: "El Escáner Web es un motor de búsqueda profunda que recorre toda tu base de datos de PrestaShop para identificar clientes corporativos (B2B). Al usarlo, guardas una copia optimizada de estos datos en tu navegador, lo que permite que el sistema funcione de forma instantánea sin tener que consultar al servidor cada vez que cambias un filtro o buscas a un cliente."
    },
    {
      question: "¿Cuál es la diferencia entre el Modo Local y el Modo Live?",
      icon: Database,
      answer: "El MODO LOCAL utiliza los datos guardados por el escáner. Es ideal para análisis mensual y búsqueda rápida. El MODO LIVE consulta a PrestaShop en tiempo real; es más lento pero te permite ver cambios inmediatos, como un cliente que se acaba de registrar hace segundos."
    },
    {
      question: "¿Cómo se calcula el 'Análisis Mensual'?",
      icon: TrendingUp,
      answer: "El análisis mensual se basa en los pedidos individuales que el escáner ha descargado. Cuando eliges un mes, el sistema filtra todos esos pedidos, suma sus totales y te muestra exactamente cuánto gastó cada cliente corporativo en ese período específico, permitiéndote identificar meses de alta o baja demanda."
    },
    {
      question: "¿Cómo sé si un cliente es B2B o B2C?",
      icon: Search,
      answer: "El sistema clasifica automáticamente como B2B a cualquier cliente que tenga completado el campo 'Empresa' o 'RUT/VAT' en su dirección de facturación. Si un cliente corporativo aparece como B2C, asegúrate de que sus datos de empresa estén bien registrados en PrestaShop y vuelve a ejecutar el escáner."
    },
    {
      question: "¿Mi información está segura?",
      icon: ShieldCheck,
      answer: "Sí. Hemos integrado Firebase Authentication. Solo los usuarios con un correo y contraseña registrados en tu consola de Firebase pueden acceder a este dashboard. Además, los datos escaneados se guardan localmente en tu dispositivo y nunca salen de tu entorno seguro."
    },
    {
      question: "¿Cómo actualizo la información de un cliente?",
      icon: BookOpen,
      answer: "Los cambios realizados directamente en PrestaShop se verán reflejados inmediatamente si usas el MODO LIVE. Si usas el MODO LOCAL, verás los cambios la próxima vez que presiones el botón 'Escanear Web' en la sección de clientes."
    }
  ];

  return (
    <div className="fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <div style={{ display: 'inline-flex', padding: '1rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '20px', marginBottom: '1.5rem', color: 'var(--accent-primary)' }}>
          <HelpCircle size={40} />
        </div>
        <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>Centro de Ayuda y FAQ</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Todo lo que necesitas saber para dominar tu nuevo panel B2B.</p>
      </div>

      <div style={{ marginBottom: '3rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Preguntas Frecuentes
        </h3>
        {faqs.map((faq, index) => (
          <FAQItem key={index} {...faq} />
        ))}
      </div>

      <div className="glass-card" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, transparent 100%)', padding: '2rem', textAlign: 'center' }}>
        <h4 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>¿Necesitas más ayuda técnica?</h4>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          Si experimentas problemas con la conexión API o el despliegue en Firebase, contacta con tu administrador de sistemas.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', fontSize: '0.8rem', color: '#94a3b8' }}>
            Versión v2.1.0-Auth
          </div>
          <div style={{ padding: '0.5rem 1rem', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '10px', fontSize: '0.8rem', color: '#4ade80' }}>
            Sistema Protegido
          </div>
        </div>
      </div>
    </div>
  );
}
