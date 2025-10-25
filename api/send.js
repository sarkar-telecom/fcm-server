import admin from "firebase-admin";

let appInitialized = false;

function initFirebase() {
  if (appInitialized) return;
  const raw = process.env.FIREBASE_KEY;
  if (!raw) throw new Error("FIREBASE_KEY env var not set");
  const serviceAccount = JSON.parse(raw);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  appInitialized = true;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  try {
    initFirebase();
    const { token, topic, title, body, imageUrl, clickUrl } = req.body || {};

    if ((!token && !topic) || !title || !body) {
      return res.status(400).json({ error: "Provide token or topic, and title & body" });
    }

    const message = {
      notification: { title, body },
      data: {},
    };
    if (imageUrl) message.notification.image = imageUrl;
    if (clickUrl) message.data.click_action = clickUrl;
    if (token) message.token = token;
    else message.topic = topic;

    const response = await admin.messaging().send(message);
    res.json({ success: true, response });
  } catch (err) {
    console.error("Send error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
}
