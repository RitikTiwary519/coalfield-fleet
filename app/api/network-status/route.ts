import { NextResponse } from "next/server"
import { trucks } from "@/lib/shared-data"

export async function GET() {
  try {
    // Group trucks by router
    const networkGroups = trucks.reduce((groups: any, truck: any) => {
      const routerId = truck.network_info.router_id
      if (!groups[routerId]) {
        groups[routerId] = {
          router_id: routerId,
          trucks: [],
          total_trucks: 0,
          connected_trucks: 0,
          ports_in_use: new Set(),
        }
      }

      groups[routerId].trucks.push({
        truck_id: truck.truck_id,
        port: truck.network_info.port,
        signal_strength: truck.network_info.signal_strength,
        connection_status: truck.network_info.connection_status,
        lat: truck.lat,
        lon: truck.lon,
        status: truck.status,
      })

      groups[routerId].total_trucks++
      groups[routerId].ports_in_use.add(truck.network_info.port)

      if (truck.network_info.connection_status === "connected") {
        groups[routerId].connected_trucks++
      }

      return groups
    }, {})

    // Convert ports Set to array for JSON serialization
    Object.values(networkGroups).forEach((group: any) => {
      group.ports_in_use = Array.from(group.ports_in_use)
    })

    return NextResponse.json(networkGroups)
  } catch (error) {
    console.error("Error fetching network status:", error)
    return NextResponse.json({ error: "Failed to fetch network status" }, { status: 500 })
  }
}
