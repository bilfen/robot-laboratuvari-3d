/**
 * Robot Laboratuvarı - Konuşan Rehber "Botti"
 * Web Speech API ile Türkçe seslendirme ve ekranda sevimli konuşma balonu
 */

class BottiGuide {
    constructor() {
        this.synth = window.speechSynthesis || null;
        this.voices = [];
        this.trVoice = null;
        this.voiceEnabled = true;
        this.currentBubbleEl = null;
        this.mascotEl = null;
        this.lastSpokenText = '';
        this.initVoices();
    }

    initVoices() {
        if (!this.synth) return;
        const load = () => {
            this.voices = this.synth.getVoices() || [];
            // Türkçe ses bulmaya çalış
            this.trVoice = this.voices.find(v => v.lang.startsWith('tr') || v.lang.includes('TR')) || null;
        };
        load();
        if (this.synth.onvoiceschanged !== undefined) {
            this.synth.onvoiceschanged = load;
        }
    }

    bindElements(bubbleEl, mascotEl) {
        this.currentBubbleEl = bubbleEl;
        this.mascotEl = mascotEl;
    }

    toggleVoice() {
        this.voiceEnabled = !this.voiceEnabled;
        if (!this.voiceEnabled && this.synth) {
            this.synth.cancel();
        }
        return this.voiceEnabled;
    }

    speak(text, onComplete) {
        this.lastSpokenText = text;

        // Görsel balonu hemen güncelle ve zıplama animasyonu ver
        if (this.currentBubbleEl) {
            this.currentBubbleEl.innerHTML = text;
            this.currentBubbleEl.classList.remove('pop-anim');
            void this.currentBubbleEl.offsetWidth; // Reflow tetikle
            this.currentBubbleEl.classList.add('pop-anim');
        }

        if (this.mascotEl) {
            this.mascotEl.classList.add('talking');
            setTimeout(() => {
                if (this.mascotEl) this.mascotEl.classList.remove('talking');
            }, 2500);
        }

        // Sevimli bir robot bip sesi çal
        if (window.KidAudio) {
            window.KidAudio.playRobotBeep(700);
        }

        // Seslendirme aktifse ve Web Speech API destekleniyorsa
        if (this.voiceEnabled && this.synth) {
            try {
                this.synth.cancel(); // Önceki konuşmayı durdur

                // HTML etiketlerini konuşma metninden temizle
                const cleanText = text.replace(/<[^>]*>?/gm, '').replace(/[🤖⭐🎉✨📏🌙🔥📣🏃🔵]/g, '');

                const utterance = new SpeechSynthesisUtterance(cleanText);
                utterance.lang = 'tr-TR';
                if (this.trVoice) {
                    utterance.voice = this.trVoice;
                }
                utterance.pitch = 1.25; // Çocuksu sevimli robot tizliği
                utterance.rate = 1.05;  // Anlaşılır ve canlı hız

                utterance.onend = () => {
                    if (this.mascotEl) this.mascotEl.classList.remove('talking');
                    if (onComplete) onComplete();
                };

                utterance.onerror = () => {
                    if (this.mascotEl) this.mascotEl.classList.remove('talking');
                };

                this.synth.speak(utterance);
            } catch (e) {
                console.warn('Speech synthesis hatası:', e);
            }
        }
    }

    repeatLast() {
        if (this.lastSpokenText) {
            this.speak(this.lastSpokenText);
        }
    }
}

window.Botti = new BottiGuide();
