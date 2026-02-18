import "./globals.css";

export const metadata = {
  title: "Demo Reporte de Servicio",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className="bg-slate-100 text-slate-900">
        {children}
      </body>
    </html>
  );
}
