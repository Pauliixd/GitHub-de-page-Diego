// ======================= INICIALIZAR FIREBASE =======================
import { 
    getFirestore, 
    doc, 
    getDoc
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";

const firebaseConfig = {
    apiKey: "AIzaSyD7o2Nam_oBXSsT7QRGMudpwRl5Z5DTjpA",
    authDomain: "moaixd.firebaseapp.com",
    projectId: "moaixd",
    storageBucket: "moaixd.firebasestorage.app",
    messagingSenderId: "498764551600",
    appId: "1:498764551600:web:e03e02d06679e0d5007275",
    measurementId: "G-W0LVF5RVDR",
};

initializeApp(firebaseConfig);

const db = getFirestore();
const refPalabra = doc(db, "juegos", "ahorcado");

// Elementos del DOM
const palabraAhorcado = document.getElementById("palabraAhorcado");
const letrasUsadasEl = document.getElementById("letrasUsadas");
const intentosRestantesEl = document.getElementById("intentosRestantes");
const mensajeFinal = document.getElementById("mensajeFinal");

const inputLetra = document.getElementById("inputLetra");
const btnProbar = document.getElementById("btnProbarLetra");

// Variables del juego
let palabraSecreta = "";
let progreso = [];
let letrasUsadas = [];
let intentos = 7;

// ---------- Cargar palabra desde Firestore ----------
async function cargarPalabra() {
    const snap = await getDoc(refPalabra);

    if (snap.exists()) {
        palabraSecreta = snap.data().palabra.toLowerCase().trim();
    } else {
        palabraSecreta = "moaixd"; // fallback por si falta en Firestore
    }

    progreso = palabraSecreta.split("").map(() => "_");
    renderJuego();
}
cargarPalabra();

// ---------- Mostrar el estado del juego ----------
function renderJuego() {
    palabraAhorcado.textContent = progreso.join(" ");
    letrasUsadasEl.textContent = letrasUsadas.join(", ");
    intentosRestantesEl.textContent = intentos;

    if (progreso.join("") === palabraSecreta) {
        mensajeFinal.textContent = "🎉 ¡GANASTE!";
    }

    if (intentos <= 0) {
        mensajeFinal.textContent = "💀 Perdiste! La palabra era: " + palabraSecreta;
    }
}

// ---------- Probar letra ----------
btnProbar.addEventListener("click", () => {
    const letra = inputLetra.value.toLowerCase();

    if (!letra.match(/[a-zñ]/) || letra.length !== 1) return;

    if (letrasUsadas.includes(letra)) return;

    letrasUsadas.push(letra);

    if (palabraSecreta.includes(letra)) {
        palabraSecreta.split("").forEach((l, i) => {
            if (l === letra) progreso[i] = letra;
        });
    } else {
        intentos--;
    }

    inputLetra.value = "";
    renderJuego();
});
