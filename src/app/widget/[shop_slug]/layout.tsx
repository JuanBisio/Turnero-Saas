export default function WidgetLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ shop_slug: string }>
}) {
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  )
}
