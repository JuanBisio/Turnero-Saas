/**
 * Dashboard Content Component
 * Client component with Framer Motion animations for KPI cards
 */

'use client'

import { motion } from 'framer-motion'
import { KPICard } from '@/components/dashboard/KPICard'
import { RevenueChart } from '@/components/dashboard/RevenueChart'
import { TopServicesChart } from '@/components/dashboard/TopServicesChart'
import { formatInTimeZone } from 'date-fns-tz'

// Spring transition config
const springTransition = {
  type: 'spring' as 'spring',
  stiffness: 300,
  damping: 30,
}

// Stagger container variants
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

// Card animation variants
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

interface DashboardContentProps {
  shopName: string
  // KPI data
  turnosHoy: number
  changeTurnos: number
  revenueHoy: number
  changeRevenue: number
  turnosSemana: number
  changeTurnosSemana: number
  tasaConfirmacion: number
  changeTasa: number
  // Charts data
  revenueChartData: any[]
  topServicesData: any[]
  // Today's appointments
  todayApts: any[]
}

export function DashboardContent({
  shopName,
  turnosHoy,
  changeTurnos,
  revenueHoy,
  changeRevenue,
  turnosSemana,
  changeTurnosSemana,
  tasaConfirmacion,
  changeTasa,
  revenueChartData,
  topServicesData,
  todayApts,
}: DashboardContentProps) {
  return (
    <div className="space-y-10 p-2">
      <div>
        <h1 className="text-4xl font-bold font-heading text-white text-glow mb-2">Dashboard</h1>
        <p className="text-slate-400 text-lg">
          Bienvenido a {shopName}
        </p>
      </div>

      {/* Bento Grid with Staggered Animation */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 auto-rows-[minmax(180px,auto)]"
      >
        {/* KPI 1 - Turnos Hoy */}
        <motion.div variants={cardVariants} transition={springTransition} className="glass-card-dark h-full hover:shadow-[0_0_40px_rgba(56,189,248,0.15)] transition-all duration-500 relative group overflow-hidden">
             <div className="absolute top-0 right-0 p-3 opacity-50 group-hover:opacity-100 transition-opacity">
                 <div className="w-20 h-20 bg-sky-500/20 blur-3xl rounded-full absolute -top-10 -right-10 pointer-events-none" />
             </div>
          <KPICard
            title="Turnos Hoy"
            value={turnosHoy?.toString() || "0"}
            change={changeTurnos}
            trendLabel="vs. ayer"
            icon="Calendar"
            iconVariant="primary"
            className="h-full border-0 shadow-none bg-transparent"
          />
        </motion.div>

        {/* KPI 2 - Revenue (Wide on mobile, compact on large) */}
        <motion.div variants={cardVariants} transition={springTransition} className="glass-card-dark h-full hover:shadow-[0_0_40px_rgba(52,211,153,0.15)] transition-all duration-500">
           <div className="absolute -left-10 bottom-0 w-24 h-24 bg-emerald-500/10 blur-3xl rounded-full pointer-events-none" />
          <KPICard
            title="Revenue Hoy"
            value={`$${revenueHoy.toLocaleString()}`}
            change={changeRevenue}
            trendLabel="vs. ayer"
            icon="DollarSign"
            iconVariant="secondary" // Emerald
            className="h-full border-0 shadow-none bg-transparent"
          />
        </motion.div>

        {/* KPI 3 - Turnos Semana */}
        <motion.div variants={cardVariants} transition={springTransition} className="glass-card-dark h-full hover:shadow-[0_0_40px_rgba(168,85,247,0.15)] transition-all duration-500">
          <KPICard
            title="Turnos Semana"
            value={turnosSemana?.toString() || "0"}
            change={changeTurnosSemana}
            trendLabel="vs. sem. ant."
            icon="CheckCircle"
            iconVariant="success" // Lavender/Purple
            className="h-full border-0 shadow-none bg-transparent"
          />
        </motion.div>

        {/* KPI 4 - Tasa Confirmación */}
        <motion.div variants={cardVariants} transition={springTransition} className="glass-card-dark h-full hover:shadow-[0_0_40px_rgba(251,113,133,0.15)] transition-all duration-500">
          <KPICard
            title="Tasa Confirmación"
            value={`${tasaConfirmacion}%`}
            change={changeTasa}
            trendLabel="vs. mes ant."
            icon="Users"
            iconVariant="warning" // Rose
            className="h-full border-0 shadow-none bg-transparent"
          />
        </motion.div>
      </motion.div>

      {/* Today's Appointments - Midnight Glass Stacked List */}
      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        variants={{
          hidden: { opacity: 0 },
          show: {
            opacity: 1,
            transition: { staggerChildren: 0.1, delayChildren: 0.2 }
          }
        }}
        className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl p-6"
      >
        <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold font-heading text-white text-glow">Turnos de Hoy</h2>
            {/* Button removed as requested */}
            </div>
        
        {!todayApts || todayApts.length === 0 ? (
          <motion.p variants={cardVariants} className="text-center py-12 text-slate-500 font-body">
            No hay turnos para hoy
          </motion.p>
        ) : (
          <div className="space-y-0">
            {todayApts.map((apt: any) => (
              <motion.div
                key={apt.id}
                variants={{
                  hidden: { opacity: 0, y: 15 },
                  show: { opacity: 1, y: 0 }
                }}
                whileHover={{ scale: 1.01, backgroundColor: "rgba(255, 255, 255, 0.08)", borderColor: "rgba(255, 255, 255, 0.2)" }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="group flex items-center justify-between p-4 mb-3 rounded-2xl bg-white/[0.02] border border-transparent backdrop-blur-sm transition-colors duration-300"
              >
                <div className="flex items-center gap-4 flex-1">
                  {/* Avatar / Icon Placeholder */}
                  <div className="w-10 h-10 rounded-full bg-slate-800/50 flex items-center justify-center ring-2 ring-sky-400/30 group-hover:ring-sky-400/60 transition-all">
                     <span className="text-sky-400 font-bold text-lg">
                        {apt.customer_name.charAt(0).toUpperCase()}
                     </span>
                  </div>

                  <div>
                    <p className="font-medium text-white group-hover:text-glow-cyan transition-all">{apt.customer_name}</p>
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <span className="font-medium text-sky-300/80">
                         {formatInTimeZone(new Date(apt.start_time), 'America/Argentina/Buenos_Aires', 'HH:mm')}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                      <span>{apt.service?.name || 'Servicio General'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md border shadow-sm transition-all ${
                      apt.status === 'confirmado' || apt.status === 'completado'
                        ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20 shadow-[0_0_10px_rgba(52,211,153,0.1)]'
                        : apt.status === 'pendiente'
                        ? 'bg-sky-500/10 text-sky-300 border-sky-500/20'
                        : (apt.status === 'cancelado' || apt.status === 'no_asistio')
                        ? 'bg-rose-500/10 text-rose-300 border-rose-500/20'
                        : 'bg-slate-700/30 text-slate-400 border-slate-600/30'
                    }`}
                  >
                    {apt.status === 'confirmado' ? 'Confirmado' :
                     apt.status === 'completado' ? 'Completado' :
                     apt.status === 'pendiente' ? 'Pendiente' :
                     apt.status === 'cancelado' ? 'Cancelado' :
                     apt.status === 'no_asistio' ? 'No Asistió' : apt.status}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springTransition, delay: 0.6 }}
          className="glass-card-dark p-8"
        >
          <h2 className="text-xl font-bold font-heading mb-6 text-white">Revenue Últimos 6 Meses</h2>
          <div className="h-80">
            <RevenueChart data={revenueChartData} />
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springTransition, delay: 0.7 }}
          className="glass-card-dark p-8"
        >
          <h2 className="text-xl font-bold font-heading mb-6 text-white">Top Servicios</h2>
          <div className="h-80">
            <TopServicesChart data={topServicesData} />
          </div>
        </motion.div>
      </div>
    </div>
  )
}
