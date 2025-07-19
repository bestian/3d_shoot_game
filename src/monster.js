import * as THREE from 'three';

// 創建影子怪物的函數
export function createShadowMonster(scene, texturePath, gameMap = null) {
    const geometry = new THREE.PlaneGeometry(1, 2); // 改用平面幾何體
    
    // 創建紋理加載器
    const textureLoader = new THREE.TextureLoader();
    
    // 加載紋理
    const texture = textureLoader.load(texturePath);
    
    // 使用紋理創建材質
    const material = new THREE.MeshBasicMaterial({ 
        map: texture,
        transparent: true, // 允許透明
        side: THREE.DoubleSide, // 雙面可見
        alphaTest: 0.5 // 設置透明度測試閾值
    });
    
    const monster = new THREE.Mesh(geometry, material);
    
    // 設定怪物的初始位置
    const startPosition = getRandomStartPosition(gameMap);
    monster.position.copy(startPosition);
    
    scene.add(monster);
    return monster;
}

// 更新所有影子怪物的函數，使其追隨玩家並旋轉面向玩家
export function updateShadowMonsters(monsters, playerPosition) {
    const speed = 0.02; // 調整移動速度
    monsters.forEach(monster => {
        // 計算朝向玩家的方向向量
        const direction = new THREE.Vector3().subVectors(playerPosition, monster.position).normalize();
        
        // 移動怪物
        monster.position.add(direction.multiplyScalar(speed));
        
        // 使怪物旋轉面向玩家
        monster.lookAt(playerPosition);
    });
}

// 獲取隨機起始位置的函數
function getRandomStartPosition(gameMap = null) {
    // 如果有gameMap，使用其getRandomPosition方法來確保位置有效
    if (gameMap && gameMap.getRandomPosition) {
        return gameMap.getRandomPosition();
    }
    
    // 備用方案：如果沒有gameMap，使用簡單的邊緣生成邏輯
    let mapSize = 40; // 預設大小
    const halfSize = mapSize / 2;
    const margin = 2; // 距離邊緣的最小距離
    
    // 隨機選擇生成邊緣：0=北邊, 1=南邊, 2=東邊, 3=西邊
    const edgeType = Math.floor(Math.random() * 4);
    let x, z;
    
    switch (edgeType) {
        case 0: // 北邊 (z = -halfSize)
            x = Math.random() * (mapSize - 2 * margin) - (halfSize - margin);
            z = -halfSize + margin;
            break;
        case 1: // 南邊 (z = halfSize)
            x = Math.random() * (mapSize - 2 * margin) - (halfSize - margin);
            z = halfSize - margin;
            break;
        case 2: // 東邊 (x = halfSize)
            x = halfSize - margin;
            z = Math.random() * (mapSize - 2 * margin) - (halfSize - margin);
            break;
        case 3: // 西邊 (x = -halfSize)
            x = -halfSize + margin;
            z = Math.random() * (mapSize - 2 * margin) - (halfSize - margin);
            break;
    }
    
    return new THREE.Vector3(x, 1, z);
}

// 在您的主要Three.js代碼中調用此函數
// createShadowMonster(scene, 'path/to/your/png/file.png');