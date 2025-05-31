class Field {
    constructor(x, y, type, size = 50) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.size = size;
        this.resources = 100;
        this.maxResources = 100;
        this.regrowthRate = 0.1;
        this.lastHarvest = 0;
        this.harvestCooldown = 5000;
    }

    update(deltaTime) {
        if (this.resources < this.maxResources) {
            this.resources = Math.min(
                this.maxResources,
                this.resources + this.regrowthRate * deltaTime / 1000
            );
        }
    }

    canHarvest() {
        return this.resources > 0 && Date.now() - this.lastHarvest > this.harvestCooldown;
    }

    harvest(amount) {
        if (!this.canHarvest()) return 0;
        
        const harvested = Math.min(amount, this.resources);
        this.resources -= harvested;
        this.lastHarvest = Date.now();
        
        return harvested;
    }
}