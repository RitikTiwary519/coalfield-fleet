import { NextResponse } from "next/server"
import { nodes, edges } from "@/lib/shared-data"

export async function GET() {
  return NextResponse.json({
    nodes,
    edges,
  })
}
