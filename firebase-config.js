/* ============================================================
   CONFIGURATION FIREBASE — PRESCOMS
   ------------------------------------------------------------
   Remplacez les valeurs ci-dessous par celles de VOTRE projet :
   Console Firebase > Paramètres du projet (⚙️) > Vos applications
   > Application Web > "Config" du SDK.

   Ne partagez ce fichier qu'avec les personnes autorisées de
   l'entreprise — il contient les identifiants de connexion au
   projet Firebase.
   ============================================================ */

export const firebaseConfig = {
  apiKey: "AIzaSyDRrJ3SaPkpWuQUVal2S-Qaj6a24AdaRM8",
  authDomain: "prescom-3a0a9.firebaseapp.com",
  projectId: "prescom-3a0a9",
  storageBucket: "prescom-3a0a9.firebasestorage.app",
  messagingSenderId: "268814105585",
  appId: "1:268814105585:web:1d762830ebda8e84b86250"

};

// Nom de la collection Firestore où seront enregistrées les demandes de devis
export const COLLECTION_DEMANDES = "demandes";