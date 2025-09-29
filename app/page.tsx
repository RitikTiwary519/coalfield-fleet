"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useWebSocket } from "@/hooks/use-websocket"
import { MobileTruckRegistration } from "@/components/mobile-truck-registration"

interface Truck {
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
    engine_status: "running" | "stopped"
  }
}

interface Node {
  node_id: number
  lat: number
  lon: number
}

interface Edge {
  edge_id: number
  start_node: number
  end_node: number
  status: "Open" | "Closed"
  current_trucks: number
}

interface MapData {
  nodes: Node[]
  edges: Edge[]
}

interface TruckLoginData {
  network_groups: Record<string, any[]>
  total_active_sessions: number
  last_updated: string
}

interface OptimizationResult {
  success: boolean
  message: string
  trucks_data: any[]
  optimization_analysis: {
    total_trucks: number
    average_fuel: number
    network_efficiency: number
    suggested_routes: Array<{
      truck_id: string
      optimized_route: number[]
      time_saved: number
      fuel_saved: number
    }>
  }
}

export default function FleetDashboard() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [trucks, setTrucks] = useState<Truck[]>([])
  const [mapData, setMapData] = useState<MapData | null>(null)
  const [selectedTruck, setSelectedTruck] = useState<Truck | null>(null)
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null)
  const [networkStatus, setNetworkStatus] = useState<any>(null)
  const [showNetworkPanel, setShowNetworkPanel] = useState(false)
  const [truckLoginData, setTruckLoginData] = useState<TruckLoginData | null>(null)
  const [showTruckLogin, setShowTruckLogin] = useState(false)
  const [activeMonitoring, setActiveMonitoring] = useState<Record<string, boolean>>({})
  const [optimizationResults, setOptimizationResults] = useState<Record<string, OptimizationResult>>({})
  const [connectedRouters, setConnectedRouters] = useState<Set<string>>(new Set())
  const [showMobileMode, setShowMobileMode] = useState(false)
  
  // WebSocket integration for live tracking
  const { 
    isConnected, 
    trucks: wsTrucks, 
    locationUpdates, 
    connect: connectWebSocket, 
    disconnect: disconnectWebSocket, 
    startTracking, 
    stopTracking, 
    connectionError 
  } = useWebSocket()

  const [panelPosition, setPanelPosition] = useState({ x: 16, y: 16 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragOffset({
      x: e.clientX - panelPosition.x,
      y: e.clientY - panelPosition.y,
    })
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      setPanelPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
      })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
      return () => {
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)
      }
    }
  }, [isDragging, dragOffset])

  const fetchTruckLoginData = async () => {
    try {
      console.log("[v0] Fetching truck login data...")
      const response = await fetch("/api/truck-login")
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      const data: TruckLoginData = await response.json()
      console.log("[v0] Truck login data received:", data)
      setTruckLoginData(data)
    } catch (error) {
      console.error("[v0] Error fetching truck login data:", error)
    }
  }

  const startNetworkMonitoring = async (routerId: string) => {
    try {
      const response = await fetch("/api/truck-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          router_id: routerId,
          action: "start_monitoring",
        }),
      })

      const result: OptimizationResult = await response.json()

      if (result.success) {
        setActiveMonitoring((prev) => ({ ...prev, [routerId]: true }))
        setOptimizationResults((prev) => ({ ...prev, [routerId]: result }))
        
        // Connect to WebSocket for real-time updates
        connectWebSocket(routerId)
        setConnectedRouters(prev => new Set([...prev, routerId]))
        
        console.log("[v0] Started monitoring network:", routerId, result)
      }
    } catch (error) {
      console.error("[v0] Error starting network monitoring:", error)
    }
  }

  const handleStartTracking = async (truckId: string) => {
    try {
      const truck = trucks.find(t => t.truck_id === truckId)
      if (!truck) return

      // Start tracking via WebSocket
      startTracking(truckId)
      
      // Also call the REST API as backup
      const response = await fetch("/api/truck-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          truck_id: truckId,
          action: "start_tracking",
        }),
      })

      const result = await response.json()
      console.log("[v0] Started tracking truck:", truckId, result)
    } catch (error) {
      console.error("[v0] Error starting truck tracking:", error)
    }
  }

  const handleStopTracking = async (truckId: string) => {
    try {
      // Stop tracking via WebSocket
      stopTracking(truckId)
      
      // Also call the REST API as backup
      const response = await fetch("/api/truck-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          truck_id: truckId,
          action: "stop_tracking",
        }),
      })

      const result = await response.json()
      console.log("[v0] Stopped tracking truck:", truckId, result)
    } catch (error) {
      console.error("[v0] Error stopping truck tracking:", error)
    }
  }

  const drawMap = () => {
    const canvas = canvasRef.current
    if (!canvas || !mapData) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Set canvas size
    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight

    // Calculate bounds
    const lats = mapData.nodes.map((n) => n.lat)
    const lons = mapData.nodes.map((n) => n.lon)
    const minLat = Math.min(...lats)
    const maxLat = Math.max(...lats)
    const minLon = Math.min(...lons)
    const maxLon = Math.max(...lons)

    // Convert lat/lon to canvas coordinates
    const latLonToCanvas = (lat: number, lon: number) => {
      const x = ((lon - minLon) / (maxLon - minLon)) * (canvas.width - 100) + 50
      const y = ((maxLat - lat) / (maxLat - minLat)) * (canvas.height - 100) + 50
      return { x, y }
    }

    // Draw background grid
    ctx.strokeStyle = "#e5e7eb"
    ctx.lineWidth = 1
    for (let i = 0; i < 10; i++) {
      const x = (i / 9) * canvas.width
      const y = (i / 9) * canvas.height
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, canvas.height)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(canvas.width, y)
      ctx.stroke()
    }

    // Draw edges (roads)
    mapData.edges.forEach((edge) => {
      const startNode = mapData.nodes.find((n) => n.node_id === edge.start_node)
      const endNode = mapData.nodes.find((n) => n.node_id === edge.end_node)

      if (!startNode || !endNode) return

      const start = latLonToCanvas(startNode.lat, startNode.lon)
      const end = latLonToCanvas(endNode.lat, endNode.lon)

      ctx.beginPath()
      ctx.moveTo(start.x, start.y)
      ctx.lineTo(end.x, end.y)

      // Color based on status and traffic
      if (edge.status === "Closed") {
        ctx.strokeStyle = "#ef4444"
        ctx.lineWidth = 4
        ctx.setLineDash([10, 5])
      } else if (edge.current_trucks > 2) {
        ctx.strokeStyle = "#dc2626"
        ctx.lineWidth = 6
        ctx.setLineDash([])
      } else if (edge.current_trucks > 0) {
        ctx.strokeStyle = "#f59e0b"
        ctx.lineWidth = 4
        ctx.setLineDash([])
      } else {
        ctx.strokeStyle = "#22c55e"
        ctx.lineWidth = 3
        ctx.setLineDash([])
      }

      ctx.stroke()
      ctx.setLineDash([])

      // Draw traffic count
      const midX = (start.x + end.x) / 2
      const midY = (start.y + end.y) / 2
      if (edge.current_trucks > 0) {
        ctx.fillStyle = "#ffffff"
        ctx.fillRect(midX - 10, midY - 8, 20, 16)
        ctx.fillStyle = "#000000"
        ctx.font = "12px sans-serif"
        ctx.textAlign = "center"
        ctx.fillText(edge.current_trucks.toString(), midX, midY + 4)
      }
    })

    // Draw nodes
    mapData.nodes.forEach((node) => {
      const pos = latLonToCanvas(node.lat, node.lon)

      ctx.beginPath()
      ctx.arc(pos.x, pos.y, 8, 0, 2 * Math.PI)
      ctx.fillStyle = "#ffffff"
      ctx.fill()
      ctx.strokeStyle = "#000000"
      ctx.lineWidth = 2
      ctx.stroke()

      // Draw node ID
      ctx.fillStyle = "#000000"
      ctx.font = "12px sans-serif"
      ctx.textAlign = "center"
      ctx.fillText(node.node_id.toString(), pos.x, pos.y - 15)
    })

    // Draw trucks with network status indicators
    trucks.forEach((truck) => {
      const pos = latLonToCanvas(truck.lat, truck.lon)

      ctx.beginPath()
      ctx.arc(pos.x, pos.y, 10, 0, 2 * Math.PI)

      // Color based on status
      switch (truck.status) {
        case "loaded":
          ctx.fillStyle = "#3b82f6"
          break
        case "unloaded":
          ctx.fillStyle = "#22c55e"
          break
        case "stopped":
          ctx.fillStyle = "#ef4444"
          break
      }

      ctx.fill()
      ctx.strokeStyle = "#ffffff"
      ctx.lineWidth = 3
      ctx.stroke()

      ctx.beginPath()
      ctx.arc(pos.x + 8, pos.y - 8, 4, 0, 2 * Math.PI)

      switch (truck.network_info.connection_status) {
        case "connected":
          ctx.fillStyle = "#10b981"
          break
        case "weak":
          ctx.fillStyle = "#f59e0b"
          break
        case "disconnected":
          ctx.fillStyle = "#ef4444"
          break
      }

      ctx.fill()
      ctx.strokeStyle = "#ffffff"
      ctx.lineWidth = 1
      ctx.stroke()

      // Draw truck ID
      ctx.fillStyle = "#000000"
      ctx.font = "10px sans-serif"
      ctx.textAlign = "center"
      ctx.fillText(truck.truck_id, pos.x, pos.y + 20)
    })
  }

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas || !mapData) return

    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    // Check truck clicks
    const lats = mapData.nodes.map((n) => n.lat)
    const lons = mapData.nodes.map((n) => n.lon)
    const minLat = Math.min(...lats)
    const maxLat = Math.max(...lats)
    const minLon = Math.min(...lons)
    const maxLon = Math.max(...lons)

    const latLonToCanvas = (lat: number, lon: number) => {
      const canvasX = ((lon - minLon) / (maxLon - minLon)) * (canvas.width - 100) + 50
      const canvasY = ((maxLat - lat) / (maxLat - minLat)) * (canvas.height - 100) + 50
      return { x: canvasX, y: canvasY }
    }

    // Check if clicked on a truck
    for (const truck of trucks) {
      const pos = latLonToCanvas(truck.lat, truck.lon)
      const distance = Math.sqrt((x - pos.x) ** 2 + (y - pos.y) ** 2)
      if (distance <= 10) {
        setSelectedTruck(truck)
        return
      }
    }

    // Check if clicked on an edge
    for (const edge of mapData.edges) {
      const startNode = mapData.nodes.find((n) => n.node_id === edge.start_node)
      const endNode = mapData.nodes.find((n) => n.node_id === edge.end_node)

      if (!startNode || !endNode) continue

      const start = latLonToCanvas(startNode.lat, startNode.lon)
      const end = latLonToCanvas(endNode.lat, endNode.lon)

      // Check if click is near the line
      const A = x - start.x
      const B = y - start.y
      const C = end.x - start.x
      const D = end.y - start.y

      const dot = A * C + B * D
      const lenSq = C * C + D * D
      let param = -1
      if (lenSq !== 0) param = dot / lenSq

      let xx, yy
      if (param < 0) {
        xx = start.x
        yy = start.y
      } else if (param > 1) {
        xx = end.x
        yy = end.y
      } else {
        xx = start.x + param * C
        yy = start.y + param * D
      }

      const dx = x - xx
      const dy = y - yy
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance <= 10) {
        setSelectedEdge(edge)
        return
      }
    }

    // Clear selections if clicked elsewhere
    setSelectedTruck(null)
    setSelectedEdge(null)
  }

  const fetchMapData = async () => {
    try {
      console.log("[v0] Fetching map data...")
      const response = await fetch("/api/map-data")
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      const data: MapData = await response.json()
      console.log("[v0] Map data received:", data)
      setMapData(data)
    } catch (error) {
      console.error("[v0] Error fetching map data:", error)
    }
  }

  const fetchTrucks = async () => {
    try {
      console.log("[v0] Fetching trucks...")
      const response = await fetch("/api/trucks")
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      const data: Truck[] = await response.json()
      console.log("[v0] Trucks data received:", data)
      setTrucks(data)
    } catch (error) {
      console.error("[v0] Error fetching trucks:", error)
    }
  }

  const toggleEdgeStatus = async (edge: Edge) => {
    const newStatus = edge.status === "Open" ? "Closed" : "Open"

    try {
      const response = await fetch(`/api/edges/${edge.edge_id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        // Update local state
        if (mapData) {
          const updatedEdges = mapData.edges.map((e) => (e.edge_id === edge.edge_id ? { ...e, status: newStatus as "Open" | "Closed" } : e))
          const updatedMapData = { ...mapData, edges: updatedEdges }
          setMapData(updatedMapData)
        }
        setSelectedEdge(null)
      }
    } catch (error) {
      console.error("[v0] Error updating edge status:", error)
    }
  }

  const fetchNetworkStatus = async () => {
    try {
      console.log("[v0] Fetching network status...")
      const response = await fetch("/api/network-status")
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      const data = await response.json()
      console.log("[v0] Network status received:", data)
      setNetworkStatus(data)
    } catch (error) {
      console.error("[v0] Error fetching network status:", error)
    }
  }

  useEffect(() => {
    console.log("[v0] Component mounted, initializing data...")
    fetchMapData()
    fetchTrucks()
    fetchNetworkStatus()
    fetchTruckLoginData()
  }, [])

  useEffect(() => {
    drawMap()
  }, [mapData, trucks])

  useEffect(() => {
    const interval = setInterval(() => {
      // Only fetch regular data if not using WebSocket for those routers
      if (connectedRouters.size === 0) {
        fetchTrucks()
        fetchMapData()
        fetchNetworkStatus()
        fetchTruckLoginData()
      } else {
        // Still fetch map data and network status, but not truck data
        fetchMapData()
        fetchNetworkStatus()
        fetchTruckLoginData()
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [connectedRouters])

  // Merge WebSocket truck data with regular truck data
  useEffect(() => {
    if (wsTrucks.length > 0) {
      setTrucks(prevTrucks => {
        // Create a map of WebSocket trucks for quick lookup
        const wsTrackedTrucks = new Map(wsTrucks.map(truck => [truck.truck_id, truck]))
        
        // Update existing trucks with WebSocket data or keep original data
        return prevTrucks.map(truck => {
          const wsUpdate = wsTrackedTrucks.get(truck.truck_id)
          if (wsUpdate) {
            // Use WebSocket data for tracked trucks
            return { ...truck, ...wsUpdate }
          }
          return truck
        })
      })
    }
  }, [wsTrucks])

  // Log location updates for debugging
  useEffect(() => {
    if (locationUpdates.length > 0) {
      console.log("[v0] Live location updates received:", locationUpdates.slice(0, 5))
    }
  }, [locationUpdates])

  return (
    <div className="h-screen w-full relative bg-gray-100">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full cursor-pointer" onClick={handleCanvasClick} />

      <div
        className="absolute z-10 space-y-4 cursor-move"
        style={{ left: panelPosition.x, top: panelPosition.y }}
        onMouseDown={handleMouseDown}
      >
        <Card className="p-4 bg-white/90 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-xl font-bold">Coalfield Fleet Management</h1>
            <div className="text-xs text-gray-500">📍 Drag to move</div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-green-500"></div>
              <span className="text-sm">Unloaded ({trucks.filter((t) => t.status === "unloaded").length})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-blue-500"></div>
              <span className="text-sm">Loaded ({trucks.filter((t) => t.status === "loaded").length})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-red-500"></div>
              <span className="text-sm">Stopped ({trucks.filter((t) => t.status === "stopped").length})</span>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <Button
              onClick={() => setShowNetworkPanel(!showNetworkPanel)}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              {showNetworkPanel ? "Hide" : "Show"} Network
            </Button>
            <Button onClick={() => setShowTruckLogin(!showTruckLogin)} variant="outline" size="sm" className="flex-1">
              {showTruckLogin ? "Hide" : "Show"} Truck Login
            </Button>
          </div>
          <div className="flex gap-2 mt-2">
            <Button 
              onClick={() => setShowMobileMode(!showMobileMode)} 
              variant="outline" 
              size="sm" 
              className="w-full"
            >
              📱 {showMobileMode ? "Hide" : "Show"} Mobile Truck Mode
            </Button>
          </div>
        </Card>

        {showTruckLogin && (
          <Card className="p-4 bg-white/95 backdrop-blur-sm max-w-md border-2 border-blue-200">
            <h2 className="font-semibold mb-3 text-blue-800">🚛 Truck Login & Route Optimization</h2>
            {truckLoginData ? (
              <>
                <div className="text-xs text-gray-600 mb-3 bg-blue-50 p-2 rounded">
                  Active Sessions: {truckLoginData.total_active_sessions} | Last Updated:{" "}
                  {new Date(truckLoginData.last_updated).toLocaleTimeString()}
                </div>
                <div className="space-y-3">
                  {Object.entries(truckLoginData.network_groups).map(([routerId, trucks]) => (
                    <div key={routerId} className="border rounded p-3 bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-green-700">📡 {routerId}</h3>
                        <Badge variant="secondary">{trucks.length} Trucks Connected</Badge>
                      </div>

                      <div className="text-xs text-gray-600 mb-2">
                        Ports: {trucks.map((t: any) => t.network_info.port).join(", ")}
                      </div>

                      <div className="space-y-2">
                        {trucks.map((truck: any) => (
                          <div
                            key={truck.truck_id}
                            className="flex items-center justify-between text-xs bg-white p-2 rounded border"
                          >
                            <span className="font-medium">{truck.truck_id}</span>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                Fuel: {truck.route_data.fuel_level.toFixed(0)}%
                              </Badge>
                              <Badge
                                variant={truck.route_data.engine_status === "running" ? "default" : "secondary"}
                                className="text-xs"
                              >
                                {truck.route_data.engine_status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>

                      <Button
                        onClick={() => startNetworkMonitoring(routerId)}
                        disabled={activeMonitoring[routerId]}
                        variant={activeMonitoring[routerId] ? "secondary" : "default"}
                        size="sm"
                        className="w-full mt-2"
                      >
                        {activeMonitoring[routerId] ? "✅ Monitoring Active" : "🚀 Start Network Monitoring"}
                      </Button>

                      {optimizationResults[routerId] && (
                        <div className="mt-3 p-2 bg-green-50 rounded border border-green-200">
                          <div className="text-xs font-medium text-green-800 mb-1">📊 Route Optimization Results</div>
                          <div className="text-xs text-green-700 space-y-1">
                            <div>
                              Network Efficiency:{" "}
                              {optimizationResults[routerId].optimization_analysis.network_efficiency.toFixed(1)}%
                            </div>
                            <div>
                              Avg Fuel Level:{" "}
                              {optimizationResults[routerId].optimization_analysis.average_fuel.toFixed(1)}%
                            </div>
                            <div className="font-medium">💡 Suggested Optimizations:</div>
                            {optimizationResults[routerId].optimization_analysis.suggested_routes
                              .slice(0, 2)
                              .map((route) => (
                                <div key={route.truck_id} className="ml-2">
                                  • {route.truck_id}: Save {route.time_saved}min, {route.fuel_saved}% fuel
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-4 text-gray-500">
                <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                Loading truck login data...
              </div>
            )}
          </Card>
        )}

        {showMobileMode && (
          <MobileTruckRegistration 
            onRegistered={(truckData) => {
              console.log("[v0] New mobile truck registered:", truckData)
              // Refresh trucks data to include the new mobile truck
              fetchTrucks()
            }}
          />
        )}

        {showNetworkPanel && networkStatus && (
          <Card className="p-4 bg-white/90 backdrop-blur-sm max-w-sm">
            <h2 className="font-semibold mb-3">Network Connectivity</h2>
            <div className="space-y-3">
              {Object.values(networkStatus).map((router: any) => (
                <div key={router.router_id} className="border rounded p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium">{router.router_id}</h3>
                    <Badge variant="secondary">
                      {router.connected_trucks}/{router.total_trucks} Connected
                    </Badge>
                  </div>
                  <div className="text-xs text-gray-600 mb-2">Ports: {router.ports_in_use.join(", ")}</div>
                  <div className="space-y-1">
                    {router.trucks.map((truck: any) => (
                      <div key={truck.truck_id} className="flex items-center justify-between text-xs">
                        <span>{truck.truck_id}</span>
                        <div className="flex items-center gap-2">
                          <span>:{truck.port}</span>
                          <Badge
                            variant={
                              truck.connection_status === "connected"
                                ? "default"
                                : truck.connection_status === "weak"
                                  ? "secondary"
                                  : "destructive"
                            }
                            className="text-xs px-1 py-0"
                          >
                            {truck.signal_strength}%
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        <Card className="p-4 bg-white/90 backdrop-blur-sm">
          <h2 className="font-semibold mb-2">Road Status Legend</h2>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-4 h-1 bg-green-500"></div>
              <span className="text-sm">Open - Low Traffic</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-1 bg-yellow-500"></div>
              <span className="text-sm">Open - Medium Traffic</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-1 bg-red-600"></div>
              <span className="text-sm">Open - High Traffic</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-1 bg-red-500 border-dashed border border-red-700"></div>
              <span className="text-sm">Closed</span>
            </div>
          </div>
        </Card>
      </div>

      {selectedTruck && (
        <div className="absolute top-4 right-4 z-10">
          <Card className="p-4 bg-white/95 backdrop-blur-sm">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold">{selectedTruck.truck_id}</h3>
              <Button variant="ghost" size="sm" onClick={() => setSelectedTruck(null)}>
                ×
              </Button>
            </div>
            <div className="space-y-2">
              <div>
                <Badge
                  variant={
                    selectedTruck.status === "loaded"
                      ? "default"
                      : selectedTruck.status === "unloaded"
                        ? "secondary"
                        : "destructive"
                  }
                >
                  {selectedTruck.status.toUpperCase()}
                </Badge>
              </div>
              <div className="border-t pt-2">
                <div className="text-sm font-medium mb-1">Network Info</div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>Router: {selectedTruck.network_info.router_id}</div>
                  <div>Port: {selectedTruck.network_info.port}</div>
                  <div className="flex items-center gap-2">
                    <span>Signal: {selectedTruck.network_info.signal_strength}%</span>
                    <Badge
                      variant={
                        selectedTruck.network_info.connection_status === "connected"
                          ? "default"
                          : selectedTruck.network_info.connection_status === "weak"
                            ? "secondary"
                            : "destructive"
                      }
                      className="text-xs"
                    >
                      {selectedTruck.network_info.connection_status}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                <div>Lat: {selectedTruck.lat.toFixed(4)}</div>
                <div>Lon: {selectedTruck.lon.toFixed(4)}</div>
                <div>Updated: {new Date(selectedTruck.timestamp).toLocaleTimeString()}</div>
              </div>
              
              {/* Live Tracking Controls */}
              <div className="flex flex-col gap-2 mt-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Live Tracking:</span>
                  <Badge variant={selectedTruck.is_tracking ? "default" : "secondary"}>
                    {selectedTruck.is_tracking ? "Active" : "Inactive"}
                  </Badge>
                  {isConnected && connectedRouters.has(selectedTruck.network_info.router_id) && (
                    <Badge variant="outline" className="text-xs">
                      Connected
                    </Badge>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleStartTracking(selectedTruck.truck_id)}
                    disabled={selectedTruck.is_tracking || !connectedRouters.has(selectedTruck.network_info.router_id)}
                    size="sm"
                    variant="default"
                    className="flex-1"
                  >
                    Start Tracking
                  </Button>
                  <Button
                    onClick={() => handleStopTracking(selectedTruck.truck_id)}
                    disabled={!selectedTruck.is_tracking}
                    size="sm"
                    variant="destructive"
                    className="flex-1"
                  >
                    Stop Tracking
                  </Button>
                </div>
                
                {connectionError && (
                  <div className="text-xs text-destructive mt-1">
                    Connection Error: {connectionError}
                  </div>
                )}
                
                {locationUpdates.length > 0 && selectedTruck.is_tracking && (
                  <div className="text-xs text-green-600 mt-1">
                    ✓ Receiving live updates ({locationUpdates.length} recent)
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}

      {selectedEdge && (
        <div className="absolute bottom-4 right-4 z-10">
          <Card className="p-4 bg-white/95 backdrop-blur-sm">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold">Road {selectedEdge.edge_id}</h3>
              <Button variant="ghost" size="sm" onClick={() => setSelectedEdge(null)}>
                ×
              </Button>
            </div>
            <div className="space-y-3">
              <div>
                <Badge variant={selectedEdge.status === "Open" ? "secondary" : "destructive"}>
                  {selectedEdge.status}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                <div>Current trucks: {selectedEdge.current_trucks}</div>
                <div>
                  Nodes: {selectedEdge.start_node} → {selectedEdge.end_node}
                </div>
              </div>
              <Button
                onClick={() => toggleEdgeStatus(selectedEdge)}
                variant={selectedEdge.status === "Open" ? "destructive" : "default"}
                size="sm"
                className="w-full"
              >
                {selectedEdge.status === "Open" ? "Close Road" : "Open Road"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
