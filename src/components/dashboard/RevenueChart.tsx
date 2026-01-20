/**
 * Revenue Chart Component
 * Bar chart showing revenue over time
 */

'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface RevenueChartProps {
  data: Array<{
    month: string
    revenue: number
    target?: number
  }>
}

export function RevenueChart({ data }: RevenueChartProps) {
  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis 
            dataKey="month" 
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#94a3b8', fontSize: 12 }}
            dy={10}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#94a3b8', fontSize: 12 }}
          />
          <Tooltip 
            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
            contentStyle={{
              backgroundColor: 'rgba(15, 23, 42, 0.8)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              padding: '12px',
              color: '#f8fafc',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
            }}
            itemStyle={{ color: '#f8fafc' }}
          />
          <Legend 
             wrapperStyle={{ paddingTop: '20px' }}
             iconType="circle"
          />
          <Bar 
            dataKey="revenue" 
            name="Revenue Real"
            fill="#3b82f6" 
            radius={[6, 6, 0, 0]}
            barSize={32}
          />
          {data[0]?.target !== undefined && (
            <Bar 
              dataKey="target" 
              name="Target"
              fill="rgba(255,255,255,0.8)" 
              radius={[6, 6, 0, 0]}
              barSize={32}
            />
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
