import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyChwl6YmRGzaaWYqUPJ9WxG0U-9Em4EzMM',
  authDomain: 'valj-vag-verktyg.firebaseapp.com',
  projectId: 'valj-vag-verktyg',
  storageBucket: 'valj-vag-verktyg.firebasestorage.app',
  messagingSenderId: '275505491683',
  appId: '1:275505491683:web:11c3adb9b7239b75ca5fd6',
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()
export const db = getFirestore(app)
export default app
