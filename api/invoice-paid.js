
export default async function handler(req, res) {
  if (req.method === 'POST') {
    console.log("📄 Invoice Paid:", req.body);
    res.status(200).json({ status: 'Invoice paid received' });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
