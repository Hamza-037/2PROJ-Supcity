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

    setupEventListeners() {
        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

        eventSystem.on(GameEvents.CITIZEN_DIED, (e) => this.onCitizenDied(e));
        eventSystem.on(GameEvents.BUILDING_PLACED, (e) => this.onBuildingPlaced(e));
    }

    startGameLoops() {
        console.log('🔄 Démarrage des boucles de jeu');
        
        // Ajouter les callbacks avec gestion d'erreur
        this.gameTime.addUpdateCallback((deltaTime) => {
            try {
                this.update(deltaTime);
                this.render();
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
        // Vérifications de sécurité
        if (!this.isRunning || !this.isInitialized) {
            return;
        }

        // Éviter les deltaTime aberrants qui peuvent causer des crashes
        if (deltaTime > 1000) { // Plus d'une seconde
            console.warn(`⚠️ DeltaTime aberrant détecté: ${deltaTime}ms, limitation à 100ms`);
            deltaTime = 100;
        }

        if (deltaTime < 0) {
            console.warn(`⚠️ DeltaTime négatif détecté: ${deltaTime}ms, ignoré`);
            return;
        }

        try {
            // Mettre à jour les entités
            this.updateCitizens(deltaTime);
            this.updateBuildings(deltaTime);
            
            // Mettre à jour le système de particules (avec vérification)
            if (this.particleSystem && this.particleSystem.update) {
                this.particleSystem.update(deltaTime);
            }

            // Assigner des emplois (pas à chaque frame pour les performances)
            if (Math.random() < 0.1) { // 10% de chance par frame
                this.assignJobsToUnemployed();
            }

        } catch (error) {
            console.error('❌ Erreur dans update():', error);
            console.error('État du jeu:', {
                isRunning: this.isRunning,
                isInitialized: this.isInitialized,
                speed: this.gameTime?.speed,
                isPaused: this.gameTime?.isPaused,
                citizenCount: this.citizens?.length,
                buildingCount: this.buildings?.length
            });
            
            // En cas d'erreur critique, on peut essayer de continuer
            // mais on évite de planter complètement
        }
    }

    fixedUpdate(deltaTime) {
        try {
            // Vérifications de sécurité
            if (!this.isRunning || !this.isInitialized) {
                return;
            }

            // Mettre à jour les systèmes principaux
            if (this.resourceManager && this.resourceManager.update) {
                this.resourceManager.update();
            }

            if (this.researchSystem && this.researchSystem.update) {
                this.researchSystem.update(deltaTime);
            }

            // Vérifier l'équilibre du jeu (pas trop souvent)
            if (this.gameTime.currentTime % 5000 < 100) { // Environ toutes les 5 secondes
                this.checkGameBalance();
            }

            // Traiter la queue d'événements
            if (eventSystem && eventSystem.processQueue) {
                eventSystem.processQueue();
            }

        } catch (error) {
            console.error('❌ Erreur dans fixedUpdate():', error);
            // Ne pas planter le jeu, juste logger l'erreur
        }
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
        const hasResources = this.buildingDataManager.canBuild(
            this.selectedBuildingType,
            this.resourceManager.getSummary(),
            this.researchSystem.getUnlockedResearch()
        ).canBuild;

        // Couleur de l'indicateur selon la validité
        const isValid = canBuild && hasResources;
        const strokeColor = isValid ? '#00FF00' : '#FF0000';
        const fillColor = isValid ? 'rgba(0, 255, 0, 0.2)' : 'rgba(255, 0, 0, 0.2)';

        // Zone de placement - Carré centré sur le curseur
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = fillColor;
        ctx.fillRect(x - size / 2, y - size / 2, size, size);

        // Contour de la zone de placement
        ctx.globalAlpha = 0.8;
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 4]);
        ctx.strokeRect(x - size / 2, y - size / 2, size, size);

        // Cercle central pour le bâtiment
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = buildingData.color || '#888888';
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(x, y, size / 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Contour du bâtiment
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Icône du bâtiment - parfaitement centrée
        if (buildingData.icon) {
            ctx.globalAlpha = 1;
            ctx.font = `${Math.floor(size / 2.5)}px Arial`;
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 1;
            
            // Contour pour la lisibilité
            ctx.strokeText(buildingData.icon, x, y);
            ctx.fillText(buildingData.icon, x, y);
        }

        // Croix de centrage (optionnel - pour debug)
        if (this.config.debugMode) {
            ctx.globalAlpha = 0.5;
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 1;
            ctx.setLineDash([]);
            
            // Ligne horizontale
            ctx.beginPath();
            ctx.moveTo(x - 10, y);
            ctx.lineTo(x + 10, y);
            ctx.stroke();
            
            // Ligne verticale
            ctx.beginPath();
            ctx.moveTo(x, y - 10);
            ctx.lineTo(x, y + 10);
            ctx.stroke();
        }

        // Affichage du nom du bâtiment
        ctx.globalAlpha = 0.9;
        ctx.font = 'bold 12px Arial';
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        
        const buildingName = buildingData.name || this.selectedBuildingType;
        ctx.strokeText(buildingName, x, y + size / 2 + 10);
        ctx.fillText(buildingName, x, y + size / 2 + 10);

        // Affichage du coût si pas assez de ressources
        if (!hasResources) {
            ctx.font = 'bold 10px Arial';
            ctx.fillStyle = '#FF6666';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            
            const costText = this.buildingDataManager.getFormattedCost(this.selectedBuildingType);
            if (costText) {
                ctx.strokeText(`Coût: ${costText}`, x, y + size / 2 + 25);
                ctx.fillText(`Coût: ${costText}`, x, y + size / 2 + 25);
            }
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
        ctx.ellipse(x + 2, y + size / 2 + 2, size / 2, size / 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Bâtiment
        ctx.fillStyle = building.color || '#888888';

        switch (building.type) {
            case 'fire':
                // Flammes animées
                for (let i = 0; i < 5; i++) {
                    const flameHeight = size / 2 + Math.sin(building.animation * 4 + i) * size / 8;
                    const flameX = x + (i - 2) * size / 8;
                    ctx.fillStyle = i % 2 === 0 ? '#FF4500' : '#FF6500';
                    ctx.beginPath();
                    ctx.ellipse(flameX, y - flameHeight / 4, size / 12, flameHeight, 0, 0, Math.PI * 2);
                    ctx.fill();
                }
                
                // Base du feu
                ctx.fillStyle = '#654321';
                ctx.fillRect(x - size / 3, y + size / 4, size / 1.5, size / 6);
                break;

            case 'hut':
                // Base + toit
                ctx.fillStyle = '#8B4513';
                ctx.fillRect(x - size / 2, y - size / 4, size, size / 2);
                ctx.fillStyle = '#654321';
                ctx.beginPath();
                ctx.moveTo(x - size / 1.5, y - size / 4);
                ctx.lineTo(x, y - size / 1.2);
                ctx.lineTo(x + size / 1.5, y - size / 4);
                ctx.closePath();
                ctx.fill();
                break;

            default:
                // Bâtiment générique
                ctx.fillRect(x - size / 2, y - size / 2, size, size);
                if (building.icon) {
                    ctx.font = `${size / 2}px Arial`;
                    ctx.textAlign = 'center';
                    ctx.fillStyle = 'white';
                    ctx.fillText(building.icon, x, y + size / 6);
                }
        }

        // Indicateur de travailleurs
        if (building.maxWorkers > 0) {
            ctx.fillStyle = 'white';
            ctx.font = 'bold 10px Arial';
            ctx.textAlign = 'center';
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 2;
            const text = `${building.workers.length}/${building.maxWorkers}`;
            ctx.strokeText(text, x, y - size / 2 - 5);
            ctx.fillText(text, x, y - size / 2 - 5);
        }

        // Indicateur d'attraction (debug)
        if (this.config.debugMode && building.attractsPeople) {
            ctx.strokeStyle = 'rgba(0, 255, 0, 0.3)';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.arc(x, y, building.attractionRange || 200, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        ctx.restore();
    }

    renderCitizen(citizen) {
        const ctx = this.ctx;
        const x = citizen.x;
        const y = citizen.y;

        ctx.save();

        // Ombre
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(x, y + 8, 6, 3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Corps
        ctx.fillStyle = citizen.color?.cloth || '#4169E1';
        ctx.fillRect(x - 4, y - 3, 8, 12);

        // Tête
        ctx.fillStyle = citizen.color?.skin || '#FDBCB4';
        ctx.beginPath();
        ctx.arc(x, y - 8, 5, 0, Math.PI * 2);
        ctx.fill();

        // Yeux
        ctx.fillStyle = '#000';
        ctx.fillRect(x - 2, y - 9, 1, 1);
        ctx.fillRect(x + 1, y - 9, 1, 1);

        // Indicateur d'état (debug)
        if (this.config.debugMode) {
            ctx.fillStyle = this.getCitizenStateColor(citizen.state);
            ctx.beginPath();
            ctx.arc(x, y - 15, 3, 0, Math.PI * 2);
            ctx.fill();

            // Nom du citoyen
            ctx.fillStyle = 'white';
            ctx.font = 'bold 8px Arial';
            ctx.textAlign = 'center';
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 2;
            ctx.strokeText(citizen.name.split(' ')[0], x, y - 20);
            ctx.fillText(citizen.name.split(' ')[0], x, y - 20);
        }

        ctx.restore();
    }

    getCitizenStateColor(state) {
        const colors = {
            'idle': '#888888',
            'seeking_food': '#FF6B35',
            'seeking_water': '#4169E1',
            'working': '#32CD32',
            'sleeping': '#9370DB',
            'socializing': '#FFD700',
            'wandering': '#20B2AA'
        };
        return colors[state] || '#888888';
    }

    updateCitizens(deltaTime) {
        const citizensToRemove = [];

        this.citizens.forEach((citizen, index) => {
            try {
                const isAlive = citizen.update(deltaTime);
                if (!isAlive) {
                    citizensToRemove.push(index);
                    this.onCitizenDied({ data: { citizen } });
                }
            } catch (error) {
                console.error(`❌ Erreur lors de la mise à jour du citoyen ${citizen.name}:`, error);
                citizensToRemove.push(index);
            }
        });

        // Supprimer les citoyens morts ou défaillants (en partant de la fin)
        citizensToRemove.reverse().forEach(index => {
            this.citizens.splice(index, 1);
        });
    }

    updateBuildings(deltaTime) {
        this.buildings.forEach(building => {
            building.update(deltaTime);
        });
    }

    assignJobsToUnemployed() {
        const unemployed = this.citizens.filter(c => !c.job);
        const jobsAvailable = this.buildings.filter(b => b.needsWorkers && b.needsWorkers());

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

        // Éviter le spam de notifications avec un système de cooldown
        const now = Date.now();
        if (!this.lastNotifications) {
            this.lastNotifications = {};
        }

        // Cooldown de 10 secondes entre les mêmes notifications
        const notificationCooldown = 10000; // 10 secondes

        // Alertes de ressources critiques
        ['food', 'water'].forEach(resource => {
            if (resources[resource] && resources[resource].amount < population * 2) {
                const notificationKey = `critical_${resource}`;
                const lastNotification = this.lastNotifications[notificationKey] || 0;
                
                // Ne notifier que si le cooldown est écoulé
                if (now - lastNotification > notificationCooldown) {
                    eventSystem.emit(GameEvents.UI_NOTIFICATION, {
                        type: 'error',
                        message: `Manque critique de ${resource}!`
                    });
                    this.lastNotifications[notificationKey] = now;
                }
            }
        });

        // Vérifications supplémentaires sans spam
        this.checkResourceBalance(population, resources);
    }

    checkResourceBalance(population, resources) {
        // Vérification du bonheur général
        if (population > 0) {
            const avgHappiness = this.citizens.reduce((sum, c) => sum + c.happiness, 0) / population;
            
            if (avgHappiness < 30 && !this.lowHappinessWarned) {
                eventSystem.emit(GameEvents.UI_NOTIFICATION, {
                    type: 'warning',
                    message: 'Le bonheur de la population est très bas!'
                });
                this.lowHappinessWarned = true;
            } else if (avgHappiness > 60) {
                this.lowHappinessWarned = false; // Reset du warning
            }
        }

        // Vérification de la production
        this.checkProductionBalance(resources);
    }

    checkProductionBalance(resources) {
        // Avertir si aucune production de nourriture
        const foodProducers = this.buildings.filter(b => 
            b.produces === 'food' || b.type === 'farm' || b.type === 'berry_bush'
        );
        
        if (foodProducers.length === 0 && this.citizens.length > 2) {
            const now = Date.now();
            const lastWarning = this.lastNotifications['no_food_production'] || 0;
            
            if (now - lastWarning > 30000) { // 30 secondes
                eventSystem.emit(GameEvents.UI_NOTIFICATION, {
                    type: 'warning',
                    message: 'Aucune production de nourriture ! Construisez une ferme.'
                });
                this.lastNotifications['no_food_production'] = now;
            }
        }

        // Avertir si aucune production d'eau
        const waterProducers = this.buildings.filter(b => b.type === 'well');
        
        if (waterProducers.length === 0 && this.citizens.length > 3) {
            const now = Date.now();
            const lastWarning = this.lastNotifications['no_water_production'] || 0;
            
            if (now - lastWarning > 30000) { // 30 secondes
                eventSystem.emit(GameEvents.UI_NOTIFICATION, {
                    type: 'warning',
                    message: 'Aucune production d\'eau ! Construisez un puits.'
                });
                this.lastNotifications['no_water_production'] = now;
            }
        }
    }

    handleCanvasClick(event) {
        // Calcul précis des coordonnées relatives au canvas
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;   // Rapport de mise à l'échelle X
        const scaleY = this.canvas.height / rect.height; // Rapport de mise à l'échelle Y
        
        // Coordonnées exactes dans le canvas
        const x = (event.clientX - rect.left) * scaleX;
        const y = (event.clientY - rect.top) * scaleY;
        
        // S'assurer que les coordonnées sont dans les limites
        const clampedX = Math.max(0, Math.min(this.canvas.width, x));
        const clampedY = Math.max(0, Math.min(this.canvas.height, y));

        console.log(`🖱️ Clic détecté: (${clampedX.toFixed(1)}, ${clampedY.toFixed(1)})`);

        if (this.selectedBuildingType) {
            this.placeBuilding(this.selectedBuildingType, clampedX, clampedY);
        } else {
            this.selectObjectAt(clampedX, clampedY);
        }
    }

    handleMouseMove(event) {
        // Même calcul précis pour le mouvement de la souris
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        // Mettre à jour les coordonnées de la souris en temps réel
        this.mouseX = (event.clientX - rect.left) * scaleX;
        this.mouseY = (event.clientY - rect.top) * scaleY;
        
        // S'assurer que les coordonnées restent dans les limites
        this.mouseX = Math.max(0, Math.min(this.canvas.width, this.mouseX));
        this.mouseY = Math.max(0, Math.min(this.canvas.height, this.mouseY));
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
        const citizen = event.data.citizen;
        console.log(`💀 Citoyen décédé: ${citizen.name}`);
        
        // Libérer le travail si nécessaire
        if (citizen.job) {
            citizen.job.removeWorker(citizen);
        }
        
        eventSystem.emit(GameEvents.UI_NOTIFICATION, {
            type: 'warning',
            message: `${citizen.name} est décédé`
        });
    }

    onBuildingPlaced(event) {
        const building = event.data.building;
        console.log(`🏗️ Bâtiment construit: ${building.name || building.type}`);
        
        eventSystem.emit(GameEvents.UI_NOTIFICATION, {
            type: 'success',
            message: `${building.name || building.type} construit !`
        });
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