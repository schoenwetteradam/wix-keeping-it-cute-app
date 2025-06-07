
export default async function handler(req, res) {
  if (req.method === 'POST') {
    console.log("👤 New Contact Created:", req.body);
    res.status(200).json({ status: 'Contact created received' });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
