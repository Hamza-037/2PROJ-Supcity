import { eventSystem, GameEvents } from '../core/EventSystem.js';

class GameStateManager {
    constructor(game) {
        this.game = game;
    }

    update(deltaTime) {
        if (!this.game.isRunning || !this.game.isInitialized) return;
        if (deltaTime > 1000) {
            console.warn(`⚠️ DeltaTime aberrant: ${deltaTime}ms`);
            deltaTime = 100;
        }
        if (deltaTime < 0) return;
        try {
            this.updateCitizens(deltaTime);
            this.updateBuildings(deltaTime);
            if (this.game.particleSystem?.update) {
                this.game.particleSystem.update(deltaTime);
            }
            if (Math.random() < 0.1) {
                this.assignJobsToUnemployed();
            }
        } catch (err) {
            console.error('Erreur update():', err);
        }
    }

    fixedUpdate(deltaTime) {
        try {
            if (!this.game.isRunning || !this.game.isInitialized) return;
            if (this.game.resourceManager?.update) {
                this.game.resourceManager.update();
            }
            if (this.game.researchSystem?.update) {
                this.game.researchSystem.update(deltaTime);
            }
            if (this.game.gameTime.currentTime % 5000 < 100) {
                this.checkGameBalance();
            }
            if (eventSystem?.processQueue) eventSystem.processQueue();
        } catch (err) {
            console.error('Erreur fixedUpdate():', err);
        }
    }

    updateCitizens(deltaTime) {
        const toRemove = [];
        this.game.citizens.forEach((citizen, idx) => {
            try {
                const alive = citizen.update(deltaTime);
                if (!alive) {
                    toRemove.push(idx);
                    this.game.eventHandler.onCitizenDied({ data: { citizen } });
                }
            } catch (e) {
                console.error(`Erreur update citoyen ${citizen.name}:`, e);
                toRemove.push(idx);
            }
        });
        toRemove.reverse().forEach(i => this.game.citizens.splice(i,1));
    }

    updateBuildings(deltaTime) {
        this.game.buildings.forEach(b => b.update(deltaTime));
    }

    assignJobsToUnemployed() {
        const unemployed = this.game.citizens.filter(c=>!c.job);
        const jobs = this.game.buildings.filter(b=>b.needsWorkers && b.needsWorkers());
        unemployed.forEach(citizen=>{
            const nearby = jobs.filter(b=> citizen.getDistanceTo(b.x,b.y) < 200);
            if (nearby.length>0) {
                const closest = nearby.reduce((a,b)=> citizen.getDistanceTo(a.x,a.y) < citizen.getDistanceTo(b.x,b.y)?a:b);
                citizen.assignJob(closest);
            }
        });
    }

    checkGameBalance() {
        const population = this.game.citizens.length;
        const resources = this.game.resourceManager.getSummary();
        const now = Date.now();
        if (!this.game.lastNotifications) this.game.lastNotifications = {};
        const cooldown = 10000;
        ['food','water'].forEach(res=>{
            if (resources[res] && resources[res].amount < population*2) {
                const key=`critical_${res}`;
                const last=this.game.lastNotifications[key]||0;
                if (now-last>cooldown) {
                    eventSystem.emit(GameEvents.UI_NOTIFICATION,{type:'error',message:`Manque critique de ${res}!`});
                    this.game.lastNotifications[key]=now;
                }
            }
        });
        this.checkResourceBalance(population, resources);
    }

    checkResourceBalance(population, resources) {
        if (population>0) {
            const avg=this.game.citizens.reduce((s,c)=>s+c.happiness,0)/population;
            if (avg<30 && !this.game.lowHappinessWarned) {
                eventSystem.emit(GameEvents.UI_NOTIFICATION,{type:'warning',message:'Le bonheur de la population est très bas!'});
                this.game.lowHappinessWarned=true;
            } else if (avg>60) {
                this.game.lowHappinessWarned=false;
            }
        }
        this.checkProductionBalance(resources);
    }

    checkProductionBalance(resources) {
        const foodProducers=this.game.buildings.filter(b=> b.produces==='food' || b.type==='farm' || b.type==='berry_bush');
        if (foodProducers.length===0 && this.game.citizens.length>2) {
            const now=Date.now();
            const last=this.game.lastNotifications['no_food_production']||0;
            if (now-last>30000) {
                eventSystem.emit(GameEvents.UI_NOTIFICATION,{type:'warning',message:'Aucune production de nourriture ! Construisez une ferme.'});
                this.game.lastNotifications['no_food_production']=now;
            }
        }
        const waterProducers=this.game.buildings.filter(b=> b.type==='well');
        if (waterProducers.length===0 && this.game.citizens.length>3) {
            const now=Date.now();
            const last=this.game.lastNotifications['no_water_production']||0;
            if (now-last>30000) {
                eventSystem.emit(GameEvents.UI_NOTIFICATION,{type:'warning',message:"Aucune production d'eau ! Construisez un puits."});
                this.game.lastNotifications['no_water_production']=now;
            }
        }
    }
}

export { GameStateManager };
