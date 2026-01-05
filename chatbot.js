const chatWindow = document.getElementById("chat-window");
const form = document.getElementById("qa-form");
const questionInput = document.getElementById("question");
const nameInput = document.getElementById("name");

const doctorDot = document.getElementById("doctor-dot");
const doctorText = document.getElementById("doctor-text");
const connectBtn = document.getElementById("connect-btn");

/* ===== STATUS DOKTER ===== */
let doctorOnline = false;

connectBtn.addEventListener("click", () => {
  doctorOnline = !doctorOnline;

  if (doctorOnline) {
    doctorDot.classList.remove("offline");
    doctorDot.classList.add("online");
    doctorText.textContent = "Dokter tersedia (respon otomatis)";
    addMessage("bot", "Halo 👋 Saya asisten medis. Silakan ajukan pertanyaan Anda.");
  } else {
    doctorDot.classList.remove("online");
    doctorDot.classList.add("offline");
    doctorText.textContent = "Dokter sedang offline";
    addMessage("bot", "Mohon maaf, dokter sedang offline. Anda tetap bisa membaca panduan SADARI.");
  }
});

/* ===== FORM SUBMIT ===== */
form.addEventListener("submit", function (e) {
  e.preventDefault();

  const question = questionInput.value.trim();
  if (!question) return;

  addMessage("user", question);
  questionInput.value = "";

  setTimeout(() => {
    addMessage("bot", generateAnswer(question));
  }, 800);
});

/* ===== TAMBAH PESAN ===== */
function addMessage(sender, text) {
  const msg = document.createElement("div");
  msg.className = `message ${sender}`;
  msg.innerHTML = text;

  chatWindow.appendChild(msg);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

/* ===== LOGIKA JAWABAN ===== */
function generateAnswer(question) {
  const q = question.toLowerCase();

  if (q.includes("benjolan")) {
    return "Benjolan di payudara **tidak selalu berbahaya**, namun perlu diperiksa. Jika benjolan terasa keras, tidak nyeri, dan tidak bergerak, segera konsultasikan ke tenaga medis.";
  }

  if (q.includes("sakit") || q.includes("nyeri")) {
    return "Nyeri payudara bisa disebabkan oleh hormon, menjelang menstruasi, atau infeksi. Jika nyeri berlangsung lama atau disertai perubahan bentuk, sebaiknya periksa ke dokter.";
  }

  if (q.includes("sadari")) {
    return "SADARI adalah pemeriksaan payudara sendiri yang dilakukan **1 kali sebulan**, 7–10 hari setelah haid. Tujuannya untuk mengenali perubahan sejak dini.";
  }

  if (q.includes("kanker")) {
    return "Kanker payudara yang terdeteksi dini memiliki **peluang sembuh lebih tinggi**. Pemeriksaan rutin dan SADARI sangat dianjurkan.";
  }

  return "Terima kasih atas pertanyaannya 🙏 Untuk keluhan spesifik, sebaiknya Anda berkonsultasi langsung dengan dokter atau fasilitas kesehatan terdekat.";
}
