// js/data/BuildingData.js - Base de données des bâtiments

/**
 * Gestionnaire des données de tous les bâtiments du jeu
 */
class BuildingDataManager {
    constructor() {
        this.buildingTypes = {};
        this.categories = {};
        this.initializeBuildingData();
    }

    /**
     * Initialise toutes les données des bâtiments
     */
    initializeBuildingData() {
        // === BÂTIMENTS DE BASE ===
        this.addBuildingType('fire', {
            name: 'Feu de camp',
            description: 'Attire les premiers citoyens et fournit chaleur et sécurité',
            category: 'basic',
            icon: '🔥',
            size: 20,
            maxWorkers: 0,
            maxResidents: 0,
            constructionCost: {},
            constructionTime: 0,
            attracts: true,
            attractionRange: 200,
            attractionRate: 0.003,
            provides: ['warmth', 'light', 'safety'],
            color: '#FF4500',
            unlocked: true
        });

        this.addBuildingType('hut', {
            name: 'Hutte primitive',
            description: 'Logement de base pour 4 citoyens',
            category: 'basic',
            icon: '🏠',
            size: 25,
            maxWorkers: 0,
            maxResidents: 4,
            constructionCost: { wood: 10 },
            constructionTime: 30,
            maintenanceCost: { wood: 1 },
            upgradeCost: { wood: 20, stone: 5 },
            comfortLevel: 40,
            color: '#8B4513',
            unlocked: true
        });

        // === PRODUCTION DE RESSOURCES ===
        this.addBuildingType('berry_bush', {
            name: 'Buisson à baies',
            description: 'Source naturelle de nourriture',
            category: 'production',
            icon: '🫐',
            size: 18,
            maxWorkers: 2,
            maxResidents: 0,
            produces: 'food',
            productionRate: 3,
            constructionCost: {},
            constructionTime: 0,
            range: 80,
            regenerationRate: 1,
            maxHarvest: 50,
            color: '#228B22',
            unlocked: true
        });

        this.addBuildingType('wood_camp', {
            name: 'Camp de bûcherons',
            description: 'Produit du bois en abattant les arbres environnants',
            category: 'production',
            icon: '🪓',
            size: 22,
            maxWorkers: 3,
            maxResidents: 0,
            produces: 'wood',
            productionRate: 2,
            constructionCost: { stone: 5 },
            constructionTime: 45,
            maintenanceCost: { food: 2 },
            upgradeCost: { wood: 15, stone: 10 },
            range: 100,
            color: '#654321',
            unlocked: true
        });

        this.addBuildingType('stone_pit', {
            name: 'Carrière de pierre',
            description: 'Extrait la pierre des gisements locaux',
            category: 'production',
            icon: '⛏️',
            size: 20,
            maxWorkers: 2,
            maxResidents: 0,
            produces: 'stone',
            productionRate: 1,
            constructionCost: { wood: 15 },
            constructionTime: 60,
            maintenanceCost: { food: 1, wood: 1 },
            upgradeCost: { wood: 25, stone: 15 },
            range: 80,
            color: '#696969',
            unlocked: true
        });

        this.addBuildingType('well', {
            name: 'Puits d\'eau',
            description: 'Fournit de l\'eau potable pour la communauté',
            category: 'production',
            icon: '🪣',
            size: 18,
            maxWorkers: 1,
            maxResidents: 0,
            produces: 'water',
            productionRate: 4,
            constructionCost: { stone: 10, wood: 5 },
            constructionTime: 90,
            maintenanceCost: { stone: 1 },
            upgradeCost: { stone: 20, wood: 10 },
            range: 60,
            color: '#4169E1',
            unlocked: true
        });

        this.addBuildingType('farm', {
            name: 'Ferme',
            description: 'Culture organisée pour une production alimentaire stable',
            category: 'production',
            icon: '🌾',
            size: 30,
            maxWorkers: 4,
            maxResidents: 0,
            produces: 'food',
            productionRate: 5,
            constructionCost: { wood: 25, stone: 15 },
            constructionTime: 120,
            maintenanceCost: { water: 2 },
            upgradeCost: { wood: 40, stone: 25, tools: 2 },
            range: 120,
            seasonalBonus: true,
            color: '#DAA520',
            unlocked: false,
            requires: ['agriculture']
        });

        // === RECHERCHE ET DÉVELOPPEMENT ===
        this.addBuildingType('research_tent', {
            name: 'Tente de recherche',
            description: 'Centre primitif de développement technologique',
            category: 'research',
            icon: '📚',
            size: 26,
            maxWorkers: 2,
            maxResidents: 0,
            produces: 'research',
            productionRate: 1,
            constructionCost: { wood: 20, stone: 10 },
            constructionTime: 100,
            maintenanceCost: { food: 1 },
            upgradeCost: { wood: 35, stone: 20, cloth: 5 },
            range: 70,
            color: '#9370DB',
            unlocked: true
        });

        this.addBuildingType('library', {
            name: 'Bibliothèque',
            description: 'Centre avancé de recherche et de savoir',
            category: 'research',
            icon: '📖',
            size: 35,
            maxWorkers: 6,
            maxResidents: 0,
            produces: 'research',
            productionRate: 3,
            constructionCost: { wood: 50, stone: 30, cloth: 10 },
            constructionTime: 180,
            maintenanceCost: { food: 2, cloth: 1 },
            upgradeCost: { stone: 60, cloth: 20, tools: 5 },
            range: 100,
            researchBonus: 1.5,
            color: '#4B0082',
            unlocked: false,
            requires: ['writing']
        });

        // === INFRASTRUCTURE ===
        this.addBuildingType('road', {
            name: 'Route',
            description: 'Améliore les déplacements et l\'efficacité des bâtiments',
            category: 'infrastructure',
            icon: '🛤️',
            size: 10,
            maxWorkers: 0,
            maxResidents: 0,
            constructionCost: { stone: 2 },
            constructionTime: 10,
            maintenanceCost: { stone: 0.1 },
            speedBonus: 1.5,
            efficiencyBonus: 1.1,
            color: '#808080',
            unlocked: true
        });

        this.addBuildingType('bridge', {
            name: 'Pont',
            description: 'Permet de traverser les cours d\'eau',
            category: 'infrastructure',
            icon: '🌉',
            size: 15,
            maxWorkers: 0,
            maxResidents: 0,
            constructionCost: { wood: 30, stone: 20 },
            constructionTime: 150,
            maintenanceCost: { wood: 2 },
            color: '#8B4513',
            unlocked: false,
            requires: ['engineering']
        });

        this.addBuildingType('warehouse', {
            name: 'Entrepôt',
            description: 'Stockage centralisé des ressources',
            category: 'infrastructure',
            icon: '🏢',
            size: 40,
            maxWorkers: 3,
            maxResidents: 0,
            constructionCost: { wood: 40, stone: 25 },
            constructionTime: 120,
            maintenanceCost: { wood: 1 },
            maxStorage: {
                food: 500,
                wood: 500,
                stone: 500,
                water: 300,
                cloth: 200,
                tools: 100
            },
            storageRadius: 150,
            color: '#654321',
            unlocked: false,
            requires: ['logistics']
        });

        // === ARTISANAT ET TRANSFORMATION ===
        this.addBuildingType('workshop', {
            name: 'Atelier',
            description: 'Transforme les ressources de base en outils',
            category: 'advanced',
            icon: '🔨',
            size: 28,
            maxWorkers: 3,
            maxResidents: 0,
            produces: 'tools',
            consumes: { wood: 2, stone: 1 },
            productionRate: 1,
            constructionCost: { wood: 30, stone: 20 },
            constructionTime: 100,
            maintenanceCost: { wood: 1 },
            upgradeCost: { wood: 45, stone: 30, tools: 3 },
            range: 80,
            color: '#8B4513',
            unlocked: false,
            requires: ['tools']
        });

        this.addBuildingType('bakery', {
            name: 'Boulangerie',
            description: 'Transforme les céréales en pain nutritif',
            category: 'advanced',
            icon: '🍞',
            size: 25,
            maxWorkers: 2,
            maxResidents: 0,
            produces: 'bread',
            consumes: { grain: 2, water: 1 },
            productionRate: 3,
            constructionCost: { wood: 25, stone: 15, tools: 2 },
            constructionTime: 90,
            maintenanceCost: { wood: 1 },
            nutritionBonus: 1.5,
            color: '#DEB887',
            unlocked: false,
            requires: ['cooking']
        });

        this.addBuildingType('textile_mill', {
            name: 'Filature',
            description: 'Produit des tissus à partir de fibres',
            category: 'advanced',
            icon: '🧵',
            size: 32,
            maxWorkers: 4,
            maxResidents: 0,
            produces: 'cloth',
            consumes: { fiber: 2 },
            productionRate: 2,
            constructionCost: { wood: 35, stone: 25, tools: 3 },
            constructionTime: 140,
            maintenanceCost: { tools: 1 },
            color: '#DDA0DD',
            unlocked: false,
            requires: ['textiles']
        });

        // === ÉLEVAGE ===
        this.addBuildingType('pasture', {
            name: 'Pâturage',
            description: 'Élève du bétail pour la nourriture et autres ressources',
            category: 'advanced',
            icon: '🐄',
            size: 50,
            maxWorkers: 2,
            maxResidents: 0,
            produces: 'meat',
            consumes: { grass: 1, water: 2 },
            productionRate: 2,
            constructionCost: { wood: 40, stone: 10 },
            constructionTime: 120,
            maintenanceCost: { water: 3 },
            maxAnimals: 10,
            animalTypes: ['cow', 'sheep', 'goat'],
            color: '#90EE90',
            unlocked: false,
            requires: ['animal_husbandry']
        });

        // === COMMERCE ===
        this.addBuildingType('market', {
            name: 'Marché',
            description: 'Centre de commerce et d\'échange',
            category: 'advanced',
            icon: '🏪',
            size: 45,
            maxWorkers: 4,
            maxResidents: 0,
            constructionCost: { wood: 50, stone: 30, cloth: 10 },
            constructionTime: 160,
            maintenanceCost: { food: 2, cloth: 1 },
            tradingRadius: 200,
            socialBonus: 1.3,
            economicBonus: 1.2,
            color: '#FF6347',
            unlocked: false,
            requires: ['trade']
        });

        // === DÉFENSE ===
        this.addBuildingType('guard_tower', {
            name: 'Tour de garde',
            description: 'Protège la zone des dangers',
            category: 'advanced',
            icon: '🗼',
            size: 20,
            maxWorkers: 2,
            maxResidents: 0,
            constructionCost: { wood: 20, stone: 30, tools: 2 },
            constructionTime: 100,
            maintenanceCost: { food: 2 },
            defenseRadius: 150,
            defenseBonus: 2.0,
            color: '#696969',
            unlocked: false,
            requires: ['defense']
        });

        // === SPIRITUEL ===
        this.addBuildingType('shrine', {
            name: 'Sanctuaire',
            description: 'Lieu de recueillement qui améliore le bonheur',
            category: 'advanced',
            icon: '⛩️',
            size: 30,
            maxWorkers: 1,
            maxResidents: 0,
            constructionCost: { wood: 25, stone: 35, cloth: 5 },
            constructionTime: 120,
            maintenanceCost: { cloth: 1 },
            happinessBonus: 1.4,
            spiritualRadius: 120,
            color: '#FFD700',
            unlocked: false,
            requires: ['spirituality']
        });

        // Initialiser les catégories
        this.initializeCategories();
    }

    /**
     * Ajoute un type de bâtiment
     * @param {string} type - Type du bâtiment
     * @param {Object} data - Données du bâtiment
     */
    addBuildingType(type, data) {
        this.buildingTypes[type] = {
            type,
            ...data,
            // Valeurs par défaut
            size: data.size || 20,
            maxWorkers: data.maxWorkers || 0,
            maxResidents: data.maxResidents || 0,
            constructionCost: data.constructionCost || {},
            constructionTime: data.constructionTime || 60,
            maintenanceCost: data.maintenanceCost || {},
            upgradeCost: data.upgradeCost || {},
            maxLevel: data.maxLevel || 3,
            durability: data.durability || 100,
            range: data.range || 60,
            unlocked: data.unlocked || false,
            requires: data.requires || []
        };
    }

    /**
     * Initialise les catégories de bâtiments
     */
    initializeCategories() {
        this.categories = {
            basic: {
                name: 'Basique',
                icon: '🏠',
                description: 'Bâtiments essentiels pour commencer',
                color: '#8B4513'
            },
            production: {
                name: 'Production',
                icon: '🏭',
                description: 'Bâtiments qui produisent des ressources',
                color: '#228B22'
            },
            infrastructure: {
                name: 'Infrastructure',
                icon: '🛤️',
                description: 'Routes, ponts et services urbains',
                color: '#808080'
            },
            research: {
                name: 'Recherche',
                icon: '🔬',
                description: 'Bâtiments de développement technologique',
                color: '#9370DB'
            },
            advanced: {
                name: 'Avancé',
                icon: '🏛️',
                description: 'Bâtiments complexes et spécialisés',
                color: '#4169E1'
            }
        };
    }

    /**
     * Obtient les données d'un bâtiment
     * @param {string} type - Type du bâtiment
     * @returns {Object|null} - Données du bâtiment
     */
    getBuildingData(type) {
        return this.buildingTypes[type] || null;
    }

    /**
     * Obtient tous les bâtiments d'une catégorie
     * @param {string} category - Catégorie
     * @returns {Array} - Liste des bâtiments
     */
    getBuildingsByCategory(category) {
        return Object.values(this.buildingTypes).filter(building => 
            building.category === category
        );
    }

    /**
     * Obtient tous les bâtiments débloqués
     * @param {Array} unlockedResearch - Recherches débloquées
     * @returns {Array} - Bâtiments disponibles
     */
    getAvailableBuildings(unlockedResearch = []) {
        return Object.values(this.buildingTypes).filter(building => {
            if (building.unlocked) return true;
            
            // Vérifier si toutes les recherches requises sont débloquées
            return building.requires.every(research => 
                unlockedResearch.includes(research)
            );
        });
    }

    /**
     * Vérifie si un bâtiment peut être construit
     * @param {string} type - Type du bâtiment
     * @param {Object} resources - Ressources disponibles
     * @param {Array} unlockedResearch - Recherches débloquées
     * @returns {Object} - Résultat de la vérification
     */
    canBuild(type, resources, unlockedResearch = []) {
        const building = this.getBuildingData(type);
        
        if (!building) {
            return { canBuild: false, reason: 'Type de bâtiment inconnu' };
        }

        // Vérifier si débloqué
        if (!building.unlocked && !this.isUnlocked(building, unlockedResearch)) {
            return { 
                canBuild: false, 
                reason: `Recherche requise: ${building.requires.join(', ')}` 
            };
        }

        // Vérifier les ressources
        const missingResources = [];
        Object.entries(building.constructionCost).forEach(([resource, cost]) => {
            if (!resources[resource] || resources[resource] < cost) {
                missingResources.push(`${resource}: ${cost - (resources[resource] || 0)}`);
            }
        });

        if (missingResources.length > 0) {
            return {
                canBuild: false,
                reason: `Ressources manquantes: ${missingResources.join(', ')}`
            };
        }

        return { canBuild: true };
    }

    /**
     * Vérifie si un bâtiment est débloqué
     * @param {Object} building - Données du bâtiment
     * @param {Array} unlockedResearch - Recherches débloquées
     * @returns {boolean}
     */
    isUnlocked(building, unlockedResearch) {
        if (building.unlocked) return true;
        
        return building.requires.every(research => 
            unlockedResearch.includes(research)
        );
    }

    /**
     * Obtient le coût de construction formaté
     * @param {string} type - Type du bâtiment
     * @returns {string} - Coût formaté
     */
    getFormattedCost(type) {
        const building = this.getBuildingData(type);
        if (!building) return '';

        const costs = Object.entries(building.constructionCost)
            .map(([resource, amount]) => `${this.getResourceIcon(resource)}${amount}`)
            .join(' ');

        return costs;
    }

    /**
     * Obtient l'icône d'une ressource
     * @param {string} resource - Type de ressource
     * @returns {string} - Icône
     */
    getResourceIcon(resource) {
        const icons = {
            wood: '🪵',
            stone: '🪨',
            food: '🥕',
            water: '💧',
            cloth: '🧵',
            tools: '🔨',
            metal: '⚙️',
            research: '🔬'
        };
        return icons[resource] || '📦';
    }

    /**
     * Obtient des recommandations de bâtiments
     * @param {Object} gameState - État actuel du jeu
     * @returns {Array} - Bâtiments recommandés
     */
    getRecommendedBuildings(gameState) {
        const recommendations = [];
        const { population, resources, buildings } = gameState;

        // Logement insuffisant
        const housingCapacity = buildings
            .filter(b => b.maxResidents > 0)
            .reduce((sum, b) => sum + b.maxResidents, 0);
        
        if (population > housingCapacity * 0.8) {
            recommendations.push({
                type: 'hut',
                reason: 'Logement insuffisant',
                priority: 'high'
            });
        }

        // Manque de nourriture
        if (resources.food < population * 10) {
            recommendations.push({
                type: 'farm',
                reason: 'Production alimentaire insuffisante',
                priority: 'high'
            });
        }

        // Manque de recherche
        if (resources.research < 50 && !buildings.find(b => b.produces === 'research')) {
            recommendations.push({
                type: 'research_tent',
                reason: 'Aucun bâtiment de recherche',
                priority: 'medium'
            });
        }

        return recommendations;
    }

    /**
     * Calcule l'efficacité optimale d'un bâtiment
     * @param {string} type - Type du bâtiment
     * @param {Object} context - Contexte du placement
     * @returns {number} - Score d'efficacité (0-1)
     */
    calculatePlacementEfficiency(type, context) {
        const building = this.getBuildingData(type);
        if (!building) return 0;

        let efficiency = 0.5; // Base
        const { x, y, nearbyBuildings, resources } = context;

        // Bonus pour les bâtiments de production près des ressources
        if (building.produces) {
            const resourceBuildings = nearbyBuildings.filter(b => 
                b.produces === building.produces || 
                (building.consumes && Object.keys(building.consumes).includes(b.produces))
            );
            efficiency += Math.min(0.3, resourceBuildings.length * 0.1);
        }

        // Bonus pour l'accès routier
        const nearbyRoads = nearbyBuildings.filter(b => b.type === 'road');
        if (nearbyRoads.length > 0) {
            efficiency += 0.2;
        }

        // Malus pour la sur-concentration
        const sameTypeBuildings = nearbyBuildings.filter(b => b.type === type);
        if (sameTypeBuildings.length > 2) {
            efficiency -= Math.min(0.4, (sameTypeBuildings.length - 2) * 0.1);
        }

        return Math.max(0, Math.min(1, efficiency));
    }

    /**
     * Obtient les statistiques des bâtiments
     * @returns {Object} - Statistiques globales
     */
    getStatistics() {
        const stats = {
            totalTypes: Object.keys(this.buildingTypes).length,
            byCategory: {},
            unlocked: 0,
            locked: 0
        };

        Object.values(this.buildingTypes).forEach(building => {
            // Par catégorie
            if (!stats.byCategory[building.category]) {
                stats.byCategory[building.category] = 0;
            }
            stats.byCategory[building.category]++;

            // Débloqués/verrouillés
            if (building.unlocked) {
                stats.unlocked++;
            } else {
                stats.locked++;
            }
        });

        return stats;
    }

    /**
     * Valide les données d'un bâtiment
     * @param {Object} buildingData - Données à valider
     * @returns {Array} - Liste des erreurs
     */
    validateBuildingData(buildingData) {
        const errors = [];

        // Champs obligatoires
        const required = ['name', 'category', 'size'];
        required.forEach(field => {
            if (!buildingData[field]) {
                errors.push(`Champ obligatoire manquant: ${field}`);
            }
        });

        // Validation des coûts
        if (buildingData.constructionCost) {
            Object.entries(buildingData.constructionCost).forEach(([resource, cost]) => {
                if (typeof cost !== 'number' || cost < 0) {
                    errors.push(`Coût invalide pour ${resource}: ${cost}`);
                }
            });
        }

        // Validation de la taille
        if (buildingData.size && (buildingData.size < 5 || buildingData.size > 100)) {
            errors.push(`Taille invalide: ${buildingData.size} (doit être entre 5 et 100)`);
        }

        return errors;
    }
}

// Instance globale
const buildingDataManager = new BuildingDataManager();

// Export pour utilisation dans d'autres modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BuildingDataManager;
} else {
    window.BuildingDataManager = BuildingDataManager;
    window.buildingDataManager = buildingDataManager;
}