class ResourceDataManager {
    constructor() {
        this.resourceTypes = this.initializeResourceTypes();
    }

    initializeResourceTypes() {
        return {
            // Ressources de base
            food: {
                name: 'Nourriture',
                icon: '🥕',
                category: 'basic',
                baseCapacity: 1000,
                decayRate: 0,
                tradeable: true,
                essential: true
            },

            wood: {
                name: 'Bois',
                icon: '🪵',
                category: 'material',
                baseCapacity: 1000,
                decayRate: 0,
                tradeable: true,
                essential: true
            },

            stone: {
                name: 'Pierre',
                icon: '🪨',
                category: 'material',
                baseCapacity: 1000,
                decayRate: 0,
                tradeable: true,
                essential: true
            },

            water: {
                name: 'Eau',
                icon: '💧',
                category: 'basic',
                baseCapacity: 1000,
                decayRate: 0.01, // L'eau peut s'évaporer lentement
                tradeable: false,
                essential: true
            },

            research: {
                name: 'Recherche',
                icon: '🔬',
                category: 'knowledge',
                baseCapacity: 1000,
                decayRate: 0,
                tradeable: false,
                essential: false
            },

            // Ressources avancées
            iron: {
                name: 'Fer',
                icon: '⚙️',
                category: 'metal',
                baseCapacity: 500,
                decayRate: 0,
                tradeable: true,
                essential: false
            },

            cloth: {
                name: 'Tissu',
                icon: '🧵',
                category: 'manufactured',
                baseCapacity: 300,
                decayRate: 0.005,
                tradeable: true,
                essential: false
            },

            tools: {
                name: 'Outils',
                icon: '🔨',
                category: 'manufactured',
                baseCapacity: 200,
                decayRate: 0.01, // Les outils s'usent
                tradeable: true,
                essential: false
            }
        };
    }

    getResource(type) {
        return this.resourceTypes[type] || null;
    }

    getByCategory(category) {
        return Object.entries(this.resourceTypes)
            .filter(([_, resource]) => resource.category === category)
            .map(([type, resource]) => ({ type, ...resource }));
    }

    getEssentialResources() {
        return Object.entries(this.resourceTypes)
            .filter(([_, resource]) => resource.essential)
            .map(([type, resource]) => ({ type, ...resource }));
    }
}