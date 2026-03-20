import { NextResponse } from "next/server";
import { createManualQuotation } from "@/app/(ops)/cotizaciones/manual/actions";

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const result = await createManualQuotation(data);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error creating manual quotation:", error);
    return NextResponse.json({ error: "Failed to create manual quotation" }, { status: 500 });
  }
}
