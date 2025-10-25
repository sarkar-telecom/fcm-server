// api/registerToken.js
// Endpoint for your Android app (or other trusted clients) to register FCM tokens.
// Requires env var REGISTRATION_SECRET to prevent abuse. POST JSON { token, uid }
// The function will store the token in Firestore collection 'fcm_tokens' and subscribe it to topic 'all'.

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
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' })

  const provided = req.headers['x-reg-token'] || req.headers['x-registration-token'] || req.headers['authorization']
  if (!process.env.REGISTRATION_SECRET || provided !== process.env.REGISTRATION_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  let adminSdk
  try {
    adminSdk = initAdmin()
  } catch (err) {
    console.error('Admin init error:', err)
    return res.status(500).json({ error: String(err) })
  }

  const { token, uid } = req.body || {}
  if (!token) return res.status(400).json({ error: 'Missing token' })

  try {
    const db = adminSdk.firestore()
    const docRef = db.collection('fcm_tokens').doc(token)
    await docRef.set({ token, uid: uid || null, createdAt: adminSdk.firestore.FieldValue.serverTimestamp() }, { merge: true })

    // subscribe to topic 'all' so you can send broadcast messages easily
    try {
      const subscribeResp = await adminSdk.messaging().subscribeToTopic([token], 'all')
      console.log('subscribeResp', subscribeResp)
    } catch (subErr) {
      console.warn('Failed to subscribe token to topic:', subErr)
    }

    return res.status(200).json({ success: true })
  } catch (err) {
    console.error('Register token error:', err)
    return res.status(500).json({ error: String(err) })
  }
}