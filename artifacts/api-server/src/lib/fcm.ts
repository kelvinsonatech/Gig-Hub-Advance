import * as admin from "firebase-admin";

let initialized = false;

function initFirebase() {
  if (initialized || admin.apps.length > 0) {
    initialized = true;
    return;
  }
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    console.warn("[fcm] Firebase Admin credentials not set — push notifications disabled");
    return;
  }

  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });
  initialized = true;
  console.info("[fcm] Firebase Admin initialized");
}

export async function sendPushToTokens(
  tokens: string[],
  title: string,
  body: string,
  imageUrl?: string | null
): Promise<{ successCount: number; failedTokens: string[] }> {
  if (tokens.length === 0) return { successCount: 0, failedTokens: [] };

  initFirebase();
  if (admin.apps.length === 0) return { successCount: 0, failedTokens: [] };

  const failedTokens: string[] = [];
  let successCount = 0;

  const chunkSize = 500;
  for (let i = 0; i < tokens.length; i += chunkSize) {
    const chunk = tokens.slice(i, i + chunkSize);
    try {
      const response = await admin.messaging().sendEachForMulticast({
        tokens: chunk,
        notification: {
          title,
          body,
          imageUrl: imageUrl ?? undefined,
        },
        webpush: {
          notification: {
            title,
            body,
            icon: "/favicon.png",
            badge: "/favicon.png",
            image: imageUrl ?? undefined,
          },
        },
      });
      successCount += response.successCount;
      response.responses.forEach((r, idx) => {
        if (!r.success) {
          const code = r.error?.code;
          if (
            code === "messaging/invalid-registration-token" ||
            code === "messaging/registration-token-not-registered"
          ) {
            failedTokens.push(chunk[idx]);
          }
        }
      });
    } catch (err) {
      console.error("[fcm] sendEachForMulticast error:", err);
    }
  }

  return { successCount, failedTokens };
}
