class CitizenDataManager {
    constructor() {
        this.citizenTypes = this.initializeCitizenTypes();
        this.nameGenerator = new NameGenerator();
    }

    initializeCitizenTypes() {
        return {
            peasant: {
                name: 'Paysan',
                workEfficiency: 1.0,
                specialization: 'agriculture',
                preferredJobs: ['farm', 'berry_bush']
            },

            worker: {
                name: 'Ouvrier',
                workEfficiency: 1.1,
                specialization: 'production',
                preferredJobs: ['wood_camp', 'stone_pit', 'workshop']
            },

            scholar: {
                name: 'Érudit',
                workEfficiency: 1.2,
                specialization: 'research',
                preferredJobs: ['research_tent', 'library']
            }
        };
    }

    generateCitizenData() {
        return {
            name: this.nameGenerator.generateName(),
            age: 18 + Math.random() * 30,
            gender: Math.random() < 0.5 ? 'male' : 'female',
            personality: this.generatePersonality(),
            skills: this.generateSkills(),
            preferences: this.generatePreferences()
        };
    }

    generatePersonality() {
        const traits = [
            'hardworking', 'lazy', 'social', 'shy', 'energetic', 'calm',
            'optimistic', 'pessimistic', 'creative', 'practical'
        ];

        const selectedTraits = [];
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

    generateSkills() {
        return {
            agriculture: Math.random(),
            construction: Math.random(),
            crafting: Math.random(),
            research: Math.random(),
            leadership: Math.random()
        };
    }

    generatePreferences() {
        return {
            preferredWorkType: ['agriculture', 'production', 'research'][Math.floor(Math.random() * 3)],
            socialLevel: Math.random(),
            comfortLevel: Math.random()
        };
    }
}