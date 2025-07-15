// Fallback API endpoint to handle webpack hot-update 404s
export default function handler(req, res) {
  // Return empty JSON for webpack hot-update requests to prevent 404s
  res.status(200).json({});
}