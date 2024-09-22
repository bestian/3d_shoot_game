import * as THREE from 'three';

// 創建影子怪物的函數
export function createShadowMonster(scene, texturePath) {
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
    const startPosition = getRandomStartPosition();
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
function getRandomStartPosition() {
    // 在場景邊緣隨機生成怪物
    const edge = Math.random() < 0.5 ? -1 : 1;
    const x = edge * (Math.random() * 10 + 10); // 在 -20 到 -10 或 10 到 20 之間
    const z = edge * (Math.random() * 10 + 10);
    return new THREE.Vector3(x, 1, z); // 假設怪物的 y 位置為 1
}

// 在您的主要Three.js代碼中調用此函數
// createShadowMonster(scene, 'path/to/your/png/file.png');