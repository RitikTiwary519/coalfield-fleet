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
  // Optional: phone battery level for MOBILE devices (0-100)
  battery_level?: number
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
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [showLegend, setShowLegend] = useState(true)
  const [mobileTrucks, setMobileTrucks] = useState<Truck[]>([])
  const [isTrackingMobile, setIsTrackingMobile] = useState(false)

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

  // Update trucks with WebSocket data and merge with mobile trucks
  useEffect(() => {
    if (wsTrucks.length > 0) {
      // Merge WebSocket trucks with mobile device trucks
      const allTrucks = [...wsTrucks, ...mobileTrucks]
      // Remove duplicates based on truck_id
      const uniqueTrucks = allTrucks.filter((truck, index, self) => 
        index === self.findIndex(t => t.truck_id === truck.truck_id)
      )
      setTrucks(uniqueTrucks)
    }
  }, [wsTrucks, mobileTrucks])

  // Handle mobile device registration
  const handleMobileRegistered = (truckData: any) => {
    console.log('Mobile device registered:', truckData)
    const mobileTruck: Truck = {
      truck_id: truckData?.truck_id ?? truckData?.truck_data?.truck_id ?? `MOBILE_${Date.now()}`,
      lat: truckData?.lat ?? truckData?.truck_data?.lat ?? 0,
      lon: truckData?.lon ?? truckData?.truck_data?.lon ?? 0,
      status: "stopped" as const,
      timestamp: new Date().toISOString(),
      is_tracking: false,
      battery_level: typeof truckData?.battery_level === 'number' ? Math.round(truckData.battery_level) : undefined,
      network_info: {
        router_id: "ROUTER_MAIN",
        port: 8080,
        signal_strength: 100,
        connection_status: "connected" as const,
      },
      route_data: {
        fuel_level: 100,
        engine_status: "running" as const,
      },
    }
    
    setMobileTrucks(prev => {
      const updated = prev.filter(t => t.truck_id !== mobileTruck.truck_id)
      return [...updated, mobileTruck]
    })
    
    // Auto-start tracking for mobile device
    setIsTrackingMobile(true)
    setTimeout(() => {
      handleStartTracking(mobileTruck.truck_id)
    }, 1000)
  }

  // Update mobile truck location
  useEffect(() => {
    if (isTrackingMobile && navigator.geolocation) {
      const updateLocation = () => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords
            setMobileTrucks(prev => 
              prev.map(truck => 
                truck.truck_id.startsWith('MOBILE') ? {
                  ...truck,
                  lat: latitude,
                  lon: longitude,
                  timestamp: new Date().toISOString(),
                  is_tracking: true,
                  status: "loaded" as const
                } : truck
              )
            )
          },
          (error) => {
            console.error('Geolocation error:', error)
          },
          { enableHighAccuracy: true, maximumAge: 1000, timeout: 5000 }
        )
      }

      updateLocation()
      const interval = setInterval(updateLocation, 2000) // Update every 2 seconds
      return () => clearInterval(interval)
    }
  }, [isTrackingMobile])

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
      ctx.arc(pos.x + 2, pos.y + 2, 18, 0, 2 * Math.PI)
      ctx.fillStyle = "rgba(0, 0, 0, 0.2)"
      ctx.fill()

      // Truck body - larger for mobile devices
      const truckSize = truck.truck_id.startsWith('MOBILE') ? 20 : 16
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, truckSize, 0, 2 * Math.PI)
      
      // Different colors for different truck types
      if (truck.truck_id.startsWith('MOBILE')) {
        ctx.fillStyle = "#8b5cf6" // Purple for mobile devices
      } else {
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
      }
      
      ctx.fill()
      ctx.strokeStyle = "#ffffff"
      ctx.lineWidth = 3
      ctx.stroke()

      // Different icons for different truck types
      ctx.fillStyle = "#ffffff"
      ctx.font = "16px Arial, sans-serif"
      ctx.textAlign = "center"
      if (truck.truck_id.startsWith('MOBILE')) {
        ctx.fillText("📱", pos.x, pos.y + 5)
      } else {
        ctx.fillText("🚛", pos.x, pos.y + 5)
      }

      // Enhanced tracking indicator with pulsing animation
      if (truck.is_tracking) {
        const time = Date.now() / 1000
        const pulseScale = 1 + 0.3 * Math.sin(time * 4)
        
        ctx.beginPath()
        ctx.arc(pos.x + 15, pos.y - 15, 6 * pulseScale, 0, 2 * Math.PI)
        ctx.fillStyle = `rgba(34, 197, 94, ${0.7 / pulseScale})`
        ctx.fill()
        
        ctx.beginPath()
        ctx.arc(pos.x + 15, pos.y - 15, 6, 0, 2 * Math.PI)
        ctx.fillStyle = "#22c55e"
        ctx.fill()
        ctx.strokeStyle = "#ffffff"
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

      // Truck ID label with better visibility
      ctx.fillStyle = "#000000"
      ctx.strokeStyle = "#ffffff"
      ctx.lineWidth = 3
      ctx.font = "bold 12px Arial, sans-serif"
      ctx.textAlign = "center"
      ctx.strokeText(truck.truck_id, pos.x, pos.y + 40)
      ctx.fillText(truck.truck_id, pos.x, pos.y + 40)

      // Fuel level indicator
      ctx.fillStyle = "#6b7280"
      ctx.font = "10px Arial, sans-serif"
      ctx.fillText(`⛽ ${truck.route_data.fuel_level.toFixed(0)}%`, pos.x, pos.y + 55)
      
      // Battery indicator for MOBILE devices if available
      if (truck.truck_id.startsWith('MOBILE') && typeof truck.battery_level === 'number') {
        ctx.fillStyle = "#6b7280"
        ctx.font = "10px Arial, sans-serif"
        ctx.fillText(`🔋 ${Math.round(truck.battery_level)}%`, pos.x, pos.y + 68)
      }
    })

    // Draw optional legend
    if (showLegend) {
      drawLegend(ctx, canvasWidth, canvasHeight)
    }
  }

  // Draw legend for better understanding
  const drawLegend = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const legendX = width - 200
    const legendY = 20
    
    // Legend background
    ctx.fillStyle = "rgba(255, 255, 255, 0.95)"
    ctx.fillRect(legendX, legendY, 180, 160)
    ctx.strokeStyle = "#d1d5db"
    ctx.lineWidth = 1
    ctx.strokeRect(legendX, legendY, 180, 160)
    
    // Legend title with close button
    ctx.fillStyle = "#1f2937"
    ctx.font = "bold 14px Arial, sans-serif"
    ctx.textAlign = "left"
    ctx.fillText("Legend", legendX + 10, legendY + 20)
    
    // Close button
    ctx.fillStyle = "#ef4444"
    ctx.fillRect(legendX + 155, legendY + 5, 15, 15)
    ctx.fillStyle = "#ffffff"
    ctx.font = "12px Arial, sans-serif"
    ctx.textAlign = "center"
    ctx.fillText("×", legendX + 162, legendY + 15)
    
    // Truck status legend
    const statusItems = [
      { color: "#3b82f6", label: "🚛 Fleet Truck (Loaded)", y: 40 },
      { color: "#10b981", label: "🚛 Fleet Truck (Empty)", y: 55 },
      { color: "#ef4444", label: "🚛 Fleet Truck (Stopped)", y: 70 },
      { color: "#8b5cf6", label: "📱 Mobile Device", y: 85 },
      { color: "#22c55e", label: "● Live Tracking Active", y: 100 },
      { color: "#10b981", label: "● Strong Signal", y: 115 },
      { color: "#f59e0b", label: "● Weak Signal", y: 130 },
      { color: "#ef4444", label: "● No Signal", y: 145 }
    ]
    
    statusItems.forEach(item => {
      ctx.fillStyle = item.color
      ctx.beginPath()
      ctx.arc(legendX + 15, legendY + item.y - 3, 4, 0, 2 * Math.PI)
      ctx.fill()
      
      ctx.fillStyle = "#4b5563"
      ctx.font = "10px Arial, sans-serif"
      ctx.textAlign = "left"
      ctx.fillText(item.label, legendX + 25, legendY + item.y)
    })
  }

  // Road analysis algorithm
  const analyzeRoad = (edge: Edge): { shouldClose: boolean, confidence: number, congestion: number, recommendation: string } => {
    const congestion = (edge.current_trucks / 3) * 100 // Assuming max 3 trucks per road
    const congestionCapped = Math.min(congestion, 100)
    
    let shouldClose = false
    let confidence = 0
    let recommendation = ""
    
    if (edge.current_trucks >= 3) {
      shouldClose = true
      confidence = 95
      recommendation = "CRITICAL: Road severely congested. Immediate closure recommended to prevent traffic jam."
    } else if (edge.current_trucks === 2) {
      shouldClose = true
      confidence = 75
      recommendation = "WARNING: High traffic detected. Consider temporary closure or traffic diversion."
    } else if (edge.current_trucks === 1) {
      shouldClose = false
      confidence = 30
      recommendation = "NORMAL: Light traffic. Road is operating efficiently."
    } else {
      shouldClose = false
      confidence = 10
      recommendation = "OPTIMAL: No traffic detected. Road is clear and available."
    }
    
    return { shouldClose, confidence, congestion: congestionCapped, recommendation }
  }

  // Handle canvas click for truck selection and road analysis
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

    // Check for legend close button click
    if (showLegend) {
      const legendX = canvas.offsetWidth - 200
      const legendY = 20
      if (x >= legendX + 155 && x <= legendX + 170 && y >= legendY + 5 && y <= legendY + 20) {
        setShowLegend(false)
        return
      }
    }

    // Check if clicked on a truck
    for (const truck of trucks) {
      const pos = latLonToCanvas(truck.lat, truck.lon)
      const truckSize = truck.truck_id.startsWith('MOBILE') ? 20 : 16
      const distance = Math.sqrt((x - pos.x) ** 2 + (y - pos.y) ** 2)
      
      if (distance <= truckSize + 5) {
        setSelectedTruck(selectedTruck?.truck_id === truck.truck_id ? null : truck)
        setSelectedEdge(null)
        return
      }
    }

    // Check if clicked on a road (edge)
    for (const edge of mapData.edges) {
      const startNode = mapData.nodes.find(n => n.node_id === edge.start_node)
      const endNode = mapData.nodes.find(n => n.node_id === edge.end_node)
      
      if (!startNode || !endNode) continue

      const start = latLonToCanvas(startNode.lat, startNode.lon)
      const end = latLonToCanvas(endNode.lat, endNode.lon)

      // Calculate distance from point to line segment
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
        setSelectedEdge(selectedEdge?.edge_id === edge.edge_id ? null : edge)
        setSelectedTruck(null)
        return
      }
    }
    
    setSelectedTruck(null)
    setSelectedEdge(null)
  }

  // Redraw map when data changes
  useEffect(() => {
    drawMap()
  }, [mapData, trucks, showLegend])

  // Continuous animation for pulsing effects
  useEffect(() => {
    const animate = () => {
      drawMap()
      requestAnimationFrame(animate)
    }
    const animationId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationId)
  }, [mapData, trucks, showLegend])

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
            <MobileTruckRegistration onRegistered={handleMobileRegistered} />
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
                <div className="flex items-center gap-4">
                  <Button
                    onClick={() => setShowLegend(!showLegend)}
                    variant="outline"
                    size="sm"
                  >
                    {showLegend ? "Hide Legend" : "Show Legend"}
                  </Button>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span>Active: {trucks.filter(t => t.is_tracking).length}/{trucks.length}</span>
                    <span className="text-green-600">●</span>
                    <span>Live</span>
                  </div>
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
                <h3 className="text-lg font-semibold mb-4 text-gray-900">
                  {selectedTruck.truck_id.startsWith('MOBILE') ? '📱 Mobile Device' : '🚛 Fleet Truck'} Details
                </h3>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="font-medium text-gray-700">ID</div>
                      <div className="text-gray-900 font-mono">{selectedTruck.truck_id}</div>
                    </div>
                    <div>
                      <div className="font-medium text-gray-700">Status</div>
                      <Badge variant={selectedTruck.status === "loaded" ? "default" : 
                                   selectedTruck.status === "unloaded" ? "secondary" : "destructive"}>
                        {selectedTruck.status.toUpperCase()}
                      </Badge>
                    </div>
                    <div>
                      <div className="font-medium text-gray-700">Fuel Level</div>
                      <div className="text-gray-900">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-200 rounded">
                            <div 
                              className={`h-2 rounded ${selectedTruck.route_data.fuel_level > 50 ? 'bg-green-500' : 
                                selectedTruck.route_data.fuel_level > 25 ? 'bg-yellow-500' : 'bg-red-500'}`}
                              style={{ width: `${selectedTruck.route_data.fuel_level}%` }}
                            />
                          </div>
                          <span className="text-xs">{selectedTruck.route_data.fuel_level.toFixed(0)}%</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="font-medium text-gray-700">Engine</div>
                      <Badge variant={selectedTruck.route_data.engine_status === "running" ? "default" : "secondary"}>
                        {selectedTruck.route_data.engine_status}
                      </Badge>
                    </div>
                    <div>
                      <div className="font-medium text-gray-700">Signal Strength</div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-200 rounded">
                          <div 
                            className={`h-2 rounded ${selectedTruck.network_info.signal_strength > 70 ? 'bg-green-500' : 
                              selectedTruck.network_info.signal_strength > 30 ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${selectedTruck.network_info.signal_strength}%` }}
                          />
                        </div>
                        <span className="text-xs">{selectedTruck.network_info.signal_strength}%</span>
                      </div>
                    </div>
                    <div>
                      <div className="font-medium text-gray-700">Network</div>
                      <Badge variant={selectedTruck.network_info.connection_status === "connected" ? "default" : 
                                   selectedTruck.network_info.connection_status === "weak" ? "secondary" : "destructive"}>
                        {selectedTruck.network_info.connection_status.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="border-t pt-3">
                    <div className="font-medium text-gray-700 mb-2">Live Location</div>
                    <div className="bg-gray-50 p-2 rounded text-xs font-mono">
                      <div>Lat: {selectedTruck.lat.toFixed(6)}</div>
                      <div>Lon: {selectedTruck.lon.toFixed(6)}</div>
                      <div className="text-gray-500 mt-1">
                        Updated: {new Date(selectedTruck.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>

                  {/* Route Information */}
                  <div className="border-t pt-3">
                    <div className="font-medium text-gray-700 mb-2">Route Information</div>
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span>Destination:</span>
                        <span className="font-medium">
                          {selectedTruck.status === "loaded" ? "Dump Site" : 
                           selectedTruck.status === "unloaded" ? "Loading Zone" : "Maintenance"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Est. Fuel Saved:</span>
                        <span className="font-medium text-green-600">
                          {selectedTruck.truck_id.startsWith('MOBILE') ? 'N/A' : '12.5L'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tracking Status:</span>
                        <Badge variant={selectedTruck.is_tracking ? "default" : "secondary"}>
                          {selectedTruck.is_tracking ? "ACTIVE" : "INACTIVE"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Road Analysis Panel */}
            {selectedEdge && (
              <Card className="p-4">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">🛣️ Road Analysis</h3>
                
                {(() => {
                  const analysis = analyzeRoad(selectedEdge)
                  return (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <div className="font-medium text-gray-700">Road ID</div>
                          <div className="text-gray-900 font-mono">ROAD-{selectedEdge.edge_id}</div>
                        </div>
                        <div>
                          <div className="font-medium text-gray-700">Status</div>
                          <Badge variant={selectedEdge.status === "Open" ? "default" : "destructive"}>
                            {selectedEdge.status.toUpperCase()}
                          </Badge>
                        </div>
                        <div>
                          <div className="font-medium text-gray-700">Current Traffic</div>
                          <div className="text-gray-900">{selectedEdge.current_trucks} trucks</div>
                        </div>
                        <div>
                          <div className="font-medium text-gray-700">Congestion Level</div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-gray-200 rounded">
                              <div 
                                className={`h-2 rounded ${analysis.congestion < 30 ? 'bg-green-500' : 
                                  analysis.congestion < 70 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                style={{ width: `${analysis.congestion}%` }}
                              />
                            </div>
                            <span className="text-xs">{analysis.congestion.toFixed(0)}%</span>
                          </div>
                        </div>
                      </div>

                      <div className="border-t pt-3">
                        <div className="font-medium text-gray-700 mb-2">AI Recommendation</div>
                        <div className="bg-gray-50 p-3 rounded">
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant={analysis.shouldClose ? "destructive" : "default"}>
                              {analysis.shouldClose ? "CLOSE ROAD" : "KEEP OPEN"}
                            </Badge>
                            <div className="text-sm font-medium">
                              Confidence: {analysis.confidence}%
                            </div>
                          </div>
                          <p className="text-sm text-gray-700">{analysis.recommendation}</p>
                        </div>
                      </div>

                      <div className="border-t pt-3">
                        <Button 
                          variant={analysis.shouldClose ? "destructive" : "outline"}
                          className="w-full"
                          onClick={() => {
                            if (selectedEdge) {
                              selectedEdge.status = selectedEdge.status === "Open" ? "Closed" : "Open"
                              drawMap()
                            }
                          }}
                        >
                          {selectedEdge.status === "Open" ? "🚫 Close Road" : "✅ Open Road"}
                        </Button>
                      </div>
                    </div>
                  )
                })()}
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