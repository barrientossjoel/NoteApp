import { Inter } from 'next/font/google' 
import "./globals.css"
import { cn } from "@/lib/utils"

const inter = Inter({ subsets: ["latin"] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body
        className={cn(
          "min-h-screen bg-white font-sans antialiased dark:bg-zinc-950",
          inter.className
        )}
      >
        {children}
      </body>
    </html>
  )
}

