class TransportSystem {
    constructor(game) {
        this.game = game;
        this.routes = [];
        this.vehicles = [];
    }

    update(deltaTime) {
        this.vehicles.forEach(vehicle => {
            vehicle.update(deltaTime);
        });
        this.vehicles = this.vehicles.filter(v => !v.shouldBeRemoved);
    }

    createVehicle(x, y, type = 'cart') {
        const vehicle = new Vehicle(x, y, type);
        this.vehicles.push(vehicle);
        return vehicle;
    }

    createRoute(from, to, resourceType) {
        const route = { from, to, resourceType, active: true };
        this.routes.push(route);
        return route;
    }
}

export { TransportSystem };