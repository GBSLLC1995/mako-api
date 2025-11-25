// pages/api/proxy-model.js
export default async function handler(req, res) {
  const { url } = req.query;

  if (!url || typeof url !== "string") {
    return res.status(400).send("Missing url parameter");
  }

  try {
    const upstream = await fetch(url);

    if (!upstream.ok) {
      console.error("Proxy upstream error:", upstream.status, url);
      return res.status(upstream.status).send("Upstream error");
    }

    // Allow your Framer site to load this
    res.setHeader("Access-Control-Allow-Origin", "*");

    // Preserve content type (should be model/gltf-binary)
    const contentType =
      upstream.headers.get("content-type") || "application/octet-stream";
    res.setHeader("Content-Type", contentType);

    const buffer = Buffer.from(await upstream.arrayBuffer());
    res.send(buffer);
  } catch (err) {
    console.error("Proxy error:", err);
    res.status(500).send("Proxy error");
  }
}
