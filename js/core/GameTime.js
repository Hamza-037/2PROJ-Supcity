// js/core/GameTime.js - Système de gestion du temps de jeu (VERSION CORRIGÉE)

// Import des dépendances
import { eventSystem, GameEvents } from './EventSystem.js';

/**
 * Gestionnaire du temps de jeu avec support de pause et vitesses variables
 * VERSION CORRIGÉE POUR ÉVITER LES CRASHES
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
        
        // Variables pour éviter les crashes
        this.isRunning = false;
        this.animationFrameId = null;
        this.maxDeltaTime = 100; // Limite le deltaTime à 100ms pour éviter les spirales
        
        // Métriques de performance
        this.performanceMetrics = {
            lowFpsThreshold: 30,
            highDeltaThreshold: 50,
            warningCount: 0,
            lastWarningTime: 0
        };
        
        this.setupEventListeners();
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
     * Démarre la boucle de temps de manière sécurisée
     */
    start() {
        if (this.isRunning) {
            console.warn('GameTime déjà en cours d\'exécution');
            return;
        }

        console.log('🕒 Démarrage de GameTime');
        this.isRunning = true;
        this.lastFrameTime = performance.now();
        this.fpsUpdateTime = this.lastFrameTime;
        this.lastTickTime = this.lastFrameTime;
        this.tickAccumulator = 0;
        
        this.requestNextFrame();
    }

    /**
     * Arrête la boucle de temps
     */
    stop() {
        console.log('🕒 Arrêt de GameTime');
        this.isRunning = false;
        
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    /**
     * Demande la prochaine frame de manière sécurisée
     */
    requestNextFrame() {
        if (!this.isRunning) {
            return;
        }

        this.animationFrameId = requestAnimationFrame((timestamp) => {
            try {
                this.update(timestamp);
            } catch (error) {
                console.error('❌ Erreur dans GameTime.update:', error);
                // En cas d'erreur, essayer de continuer
                this.requestNextFrame();
            }
        });
    }

    /**
     * Met à jour le temps de jeu avec protection contre les crashes
     * @param {number} timestamp - Timestamp de la frame actuelle
     */
    update(timestamp) {
        if (!this.isRunning) {
            return;
        }

        // Calculer le delta temps réel
        let realDelta = timestamp - this.lastFrameTime;
        this.lastFrameTime = timestamp;
        
        // PROTECTION CRITIQUE: Limiter le deltaTime pour éviter les spirales de mort
        if (realDelta > this.maxDeltaTime) {
            console.warn(`⚠️ Delta temps trop élevé: ${realDelta}ms, limitation à ${this.maxDeltaTime}ms`);
            realDelta = this.maxDeltaTime;
        }

        // Ignorer les delta négatifs ou aberrants
        if (realDelta < 0 || realDelta > 5000) {
            console.warn(`⚠️ Delta temps aberrant: ${realDelta}ms, ignoré`);
            this.requestNextFrame();
            return;
        }
        
        // Mettre à jour les métriques
        this.updatePerformanceMetrics(realDelta);
        
        // Calculer le delta de jeu selon l'état de pause
        if (!this.isPaused) {
            // Calculer le delta de jeu avec la vitesse
            this.deltaTime = realDelta * this.speed;
            this.currentTime += this.deltaTime;
            
            // Système de ticks à fréquence fixe
            this.tickAccumulator += realDelta;
            
            // Éviter l'accumulation excessive de ticks
            let ticksProcessed = 0;
            const maxTicksPerFrame = 10; // Limite pour éviter les blocages
            
            while (this.tickAccumulator >= this.tickInterval && ticksProcessed < maxTicksPerFrame) {
                this.processTick();
                this.tickAccumulator -= this.tickInterval;
                ticksProcessed++;
            }
            
            // Si on a trop de ticks en retard, les abandonner
            if (ticksProcessed >= maxTicksPerFrame) {
                console.warn('⚠️ Trop de ticks en retard, abandon du surplus');
                this.tickAccumulator = 0;
            }
        }
        
        // Appeler les callbacks de mise à jour
        // En pause, on passe 0 comme deltaTime mais on continue le rendu
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
        if (this.isPaused) return;
        
        const tickDelta = this.tickInterval * this.speed;
        
        // Appeler tous les callbacks de tick avec protection d'erreur
        this.tickCallbacks.forEach((callback, index) => {
            try {
                callback(tickDelta);
            } catch (error) {
                console.error(`❌ Erreur dans callback de tick ${index}:`, error);
                // Ne pas supprimer le callback, juste continuer
            }
        });
    }

    /**
     * Traite les callbacks de mise à jour (pour le rendu et l'interface)
     * @param {number} deltaTime - Delta time en millisecondes
     */
    processUpdateCallbacks(deltaTime) {
        this.updateCallbacks.forEach((callback, index) => {
            try {
                callback(deltaTime);
            } catch (error) {
                console.error(`❌ Erreur dans callback de mise à jour ${index}:`, error);
                // Ne pas supprimer le callback, juste continuer
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
     * Met le jeu en pause de manière sécurisée
     */
pause() {
    if (!this.isPaused) {
        console.log('⏸️ GameTime mis en pause');
        this.isPaused = true;

        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        eventSystem.emit(GameEvents.GAME_PAUSE, {
            timestamp: this.currentTime
        });
    }
}


    /**
     * Reprend le jeu de manière sécurisée
     */
    resume() {
        if (this.isPaused) {
            console.log('▶️ GameTime repris');
            this.isPaused = false;
            
            // CRITIQUE: Réinitialiser les temps pour éviter un gros saut
            const now = performance.now();
            this.lastFrameTime = now;
            this.lastTickTime = now;
            this.tickAccumulator = 0;
            this.fpsUpdateTime = now;
            this.frameCount = 0;
            
            eventSystem.emit(GameEvents.GAME_RESUME, {
                timestamp: this.currentTime
            });

            this.requestNextFrame();
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
     * Définit la vitesse du jeu de manière sécurisée
     * @param {number} speed - Nouvelle vitesse (0 = pause, 1 = normal, etc.)
     */
    setSpeed(speed) {
        try {
            console.log(`🎮 setSpeed appelé avec: ${speed}`);
            
            // Valider la vitesse
            if (speed < 0 || speed > this.maxSpeed) {
                console.warn(`Vitesse invalide: ${speed}. Utilisation des limites 0-${this.maxSpeed}`);
                speed = Math.max(0, Math.min(speed, this.maxSpeed));
            }

            const oldSpeed = this.speed;
            const wasPaused = this.isPaused;
            
            if (speed === 0) {
                this.pause();
            } else {
                // Définir la nouvelle vitesse avant de reprendre
                this.speed = speed;
                
                if (this.isPaused) {
                    this.resume();
                }
            }

            // Émettre l'événement de changement
            if (oldSpeed !== this.speed || wasPaused !== this.isPaused) {
                eventSystem.emit(GameEvents.GAME_SPEED_CHANGE, {
                    oldSpeed,
                    newSpeed: this.speed,
                    wasPaused,
                    isPaused: this.isPaused,
                    timestamp: this.currentTime
                });
            }

            console.log(`✅ Vitesse changée: ${oldSpeed} -> ${this.speed}, pause: ${wasPaused} -> ${this.isPaused}`);
            
        } catch (error) {
            console.error('❌ Erreur dans setSpeed:', error);
            // Fallback sécurisé
            this.speed = 1;
            this.isPaused = false;
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
     * @returns {Function} - Fonction pour supprimer le callback
     */
    addUpdateCallback(callback) {
        this.updateCallbacks.push(callback);
        
        // Retourner une fonction pour supprimer le callback
        return () => {
            const index = this.updateCallbacks.indexOf(callback);
            if (index !== -1) {
                this.updateCallbacks.splice(index, 1);
            }
        };
    }

    /**
     * Ajoute un callback de tick (appelé à fréquence fixe)
     * @param {Function} callback - Fonction à appeler
     * @returns {Function} - Fonction pour supprimer le callback
     */
    addTickCallback(callback) {
        this.tickCallbacks.push(callback);
        
        // Retourner une fonction pour supprimer le callback
        return () => {
            const index = this.tickCallbacks.indexOf(callback);
            if (index !== -1) {
                this.tickCallbacks.splice(index, 1);
            }
        };
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
        console.log('🔄 Reset de GameTime');
        
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
        
        // Redémarrer si nécessaire
        if (!this.isRunning) {
            this.start();
        }
    }

    /**
     * Nettoyage lors de la destruction
     */
    destroy() {
        console.log('🧹 Destruction de GameTime');
        this.stop();
        this.updateCallbacks = [];
        this.tickCallbacks = [];
    }
}

export { GameTime };