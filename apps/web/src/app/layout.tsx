import type { Metadata } from 'next';
import { Space_Grotesk, Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/components/ui/Toast';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['500', '700'],
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
  weight: ['400', '500', '600'],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
  weight: ['400', '600'],
});

export const metadata: Metadata = {
  title: 'HeatFlood Guardian — Mumbai Hazard Navigation',
  description: 'Multimodal flood and heat hazard navigation platform for Mumbai commuters.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`dark ${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body className="bg-void text-ink font-sans min-h-screen antialiased selection:bg-flood/20 selection:text-ink">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}