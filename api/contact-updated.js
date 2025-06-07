
export default async function handler(req, res) {
  if (req.method === 'POST') {
    console.log("📝 Contact Updated:", req.body);
    res.status(200).json({ status: 'Contact updated received' });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
