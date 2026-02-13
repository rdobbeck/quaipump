import { NextRequest, NextResponse } from "next/server";

const PINATA_API_KEY = process.env.PINATA_API_KEY || "";
const PINATA_SECRET = process.env.PINATA_API_SECRET || "";
const PINATA_GATEWAY = process.env.NEXT_PUBLIC_PINATA_GATEWAY || "https://gateway.pinata.cloud";

export async function POST(req: NextRequest) {
  if (!PINATA_API_KEY || !PINATA_SECRET) {
    return NextResponse.json(
      { error: "Image upload not configured. Use a URL instead." },
      { status: 501 }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 });
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File must be under 5MB" }, { status: 400 });
    }

    // Upload to Pinata
    const pinataForm = new FormData();
    pinataForm.append("file", file);
    pinataForm.append(
      "pinataMetadata",
      JSON.stringify({ name: `quaipump-${Date.now()}` })
    );

    const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: {
        pinata_api_key: PINATA_API_KEY,
        pinata_secret_api_key: PINATA_SECRET,
      },
      body: pinataForm,
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Pinata error:", text);
      return NextResponse.json({ error: "Upload failed" }, { status: 502 });
    }

    const data = await res.json();
    const ipfsHash = data.IpfsHash;
    const url = `${PINATA_GATEWAY}/ipfs/${ipfsHash}`;

    return NextResponse.json({ url, ipfsHash });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
