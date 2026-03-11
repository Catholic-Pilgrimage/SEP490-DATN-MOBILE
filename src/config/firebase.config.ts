type GoogleServicesJson = {
  project_info?: {
    project_number?: string;
    project_id?: string;
    storage_bucket?: string;
  };
  client?: {
    client_info?: {
      mobilesdk_app_id?: string;
      android_client_info?: {
        package_name?: string;
      };
    };
    oauth_client?: {
      client_id?: string;
      client_type?: number;
      android_info?: {
        package_name?: string;
        certificate_hash?: string;
      };
    }[];
    api_key?: {
      current_key?: string;
    }[];
    services?: {
      appinvite_service?: {
        other_platform_oauth_client?: {
          client_id?: string;
          client_type?: number;
        }[];
      };
    };
  }[];
};

const googleServices = require("../../google-services.json") as GoogleServicesJson;

const firebaseClient = googleServices.client?.[0];
const projectInfo = googleServices.project_info;

const webClientIdFromServices =
  firebaseClient?.services?.appinvite_service?.other_platform_oauth_client?.find(
    (client) => client.client_type === 3,
  )?.client_id ??
  firebaseClient?.oauth_client?.find((client) => client.client_type === 3)
    ?.client_id;

export const GOOGLE_SIGN_IN_CONFIG = {
  webClientId:
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || webClientIdFromServices || "",
};

export const FIREBASE_CONFIG = {
  apiKey:
    process.env.EXPO_PUBLIC_FIREBASE_API_KEY ||
    firebaseClient?.api_key?.[0]?.current_key ||
    "",
  appId:
    process.env.EXPO_PUBLIC_FIREBASE_APP_ID ||
    firebaseClient?.client_info?.mobilesdk_app_id ||
    "",
  authDomain:
    process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    `${projectInfo?.project_id || ""}.firebaseapp.com`,
  messagingSenderId:
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ||
    projectInfo?.project_number ||
    "",
  projectId:
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || projectInfo?.project_id || "",
  storageBucket:
    process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    projectInfo?.storage_bucket ||
    "",
};

export const isFirebaseConfigured = Object.values(FIREBASE_CONFIG).every(Boolean);
export const isGoogleSignInConfigured = Boolean(GOOGLE_SIGN_IN_CONFIG.webClientId);
