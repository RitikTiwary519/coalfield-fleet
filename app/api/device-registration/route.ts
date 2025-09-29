import { NextRequest, NextResponse } from "next/server"
import { trucks, connectionStore, startTruckTracking } from "@/lib/shared-data"

// Add a new truck dynamically
export async function POST(request: NextRequest) {
  try {
    const { action, device_info, location, router_id } = await request.json()

    if (action === "register_device") {
      // Generate new truck ID
      const newTruckId = `MOBILE_${Date.now()}`
      
      // Create new truck from device
      const newTruck = {
        truck_id: newTruckId,
        lat: location?.lat || 0,
        lon: location?.lon || 0,
        status: "loaded" as const,
        timestamp: new Date().toISOString(),
        is_tracking: false,
        network_info: {
          router_id: router_id || "ROUTER_MOBILE",
          port: 8080,
          signal_strength: 95,
          connection_status: "connected" as const,
        },
        route_data: {
          fuel_level: 100,
          engine_status: "running" as const,
        },
      }

      // Add to trucks array
      trucks.push(newTruck)

      return NextResponse.json({
        success: true,
        message: "Device registered as truck",
        truck_data: newTruck,
        instructions: [
          "Your device is now registered as a truck",
          "You can start tracking to share your location",
          "Your position will appear on the dashboard in real-time"
        ]
      })
    }

    if (action === "update_location") {
      const { truck_id, lat, lon } = await request.json()
      
      const truck = trucks.find(t => t.truck_id === truck_id)
      if (truck) {
        truck.lat = lat
        truck.lon = lon
        truck.timestamp = new Date().toISOString()
        
        return NextResponse.json({
          success: true,
          message: "Location updated",
          truck_data: truck
        })
      }
      
      return NextResponse.json({ error: "Truck not found" }, { status: 404 })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ 
      error: "Failed to process request",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const action = url.searchParams.get("action")

  if (action === "get_mobile_trucks") {
    const mobileTrucks = trucks.filter(truck => truck.truck_id.startsWith("MOBILE_"))
    return NextResponse.json({
      mobile_trucks: mobileTrucks,
      count: mobileTrucks.length
    })
  }

  return NextResponse.json({
    message: "Device registration endpoint",
    available_actions: ["register_device", "update_location"],
    endpoints: {
      register: "POST /api/device-registration",
      update_location: "POST /api/device-registration", 
      get_mobile: "GET /api/device-registration?action=get_mobile_trucks"
    }
  })
}