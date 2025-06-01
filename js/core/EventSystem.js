// js/core/EventSystem.js - Système de gestion des événements

/**
 * Système d'événements centralisé pour la communication entre composants
 * Permet de découpler les différentes parties du jeu
 */
class EventSystem {
    constructor() {
        this.listeners = new Map();
        this.eventQueue = [];
        this.isProcessing = false;
        
        // Statistiques pour le debug
        this.stats = {
            eventsEmitted: 0,
            eventsProcessed: 0,
            listenersCount: 0
        };
    }

    /**
     * Ajoute un écouteur d'événement
     * @param {string} eventType - Type d'événement
     * @param {Function} callback - Fonction à appeler
     * @param {Object} context - Contexte d'exécution (optionnel)
     * @param {number} priority - Priorité d'exécution (optionnel, par défaut 0)
     */
    on(eventType, callback, context = null, priority = 0) {
        if (!this.listeners.has(eventType)) {
            this.listeners.set(eventType, []);
        }

        const listener = {
            callback,
            context,
            priority,
            id: this.generateListenerId()
        };

        this.listeners.get(eventType).push(listener);
        
        // Tri par priorité (plus élevée = exécutée en premier)
        this.listeners.get(eventType).sort((a, b) => b.priority - a.priority);
        
        this.stats.listenersCount++;
        
        return listener.id;
    }

    /**
     * Retire un écouteur d'événement
     * @param {string} eventType - Type d'événement
     * @param {string|Function} callbackOrId - Callback ou ID du listener
     */
    off(eventType, callbackOrId) {
        if (!this.listeners.has(eventType)) {
            return false;
        }

        const listeners = this.listeners.get(eventType);
        const index = listeners.findIndex(listener => 
            listener.id === callbackOrId || listener.callback === callbackOrId
        );

        if (index !== -1) {
            listeners.splice(index, 1);
            this.stats.listenersCount--;
            
            // Supprime la liste si elle est vide
            if (listeners.length === 0) {
                this.listeners.delete(eventType);
            }
            
            return true;
        }

        return false;
    }

    /**
     * Émet un événement
     * @param {string} eventType - Type d'événement
     * @param {*} data - Données à transmettre
     * @param {boolean} immediate - Traitement immédiat ou mis en queue
     */
    emit(eventType, data = null, immediate = false) {
        const event = {
            type: eventType,
            data,
            timestamp: Date.now(),
            id: this.generateEventId()
        };

        this.stats.eventsEmitted++;

        if (immediate) {
            this.processEvent(event);
        } else {
            this.eventQueue.push(event);
        }

        return event.id;
    }

    /**
     * Traite un événement immédiatement
     * @param {Object} event - Événement à traiter
     */
    processEvent(event) {
        if (!this.listeners.has(event.type)) {
            return;
        }

        const listeners = this.listeners.get(event.type);
        
        for (const listener of listeners) {
            try {
                if (listener.context) {
                    listener.callback.call(listener.context, event);
                } else {
                    listener.callback(event);
                }
            } catch (error) {
                console.error(`Erreur lors du traitement de l'événement ${event.type}:`, error);
            }
        }

        this.stats.eventsProcessed++;
    }

    /**
     * Traite tous les événements en attente
     */
    processQueue() {
        if (this.isProcessing || this.eventQueue.length === 0) {
            return;
        }

        this.isProcessing = true;

        while (this.eventQueue.length > 0) {
            const event = this.eventQueue.shift();
            this.processEvent(event);
        }

        this.isProcessing = false;
    }

    /**
     * Ajoute un écouteur qui ne se déclenche qu'une fois
     * @param {string} eventType - Type d'événement
     * @param {Function} callback - Fonction à appeler
     * @param {Object} context - Contexte d'exécution
     */
    once(eventType, callback, context = null) {
        const onceCallback = (event) => {
            callback.call(context, event);
            this.off(eventType, onceCallback);
        };

        return this.on(eventType, onceCallback, context);
    }

    /**
     * Vérifie si un type d'événement a des écouteurs
     * @param {string} eventType - Type d'événement
     * @returns {boolean}
     */
    hasListeners(eventType) {
        return this.listeners.has(eventType) && this.listeners.get(eventType).length > 0;
    }

    /**
     * Obtient le nombre d'écouteurs pour un type d'événement
     * @param {string} eventType - Type d'événement
     * @returns {number}
     */
    getListenerCount(eventType) {
        return this.listeners.has(eventType) ? this.listeners.get(eventType).length : 0;
    }

    /**
     * Supprime tous les écouteurs d'un type d'événement
     * @param {string} eventType - Type d'événement
     */
    removeAllListeners(eventType = null) {
        if (eventType) {
            if (this.listeners.has(eventType)) {
                const count = this.listeners.get(eventType).length;
                this.listeners.delete(eventType);
                this.stats.listenersCount -= count;
            }
        } else {
            this.listeners.clear();
            this.stats.listenersCount = 0;
        }
    }

    /**
     * Vide la queue d'événements
     */
    clearQueue() {
        this.eventQueue = [];
    }

    /**
     * Génère un ID unique pour un listener
     * @returns {string}
     */
    generateListenerId() {
        return `listener_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Génère un ID unique pour un événement
     * @returns {string}
     */
    generateEventId() {
        return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Obtient les statistiques du système d'événements
     * @returns {Object}
     */
    getStats() {
        return {
            ...this.stats,
            queueLength: this.eventQueue.length,
            eventTypes: this.listeners.size,
            isProcessing: this.isProcessing
        };
    }

    /**
     * Debug: affiche tous les écouteurs enregistrés
     */
    debugListeners() {
        console.group('EventSystem - Écouteurs enregistrés');
        
        for (const [eventType, listeners] of this.listeners) {
            console.group(`${eventType} (${listeners.length} écouteurs)`);
            
            listeners.forEach((listener, index) => {
                console.log(`  ${index + 1}. Priority: ${listener.priority}, ID: ${listener.id}`);
            });
            
            console.groupEnd();
        }
        
        console.groupEnd();
    }

    /**
     * Debug: affiche la queue d'événements
     */
    debugQueue() {
        console.group('EventSystem - Queue d\'événements');
        console.log(`${this.eventQueue.length} événements en attente`);
        
        this.eventQueue.forEach((event, index) => {
            console.log(`${index + 1}. ${event.type} (${event.timestamp}) - ID: ${event.id}`);
        });
        
        console.groupEnd();
    }
}

// Types d'événements prédéfinis pour le jeu
const GameEvents = {
    // Événements de jeu
    GAME_START: 'game:start',
    GAME_PAUSE: 'game:pause',
    GAME_RESUME: 'game:resume',
    GAME_RESET: 'game:reset',
    GAME_SAVE: 'game:save',
    GAME_LOAD: 'game:load',
    GAME_SPEED_CHANGE: 'game:speedChange',
    
    // Événements de ressources
    RESOURCE_CHANGE: 'resource:change',
    RESOURCE_DEPLETED: 'resource:depleted',
    RESOURCE_PRODUCED: 'resource:produced',
    RESOURCE_CONSUMED: 'resource:consumed',
    
    // Événements de population
    CITIZEN_SPAWNED: 'citizen:spawned',
    CITIZEN_DIED: 'citizen:died',
    CITIZEN_JOB_ASSIGNED: 'citizen:jobAssigned',
    CITIZEN_JOB_LOST: 'citizen:jobLost',
    CITIZEN_NEEDS_CHANGE: 'citizen:needsChange',
    
    // Événements de construction
    BUILDING_PLACED: 'building:placed',
    BUILDING_REMOVED: 'building:removed',
    BUILDING_UPGRADED: 'building:upgraded',
    BUILDING_PRODUCTION: 'building:production',
    BUILDING_SELECTED: 'building:selected',
    
    // Événements de recherche
    RESEARCH_STARTED: 'research:started',
    RESEARCH_COMPLETED: 'research:completed',
    RESEARCH_UNLOCKED: 'research:unlocked',
    
    // Événements d'interface
    UI_TAB_CHANGE: 'ui:tabChange',
    UI_NOTIFICATION: 'ui:notification',
    UI_MODAL_OPEN: 'ui:modalOpen',
    UI_MODAL_CLOSE: 'ui:modalClose',
    
    // Événements de transport
    TRANSPORT_START: 'transport:start',
    TRANSPORT_COMPLETE: 'transport:complete',
    TRANSPORT_FAILED: 'transport:failed',
    
    // Événements système
    SYSTEM_ERROR: 'system:error',
    SYSTEM_WARNING: 'system:warning',
    SYSTEM_INFO: 'system:info',
    
    // Événements de performance
    PERFORMANCE_LOW_FPS: 'performance:lowFps',
    PERFORMANCE_HIGH_MEMORY: 'performance:highMemory'
};

const eventSystem = new EventSystem();

export { EventSystem, GameEvents, eventSystem };