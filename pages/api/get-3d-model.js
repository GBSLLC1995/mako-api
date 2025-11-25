export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { id } = req.query || {};
  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "id query parameter is required" });
  }

  const apiKey = process.env.MESHY_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "MESHY_API_KEY is not set on the server" });
  }

  try {
    const response = await fetch(
      `https://api.meshy.ai/openapi/v1/image-to-3d/${encodeURIComponent(id)}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${apiKey}`
        }
      }
    );

    let task;
    try {
      task = await response.json();
    } catch (parseErr) {
      const raw = await response.text();
      task = { raw };
    }

    if (!response.ok) {
      console.error("Meshy API error (get-task):", response.status, task);
      return res.status(502).json({
        error: "MESHY_API_ERROR",
        status: response.status,
        details: task
      });
    }

    // Destructure relevant fields
    const {
      id: taskId,
      model_urls,
      thumbnail_url,
      texture_prompt,
      texture_urls,
      progress,
      status,
      created_at,
      started_at,
      finished_at,
      expires_at,
      preceding_tasks,
      task_error
    } = task;

    // Ensure we have model_urls object
    if (!model_urls || typeof model_urls !== "object") {
      // If still in progress, it's okay; but if succeeded and missing obj, that's issue
      if (status === "SUCCEEDED") {
        console.error("Meshy response missing model_urls for succeeded task:", task);
        return res.status(500).json({
          error: "MESHY_RESPONSE_MISSING_MODEL_URLS",
          details: task
        });
      }
    }

    // Pick obj URL if available
    const objUrl = model_urls?.obj || null;

    // If succeeded but no obj URL: error
    if (status === "SUCCEEDED" && !objUrl) {
      console.error("Meshy succeeded but no obj URL:", model_urls);
      return res.status(500).json({
        error: "MESHY_RESPONSE_MISSING_OBJ_URL",
        details: model_urls
      });
    }

    // Compose response
    const result = {
      id: taskId,
      status,
      progress,
      thumbnail_url,
      model_urls,
      obj_url: objUrl,
      texture_prompt,
      texture_urls,
      created_at,
      started_at,
      finished_at,
      expires_at,
      preceding_tasks,
      task_error
    };

    return res.status(200).json(result);

  } catch (err) {
    console.error("Server error in get-task handler:", err);
    return res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
  }
}
