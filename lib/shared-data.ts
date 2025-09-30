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

// Shared truck data - simplified for better tracking
export let trucks: Truck[] = [
  {
    truck_id: "TRUCK-1",
    lat: -25.7479,
    lon: 28.2293,
    status: "loaded",
    timestamp: new Date().toISOString(),
    is_tracking: false,
    network_info: {
      router_id: "ROUTER_MAIN",
      port: 8080,
      signal_strength: 95,
      connection_status: "connected",
    },
    route_data: {
      fuel_level: 85,
      engine_status: "running",
    },
  },
  {
    truck_id: "TRUCK-2",
    lat: -25.7679,
    lon: 28.2493,
    status: "unloaded",
    timestamp: new Date().toISOString(),
    is_tracking: false,
    network_info: {
      router_id: "ROUTER_MAIN",
      port: 8081,
      signal_strength: 88,
      connection_status: "connected",
    },
    route_data: {
      fuel_level: 62,
      engine_status: "running",
    },
  },
]

// Simplified coalfield map data for better clarity
export const nodes: Node[] = [
  { node_id: 1, lat: -25.7400, lon: 28.2200 }, // Loading Zone
  { node_id: 2, lat: -25.7600, lon: 28.2400 }, // Main Junction
  { node_id: 3, lat: -25.7300, lon: 28.2600 }, // Dump Site
  { node_id: 4, lat: -25.7500, lon: 28.2300 }, // Fuel Station
]

export let edges: Edge[] = [
  { edge_id: 1, start_node: 1, end_node: 2, status: "Open", current_trucks: 0 }, // Loading to Junction
  { edge_id: 2, start_node: 2, end_node: 3, status: "Open", current_trucks: 0 }, // Junction to Dump
  { edge_id: 3, start_node: 2, end_node: 4, status: "Open", current_trucks: 0 }, // Junction to Fuel
  { edge_id: 4, start_node: 4, end_node: 1, status: "Open", current_trucks: 0 }, // Fuel to Loading
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
