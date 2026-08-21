export type LayoutInput = {
  id: string
  startMin: number
  endMin: number
}

export type LayoutResult = {
  lane: number
  laneCount: number
}

/**
 * Assigns a lane (column index) to each item so overlapping items are
 * rendered side by side instead of stacked on top of each other.
 * Groups items into overlap clusters and gives every item in a cluster
 * the cluster's total lane count, so siblings share equal width.
 */
export function assignLanes(items: LayoutInput[]): Map<string, LayoutResult> {
  const result = new Map<string, LayoutResult>()
  const sorted = [...items].sort((a, b) => a.startMin - b.startMin)

  let cluster: LayoutInput[] = []
  let clusterEnd = -Infinity

  const flushCluster = () => {
    if (cluster.length === 0) return
    const laneEnds: number[] = []
    const laneOf = new Map<string, number>()

    for (const item of cluster) {
      let lane = laneEnds.findIndex((end) => end <= item.startMin)
      if (lane === -1) {
        lane = laneEnds.length
        laneEnds.push(item.endMin)
      } else {
        laneEnds[lane] = item.endMin
      }
      laneOf.set(item.id, lane)
    }

    const laneCount = laneEnds.length
    for (const item of cluster) {
      result.set(item.id, { lane: laneOf.get(item.id)!, laneCount })
    }
    cluster = []
  }

  for (const item of sorted) {
    if (cluster.length > 0 && item.startMin >= clusterEnd) {
      flushCluster()
      clusterEnd = -Infinity
    }
    cluster.push(item)
    clusterEnd = Math.max(clusterEnd, item.endMin)
  }
  flushCluster()

  return result
}
