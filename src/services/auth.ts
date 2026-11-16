import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

export const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

const provider = new GoogleAuthProvider();
for (const scope of SCOPES) {
  provider.addScope(scope);
}
provider.setCustomParameters({
  prompt: 'select_account',
});

let isSigningIn = false;
// Keep OAuth access token strictly in memory (never in localStorage or sessionStorage)
let cachedAccessToken: string | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: (existingUser: User | null) => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure(user);
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure(null);
    }
  });
};

export class AuthCancelledError extends Error {
  constructor(
    message = 'หน้าต่างเข้าสู่ระบบ Google ถูกปิดก่อนดำเนินการเสร็จสิ้น กรุณากดเข้าสู่ระบบอีกครั้ง (หากหน้าต่างไม่แสดง กรุณาอนุญาต Pop-up ในเบราว์เซอร์)'
  ) {
    super(message);
    this.name = 'AuthCancelledError';
  }
}

function getFirebaseAuthErrorCode(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    return String((error as { code?: unknown }).code || '');
  }
  return '';
}

export const googleSignIn = async (): Promise<{ user: User; accessToken: string }> => {
  if (isSigningIn) {
    throw new AuthCancelledError(
      'กำลังเปิดหน้าต่างเข้าสู่ระบบ Google อยู่ กรุณาดำเนินการในหน้าต่างที่เปิดไว้'
    );
  }

  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('ไม่สามารถรับสิทธิ์เข้าถึง Google Sheets ได้ กรุณาลองเข้าสู่ระบบใหม่อีกครั้ง');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    const code = getFirebaseAuthErrorCode(error);

    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      throw new AuthCancelledError();
    }

    if (code === 'auth/popup-blocked') {
      throw new Error(
        'เบราว์เซอร์บล็อกหน้าต่างเข้าสู่ระบบ (Pop-up) กรุณาอนุญาต Pop-up สำหรับเว็บไซต์นี้ แล้วลองกดเข้าสู่ระบบอีกครั้ง'
      );
    }

    if (code === 'auth/unauthorized-domain') {
      throw new Error(
        'โดเมนของเว็บไซต์ยังไม่ได้รับอนุญาตให้เข้าสู่ระบบใน Firebase Authentication (auth/unauthorized-domain)'
      );
    }

    if (code === 'auth/network-request-failed') {
      throw new Error(
        'ไม่สามารถเชื่อมต่อเครือข่ายเพื่อเข้าสู่ระบบได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่อีกครั้ง'
      );
    }

    if (code === 'auth/user-disabled') {
      throw new Error('บัญชีผู้ใช้งานนี้ถูกระงับสิทธิ์ กรุณาติดต่อผู้ดูแลระบบ');
    }

    if (error instanceof AuthCancelledError) {
      throw error;
    }

    throw error instanceof Error
      ? error
      : new Error('ไม่สามารถเข้าสู่ระบบด้วย Google ได้ กรุณาลองใหม่อีกครั้ง');
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const clearCachedToken = () => {
  cachedAccessToken = null;
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};
