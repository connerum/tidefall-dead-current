import type { Vec3 } from "@tidefall/shared";

let nextId = 1;

export abstract class Entity {
  id: string;
  position: Vec3;
  velocity: Vec3;
  rotation: number;
  radius: number;
  height: number;
  removed = false;

  constructor(prefix: string, position: Vec3) {
    this.id = `${prefix}_${nextId++}`;
    this.position = { ...position };
    this.velocity = { x: 0, y: 0, z: 0 };
    this.rotation = 0;
    this.radius = 0.4;
    this.height = 1.7;
  }

  abstract tick(dt: number): void;

  getPosition(): Vec3 {
    return { ...this.position };
  }
}
