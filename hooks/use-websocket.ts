import { useEffect, useRef, useState, useCallback } from 'react'

interface LocationUpdate {
  truck_id: string
  lat: number
  lon: number
  timestamp: string
  status: string
  fuel_level: number
  engine_status: string
}

interface TruckTrackingStatus {
  truck_id: string
  is_tracking: boolean
  timestamp: string
}

interface WebSocketMessage {
  type: 'initial_data' | 'location_updates' | 'truck_tracking_status' | 'tracking_started' | 'tracking_stopped' | 'error'
  trucks?: any[]
  updates?: LocationUpdate[]
  truck_id?: string
  is_tracking?: boolean
  success?: boolean
  message?: string
  router_id?: string
  timestamp: string
}

interface UseWebSocketReturn {
  isConnected: boolean
  trucks: any[]
  locationUpdates: LocationUpdate[]
  sendMessage: (message: any) => void
  connect: (routerId: string) => void
  disconnect: () => void
  startTracking: (truckId: string) => void
  stopTracking: (truckId: string) => void
  connectionError: string | null
}

export function useWebSocket(): UseWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false)
  const [trucks, setTrucks] = useState<any[]>([])
  const [locationUpdates, setLocationUpdates] = useState<LocationUpdate[]>([])
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const routerIdRef = useRef<string | null>(null)

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
    }
  }, [])

  const connect = useCallback((routerId: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.close()
    }

    try {
      routerIdRef.current = routerId
      const wsUrl = `ws://localhost:8080?router_id=${routerId}`
      wsRef.current = new WebSocket(wsUrl)

      wsRef.current.onopen = () => {
        console.log(`WebSocket connected to router: ${routerId}`)
        setIsConnected(true)
        setConnectionError(null)
      }

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          
          switch (message.type) {
            case 'initial_data':
              if (message.trucks) {
                setTrucks(message.trucks)
              }
              break
              
            case 'location_updates':
              if (message.updates) {
                setLocationUpdates(prev => [
                  ...message.updates!,
                  ...prev.slice(0, 50) // Keep last 50 updates
                ])
                
                // Update truck positions in the trucks array
                setTrucks(prevTrucks => 
                  prevTrucks.map(truck => {
                    const update = message.updates!.find(u => u.truck_id === truck.truck_id)
                    if (update) {
                      return {
                        ...truck,
                        lat: update.lat,
                        lon: update.lon,
                        timestamp: update.timestamp,
                        status: update.status,
                        route_data: {
                          ...truck.route_data,
                          fuel_level: update.fuel_level,
                          engine_status: update.engine_status,
                        }
                      }
                    }
                    return truck
                  })
                )
              }
              break
              
            case 'truck_tracking_status':
              if (message.truck_id !== undefined) {
                setTrucks(prevTrucks =>
                  prevTrucks.map(truck =>
                    truck.truck_id === message.truck_id
                      ? { ...truck, is_tracking: message.is_tracking }
                      : truck
                  )
                )
              }
              break
              
            case 'tracking_started':
            case 'tracking_stopped':
              console.log(`${message.type}: ${message.message}`)
              break
              
            case 'error':
              console.error('WebSocket error:', message.message)
              setConnectionError(message.message || 'Unknown error')
              break
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }

      wsRef.current.onclose = (event) => {
        console.log(`WebSocket disconnected from router: ${routerId}`, event.code, event.reason)
        setIsConnected(false)
        
        // Attempt to reconnect after 3 seconds if not manually closed
        if (event.code !== 1000 && routerIdRef.current) {
          setTimeout(() => {
            if (routerIdRef.current) {
              connect(routerIdRef.current)
            }
          }, 3000)
        }
      }

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error)
        setConnectionError('Connection error')
        setIsConnected(false)
      }

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error)
      setConnectionError('Failed to connect')
    }
  }, [])

  const disconnect = useCallback(() => {
    routerIdRef.current = null
    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect')
      wsRef.current = null
    }
    setIsConnected(false)
    setConnectionError(null)
  }, [])

  const startTracking = useCallback((truckId: string) => {
    sendMessage({
      type: 'start_tracking',
      truck_id: truckId,
      timestamp: new Date().toISOString(),
    })
  }, [sendMessage])

  const stopTracking = useCallback((truckId: string) => {
    sendMessage({
      type: 'stop_tracking',
      truck_id: truckId,
      timestamp: new Date().toISOString(),
    })
  }, [sendMessage])

  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return {
    isConnected,
    trucks,
    locationUpdates,
    sendMessage,
    connect,
    disconnect,
    startTracking,
    stopTracking,
    connectionError,
  }
}