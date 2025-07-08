import * as THREE from 'three';
import { createShadowMonster, updateShadowMonsters } from './monster.js';
import { GameMap } from './map.js';
import { initControls } from './control.js';

const monster_path = './assets/shadow_monster.png';

// 初始化場景、相機和渲染器
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// 添加環境光
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

// 添加平行光
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(0, 1, 0);
scene.add(directionalLight);

// 創建遊戲地圖
const gameMap = new GameMap(scene);

// 設置相機位置和旋轉
const startPosition = gameMap.getPlayerStartPosition();
camera.position.copy(startPosition);
camera.rotation.order = 'YXZ';

// 在文件頂部附近添加這些新的變量
const playerRadius = 0.3;

// 修改創建子彈���數
function createBullet(camera) {
    const bulletGeometry = new THREE.SphereGeometry(0.1, 32, 32);
    const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
    bullet.position.set(camera.position.x, camera.position.y, camera.position.z);
    
    // 修改子彈速度計算
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(camera.quaternion);
    bullet.velocity = direction.multiplyScalar(0.5);
    
    bullet.distanceTraveled = 0;
    return bullet;
}

// 創建爆炸效果函數
function createExplosion(position) {
    const particleCount = 20;
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const colors = [];

    for (let i = 0; i < particleCount; i++) {
        positions.push((Math.random() - 0.5) * 0.5);
        positions.push((Math.random() - 0.5) * 0.5);
        positions.push((Math.random() - 0.5) * 0.5);
        colors.push(1, 0.5, 0);
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({ size: 0.05, vertexColors: true });
    const particles = new THREE.Points(geometry, material);
    particles.position.copy(position);
    scene.add(particles);

    setTimeout(() => {
        scene.remove(particles);
    }, 1000);
}

let bullets = [];
let monsters = [];
let gameOver = false;

// 災難系統相關變數
let darknessEffectActive = false;

// 災難系統相關變數
let disasterPhase = 0; // 0: 黑暗, 1: 地震, 2: 落石, 3: 死亡
let disasterTimer = 15; // 前三個災難階段15秒，死亡階段60秒
let disasterInterval;
let earthquakeActive = false;
let fallingRocks = [];
let rockFallInterval;
const nextDisasterElement = document.getElementById('next-disaster');
const disasterTimerElement = document.getElementById('disaster-timer');

const disasters = [
    { name: "黑暗", description: "洞穴變暗" },
    { name: "地震", description: "持續晃動" },
    { name: "落石", description: "從上方掉落" },
    { name: "死亡", description: "遊戲結束" }
];

// 地震搖晃相關變數
let earthquakeShake = { x: 0, y: 0, z: 0 };
let originalCameraPosition = new THREE.Vector3();

// 初始化計時器
function startGameTimer() {
    disasterPhase = 0;
    disasterTimer = 15; // 第一個災難階段15秒
    darknessEffectActive = false;
    earthquakeActive = false;
    earthquakeShake = { x: 0, y: 0, z: 0 };
    updateDisasterDisplay();
    
    // 清除之前的計時器
    if (disasterInterval) {
        clearInterval(disasterInterval);
    }
    if (rockFallInterval) {
        clearInterval(rockFallInterval);
    }
    
    // 啟動災難計時器
    disasterInterval = setInterval(() => {
        disasterTimer--;
        updateDisasterDisplay();
        
        // 根據當前災難階段執行相應效果
        switch (disasterPhase) {
            case 0: // 黑暗
                if (disasterTimer === 0) {
                    activateDarknessEffect();
                    startNextDisaster();
                }
                break;
            case 1: // 地震
                if (disasterTimer === 0) {
                    activateEarthquake();
                    startNextDisaster();
                }
                break;
            case 2: // 落石
                if (disasterTimer === 0) {
                    activateRockFall();
                    startNextDisaster();
                }
                break;
            case 3: // 死亡
                if (disasterTimer === 0) {
                    gameOver = true;
                    showGameOverMessage("你被災難吞噬了！", false);
                }
                break;
        }
    }, 1000);
}



// 更新災難顯示
function updateDisasterDisplay() {
    if (disasterPhase < disasters.length) {
        nextDisasterElement.textContent = disasters[disasterPhase].name;
        disasterTimerElement.textContent = disasterTimer;
    } else {
        nextDisasterElement.textContent = "無";
        disasterTimerElement.textContent = "0";
    }
}

// 開始下一個災難
function startNextDisaster() {
    disasterPhase++;
    
    // 根據災難階段設定不同的計時
    if (disasterPhase === 3) { // 死亡階段
        disasterTimer = 300; // 300秒
    } else {
        disasterTimer = 15; // 其他階段15秒
    }
    
    updateDisasterDisplay();
    
    if (disasterPhase >= disasters.length) {
        return; // 所有災難都結束了
    }
    
    // 啟動災難計時器
    disasterInterval = setInterval(() => {
        disasterTimer--;
        updateDisasterDisplay();
        
        // 根據當前災難階段執行相應效果
        switch (disasterPhase) {
            case 1: // 地震
                if (disasterTimer === 0) {
                    activateEarthquake();
                    startNextDisaster();
                }
                break;
            case 2: // 落石
                if (disasterTimer === 0) {
                    activateRockFall();
                    startNextDisaster();
                }
                break;
            case 3: // 死亡
                if (disasterTimer === 0) {
                    gameOver = true;
                    showGameOverMessage("你被災難吞噬了！", false);
                }
                break;
        }
    }, 1000);
}

// 洞穴變暗特效
function activateDarknessEffect() {
    darknessEffectActive = true;
    const darknessOverlay = document.getElementById('darkness-overlay');
    
    // 創建閃爍效果
    let flashCount = 0;
    const maxFlashes = 3;
    
    function flashEffect() {
        if (flashCount < maxFlashes) {
            darknessOverlay.style.opacity = '0.3';
            setTimeout(() => {
                darknessOverlay.style.opacity = '0';
                setTimeout(() => {
                    flashCount++;
                    flashEffect();
                }, 200);
            }, 200);
        } else {
            // 最終變暗效果
            darknessOverlay.style.opacity = '0.4';
        }
    }
    
    flashEffect();
    
    // 創建視覺特效 - 在場景中添加一些粒子效果
    createDarknessParticles();
}

// 創建黑暗粒子特效
function createDarknessParticles() {
    const particleCount = 50;
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const colors = [];

    for (let i = 0; i < particleCount; i++) {
        // 在玩家周圍隨機位置生成粒子
        positions.push((Math.random() - 0.5) * 20);
        positions.push((Math.random() - 0.5) * 10);
        positions.push((Math.random() - 0.5) * 20);
        colors.push(0.1, 0.1, 0.1); // 深灰色粒子
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({ 
        size: 0.1, 
        vertexColors: true,
        transparent: true,
        opacity: 0.6
    });
    const particles = new THREE.Points(geometry, material);
    particles.position.copy(camera.position);
    scene.add(particles);

    // 5秒後移除粒子效果
    setTimeout(() => {
        scene.remove(particles);
    }, 5000);
}

// 地震特效
function activateEarthquake() {
    earthquakeActive = true;
    
    // 記錄原始相機位置
    originalCameraPosition.copy(camera.position);
    
    // 創建地震粒子效果
    createEarthquakeParticles();
    
    // 每秒扣1%血量
    const earthquakeDamage = setInterval(() => {
        if (earthquakeActive && !gameOver) {
            playerHealth -= 1;
            updateHealthBar();
            
            if (playerHealth <= 0) {
                clearInterval(earthquakeDamage);
                gameOver = true;
                showGameOverMessage("你被地震震死了！", false);
            }
        } else {
            clearInterval(earthquakeDamage);
        }
    }, 1000);
    
    // 15秒後停止地震效果
    setTimeout(() => {
        earthquakeActive = false;
        // 重置相機搖晃
        earthquakeShake = { x: 0, y: 0, z: 0 };
    }, 15000);
}

// 創建地震粒子特效
function createEarthquakeParticles() {
    const particleCount = 30;
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const colors = [];

    for (let i = 0; i < particleCount; i++) {
        positions.push((Math.random() - 0.5) * 15);
        positions.push(Math.random() * 2); // 從地面升起
        positions.push((Math.random() - 0.5) * 15);
        colors.push(0.8, 0.4, 0.1); // 土黃色粒子
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({ 
        size: 0.08, 
        vertexColors: true,
        transparent: true,
        opacity: 0.7
    });
    const particles = new THREE.Points(geometry, material);
    particles.position.copy(camera.position);
    scene.add(particles);

    // 15秒後移除粒子效果
    setTimeout(() => {
        scene.remove(particles);
    }, 15000);
}

// 落石特效
function activateRockFall() {
    // 每3秒生成8個落石
    rockFallInterval = setInterval(() => {
        if (!gameOver) {
            // 一次生成8個落石
            for (let i = 0; i < 8; i++) {
                createFallingRock();
            }
        } else {
            clearInterval(rockFallInterval);
        }
    }, 3000);
}

// 創建落石
function createFallingRock() {
    // 先創建預告陰影
    const shadowGeometry = new THREE.CircleGeometry(0.8, 32);
    const shadowMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x000000, 
        transparent: true, 
        opacity: 0.8,
        side: THREE.DoubleSide // 雙面渲染確保可見
    });
    const shadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
    shadow.rotation.x = -Math.PI / 2; // 讓圓形平躺在地面
    
    // 在玩家上方隨機位置生成
    const offsetX = (Math.random() - 0.5) * 10;
    const offsetZ = (Math.random() - 0.5) * 10;
    const targetX = camera.position.x + offsetX;
    const targetZ = camera.position.z + offsetZ;
    
    shadow.position.set(targetX, 0.25, targetZ); // 放在地面上方一點
    shadow.isRockShadow = true; // 標記為落石陰影
    
    scene.add(shadow);
    fallingRocks.push(shadow);
    
    // 2秒後創建實際的落石
    setTimeout(() => {
        if (!gameOver) {
            const rockGeometry = new THREE.SphereGeometry(0.8, 16, 16); // 更大的石頭
            const rockMaterial = new THREE.MeshBasicMaterial({ color: 0x444444 });
            const rock = new THREE.Mesh(rockGeometry, rockMaterial);
            
            rock.position.set(targetX, camera.position.y + 15, targetZ); // 從更高處開始
            rock.velocity = new THREE.Vector3(0, -0.15, 0); // 更慢的掉落速度
            rock.isFallingRock = true; // 標記為落石
            rock.targetShadow = shadow; // 關聯對應的陰影
            
            scene.add(rock);
            fallingRocks.push(rock);
        }
    }, 2000);
}

// 初始化控制，新增一個回調函數來處理新創建的子彈
const controls = initControls(
    scene,
    camera,
    createBullet,
    () => gameOver, // 傳遞 gameOver 的 getter 函數
    gameMap.checkWallCollision,
    playerRadius,
    gameMap,
    (bullet) => {
        bullets.push(bullet); // 將新創建的子彈加入 bullets 數組
    }
);

// 修改遊戲循環
function animate() {
    requestAnimationFrame(animate);
    
    if (!gameOver) {
        const exitReached = controls.handleInput();
        if (exitReached) {
            clearInterval(disasterInterval);
            gameOver = true;
            showGameOverMessage("恭喜你離開\n洞穴!!", true);
        }
        
        // 地震搖晃效果
        if (earthquakeActive) {
            earthquakeShake.x = (Math.random() - 0.5) * 0.1;
            earthquakeShake.z = (Math.random() - 0.5) * 0.1;
            
            // 只應用X和Z軸搖晃，不影響Y軸（高度）
            camera.position.x += earthquakeShake.x;
            camera.position.z += earthquakeShake.z;
        }
        
        // 更新子彈位置
        for (let i = bullets.length - 1; i >= 0; i--) {
            const bullet = bullets[i];
            bullet.position.add(bullet.velocity);
            bullet.distanceTraveled += bullet.velocity.length();
            
            // 檢查子彈是否擊中怪物
            for (let j = monsters.length - 1; j >= 0; j--) {
                const monster = monsters[j];
                if (bullet.position.distanceTo(monster.position) < 0.5) {
                    createExplosion(monster.position);
                    scene.remove(monster);
                    monsters.splice(j, 1);
                    scene.remove(bullet);
                    bullets.splice(i, 1);
                    break;
                }
            }
            
            if (bullet.distanceTraveled > 20) { // 子彈飛行20個單位後爆炸
                createExplosion(bullet.position);
                scene.remove(bullet);
                bullets.splice(i, 1);
            }
        }
        
        // 更新怪物
        updateShadowMonsters(monsters, camera.position);
        
        // 更新落石和陰影
        for (let i = fallingRocks.length - 1; i >= 0; i--) {
            const rock = fallingRocks[i];
            
            if (rock.isRockShadow) {
                // 處理陰影 - 讓陰影逐漸變深
                if (rock.material.opacity < 1.0) {
                    rock.material.opacity += 0.02;
                }
            } else if (rock.isFallingRock) {
                // 處理落石
                rock.position.add(rock.velocity);
                
                // 檢查落石是否擊中玩家
                if (rock.position.distanceTo(camera.position) < playerRadius + 0.8) {
                    playerHealth -= 10;
                    updateHealthBar();
                    createExplosion(rock.position);
                    
                    // 移除落石和對應的陰影
                    scene.remove(rock);
                    fallingRocks.splice(i, 1);
                    
                    if (rock.targetShadow) {
                        const shadowIndex = fallingRocks.findIndex(r => r === rock.targetShadow);
                        if (shadowIndex !== -1) {
                            scene.remove(fallingRocks[shadowIndex]);
                            fallingRocks.splice(shadowIndex, 1);
                        }
                    }
                    
                    if (playerHealth <= 0) {
                        gameOver = true;
                        showGameOverMessage("你被落石砸死了！", false);
                    }
                }
                
                // 檢查落石是否落地
                if (rock.position.y <= -2) {
                    scene.remove(rock);
                    fallingRocks.splice(i, 1);
                    
                    // 移除對應的陰影
                    if (rock.targetShadow) {
                        const shadowIndex = fallingRocks.findIndex(r => r === rock.targetShadow);
                        if (shadowIndex !== -1) {
                            scene.remove(fallingRocks[shadowIndex]);
                            fallingRocks.splice(shadowIndex, 1);
                        }
                    }
                }
            }
        }
        
        // 檢查玩家是否被怪物碰到
        monsters.forEach((monster, index) => {
            if (monster.position.distanceTo(camera.position) < playerRadius + 0.5) {
                damagePlayer();
                createExplosion(monster.position);
                scene.remove(monster);
                monsters.splice(index, 1);
            }
        });
        
        // 隨機生成新的怪物
        if (Math.random() < 0.02 && monsters.length < 5) {
            const monster = createShadowMonster(scene, monster_path);
            if (monster) {
                monsters.push(monster);
            }
        }
    }
    
    renderer.render(scene, camera);
}

animate();

// 處理視窗大小變化
window.addEventListener('resize', onWindowResize, false);

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

let playerHealth = 100;
const healthBar = document.getElementById('health-bar');

function updateHealthBar() {
    healthBar.style.width = `${playerHealth}%`;
    if (playerHealth <= 20) {
        healthBar.style.backgroundColor = '#FF0000';
    } else if (playerHealth <= 60) {
        healthBar.style.backgroundColor = '#FFA500';
    } else {
        healthBar.style.backgroundColor = '#4CAF50';
    }

    // 更新黑暗覆蓋層
    const darknessOverlay = document.getElementById('darkness-overlay');
    const maxOpacity = 0.7; // 最大不透明度
    const opacity = maxOpacity * (1 - playerHealth / 100);
    darknessOverlay.style.opacity = opacity;
}

// 玩家受傷函數
function damagePlayer() {
    playerHealth -= 10;
    updateHealthBar();
    if (playerHealth <= 0) {
        clearInterval(disasterInterval);
        gameOver = true;
        showGameOverMessage("你被洞穴的影子吞沒了!!", false);
    }
}

function showGameOverMessage(message, isVictory) {
    // 移除 controls.stopAutoShooting();
    const messageElement = document.createElement('div');
    messageElement.style.position = 'absolute';
    messageElement.style.top = '50%';
    messageElement.style.left = '50%';
    messageElement.style.transform = 'translate(-50%, -50%)';
    messageElement.style.backgroundColor = isVictory ? 'rgba(0, 128, 0, 0.7)' : 'rgba(128, 0, 0, 0.7)';
    messageElement.style.color = 'white';
    messageElement.style.padding = '20px';
    messageElement.style.borderRadius = '10px';
    messageElement.style.textAlign = 'center';
    messageElement.innerHTML = `
        <h2>${message}</h2>
        <button id="restartButton">再玩一局</button>
    `;
    document.body.appendChild(messageElement);

    document.getElementById('restartButton').addEventListener('click', restartGame);
}

function restartGame() {
    gameOver = false;
    playerHealth = 100;
    updateHealthBar();
    
    // 重置計時器
    startGameTimer();
    
    // 重置玩家位置到新的隨機起點
    const newStartPosition = gameMap.getPlayerStartPosition();
    camera.position.copy(newStartPosition);
    camera.rotation.set(0, 0, 0);
    
    // 清除所有怪物和子彈
    monsters.forEach(monster => scene.remove(monster));
    monsters = [];
    bullets.forEach(bullet => scene.remove(bullet));
    bullets = [];
    
    // 清除所有落石
    fallingRocks.forEach(rock => scene.remove(rock));
    fallingRocks = [];
    
    // 重置災難系統
    earthquakeActive = false;
    if (rockFallInterval) {
        clearInterval(rockFallInterval);
    }
    
    // 重置黑暗效果
    const darknessOverlay = document.getElementById('darkness-overlay');
    darknessOverlay.style.opacity = '0';
    darknessEffectActive = false;
    
    // 移除遊戲結束消息
    document.body.removeChild(document.body.lastChild);
    
    // 重新創建隨機出口
    gameMap.createRandomExit();
}

// 移除遊戲初始化時啟動自動射擊的代碼
updateHealthBar();

// 啟動遊戲計時器
startGameTimer();