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

        // 內部牆壁
        this.createWall(-10, 1, -10, 1, 2, 20);
        this.createWall(10, 1, 10, 1, 2, 20);
        this.createWall(-5, 1, 5, 10, 2, 1);
        this.createWall(5, 1, -5, 10, 2, 1);

        // 新增的內部牆壁
        this.createWall(-15, 1, 0, 10, 2, 1);
        this.createWall(15, 1, 0, 10, 2, 1);
        this.createWall(0, 1, 15, 1, 2, 10);
        this.createWall(0, 1, -15, 1, 2, 10);
        this.createWall(-7, 1, 10, 1, 2, 10);
        this.createWall(7, 1, -10, 1, 2, 10);
    }

    createRandomExit() {
        // 移除現有的出口
        if (this.exit) {
            this.scene.remove(this.exit);
        }

        const exitGeometry = new THREE.PlaneGeometry(2, 2);
        const exitMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFF00, side: THREE.DoubleSide });
        this.exit = new THREE.Mesh(exitGeometry, exitMaterial);
        this.exit.rotation.x = Math.PI / 2;
        
        // 隨機生成出口位置
        let exitPosition = this.getRandomExitPosition();
        this.exit.position.set(exitPosition.x, 0.01, exitPosition.z);
        
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
            {x: -10, z: -10, width: 1, depth: 20},
            {x: 10, z: 10, width: 1, depth: 20},
            {x: -5, z: 5, width: 10, depth: 1},
            {x: 5, z: -5, width: 10, depth: 1},
            // 新增的內部牆壁
            {x: -15, z: 0, width: 10, depth: 1},
            {x: 15, z: 0, width: 10, depth: 1},
            {x: 0, z: 15, width: 1, depth: 10},
            {x: 0, z: -15, width: 1, depth: 10},
            {x: -7, z: 10, width: 1, depth: 10},
            {x: 7, z: -10, width: 1, depth: 10}
        ];

        for (let wall of walls) {
            if (
                position.x + playerRadius > wall.x - wall.width / 2 &&
                position.x - playerRadius < wall.x + wall.width / 2 &&
                position.z + playerRadius > wall.z - wall.depth / 2 &&
                position.z - playerRadius < wall.z + wall.depth / 2
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
        return distance < (playerRadius + 1);
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
}