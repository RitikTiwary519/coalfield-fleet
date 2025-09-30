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

export default function FleetDashboard() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [trucks, setTrucks] = useState<Truck[]>([])
  const [mapData, setMapData] = useState<MapData | null>(null)
  const [selectedTruck, setSelectedTruck] = useState<Truck | null>(null)
  const [isMobile, setIsMobile] = useState(false)

  // WebSocket integration for live tracking
  const { 
    isConnected, 
    trucks: wsTrucks, 
    locationUpdates, 
    connect: connectWebSocket, 
    startTracking, 
    stopTracking, 
    connectionError 
  } = useWebSocket()

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase()
      const mobileDevices = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/
      setIsMobile(mobileDevices.test(userAgent) || window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch trucks
        const trucksResponse = await fetch('/api/trucks')
        const trucksData = await trucksResponse.json()
        setTrucks(trucksData)

        // Fetch map data
        const mapResponse = await fetch('/api/map-data')
        const mapDataResponse = await mapResponse.json()
        setMapData(mapDataResponse)
      } catch (error) {
        console.error('Error fetching data:', error)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 5000) // Refresh every 5 seconds
    return () => clearInterval(interval)
  }, [])

  // Connect to WebSocket for live tracking
  useEffect(() => {
    connectWebSocket('ROUTER_MAIN')
    return () => {
      // WebSocket cleanup handled by hook
    }
  }, [connectWebSocket])

  // Update trucks with WebSocket data
  useEffect(() => {
    if (wsTrucks.length > 0) {
      setTrucks(wsTrucks)
    }
  }, [wsTrucks])

  // Handle truck tracking
  const handleStartTracking = (truckId: string) => {
    startTracking(truckId)
    console.log(`Started tracking: ${truckId}`)
  }

  const handleStopTracking = (truckId: string) => {
    stopTracking(truckId)
    console.log(`Stopped tracking: ${truckId}`)
  }

  // Enhanced map drawing with better visuals
  const drawMap = () => {
    const canvas = canvasRef.current
    if (!canvas || !mapData) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size
    canvas.width = canvas.offsetWidth * window.devicePixelRatio
    canvas.height = canvas.offsetHeight * window.devicePixelRatio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    
    const canvasWidth = canvas.offsetWidth
    const canvasHeight = canvas.offsetHeight

    // Clear canvas with background
    ctx.fillStyle = "#f8fafc"
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)

    // Calculate bounds for better positioning
    const lats = [...mapData.nodes.map(n => n.lat), ...trucks.map(t => t.lat)]
    const lons = [...mapData.nodes.map(n => n.lon), ...trucks.map(t => t.lon)]
    const minLat = Math.min(...lats) - 0.002
    const maxLat = Math.max(...lats) + 0.002
    const minLon = Math.min(...lons) - 0.002
    const maxLon = Math.max(...lons) + 0.002

    // Convert lat/lon to canvas coordinates
    const latLonToCanvas = (lat: number, lon: number) => {
      const x = ((lon - minLon) / (maxLon - minLon)) * (canvasWidth - 80) + 40
      const y = ((maxLat - lat) / (maxLat - minLat)) * (canvasHeight - 80) + 40
      return { x, y }
    }

    // Draw grid background
    ctx.strokeStyle = "#e2e8f0"
    ctx.lineWidth = 1
    ctx.setLineDash([2, 2])
    for (let i = 0; i <= 8; i++) {
      const x = (i / 8) * canvasWidth
      const y = (i / 8) * canvasHeight
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, canvasHeight)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(canvasWidth, y)
      ctx.stroke()
    }
    ctx.setLineDash([])

    // Draw roads (edges) with improved styling
    mapData.edges.forEach((edge) => {
      const startNode = mapData.nodes.find(n => n.node_id === edge.start_node)
      const endNode = mapData.nodes.find(n => n.node_id === edge.end_node)

      if (!startNode || !endNode) return

      const start = latLonToCanvas(startNode.lat, startNode.lon)
      const end = latLonToCanvas(endNode.lat, endNode.lon)

      // Draw road background (wider)
      ctx.beginPath()
      ctx.moveTo(start.x, start.y)
      ctx.lineTo(end.x, end.y)
      ctx.strokeStyle = "#475569"
      ctx.lineWidth = 8
      ctx.stroke()

      // Draw road surface (narrower, colored)
      ctx.beginPath()
      ctx.moveTo(start.x, start.y)
      ctx.lineTo(end.x, end.y)
      
      if (edge.status === "Closed") {
        ctx.strokeStyle = "#dc2626"
        ctx.setLineDash([5, 5])
      } else if (edge.current_trucks > 1) {
        ctx.strokeStyle = "#f59e0b"
      } else {
        ctx.strokeStyle = "#10b981"
      }
      
      ctx.lineWidth = 4
      ctx.stroke()
      ctx.setLineDash([])

      // Draw traffic indicator
      if (edge.current_trucks > 0) {
        const midX = (start.x + end.x) / 2
        const midY = (start.y + end.y) / 2
        
        ctx.fillStyle = "#ffffff"
        ctx.fillRect(midX - 12, midY - 10, 24, 20)
        ctx.strokeStyle = "#374151"
        ctx.lineWidth = 1
        ctx.strokeRect(midX - 12, midY - 10, 24, 20)
        
        ctx.fillStyle = "#374151"
        ctx.font = "12px Arial, sans-serif"
        ctx.textAlign = "center"
        ctx.fillText(edge.current_trucks.toString(), midX, midY + 4)
      }
    })

    // Draw nodes (intersections) with labels
    mapData.nodes.forEach((node) => {
      const pos = latLonToCanvas(node.lat, node.lon)

      // Node circle
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, 12, 0, 2 * Math.PI)
      ctx.fillStyle = "#ffffff"
      ctx.fill()
      ctx.strokeStyle = "#374151"
      ctx.lineWidth = 3
      ctx.stroke()

      // Node ID
      ctx.fillStyle = "#374151"
      ctx.font = "bold 10px Arial, sans-serif"
      ctx.textAlign = "center"
      ctx.fillText(node.node_id.toString(), pos.x, pos.y + 3)

      // Node label
      const labels = {
        1: "Loading Zone",
        2: "Main Junction", 
        3: "Dump Site",
        4: "Fuel Station"
      }
      
      ctx.fillStyle = "#64748b"
      ctx.font = "11px Arial, sans-serif"
      ctx.fillText(labels[node.node_id as keyof typeof labels] || `Node ${node.node_id}`, pos.x, pos.y + 25)
    })

    // Draw trucks with enhanced styling
    trucks.forEach((truck) => {
      const pos = latLonToCanvas(truck.lat, truck.lon)

      // Truck shadow
      ctx.beginPath()
      ctx.arc(pos.x + 2, pos.y + 2, 16, 0, 2 * Math.PI)
      ctx.fillStyle = "rgba(0, 0, 0, 0.2)"
      ctx.fill()

      // Truck body
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, 16, 0, 2 * Math.PI)
      
      switch (truck.status) {
        case "loaded":
          ctx.fillStyle = "#3b82f6" // Blue
          break
        case "unloaded":
          ctx.fillStyle = "#10b981" // Green
          break
        case "stopped":
          ctx.fillStyle = "#ef4444" // Red
          break
      }
      
      ctx.fill()
      ctx.strokeStyle = "#ffffff"
      ctx.lineWidth = 3
      ctx.stroke()

      // Truck icon (simplified)
      ctx.fillStyle = "#ffffff"
      ctx.font = "16px Arial, sans-serif"
      ctx.textAlign = "center"
      ctx.fillText("🚛", pos.x, pos.y + 5)

      // Tracking indicator
      if (truck.is_tracking) {
        ctx.beginPath()
        ctx.arc(pos.x + 12, pos.y - 12, 6, 0, 2 * Math.PI)
        ctx.fillStyle = "#22c55e"
        ctx.fill()
        ctx.strokeStyle = "#ffffff"
        ctx.lineWidth = 2
        ctx.stroke()
        
        // Pulsing effect for active tracking
        ctx.beginPath()
        ctx.arc(pos.x + 12, pos.y - 12, 8, 0, 2 * Math.PI)
        ctx.strokeStyle = "#22c55e"
        ctx.lineWidth = 2
        ctx.stroke()
      }

      // Connection status indicator
      ctx.beginPath()
      ctx.arc(pos.x + 12, pos.y + 12, 4, 0, 2 * Math.PI)
      
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

      // Truck ID label
      ctx.fillStyle = "#1f2937"
      ctx.font = "bold 12px Arial, sans-serif"
      ctx.textAlign = "center"
      ctx.fillText(truck.truck_id, pos.x, pos.y + 35)

      // Fuel level indicator
      ctx.fillStyle = "#6b7280"
      ctx.font = "10px Arial, sans-serif"
      ctx.fillText(`⛽ ${truck.route_data.fuel_level.toFixed(0)}%`, pos.x, pos.y + 48)
    })

    // Draw legend
    drawLegend(ctx, canvasWidth, canvasHeight)
  }

  // Draw legend for better understanding
  const drawLegend = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const legendX = width - 180
    const legendY = 20
    
    // Legend background
    ctx.fillStyle = "rgba(255, 255, 255, 0.95)"
    ctx.fillRect(legendX, legendY, 160, 140)
    ctx.strokeStyle = "#d1d5db"
    ctx.lineWidth = 1
    ctx.strokeRect(legendX, legendY, 160, 140)
    
    // Legend title
    ctx.fillStyle = "#1f2937"
    ctx.font = "bold 14px Arial, sans-serif"
    ctx.textAlign = "left"
    ctx.fillText("Legend", legendX + 10, legendY + 20)
    
    // Truck status legend
    const statusItems = [
      { color: "#3b82f6", label: "🚛 Loaded Truck", y: 35 },
      { color: "#10b981", label: "🚛 Empty Truck", y: 50 },
      { color: "#ef4444", label: "🚛 Stopped Truck", y: 65 },
      { color: "#22c55e", label: "● Live Tracking", y: 80 },
      { color: "#10b981", label: "● Connected", y: 95 },
      { color: "#f59e0b", label: "● Weak Signal", y: 110 },
      { color: "#ef4444", label: "● Disconnected", y: 125 }
    ]
    
    statusItems.forEach(item => {
      ctx.fillStyle = item.color
      ctx.beginPath()
      ctx.arc(legendX + 15, legendY + item.y - 3, 4, 0, 2 * Math.PI)
      ctx.fill()
      
      ctx.fillStyle = "#4b5563"
      ctx.font = "11px Arial, sans-serif"
      ctx.fillText(item.label, legendX + 25, legendY + item.y)
    })
  }

  // Handle canvas click for truck selection
  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas || !mapData) return

    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    // Calculate coordinates
    const lats = [...mapData.nodes.map(n => n.lat), ...trucks.map(t => t.lat)]
    const lons = [...mapData.nodes.map(n => n.lon), ...trucks.map(t => t.lon)]
    const minLat = Math.min(...lats) - 0.002
    const maxLat = Math.max(...lats) + 0.002
    const minLon = Math.min(...lons) - 0.002
    const maxLon = Math.max(...lons) + 0.002

    const latLonToCanvas = (lat: number, lon: number) => {
      const canvasX = ((lon - minLon) / (maxLon - minLon)) * (canvas.offsetWidth - 80) + 40
      const canvasY = ((maxLat - lat) / (maxLat - minLat)) * (canvas.offsetHeight - 80) + 40
      return { x: canvasX, y: canvasY }
    }

    // Check if clicked on a truck
    for (const truck of trucks) {
      const pos = latLonToCanvas(truck.lat, truck.lon)
      const distance = Math.sqrt((x - pos.x) ** 2 + (y - pos.y) ** 2)
      
      if (distance <= 20) {
        setSelectedTruck(selectedTruck?.truck_id === truck.truck_id ? null : truck)
        return
      }
    }
    
    setSelectedTruck(null)
  }

  // Redraw map when data changes
  useEffect(() => {
    drawMap()
  }, [mapData, trucks])

  // Redraw map on canvas resize
  useEffect(() => {
    const handleResize = () => {
      setTimeout(drawMap, 100)
    }
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [mapData, trucks])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">🚛 Coalfield Fleet Tracker</h1>
              <p className="text-sm text-gray-600 mt-1">Real-time GPS tracking & fleet management</p>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant={isConnected ? "default" : "destructive"}>
                {isConnected ? "🟢 Connected" : "🔴 Disconnected"}
              </Badge>
              {connectionError && (
                <Badge variant="destructive">⚠️ {connectionError}</Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Registration - Show on mobile devices */}
      {isMobile && (
        <div className="bg-blue-50 border-b border-blue-200">
          <div className="max-w-7xl mx-auto px-4 py-2">
            <MobileTruckRegistration onRegistered={(data) => {
              console.log('Mobile device registered:', data)
            }} />
          </div>
        </div>
      )}

      {/* Main Dashboard */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Map Section */}
          <div className="lg:col-span-3">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Live Fleet Map</h2>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>Active Trucks: {trucks.filter(t => t.is_tracking).length}/{trucks.length}</span>
                  <span className="text-green-600">●</span>
                  <span>Live Updates</span>
                </div>
              </div>
              
              <div className="relative bg-slate-50 rounded-lg border-2 border-slate-200">
                <canvas
                  ref={canvasRef}
                  onClick={handleCanvasClick}
                  className="w-full h-96 lg:h-[500px] cursor-pointer rounded-lg"
                  style={{ width: '100%', height: isMobile ? '300px' : '500px' }}
                />
              </div>
              
              {trucks.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>Loading fleet data...</p>
                </div>
              )}
            </Card>
          </div>

          {/* Control Panel */}
          <div className="space-y-6">
            
            {/* Truck Controls */}
            <Card className="p-4">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Fleet Control</h3>
              
              <div className="space-y-3">
                {trucks.map((truck) => (
                  <div key={truck.truck_id} className="p-3 border rounded-lg bg-white">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium text-gray-900">{truck.truck_id}</div>
                      <Badge 
                        variant={truck.status === "loaded" ? "default" : 
                               truck.status === "unloaded" ? "secondary" : "destructive"}
                      >
                        {truck.status}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-3">
                      <div>⛽ {truck.route_data.fuel_level.toFixed(0)}%</div>
                      <div>📶 {truck.network_info.signal_strength}%</div>
                      <div className="col-span-2">
                        📍 {truck.lat.toFixed(4)}, {truck.lon.toFixed(4)}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {truck.is_tracking ? (
                        <Button
                          onClick={() => handleStopTracking(truck.truck_id)}
                          variant="destructive"
                          size="sm"
                          className="flex-1"
                        >
                          ⏹️ Stop
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleStartTracking(truck.truck_id)}
                          variant="default"
                          size="sm"
                          className="flex-1"
                        >
                          ▶️ Track
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Selected Truck Details */}
            {selectedTruck && (
              <Card className="p-4">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Truck Details</h3>
                
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="font-medium text-gray-700">Truck ID</div>
                      <div className="text-gray-900">{selectedTruck.truck_id}</div>
                    </div>
                    <div>
                      <div className="font-medium text-gray-700">Status</div>
                      <Badge variant={selectedTruck.status === "loaded" ? "default" : 
                                   selectedTruck.status === "unloaded" ? "secondary" : "destructive"}>
                        {selectedTruck.status}
                      </Badge>
                    </div>
                    <div>
                      <div className="font-medium text-gray-700">Fuel Level</div>
                      <div className="text-gray-900">{selectedTruck.route_data.fuel_level.toFixed(1)}%</div>
                    </div>
                    <div>
                      <div className="font-medium text-gray-700">Engine</div>
                      <div className="text-gray-900">{selectedTruck.route_data.engine_status}</div>
                    </div>
                    <div>
                      <div className="font-medium text-gray-700">Signal</div>
                      <div className="text-gray-900">{selectedTruck.network_info.signal_strength}%</div>
                    </div>
                    <div>
                      <div className="font-medium text-gray-700">Network</div>
                      <Badge variant={selectedTruck.network_info.connection_status === "connected" ? "default" : "destructive"}>
                        {selectedTruck.network_info.connection_status}
                      </Badge>
                    </div>
                  </div>
                  
                  <div>
                    <div className="font-medium text-gray-700">Location</div>
                    <div className="text-xs text-gray-600 mt-1">
                      Lat: {selectedTruck.lat.toFixed(6)}<br />
                      Lon: {selectedTruck.lon.toFixed(6)}
                    </div>
                  </div>
                  
                  <div>
                    <div className="font-medium text-gray-700">Last Update</div>
                    <div className="text-xs text-gray-600">
                      {new Date(selectedTruck.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Status Summary */}
            <Card className="p-4">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Fleet Summary</h3>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="text-center p-2 bg-blue-50 rounded">
                  <div className="font-bold text-blue-600">{trucks.filter(t => t.status === "loaded").length}</div>
                  <div className="text-blue-700">Loaded</div>
                </div>
                <div className="text-center p-2 bg-green-50 rounded">
                  <div className="font-bold text-green-600">{trucks.filter(t => t.status === "unloaded").length}</div>
                  <div className="text-green-700">Empty</div>
                </div>
                <div className="text-center p-2 bg-red-50 rounded">
                  <div className="font-bold text-red-600">{trucks.filter(t => t.status === "stopped").length}</div>
                  <div className="text-red-700">Stopped</div>
                </div>
                <div className="text-center p-2 bg-yellow-50 rounded">
                  <div className="font-bold text-yellow-600">{trucks.filter(t => t.is_tracking).length}</div>
                  <div className="text-yellow-700">Tracking</div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}