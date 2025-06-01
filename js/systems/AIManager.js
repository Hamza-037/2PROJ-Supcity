class AIManager {
    constructor(game) {
        this.game = game;
        this.lastJobAssignment = 0;
        this.lastNeedsCheck = 0;
    }

    update(deltaTime) {
        const now = Date.now();
        
        if (now - this.lastJobAssignment > 5000) {
            this.assignJobs();
            this.lastJobAssignment = now;
        }
        
        if (now - this.lastNeedsCheck > 3000) {
            this.checkCitizenNeeds();
            this.lastNeedsCheck = now;
        }
    }

    assignJobs() {
        const unemployed = this.game.citizens.filter(c => !c.job);
        const jobsAvailable = this.game.buildings.filter(b => b.needsWorkers && b.needsWorkers());
        
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
                
                if (citizen.assignJob) citizen.assignJob(closestJob);
            }
        });
    }

    checkCitizenNeeds() {
        this.game.citizens.forEach(citizen => {
            if (citizen.needs && (citizen.needs.hunger < 30 || citizen.needs.thirst < 30)) {
                citizen.state = citizen.needs.hunger < citizen.needs.thirst ? 'seeking_food' : 'seeking_water';
            }
        });
    }
}

export { AIManager };