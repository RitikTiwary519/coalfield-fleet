import { NextResponse } from "next/server"
import { trucks, simulateTrucks } from "@/lib/shared-data"

export async function GET() {
  simulateTrucks()
  return NextResponse.json(trucks)
}
