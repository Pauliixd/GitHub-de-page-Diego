// script.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
  getFirestore,
  doc,
  collection,
  getDoc,
  getDocs
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

// ========  CONFIGURACIÓN DE FIREBASE ========
const firebaseConfig = {
  apiKey: "AIzaSyD7o2Nam_oBXSsT7QRGMudpwRl5Z5DTjpA",
  authDomain: "moaixd.firebaseapp.com",
  projectId: "moaixd",
  storageBucket: "moaixd.firebasestorage.app",
  messagingSenderId: "498764551600",
  appId: "1:498764551600:web:e03e02d06679e0d5007275",
  measurementId: "G-W0LVF5RVDR"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

console.log("Firebase initialized.");

// ======== AUTENTICACIÓN ANÓNIMA ========
onAuthStateChanged(auth, async (user) => {
  if (user) {
    console.log("User authenticated:", user.uid);
    await cargarEstadoStream();
    await cargarAnuncios();
  } else {
    console.log("No user, signing in anonymously...");
    try {
      await signInAnonymously(auth);
    } catch (error) {
      console.error("Error signing in anonymously:", error);
    }
  }
});

// ========  ELEMENTOS DEL DOM ========
const statusIndicator = document.getElementById("statusIndicator");
const statusText = document.getElementById("statusText");
const goLiveButtonContainer = document.getElementById("goLiveButtonContainer");
const displayMessage = document.getElementById("displayMessage");
const loadingSpinner = document.getElementById("loadingSpinner");
const avatar = document.querySelector("img[alt='Avatar de Moaixd']");

// Modal
const modal = document.getElementById("announcementModal");
const closeBtn = document.getElementById("closeModalBtn");
const modalImage = document.getElementById("modalImage");
const modalTitle = document.getElementById("modalTitle");
const modalContent = document.getElementById("modalContent");

// ========  FUNCIONES ========

// Función para actualizar estado del stream
async function cargarEstadoStream() {
  try {
    const docRef = doc(db, "streamStatus", "status"); // Ajusta tu colección/documento
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      const isLive = data.isLive;

      // Actualizar spinner
      loadingSpinner.style.display = "none";

      // Indicador
      statusIndicator.classList.remove("online", "offline");
      statusIndicator.classList.add(isLive ? "online" : "offline");

      // Texto
      statusText.textContent = isLive ? "¡En vivo ahora!" : "Offline, hermano...";
      statusText.classList.remove("glow-text-online", "glow-text-offline");
      statusText.classList.add(isLive ? "glow-text-online" : "glow-text-offline");

      // Avatar glow
      avatar.classList.remove("avatar-glow-online", "avatar-glow-offline");
      avatar.classList.add(isLive ? "avatar-glow-online" : "avatar-glow-offline");

      // Botón "Ver en vivo"
      goLiveButtonContainer.style.display = isLive ? "flex" : "none";

      // Mensaje adicional
      displayMessage.textContent = data.streamTitle || "";

      console.log("[Firestore Status] Datos recibidos:", data);
    } else {
      console.log("No status document found");
      loadingSpinner.style.display = "none";
    }
  } catch (error) {
    console.error("Error cargando estado del stream:", error);
    loadingSpinner.style.display = "none";
  }
}

// Función para cargar anuncios
async function cargarAnuncios() {
  try {
    const querySnapshot = await getDocs(collection(db, "announcements"));
    const container = document.getElementById("announcementsContainer");
    container.innerHTML = "";

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const p = document.createElement("p");
      p.className = "text-gray-200 cursor-pointer hover:text-green-400 transition-all duration-200";
      p.textContent = data.title;
      p.addEventListener("click", () => openModal(data));
      container.appendChild(p);
    });

    console.log("[Firestore Announcements] Documentos recibidos:", querySnapshot.size);
  } catch (error) {
    console.error("Error cargando anuncios:", error);
  }
}

// Función para abrir modal
function openModal(data) {
  modalImage.src = data.img || "";
  modalTitle.textContent = data.title || "";
  modalContent.textContent = data.content || "";
  modal.style.display = "flex";
}

// Cerrar modal
closeBtn.addEventListener("click", () => {
  modal.style.display = "none";
});

// Cerrar modal si hace click fuera del contenido
window.addEventListener("click", (e) => {
  if (e.target === modal) modal.style.display = "none";
});
