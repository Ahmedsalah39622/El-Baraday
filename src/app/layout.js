import ThemeRegistry from '@/theme/ThemeRegistry';
import AppShell from '@/components/layout/AppShell';
import './globals.css';

export const metadata = {
  title: 'نظام البرادعى POS |  ',
  description: 'نظام نقطة بيع لمطعم البرادعى للحواوشي - تصميم  ',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <ThemeRegistry>
          <AppShell>
            {children}
          </AppShell>
        </ThemeRegistry>
      </body>
    </html>
  );
}
