/**
 * Dashboard Layout
 * Main layout wrapper with sidebar and header
 */

import { ShopProvider } from '@/components/providers/ShopProvider'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { DashboardSidebar } from '@/components/dashboard/layout/DashboardSidebar'
import { DashboardHeader } from '@/components/dashboard/layout/DashboardHeader'

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
            <DashboardHeader />
            
            <main className="flex-1 overflow-y-auto bg-background p-6">
              {children}
            </main>
          </div>
        </div>
      </ShopProvider>
    </ThemeProvider>
  )
}
