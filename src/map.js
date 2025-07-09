import * as THREE from 'three';

export class GameMap {
    constructor(scene, difficulty = 'easy') {
        this.scene = scene;
        this.difficulty = difficulty;
        this.exit = null;
        
        // 根據難度設定地圖大小
        this.setMapSize();
        
        this.createFloor();
        this.createWalls();
        this.createRandomExit();
    }
    
    setMapSize() {
        switch (this.difficulty) {
            case 'easy':
                this.mapSize = 40;
                this.wallCount = 12; // 目前的牆壁數量
                break;
            case 'hard':
                this.mapSize = 60; // 1.5倍
                this.wallCount = 18; // 增加50%的牆壁
                break;
            case 'inferno':
                this.mapSize = 80; // 2倍
                this.wallCount = 24; // 增加100%的牆壁
                break;
            default:
                this.mapSize = 40;
                this.wallCount = 12;
        }
    }

    createFloor() {
        const floorGeometry = new THREE.PlaneGeometry(this.mapSize, this.mapSize);
        const floorMaterial = new THREE.MeshBasicMaterial({ color: 0x808080, side: THREE.DoubleSide });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = Math.PI / 2;
        this.scene.add(floor);
    }

    createWall(x, y, z, width, height, depth) {
        const wallGeometry = new THREE.BoxGeometry(width, height, depth);
        const wallMaterial = new THREE.MeshBasicMaterial({ color: 0x8b4513 });
        const wall = new THREE.Mesh(wallGeometry, wallMaterial);
        wall.position.set(x, y, z);
        this.scene.add(wall);
    }

    createWalls() {
        const halfSize = this.mapSize / 2;
        
        // 外圍牆壁
        this.createWall(-halfSize, 1, 0, 1, 2, this.mapSize);
        this.createWall(halfSize, 1, 0, 1, 2, this.mapSize);
        this.createWall(0, 1, -halfSize, this.mapSize, 2, 1);
        this.createWall(0, 1, halfSize, this.mapSize, 2, 1);

        // 根據難度生成內部牆壁
        this.generateInternalWalls();
    }
    
    generateInternalWalls() {
        const halfSize = this.mapSize / 2;
        const quarterSize = this.mapSize / 4;
        
        // 基礎牆壁（所有難度都有）
        this.createWall(-quarterSize, 1, -quarterSize * 1.5, 1, 2, quarterSize);
        this.createWall(quarterSize, 1, quarterSize * 1.5, 1, 2, quarterSize);
        this.createWall(-quarterSize/2, 1, quarterSize/2, quarterSize, 2, 1);
        this.createWall(quarterSize/2, 1, -quarterSize/2, quarterSize, 2, 1);
        this.createWall(-quarterSize * 1.5, 1, 0, quarterSize, 2, 1);
        this.createWall(quarterSize * 1.5, 1, 0, quarterSize, 2, 1);
        this.createWall(-quarterSize * 0.7, 1, quarterSize, 1, 2, quarterSize);
        this.createWall(quarterSize * 0.7, 1, -quarterSize, 1, 2, quarterSize);
        
        // 困難模式額外牆壁
        if (this.difficulty === 'hard' || this.difficulty === 'inferno') {
            this.createWall(0, 1, -quarterSize * 0.5, quarterSize, 2, 1);
            this.createWall(0, 1, quarterSize * 0.5, quarterSize, 2, 1);
            this.createWall(-quarterSize * 0.5, 1, 0, 1, 2, quarterSize);
            this.createWall(quarterSize * 0.5, 1, 0, 1, 2, quarterSize);
            this.createWall(-quarterSize * 0.3, 1, -quarterSize * 0.3, quarterSize * 0.6, 2, 1);
            this.createWall(quarterSize * 0.3, 1, quarterSize * 0.3, quarterSize * 0.6, 2, 1);
        }
        
        // 煉獄模式額外牆壁
        if (this.difficulty === 'inferno') {
            this.createWall(-quarterSize * 0.8, 1, -quarterSize * 0.8, 1, 2, quarterSize * 0.6);
            this.createWall(quarterSize * 0.8, 1, quarterSize * 0.8, 1, 2, quarterSize * 0.6);
            this.createWall(-quarterSize * 0.2, 1, quarterSize * 0.8, quarterSize * 0.4, 2, 1);
            this.createWall(quarterSize * 0.2, 1, -quarterSize * 0.8, quarterSize * 0.4, 2, 1);
            this.createWall(-quarterSize * 0.6, 1, quarterSize * 0.4, 1, 2, quarterSize * 0.4);
            this.createWall(quarterSize * 0.6, 1, -quarterSize * 0.4, 1, 2, quarterSize * 0.4);
        }
    }

    createRandomExit() {
        // 移除現有的出口
        if (this.exit) {
            this.scene.remove(this.exit);
        }

        const exitGeometry = new THREE.CylinderGeometry(1, 1, 4, 32);
        const exitMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xFFFF00, 
            transparent: true, 
            opacity: 0.5 
        });
        this.exit = new THREE.Mesh(exitGeometry, exitMaterial);
        
        // 隨機生成出口位置
        let exitPosition = this.getRandomExitPosition();
        this.exit.position.set(exitPosition.x, 2, exitPosition.z);
        
        this.scene.add(this.exit);
        
        // 調整光源位置，確保與出口有適當距離
        this.adjustLightPosition();
    }
    
    adjustLightPosition() {
        // 找到場景中的平行光源
        const directionalLight = this.scene.children.find(child => 
            child instanceof THREE.DirectionalLight
        );
        
        if (directionalLight && this.exit) {
            // 根據難度設定光源與出口的最小距離
            let minLightDistance;
            switch (this.difficulty) {
                case 'easy':
                    minLightDistance = 10;
                    break;
                case 'hard':
                    minLightDistance = 15;
                    break;
                case 'inferno':
                    minLightDistance = 20;
                    break;
                default:
                    minLightDistance = 10;
            }
            
            // 計算光源的新位置，確保與出口有最小距離
            const exitPos = this.exit.position;
            const currentLightPos = directionalLight.position;
            
            // 如果當前距離小於最小距離，則調整光源位置
            const currentDistance = Math.sqrt(
                Math.pow(currentLightPos.x - exitPos.x, 2) +
                Math.pow(currentLightPos.z - exitPos.z, 2)
            );
            
            if (currentDistance < minLightDistance) {
                // 計算從出口到光源的方向向量
                const direction = new THREE.Vector3(
                    currentLightPos.x - exitPos.x,
                    0,
                    currentLightPos.z - exitPos.z
                ).normalize();
                
                // 設定新的光源位置
                const newLightPos = new THREE.Vector3(
                    exitPos.x + direction.x * minLightDistance,
                    1, // 保持Y軸高度
                    exitPos.z + direction.z * minLightDistance
                );
                
                directionalLight.position.copy(newLightPos);
            }
        }
    }

    getRandomExitPosition() {
        const margin = 2; // 距離邊緣的最小距離
        
        let x, z;
        do {
            x = Math.random() * (this.mapSize - 2 * margin) - (this.mapSize / 2 - margin);
            z = Math.random() * (this.mapSize - 2 * margin) - (this.mapSize / 2 - margin);
        } while (this.checkWallCollision({ x, y: 1, z }, 1)); // 確保出口不在牆內

        return { x, z };
    }

    checkWallCollision(position, playerRadius) {
        const wallThickness = 1;
        const halfSize = this.mapSize / 2;
        const quarterSize = this.mapSize / 4;
        
        // 外圍牆壁
        const walls = [
            {x: -halfSize, z: 0, width: 1, depth: this.mapSize},
            {x: halfSize, z: 0, width: 1, depth: this.mapSize},
            {x: 0, z: -halfSize, width: this.mapSize, depth: 1},
            {x: 0, z: halfSize, width: this.mapSize, depth: 1},
            
            // 基礎內部牆壁
            {x: -quarterSize, z: -quarterSize * 1.5, width: 1, depth: quarterSize},
            {x: quarterSize, z: quarterSize * 1.5, width: 1, depth: quarterSize},
            {x: -quarterSize/2, z: quarterSize/2, width: quarterSize, depth: 1},
            {x: quarterSize/2, z: -quarterSize/2, width: quarterSize, depth: 1},
            {x: -quarterSize * 1.5, z: 0, width: quarterSize, depth: 1},
            {x: quarterSize * 1.5, z: 0, width: quarterSize, depth: 1},
            {x: -quarterSize * 0.7, z: quarterSize, width: 1, depth: quarterSize},
            {x: quarterSize * 0.7, z: -quarterSize, width: 1, depth: quarterSize}
        ];
        
        // 困難模式額外牆壁
        if (this.difficulty === 'hard' || this.difficulty === 'inferno') {
            walls.push(
                {x: 0, z: -quarterSize * 0.5, width: quarterSize, depth: 1},
                {x: 0, z: quarterSize * 0.5, width: quarterSize, depth: 1},
                {x: -quarterSize * 0.5, z: 0, width: 1, depth: quarterSize},
                {x: quarterSize * 0.5, z: 0, width: 1, depth: quarterSize},
                {x: -quarterSize * 0.3, z: -quarterSize * 0.3, width: quarterSize * 0.6, depth: 1},
                {x: quarterSize * 0.3, z: quarterSize * 0.3, width: quarterSize * 0.6, depth: 1}
            );
        }
        
        // 煉獄模式額外牆壁
        if (this.difficulty === 'inferno') {
            walls.push(
                {x: -quarterSize * 0.8, z: -quarterSize * 0.8, width: 1, depth: quarterSize * 0.6},
                {x: quarterSize * 0.8, z: quarterSize * 0.8, width: 1, depth: quarterSize * 0.6},
                {x: -quarterSize * 0.2, z: quarterSize * 0.8, width: quarterSize * 0.4, depth: 1},
                {x: quarterSize * 0.2, z: -quarterSize * 0.8, width: quarterSize * 0.4, depth: 1},
                {x: -quarterSize * 0.6, z: quarterSize * 0.4, width: 1, depth: quarterSize * 0.4},
                {x: quarterSize * 0.6, z: -quarterSize * 0.4, width: 1, depth: quarterSize * 0.4}
            );
        }

        for (let wall of walls) {
            const wallMinX = wall.x - wall.width / 2 - playerRadius;
            const wallMaxX = wall.x + wall.width / 2 + playerRadius;
            const wallMinZ = wall.z - wall.depth / 2 - playerRadius;
            const wallMaxZ = wall.z + wall.depth / 2 + playerRadius;

            if (
                position.x >= wallMinX && position.x <= wallMaxX &&
                position.z >= wallMinZ && position.z <= wallMaxZ
            ) {
                return true; // 發生碰撞
            }
        }

        return false; // 沒有碰撞
    }

    checkExitReached(position, playerRadius) {
        if (!this.exit) return false;
        
        const exitPosition = this.exit.position;
        const distance = Math.sqrt(
            Math.pow(position.x - exitPosition.x, 2) +
            Math.pow(position.z - exitPosition.z, 2)
        );
        return distance < (1 + playerRadius); // 使用柱子的半徑 (1) 加上玩家半徑
    }

    getPlayerStartPosition() {
        const margin = 2;
        let startPosition;
        
        // 根據難度設定最短距離
        let minDistance;
        switch (this.difficulty) {
            case 'easy':
                minDistance = 15;
                break;
            case 'hard':
                minDistance = 20;
                break;
            case 'inferno':
                minDistance = 30;
                break;
            default:
                minDistance = 15;
        }
        
        do {
            startPosition = new THREE.Vector3(
                Math.random() * (this.mapSize - 2 * margin) - (this.mapSize / 2 - margin),
                1,
                Math.random() * (this.mapSize - 2 * margin) - (this.mapSize / 2 - margin)
            );
        } while (
            this.checkWallCollision(startPosition, 0.5) || 
            this.exit.position.distanceTo(startPosition) < minDistance
        );

        return startPosition;
    }

    getRandomPosition() {
        const margin = 2; // 距離邊緣的最小距離
        let position;
        
        do {
            position = new THREE.Vector3(
                Math.random() * (this.mapSize - 2 * margin) - (this.mapSize / 2 - margin),
                1,
                Math.random() * (this.mapSize - 2 * margin) - (this.mapSize / 2 - margin)
            );
        } while (this.checkWallCollision(position, 0.5)); // 確保位置不在牆內

        return position;
    }
}