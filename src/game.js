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
            gameOver = true;
            showGameOverMessage("恭喜你離開洞穴!!", true);
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
    // 重置玩家位置到新的隨機起點
    const newStartPosition = gameMap.getPlayerStartPosition();
    camera.position.copy(newStartPosition);
    camera.rotation.set(0, 0, 0);
    // 清除所有怪物和子彈
    monsters.forEach(monster => scene.remove(monster));
    monsters = [];
    bullets.forEach(bullet => scene.remove(bullet));
    bullets = [];
    // 移除遊戲結束消息
    document.body.removeChild(document.body.lastChild);
    // 重新創建隨機出
    gameMap.createRandomExit();
}

// 移除遊戲初始化時啟動自動射擊的代碼
updateHealthBar();