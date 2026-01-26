/**
 * Dashboard Home Page
 * Main dashboard with KPIs and charts
 */

import { requireShopAccess } from '@/lib/auth/server'
import { createClient } from '@/lib/supabase/server'
import { format, subDays, startOfMonth, subMonths, eachMonthOfInterval } from 'date-fns'
import { es } from 'date-fns/locale'
import { DashboardContent } from '@/components/dashboard/DashboardContent'
import { formatInTimeZone } from 'date-fns-tz'

export default async function DashboardHomePage({
  params,
}: {
  params: Promise<{ shop_slug: string }>
}) {
  const { shop_slug } = await params
  const supabase = await createClient()

  // 1. Get shop
  const { data: shop } = await supabase
    .from('shops')
    .select('id, name, slug, timezone')
    .eq('slug', shop_slug)
    .single()

  if (!shop) {
    return <div>Shop not found</div>
  }

  await requireShopAccess(shop.id)

  // 2. CHECK-ON-READ: Auto-complete past appointments
  // This runs on every dashboard load to keep data fresh without Cron jobs
  await checkAndCompleteAppointments(supabase, shop.id)

  // 3. Timezone Handling (Dynamic from Shop Settings)
  // Use the shop's timezone, or fallback to Argentina if not set/migrated
  const timeZone = shop.timezone || 'America/Argentina/Buenos_Aires'
  const now = new Date()
  
  // Get start/end of day in that timezone, converted to UTC for DB query
  const todayStartStr = formatInTimeZone(now, timeZone, "yyyy-MM-dd'T'00:00:00XXX")
  const todayEndStr = formatInTimeZone(now, timeZone, "yyyy-MM-dd'T'23:59:59XXX")
  
  const yesterdayDate = subDays(new Date(todayStartStr), 1) // Base "yesterday" on the TZ-adjusted today
  const yesterdayStartStr = formatInTimeZone(yesterdayDate, timeZone, "yyyy-MM-dd'T'00:00:00XXX")
  const yesterdayEndStr = formatInTimeZone(yesterdayDate, timeZone, "yyyy-MM-dd'T'23:59:59XXX")

  // Today's appointments
  const { data: todayApts } = await supabase
    .from('appointments')
    .select('*, service:services(price)')
    .eq('shop_id', shop.id)
    .gte('start_time', todayStartStr)
    .lte('start_time', todayEndStr)
    .order('start_time', { ascending: true })

  // Yesterday's appointments (for comparison) 
  const { data: yesterdayApts } = await supabase
    .from('appointments')
    .select('id')
    .eq('shop_id', shop.id)
    .gte('start_time', yesterdayStartStr)
    .lte('start_time', yesterdayEndStr)

  // This Week's Start (Argentina)
  // We'll approximate week start by subtracting 7 days from the timezone-adjusted date
  const weekStart = subDays(new Date(todayStartStr), 7)
  const weekStartStr = formatInTimeZone(weekStart, timeZone, "yyyy-MM-dd'T'00:00:00XXX")
  
  const { data: weekApts } = await supabase
    .from('appointments')
    .select('id')
    .eq('shop_id', shop.id)
    .gte('start_time', weekStartStr)

  // Calculate KPIs
  const turnosHoy = todayApts?.length || 0
  const turnosAyer = yesterdayApts?.length || 0
  
  // Revenue Calculation - ONLY count 'completado' appointments
  const revenueHoy = todayApts
    ?.filter((apt: any) => apt.status === 'completado')
    .reduce((sum: number, apt: any) => sum + (apt.service?.price || 0), 0) || 0
    
  // Fetch previous days for revenue comparison
  const { data: yesterdayRevenueApts } = await supabase
    .from('appointments')
    .select('service:services(price), status')
    .eq('shop_id', shop.id)
    .gte('start_time', yesterdayStartStr)
    .lte('start_time', yesterdayEndStr)
    
  const revenueAyer = yesterdayRevenueApts
    ?.filter((apt: any) => apt.status === 'completado')
    .reduce((sum: number, apt: any) => sum + (apt.service?.price || 0), 0) || 0

  // Weekly Comparison
  const lastWeekStart = subDays(new Date(todayStartStr), 14)
  const lastWeekStartStr = formatInTimeZone(lastWeekStart, timeZone, "yyyy-MM-dd'T'00:00:00XXX")
  
  const { data: lastWeekApts } = await supabase
    .from('appointments')
    .select('id')
    .eq('shop_id', shop.id)
    .gte('start_time', lastWeekStartStr)
    .lt('start_time', weekStartStr)

  const turnosSemana = weekApts?.length || 0
  const turnosSemanaAnt = lastWeekApts?.length || 0

  // Monthly Confirmation Rate Comparison
  const currentMonthStart = startOfMonth(new Date(todayStartStr))
  const currentMonthStartStr = formatInTimeZone(currentMonthStart, timeZone, "yyyy-MM-dd'T'00:00:00XXX")
  
  const lastMonthStart = startOfMonth(subMonths(new Date(todayStartStr), 1))
  const lastMonthStartStr = formatInTimeZone(lastMonthStart, timeZone, "yyyy-MM-dd'T'00:00:00XXX")
  
  const { data: currentMonthApts } = await supabase
    .from('appointments')
    .select('status')
    .eq('shop_id', shop.id)
    .gte('start_time', currentMonthStartStr)

  const { data: lastMonthApts } = await supabase
    .from('appointments')
    .select('status')
    .eq('shop_id', shop.id)
    .gte('start_time', lastMonthStartStr)
    .lt('start_time', currentMonthStartStr)

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
  const sixMonthsAgo = startOfMonth(subMonths(new Date(todayStartStr), 5))
  const sixMonthsAgoStr = formatInTimeZone(sixMonthsAgo, timeZone, "yyyy-MM-dd'T'00:00:00XXX")
  
  const { data: periodApts } = await supabase
    .from('appointments')
    .select('start_time, status, service:services(name, price)')
    .eq('shop_id', shop.id)
    .gte('start_time', sixMonthsAgoStr)
    .in('status', ['confirmado', 'completado']) // Revenue usually comes from valid appointments
  
  // 2. Process Revenue Data
  const monthlyRevenue = periodApts?.reduce((acc: any, apt: any) => {
    // Group by Month Key (e.g., "ene", "feb") - Parse UTC date string securely
    const date = new Date(apt.start_time)
    const monthKey = format(date, 'MMM', { locale: es })
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
  const serviceCounts = periodApts?.reduce((acc: any, apt: any) => {
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
      // Dribbble Pastel Palette: Electric Blue, Lavender, Mint, Rose
      color: ['#7DD3FC', '#E0E7FF', '#34D399', '#FDA4AF'][index] || '#94a3b8'
    }))
  
  // Fallback if no data
  const finalTopServicesData = topServicesData.length > 0 ? topServicesData : [
    { name: 'Sin datos', value: 1, color: '#334155' }
  ]
  
  return (
    <DashboardContent 
      shopName={shop.name}
      turnosHoy={turnosHoy}
      changeTurnos={changeTurnos}
      revenueHoy={revenueHoy}
      changeRevenue={changeRevenue}
      turnosSemana={turnosSemana}
      changeTurnosSemana={changeTurnosSemana}
      tasaConfirmacion={tasaConfirmacion}
      changeTasa={changeTasa}
      revenueChartData={revenueChartData}
      topServicesData={finalTopServicesData}
      todayApts={todayApts || []}
    />
  )
}

/**
 * Helder Function: Auto-complete appointments that have ended.
 * Logic: Find 'confirmed' appointments where end_time < NOW().
 * This mimics a cron job but runs on read.
 */
async function checkAndCompleteAppointments(supabase: any, shopId: string) {
  const nowISO = new Date().toISOString()

  // 1. Update status
  const { error } = await supabase
    .from('appointments')
    .update({ status: 'completado' })
    .eq('shop_id', shopId)
    .eq('status', 'confirmed') // DB uses English enum or user defined? Usually 'confirmed' or 'confirmado'. Checking Schema...
                               // User's schema function uses 'confirmed' in INSERT.
    .lt('end_time', nowISO)

  // Double check if we need to support 'confirmado' as well (due to mixed language use)
  await supabase
      .from('appointments')
      .update({ status: 'completado' })
      .eq('shop_id', shopId)
      .eq('status', 'confirmado') 
      .lt('end_time', nowISO)

  if (error) {
    console.error("Error auto-completing appointments:", error)
  }
}
