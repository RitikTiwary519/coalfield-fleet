import { type NextRequest, NextResponse } from "next/server"
import { edges } from "@/lib/shared-data"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const edgeId = Number.parseInt(params.id)
    const { status } = await request.json()

    const edgeIndex = edges.findIndex((edge) => edge.edge_id === edgeId)

    if (edgeIndex === -1) {
      return NextResponse.json({ error: "Edge not found" }, { status: 404 })
    }

    edges[edgeIndex].status = status

    return NextResponse.json({
      success: true,
      edge: edges[edgeIndex],
    })
  } catch (error) {
    console.error("Error updating edge:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
