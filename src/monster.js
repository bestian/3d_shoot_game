import * as THREE from 'three';

export function createShadowMonster(scene, playerPosition) {
    const monsterGeometry = new THREE.SphereGeometry(0.5, 32, 32);
    const monsterMaterial = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.5 });
    const monster = new THREE.Mesh(monsterGeometry, monsterMaterial);
    
    // 在玩家周圍隨機位置生成怪物
    const angle = Math.random() * Math.PI * 2;
    const radius = 10 + Math.random() * 5;
    monster.position.set(
        playerPosition.x + Math.cos(angle) * radius,
        0.5,
        playerPosition.z + Math.sin(angle) * radius
    );
    
    scene.add(monster);
    return monster;
}

export function updateShadowMonsters(monsters, playerPosition) {
    monsters.forEach(monster => {
        const direction = new THREE.Vector3().subVectors(playerPosition, monster.position).normalize();
        monster.position.add(direction.multiplyScalar(0.03));
    });
}
