import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '../lib/AuthContext';

export const metadata: Metadata = {
  title: 'TeleGrowth — Telegram Referral & Growth Platform',
  description: 'Enterprise Telegram referral campaigns, milestone rewards, and provably-fair giveaways.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <script src="https://telegram.org/js/telegram-web-app.js" async></script>
      </head>
      <body className="bg-slate-950 text-slate-100 min-h-screen">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
