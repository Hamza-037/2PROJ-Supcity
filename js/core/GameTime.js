// js/core/GameTime.js - Système de gestion du temps de jeu

// Import des dépendances
import { eventSystem, GameEvents } from './EventSystem.js';

/**
 * Gestionnaire du temps de jeu avec support de pause et vitesses variables
 */
class GameTime {
    constructor() {
        // État du temps
        this.currentTime = 0;        // Temps de jeu en millisecondes
        this.realTime = 0;           // Temps réel écoulé
        this.deltaTime = 0;          // Delta entre les frames
        this.lastFrameTime = 0;      // Temps de la dernière frame
        
        // Contrôles de vitesse
        this.speed = 1;              // Multiplicateur de vitesse (1 = normal)
        this.isPaused = false;       // État de pause
        this.maxSpeed = 8;           // Vitesse maximale
        this.speedLevels = [0, 1, 2, 4, 8]; // Niveaux de vitesse disponibles
        
        // Performance et statistiques
        this.fps = 0;                // FPS actuels
        this.frameCount = 0;         // Compteur de frames
        this.fpsUpdateTime = 0;      // Temps de la dernière mise à jour FPS
        this.averageDeltaTime = 16.67; // Delta moyen en ms (60 FPS)
        
        // Système de ticks pour la logique de jeu
        this.tickRate = 60;          // 60 ticks par seconde
        this.tickInterval = 1000 / this.tickRate;
        this.lastTickTime = 0;
        this.tickAccumulator = 0;
        
        // Callbacks et événements
        this.updateCallbacks = [];
        this.tickCallbacks = [];
        
        // Métriques de performance
        this.performanceMetrics = {
            lowFpsThreshold: 30,
            highDeltaThreshold: 50,
            warningCount: 0,
            lastWarningTime: 0
        };
        
        this.setupEventListeners();
        this.start();
    }

    /**
     * Configure les écouteurs d'événements
     */
    setupEventListeners() {
        eventSystem.on(GameEvents.GAME_PAUSE, () => this.pause());
        eventSystem.on(GameEvents.GAME_RESUME, () => this.resume());
        eventSystem.on(GameEvents.GAME_SPEED_CHANGE, (event) => {
            this.setSpeed(event.data.speed);
        });
    }

    /**
     * Démarre la boucle de temps
     */
    start() {
        this.lastFrameTime = performance.now();
        this.fpsUpdateTime = this.lastFrameTime;
        this.lastTickTime = this.lastFrameTime;
        this.requestNextFrame();
    }

    /**
     * Demande la prochaine frame
     */
    requestNextFrame() {
        requestAnimationFrame((timestamp) => this.update(timestamp));
    }

    /**
     * Met à jour le temps de jeu
     * @param {number} timestamp - Timestamp de la frame actuelle
     */
    update(timestamp) {
        // Calculer les deltas
        const realDelta = timestamp - this.lastFrameTime;
        this.lastFrameTime = timestamp;
        
        // Mettre à jour les métriques
        this.updatePerformanceMetrics(realDelta);
        
        if (!this.isPaused) {
            // Calculer le delta de jeu avec la vitesse
            this.deltaTime = realDelta * this.speed;
            this.currentTime += this.deltaTime;
            
            // Système de ticks à fréquence fixe
            this.tickAccumulator += realDelta;
            
            while (this.tickAccumulator >= this.tickInterval) {
                this.processTick();
                this.tickAccumulator -= this.tickInterval;
            }
        }
        
        // Appeler les callbacks de mise à jour MÊME en pause
        // pour permettre au jeu de continuer à rendre l'interface
        // Si le jeu est en pause, on passe 0 comme deltaTime pour éviter les animations
        const updateDelta = this.isPaused ? 0 : this.deltaTime;
        this.processUpdateCallbacks(updateDelta);
        
        this.realTime += realDelta;
        this.frameCount++;
        
        // Calculer les FPS
        this.updateFPS(timestamp);
        
        // Programmer la prochaine frame
        this.requestNextFrame();
    }

    /**
     * Traite un tick de jeu (logique à fréquence fixe)
     */
    processTick() {
        const tickDelta = this.tickInterval * this.speed;
        
        // Appeler tous les callbacks de tick
        this.tickCallbacks.forEach(callback => {
            try {
                callback(tickDelta);
            } catch (error) {
                console.error('Erreur dans callback de tick:', error);
            }
        });
    }

    /**
     * Traite les callbacks de mise à jour (pour le rendu et l'interface)
     * @param {number} deltaTime - Delta time en millisecondes
     */
    processUpdateCallbacks(deltaTime) {
        this.updateCallbacks.forEach(callback => {
            try {
                callback(deltaTime);
            } catch (error) {
                console.error('Erreur dans callback de mise à jour:', error);
            }
        });
    }

    /**
     * Met à jour les métriques de performance
     * @param {number} realDelta - Delta time réel
     */
    updatePerformanceMetrics(realDelta) {
        // Calculer la moyenne mobile du delta time
        this.averageDeltaTime = this.averageDeltaTime * 0.9 + realDelta * 0.1;
        
        // Détecter les problèmes de performance
        const currentFps = 1000 / realDelta;
        
        if (currentFps < this.performanceMetrics.lowFpsThreshold && 
            Date.now() - this.performanceMetrics.lastWarningTime > 5000) {
            
            this.performanceMetrics.warningCount++;
            this.performanceMetrics.lastWarningTime = Date.now();
            
            eventSystem.emit(GameEvents.PERFORMANCE_LOW_FPS, {
                fps: Math.round(currentFps),
                averageDelta: Math.round(this.averageDeltaTime),
                warningCount: this.performanceMetrics.warningCount
            });
        }
    }

    /**
     * Met à jour le calcul des FPS
     * @param {number} timestamp - Timestamp actuel
     */
    updateFPS(timestamp) {
        if (timestamp - this.fpsUpdateTime >= 1000) {
            this.fps = Math.round(this.frameCount * 1000 / (timestamp - this.fpsUpdateTime));
            this.frameCount = 0;
            this.fpsUpdateTime = timestamp;
        }
    }

    /**
     * Met le jeu en pause
     */
    pause() {
        if (!this.isPaused) {
            this.isPaused = true;
            eventSystem.emit(GameEvents.GAME_PAUSE, {
                timestamp: this.currentTime
            });
        }
    }

    /**
     * Reprend le jeu
     */
    resume() {
        if (this.isPaused) {
            this.isPaused = false;
            // Réajuster les temps pour éviter un gros saut
            this.lastFrameTime = performance.now();
            this.lastTickTime = this.lastFrameTime;
            this.tickAccumulator = 0;
            
            eventSystem.emit(GameEvents.GAME_RESUME, {
                timestamp: this.currentTime
            });
        }
    }

    /**
     * Bascule entre pause et reprise
     */
    togglePause() {
        if (this.isPaused) {
            this.resume();
        } else {
            this.pause();
        }
    }

    /**
     * Définit la vitesse du jeu
     * @param {number} speed - Nouvelle vitesse (0 = pause, 1 = normal, etc.)
     */
    setSpeed(speed) {
        // Valider la vitesse
        if (speed < 0 || speed > this.maxSpeed) {
            console.warn(`Vitesse invalide: ${speed}. Utilisation des limites 0-${this.maxSpeed}`);
            speed = Math.max(0, Math.min(speed, this.maxSpeed));
        }

        const oldSpeed = this.speed;
        
        if (speed === 0) {
            this.pause();
        } else {
            if (this.isPaused) {
                this.resume();
            }
            this.speed = speed;
        }

        if (oldSpeed !== this.speed || (speed > 0 && this.isPaused)) {
            eventSystem.emit(GameEvents.GAME_SPEED_CHANGE, {
                oldSpeed,
                newSpeed: this.speed,
                timestamp: this.currentTime
            });
        }
    }

    /**
     * Passe à la vitesse suivante dans les niveaux prédéfinis
     */
    nextSpeed() {
        const currentIndex = this.speedLevels.indexOf(this.isPaused ? 0 : this.speed);
        const nextIndex = (currentIndex + 1) % this.speedLevels.length;
        this.setSpeed(this.speedLevels[nextIndex]);
    }

    /**
     * Passe à la vitesse précédente dans les niveaux prédéfinis
     */
    previousSpeed() {
        const currentIndex = this.speedLevels.indexOf(this.isPaused ? 0 : this.speed);
        const prevIndex = (currentIndex - 1 + this.speedLevels.length) % this.speedLevels.length;
        this.setSpeed(this.speedLevels[prevIndex]);
    }

    /**
     * Ajoute un callback de mise à jour (appelé chaque frame)
     * @param {Function} callback - Fonction à appeler
     * @returns {number} - ID du callback pour le supprimer
     */
    addUpdateCallback(callback) {
        this.updateCallbacks.push(callback);
        return this.updateCallbacks.length - 1;
    }

    /**
     * Ajoute un callback de tick (appelé à fréquence fixe)
     * @param {Function} callback - Fonction à appeler
     * @returns {number} - ID du callback pour le supprimer
     */
    addTickCallback(callback) {
        this.tickCallbacks.push(callback);
        return this.tickCallbacks.length - 1;
    }

    /**
     * Supprime un callback de mise à jour
     * @param {number} id - ID du callback
     */
    removeUpdateCallback(id) {
        if (id >= 0 && id < this.updateCallbacks.length) {
            this.updateCallbacks.splice(id, 1);
        }
    }

    /**
     * Supprime un callback de tick
     * @param {number} id - ID du callback
     */
    removeTickCallback(id) {
        if (id >= 0 && id < this.tickCallbacks.length) {
            this.tickCallbacks.splice(id, 1);
        }
    }

    /**
     * Obtient le temps de jeu formaté
     * @param {boolean} includeMilliseconds - Inclure les millisecondes
     * @returns {string}
     */
    getFormattedTime(includeMilliseconds = false) {
        const totalSeconds = Math.floor(this.currentTime / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        
        let formatted = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        if (includeMilliseconds) {
            const ms = Math.floor(this.currentTime % 1000);
            formatted += `.${ms.toString().padStart(3, '0')}`;
        }
        
        return formatted;
    }

    /**
     * Obtient le temps réel formaté
     * @returns {string}
     */
    getFormattedRealTime() {
        const totalSeconds = Math.floor(this.realTime / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    /**
     * Calcule le temps de jeu en années/mois/jours simulés
     * @param {number} timeScale - Échelle de temps (ex: 1 seconde réelle = 1 jour de jeu)
     * @returns {Object}
     */
    getGameDate(timeScale = 86400) { // 1 jour par seconde par défaut
        const gameSeconds = this.currentTime / 1000;
        const gameDays = gameSeconds / timeScale;
        
        const years = Math.floor(gameDays / 365);
        const months = Math.floor((gameDays % 365) / 30);
        const days = Math.floor(gameDays % 30);
        
        return {
            years,
            months,
            days,
            totalDays: Math.floor(gameDays),
            season: this.getSeason(gameDays)
        };
    }

    /**
     * Détermine la saison basée sur les jours de jeu
     * @param {number} totalDays - Jours totaux
     * @returns {string}
     */
    getSeason(totalDays) {
        const dayInYear = totalDays % 365;
        
        if (dayInYear < 91) return 'Hiver';
        if (dayInYear < 182) return 'Printemps';
        if (dayInYear < 273) return 'Été';
        return 'Automne';
    }

    /**
     * Crée un timer qui se déclenche après un délai
     * @param {Function} callback - Fonction à appeler
     * @param {number} delay - Délai en millisecondes de jeu
     * @returns {Object} - Timer avec méthodes cancel()
     */
    setTimeout(callback, delay) {
        const targetTime = this.currentTime + delay;
        let cancelled = false;
        
        const checkTimer = () => {
            if (cancelled) return;
            
            if (this.currentTime >= targetTime) {
                callback();
            } else {
                requestAnimationFrame(checkTimer);
            }
        };
        
        requestAnimationFrame(checkTimer);
        
        return {
            cancel: () => { cancelled = true; }
        };
    }

    /**
     * Crée un interval qui se répète
     * @param {Function} callback - Fonction à appeler
     * @param {number} interval - Intervalle en millisecondes de jeu
     * @returns {Object} - Interval avec méthodes cancel()
     */
    setInterval(callback, interval) {
        let lastTrigger = this.currentTime;
        let cancelled = false;
        
        const checkInterval = () => {
            if (cancelled) return;
            
            if (this.currentTime - lastTrigger >= interval) {
                callback();
                lastTrigger = this.currentTime;
            }
            
            requestAnimationFrame(checkInterval);
        };
        
        requestAnimationFrame(checkInterval);
        
        return {
            cancel: () => { cancelled = true; }
        };
    }

    /**
     * Obtient les statistiques de performance
     * @returns {Object}
     */
    getPerformanceStats() {
        return {
            fps: this.fps,
            averageDeltaTime: Math.round(this.averageDeltaTime * 100) / 100,
            speed: this.speed,
            isPaused: this.isPaused,
            currentTime: this.currentTime,
            realTime: this.realTime,
            tickRate: this.tickRate,
            warningCount: this.performanceMetrics.warningCount
        };
    }

    /**
     * Sauvegarde l'état du temps
     * @returns {Object}
     */
    save() {
        return {
            currentTime: this.currentTime,
            speed: this.speed,
            isPaused: this.isPaused
        };
    }

    /**
     * Charge l'état du temps
     * @param {Object} data - Données sauvegardées
     */
    load(data) {
        if (typeof data.currentTime === 'number') {
            this.currentTime = data.currentTime;
        }
        if (typeof data.speed === 'number') {
            this.setSpeed(data.speed);
        }
        if (typeof data.isPaused === 'boolean' && data.isPaused) {
            this.pause();
        }
    }

    /**
     * Remet à zéro le temps de jeu
     */
    reset() {
        this.currentTime = 0;
        this.realTime = 0;
        this.deltaTime = 0;
        this.lastFrameTime = performance.now();
        this.lastTickTime = this.lastFrameTime;
        this.tickAccumulator = 0;
        this.speed = 1;
        this.isPaused = false;
        this.frameCount = 0;
        this.performanceMetrics.warningCount = 0;
    }

    /**
     * Débuggage: affiche les informations de temps
     */
    debug() {
        console.group('GameTime - Informations de temps');
        console.log(`Temps de jeu: ${this.getFormattedTime(true)}`);
        console.log(`Temps réel: ${this.getFormattedRealTime()}`);
        console.log(`Vitesse: ${this.speed}x (${this.isPaused ? 'EN PAUSE' : 'ACTIF'})`);
        console.log(`FPS: ${this.fps} (Delta moyen: ${this.averageDeltaTime.toFixed(2)}ms)`);
        console.log(`Callbacks: ${this.updateCallbacks.length} mise à jour, ${this.tickCallbacks.length} tick`);
        
        const gameDate = this.getGameDate();
        console.log(`Date de jeu: Année ${gameDate.years}, ${gameDate.season} (${gameDate.totalDays} jours)`);
        
        console.groupEnd();
    }
}

// Export pour utilisation dans d'autres modules
export { GameTime };