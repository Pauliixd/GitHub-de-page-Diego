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
    setLogLevel // Importación para debugging
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Habilitar el nivel de log de debug de Firestore para ver conexiones y errores.
setLogLevel('debug');

let app;
let db;
let auth;
let userId;
let isAuthReady = false;

// Global variables provided by the Canvas environment (or undefined if opened directly)
const appId =
    typeof __app_id !== "undefined" ? __app_id : "default-app-id";
const firebaseConfig =
    typeof __firebase_config !== "undefined"
        ? JSON.parse(__firebase_config)
        : {
            apiKey: "AIzaSyD7o2Nam_oBXSsT7QRGMudpwRl5Z5DTjpA",
            authDomain: "moaixd.firebaseapp.com",
            projectId: "moaixd",
            storageBucket: "moaixd.firebasestorage.app",
            messagingSenderId: "498764551600",
            appId: "1:498764551600:web:1e58a74e92a297e28a9b2b"
        };
const initialAuthToken =
    typeof __initial_auth_token !== "undefined" ? __initial_auth_token : null;

// Referencias a elementos del DOM
const streamStatusElement = document.getElementById("streamStatus");
const streamTitleElement = document.getElementById("streamTitle");
const kickLinkElement = document.getElementById("kickLink");
const announcementsContainer = document.getElementById("announcementsContainer");
const closeModalBtn = document.getElementById('closeModalBtn');
const announcementModal = document.getElementById('announcementModal');

// --- Utilidades ---
const KICK_CHANNEL_SLUG = "moaixd"; // O la variable de entorno real si fuera un backend

/**
 * Actualiza el indicador de estado del stream.
 * @param {boolean} isLive - true si está en vivo, false si no.
 * @param {string} title - El título del stream (opcional).
 */
function updateStreamStatusUI(isLive, title) {
    if (!streamStatusElement || !streamTitleElement) return;

    if (isLive) {
        streamStatusElement.className =
            "inline-block px-6 py-2 rounded-full shadow-lg font-bold text-lg transition-all duration-500 ease-in-out bg-kick-green text-black";
        streamStatusElement.innerHTML =
            '<i class="fas fa-circle animate-pulse mr-2 text-red-500"></i> EN VIVO AHORA';
        streamTitleElement.textContent = title
            ? title
            : "¡Conéctate y saluda!";
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

// --- Inicialización y Autenticación de Firebase ---
async function initializeFirebase() {
    try {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);

        // Intenta iniciar sesión con el token personalizado si está disponible
        if (initialAuthToken) {
            await signInWithCustomToken(auth, initialAuthToken);
        } else {
            // Si no hay token, inicia sesión de forma anónima
            await signInAnonymously(auth);
        }

        // Listener para el estado de autenticación
        onAuthStateChanged(auth, (user) => {
            if (user) {
                userId = user.uid;
                isAuthReady = true;
                console.log("Firebase initialized and authenticated. User ID:", userId);
                // Una vez autenticado, comienza a escuchar los datos
                listenForStreamStatus();
                listenForAnnouncements();
            } else {
                isAuthReady = true;
                // Si el usuario se cierra la sesión por alguna razón, podemos intentar anónimamente de nuevo
                console.log("User signed out, retrying anonymous sign-in.");
                signInAnonymously(auth).catch(e => console.error("Error signing in anonymously:", e));
            }
        });

    } catch (e) {
        console.error("Error during Firebase initialization or authentication:", e);
        // Mostrar un estado de error en la UI si la conexión falla
        streamStatusElement.innerHTML = '<i class="fas fa-exclamation-triangle mr-2 text-red-500"></i> Error de conexión';
        streamStatusElement.className = "inline-block px-6 py-2 rounded-full shadow-lg font-bold text-lg transition-all duration-500 ease-in-out bg-red-800 text-white";
    }
}

// --- Listeners de Firestore ---

/**
 * Escucha el documento que contiene el estado del stream de Kick.
 */
function listenForStreamStatus() {
    if (!db || !isAuthReady) return;

    // Ruta para el documento de estado público: /artifacts/{appId}/public/data/stream_status/kick_moaixd
    const streamDocRef = doc(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        "stream_status",
        `kick_${KICK_CHANNEL_SLUG}`
    );
    
    console.log(`[Firestore Status] Intentando conectar con el documento: artifacts/${appId}/public/data/stream_status/kick_${KICK_CHANNEL_SLUG}`);

    // Usa onSnapshot para escuchar cambios en tiempo real
    const unsubscribe = onSnapshot(
        streamDocRef,
        (docSnapshot) => {
            if (docSnapshot.exists()) {
                const data = docSnapshot.data();
                console.log("[Firestore Status] Datos recibidos:", data);
                updateStreamStatusUI(data.isLive, data.streamTitle);
            } else {
                // Si el documento no existe (ej. la primera vez), asume que está offline
                updateStreamStatusUI(false, null);
                console.log("[Firestore Status] Documento no encontrado. Asumiendo offline.");
            }
        },
        (error) => {
            console.error("[Firestore Status] Error al escuchar Firestore:", error);
            updateStreamStatusUI(false, "Error al obtener el estado.");
        }
    );
    // Nota: Guardar 'unsubscribe' permitiría detener la escucha, pero no es necesario para esta app.
}

/**
 * Escucha la colección de anuncios.
 */
function listenForAnnouncements() {
    if (!db || !isAuthReady || !announcementsContainer) return;

    // Ruta para la colección de anuncios públicos: /artifacts/{appId}/public/data/announcements
    const announcementsColRef = collection(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        "announcements"
    );

    // Consulta: obtiene los 5 comunicados más recientes
    const q = query(
        announcementsColRef,
        orderBy("timestamp", "desc")
        // No hay un límite explícito aquí, pero se pueden agregar si la colección es grande
    );
    
    console.log("[Firestore Announcements] Intentando conectar con la colección de anuncios.");

    onSnapshot(q, (querySnapshot) => {
        // Limpiar el contenedor
        announcementsContainer.innerHTML = '';
        if (querySnapshot.empty) {
            announcementsContainer.innerHTML = '<p class="text-gray-500">No hay novedades recientes.</p>';
            console.log("[Firestore Announcements] Colección vacía.");
        } else {
            console.log(`[Firestore Announcements] ${querySnapshot.docs.length} documentos recibidos.`);
            querySnapshot.docs.forEach(doc => {
                const announcement = doc.data();
                // Formato de fecha
                const date = announcement.timestamp?.toDate ? announcement.timestamp.toDate().toLocaleDateString('es-ES') : 'Fecha desconocida';

                // Crear elemento de novedad
                const announcementElement = document.createElement('div');
                announcementElement.className = 'p-4 bg-gray-700 rounded-lg shadow-md cursor-pointer hover:bg-gray-600 transition-colors duration-200 ease-in-out';
                announcementElement.innerHTML = `
                    <h4 class="font-bold text-lg text-white">${announcement.title || 'Sin título'}</h4>
                    <p class="text-sm text-kick-green mb-1">${date}</p>
                    <p class="text-gray-400 text-sm line-clamp-2">${announcement.content || 'Sin contenido.'}</p>
                `;

                // Agregar evento para abrir el modal
                announcementElement.addEventListener('click', () => {
                    const modal = document.getElementById('announcementModal');
                    const modalImage = document.getElementById('modalImage');
                    const modalTitle = document.getElementById('modalTitle');
                    const modalContent = document.getElementById('modalContent');

                    if (announcement.imageUrl) {
                        modalImage.src = announcement.imageUrl;
                        modalImage.alt = announcement.title || 'Imagen de novedad';
                        modalImage.style.display = 'block'; // Asegurarse de que la imagen sea visible
                    } else {
                        modalImage.style.display = 'none'; // Ocultar la imagen si no hay URL
                    }
                    modalTitle.textContent = announcement.title || 'Sin título';
                    modalContent.textContent = announcement.content || '';
                    if (modal) modal.style.display = 'flex'; // Mostrar el modal (usando flex para centrado)
                });

                announcementsContainer.appendChild(announcementElement);
            });
        }
    }, (error) => {
        console.error("[Firestore Announcements] Error al escuchar Firestore:", error);
        if (announcementsContainer) {
            announcementsContainer.innerHTML = '<p class="text-red-400">Error al cargar las novedades.</p>';
        }
    });
}

// --- Lógica del Modal ---
function setupModalEvents() {
    if (closeModalBtn && announcementModal) {
        closeModalBtn.addEventListener('click', () => {
            announcementModal.style.display = 'none';
        });

        // Cerrar al hacer clic fuera del modal
        window.addEventListener('click', (event) => {
            if (event.target === announcementModal) {
                announcementModal.style.display = 'none';
            }
        });
    }
}

// --- Inicio de la Aplicación ---
// Se ejecuta al cargar el script.
window.onload = function () {
    initializeFirebase();
    setupModalEvents();
};