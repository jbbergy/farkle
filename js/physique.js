// Physique des dés (cannon-es) : gravité, matières, sol et murs invisibles autour du plateau.

import * as CANNON from 'cannon-es';
import { CONFIG } from './config.js';

export const world = new CANNON.World({ gravity: new CANNON.Vec3(0, CONFIG.gravity, 0) });
world.allowSleep = true;
world.solver.iterations = 14;
world.defaultContactMaterial.friction = 0.3;
world.defaultContactMaterial.restitution = 0.3;
export const mDice = new CANNON.Material('dice'), mFloor = new CANNON.Material('floor'), mWall = new CANNON.Material('wall');
world.addContactMaterial(new CANNON.ContactMaterial(mDice, mFloor, { friction: 0.32, restitution: 0.32 }));
world.addContactMaterial(new CANNON.ContactMaterial(mDice, mDice, { friction: 0.12, restitution: 0.42 }));
world.addContactMaterial(new CANNON.ContactMaterial(mDice, mWall, { friction: 0.05, restitution: 0.5 }));

// Groupes de collision : un dé qui entre par la droite ignore le mur droit tant qu’il ne l’a pas franchi.
export const G = { DICE: 1, FLOOR: 2, WALL: 4, WALL_R: 8, WALL_L: 16 };
export const MASK_ALL = G.DICE | G.FLOOR | G.WALL | G.WALL_R | G.WALL_L;
export const MASK_ENTER_R = MASK_ALL & ~G.WALL_R;
export const MASK_ENTER_L = MASK_ALL & ~G.WALL_L;

const floorBody = new CANNON.Body({ type: CANNON.Body.STATIC, shape: new CANNON.Plane(), material: mFloor, collisionFilterGroup: G.FLOOR, collisionFilterMask: G.DICE });
floorBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
world.addBody(floorBody);
function addWall(hx, hy, hz, x, y, z, group) {
  const b = new CANNON.Body({ type: CANNON.Body.STATIC, shape: new CANNON.Box(new CANNON.Vec3(hx, hy, hz)), material: mWall, collisionFilterGroup: group, collisionFilterMask: G.DICE });
  b.position.set(x, y, z);
  world.addBody(b);
}
{
  const { halfW, halfD } = CONFIG.play;
  addWall(0.5, 8, halfD + 1, halfW + 0.5, 7, 0, G.WALL_R);
  addWall(0.5, 8, halfD + 1, -halfW - 0.5, 7, 0, G.WALL_L);
  addWall(halfW + 1, 8, 0.5, 0, 7, halfD + 0.5, G.WALL);
  addWall(halfW + 1, 8, 0.5, 0, 7, -halfD - 0.5, G.WALL);
  addWall(halfW + 1, 0.5, halfD + 1, 0, 9.5, 0, G.WALL); // plafond
}
