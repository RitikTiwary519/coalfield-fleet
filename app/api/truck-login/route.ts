import { NextResponse } from "next/server"
import { trucks } from "@/lib/shared-data"

interface TruckSensorData {
  truck_id: string
  sensor_data: {
    accelerometer: { x: number; y: number; z: number; timestamp: number }
    gyroscope: { x: number; y: number; z: number; timestamp: number }
    gps: { lat: number; lon: number; accuracy: number; timestamp: number }
    magnetometer: { x: number; y: number; z: number; timestamp: number }
    temperature: number
    pressure: number
    light: number
  }
  network_info: {
    router_id: string
    port: number
    signal_strength: number
    connection_status: "connected" | "disconnected" | "weak"
  }
  route_data: {
    current_route: number[]
    destination_node: number
    estimated_arrival: string
    fuel_level: number
    engine_status: "running" | "idle" | "stopped"
  }
}

export async function GET() {
  // Convert truck data to sensor data format
  const networkGroups: Record<string, TruckSensorData[]> = {}

  trucks.forEach((truck) => {
    const routerId = truck.network_info.router_id
    if (!networkGroups[routerId]) {
      networkGroups[routerId] = []
    }

    const sensorData: TruckSensorData = {
      truck_id: truck.truck_id,
      sensor_data: {
        accelerometer: {
          x: Math.random() * 2 - 1,
          y: Math.random() * 2 - 1,
          z: 9.8 + Math.random() * 0.5,
          timestamp: Date.now(),
        },
        gyroscope: {
          x: Math.random() * 0.1 - 0.05,
          y: Math.random() * 0.1 - 0.05,
          z: Math.random() * 0.1 - 0.05,
          timestamp: Date.now(),
        },
        gps: {
          lat: truck.lat,
          lon: truck.lon,
          accuracy: Math.random() * 10 + 5,
          timestamp: Date.now(),
        },
        magnetometer: {
          x: Math.random() * 100 - 50,
          y: Math.random() * 100 - 50,
          z: Math.random() * 100 - 50,
          timestamp: Date.now(),
        },
        temperature: 20 + Math.random() * 15,
        pressure: 1013 + Math.random() * 20,
        light: Math.random() * 1000,
      },
      network_info: truck.network_info,
      route_data: {
        current_route: [1, 3, 7, 12],
        destination_node: 12,
        estimated_arrival: new Date(Date.now() + Math.random() * 3600000).toISOString(),
        fuel_level: truck.route_data.fuel_level,
        engine_status: truck.route_data.engine_status,
      },
    }

    networkGroups[routerId].push(sensorData)
  })

  return NextResponse.json({
    network_groups: networkGroups,
    total_active_sessions: trucks.length,
    last_updated: new Date().toISOString(),
  })
}

export async function POST(request: Request) {
  try {
    const { router_id, action, truck_id } = await request.json()

    if (action === "start_monitoring") {
      // Get trucks on this network
      const trucksOnNetwork = trucks.filter((truck) => truck.network_info.router_id === router_id)

      return NextResponse.json({
        success: true,
        message: `Started monitoring ${trucksOnNetwork.length} trucks on ${router_id}`,
        trucks_data: trucksOnNetwork,
        websocket_url: `ws://localhost:8080?router_id=${router_id}`,
        optimization_analysis: {
          total_trucks: trucksOnNetwork.length,
          average_fuel: trucksOnNetwork.reduce((sum, t) => sum + t.route_data.fuel_level, 0) / trucksOnNetwork.length,
          network_efficiency: Math.random() * 30 + 70,
          suggested_routes: trucksOnNetwork.map((t) => ({
            truck_id: t.truck_id,
            optimized_route: [1, 5, 8, 12],
            time_saved: Math.floor(Math.random() * 15) + 5,
            fuel_saved: Math.floor(Math.random() * 10) + 2,
          })),
        },
      })
    }

    if (action === "start_tracking") {
      if (!truck_id) {
        return NextResponse.json({ error: "truck_id is required for tracking" }, { status: 400 })
      }

      // Find the truck and start tracking
      const truck = trucks.find(t => t.truck_id === truck_id)
      if (!truck) {
        return NextResponse.json({ error: "Truck not found" }, { status: 404 })
      }

      truck.is_tracking = true
      truck.timestamp = new Date().toISOString()

      return NextResponse.json({
        success: true,
        message: `Started tracking truck ${truck_id}`,
        truck_data: truck,
        websocket_url: `ws://localhost:8080?router_id=${truck.network_info.router_id}`,
      })
    }

    if (action === "stop_tracking") {
      if (!truck_id) {
        return NextResponse.json({ error: "truck_id is required for stopping tracking" }, { status: 400 })
      }

      // Find the truck and stop tracking
      const truck = trucks.find(t => t.truck_id === truck_id)
      if (!truck) {
        return NextResponse.json({ error: "Truck not found" }, { status: 404 })
      }

      truck.is_tracking = false

      return NextResponse.json({
        success: true,
        message: `Stopped tracking truck ${truck_id}`,
        truck_data: truck,
      })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 })
  }
}
