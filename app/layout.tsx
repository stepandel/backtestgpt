// @ts-nocheck
import "./globals.css";

export const metadata = {
  title: "BacktestGPT",
  description: "Backtesting chat app prototype",
};

export default function RootLayout({ children }: { children: any }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <div className="min-h-screen">{children}</div>
      </body>
    </html>
  );
}
