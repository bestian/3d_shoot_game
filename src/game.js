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

// 遊戲狀態變數
let gameMap = null;
let selectedDifficulty = 'easy';
let gameStarted = false;
let controls = null;

// 初始化遊戲（但不立即開始）
function initGame(difficulty) {
    selectedDifficulty = difficulty;
    
    // 清除現有地圖
    if (gameMap) {
        // 只清除Three.js場景中的物件，保留DOM元素
        const objectsToRemove = [];
        scene.children.forEach(child => {
            // 保留光源，只清除其他物件
            if (child !== ambientLight && child !== directionalLight) {
                objectsToRemove.push(child);
            }
        });
        objectsToRemove.forEach(child => {
            scene.remove(child);
        });
    }
    
    // 創建新地圖
    gameMap = new GameMap(scene, difficulty);
    
    // 設置相機位置和旋轉
    const startPosition = gameMap.getPlayerStartPosition();
    camera.position.copy(startPosition);
    camera.rotation.order = 'YXZ';
    
    // 隱藏難度選擇器
    const difficultySelector = document.getElementById('difficulty-selector');
    if (difficultySelector) difficultySelector.style.display = 'none';
    
    // 顯示遊戲UI元素
    const healthBar = document.getElementById('health-bar-container');
    const disasterContainer = document.getElementById('disaster-container');
    const crosshair = document.getElementById('crosshair');
    const joystick = document.getElementById('joystick-move');
    const shootButton = document.getElementById('shoot-button');
    const jumpButton = document.getElementById('jump-button');
    
    if (healthBar) healthBar.style.display = 'block';
    if (disasterContainer) disasterContainer.style.display = 'block';
    if (crosshair) crosshair.style.display = 'block';
    if (joystick) joystick.style.display = 'block';
    if (shootButton) shootButton.style.display = 'block';
    if (jumpButton) jumpButton.style.display = 'block';
    
    // 初始化控制系統
    controls = initControls(
        scene,
        camera,
        createBullet,
        () => gameOver, // 傳遞 gameOver 的 getter 函數
        (position, radius) => gameMap ? gameMap.checkWallCollision(position, radius) : false,
        playerRadius,
        gameMap,
        (bullet) => {
            bullets.push(bullet); // 將新創建的子彈加入 bullets 數組
        }
    );
    
    // 開始遊戲
    gameStarted = true;
    startGameTimer();
}

// 全域函數供HTML調用
window.selectDifficulty = function(difficulty) {
    initGame(difficulty);
};

window.showHallOfFame = showHallOfFame;

// 在文件頂部附近添加這些新的變量
const playerRadius = 0.3;

// 修改創建子彈數
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
let monstersKilled = 0; // 追蹤打敗的影子數量

// Hall of Fame 功能
async function getHallOfFame(difficulty = null) {
    if (difficulty) {
        try {
            let id = 1;
            if (difficulty === 'easy') {
                id = 1;
            } else if (difficulty === 'hard') {
                id = 2;
            } else if (difficulty === 'inferno') {
                id = 3;
            }
            
            const response = await fetch(`https://bknd-game.bestian123.workers.dev/api/data/entity/hall_of_fame/${id}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            console.log('從後端獲取資料:', data);
            console.log(data.data.record);
            console.log(data.data.record.data);
            return data.data.record.data || [];
        } catch (error) {
            console.error('從後端獲取資料時發生錯誤:', error);
            // 如果後端失敗，回退到本地儲存
            const stored = localStorage.getItem(`hall_of_fame_${difficulty}`);
            return stored ? JSON.parse(stored) : [];
        }
    } else {
        // 獲取所有難度的記錄
        const allRecords = [];
        const difficulties = ['easy', 'hard', 'inferno'];
        
        // 使用 Promise.all 來並行處理所有請求
        const promises = difficulties.map(async diff => {
            const records = await getHallOfFame(diff);
            return records;
        });
        
        const results = await Promise.all(promises);
        results.forEach(records => {
            allRecords.push(...records);
        });
        
        return allRecords.sort((a, b) => {
            if (b.monstersKilled !== a.monstersKilled) {
                return b.monstersKilled - a.monstersKilled;
            }
            return b.finalHealth - a.finalHealth;
        });
    }
}

async function saveToHallOfFame(playerName, monstersKilled, finalHealth, difficulty) {
    const hallOfFame = await getHallOfFame(difficulty);
    const newRecord = {
        date: new Date().toLocaleDateString('zh-TW'),
        name: playerName,
        monstersKilled: monstersKilled,
        finalHealth: finalHealth,
        difficulty: difficulty,
        timestamp: Date.now()
    };
    
    hallOfFame.push(newRecord);
    // 按擊敗影子數量排序，然後按血量排序
    hallOfFame.sort((a, b) => {
        if (b.monstersKilled !== a.monstersKilled) {
            return b.monstersKilled - a.monstersKilled;
        }
        return b.finalHealth - a.finalHealth;
    });

    console.log('準備保存的資料:', hallOfFame);
    
    // 只保留前10名
    const top10 = hallOfFame.slice(0, 10);
    localStorage.setItem(`hall_of_fame_${difficulty}`, JSON.stringify(top10));

    let id = 1;
    if (difficulty === 'easy') {
        id = 1;
    } else if (difficulty === 'hard') {
        id = 2;
    } else if (difficulty === 'inferno') {
        id = 3;
    }
    
    // 對後端傳送資料
    try {
        const response = await fetch(`https://bknd-game.bestian123.workers.dev/api/data/entity/hall_of_fame/${id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                record: {
                    data: top10,
                    difficulty: difficulty
                }
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('後端回應:', data);
    } catch (error) {
        console.error('保存到後端時發生錯誤:', error);
        // 即使後端失敗，本地儲存仍然有效
    }
    
    return top10;
}

async function isTopScore(monstersKilled, difficulty) {
    const hallOfFame = await getHallOfFame(difficulty);
    if (hallOfFame.length < 10) return true;
    return monstersKilled > hallOfFame[hallOfFame.length - 1].monstersKilled;
}

async function showHallOfFame(selectedTab = 'all') {
    // 確保初始標籤是'all'
    selectedTab = selectedTab || 'all';
    const modalElement = document.createElement('div');
    modalElement.style.position = 'fixed';
    modalElement.style.top = '0';
    modalElement.style.left = '0';
    modalElement.style.width = '100%';
    modalElement.style.height = '100%';
    modalElement.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    modalElement.style.display = 'flex';
    modalElement.style.justifyContent = 'center';
    modalElement.style.alignItems = 'center';
    modalElement.style.zIndex = '2100';
    
    const contentElement = document.createElement('div');
    contentElement.style.backgroundColor = 'rgba(50, 50, 50, 0.95)';
    contentElement.style.color = 'white';
    contentElement.style.padding = '30px';
    contentElement.style.borderRadius = '15px';
    contentElement.style.maxWidth = '700px';
    contentElement.style.maxHeight = '80%';
    contentElement.style.overflow = 'auto';
    contentElement.style.textAlign = 'center';
    
    async function updateContent(tab) {
        let content = '<h2>🏆 名人堂 🏆</h2>';
        
        // 添加標籤按鈕
        content += '<div style="margin: 20px 0;">';
        const tabs = [
            { key: 'all', label: '總排行', emoji: '🌟' },
            { key: 'easy', label: '簡易模式', emoji: '🟢' },
            { key: 'hard', label: '困難模式', emoji: '🟡' },
            { key: 'inferno', label: '煉獄模式', emoji: '🔴' }
        ];
        
        tabs.forEach(tabInfo => {
            const isActive = tab === tabInfo.key;
            const buttonStyle = isActive 
                ? 'background-color: #4CAF50; color: white;' 
                : 'background-color: #666; color: #ccc;';
            content += `<button onclick="updateHallOfFameTab('${tabInfo.key}')" style="margin: 0 5px; padding: 8px 15px; border: none; border-radius: 5px; cursor: pointer; touch-action: manipulation; -webkit-tap-highlight-color: rgba(0,0,0,0.1); ${buttonStyle}">${tabInfo.emoji} ${tabInfo.label}</button>`;
        });
        content += '</div>';
        
        try {
            // 獲取對應的排行榜數據
            const hallOfFame = tab === 'all' ? await getHallOfFame() : await getHallOfFame(tab);
            
            console.log('獲取到的名人堂資料:', hallOfFame);
            
            if (!hallOfFame || hallOfFame.length === 0) {
                content += '<p>還沒有任何記錄，成為第一個英雄吧！</p>';
            } else {
                content += '<table style="width: 100%; border-collapse: collapse; margin: 20px 0;">';
                content += '<tr style="background-color: rgba(255, 255, 255, 0.1);"><th style="padding: 10px; border: 1px solid #666;">排名</th><th style="padding: 10px; border: 1px solid #666;">日期</th><th style="padding: 10px; border: 1px solid #666;">名字</th><th style="padding: 10px; border: 1px solid #666;">擊敗影子</th><th style="padding: 10px; border: 1px solid #666;">剩餘血量</th>';
                
                // 只在總排行時顯示難度欄
                if (tab === 'all') {
                    content += '<th style="padding: 10px; border: 1px solid #666;">難度</th>';
                }
                content += '</tr>';
                
                hallOfFame.slice(0, 10).forEach((record, index) => {
                    const rowStyle = index < 3 ? 'background-color: rgba(255, 215, 0, 0.2);' : '';
                    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
                    const difficultyEmoji = record.difficulty === 'easy' ? '🟢' : record.difficulty === 'hard' ? '🟡' : '🔴';
                    
                    content += `<tr style="${rowStyle}">
                        <td style="padding: 8px; border: 1px solid #666;">${medal} ${index + 1}</td>
                        <td style="padding: 8px; border: 1px solid #666;">${record.date}</td>
                        <td style="padding: 8px; border: 1px solid #666;">${record.name}</td>
                        <td style="padding: 8px; border: 1px solid #666;">${record.monstersKilled}</td>
                        <td style="padding: 8px; border: 1px solid #666;">${record.finalHealth}%</td>`;
                    
                    if (tab === 'all') {
                        content += `<td style="padding: 8px; border: 1px solid #666;">${difficultyEmoji} ${record.difficulty}</td>`;
                    }
                    content += '</tr>';
                });
                content += '</table>';
            }
        } catch (error) {
            console.error('載入名人堂資料時發生錯誤:', error);
            content += '<p>載入資料時發生錯誤，請稍後再試。</p>';
        }
        
        content += '<button id="closeHallOfFame" style="padding: 10px 20px; background-color: #666; color: white; border: none; border-radius: 5px; cursor: pointer; touch-action: manipulation; -webkit-tap-highlight-color: rgba(0,0,0,0.1); margin-top: 20px;">關閉</button>';
        
        contentElement.innerHTML = content;
    }
    
    // 全域函數供按鈕調用
    window.updateHallOfFameTab = async function(tab) {
        await updateContent(tab);
        // 重新綁定關閉按鈕事件
        document.getElementById('closeHallOfFame').addEventListener('click', () => {
            document.body.removeChild(modalElement);
            delete window.updateHallOfFameTab; // 清理全域函數
        });
    };
    
    await updateContent(selectedTab);
    modalElement.appendChild(contentElement);
    document.body.appendChild(modalElement);
    
    document.getElementById('closeHallOfFame').addEventListener('click', () => {
        document.body.removeChild(modalElement);
        delete window.updateHallOfFameTab; // 清理全域函數
    });
    
    // 點擊背景關閉
    modalElement.addEventListener('click', (e) => {
        if (e.target === modalElement) {
            document.body.removeChild(modalElement);
            delete window.updateHallOfFameTab; // 清理全域函數
        }
    });
}

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
                    // 停止所有計時器
                    if (disasterInterval) {
                        clearInterval(disasterInterval);
                    }
                    if (rockFallInterval) {
                        clearInterval(rockFallInterval);
                    }
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
    
    // 清除之前的計時器
    if (disasterInterval) {
        clearInterval(disasterInterval);
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
                    // 停止所有計時器
                    if (disasterInterval) {
                        clearInterval(disasterInterval);
                    }
                    if (rockFallInterval) {
                        clearInterval(rockFallInterval);
                    }
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
                    // 停止所有計時器
                    if (disasterInterval) {
                        clearInterval(disasterInterval);
                    }
                    if (rockFallInterval) {
                        clearInterval(rockFallInterval);
                    }
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

// 初始化控制系統（在遊戲開始時初始化）

// 修改遊戲循環
function animate() {
    requestAnimationFrame(animate);
    
    if (!gameOver && gameStarted && gameMap && controls) {
        const exitReached = controls.handleInput();
        if (exitReached) {
            // 停止所有計時器
            if (disasterInterval) {
                clearInterval(disasterInterval);
            }
            if (rockFallInterval) {
                clearInterval(rockFallInterval);
            }
            gameOver = true;
            showGameOverMessage("恭喜你離開\n洞穴!!", true);
        }
        
        // 地震搖晃效果
        if (earthquakeActive) {
            earthquakeShake.x = (Math.random() - 0.5) * 0.1;
            earthquakeShake.z = (Math.random() - 0.5) * 0.1;
            
            // 檢查搖晃後的位置是否會與牆壁碰撞
            const newPosition = camera.position.clone();
            newPosition.x += earthquakeShake.x;
            newPosition.z += earthquakeShake.z;
            
            // 只有在新位置不會碰撞時才應用搖晃
            if (!gameMap.checkWallCollision(newPosition, playerRadius)) {
                camera.position.copy(newPosition);
            }
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
                    monstersKilled++; // 增加擊敗計數
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
                    // 停止所有計時器
                    if (disasterInterval) {
                        clearInterval(disasterInterval);
                    }
                    if (rockFallInterval) {
                        clearInterval(rockFallInterval);
                    }
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
                monstersKilled++; // 增加擊敗計數
            }
        });
        
        // 根據難度調整影子生成頻率和最大數量
        const difficultySettings = {
            'easy': { spawnRate: 0.04, maxMonsters: 8 },    // 2倍頻率
            'hard': { spawnRate: 0.06, maxMonsters: 12 },   // 3倍頻率
            'inferno': { spawnRate: 0.08, maxMonsters: 16 }, // 4倍頻率
            'practice': { spawnRate: 0.04, maxMonsters: 8 }  // 和簡易模式相同
        };
        
        const settings = difficultySettings[selectedDifficulty] || difficultySettings['easy'];
        
        // 隨機生成新的怪物
        if (Math.random() < settings.spawnRate && monsters.length < settings.maxMonsters && gameMap) {
            const monster = createShadowMonster(scene, monster_path, gameMap);
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
        // 停止所有計時器
        if (disasterInterval) {
            clearInterval(disasterInterval);
        }
        if (rockFallInterval) {
            clearInterval(rockFallInterval);
        }
        gameOver = true;
        showGameOverMessage("你被洞穴的影子吞沒了!!", false);
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
    messageElement.style.minWidth = '300px';
    
    let content = `
        <h2>${message}</h2>
        <p>擊敗影子數量: ${monstersKilled}</p>
    `;
    
    // 練習模式不顯示排行榜相關內容
    if (selectedDifficulty !== 'practice') {
        // 檢查是否進入Top 10 - 使用 async 函數
        const checkTopScore = async () => {
            if (isVictory && await isTopScore(monstersKilled, selectedDifficulty)) {
                content += `
                    <p style="color: gold;">🏆 恭喜進入名人堂！</p>
                    <input type="text" id="playerName" placeholder="輸入你的名字" maxlength="20" style="padding: 5px; margin: 10px; border-radius: 5px; border: none;">
                    <br>
                    <button id="saveScore" style="margin: 5px; padding: 10px 15px; border: none; border-radius: 5px; cursor: pointer; touch-action: manipulation; -webkit-tap-highlight-color: rgba(0,0,0,0.1); background-color: #FF9800; color: white;">保存分數</button>
                `;
            }
            
            content += `
                <button id="viewHallOfFame" style="margin: 5px; padding: 10px 15px; border: none; border-radius: 5px; cursor: pointer; touch-action: manipulation; -webkit-tap-highlight-color: rgba(0,0,0,0.1); background-color: #9C27B0; color: white;">查看名人堂</button>
            `;
            
            content += `
                <button id="restartButton" style="margin: 5px; padding: 10px 15px; border: none; border-radius: 5px; cursor: pointer; touch-action: manipulation; -webkit-tap-highlight-color: rgba(0,0,0,0.1); background-color: #4CAF50; color: white;">再玩一局</button>
            `;
            
            messageElement.innerHTML = content;
            document.body.appendChild(messageElement);

            // 添加事件監聽器
            document.getElementById('restartButton').addEventListener('click', restartGame);
            
            // 練習模式不添加排行榜相關事件監聽器
            if (selectedDifficulty !== 'practice') {
                document.getElementById('viewHallOfFame').addEventListener('click', () => showHallOfFame('all'));
                
                if (isVictory && await isTopScore(monstersKilled, selectedDifficulty)) {
                    document.getElementById('saveScore').addEventListener('click', async () => {
                        const playerName = document.getElementById('playerName').value.trim();
                        if (playerName) {
                            await saveToHallOfFame(playerName, monstersKilled, playerHealth, selectedDifficulty);
                            alert('分數已保存到名人堂！');
                            document.getElementById('saveScore').style.display = 'none';
                            document.getElementById('playerName').style.display = 'none';
                        } else {
                            alert('請輸入名字！');
                        }
                    });
                    
                    // 讓輸入框獲得焦點
                    setTimeout(() => {
                        document.getElementById('playerName').focus();
                    }, 100);
                }
            }
        };
        
        // 執行檢查
        checkTopScore();
    } else {
        content += `
            <button id="restartButton" style="margin: 5px; padding: 10px 15px; border: none; border-radius: 5px; cursor: pointer; touch-action: manipulation; -webkit-tap-highlight-color: rgba(0,0,0,0.1); background-color: #4CAF50; color: white;">再玩一局</button>
        `;
        
        messageElement.innerHTML = content;
        document.body.appendChild(messageElement);
        document.getElementById('restartButton').addEventListener('click', restartGame);
    }
}

function restartGame() {
    gameOver = false;
    playerHealth = 100;
    monstersKilled = 0; // 重置擊敗計數
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
    
    // 隱藏遊戲UI元素
    const healthBar = document.getElementById('health-bar-container');
    const disasterContainer = document.getElementById('disaster-container');
    const crosshair = document.getElementById('crosshair');
    const joystick = document.getElementById('joystick-move');
    const shootButton = document.getElementById('shoot-button');
    const jumpButton = document.getElementById('jump-button');
    const difficultySelector = document.getElementById('difficulty-selector');
    
    if (healthBar) healthBar.style.display = 'none';
    if (disasterContainer) disasterContainer.style.display = 'none';
    if (crosshair) crosshair.style.display = 'none';
    if (joystick) joystick.style.display = 'none';
    if (shootButton) shootButton.style.display = 'none';
    if (jumpButton) jumpButton.style.display = 'none';
    
    // 顯示難度選擇器
    if (difficultySelector) difficultySelector.style.display = 'block';
    gameStarted = false;
}

// 移除遊戲初始化時啟動自動射擊的代碼
updateHealthBar();

// 不自動啟動遊戲，等待玩家選擇難度