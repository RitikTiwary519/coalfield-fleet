import { NextRequest, NextResponse } from "next/server"
import { WebSocketServer, WebSocket } from "ws"
import type { IncomingMessage } from "http"
import { 
  connectionStore, 
  startTruckTracking, 
  stopTruckTracking, 
  getTrackingTrucksByRouter,
  simulateLocationUpdate,
  WebSocketConnection 
} from "@/lib/shared-data"

let wss: WebSocketServer | null = null

// Initialize WebSocket server if not already initialized
function initWebSocketServer() {
  if (!wss) {
    wss = new WebSocketServer({ port: 8080 })
    
    wss.on("connection", (ws: WebSocket, request: IncomingMessage) => {
      const url = new URL(request.url || "", `http://${request.headers.host}`)
      const routerId = url.searchParams.get("router_id")
      
      if (!routerId) {
        ws.close(1002, "router_id parameter is required")
        return
      }

      // Create connection record
      const connectionId = `${routerId}_${Date.now()}`
      const connection: WebSocketConnection = {
        id: connectionId,
        routerId,
        ws,
        connectedAt: new Date(),
      }

      connectionStore.connections.set(connectionId, connection)
      
      console.log(`WebSocket connection established for router: ${routerId}`)

      // Send initial truck data for this router
      const initialTrucks = getTrackingTrucksByRouter(routerId)
      ws.send(JSON.stringify({
        type: "initial_data",
        trucks: initialTrucks,
        router_id: routerId,
        timestamp: new Date().toISOString(),
      }))

      // Handle incoming messages
      ws.on("message", (data: any) => {
        try {
          const message = JSON.parse(data.toString())
          
          switch (message.type) {
            case "start_tracking":
              if (message.truck_id) {
                const success = startTruckTracking(message.truck_id)
                ws.send(JSON.stringify({
                  type: "tracking_started",
                  truck_id: message.truck_id,
                  success,
                  timestamp: new Date().toISOString(),
                }))
                
                // Broadcast to all connections on this router
                broadcastToRouter(routerId, {
                  type: "truck_tracking_status",
                  truck_id: message.truck_id,
                  is_tracking: true,
                  timestamp: new Date().toISOString(),
                })
              }
              break
              
            case "stop_tracking":
              if (message.truck_id) {
                const success = stopTruckTracking(message.truck_id)
                ws.send(JSON.stringify({
                  type: "tracking_stopped",
                  truck_id: message.truck_id,
                  success,
                  timestamp: new Date().toISOString(),
                }))
                
                // Broadcast to all connections on this router
                broadcastToRouter(routerId, {
                  type: "truck_tracking_status",
                  truck_id: message.truck_id,
                  is_tracking: false,
                  timestamp: new Date().toISOString(),
                })
              }
              break
              
            case "get_tracking_trucks":
              const trackingTrucks = getTrackingTrucksByRouter(routerId)
              ws.send(JSON.stringify({
                type: "tracking_trucks",
                trucks: trackingTrucks,
                router_id: routerId,
                timestamp: new Date().toISOString(),
              }))
              break
          }
        } catch (error) {
          console.error("Error processing WebSocket message:", error)
          ws.send(JSON.stringify({
            type: "error",
            message: "Invalid message format",
            timestamp: new Date().toISOString(),
          }))
        }
      })

      // Handle connection close
      ws.on("close", () => {
        connectionStore.connections.delete(connectionId)
        console.log(`WebSocket connection closed for router: ${routerId}`)
      })

      ws.on("error", (error: any) => {
        console.error(`WebSocket error for router ${routerId}:`, error)
        connectionStore.connections.delete(connectionId)
      })
    })

    // Start location update simulation
    startLocationUpdateLoop()
  }
}

// Broadcast message to all connections for a specific router
function broadcastToRouter(routerId: string, message: any) {
  connectionStore.connections.forEach((connection) => {
    if (connection.routerId === routerId && connection.ws.readyState === WebSocket.OPEN) {
      connection.ws.send(JSON.stringify(message))
    }
  })
}

// Continuous location update loop for tracking trucks
function startLocationUpdateLoop() {
  setInterval(() => {
    connectionStore.trackingSessions.forEach((truckIds, routerId) => {
      const updates: any[] = []
      
      truckIds.forEach((truckId) => {
        const locationUpdate = simulateLocationUpdate(truckId)
        if (locationUpdate) {
          updates.push(locationUpdate)
        }
      })
      
      if (updates.length > 0) {
        broadcastToRouter(routerId, {
          type: "location_updates",
          updates,
          router_id: routerId,
          timestamp: new Date().toISOString(),
        })
      }
    })
  }, 2000) // Update every 2 seconds
}

// HTTP endpoint to get WebSocket server status
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const action = url.searchParams.get("action")
  
  if (action === "status") {
    return NextResponse.json({
      websocket_server_running: wss !== null,
      active_connections: connectionStore.connections.size,
      tracking_sessions: Array.from(connectionStore.trackingSessions.entries()).map(([routerId, truckIds]) => ({
        router_id: routerId,
        tracking_trucks: truckIds.size,
        truck_ids: Array.from(truckIds),
      })),
      timestamp: new Date().toISOString(),
    })
  }
  
  return NextResponse.json({
    message: "WebSocket server endpoint",
    websocket_url: "ws://localhost:8080?router_id=YOUR_ROUTER_ID",
    available_actions: ["start_tracking", "stop_tracking", "get_tracking_trucks"],
    timestamp: new Date().toISOString(),
  })
}

// Initialize WebSocket server when this route is first accessed
export async function POST(request: NextRequest) {
  try {
    const { action, router_id, truck_id } = await request.json()
    
    // Initialize WebSocket server if not already running
    if (!wss) {
      initWebSocketServer()
    }
    
    switch (action) {
      case "start_server":
        if (!wss) {
          initWebSocketServer()
        }
        return NextResponse.json({
          success: true,
          message: "WebSocket server started",
          websocket_url: "ws://localhost:8080",
          timestamp: new Date().toISOString(),
        })
        
      case "start_tracking":
        if (!truck_id) {
          return NextResponse.json({ error: "truck_id is required" }, { status: 400 })
        }
        
        const startSuccess = startTruckTracking(truck_id)
        if (startSuccess && router_id) {
          broadcastToRouter(router_id, {
            type: "truck_tracking_status",
            truck_id,
            is_tracking: true,
            timestamp: new Date().toISOString(),
          })
        }
        
        return NextResponse.json({
          success: startSuccess,
          message: startSuccess ? "Tracking started" : "Failed to start tracking",
          truck_id,
          timestamp: new Date().toISOString(),
        })
        
      case "stop_tracking":
        if (!truck_id) {
          return NextResponse.json({ error: "truck_id is required" }, { status: 400 })
        }
        
        const stopSuccess = stopTruckTracking(truck_id)
        if (stopSuccess && router_id) {
          broadcastToRouter(router_id, {
            type: "truck_tracking_status",
            truck_id,
            is_tracking: false,
            timestamp: new Date().toISOString(),
          })
        }
        
        return NextResponse.json({
          success: stopSuccess,
          message: stopSuccess ? "Tracking stopped" : "Failed to stop tracking",
          truck_id,
          timestamp: new Date().toISOString(),
        })
        
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (error) {
    console.error("Error in WebSocket route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Auto-initialize WebSocket server
if (typeof window === "undefined") {
  // Server-side only
  setTimeout(() => {
    console.log("Initializing WebSocket server...")
    initWebSocketServer()
  }, 1000)
}