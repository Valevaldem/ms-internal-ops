import type { Metadata } from "next";
import { Poppins } from 'next/font/google';
import "./globals.css";

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-poppins',
});

export const metadata: Metadata = {
  title: "Maria Salinas",
  description: "Maria Salinas",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`bg-[#F5F2EE] text-[#333333] font-sans antialiased selection:bg-[#D8D3CC] selection:text-[#333333] ${poppins.variable}`}>
        {children}
      </body>
    </html>
  );
}
