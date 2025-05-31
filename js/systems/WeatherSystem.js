class WeatherSystem {
    constructor(game) {
        this.game = game;
        this.currentWeather = 'sunny';
        this.temperature = 20;
        this.weatherTimer = 0;
        this.weatherDuration = 120; // 2 minutes
        this.weatherTypes = {
            sunny: { temp: 25, productionMod: 1.0, happinessMod: 1.1 },
            rainy: { temp: 15, productionMod: 0.8, happinessMod: 0.9 },
            stormy: { temp: 10, productionMod: 0.6, happinessMod: 0.7 }
        };
    }

    update(deltaTime) {
        this.weatherTimer += deltaTime / 1000;
        if (this.weatherTimer >= this.weatherDuration) {
            this.changeWeather();
            this.weatherTimer = 0;
        }
    }

    changeWeather() {
        const weathers = Object.keys(this.weatherTypes);
        this.currentWeather = weathers[Math.floor(Math.random() * weathers.length)];
        console.log(`🌤️ Météo: ${this.currentWeather}`);
    }

    getWeatherEffect() {
        return this.weatherTypes[this.currentWeather] || { productionMod: 1.0, happinessMod: 1.0 };
    }
}