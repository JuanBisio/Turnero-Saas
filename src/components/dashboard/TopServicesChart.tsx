/**
 * Top Services Chart Component
 * Donut chart showing service distribution
 */

'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

interface TopServicesChartProps {
  data: Array<{
    name: string
    value: number
    color: string
  }>
}

export function TopServicesChart({ data }: TopServicesChartProps) {
  return (
    <div className="h-full flex items-center justify-center w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="45%" // Move up slightly to make room for legend
            innerRadius={65}
            outerRadius={85}
            paddingAngle={4}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} stroke="rgba(0,0,0,0.2)" strokeWidth={2} />
            ))}
          </Pie>
          <Tooltip 
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
            verticalAlign="bottom"
            height={36}
            iconType="square"
            iconSize={10}
            formatter={(value) => <span style={{ color: '#94a3b8', marginLeft: '4px' }}>{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
