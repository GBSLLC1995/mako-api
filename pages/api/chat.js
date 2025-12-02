// /api/chat.js
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Only POST allowed')

  const { messages } = req.body;
  if (!messages) return res.status(400).end('Missing messages array');

  const OPENAI_KEY = process.env.OPENAI_API_KEY;
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are MAKO, a senior fabrication consultant. Guide designers to turn their ideas into manufacturable objects by asking intelligent, technical questions and preparing factory-ready RFQs.' },
        ...messages
      ],
      temperature: 0.7,
    })
  });

  const data = await response.json();
  res.status(200).json(data);
}
