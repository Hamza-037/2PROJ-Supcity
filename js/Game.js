// js/Game.js - Classe principale simplifiée

// Imports des modules nécessaires
import { EventSystem, GameEvents, eventSystem } from './core/EventSystem.js';
import { GameTime } from './core/GameTime.js';
import { ResourceManager } from './core/ResourceManager.js';
import { buildingDataManager } from './data/BuildingData.js';
import { ResearchSystem } from './systems/ResearchSystem.js';
import { PathfindingSystem } from './systems/PathfindingSystem.js';
import { ParticleSystem } from './systems/ProductionSystem.js';
import { UIManager } from './ui/UIManager.js';
import { Building, ProductionBuilding, ResidentialBuilding, ResearchBuilding } from './entities/Building.js';
import { Citizen } from './entities/Citizen.js';

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

        this.initializeGame();
    }

    async initializeGame() {
        try {
            console.log('🎮 Initialisation de SupCity1...');
            
            await this.uiManager.initialize();
            this.setupEventListeners();
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
            
            // IMPORTANT: Test de débogage pour vérifier si la classe Citizen fonctionne
            try {
                console.log('🧵 TEST: Création d\'un citoyen de test dans l\'initialisation...');
                const testCitizen = new Citizen(this.canvas.width / 2, this.canvas.height / 2, this);
                this.citizens.push(testCitizen);
                console.log('✅ TEST: Citoyen créé avec succès:', testCitizen);
            } catch (error) {
                console.error('❌ TEST: Erreur lors de la création d\'un citoyen:', error);
            }
            
            eventSystem.emit(GameEvents.GAME_START, {
                version: this.gameVersion,
                timestamp: Date.now()
            });
            
        } catch (error) {
            console.error('❌ Erreur lors de l\'initialisation:', error);
        }
    }

    setupEventListeners() {
        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        
        eventSystem.on(GameEvents.CITIZEN_DIED, (e) => this.onCitizenDied(e));
        eventSystem.on(GameEvents.BUILDING_PLACED, (e) => this.onBuildingPlaced(e));
    }

    startGameLoops() {
        this.gameTime.addUpdateCallback((deltaTime) => {
            this.update(deltaTime);
            this.render();
        });
        
        this.gameTime.addTickCallback((deltaTime) => {
            this.fixedUpdate(deltaTime);
        });
        
        // Sauvegarde automatique
        setInterval(() => {
            if (this.isRunning) {
                this.saveGame('autosave');
            }
        }, this.config.autosaveInterval);
    }

    update(deltaTime) {
        if (!this.isRunning) return;
        
        // Mettre à jour les entités
        this.updateCitizens(deltaTime);
        this.updateBuildings(deltaTime);
        this.particleSystem.update(deltaTime);
        
        // Assigner des emplois
        this.assignJobsToUnemployed();
    }

    fixedUpdate(deltaTime) {
        this.resourceManager.update();
        this.researchSystem.update(deltaTime);
        this.checkGameBalance();
        eventSystem.processQueue();
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Fond
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#87CEEB');
        gradient.addColorStop(0.3, '#98FB98');
        gradient.addColorStop(1, '#228B22');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Entités
        this.buildings.forEach(building => this.renderBuilding(building));
        this.citizens.forEach(citizen => this.renderCitizen(citizen));
        this.particleSystem.render();
        
        // Curseur de construction
        if (this.selectedBuildingType) {
            this.renderConstructionCursor();
        }
    }
    
    renderConstructionCursor() {
        if (!this.selectedBuildingType) return;
        
        const buildingData = this.buildingDataManager.getBuildingData(this.selectedBuildingType);
        if (!buildingData) return;
        
        const ctx = this.ctx;
        const x = this.mouseX;
        const y = this.mouseY;
        const size = buildingData.size || 20;
        
        ctx.save();
        
        // Vérifier si l'emplacement est valide
        const canBuild = !this.checkBuildingCollision(x, y, size);
        
        // Afficher l'indicateur de placement
        ctx.globalAlpha = 0.6;
        ctx.strokeStyle = canBuild ? '#00FF00' : '#FF0000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, size / 2 + 5, 0, Math.PI * 2);
        ctx.stroke();
        
        // Dessiner l'aperçu du bâtiment
        ctx.fillStyle = buildingData.color || '#888888';
        ctx.beginPath();
        ctx.arc(x, y, size / 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Afficher l'icône du bâtiment
        if (buildingData.icon) {
            ctx.font = `${size/2}px Arial`;
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(buildingData.icon, x, y);
        }
        
        ctx.restore();
    }

    renderBuilding(building) {
        const ctx = this.ctx;
        const x = building.x;
        const y = building.y;
        const size = building.size;
        
        ctx.save();
        
        // Ombre
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.beginPath();
        ctx.ellipse(x + 2, y + size/2 + 2, size/2, size/6, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Bâtiment
        ctx.fillStyle = building.color || '#888888';
        
        switch (building.type) {
            case 'fire':
                // Flammes simples
                for (let i = 0; i < 3; i++) {
                    const flameHeight = size/2 + Math.sin(building.animation * 4 + i) * size/8;
                    ctx.fillStyle = i % 2 === 0 ? '#FF4500' : '#FF6500';
                    ctx.beginPath();
                    ctx.ellipse(x + (i-1) * size/4, y - flameHeight/4, size/8, flameHeight, 0, 0, Math.PI * 2);
                    ctx.fill();
                }
                break;
                
            case 'hut':
                // Base + toit
                ctx.fillStyle = '#8B4513';
                ctx.fillRect(x - size/2, y - size/4, size, size/2);
                ctx.fillStyle = '#654321';
                ctx.beginPath();
                ctx.moveTo(x - size/1.5, y - size/4);
                ctx.lineTo(x, y - size/1.2);
                ctx.lineTo(x + size/1.5, y - size/4);
                ctx.closePath();
                ctx.fill();
                break;
                
            default:
                // Bâtiment générique
                ctx.fillRect(x - size/2, y - size/2, size, size);
                if (building.icon) {
                    ctx.font = `${size/2}px Arial`;
                    ctx.textAlign = 'center';
                    ctx.fillStyle = 'white';
                    ctx.fillText(building.icon, x, y + size/6);
                }
        }
        
        // Indicateur de travailleurs
        if (building.maxWorkers > 0) {
            ctx.fillStyle = 'white';
            ctx.font = 'bold 10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`${building.workers.length}/${building.maxWorkers}`, x, y - size/2 - 5);
        }
        
        ctx.restore();
    }

    renderCitizen(citizen) {
        console.log(`👤 Rendu d'un citoyen à (${citizen.x}, ${citizen.y})`);
        const ctx = this.ctx;
        const x = citizen.x;
        const y = citizen.y;
        
        ctx.save();
        
        // Rectangle de débogage pour rendre le citoyen très visible
        ctx.fillStyle = 'red';
        ctx.fillRect(x-10, y-20, 20, 30);
        
        // Ombre plus grande et plus visible
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.beginPath();
        ctx.ellipse(x, y + 6, 8, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Corps plus grand
        ctx.fillStyle = citizen.color?.cloth || 'blue';
        ctx.fillRect(x - 6, y - 5, 12, 16);
        
        // Tête plus grande
        ctx.fillStyle = citizen.color?.skin || 'yellow';
        ctx.beginPath();
        ctx.arc(x, y - 12, 8, 0, Math.PI * 2);
        ctx.fill();
        
        // Yeux plus grands
        ctx.fillStyle = '#000';
        ctx.fillRect(x - 3, y - 14, 2, 2);
        ctx.fillRect(x + 1, y - 14, 2, 2);
        
        // Ajouter un contour épais
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.strokeRect(x-6, y-5, 12, 16);
        ctx.beginPath();
        ctx.arc(x, y - 12, 8, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.restore();
    }

    renderConstructionCursor() {
        const buildingData = this.buildingDataManager.getBuildingData(this.selectedBuildingType);
        if (!buildingData) return;
        
        const ctx = this.ctx;
        
        // Vérifier placement valide
        const canPlace = !this.checkBuildingCollision(this.mouseX, this.mouseY, buildingData.size);
        const hasResources = this.buildingDataManager.canBuild(
            this.selectedBuildingType,
            this.resourceManager.getSummary(),
            this.researchSystem.getUnlockedResearch()
        ).canBuild;
        
        ctx.save();
        ctx.globalAlpha = 0.7;
        ctx.strokeStyle = (canPlace && hasResources) ? '#00FF00' : '#FF0000';
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 5]);
        
        ctx.beginPath();
        ctx.rect(
            this.mouseX - buildingData.size/2, 
            this.mouseY - buildingData.size/2, 
            buildingData.size, 
            buildingData.size
        );
        ctx.stroke();
        
        ctx.restore();
    }

    updateCitizens(deltaTime) {
        this.citizens = this.citizens.filter(citizen => {
            const isAlive = citizen.update(deltaTime);
            if (!isAlive) {
                this.onCitizenDied({ data: { citizen } });
            }
            return isAlive;
        });
    }

    updateBuildings(deltaTime) {
        this.buildings.forEach(building => {
            building.update(deltaTime);
        });
    }

    assignJobsToUnemployed() {
        const unemployed = this.citizens.filter(c => !c.job);
        const jobsAvailable = this.buildings.filter(b => b.needsWorkers());
        
        unemployed.forEach(citizen => {
            const nearbyJobs = jobsAvailable.filter(building => 
                citizen.getDistanceTo(building.x, building.y) < 200
            );
            
            if (nearbyJobs.length > 0) {
                const closestJob = nearbyJobs.reduce((closest, building) => {
                    const distToCurrent = citizen.getDistanceTo(building.x, building.y);
                    const distToClosest = citizen.getDistanceTo(closest.x, closest.y);
                    return distToCurrent < distToClosest ? building : closest;
                });
                
                citizen.assignJob(closestJob);
            }
        });
    }

    checkGameBalance() {
        const population = this.citizens.length;
        const resources = this.resourceManager.getSummary();
        
        // Alertes de ressources critiques
        ['food', 'water'].forEach(resource => {
            if (resources[resource] && resources[resource].amount < population * 2) {
                eventSystem.emit(GameEvents.UI_NOTIFICATION, {
                    type: 'error',
                    message: `Manque critique de ${resource}!`
                });
            }
        });
    }

    handleCanvasClick(event) {
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        if (this.selectedBuildingType) {
            this.placeBuilding(this.selectedBuildingType, x, y);
        } else {
            this.selectObjectAt(x, y);
        }
    }

    handleMouseMove(event) {
        const rect = this.canvas.getBoundingClientRect();
        this.mouseX = event.clientX - rect.left;
        this.mouseY = event.clientY - rect.top;
    }
    
    selectBuilding(type) {
        this.selectedBuildingType = type;
    }
    
    setSpeed(speed) {
        // Limite la vitesse aux valeurs valides (0, 1, 2, 4)
        if (![0, 1, 2, 4].includes(speed)) {
            console.warn(`Vitesse invalide: ${speed}, utilisation de la vitesse par défaut (1)`);
            speed = 1;
        }
        
        // Gérer la mise en pause
        if (speed === 0) {
            this.gameTime.pause();
            console.log('🕒 Jeu mis en pause');
        } else {
            // Si le jeu était en pause et que l'on définit une vitesse non nulle
            if (this.gameTime.isPaused) {
                this.gameTime.resume();
            }
            
            // Met à jour la vitesse dans GameTime
            this.gameTime.speed = speed;
            console.log(`🕒 Vitesse du jeu définie à ${speed}x`);
        }
    }

    placeBuilding(type, x, y) {
        const buildingData = this.buildingDataManager.getBuildingData(type);
        if (!buildingData) return false;
        
        // Vérifications
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
        
        if (this.checkBuildingCollision(x, y, buildingData.size)) {
            eventSystem.emit(GameEvents.UI_NOTIFICATION, {
                type: 'error',
                message: 'Emplacement occupé'
            });
            return false;
        }
        
        // Consommer ressources
        if (!this.resourceManager.consumeResources(buildingData.constructionCost)) {
            return false;
        }
        
        // Créer bâtiment
        const building = this.createBuilding(type, x, y);
        this.buildings.push(building);
        this.stats.totalBuildingsBuilt++;
        
        // Déselectionner
        this.selectedBuildingType = null;
        this.uiManager.clearBuildingSelection();
        
        eventSystem.emit(GameEvents.BUILDING_PLACED, { building });
        
        // Attirer citoyens si feu de camp
        if (type === 'fire') {
            console.log('🔍 Feu de camp placé, démarrage de l\'attraction de citoyens');
            this.startCitizenAttraction(building);
            
            // Force spawn de 5 citoyens immédiatement pour débloquer le jeu
            console.log('💡 Ajout manuel de 5 citoyens initiaux');
            for (let i = 0; i < 5; i++) {
                setTimeout(() => this.spawnCitizen(building.x, building.y, 200), i * 500);
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
        
        // Vérifier que le bâtiment a les propriétés nécessaires
        if (!building.attractionRate) {
            console.error('❌ Erreur: building.attractionRate est undefined ou 0');
            building.attractionRate = 0.01; // Valeur par défaut si manquante
        }
        
        if (!building.attractionRange) {
            console.error('❌ Erreur: building.attractionRange est undefined');
            building.attractionRange = 200; // Valeur par défaut si manquante
        }
        
        const attractInterval = setInterval(() => {
            // Log pour déboguer l'attraction
            console.log(`💬 Vérification attraction: ${Math.random()} < ${building.attractionRate}?`);
            
            if (Math.random() < building.attractionRate && this.citizens.length < this.config.maxCitizens) {
                console.log('💡 Conditions remplies pour spawner un citoyen!');
                this.spawnCitizen(building.x, building.y, building.attractionRange);
            }
            
            if (!this.buildings.includes(building)) {
                console.log('🚫 Bâtiment supprimé, arrêt de l\'attraction');
                clearInterval(attractInterval);
            }
        }, 1000);
    }

    spawnCitizen(nearX, nearY, range = 100) {
        console.log(`💡 Tentative de spawn d'un citoyen près de (${nearX}, ${nearY}) avec portée ${range}`);
        
        if (this.citizens.length >= this.config.maxCitizens) {
            console.log(`⛔ Impossible de spawner: nombre max de citoyens atteint (${this.citizens.length}/${this.config.maxCitizens})`);
            return;
        }
        
        try {
            const angle = Math.random() * Math.PI * 2;
            const distance = 50 + Math.random() * (range - 50);
            const x = nearX + Math.cos(angle) * distance;
            const y = nearY + Math.sin(angle) * distance;
            
            const finalX = Math.max(30, Math.min(this.canvas.width - 30, x));
            const finalY = Math.max(30, Math.min(this.canvas.height - 30, y));
            
            console.log(`📍 Position calculée: (${finalX}, ${finalY})`);
            
            const citizen = new Citizen(finalX, finalY, this);
            console.log(`👤 Citoyen créé: ${citizen.name}`);
            
            this.citizens.push(citizen);
            this.stats.totalCitizensSpawned++;
            
            console.log(`👥 Total des citoyens: ${this.citizens.length}, Spawned: ${this.stats.totalCitizensSpawned}`);
            
            eventSystem.emit(GameEvents.CITIZEN_SPAWNED, { citizen });
        } catch (error) {
            console.error('❌ Erreur lors de la création d\'un citoyen:', error);
        }
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

    selectBuilding(type) {
        this.selectedBuildingType = type;
        this.uiManager.setBuildingSelection(type);
    }

    setSpeed(speed) {
        this.gameTime.setSpeed(speed);
    }

    toggleDebug() {
        this.config.debugMode = !this.config.debugMode;
        this.uiManager.updateDebugDisplay(this.config.debugMode);
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
        return saveData;
    }

    loadGame(slotName = 'manual') {
        try {
            const saveData = localStorage.getItem(`supcity_save_${slotName}`);
            if (!saveData) {
                throw new Error('Aucune sauvegarde trouvée');
            }
            
            const data = JSON.parse(saveData);
            
            this.gameTime.load(data.gameTime);
            this.resourceManager.load(data.resources);
            this.researchSystem.load(data.research);
            this.stats = { ...this.stats, ...data.stats };
            this.currentAge = data.currentAge || 'prehistoric';
            
            this.loadEntities(data);
            
            eventSystem.emit(GameEvents.GAME_LOAD, { slotName });
            return true;
            
        } catch (error) {
            console.error('❌ Erreur de chargement:', error);
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

    resetGame() {
        if (!confirm('Recommencer ? Tous vos progrès seront perdus !')) {
            return;
        }
        
        this.citizens = [];
        this.buildings = [];
        this.vehicles = [];
        this.effects = [];
        
        this.resourceManager.reset();
        this.gameTime.reset();
        this.researchSystem.reset();
        
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
    }

    onCitizenDied(event) {
        console.log(`💀 Citoyen décédé: ${event.data.citizen.name}`);
    }

    onBuildingPlaced(event) {
        console.log(`🏗️ Bâtiment construit: ${event.data.building.name}`);
    }

    getGameStats() {
        return {
            ...this.stats,
            runtime: Date.now() - this.stats.gameStartTime,
            population: this.citizens.length,
            buildings: this.buildings.length,
            resources: this.resourceManager.getSummary(),
            fps: this.gameTime.fps
        };
    }
}

export { Game };