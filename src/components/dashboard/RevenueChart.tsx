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
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7DD3FC" stopOpacity={0.8}/> {/* Electric Blue */}
              <stop offset="95%" stopColor="#E0E7FF" stopOpacity={0.1}/> {/* Lavender Fade */}
            </linearGradient>
            <linearGradient id="targetGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" stopOpacity={0.1}/>
              <stop offset="100%" stopColor="#ffffff" stopOpacity={0.02}/>
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
          <XAxis 
            dataKey="month" 
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 500 }}
            dy={10}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#94a3b8', fontSize: 12 }}
          />
          <Tooltip 
            cursor={{ fill: 'rgba(125, 211, 252, 0.05)' }} 
            contentStyle={{
              backgroundColor: 'rgba(15, 23, 42, 0.9)',
              backdropFilter: 'blur(16px)',
              border: '0.5px solid rgba(255,255,255,0.1)',
              borderRadius: '16px',
              padding: '12px 16px',
              color: '#f8fafc',
              boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.3)'
            }}
            itemStyle={{ color: '#E0E7FF', fontWeight: 600 }}
          />
          <Legend 
             wrapperStyle={{ paddingTop: '24px' }}
             iconType="circle"
          />
          <Bar 
            dataKey="revenue" 
            name="Revenue Real"
            fill="url(#revenueGradient)" 
            radius={[8, 8, 0, 0]}
            barSize={32}
            animationDuration={1500}
          />
          {data[0]?.target !== undefined && (
            <Bar 
              dataKey="target" 
              name="Target"
              fill="url(#targetGradient)" 
              radius={[8, 8, 0, 0]}
              barSize={32}
            />
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
