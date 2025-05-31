class AnimationManager {
    constructor() {
        this.animations = new Map();
        this.tweens = [];
    }

    update(deltaTime) {
        // Met à jour les animations
        this.animations.forEach((anim, id) => {
            anim.time += deltaTime;
            if (anim.time >= anim.duration) {
                anim.time = anim.loop ? 0 : anim.duration;
                if (!anim.loop && anim.onComplete) {
                    anim.onComplete();
                }
            }
        });

        // Met à jour les tweens
        this.tweens = this.tweens.filter(tween => {
            tween.time += deltaTime;
            const progress = Math.min(tween.time / tween.duration, 1);
            const easedProgress = this.easeInOutQuad(progress);

            // Interpole la valeur
            const currentValue = tween.from + (tween.to - tween.from) * easedProgress;
            tween.object[tween.property] = currentValue;

            if (progress >= 1 && tween.onComplete) {
                tween.onComplete();
                return false;
            }

            return progress < 1;
        });
    }

    createAnimation(id, duration, loop = true) {
        const animation = {
            id,
            duration,
            loop,
            time: 0,
            onComplete: null
        };

        this.animations.set(id, animation);
        return animation;
    }

    tween(object, property, from, to, duration, onComplete = null) {
        this.tweens.push({
            object,
            property,
            from,
            to,
            duration,
            time: 0,
            onComplete
        });
    }

    easeInOutQuad(t) {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    }

    getAnimationProgress(id) {
        const anim = this.animations.get(id);
        return anim ? anim.time / anim.duration : 0;
    }

    removeAnimation(id) {
        this.animations.delete(id);
    }
}