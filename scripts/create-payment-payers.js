// Firebase'de paymentPayers koleksiyonunu manuel olarak oluşturma scripti
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyAE82DzU0wOOSYiQHgOGF7z0FzCOKfwc4I",
  authDomain: "travel-admin-88df0.firebaseapp.com",
  projectId: "travel-admin-88df0",
  storageBucket: "travel-admin-88df0.firebasestorage.app",
  messagingSenderId: "30892388421",
  appId: "1:30892388421:web:d7a8f5b9b8f9b9b9b9b9b9"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const samplePaymentPayers = [
  { id: 'customer', name: 'Müşteri', value: 'customer' },
  { id: 'agency', name: 'Aracı Firma', value: 'agency' },
  { id: 'hotel', name: 'Otel', value: 'hotel' }
];

async function createPaymentPayers() {
  try {
    console.log('paymentPayers koleksiyonu oluşturuluyor...');
    
    for (const payer of samplePaymentPayers) {
      await setDoc(doc(db, 'paymentPayers', payer.id), {
        ...payer,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log(`✅ ${payer.name} eklendi`);
    }
    
    console.log('✅ paymentPayers koleksiyonu başarıyla oluşturuldu');
  } catch (error) {
    console.error('❌ Hata:', error);
  }
}

createPaymentPayers();
