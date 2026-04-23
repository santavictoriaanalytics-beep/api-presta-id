import './globals.css';

export const metadata = {
  title: 'PrestaMonitor Panel',
  description: 'Análisis y monitoreo premium de clientes B2B',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
