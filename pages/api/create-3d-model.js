export default async function handler(req, res) {
  // CORS headers for Framer / client web integration
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle preflight request
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Only allow POST for actual creation
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Extract and validate body
  const { image_url, imageDataUrl } = req.body || {};
  // Accept either `image_url` or `imageDataUrl` for backward compatibility
  const finalImageUrl = image_url || imageDataUrl;

  if (!finalImageUrl) {
    return res.status(400).json({ error: "image_url (or imageDataUrl) is required" });
  }

  // Simple format check (data URL or http(s) PNG/JPG)
  if (
    !/^data:image\/(png|jpeg);base64,/.test(finalImageUrl) &&
    !/^https?:\/\/.*\.(png|jpe?g)$/i.test(finalImageUrl)
  ) {
    return res.status(400).json({ error: "image_url must be a .png/.jpg/.jpeg URL or data URI" });
  }

  // Check API key presence
  if (!process.env.MESHY_API_KEY) {
    return res.status(500).json({ error: "MESHY_API_KEY is not set on the server" });
  }

  try {
    const response = await fetch("https://api.meshy.ai/openapi/v1/image-to-3d", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.MESHY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image_url: finalImageUrl,
        ai_model: "latest",                // or "latest" if you prefer
        topology: "triangle",                // "quad" or "triangle"
        target_polycount: 15000,             // between 100 and 300,000
        should_remesh: true,
        save_pre_remeshed_model: false,
        should_texture: false,
        enable_pbr: false,
        symmetry_mode: "auto",
        moderation: false
      }),
    });

    let data;
    try {
      data = await response.json();
    } catch (parseErr) {
      const raw = await response.text();
      data = { raw };
    }

    if (!response.ok) {
      console.error("Meshy API error:", response.status, data);
      return res.status(500).json({
        error: "MESHY_API_ERROR",
        status: response.status,
        details: data,
      });
    }

    // Expect { result: "<task_id>" }
    if (!data.result) {
      console.error("Unexpected Meshy API response shape:", data);
      return res.status(500).json({
        error: "MESHY_API_INVALID_RESPONSE",
        details: data,
      });
    }

    return res.status(200).json({ taskId: data.result });

  } catch (err) {
    console.error("Unexpected server error:", err);
    return res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
  }
}
