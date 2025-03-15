// Main layout component for Agentda
import '@/styles/global.css'
import { Inter } from 'next/font/google'
import Providers from '@/components/Providers'
import Header from '@/components/Header'
import styles from './layout.module.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Agentda - AI-Powered Meeting Management',
  description: 'Streamline your meetings with AI-powered agenda management and real-time collaboration.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <div className={styles.layout}>
            <Header />
            <main className={styles.main}>
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  )
}
