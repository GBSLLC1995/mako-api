export default async function handler(req, res) {
  // --- CORS headers ---
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ error: "id is required" });
  }

  if (!process.env.MESHY_API_KEY) {
    return res.status(500).json({ error: "MESHY_API_KEY is not set on the server" });
  }

  try {
    const meshyRes = await fetch(`https://api.meshy.ai/openapi/v1/image-to-3d/${id}`, {
      headers: {
        "Authorization": `Bearer ${process.env.MESHY_API_KEY}`,
      },
    });

    const task = await meshyRes.json();

    if (!meshyRes.ok) {
      console.error("Meshy API error (get-3d-model):", task);
      return res.status(502).json({
        error: "Meshy API error",
        details: task,
      });
    }

    return res.status(200).json({
      status: task.status,
      progress: task.progress,
      thumbnailUrl: task.thumbnail_url,
      modelUrls: task.model_urls,
    });
  } catch (err) {
    console.error("Server error in get-3d-model:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
