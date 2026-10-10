import type { Metadata } from 'next';
import './globals.css';
import { ToastProvider } from '@/components/ui/Toast';

export const metadata: Metadata = {
  title: 'HeatFlood Guardian',
  description: 'Safe route guidance for Mumbai monsoon and heat conditions',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-gray-950 text-white antialiased"><ToastProvider>{children}</ToastProvider></body>
    </html>
  );
}
