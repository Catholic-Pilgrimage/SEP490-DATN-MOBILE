import {
  GoogleSignin,
  isSuccessResponse,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import { Platform } from "react-native";
import { getApps, initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithCredential,
  signOut as firebaseSignOut,
} from "firebase/auth";
import {
  FIREBASE_CONFIG,
  GOOGLE_SIGN_IN_CONFIG,
  isFirebaseConfigured,
  isGoogleSignInConfigured,
} from "../../config/firebase.config";

let isConfigured = false;

const getGoogleFirebaseAuth = () => {
  if (!isFirebaseConfigured) {
    throw new Error("Firebase config is missing or incomplete.");
  }

  const firebaseApp =
    getApps().find((app) => app.name === "google-auth") ||
    initializeApp(FIREBASE_CONFIG, "google-auth");

  return getAuth(firebaseApp);
};

const configureGoogleSignIn = async () => {
  if (isConfigured) {
    return;
  }

  if (!isGoogleSignInConfigured) {
    throw new Error("Google Sign-In is not configured for this build.");
  }

  GoogleSignin.configure({
    webClientId: GOOGLE_SIGN_IN_CONFIG.webClientId,
  });

  isConfigured = true;
};

export const signInWithGoogle = async (): Promise<{ firebaseIdToken: string }> => {
  if (Platform.OS === "web") {
    throw new Error("Google Sign-In is only supported in native builds.");
  }

  await configureGoogleSignIn();
  const firebaseAuth = getGoogleFirebaseAuth();
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

  const response = await GoogleSignin.signIn();

  if (!isSuccessResponse(response)) {
    const cancelledError = new Error("Google sign-in was cancelled.");
    (cancelledError as Error & { code?: string }).code =
      statusCodes.SIGN_IN_CANCELLED;
    throw cancelledError;
  }

  const googleIdToken = response.data.idToken;
  if (!googleIdToken) {
    throw new Error("Google did not return an ID token.");
  }

  const credential = GoogleAuthProvider.credential(googleIdToken);
  const authResult = await signInWithCredential(firebaseAuth, credential);
  const firebaseIdToken = await authResult.user.getIdToken(true);

  if (!firebaseIdToken) {
    throw new Error("Firebase did not return an ID token.");
  }

  return { firebaseIdToken };
};

export const clearGoogleSession = async () => {
  const firebaseAuth = isFirebaseConfigured ? getGoogleFirebaseAuth() : null;

  await Promise.allSettled([
    firebaseAuth ? firebaseSignOut(firebaseAuth) : Promise.resolve(),
    GoogleSignin.signOut().catch(() => null),
  ]);
};

const googleAuthService = {
  clearGoogleSession,
  signInWithGoogle,
};

export default googleAuthService;
