
export default async function handler(req, res) {
  if (req.method === 'POST') {
    const payload = req.body;

    console.log("✅ Webhook received:", payload);

    // Forward logic or storage here

    res.status(200).json({ status: 'Webhook received', data: payload });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
