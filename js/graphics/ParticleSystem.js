class ParticleSystem {
    constructor(ctx) {
        this.ctx = ctx;
        this.particles = [];
        this.maxParticles = 200;
    }

    update(deltaTime) {
        this.particles = this.particles.filter(particle => {
            particle.update(deltaTime / 1000);
            return particle.life > 0;
        });
    }

    render() {
        this.particles.forEach(particle => {
            particle.render(this.ctx);
        });
    }

    createParticle(x, y, options = {}) {
        if (this.particles.length >= this.maxParticles) return;

        const particle = {
            x: x,
            y: y,
            vx: options.vx || (Math.random() - 0.5) * 50,
            vy: options.vy || -Math.random() * 30,
            life: options.life || 1,
            maxLife: options.life || 1,
            size: options.size || 3,
            color: options.color || '#FFD700',

            update(dt) {
                this.x += this.vx * dt;
                this.y += this.vy * dt;
                this.vy += 20 * dt; // Gravity
                this.life -= dt;
            },

            render(ctx) {
                const alpha = this.life / this.maxLife;
                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        };

        this.particles.push(particle);
    }

    createEffect(type, x, y) {
        switch (type) {
            case 'construction':
                for (let i = 0; i < 5; i++) {
                    this.createParticle(x + Math.random() * 20 - 10, y, {
                        vy: -20 - Math.random() * 20,
                        color: '#8B4513',
                        size: 2 + Math.random() * 3,
                        life: 0.5 + Math.random() * 0.5
                    });
                }
                break;

            case 'production':
                this.createParticle(x, y, {
                    vy: -30,
                    color: '#4CAF50',
                    size: 4,
                    life: 1
                });
                break;

            case 'smoke':
                this.createParticle(x + Math.random() * 10 - 5, y, {
                    vy: -15 - Math.random() * 10,
                    vx: Math.random() * 10 - 5,
                    color: 'rgba(128, 128, 128, 0.6)',
                    size: 4 + Math.random() * 3,
                    life: 2 + Math.random()
                });
                break;
        }
    }

    setMaxParticles(max) {
        this.maxParticles = max;
    }
}