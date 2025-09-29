import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Test WebSocket server status
    const response = await fetch("http://localhost:3000/api/websocket?action=status")
    const wsStatus = await response.json()
    
    return NextResponse.json({
      success: true,
      message: "Testing live truck tracking integration",
      websocket_status: wsStatus,
      test_instructions: [
        "1. Open the dashboard at http://localhost:3000",
        "2. Click on 'Truck Login' button to see network groups",
        "3. Click 'Start Monitoring' on any router (e.g., ROUTER_NORTH)",
        "4. Click on any truck on the map to select it",
        "5. Click 'Start Tracking' button in the truck details panel",
        "6. Watch for live location updates every 2 seconds",
        "7. The truck position should move slightly and show 'Receiving live updates'",
      ],
      available_endpoints: {
        websocket_connection: "ws://localhost:8080?router_id=ROUTER_NORTH",
        start_tracking_api: "POST /api/truck-login with {action: 'start_tracking', truck_id: 'T001'}",
        websocket_status: "GET /api/websocket?action=status",
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: "Failed to test integration",
      message: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    }, { status: 500 })
  }
}

export async function POST() {
  try {
    // Initialize WebSocket server
    const response = await fetch("http://localhost:3000/api/websocket", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "start_server",
      }),
    })

    const result = await response.json()
    
    return NextResponse.json({
      success: true,
      message: "WebSocket server initialization test",
      result,
      next_steps: [
        "WebSocket server should now be running on ws://localhost:8080",
        "You can now test the live tracking features",
        "Try connecting to different router networks and start tracking trucks",
      ],
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: "Failed to initialize WebSocket server",
      message: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    }, { status: 500 })
  }
}