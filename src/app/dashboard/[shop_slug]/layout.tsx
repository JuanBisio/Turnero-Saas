/**
 * Dashboard Layout
 * Main layout wrapper with sidebar and header
 */

import { ShopProvider } from '@/components/providers/ShopProvider'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { DashboardShell } from '@/components/dashboard/layout/DashboardShell'

import { PageWrapper } from '@/components/ui/PageWrapper'

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ shop_slug: string }>
}) {
  const { shop_slug } = await params
  
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <ShopProvider shopSlug={shop_slug}>
        <DashboardShell>
          <PageWrapper>
            {children}
          </PageWrapper>
        </DashboardShell>
      </ShopProvider>
    </ThemeProvider>
  )
}
