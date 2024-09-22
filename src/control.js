import * as THREE from 'three';

let moveJoystickTouch = null;
let viewJoystickTouch = null;
let moveJoystickPosition = { x: 0, y: 0 };
let viewJoystickPosition = { x: 0, y: 0 };
let autoShootInterval;

const touchMoveSpeed = 1;
const keyboardMoveSpeed = 0.3;
const keyboardRotateSpeed = 0.03;

const keys = {};

export function initControls(
    scene,
    camera,
    createBullet,
    getGameOver, // 改為接受一個函數來取得 gameOver 的最新狀態
    checkWallCollision,
    playerRadius,
    gameMap,
    onBulletCreated // 新增一個回調函數參數
) {
    document.addEventListener('keydown', (event) => keys[event.code] = true);
    document.addEventListener('keyup', (event) => keys[event.code] = false);

    initTouchControls(scene, camera, createBullet, getGameOver);

    return {
        handleInput: () => handleInput(camera, getGameOver, checkWallCollision, playerRadius, gameMap),
        startAutoShooting: () => startAutoShooting(scene, camera, createBullet, getGameOver, onBulletCreated),
        stopAutoShooting: () => clearInterval(autoShootInterval)
    };
}

function initTouchControls(scene, camera, createBullet, getGameOver) {
    const moveJoystick = document.getElementById('joystick-move');
    const moveJoystickKnob = document.getElementById('joystick-knob-move');
    const viewJoystick = document.getElementById('joystick-view');
    const viewJoystickKnob = document.getElementById('joystick-knob-view');

    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('touchcancel', handleTouchEnd);

    function handleTouchStart(event) {
        if (getGameOver()) return; // 使用 getGameOver 函數檢查遊戲是否結束
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
        if (getGameOver()) return; // 使用 getGameOver 函數檢查遊戲是否結束
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
        if (getGameOver()) return; // 使用 getGameOver 函數檢查遊戲是否結束
        Array.from(event.changedTouches).forEach(touch => {
            if (touch.identifier === moveJoystickTouch?.identifier) {
                resetJoystick(moveJoystickKnob, 'move');
                moveJoystickTouch = null;
            } else if (touch.identifier === viewJoystickTouch?.identifier) {
                resetJoystick(viewJoystickKnob, 'view');
                viewJoystickTouch = null;
            }
        });
        // 新增以下代碼，確保搖桿回到圓心
        resetJoystick(moveJoystickKnob, 'move');
        resetJoystick(viewJoystickKnob, 'view');
    }
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
    if (type === 'move') {
        moveJoystickPosition = { x: 0, y: 0 };
    } else {
        viewJoystickPosition = { x: 0, y: 0 };
    }
}

function handleInput(camera, getGameOver, checkWallCollision, playerRadius, gameMap) {
    if (getGameOver()) return false;

    const rotateSpeed = 0.05;
    const moveSpeed = keyboardMoveSpeed;

    let newPosition = camera.position.clone();
    let moved = false;

    // 處理移動搖桿輸入
    if (moveJoystickTouch) {
        const moveAngle = Math.atan2(moveJoystickPosition.y, moveJoystickPosition.x);
        const moveMagnitude = Math.sqrt(moveJoystickPosition.x ** 2 + moveJoystickPosition.y ** 2) / 6;
        
        const moveX = Math.cos(moveAngle) * touchMoveSpeed * moveMagnitude;
        const moveZ = -Math.sin(moveAngle) * touchMoveSpeed * moveMagnitude; // 修改這裡，加上負號
        
        let tempPosition = newPosition.clone();
        tempPosition.x += moveX;
        if (!checkWallCollision(tempPosition, playerRadius)) {
            newPosition.x = tempPosition.x;
            moved = true;
        }

        tempPosition = newPosition.clone();
        tempPosition.z -= moveZ;
        if (!checkWallCollision(tempPosition, playerRadius)) {
            newPosition.z = tempPosition.z;
            moved = true;
        }
    }

    // 處理視角搖桿輸入
    if (viewJoystickTouch) {
        const viewMagnitudeX = viewJoystickPosition.x / 5; // 將除數從30改為5，增加6倍速度
        const viewMagnitudeY = viewJoystickPosition.y / 5; // 將除數從30改為5，增加6倍速度
        camera.rotation.y -= viewMagnitudeX * rotateSpeed;
        camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotation.x - viewMagnitudeY * rotateSpeed));
    }

    // 處理鍵盤輸入
    const moveForward = keys['KeyW'] || keys['ArrowUp'];
    const moveBackward = keys['KeyS'] || keys['ArrowDown'];
    const moveLeft = keys['KeyA'];
    const moveRight = keys['KeyD'];

    if (moveForward || moveBackward || moveLeft || moveRight) {
        const moveX = ((moveLeft ? -1 : 0) + (moveRight ? 1 : 0)) * moveSpeed;
        const moveZ = ((moveForward ? 1 : 0) + (moveBackward ? -1 : 0)) * moveSpeed;

        const rotatedMoveX = moveX * Math.cos(camera.rotation.y) - moveZ * Math.sin(camera.rotation.y);
        const rotatedMoveZ = moveX * Math.sin(camera.rotation.y) + moveZ * Math.cos(camera.rotation.y);

        let tempPosition = newPosition.clone();
        tempPosition.x += rotatedMoveX;
        if (!checkWallCollision(tempPosition, playerRadius)) {
            newPosition.x = tempPosition.x;
            moved = true;
        }

        tempPosition = newPosition.clone();
        tempPosition.z -= rotatedMoveZ;
        if (!checkWallCollision(tempPosition, playerRadius)) {
            newPosition.z = tempPosition.z;
            moved = true;
        }
    }

    if (keys['ArrowLeft']) {
        camera.rotation.y += rotateSpeed;
    }
    if (keys['ArrowRight']) {
        camera.rotation.y -= rotateSpeed;
    }

    // 更新相機位置
    if (moved) {
        camera.position.copy(newPosition);
    }

    // 檢查是否到達出口
    if (gameMap.checkExitReached(camera.position, playerRadius)) {
        return true; // 表示玩家已到達出口
    }

    return false; // 表示玩家未到達出口
}

function startAutoShooting(scene, camera, createBullet, getGameOver, onBulletCreated) {
    if (autoShootInterval) {
        clearInterval(autoShootInterval);
    }
    autoShootInterval = setInterval(() => {
        if (!getGameOver()) {
            const bullet = createBullet(camera);
            scene.add(bullet);
            onBulletCreated(bullet); // 通知 game.js 將子彈加入 bullets 數組
        }
    }, 1000);
}

// ... 其他輔助函數如 updateJoystickPosition, resetJoystick 等 ...