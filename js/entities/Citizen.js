// js/entities/Citizen.js - Classe représentant un citoyen

/**
 * Représente un citoyen avec ses besoins, son travail et son comportement
 */
class Citizen {
    constructor(x, y, game) {
        // Position et mouvement
        this.x = x;
        this.y = y;
        this.targetX = x;
        this.targetY = y;
        this.speed = 0.8 + Math.random() * 0.4; // Vitesse variable
        this.direction = 0;
        this.path = [];
        this.currentPathIndex = 0;
        
        // Référence au jeu
        this.game = game;
        
        // Identité et caractéristiques
        this.id = this.generateId();
        this.name = this.generateName();
        this.age = Math.random() * 30 + 18; // Entre 18 et 48 ans
        this.gender = Math.random() < 0.5 ? 'male' : 'female';
        this.personality = this.generatePersonality();
        
        // Besoins vitaux (0-100)
        this.needs = {
            hunger: 100,          // Faim
            thirst: 100,          // Soif
            sleep: 100,           // Sommeil
            social: 100,          // Socialisation
            safety: 100,          // Sécurité
            comfort: 100          // Confort
        };
        
        // Taux de déclin des besoins (par seconde)
        this.needsDecay = {
            hunger: 0.02,
            thirst: 0.03,
            sleep: 0.015,
            social: 0.01,
            safety: 0.005,
            comfort: 0.008
        };
        
        // État et comportement
        this.state = 'wandering';        // État actuel
        this.lastState = 'wandering';    // État précédent
        this.stateTime = 0;              // Temps dans l'état actuel
        this.happiness = 100;            // Bonheur global
        this.energy = 100;               // Énergie actuelle
        this.health = 100;               // Santé
        
        // Travail et économie
        this.job = null;                 // Bâtiment de travail
        this.workplace = null;           // Position de travail
        this.workEfficiency = 0.5 + Math.random() * 0.5; // Efficacité au travail
        this.workExperience = 0;         // Expérience de travail
        this.salary = 0;                 // Salaire (pour plus tard)
        
        // Logement
        this.home = null;                // Bâtiment résidentiel
        this.homelessTime = 0;           // Temps sans logement
        
        // Timers et cooldowns
        this.workCooldown = 0;
        this.needsCooldown = 0;
        this.socialCooldown = 0;
        this.pathfindingCooldown = 0;
        
        // Animation et visuel
        this.size = 4 + Math.random() * 2;
        this.animation = Math.random() * Math.PI * 2;
        this.walkCycle = 0;
        this.color = this.generateColor();
        
        // Statistiques et historique
        this.stats = {
            timeAlive: 0,
            timesWorked: 0,
            resourcesProduced: 0,
            distanceTraveled: 0,
            socialInteractions: 0
        };
        
        // États possibles et leurs priorités
        this.statePriorities = {
            dying: 1000,
            sleeping: 900,
            critical_need: 800,
            emergency: 700,
            seeking_food: 600,
            seeking_water: 580,
            seeking_home: 500,
            working: 400,
            socializing: 300,
            wandering: 200,
            resting: 100
        };

        this.initializeCitizen();
    }

    /**
     * Initialise le citoyen
     */
    initializeCitizen() {
        // Ajuster les besoins selon la personnalité
        this.applyPersonalityToNeeds();
        
        // Émettre un événement de création
        eventSystem.emit(GameEvents.CITIZEN_SPAWNED, {
            citizen: this,
            position: { x: this.x, y: this.y }
        });
    }

    /**
     * Met à jour le citoyen
     * @param {number} deltaTime - Temps écoulé en millisecondes
     * @returns {boolean} - True si le citoyen est toujours vivant
     */
    update(deltaTime) {
        const deltaSeconds = deltaTime / 1000;
        
        // Mise à jour des statistiques
        this.stats.timeAlive += deltaSeconds;
        this.stateTime += deltaSeconds;
        
        // Vieillissement
        this.age += deltaSeconds / (365 * 24 * 3600); // Vieillissement réaliste
        
        // Déclin des besoins
        this.updateNeeds(deltaSeconds);
        
        // Calcul du bonheur et de l'énergie
        this.updateHappinessAndEnergy();
        
        // Mise à jour de l'état
        this.updateState();
        
        // Mouvement et pathfinding
        this.updateMovement(deltaSeconds);
        
        // Animation
        this.updateAnimation(deltaSeconds);
        
        // Cooldowns
        this.updateCooldowns(deltaSeconds);
        
        // Vérifier la survie
        return this.checkSurvival();
    }

    /**
     * Met à jour les besoins du citoyen
     * @param {number} deltaSeconds - Temps en secondes
     */
    updateNeeds(deltaSeconds) {
        Object.entries(this.needs).forEach(([need, value]) => {
            const decayRate = this.needsDecay[need] * this.getDecayModifier(need);
            this.needs[need] = Math.max(0, value - decayRate * deltaSeconds);
        });

        // Effets spéciaux des besoins bas
        if (this.needs.hunger < 20) {
            this.energy = Math.max(0, this.energy - deltaSeconds * 2);
        }
        if (this.needs.thirst < 15) {
            this.health = Math.max(0, this.health - deltaSeconds * 3);
        }
        if (this.needs.sleep < 10) {
            this.workEfficiency *= 0.98;
        }
    }

    /**
     * Obtient le modificateur de déclin pour un besoin
     * @param {string} need - Type de besoin
     * @returns {number}
     */
    getDecayModifier(need) {
        let modifier = 1;
        
        // Modifier selon la personnalité
        if (this.personality.traits.includes('energetic') && need === 'sleep') {
            modifier *= 0.8;
        }
        if (this.personality.traits.includes('social') && need === 'social') {
            modifier *= 1.3;
        }
        
        // Modifier selon l'âge
        if (this.age > 40) {
            modifier *= 1.1;
        }
        
        // Modifier selon la santé
        if (this.health < 50) {
            modifier *= 1.2;
        }
        
        return modifier;
    }

    /**
     * Met à jour le bonheur et l'énergie
     */
    updateHappinessAndEnergy() {
        // Calcul du bonheur basé sur les besoins
        const needsAverage = Object.values(this.needs).reduce((sum, val) => sum + val, 0) / Object.keys(this.needs).length;
        
        // Facteurs additionnels
        let happinessModifiers = 0;
        
        if (this.home) happinessModifiers += 10;
        if (this.job) happinessModifiers += 15;
        if (this.health > 80) happinessModifiers += 5;
        if (this.homelessTime > 100) happinessModifiers -= 20;
        
        this.happiness = Math.max(0, Math.min(100, needsAverage + happinessModifiers));
        
        // Calcul de l'énergie
        this.energy = Math.max(0, Math.min(100, 
            (this.needs.sleep * 0.4) + 
            (this.needs.hunger * 0.3) + 
            (this.health * 0.3)
        ));
    }

    /**
     * Met à jour l'état du citoyen selon ses priorités
     */
    updateState() {
        const newState = this.determineOptimalState();
        
        if (newState !== this.state) {
            this.changeState(newState);
        }
        
        // Exécuter l'action de l'état actuel
        this.executeStateAction();
    }

    /**
     * Détermine l'état optimal selon les priorités
     * @returns {string}
     */
    determineOptimalState() {
        // États critiques
        if (this.health <= 0 || this.energy <= 0) {
            return 'dying';
        }
        
        if (this.needs.sleep < 20 && this.stateTime > 60) {
            return 'sleeping';
        }
        
        if (this.needs.hunger < 30) {
            return 'seeking_food';
        }
        
        if (this.needs.thirst < 25) {
            return 'seeking_water';
        }
        
        if (!this.home && this.homelessTime > 30) {
            return 'seeking_home';
        }
        
        // États de travail
        if (this.job && this.energy > 30 && this.workCooldown <= 0) {
            return 'working';
        }
        
        // États sociaux
        if (this.needs.social < 60 && this.socialCooldown <= 0) {
            return 'socializing';
        }
        
        // États par défaut
        if (this.energy < 40) {
            return 'resting';
        }
        
        return 'wandering';
    }

    /**
     * Change l'état du citoyen
     * @param {string} newState - Nouvel état
     */
    changeState(newState) {
        this.lastState = this.state;
        this.state = newState;
        this.stateTime = 0;
        
        // Actions spécifiques au changement d'état
        this.onStateChange(this.lastState, newState);
    }

    /**
     * Actions lors d'un changement d'état
     * @param {string} oldState - Ancien état
     * @param {string} newState - Nouvel état
     */
    onStateChange(oldState, newState) {
        // Réinitialiser le chemin lors d'un changement d'état
        this.path = [];
        this.currentPathIndex = 0;
        
        // Actions spécifiques
        switch (newState) {
            case 'working':
                if (this.job) {
                    this.setTarget(this.job.x, this.job.y);
                }
                break;
                
            case 'seeking_food':
                this.findNearestResource('food');
                break;
                
            case 'seeking_water':
                this.findNearestResource('water');
                break;
                
            case 'seeking_home':
                this.findAvailableHome();
                break;
                
            case 'socializing':
                this.findSocialTarget();
                break;
                
            case 'wandering':
                this.setRandomTarget();
                break;
        }
    }

    /**
     * Exécute l'action de l'état actuel
     */
    executeStateAction() {
        switch (this.state) {
            case 'working':
                this.performWork();
                break;
                
            case 'seeking_food':
                this.consumeResourceAtTarget('food');
                break;
                
            case 'seeking_water':
                this.consumeResourceAtTarget('water');
                break;
                
            case 'sleeping':
                this.sleep();
                break;
                
            case 'socializing':
                this.socialize();
                break;
                
            case 'resting':
                this.rest();
                break;
                
            case 'dying':
                return false; // Le citoyen meurt
        }
        
        return true;
    }

    /**
     * Travaille si proche du lieu de travail
     */
    performWork() {
        if (!this.job) {
            this.state = 'wandering';
            return;
        }
        
        const distance = this.getDistanceTo(this.job.x, this.job.y);
        
        if (distance < 40 && this.workCooldown <= 0) {
            // Effectuer le travail
            const efficiency = this.workEfficiency * (this.energy / 100);
            this.job.work(this, efficiency);
            
            this.workCooldown = 120; // 2 minutes de cooldown
            this.workExperience += 0.1;
            this.stats.timesWorked++;
            
            // Réduire l'énergie
            this.energy = Math.max(0, this.energy - 5);
            
            // Augmenter légèrement le bonheur si on aime son travail
            if (this.personality.traits.includes('hardworking')) {
                this.happiness = Math.min(100, this.happiness + 1);
            }
        }
    }

    /**
     * Consomme une ressource si à proximité de la cible
     * @param {string} resourceType - Type de ressource
     */
    consumeResourceAtTarget(resourceType) {
        if (!this.targetX || !this.targetY) return;
        
        const distance = this.getDistanceTo(this.targetX, this.targetY);
        
        if (distance < 30) {
            // Vérifier s'il y a une source de ressource
            const source = this.game.findBuildingAt(this.targetX, this.targetY, 40);
            
            if (source && source.produces === resourceType && this.game.resourceManager.hasResource(resourceType, 1)) {
                this.game.resourceManager.removeResource(resourceType, 1);
                
                // Restaurer le besoin
                if (resourceType === 'food') {
                    this.needs.hunger = Math.min(100, this.needs.hunger + 50);
                    this.needs.comfort += 5;
                } else if (resourceType === 'water') {
                    this.needs.thirst = Math.min(100, this.needs.thirst + 60);
                    this.needs.comfort += 3;
                }
                
                // Retourner à l'errance
                this.state = 'wandering';
            }
        }
    }

    /**
     * Dormir pour récupérer
     */
    sleep() {
        this.needs.sleep = Math.min(100, this.needs.sleep + 2);
        this.energy = Math.min(100, this.energy + 1);
        
        if (this.needs.sleep > 80) {
            this.state = 'wandering';
        }
    }

    /**
     * Socialiser avec d'autres citoyens
     */
    socialize() {
        // Chercher d'autres citoyens à proximité
        const nearbyCitizens = this.game.citizens.filter(citizen => 
            citizen !== this && 
            this.getDistanceTo(citizen.x, citizen.y) < 50
        );
        
        if (nearbyCitizens.length > 0) {
            this.needs.social = Math.min(100, this.needs.social + 1);
            this.socialCooldown = 180; // 3 minutes
            this.stats.socialInteractions++;
            
            if (this.needs.social > 70) {
                this.state = 'wandering';
            }
        } else {
            // Chercher un lieu social
            this.findSocialBuilding();
        }
    }

    /**
     * Se reposer pour récupérer de l'énergie
     */
    rest() {
        this.energy = Math.min(100, this.energy + 0.5);
        this.needs.comfort = Math.min(100, this.needs.comfort + 0.3);
        
        if (this.energy > 60) {
            this.state = 'wandering';
        }
    }

    /**
     * Trouve la ressource la plus proche
     * @param {string} resourceType - Type de ressource recherchée
     */
    findNearestResource(resourceType) {
        const buildings = this.game.buildings.filter(building => 
            building.produces === resourceType && building.isOperational()
        );
        
        if (buildings.length > 0) {
            const nearest = this.findNearestBuilding(buildings);
            this.setTarget(nearest.x + Math.random() * 40 - 20, nearest.y + Math.random() * 40 - 20);
        } else {
            this.setRandomTarget();
        }
    }

    /**
     * Trouve un logement disponible
     */
    findAvailableHome() {
        const homes = this.game.buildings.filter(building => 
            building.type === 'housing' && building.hasAvailableSpace()
        );
        
        if (homes.length > 0) {
            const nearest = this.findNearestBuilding(homes);
            this.setTarget(nearest.x, nearest.y);
            
            // Tenter de s'installer
            if (this.getDistanceTo(nearest.x, nearest.y) < 30) {
                if (nearest.addResident(this)) {
                    this.home = nearest;
                    this.homelessTime = 0;
                    this.needs.safety = 100;
                    this.needs.comfort = 80;
                }
            }
        } else {
            this.homelessTime += this.stateTime;
            this.setRandomTarget();
        }
    }

    /**
     * Trouve un bâtiment pour socialiser
     */
    findSocialBuilding() {
        const socialBuildings = this.game.buildings.filter(building => 
            building.type === 'market' || building.type === 'tavern' || building.type === 'square'
        );
        
        if (socialBuildings.length > 0) {
            const target = this.findNearestBuilding(socialBuildings);
            this.setTarget(target.x + Math.random() * 50 - 25, target.y + Math.random() * 50 - 25);
        } else {
            this.setRandomTarget();
        }
    }

    /**
     * Trouve le bâtiment le plus proche dans une liste
     * @param {Array} buildings - Liste des bâtiments
     * @returns {Object} - Bâtiment le plus proche
     */
    findNearestBuilding(buildings) {
        let nearest = null;
        let minDistance = Infinity;
        
        buildings.forEach(building => {
            const distance = this.getDistanceTo(building.x, building.y);
            if (distance < minDistance) {
                minDistance = distance;
                nearest = building;
            }
        });
        
        return nearest;
    }

    /**
     * Définit une cible aléatoire
     */
    setRandomTarget() {
        const margin = 50;
        this.setTarget(
            margin + Math.random() * (this.game.canvas.width - 2 * margin),
            margin + Math.random() * (this.game.canvas.height - 2 * margin)
        );
    }

    /**
     * Définit une nouvelle cible
     * @param {number} x - Position X
     * @param {number} y - Position Y
     */
    setTarget(x, y) {
        this.targetX = x;
        this.targetY = y;
        
        // Réinitialiser le pathfinding
        this.path = [];
        this.currentPathIndex = 0;
        this.pathfindingCooldown = 0;
    }

    /**
     * Met à jour le mouvement du citoyen
     * @param {number} deltaSeconds - Temps en secondes
     */
    updateMovement(deltaSeconds) {
        if (!this.targetX || !this.targetY) {
            this.setRandomTarget();
            return;
        }
        
        // Pathfinding si nécessaire
        if (this.path.length === 0 && this.pathfindingCooldown <= 0) {
            this.requestPathfinding();
            this.pathfindingCooldown = 1; // 1 seconde de cooldown
        }
        
        // Mouvement le long du chemin
        if (this.path.length > 0) {
            this.followPath(deltaSeconds);
        } else {
            // Mouvement direct si pas de chemin
            this.moveToTarget(deltaSeconds);
        }
        
        // Mettre à jour les statistiques de distance
        const movementDistance = this.speed * deltaSeconds;
        this.stats.distanceTraveled += movementDistance;
    }

    /**
     * Demande un pathfinding au système
     */
    requestPathfinding() {
        if (this.game.pathfindingSystem) {
            const path = this.game.pathfindingSystem.findPath(
                { x: Math.floor(this.x), y: Math.floor(this.y) },
                { x: Math.floor(this.targetX), y: Math.floor(this.targetY) }
            );
            
            if (path && path.length > 1) {
                this.path = path;
                this.currentPathIndex = 0;
            }
        }
    }

    /**
     * Suit le chemin calculé
     * @param {number} deltaSeconds - Temps en secondes
     */
    followPath(deltaSeconds) {
        if (this.currentPathIndex >= this.path.length) {
            this.path = [];
            return;
        }
        
        const currentTarget = this.path[this.currentPathIndex];
        const distance = this.getDistanceTo(currentTarget.x, currentTarget.y);
        
        if (distance < 5) {
            this.currentPathIndex++;
            return;
        }
        
        this.moveTowards(currentTarget.x, currentTarget.y, deltaSeconds);
    }

    /**
     * Mouvement direct vers la cible
     * @param {number} deltaSeconds - Temps en secondes
     */
    moveToTarget(deltaSeconds) {
        this.moveTowards(this.targetX, this.targetY, deltaSeconds);
    }

    /**
     * Bouge vers une position
     * @param {number} targetX - Position X cible
     * @param {number} targetY - Position Y cible
     * @param {number} deltaSeconds - Temps en secondes
     */
    moveTowards(targetX, targetY, deltaSeconds) {
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 1) {
            const speedModifier = this.getSpeedModifier();
            const actualSpeed = this.speed * speedModifier;
            
            this.x += (dx / distance) * actualSpeed * deltaSeconds * 60; // 60 pour ajuster à l'écran
            this.y += (dy / distance) * actualSpeed * deltaSeconds * 60;
            this.direction = Math.atan2(dy, dx);
            
            // Animation de marche
            this.walkCycle += deltaSeconds * 8;
        }
    }

    /**
     * Obtient le modificateur de vitesse selon l'état
     * @returns {number}
     */
    getSpeedModifier() {
        let modifier = 1;
        
        // Modificateurs selon l'état
        if (this.state === 'seeking_food' && this.needs.hunger < 20) modifier *= 1.5;
        if (this.state === 'seeking_water' && this.needs.thirst < 15) modifier *= 1.8;
        if (this.energy < 30) modifier *= 0.6;
        if (this.health < 50) modifier *= 0.7;
        if (this.age > 50) modifier *= 0.8;
        
        // Modificateurs de personnalité
        if (this.personality.traits.includes('energetic')) modifier *= 1.2;
        if (this.personality.traits.includes('lazy')) modifier *= 0.8;
        
        return modifier;
    }

    /**
     * Met à jour l'animation du citoyen
     * @param {number} deltaSeconds - Temps en secondes
     */
    updateAnimation(deltaSeconds) {
        this.animation += deltaSeconds;
        
        // Animation selon l'état
        switch (this.state) {
            case 'working':
                this.animation += deltaSeconds * 2; // Animation plus rapide au travail
                break;
            case 'sleeping':
                this.animation += deltaSeconds * 0.5; // Animation lente en dormant
                break;
        }
    }

    /**
     * Met à jour les cooldowns
     * @param {number} deltaSeconds - Temps en secondes
     */
    updateCooldowns(deltaSeconds) {
        this.workCooldown = Math.max(0, this.workCooldown - deltaSeconds);
        this.needsCooldown = Math.max(0, this.needsCooldown - deltaSeconds);
        this.socialCooldown = Math.max(0, this.socialCooldown - deltaSeconds);
        this.pathfindingCooldown = Math.max(0, this.pathfindingCooldown - deltaSeconds);
    }

    /**
     * Vérifie la survie du citoyen
     * @returns {boolean} - True si vivant
     */
    checkSurvival() {
        // Conditions de mort
        if (this.health <= 0) {
            this.die('health');
            return false;
        }
        
        if (this.needs.hunger <= 0 && this.needs.thirst <= 0) {
            this.die('starvation');
            return false;
        }
        
        if (this.age > 80 && Math.random() < 0.001) {
            this.die('old_age');
            return false;
        }
        
        return true;
    }

    /**
     * Fait mourir le citoyen
     * @param {string} cause - Cause de la mort
     */
    die(cause) {
        // Libérer le travail
        if (this.job) {
            this.job.removeWorker(this);
        }
        
        // Libérer le logement
        if (this.home) {
            this.home.removeResident(this);
        }
        
        // Émettre un événement de mort
        eventSystem.emit(GameEvents.CITIZEN_DIED, {
            citizen: this,
            cause,
            stats: this.stats
        });
    }

    /**
     * Assigne un travail au citoyen
     * @param {Object} building - Bâtiment de travail
     * @returns {boolean} - True si assigné avec succès
     */
    assignJob(building) {
        if (this.job || !building.needsWorkers()) {
            return false;
        }
        
        this.job = building;
        building.addWorker(this);
        
        eventSystem.emit(GameEvents.CITIZEN_JOB_ASSIGNED, {
            citizen: this,
            building: building
        });
        
        return true;
    }

    /**
     * Retire le travail du citoyen
     */
    removeJob() {
        if (this.job) {
            const oldJob = this.job;
            this.job.removeWorker(this);
            this.job = null;
            
            eventSystem.emit(GameEvents.CITIZEN_JOB_LOST, {
                citizen: this,
                building: oldJob
            });
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
     * Génère un ID unique pour le citoyen
     * @returns {string}
     */
    generateId() {
        return `citizen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Génère un nom aléatoire
     * @returns {string}
     */
    generateName() {
        const firstNames = [
            'Alex', 'Sam', 'Jordan', 'Casey', 'Riley', 'Morgan', 'Avery', 'Quinn',
            'Emery', 'Sage', 'River', 'Rowan', 'Phoenix', 'Blake', 'Drew', 'Hayden'
        ];
        
        const lastNames = [
            'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller',
            'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez'
        ];
        
        const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
        const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
        
        return `${firstName} ${lastName}`;
    }

    /**
     * Génère une personnalité aléatoire
     * @returns {Object}
     */
    generatePersonality() {
        const traits = ['hardworking', 'lazy', 'social', 'shy', 'energetic', 'calm', 'optimistic', 'pessimistic'];
        const selectedTraits = [];
        
        // Sélectionner 2-3 traits aléatoires
        const numTraits = 2 + Math.floor(Math.random() * 2);
        for (let i = 0; i < numTraits; i++) {
            const trait = traits[Math.floor(Math.random() * traits.length)];
            if (!selectedTraits.includes(trait)) {
                selectedTraits.push(trait);
            }
        }
        
        return {
            traits: selectedTraits,
            workEthic: Math.random(),
            sociability: Math.random(),
            adaptability: Math.random()
        };
    }

    /**
     * Applique la personnalité aux besoins
     */
    applyPersonalityToNeeds() {
        if (this.personality.traits.includes('social')) {
            this.needsDecay.social *= 1.5;
        }
        if (this.personality.traits.includes('energetic')) {
            this.needsDecay.sleep *= 0.8;
        }
        if (this.personality.traits.includes('lazy')) {
            this.needsDecay.comfort *= 0.7;
        }
    }

    /**
     * Génère une couleur pour le citoyen
     * @returns {Object}
     */
    generateColor() {
        const skinTones = ['#FDBCB4', '#F1C27D', '#E0AC69', '#C68642', '#8D5524', '#654321'];
        const clothColors = ['#4169E1', '#228B22', '#FF6347', '#DDA0DD', '#F0E68C', '#20B2AA'];
        
        return {
            skin: skinTones[Math.floor(Math.random() * skinTones.length)],
            cloth: clothColors[Math.floor(Math.random() * clothColors.length)],
            hair: this.generateHairColor()
        };
    }

    /**
     * Génère une couleur de cheveux
     * @returns {string}
     */
    generateHairColor() {
        const hairColors = ['#654321', '#2F1B14', '#8B4513', '#DAA520', '#B22222', '#000000', '#8B8B8B'];
        return hairColors[Math.floor(Math.random() * hairColors.length)];
    }

    /**
     * Obtient les informations du citoyen pour l'interface
     * @returns {Object}
     */
    getInfo() {
        return {
            id: this.id,
            name: this.name,
            age: Math.floor(this.age),
            state: this.state,
            happiness: Math.round(this.happiness),
            energy: Math.round(this.energy),
            health: Math.round(this.health),
            needs: Object.fromEntries(
                Object.entries(this.needs).map(([key, value]) => [key, Math.round(value)])
            ),
            job: this.job ? this.job.type : 'Chômeur',
            home: this.home ? 'Oui' : 'Sans-abri',
            personality: this.personality.traits,
            stats: this.stats
        };
    }

    /**
     * Sauvegarde l'état du citoyen
     * @returns {Object}
     */
    save() {
        return {
            id: this.id,
            name: this.name,
            x: this.x,
            y: this.y,
            age: this.age,
            gender: this.gender,
            personality: this.personality,
            needs: this.needs,
            state: this.state,
            happiness: this.happiness,
            energy: this.energy,
            health: this.health,
            workExperience: this.workExperience,
            stats: this.stats,
            color: this.color
        };
    }

    /**
     * Charge l'état du citoyen
     * @param {Object} data - Données sauvegardées
     */
    load(data) {
        this.id = data.id || this.id;
        this.name = data.name || this.name;
        this.x = data.x || this.x;
        this.y = data.y || this.y;
        this.age = data.age || this.age;
        this.gender = data.gender || this.gender;
        this.personality = data.personality || this.personality;
        this.needs = data.needs || this.needs;
        this.state = data.state || this.state;
        this.happiness = data.happiness || this.happiness;
        this.energy = data.energy || this.energy;
        this.health = data.health || this.health;
        this.workExperience = data.workExperience || this.workExperience;
        this.stats = data.stats || this.stats;
        this.color = data.color || this.color;
    }
}

// Export pour utilisation dans d'autres modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Citizen;
} else {
    window.Citizen = Citizen;
}