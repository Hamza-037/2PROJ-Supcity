// js/entities/Citizen.js - Classe représentant un citoyen (VERSION CORRIGÉE)

// Import des dépendances
import { eventSystem, GameEvents } from '../core/EventSystem.js';

/**
 * Classe représentant un citoyen dans le jeu
 */
class Citizen {
    constructor(x, y, game) {
        // Position et mouvement
        this.x = x;
        this.y = y;
        this.targetX = x;
        this.targetY = y;
        this.speed = 0.8 + Math.random() * 0.4; // Vitesse variable
        this.game = game;
        
        // Identité
        this.id = this.generateId();
        this.name = this.generateName();
        this.age = 18 + Math.floor(Math.random() * 40);
        this.gender = Math.random() > 0.5 ? 'male' : 'female';
        
        // État
        this.state = 'idle';
        this.path = null;
        this.pathIndex = 0;
        this.job = null;
        this.home = null;
        this.workExperience = 0;
        this.energy = 100;
        this.happiness = 80 + Math.random() * 20;
        
        // Besoins (0-100, 100 = besoin satisfait)
        this.needs = {
            hunger: 80 + Math.random() * 20,
            thirst: 80 + Math.random() * 20,
            sleep: 80 + Math.random() * 20,
            social: 60 + Math.random() * 30,
            safety: 70 + Math.random() * 20,
            comfort: 50 + Math.random() * 30
        };
        
        // Apparence
        this.color = {
            skin: this.randomSkinColor(),
            cloth: this.randomClothColor()
        };
        
        // Statistiques
        this.stats = {
            distanceTraveled: 0,
            resourcesGathered: 0,
            buildingsBuilt: 0,
            daysWorked: 0,
            timeAlive: 0
        };
        
        // Timers
        this.actionTimer = 0;
        this.needsUpdateTimer = 0;
        this.workTimer = 0;
        
        console.log(`👤 Nouveau citoyen créé: ${this.name} à (${x}, ${y})`);
    }

    generateId() {
        return `citizen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    generateName() {
        const firstNames = [
            'Alex', 'Sam', 'Jordan', 'Casey', 'Riley', 'Morgan', 'Avery', 'Quinn',
            'Emery', 'Sage', 'River', 'Rowan', 'Phoenix', 'Blake', 'Drew', 'Hayden'
        ];
        const lastNames = [
            'Stone', 'Wood', 'Rivers', 'Hill', 'Forest', 'Fields', 'Brook',
            'Vale', 'Glen', 'Swift', 'Strong', 'Bright', 'Fair', 'Wild'
        ];
        return `${this.randomChoice(firstNames)} ${this.randomChoice(lastNames)}`;
    }

    randomChoice(array) {
        return array[Math.floor(Math.random() * array.length)];
    }

    randomSkinColor() {
        const skinTones = ['#ffdbac', '#f1c27d', '#e0ac69', '#c68642', '#8d5524'];
        return skinTones[Math.floor(Math.random() * skinTones.length)];
    }

    randomClothColor() {
        const clothColors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#8B4513', '#9370DB'];
        return clothColors[Math.floor(Math.random() * clothColors.length)];
    }

    /**
     * Met à jour le citoyen
     * @param {number} deltaTime - Temps écoulé en millisecondes
     * @returns {boolean} - true si le citoyen est vivant, false sinon
     */
    update(deltaTime) {
        const deltaSeconds = deltaTime / 1000;
        this.stats.timeAlive += deltaSeconds;
        
        // Mettre à jour les besoins
        this.updateNeeds(deltaSeconds);
        
        // Mettre à jour le mouvement
        this.updateMovement(deltaSeconds);
        
        // Mettre à jour l'état et les actions
        this.updateState(deltaSeconds);
        
        // Mettre à jour les statistiques
        this.updateStats(deltaSeconds);
        
        // Vérifier si le citoyen doit mourir
        return this.checkSurvival();
    }

    /**
     * Met à jour les besoins du citoyen
     * @param {number} deltaSeconds - Temps en secondes
     */
    updateNeeds(deltaSeconds) {
        this.needsUpdateTimer += deltaSeconds;
        
        if (this.needsUpdateTimer >= 1) { // Mise à jour chaque seconde
            // Dégradation naturelle des besoins
            this.needs.hunger = Math.max(0, this.needs.hunger - 0.1);
            this.needs.thirst = Math.max(0, this.needs.thirst - 0.15);
            this.needs.sleep = Math.max(0, this.needs.sleep - 0.08);
            this.needs.social = Math.max(0, this.needs.social - 0.05);
            this.needs.safety = Math.max(0, this.needs.safety - 0.02);
            this.needs.comfort = Math.max(0, this.needs.comfort - 0.03);
            
            // Calculer le bonheur basé sur les besoins
            const averageNeeds = Object.values(this.needs).reduce((sum, need) => sum + need, 0) / Object.keys(this.needs).length;
            this.happiness = Math.max(0, Math.min(100, averageNeeds));
            
            this.needsUpdateTimer = 0;
        }
    }

    /**
     * Met à jour le mouvement du citoyen
     * @param {number} deltaSeconds - Temps en secondes
     */
    updateMovement(deltaSeconds) {
        // Mouvement simple vers la cible
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 3) {
            const moveX = (dx / distance) * this.speed * deltaSeconds * 60; // 60 pour ajuster la vitesse
            const moveY = (dy / distance) * this.speed * deltaSeconds * 60;
            
            this.x += moveX;
            this.y += moveY;
            this.stats.distanceTraveled += Math.abs(moveX) + Math.abs(moveY);
        }
    }

    /**
     * Met à jour l'état et les actions du citoyen
     * @param {number} deltaSeconds - Temps en secondes
     */
    updateState(deltaSeconds) {
        this.actionTimer += deltaSeconds;
        
        // Changer d'action toutes les 3-5 secondes
        if (this.actionTimer >= 3 + Math.random() * 2) {
            this.decideNextAction();
            this.actionTimer = 0;
        }
        
        // Exécuter l'action actuelle
        this.executeCurrentAction(deltaSeconds);
    }

    /**
     * Décide de la prochaine action du citoyen
     */
    decideNextAction() {
        // Priorité aux besoins critiques
        const criticalNeeds = Object.entries(this.needs).filter(([name, value]) => value < 30);
        
        if (criticalNeeds.length > 0) {
            const [needName] = criticalNeeds[0];
            this.respondToNeed(needName);
            return;
        }
        
        // Actions normales
        if (this.job && Math.random() < 0.6) {
            this.goToWork();
        } else if (this.home && Math.random() < 0.3) {
            this.goHome();
        } else {
            this.wander();
        }
    }

    /**
     * Répond à un besoin spécifique
     * @param {string} needName - Nom du besoin
     */
    respondToNeed(needName) {
        switch (needName) {
            case 'hunger':
                this.seekFood();
                break;
            case 'thirst':
                this.seekWater();
                break;
            case 'sleep':
                this.goHome();
                break;
            case 'social':
                this.socialize();
                break;
            default:
                this.wander();
        }
    }

    /**
     * Actions spécifiques
     */
    seekFood() {
        this.state = 'seeking_food';
        const foodBuildings = this.game.buildings.filter(b => 
            (b.type === 'berry_bush' || b.type === 'farm') && 
            this.getDistanceTo(b.x, b.y) < 200
        );
        
        if (foodBuildings.length > 0) {
            const closest = this.findClosestBuilding(foodBuildings);
            this.setTarget(closest.x, closest.y);
        } else {
            this.wander();
        }
    }

    seekWater() {
        this.state = 'seeking_water';
        const waterBuildings = this.game.buildings.filter(b => 
            b.type === 'well' && this.getDistanceTo(b.x, b.y) < 200
        );
        
        if (waterBuildings.length > 0) {
            const closest = this.findClosestBuilding(waterBuildings);
            this.setTarget(closest.x, closest.y);
        } else {
            this.wander();
        }
    }

    goToWork() {
        if (this.job) {
            this.state = 'working';
            this.setTarget(this.job.x, this.job.y);
        }
    }

    goHome() {
        if (this.home) {
            this.state = 'going_home';
            this.setTarget(this.home.x, this.home.y);
        } else {
            this.state = 'sleeping';
            // Chercher un abri temporaire
            const houses = this.game.buildings.filter(b => 
                b.maxResidents > 0 && b.residents.length < b.maxResidents
            );
            if (houses.length > 0) {
                const closest = this.findClosestBuilding(houses);
                this.setTarget(closest.x, closest.y);
            }
        }
    }

    socialize() {
        this.state = 'socializing';
        // Aller vers d'autres citoyens
        const otherCitizens = this.game.citizens.filter(c => 
            c !== this && this.getDistanceTo(c.x, c.y) < 100
        );
        
        if (otherCitizens.length > 0) {
            const target = otherCitizens[Math.floor(Math.random() * otherCitizens.length)];
            this.setTarget(target.x + Math.random() * 40 - 20, target.y + Math.random() * 40 - 20);
        } else {
            this.wander();
        }
    }

    wander() {
        this.state = 'wandering';
        // Mouvement aléatoire dans les limites
        const newX = Math.max(50, Math.min(this.game.canvas.width - 50, 
            this.x + (Math.random() - 0.5) * 100));
        const newY = Math.max(50, Math.min(this.game.canvas.height - 50, 
            this.y + (Math.random() - 0.5) * 100));
        this.setTarget(newX, newY);
    }

    /**
     * Exécute l'action actuelle
     * @param {number} deltaSeconds - Temps en secondes
     */
    executeCurrentAction(deltaSeconds) {
        const distanceToTarget = this.getDistanceTo(this.targetX, this.targetY);
        
        // Si on est arrivé à destination
        if (distanceToTarget < 10) {
            switch (this.state) {
                case 'seeking_food':
                    this.consumeFood();
                    break;
                case 'seeking_water':
                    this.consumeWater();
                    break;
                case 'working':
                    this.doWork(deltaSeconds);
                    break;
                case 'going_home':
                case 'sleeping':
                    this.rest();
                    break;
                case 'socializing':
                    this.doSocialize();
                    break;
            }
        }
    }

    /**
     * Actions à destination
     */
    consumeFood() {
        if (this.game.resourceManager.hasResource('food', 1)) {
            this.game.resourceManager.removeResource('food', 1);
            this.needs.hunger = Math.min(100, this.needs.hunger + 30);
            this.state = 'idle';
            
            // Effet visuel
            if (this.game.particleSystem) {
                this.game.particleSystem.createResourcePop(this.x, this.y - 10, 'food');
            }
        }
    }

    consumeWater() {
        if (this.game.resourceManager.hasResource('water', 1)) {
            this.game.resourceManager.removeResource('water', 1);
            this.needs.thirst = Math.min(100, this.needs.thirst + 40);
            this.state = 'idle';
            
            // Effet visuel
            if (this.game.particleSystem) {
                this.game.particleSystem.createResourcePop(this.x, this.y - 10, 'water');
            }
        }
    }

    doWork(deltaSeconds) {
        if (this.job) {
            this.workTimer += deltaSeconds;
            this.energy = Math.max(0, this.energy - 0.1);
            
            // Production de travail toutes les 5 secondes
            if (this.workTimer >= 5) {
                this.job.work(this, 1.0);
                this.stats.daysWorked += 0.01;
                this.workTimer = 0;
                
                // Satisfaction du travail
                this.needs.comfort = Math.min(100, this.needs.comfort + 5);
            }
        }
    }

    rest() {
        this.needs.sleep = Math.min(100, this.needs.sleep + 20);
        this.needs.comfort = Math.min(100, this.needs.comfort + 10);
        this.energy = Math.min(100, this.energy + 15);
        this.state = 'idle';
    }

    doSocialize() {
        this.needs.social = Math.min(100, this.needs.social + 15);
        this.happiness = Math.min(100, this.happiness + 5);
        this.state = 'idle';
    }

    /**
     * Utilitaires
     */
    setTarget(x, y) {
        this.targetX = Math.max(20, Math.min(this.game.canvas.width - 20, x));
        this.targetY = Math.max(20, Math.min(this.game.canvas.height - 20, y));
    }

    getDistanceTo(x, y) {
        const dx = this.x - x;
        const dy = this.y - y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    findClosestBuilding(buildings) {
        return buildings.reduce((closest, building) => {
            const distToBuilding = this.getDistanceTo(building.x, building.y);
            const distToClosest = this.getDistanceTo(closest.x, closest.y);
            return distToBuilding < distToClosest ? building : closest;
        });
    }

    assignJob(building) {
        if (building && building.addWorker && building.addWorker(this)) {
            this.job = building;
            console.log(`${this.name} a été assigné au travail: ${building.type}`);
            return true;
        }
        return false;
    }

    /**
     * Vérifications de survie
     */
    checkSurvival() {
        // Mourir si les besoins critiques sont trop bas
        if (this.needs.hunger <= 0 || this.needs.thirst <= 0) {
            console.log(`💀 ${this.name} est mort de faim/soif`);
            return false;
        }
        
        // Mourir de vieillesse (très rare)
        if (this.age > 80 && Math.random() < 0.001) {
            console.log(`💀 ${this.name} est mort de vieillesse`);
            return false;
        }
        
        return true;
    }

    /**
     * Met à jour les statistiques
     */
    updateStats(deltaSeconds) {
        // Les statistiques sont mises à jour dans les autres méthodes
    }

    /**
     * Sauvegarde du citoyen
     */
    save() {
        return {
            id: this.id,
            name: this.name,
            x: this.x,
            y: this.y,
            age: this.age,
            gender: this.gender,
            state: this.state,
            needs: this.needs,
            happiness: this.happiness,
            energy: this.energy,
            workExperience: this.workExperience,
            stats: this.stats,
            color: this.color,
            jobId: this.job ? this.job.id : null,
            homeId: this.home ? this.home.id : null
        };
    }

    /**
     * Chargement du citoyen
     */
    load(data) {
        this.id = data.id;
        this.name = data.name;
        this.x = data.x;
        this.y = data.y;
        this.age = data.age;
        this.gender = data.gender;
        this.state = data.state || 'idle';
        this.needs = data.needs || this.needs;
        this.happiness = data.happiness || 100;
        this.energy = data.energy || 100;
        this.workExperience = data.workExperience || 0;
        this.stats = data.stats || this.stats;
        this.color = data.color || this.color;
        
        // Les relations job/home seront reconnectées par le jeu
    }
}

export { Citizen };