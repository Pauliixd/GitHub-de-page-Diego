// =======================
// FIREBASE INIT
// =======================
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getFirestore, doc, collection, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_AUTH_DOMAIN",
  projectId: "moaixd",
  storageBucket: "TU_BUCKET",
  messagingSenderId: "TU_SENDER_ID",
  appId: "TU_APP_ID"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

console.log("Firebase initialized.");

// =======================
// DOM ELEMENTS
// =======================
const streamStatusEl = document.getElementById("streamStatus");
const streamTitleEl = document.getElementById("streamTitle");
const kickLinkEl = document.getElementById("kickLink");
const announcementsContainer = document.getElementById("announcementsContainer");
const announcementModal = document.getElementById("announcementModal");
const modalImage = document.getElementById("modalImage");
const modalTitle = document.getElementById("modalTitle");
const modalContent = document.getElementById("modalContent");
const closeModalBtn = document.getElementById("closeModalBtn");

const KICK_CHANNEL_SLUG = "moaixd";

// =======================
// UTILITIES
// =======================
function updateStreamStatusUI(isLive, title) {
  if (!streamStatusEl || !streamTitleEl) return;

  if (isLive) {
    streamStatusEl.className =
      "inline-block px-6 py-2 rounded-full shadow-lg font-bold text-lg transition-all duration-500 ease-in-out bg-kick-green text-black";
    streamStatusEl.innerHTML =
      '<i class="fas fa-circle animate-pulse mr-2 text-red-500"></i> EN VIVO AHORA';
    streamTitleEl.textContent = title || "¡Conéctate y saluda!";
  } else {
    streamStatusEl.className =
      "inline-block px-6 py-2 rounded-full shadow-lg font-bold text-lg transition-all duration-500 ease-in-out bg-gray-700 text-gray-300";
    streamStatusEl.innerHTML =
      '<i class="fas fa-circle mr-2 text-gray-400"></i> FUERA DE LÍNEA';
    streamTitleEl.textContent =
      "Revisa mis redes para el próximo anuncio de stream.";
  }

  if (kickLinkEl) kickLinkEl.href = `https://kick.com/${KICK_CHANNEL_SLUG}`;
}

// =======================
// FIRESTORE LISTENERS
// =======================
function listenForStreamStatus() {
  const streamDocRef = doc(db, "artifacts/default-app-id/public/data/stream_status/kick_" + KICK_CHANNEL_SLUG);

  onSnapshot(
    streamDocRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log("[Firestore Status] Datos recibidos:", data);
        updateStreamStatusUI(data.isLive, data.streamTitle);
      } else {
        console.log("[Firestore Status] Documento no encontrado");
        updateStreamStatusUI(false, null);
      }
    },
    (error) => {
      console.error("[Firestore Status] Error:", error);
      updateStreamStatusUI(false, "Error al obtener el estado.");
    }
  );
}

function listenForAnnouncements() {
  const announcementsColRef = collection(db, "artifacts/default-app-id/public/data/announcements");
  const q = query(announcementsColRef, orderBy("timestamp", "desc"));

  onSnapshot(q, (querySnap) => {
    announcementsContainer.innerHTML = "";
    if (querySnap.empty) {
      announcementsContainer.innerHTML = '<p class="text-gray-500">No hay novedades recientes.</p>';
      return;
    }

    querySnap.forEach((docSnap) => {
      const announcement = docSnap.data();
      const date = announcement.timestamp?.toDate ? announcement.timestamp.toDate().toLocaleDateString("es-ES") : "Fecha desconocida";

      const announcementEl = document.createElement("div");
      announcementEl.className = "p-4 bg-gray-700 rounded-lg shadow-md cursor-pointer hover:bg-gray-600 transition-colors duration-200 ease-in-out";
      announcementEl.innerHTML = `
        <h4 class="font-bold text-lg text-white">${announcement.title || "Sin título"}</h4>
        <p class="text-sm text-kick-green mb-1">${date}</p>
        <p class="text-gray-400 text-sm line-clamp-2">${announcement.content || "Sin contenido."}</p>
      `;

      announcementEl.addEventListener("click", () => {
        if (announcement.imageUrl) {
          modalImage.src = announcement.imageUrl;
          modalImage.alt = announcement.title || "Imagen de novedad";
          modalImage.style.display = "block";
        } else modalImage.style.display = "none";

        modalTitle.textContent = announcement.title || "Sin título";
        modalContent.textContent = announcement.content || "";
        announcementModal.style.display = "flex";
      });

      announcementsContainer.appendChild(announcementEl);
    });

    console.log("[Firestore Announcements] Documentos recibidos:", querySnap.docs.length);
  }, (error) => {
    console.error("[Firestore Announcements] Error:", error);
    announcementsContainer.innerHTML = '<p class="text-red-400">Error al cargar las novedades.</p>';
  });
}

// =======================
// MODAL EVENTS
// =======================
function setupModalEvents() {
  if (closeModalBtn && announcementModal) {
    closeModalBtn.addEventListener("click", () => {
      announcementModal.style.display = "none";
    });
    window.addEventListener("click", (event) => {
      if (event.target === announcementModal) announcementModal.style.display = "none";
    });
  }
}

// =======================
// INIT
// =======================
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("User authenticated:", user.uid);
    listenForStreamStatus();
    listenForAnnouncements();
  } else {
    console.log("No user, signing in anonymously...");
    signInAnonymously(auth).catch((e) => console.error("Error signing in anonymously:", e));
  }
});

// Setup modal
setupModalEvents();
