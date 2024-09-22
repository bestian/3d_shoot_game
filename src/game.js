import * as THREE from 'three';
import { createShadowMonster, updateShadowMonsters } from './monster.js';
import { GameMap } from './map.js';

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

// 在文件頂部添加或修改這些全局變量
let moveJoystickTouch = null;
let viewJoystickTouch = null;
let moveJoystickPosition = { x: 0, y: 0 };
let viewJoystickPosition = { x: 0, y: 0 };
let autoShootInterval; // 添加這行

// 在文件頂部附近添加這行
const playerRadius = 0.3;

// 在文件頂部附近添加這些新的變量
const touchMoveSpeed = 1;
const keyboardMoveSpeed = 0.3; // 降鍵盤移動速度

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

// 修改初始化觸控控制函數
function initTouchControls() {
    const moveJoystick = document.getElementById('joystick-move');
    const moveJoystickKnob = document.getElementById('joystick-knob-move');
    const viewJoystick = document.getElementById('joystick-view');
    const viewJoystickKnob = document.getElementById('joystick-knob-view');

    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('touchcancel', handleTouchEnd);

    function handleTouchStart(event) {
        event.preventDefault();
        Array.from(event.changedTouches).forEach(touch => {
            const moveJoystickRect = moveJoystick.getBoundingClientRect();
            const viewJoystickRect = viewJoystick.getBoundingClientRect();

            if (touch.clientX >= moveJoystickRect.left && touch.clientX <= moveJoystickRect.right &&
                touch.clientY >= moveJoystickRect.top && touch.clientY <= moveJoystickRect.bottom) {
                moveJoystickTouch = touch;
                updateJoystickPosition(moveJoystick, moveJoystickKnob, touch, 'move');
            } else if (touch.clientX >= viewJoystickRect.left && touch.clientX <= viewJoystickRect.right &&
                       touch.clientY >= viewJoystickRect.top && touch.clientY <= viewJoystickRect.bottom) {
                viewJoystickTouch = touch;
                updateJoystickPosition(viewJoystick, viewJoystickKnob, touch, 'view');
            }
        });
    }

    function handleTouchMove(event) {
        event.preventDefault();
        Array.from(event.changedTouches).forEach(touch => {
            if (touch.identifier === moveJoystickTouch?.identifier) {
                updateJoystickPosition(moveJoystick, moveJoystickKnob, touch, 'move');
            } else if (touch.identifier === viewJoystickTouch?.identifier) {
                updateJoystickPosition(viewJoystick, viewJoystickKnob, touch, 'view');
            }
        });
    }

    function handleTouchEnd(event) {
        Array.from(event.changedTouches).forEach(touch => {
            if (touch.identifier === moveJoystickTouch?.identifier) {
                resetJoystick(moveJoystickKnob, 'move');
                moveJoystickTouch = null;
            } else if (touch.identifier === viewJoystickTouch?.identifier) {
                resetJoystick(viewJoystickKnob, 'view');
                viewJoystickTouch = null;
            }
        });
    }

    function updateJoystickPosition(joystick, knob, touch, type) {
        const rect = joystick.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        let deltaX = touch.clientX - centerX;
        let deltaY = touch.clientY - centerY;

        const distance = Math.min(joystick.offsetWidth / 2, Math.sqrt(deltaX * deltaX + deltaY * deltaY));
        const angle = Math.atan2(deltaY, deltaX);

        const knobX = Math.cos(angle) * distance;
        const knobY = Math.sin(angle) * distance;

        knob.style.transform = `translate(${knobX}px, ${knobY}px)`;

        if (type === 'move') {
            moveJoystickPosition.x = knobX / (joystick.offsetWidth / 2);
            moveJoystickPosition.y = knobY / (joystick.offsetWidth / 2);
        } else {
            viewJoystickPosition.x = knobX / (joystick.offsetWidth / 2);
            viewJoystickPosition.y = knobY / (joystick.offsetWidth / 2);
        }
    }

    function resetJoystick(knob, type) {
        knob.style.transform = 'translate(0, 0)';
        if (type === 'move') {
            moveJoystickPosition = { x: 0, y: 0 };
        } else {
            viewJoystickPosition = { x: 0, y: 0 };
        }
    }

    // 開始自動發射子彈
    startAutoShooting();
}

// 確保在遊戲初始化時調用這個函數
initTouchControls();

// 自動發射子彈函數
function startAutoShooting() {
    // 清除舊的計時器（如果存在）
    if (autoShootInterval) {
        clearInterval(autoShootInterval);
    }
    autoShootInterval = setInterval(() => {
        if (!gameOver) {
            bullets.push(createBullet());
        }
    }, 1000); // 每1秒發射一次
}

// 修改 handleInput 函數
function handleInput() {
    if (gameOver) return;

    const rotateSpeed = 0.5;
    const keyboardRotateSpeed = 0.03;

    let newPosition = camera.position.clone();

    // 處理移動搖桿輸入
    if (moveJoystickTouch) {
        const moveAngle = Math.atan2(moveJoystickPosition.y, moveJoystickPosition.x);
        const moveMagnitude = Math.sqrt(moveJoystickPosition.x ** 2 + moveJoystickPosition.y ** 2) / 6;
        
        newPosition.x += Math.cos(moveAngle) * touchMoveSpeed * moveMagnitude;
        newPosition.z += Math.sin(moveAngle) * touchMoveSpeed * moveMagnitude;
    }

    // 處理視角搖桿輸入
    if (viewJoystickTouch) {
        const viewMagnitudeX = viewJoystickPosition.x / 30;
        const viewMagnitudeY = viewJoystickPosition.y / 30;
        camera.rotation.y -= viewMagnitudeX * rotateSpeed;
        camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotation.x - viewMagnitudeY * rotateSpeed));
    }

    // 處理鍵盤輸入
    if (keys['KeyW'] || keys['ArrowUp']) {
        newPosition.z -= keyboardMoveSpeed * Math.cos(camera.rotation.y);
        newPosition.x -= keyboardMoveSpeed * Math.sin(camera.rotation.y);
    }
    if (keys['KeyS'] || keys['ArrowDown']) {
        newPosition.z += keyboardMoveSpeed * Math.cos(camera.rotation.y);
        newPosition.x += keyboardMoveSpeed * Math.sin(camera.rotation.y);
    }
    if (keys['KeyA']) {
        newPosition.x -= keyboardMoveSpeed * Math.cos(camera.rotation.y);
        newPosition.z += keyboardMoveSpeed * Math.sin(camera.rotation.y);
    }
    if (keys['KeyD']) {
        newPosition.x += keyboardMoveSpeed * Math.cos(camera.rotation.y);
        newPosition.z -= keyboardMoveSpeed * Math.sin(camera.rotation.y);
    }
    if (keys['ArrowLeft']) camera.rotation.y += keyboardRotateSpeed;
    if (keys['ArrowRight']) camera.rotation.y -= keyboardRotateSpeed;

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
    clearInterval(autoShootInterval);
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
    // 重新啟動自動射擊
    startAutoShooting();
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

// 在遊戲初始化時調用
updateHealthBar();