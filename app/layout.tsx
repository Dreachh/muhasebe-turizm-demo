// This is the new ROOT layout for the entire app.
import "./globals.css";
import "react-toastify/dist/ReactToastify.css";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { ToastContainer } from "react-toastify";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Passionis Tour - Seyahat Turizm Muhasebe Yazılımı",
  description: "Passionis Tour için özel olarak geliştirilmiş turizm muhasebe yazılımı",
};

export default function RootLayout({ 
  children 
}: { 
  children: React.ReactNode
}) {
  return (    <html lang="tr" suppressHydrationWarning>
      <head>
      </head>
      <body className={`${inter.className} antialiased`}>
          <ThemeProvider 
              attribute="class" 
              defaultTheme="light" 
              enableSystem
              disableTransitionOnChange
            >
              {children}
              <Toaster />
              <ToastContainer
                position="bottom-right"
                autoClose={3000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
              />
            </ThemeProvider>
      </body>
    </html>
  );
}
