import * as THREE from 'three';

export class GameMap {
    constructor(scene) {
        this.scene = scene;
        this.exit = null;
        this.createFloor();
        this.createWalls();
        this.createRandomExit();
    }

    createFloor() {
        const floorGeometry = new THREE.PlaneGeometry(40, 40);
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
        // 外圍牆壁
        this.createWall(-20, 1, 0, 1, 2, 40);
        this.createWall(20, 1, 0, 1, 2, 40);
        this.createWall(0, 1, -20, 40, 2, 1);
        this.createWall(0, 1, 20, 40, 2, 1);

        // 內部牆壁（已移除部分牆壁以連通空間）
        this.createWall(-10, 1, -15, 1, 2, 10); // 縮短並移動
        this.createWall(10, 1, 15, 1, 2, 10);   // 縮短並移動
        this.createWall(-5, 1, 5, 8, 2, 1);     // 縮短
        this.createWall(5, 1, -5, 8, 2, 1);     // 縮短

        // 修改後的內部牆壁
        this.createWall(-15, 1, 0, 8, 2, 1);    // 縮短
        this.createWall(15, 1, 0, 8, 2, 1);     // 縮短
        this.createWall(-7, 1, 10, 1, 2, 8);    // 縮短
        this.createWall(7, 1, -10, 1, 2, 8);    // 縮短
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
    }

    getRandomExitPosition() {
        const mapSize = 40;
        const margin = 2; // 距離邊緣的最小距離
        
        let x, z;
        do {
            x = Math.random() * (mapSize - 2 * margin) - (mapSize / 2 - margin);
            z = Math.random() * (mapSize - 2 * margin) - (mapSize / 2 - margin);
        } while (this.checkWallCollision({ x, y: 1, z }, 1)); // 確保出口不在牆內

        return { x, z };
    }

    checkWallCollision(position, playerRadius) {
        const wallThickness = 1;
        const walls = [
            {x: -20, z: 0, width: 1, depth: 40},
            {x: 20, z: 0, width: 1, depth: 40},
            {x: 0, z: -20, width: 40, depth: 1},
            {x: 0, z: 20, width: 40, depth: 1},
            {x: -10, z: -15, width: 1, depth: 10},
            {x: 10, z: 15, width: 1, depth: 10},
            {x: -5, z: 5, width: 8, depth: 1},
            {x: 5, z: -5, width: 8, depth: 1},
            {x: -15, z: 0, width: 8, depth: 1},
            {x: 15, z: 0, width: 8, depth: 1},
            {x: -7, z: 10, width: 1, depth: 8},
            {x: 7, z: -10, width: 1, depth: 8}
        ];

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
        const mapSize = 40;
        const margin = 2;
        let startPosition;
        
        do {
            startPosition = new THREE.Vector3(
                Math.random() * (mapSize - 2 * margin) - (mapSize / 2 - margin),
                1,
                Math.random() * (mapSize - 2 * margin) - (mapSize / 2 - margin)
            );
        } while (
            this.checkWallCollision(startPosition, 0.5) || 
            this.exit.position.distanceTo(startPosition) < 15
        );

        return startPosition;
    }

    getRandomPosition() {
        const mapSize = 40;
        const margin = 2; // 距離邊緣的最小距離
        let position;
        
        do {
            position = new THREE.Vector3(
                Math.random() * (mapSize - 2 * margin) - (mapSize / 2 - margin),
                1,
                Math.random() * (mapSize - 2 * margin) - (mapSize / 2 - margin)
            );
        } while (this.checkWallCollision(position, 0.5)); // 確保位置不在牆內

        return position;
    }
}