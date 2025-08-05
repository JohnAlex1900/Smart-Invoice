// firebaseAdmin.ts
import admin from "firebase-admin";
import serviceAccount from "../smartinvoice.json" assert { type: "json" };
import { getAuth } from "firebase-admin/auth";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
  });
}

const firestore = admin.firestore();
const auth = admin.auth();

export { admin, firestore, auth };
