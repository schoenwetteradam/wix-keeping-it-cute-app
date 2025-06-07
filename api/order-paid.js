
export default async function handler(req, res) {
  if (req.method === 'POST') {
    console.log("💳 Order Paid:", req.body);
    res.status(200).json({ status: 'Order paid received' });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
