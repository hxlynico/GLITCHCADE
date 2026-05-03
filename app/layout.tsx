import type {Metadata} from 'next';
import { Orbitron, Rajdhani } from 'next/font/google';
import './globals.css'; // Global styles

const orbitron = Orbitron({ 
  subsets: ['latin'],
  variable: '--font-orbitron'
});

const rajdhani = Rajdhani({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-rajdhani'
});

export const metadata: Metadata = {
  title: 'GLITCHCADE',
  description: 'FPS SHOOTER',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={`${orbitron.variable} ${rajdhani.variable}`}>
      <body suppressHydrationWarning className="font-rajdhani">{children}</body>
    </html>
  );
}
