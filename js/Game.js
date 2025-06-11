// js/Game.js - Classe principale corrigée pour le spawn des citoyens

import { EventSystem, GameEvents, eventSystem } from './core/EventSystem.js';
import { GameTime } from './core/GameTime.js';
import { ResourceManager } from './core/ResourceManager.js';
import { buildingDataManager } from './data/BuildingData.js';
import { ResearchSystem } from './systems/ResearchSystem.js';
import { PathfindingSystem } from './systems/PathfindingSystem.js';
import { ParticleSystem } from './systems/ProductionSystem.js';
import { UIManager } from './ui/UIManager.js';
import { NotificationSystem } from './ui/NotificationSystem.js';
import { Building, ProductionBuilding, ResidentialBuilding, ResearchBuilding } from './entities/Building.js';
import { Citizen } from './entities/Citizen.js';
import { GameRenderer } from './managers/GameRenderer.js';
import { GameStateManager } from './managers/GameStateManager.js';
import { GameEventHandler } from './managers/GameEventHandler.js';
import { GameDebugTools } from './managers/GameDebugTools.js';

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        // État du jeu
        this.isInitialized = false;
        this.isRunning = false;
        this.currentAge = 'prehistoric';
        this.gameVersion = '1.0.0';

        // Gestionnaires
        this.gameTime = new GameTime();
        this.resourceManager = new ResourceManager();
        this.buildingDataManager = buildingDataManager;
        this.researchSystem = new ResearchSystem(this);
        this.pathfindingSystem = new PathfindingSystem(this.canvas.width, this.canvas.height);
        this.particleSystem = new ParticleSystem(this.ctx);
        this.uiManager = new UIManager(this);
        this.notificationSystem = new NotificationSystem();
        this.renderer = new GameRenderer(this);
        this.stateManager = new GameStateManager(this);
        this.eventHandler = new GameEventHandler(this);
        this.debugTools = new GameDebugTools(this);

        // Collections
        this.citizens = [];
        this.buildings = [];
        this.vehicles = [];
        this.effects = [];

        // Interface
        this.selectedBuilding = null;
        this.selectedBuildingType = null;
        this.mouseX = 0;
        this.mouseY = 0;

        // Configuration
        this.config = {
            maxCitizens: 500,
            maxBuildings: 200,
            autosaveInterval: 300000,
            debugMode: false
        };

        // Statistiques
        this.stats = {
            gameStartTime: Date.now(),
            totalCitizensSpawned: 0,
            totalBuildingsBuilt: 0,
            currentAge: 'prehistoric',
            ageProgression: 0
        };

        // Intervalles d'attraction des citoyens (pour nettoyage)
        this.attractionIntervals = new Map();

        // Système anti-spam pour les notifications
        this.lastNotifications = {};
        this.lowHappinessWarned = false;

        this.initializeGame();
    }

    async initializeGame() {
        try {
            console.log('🎮 Initialisation de SupCity1...');

            await this.uiManager.initialize();
            this.eventHandler.setupEventListeners();
            this.startGameLoops();

            // Configuration initiale
            this.placeBuilding('fire', this.canvas.width / 2, this.canvas.height / 2);
            this.resourceManager.addResource('wood', 5);
            this.resourceManager.addResource('stone', 3);
            this.resourceManager.addResource('food', 10);
            this.resourceManager.addResource('water', 8);

            this.isInitialized = true;
            this.isRunning = true;

            console.log('✅ SupCity1 initialisé avec succès');

            // Test de spawn retardé pour vérifier le système
            setTimeout(() => {
                console.log('🧪 Test de spawn automatique retardé...');
                this.forceSpawnTestCitizen();
            }, 3000);

            eventSystem.emit(GameEvents.GAME_START, {
                version: this.gameVersion,
                timestamp: Date.now()
            });

        } catch (error) {
            console.error('❌ Erreur lors de l\'initialisation:', error);
        }
    }

    startGameLoops() {
        // Ajouter les callbacks avec gestion d'erreur
        this.gameTime.addUpdateCallback((deltaTime) => {
            try {
                this.stateManager.update(deltaTime);
                this.renderer.render();
            } catch (error) {
                console.error('❌ Erreur dans update/render:', error);
            }
        });

        this.gameTime.addTickCallback((deltaTime) => {
            try {
                this.fixedUpdate(deltaTime);
            } catch (error) {
                console.error('❌ Erreur dans fixedUpdate:', error);
            }
        });

        // Démarrer la boucle principale
        this.gameTime.start();

        // Sauvegarde automatique
        setInterval(() => {
            if (this.isRunning && !this.gameTime.isPaused) {
                this.saveGame('autosave');
            }
        }, this.config.autosaveInterval);
        
        console.log('✅ Boucles de jeu démarrées');
    }

    update(deltaTime) {
        this.stateManager.update(deltaTime);
    }

    fixedUpdate(deltaTime) {
        this.stateManager.fixedUpdate(deltaTime);
    }

    render() {
        this.renderer.render();
    }

    renderConstructionCursor() {
        this.renderer.renderConstructionCursor();
    }

    renderBuilding(building) {
        this.renderer.renderBuilding(building);
    }

    renderCitizen(citizen) {
        this.renderer.renderCitizen(citizen);
    }


    updateCitizens(deltaTime) {
        this.stateManager.updateCitizens(deltaTime);
    }

    updateBuildings(deltaTime) {
        this.stateManager.updateBuildings(deltaTime);
    }

    assignJobsToUnemployed() {
        this.stateManager.assignJobsToUnemployed();
    }

    checkGameBalance() {
        this.stateManager.checkGameBalance();
    }

    checkResourceBalance(p,r) {
        this.stateManager.checkResourceBalance(p,r);
    }

    checkProductionBalance(r) {
        this.stateManager.checkProductionBalance(r);
    }

    handleCanvasClick(event) {
        this.eventHandler.handleCanvasClick(event);
    }

    handleMouseMove(event) {
        this.eventHandler.handleMouseMove(event);
    }

    selectBuilding(type) {
        this.selectedBuildingType = type;
    }

    setSpeed(speed) {
        try {
            console.log(`🕒 Changement de vitesse demandé: ${speed}`);
            
            // Validation de la vitesse
            if (![0, 1, 2, 4].includes(speed)) {
                console.warn(`Vitesse invalide: ${speed}, utilisation de la vitesse par défaut (1)`);
                speed = 1;
            }

            // Sauvegarder l'état précédent pour debug
            const wasRunning = this.isRunning;
            const wasPaused = this.gameTime.isPaused;
            const oldSpeed = this.gameTime.speed;

            console.log(`État avant: running=${wasRunning}, paused=${wasPaused}, speed=${oldSpeed}`);

            // Gérer la mise en pause
            if (speed === 0) {
                this.gameTime.pause();
                console.log('🕒 Jeu mis en pause');
            } else {
                // Si le jeu était en pause, le reprendre
                if (this.gameTime.isPaused) {
                    this.gameTime.resume();
                    console.log('🕒 Jeu repris');
                }

                // Définir la nouvelle vitesse
                this.gameTime.speed = speed;
                console.log(`🕒 Vitesse du jeu définie à ${speed}x`);
            }

            // S'assurer que le jeu continue de tourner après changement de vitesse
            if (speed > 0 && this.isInitialized) {
                this.isRunning = true;
            }

            console.log(`État après: running=${this.isRunning}, paused=${this.gameTime.isPaused}, speed=${this.gameTime.speed}`);

            // Émettre un événement pour informer l'UI
            eventSystem.emit(GameEvents.GAME_SPEED_CHANGE, {
                oldSpeed,
                newSpeed: speed,
                timestamp: Date.now()
            });

        } catch (error) {
            console.error('❌ Erreur lors du changement de vitesse:', error);
            console.error('Stack trace:', error.stack);
            
            // Fallback sécurisé
            this.gameTime.speed = 1;
            this.gameTime.resume();
            this.isRunning = true;
            
            eventSystem.emit(GameEvents.UI_NOTIFICATION, {
                type: 'error',
                message: 'Erreur lors du changement de vitesse'
            });
        }
    }

    placeBuilding(type, x, y) {
        const buildingData = this.buildingDataManager.getBuildingData(type);
        if (!buildingData) {
            console.error(`❌ Type de bâtiment inconnu: ${type}`);
            return false;
        }

        // Arrondir les coordonnées pour un placement net (optionnel)
        const finalX = Math.round(x);
        const finalY = Math.round(y);

        console.log(`🏗️ Tentative de placement de ${type} à (${finalX}, ${finalY})`);

        // Vérifications de placement
        const canBuild = this.buildingDataManager.canBuild(
            type,
            this.resourceManager.getSummary(),
            this.researchSystem.getUnlockedResearch()
        );

        if (!canBuild.canBuild) {
            eventSystem.emit(GameEvents.UI_NOTIFICATION, {
                type: 'error',
                message: canBuild.reason
            });
            return false;
        }

        // Vérifier les collisions avec les coordonnées exactes
        if (this.checkBuildingCollision(finalX, finalY, buildingData.size)) {
            eventSystem.emit(GameEvents.UI_NOTIFICATION, {
                type: 'error',
                message: 'Emplacement occupé'
            });
            return false;
        }

        // Vérifier que le bâtiment reste dans les limites du canvas
        const halfSize = buildingData.size / 2;
        if (finalX - halfSize < 0 || finalX + halfSize > this.canvas.width ||
            finalY - halfSize < 0 || finalY + halfSize > this.canvas.height) {
            eventSystem.emit(GameEvents.UI_NOTIFICATION, {
                type: 'error',
                message: 'Emplacement hors limites'
            });
            return false;
        }

        // Consommer les ressources
        if (!this.resourceManager.consumeResources(buildingData.constructionCost)) {
            eventSystem.emit(GameEvents.UI_NOTIFICATION, {
                type: 'error',
                message: 'Ressources insuffisantes'
            });
            return false;
        }

        // Créer le bâtiment avec les coordonnées exactes
        const building = this.createBuilding(type, finalX, finalY);
        this.buildings.push(building);
        this.stats.totalBuildingsBuilt++;

        console.log(`✅ Bâtiment ${type} placé avec succès à (${finalX}, ${finalY})`);

        // Déselectionner le type de bâtiment
        this.selectedBuildingType = null;
        this.uiManager.clearBuildingSelection();

        // Émettre l'événement de placement
        eventSystem.emit(GameEvents.BUILDING_PLACED, { building });

        // Gestion spéciale pour le feu de camp
        if (type === 'fire') {
            console.log('🔍 Feu de camp placé, configuration de l\'attraction');
            
            // Définir les propriétés d'attraction
            building.attractsPeople = true;
            building.attractionRate = 0.02; // 2% de chance toutes les 2 secondes
            building.attractionRange = 200;
            
            this.startCitizenAttraction(building);

            // Spawn immédiat de 2 citoyens pour débloquer le jeu
            console.log('💡 Spawn immédiat de 2 citoyens de démarrage');
            for (let i = 0; i < 2; i++) {
                setTimeout(() => this.spawnCitizen(building.x, building.y, 150), i * 1000);
            }
        }

        return true;
    }

    createBuilding(type, x, y) {
        const buildingData = this.buildingDataManager.getBuildingData(type);

        if (buildingData.produces === 'research') {
            return new ResearchBuilding(type, x, y, this);
        } else if (buildingData.maxResidents > 0) {
            return new ResidentialBuilding(type, x, y, this);
        } else if (buildingData.produces) {
            return new ProductionBuilding(type, x, y, this);
        } else {
            return new Building(type, x, y, this);
        }
    }

    checkBuildingCollision(x, y, size) {
        const minDistance = 35;
        return this.buildings.some(building => {
            const distance = Math.sqrt((x - building.x) ** 2 + (y - building.y) ** 2);
            return distance < (size + building.size) / 2 + minDistance;
        });
    }

    startCitizenAttraction(building) {
        console.log(`👥 Début de l'attraction avec taux: ${building.attractionRate}, portée: ${building.attractionRange}`);

        // Vérifier et définir les propriétés par défaut si nécessaires
        if (!building.attractionRate) {
            console.warn('❌ building.attractionRate non défini, utilisation de la valeur par défaut');
            building.attractionRate = 0.01;
        }

        if (!building.attractionRange) {
            console.warn('❌ building.attractionRange non défini, utilisation de la valeur par défaut');
            building.attractionRange = 200;
        }

        // Créer l'intervalle d'attraction
        const attractInterval = setInterval(() => {
            // Vérifier si le bâtiment existe encore
            if (!this.buildings.includes(building)) {
                console.log('🚫 Bâtiment supprimé, arrêt de l\'attraction');
                clearInterval(attractInterval);
                this.attractionIntervals.delete(building.id);
                return;
            }

            // Vérifier les conditions de spawn
            if (this.citizens.length >= this.config.maxCitizens) {
                return;
            }

            // Calcul de la chance d'attraction
            const baseChance = building.attractionRate;
            const populationFactor = Math.max(0.1, 1 - (this.citizens.length / 50)); // Moins de chance si beaucoup de citoyens
            const finalChance = baseChance * populationFactor;

            const roll = Math.random();
            console.log(`💬 Vérification attraction: ${roll.toFixed(3)} < ${finalChance.toFixed(3)}? (${roll < finalChance ? 'OUI' : 'NON'})`);

            if (roll < finalChance) {
                console.log('💡 Conditions remplies pour spawner un citoyen!');
                const citizen = this.spawnCitizen(building.x, building.y, building.attractionRange);
                if (citizen) {
                    eventSystem.emit(GameEvents.UI_NOTIFICATION, {
                        type: 'success',
                        message: `${citizen.name} rejoint votre communauté !`
                    });
                }
            }

        }, 2000); // Vérifie toutes les 2 secondes

        // Stocker l'intervalle pour nettoyage ultérieur
        this.attractionIntervals.set(building.id, attractInterval);
        building.attractionInterval = attractInterval;
    }

    spawnCitizen(nearX, nearY, range = 100) {
        console.log(`💡 Tentative de spawn d'un citoyen près de (${nearX}, ${nearY}) avec portée ${range}`);

        if (this.citizens.length >= this.config.maxCitizens) {
            console.log(`⛔ Impossible de spawner: nombre max de citoyens atteint (${this.citizens.length}/${this.config.maxCitizens})`);
            return null;
        }

        try {
            // Calcul d'une position aléatoire autour du point
            const angle = Math.random() * Math.PI * 2;
            const distance = 30 + Math.random() * (range - 30);
            const x = nearX + Math.cos(angle) * distance;
            const y = nearY + Math.sin(angle) * distance;

            // S'assurer que la position est dans les limites du canvas
            const finalX = Math.max(30, Math.min(this.canvas.width - 30, x));
            const finalY = Math.max(30, Math.min(this.canvas.height - 30, y));

            console.log(`📍 Position calculée: (${finalX}, ${finalY})`);

            // Créer le citoyen
            const citizen = new Citizen(finalX, finalY, this);
            console.log(`👤 Citoyen créé: ${citizen.name} (ID: ${citizen.id})`);

            // Ajouter à la liste
            this.citizens.push(citizen);
            this.stats.totalCitizensSpawned++;

            console.log(`👥 Total des citoyens: ${this.citizens.length}, Spawned: ${this.stats.totalCitizensSpawned}`);

            // Émettre les événements
            eventSystem.emit(GameEvents.CITIZEN_SPAWNED, { citizen });

            return citizen;

        } catch (error) {
            console.error('❌ Erreur lors de la création d\'un citoyen:', error);
            console.error('Stack trace:', error.stack);
            return null;
        }
    }

    forceSpawnTestCitizen() {
        console.log('🧪 Force spawn d\'un citoyen de test');
        const x = this.canvas.width / 2 + (Math.random() - 0.5) * 100;
        const y = this.canvas.height / 2 + (Math.random() - 0.5) * 100;
        return this.spawnCitizen(x, y, 50);
    }

    selectObjectAt(x, y) {
        const building = this.findBuildingAt(x, y);
        if (building) {
            this.selectedBuilding = building;
            this.uiManager.showBuildingInfo(building);
            return;
        }

        const citizen = this.findCitizenAt(x, y);
        if (citizen) {
            this.uiManager.showCitizenInfo(citizen);
            return;
        }

        this.selectedBuilding = null;
        this.uiManager.clearSelection();
    }

    findBuildingAt(x, y, tolerance = 30) {
        return this.buildings.find(building => {
            const distance = Math.sqrt((x - building.x) ** 2 + (y - building.y) ** 2);
            return distance <= building.size / 2 + tolerance;
        }) || null;
    }

    findCitizenAt(x, y, tolerance = 15) {
        return this.citizens.find(citizen => {
            const distance = Math.sqrt((x - citizen.x) ** 2 + (y - citizen.y) ** 2);
            return distance <= tolerance;
        }) || null;
    }

    toggleDebug() {
        this.config.debugMode = !this.config.debugMode;
        this.uiManager.updateDebugDisplay(this.config.debugMode);
        console.log(`🐛 Mode debug: ${this.config.debugMode ? 'ACTIVÉ' : 'DÉSACTIVÉ'}`);
    }

    saveGame(slotName = 'manual') {
        const saveData = {
            version: this.gameVersion,
            timestamp: Date.now(),
            gameTime: this.gameTime.save(),
            resources: this.resourceManager.save(),
            citizens: this.citizens.map(c => c.save()),
            buildings: this.buildings.map(b => b.save()),
            research: this.researchSystem.save(),
            stats: this.stats,
            currentAge: this.currentAge
        };

        localStorage.setItem(`supcity_save_${slotName}`, JSON.stringify(saveData));
        eventSystem.emit(GameEvents.GAME_SAVE, { slotName });
        
        eventSystem.emit(GameEvents.UI_NOTIFICATION, {
            type: 'success',
            message: 'Jeu sauvegardé !'
        });
        
        return saveData;
    }

    loadGame(slotName = 'manual') {
        try {
            const saveData = localStorage.getItem(`supcity_save_${slotName}`);
            if (!saveData) {
                throw new Error('Aucune sauvegarde trouvée');
            }

            const data = JSON.parse(saveData);

            // Nettoyer les intervalles existants
            this.clearAttractionIntervals();

            this.gameTime.load(data.gameTime);
            this.resourceManager.load(data.resources);
            this.researchSystem.load(data.research);
            this.stats = { ...this.stats, ...data.stats };
            this.currentAge = data.currentAge || 'prehistoric';

            this.loadEntities(data);

            eventSystem.emit(GameEvents.GAME_LOAD, { slotName });
            
            eventSystem.emit(GameEvents.UI_NOTIFICATION, {
                type: 'success',
                message: 'Jeu chargé !'
            });
            
            return true;

        } catch (error) {
            console.error('❌ Erreur de chargement:', error);
            eventSystem.emit(GameEvents.UI_NOTIFICATION, {
                type: 'error',
                message: 'Erreur de chargement'
            });
            return false;
        }
    }

    loadEntities(data) {
        this.citizens = [];
        this.buildings = [];

        data.buildings.forEach(buildingData => {
            const building = this.createBuilding(buildingData.type, buildingData.x, buildingData.y);
            building.load(buildingData);
            this.buildings.push(building);

            // Redémarrer l'attraction pour les feux de camp
            if (building.type === 'fire') {
                building.attractsPeople = true;
                building.attractionRate = building.attractionRate || 0.02;
                building.attractionRange = building.attractionRange || 200;
                this.startCitizenAttraction(building);
            }
        });

        data.citizens.forEach(citizenData => {
            const citizen = new Citizen(citizenData.x, citizenData.y, this);
            citizen.load(citizenData);
            this.citizens.push(citizen);
        });

        this.reconnectEntityRelations(data);
    }

    reconnectEntityRelations(data) {
        data.buildings.forEach((buildingData, index) => {
            const building = this.buildings[index];

            if (buildingData.workers) {
                buildingData.workers.forEach(workerId => {
                    const worker = this.citizens.find(c => c.id === workerId);
                    if (worker) {
                        building.addWorker(worker);
                    }
                });
            }
        });
    }

    clearAttractionIntervals() {
        // Nettoyer tous les intervalles d'attraction
        this.attractionIntervals.forEach((interval, buildingId) => {
            clearInterval(interval);
        });
        this.attractionIntervals.clear();
    }

    resetGame() {
        if (!confirm('Recommencer ? Tous vos progrès seront perdus !')) {
            return;
        }

        // Nettoyer les intervalles
        this.clearAttractionIntervals();

        // Reset du système anti-spam de notifications
        this.lastNotifications = {};
        this.lowHappinessWarned = false;

        this.citizens = [];
        this.buildings = [];
        this.vehicles = [];
        this.effects = [];

        this.resourceManager.reset();
        this.gameTime.reset();
        this.researchSystem.reset();

        // Nettoyer les notifications existantes
        if (this.notificationSystem && this.notificationSystem.clear) {
            this.notificationSystem.clear();
        }

        this.stats = {
            gameStartTime: Date.now(),
            totalCitizensSpawned: 0,
            totalBuildingsBuilt: 0,
            currentAge: 'prehistoric',
            ageProgression: 0
        };

        // Recréer setup initial
        this.placeBuilding('fire', this.canvas.width / 2, this.canvas.height / 2);
        this.resourceManager.addResource('wood', 5);
        this.resourceManager.addResource('stone', 3);
        this.resourceManager.addResource('food', 10);
        this.resourceManager.addResource('water', 8);

        eventSystem.emit(GameEvents.GAME_RESET, { timestamp: Date.now() });
        
        eventSystem.emit(GameEvents.UI_NOTIFICATION, {
            type: 'info',
            message: 'Nouvelle partie commencée !'
        });
    }
    onCitizenDied(event) {
        this.eventHandler.onCitizenDied(event);
    }

    onBuildingPlaced(event) {
        this.eventHandler.onBuildingPlaced(event);
    }

    getGameStats() {
        return {
            ...this.stats,
            runtime: Date.now() - this.stats.gameStartTime,
            population: this.citizens.length,
            buildings: this.buildings.length,
            resources: this.resourceManager.getSummary(),
            fps: this.gameTime.fps,
            
            // Statistiques détaillées
            performance: {
                frameTime: this.gameTime.averageDeltaTime,
                updateTime: 0, // À implémenter si nécessaire
                renderTime: 0  // À implémenter si nécessaire
            },
            
            // Statistiques des citoyens
            citizenStats: {
                total: this.citizens.length,
                employed: this.citizens.filter(c => c.job).length,
                unemployed: this.citizens.filter(c => !c.job).length,
                averageHappiness: this.citizens.length > 0 ? 
                    Math.round(this.citizens.reduce((sum, c) => sum + c.happiness, 0) / this.citizens.length) : 100
            },
            
            // Statistiques des bâtiments
            buildingStats: {
                total: this.buildings.length,
                byType: this.getBuildingCountByType(),
                withWorkers: this.buildings.filter(b => b.workers && b.workers.length > 0).length
            }
        };
    }

    getBuildingCountByType() {
        const counts = {};
        this.buildings.forEach(building => {
            counts[building.type] = (counts[building.type] || 0) + 1;
        });
        return counts;
    }

    // Méthodes utilitaires pour le debug et les tests
    debugInfo() {
        console.group('🐛 Debug Info - SupCity1');
        console.log('État du jeu:', {
            isRunning: this.isRunning,
            isInitialized: this.isInitialized,
            speed: this.gameTime.speed,
            isPaused: this.gameTime.isPaused
        });
        console.log('Collections:', {
            citizens: this.citizens.length,
            buildings: this.buildings.length,
            attractionIntervals: this.attractionIntervals.size
        });
        console.log('Ressources:', this.resourceManager.getSummary());
        console.groupEnd();
    }

    // Commandes de test pour le développement
    testSpawnCitizens(count = 5) {
        console.log(`🧪 Test: Spawn de ${count} citoyens`);
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                this.spawnCitizen(centerX, centerY, 100);
            }, i * 200);
        }
    }

    testBuildingPlacement(type = 'hut', count = 3) {
        console.log(`🧪 Test: Placement de ${count} ${type}`);
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const distance = 100 + i * 50;
            const x = centerX + Math.cos(angle) * distance;
            const y = centerY + Math.sin(angle) * distance;
            
            setTimeout(() => {
                this.placeBuilding(type, x, y);
            }, i * 300);
        }
    }

    // Nettoyage lors de la destruction de l'instance
    destroy() {
        console.log('🧹 Nettoyage de l\'instance Game');
        
        // Nettoyer tous les intervalles
        this.clearAttractionIntervals();
        
        // Arrêter les boucles de jeu
        this.isRunning = false;
        
        // Nettoyer les événements
        eventSystem.removeAllListeners();
        
        console.log('✅ Instance Game nettoyée');
    }
}

// Export de la classe
export { Game };