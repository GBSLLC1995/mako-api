export default async function handler(req, res) {
  // --- CORS headers so Framer can call this safely ---
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Preflight request (browser OPTIONS)
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Only allow POST for actual work
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Body should contain { imageDataUrl: "data:image/png;base64,..." }
  const { imageDataUrl } = req.body || {};
  if (!imageDataUrl) {
    return res.status(400).json({ error: "imageDataUrl is required" });
  }

  // Make sure your Meshy key is actually present on Vercel
  if (!process.env.MESHY_API_KEY) {
    return res
      .status(500)
      .json({ error: "MESHY_API_KEY is not set on the server" });
  }

  try {
    const meshyRes = await fetch(
      "https://api.meshy.ai/openapi/v1/image-to-3d",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.MESHY_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image_url: imageDataUrl,             // data URL from Framer
          ai_model: "meshy-4",
          topology: "triangle",
          target_polycount: 10000,
          should_remesh: true,
          should_texture: false             // no textures
        }),
      }
    );

    let data;
    try {
      data = await meshyRes.json();
    } catch (e) {
      const raw = await meshyRes.text();
      data = { raw };
    }

    if (!meshyRes.ok) {
      console.error("Meshy API error:", meshyRes.status, data);
      return res.status(500).json({
        error: "MESHY_API_ERROR",
        status: meshyRes.status,
        details: data,
      });
    }

    // Meshy success response should contain { result: "<task_id>" }
    return res.status(200).json({ taskId: data.result });
  } catch (err) {
    console.error("Unexpected server error:", err);
    return res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
  }
}
