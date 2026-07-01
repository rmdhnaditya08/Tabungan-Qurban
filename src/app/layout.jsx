import './global.css';

export const metadata = {
  title: 'Tabungan Qurban',
  description: 'Aplikasi pencatatan tabungan qurban mandiri dan kelompok patungan',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-stone-50 text-stone-800 antialiased">
        {children}
      </body>
    </html>
  );
}
