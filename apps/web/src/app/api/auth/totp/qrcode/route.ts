import QRCode from "qrcode";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const uri = searchParams.get("uri");
  if (!uri || !uri.startsWith("otpauth://")) {
    return NextResponse.json({ error: "INVALID_URI" }, { status: 400 });
  }

  const png = await QRCode.toBuffer(uri, {
    type: "png",
    margin: 1,
    width: 256,
  });

  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store",
    },
  });
}
