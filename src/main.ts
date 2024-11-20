// @deno-types="npm:@types/leaflet@^1.9.14"
import leaflet from "leaflet";

// Style sheets
import "leaflet/dist/leaflet.css";
import "./style.css";

// Fix missing marker images
import "./leafletWorkaround.ts";

// Deterministic random number generator
import luck from "./luck.ts";

import { Board, Coin } from "./board.ts";
const OAKES_CLASSROOM = leaflet.latLng(36.98949379578401, -122.06277128548504);
const NULL_ISLAND = leaflet.latLng(0, 0);
const GAMEPLAY_ZOOM_LEVEL = 19;
const TILE_DEGREES = 1e-4;
const NEIGHBORHOOD_SIZE = 8;
const CACHE_SPAWN_PROBABILITY = 0.1;

const board = new Board(
  TILE_DEGREES,
  NEIGHBORHOOD_SIZE,
  CACHE_SPAWN_PROBABILITY,
);
const cacheMap = new Map<string, Coin[]>();

const playerCoins: Coin[] = [];
// Create the map (element with id "map" is defined in index.html)
const map = leaflet.map(document.getElementById("map")!, {
  center: OAKES_CLASSROOM,
  zoom: GAMEPLAY_ZOOM_LEVEL,
  minZoom: GAMEPLAY_ZOOM_LEVEL,
  maxZoom: GAMEPLAY_ZOOM_LEVEL,
  zoomControl: false,
  scrollWheelZoom: false,
});

// Populate the map with a background tile layer
leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

// Add a marker to represent the player
const playerMarker = leaflet.marker(NULL_ISLAND);
playerMarker.bindTooltip("That's you!");
playerMarker.addTo(map);

//move player
playerMarker.setLatLng(
  leaflet.latLng(OAKES_CLASSROOM),
);

//load cells near player
board.getCellsNearPoint(playerMarker.getLatLng()).forEach((cell) => {
  spawnCache(cell.xindex, cell.yindex);
});

// Display the player's points
const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!; // element `statusPanel` is defined in index.html
statusPanel.innerHTML = "No points yet...";

function getCacheKey(x: number, y: number): string {
  return `${x},${y}`;
}

// Add caches to the map by cell numbers
function spawnCache(i: number, j: number) {
  // Convert cell numbers into lat/lng bounds

  //get cell for point
  const cell = board.getCellForPoint(
    leaflet.latLng(
      i * TILE_DEGREES,
      j * TILE_DEGREES,
    ),
  );
  console.log(cell);
  //bounds of the rectangle created

  const bounds = board.getCellBounds(cell);

  // Add a rectangle to the map to represent the cache
  const rect = leaflet.rectangle(bounds); // takes in a latLngBounds Object as coordinates for a rectangle
  rect.addTo(map);
  //console.log(rect)
  //create cache if there is no cache
  const cacheKey = getCacheKey(cell.xindex, cell.yindex);
  if (!cacheMap.has(cacheKey)) { //if it doenst have an element tied to the key, add an empty array
    cacheMap.set(cacheKey, []);
    for (
      let n = 0;
      n < luck([cell.xindex, cell.yindex, "initialValue"].toString()) * 5;
      n++
    ) {
      cacheMap.get(cacheKey)!.push({ cell: cell, serial: n });
    }
  }

  // Handle interactions with the cache
  rect.bindPopup(() => {
    // Each cache has a random point value, mutable by the player
    const coins: Coin[] = cacheMap.get(cacheKey)!;
    // The popup offers a description and button
    const popupDiv = document.createElement("div");
    popupDiv.innerHTML = `
                <div>There is a cache here at "${
      (cell.xindex * TILE_DEGREES).toFixed(2)
    },${
      (cell.yindex * TILE_DEGREES).toFixed(2)
    }".  It has coins: <span id='value'></span></div>
                
                
                <button id="withdraw">withdraw</button><button id="deposit">deposit</button>`;
    const popupText = popupDiv.querySelector<HTMLSpanElement>("#value");
    update_cache_coinlist(popupText!, coins);
    // Clicking the button decrements the cache's value and increments the player's points
    popupDiv
      .querySelector<HTMLButtonElement>("#withdraw")!
      .addEventListener("click", () => {
        if (coins.length > 0) {
          console.log(coins);
          playerCoins.push(coins.pop()!);
          console.log(coins);
          //takes the largest serial number coin

          // Update coin list in cache
          update_cache_coinlist(popupText!, coins);

          //up;date player coin list
          update_player_coinlist();
        }
      });

    popupDiv
      .querySelector<HTMLButtonElement>("#deposit")!
      .addEventListener("click", () => {
        if (playerCoins.length > 0) {
          coins.push(playerCoins.pop()!);

          // Update coin list in cache
          update_cache_coinlist(popupText!, coins);

          //up;date player coin list
          update_player_coinlist();
        }
      });

    return popupDiv;
  });
}
function update_cache_coinlist(htmlSE: HTMLSpanElement, coinList: Coin[]) {
  htmlSE.innerHTML = "<br />";
  for (let i = 0; i < coinList.length; i++) {
    htmlSE!.innerHTML += coin_to_string(coinList[i]);
  }
  console.log(htmlSE.innerHTML);
}
function update_player_coinlist() {
  statusPanel.innerHTML = "";
  for (let i = 0; i < playerCoins.length; i++) {
    statusPanel!.innerHTML += coin_to_string(playerCoins[i]);
  }
}
function coin_to_string(coin: Coin) {
  return coin.cell.xindex.toFixed(2) + ":" + coin.cell.yindex.toFixed(2) + "#" +
    coin.serial + "<br />";
}

//const currLoc = playerMarker.getLatLng()
// Look around the player's neighborhood for caches to spawn
//for (let i = -NEIGHBORHOOD_SIZE; i < NEIGHBORHOOD_SIZE; i++) {
//for (let j = -NEIGHBORHOOD_SIZE; j < NEIGHBORHOOD_SIZE; j++) {
// If location i,j is lucky enough, spawn a cache!

//const currLat = currLoc.lat + i;
//const currLong = currLoc.lng + j;
//if (luck([i, j].toString()) < CACHE_SPAWN_PROBABILITY) {
//create_unique_string(i,j)
//spawnCache(currLat, currLong);
//console.log(i,j)
//}
//}
//}
