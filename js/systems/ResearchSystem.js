// js/systems/ResearchSystem.js - Système de recherche pour SupCity1

class ResearchSystem {
    constructor(game) {
        this.game = game;
        this.unlockedResearch = ['basic_construction'];
        this.currentResearch = null;
        this.researchProgress = 0;
        this.availableResearch = {
            agriculture: { name: 'Agriculture', cost: 75, unlocks: ['farm'] },
            tools: { name: 'Outils', cost: 50, unlocks: ['workshop'] },
            better_tools: { name: 'Meilleurs outils', cost: 100, prerequisites: ['tools'] },
            housing_upgrade: { name: 'Logement amélioré', cost: 100, prerequisites: [] },
            animal_husbandry: { name: 'Élevage', cost: 150, prerequisites: ['agriculture'] }
        };
    }

    update(deltaTime) {
        if (this.currentResearch && this.game.resourceManager.hasResource('research', 1)) {
            this.game.resourceManager.removeResource('research', 1);
            this.researchProgress += 1;

            const research = this.availableResearch[this.currentResearch];
            if (this.researchProgress >= research.cost) {
                this.completeResearch(this.currentResearch);
            }
        }
    }

    startResearch(researchType) {
        if (this.canResearch(researchType)) {
            this.currentResearch = researchType;
            this.researchProgress = 0;
            return true;
        }
        return false;
    }

    canResearch(researchType) {
        const research = this.availableResearch[researchType];
        if (!research || this.unlockedResearch.includes(researchType)) return false;
        
        return (research.prerequisites || []).every(prereq => 
            this.unlockedResearch.includes(prereq)
        );
    }

    completeResearch(researchType) {
        this.unlockedResearch.push(researchType);
        this.currentResearch = null;
        this.researchProgress = 0;
        eventSystem.emit(GameEvents.RESEARCH_COMPLETED, { researchType });
    }

    getUnlockedResearch() {
        return [...this.unlockedResearch];
    }

    save() {
        return {
            unlockedResearch: this.unlockedResearch,
            currentResearch: this.currentResearch,
            researchProgress: this.researchProgress
        };
    }

    load(data) {
        this.unlockedResearch = data.unlockedResearch || ['basic_construction'];
        this.currentResearch = data.currentResearch || null;
        this.researchProgress = data.researchProgress || 0;
    }

    reset() {
        this.unlockedResearch = ['basic_construction'];
        this.currentResearch = null;
        this.researchProgress = 0;
    }
}

// Export pour utilisation dans d'autres modules
export { ResearchSystem };