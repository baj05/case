import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, Hanken_Grotesk, JetBrains_Mono, Newsreader } from 'next/font/google';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { AdvoLauncher } from '@/components/AdvoLauncher';
import { BRAND } from '@/lib/brand';
import './globals.css';

/* Fonts are self-hosted at build time: no third-party request at runtime, and
   `display: swap` with a preloaded subset keeps CLS at zero. Only the weights
   DESIGN.md actually specifies are loaded. */
const display = Plus_Jakarta_Sans({
  subsets: ['latin'], weight: ['700', '800'], variable: '--font-display-loaded', display: 'swap',
});
const body = Hanken_Grotesk({
  subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-body-loaded', display: 'swap',
});
const mono = JetBrains_Mono({
  subsets: ['latin'], weight: ['500'], variable: '--font-mono-loaded', display: 'swap',
});
/* A restrained serif for display and pull-quotes. Plus Jakarta Sans alone reads
   friendly-geometric; the serif supplies the institutional register the brief
   asks for ("modern private chambers") without turning the UI into a law-firm
   letterhead. Two weights only — the brief also says do not load ten. */
const serif = Newsreader({
  subsets: ['latin'], weight: ['400', '600'], style: ['normal', 'italic'],
  variable: '--font-serif-loaded', display: 'swap',
});

export const metadata: Metadata = {
  title: { default: `${BRAND.name} — ${BRAND.tagline}`, template: `%s · ${BRAND.name}` },
  description:
    'Search verified advocates, law firms and chambers by legal issue, court, jurisdiction and city. '
    + 'Listings are compiled from official Bar Council registers with full source attribution.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  openGraph: { type: 'website', siteName: BRAND.name, title: BRAND.name, description: BRAND.tagline },
  robots: { index: true, follow: true },
  icons: {
    icon: [
      { url: '/brand/favicon.svg', type: 'image/svg+xml' },
      { url: '/brand/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
    ],
    apple: '/brand/apple-touch-icon.png',
  },
  manifest: '/brand/site.webmanifest',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Never block zoom: WCAG 1.4.4 Resize Text.
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#faf8ff' },
    { media: '(prefers-color-scheme: dark)', color: '#10131c' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN">
      <body className={`${display.variable} ${body.variable} ${mono.variable} ${serif.variable}`}>
        <a href="#main" className="skip-link">Skip to main content</a>
        <Header />
        <main id="main">{children}</main>
        <Footer />
        <AdvoLauncher />
      </body>
    </html>
  );
}
