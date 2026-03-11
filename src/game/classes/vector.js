export default class Vector {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
  dist(vec) {
    return Math.sqrt((vec.x - this.x) ** 2 + (vec.y - this.y) ** 2);
  }
  clone() {
    return new Vector(this.x, this.y);
  }
}
