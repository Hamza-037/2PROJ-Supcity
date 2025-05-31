// js/core/ResourceManager.js - Gestionnaire des ressources du jeu

/**
 * Gestionnaire centralisé des ressources du jeu
 * Gère les stocks, la production, la consommation et les tendances
 */
class ResourceManager {
    constructor() {
        // Ressources de base
        this.resources = {
            food: { amount: 0, capacity: 1000, trend: 0 },
            wood: { amount: 0, capacity: 1000, trend: 0 },
            stone: { amount: 0, capacity: 1000, trend: 0 },
            water: { amount: 0, capacity: 1000, trend: 0 },
            research: { amount: 0, capacity: 1000, trend: 0 },
            
            // Ressources avancées (débloquées plus tard)
            iron: { amount: 0, capacity: 500, trend: 0 },
            coal: { amount: 0, capacity: 500, trend: 0 },
            cloth: { amount: 0, capacity: 300, trend: 0 },
            pottery: { amount: 0, capacity: 300, trend: 0 },
            tools: { amount: 0, capacity: 200, trend: 0 },
            weapons: { amount: 0, capacity: 100, trend: 0 },
            
            // Ressources spéciales
            happiness: { amount: 100, capacity: 100, trend: 0 },
            population: { amount: 0, capacity: 1000, trend: 0 }
        };

        // Historique des tendances pour les graphiques
        this.history = {};
        this.initHistory();

        // Production et consommation par minute
        this.production = {};
        this.consumption = {};
        this.initRates();

        // Configuration des ressources
        this.config = {
            updateInterval: 1000, // 1 seconde
            historyLength: 300,   // 5 minutes d'historique
            trendSmoothingFactor: 0.1
        };

        // Dernière mise à jour
        this.lastUpdate = Date.now();
        
        // Événements de seuils critiques
        this.thresholds = {
            low: 0.2,      // 20% = seuil bas
            critical: 0.05, // 5% = seuil critique
            high: 0.9      // 90% = seuil haut
        };

        this.setupEventListeners();
    }

    /**
     * Initialise l'historique des ressources
     */
    initHistory() {
        Object.keys(this.resources).forEach(resourceType => {
            this.history[resourceType] = [];
        });
    }

    /**
     * Initialise les taux de production et consommation
     */
    initRates() {
        Object.keys(this.resources).forEach(resourceType => {
            this.production[resourceType] = 0;
            this.consumption[resourceType] = 0;
        });
    }

    /**
     * Configure les écouteurs d'événements
     */
    setupEventListeners() {
        eventSystem.on(GameEvents.BUILDING_PRODUCTION, (event) => {
            this.addResource(event.data.resource, event.data.amount);
        });

        eventSystem.on(GameEvents.CITIZEN_NEEDS_CHANGE, (event) => {
            if (event.data.consumed) {
                this.removeResource(event.data.resource, event.data.amount);
            }
        });
    }

    /**
     * Ajoute une quantité de ressource
     * @param {string} type - Type de ressource
     * @param {number} amount - Quantité à ajouter
     * @param {boolean} forceAdd - Force l'ajout même si la capacité est dépassée
     * @returns {number} - Quantité réellement ajoutée
     */
    addResource(type, amount, forceAdd = false) {
        if (!this.resources[type]) {
            console.warn(`Type de ressource inconnu: ${type}`);
            return 0;
        }

        const resource = this.resources[type];
        const oldAmount = resource.amount;
        
        if (forceAdd) {
            resource.amount += amount;
        } else {
            const availableSpace = resource.capacity - resource.amount;
            const actualAmount = Math.min(amount, availableSpace);
            resource.amount += actualAmount;
            amount = actualAmount;
        }

        // Mettre à jour les statistiques de production
        this.production[type] = (this.production[type] || 0) + amount;

        // Émettre un événement de changement
        this.emitResourceChange(type, oldAmount, resource.amount, 'produced');

        return amount;
    }

    /**
     * Retire une quantité de ressource
     * @param {string} type - Type de ressource
     * @param {number} amount - Quantité à retirer
     * @param {boolean} allowNegative - Permet les valeurs négatives
     * @returns {number} - Quantité réellement retirée
     */
    removeResource(type, amount, allowNegative = false) {
        if (!this.resources[type]) {
            console.warn(`Type de ressource inconnu: ${type}`);
            return 0;
        }

        const resource = this.resources[type];
        const oldAmount = resource.amount;
        
        if (allowNegative) {
            resource.amount -= amount;
        } else {
            const actualAmount = Math.min(amount, resource.amount);
            resource.amount -= actualAmount;
            amount = actualAmount;
        }

        // Mettre à jour les statistiques de consommation
        this.consumption[type] = (this.consumption[type] || 0) + amount;

        // Émettre un événement de changement
        this.emitResourceChange(type, oldAmount, resource.amount, 'consumed');

        return amount;
    }

    /**
     * Définit une quantité absolue de ressource
     * @param {string} type - Type de ressource
     * @param {number} amount - Quantité à définir
     */
    setResource(type, amount) {
        if (!this.resources[type]) {
            console.warn(`Type de ressource inconnu: ${type}`);
            return;
        }

        const resource = this.resources[type];
        const oldAmount = resource.amount;
        resource.amount = Math.max(0, Math.min(amount, resource.capacity));

        this.emitResourceChange(type, oldAmount, resource.amount, 'set');
    }

    /**
     * Obtient la quantité d'une ressource
     * @param {string} type - Type de ressource
     * @returns {number}
     */
    getResource(type) {
        return this.resources[type] ? this.resources[type].amount : 0;
    }

    /**
     * Obtient toutes les informations d'une ressource
     * @param {string} type - Type de ressource
     * @returns {Object}
     */
    getResourceInfo(type) {
        return this.resources[type] || null;
    }

    /**
     * Vérifie si on a assez d'une ressource
     * @param {string} type - Type de ressource
     * @param {number} amount - Quantité requise
     * @returns {boolean}
     */
    hasResource(type, amount) {
        return this.getResource(type) >= amount;
    }

    /**
     * Vérifie si on a assez de plusieurs ressources
     * @param {Object} requirements - {resourceType: amount, ...}
     * @returns {boolean}
     */
    hasResources(requirements) {
        return Object.entries(requirements).every(([type, amount]) => 
            this.hasResource(type, amount)
        );
    }

    /**
     * Consomme plusieurs ressources d'un coup
     * @param {Object} requirements - {resourceType: amount, ...}
     * @returns {boolean} - True si la transaction a réussi
     */
    consumeResources(requirements) {
        // Vérifier d'abord si on a tout
        if (!this.hasResources(requirements)) {
            return false;
        }

        // Consommer toutes les ressources
        Object.entries(requirements).forEach(([type, amount]) => {
            this.removeResource(type, amount);
        });

        return true;
    }

    /**
     * Augmente la capacité d'une ressource
     * @param {string} type - Type de ressource
     * @param {number} amount - Augmentation de capacité
     */
    increaseCapacity(type, amount) {
        if (this.resources[type]) {
            this.resources[type].capacity += amount;
            
            eventSystem.emit(GameEvents.RESOURCE_CHANGE, {
                type,
                changeType: 'capacity',
                newCapacity: this.resources[type].capacity
            });
        }
    }

    /**
     * Met à jour les tendances et l'historique
     */
    update() {
        const now = Date.now();
        const deltaTime = (now - this.lastUpdate) / 1000; // en secondes
        
        if (deltaTime < this.config.updateInterval / 1000) {
            return;
        }

        // Calculer les tendances basées sur la production/consommation
        Object.keys(this.resources).forEach(type => {
            const production = this.production[type] || 0;
            const consumption = this.consumption[type] || 0;
            const netRate = (production - consumption) / deltaTime * 60; // par minute
            
            // Lissage de la tendance
            const oldTrend = this.resources[type].trend;
            this.resources[type].trend = oldTrend + 
                (netRate - oldTrend) * this.config.trendSmoothingFactor;

            // Ajouter à l'historique
            this.history[type].push({
                timestamp: now,
                amount: this.resources[type].amount,
                production,
                consumption,
                trend: this.resources[type].trend
            });

            // Limiter la taille de l'historique
            if (this.history[type].length > this.config.historyLength) {
                this.history[type].shift();
            }
        });

        // Réinitialiser les compteurs
        this.initRates();
        this.lastUpdate = now;

        // Vérifier les seuils critiques
        this.checkThresholds();
    }

    /**
     * Vérifie les seuils critiques et émet des alertes
     */
    checkThresholds() {
        Object.entries(this.resources).forEach(([type, resource]) => {
            const ratio = resource.amount / resource.capacity;
            
            if (ratio <= this.thresholds.critical && resource.amount > 0) {
                eventSystem.emit(GameEvents.RESOURCE_DEPLETED, {
                    type,
                    amount: resource.amount,
                    capacity: resource.capacity,
                    level: 'critical'
                });
            } else if (ratio <= this.thresholds.low) {
                eventSystem.emit(GameEvents.RESOURCE_DEPLETED, {
                    type,
                    amount: resource.amount,
                    capacity: resource.capacity,
                    level: 'low'
                });
            } else if (ratio >= this.thresholds.high) {
                eventSystem.emit(GameEvents.RESOURCE_CHANGE, {
                    type,
                    amount: resource.amount,
                    capacity: resource.capacity,
                    level: 'high'
                });
            }
        });
    }

    /**
     * Émet un événement de changement de ressource
     * @param {string} type - Type de ressource
     * @param {number} oldAmount - Ancienne quantité
     * @param {number} newAmount - Nouvelle quantité
     * @param {string} changeType - Type de changement
     */
    emitResourceChange(type, oldAmount, newAmount, changeType) {
        eventSystem.emit(GameEvents.RESOURCE_CHANGE, {
            type,
            oldAmount,
            newAmount,
            difference: newAmount - oldAmount,
            changeType,
            timestamp: Date.now()
        });
    }

    /**
     * Obtient l'historique d'une ressource
     * @param {string} type - Type de ressource
     * @param {number} duration - Durée en millisecondes (optionnel)
     * @returns {Array}
     */
    getHistory(type, duration = null) {
        if (!this.history[type]) {
            return [];
        }

        if (!duration) {
            return this.history[type];
        }

        const cutoff = Date.now() - duration;
        return this.history[type].filter(entry => entry.timestamp >= cutoff);
    }

    /**
     * Obtient un résumé des ressources
     * @returns {Object}
     */
    getSummary() {
        const summary = {};
        
        Object.entries(this.resources).forEach(([type, resource]) => {
            summary[type] = {
                amount: Math.floor(resource.amount),
                capacity: resource.capacity,
                percentage: Math.round((resource.amount / resource.capacity) * 100),
                trend: Math.round(resource.trend * 10) / 10,
                production: Math.round((this.production[type] || 0) * 10) / 10,
                consumption: Math.round((this.consumption[type] || 0) * 10) / 10
            };
        });

        return summary;
    }

    /**
     * Sauvegarde l'état des ressources
     * @returns {Object}
     */
    save() {
        return {
            resources: JSON.parse(JSON.stringify(this.resources)),
            history: JSON.parse(JSON.stringify(this.history)),
            lastUpdate: this.lastUpdate
        };
    }

    /**
     * Charge l'état des ressources
     * @param {Object} data - Données sauvegardées
     */
    load(data) {
        if (data.resources) {
            this.resources = data.resources;
        }
        if (data.history) {
            this.history = data.history;
        }
        if (data.lastUpdate) {
            this.lastUpdate = data.lastUpdate;
        }

        this.initRates();
    }

    /**
     * Réinitialise toutes les ressources
     */
    reset() {
        Object.keys(this.resources).forEach(type => {
            this.resources[type].amount = 0;
            this.resources[type].trend = 0;
        });
        
        this.initHistory();
        this.initRates();
        this.lastUpdate = Date.now();
    }

    /**
     * Débuggage: affiche l'état des ressources
     */
    debug() {
        console.group('ResourceManager - État des ressources');
        
        Object.entries(this.resources).forEach(([type, resource]) => {
            const percentage = Math.round((resource.amount / resource.capacity) * 100);
            const trend = resource.trend > 0 ? `↗ +${resource.trend.toFixed(1)}` : 
                         resource.trend < 0 ? `↘ ${resource.trend.toFixed(1)}` : '→ 0';
            
            console.log(`${type}: ${Math.floor(resource.amount)}/${resource.capacity} (${percentage}%) ${trend}/min`);
        });
        
        console.groupEnd();
    }
}

// Export pour utilisation dans d'autres modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ResourceManager;
} else {
    window.ResourceManager = ResourceManager;
}