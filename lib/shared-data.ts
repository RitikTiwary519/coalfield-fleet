export interface Truck {
  truck_id: string
  lat: number
  lon: number
  status: "loaded" | "unloaded" | "stopped"
  timestamp: string
  is_tracking: boolean
  network_info: {
    router_id: string
    port: number
    signal_strength: number
    connection_status: "connected" | "disconnected" | "weak"
  }
  route_data: {
    fuel_level: number
    engine_status: "running" | "stopped" | "idle"
  }
}

export interface Node {
  node_id: number
  lat: number
  lon: number
}

export interface Edge {
  edge_id: number
  start_node: number
  end_node: number
  status: "Open" | "Closed"
  current_trucks: number
}

// Shared truck data - consistent across all endpoints
export let trucks: Truck[] = [
  {
    truck_id: "T001",
    lat: -25.7479,
    lon: 28.2293,
    status: "loaded",
    timestamp: new Date().toISOString(),
    is_tracking: false,
    network_info: {
      router_id: "ROUTER_NORTH",
      port: 8080,
      signal_strength: 85,
      connection_status: "connected",
    },
    route_data: {
      fuel_level: 75,
      engine_status: "running",
    },
  },
  {
    truck_id: "T002",
    lat: -25.7679,
    lon: 28.2493,
    status: "unloaded",
    timestamp: new Date().toISOString(),
    is_tracking: false,
    network_info: {
      router_id: "ROUTER_NORTH",
      port: 8081,
      signal_strength: 92,
      connection_status: "connected",
    },
    route_data: {
      fuel_level: 68,
      engine_status: "running",
    },
  },
  {
    truck_id: "T003",
    lat: -25.7279,
    lon: 28.2693,
    status: "stopped",
    timestamp: new Date().toISOString(),
    is_tracking: false,
    network_info: {
      router_id: "ROUTER_SOUTH",
      port: 8080,
      signal_strength: 78,
      connection_status: "weak",
    },
    route_data: {
      fuel_level: 45,
      engine_status: "stopped",
    },
  },
  {
    truck_id: "T004",
    lat: -25.7879,
    lon: 28.2093,
    status: "loaded",
    timestamp: new Date().toISOString(),
    is_tracking: false,
    network_info: {
      router_id: "ROUTER_SOUTH",
      port: 8081,
      signal_strength: 65,
      connection_status: "weak",
    },
    route_data: {
      fuel_level: 82,
      engine_status: "running",
    },
  },
  {
    truck_id: "T005",
    lat: -25.7379,
    lon: 28.2393,
    status: "unloaded",
    timestamp: new Date().toISOString(),
    is_tracking: false,
    network_info: {
      router_id: "ROUTER_EAST",
      port: 8080,
      signal_strength: 95,
      connection_status: "connected",
    },
    route_data: {
      fuel_level: 91,
      engine_status: "running",
    },
  },
  {
    truck_id: "T006",
    lat: -25.7579,
    lon: 28.2193,
    status: "loaded",
    timestamp: new Date().toISOString(),
    is_tracking: false,
    network_info: {
      router_id: "ROUTER_EAST",
      port: 8081,
      signal_strength: 88,
      connection_status: "connected",
    },
    route_data: {
      fuel_level: 73,
      engine_status: "running",
    },
  },
]

// Coalfield map data
export const nodes: Node[] = [
  { node_id: 1, lat: -25.7479, lon: 28.2293 }, // Loading Zone A
  { node_id: 2, lat: -25.7679, lon: 28.2493 }, // Loading Zone B
  { node_id: 3, lat: -25.7279, lon: 28.2693 }, // Dump Site A
  { node_id: 4, lat: -25.7879, lon: 28.2093 }, // Dump Site B
  { node_id: 5, lat: -25.7379, lon: 28.2393 }, // Junction A
  { node_id: 6, lat: -25.7579, lon: 28.2193 }, // Junction B
  { node_id: 7, lat: -25.7779, lon: 28.2593 }, // Maintenance
  { node_id: 8, lat: -25.7179, lon: 28.2793 }, // Fuel Station
  { node_id: 9, lat: -25.7979, lon: 28.1993 }, // Office
  { node_id: 10, lat: -25.7079, lon: 28.2893 }, // Storage
  { node_id: 11, lat: -25.7679, lon: 28.2093 }, // Checkpoint A
  { node_id: 12, lat: -25.7379, lon: 28.2793 }, // Checkpoint B
]

export let edges: Edge[] = [
  { edge_id: 1, start_node: 1, end_node: 5, status: "Open", current_trucks: 0 },
  { edge_id: 2, start_node: 2, end_node: 5, status: "Open", current_trucks: 0 },
  { edge_id: 3, start_node: 5, end_node: 6, status: "Open", current_trucks: 0 },
  { edge_id: 4, start_node: 6, end_node: 3, status: "Open", current_trucks: 0 },
  { edge_id: 5, start_node: 6, end_node: 4, status: "Open", current_trucks: 0 },
  { edge_id: 6, start_node: 1, end_node: 7, status: "Open", current_trucks: 0 },
  { edge_id: 7, start_node: 2, end_node: 8, status: "Open", current_trucks: 0 },
  { edge_id: 8, start_node: 3, end_node: 10, status: "Open", current_trucks: 0 },
  { edge_id: 9, start_node: 4, end_node: 9, status: "Open", current_trucks: 0 },
  { edge_id: 10, start_node: 7, end_node: 11, status: "Open", current_trucks: 0 },
  { edge_id: 11, start_node: 8, end_node: 12, status: "Open", current_trucks: 0 },
  { edge_id: 12, start_node: 9, end_node: 11, status: "Open", current_trucks: 0 },
  { edge_id: 13, start_node: 10, end_node: 12, status: "Open", current_trucks: 0 },
  { edge_id: 14, start_node: 11, end_node: 6, status: "Open", current_trucks: 0 },
  { edge_id: 15, start_node: 12, end_node: 5, status: "Open", current_trucks: 0 },
  { edge_id: 16, start_node: 5, end_node: 9, status: "Open", current_trucks: 0 },
  { edge_id: 17, start_node: 6, end_node: 10, status: "Open", current_trucks: 0 },
  { edge_id: 18, start_node: 7, end_node: 8, status: "Open", current_trucks: 0 },
]

// Simulation parameters
const MOVEMENT_SPEED = 0.0001
const STATUS_CHANGE_PROBABILITY = 0.1

export function simulateTrucks() {
  trucks = trucks.map((truck) => {
    // Random movement within coalfield bounds
    const latChange = (Math.random() - 0.5) * MOVEMENT_SPEED
    const lonChange = (Math.random() - 0.5) * MOVEMENT_SPEED

    // Keep trucks within coalfield bounds
    const newLat = Math.max(-25.8, Math.min(-25.7, truck.lat + latChange))
    const newLon = Math.max(28.19, Math.min(28.29, truck.lon + lonChange))

    // Randomly change status
    let newStatus = truck.status
    if (Math.random() < STATUS_CHANGE_PROBABILITY) {
      const statuses: ("loaded" | "unloaded" | "stopped")[] = ["loaded", "unloaded", "stopped"]
      newStatus = statuses[Math.floor(Math.random() * statuses.length)]
    }

    // Simulate network changes
    const newNetworkInfo = { ...truck.network_info }
    const signalChange = (Math.random() - 0.5) * 20
    newNetworkInfo.signal_strength = Math.max(0, Math.min(100, truck.network_info.signal_strength + signalChange))

    if (newNetworkInfo.signal_strength > 70) {
      newNetworkInfo.connection_status = "connected"
    } else if (newNetworkInfo.signal_strength > 30) {
      newNetworkInfo.connection_status = "weak"
    } else {
      newNetworkInfo.connection_status = "disconnected"
    }

    // Occasionally switch routers
    if (Math.random() < 0.05) {
      const routers = ["ROUTER_NORTH", "ROUTER_SOUTH", "ROUTER_EAST"]
      newNetworkInfo.router_id = routers[Math.floor(Math.random() * routers.length)]
      newNetworkInfo.port = 8080 + Math.floor(Math.random() * 3)
    }

    // Update fuel level
    const newRouteData = { ...truck.route_data }
    newRouteData.fuel_level = Math.max(10, newRouteData.fuel_level - Math.random() * 0.5)
    if (newStatus === "stopped") {
      newRouteData.engine_status = "stopped"
    } else {
      newRouteData.engine_status = Math.random() > 0.8 ? "idle" : "running"
    }

    return {
      ...truck,
      lat: newLat,
      lon: newLon,
      status: newStatus,
      timestamp: new Date().toISOString(),
      network_info: newNetworkInfo,
      route_data: newRouteData,
    }
  })

  // Update traffic counts on edges
  edges = edges.map((edge) => ({
    ...edge,
    current_trucks: Math.floor(Math.random() * 4), // Random traffic simulation
  }))
}

// WebSocket connection management
export interface WebSocketConnection {
  id: string
  routerId: string
  ws: any // WebSocket instance
  connectedAt: Date
}

export interface TrackedTruck extends Truck {
  lastLocationUpdate: Date
}

// Store for managing WebSocket connections and tracking sessions
export const connectionStore = {
  connections: new Map<string, WebSocketConnection>(),
  trackingSessions: new Map<string, Set<string>>(), // routerId -> Set<truckIds>
}

// Helper functions for tracking management
export function startTruckTracking(truckId: string): boolean {
  const truck = trucks.find(t => t.truck_id === truckId)
  if (!truck) return false
  
  truck.is_tracking = true
  truck.timestamp = new Date().toISOString()
  
  // Add to tracking session for the router
  const routerId = truck.network_info.router_id
  if (!connectionStore.trackingSessions.has(routerId)) {
    connectionStore.trackingSessions.set(routerId, new Set())
  }
  connectionStore.trackingSessions.get(routerId)?.add(truckId)
  
  return true
}

export function stopTruckTracking(truckId: string): boolean {
  const truck = trucks.find(t => t.truck_id === truckId)
  if (!truck) return false
  
  truck.is_tracking = false
  
  // Remove from tracking session
  const routerId = truck.network_info.router_id
  connectionStore.trackingSessions.get(routerId)?.delete(truckId)
  
  return true
}

export function getTrackingTrucksByRouter(routerId: string): Truck[] {
  return trucks.filter(truck => 
    truck.network_info.router_id === routerId && truck.is_tracking
  )
}

export function simulateLocationUpdate(truckId: string) {
  const truck = trucks.find(t => t.truck_id === truckId)
  if (!truck || !truck.is_tracking) return null

  // Generate slight location changes for simulation
  const latChange = (Math.random() - 0.5) * 0.001 // Small lat change
  const lonChange = (Math.random() - 0.5) * 0.001 // Small lon change
  
  truck.lat += latChange
  truck.lon += lonChange
  truck.timestamp = new Date().toISOString()
  
  return {
    truck_id: truck.truck_id,
    lat: truck.lat,
    lon: truck.lon,
    timestamp: truck.timestamp,
    status: truck.status,
    fuel_level: truck.route_data.fuel_level,
    engine_status: truck.route_data.engine_status,
  }
}
