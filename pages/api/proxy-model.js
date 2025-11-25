export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: "url is required" });
  }

  try {
    const upstreamRes = await fetch(url);

    if (!upstreamRes.ok) {
      const text = await upstreamRes.text();
      console.error("Upstream Meshy error:", upstreamRes.status, text);
      return res.status(502).json({ error: "Upstream fetch failed" });
    }

    // Allow your Framer site to load this
    res.setHeader("Access-Control-Allow-Origin", "*");

    // Pass through content-type (usually model/gltf-binary)
    res.setHeader(
      "Content-Type",
      upstreamRes.headers.get("content-type") || "model/gltf-binary"
    );

    const buffer = await upstreamRes.arrayBuffer();
    res.status(200).send(Buffer.from(buffer));
  } catch (err) {
    console.error("Proxy error:", err);
    res.status(500).json({ error: "Proxy error" });
  }
}
