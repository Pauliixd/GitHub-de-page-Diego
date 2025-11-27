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

// ======================= ELEMENTOS DEL DOM =======================
const palabraAhorcado = document.getElementById("palabraAhorcado");
const letrasUsadasEl = document.getElementById("letrasUsadas");
const intentosRestantesEl = document.getElementById("intentosRestantes");
const mensajeFinal = document.getElementById("mensajeFinal");

const inputLetra = document.getElementById("inputLetra");
const btnProbar = document.getElementById("btnProbarLetra");

// ======================= VARIABLES DEL JUEGO =======================
let palabraSecreta = "";
let progreso = [];
let letrasUsadas = [];
let intentos = 7;
let juegoTerminado = false;

// ======================= CARGAR PALABRA =======================
async function cargarPalabra() {
    const snap = await getDoc(refPalabra);

    palabraSecreta = snap.exists()
        ? snap.data().palabra.toLowerCase().trim()
        : "moaixd";

    progreso = palabraSecreta.split("").map(() => "_");

    render();
}

// ======================= RENDER =======================
function render() {
    palabraAhorcado.textContent = progreso.join(" ");
    letrasUsadasEl.textContent = letrasUsadas.join(", ");
    intentosRestantesEl.textContent = intentos;

    if (progreso.join("") === palabraSecreta) {
        finalizarJuego("🎉 ¡GANASTE!");
    }

    if (intentos <= 0) {
        finalizarJuego(`💀 Perdiste! malo culeado`);
    }
}

function finalizarJuego(mensaje) {
    juegoTerminado = true;
    mensajeFinal.textContent = mensaje;
    inputLetra.disabled = true;
    btnProbar.disabled = true;
}

// ======================= PROBAR LETRA =======================
function procesarLetra(letra) {
    if (juegoTerminado) return;

    if (!/^[a-zñ]$/.test(letra)) return;
    if (letrasUsadas.includes(letra)) return;

    letrasUsadas.push(letra);

    if (palabraSecreta.includes(letra)) {
        palabraSecreta.split("").forEach((l, i) => {
            if (l === letra) progreso[i] = letra;
        });
    } else {
        if (intentos > 0) intentos--;
    }

    render();
}

btnProbar.addEventListener("click", () => {
    const letra = inputLetra.value.toLowerCase();

    procesarLetra(letra);

    inputLetra.value = "";
    inputLetra.focus();
});

// ======================= EFECTO 3D =======================
const card = document.getElementById("ahorcadoSection");

card.addEventListener("mousemove", (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const rotateX = ((y - rect.height / 2) / rect.height) * 15;
    const rotateY = ((x - rect.width / 2) / rect.width) * -15;

    card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
});

card.addEventListener("mouseleave", () => {
    card.style.transform = "rotateX(0) rotateY(0)";
});

// ======================= INICIAR =======================
cargarPalabra();
