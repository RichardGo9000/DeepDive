import Phaser from 'phaser';
import StateMachine from '../modules/StateMachine.js';
import ObstaclesController from './ObstaclesController.js';

interface PlayerConstructor {
  scene: Phaser.Scene;
  sprite: Phaser.GameObjects.Sprite;
  cursorKeys: Phaser.Types.Input.Keyboard.CursorKeys;
  obstacles: ObstaclesController;
  options?: PlayerSceneOptions;
}

interface PlayerSceneOptions {
  label?: string;
  speed?: { x: number, y: number };
  health?: { max?: number, current?: number, additional?: number };
  radius?: number;
  friction?: number;
  frictionAir?: number;
  restitution?: number;
  origin?: { x: number, y: number };
}

//frictionAir will need to be changed for water, but there may be another location that is better suited to this change
const defaults = {
  label: 'Player',
  speed: { x: 3, y: 2 },
  health: { max: 100, current: 100, additional: 0 },
  radius: 12,
  friction: 0.3,
  frictionAir: 0.05,
  restitution: 0.5,
  origin: { x: 0.5, y: 0.5 }
}

export default class PlayerController {
  private scene: Phaser.Scene;
  private sprite: Phaser.GameObjects.Sprite|Phaser.Physics.Matter.Sprite;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private obstacles: ObstaclesController;
  private options: Required<PlayerSceneOptions>;
  private body: MatterJS.BodyType;
  private stateMachine: StateMachine<'idle'|'walking'|'jumping'|'movingForward'>;
  private health = 100
  private oxygen = 100
  private battery = 100
  private speed = { x: 3, y: 2};

  constructor({ scene, sprite, cursorKeys, obstacles, options }: PlayerConstructor) {
    this.options = { ...defaults, ...options };
    this.speed = this.options.speed;

    this.scene = scene;
    this.sprite = sprite;
    this.cursors = cursorKeys;
    this.obstacles = obstacles;
    
    this.createAnimations();

    this.body = this.scene.matter.bodies.circle(this.sprite.x, this.sprite.y, this.options.radius, {
      label: this.options.label,
      frictionAir: this.options.frictionAir,
      friction: this.options.friction,
      restitution: this.options.restitution
    });

    this.sprite.setOrigin(this.options.origin.x, this.options.origin.y);

    this.scene.matter.add.gameObject(this.sprite, this.body);

    this.stateMachine = new StateMachine(this, this.options.label);

    //need to change states to be applicable to a submarine
    // idle
    // movingForward
    // open top door
    // close top door
    // open bottom door
    // close top door
    this.stateMachine
    .addState('idle', { onEnter: this.idleOnEnter, onUpdate: this.idleOnUpdate })
    .addState('movingForward', { onEnter: this.movingForwardOnEnter, onUpdate: this.movingForwardOnUpdate })
    .addState('walking', { onEnter: this.walkingOnEnter, onUpdate: this.walkingOnUpdate })
    .addState('jumping', { onEnter: this.jumpingOnEnter, onUpdate: this.jumpingOnUpdate })
    .setState('walking');
  }

  private createAnimations(){
    // open top
    // close top
    // open bottom
    // close bottom

    // move forward
    this.sprite.anims.create({
      key: 'move',
      frameRate: 15,
      frames: this.sprite.anims.generateFrameNumbers('minisub', {start: 9, end: 11}),
      repeat: -1
    });

    // idle
    this.sprite.anims.create({
      key: 'idle',
      frameRate: 15,
      frames: this.sprite.anims.generateFrameNumbers('minisub', {start: 0, end: 0}),
      repeat: -1
    });
  }

  public update(delta: number) {
    this.stateMachine.update(delta);
  }

  private idleOnEnter() { 
    //display idle animation here        <--
this.sprite.anims.play('idle', true);
    this.sprite.anims.stop(); 
  }

  private idleOnUpdate(){
    const { left, right, up } = this.cursors;
    if (left.isDown || right.isDown) this.stateMachine.setState('walking');

    const spaceJustPressed = Phaser.Input.Keyboard.JustDown(this.cursors.space)
    if (spaceJustPressed || up.isDown) this.stateMachine.setState('jumping');
  }

  private movingForwardOnEnter() {
    //this.sprite.anims.play('move', true);
  }

  private walkingOnEnter() { this.sprite.anims.play('move', true); }

  //change to movingOnUpdate()
  private walkingOnUpdate() {
    const { left, right, up, space } = this.cursors;
    const xSpeed = this.speed.x;
    const { matter } = this.scene;

    if (left.isDown) {
      matter.body.setVelocity(this.body, { x: -xSpeed, y: this.body.velocity.y })
      this.sprite.setFlipX(false);
    } else if (right.isDown) {
      matter.body.setVelocity(this.body, { x: xSpeed, y: this.body.velocity.y })
      this.sprite.setFlipX(true);
    } else {
      matter.body.setVelocity(this.body, { x: 0, y: this.body.velocity.y })
      this.stateMachine.setState('idle');
    }

    const spaceJustPressed = Phaser.Input.Keyboard.JustDown(space)
    if (spaceJustPressed || up.isDown) this.stateMachine.setState('jumping');
  }

  //need to delete
  private jumpingOnEnter() {
    const { matter } = this.scene;
    const ySpeed = this.speed.y;
    matter.body.setVelocity(this.body, { x: this.body.velocity.x, y: -ySpeed });
   }

  //need to delete
  private jumpingOnUpdate() {
    const { left, right } = this.cursors;
    const xSpeed = this.speed.x;
    const { matter } = this.scene;

    if (left.isDown) {
      matter.body.setVelocity(this.body, { x: -xSpeed, y: this.body.velocity.y })
      this.sprite.setFlipX(true);
    } else if (right.isDown) {
      matter.body.setVelocity(this.body, { x: xSpeed, y: this.body.velocity.y });
      this.sprite.setFlipX(false);
    } else {
      matter.body.setVelocity(this.body, { x: 0, y: this.body.velocity.y });
    }

    // if (this.sprite.body.touching.down) this.stateMachine.setState('walking');
  }

  // probably need to add some delete commands here or update when this is called
  destroy() {
    this.sprite.destroy();
    this.stateMachine.destroy();
  }
}
