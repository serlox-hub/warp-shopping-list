import './globals.css';
import { ThemeProvider } from '@/contexts/ThemeContext';

export const metadata = {
  title: 'Shopping List App',
  description: 'Organize your shopping lists by aisles',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
