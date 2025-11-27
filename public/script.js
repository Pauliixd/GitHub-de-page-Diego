import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
    getAuth,
    signInAnonymously,
    signInWithCustomToken,
    onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
    getFirestore,
    doc,
    collection,
    query,
    orderBy,
    onSnapshot,
    setLogLevel
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Habilitar debug
setLogLevel('debug');

let app;
let db;
let auth;
let userId;
let isAuthReady = false;

const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";
const firebaseConfig = typeof __firebase_config !== "undefined"
    ? JSON.parse(__firebase_config)
    : {
        apiKey: "AIzaSyD7o2Nam_oBXSsT7QRGMudpwRl5Z5DTjpA",
        authDomain: "moaixd.firebaseapp.com",
        projectId: "moaixd",
        storageBucket: "moaixd.firebasestorage.app",
        messagingSenderId: "498764551600",
        appId: "1:498764551600:web:1e58a74e92a297e28a9b2b"
    };

const initialAuthToken = typeof __initial_auth_token !== "undefined" ? __initial_auth_token : null;

// Referencias DOM
const streamStatusElement = document.getElementById("streamStatus");
const streamTitleElement = document.getElementById("streamTitle");
const kickLinkElement = document.getElementById("kickLink");
const announcementsContainer = document.getElementById("announcementsContainer");
const closeModalBtn = document.getElementById('closeModalBtn');
const announcementModal = document.getElementById('announcementModal');

const KICK_CHANNEL_SLUG = "moaixd";

// --- Utilidades ---
function updateStreamStatusUI(isLive, title) {
    if (!streamStatusElement || !streamTitleElement) return;

    if (isLive) {
        streamStatusElement.className =
            "inline-block px-6 py-2 rounded-full shadow-lg font-bold text-lg transition-all duration-500 ease-in-out bg-kick-green text-black";
        streamStatusElement.innerHTML =
            '<i class="fas fa-circle animate-pulse mr-2 text-red-500"></i> EN VIVO AHORA';
        streamTitleElement.textContent = title || "¡Conéctate y saluda!";
    } else {
        streamStatusElement.className =
            "inline-block px-6 py-2 rounded-full shadow-lg font-bold text-lg transition-all duration-500 ease-in-out bg-gray-700 text-gray-300";
        streamStatusElement.innerHTML =
            '<i class="fas fa-circle mr-2 text-gray-400"></i> FUERA DE LÍNEA';
        streamTitleElement.textContent =
            "Revisa mis redes para el próximo anuncio de stream.";
    }

    if (kickLinkElement) {
        kickLinkElement.href = `https://kick.com/${KICK_CHANNEL_SLUG}`;
    }
}

// --- Inicialización Firebase ---
async function initializeFirebase() {
    try {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);

        if (initialAuthToken) {
            await signInWithCustomToken(auth, initialAuthToken);
        } else {
            await signInAnonymously(auth);
        }

        onAuthStateChanged(auth, (user) => {
            if (user) {
                userId = user.uid;
                isAuthReady = true;
                console.log("Firebase initialized and authenticated. User ID:", userId);
                listenForStreamStatus();
                listenForAnnouncements(); 
            } else {
                isAuthReady = true;
                console.log("User signed out, retrying anonymous sign-in.");
                signInAnonymously(auth).catch(e => console.error("Error signing in anonymously:", e));
            }
        });

    } catch (e) {
        console.error("Error during Firebase initialization or authentication:", e);
        if (streamStatusElement) {
            streamStatusElement.innerHTML =
                '<i class="fas fa-exclamation-triangle mr-2 text-red-500"></i> Error de conexión';
            streamStatusElement.className =
                "inline-block px-6 py-2 rounded-full shadow-lg font-bold text-lg transition-all duration-500 ease-in-out bg-red-800 text-white";
        }
    }
}

// --- Listeners Firestore ---
function listenForStreamStatus() {
    if (!db || !isAuthReady) return;

    // --- RUTA CORRECTA SEGÚN REGLAS ---
    const streamDocRef = doc(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        "stream_status",
        `kick_${KICK_CHANNEL_SLUG}`
    );

    console.log(`[Firestore Status] Conectando a: artifacts/${appId}/public/data/stream_status/kick_${KICK_CHANNEL_SLUG}`);

    onSnapshot(
        streamDocRef,
        (docSnapshot) => {
            if (docSnapshot.exists()) {
                const data = docSnapshot.data();
                console.log("[Firestore Status] Datos recibidos:", data);
                updateStreamStatusUI(data.isLive, data.streamTitle);
            } else {
                updateStreamStatusUI(false, null);
                console.log("[Firestore Status] Documento no encontrado. Offline.");
            }
        },
        (error) => {
            console.error("[Firestore Status] Error al escuchar Firestore:", error);
            updateStreamStatusUI(false, "Error al obtener el estado.");
        }
    );
}

function listenForAnnouncements() {
    if (!db || !isAuthReady || !announcementsContainer) return;

    // --- RUTA CORRECTA SEGÚN REGLAS ---
    const announcementsColRef = collection(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        "announcements"
    );

    const q = query(
        announcementsColRef,
        orderBy("timestamp", "desc")
    );

    console.log("[Firestore Announcements] Conectando a artifacts/.../announcements");

    onSnapshot(q, (querySnapshot) => {
        announcementsContainer.innerHTML = '';
        if (querySnapshot.empty) {
            announcementsContainer.innerHTML = '<p class="text-gray-500">No hay novedades recientes.</p>';
            console.log("[Firestore Announcements] Colección vacía.");
        } else {
            console.log(`[Firestore Announcements] ${querySnapshot.docs.length} documentos recibidos.`);
            querySnapshot.docs.forEach(doc => {
                const announcement = doc.data();
                const date = announcement.timestamp?.toDate ? announcement.timestamp.toDate().toLocaleDateString('es-ES') : 'Fecha desconocida';

                const announcementElement = document.createElement('div');
                announcementElement.className = 'p-4 bg-gray-700 rounded-lg shadow-md cursor-pointer hover:bg-gray-600 transition-colors duration-200 ease-in-out';
                announcementElement.innerHTML = `
                    <h4 class="font-bold text-lg text-white">${announcement.title || 'Sin título'}</h4>
                    <p class="text-sm text-kick-green mb-1">${date}</p>
                    <p class="text-gray-400 text-sm line-clamp-2">${announcement.content || 'Sin contenido.'}</p>
                `;

                announcementElement.addEventListener('click', () => {
                    const modal = document.getElementById('announcementModal');
                    const modalImage = document.getElementById('modalImage');
                    const modalTitle = document.getElementById('modalTitle');
                    const modalContent = document.getElementById('modalContent');

                    if (announcement.imageUrl) {
                        modalImage.src = announcement.imageUrl;
                        modalImage.alt = announcement.title || 'Imagen de novedad';
                        modalImage.style.display = 'block';
                    } else {
                        modalImage.style.display = 'none';
                    }
                    modalTitle.textContent = announcement.title || 'Sin título';
                    modalContent.textContent = announcement.content || '';
                    if (modal) modal.style.display = 'flex';
                });

                announcementsContainer.appendChild(announcementElement);
            });
        }
    }, (error) => {
        console.error("[Firestore Announcements] Error al escuchar Firestore:", error);
        announcementsContainer.innerHTML = '<p class="text-red-400">Error al cargar las novedades.</p>';
    });
}

// --- Modal ---
function setupModalEvents() {
    if (closeModalBtn && announcementModal) {
        closeModalBtn.addEventListener('click', () => {
            announcementModal.style.display = 'none';
        });

        window.addEventListener('click', (event) => {
            if (event.target === announcementModal) {
                announcementModal.style.display = 'none';
            }
        });
    }
}

// --- Inicio ---
window.onload = function () {
    initializeFirebase();
    setupModalEvents();
};