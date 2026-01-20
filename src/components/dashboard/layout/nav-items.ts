/**
 * Dashboard Navigation Links
 * Defines the navigation structure for the sidebar
 */

import { Calendar, Users, Briefcase, Settings } from 'lucide-react'

export const dashboardNavItems = [
  {
    title: 'Agenda',
    href: '/agenda',
    icon: Calendar,
    description: 'Vista de calendario y turnos',
  },
  {
    title: 'Profesionales',
    href: '/profesionales',
    icon: Users,
    description: 'Gestionar profesionales',
  },
  {
    title: 'Servicios',
    href: '/servicios',
    icon: Briefcase,
    description: 'Gestionar servicios',
  },
  {
    title: 'Configuración',
    href: '/configuracion',
    icon: Settings,
    description: 'Configuración del comercio',
  },
] as const
