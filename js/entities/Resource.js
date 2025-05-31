class Resource {
    constructor(type, x, y, amount = 100) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.amount = amount;
        this.maxAmount = amount;
        this.regenerationRate = 0.1;
        this.depleted = false;
    }

    update(deltaTime) {
        if (this.depleted && this.amount < this.maxAmount) {
            this.amount += this.regenerationRate * deltaTime / 1000;
            if (this.amount >= this.maxAmount) {
                this.depleted = false;
            }
        }
    }

    harvest(amount) {
        const harvested = Math.min(amount, this.amount);
        this.amount -= harvested;
        if (this.amount <= 0) {
            this.depleted = true;
        }
        return harvested;
    }
}