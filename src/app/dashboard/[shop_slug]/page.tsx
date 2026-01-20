/**
 * Dashboard Home Page
 * Main dashboard with KPIs and charts
 */

import { requireShopAccess } from '@/lib/auth/server'
import { createClient } from '@/lib/supabase/server'
import { format, subDays, startOfMonth, subMonths, eachMonthOfInterval } from 'date-fns'
import { es } from 'date-fns/locale'
import { KPICard } from '@/components/dashboard/KPICard'
import { RevenueChart } from '@/components/dashboard/RevenueChart'
import { TopServicesChart } from '@/components/dashboard/TopServicesChart'
import { Calendar, DollarSign, CheckCircle, Users } from 'lucide-react'
import { formatInTimeZone } from 'date-fns-tz'

export default async function DashboardHomePage({
  params,
}: {
  params: Promise<{ shop_slug: string }>
}) {
  const { shop_slug } = await params
  const supabase = await createClient()

  // Get shop
  const { data: shop } = await supabase
    .from('shops')
    .select('id, name')
    .eq('slug', shop_slug)
    .single()

  if (!shop) {
    return <div>Shop not found</div>
  }

  await requireShopAccess(shop.id)

  // Fetch today's data
  const today = format(new Date(), 'yyyy-MM-dd')
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd')

  // Today's appointments
  const { data: todayApts } = await supabase
    .from('appointments')
    .select('*, service:services(price)')
    .eq('shop_id', shop.id)
    .gte('start_time', `${today}T00:00:00`)
    .lt('start_time', `${today}T23:59:59`)

  // Yesterday's appointments  
  const { data: yesterdayApts } = await supabase
    .from('appointments')
    .select('id')
    .eq('shop_id', shop.id)
    .gte('start_time', `${yesterday}T00:00:00`)
    .lt('start_time', `${yesterday}T23:59:59`)

  // This week's appointments
  const weekStart = format(subDays(new Date(), 7), 'yyyy-MM-dd')
  const { data: weekApts } = await supabase
    .from('appointments')
    .select('id')
    .eq('shop_id', shop.id)
    .gte('start_time', `${weekStart}T00:00:00`)

  // Calculate KPIs
  const turnosHoy = todayApts?.length || 0
  const turnosAyer = yesterdayApts?.length || 0
  
  // Revenue Calculation
  const revenueHoy = todayApts?.reduce((sum, apt: any) => 
    sum + (apt.service?.price || 0), 0) || 0
    
  // Fetch previous days for revenue comparison
  const { data: yesterdayRevenueApts } = await supabase
    .from('appointments')
    .select('service:services(price)')
    .eq('shop_id', shop.id)
    .gte('start_time', `${yesterday}T00:00:00`)
    .lt('start_time', `${yesterday}T23:59:59`)
    
  const revenueAyer = yesterdayRevenueApts?.reduce((sum, apt: any) => 
    sum + (apt.service?.price || 0), 0) || 0

  // Weekly Comparison
  const lastWeekStart = format(subDays(new Date(), 14), 'yyyy-MM-dd')
  const { data: lastWeekApts } = await supabase
    .from('appointments')
    .select('id')
    .eq('shop_id', shop.id)
    .gte('start_time', `${lastWeekStart}T00:00:00`)
    .lt('start_time', `${weekStart}T00:00:00`)

  const turnosSemana = weekApts?.length || 0
  const turnosSemanaAnt = lastWeekApts?.length || 0

  // Monthly Confirmation Rate Comparison
  const currentMonthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd')
  const lastMonthStart = format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd')
  
  const { data: currentMonthApts } = await supabase
    .from('appointments')
    .select('status')
    .eq('shop_id', shop.id)
    .gte('start_time', `${currentMonthStart}T00:00:00`)

  const { data: lastMonthApts } = await supabase
    .from('appointments')
    .select('status')
    .eq('shop_id', shop.id)
    .gte('start_time', `${lastMonthStart}T00:00:00`)
    .lt('start_time', `${currentMonthStart}T00:00:00`)

  // Calculate Rates
  // Current Month Rate
  const currentTotal = currentMonthApts?.length || 0
  const currentConfirmed = currentMonthApts?.filter((a: any) => a.status === 'confirmado').length || 0
  const tasaConfirmacion = currentTotal > 0 ? Math.round((currentConfirmed / currentTotal) * 100) : 0

  // Last Month Rate
  const lastTotal = lastMonthApts?.length || 0
  const lastConfirmed = lastMonthApts?.filter((a: any) => a.status === 'confirmado').length || 0
  const tasaConfirmacionAnt = lastTotal > 0 ? Math.round((lastConfirmed / lastTotal) * 100) : 0

  // Calculate Percent Changes
  const changeTurnos = turnosAyer > 0 
    ? Math.round(((turnosHoy - turnosAyer) / turnosAyer) * 100)
    : 0

  const changeRevenue = revenueAyer > 0
    ? Math.round(((revenueHoy - revenueAyer) / revenueAyer) * 100)
    : 0

  const changeTurnosSemana = turnosSemanaAnt > 0
    ? Math.round(((turnosSemana - turnosSemanaAnt) / turnosSemanaAnt) * 100)
    : 0

  const changeTasa = tasaConfirmacion - tasaConfirmacionAnt // Points difference for percentages

  // --- Dynamic Chart Data Calculation ---
  
  // 1. Fetch data for the last 6 months
  const sixMonthsAgo = startOfMonth(subMonths(new Date(), 5))
  const { data: periodApts } = await supabase
    .from('appointments')
    .select('start_time, status, service:services(name, price)')
    .eq('shop_id', shop.id)
    .gte('start_time', format(sixMonthsAgo, 'yyyy-MM-dd') + 'T00:00:00')
    .in('status', ['confirmado', 'completado']) // Revenue usually comes from valid appointments
  
  // 2. Process Revenue Data
  const monthlyRevenue = periodApts?.reduce((acc, apt: any) => {
    // Group by Month Key (e.g., "ene", "feb")
    const monthKey = format(new Date(apt.start_time), 'MMM', { locale: es })
    const price = apt.service?.price || 0
    acc[monthKey] = (acc[monthKey] || 0) + price
    return acc
  }, {} as Record<string, number>)
  
  const revenueChartData = eachMonthOfInterval({
    start: sixMonthsAgo,
    end: new Date()
  }).map(date => {
     const monthKey = format(date, 'MMM', { locale: es })
     // Capitalize: "ene" -> "Ene"
     const monthLabel = monthKey.charAt(0).toUpperCase() + monthKey.slice(1)
     return {
       month: monthLabel,
       revenue: monthlyRevenue?.[monthKey] || 0,
       target: 50000 // Static target for reference
     }
  })
  
  // 3. Process Top Services Data
  const serviceCounts = periodApts?.reduce((acc, apt: any) => {
    const name = apt.service?.name || 'Otros'
    acc[name] = (acc[name] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  const topServicesData = Object.entries(serviceCounts || {})
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 4)
    .map(([name, value], index) => ({
      name,
      value: value as number,
      color: ['#0ea5e9', '#f59e0b', '#10b981', '#f43f5e'][index] || '#94a3b8'
    }))
  
  // Fallback if no data
  const finalTopServicesData = topServicesData.length > 0 ? topServicesData : [
    { name: 'Sin datos', value: 1, color: '#334155' }
  ]
  
  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-bold font-heading">Dashboard</h1>
        <p className="text-muted-foreground">
          Bienvenido a {shop.name}
        </p>
      </div>
  
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Turnos Hoy"
          value={turnosHoy?.toString() || "0"}
          change={changeTurnos}
          trendLabel="vs. ayer"
          icon={Calendar}
          iconVariant="primary"
        />
  
        <KPICard
          title="Revenue Hoy"
          value={`$${revenueHoy.toLocaleString()}`}
          change={changeRevenue}
          trendLabel="vs. ayer"
          icon={DollarSign}
          iconVariant="secondary"
        />
  
        <KPICard
          title="Turnos Semana"
          value={turnosSemana?.toString() || "0"}
          change={changeTurnosSemana}
          trendLabel="vs. semana ant."
          icon={CheckCircle}
          iconVariant="success"
        />
  
        <KPICard
          title="Tasa Confirmación"
          value={`${tasaConfirmacion}%`}
          change={changeTasa}
          trendLabel="vs. mes ant."
          icon={Users}
          iconVariant="warning"
        />
      </div>

      {/* Today's Appointments */}
      <div className="rounded-xl border bg-card p-6">
        <h2 className="text-xl font-bold font-heading mb-4">Turnos de Hoy</h2>
        
        {!todayApts || todayApts.length === 0 ? (
          <p className="text-center py-12 text-muted-foreground">
            No hay turnos para hoy
          </p>
        ) : (
          <div className="space-y-3">
            {todayApts.map((apt: any) => (
              <div
                key={apt.id}
                className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1">
                  <p className="font-medium">{apt.customer_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatInTimeZone(new Date(apt.start_time), 'America/Argentina/Buenos_Aires', 'HH:mm')}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      apt.status === 'confirmado'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
                        : apt.status === 'pendiente'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100'
                    }`}
                  >
                    {apt.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border bg-card p-6">
          <h2 className="text-xl font-bold font-heading mb-4">Revenue Últimos 6 Meses</h2>
          <div className="h-64">
            <RevenueChart 
              data={revenueChartData}
            />
          </div>
        </div>
        
        <div className="rounded-xl border bg-card p-6">
          <h2 className="text-xl font-bold font-heading mb-4">Top Servicios</h2>
          <div className="h-64">
            <TopServicesChart 
              data={finalTopServicesData}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
