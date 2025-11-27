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
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

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
            appId: "1:498764551600:web:e03e02d06679e0d5007275",
            measurementId: "G-W0LVF5RVDR",
        };
const initialAuthToken =
    typeof __initial_auth_token !== "undefined"
        ? __initial_auth_token
        : null;

// Crea el elemento toast una sola vez al cargar el script
const toast = document.createElement("div");
toast.className = "toast";
toast.id = "toastOnline"; // Opcional, si quieres un ID específico
toast.innerText = "¡Moaixd está en vivo ahora!";


document.addEventListener("DOMContentLoaded", async () => {
    // Añade el toast al cuerpo del documento cuando el DOM esté listo
    document.body.appendChild(toast);

    // Obtener referencias a los elementos DOM
    const statusText = document.getElementById("statusText");
    const statusIndicator = document.getElementById("statusIndicator");
    const loadingSpinner = document.getElementById("loadingSpinner");
    const messageInput = document.getElementById("messageInput");
    const goLiveButtonContainer = document.getElementById("goLiveButtonContainer"); // Referencia al contenedor del botón

    // Referencias a los elementos del modal
    const modal = document.getElementById('announcementModal');
    const modalImage = document.getElementById('modalImage');
    const modalTitle = document.getElementById('modalTitle');
    const modalContent = document.getElementById('modalContent');
    const closeModalBtn = document.getElementById('closeModalBtn');

    // Event listener para cerrar el modal
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            if (modal) modal.style.display = 'none';
        });
    }
    // Cerrar modal al hacer clic fuera del contenido
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) { // Si el clic es directamente en el overlay del modal
                modal.style.display = 'none';
            }
        });
    }


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
                console.log(
                    "Firebase initialized and authenticated. User ID:",
                    userId
                );
                setupFirestoreListeners(); // Llama a la función que configura TODOS los listeners
            } else {
                console.log("No user is signed in.");
                isAuthReady = true;
                setupFirestoreListeners(); // Llama a la función que configura TODOS los listeners
            }
        });
    } catch (error) {
        console.error("Error initializing Firebase:", error);
        if (statusText) statusText.textContent = "Error de conexión";
        if (statusIndicator) {
            statusIndicator.classList.remove("online", "offline");
            statusIndicator.style.backgroundColor = "gray";
            statusIndicator.style.display = "inline-block"; // Mostrar indicador en caso de error
        }
        if (loadingSpinner) loadingSpinner.style.display = "none";
        if (goLiveButtonContainer) goLiveButtonContainer.style.display = "none"; // Asegurarse de que el botón esté oculto en caso de error
    }

    // Añadir event listener para messageInput aquí
    if (messageInput) {
        messageInput.addEventListener("input", () => {
            // This input doesn't directly update the displayed message.
            // It would require an API call to your backend to update Firestore.
        });
    }
});

// Función central para configurar todos los listeners de Firestore
function setupFirestoreListeners() {
    if (!isAuthReady || !db) {
        console.warn("Firestore not ready or DB not initialized.");
        return;
    }

    // --- Listener para el Estado del Stream ---
    const streamStatusDocRef = doc(
        db,
        `artifacts/${appId}/public/data/stream_status`,
        "current_status"
    );

    onSnapshot(
        streamStatusDocRef,
        (docSnapshot) => {
            const statusIndicator = document.getElementById("statusIndicator");
            const statusText = document.getElementById("statusText");
            const displayMessage = document.getElementById("displayMessage");
            const loadingSpinner = document.getElementById("loadingSpinner");
            const avatar = document.querySelector('img[alt="Avatar de Moaixd"]');
            const goLiveButtonContainer = document.getElementById("goLiveButtonContainer");
            const goLiveButton = document.getElementById("goLiveButton");


            if (loadingSpinner) loadingSpinner.style.display = "none";

            if (statusIndicator) statusIndicator.style.display = "inline-block";


            if (docSnapshot.exists()) {
                const data = docSnapshot.data();
                const isOnline = data.isOnline;
                const message = data.message || "";

                if (isOnline) {
                    if (statusIndicator) {
                        statusIndicator.classList.remove("offline");
                        statusIndicator.classList.add("online");
                    }
                    if (statusText) {
                        statusText.textContent = "Online";
                        statusText.classList.remove("text-offline");
                        statusText.classList.add("text-online");
                    }
                    if (displayMessage) {
                        displayMessage.textContent = message;
                        displayMessage.style.display = "block";
                    }

                    if (avatar) {
                        avatar.classList.remove("avatar-glow-offline");
                        avatar.classList.add("avatar-glow-online");
                    }

                    if (statusText) {
                        statusText.classList.remove("glow-text-offline");
                        statusText.classList.add("glow-text-online");
                    }

                    if (goLiveButtonContainer) goLiveButtonContainer.style.display = "block";
                    if (goLiveButton) goLiveButton.classList.add("go-live-button");


                    if (toast) {
                        toast.style.display = "block";
                        setTimeout(() => toast.classList.add("show"), 10);
                    }
                } else {
                    if (statusIndicator) {
                        statusIndicator.classList.remove("online");
                        statusIndicator.classList.add("offline");
                    }
                    if (statusText) {
                        statusText.textContent = "Offline";
                        statusText.classList.remove("text-online");
                        statusText.classList.add("text-offline");
                    }
                    if (displayMessage) {
                        displayMessage.textContent = "";
                        displayMessage.style.display = "none";
                    }

                    if (avatar) {
                        avatar.classList.remove("avatar-glow-online");
                        avatar.classList.add("avatar-glow-offline");
                    }

                    if (statusText) {
                        statusText.classList.remove("glow-text-online");
                        statusText.classList.add("glow-text-offline");
                    }

                    if (goLiveButtonContainer) goLiveButtonContainer.style.display = "none";
                    if (goLiveButton) goLiveButton.classList.remove("go-live-button");


                    if (toast) {
                        toast.classList.remove("show");
                        setTimeout(() => {
                            toast.style.display = "none";
                        }, 500);
                    }
                }

            } else {
                console.log(
                    "No stream status data found in Firestore. Defaulting to offline."
                );
                if (statusIndicator) {
                    statusIndicator.classList.remove("online");
                    statusIndicator.classList.add("offline");
                }
                if (statusText) {
                    statusText.textContent = "Offline";
                    statusText.classList.remove("text-online");
                    statusText.classList.add("text-offline");
                }
                if (displayMessage) {
                    displayMessage.textContent = "Esperando estado del stream...";
                    displayMessage.style.display = "block";
                }

                if (avatar) avatar.classList.remove("avatar-glow-online", "avatar-glow-offline");
                if (statusText) statusText.classList.remove("glow-text-online", "glow-text-offline");
                if (goLiveButtonContainer) goLiveButtonContainer.style.display = "none";
                if (goLiveButton) goLiveButton.classList.remove("go-live-button");
                if (toast) {
                    toast.classList.remove("show");
                    toast.style.display = "none";
                }
            }
        },
        (error) => {
            console.error("Error listening to Firestore (stream status):", error);
            const statusText = document.getElementById("statusText");
            const statusIndicator = document.getElementById("statusIndicator");
            const loadingSpinner = document.getElementById("loadingSpinner");
            const avatar = document.querySelector('img[alt="Avatar de Moaixd"]');
            const goLiveButtonContainer = document.getElementById("goLiveButtonContainer");
            const goLiveButton = document.getElementById("goLiveButton");

            if (statusText) statusText.textContent = "Error de conexión";
            if (statusIndicator) {
                statusIndicator.classList.remove("online", "offline");
                statusIndicator.style.backgroundColor = "gray";
                statusIndicator.style.display = "inline-block";
            }
            if (loadingSpinner) loadingSpinner.style.display = "none";
            if (goLiveButtonContainer) goLiveButtonContainer.style.display = "none";
            if (goLiveButton) goLiveButton.classList.remove("go-live-button");


            if (avatar) avatar.classList.remove("avatar-glow-online", "avatar-glow-offline");
            if (statusText) statusText.classList.remove("glow-text-online", "glow-text-offline");
            if (toast) {
                toast.classList.remove("show");
                toast.style.display = "none";
            }
        }
    );

    // --- Listener para Comunidados y Novedades ---
    const announcementsContainer = document.getElementById("announcementsContainer");
    const announcementsCollectionRef = collection(db, `artifacts/${appId}/public/data/announcements`);
    // Ordenar por timestamp en orden descendente para que las novedades más recientes aparezcan primero
    const q = query(announcementsCollectionRef, orderBy("timestamp", "desc"));

    onSnapshot(q, (querySnapshot) => {
        if (announcementsContainer) {
            announcementsContainer.innerHTML = ''; // Limpia los comunicados existentes

            if (querySnapshot.empty) {
                announcementsContainer.innerHTML = '<p class="text-gray-400">No hay novedades por el momento.</p>';
                return;
            }

            querySnapshot.forEach((doc) => {
                const announcement = doc.data();
                const announcementElement = document.createElement('div');
                announcementElement.className = 'bg-gray-700 bg-opacity-30 p-4 rounded-lg shadow-inner cursor-pointer'; // Añadido cursor-pointer
                
                // Añadir un data-attribute para almacenar el ID del documento si es necesario
                announcementElement.dataset.docId = doc.id; 
                
                const titleElement = document.createElement('h3');
                titleElement.className = 'text-lg font-semibold text-white mb-1';
                titleElement.textContent = announcement.title || 'Sin título';

                const contentElement = document.createElement('p');
                contentElement.className = 'text-gray-300 text-sm';
                contentElement.textContent = announcement.content || '';

                const dateElement = document.createElement('p');
                dateElement.className = 'text-gray-500 text-xs mt-2';
                // Formatear la fecha si existe un timestamp
                if (announcement.timestamp && announcement.timestamp.toDate) {
                    const date = announcement.timestamp.toDate();
                    dateElement.textContent = `Publicado el ${date.toLocaleDateString()} a las ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                } else {
                    dateElement.textContent = 'Fecha desconocida';
                }

                announcementElement.appendChild(titleElement);
                announcementElement.appendChild(contentElement);
                
                // NUEVO: Añadir la imagen si existe
                if (announcement.imageUrl) {
                    const imageElement = document.createElement('img');
                    imageElement.src = announcement.imageUrl;
                    imageElement.alt = announcement.title || 'Imagen de novedad';
                    // Clases Tailwind para hacer la imagen responsiva y con estilo
                    imageElement.className = 'w-full h-auto rounded-lg mt-4 mb-2 object-cover'; 
                    announcementElement.appendChild(imageElement);
                }

                announcementElement.appendChild(dateElement);

                // ➤ Event listener para abrir el modal al hacer clic en el comunicado
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
        console.error("Error listening to Firestore (announcements):", error);
        if (announcementsContainer) {
            announcementsContainer.innerHTML = '<p class="text-red-400">Error al cargar las novedades.</p>';
        }
    });
}
