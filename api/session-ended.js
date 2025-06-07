
export default async function handler(req, res) {
  if (req.method === 'POST') {
    console.log("⏹️ Session Ended:", req.body);
    res.status(200).json({ status: 'Session ended received' });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
