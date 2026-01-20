/**
 * Dashboard Layout
 * Main layout wrapper with sidebar and header
 */

import { ShopProvider } from '@/components/providers/ShopProvider'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { DashboardSidebar } from '@/components/dashboard/layout/DashboardSidebar'

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
        <div className="flex h-screen overflow-hidden">
          {/* Sidebar */}
          <DashboardSidebar />

          {/* Main Content */}
          <div className="flex flex-1 flex-col overflow-hidden">

            
            <main className="flex-1 overflow-y-auto bg-transparent p-6">
              <PageWrapper>
                {children}
              </PageWrapper>
            </main>
          </div>
        </div>
      </ShopProvider>
    </ThemeProvider>
  )
}
