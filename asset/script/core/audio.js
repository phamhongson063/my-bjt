const TTS_RATE_KEY = "bjt-tts-rate";
const TTS_VOICE_KEY = "bjt-tts-voice-name";

let ttsRate = 0.95;
let selectedVoice = null;
let availableVoices = [];
const ttsSupported = "speechSynthesis" in window;

const savedRateStr = localStorage.getItem(TTS_RATE_KEY);
if (savedRateStr !== null) {
  const parsed = parseFloat(savedRateStr);
  if (!isNaN(parsed)) ttsRate = parsed;
}
const savedVoiceName = localStorage.getItem(TTS_VOICE_KEY);

function loadVoices() {
  if (!ttsSupported) return;
  const all = speechSynthesis.getVoices();
  availableVoices = all.filter((v) => v.lang.startsWith("ja"));
  const select = document.getElementById("ttsVoice");
  const status = document.getElementById("ttsStatus");
  if (availableVoices.length === 0) {
    select.innerHTML = "<option>Không có giọng JP</option>";
    status.textContent = "⚠️ Trình duyệt/OS không có giọng tiếng Nhật.";
    status.classList.add("no-tts");
    return;
  }
  select.innerHTML = availableVoices
    .map((v, i) => `<option value="${i}">${v.name} (${v.lang})</option>`)
    .join("");
  let initialIdx = 0;
  if (savedVoiceName) {
    const foundIdx = availableVoices.findIndex(
      (v) => v.name === savedVoiceName
    );
    if (foundIdx >= 0) initialIdx = foundIdx;
  }
  selectedVoice = availableVoices[initialIdx];
  select.value = String(initialIdx);
  status.textContent = "";
}

export function speak(text) {
  if (!ttsSupported || !text) return;
  speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "ja-JP";
  utter.rate = ttsRate;
  if (selectedVoice) utter.voice = selectedVoice;
  speechSynthesis.speak(utter);
}

let segmentAudio = null;
export function playSegment(src, start, end) {
  if (segmentAudio) {
    segmentAudio.pause();
    segmentAudio = null;
  }
  const a = new Audio(src);
  a.currentTime = start;
  const onTick = () => {
    if (a.currentTime >= end) {
      a.pause();
      a.removeEventListener("timeupdate", onTick);
    }
  };
  a.addEventListener("timeupdate", onTick);
  a.play();
  segmentAudio = a;
}

export function initAudio() {
  if (ttsSupported) {
    speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices();
    const rateSelect = document.getElementById("ttsRate");
    if (savedRateStr !== null) {
      rateSelect.value = savedRateStr;
      if (rateSelect.value === "") {
        rateSelect.value = "0.95";
        ttsRate = 0.95;
      }
    }
    rateSelect.addEventListener("change", (e) => {
      ttsRate = parseFloat(e.target.value);
      localStorage.setItem(TTS_RATE_KEY, e.target.value);
    });
    document.getElementById("ttsVoice").addEventListener("change", (e) => {
      const idx = parseInt(e.target.value);
      if (!isNaN(idx) && availableVoices[idx]) {
        selectedVoice = availableVoices[idx];
        localStorage.setItem(TTS_VOICE_KEY, selectedVoice.name);
      }
    });
    document
      .getElementById("stopAudioBtn")
      .addEventListener("click", () => speechSynthesis.cancel());
  } else {
    const settingsBar = document.getElementById("settingsBar");
    settingsBar
      .querySelectorAll(
        "label:not(:first-of-type), #stopAudioBtn, .group-label:nth-of-type(2)"
      )
      .forEach((el) => (el.style.display = "none"));
  }

  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".speak-btn");
    if (btn && btn.dataset.text) {
      speak(btn.dataset.text);
    }
  });
}
