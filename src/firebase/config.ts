import { initializeApp } from 'firebase/app';
import { getAuth, browserLocalPersistence, setPersistence } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// CRITICAL: Specify provisioned firestoreDatabaseId
// Using initializeFirestore with experimentalAutoDetectLongPolling ensures stable backend connectivity
// in browser iframes, previews, and mobile networks where WebChannel duplex streaming is restricted.
export const db = initializeFirestore(
  app,
  {
    experimentalAutoDetectLongPolling: true,
  },
  firebaseConfig.firestoreDatabaseId
);

export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch(() => {});
export const storageBucket = firebaseConfig.storageBucket;
export const firebaseAppConfig = firebaseConfig;

async function testConnection(maxRetries = 2) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await getDocFromServer(doc(db, 'test', 'connection'));
      return;
    } catch (error) {
      if (attempt === maxRetries) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error('Please check your Firebase configuration.');
        }
      } else {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }
}

testConnection();
