// js/entities/Building.js - Classe représentant un bâtiment

/**
 * Classe de base pour tous les bâtiments du jeu
 */
class Building {
    constructor(type, x, y, game) {
        // Position et dimensions
        this.x = x;
        this.y = y;
        this.type = type;
        this.game = game;
        
        // Identité
        this.id = this.generateId();
        this.name = '';
        this.description = '';
        
        // État du bâtiment
        this.isActive = true;
        this.isOperational = true;
        this.constructionProgress = 100; // 0-100%
        this.healthPoints = 100;
        this.level = 1;
        this.maxLevel = 3;
        
        // Propriétés de base
        this.size = 20;
        this.range = 60;
        this.capacity = 0;
        this.durability = 100;
        
        // Travailleurs et résidents
        this.workers = [];
        this.residents = [];
        this.maxWorkers = 0;
        this.maxResidents = 0;
        
        // Production et ressources
        this.produces = null;
        this.consumes = {};
        this.storage = {};
        this.maxStorage = {};
        this.productionRate = 0;
        this.efficiency = 1.0;
        
        // Timers et cooldowns
        this.productionCooldown = 0;
        this.maintenanceCooldown = 0;
        this.upgradeCooldown = 0;
        
        // Animation et visuel
        this.animation = Math.random() * Math.PI * 2;
        this.color = '#888888';
        this.sprite = null;
        this.effects = [];
        
        // Économie
        this.maintenanceCost = {};
        this.constructionCost = {};
        this.upgradeCost = {};
        
        // Statistiques
        this.stats = {
            totalProduced: 0,
            totalConsumed: 0,
            workersEmployed: 0,
            timeActive: 0,
            efficiencyHistory: []
        };
        
        // Événements et connexions
        this.connectedBuildings = [];
        this.roadAccess = false;
        this.powerConnected = false;
        this.waterConnected = false;
        
        // Initialiser selon le type
        this.initializeFromType();
        this.setupEventListeners();
    }

    /**
     * Initialise le bâtiment selon son type
     */
    initializeFromType() {
        const buildingData = this.game.buildingDataManager.getBuildingData(this.type);
        
        if (buildingData) {
            Object.assign(this, buildingData);
            
            // Initialiser le stockage
            if (this.maxStorage) {
                Object.keys(this.maxStorage).forEach(resource => {
                    this.storage[resource] = 0;
                });
            }
        } else {
            console.warn(`Type de bâtiment inconnu: ${this.type}`);
        }
    }

    /**
     * Configure les écouteurs d'événements
     */
    setupEventListeners() {
        // Écouter les changements de ressources globales
        eventSystem.on(GameEvents.RESOURCE_CHANGE, (event) => {
            this.onResourceChange(event.data);
        });
        
        // Écouter les événements de recherche
        eventSystem.on(GameEvents.RESEARCH_COMPLETED, (event) => {
            this.onResearchCompleted(event.data);
        });
    }

    /**
     * Met à jour le bâtiment
     * @param {number} deltaTime - Temps écoulé en millisecondes
     */
    update(deltaTime) {
        const deltaSeconds = deltaTime / 1000;
        
        // Mettre à jour les statistiques
        this.stats.timeActive += deltaSeconds;
        
        // Animation - vitesse constante indépendamment de la vitesse du jeu
        // Pour certains bâtiments comme le feu, on ne veut pas que l'animation s'accélère avec la vitesse du jeu
        if (this.type === 'fire') {
            // Utiliser un delta fixe pour le feu, indépendamment de la vitesse du jeu
            this.animation += 0.01; // Valeur fixe pour une animation constante
        } else {
            // Pour les autres bâtiments, animation normale
            this.animation += deltaSeconds * 0.5;
        }
        
        // Cooldowns
        this.updateCooldowns(deltaSeconds);
        
        // Maintenance et dégradation
        this.updateMaintenance(deltaSeconds);
        
        // Production si le bâtiment est opérationnel
        if (this.isOperational && this.isActive) {
            this.updateProduction(deltaSeconds);
        }
        
        // Gestion des travailleurs
        this.updateWorkers(deltaSeconds);
        
        // Effets visuels
        this.updateEffects(deltaSeconds);
        
        // Vérifier les connexions
        this.updateConnections();
    }

    /**
     * Met à jour la production du bâtiment
     * @param {number} deltaSeconds - Temps en secondes
     */
    updateProduction(deltaSeconds) {
        if (!this.produces || this.productionCooldown > 0) {
            return;
        }
        
        // Calculer l'efficacité basée sur les travailleurs
        const workerEfficiency = this.calculateWorkerEfficiency();
        
        // Vérifier les ressources consommées
        if (!this.canProduce()) {
            return;
        }
        
        // Consommer les ressources nécessaires
        this.consumeResources();
        
        // Produire la ressource
        const production = this.productionRate * workerEfficiency * this.efficiency;
        this.produceResource(this.produces, production);
        
        // Mettre à jour les statistiques
        this.stats.totalProduced += production;
        
        // Réinitialiser le cooldown
        this.productionCooldown = 60 / this.productionRate; // Conversion en secondes
        
        // Émettre un événement de production
        eventSystem.emit(GameEvents.BUILDING_PRODUCTION, {
            building: this,
            resource: this.produces,
            amount: production,
            efficiency: workerEfficiency
        });
    }

    /**
     * Calcule l'efficacité basée sur les travailleurs
     * @returns {number} - Efficacité entre 0 et 1.2
     */
    calculateWorkerEfficiency() {
        if (this.maxWorkers === 0) return 1.0;
        
        const workerRatio = this.workers.length / this.maxWorkers;
        let efficiency = Math.min(1.2, workerRatio); // Max 120% avec tous les travailleurs
        
        // Bonus d'expérience des travailleurs
        if (this.workers.length > 0) {
            const avgExperience = this.workers.reduce((sum, worker) => 
                sum + worker.workExperience, 0) / this.workers.length;
            efficiency *= (1 + avgExperience * 0.1); // Bonus d'expérience
        }
        
        // Malus si pas assez de travailleurs
        if (workerRatio < 0.5) {
            efficiency *= 0.5; // Forte pénalité si moins de 50% des travailleurs
        }
        
        return Math.min(1.5, efficiency); // Limite maximale
    }

    /**
     * Vérifie si le bâtiment peut produire
     * @returns {boolean}
     */
    canProduce() {
        // Vérifier les ressources consommées
        return Object.entries(this.consumes).every(([resource, amount]) => 
            this.game.resourceManager.hasResource(resource, amount)
        );
    }

    /**
     * Consomme les ressources nécessaires à la production
     */
    consumeResources() {
        Object.entries(this.consumes).forEach(([resource, amount]) => {
            this.game.resourceManager.removeResource(resource, amount);
            this.stats.totalConsumed += amount;
        });
    }

    /**
     * Produit une ressource
     * @param {string} resource - Type de ressource
     * @param {number} amount - Quantité produite
     */
    produceResource(resource, amount) {
        // Ajouter au stockage local si possible
        if (this.maxStorage[resource]) {
            const localSpace = this.maxStorage[resource] - (this.storage[resource] || 0);
            const localAmount = Math.min(amount, localSpace);
            
            this.storage[resource] = (this.storage[resource] || 0) + localAmount;
            amount -= localAmount;
        }
        
        // Ajouter le reste au stockage global
        if (amount > 0) {
            this.game.resourceManager.addResource(resource, amount);
        }
    }

    /**
     * Met à jour les travailleurs
     * @param {number} deltaSeconds - Temps en secondes
     */
    updateWorkers(deltaSeconds) {
        // Retirer les travailleurs morts ou invalides
        this.workers = this.workers.filter(worker => 
            worker && this.game.citizens.includes(worker)
        );
        
        // Chercher de nouveaux travailleurs si nécessaire
        if (this.needsWorkers() && Math.random() < 0.01) { // 1% de chance par update
            this.recruitWorker();
        }
        
        // Mettre à jour les statistiques
        this.stats.workersEmployed = this.workers.length;
    }

    /**
     * Vérifie si le bâtiment a besoin de travailleurs
     * @returns {boolean}
     */
    needsWorkers() {
        return this.maxWorkers > 0 && this.workers.length < this.maxWorkers;
    }

    /**
     * Recrute un travailleur disponible
     */
    recruitWorker() {
        const availableWorkers = this.game.citizens.filter(citizen => 
            !citizen.job && 
            citizen.getDistanceTo(this.x, this.y) < this.range * 2 &&
            citizen.energy > 30
        );
        
        if (availableWorkers.length > 0) {
            const worker = availableWorkers[0];
            this.addWorker(worker);
        }
    }

    /**
     * Ajoute un travailleur
     * @param {Citizen} citizen - Citoyen à employer
     * @returns {boolean} - Succès de l'opération
     */
    addWorker(citizen) {
        if (this.workers.length >= this.maxWorkers) {
            return false;
        }
        
        this.workers.push(citizen);
        citizen.job = this;
        
        eventSystem.emit(GameEvents.CITIZEN_JOB_ASSIGNED, {
            citizen,
            building: this
        });
        
        return true;
    }

    /**
     * Retire un travailleur
     * @param {Citizen} citizen - Citoyen à licencier
     */
    removeWorker(citizen) {
        const index = this.workers.indexOf(citizen);
        if (index !== -1) {
            this.workers.splice(index, 1);
            citizen.job = null;
            
            eventSystem.emit(GameEvents.CITIZEN_JOB_LOST, {
                citizen,
                building: this
            });
        }
    }

    /**
     * Ajoute un résident (pour les bâtiments résidentiels)
     * @param {Citizen} citizen - Citoyen à loger
     * @returns {boolean} - Succès de l'opération
     */
    addResident(citizen) {
        if (this.residents.length >= this.maxResidents) {
            return false;
        }
        
        this.residents.push(citizen);
        citizen.home = this;
        
        return true;
    }

    /**
     * Retire un résident
     * @param {Citizen} citizen - Citoyen à déloger
     */
    removeResident(citizen) {
        const index = this.residents.indexOf(citizen);
        if (index !== -1) {
            this.residents.splice(index, 1);
            citizen.home = null;
        }
    }

    /**
     * Vérifie si le bâtiment a de l'espace pour des résidents
     * @returns {boolean}
     */
    hasAvailableSpace() {
        return this.maxResidents > 0 && this.residents.length < this.maxResidents;
    }

    /**
     * Met à jour la maintenance et la dégradation
     * @param {number} deltaSeconds - Temps en secondes
     */
    updateMaintenance(deltaSeconds) {
        // Dégradation naturelle
        const degradationRate = 0.01; // 1% par minute
        this.healthPoints = Math.max(0, this.healthPoints - degradationRate * deltaSeconds / 60);
        
        // Maintenance automatique si possible
        if (this.maintenanceCooldown <= 0 && this.healthPoints < 80) {
            this.performMaintenance();
            this.maintenanceCooldown = 300; // 5 minutes
        }
        
        // Bâtiment devient non-opérationnel si trop endommagé
        this.isOperational = this.healthPoints > 10;
    }

    /**
     * Effectue la maintenance du bâtiment
     */
    performMaintenance() {
        if (this.game.resourceManager.consumeResources(this.maintenanceCost)) {
            this.healthPoints = Math.min(100, this.healthPoints + 20);
            
            eventSystem.emit(GameEvents.UI_NOTIFICATION, {
                type: 'info',
                message: `Maintenance effectuée sur ${this.name}`
            });
        }
    }

    /**
     * Met à jour les cooldowns
     * @param {number} deltaSeconds - Temps en secondes
     */
    updateCooldowns(deltaSeconds) {
        this.productionCooldown = Math.max(0, this.productionCooldown - deltaSeconds);
        this.maintenanceCooldown = Math.max(0, this.maintenanceCooldown - deltaSeconds);
        this.upgradeCooldown = Math.max(0, this.upgradeCooldown - deltaSeconds);
    }

    /**
     * Met à jour les effets visuels
     * @param {number} deltaSeconds - Temps en secondes
     */
    updateEffects(deltaSeconds) {
        // Mettre à jour les effets existants
        this.effects = this.effects.filter(effect => {
            effect.time += deltaSeconds;
            return effect.time < effect.duration;
        });
        
        // Ajouter de nouveaux effets selon l'état
        if (this.isOperational && this.workers.length > 0) {
            this.addProductionEffect();
        }
    }

    /**
     * Ajoute un effet de production
     */
    addProductionEffect() {
        if (Math.random() < 0.05) { // 5% de chance par update
            this.effects.push({
                type: 'smoke',
                x: this.x + Math.random() * 20 - 10,
                y: this.y - this.size/2,
                time: 0,
                duration: 3
            });
        }
    }

    /**
     * Met à jour les connexions (routes, électricité, eau)
     */
    updateConnections() {
        // Vérifier l'accès routier
        this.roadAccess = this.checkRoadAccess();
        
        // Modifier l'efficacité selon les connexions
        let connectionBonus = 1.0;
        
        if (this.roadAccess) connectionBonus += 0.1;
        if (this.powerConnected) connectionBonus += 0.15;
        if (this.waterConnected) connectionBonus += 0.1;
        
        this.efficiency = Math.min(1.5, connectionBonus);
    }

    /**
     * Vérifie l'accès routier
     * @returns {boolean}
     */
    checkRoadAccess() {
        // Chercher des routes à proximité
        const nearbyRoads = this.game.buildings.filter(building => 
            building.type === 'road' &&
            this.getDistanceTo(building.x, building.y) < 50
        );
        
        return nearbyRoads.length > 0;
    }

    /**
     * Améliore le bâtiment au niveau suivant
     * @returns {boolean} - Succès de l'amélioration
     */
    upgrade() {
        if (this.level >= this.maxLevel || this.upgradeCooldown > 0) {
            return false;
        }
        
        const cost = this.getUpgradeCost();
        
        if (!this.game.resourceManager.consumeResources(cost)) {
            return false;
        }
        
        this.level++;
        this.applyUpgradeBonus();
        this.upgradeCooldown = 600; // 10 minutes
        
        eventSystem.emit(GameEvents.BUILDING_UPGRADED, {
            building: this,
            newLevel: this.level
        });
        
        return true;
    }

    /**
     * Applique les bonus d'amélioration
     */
    applyUpgradeBonus() {
        const multiplier = 1 + (this.level - 1) * 0.3; // +30% par niveau
        
        this.productionRate *= multiplier;
        this.maxWorkers = Math.floor(this.maxWorkers * multiplier);
        this.maxResidents = Math.floor(this.maxResidents * multiplier);
        this.healthPoints = 100; // Réparation complète
        
        // Augmenter la taille visuellement
        this.size = Math.floor(this.size * 1.1);
    }

    /**
     * Obtient le coût d'amélioration
     * @returns {Object} - Coût en ressources
     */
    getUpgradeCost() {
        const baseCost = this.upgradeCost;
        const multiplier = Math.pow(2, this.level - 1); // Coût doublé à chaque niveau
        
        const cost = {};
        Object.entries(baseCost).forEach(([resource, amount]) => {
            cost[resource] = Math.floor(amount * multiplier);
        });
        
        return cost;
    }

    /**
     * Détruit le bâtiment
     */
    destroy() {
        // Libérer tous les travailleurs
        this.workers.forEach(worker => {
            worker.job = null;
        });
        
        // Libérer tous les résidents
        this.residents.forEach(resident => {
            resident.home = null;
        });
        
        // Récupérer une partie des ressources
        const refund = this.getDestructionRefund();
        Object.entries(refund).forEach(([resource, amount]) => {
            this.game.resourceManager.addResource(resource, amount);
        });
        
        eventSystem.emit(GameEvents.BUILDING_REMOVED, {
            building: this,
            refund
        });
    }

    /**
     * Calcule le remboursement de destruction
     * @returns {Object} - Ressources récupérées
     */
    getDestructionRefund() {
        const refundRate = 0.5; // 50% de récupération
        const refund = {};
        
        Object.entries(this.constructionCost).forEach(([resource, amount]) => {
            refund[resource] = Math.floor(amount * refundRate * (this.healthPoints / 100));
        });
        
        return refund;
    }

    /**
     * Travaille (appelé par les citoyens)
     * @param {Citizen} worker - Travailleur
     * @param {number} efficiency - Efficacité du travailleur
     */
    work(worker, efficiency = 1.0) {
        if (!this.isOperational || !this.workers.includes(worker)) {
            return;
        }
        
        // Augmenter l'expérience du travailleur
        worker.workExperience += 0.01;
        
        // Effet immédiat selon le type de bâtiment
        this.applyWorkEffect(worker, efficiency);
    }

    /**
     * Applique l'effet du travail
     * @param {Citizen} worker - Travailleur
     * @param {number} efficiency - Efficacité
     */
    applyWorkEffect(worker, efficiency) {
        // Override dans les classes spécialisées
    }

    /**
     * Gère les événements de changement de ressources
     * @param {Object} data - Données de l'événement
     */
    onResourceChange(data) {
        // Réagir aux changements de ressources si nécessaire
    }

    /**
     * Gère les événements de recherche terminée
     * @param {Object} data - Données de la recherche
     */
    onResearchCompleted(data) {
        // Appliquer les bonus de recherche
        this.applyResearchBonus(data.researchType);
    }

    /**
     * Applique les bonus de recherche
     * @param {string} researchType - Type de recherche
     */
    applyResearchBonus(researchType) {
        // Bonus spécifiques selon le type de recherche
        switch (researchType) {
            case 'better_tools':
                this.efficiency *= 1.2;
                break;
            case 'advanced_construction':
                this.healthPoints = Math.min(100, this.healthPoints + 20);
                break;
            case 'worker_efficiency':
                this.maxWorkers = Math.floor(this.maxWorkers * 1.1);
                break;
        }
    }

    /**
     * Calcule la distance vers un point
     * @param {number} x - Position X
     * @param {number} y - Position Y
     * @returns {number} - Distance
     */
    getDistanceTo(x, y) {
        const dx = this.x - x;
        const dy = this.y - y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Vérifie si un point est dans la portée du bâtiment
     * @param {number} x - Position X
     * @param {number} y - Position Y
     * @returns {boolean}
     */
    isInRange(x, y) {
        return this.getDistanceTo(x, y) <= this.range;
    }

    /**
     * Génère un ID unique pour le bâtiment
     * @returns {string}
     */
    generateId() {
        return `building_${this.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Obtient les informations du bâtiment pour l'interface
     * @returns {Object}
     */
    getInfo() {
        return {
            id: this.id,
            type: this.type,
            name: this.name,
            level: this.level,
            health: Math.round(this.healthPoints),
            efficiency: Math.round(this.efficiency * 100),
            workers: `${this.workers.length}/${this.maxWorkers}`,
            residents: `${this.residents.length}/${this.maxResidents}`,
            production: this.produces,
            productionRate: this.productionRate,
            storage: this.storage,
            isOperational: this.isOperational,
            roadAccess: this.roadAccess,
            stats: this.stats
        };
    }

    /**
     * Sauvegarde l'état du bâtiment
     * @returns {Object}
     */
    save() {
        return {
            id: this.id,
            type: this.type,
            x: this.x,
            y: this.y,
            level: this.level,
            healthPoints: this.healthPoints,
            isActive: this.isActive,
            storage: this.storage,
            efficiency: this.efficiency,
            stats: this.stats,
            workers: this.workers.map(w => w.id),
            residents: this.residents.map(r => r.id)
        };
    }

    /**
     * Charge l'état du bâtiment
     * @param {Object} data - Données sauvegardées
     */
    load(data) {
        this.id = data.id || this.id;
        this.level = data.level || this.level;
        this.healthPoints = data.healthPoints || this.healthPoints;
        this.isActive = data.isActive !== undefined ? data.isActive : this.isActive;
        this.storage = data.storage || this.storage;
        this.efficiency = data.efficiency || this.efficiency;
        this.stats = data.stats || this.stats;
        
        // Les travailleurs et résidents seront reconnectés par le jeu
    }
}

// Classes spécialisées pour différents types de bâtiments

/**
 * Bâtiment de production de ressources
 */
class ProductionBuilding extends Building {
    constructor(type, x, y, game) {
        super(type, x, y, game);
        this.fieldRadius = 100; // Rayon pour chercher des ressources
    }

    applyWorkEffect(worker, efficiency) {
        // Production bonus basée sur l'efficacité du travailleur
        if (this.produces && Math.random() < 0.1) {
            const bonus = Math.floor(this.productionRate * efficiency * 0.1);
            this.game.resourceManager.addResource(this.produces, bonus);
        }
    }
}

/**
 * Bâtiment résidentiel
 */
class ResidentialBuilding extends Building {
    constructor(type, x, y, game) {
        super(type, x, y, game);
        this.comfortLevel = 50; // Niveau de confort fourni
    }

    update(deltaTime) {
        super.update(deltaTime);
        
        // Améliorer le bonheur des résidents
        this.residents.forEach(resident => {
            resident.needs.comfort = Math.min(100, resident.needs.comfort + 0.1);
            resident.needs.safety = Math.min(100, resident.needs.safety + 0.05);
        });
    }
}

/**
 * Bâtiment de recherche
 */
class ResearchBuilding extends Building {
    constructor(type, x, y, game) {
        super(type, x, y, game);
        this.researchSpeed = 1.0;
    }

    applyWorkEffect(worker, efficiency) {
        // Générer des points de recherche
        const researchPoints = efficiency * this.researchSpeed;
        this.game.resourceManager.addResource('research', researchPoints);
    }
}

export { Building, ProductionBuilding, ResidentialBuilding, ResearchBuilding };