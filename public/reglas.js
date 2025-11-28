import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getFirestore, doc, getDoc }
    from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- Config Firebase  ---
const firebaseConfig = {
    apiKey: "AIzaSyD7o2Nam_oBXSsT7QRGMudpwRl5Z5DTjpA",
    authDomain: "moaixd.firebaseapp.com",
    projectId: "moaixd",
    storageBucket: "moaixd.firebasestorage.app",
    messagingSenderId: "498764551600",
    appId: "1:498764551600:web:e03e02d06679e0d5007275",
    measurementId: "G-W0LVF5RVDR",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- Elementos ---
const btnReglas = document.getElementById("btnReglas");
const modal = document.getElementById("modalReglas");
const cerrar = document.getElementById("cerrarModal");
const contenidoReglas = document.getElementById("contenidoReglas");

// --- Abrir modal y cargar reglas desde Firestore ---
btnReglas.addEventListener("click", async () => {
    modal.style.display = "flex";
    contenidoReglas.textContent = "Cargando...";

    try {
        const ref = doc(db, "config", "reglas");
        const snap = await getDoc(ref);

        if (snap.exists()) {
            const data = snap.data();
            contenidoReglas.innerHTML = `<img src="reglas.PNG" alt="reglas" style="width: 100%; border-radius: 10px;">`;
        } else {
            contenidoReglas.textContent = "No hay reglas cargadas.";
        }
    } catch (error) {
        console.error(error);
        contenidoReglas.textContent = "Error al cargar las reglas.";
    }
});

// --- Cerrar modal ---
cerrar.addEventListener("click", () => modal.style.display = "none");

// --- Cerrar clickeando afuera ---
window.addEventListener("click", (e) => {
    if (e.target === modal) modal.style.display = "none";
});
