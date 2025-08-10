// @ts-nocheck
import "./globals.css";

export const metadata = {
  title: "BacktestGPT",
  description: "Backtesting chat app prototype",
};

export default function RootLayout({ children }: { children: any }) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body>
        <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black">
          {children}
        </div>
      </body>
    </html>
  );
}
