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
              backgroundColor: 'rgba(15, 23, 42, 0.8)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              color: '#f8fafc'
            }}
            itemStyle={{ color: '#f8fafc' }}
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
