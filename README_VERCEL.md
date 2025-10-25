# FCM Server (Vercel) - Setup Guide

This branch (fcm/vercel) adds two serverless endpoints you can deploy on Vercel:

- /api/registerToken  - Register a client FCM token and subscribe it to the 'all' topic.
- /api/sendNotification - Send a notification to a token or to a topic (or broadcast to 'all').

Environment variables to set in Vercel (do NOT commit secrets to repo):

- FIREBASE_SERVICE_ACCOUNT
  - Value: paste the full service-account.json contents, or base64-encoded JSON string.
  - The code supports raw JSON or base64-encoded JSON.

- AUTH_SECRET
  - Value: a long random string (e.g. openssl rand -hex 32) used by the admin page when calling /api/sendNotification.

- REGISTRATION_SECRET
  - Value: a long random string used by the mobile app to call /api/registerToken to register device tokens.

Deployment steps
1. Merge branch fcm/vercel to your main branch or deploy the branch directly in Vercel.
2. In the Vercel dashboard, add the three environment variables above.
   - For FIREBASE_SERVICE_ACCOUNT you can use base64 to avoid newline issues:
     - macOS / Linux: cat service-account.json | base64 | tr -d '\n'
     - Then paste the single-line base64 into Vercel and the code will decode it.
3. Deploy the project on Vercel. Vercel will install dependencies and provide the API endpoints at https://<your-vercel-app>.vercel.app/api/...

How to register tokens from the Android app
- POST to /api/registerToken with header X-REG-TOKEN set to REGISTRATION_SECRET and JSON body: { token: "<fcm-token>", uid: "optional-user-id" }

How to use the admin page
- Open public/fcm_sender.html in a secure location (do NOT publish AUTH_TOKEN in a public page).
- Edit the AUTH_TOKEN constant in the file to match the AUTH_SECRET value in Vercel (or better: protect the admin page via authentication and keep the secret there).
- Enter a token or enable Broadcast and send a message.

Security notes
- Never commit service-account.json or secrets to source control.
- Protect the admin page (Cloudflare Access, HTTP auth, host locally) when embedding AUTH_TOKEN.
- Rotate the service account / secrets if they are compromised.
