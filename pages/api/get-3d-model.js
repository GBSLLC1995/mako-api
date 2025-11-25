// pages/api/get-3d-model.js

export default async function handler(req, res) {
  // --- CORS headers ---
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ error: "id is required" });
  }

  if (!process.env.MESHY_API_KEY) {
    return res
      .status(500)
      .json({ error: "MESHY_API_KEY is not set on the server" });
  }

  try {
    // Call Meshy: GET /openapi/v1/image-to-3d/:id
    const meshyRes = await fetch(
      `https://api.meshy.ai/openapi/v1/image-to-3d/${id}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.MESHY_API_KEY}`,
        },
      }
    );

    const task = await meshyRes.json();

    if (!meshyRes.ok) {
      console.error("Meshy API error (get-3d-model):", task);
      return res.status(502).json({
        error: "Meshy API error",
        details: task,
      });
    }

    const status = task.status;
    const urls = task.model_urls || {};
    let modelUrl = null;

    // Only pick a model URL when the task has actually finished successfully
    if (status === "SUCCEEDED") {
      const glbUrl = urls.glb || null;
      const fbxUrl = urls.fbx || null;
      const usdzUrl = urls.usdz || null;
      const preRemeshedGlb = urls.pre_remeshed_glb || null;

      // Prefer GLB → FBX → USDZ → pre-remeshed GLB
      modelUrl =
        || glbUrl || fbxUrl || usdzUrl || preRemeshedGlb || null;
    }

    // Don’t treat missing modelUrl as an error if status isn’t SUCCEEDED yet.
    // The frontend should keep polling while status is PENDING/RUNNING.
    return res.status(200).json({
      status,
      progress: task.progress,
      thumbnailUrl: task.thumbnail_url,
      modelUrl,     // chosen URL (GBL if available)
      modelUrls: urls, // all formats in case you need them
      taskError: task.task_error || null,
    });
  } catch (err) {
    console.error("Server error in get-3d-model:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
