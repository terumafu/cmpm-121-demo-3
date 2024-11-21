import leaflet from "leaflet";
import luck from "./luck.ts";

export interface Cell {
  readonly xindex: number;
  readonly yindex: number;
}

export interface Coin {
  cell: Cell;
  serial: number;
}

interface Momento<T> {
  toMomento(): T;
  fromMomento(momento: T): void;
}

export class Cache implements Momento<string> {
  coins: Coin[];
  constructor() {
    this.coins = [];
  }
  toMomento() {
    return JSON.stringify({
      coins: this.coins,
    });
  }

  fromMomento(momento: string) {
    this.coins = [];
    const coins = JSON.parse(momento);
    for (let n = 0; n < coins.length; n++) {
      const parsedcoin: Coin = { cell: coins[n].cell, serial: coins[n].serial };
      this.coins.push(parsedcoin);
    }
  }
}

export class Board {
  readonly tileWidth: number;
  readonly tileVisibilityRadius: number;
  private readonly knownCells: Map<string, Cell>;
  readonly cacheSpawnProbability: number;

  constructor(
    tileWidth: number,
    tileVisibilityRadius: number,
    spawnProb: number,
  ) {
    this.tileWidth = tileWidth;
    this.tileVisibilityRadius = tileVisibilityRadius;
    this.knownCells = new Map();
    this.cacheSpawnProbability = spawnProb;
  }

  private getCanonicalCell(cell: Cell): Cell {
    const { xindex, yindex } = cell;
    const key = [xindex, yindex].toString();
    //if not known, create a cell, if known, return cell
    if (!this.knownCells.has(key)) {
      this.knownCells.set(key, { xindex, yindex });
    }
    return this.knownCells.get(key)!;
  }

  getCellForPoint(point: leaflet.LatLng): Cell {
    return this.getCanonicalCell({
      xindex: point.lat / this.tileWidth,
      yindex: point.lng / this.tileWidth,
    });
  }

  getCellBounds(cell: Cell): leaflet.LatLngBounds {
    return leaflet.latLngBounds([
      [cell.xindex * this.tileWidth, cell.yindex * this.tileWidth],
      [(cell.xindex + 1) * this.tileWidth, (cell.yindex + 1) * this.tileWidth],
    ]);
  }

  getCellsNearPoint(point: leaflet.LatLng): Cell[] {
    const resultCells: Cell[] = [];
    const originCell = this.getCellForPoint(point);

    console.log(point);
    for (
      let x = -this.tileVisibilityRadius;
      x <= this.tileVisibilityRadius;
      x++
    ) {
      for (
        let y = -this.tileVisibilityRadius;
        y <= this.tileVisibilityRadius;
        y++
      ) {
        if (
          luck([originCell.xindex + x, originCell.xindex + y].toString()) <
            this.cacheSpawnProbability
        ) {
          //console.log("this happens at:" + originCell.xindex + x + "," + originCell.yindex + y);
          const latlng = {
            xindex: originCell.xindex + x,
            yindex: originCell.yindex + y,
          };
          resultCells.push(this.getCanonicalCell(latlng));
        }
        //resultCells.push(this.getCanonicalCell({xindex: originCell.xindex + x, yindex: originCell.yindex + y}));
        console.log(originCell.xindex + x);
        console.log(originCell.yindex + y);
      }
    }
    //console.log(resultCells);
    return resultCells;
  }
}
