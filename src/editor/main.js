import '../../lib/contextual/contextual.css';
import '../../lib/contextual/contextual.theme.css';
import '../../assets/css/editor.css';

import * as dat from 'dat.gui';
import { Contextual } from '../../lib/contextual/contextual.js';
import Vector from '../game/classes/vector.js';
import templateMapData from '../../assets/template.json';

const canvas = document.getElementById('game');
const context = canvas.getContext('2d');
let width = window.innerWidth;
let height = window.innerHeight;
let ratio = window.devicePixelRatio;

canvas.width = width * ratio;
canvas.height = height * ratio;
canvas.style.width = `${width}px`;
canvas.style.height = `${height}px`;
context.scale(ratio, ratio);

function loadImage(src) {
  const img = new Image();
  img.src = "assets/" + src;
  return img;
}

const enemyTextures = {
  bouncer: loadImage("enemies/bouncer.svg"),
  megaBouncer: loadImage("enemies/megabouncer.svg"),
  freezer: loadImage("enemies/freezer.svg"),
  spike: loadImage("enemies/spike.svg"),
  normal: loadImage("enemies/normal.svg"),
  reverse: loadImage("enemies/reverse.svg"),
  rotating: loadImage("enemies/rotating.svg"),
  bomb: [
    loadImage("enemies/bomb0.svg"),
    loadImage("enemies/bomb1.svg")
  ],
  contractor: [
    loadImage("enemies/contractor0.svg"),
    loadImage("enemies/contractor1.svg")
  ],
  taker: loadImage("enemies/taker.svg"),
  immune: loadImage("enemies/immune.svg"),
  monster: loadImage("enemies/monster.svg"),
  following: loadImage("enemies/following.svg"),
  stutter: loadImage("enemies/stutter.svg"),
  snekHead: loadImage("enemies/snekHead.svg"),
  snekBody: loadImage("enemies/snekBody.svg"),
  wavy: loadImage("enemies/wavy.svg"),
  shooter: loadImage("enemies/shooter.svg"),
  expander: loadImage("enemies/expander.svg"),
  gravityUp: loadImage("enemies/gravityUp.svg"),
  gravityDown: loadImage("enemies/gravityDown.svg"),
  gravityLeft: loadImage("enemies/gravityLeft.svg"),
  gravityRight: loadImage("enemies/gravityRight.svg"),
  harmless: loadImage("enemies/harmless.svg"),
  accelerator: loadImage("enemies/accelerator.svg"),
  decelerator: loadImage("enemies/decelerator.svg"),
  drainer: loadImage("enemies/drainer.svg"),
  disabler: loadImage("enemies/disabler.svg"),

  none: loadImage("enemies/none.svg")
};

const TEXT_COLORS = {
  '%red%': '#ff365b', '%blue%': '#294bf8', '%green%': '#52f86e', '%yellow%': '#fad345',
  '%purple%': '#ab25ff', '%pink%': '#ff3686', '%darkRed%': '#cc1b1b', '%orange%': '#fd9729',
  '%happyBlue%': '#45affa', '%cyan%': '#45fcff', '%lava%': '#c53811', '%gray%': '#818181',
  '%brown%': '#90503d', '%black%': '#2e2e2e'
};
const TEXT_CODES = [...Object.keys(TEXT_COLORS), '%reset%', '%bold%', '%italic%', '%plusSize%'];

function parseTextSegments(raw) {// braindead google code - tokaa
  const segments = [];
  let idx = 0, buf = '';
  let style = { color: null, bold: false, italic: false, sizeMul: 1 };
  while (idx < raw.length) {
    if (raw[idx] === '%' && raw.substring(idx, idx + 5).toLowerCase() === '%rgb(') {
      const end = raw.indexOf(')%', idx + 5);
      if (end !== -1) {
        const parts = raw.substring(idx + 5, end).split(',').map(s => parseInt(s.trim(), 10));
        if (parts.length === 3 && parts.every(n => n >= 0 && n <= 255)) {
          if (buf) { segments.push({ text: buf, ...style }); buf = ''; }
          style = { ...style, color: '#' + parts.map(n => n.toString(16).padStart(2, '0')).join('') };
          idx = end + 2; continue;
        }
      }
    }
    let matched = false;
    for (const code of TEXT_CODES) {
      if (raw.substring(idx, idx + code.length) === code) {
        if (buf) { segments.push({ text: buf, ...style }); buf = ''; }
        if (code in TEXT_COLORS) style = { ...style, color: TEXT_COLORS[code] };
        else if (code === '%reset%') style = { color: null, bold: false, italic: false, sizeMul: 1 };
        else if (code === '%bold%') style = { ...style, bold: true };
        else if (code === '%italic%') style = { ...style, italic: true };
        else if (code === '%plusSize%') style = { ...style, sizeMul: 1.2 };
        idx += code.length; matched = true; break;
      }
    }
    if (!matched) { buf += raw[idx]; idx++; }
  }
  if (buf) segments.push({ text: buf, ...style });
  return segments;
}

function buildTextFont(basePx, seg) {
  const px = Math.max(1, Math.round(basePx * seg.sizeMul));
  return `${seg.italic ? 'italic ' : ''}${seg.bold ? 'bold ' : ''}${px}px Russo One, Verdana, Arial, Helvetica, sans-serif`;
}

function convertMap(map) {
  for (var i = 0; i < map.maps.length; i++) {
    if (map.maps[i].gravity != undefined) {
      map.maps[i].gravity *= 3000;
    }
    for (var j in map.maps[i].objects) {
      if (map.maps[i].objects[j].type == "spawner") {
        map.maps[i].objects[j].speed = Number((map.maps[i].objects[j].speed * 50).toFixed(2));
      }
      if (map.maps[i].objects[j].type == "button") {
        map.maps[i].objects[j].time = Number((map.maps[i].objects[j].time / 50).toFixed(2));
      }
      if (map.maps[i].objects[j].type == "turret") {
        map.maps[i].objects[j].speed = Number((map.maps[i].objects[j].speed * 35).toFixed(2));
        map.maps[i].objects[j].shootingSpeed = Number((map.maps[i].objects[j].shootingSpeed * 0.025).toFixed(2));
        map.maps[i].objects[j].coolDownTime = Number((map.maps[i].objects[j].coolDownTime * 0.025).toFixed(2));
      }
    }
  }
  map.settings.version = 2;
  console.log(map);
  return map
}
function rotatePoint(pointX, pointY, originX, originY, angle) {
  angle = angle * Math.PI / 180.0;
  return {
    x: Math.cos(angle) * (pointX - originX) - Math.sin(angle) * (pointY - originY) + originX,
    y: Math.sin(angle) * (pointX - originX) + Math.cos(angle) * (pointY - originY) + originY
  };
}

dat.GUI.prototype.removeFolder = function (name) {
  let folder = this.__folders[name];
  if (!folder) {
    return;
  }
  folder.close();
  this.__ul.removeChild(folder.domElement.parentNode);
  delete this.__folders[name];
  this.onResize();
};

class Map {
  constructor() {
    this.currentArea = 0;
    this.areas = [];
    this.areas.push(new Area("Home", [100, 100], [], backgroundColor, areaColor));
    this.spawnArea = 'Home';
    this.spawnPosition = [50, 50];
    this.version = null;
    this.name = null;
    this.creator = null;
  }

  draw() {
    context.save();
    context.translate(-cam.x * scale, -cam.y * scale);
    //context.fillStyle = context.createPattern(background, 'repeat');
    context.fillStyle = "#ffffff";
    context.fillRect(cam.x * scale, cam.y * scale, width, height);
    context.fillStyle = `rgba(${hexToRgb(this.getArea().color)[0]}, ${hexToRgb(this.getArea().color)[1]}, ${hexToRgb(this.getArea().color)[2]}, ${this.getArea().opacity})`;
    context.fillRect(cam.x * scale, cam.y * scale, width, height);
    context.restore();
    this.areas[this.currentArea].draw();
    context.save();
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.lineWidth = 3;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = '38px Rubik, Arial, sans-serif';
    context.strokeStyle = 'black';
    context.strokeText(this.getArea().name, width / 2, 30);
    context.fillStyle = 'white';
    context.fillText(this.getArea().name, width / 2, 30);
    context.font = '20px Rubik, Arial, sans-serif';
    context.strokeStyle = 'black';
    context.strokeText(`${this.getArea().objects.length} Objects`, width / 2, 60);
    context.fillStyle = 'rgb(157, 157, 157)';
    context.fillText(`${this.getArea().objects.length} Objects`, width / 2, 60);
    context.restore();
  }

  addArea() {
    this.areas.splice(this.currentArea + 1, 0, new Area(String(this.areas.length), [300, 300], [], backgroundColor, areaColor));
    this.currentArea++;
  }

  removeArea() {
    this.areas.splice(this.currentArea, 1);
    if (this.currentArea > 0) {
      this.currentArea--;
    }
  }

  switchArea(i) {
    this.currentArea = Number(i);
    this.loadGui();
  }

  getArea() {
    return this.areas[this.currentArea];
  }

  importMap(map) {
    this.areas = [];
    if (map.settings) {
      if (map.settings.spawnArea) {
        this.spawnArea = map.settings.spawnArea;
      }
      if (map.settings.spawnPosition) {
        this.spawnPosition = map.settings.spawnPosition;
      }
      if (map.settings.name) {
        if (map.settings.name != 'overworld') {
          this.name = map.settings.name;
        }
      }
      if (map.settings.creator) {
        if (map.settings.creator != 'Skap.io') {
          this.creator = map.settings.creator;
        }
      }
      // if (map.settings.version == undefined) {
      //   let convert = confirm("this map is in an old version, do you wanna convert it to the current one?")
      //   if (convert) {
      //     map = convertMap(map)
      //   }
      // }
      this.version = map.settings.version
    }
    //editing: 'template' by 'skip dev'
    document.getElementById('editorStatus').textContent = `editing: '${map.settings.name}' by '${map.settings.creator}'`;
    let { maps } = map;
    for (let i in maps) {
      let objects = [];
      for (let j in maps[i].objects) {
        if (maps[i].objects[j].type == 'obstacle') {
          objects.push(new Obstacle(new Vector(maps[i].objects[j].position[0], maps[i].objects[j].position[1]), new Vector(maps[i].objects[j].size[0], maps[i].objects[j].size[1])));
        }
        if (maps[i].objects[j].type == 'teleporter') {
          objects.push(new Teleporter(new Vector(maps[i].objects[j].position[0], maps[i].objects[j].position[1]), maps[i].objects[j].id, new Vector(maps[i].objects[j].size[0], maps[i].objects[j].size[1]), maps[i].objects[j].targetArea, maps[i].objects[j].targetId, maps[i].objects[j].dir));
        }
        if (maps[i].objects[j].type == 'lava') {
          objects.push(new Lava(new Vector(maps[i].objects[j].position[0], maps[i].objects[j].position[1]), new Vector(maps[i].objects[j].size[0], maps[i].objects[j].size[1])));
        }
        if (maps[i].objects[j].type == "rotatingLava") {
          objects.push(new RotatingLava(new Vector(maps[i].objects[j].position[0], maps[i].objects[j].position[1]), new Vector(maps[i].objects[j].size[0], maps[i].objects[j].size[1]), maps[i].objects[j].speed, new Vector(maps[i].objects[j].point[0], maps[i].objects[j].point[1]), maps[i].objects[j].startAngle));
        }
        if (maps[i].objects[j].type == 'ice') {
          objects.push(new Ice(new Vector(maps[i].objects[j].position[0], maps[i].objects[j].position[1]), new Vector(maps[i].objects[j].size[0], maps[i].objects[j].size[1])));
        }
        if (maps[i].objects[j].type == 'slime') {
          objects.push(new Slime(new Vector(maps[i].objects[j].position[0], maps[i].objects[j].position[1]), new Vector(maps[i].objects[j].size[0], maps[i].objects[j].size[1])));
        }
        if (maps[i].objects[j].type == 'spawner') {
          objects.push(new Spawner(new Vector(maps[i].objects[j].position[0], maps[i].objects[j].position[1]), new Vector(maps[i].objects[j].size[0], maps[i].objects[j].size[1]), maps[i].objects[j].entityType, maps[i].objects[j].number, maps[i].objects[j].speed, maps[i].objects[j].radius));
        }
        if (maps[i].objects[j].type == 'text') {
          objects.push(new Text(new Vector(maps[i].objects[j].position[0], maps[i].objects[j].position[1]), maps[i].objects[j].text));
        }
        if (maps[i].objects[j].type == 'button') {
          objects.push(new Button(new Vector(maps[i].objects[j].position[0], maps[i].objects[j].position[1]), new Vector(maps[i].objects[j].size[0], maps[i].objects[j].size[1]), maps[i].objects[j].id, maps[i].objects[j].dir, maps[i].objects[j].time));
        }
        if (maps[i].objects[j].type == 'switch') {
          objects.push(new Switch(new Vector(maps[i].objects[j].position[0], maps[i].objects[j].position[1]), new Vector(maps[i].objects[j].size[0], maps[i].objects[j].size[1]), maps[i].objects[j].id, maps[i].objects[j].dir));
        }
        if (maps[i].objects[j].type == 'door') {
          objects.push(new Door(new Vector(maps[i].objects[j].position[0], maps[i].objects[j].position[1]), new Vector(maps[i].objects[j].size[0], maps[i].objects[j].size[1]), maps[i].objects[j].linkIds));
        }
        if (maps[i].objects[j].type == 'turret') {
          objects.push(new Turret(new Vector(maps[i].objects[j].position[0], maps[i].objects[j].position[1]), new Vector(maps[i].objects[j].regionPosition[0], maps[i].objects[j].regionPosition[1]), new Vector(maps[i].objects[j].regionSize[0], maps[i].objects[j].regionSize[1]), maps[i].objects[j].radius, maps[i].objects[j].shootingSpeed, maps[i].objects[j].overHeat, maps[i].objects[j].speed, maps[i].objects[j].coolDownTime));
        }
        if (maps[i].objects[j].type == 'gravityZone') {
          objects.push(new GravityZone(new Vector(maps[i].objects[j].position[0], maps[i].objects[j].position[1]), new Vector(maps[i].objects[j].size[0], maps[i].objects[j].size[1]), maps[i].objects[j].dir));
        }
        if (maps[i].objects[j].type == 'block') {
          objects.push(new Block(new Vector(maps[i].objects[j].position[0], maps[i].objects[j].position[1]), new Vector(maps[i].objects[j].size[0], maps[i].objects[j].size[1]), maps[i].objects[j].layer, maps[i].objects[j].collide, maps[i].objects[j].color, maps[i].objects[j].opacity));
        }
        if (maps[i].objects[j].type.startsWith('moving')) {
          let pointsToAdd = [];
          for (let k = 0; k < maps[i].objects[j].points.length; k++) {
            pointsToAdd.push({
              pos: new Vector(maps[i].objects[j].points[k].position[0], maps[i].objects[j].points[k].position[1]),
              speed: maps[i].objects[j].points[k].vel
            });
          }
          let toPush = new Moving(pointsToAdd, new Vector(maps[i].objects[j].size[0], maps[i].objects[j].size[1]));
          toPush.type = maps[i].objects[j].type;
          objects.push(toPush);
        }
        if (maps[i].objects[j].type.startsWith('circular')) {
          let toPush = new Circular(new Vector(maps[i].objects[j].position[0] - maps[i].objects[j].radius, maps[i].objects[j].position[1] - maps[i].objects[j].radius), maps[i].objects[j].radius);
          toPush.type = maps[i].objects[j].type;
          objects.push(toPush);
        }
        if (maps[i].objects[j].type == 'reward') {
          objects.push(new Reward(new Vector(maps[i].objects[j].position[0], maps[i].objects[j].position[1]), maps[i].objects[j].reward))
        }
        if (maps[i].objects[j].type == 'hatReward') {
          objects.push(new HatReward(new Vector(maps[i].objects[j].position[0], maps[i].objects[j].position[1]), maps[i].objects[j].reward))
        }
        if (maps[i].objects[j].type == 'timeTrap') {
          objects.push(new TimeTrap(new Vector(maps[i].objects[j].position[0], maps[i].objects[j].position[1]), new Vector(maps[i].objects[j].size[0], maps[i].objects[j].size[1]), maps[i].objects[j].time))
        }
      }
      let bgCol = backgroundColor;
      let arCol = areaColor;
      if (maps[i].backgroundColor) {
        bgCol = maps[i].backgroundColor;
      }
      if (maps[i].areaColor) {
        arCol = maps[i].areaColor;
      }
      this.areas.push(new Area(maps[i].name, maps[i].size, objects, bgCol, arCol));
    }
    world.getArea().loadGui();
  }

  copy() {
    let obj = [];
    for (let i in this.areas) {
      obj.push(this.areas[i].copy());
    }
    return obj;
  }

  getMapJSON() {
    let objectJson = {};
    if (this.name == null) {
      this.name = prompt('name of the map');
    }
    if (this.creator == null) {
      this.creator = prompt('username of the creator of the map');
    }
    objectJson.settings = {
      name: this.name,
      creator: this.creator,
      spawnPosition: this.spawnPosition,
      spawnArea: this.spawnArea,
      version: this.version
    };
    objectJson.maps = [];
    for (let i in this.areas) {
      let objectsss = [];
      for (let j in this.areas[i].objects) {
        if (this.areas[i].objects[j].type == 'obstacle') {
          objectsss.push({
            type: this.areas[i].objects[j].type,
            position: [this.areas[i].objects[j].pos.x, this.areas[i].objects[j].pos.y],
            size: [this.areas[i].objects[j].size.x, this.areas[i].objects[j].size.y],
          });
        }
        if (this.areas[i].objects[j].type == 'lava') {
          objectsss.push({
            type: this.areas[i].objects[j].type,
            position: [this.areas[i].objects[j].pos.x, this.areas[i].objects[j].pos.y],
            size: [this.areas[i].objects[j].size.x, this.areas[i].objects[j].size.y],
          });
        }
        if (this.areas[i].objects[j].type == "rotatingLava") {
          objectsss.push({
            type: this.areas[i].objects[j].type,
            position: [this.areas[i].objects[j].pos.x, this.areas[i].objects[j].pos.y],
            size: [this.areas[i].objects[j].size.x, this.areas[i].objects[j].size.y],
            speed: this.areas[i].objects[j].speed,
            point: [this.areas[i].objects[j].point.x, this.areas[i].objects[j].point.y],
            startAngle: this.areas[i].objects[j].startAngle
          });
        }
        if (this.areas[i].objects[j].type.startsWith("moving")) {
          let exportPoints = [];
          for (let k = 0; k < this.areas[i].objects[j].points.length; k++) {
            exportPoints.push({
              position: [this.areas[i].objects[j].points[k].pos.x, this.areas[i].objects[j].points[k].pos.y],
              vel: this.areas[i].objects[j].points[k].speed
            })
          }
          objectsss.push({
            type: this.areas[i].objects[j].type,
            points: exportPoints,
            size: [this.areas[i].objects[j].size.x, this.areas[i].objects[j].size.y],
          });
        }
        if (this.areas[i].objects[j].type.startsWith('circular')) {
          objectsss.push({
            type: this.areas[i].objects[j].type,
            position: [this.areas[i].objects[j].pos.x + this.areas[i].objects[j].radius, this.areas[i].objects[j].pos.y + this.areas[i].objects[j].radius],
            radius: this.areas[i].objects[j].radius,
          })
        }
        if (this.areas[i].objects[j].type == 'ice') {
          objectsss.push({
            type: this.areas[i].objects[j].type,
            position: [this.areas[i].objects[j].pos.x, this.areas[i].objects[j].pos.y],
            size: [this.areas[i].objects[j].size.x, this.areas[i].objects[j].size.y],
          });
        }
        if (this.areas[i].objects[j].type == 'slime') {
          objectsss.push({
            type: this.areas[i].objects[j].type,
            position: [this.areas[i].objects[j].pos.x, this.areas[i].objects[j].pos.y],
            size: [this.areas[i].objects[j].size.x, this.areas[i].objects[j].size.y],
          });
        }
        if (this.areas[i].objects[j].type == 'teleporter') {
          objectsss.push({
            type: this.areas[i].objects[j].type,
            id: this.areas[i].objects[j].id,
            position: [this.areas[i].objects[j].pos.x, this.areas[i].objects[j].pos.y],
            size: [this.areas[i].objects[j].size.x, this.areas[i].objects[j].size.y],
            targetArea: this.areas[i].objects[j].targetArea,
            targetId: this.areas[i].objects[j].targetId,
            dir: this.areas[i].objects[j].dir,
          });
        }
        if (this.areas[i].objects[j].type == 'spawner') {
          objectsss.push({
            type: this.areas[i].objects[j].type,
            position: [this.areas[i].objects[j].pos.x, this.areas[i].objects[j].pos.y],
            size: [this.areas[i].objects[j].size.x, this.areas[i].objects[j].size.y],
            entityType: this.areas[i].objects[j].entityType,
            number: this.areas[i].objects[j].number,
            speed: this.areas[i].objects[j].speed,
            radius: this.areas[i].objects[j].radius,
          });
        }
        if (this.areas[i].objects[j].type == 'text') {
          objectsss.push({
            type: this.areas[i].objects[j].type,
            position: [this.areas[i].objects[j].pos.x, this.areas[i].objects[j].pos.y],
            text: this.areas[i].objects[j].text,
          });
        }
        if (this.areas[i].objects[j].type == 'button') {
          objectsss.push({
            type: this.areas[i].objects[j].type,
            position: [this.areas[i].objects[j].pos.x, this.areas[i].objects[j].pos.y],
            size: [this.areas[i].objects[j].size.x, this.areas[i].objects[j].size.y],
            id: this.areas[i].objects[j].id,
            dir: this.areas[i].objects[j].dir,
            time: this.areas[i].objects[j].time,
          });
        }
        if (this.areas[i].objects[j].type == 'switch') {
          objectsss.push({
            type: this.areas[i].objects[j].type,
            position: [this.areas[i].objects[j].pos.x, this.areas[i].objects[j].pos.y],
            size: [this.areas[i].objects[j].size.x, this.areas[i].objects[j].size.y],
            id: this.areas[i].objects[j].id,
            dir: this.areas[i].objects[j].dir,
          });
        }
        if (this.areas[i].objects[j].type == 'door') {
          objectsss.push({
            type: this.areas[i].objects[j].type,
            position: [this.areas[i].objects[j].pos.x, this.areas[i].objects[j].pos.y],
            size: [this.areas[i].objects[j].size.x, this.areas[i].objects[j].size.y],
            linkIds: this.areas[i].objects[j].linkIds.split(',').map(Number),
          });
        }
        if (this.areas[i].objects[j].type == 'turret') {
          objectsss.push({
            type: this.areas[i].objects[j].type,
            position: [this.areas[i].objects[j].pos.x, this.areas[i].objects[j].pos.y],
            regionPosition: [this.areas[i].objects[j].regionPos.x, this.areas[i].objects[j].regionPos.y],
            regionSize: [this.areas[i].objects[j].regionSize.x, this.areas[i].objects[j].regionSize.y],
            radius: this.areas[i].objects[j].radius,
            shootingSpeed: this.areas[i].objects[j].shootingSpeed,
            overHeat: this.areas[i].objects[j].overHeat,
            speed: this.areas[i].objects[j].speed,
            coolDownTime: this.areas[i].objects[j].coolDownTime,
          });
        }
        if (this.areas[i].objects[j].type == 'gravityZone') {
          objectsss.push({
            type: this.areas[i].objects[j].type,
            position: [this.areas[i].objects[j].pos.x, this.areas[i].objects[j].pos.y],
            size: [this.areas[i].objects[j].size.x, this.areas[i].objects[j].size.y],
            dir: this.areas[i].objects[j].dir,
          });
        }
        if (this.areas[i].objects[j].type == 'block') {
          objectsss.push({
            type: this.areas[i].objects[j].type,
            position: [this.areas[i].objects[j].pos.x, this.areas[i].objects[j].pos.y],
            size: [this.areas[i].objects[j].size.x, this.areas[i].objects[j].size.y],
            layer: this.areas[i].objects[j].layer,
            collide: this.areas[i].objects[j].collide,
            color: hexToRgb(this.areas[i].objects[j].color),
            opacity: this.areas[i].objects[j].opacity,
          });
        }
        if (this.areas[i].objects[j].type == 'reward' || this.areas[i].objects[j].type == 'hatReward') {
          objectsss.push({
            type: this.areas[i].objects[j].type,
            position: [this.areas[i].objects[j].pos.x, this.areas[i].objects[j].pos.y],
            reward: this.areas[i].objects[j].reward
          });
        }
        if (this.areas[i].objects[j].type == 'timeTrap') {
          objectsss.push({
            type: this.areas[i].objects[j].type,
            position: [this.areas[i].objects[j].pos.x, this.areas[i].objects[j].pos.y],
            size: [this.areas[i].objects[j].size.x, this.areas[i].objects[j].size.y],
            time: this.areas[i].objects[j].time,
          });
        }
      }
      let objjj = {
        name: this.areas[i].name,
        size: [this.areas[i].size.x, this.areas[i].size.y],
        objects: objectsss,
      };
      let colll = hexToRgb(this.areas[i].color);
      if (colll[0] != backgroundColor[0]
        || colll[1] != backgroundColor[1]
        || colll[2] != backgroundColor[2]
        || this.areas[i].opacity != backgroundColor[3]) {
        objjj.backgroundColor = [colll[0], colll[1], colll[2], this.areas[i].opacity];
      }
      colll = hexToRgb(this.areas[i].areaColor);
      if (colll[0] != areaColor[0]
        || colll[1] != areaColor[1]
        || colll[2] != areaColor[2]) {
        objjj.areaColor = [colll[0], colll[1], colll[2]];
      }
      objectJson.maps.push(objjj);
    }

    return objectJson;
  }

  exportMap() {
    let objectJson = this.getMapJSON();
    let element = document.createElement('a');
    element.setAttribute('href', `data:text/plain;charset=utf-8,${encodeURIComponent(JSON.stringify(objectJson))}`);
    element.setAttribute('download', `${objectJson.settings.name}.json`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }
}
class Area {
  constructor(name, size, objects, color, areaCol) {
    this.name = name;
    this.size = {
      x: size[0],
      y: size[1],
    };
    this.color = rgbToHex(Math.round(color[0]), Math.round(color[1]), Math.round(color[2]));
    this.opacity = color[3];
    this.areaColor = rgbToHex(Math.round(areaCol[0]), Math.round(areaCol[1]), Math.round(areaCol[2]));
    this.objects = objects;
    this.reached = false;
  }

  loadGui() {
    gui.removeFolder('Area Properties');
    gui.removeFolder('Object Properties');
    let areaProp = gui.addFolder('Area Properties');
    areaProp.add(this, 'name');
    areaProp.addColor(this, 'color');
    areaProp.add(this, 'opacity').min(0).max(1);
    areaProp.addColor(this, 'areaColor');
    let areaSize = areaProp.addFolder('Size');
    areaSize.add(this.size, 'x').min(1).step(1);
    areaSize.add(this.size, 'y').min(1).step(1);
    areaProp.open();
    areaSize.open();
  }

  loadGuiObject(i) {
    gui.removeFolder('Object Properties');
    let objectProp = gui.addFolder('Object Properties');
    this.objects[i].customGui(objectProp);
    objectProp.open();
  }

  draw() {
    context.fillStyle = this.areaColor;
    context.fillRect(Math.round(Math.round(width / 2) + (-cam.x) * scale), Math.round(Math.round(height / 2) + (-cam.y) * scale), Math.round(this.size.x * scale), Math.round(this.size.y * scale));

    // obstacles
    context.save();
    context.translate(Math.round(-cam.x * scale), Math.round(-cam.y * scale));
    let obstacles = this.objects.filter((x) => x.type == 'obstacle');
    //let backgroundPattern = context.createPattern(background, 'repeat');
    for (var i in obstacles) {
      //context.fillStyle = backgroundPattern;
      //context.fillRect(Math.round(cam.x * scale + Math.round(width / 2) + ((obstacles[i].pos.x) - cam.x) * scale), Math.round(cam.y * scale + Math.round(height / 2) + ((obstacles[i].pos.y) - cam.y) * scale), Math.round(obstacles[i].size.x * scale), Math.round(obstacles[i].size.y * scale));
      context.fillStyle = `rgba(${hexToRgb(this.color)[0]}, ${hexToRgb(this.color)[1]}, ${hexToRgb(this.color)[2]}, ${this.opacity})`;
      context.fillRect(Math.round(cam.x * scale + Math.round(width / 2) + ((obstacles[i].pos.x) - cam.x) * scale), Math.round(cam.y * scale + Math.round(height / 2) + ((obstacles[i].pos.y) - cam.y) * scale), Math.round(obstacles[i].size.x * scale), Math.round(obstacles[i].size.y * scale));
    }
    context.restore();

    // teleporters
    let teleporters = this.objects.filter((x) => x.type == 'teleporter');
    for (var i in teleporters) {
      context.fillRect(Math.round(Math.round(width / 2) + ((teleporters[i].pos.x) - cam.x) * scale), Math.round(Math.round(height / 2) + ((teleporters[i].pos.y) - cam.y) * scale), Math.round(teleporters[i].size.x * scale), Math.round(teleporters[i].size.y * scale));
      let a = 1;
      let b = 1;
      if (teleporters[i].dir == 1) {
        a = 0;
      }
      if (teleporters[i].dir == 2) {
        b = 0;
      }
      if (teleporters[i].dir == 3) {
        a = 2;
      }
      if (teleporters[i].dir == 0) {
        b = 2;
      }
      let gradient = context.createLinearGradient(
        Math.round(Math.round(width / 2) + ((teleporters[i].pos.x + (teleporters[i].size.x / 2 * a)) - cam.x) * scale),
        Math.round(Math.round(height / 2) + ((teleporters[i].pos.y + (teleporters[i].size.y / 2 * b)) - cam.y) * scale),
        Math.round(Math.round(width / 2) + ((teleporters[i].pos.x + (teleporters[i].size.x / 2 * (2 - a))) - cam.x) * scale),
        Math.round(Math.round(height / 2) + ((teleporters[i].pos.y + (teleporters[i].size.y / 2 * (2 - b))) - cam.y) * scale),
      );
      gradient.addColorStop(0, `rgba(${240 + (hexToRgb(this.color)[0] - 240) * this.opacity}, ${240 + (hexToRgb(this.color)[1] - 240) * this.opacity}, ${240 + (hexToRgb(this.color)[2] - 240) * this.opacity}, 1)`);
      gradient.addColorStop(1, `rgba(${hexToRgb(this.areaColor)[0]}, ${hexToRgb(this.areaColor)[1]}, ${hexToRgb(this.areaColor)[2]}, 1)`);
      context.fillStyle = gradient;
      context.fillRect(Math.round(Math.round(width / 2) + ((teleporters[i].pos.x) - cam.x) * scale), Math.round(Math.round(height / 2) + ((teleporters[i].pos.y) - cam.y) * scale), Math.round(teleporters[i].size.x * scale), Math.round(teleporters[i].size.y * scale));
    }

    let spawners = this.objects.filter((x) => x.type == 'spawner');
    for (var i in spawners) {
      context.fillStyle = 'rgba(0, 0, 100, 0.2)';
      context.fillRect(Math.round(Math.round(width / 2) + ((spawners[i].pos.x) - cam.x) * scale), Math.round(Math.round(height / 2) + ((spawners[i].pos.y) - cam.y) * scale), Math.round(spawners[i].size.x * scale), Math.round(spawners[i].size.y * scale));

      let tex = enemyTextures[spawners[i].entityType];
      if (tex instanceof Array) tex = tex[0];
      if (!(spawners[i].entityType in enemyTextures)) tex = enemyTextures.none;

      if (["snek", "daddySnek", "babySnek"].includes(spawners[i].entityType)) tex = enemyTextures.snekHead;

      let size = Math.min(spawners[i].size.x, Math.min(spawners[i].size.y, 2 * spawners[i].radius));

      context.drawImage(
        tex,
        Math.round(Math.round(width / 2) + ((spawners[i].pos.x + spawners[i].size.x / 2 - size / 2) - cam.x) * scale),
        Math.round(Math.round(height / 2) + ((spawners[i].pos.y + spawners[i].size.y / 2 - size / 2) - cam.y) * scale),
        Math.round(scale * (["snek", "daddySnek", "babySnek"].includes(spawners[i].entityType) ? 1.5 * size : size)),
        Math.round(scale * size)
      );
    }

    // lava
    let lavas = this.objects.filter((x) => x.type == 'lava');
    for (var i in lavas) {
      context.fillStyle = '#e23e2b';
      context.fillRect(Math.round(Math.round(width / 2) + ((lavas[i].pos.x) - cam.x) * scale), Math.round(Math.round(height / 2) + ((lavas[i].pos.y) - cam.y) * scale), Math.round(lavas[i].size.x * scale), Math.round(lavas[i].size.y * scale));
    }
    frames += 1 / 60;

    var rotatingLavas = this.objects.filter(function (x) { return x.type == "rotatingLava" });

    for (var i in rotatingLavas) {
      context.fillStyle = "#e23e2b40";
      context.fillRect(Math.round(Math.round(width / 2) + (rotatingLavas[i].pos.x - cam.x) * scale), Math.round(Math.round(height / 2) + (rotatingLavas[i].pos.y - cam.y) * scale), Math.round(rotatingLavas[i].size.x * scale), Math.round(rotatingLavas[i].size.y * scale));

      let posX = rotatingLavas[i].pos.x;
      let posY = rotatingLavas[i].pos.y;
      let centerX = posX + rotatingLavas[i].size.x / 2;
      let centerY = posY + rotatingLavas[i].size.y / 2;
      let pointX = rotatingLavas[i].point.x;
      let pointY = rotatingLavas[i].point.y;

      context.save();
      let startLocation = rotatePoint(centerX, centerY, pointX, pointY, rotatingLavas[i].startAngle);
      context.fillStyle = "#e23e2b";
      context.translate(Math.round(Math.round(width / 2) + (startLocation.x - cam.x) * scale), Math.round(Math.round(height / 2) + (startLocation.y - cam.y) * scale));
      context.rotate(rotatingLavas[i].startAngle * Math.PI / 180)
      context.fillRect(-rotatingLavas[i].size.x / 2 * scale, -rotatingLavas[i].size.y / 2 * scale, rotatingLavas[i].size.x * scale, rotatingLavas[i].size.y * scale)
      context.restore();

      context.save();
      startLocation = rotatePoint(centerX, centerY, pointX, pointY, frames * rotatingLavas[i].speed + rotatingLavas[i].startAngle);
      context.fillStyle = "rgb(0, 0, 0, 0.5)";
      context.translate(Math.round(Math.round(width / 2) + (startLocation.x - cam.x) * scale), Math.round(Math.round(height / 2) + (startLocation.y - cam.y) * scale));
      context.rotate(frames * rotatingLavas[i].speed * Math.PI / 180 + rotatingLavas[i].startAngle * Math.PI / 180)
      context.fillRect(-rotatingLavas[i].size.x / 2 * scale, -rotatingLavas[i].size.y / 2 * scale, rotatingLavas[i].size.x * scale, rotatingLavas[i].size.y * scale)
      context.restore();


      context.beginPath();
      context.fillStyle = "rgba(0, 0, 0, 0.5)"
      context.arc(Math.round(Math.round(width / 2) + (rotatingLavas[i].point.x - cam.x) * scale), Math.round(Math.round(height / 2) + (rotatingLavas[i].point.y - cam.y) * scale), Math.round(scale), 0, Math.PI * 2);
      context.fill();
    }

    let moving = this.objects.filter((x) => x.type.startsWith("moving"));

    for (let i in moving) {
      if (moving[i].type == "movingLava") {
        context.fillStyle = "#e23e2b40";
      }
      else if (moving[i].type == "movingSlime") {
        context.fillStyle = "rgba(0,202,0,.4)";
      }
      else if (moving[i].type == "movingIce") {
        context.fillStyle = '#41d1d940';
      }
      else {
        context.fillStyle = `rgba(${hexToRgb(this.color)[0]}, ${hexToRgb(this.color)[1]}, ${hexToRgb(this.color)[2]},.4)`;
      }
      context.fillRect(Math.round(Math.round(width / 2) + ((moving[i].points[0].pos.x - moving[i].size.x / 2) - cam.x) * scale), Math.round(Math.round(height / 2) + ((moving[i].points[0].pos.y - moving[i].size.y / 2) - cam.y) * scale), Math.round(moving[i].size.x * scale), Math.round(moving[i].size.y * scale));
      let newPos = moving[i].simulate(frames);
      if (moving[i].type == "movingLava") {
        context.fillStyle = "#e23e2b";
      }
      else if (moving[i].type == "movingSlime") {
        context.fillStyle = "rgb(0,202,0)";
      }
      else if (moving[i].type == "movingIce") {
        context.fillStyle = '#41d1d9';
      }
      else {
        context.fillStyle = `rgb(${hexToRgb(this.color)[0]}, ${hexToRgb(this.color)[1]}, ${hexToRgb(this.color)[2]})`;
      }
      context.fillRect(Math.round(Math.round(width / 2) + ((newPos.x - moving[i].size.x / 2) - cam.x) * scale), Math.round(Math.round(height / 2) + ((newPos.y - moving[i].size.y / 2) - cam.y) * scale), Math.round(moving[i].size.x * scale), Math.round(moving[i].size.y * scale));
      context.lineWidth = 3;
      context.strokeStyle = "black";
      context.moveTo(Math.round(Math.round(width / 2) + ((moving[i].points[0].pos.x) - cam.x) * scale), Math.round(Math.round(height / 2) + ((moving[i].points[0].pos.y) - cam.y) * scale));
      for (let j = 1; j < moving[i].points.length; j++) {
        context.lineTo(Math.round(Math.round(width / 2) + ((moving[i].points[j].pos.x) - cam.x) * scale), Math.round(Math.round(height / 2) + ((moving[i].points[j].pos.y) - cam.y) * scale));
      }
      context.lineTo(Math.round(Math.round(width / 2) + ((moving[i].points[0].pos.x) - cam.x) * scale), Math.round(Math.round(height / 2) + ((moving[i].points[0].pos.y) - cam.y) * scale));
      context.stroke();
      context.beginPath();
      context.fillStyle = "black";
      for (let j = 0; j < moving[i].points.length; j++) {
        context.moveTo(Math.round(Math.round(width / 2) + ((moving[i].points[j].pos.x) - cam.x) * scale), Math.round(Math.round(height / 2) + ((moving[i].points[j].pos.y) - cam.y) * scale));
        context.arc(Math.round(Math.round(width / 2) + ((moving[i].points[j].pos.x) - cam.x) * scale), Math.round(Math.round(height / 2) + ((moving[i].points[j].pos.y) - cam.y) * scale), 3 * scale, 0, Math.PI * 2);
      }
      context.fill();
    }

    let circular = this.objects.filter((x) => x.type.startsWith('circular'));
    for (let i in circular) {
      if (circular[i].type == "circularLava") {
        context.fillStyle = "#e23e2b";
      }
      else if (circular[i].type == "circularSlime") {
        context.fillStyle = "rgb(0,202,0)";
      }
      else if (circular[i].type == "circularIce") {
        context.fillStyle = '#41d1d9';
      }
      else {
        context.fillStyle = `rgba(${hexToRgb(this.color)[0]}, ${hexToRgb(this.color)[1]}, ${hexToRgb(this.color)[2]}, ${this.opacity})`;
      }
      context.beginPath();
      context.arc(Math.round(Math.round(width / 2) + ((circular[i].pos.x + circular[i].radius) - cam.x) * scale), Math.round(Math.round(height / 2) + ((circular[i].pos.y + circular[i].radius) - cam.y) * scale), Math.round(circular[i].radius * scale), 0, Math.PI * 2);
      context.fill();
    }

    let icies = this.objects.filter((x) => x.type == 'ice');
    for (var i in icies) {
      context.fillStyle = '#41d1d9';
      context.fillRect(Math.round(Math.round(width / 2) + ((icies[i].pos.x) - cam.x) * scale), Math.round(Math.round(height / 2) + ((icies[i].pos.y) - cam.y) * scale), Math.round(icies[i].size.x * scale), Math.round(icies[i].size.y * scale));
    }
    let slimes = this.objects.filter((x) => x.type == 'slime');
    for (var i in slimes) {
      context.fillStyle = 'rgb(0,202,0)';
      context.fillRect(Math.round(Math.round(width / 2) + ((slimes[i].pos.x) - cam.x) * scale), Math.round(Math.round(height / 2) + ((slimes[i].pos.y) - cam.y) * scale), Math.round(slimes[i].size.x * scale), Math.round(slimes[i].size.y * scale));
    }
    let buttons = this.objects.filter((x) => x.type == 'button');
    for (var i in buttons) {
      context.beginPath();
      context.fillStyle = '#494949';
      if (buttons[i].dir == 0) {
        context.moveTo(Math.round(width / 2 + ((buttons[i].pos.x) - cam.x + 2) * scale), Math.round(height / 2 + ((buttons[i].pos.y) - cam.y) * scale));
        context.lineTo(Math.round(width / 2 + ((buttons[i].pos.x) - cam.x - 2) * scale) + Math.round(buttons[i].size.x * scale), Math.round(height / 2 + ((buttons[i].pos.y) - cam.y) * scale));
        context.lineTo(Math.round(width / 2 + ((buttons[i].pos.x) - cam.x) * scale) + Math.round(buttons[i].size.x * scale), Math.round(height / 2 + ((buttons[i].pos.y) - cam.y) * scale) + Math.round(buttons[i].size.y * scale));
        context.lineTo(Math.round(width / 2 + ((buttons[i].pos.x) - cam.x) * scale), Math.round(height / 2 + ((buttons[i].pos.y) - cam.y) * scale) + Math.round(buttons[i].size.y * scale));
      }
      if (buttons[i].dir == 1) {
        context.moveTo(Math.round(width / 2 + ((buttons[i].pos.x) - cam.x) * scale), Math.round(height / 2 + ((buttons[i].pos.y) - cam.y) * scale));
        context.lineTo(Math.round(width / 2 + ((buttons[i].pos.x) - cam.x) * scale) + Math.round(buttons[i].size.x * scale), Math.round(height / 2 + ((buttons[i].pos.y) - cam.y + 2) * scale));
        context.lineTo(Math.round(width / 2 + ((buttons[i].pos.x) - cam.x) * scale) + Math.round(buttons[i].size.x * scale), Math.round(height / 2 + ((buttons[i].pos.y) - cam.y - 2) * scale) + Math.round(buttons[i].size.y * scale));
        context.lineTo(Math.round(width / 2 + ((buttons[i].pos.x) - cam.x) * scale), Math.round(height / 2 + ((buttons[i].pos.y) - cam.y) * scale) + Math.round(buttons[i].size.y * scale));
      }
      if (buttons[i].dir == 2) {
        context.moveTo(Math.round(width / 2 + ((buttons[i].pos.x) - cam.x) * scale), Math.round(height / 2 + ((buttons[i].pos.y) - cam.y) * scale));
        context.lineTo(Math.round(width / 2 + ((buttons[i].pos.x) - cam.x) * scale) + Math.round(buttons[i].size.x * scale), Math.round(height / 2 + ((buttons[i].pos.y) - cam.y) * scale));
        context.lineTo(Math.round(width / 2 + ((buttons[i].pos.x) - cam.x - 2) * scale) + Math.round(buttons[i].size.x * scale), Math.round(height / 2 + ((buttons[i].pos.y) - cam.y) * scale) + Math.round(buttons[i].size.y * scale));
        context.lineTo(Math.round(width / 2 + ((buttons[i].pos.x) - cam.x + 2) * scale), Math.round(height / 2 + ((buttons[i].pos.y) - cam.y) * scale) + Math.round(buttons[i].size.y * scale));
      }
      if (buttons[i].dir == 3) {
        context.moveTo(Math.round(width / 2 + ((buttons[i].pos.x) - cam.x) * scale), Math.round(height / 2 + ((buttons[i].pos.y) - cam.y + 2) * scale));
        context.lineTo(Math.round(width / 2 + ((buttons[i].pos.x) - cam.x) * scale) + Math.round(buttons[i].size.x * scale), Math.round(height / 2 + ((buttons[i].pos.y) - cam.y) * scale));
        context.lineTo(Math.round(width / 2 + ((buttons[i].pos.x) - cam.x) * scale) + Math.round(buttons[i].size.x * scale), Math.round(height / 2 + ((buttons[i].pos.y) - cam.y) * scale) + Math.round(buttons[i].size.y * scale));
        context.lineTo(Math.round(width / 2 + ((buttons[i].pos.x) - cam.x) * scale), Math.round(height / 2 + ((buttons[i].pos.y) - cam.y - 2) * scale) + Math.round(buttons[i].size.y * scale));
      }
      context.fill();
      context.closePath();
      // context.fillRect(Math.round(width / 2 + ((buttons[i].pos.x) - cam.x) * scale), Math.round(height / 2 + ((buttons[i].pos.y) - cam.y) * scale), Math.round(buttons[i].size.x * scale), Math.round(buttons[i].size.y * scale));
    }
    let switches = this.objects.filter((x) => x.type == 'switch');
    for (var i in switches) {
      context.beginPath();
      context.fillStyle = '#494949';
      let high = 0;
      let high2 = 3;
      if (switches[i].switch) {
        high = 3;
        high2 = 0;
      }
      if (switches[i].dir == 0) {
        context.moveTo(Math.round(width / 2 + ((switches[i].pos.x) - cam.x) * scale), Math.round(height / 2 + ((switches[i].pos.y) - cam.y - high) * scale));
        context.lineTo(Math.round(width / 2 + ((switches[i].pos.x) - cam.x) * scale) + Math.round(switches[i].size.x * scale), Math.round(height / 2 + ((switches[i].pos.y) - cam.y - high2) * scale));
        context.lineTo(Math.round(width / 2 + ((switches[i].pos.x) - cam.x) * scale) + Math.round(switches[i].size.x * scale), Math.round(height / 2 + ((switches[i].pos.y) - cam.y) * scale) + Math.round(switches[i].size.y * scale));
        context.lineTo(Math.round(width / 2 + ((switches[i].pos.x) - cam.x) * scale), Math.round(height / 2 + ((switches[i].pos.y) - cam.y) * scale) + Math.round(switches[i].size.y * scale));
      }
      if (switches[i].dir == 1) {
        context.moveTo(Math.round(width / 2 + ((switches[i].pos.x) - cam.x) * scale), Math.round(height / 2 + ((switches[i].pos.y) - cam.y) * scale));
        context.lineTo(Math.round(width / 2 + ((switches[i].pos.x) - cam.x + high) * scale) + Math.round(switches[i].size.x * scale), Math.round(height / 2 + ((switches[i].pos.y) - cam.y) * scale));
        context.lineTo(Math.round(width / 2 + ((switches[i].pos.x) - cam.x + high2) * scale) + Math.round(switches[i].size.x * scale), Math.round(height / 2 + ((switches[i].pos.y) - cam.y) * scale) + Math.round(switches[i].size.y * scale));
        context.lineTo(Math.round(width / 2 + ((switches[i].pos.x) - cam.x) * scale), Math.round(height / 2 + ((switches[i].pos.y) - cam.y) * scale) + Math.round(switches[i].size.y * scale));
      }
      if (switches[i].dir == 2) {
        context.moveTo(Math.round(width / 2 + ((switches[i].pos.x) - cam.x) * scale), Math.round(height / 2 + ((switches[i].pos.y) - cam.y) * scale));
        context.lineTo(Math.round(width / 2 + ((switches[i].pos.x) - cam.x) * scale) + Math.round(switches[i].size.x * scale), Math.round(height / 2 + ((switches[i].pos.y) - cam.y) * scale));
        context.lineTo(Math.round(width / 2 + ((switches[i].pos.x) - cam.x) * scale) + Math.round(switches[i].size.x * scale), Math.round(height / 2 + ((switches[i].pos.y) - cam.y + high) * scale) + Math.round(switches[i].size.y * scale));
        context.lineTo(Math.round(width / 2 + ((switches[i].pos.x) - cam.x) * scale), Math.round(height / 2 + ((switches[i].pos.y) - cam.y + high2) * scale) + Math.round(switches[i].size.y * scale));
      }
      if (switches[i].dir == 3) {
        context.moveTo(Math.round(width / 2 + ((switches[i].pos.x) - cam.x - high) * scale), Math.round(height / 2 + ((switches[i].pos.y) - cam.y) * scale));
        context.lineTo(Math.round(width / 2 + ((switches[i].pos.x) - cam.x) * scale) + Math.round(switches[i].size.x * scale), Math.round(height / 2 + ((switches[i].pos.y) - cam.y) * scale));
        context.lineTo(Math.round(width / 2 + ((switches[i].pos.x) - cam.x) * scale) + Math.round(switches[i].size.x * scale), Math.round(height / 2 + ((switches[i].pos.y) - cam.y) * scale) + Math.round(switches[i].size.y * scale));
        context.lineTo(Math.round(width / 2 + ((switches[i].pos.x) - cam.x - high2) * scale), Math.round(height / 2 + ((switches[i].pos.y) - cam.y) * scale) + Math.round(switches[i].size.y * scale));
      }
      context.fill();
      context.closePath();
      // context.fillRect(Math.round(width / 2 + ((switches[i].pos.x) - cam.x) * scale), Math.round(height / 2 + ((switches[i].pos.y) - cam.y) * scale), Math.round(switches[i].size.x * scale), Math.round(switches[i].size.y * scale));
    }
    let doors = this.objects.filter((x) => x.type == 'door');
    for (var i in doors) {
      if (!doors[i].opened) {
        context.fillStyle = '#525252';
        context.fillRect(Math.round(width / 2 + ((doors[i].pos.x) - cam.x) * scale), Math.round(height / 2 + ((doors[i].pos.y) - cam.y) * scale), Math.round(doors[i].size.x * scale), Math.round(doors[i].size.y * scale));
        context.fillStyle = '#8c8c8c';
        context.fillRect(Math.round(width / 2 + ((doors[i].pos.x) - cam.x + 1) * scale), Math.round(height / 2 + ((doors[i].pos.y) - cam.y + 1) * scale), Math.round((doors[i].size.x - 2) * scale), Math.round((doors[i].size.y - 2) * scale));
      } else {
        context.strokeStyle = '#9d9d9d';
        context.lineWidth = 1 * scale;
        context.strokeRect(Math.round(width / 2 + ((doors[i].pos.x) - cam.x + 0.5) * scale), Math.round(height / 2 + ((doors[i].pos.y) - cam.y + 0.5) * scale), Math.round((doors[i].size.x - 1) * scale), Math.round((doors[i].size.y - 1) * scale));
      }
    }
    context.save();
    context.lineWidth = scale;
    context.setLineDash([25 * scale / 6, 40 * scale / 6]);
    context.lineDashOffset = timee * scale / 6 / 20;
    context.lineCap = 'round';
    for (var i in doors) {
      for (let j in doors[i].linkIds.split(',')) {
        let idd = Number(doors[i].linkIds.split(',')[j]);
        let neg = false;
        if (idd.toString()[0] == '-') {
          idd = idd.toString().substring(1);
          neg = true;
        }
        for (var k in buttons) {
          if (buttons[k].id == idd) {
            if (buttons[k].pressed ^ neg) {
              context.strokeStyle = 'rgba(147, 142, 23, 0.5)';
            } else {
              context.strokeStyle = 'rgba(96, 98, 80, 0.5)';
            }
            context.beginPath();
            context.moveTo(Math.round(width / 2 + ((doors[i].pos.x) - cam.x) * scale) + Math.round(doors[i].size.x * scale) / 2, Math.round(height / 2 + ((doors[i].pos.y) - cam.y) * scale) + Math.round(doors[i].size.y * scale) / 2);
            context.lineTo(Math.round(width / 2 + ((buttons[k].pos.x) - cam.x) * scale) + Math.round(buttons[k].size.x * scale) / 2, Math.round(height / 2 + ((buttons[k].pos.y) - cam.y) * scale) + Math.round(buttons[k].size.y * scale) / 2);
            context.stroke();
          }
        }
        for (var k in switches) {
          if (switches[k].id == idd) {
            if (switches[k].switch ^ neg) {
              context.strokeStyle = 'rgba(147, 142, 23, 0.5)';
            } else {
              context.strokeStyle = 'rgba(96, 98, 80, 0.5)';
            }
            context.beginPath();
            context.moveTo(Math.round(width / 2 + ((doors[i].pos.x) - cam.x) * scale) + Math.round(doors[i].size.x * scale) / 2, Math.round(height / 2 + ((doors[i].pos.y) - cam.y) * scale) + Math.round(doors[i].size.y * scale) / 2);
            context.lineTo(Math.round(width / 2 + ((switches[k].pos.x) - cam.x) * scale) + Math.round(switches[k].size.x * scale) / 2, Math.round(height / 2 + ((switches[k].pos.y) - cam.y) * scale) + Math.round(switches[k].size.y * scale) / 2);
            context.stroke();
          }
        }
      }
    }
    context.restore();
    let turrets = this.objects.filter((x) => x.type == 'turret');
    for (var i in turrets) {
      context.fillStyle = '#626262';
      context.fillRect(Math.round(width / 2 + ((turrets[i].pos.x - 3) - cam.x) * scale), Math.round(height / 2 + ((turrets[i].pos.y - 3) - cam.y) * scale), Math.round(6 * scale), Math.round(6 * scale));
    }
    for (var i in selected) {
      if (this.objects[selected[i]].type == 'turret') {
        context.fillStyle = 'rgba(180, 35, 35, 0.31)';
        context.fillRect(Math.round(width / 2 + ((this.objects[selected[i]].regionPos.x) - cam.x) * scale), Math.round(height / 2 + ((this.objects[selected[i]].regionPos.y) - cam.y) * scale), Math.round(this.objects[selected[i]].regionSize.x * scale), Math.round(this.objects[selected[i]].regionSize.y * scale));
      }
    }
    let blocks = this.objects.filter((x) => x.type == 'block');
    for (var i in blocks) {
      if (blocks[i].layer == 0) {
        context.fillStyle = `rgb(${hexToRgb(blocks[i].color)[0]},${hexToRgb(blocks[i].color)[1]},${hexToRgb(blocks[i].color)[2]},${blocks[i].opacity})`;
        context.fillRect(Math.round(width / 2 + ((blocks[i].pos.x) - cam.x) * scale), Math.round(height / 2 + ((blocks[i].pos.y) - cam.y) * scale), Math.round(blocks[i].size.x * scale), Math.round(blocks[i].size.y * scale));
      }
    }
    for (var i in blocks) {
      if (blocks[i].layer == 1) {
        context.fillStyle = `rgb(${hexToRgb(blocks[i].color)[0]},${hexToRgb(blocks[i].color)[1]},${hexToRgb(blocks[i].color)[2]},${blocks[i].opacity})`;
        context.fillRect(Math.round(width / 2 + ((blocks[i].pos.x) - cam.x) * scale), Math.round(height / 2 + ((blocks[i].pos.y) - cam.y) * scale), Math.round(blocks[i].size.x * scale), Math.round(blocks[i].size.y * scale));
      }
    }
    let gravityZones = this.objects.filter((x) => x.type == 'gravityZone');
    context.save();
    context.setLineDash([5 * scale / 6, 20 * scale / 6]);
    context.lineCap = 'round';
    context.lineWidth = 3 * scale / 6;
    for (var i in gravityZones) {
      let r = 0;
      let g = 0;
      let b = 0;
      if (gravityZones[i].dir == 1) {
        r = 255;
      }
      if (gravityZones[i].dir == 2) {
        b = 255;
      }
      if (gravityZones[i].dir == 3) {
        g = 255;
      }
      context.fillStyle = `rgba(${r},${g},${b},0.06)`;
      context.strokeStyle = `rgb(${r},${g},${b})`;
      context.fillRect(Math.round(width / 2 + ((gravityZones[i].pos.x) - cam.x) * scale), Math.round(height / 2 + ((gravityZones[i].pos.y) - cam.y) * scale), Math.round(gravityZones[i].size.x * scale), Math.round(gravityZones[i].size.y * scale));
      context.strokeRect(width / 2 + ((gravityZones[i].pos.x) - cam.x) * scale, height / 2 + ((gravityZones[i].pos.y) - cam.y) * scale, gravityZones[i].size.x * scale, gravityZones[i].size.y * scale);
    }
    let timeTraps = this.objects.filter((x) => x.type == 'timeTrap');
    for (let i in timeTraps) {
      context.fillStyle = 'rgba(255, 0, 0, 0.5)';
      context.fillRect(Math.round(width / 2 + ((timeTraps[i].pos.x) - cam.x) * scale), Math.round(height / 2 + ((timeTraps[i].pos.y) - cam.y) * scale), Math.round(timeTraps[i].size.x * scale), Math.round(timeTraps[i].size.y * scale));
    }
    context.restore();
    let texts = this.objects.filter((x) => x.type == 'text');
    for (var i in texts) {
      const basePx = 5 * scale;
      const cx = Math.round(width / 2 + (texts[i].pos.x - cam.x) * scale);
      const cy = Math.round(height / 2 + (texts[i].pos.y - cam.y) * scale);
      const segments = parseTextSegments(texts[i].text);
      context.save();
      context.textBaseline = 'middle';
      context.textAlign = 'left';
      let totalWidth = 0;
      for (const seg of segments) {
        context.font = buildTextFont(basePx, seg);
        totalWidth += context.measureText(seg.text).width;
      }
      let curX = cx - totalWidth / 2;
      for (const seg of segments) {
        context.font = buildTextFont(basePx, seg);
        const px = Math.max(1, Math.round(basePx * seg.sizeMul));
        context.lineWidth = Math.round(scale) * (px / basePx);
        if (seg.color === '#2e2e2e') {
          context.strokeStyle = '#ffffff';
          context.lineWidth = 2;
        } else {
          context.strokeStyle = 'black';
        }
        context.strokeText(seg.text, curX, cy);
        context.fillStyle = seg.color || 'white';
        context.fillText(seg.text, curX, cy);
        curX += context.measureText(seg.text).width;
      }
      context.restore();
    }
    if (outline) {
      for (var i in this.objects) {
        if (this.objects[i].type == 'reward' || this.objects[i].type == 'hatReward') {
          const size = 15;
          const halfSize = size / 2;
          context.strokeRect(
            Math.round(Math.round(width / 2) + ((this.objects[i].pos.x - halfSize) - cam.x) * scale),
            Math.round(Math.round(height / 2) + ((this.objects[i].pos.y - halfSize) - cam.y) * scale),
            Math.round(size * scale),
            Math.round(size * scale)
          );
          continue;
        }
        context.beginPath();
        context.lineWidth = 2;
        context.strokeStyle = 'rgb(223, 217, 59)';
        if (selected.includes(i)) {
          context.strokeStyle = 'rgb(255, 14, 14)';
        }
        if (this.objects[i].type == 'text' || this.objects[i].type == 'turret') {
          context.arc(Math.round(Math.round(width / 2) + ((this.objects[i].pos.x) - cam.x) * scale), Math.round(Math.round(height / 2) + ((this.objects[i].pos.y) - cam.y) * scale), 5 * scale, 0, Math.PI * 2, true);
          context.stroke();
        } else {
          context.strokeRect(Math.round(Math.round(width / 2) + ((this.objects[i].pos.x) - cam.x) * scale), Math.round(Math.round(height / 2) + ((this.objects[i].pos.y) - cam.y) * scale), Math.round(this.objects[i].size.x * scale), Math.round(this.objects[i].size.y * scale));
        }
        context.closePath();
      }
    }
  }

  createObject(obj) {
    // if (this.objects.length > 500 && !this.reached) {
    //   alert('you have reached the limit of objects in this area');
    //   this.reached = true;
    // }
    // if (this.objects.length < 500) {
    //   this.reached = false;
    // }
    if (obj.type == 'obstacle') {
      this.objects.push(new Obstacle(obj.pos, obj.size));
    }
    if (obj.type == 'lava') {
      this.objects.push(new Lava(obj.pos, obj.size));
    }
    if (obj.type == "rotatingLava") {
      this.objects.push(new RotatingLava(obj.pos, obj.size, obj.speed, obj.point, obj.startAngle));
    }
    if (obj.type == 'ice') {
      this.objects.push(new Ice(obj.pos, obj.size));
    }
    if (obj.type == 'slime') {
      this.objects.push(new Slime(obj.pos, obj.size));
    }
    if (obj.type == 'teleporter') {
      this.objects.push(new Teleporter(obj.pos, obj.id, obj.size, obj.targetArea, obj.targetId, obj.dir));
    }
    if (obj.type == 'spawner') {
      this.objects.push(new Spawner(obj.pos, obj.size, obj.entityType, obj.number, obj.speed, obj.radius));
    }
    if (obj.type == 'text') {
      this.objects.push(new Text(obj.pos, obj.text));
    }
    if (obj.type == 'button') {
      this.objects.push(new Button(obj.pos, obj.size, obj.id, obj.dir, obj.time));
    }
    if (obj.type == 'switch') {
      this.objects.push(new Switch(obj.pos, obj.size, obj.id, obj.dir));
    }
    if (obj.type == 'door') {
      this.objects.push(new Door(obj.pos, obj.size, obj.linkIds));
    }
    if (obj.type == 'turret') {
      this.objects.push(new Turret(obj.pos, obj.regionPos, obj.regionSize, obj.radius, obj.shootingSpeed, obj.overHeat, obj.speed, obj.coolDownTime));
    }
    if (obj.type == 'gravityZone') {
      this.objects.push(new GravityZone(obj.pos, obj.size, obj.dir));
    }
    if (obj.type == 'block') {
      this.objects.push(new Block(obj.pos, obj.size, obj.layer, obj.collide, obj.color, obj.opacity));
    }
    if (obj.type.startsWith('moving')) {
      let toPush = new Moving(obj.points, obj.size);
      toPush.type = obj.type;
      this.objects.push(toPush);
    }
    if (obj.type.startsWith('circular')) {
      let toPush = new Circular(obj.pos, obj.radius);
      toPush.type = obj.type;
      this.objects.push(toPush);
    }
    if (obj.type == 'timeTrap') {
      this.objects.push(new TimeTrap(obj.pos, obj.size, obj.time));
    }
  }

  copy() {
    let obj = {};
    obj.name = this.name;
    obj.size = this.size;
    obj.objects = this.objects;
    return obj;
  }
}
class Obstacle {
  constructor(pos, size) {
    this.type = 'obstacle';
    this.pos = new Vector(pos.x, pos.y);
    this.size = new Vector(size.x, size.y);
  }

  copy() {
    return {
      type: this.type,
      pos: this.pos,
      size: this.size,
    };
  }

  customGui(gui) {
    let objectPosition = gui.addFolder('Position');
    objectPosition.add(this.pos, 'x').step(1);
    objectPosition.add(this.pos, 'y').step(1);
    let objectSize = gui.addFolder('Size');
    objectSize.add(this.size, 'x').min(1).step(1);
    objectSize.add(this.size, 'y').min(1).step(1);
    objectPosition.open();
    objectSize.open();
  }
}
class Lava {
  constructor(pos, size) {
    this.type = 'lava';
    this.pos = new Vector(pos.x, pos.y);
    this.size = new Vector(size.x, size.y);
  }

  copy() {
    return {
      type: this.type,
      pos: this.pos,
      size: this.size,
    };
  }

  customGui(gui) {
    let objectPosition = gui.addFolder('Position');
    objectPosition.add(this.pos, 'x').step(1);
    objectPosition.add(this.pos, 'y').step(1);
    let objectSize = gui.addFolder('Size');
    objectSize.add(this.size, 'x').min(1).step(1);
    objectSize.add(this.size, 'y').min(1).step(1);
    objectPosition.open();
    objectSize.open();
  }
}
class RotatingLava {
  constructor(pos, size, speed, point, startAngle) {
    this.type = "rotatingLava";
    this.pos = new Vector(pos.x, pos.y);
    this.size = new Vector(size.x, size.y);
    this.speed = speed;
    this.point = new Vector(point.x, point.y);
    this.startAngle = startAngle;
  }

  copy() {
    return {
      type: this.type,
      pos: this.pos,
      size: this.size,
      point: this.point,
      speed: this.speed,
      startAngle: this.startAngle
    };
  }

  customGui(gui) {
    var objectPosition = gui.addFolder('Position');
    objectPosition.add(this.pos, "x").step(1);
    objectPosition.add(this.pos, "y").step(1);
    var objectSize = gui.addFolder('Size');
    objectSize.add(this.size, "x").min(1).step(1);
    objectSize.add(this.size, "y").min(1).step(1);
    var pointSize = gui.addFolder('Point');
    pointSize.add(this.point, "x").min(1).step(1);
    pointSize.add(this.point, "y").min(1).step(1);
    gui.add(this, "speed").step(1);
    gui.add(this, "startAngle").min(0).step(1).max(360);
    objectPosition.open();
    objectSize.open();
    pointSize.open();
  }
}
class Moving {
  constructor(points, size) {
    this.type = "movingLava";
    this.size = new Vector(size.x, size.y);
    this.speed = points[0].speed;
    this.points = points;
    this.pos = new Vector(this.points[0].pos.x - this.size.x / 2, this.points[0].pos.y - this.size.y / 2);
    this["Point Count"] = this.points.length;
  }
  copy() {
    let pointsToReturn = [];
    for (let i = 0; i < this.points.length; i++) {
      pointsToReturn.push({
        pos: this.points[i].pos.clone(),
        speed: this.points[i].speed,
      })
    }
    return {
      type: this.type,
      points: pointsToReturn,
      size: this.size,
      pos: this.pos,
    }
  }
  simulate(frames) {
    let totalTime = 0;
    for (let i = 0; i < this.points.length - 1; i++) {
      totalTime += Math.sqrt((this.points[i + 1].pos.x - this.points[i].pos.x) ** 2 + (this.points[i + 1].pos.y - this.points[i].pos.y) ** 2) / this.points[i].speed;
    }
    let point = this.points[this.points.length - 1];
    totalTime += Math.sqrt((this.points[0].pos.x - point.pos.x) ** 2 + (this.points[0].pos.y - point.pos.y) ** 2) / point.speed;
    if (totalTime == 0) {
      return this.points[0].pos;
    }
    frames = frames % totalTime;
    this.current = 0;
    this.next = 1;
    while (true) {
      let timeNeeded = this.timeBetween(this.points[this.current].pos, this.points[this.next].pos, this.points[this.current].speed);
      if (timeNeeded == 0) {
        return this.points[this.current].pos.clone();
      }
      if (timeNeeded < frames) {
        this.current++;
        this.next++;
        if (this.current == this.points.length - 1) {
          this.next = 0;
        }
        else if (this.current == this.points.length) {
          this.current = 0;
        }
        frames -= timeNeeded;
      }
      else {
        let currentPos = this.points[this.current].pos;
        let nextPos = this.points[this.next].pos;
        return new Vector(currentPos.x + (nextPos.x - currentPos.x) * frames / timeNeeded, currentPos.y + (nextPos.y - currentPos.y) * frames / timeNeeded);
      }
    }
  }
  timeBetween(pos, pos2, speed) {
    return pos2.dist(pos) / speed;
  }
  customGui(gui) {
    gui.add(this, "type", ["movingLava", "movingObstacle", "movingSlime", "movingIce"]);
    console.log(this.type);
    var objectSize = gui.addFolder('Size');
    objectSize.add(this.size, "x").min(1).step(1);
    objectSize.add(this.size, "y").min(1).step(1);
    objectSize.open();
    var pointsEdit = gui.addFolder('Points');
    var count = 2;
    var pointsCount = pointsEdit.add(this, "Point Count").min(2).step(1).max(20);

    for (let i = 1; i <= pointsCount.getValue(); i++) {
      let newFolder = pointsEdit.addFolder(i);
      let posFolder = newFolder.addFolder("Position");
      posFolder.add(this.points[i - 1].pos, "x").step(.5);
      posFolder.add(this.points[i - 1].pos, "y").step(.5);
      newFolder.add(this.points[i - 1], "speed").min(0).step(1);
      newFolder.open();
      posFolder.open();
    }

    pointsCount.onChange(function () {
      let oldCount = count;
      count = pointsCount.getValue();

      if (count > oldCount) {
        for (let i = oldCount + 1; i <= count; i++) {
          this.object.points.push({
            pos: new Vector(this.object.pos.x, this.object.pos.y),
            speed: 20
          });
          let newFolder = pointsEdit.addFolder(i);
          let posFolder = newFolder.addFolder('Position');
          posFolder.add(this.object.points[i - 1].pos, "x").step(.5);
          posFolder.add(this.object.points[i - 1].pos, "y").step(.5);
          newFolder.add(this.object.points[i - 1], "speed").min(0).step(1);
          newFolder.open();
          posFolder.open();

        }
      }
      if (count < oldCount) {
        for (let i = oldCount; i > count; i--) {
          pointsEdit.removeFolder(i);
          this.object.points.pop();
        }
      }
    })

    pointsEdit.open();
  }
}
class Circular {
  constructor(pos, radius) {
    this.type = "circularLava";
    this.radius = radius;
    this.pos = new Vector(pos.x, pos.y);
    this.size = new Vector(this.radius * 2, this.radius * 2);
  }
  copy() {
    return {
      type: this.type,
      radius: this.radius,
      pos: this.pos,
    }
  }
  customGui(gui) {
    gui.add(this, "type", ["circularLava", "circularObstacle", "circularSlime", "circularIce"])
    let objectPosition = gui.addFolder('Position');
    objectPosition.add(this.pos, 'x').step(1);
    objectPosition.add(this.pos, 'y').step(1);
    objectPosition.open();
    let radius = gui.add(this, "radius").min(1).step(.5);
    radius.onChange(function (val) {
      this.object.size.x = val * 2;
      this.object.size.y = val * 2;
    })
  }
}
class Ice {
  constructor(pos, size) {
    this.type = 'ice';
    this.pos = new Vector(pos.x, pos.y);
    this.size = new Vector(size.x, size.y);
  }

  copy() {
    return {
      type: this.type,
      pos: this.pos,
      size: this.size,
    };
  }

  customGui(gui) {
    let objectPosition = gui.addFolder('Position');
    objectPosition.add(this.pos, 'x').step(1);
    objectPosition.add(this.pos, 'y').step(1);
    let objectSize = gui.addFolder('Size');
    objectSize.add(this.size, 'x').min(1).step(1);
    objectSize.add(this.size, 'y').min(1).step(1);
    objectPosition.open();
    objectSize.open();
  }
}
class Slime {
  constructor(pos, size) {
    this.type = 'slime';
    this.pos = new Vector(pos.x, pos.y);
    this.size = new Vector(size.x, size.y);
  }

  copy() {
    return {
      type: this.type,
      pos: this.pos,
      size: this.size,
    };
  }

  customGui(gui) {
    let objectPosition = gui.addFolder('Position');
    objectPosition.add(this.pos, 'x').step(1);
    objectPosition.add(this.pos, 'y').step(1);
    let objectSize = gui.addFolder('Size');
    objectSize.add(this.size, 'x').min(1).step(1);
    objectSize.add(this.size, 'y').min(1).step(1);
    objectPosition.open();
    objectSize.open();
  }
}
class Teleporter {
  constructor(pos, id, size, targetArea, targetId, dir) {
    this.type = 'teleporter';
    this.id = Number(id);
    this.pos = new Vector(pos.x, pos.y);
    this.size = new Vector(size.x, size.y);
    this.targetArea = String(targetArea);
    this.targetId = Number(targetId);
    this.dir = dir;
  }

  copy() {
    return {
      type: this.type,
      id: this.id,
      pos: this.pos,
      size: this.size,
      targetArea: this.targetArea,
      targetId: this.targetId,
      dir: this.dir,
    };
  }

  customGui(gui) {
    let objectPosition = gui.addFolder('Position');
    objectPosition.add(this.pos, 'x').step(1);
    objectPosition.add(this.pos, 'y').step(1);
    let objectSize = gui.addFolder('Size');
    objectSize.add(this.size, 'x').min(1).step(1);
    objectSize.add(this.size, 'y').min(1).step(1);
    gui.add(this, 'id').step(1);
    gui.add(this, 'targetArea');
    gui.add(this, 'targetId').step(1);
    gui.add(this, 'dir', {
      Down: 0,
      Left: 1,
      Right: 3,
      Up: 2,
    });
    objectPosition.open();
    objectSize.open();
  }
}
class Spawner {
  constructor(pos, size, entityType, number, speed, radius) {
    this.type = 'spawner';
    this.pos = new Vector(pos.x, pos.y);
    this.size = new Vector(size.x, size.y);
    this.entityType = entityType;
    this.number = number;
    this.speed = speed;
    this.radius = radius;
  }

  copy() {
    return {
      type: this.type,
      pos: this.pos,
      size: this.size,
      entityType: this.entityType,
      number: this.number,
      speed: this.speed,
      radius: this.radius,
    };
  }

  customGui(gui) {
    let objectPosition = gui.addFolder('Position');
    objectPosition.add(this.pos, 'x').step(1);
    objectPosition.add(this.pos, 'y').step(1);
    let objectSize = gui.addFolder('Size');
    objectSize.add(this.size, 'x').min(1).step(1);
    objectSize.add(this.size, 'y').min(1).step(1);
    gui.add(this, 'entityType', ['normal', 'reverse', 'spike', 'bouncer', 'rotating', 'following', 'bomb', 'monster', 'taker', 'contractor', 'immune', 'expander', 'wavy', 'snek', 'daddySnek', 'babySnek', 'stutter', 'shooter', 'freezer', 'megaBouncer', 'gravityLeft', 'gravityUp', 'gravityRight', 'disabler', 'accelerator', 'decelerator', 'drainer', 'harmless']);
    gui.add(this, 'number').min(1).step(1);
    gui.add(this, 'speed').min(0).step(0.01);
    gui.add(this, 'radius').min(0).step(0.1);
    objectPosition.open();
    objectSize.open();
  }
}
class Text {
  constructor(pos, text) {
    this.type = 'text';
    this.pos = new Vector(pos.x, pos.y);
    this.text = text;
  }

  copy() {
    return {
      type: this.type,
      pos: this.pos,
      text: this.text,
    };
  }

  customGui(gui) {
    let objectPosition = gui.addFolder('Position');
    objectPosition.add(this.pos, 'x').step(1);
    objectPosition.add(this.pos, 'y').step(1);
    gui.add(this, 'text');
    objectPosition.open();
  }
}
class Button {
  constructor(pos, size, id, dir, time) {
    this.type = 'button';
    this.id = id;
    this.pos = new Vector(pos.x, pos.y);
    this.size = new Vector(size.x, size.y);
    this.dir = dir;
    this.time = time;
  }

  copy() {
    return {
      type: this.type,
      pos: this.pos,
      size: this.size,
      dir: this.dir,
      id: this.id,
      time: this.time,
    };
  }

  customGui(gui) {
    let objectPosition = gui.addFolder('Position');
    objectPosition.add(this.pos, 'x').step(1);
    objectPosition.add(this.pos, 'y').step(1);
    let objectSize = gui.addFolder('Size');
    objectSize.add(this.size, 'x').min(1).step(1);
    objectSize.add(this.size, 'y').min(1).step(1);
    gui.add(this, 'id').min(0).step(1);
    gui.add(this, 'dir', {
      Down: 0,
      Left: 1,
      Right: 3,
      Up: 2,
    });
    gui.add(this, 'time').min(0).step(1);
    objectSize.open();
    objectPosition.open();
  }
}
class Switch {
  constructor(pos, size, id, dir) {
    this.type = 'switch';
    this.id = id;
    this.pos = new Vector(pos.x, pos.y);
    this.size = new Vector(size.x, size.y);
    this.dir = dir;
  }

  copy() {
    return {
      type: this.type,
      pos: this.pos,
      size: this.size,
      dir: this.dir,
      id: this.id,
    };
  }

  customGui(gui) {
    let objectPosition = gui.addFolder('Position');
    objectPosition.add(this.pos, 'x').step(1);
    objectPosition.add(this.pos, 'y').step(1);
    let objectSize = gui.addFolder('Size');
    objectSize.add(this.size, 'x').min(1).step(1);
    objectSize.add(this.size, 'y').min(1).step(1);
    gui.add(this, 'id').min(0).step(1);
    gui.add(this, 'dir', {
      Down: 0,
      Left: 1,
      Right: 3,
      Up: 2,
    });
    objectSize.open();
    objectPosition.open();
  }
}
class Door {
  constructor(pos, size, linkIds) {
    this.type = 'door';
    this.linkIds = linkIds.join(',');
    this.pos = new Vector(pos.x, pos.y);
    this.size = new Vector(size.x, size.y);
  }

  copy() {
    return {
      type: this.type,
      pos: this.pos,
      size: this.size,
      linkIds: this.linkIds.split(',').map(Number),
    };
  }

  customGui(gui) {
    let objectPosition = gui.addFolder('Position');
    objectPosition.add(this.pos, 'x').step(1);
    objectPosition.add(this.pos, 'y').step(1);
    let objectSize = gui.addFolder('Size');
    objectSize.add(this.size, 'x').min(1).step(1);
    objectSize.add(this.size, 'y').min(1).step(1);
    gui.add(this, 'linkIds');
    objectPosition.open();
    objectSize.open();
  }
}
class Turret {
  constructor(pos, regionPos, regionSize, radius, shootingSpeed, overHeat, speed, coolDownTime) {
    this.type = 'turret';
    this.pos = new Vector(pos.x, pos.y);
    this.regionPos = new Vector(regionPos.x, regionPos.y);
    this.regionSize = new Vector(regionSize.x, regionSize.y);
    this.radius = radius;
    this.shootingSpeed = shootingSpeed;
    this.overHeat = overHeat;
    this.speed = speed;
    this.coolDownTime = coolDownTime;
  }

  copy() {
    return {
      type: this.type,
      pos: this.pos,
      regionPos: this.regionPos,
      regionSize: this.regionSize,
      radius: this.radius,
      shootingSpeed: this.shootingSpeed,
      overHeat: this.overHeat,
      speed: this.speed,
      coolDownTime: this.coolDownTime,
    };
  }

  customGui(gui) {
    let objectPosition = gui.addFolder('Position');
    objectPosition.add(this.pos, 'x').step(1);
    objectPosition.add(this.pos, 'y').step(1);
    let objectRegion = gui.addFolder('Region');
    let objectRegionPosition = objectRegion.addFolder('Position');
    objectRegionPosition.add(this.regionPos, 'x').step(1);
    objectRegionPosition.add(this.regionPos, 'y').step(1);
    let objectRegionSize = objectRegion.addFolder('Size');
    objectRegionSize.add(this.regionSize, 'x').min(1).step(1);
    objectRegionSize.add(this.regionSize, 'y').min(1).step(1);
    gui.add(this, 'radius');
    gui.add(this, 'speed');
    gui.add(this, 'shootingSpeed');
    gui.add(this, 'overHeat');
    gui.add(this, 'coolDownTime');
    objectRegionSize.open();
    objectRegionPosition.open();
    objectRegion.open();
    objectPosition.open();
  }
}
class GravityZone {
  constructor(pos, size, dir) {
    this.type = 'gravityZone';
    this.pos = new Vector(pos.x, pos.y);
    this.size = new Vector(size.x, size.y);
    this.dir = dir;
  }

  copy() {
    return {
      type: this.type,
      pos: this.pos,
      size: this.size,
      dir: this.dir,
    };
  }

  customGui(gui) {
    let objectPosition = gui.addFolder('Position');
    objectPosition.add(this.pos, 'x').step(1);
    objectPosition.add(this.pos, 'y').step(1);
    let objectSize = gui.addFolder('Size');
    objectSize.add(this.size, 'x').min(1).step(1);
    objectSize.add(this.size, 'y').min(1).step(1);
    gui.add(this, 'dir', {
      Left: 1,
      Right: 3,
      Up: 2,
    });
    objectPosition.open();
    objectSize.open();
  }
}
class Block {
  constructor(pos, size, layer, collide, color, opacity) {
    this.type = 'block';
    this.pos = new Vector(pos.x, pos.y);
    this.size = new Vector(size.x, size.y);
    this.layer = layer;
    this.collide = collide;
    this.color = rgbToHex(Math.round(color[0]), Math.round(color[1]), Math.round(color[2]));
    this.opacity = opacity;
  }

  copy() {
    return {
      type: this.type,
      pos: this.pos,
      size: this.size,
      layer: this.layer,
      collide: this.collide,
      color: hexToRgb(this.color),
      opacity: this.opacity,
    };
  }

  customGui(gui) {
    let objectPosition = gui.addFolder('Position');
    objectPosition.add(this.pos, 'x').step(1);
    objectPosition.add(this.pos, 'y').step(1);
    let objectSize = gui.addFolder('Size');
    objectSize.add(this.size, 'x').min(1).step(1);
    objectSize.add(this.size, 'y').min(1).step(1);
    gui.add(this, 'collide');
    gui.addColor(this, 'color');
    gui.add(this, 'opacity').min(0).max(1).step(0.01);
    gui.add(this, 'layer', {
      Under: 0,
      Above: 1,
    });
    objectPosition.open();
    objectSize.open();
  }
}

class Reward {
  constructor(pos, reward) {
    this.type = "reward";
    this.reward = reward;
    this.pos = new Vector(pos.x, pos.y);;
  }

  copy() {
    return {
      type: this.type,
      pos: this.pos,
      reward: this.reward
    };
  }

  customGui(gui) {

  }
}

class HatReward {
  constructor(pos, reward) {
    this.type = "hatReward";
    this.reward = reward;
    this.pos = new Vector(pos.x, pos.y);;
    this.size = new Vector(15, 15);
  }

  copy() {
    return {
      type: this.type,
      pos: this.pos,
      reward: this.reward
    };
  }

  customGui(gui) {
    let objectPosition = gui.addFolder('Position');
    objectPosition.add(this.pos, 'x').step(1);
    objectPosition.add(this.pos, 'y').step(1);
    objectPosition.open();
    // let objectSize = gui.addFolder('Size');
    // objectSize.add(this.size, 'x').min(1).step(1);
    // objectSize.add(this.size, 'y').min(1).step(1);
    // objectSize.open();
    let reward = gui.addFolder('Hat Reward');
    reward.add(this, 'reward');
    reward.open();
  }
}
class TimeTrap {
  constructor(pos, size, time) {
    this.type = 'timeTrap';
    this.pos = new Vector(pos.x, pos.y);
    this.size = new Vector(size.x, size.y);
    this.time = time;
  }

  copy() {
    return {
      type: this.type,
      pos: this.pos,
      size: this.size,
      time: this.time,
    };
  }

  customGui(gui) {
    let objectPosition = gui.addFolder('Position');
    objectPosition.add(this.pos, 'x').step(1);
    objectPosition.add(this.pos, 'y').step(1);
    let objectSize = gui.addFolder('Size');
    objectSize.add(this.size, 'x').min(1).step(1);
    objectSize.add(this.size, 'y').min(1).step(1);
    gui.add(this, 'time').min(0.01);
    objectSize.open();
    objectPosition.open();
  }
}

var backgroundColor = [0, 10, 87, 0.8];
var areaColor = [230, 230, 230];
var frames = 0;

//var background = new Image();
//background.src = 'textures/images/background11.png';
var world = new Map();
var gui = new dat.GUI();

world.importMap(templateMapData);
world.getArea().loadGui();

const areasPanel = document.getElementById('areas-panel');
const areasList = document.getElementById('areas-list');
document.getElementById('toggle-areas').onclick = () => {
  areasPanel.classList.toggle('open');
  if (areasPanel.classList.contains('open')) refreshAreasList();
};

function refreshAreasList() {
  areasList.innerHTML = '';
  for (let i = 0; i < world.areas.length; i++) {
    const item = document.createElement('div');
    item.className = 'area-item' + (i === world.currentArea ? ' active' : '');
    item.innerHTML = `<span class="area-item-name">${world.areas[i].name}</span>`;
    item.addEventListener('click', () => {
      world.currentArea = i;
      cam.x = world.getArea().size.x / 2;
      cam.y = world.getArea().size.y / 2;
      world.getArea().loadGui();
      selected = [];
      refreshAreasList();
    });
    areasList.appendChild(item);
  }
}

document.getElementById('createObstacle').addEventListener('click', () => {
  world.getArea().createObject({
    type: 'obstacle',
    pos: new Vector(Math.round(cam.x), Math.round(cam.y)),
    size: new Vector(30, 30),
  });
});
document.getElementById('createLava').addEventListener('click', () => {
  world.getArea().createObject({
    type: 'lava',
    pos: new Vector(Math.round(cam.x), Math.round(cam.y)),
    size: new Vector(30, 30),
  });
});
document.getElementById('createSlime').addEventListener('click', () => {
  world.getArea().createObject({
    type: 'slime',
    pos: new Vector(Math.round(cam.x), Math.round(cam.y)),
    size: new Vector(30, 30),
  });
});
document.getElementById('createIce').addEventListener('click', () => {
  world.getArea().createObject({
    type: 'ice',
    pos: new Vector(Math.round(cam.x), Math.round(cam.y)),
    size: new Vector(30, 30),
  });
});

var outline = true;

var cam = new Vector(50, 50);
var scale = 3;
let keys = [];
let speed = 10;
let mousePosReal = new Vector();
let mousePos = new Vector();
let left = false;

var selected = [];
let isSelected = false;
let offset = [];

let isSelecting = false;
let selectingMousePos = new Vector();

let copied = {};
let isCopied = false;

let borderIsSelectedX = false;
let borderIsSelectedY = false;
let object = -1;
let borderNumX = -1;
let borderNumY = -1;

var timee = 0;

let snap = 10;

document.getElementById('restart').onclick = function () {
  let r = confirm('Are you sure? It will erase the current map.');
  if (r == true) {
    world = new Map();
    world.getArea().loadGui();
  }
};
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.keyCode == 90) {// CTRL+Z

  }
  if (document.activeElement == document.body) {
    if (e.key.toLowerCase() === 'u') {
      scale *= 0.8;
    } else if (e.key.toLowerCase() === 'i') {
      scale /= 0.8;
    }
    if (e.repeat) return;
    keys[e.keyCode] = true;
    // console.log(e.key);
    if (e.key == "ArrowLeft") {
      selected.forEach(id => {
        world.getArea().objects[id].pos.x -= 1;
      });
    } else if (e.key == "ArrowRight") {
      selected.forEach(id => {
        world.getArea().objects[id].pos.x += 1;
      });
    } else if (e.key == "ArrowUp") {
      selected.forEach(id => {
        world.getArea().objects[id].pos.y -= 1;
      });
    } else if (e.key == "ArrowDown") {
      selected.forEach(id => {
        world.getArea().objects[id].pos.y += 1;
      });
    }
    // if (e.keyCode == 37) {
    //   world.currentArea--;
    //   if (world.currentArea < 0) {
    //     world.currentArea = 0;
    //   }
    //   cam.x = world.getArea().size.x / 2,
    //     cam.y = world.getArea().size.y / 2,
    //     world.getArea().loadGui();
    //   selected = [];
    //   if (areasPanel.classList.contains('open')) refreshAreasList();
    // }
    // if (e.keyCode == 39) {
    //   world.currentArea++;
    //   if (world.currentArea > world.areas.length - 1) {
    //     world.currentArea = world.areas.length - 1;
    //   }
    //   cam.x = world.getArea().size.x / 2,
    //     cam.y = world.getArea().size.y / 2,
    //     world.getArea().loadGui();
    //   selected = [];
    //   if (areasPanel.classList.contains('open')) refreshAreasList();
    // }
    if (e.keyCode == 79) {
      outline = !outline;
    }
  }
}, false);
document.addEventListener('keyup', (e) => {
  delete keys[e.keyCode];
}, false);

document.getElementById('game').addEventListener('wheel', (e) => {
  if (e.deltaY < 0) {
    scale += 0.5;
    cam.x -= (cam.x - mousePos.x) / scale / 2;
    cam.y -= (cam.y - mousePos.y) / scale / 2;
  }
  if (e.deltaY > 0) {
    scale -= 0.5;
    if (scale < 1) {
      scale = 1;
    } else {
      cam.x += (cam.x - mousePos.x) / scale / 2;
      cam.y += (cam.y - mousePos.y) / scale / 2;
    }
  }
  scale = Math.floor(scale * 100) / 100;
  /* if (e.deltaY < 0) {
    scale*=1.1
  }
  if (e.deltaY > 0) {
    scale*=0.9
    if (scale<0.5) {
      scale=.5;
    }
  }
  scale=Math.floor(scale*10)/10 */
}, false);
document.getElementById('import').addEventListener('change', () => {
  let fileList = document.getElementById('import').files[0];
  let reader = new FileReader();
  reader.onloadend = function (evt) {
    if (evt.target.readyState == FileReader.DONE) {
      world.importMap(JSON.parse(evt.target.result));
      if (areasPanel.classList.contains('open')) refreshAreasList();
    }
  };
  reader.readAsBinaryString(fileList);
}, false);
document.getElementById('export').onclick = function () {
  world.exportMap();
};

{
  const notConnectedDiv = document.getElementById("notConnected");
  const connectedDiv = document.getElementById("connected");
  const esConnectBtn = document.getElementById("esConnectBtn");
  const esSyncBtn = document.getElementById("esSyncBtn");
  const esConnectedText = document.getElementById("esConnectedText");

  let esIp = "http://localhost:6661";
  let esPassword = "";
  let syncedTooltipInterval;
  let lastSynced = -1;
  let lastError = "";

  esConnectBtn.addEventListener("click", () => {
    esIp = prompt("server ip? (default- https://skip.nightly.pw:6661)") || "https://skip.nightly.pw:6661";
    esPassword = prompt("password (type /editorsync in game with perms)?") || "";
    if (syncedTooltipInterval) {
      clearInterval(syncedTooltipInterval);
    }
    connectedDiv.hidden = false;
    syncedTooltipInterval = setInterval(() => {
      if (lastSynced == -1) {
        if (lastError.length > 0) {
          esConnectedText.innerHTML = `editor sync failed! ${lastError}`;
        } else {
          esConnectedText.innerHTML = "editor sync is ready!";
        }
      } else {
        const timeDiff = Math.floor((Date.now() - lastSynced) / 1000);
        esConnectedText.innerHTML = `synced (${timeDiff}s ago)`;
      }
    }, 1000);
  });

  esSyncBtn.addEventListener("click", () => {
    const mapJson = JSON.stringify(world.getMapJSON());
    const requestJsonStr = `{"map":${mapJson},"password":"${esPassword}"}`;
    const onSuccess = () => {
      lastSynced = Date.now();
      lastError = "";
    };
    fetch(`${esIp}/editorsync`, {
      method: "POST",
      body: requestJsonStr,
    }).then(() => {
      onSuccess();
    }).catch(err => {
      if (err.status == 200) {
        onSuccess();
        return;
      }
      lastError = err.message.length > 16 ? err.message.substring(0, 13) + "..." : err.message;
      lastSynced = -1;
    });
  });
}
document.getElementById('game').addEventListener('dblclick', (e) => {
  let area = world.getArea();
  let sizeS = 5;
  for (let i in area.objects) {
    if (area.objects[i].type == 'teleporter') {
      if (mousePos.x > area.objects[i].pos.x - sizeS
        && mousePos.x < area.objects[i].pos.x + area.objects[i].size.x + sizeS
        && mousePos.y > area.objects[i].pos.y - sizeS
        && mousePos.y < area.objects[i].pos.y + area.objects[i].size.y + sizeS) {
        for (let j in world.areas) {
          if (world.areas[j].name == area.objects[i].targetArea) {
            world.currentArea = j;
            for (let k in world.getArea().objects) {
              if (world.getArea().objects[k].type == 'teleporter') {
                if (world.getArea().objects[k].id == area.objects[i].targetId) {
                  cam.x = world.getArea().objects[k].pos.x,
                    cam.y = world.getArea().objects[k].pos.y;
                }
              }
            }
            world.getArea().loadGui();
            selected = [];
          }
        }
      }
    }
  }
});
document.addEventListener('mousemove', (p) => {
  mousePosReal.x = p.pageX;
  mousePosReal.y = p.pageY;
  let sizeS = 5;
  let area = world.getArea();
  let resizeX = 0;
  let resizeY = 0;
  let grab = false;
  for (var i in area.objects) {
    // if (area.objects[i].type == 'reward' || area.objects[i].type == 'hatReward') continue;
    if (area.objects[i].type != 'text' && area.objects[i].type != 'turret') {
      if (mousePos.x > area.objects[i].pos.x - (sizeS / scale)
        && mousePos.x < area.objects[i].pos.x + area.objects[i].size.x + (sizeS / scale)
        && mousePos.y > area.objects[i].pos.y - (sizeS / scale)
        && mousePos.y < area.objects[i].pos.y + (sizeS / scale)) {
        resizeY = -1;
      }
      if (mousePos.x > area.objects[i].pos.x - (sizeS / scale)
        && mousePos.x < area.objects[i].pos.x + area.objects[i].size.x + (sizeS / scale)
        && mousePos.y > area.objects[i].pos.y + area.objects[i].size.y - (sizeS / scale)
        && mousePos.y < area.objects[i].pos.y + area.objects[i].size.y + (sizeS / scale)) {
        resizeY = 1;
      }
      if (mousePos.x > area.objects[i].pos.x - (sizeS / scale)
        && mousePos.x < area.objects[i].pos.x + (sizeS / scale)
        && mousePos.y > area.objects[i].pos.y - (sizeS / scale)
        && mousePos.y < area.objects[i].pos.y + area.objects[i].size.y + (sizeS / scale)) {
        resizeX = -1;
      }
      if (mousePos.x > area.objects[i].pos.x + area.objects[i].size.x - (sizeS / scale)
        && mousePos.x < area.objects[i].pos.x + area.objects[i].size.x + (sizeS / scale)
        && mousePos.y > area.objects[i].pos.y - (sizeS / scale)
        && mousePos.y < area.objects[i].pos.y + area.objects[i].size.y + (sizeS / scale)) {
        resizeX = 1;
      }
    }
  }
  for (var i in area.objects) {
    // if (area.objects[i].type == 'reward' || area.objects[i].type == 'hatReward') continue;
    if (resizeX == 0 && resizeY == 0) {
      if (area.objects[i].type == 'text' || area.objects[i].type == 'turret') {
        if (Math.sqrt(Math.pow(mousePos.x - area.objects[i].pos.x, 2) + Math.pow(mousePos.y - area.objects[i].pos.y, 2)) < 5) {
          grab = true;
        }
      } else if (mousePos.x > area.objects[i].pos.x
        && mousePos.x < area.objects[i].pos.x + area.objects[i].size.x
        && mousePos.y > area.objects[i].pos.y
        && mousePos.y < area.objects[i].pos.y + area.objects[i].size.y) {
        grab = true;
      }
    }
  }
  if (grab) {
    document.getElementById('game').style.cursor = 'grab';
  } else if (resizeX != 0 || resizeY != 0) {
    if ((resizeX + resizeY) % 2 == 0) {
      if (resizeX == resizeY) {
        document.getElementById('game').style.cursor = 'nwse-resize';
      } else {
        document.getElementById('game').style.cursor = 'nesw-resize';
      }
    } else if (resizeX == 0) {
      document.getElementById('game').style.cursor = 'ns-resize';
    } else {
      document.getElementById('game').style.cursor = 'ew-resize';
    }
  } else {
    document.getElementById('game').style.cursor = 'default';
  }
}, false);

document.getElementById('game').onmousedown = function (e) {
  left = true;
  let sizeS = 5;
  if (e.button == 0) {
    let area = world.getArea();
    if (mousePos.x > -(sizeS / scale)
      && mousePos.x < area.size.x + (sizeS / scale)
      && mousePos.y > -(sizeS / scale)
      && mousePos.y < +(sizeS / scale)) {
      borderIsSelectedY = true;
      object = -1;
      borderNumY = 0;
    }
    if (mousePos.x > -(sizeS / scale)
      && mousePos.x < area.size.x + (sizeS / scale)
      && mousePos.y > area.size.y - (sizeS / scale)
      && mousePos.y < area.size.y + (sizeS / scale)) {
      borderIsSelectedY = true;
      object = -1;
      borderNumY = 1;
    }
    if (mousePos.x > -(sizeS / scale)
      && mousePos.x < (sizeS / scale)
      && mousePos.y > -(sizeS / scale)
      && mousePos.y < area.size.y + (sizeS / scale)) {
      borderIsSelectedX = true;
      object = -1;
      borderNumX = 0;
    }
    if (mousePos.x > area.size.x - (sizeS / scale)
      && mousePos.x < area.size.x + (sizeS / scale)
      && mousePos.y > -(sizeS / scale)
      && mousePos.y < area.size.y + (sizeS / scale)) {
      borderIsSelectedX = true;
      object = -1;
      borderNumX = 1;
    }
    for (var i in area.objects) {
      // if (area.objects[i].type == 'reward' || area.objects[i].type == 'hatReward') continue;
      if (area.objects[i].type != 'text' && area.objects[i].type != 'turret') {
        if (mousePos.x > area.objects[i].pos.x - (sizeS / scale)
          && mousePos.x < area.objects[i].pos.x + area.objects[i].size.x + (sizeS / scale)
          && mousePos.y > area.objects[i].pos.y - (sizeS / scale)
          && mousePos.y < area.objects[i].pos.y + (sizeS / scale)) {
          borderIsSelectedY = true;
          object = i;
          borderNumY = 0;
          if (!selected.includes(i)) {
            selected.push(i);
          }
          world.getArea().loadGuiObject(i);
        }
        if (mousePos.x > area.objects[i].pos.x - (sizeS / scale)
          && mousePos.x < area.objects[i].pos.x + area.objects[i].size.x + (sizeS / scale)
          && mousePos.y > area.objects[i].pos.y + area.objects[i].size.y - (sizeS / scale)
          && mousePos.y < area.objects[i].pos.y + area.objects[i].size.y + (sizeS / scale)) {
          borderIsSelectedY = true;
          object = i;
          borderNumY = 1;
          if (!selected.includes(i)) {
            selected.push(i);
          }
          world.getArea().loadGuiObject(i);
        }
        if (mousePos.x > area.objects[i].pos.x - (sizeS / scale)
          && mousePos.x < area.objects[i].pos.x + (sizeS / scale)
          && mousePos.y > area.objects[i].pos.y - (sizeS / scale)
          && mousePos.y < area.objects[i].pos.y + area.objects[i].size.y + (sizeS / scale)) {
          borderIsSelectedX = true;
          object = i;
          borderNumX = 0;
          if (!selected.includes(i)) {
            selected.push(i);
          }
          world.getArea().loadGuiObject(i);
        }
        if (mousePos.x > area.objects[i].pos.x + area.objects[i].size.x - (sizeS / scale)
          && mousePos.x < area.objects[i].pos.x + area.objects[i].size.x + (sizeS / scale)
          && mousePos.y > area.objects[i].pos.y - (sizeS / scale)
          && mousePos.y < area.objects[i].pos.y + area.objects[i].size.y + (sizeS / scale)) {
          borderIsSelectedX = true;
          object = i;
          borderNumX = 1;
          if (!selected.includes(i)) {
            selected.push(i);
          }
          world.getArea().loadGuiObject(i);
        }
      }
    }
    for (var i in area.objects) {
      // if (area.objects[i].type == 'reward' || area.objects[i].type == 'hatReward') continue;
      if (!borderIsSelectedX && !borderIsSelectedY) {
        if (area.objects[i].type == 'text' || area.objects[i].type == 'turret') {
          if (Math.sqrt(Math.pow(mousePos.x - area.objects[i].pos.x, 2) + Math.pow(mousePos.y - area.objects[i].pos.y, 2)) < 5) {
            isSelected = true;
            if (!selected.includes(i) && keys[16] != true) {
              selected = [];
            }
            if (!selected.includes(i)) {
              selected.push(i);
            }
            world.getArea().loadGuiObject(i);
            offset = [];
            for (var i in selected) {
              offset.push(new Vector(mousePos.x - area.objects[selected[i]].pos.x, mousePos.y - area.objects[selected[i]].pos.y));
            }
          }
        } else if (mousePos.x > area.objects[i].pos.x
          && mousePos.x < area.objects[i].pos.x + area.objects[i].size.x
          && mousePos.y > area.objects[i].pos.y
          && mousePos.y < area.objects[i].pos.y + area.objects[i].size.y) {
          isSelected = true;
          if (!selected.includes(i) && keys[16] != true) {
            selected = [];
          }
          if (!selected.includes(i)) {
            selected.push(i);
          }
          world.getArea().loadGuiObject(i);
          offset = [];
          for (var i in selected) {
            offset.push(new Vector(mousePos.x - area.objects[selected[i]].pos.x, mousePos.y - area.objects[selected[i]].pos.y));
          }
        }
      }
    }
    if (!(isSelected || borderIsSelectedX || borderIsSelectedY)) {
      if (keys[16] != true) {
        selected = [];
      }
      isSelecting = true;
      selectingMousePos = new Vector(mousePos.x, mousePos.y);
    }
  }
};
document.onmouseup = function (e) {
  left = false;
  if (isSelected) {
    isSelected = false;
  }
  if (isSelecting) {
    let topleft = new Vector(Math.min(selectingMousePos.x, mousePos.x), Math.min(selectingMousePos.y, mousePos.y));
    let bottomright = new Vector(Math.max(selectingMousePos.x, mousePos.x), Math.max(selectingMousePos.y, mousePos.y));
    let area = world.getArea();
    for (var i in area.objects) {
      // if (area.objects[i].type == 'reward' || area.objects[i].type == 'hatReward') continue;
      if (area.objects[i].type == 'text' || area.objects[i].type == 'turret') {
        if (area.objects[i].pos.x > topleft.x
          && area.objects[i].pos.x < bottomright.x
          && area.objects[i].pos.y > topleft.y
          && area.objects[i].pos.y < bottomright.y) {
          selected.push(i);
        }
      } else if (!(topleft.x > area.objects[i].pos.x + area.objects[i].size.x
        || bottomright.x < area.objects[i].pos.x
        || topleft.y > area.objects[i].pos.y + area.objects[i].size.y
        || bottomright.y < area.objects[i].pos.y)) {
        selected.push(i);
      }
    }
    isSelecting = false;
  }
  if (borderIsSelectedX) {
    borderIsSelectedX = false;
  }
  if (borderIsSelectedY) {
    borderIsSelectedY = false;
  }
  for (var i = 0; i < Object.keys(gui.__folders).length; i++) {
    let key = Object.keys(gui.__folders)[i];
    for (let j in gui.__folders[key].__folders) {
      for (let k in gui.__folders[key].__folders[j].__controllers) {
        gui.__folders[key].__folders[j].__controllers[k].updateDisplay();
      }
    }
  }
};

window.onbeforeunload = function (e) {
  // Cancel the event
  e.preventDefault();

  // Chrome requires returnValue to be set
  e.returnValue = 'Are you sure you want to leave?';
};

let parentControl = document.getElementById('game');
parentControl.addEventListener('contextmenu', () => {
  let isObject = false;
  let object = -1;
  let area = world.getArea();
  let mousePosContext = new Vector(Math.round(((mousePosReal.x - width / 2) / scale) + cam.x), Math.round(((mousePosReal.y - height / 2) / scale) + cam.y));
  for (let i in area.objects) {
    if (area.objects[i].type == 'text' || area.objects[i].type == 'turret') {
      if (Math.sqrt(Math.pow(mousePos.x - area.objects[i].pos.x, 2) + Math.pow(mousePos.y - area.objects[i].pos.y, 2)) < 5) {
        isObject = true;
        object = i;
      }
    } else if (mousePos.x > area.objects[i].pos.x
      && mousePos.x < area.objects[i].pos.x + area.objects[i].size.x
      && mousePos.y > area.objects[i].pos.y
      && mousePos.y < area.objects[i].pos.y + area.objects[i].size.y) {
      isObject = true;
      object = i;
    }
  }
  new Contextual({
    isSticky: false,
    width: '250px',
    items: [{
      type: 'multi',
      items: [{
        label: 'Copy',
        onClick: () => {
          isCopied = true;
          copied = [];
          for (let i in area.objects) {
            if (selected.includes(i)) {
              copied.push(area.objects[i].copy());
            }
          }
        },
        enabled: selected.includes(object),
      },
      {
        label: 'Cut',
        onClick: () => {
          isCopied = true;
          copied = [];
          for (var i in area.objects) {
            if (selected.includes(i)) {
              copied.push(area.objects[i].copy());
            }
          }
          let tempArray = [];
          for (var i in area.objects) {
            if (!selected.includes(i)) {
              tempArray.push(area.objects[i]);
            }
          }
          area.objects = tempArray;
          selected = [];
          isSelected = false;
        },
        enabled: selected.includes(object),
      },
      {
        label: 'Paste',
        onClick: () => {
          selected = [];
          for (let i in copied) {
            let obj = { ...copied[i] };
            obj.pos = new Vector(mousePosContext.x + (copied[i].pos.x - copied[0].pos.x), mousePosContext.y + (copied[i].pos.y - copied[0].pos.y));
            area.createObject(obj);
          }
          selected.push(`${`${area.objects.length}` - 1}`);
        },
        enabled: isCopied,
      },
      ],
    },
    {
      type: 'multi',
      items: [{
        label: 'Delete',
        onClick: () => {
          let tempArray = [];
          for (let i in area.objects) {
            if (!selected.includes(i)) {
              tempArray.push(area.objects[i]);
            }
          }
          area.objects = tempArray;
          selected = [];
          isSelected = false;
        },
        enabled: selected.includes(object),
      },
      {
        label: 'Duplicate',
        onClick: () => {
          let selecteddd = [];
          for (let i in area.objects) {
            if (selected.includes(i)) {
              console.log(area.objects[i].copy());
              area.createObject(area.objects[i].copy());
              selecteddd.push(`${`${area.objects.length}` - 1}`);
            }
          }
          selected = selecteddd;
        },
        enabled: selected.includes(object),
      },
      {
        label: 'Rotate',
        onClick: () => {
          let first;
          let max = 0;
          for (let i in area.objects) {
            if (selected.includes(i)) {
              if (area.objects[i].size) {
                if (first == undefined) {
                  first = i;
                }
                var obj = area.objects[i].size;
                var x = obj.x + 0;
                var y = obj.y + 0;
                obj.x = y;
                obj.y = x;
                let obj2 = area.objects[i].pos;
                var x = obj2.x - area.objects[first].pos.x + 0;
                var y = obj2.y - area.objects[first].pos.y + 0;
                obj2.x = area.objects[first].pos.x + y;
                obj2.y = area.objects[first].pos.y + x;
                if (obj2.x + obj.x > max) {
                  max = obj2.x + obj.x;
                }
              }
              if (area.objects[i].regionSize) {
                var obj = area.objects[i];
                obj.regionPos.x = parseInt((obj.pos.x - (obj.regionSize.x / 2)).toFixed(0));
                obj.regionPos.y = parseInt((obj.pos.y - (obj.regionSize.y / 2)).toFixed(0));
              }
              if (area.objects[i].point) {
                var obj = area.objects[i];
                obj.point.x = parseInt((obj.pos.x + (obj.size.x / 2)).toFixed(0));
                obj.point.y = parseInt((obj.pos.y + (obj.size.y / 2)).toFixed(0));
              }
            }
          }
        },
        enabled: selected.includes(object),
      },
      ],
    },
    {
      type: 'seperator',
    },
    {
      type: 'hovermenu',
      label: 'Create',
      items: [{
        label: 'Obstacle',
        onClick: () => {
          area.createObject({
            type: 'obstacle',
            pos: mousePosContext,
            size: new Vector(30, 30),
          });
        },
      },
      {
        label: 'Lava',
        onClick: () => {
          area.createObject({
            type: 'lava',
            pos: mousePosContext,
            size: new Vector(30, 30),
          });
        },
      },
      {
        label: 'RotatingLava',
        onClick: () => {
          area.createObject({
            type: "rotatingLava",
            pos: mousePosContext,
            size: new Vector(30, 30),
            speed: 30,
            point: mousePosContext,
            startAngle: 0
          });
        },
      },
      {
        label: 'Ice',
        onClick: () => {
          area.createObject({
            type: 'ice',
            pos: mousePosContext,
            size: new Vector(30, 30),
          });
        },
      },
      {
        label: 'Slime',
        onClick: () => {
          area.createObject({
            type: 'slime',
            pos: mousePosContext,
            size: new Vector(30, 30),
          });
        },
      },
      {
        label: 'Teleporter',
        onClick: () => {
          area.createObject({
            type: 'teleporter',
            id: 0,
            pos: mousePosContext,
            size: new Vector(20, 10),
            targetArea: 'Home',
            targetId: 0,
            dir: 0,
          });
        },
      },
      {
        label: 'Spawner',
        onClick: () => {
          area.createObject({
            type: 'spawner',
            pos: mousePosContext,
            size: new Vector(30, 30),
            entityType: 'normal',
            number: 10,
            speed: 10,
            radius: 5,
          });
        },
      },
      {
        label: 'Text',
        onClick: () => {
          area.createObject({
            type: 'text',
            pos: mousePosContext,
            text: 'text',
          });
        },
      },
      {
        label: 'Button',
        onClick: () => {
          area.createObject({
            type: 'button',
            pos: mousePosContext,
            size: new Vector(20, 4),
            dir: 0,
            id: 0,
            time: 5,
          });
        },
      },
      {
        label: 'Switch',
        onClick: () => {
          area.createObject({
            type: 'switch',
            pos: mousePosContext,
            size: new Vector(20, 4),
            dir: 0,
            id: 0,
          });
        },
      },
      {
        label: 'Door',
        onClick: () => {
          area.createObject({
            type: 'door',
            pos: mousePosContext,
            size: new Vector(10, 40),
            linkIds: [0],
          });
        },
      }, {
        label: 'Turret',
        onClick: () => {
          area.createObject({
            type: 'turret',
            pos: mousePosContext,
            regionPos: new Vector(0, 0),
            regionSize: new Vector(100, 100),
            radius: 2,
            shootingSpeed: 0.1,
            overHeat: 4,
            speed: 10,
            coolDownTime: 4,
          });
        },
      }, {
        label: 'Gravity Zone',
        onClick: () => {
          area.createObject({
            type: 'gravityZone',
            pos: mousePosContext,
            size: new Vector(30, 30),
            dir: 2,
          });
        },
      },
      {
        label: 'Block',
        onClick: () => {
          area.createObject({
            type: 'block',
            pos: mousePosContext,
            size: new Vector(30, 30),
            layer: 0,
            collide: false,
            color: [0, 0, 0],
            opacity: 1,
          });
        },
      },
      {
        label: 'MovingObject',
        onClick: () => {
          area.createObject({
            type: 'movingLava',
            size: new Vector(30, 30),
            points: [{
              pos: mousePosContext.clone(),
              speed: 20,
            }, {
              pos: mousePosContext.clone(),
              speed: 20,
            }]
          })
        }
      },
      {
        label: 'CircularObject',
        onClick: () => {
          area.createObject({
            type: 'circularLava',
            radius: 30,
            pos: mousePosContext,
          })
        }
      },
      {
        label: 'Time Trap',
        onClick: () => {
          area.createObject({
            type: 'timeTrap',
            pos: mousePosContext,
            size: new Vector(50, 20),
            time: 5,
          });
        },
      },
      ],
    },
    {
      type: 'seperator',
    },
    {
      type: 'multi',
      items: [{
        label: 'Add Area',
        onClick: () => {
          world.addArea();
          world.getArea().loadGui();
          selected = [];
          if (areasPanel.classList.contains('open')) refreshAreasList();
        },
      },
      {
        label: 'Remove Area',
        onClick: () => {
          world.removeArea();
          world.getArea().loadGui();
          selected = [];
          if (areasPanel.classList.contains('open')) refreshAreasList();
        },
        enabled: world.areas.length > 1,
      },
      ],
    },
    ],
  });
}, false);

function rgbToHex(r, g, b) {
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function hexToRgb(hex) {
  let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : null;
}

function updateUI() {
  for (var i = 0; i < Object.keys(gui.__folders).length; i++) {
    var key = Object.keys(gui.__folders)[i];
    for (var j in gui.__folders[key].__folders) {
      for (var k in gui.__folders[key].__folders[j].__controllers) {
        gui.__folders[key].__folders[j].__controllers[k].updateDisplay();
      }
    }
  }
}

function render() {
  width = window.innerWidth,
    height = window.innerHeight,
    ratio = window.devicePixelRatio;
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  context.scale(ratio, ratio);
  timee += 20;
  let currentSpeed = speed;
  if (keys[16]) {
    currentSpeed *= 2;
  }
  if (keys[87]) {
    cam.y -= currentSpeed / scale;
  }
  if (keys[65]) {
    cam.x -= currentSpeed / scale;
  }
  if (keys[83]) {
    cam.y += currentSpeed / scale;
  }
  if (keys[68]) {
    cam.x += currentSpeed / scale;
  }
  mousePos.x = ((mousePosReal.x - width / 2) / scale) + cam.x;
  mousePos.y = ((mousePosReal.y - height / 2) / scale) + cam.y;
  if (isSelected) {
    for (var i = 0; i < Object.keys(gui.__folders).length; i++) {
      var key = Object.keys(gui.__folders)[i];
      for (var j in gui.__folders[key].__folders) {
        for (var k in gui.__folders[key].__folders[j].__controllers) {
          gui.__folders[key].__folders[j].__controllers[k].updateDisplay();
        }
      }
    }
    for (var i in selected) {
      if (keys[17]) {
        world.getArea().objects[selected[i]].pos.x = Math.round(Math.round(mousePos.x - offset[i].x) / snap) * snap;
        world.getArea().objects[selected[i]].pos.y = Math.round(Math.round(mousePos.y - offset[i].y) / snap) * snap;
      } else {
        world.getArea().objects[selected[i]].pos.x = Math.round(mousePos.x - offset[i].x);
        world.getArea().objects[selected[i]].pos.y = Math.round(mousePos.y - offset[i].y);
      }
      if (world.getArea().objects[selected[i]].type.startsWith("moving")) {
        let movingObj = world.getArea().objects[selected[i]]
        movingObj.points[0].pos.x = movingObj.pos.x + movingObj.size.x / 2;
        movingObj.points[0].pos.y = movingObj.pos.y + movingObj.size.y / 2;
      }
    }
  }
  if (borderIsSelectedX) {
    for (var i = 0; i < Object.keys(gui.__folders).length; i++) {
      var key = Object.keys(gui.__folders)[i];
      for (var j in gui.__folders[key].__folders) {
        for (var k in gui.__folders[key].__folders[j].__controllers) {
          gui.__folders[key].__folders[j].__controllers[k].updateDisplay();
        }
      }
    }
    if (borderNumX == 0) {
      if (object == -1) {

      } else {
        let worldObject = world.getArea().objects[object]
        if (worldObject.size.x + Math.round(worldObject.pos.x - Math.round(mousePos.x)) != 0) {
          var before = worldObject.pos.x;
          if (keys[17]) {
            worldObject.pos.x = Math.round(Math.round(mousePos.x) / snap) * (snap);
          } else {
            worldObject.pos.x = Math.round(mousePos.x);
          }
          worldObject.size.x += Math.round(before - worldObject.pos.x);
          if (worldObject.type.startsWith('circular')) {
            worldObject.radius = worldObject.size.x / 2;
            worldObject.size.y = worldObject.size.x;
          }
        }
        if (worldObject.size.x < 0) {
          borderNumX = 1;
          worldObject.pos.x += worldObject.size.x;
          worldObject.size.x = Math.abs(worldObject.size.x);
          if (worldObject.type.startsWith('circular')) {
            worldObject.radius = worldObject.size.x / 2;
            worldObject.size.y = worldObject.size.x;
          }
        }
      }
    }
    if (borderNumX == 1) {
      if (object == -1) {
        world.getArea().size.x = Math.round(mousePos.x);
      } else {
        let worldObject = world.getArea().objects[object]
        if (Math.round(mousePos.x - worldObject.pos.x) != 0) {
          if (keys[17]) {
            worldObject.size.x = Math.round(Math.round(mousePos.x - worldObject.pos.x) / snap) * (snap);
          } else {
            worldObject.size.x = Math.round(mousePos.x - worldObject.pos.x);
          }
          if (worldObject.type.startsWith('circular')) {
            worldObject.radius = worldObject.size.x / 2;
            worldObject.size.y = worldObject.size.x;
          }
        }
        if (worldObject.size.x < 0) {
          borderNumX = 0;
          worldObject.pos.x += worldObject.size.x;
          worldObject.size.x = Math.abs(worldObject.size.x);
          if (worldObject.type.startsWith('circular')) {
            worldObject.radius = worldObject.size.x / 2;
            worldObject.size.y = worldObject.size.x;
          }
        }
      }
    }
  }
  if (borderIsSelectedY) {
    for (var i = 0; i < Object.keys(gui.__folders).length; i++) {
      var key = Object.keys(gui.__folders)[i];
      for (var j in gui.__folders[key].__folders) {
        for (var k in gui.__folders[key].__folders[j].__controllers) {
          gui.__folders[key].__folders[j].__controllers[k].updateDisplay();
        }
      }
    }
    if (borderNumY == 0) {
      if (object == -1) {

      } else {
        let worldObject = world.getArea().objects[object]
        if (worldObject.size.y + Math.round(worldObject.pos.y - Math.round(mousePos.y)) != 0) {
          var before = worldObject.pos.y;
          if (keys[17]) {
            worldObject.pos.y = Math.round(Math.round(mousePos.y) / snap) * (snap);
          } else {
            worldObject.pos.y = Math.round(mousePos.y);
          }
          worldObject.size.y += Math.round(before - worldObject.pos.y);
          if (worldObject.type.startsWith('circular')) {
            worldObject.radius = worldObject.size.y / 2;
            worldObject.size.x = worldObject.size.y;
          }
        }
        if (worldObject.size.y < 0) {
          borderNumY = 1;
          worldObject.pos.y += worldObject.size.y;
          worldObject.size.y = Math.abs(worldObject.size.y);
          if (worldObject.type.startsWith('circular')) {
            worldObject.radius = worldObject.size.y / 2;
            worldObject.size.x = worldObject.size.y;
          }
        }
      }
    }
    if (borderNumY == 1) {
      if (object == -1) {
        world.getArea().size.y = Math.round(mousePos.y);
      } else {
        let worldObject = world.getArea().objects[object]
        if (Math.round(mousePos.y - worldObject.pos.y) != 0) {
          if (keys[17]) {
            worldObject.size.y = Math.round(Math.round(mousePos.y - worldObject.pos.y) / snap) * (snap);
          } else {
            worldObject.size.y = Math.round(mousePos.y - worldObject.pos.y);
          }
          if (worldObject.type.startsWith('circular')) {
            worldObject.radius = worldObject.size.y / 2;
            worldObject.size.x = worldObject.size.y;
          }
        }
        if (worldObject.size.y < 0) {
          borderNumY = 0;
          worldObject.pos.y += worldObject.size.y;
          worldObject.size.y = Math.abs(worldObject.size.y);
          if (worldObject.type.startsWith('circular')) {
            worldObject.radius = worldObject.size.y / 2;
            worldObject.size.x = worldObject.size.y;
          }
        }
      }
    }
  }
  //if (object != -1) {// global fixing from transformations
  // global fixing from transformations
  // for (let obj of world.getArea().objects) {
  //   if (obj.type.startsWith("moving")) {
  //     let dx = (obj.pos.x + obj.size.x / 2) - obj.points[0].pos.x;
  //     let dy = (obj.pos.y + obj.size.y / 2) - obj.points[0].pos.y;
  //     for (let point of obj.points) {
  //       point.pos.x += dx;
  //       point.pos.y += dy;
  //     }
  //     if (dx != 0 || dy != 0) {
  //       updateUI();
  //     }
  //     //movingObj.points[0].pos.x = movingObj.pos.x + movingObj.size.x / 2;
  //     //movingObj.points[0].pos.y = movingObj.pos.y + movingObj.size.y / 2;
  //   }
  //   if (obj.type.startsWith("rotatingLava")) {
  //     let dx = (obj.pos.x + obj.size.x / 2) - obj.point.x;
  //     let dy = (obj.pos.y + obj.size.y / 2) - obj.point.y;
  //     obj.point.x += dx;
  //     obj.point.y += dy;
  //     if (dx != 0 || dy != 0) {
  //       updateUI();
  //     }
  //   }
  // }
  //}
  world.draw();
  if (isSelecting) {
    context.fillStyle = 'rgba(45, 45, 45, 0.19)';
    context.fillRect(width / 2 + (selectingMousePos.x - cam.x) * scale, height / 2 + (selectingMousePos.y - cam.y) * scale, (mousePos.x - selectingMousePos.x) * scale, (mousePos.y - selectingMousePos.y) * scale);
    context.strokeStyle = 'rgba(45, 45, 45, 0.57)';
    context.strokeRect(width / 2 + (selectingMousePos.x - cam.x) * scale, height / 2 + (selectingMousePos.y - cam.y) * scale, (mousePos.x - selectingMousePos.x) * scale, (mousePos.y - selectingMousePos.y) * scale);
  }
  window.requestAnimationFrame(render);
}
window.requestAnimationFrame(render);
