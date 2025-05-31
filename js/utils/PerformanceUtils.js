class PerformanceUtils {
    static performanceData = {
        fps: 0,
        frameTime: 0,
        memoryUsage: 0,
        lastUpdate: 0
    };

    static startProfiling(name) {
        if (!window.performance) return null;
        return {
            name,
            startTime: performance.now()
        };
    }

    static endProfiling(profile) {
        if (!profile || !window.performance) return 0;
        return performance.now() - profile.startTime;
    }

    static measureFPS() {
        const now = performance.now();
        const delta = now - this.performanceData.lastUpdate;

        if (delta > 0) {
            this.performanceData.fps = 1000 / delta;
            this.performanceData.frameTime = delta;
        }

        this.performanceData.lastUpdate = now;
        return this.performanceData.fps;
    }

    static getMemoryUsage() {
        if (performance.memory) {
            this.performanceData.memoryUsage = performance.memory.usedJSHeapSize / 1048576; // MB
        }
        return this.performanceData.memoryUsage;
    }

    static throttle(func, delay) {
        let timeoutId;
        let lastExecTime = 0;

        return function (...args) {
            const currentTime = Date.now();

            if (currentTime - lastExecTime > delay) {
                func.apply(this, args);
                lastExecTime = currentTime;
            } else {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    func.apply(this, args);
                    lastExecTime = Date.now();
                }, delay - (currentTime - lastExecTime));
            }
        };
    }

    static debounce(func, delay) {
        let timeoutId;

        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }
}