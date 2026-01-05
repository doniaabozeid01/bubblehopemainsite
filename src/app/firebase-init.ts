import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { environment } from '../app/Environments/environment';

const app = getApps().length ? getApp() : initializeApp(environment.firebase);
export const firebaseAuth = getAuth(app);
