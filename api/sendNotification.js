// api/sendNotification.js
// Vercel Serverless function to send FCM messages using firebase-admin and a service account.
// Requires environment variables in Vercel:
// - FIREBASE_SERVICE_ACCOUNT: raw JSON or base64-encoded service account JSON
// - AUTH_SECRET: admin-only secret that must match the X-AUTH-TOKEN header from the admin page

const admin = require('firebase-admin')

function initAdmin() {
  if (admin.apps.length) return admin
  const svc = process.env.FIREBASE_SERVICE_ACCOUNT || ''
  if (!svc) throw new Error('FIREBASE_SERVICE_ACCOUNT env var is not set')
  let serviceAccount
  try {
    if (svc.trim().startsWith('{')) {
      serviceAccount = JSON.parse(svc)
    } else {
      serviceAccount = JSON.parse(Buffer.from(svc, 'base64').toString('utf8'))
    }
  } catch (err) {
    throw new Error('Failed to parse FIREBASE_SERVICE_ACCOUNT: ' + String(err))
  }
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id
  })
  return admin
}

module.exports = async (req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-AUTH-TOKEN')
    return res.status(204).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const provided = req.headers['x-auth-token'] || req.headers['authorization']
  if (!process.env.AUTH_SECRET || provided !== process.env.AUTH_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  let adminSdk
  try {
    adminSdk = initAdmin()
  } catch (err) {
    console.error('Admin init error:', err)
    return res.status(500).json({ error: String(err) })
  }

  const { token, topic = 'all', title, body: messageBody, imageUrl, clickUrl, data, broadcast } = req.body || {}

  if ((!token && !topic && !broadcast) || (!title && !messageBody && !data)) {
    return res.status(400).json({ error: 'Missing fields: supply token or topic (or set broadcast=true) and title/body or data' })
  }

  const message = {}
  if (token && !broadcast) {
    message.token = token
  } else {
    // send to topic
    message.topic = topic || 'all'
  }

  if (title || messageBody) {
    message.notification = {}
    if (title) message.notification.title = title
    if (messageBody) message.notification.body = messageBody
    if (imageUrl) message.notification.image = imageUrl
  }

  if (data && typeof data === 'object') {
    message.data = data
  } else if (clickUrl) {
    message.data = { click_url: clickUrl }
  }

  try {
    const responseId = await admin.messaging().send(message)
    return res.status(200).json({ success: true, id: responseId })
  } catch (err) {
    console.error('FCM send error:', err)
    return res.status(500).json({ error: String(err) })
  }
}