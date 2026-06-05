import type { Metadata } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import "./globals.css";

// Self-hosted, preloaded fonts (no render-blocking @import)
const display = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display-next",
  display: "swap",
});
const body = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-body-next",
  display: "swap",
});

export const metadata: Metadata = {
  title: "GymOS — Sistema Digital para Gimnasios",
  description: "Plataforma integral de gestión para gimnasios. Rutinas, progreso, pagos y más.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${display.variable} ${body.variable}`} suppressHydrationWarning>
      <head>
        {/* Apply saved theme before paint to avoid a flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('gymos_theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t;}catch(e){}`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
