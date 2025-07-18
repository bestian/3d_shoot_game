let moveJoystickTouch = null;
let moveJoystickPosition = { x: 0, y: 0 };

// 調整觸摸移動速度，使其與鍵盤移動速度相近
const touchMoveSpeed = 0.08; // 將其設置為0.08
const keyboardMoveSpeed = 0.05; // 將其設置為原來的1/6
const keyboardRotateSpeed = 0.03;

const keys = {};

// 跳躍相關變數
let isJumping = false;
let jumpVelocity = 0;
let originalCameraHeight = 1.7; // 預設相機高度
const jumpHeight = 10; // 跳躍高度
const jumpSpeed = 0.25; // 跳躍速度
const gravity = 0.008; // 重力

// 開始跳躍
function startJump(camera) {
    if (!isJumping) {
        isJumping = true;
        jumpVelocity = jumpSpeed;
        originalCameraHeight = camera.position.y;
    }
}

// 更新跳躍狀態
function updateJump(camera) {
    if (isJumping) {
        camera.position.y += jumpVelocity;
        jumpVelocity -= gravity;
        
        // 檢查是否落地
        if (camera.position.y <= originalCameraHeight) {
            camera.position.y = originalCameraHeight;
            isJumping = false;
            jumpVelocity = 0;
        }
    }
}

export function initControls(
    scene,
    camera,
    createBullet,
    getGameOver,
    checkWallCollision,
    playerRadius,
    gameMap,
    onBulletCreated
) {
    document.addEventListener('keydown', (event) => {
        keys[event.code] = true;
        if (event.code === 'Space' && !getGameOver()) {
            const bullet = createBullet(camera);
            scene.add(bullet);
            onBulletCreated(bullet);
        }
        // 跳躍控制 (Ctrl鍵)
        if (event.code === 'ControlLeft' || event.code === 'ControlRight') {
            if (!isJumping && !getGameOver()) {
                startJump(camera);
            }
        }
    });
    document.addEventListener('keyup', (event) => keys[event.code] = false);

    initTouchControls(scene, camera, createBullet, getGameOver);

    // 添加射擊按鈕事件監聽器
    const shootButton = document.getElementById('shoot-button');
    shootButton.addEventListener('click', () => {
        if (!getGameOver()) {
            const bullet = createBullet(camera);
            scene.add(bullet);
            onBulletCreated(bullet);
        }
    });

    // 添加跳躍按鈕事件監聽器
    const jumpButton = document.getElementById('jump-button');
    jumpButton.addEventListener('click', () => {
        if (!getGameOver()) {
            startJump(camera);
        }
    });

    return {
        handleInput: () => handleInput(camera, getGameOver, checkWallCollision, playerRadius, gameMap),
        // 移除 startAutoShooting 和 stopAutoShooting
    };
}

function initTouchControls(scene, camera, createBullet, getGameOver) {
    const moveJoystick = document.getElementById('joystick-move');
    const moveJoystickKnob = document.getElementById('joystick-knob-move');

    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('touchcancel', handleTouchEnd);

    function handleTouchStart(event) {
        if (getGameOver()) return;
        event.preventDefault();
        Array.from(event.changedTouches).forEach(touch => {
            const moveJoystickRect = moveJoystick.getBoundingClientRect();

            if (touch.clientX >= moveJoystickRect.left && touch.clientX <= moveJoystickRect.right &&
                touch.clientY >= moveJoystickRect.top && touch.clientY <= moveJoystickRect.bottom) {
                moveJoystickTouch = touch;
                updateJoystickPosition(moveJoystick, moveJoystickKnob, touch, 'move');
            }
        });
    }

    function handleTouchMove(event) {
        if (getGameOver()) return;
        event.preventDefault();
        Array.from(event.changedTouches).forEach(touch => {
            if (touch.identifier === moveJoystickTouch?.identifier) {
                updateJoystickPosition(moveJoystick, moveJoystickKnob, touch, 'move');
            }
        });
    }

    function handleTouchEnd(event) {
        if (getGameOver()) return;
        Array.from(event.changedTouches).forEach(touch => {
            if (touch.identifier === moveJoystickTouch?.identifier) {
                resetJoystick(moveJoystickKnob, 'move');
                moveJoystickTouch = null;
            }
        });
        resetJoystick(moveJoystickKnob, 'move');
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
    }
}

function resetJoystick(knob, type) {
    if (type === 'move') {
        moveJoystickPosition = { x: 0, y: 0 };
    }
    knob.style.transform = 'translate(-20px, -20px)';
}

function handleInput(camera, getGameOver, checkWallCollision, playerRadius, gameMap) {
    if (getGameOver()) return false;

    // 更新跳躍狀態
    updateJump(camera);

    const rotateSpeed = 0.15;
    const moveSpeed = keyboardMoveSpeed;

    let newPosition = camera.position.clone();
    let moved = false;

    if (moveJoystickTouch) {
        const moveX = moveJoystickPosition.x * touchMoveSpeed;
        const moveZ = moveJoystickPosition.y * touchMoveSpeed;

        // 左右旋轉保持不變
        camera.rotation.y -= moveX * rotateSpeed;

        // 前後移動
        const rotatedMoveZ = moveZ * Math.cos(camera.rotation.y);
        const rotatedMoveX = moveZ * Math.sin(camera.rotation.y);

        let tempPosition = newPosition.clone();
        tempPosition.x += rotatedMoveX;
        if (!checkWallCollision || !checkWallCollision(tempPosition, playerRadius)) {
            newPosition.x = tempPosition.x;
            moved = true;
        }

        tempPosition = newPosition.clone();
        tempPosition.z += rotatedMoveZ;
        if (!checkWallCollision || !checkWallCollision(tempPosition, playerRadius)) {
            newPosition.z = tempPosition.z;
            moved = true;
        }
    }

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
        if (!checkWallCollision || !checkWallCollision(tempPosition, playerRadius)) {
            newPosition.x = tempPosition.x;
            moved = true;
        }

        tempPosition = newPosition.clone();
        tempPosition.z -= rotatedMoveZ;
        if (!checkWallCollision || !checkWallCollision(tempPosition, playerRadius)) {
            newPosition.z = tempPosition.z;
            moved = true;
        }
    }

    if (keys['ArrowLeft']) {
        camera.rotation.y += keyboardRotateSpeed;
    }
    if (keys['ArrowRight']) {
        camera.rotation.y -= keyboardRotateSpeed;
    }

    if (moved) {
        // 保持跳躍時的Y軸位置
        const currentY = camera.position.y;
        camera.position.copy(newPosition);
        camera.position.y = currentY;
    }

    if (gameMap && gameMap.checkExitReached && gameMap.mapSize) {
        if (gameMap.checkExitReached(camera.position, playerRadius)) {
            return true;
        }
    }

    return false;
}