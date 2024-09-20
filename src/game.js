import * as THREE from 'three';
import { createShadowMonster, updateShadowMonsters } from './monster.js';
import { GameMap } from './map.js';

// 初始化場景、相機和渲染器
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// 創建遊戲地圖
const gameMap = new GameMap(scene);

// 設置相機位置和旋轉
const startPosition = gameMap.getPlayerStartPosition();
camera.position.copy(startPosition);
camera.rotation.order = 'YXZ';

// 在文件頂部附近添加這行
const playerRadius = 0.3;

// 創建子彈函數
function createBullet() {
    const bulletGeometry = new THREE.SphereGeometry(0.1, 32, 32);
    const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
    bullet.position.set(camera.position.x, camera.position.y, camera.position.z);
    bullet.velocity = new THREE.Vector3(
        -Math.sin(camera.rotation.y) * Math.cos(camera.rotation.x),
        Math.sin(camera.rotation.x),
        -Math.cos(camera.rotation.y) * Math.cos(camera.rotation.x)
    ).normalize().multiplyScalar(0.5); // 設置子彈速度
    bullet.distanceTraveled = 0;
    scene.add(bullet);
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

// 處理鍵盤輸入
const keys = {};
document.addEventListener('keydown', (event) => keys[event.code] = true);
document.addEventListener('keyup', (event) => keys[event.code] = false);

// 添加觸控控制相關變量
let joystickActive = false;
let joystickOrigin = { x: 0, y: 0 };
let joystickPosition = { x: 0, y: 0 };

// 初始化觸控控制
function initTouchControls() {
    const joystick = document.getElementById('joystick');
    const joystickKnob = document.getElementById('joystick-knob');
    const shootButton = document.getElementById('shoot-button');

    joystick.addEventListener('touchstart', handleJoystickStart);
    joystick.addEventListener('touchmove', handleJoystickMove);
    joystick.addEventListener('touchend', handleJoystickEnd);

    shootButton.addEventListener('touchstart', handleShoot);

    function handleJoystickStart(event) {
        joystickActive = true;
        const touch = event.touches[0];
        joystickOrigin.x = touch.clientX;
        joystickOrigin.y = touch.clientY;
    }

    function handleJoystickMove(event) {
        if (!joystickActive) return;
        const touch = event.touches[0];
        const deltaX = touch.clientX - joystickOrigin.x;
        const deltaY = touch.clientY - joystickOrigin.y;
        const distance = Math.min(50, Math.sqrt(deltaX * deltaX + deltaY * deltaY));
        const angle = Math.atan2(deltaY, deltaX);
        joystickPosition.x = Math.cos(angle) * distance;
        joystickPosition.y = Math.sin(angle) * distance;
        joystickKnob.style.transform = `translate(${joystickPosition.x}px, ${joystickPosition.y}px)`;
    }

    function handleJoystickEnd() {
        joystickActive = false;
        joystickPosition = { x: 0, y: 0 };
        joystickKnob.style.transform = 'translate(0, 0)';
    }

    function handleShoot() {
        bullets.push(createBullet());
    }
}

// 在遊戲初始化時調用
initTouchControls();

// 修改 handleInput 函數
function handleInput() {
    if (gameOver) return;

    const moveSpeed = 0.1;
    const rotateSpeed = 0.02;

    let newPosition = camera.position.clone();

    // 處理鍵盤輸入
    if (keys['ArrowUp'] || keys['KeyW']) {
        newPosition.x -= Math.sin(camera.rotation.y) * moveSpeed;
        newPosition.z -= Math.cos(camera.rotation.y) * moveSpeed;
    }
    if (keys['ArrowDown'] || keys['KeyS']) {
        newPosition.x += Math.sin(camera.rotation.y) * moveSpeed;
        newPosition.z += Math.cos(camera.rotation.y) * moveSpeed;
    }
    if (keys['ArrowLeft'] || keys['KeyA']) {
        camera.rotation.y += rotateSpeed;
    }
    if (keys['ArrowRight'] || keys['KeyD']) {
        camera.rotation.y -= rotateSpeed;
    }
    if (keys['Space']) {
        bullets.push(createBullet());
        keys['Space'] = false; // 止連續發射
    }

    // 處理觸控輸入
    if (joystickActive) {
        camera.rotation.y -= joystickPosition.x * rotateSpeed * 0.02;
        newPosition.x += Math.sin(camera.rotation.y) * joystickPosition.y * moveSpeed * 0.02;
        newPosition.z += Math.cos(camera.rotation.y) * joystickPosition.y * moveSpeed * 0.02;
    }

    // 檢查碰撞並更新位置
    if (!checkWallCollision(newPosition)) {
        camera.position.copy(newPosition);
    }

    // 檢查是否到達出口
    if (gameMap.checkExitReached(newPosition, playerRadius)) {
        gameOver = true;
        showGameOverMessage("恭喜你離開洞穴!!", true);
    }
}

function showGameOverMessage(message, isVictory) {
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
    // 重新創建隨機出口
    gameMap.createRandomExit();
}

// 添加碰撞檢測函數
function checkWallCollision(newPosition) {
    return gameMap.checkWallCollision(newPosition, playerRadius);
}

// 遊戲循環
function animate() {
    requestAnimationFrame(animate);
    
    if (!gameOver) {
        handleInput();
        
        // 更新子彈位置
        bullets.forEach((bullet, index) => {
            bullet.position.add(bullet.velocity);
            bullet.distanceTraveled += bullet.velocity.length();
            
            // 檢查子彈是否擊中怪物
            monsters.forEach((monster, monsterIndex) => {
                if (bullet.position.distanceTo(monster.position) < 0.5) {
                    createExplosion(monster.position);
                    scene.remove(monster);
                    monsters.splice(monsterIndex, 1);
                    scene.remove(bullet);
                    bullets.splice(index, 1);
                }
            });
            
            if (bullet.distanceTraveled > 10) { // 子彈飛行20個單位後爆炸
                createExplosion(bullet.position);
                scene.remove(bullet);
                bullets.splice(index, 1);
            }
        });
        
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
            const monster = createShadowMonster(scene, camera.position);
            monsters.push(monster);
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

// 在遊戲初始化時調用
updateHealthBar();