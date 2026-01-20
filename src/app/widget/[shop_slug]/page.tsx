/**
 * Widget Page
 * Public booking interface
 */

import { ShopProvider } from '@/components/providers/ShopProvider'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { BookingProvider } from '@/components/widget/BookingProvider'
import { BookingWidget } from '@/components/widget/BookingWidget'

export default async function WidgetPage({
  params,
}: {
  params: Promise<{ shop_slug: string }>
}) {
  const { shop_slug } = await params

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <ShopProvider shopSlug={shop_slug}>
        <BookingProvider>
          <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <BookingWidget />
          </div>
        </BookingProvider>
      </ShopProvider>
    </ThemeProvider>
  )
}
