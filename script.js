// FUNGSI GLOBAL: Simpan API Key (Dijamin merespons di Acode / Webview HP)
function simpanApiKey() {
    const apiKeyInput = document.getElementById("apiKey");
    const modelSelect = document.getElementById("modelSelect");
    const apiStatus = document.getElementById("apiStatus");
    
    const key = apiKeyInput.value.trim();
    if (!key) {
        alert("❌ Masukkan API Key terlebih dahulu!");
        return;
    }

    try {
        localStorage.setItem("geminiApiKey", key);
        localStorage.setItem("geminiSelectedModel", modelSelect.value);
        apiStatus.textContent = "✓ Disimpan";
        alert("✅ API Key berhasil disimpan ke perangkat!");
    } catch (error) {
        alert("❌ Gagal menyimpan: " + error.message);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const apiKeyInput = document.getElementById("apiKey");
    const modelSelect = document.getElementById("modelSelect");
    const apiStatus = document.getElementById("apiStatus");
    const ideInput = document.getElementById("ideInput");
    const generateBtn = document.getElementById("generateBtn");
    const outputArea = document.getElementById("outputArea");
    const copyBtn = document.getElementById("copyBtn");
    const downloadBtn = document.getElementById("downloadBtn");

    const ttsInput = document.getElementById("ttsInput");
    const suaraTts = document.getElementById("suaraTts");
    const temperatureRange = document.getElementById("temperatureRange");
    const instruksiTts = document.getElementById("instruksiTts");
    const generateTtsBtn = document.getElementById("generateTtsBtn");
    const audioContainer = document.getElementById("audioContainer");
    const audioPlayer = document.getElementById("audioPlayer");
    const downloadAudioBtn = document.getElementById("downloadAudioBtn");

    // Load data tersimpan saat halaman dibuka
    try {
        if (localStorage.getItem("geminiApiKey")) {
            apiKeyInput.value = localStorage.getItem("geminiApiKey");
            apiStatus.textContent = "✓ Key Aktif";
        }
        if (localStorage.getItem("geminiSelectedModel")) {
            modelSelect.value = localStorage.getItem("geminiSelectedModel");
        }
        if (localStorage.getItem("secarikKertas_backup")) {
            outputArea.value = localStorage.getItem("secarikKertas_backup");
        }
    } catch (e) {}

    // 3. LOGIKA GENERATE TEKS 5-IN-1
    generateBtn.addEventListener("click", async () => {
        const apiKey = localStorage.getItem("geminiApiKey") || apiKeyInput.value.trim();
        const selectedModel = modelSelect.value;
        const ide = ideInput.value.trim();

        if (!apiKey) {
            alert("API Key belum disimpan atau kosong!");
            return;
        }
        if (!ide) {
            alert("Ide konten masih kosong!");
            return;
        }

        generateBtn.innerHTML = `<i class='fa-solid fa-spinner fa-spin'></i> Memproses dengan ${selectedModel}...`;
        generateBtn.disabled = true;
        outputArea.value = "Menghubungkan ke server AI... (Tunggu sebentar)";

        const promptSystem = `Kamu adalah produser konten kreatif. Buatkan paket konten video pendek (reels/shorts) bergaya quote emosional berdasarkan ide: "${ide}".

Berikan hasil HANYA dalam format berikut tanpa basa-basi:

[1. TEKS VISUAL]
(Tulis 1-2 kalimat puitis/punchy yang akan diletakkan di tengah video)

[2. SKRIP NARASI (VOICEOVER)]
(Tulis naskah untuk diucapkan tanpa menyertakan tanda kurung jeda/instruksi agar bisa langsung dibaca oleh sistem TTS)

[3. ARAHAN VISUAL (B-ROLL)]
(Deskripsikan video latar belakang yang cocok, misal: Suasana hujan dari dalam mobil, tone gelap, dll)

[4. CAPTION DISTRIBUSI]
(Tulis caption memancing interaksi, akhiri dengan hashtag)

[5. YOUTUBE METADATA]
Judul: (Judul penasaran)
Deskripsi: (1 paragraf deskripsi yang mengandung kata kunci SEO)`;

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents: [{ parts: [{ text: promptSystem }] }] })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error?.message || "Kesalahan tidak dikenal.");
            if (!data.candidates || data.candidates.length === 0) throw new Error("Tidak ada hasil.");

            const hasil = data.candidates[0].content.parts[0].text;
            outputArea.value = hasil;
            
            try {
                localStorage.setItem("secarikKertas_backup", hasil);
            } catch (e) {}

        } catch (error) {
            outputArea.value = `❌ GAGAL MEMPROSES:\n\n${error.message}`;
        } finally {
            generateBtn.innerHTML = "<i class='fa-solid fa-bolt'></i> Generate 5-in-1 Output";
            generateBtn.disabled = false;
        }
    });

    // 4. LOGIKA GENERATE TTS AUDIO
    generateTtsBtn.addEventListener("click", async () => {
        const apiKey = localStorage.getItem("geminiApiKey") || apiKeyInput.value.trim();
        const teks = ttsInput.value.trim();
        const selectedVoice = suaraTts.value;
        const temperatureVal = parseFloat(temperatureRange.value);
        const instruksi = instruksiTts.value.trim();

        if (!apiKey) {
            alert("API Key belum disimpan!");
            return;
        }
        if (!teks) {
            alert("Paste dulu skrip narasinya ke kotak teks TTS!");
            return;
        }

        generateTtsBtn.innerHTML = `<i class='fa-solid fa-spinner fa-spin'></i> Merender Suara (${selectedVoice})...`;
        generateTtsBtn.disabled = true;

        const finalPromptText = instruksi ? `[Instruksi: ${instruksi}] \n\n ${teks}` : teks;

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash-tts:generateContent?key=${apiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    contents: [{ 
                        parts: [{ text: finalPromptText }] 
                    }],
                    generationConfig: {
                        temperature: temperatureVal,
                        speechConfig: {
                            voiceConfig: {
                                prebuiltVoiceConfig: {
                                    voiceName: selectedVoice
                                }
                            }
                        }
                    }
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error?.message || "Gagal menghubungi server TTS.");

            const part = data.candidates[0].content.parts[0];
            if (part && part.inlineData) {
                const audioBase64 = part.inlineData.data;
                const mimeType = part.inlineData.mimeType || "audio/wav";
                const audioUrl = `data:${mimeType};base64,${audioBase64}`;
                
                audioPlayer.src = audioUrl;
                downloadAudioBtn.href = audioUrl;
                downloadAudioBtn.download = `Voiceover_${selectedVoice}_${new Date().getTime()}.wav`;
                
                audioContainer.style.display = "block";
            } else {
                throw new Error("API tidak mengembalikan data audio yang valid.");
            }

        } catch (error) {
            alert("❌ GAGAL MEMBUAT SUARA: " + error.message);
        } finally {
            generateTtsBtn.innerHTML = "<i class='fa-solid fa-play'></i> Generate Voice (3.8 Flash TTS)";
            generateTtsBtn.disabled = false;
        }
    });

    // Fitur Salin & Download Teks
    copyBtn.addEventListener("click", async () => {
        if (!outputArea.value || outputArea.value.startsWith("❌")) return;
        try { await navigator.clipboard.writeText(outputArea.value); alert("Teks disalin!"); } 
        catch (err) { alert("Browser tidak mendukung salin otomatis."); }
    });

    downloadBtn.addEventListener("click", () => {
        if (!outputArea.value || outputArea.value.startsWith("❌")) return;
        const blob = new Blob([outputArea.value], { type: "text/plain" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `SecarikKertas_${new Date().getTime()}.txt`;
        a.click();
    });
});
            
