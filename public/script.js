import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
    getAuth,
    signInAnonymously,
    signInWithCustomToken,
    onAuthStateChanged,
    setPersistence,
    browserSessionPersistence,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
    getFirestore,
    doc,
    collection,
    query,
    orderBy,
    onSnapshot,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

let app;
let db;
let auth;
let userId;
let isAuthReady = false;

// Global variables provided by the Canvas environment (or undefined if opened directly)
const appId = "moaixd";
    typeof __app_id !== "undefined" ? __app_id : "default-app-id";
const firebaseConfig =
    typeof __firebase_config !== "undefined"
        ? JSON.parse(__firebase_config)
        : {
            // !!! CLAVE API PÚBLICA REQUERIDA !!!
            // (La clave API es sensible, se usa un placeholder para el entorno fuera de Canvas, pero parece estar correcta en tu ambiente.)
            apiKey: "AIzaSyD7o2Nam_oBXSsT7QRGMudpwRl5Z5DTjpA", 
            authDomain: "moaixd.firebaseapp.com",
            projectId: "moaixd",
            storageBucket: "moaixd.firebasestorage.app",
            messagingSenderId: "498764551600",
            appId: "1:498764551600:web:e03e02d06679e0d5007275"
        };


/**
 * Inicializa Firebase y maneja la autenticación.
 */
async function initializeFirebase() {
    try {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
        
        // Configuramos la persistencia de la sesión a solo durante la sesión del navegador.
        await setPersistence(auth, browserSessionPersistence);
        
        console.log("Firebase initialized.");

        // Esperamos a que el estado de autenticación cambie (inicie sesión).
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                // El usuario ha iniciado sesión.
                userId = user.uid;
                isAuthReady = true;
                console.log(`Firebase initialized and authenticated. User ID: ${userId}`);

                // Una vez autenticado, iniciamos las escuchas de Firestore en tiempo real
                listenForStreamStatus();
                listenForAnnouncements();

            } else {
                // Intenta iniciar sesión con el token custom o anónimamente.
                const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
                
                if (initialAuthToken) {
                    try {
                        await signInWithCustomToken(auth, initialAuthToken);
                    } catch (error) {
                         console.error("Error signing in with custom token, trying anonymous:", error);
                         await signInAnonymously(auth);
                    }
                } else {
                    try {
                        console.log("No user, signing in anonymously...");
                        await signInAnonymously(auth);
                    } catch (error) {
                        console.error("Error signing in anonymously:", error);
                    }
                }
            }
        });

        // Manejador para cerrar el modal de anuncios
        const closeModalBtn = document.getElementById('closeModalBtn');
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => {
                const modal = document.getElementById('announcementModal');
                if (modal) modal.style.display = 'none';
            });
        }
    } catch (error) {
        console.error("Error in initializeFirebase:", error);
    }
}

// -------------------------------------------------------------
// FUNCIONES DE FIREBASE EN TIEMPO REAL (onSnapshot)
// -------------------------------------------------------------

/**
 * Escucha en tiempo real el estado del stream.
 * Colección: /artifacts/{appId}/public/data/stream_status/current_status
 */
function listenForStreamStatus() {
    if (!db || !isAuthReady) return;

    // !!! CORRECCIÓN CRÍTICA DE RUTA !!!
    // Se usa la ruta pública correcta del documento que enviaste.
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'stream_status', 'current_status');
    console.log(`[Firestore Status] Conectando a ${docRef.path} en tiempo real.`);

    onSnapshot(docRef, (docSnapshot) => {
        const statusElement = document.getElementById('streamStatus');
        const platformElement = document.getElementById('platform');
        const streamSection = document.getElementById('stream-live-section');
        // Buscar el elemento para mostrar el mensaje de stream.
        let streamMessageElement = document.getElementById('streamMessage'); 
        
        if (!statusElement || !platformElement || !streamSection) return;

        if (docSnapshot.exists()) {
            const data = docSnapshot.data();
            console.log("[Firestore Status] Datos de stream recibidos:", data);
            
            // Usamos la propiedad 'isOnline'
            if (data.isOnline) { 
                statusElement.textContent = '¡EN VIVO!';
                statusElement.classList.remove('bg-gray-700', 'animate-pulse');
                statusElement.classList.add('bg-green-400', 'text-black', 'shadow-lg', 'shadow-green-500/50');
                
                // --- Lógica para mostrar el mensaje de stream ---
                // Si el elemento no existe, lo creamos para que se muestre el mensaje.
                if (!streamMessageElement) {
                    streamMessageElement = document.createElement('p');
                    streamMessageElement.id = 'streamMessage';
                    // Estilos Tailwind para que se vea bien
                    streamMessageElement.className = 'text-gray-200 text-sm mt-3 p-3 bg-gray-800 rounded-lg border border-green-500/50';
                    // Lo insertamos justo después de la sección del stream
                    streamSection.parentNode.insertBefore(streamMessageElement, streamSection.nextSibling); 
                }
                streamMessageElement.textContent = data.message || 'Stream en vivo, pero sin mensaje.';
                streamMessageElement.style.display = 'block';

                platformElement.textContent = `Plataforma: Kick`; // Ya que la colección es específica de Kick
                platformElement.classList.remove('text-gray-400');
                platformElement.classList.add('text-green-400');
                streamSection.style.display = 'block';

            } else {
                statusElement.textContent = 'DESCONECTADO';
                statusElement.classList.remove('bg-green-400', 'text-black', 'shadow-lg', 'shadow-green-500/50');
                statusElement.classList.add('bg-gray-700', 'animate-pulse', 'text-white');
                
                // Oculta el mensaje del stream si está desconectado
                if (streamMessageElement) {
                    streamMessageElement.style.display = 'none';
                }

                platformElement.textContent = 'Plataforma: Kick';
                platformElement.classList.remove('text-green-400');
                platformElement.classList.add('text-gray-400');
                streamSection.style.display = 'none';
            }
        } else {
            console.warn(`[Firestore Status] El documento 'current_status' no existe en ${docRef.path}.`);
            statusElement.textContent = 'ERROR (No existe)';
            statusElement.classList.remove('bg-green-400', 'animate-pulse');
            statusElement.classList.add('bg-red-600', 'text-white');
            streamSection.style.display = 'none';
             if (streamMessageElement) {
                streamMessageElement.style.display = 'none';
            }
        }
    }, (error) => {
        console.error("[Firestore Status] Error al escuchar el estado del stream:", error);
        const statusElement = document.getElementById('streamStatus');
        if (statusElement) {
            statusElement.textContent = 'ERROR';
            statusElement.classList.remove('bg-green-400', 'animate-pulse');
            statusElement.classList.add('bg-red-600', 'text-white');
        }
    });
}

/**
 * Escucha en tiempo real la colección de anuncios/novedades.
 * Colección: /announcements
 */
function listenForAnnouncements() {
    if (!db || !isAuthReady) return;

    // Ruta de la colección: /announcements
    const announcementsCollectionRef = collection(db, 'announcements');
    // Consulta: ordenado por 'timestamp' descendente
    const q = query(announcementsCollectionRef, orderBy('timestamp', 'desc'));

    console.log("[Firestore Announcements] Conectando a /announcements en tiempo real.");

    onSnapshot(q, (querySnapshot) => {
        // Asegúrate de usar el ID correcto: announcementsContainer
        const announcementsContainer = document.getElementById('announcementsContainer'); 
        if (!announcementsContainer) return;

        announcementsContainer.innerHTML = ''; // Limpiar el contenedor antes de renderizar
        console.log("[Firestore Announcements] Documentos recibidos:", querySnapshot.size);

        if (querySnapshot.empty) {
            announcementsContainer.innerHTML = '<p class="text-gray-400 text-sm col-span-full">No hay novedades o comunicados recientes.</p>';
        } else {
            querySnapshot.forEach((doc) => {
                const announcement = doc.data();
                
                // Crear el elemento de anuncio
                const announcementElement = document.createElement('div');
                announcementElement.className = 'bg-gray-800 p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out cursor-pointer border border-gray-700 hover:border-green-400';

                // Formatear la fecha
                const date = announcement.timestamp ? announcement.timestamp.toDate() : new Date();
                const formattedDate = date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });

                announcementElement.innerHTML = `
                    <div class="flex items-center mb-2">
                        <i class="fas fa-bullhorn text-purple-400 mr-2"></i>
                        <h4 class="text-white font-semibold truncate">${announcement.title || 'Novedad sin título'}</h4>
                    </div>
                    <p class="text-gray-400 text-sm mb-2 line-clamp-2">${announcement.content || ''}</p>
                    <p class="text-purple-400 text-xs mt-2 text-right">${formattedDate}</p>
                `;

                // Añadir lógica para mostrar el modal al hacer clic
                announcementElement.addEventListener('click', () => {
                    const modal = document.getElementById('announcementModal');
                    const modalImage = document.getElementById('modalImage');
                    const modalTitle = document.getElementById('modalTitle');
                    const modalContent = document.getElementById('modalContent');
                    
                    // Asegurar que la imagen sea un placeholder si no hay URL válida
                    const imageUrl = announcement.imageUrl && announcement.imageUrl.startsWith('http') ? announcement.imageUrl : 'https://placehold.co/400x200/2d482e/26ff81?text=SIN+IMAGEN';

                    modalImage.src = imageUrl;
                    modalImage.alt = announcement.title || 'Imagen de Novedad';
                    // Revisa la lógica para mostrar/ocultar la imagen
                    modalImage.style.display = announcement.imageUrl && announcement.imageUrl.startsWith('http') ? 'block' : 'none'; 
                    
                    modalTitle.textContent = announcement.title || 'Sin título';
                    modalContent.textContent = announcement.content || '';
                    
                    if (modal) modal.style.display = 'flex'; // Mostrar el modal
                });

                announcementsContainer.appendChild(announcementElement);
            });
        }
    }, (error) => {
        console.error("Error listening to Firestore (announcements):", error);
        const announcementsContainer = document.getElementById('announcementsContainer');
        if (announcementsContainer) {
            announcementsContainer.innerHTML = '<p class="text-red-400 col-span-full">Error al cargar las novedades. Revisa los permisos de Firestore.</p>';
        }
    });
}

// -------------------------------------------------------------
// INICIO DE LA APLICACIÓN
// -------------------------------------------------------------

// Inicia la aplicación de Firebase cuando la página esté completamente cargada.
window.onload = function () {
    initializeFirebase();
};