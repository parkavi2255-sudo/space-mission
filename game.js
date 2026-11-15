import * as THREE from
'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';



// SCENE
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020510);
scene.fog = new THREE.Fog(0x020510, 70, 240);

const camera = new THREE.PerspectiveCamera(
    70, window.innerWidth / window.innerHeight, 0.1, 200
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// LIGHTS
scene.add(new THREE.HemisphereLight(0x9acaff, 0x171025, 2));

const light = new THREE.DirectionalLight(0xffffff, 2);
light.position.set(10, 20, 10);
scene.add(light);

// SPACE FLOOR
const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshStandardMaterial({ color: 0x101b30, roughness: 0.9 })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.05;
scene.add(floor);

const grid = new THREE.GridHelper(200, 100, 0x17618c, 0x172844);
scene.add(grid);

// STARS
const starGeometry = new THREE.BufferGeometry();
const starPositions = [];

for (let i = 0; i < 1200; i++) {
    starPositions.push(
        (Math.random() - .5) * 180,
        Math.random() * 90,
        (Math.random() - .5) * 180
    );
}

starGeometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(starPositions, 3)
);

const stars = new THREE.Points(
    starGeometry,
    new THREE.PointsMaterial({ color: 0xffffff, size: 0.18 })
);
scene.add(stars);

// DARK GALAXY NEBULA EFFECT
function createNebula(color, x, y, z, size) {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;

    const ctx = canvas.getContext("2d");

    const gradient = ctx.createRadialGradient(
        128, 128, 10,
        128, 128, 128
    );

    gradient.addColorStop(0, color);
    gradient.addColorStop(1, "transparent");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);

    const texture = new THREE.CanvasTexture(canvas);

    const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        opacity: 0.85,
depthWrite: false,
blending: THREE.AdditiveBlending
    });

    const nebula = new THREE.Sprite(material);
    nebula.position.set(x, y, z);
    nebula.scale.set(size, size, 1);

    scene.add(nebula);
}

createNebula("rgba(120, 0, 255, 0.8)", -25, 15, -90, 90);
createNebula("rgba(0, 100, 255, 0.8)", 30, -10, -100, 100);
createNebula("rgba(255, 0, 100, 0.7)", 0, 30, -110, 80);
// DISTANT PLANET
const planet = new THREE.Mesh(
    new THREE.SphereGeometry(9, 32, 32),
    new THREE.MeshStandardMaterial({
        color: 0x174a93,
        roughness: 1
    })
);
planet.position.set(-35, 15, -65);
scene.add(planet);

// ASTRONAUT
const player = new THREE.Group();
scene.add(player);

const suit = new THREE.MeshStandardMaterial({ color: 0xe5edf5 });
const blue = new THREE.MeshStandardMaterial({ color: 0x159bd5 });
const dark = new THREE.MeshStandardMaterial({ color: 0x18243a });
const gold = new THREE.MeshStandardMaterial({
    color: 0xffc928,
    emissive: 0x332000
});

function part(parent, geometry, material, x, y, z) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
}

// Body
part(player, new THREE.CapsuleGeometry(.42, .8, 5, 10), suit, 0, 1.15, 0);

// Head
part(player, new THREE.SphereGeometry(.38, 16, 16), suit, 0, 2.05, 0);

// Helmet glass
part(player, new THREE.SphereGeometry(.29, 16, 16),
    new THREE.MeshStandardMaterial({
        color: 0x35bafa, metalness: .6, roughness: .15
    }), 0, 2.08, -.19);

// Backpack
part(player, new THREE.BoxGeometry(.65, .85, .3), blue, 0, 1.3, .38);

// Arms
const arm1 = part(player, new THREE.CapsuleGeometry(.14, .65, 4, 8), suit, -.52, 1.35, 0);
arm1.rotation.z = -.2;
const arm2 = part(player, new THREE.CapsuleGeometry(.14, .65, 4, 8), suit, .52, 1.35, 0);
arm2.rotation.z = .2;

// PLAYER LEGS
part(player, new THREE.CapsuleGeometry(.17, .65, 5, 8),
    dark, -.22, .42, 0);

part(player, new THREE.CapsuleGeometry(.17, .65, 5, 8),
    dark, .22, .42, 0);

// Laser gun
const gun = new THREE.Group();
player.add(gun);
gun.position.set(.55, 1.35, -.65);
part(gun, new THREE.BoxGeometry(.18, .18, .8), dark, 0, 0, -.15);
part(gun, new THREE.BoxGeometry(.12, .1, .25), gold, 0, .1, -.6);

// Player state
let health = 100;
let score = 0;
let kills = 0;
let currentMission = 1;

const missionNames = [
    "Space Station – Defeat Enemy Soldiers",
    "Satellite Rescue – Protect the Satellite",
    "Black Hole Survival – Escape the Gravity",
    "Enemy Base – Defeat the Mini Boss",
    "Dark Galaxy – Defeat the Final Boss"
];
let bossSpawned = false;
let gameOver = false;
let shield = false;

const keys = {};
let yaw = 0;
let verticalSpeed = 0;
let grounded = true;

window.addEventListener('keydown', e => {
    keys[e.code] = true;

    if (e.code === 'Space') e.preventDefault();

    if (e.code === 'KeyE') specialPower();

    // RESTART GAME
    if (e.code === 'KeyR' && gameOver) {
        window.location.reload();
    }
});

window.addEventListener('keyup', e => keys[e.code] = false);

// Mouse aim
window.addEventListener('mousemove', e => {
    if (document.pointerLockElement === renderer.domElement) {
        yaw -= e.movementX * .002;
    }
});

// Shooting
let projectiles = [];


// LASER TRAIL EFFECT
function createLaserTrail(start, direction) {
    const trailGeometry = new THREE.BufferGeometry();

    const points = [
        start.clone(),
        start.clone().add(direction.clone().multiplyScalar(-1.5))
    ];

    trailGeometry.setFromPoints(points);

    const trailMaterial = new THREE.LineBasicMaterial({
        color: 0x39eaff,
        transparent: true,
        opacity: 0.9
    });

    const trail = new THREE.Line(trailGeometry, trailMaterial);
    scene.add(trail);

    setTimeout(() => {
        scene.remove(trail);
        trailGeometry.dispose();
        trailMaterial.dispose();
    }, 120);
}

function shoot() {
    if (gameOver) return;
    if (!rapidFire && shoot.cooldown && Date.now() < shoot.cooldown) return;
    shoot.cooldown = Date.now() + (rapidFire ? 100 : 350);
    const direction = new THREE.Vector3(
        Math.sin(yaw), 0, -Math.cos(yaw)
    );

    const start = player.position.clone();
    start.y += 1.45;
    start.add(direction.clone().multiplyScalar(.8));

    const laser = new THREE.Mesh(
        new THREE.SphereGeometry(.12, 8, 8),
        new THREE.MeshBasicMaterial({
            color: 0x39eaff
        })
    );

    laser.position.copy(start);
    scene.add(laser);

    createLaserTrail(start, direction);
    projectiles.push({
        mesh: laser,
        velocity: direction.multiplyScalar(.9),
        life: 70
    });
}

window.addEventListener('mousedown', e => {
    if (e.button === 0) {
        shoot();
        renderer.domElement.requestPointerLock?.();
    }
});

// ASTRONAUT SELECTION

let astronaut = "Alex";

const astronautPowers = {
    Alex: "Energy Shield",
    Luna: "Laser Boost",
    Max: "Health Repair",
    Nova: "Gravity Pulse"
};

function selectAstronaut(name) {
    astronaut = name;

    document.getElementById("hero").textContent = name;

    document.getElementById("message").textContent =
        name + " selected: " + astronautPowers[name];
}

window.addEventListener("keydown", e => {
    if (e.code === "Digit1") selectAstronaut("Alex");
    if (e.code === "Digit2") selectAstronaut("Luna");
    if (e.code === "Digit3") selectAstronaut("Max");
    if (e.code === "Digit4") selectAstronaut("Nova");
});

// FOUR UNIQUE SPECIAL POWERS

let powerReady = true;
let rapidFire = false;
let gravityPulse = false;

function specialPower() {
    if (!powerReady || gameOver) return;

    powerReady = false;

    if (astronaut === "Alex") {
        shield = true;
        document.getElementById("message").textContent =
            "ALEX: ENERGY SHIELD ACTIVATED!";
        setTimeout(() => shield = false, 5000);
    }

    else if (astronaut === "Luna") {
        rapidFire = true;
        document.getElementById("message").textContent =
            "LUNA: LASER BOOST ACTIVATED!";
        setTimeout(() => rapidFire = false, 5000);
    }

    else if (astronaut === "Max") {
        health = Math.min(100, health + 40);
        document.getElementById("message").textContent =
            "MAX: HEALTH RESTORED!";
    }

    else if (astronaut === "Nova") {
        gravityPulse = true;
        enemies.forEach(enemy => {
            enemy.speed = 0;
        });

        document.getElementById("message").textContent =
            "NOVA: GRAVITY PULSE ACTIVATED!";

        setTimeout(() => {
            gravityPulse = false;
            enemies.forEach(enemy => {
                enemy.speed = enemy.boss ? 0.025 : 0.045;
            });
        }, 5000);
    }

    setTimeout(() => {
        powerReady = true;
    }, 8000);
}

// BLACK HOLE ENVIRONMENT

const blackHole = new THREE.Group();
blackHole.position.set(12, 0, -18);
scene.add(blackHole);

// Dark central sphere
const hole = new THREE.Mesh(
    new THREE.SphereGeometry(2.2, 32, 32),
    new THREE.MeshBasicMaterial({ color: 0x000000 })
);
hole.position.y = 2.5;
blackHole.add(hole);

// Glowing purple rings
const ringMaterial = new THREE.MeshBasicMaterial({
    color: 0x963cff,
    side: THREE.DoubleSide
});

const ring1 = new THREE.Mesh(
    new THREE.TorusGeometry(3.2, 0.18, 8, 80),
    ringMaterial
);
ring1.position.y = 2.5;
ring1.rotation.x = 1.2;
blackHole.add(ring1);

const ring2 = new THREE.Mesh(
    new THREE.TorusGeometry(2.8, 0.1, 8, 80),
    new THREE.MeshBasicMaterial({ color: 0x26dfff })
);
ring2.position.y = 2.5;
ring2.rotation.x = 1.4;
blackHole.add(ring2);

// Gravity pull
function applyBlackHoleGravity(delta) {
    const target = new THREE.Vector3(
        blackHole.position.x,
        0,
        blackHole.position.z
    );

    const direction = target.clone().sub(player.position);
    const distance = direction.length();
    const distanceDisplay = document.getElementById("distance");

    if (distance < 8) {
        distanceDisplay.textContent = "DANGER!";
        distanceDisplay.style.color = "red";
    }
    else if (distance < 19) {
        distanceDisplay.textContent = "WARNING";
        distanceDisplay.style.color = "orange";
    }
    else {
        distanceDisplay.textContent = "SAFE";
        distanceDisplay.style.color = "#65e6ff";
    }

    if (distance < 19 && distance > 2.5) {
        direction.normalize();

        const force = (19 - distance) * 0.65;

        player.position.addScaledVector(
            direction,
            force * delta
        );

        document.getElementById("message").textContent =
            "WARNING! BLACK HOLE GRAVITY DETECTED!";
    }

    if (distance <= 2.5) {
        health = Math.max(0, health - 25 * delta);
    }
}


// ENEMY EXPLOSION EFFECT
function createExplosion(position, color = 0xff5500, particleCount = 18) {
    const particles = [];

    for (let i = 0; i < particleCount; i++) {
        const particle = new THREE.Mesh(
            new THREE.SphereGeometry(0.08, 6, 6),
            new THREE.MeshBasicMaterial({
                color: color,
                transparent: true
            })
        );

        particle.position.copy(position);
        scene.add(particle);

        particles.push({
            mesh: particle,
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 0.35,
                Math.random() * 0.3,
                (Math.random() - 0.5) * 0.35
            ),
            life: 30
        });
    }

    explosionParticles.push(...particles);
}

let explosionParticles = [];

// ENEMIES
let enemies = [];
function createEnemy(x, z, boss = false) {
    const enemy = new THREE.Group();
    scene.add(enemy);

    
if (boss) {
    // Keep the boss model for now
    const material = new THREE.MeshStandardMaterial({
        color: 0x9c25ff,
        emissive: 0x380060
    });

    part(enemy, new THREE.CapsuleGeometry(0.8, 1.4, 5, 10),
        material, 0, 1.3, 0);

    part(enemy, new THREE.SphereGeometry(0.48, 16, 16),
        material, 0, 2.3, 0);

} else {
    // ALIEN SOLDIER
    const skin = new THREE.MeshStandardMaterial({
        color: 0x77758c,
        roughness: 0.7
    });

    const dark = new THREE.MeshStandardMaterial({
        color: 0x29283b
    });

    const eyes = new THREE.MeshBasicMaterial({
        color: 0xff7135
    });

    const green = new THREE.MeshBasicMaterial({
        color: 0x38f5c5
    });

    // Body
    part(enemy, new THREE.CapsuleGeometry(0.27, 0.82, 6, 10),
        skin, 0, 1.12, 0);

    // Large alien head
    const head = part(enemy,
        new THREE.SphereGeometry(1, 24, 18),
        skin, 0, 2.25, 0);

    head.scale.set(0.57, 0.78, 0.48);

    // Eye sockets
    part(enemy, new THREE.SphereGeometry(0.19, 16, 12),
        dark, -0.23, 2.30, -0.36);

    part(enemy, new THREE.SphereGeometry(0.19, 16, 12),
        dark, 0.23, 2.30, -0.36);

    // Glowing orange eyes
    part(enemy, new THREE.SphereGeometry(0.12, 16, 12),
        eyes, -0.24, 2.30, -0.46);

    part(enemy, new THREE.SphereGeometry(0.12, 16, 12),
        eyes, 0.24, 2.30, -0.46);

    // Long arms
    const arm1 = part(enemy,
        new THREE.CapsuleGeometry(0.085, 0.67, 5, 8),
        skin, -0.39, 1.35, 0);

    const arm2 = part(enemy,
        new THREE.CapsuleGeometry(0.085, 0.67, 5, 8),
        skin, 0.39, 1.35, 0);

    arm1.rotation.z = -0.22;
    arm2.rotation.z = 0.22;

    // Long legs
    part(enemy, new THREE.CapsuleGeometry(0.095, 0.68, 5, 8),
        dark, -0.16, 0.43, 0);

    part(enemy, new THREE.CapsuleGeometry(0.095, 0.68, 5, 8),
        dark, 0.16, 0.43, 0);

    // Energy weapon
    const gun = part(enemy,
        new THREE.BoxGeometry(0.14, 0.14, 0.62),
        dark, 0.36, 1.18, -0.40);

    part(enemy, new THREE.BoxGeometry(0.10, 0.10, 0.20),
        green, 0.36, 1.20, -0.90);
}

    enemy.position.set(x, 0, z);

    enemies.push({
        mesh: enemy,
        hp: boss ? 20 : 2,
        boss,
        speed: boss ? .025 : .045,
        attack: 0
    });
}

for (let i = 0; i < 7; i++) {
    createEnemy(
        (Math.random() - .5) * 35,
        -15 - Math.random() * 30
    );
}

// BOSS
function spawnBoss() {
    bossSpawned = true;
    createEnemy(0, -35, true);

    document.getElementById('message').textContent =
        'WARNING! BOSS APPROACHING!';
}

// =====================================
// NASA SCIENCE RESOURCE LIBRARY
// =====================================

const nasaResources = [

    {
        title: "GMAT – Orbital Mechanics",
        category: "MISSION DESIGN",
        description:
            "Learn how spacecraft trajectories, orbital paths, navigation and mission optimization are studied.",
        link:
            "https://software.nasa.gov/software/GSC-19640-1"
    },

    {
        title: "CubeSat 101",
        category: "SATELLITE ENGINEERING",
        description:
            "Learn the basic concepts and processes involved in developing a CubeSat mission.",
        link:
            "https://www.nasa.gov/kennedy/launch-services-program/cubesat-launch-initiative/cubesat-launch-initiative-resources/"
    },

    {
        title: "NASA Space Mission Design Tools",
        category: "SPACECRAFT DESIGN",
        description:
            "Explore tools used in spacecraft mission design, navigation and operations.",
        link:
            "https://www.nasa.gov/smallsat-institute/space-mission-design-tools/"
    }

];

let nasaScienceUnlocked = false;


// CREATE NASA BUTTON

const nasaButton = document.createElement("button");

nasaButton.textContent = "🔒 NASA SCIENCE FILES";

nasaButton.style.cssText = `
    position:fixed;
    top:145px;
    right:20px;
    z-index:1000;
    padding:13px 18px;
    background:#071d3d;
    color:#43eaff;
    border:1px solid #43eaff;
    border-radius:8px;
    cursor:pointer;
    font-weight:bold;
`;

document.body.appendChild(nasaButton);


// CREATE NASA RESOURCE PANEL

const nasaPanel = document.createElement("div");

nasaPanel.style.cssText = `
    display:none;
    position:fixed;
    inset:0;
    z-index:2000;
    background:rgba(0,0,10,0.94);
    overflow-y:auto;
    padding:35px 15px;
    color:white;
    font-family:Arial,sans-serif;
`;

document.body.appendChild(nasaPanel);


// DISPLAY RESOURCES

function showNASAResources() {

    const cards = nasaResources.map((resource, index) => {

        return `
        <div style="
            background:#102440;
            border:1px solid #287ca8;
            border-radius:12px;
            padding:20px;
            margin:15px auto;
            max-width:650px;
            text-align:left;
        ">

            <h2 style="color:#43eaff">
                ${index + 1}. ${resource.title}
            </h2>

            <p style="color:#f6c85f">
                ${resource.category}
            </p>

            <p>${resource.description}</p>

            ${nasaScienceUnlocked
                ? `<a href="${resource.link}"
                     target="_blank"
                     rel="noopener noreferrer"
                     style="color:#43eaff">
                     OPEN OFFICIAL NASA RESOURCE ↗
                   </a>`
                : `<p style="color:orange">
                     🔒 LOCKED – Complete the final boss mission
                   </p>`
            }

        </div>
        `;

    }).join("");

    nasaPanel.innerHTML = `

        <div style="max-width:800px;margin:auto;text-align:center">

            <h1 style="color:#43eaff">
                NASA SCIENCE DATABASE
            </h1>

            <p>
                Explore real space mission design and engineering resources.
            </p>

            ${cards}

            <p style="color:#aaa;font-size:12px">
                NASA-inspired educational simulation.
                Not an official NASA product.
            </p>

            <button id="closeNASA" style="
                padding:12px 30px;
                background:#0879bb;
                color:white;
                border:0;
                border-radius:8px;
                cursor:pointer;
                margin:20px;
            ">
                CLOSE
            </button>

        </div>
    `;

    document.getElementById("closeNASA").onclick = () => {
        nasaPanel.style.display = "none";
    };
}


// OPEN DATABASE

nasaButton.onclick = () => {
    showNASAResources();
    nasaPanel.style.display = "block";
};


// UNLOCK AFTER BOSS DEFEAT

function unlockNASAScience() {

    nasaScienceUnlocked = true;

    nasaButton.textContent = "🔬 NASA SCIENCE LIBRARY";

    nasaButton.style.background = "#064d37";

    const status = document.getElementById("scienceStatus");

    if (status) {
        status.textContent = "UNLOCKED: NASA SCIENCE LIBRARY";
        status.style.color = "#00ff88";
    }

    document.getElementById("message").textContent =
        "NASA SCIENCE DATABASE UNLOCKED!";
}
// CAMERA
const cameraOffset = new THREE.Vector3(0, 5, 9);

// ANIMATION LOOP
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);


// UPDATE EXPLOSION PARTICLES
for (let i = explosionParticles.length - 1; i >= 0; i--) {
    const p = explosionParticles[i];

    p.mesh.position.add(p.velocity);
    p.life--;

    p.mesh.material.opacity = p.life / 30;

    if (p.life <= 0) {
        scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        explosionParticles.splice(i, 1);
    }
}

    const delta = Math.min(clock.getDelta(), .05);

    if (!gameOver) {

        blackHole.rotation.y += 0.006;
        applyBlackHoleGravity(delta);
        // MOVEMENT
        const forward = new THREE.Vector3(
            Math.sin(yaw), 0, -Math.cos(yaw)
        );

        const right = new THREE.Vector3(
            Math.cos(yaw), 0, Math.sin(yaw)
        );

        if (keys.KeyW) player.position.addScaledVector(forward, 5 * delta);
        if (keys.KeyS) player.position.addScaledVector(forward, -5 * delta);
        if (keys.KeyA) player.position.addScaledVector(right, -5 * delta);
        if (keys.KeyD) player.position.addScaledVector(right, 5 * delta);

        player.rotation.y = -yaw;

        if (keys.Space && grounded) {
            verticalSpeed = 7;
            grounded = false;
        }

        player.position.y += verticalSpeed * delta;
        verticalSpeed -= 18 * delta;

        if (player.position.y < 0) {
            player.position.y = 0;
            verticalSpeed = 0;
            grounded = true;
        }

        // KEEP PLAYER IN ARENA
        player.position.x = THREE.MathUtils.clamp(
            player.position.x, -45, 45
        );

        player.position.z = THREE.MathUtils.clamp(
            player.position.z, -45, 45
        );

        // CAMERA FOLLOW
        const desired = player.position.clone().add(
            new THREE.Vector3(
                -Math.sin(yaw) * cameraOffset.z,
                cameraOffset.y,
                Math.cos(yaw) * cameraOffset.z
            )
        );

        camera.position.lerp(desired, .09);

        camera.lookAt(
    player.position.x + Math.sin(yaw) * 2,
    player.position.y + 1.4,
    player.position.z - Math.cos(yaw) * 2
);

        // LASERS
        for (let i = projectiles.length - 1; i >= 0; i--) {
            const p = projectiles[i];
            p.mesh.position.add(p.velocity);
            p.life--;

            let hit = false;

            for (const enemy of enemies) {
                if (enemy.hp <= 0) continue;

                if (p.mesh.position.distanceTo(
                    enemy.mesh.position.clone().add(
                        new THREE.Vector3(0, 1, 0)
                    )
                ) < (enemy.boss ? 1.4 : 1)) {
                    enemy.hp--;
                    hit = true;
                    if (enemy.hp <= 0) {
    createExplosion(
    enemy.mesh.position.clone().add(new THREE.Vector3(0, 1, 0)),
    enemy.boss ? 0xaa00ff : 0xff5500,
    enemy.boss ? 60 : 18
);

    scene.remove(enemy.mesh);

    score += enemy.boss ? 1000 : 100;
    kills++;
}
                    break;
                }
            }

            if (hit || p.life <= 0) {
                scene.remove(p.mesh);
                projectiles.splice(i, 1);
            }
        }

        // ENEMY AI
       
// ENEMY AI
for (const enemy of enemies) {
    if (enemy.hp <= 0) continue;

    const direction = new THREE.Vector3()
        .subVectors(player.position, enemy.mesh.position);

    const distance = direction.length();

    if (distance > 2) {
        direction.normalize();

        enemy.mesh.position.addScaledVector(
            direction, enemy.speed
        );
    } else {
        enemy.attack += delta;

        if (enemy.attack > 1.2) {
            health -= shield ? 0 : 5;
            enemy.attack = 0;
        }
    }

    // Enemy faces the player
    enemy.mesh.lookAt(
        player.position.x,
        0,
        player.position.z
    );
}



        // SPAWN NEW ENEMIES
        if (kills >= 5 && !bossSpawned) {
            spawnBoss();
        }

        // HUD
        document.getElementById('health').textContent =
            Math.max(0, Math.floor(health));

        document.getElementById('score').textContent = score;

        document.getElementById('enemies').textContent =
            enemies.filter(e => e.hp > 0).length;

        if (health <= 0) {
            gameOver = true;
            document.getElementById('message').textContent =
                'MISSION FAILED! Press R to restart.';
        }

        const boss = enemies.find(e => e.boss && e.hp > 0);
        const objective = document.getElementById("missionObjective");
        objective.textContent = "MISSION " + currentMission + ": " +
            missionNames[currentMission - 1];
        const progress = document.getElementById("missionProgress");

        if (!bossSpawned) {
            objective.textContent = "Defeat 5 enemy soldiers.";
            progress.textContent = "Enemies defeated: " + kills + " / 5";
        } else if (boss) {
            objective.textContent = "FINAL CHALLENGE: Defeat the Boss!";
            progress.textContent = "Boss health: " + boss.hp;
        }
        const bossHUD = document.getElementById("bossHUD");
        const bossHealth = document.getElementById("bossHealth");

        if (boss) {
            bossHUD.style.display = "block";
            bossHealth.style.width = (boss.hp / 20 * 100) + "%";
        } else {
            bossHUD.style.display = "none";
        }
        if (boss) {
            document.getElementById('message').textContent =
                'BOSS BATTLE! BOSS HEALTH: ' + boss.hp;
        }

        if (bossSpawned && !enemies.some(e => e.hp > 0)) {
            gameOver = true;

            document.getElementById('message').textContent =
                'MISSION COMPLETE! GALAXY SAVED! SCORE: ' + score + ' | Press R to restart';

            document.getElementById("missionObjective").textContent =
                "MISSION COMPLETED!";

            document.getElementById("missionProgress").textContent =
                "All enemies defeated!";

            unlockNASAScience();
        }
    }

    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

camera.position.set(0, 5, 9);
animate();
