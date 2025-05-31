// js/core/AudioManager.js - Gestionnaire audio simple

/**
 * Classe pour la gestion des sons et de la musique
 */
class AudioManager {
    constructor() {
        this.sounds = {};
        this.musicVolume = 0.3;
        this.sfxVolume = 0.5;
        this.enabled = true;
    }

    loadSound(name, url) {
        if (!this.enabled) return;
        try {
            this.sounds[name] = new Audio(url);
        } catch (e) {
            console.warn(`Cannot load audio: ${name}`);
        }
    }

    playSound(name, volume = 1) {
        if (!this.enabled || !this.sounds[name]) return;
        try {
            const audio = this.sounds[name].cloneNode();
            audio.volume = this.sfxVolume * volume;
            audio.play();
        } catch (e) {
            // Silent fail for audio
        }
    }

    setVolume(type, volume) {
        if (type === 'music') this.musicVolume = volume;
        if (type === 'sfx') this.sfxVolume = volume;
    }
}

// Export pour utilisation dans d'autres modules
export { AudioManager };