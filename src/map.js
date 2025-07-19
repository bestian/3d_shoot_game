import * as THREE from 'three';

export class GameMap {
    constructor(scene, difficulty = 'easy') {
        this.scene = scene;
        this.difficulty = difficulty;
        this.exit = null;
        this.mazeGrid = null;
        
        // 根據難度設定地圖大小
        this.setMapSize();
        
        this.createFloor();
        this.generateMaze();
        this.createWallsFromMaze();
        this.createRandomExit();
    }
    
    setMapSize() {
        switch (this.difficulty) {
            case 'easy':
                this.mapSize = 30;
                this.gridSize = 8; // 8x8 網格
                break;
            case 'hard':
                this.mapSize = 60;
                this.gridSize = 15; // 15x15 網格
                break;
            case 'inferno':
                this.mapSize = 80;
                this.gridSize = 20; // 20x20 網格
                break;
            case 'practice':
                this.mapSize = 30;
                this.gridSize = 8; // 8x8 網格，和簡易模式相同
                break;
            default:
                this.mapSize = 30;
                this.gridSize = 8;
        }
        this.cellSize = this.mapSize / this.gridSize;
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

    // 深度優先搜索迷宮生成演算法
    generateMaze() {
        // 初始化網格，所有牆壁都是封閉的
        this.mazeGrid = [];
        for (let i = 0; i < this.gridSize; i++) {
            this.mazeGrid[i] = [];
            for (let j = 0; j < this.gridSize; j++) {
                this.mazeGrid[i][j] = {
                    walls: { north: true, south: true, east: true, west: true },
                    visited: false
                };
            }
        }

        // 從左上角開始生成迷宮
        this.dfs(0, 0);
    }

    dfs(row, col) {
        this.mazeGrid[row][col].visited = true;

        // 定義四個方向：北、南、東、西
        const directions = [
            { dr: -1, dc: 0, wall: 'north', opposite: 'south' },
            { dr: 1, dc: 0, wall: 'south', opposite: 'north' },
            { dr: 0, dc: 1, wall: 'east', opposite: 'west' },
            { dr: 0, dc: -1, wall: 'west', opposite: 'east' }
        ];

        // 隨機打亂方向順序
        for (let i = directions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [directions[i], directions[j]] = [directions[j], directions[i]];
        }

        // 遍歷所有方向
        for (let dir of directions) {
            const newRow = row + dir.dr;
            const newCol = col + dir.dc;

            // 檢查邊界和是否已訪問
            if (newRow >= 0 && newRow < this.gridSize && 
                newCol >= 0 && newCol < this.gridSize && 
                !this.mazeGrid[newRow][newCol].visited) {
                
                // 移除當前格子和相鄰格子之間的牆壁
                this.mazeGrid[row][col].walls[dir.wall] = false;
                this.mazeGrid[newRow][newCol].walls[dir.opposite] = false;

                // 遞歸訪問相鄰格子
                this.dfs(newRow, newCol);
            }
        }
    }

    // 從迷宮網格創建3D牆壁
    createWallsFromMaze() {
        const halfSize = this.mapSize / 2;
        const cellSize = this.cellSize;

        // 創建外圍牆壁
        this.createWall(-halfSize, 1, 0, 1, 2, this.mapSize);
        this.createWall(halfSize, 1, 0, 1, 2, this.mapSize);
        this.createWall(0, 1, -halfSize, this.mapSize, 2, 1);
        this.createWall(0, 1, halfSize, this.mapSize, 2, 1);

        // 練習模式不創建內部牆壁
        if (this.difficulty === 'practice') {
            return;
        }

        // 根據迷宮網格創建內部牆壁
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                const cell = this.mazeGrid[row][col];
                const cellX = (col - this.gridSize / 2) * cellSize + cellSize / 2;
                const cellZ = (row - this.gridSize / 2) * cellSize + cellSize / 2;

                // 創建北牆
                if (cell.walls.north) {
                    this.createWall(cellX, 1, cellZ - cellSize / 2, cellSize, 2, 1);
                }

                // 創建南牆
                if (cell.walls.south) {
                    this.createWall(cellX, 1, cellZ + cellSize / 2, cellSize, 2, 1);
                }

                // 創建東牆
                if (cell.walls.east) {
                    this.createWall(cellX + cellSize / 2, 1, cellZ, 1, 2, cellSize);
                }

                // 創建西牆
                if (cell.walls.west) {
                    this.createWall(cellX - cellSize / 2, 1, cellZ, 1, 2, cellSize);
                }
            }
        }

        // 根據難度添加額外的隨機牆壁，但確保不阻擋路徑
        this.addExtraWalls();
    }

    // 添加額外的隨機牆壁
    addExtraWalls() {
        const extraWallCount = this.getExtraWallCount();
        const attempts = extraWallCount * 10; // 嘗試次數
        let addedWalls = 0;

        for (let i = 0; i < attempts && addedWalls < extraWallCount; i++) {
            const wall = this.generateRandomWall();
            if (wall && this.isWallValid(wall)) {
                this.createWall(wall.x, wall.y, wall.z, wall.width, wall.height, wall.depth);
                addedWalls++;
            }
        }
    }

    getExtraWallCount() {
        switch (this.difficulty) {
            case 'easy':
                return 5;
            case 'hard':
                return 15;
            case 'inferno':
                return 30;
            case 'practice':
                return 0; // 練習模式不添加額外牆壁
            default:
                return 5;
        }
    }

    generateRandomWall() {
        const halfSize = this.mapSize / 2;
        const margin = 3;
        
        // 隨機選擇牆壁類型：水平或垂直
        const isHorizontal = Math.random() < 0.5;
        
        if (isHorizontal) {
            const x = Math.random() * (this.mapSize - 2 * margin) - (halfSize - margin);
            const z = Math.random() * (this.mapSize - 2 * margin) - (halfSize - margin);
            const width = 2 + Math.random() * 8; // 2-10 單位寬度
            
            return {
                x: x, y: 1, z: z,
                width: width, height: 2, depth: 1
            };
        } else {
            const x = Math.random() * (this.mapSize - 2 * margin) - (halfSize - margin);
            const z = Math.random() * (this.mapSize - 2 * margin) - (halfSize - margin);
            const depth = 2 + Math.random() * 8; // 2-10 單位深度
            
            return {
                x: x, y: 1, z: z,
                width: 1, height: 2, depth: depth
            };
        }
    }

    // 檢查牆壁是否有效（不會完全阻擋路徑）
    isWallValid(wall) {
        // 檢查牆壁是否與現有牆壁重疊太多
        const existingWalls = this.getExistingWalls();
        
        for (let existingWall of existingWalls) {
            if (this.wallsOverlap(wall, existingWall)) {
                return false;
            }
        }

        // 檢查是否會完全阻擋路徑（簡化檢查）
        // 這裡可以添加更複雜的路徑檢查邏輯
        return true;
    }

    getExistingWalls() {
        const walls = [];
        const halfSize = this.mapSize / 2;
        const cellSize = this.cellSize;

        // 外圍牆壁
        walls.push({x: -halfSize, z: 0, width: 1, depth: this.mapSize});
        walls.push({x: halfSize, z: 0, width: 1, depth: this.mapSize});
        walls.push({x: 0, z: -halfSize, width: this.mapSize, depth: 1});
        walls.push({x: 0, z: halfSize, width: this.mapSize, depth: 1});

        // 練習模式不包含迷宮內牆
        if (this.difficulty === 'practice') {
            return walls;
        }

        // 迷宮牆壁
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                const cell = this.mazeGrid[row][col];
                const cellX = (col - this.gridSize / 2) * cellSize + cellSize / 2;
                const cellZ = (row - this.gridSize / 2) * cellSize + cellSize / 2;

                if (cell.walls.north) {
                    walls.push({x: cellX, z: cellZ - cellSize / 2, width: cellSize, depth: 1});
                }
                if (cell.walls.south) {
                    walls.push({x: cellX, z: cellZ + cellSize / 2, width: cellSize, depth: 1});
                }
                if (cell.walls.east) {
                    walls.push({x: cellX + cellSize / 2, z: cellZ, width: 1, depth: cellSize});
                }
                if (cell.walls.west) {
                    walls.push({x: cellX - cellSize / 2, z: cellZ, width: 1, depth: cellSize});
                }
            }
        }

        return walls;
    }

    wallsOverlap(wall1, wall2) {
        const margin = 1; // 最小間距
        
        const wall1MinX = wall1.x - wall1.width / 2 - margin;
        const wall1MaxX = wall1.x + wall1.width / 2 + margin;
        const wall1MinZ = wall1.z - wall1.depth / 2 - margin;
        const wall1MaxZ = wall1.z + wall1.depth / 2 + margin;

        const wall2MinX = wall2.x - wall2.width / 2 - margin;
        const wall2MaxX = wall2.x + wall2.width / 2 + margin;
        const wall2MinZ = wall2.z - wall2.depth / 2 - margin;
        const wall2MaxZ = wall2.z + wall2.depth / 2 + margin;

        return !(wall1MaxX < wall2MinX || wall1MinX > wall2MaxX ||
                wall1MaxZ < wall2MinZ || wall1MinZ > wall2MaxZ);
    }

    createRandomExit() {
        // 移除現有的出口
        if (this.exit) {
            this.scene.remove(this.exit);
        }

        // 出口的幾何形狀
        const exitGeometry = new THREE.CylinderGeometry(1, 1, 20, 32);

        // 出口的材質
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
                case 'practice':
                    minLightDistance = 10; // 和簡易模式相同
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
        // 使用現有的牆壁列表進行碰撞檢測
        const walls = this.getExistingWalls();

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
            case 'practice':
                minDistance = 15; // 和簡易模式相同
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