/* ============================================================
   CHATBOT DE QUALIFICATION DE DEVIS — PRESCOMS
   Le visiteur écrit librement / choisit par boutons, le script
   déroule le scénario : service -> tarif -> confirmation ->
   collecte des infos -> enregistrement dans Firebase Firestore.

   Le chargement de Firebase se fait en tâche de fond (import
   dynamique) : si la configuration est absente/incorrecte, ou si
   le fichier est ouvert directement (file://) sans serveur, le
   chat continue de fonctionner normalement — seul l'enregistrement
   Firestore est alors indisponible (message d'erreur affiché au
   moment de la confirmation, avec les coordonnées de secours).
   ============================================================ */

let firestoreOutils = null; // rempli une fois Firebase chargé avec succès

(async () => {
  try {
    const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js");
    const { getFirestore, collection, addDoc, serverTimestamp } =
      await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js");
    const { firebaseConfig, COLLECTION_DEMANDES } = await import("./firebase-config.js");

    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    firestoreOutils = { db, collection, addDoc, serverTimestamp, COLLECTION_DEMANDES };
    console.log("Firebase prêt.");
  } catch (erreur) {
    console.error("Firebase indisponible (le chat reste fonctionnel, mais rien ne sera enregistré) :", erreur);
  }
})();

const SERVICES = [
  { id: "construction", label: "Construction métallique", tarif: "Sur devis" },
  { id: "chaudronnerie", label: "Chaudronnerie industrielle", tarif: "Sur devis" },
  { id: "soudure", label: "Soudure industrielle", tarif: "Sur devis" },
  { id: "tuyauterie", label: "Tuyauterie industrielle", tarif: "Sur devis" },
  { id: "montage", label: "Montage d'usine", tarif: "Sur devis" },
  { id: "genie_civil", label: "Génie civil", tarif: "Sur devis" },
  { id: "rubberline", label: "Revêtement en caoutchouc (Rubberline)", tarif: "Sur devis" },
  { id: "convoyeurs", label: "Maintenance de bandes et convoyeurs", tarif: "Sur devis" },
  { id: "personnel", label: "Prestation de personnel", tarif: "Sur devis" }
];

function texteTarif(tarif) {
  return tarif === "Sur devis"
    ? "ce service fait l'objet d'un devis personnalisé selon vos besoins"
    : `nos tarifs démarrent à ${tarif}`;
}

const DELAI_INACTIVITE_MS = 3 * 60 * 1000; // 3 minutes
let minuteurInactivite = null;

function redemarrerMinuteurInactivite() {
  clearTimeout(minuteurInactivite);
  minuteurInactivite = setTimeout(() => {
    ajouterMessage("sys", "⏱ Aucune réponse depuis 3 minutes — la discussion recommence depuis le début.");
    reinitialiserConversation();
  }, DELAI_INACTIVITE_MS);
}

/* Remet à zéro toute la conversation (minuteur écoulé ou bouton "Recommencer"). */
function reinitialiserConversation() {
  clearTimeout(minuteurInactivite);
  messagesEl.innerHTML = "";
  allerA("DEMANDE_SERVICE");
}
let etape = null;
let demande = { service: null, tarif: null, nom: null, telephone: null, lieu: null, description: null };

const messagesEl = document.getElementById("messages");
const inputEl = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");

function ajouterMessage(role, texte) {
  const div = document.createElement("div");
  div.className = "msg " + role;
  div.textContent = texte;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return div;
}

/* Affiche un message du bot suivi de boutons de choix.
   Le clic sur un bouton envoie automatiquement la réponse. */
function poserQuestionChoix(texteBot, choix) {
  ajouterMessage("bot", texteBot);
  activerSaisieLibre(false);

  const group = document.createElement("div");
  group.className = "options-group";
  choix.forEach(option => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "option-btn";
    btn.textContent = option.label;
    btn.addEventListener("click", () => {
      group.remove();
      ajouterMessage("user", option.label);
      option.action();
    });
    group.appendChild(btn);
  });
  messagesEl.appendChild(group);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  redemarrerMinuteurInactivite();
}

/* Affiche un message du bot et laisse la personne taper une réponse libre
   (utilisé uniquement pour les infos personnelles : nom, téléphone, lieu, description). */
function poserQuestionTexte(texteBot) {
  ajouterMessage("bot", texteBot);
  activerSaisieLibre(true);
  redemarrerMinuteurInactivite();
}

function activerSaisieLibre(actif) {
  inputEl.disabled = !actif;
  sendBtn.disabled = !actif;
  inputEl.placeholder = actif ? "Écrivez votre réponse…" : "Choisissez une option ci-dessus";
  if (actif) inputEl.focus();
}

function optionsServices() {
  return SERVICES.map(s => ({
    label: s.label,
    action: () => {
      demande.service = s.label;
      demande.tarif = s.tarif;
      allerA("CONFIRMATION");
    }
  }));
}

/* Enregistre la demande dans Firestore si Firebase a pu être chargé
   (voir en haut du fichier). Retourne true/false. */
async function sauvegarderDemande(demandeFinale) {
  if (!firestoreOutils) {
    console.warn("Firebase non disponible : la demande n'a pas été enregistrée.");
    return false;
  }
  try {
    const { db, collection, addDoc, serverTimestamp, COLLECTION_DEMANDES } = firestoreOutils;
    await addDoc(collection(db, COLLECTION_DEMANDES), {
      ...demandeFinale,
      horodatage: serverTimestamp()
    });
    console.log("Demande enregistrée dans Firebase :", demandeFinale);
    return true;
  } catch (erreur) {
    console.error("Erreur d'enregistrement Firebase :", erreur);
    return false;
  }
}

function reinitialiser() {
  demande = { service: null, tarif: null, nom: null, telephone: null, lieu: null, description: null };
}

function allerA(etapeSuivante) {
  etape = etapeSuivante;

  switch (etape) {

    case "DEMANDE_SERVICE":
      reinitialiser();
      poserQuestionChoix(
        "Bonjour ! Quel type de service vous intéresse ?",
        optionsServices()
      );
      return;

    case "CONFIRMATION":
      poserQuestionChoix(
        `Très bien, pour "${demande.service}", ${texteTarif(demande.tarif)}. Voulez-vous confirmer cette demande ?`,
        [
          { label: "Oui, je confirme", action: () => allerA("COLLECTE_NOM") },
          { label: "Non, pas maintenant", action: () => allerA("AUTRE_SERVICE") }
        ]
      );
      return;

    case "AUTRE_SERVICE":
      poserQuestionChoix(
        "Souhaitez-vous un autre de nos services ?",
        [
          { label: "Oui, voir les services", action: () => allerA("DEMANDE_SERVICE") },
          { label: "Non merci", action: () => allerA("TERMINE") }
        ]
      );
      return;

    case "COLLECTE_NOM":
      poserQuestionTexte("Parfait ! Pour enregistrer votre demande, quel est votre nom ?");
      return;

    case "COLLECTE_TELEPHONE":
      poserQuestionTexte(`Merci ${demande.nom}. Quel est votre numéro de téléphone ?`);
      return;

    case "COLLECTE_LIEU":
      poserQuestionTexte("Dans quelle ville ou quel quartier le service doit-il être réalisé ?");
      return;

    case "COLLECTE_DESCRIPTION":
      poserQuestionTexte("Enfin, pouvez-vous décrire brièvement votre besoin (dimensions, délai souhaité, etc.) ?");
      return;

    case "RECAP":
      (async () => {
        const succes = await sauvegarderDemande(demande);
        if (succes) {
          ajouterMessage("bot", `Votre demande est enregistrée ✓\n\n• Service : ${demande.service}\n• Lieu : ${demande.lieu}\n\nNotre équipe PRESCOMS vous recontactera bientôt au ${demande.telephone} avec un devis personnalisé.`);
        } else {
          ajouterMessage("sys", "⚠ La demande n'a pas pu être enregistrée. Vérifiez la configuration Firebase (firebase-config.js) et les règles Firestore.");
          ajouterMessage("bot", `Pas de panique, notez ces informations de votre côté : Service : ${demande.service} — Lieu : ${demande.lieu} — Téléphone : ${demande.telephone}. Contactez-nous directement au (+225) 05 45 45 83 00.`);
        }
        allerA("AUTRE_SERVICE");
      })();
      return;

    case "TERMINE":
      poserQuestionChoix(
        "Très bien, merci pour votre visite ! Souhaitez-vous démarrer une nouvelle demande ?",
        [{ label: "Nouvelle demande", action: () => allerA("DEMANDE_SERVICE") }]
      );
      return;
  }
}

/* Traite la saisie libre, uniquement utilisée pour les 4 étapes
   de collecte d'informations personnelles. */
function envoyerMessage() {
  if (inputEl.disabled) return;
  const texte = inputEl.value.trim();
  if (!texte) return;
  ajouterMessage("user", texte);
  inputEl.value = "";

  switch (etape) {
    case "COLLECTE_NOM":
      demande.nom = texte;
      allerA("COLLECTE_TELEPHONE");
      return;
    case "COLLECTE_TELEPHONE":
      demande.telephone = texte;
      allerA("COLLECTE_LIEU");
      return;
    case "COLLECTE_LIEU":
      demande.lieu = texte;
      allerA("COLLECTE_DESCRIPTION");
      return;
    case "COLLECTE_DESCRIPTION":
      demande.description = texte;
      allerA("RECAP");
      return;
  }
}

sendBtn.addEventListener("click", envoyerMessage);
inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") envoyerMessage();
});

const resetChatBtn = document.getElementById("resetChatBtn");
if (resetChatBtn) {
  resetChatBtn.addEventListener("click", reinitialiserConversation);
}

document.querySelectorAll("[data-scroll-to]").forEach(btn => {
  btn.addEventListener("click", () => {
    const target = document.getElementById(btn.dataset.scrollTo);
    if (target) target.scrollIntoView({ behavior: "smooth" });
    const menu = document.getElementById("mobileMenu");
    if (menu) menu.classList.remove("open");
  });
});

// Menu mobile (hamburger)
const navBurger = document.getElementById("navBurger");
const mobileMenu = document.getElementById("mobileMenu");
if (navBurger && mobileMenu) {
  navBurger.addEventListener("click", () => {
    mobileMenu.classList.toggle("open");
  });
  mobileMenu.querySelectorAll("a").forEach(a => {
    a.addEventListener("click", () => mobileMenu.classList.remove("open"));
  });
}

// Démarrage de la conversation
activerSaisieLibre(false);
allerA("DEMANDE_SERVICE");