
export default async function handler(req, res) {
  if (req.method === 'POST') {
    console.log("❌ Booking Canceled:", req.body);
    res.status(200).json({ status: 'Booking canceled received' });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
