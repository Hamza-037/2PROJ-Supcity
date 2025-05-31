class ResearchDataManager {
    constructor() {
        this.researchTree = this.initializeResearchTree();
    }

    initializeResearchTree() {
        return {
            // Âge préhistorique
            agriculture: {
                id: 'agriculture',
                name: 'Agriculture',
                description: 'Permet la culture organisée et la construction de fermes',
                cost: 75,
                prerequisites: [],
                unlocks: ['farm'],
                age: 'prehistoric',
                icon: '🌾'
            },
            
            tools: {
                id: 'tools',
                name: 'Outils primitifs',
                description: 'Fabrication d\'outils en pierre et en bois',
                cost: 50,
                prerequisites: [],
                unlocks: ['workshop'],
                age: 'prehistoric',
                icon: '🔨'
            },
            
            animal_husbandry: {
                id: 'animal_husbandry',
                name: 'Élevage',
                description: 'Domestication et élevage d\'animaux',
                cost: 100,
                prerequisites: ['agriculture'],
                unlocks: ['pasture'],
                age: 'prehistoric',
                icon: '🐄'
            },
            
            // Améliorations
            better_tools: {
                id: 'better_tools',
                name: 'Outils améliorés',
                description: '+20% d\'efficacité de production',
                cost: 100,
                prerequisites: ['tools'],
                effect: 'production_efficiency',
                age: 'prehistoric',
                icon: '⚒️'
            },
            
            housing_upgrade: {
                id: 'housing_upgrade',
                name: 'Logements améliorés',
                description: 'Augmente la capacité des logements',
                cost: 100,
                prerequisites: [],
                effect: 'housing_capacity',
                age: 'prehistoric',
                icon: '🏘️'
            }
        };
    }

    getResearch(id) {
        return this.researchTree[id] || null;
    }

    getAvailableResearch(unlockedResearch) {
        return Object.values(this.researchTree).filter(research => {
            // Pas encore débloqué
            if (unlockedResearch.includes(research.id)) return false;
            
            // Prérequis satisfaits
            return research.prerequisites.every(prereq => 
                unlockedResearch.includes(prereq)
            );
        });
    }

    getByAge(age) {
        return Object.values(this.researchTree).filter(research => 
            research.age === age
        );
    }
}