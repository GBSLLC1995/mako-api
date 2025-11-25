export default async function handler(req, res) {
  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ error: "id is required" });
  }

  try {
    const meshyRes = await fetch(`https://api.meshy.ai/openapi/v1/image-to-3d/${id}`, {
      headers: {
        "Authorization": `Bearer ${process.env.MESHY_API_KEY}`
      }
    });

    const task = await meshyRes.json();

    if (!meshyRes.ok) {
      console.error("Meshy error:", task);
      return res.status(500).json({ error: "Meshy API error", details: task });
    }

    return res.status(200).json({
      status: task.status,
      progress: task.progress,
      thumbnailUrl: task.thumbnail_url,
      modelUrls: task.model_urls
    });
  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
