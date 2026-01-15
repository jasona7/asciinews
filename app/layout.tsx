import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ASCII News Terminal',
  description: 'Retro CRT-style financial news terminal',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}
