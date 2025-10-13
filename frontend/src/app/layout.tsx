import type { Metadata } from 'next';
import { ThemeProvider } from 'next-themes';
import { ConfigProvider } from 'antd';
import { theme } from '@/antdConfig';

import '@ant-design/v5-patch-for-react-19';
import './globals.css';
import { Header } from '@/ui/header/Header';

export const metadata: Metadata = {
  title: 'ITransition-Course-Project',
  icons: ['icon.png'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en' suppressHydrationWarning>
      <body>
        <ConfigProvider theme={theme}>
          <ThemeProvider attribute='data-theme' defaultTheme='system' enableSystem>
            <Header />
            <main>{children}</main>
          </ThemeProvider>
        </ConfigProvider>
      </body>
    </html>
  );
}
