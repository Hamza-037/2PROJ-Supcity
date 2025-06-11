class EconomySystem {
    constructor(game) {
        this.game = game;
        this.money = 0;
        this.taxRate = 0.1;
        this.tradingPosts = [];
    }

    update(deltaTime) {
        // Système économique simple
        const population = this.game.citizens.length;
        this.money += population * this.taxRate * deltaTime / 1000;
    }

    canAfford(cost) {
        return this.money >= cost;
    }

    spend(amount) {
        if (this.canAfford(amount)) {
            this.money -= amount;
            return true;
        }
        return false;
    }
}

}
export { EconomySystem };
