// js/entities/Citizen.js - Classe représentant un citoyen

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
        this.speed = 0.8;
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
        
        // Besoins
        this.needs = {
            hunger: 100,
            thirst: 100,
            sleep: 100,
            social: 100,
            safety: 100,
            comfort: 100
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
            daysWorked: 0
        };
    }

    generateId() {
        return Math.random().toString(36).substr(2, 9);
    }

    generateName() {
        const firstNames = ['Jean', 'Marie', 'Pierre', 'Sophie', 'Paul', 'Claire'];
        const lastNames = ['Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard'];
        return `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
    }

    randomSkinColor() {
        const skinTones = ['#ffdbac', '#f1c27d', '#e0ac69', '#c68642', '#8d5524'];
        return skinTones[Math.floor(Math.random() * skinTones.length)];
    }

    randomClothColor() {
        const clothColors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
        return clothColors[Math.floor(Math.random() * clothColors.length)];
    }

    update() {
        this.updateNeeds();
        this.updateMovement();
        this.updateState();
        this.updateStats();
    }

    updateNeeds() {
        Object.keys(this.needs).forEach(need => {
            this.needs[need] = Math.max(0, this.needs[need] - 0.01);
        });
    }

    updateMovement() {
        if (this.path && this.pathIndex < this.path.length) {
            const target = this.path[this.pathIndex];
            const dx = target.x - this.x;
            const dy = target.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > this.speed) {
                this.x += (dx / distance) * this.speed;
                this.y += (dy / distance) * this.speed;
                this.stats.distanceTraveled += this.speed;
            } else {
                this.x = target.x;
                this.y = target.y;
                this.pathIndex++;
            }
        }
    }

    updateState() {
        if (this.state === 'idle') {
            this.findNewActivity();
        }
    }

    updateStats() {
        if (this.job && this.state === 'working') {
            this.workExperience += 0.001;
        }
    }

    findNewActivity() {
        const lowestNeed = Object.entries(this.needs).reduce((a, b) => a[1] < b[1] ? a : b)[0];
        
        switch(lowestNeed) {
            case 'hunger':
                this.seekFood();
                break;
            case 'sleep':
                this.goHome();
                break;
            case 'social':
                this.seekSocialInteraction();
                break;
            default:
                this.goToWork();
        }
    }

    seekFood() {
        this.state = 'seeking_food';
        // Logic for finding food source
    }

    goHome() {
        if (this.home) {
            this.state = 'going_home';
            this.setPath(this.home.getPosition());
        }
    }

    seekSocialInteraction() {
        this.state = 'socializing';
        // Logic for finding other citizens
    }

    goToWork() {
        if (this.job) {
            this.state = 'working';
            this.setPath(this.job.getPosition());
        }
    }

    setPath(destination) {
        this.path = this.game.pathfinder.findPath(
            {x: Math.floor(this.x), y: Math.floor(this.y)},
            destination
        );
        this.pathIndex = 0;
    }
}

// Export pour utilisation dans d'autres modules
export { Citizen };