// The simplest possible endpoint. No input, no external call.
// Open /api/hello and you should see JSON come back.

export default function handler(req, res) {
  res.status(200).json({
    message: "Hello from your first API!",
    time: new Date().toISOString()
  });
}
