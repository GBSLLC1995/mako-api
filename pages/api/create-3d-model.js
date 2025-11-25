export default async function handler(req, res) {
  // --- CORS headers so Framer (gustavobarroso.xyz) can call this safely ---
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { imageDataUrl } = req.body;
  if (!imageDataUrl) {
    return res.status(400).json({ error: "imageDataUrl is required" });
  }

  if (!process.env.MESHY_API_KEY) {
    // Helpful message if env var is missing or misnamed
    return res.status(500).json({ error: "MESHY_API_KEY is not set on the server" });
  }

  try {
    const meshyRes = await fetch("https://api.meshy.ai/openapi/v1/image-to-3d", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.MESHY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image_url: imageDataUrl,
        ai_model: "meshy-4",
        should_remesh: true,
        should_texture: true,
      }),
    });

    const data = await meshyRes.json();

    if (!meshyRes.ok) {
      console.error("Meshy API error:", data);
      return res.status(502).json({
        error: "Meshy API error",
        details: data,
      });
    }

    // Meshy returns { result: "TASK_ID" }
    return res.status(200).json({ taskId: data.result });
  } catch (err) {
    console.error("Server error in create-3d-model:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

