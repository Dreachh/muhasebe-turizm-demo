// Firebase yapılandırması - Server ve Client için ortak
export const getFirebaseConfig = () => {
  // Gerekli tüm config değerlerinin varlığını kontrol et
  const requiredEnvVars = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL
  };

  // Eksik değerleri kontrol et
  const missingVars = Object.entries(requiredEnvVars)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missingVars.length > 0) {
    throw new Error(`Missing required Firebase configuration: ${missingVars.join(', ')}`);
  }

  return requiredEnvVars;
};

export const firebaseConfig = getFirebaseConfig();

// Sunucu tarafı kontrolü
export const isServerSide = () => typeof window === 'undefined';
