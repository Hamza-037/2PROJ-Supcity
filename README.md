﻿# SupCity

**SupCity** is a browser-based city-building game where you guide a civilization from the Stone Age to the future. Inspired by *City Idle*, it combines deep simulation, resource management, and technological progression—all powered by modern JavaScript.

---

## 🚀 Quick Start

```bash
git clone https://github.com/Hamza-037/2PROJ-Supcity.git
cd supcity
```

## Lien

<https://supcity.h-hamdache.fr/>
---

## 🎮 Gameplay Highlights

- **Dynamic Citizens:**  
    Simulate lifecycles, needs (food, water, housing), and daily routines.

- **Resource Management:**  
    Gather berries, wood, stone, and craft advanced goods.

- **Research & Progression:**  
    Unlock new technologies and advance through eras.

- **Smart Pathfinding:**  
    Citizens navigate efficiently using range-based mechanics.

- **Live Dashboards:**  
    Real-time stats for resources, population, and building efficiency.

---

## 🛠️ Core Functions

```js
function updateCitizens() {
        citizens.forEach(citizen => {
                citizen.updateNeeds();
                citizen.performAction();
        });
}
```

*Simulates needs and actions for each citizen.*

```js
function gatherResource(type, amount) {
        resources[type] += amount;
        updateResourceUI();
}
```

*Collects resources and updates the UI.*

```js
function unlockResearch(researchId) {
        if (canResearch(researchId)) {
                research[researchId].unlocked = true;
                applyResearchEffects(researchId);
        }
}
```

*Unlocks new technologies and applies their effects.*

```js
function updateStats() {
        statsPanel.innerText = `
                Population: ${population}
                Food: ${resources.food}
                Wood: ${resources.wood}
                Stone: ${resources.stone}
        `;
}
```

*Displays up-to-date game statistics.*

---

## 🧰 Tech Stack

- **JavaScript (ES6+)**
- **HTML5 & CSS3**
- **Canvas/WebGL** for rendering

---

## 🤝 Contributing

Made by **Hamza Hamdache**, **Cléo Henrioux** & **Chiayé Grâce Tabitah Elloh**
Pull requests and feedback welcome!

---
