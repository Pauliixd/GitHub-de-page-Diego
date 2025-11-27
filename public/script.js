// script.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
    getFirestore,
    doc,
    getDoc,
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import {
    getAuth,
    signInAnonymously,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

// CONFIGURA AQUÍ TU FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyD7o2Nam_oBXSsT7QRGMudpwRl5Z5DTjpA",
  authDomain: "moaixd.firebaseapp.com",
  projectId: "moaixd",
  storageBucket: "moaixd.firebasestorage.app",
  messagingSenderId: "498764551600",
  appId: "1:498764551600:web:e03e02d06679e0d5007275",
  measurementId: "G-W0LVF5RVDR"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

console.log("Firebase initialized.");

// Función para cargar estado del stream
async function cargarEstadoStream() {
    const appId = "moaixd";
    const statusDocRef = doc(db, `artifacts/${appId}/public/data/stream_status/current_status`);

    try {
        const statusSnap = await getDoc(statusDocRef);
        if (statusSnap.exists()) {
            const data = statusSnap.data();
            console.log("[Firestore Status] Datos recibidos:", data);

            // Actualiza el DOM según tu estructura HTML
            const statusText = document.getElementById("statusText");
            const statusIndicator = document.getElementById("statusIndicator");
            const goLiveButtonContainer = document.getElementById("goLiveButtonContainer");

            if (data.isLive) {
                statusText.textContent = data.streamTitle || "¡Estoy en vivo!";
                statusIndicator.classList.remove("offline");
                statusIndicator.classList.add("online");
                goLiveButtonContainer.style.display = "block";
            } else {
                statusText.textContent = "Offline por ahora";
                statusIndicator.classList.remove("online");
                statusIndicator.classList.add("offline");
                goLiveButtonContainer.style.display = "none";
            }

        } else {
            console.log("No status document found");
        }
    } catch (error) {
        console.error("Error cargando estado del stream:", error);
    }
}

// Función para cargar anuncios
async function cargarAnuncios() {
    const appId = "moaixd";
    const announcementsCol = collection(db, `artifacts/${appId}/public/data/announcements`);

    try {
        const querySnapshot = await getDocs(announcementsCol);
        const container = document.getElementById("announcementsContainer");
        container.innerHTML = ""; // limpia el contenido previo

        if (!querySnapshot.empty) {
            querySnapshot.forEach(docSnap => {
                const data = docSnap.data();
                const p = document.createElement("p");
                p.textContent = data.title || "Sin título";
                container.appendChild(p);
            });
            console.log("[Firestore Announcements] Documentos recibidos:", querySnapshot.size);
        } else {
            container.innerHTML = "<p class='text-gray-400'>No hay novedades por ahora.</p>";
            console.log("[Firestore Announcements] Documentos recibidos: 0");
        }
    } catch (error) {
        console.error("Error cargando anuncios:", error);
    }
}

// Manejo de autenticación
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("User authenticated:", user.uid);
        cargarEstadoStream();
        cargarAnuncios();
    } else {
        console.log("No user, signing in anonymously...");
        signInAnonymously(auth).catch((error) => {
            console.error("Error signing in anonymously:", error);
        });
    }
});
