// @deno-types="npm:@types/leaflet@^1.9.14"
import leaflet from "leaflet";

// Style sheets
import "leaflet/dist/leaflet.css";
import "./style.css";

// Fix missing marker images
import "./leafletWorkaround.ts";

// Deterministic random number generator
import luck from "./luck.ts";

const OAKES_CLASSROOM = leaflet.latLng(36.98949379578401, -122.06277128548504);

const GAMEPLAY_ZOOM_LEVEL = 19;
const TILE_DEGREES = 1e-4;
const NEIGHBORHOOD_SIZE = 8;
const CACHE_SPAWN_PROBABILITY = 0.1;

interface Cell {
  xCoord: number;
  yCoord: number;
  coins: number;
  index: number;
  decrement_points(): void;
  increment_points(): void;
}
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
const playerMarker = leaflet.marker(OAKES_CLASSROOM);
playerMarker.bindTooltip("That's you!");
playerMarker.addTo(map);

// Display the player's points
let playerPoints = 0;
const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!; // element `statusPanel` is defined in index.html
statusPanel.innerHTML = "No points yet...";

// Add caches to the map by cell numbers
function spawnCache(i: number, j: number, cell: Cell) {
  // Convert cell numbers into lat/lng bounds
  const origin = OAKES_CLASSROOM;

  //bounds of the rectangle created
  const bounds = leaflet.latLngBounds([
    [origin.lat + i * TILE_DEGREES, origin.lng + j * TILE_DEGREES],
    [origin.lat + (i + 1) * TILE_DEGREES, origin.lng + (j + 1) * TILE_DEGREES],
  ]);

  // Add a rectangle to the map to represent the cache
  const rect = leaflet.rectangle(bounds); // takes in a latLngBounds Object as coordinates for a rectangle
  rect.addTo(map);

  // Handle interactions with the cache
  rect.bindPopup(() => {
    // Each cache has a random point value, mutable by the player

    // The popup offers a description and button
    const popupDiv = document.createElement("div");
    popupDiv.innerHTML = `
                <div>There is a cache here at "${i},${j}". It has value <span id="value">${cell.coins}</span>.</div>
                <button id="withdraw">withdraw</button><button id="deposit">deposit</button>`;

    // Clicking the button decrements the cache's value and increments the player's points
    popupDiv
      .querySelector<HTMLButtonElement>("#withdraw")!
      .addEventListener("click", () => {
        cell.decrement_points();
        popupDiv.querySelector<HTMLSpanElement>("#value")!.innerHTML = cell
          .coins.toString();
        playerPoints++;

        statusPanel.innerHTML = `${playerPoints} points accumulated`;
      });

    popupDiv
      .querySelector<HTMLButtonElement>("#deposit")!
      .addEventListener("click", () => {
        cell.increment_points();
        popupDiv.querySelector<HTMLSpanElement>("#value")!.innerHTML = cell
          .coins.toString();

        playerPoints--;

        statusPanel.innerHTML = `${playerPoints} points accumulated`;
      });

    return popupDiv;
  });
}
const celldict = [];
// Look around the player's neighborhood for caches to spawn
for (let i = -NEIGHBORHOOD_SIZE; i < NEIGHBORHOOD_SIZE; i++) {
  for (let j = -NEIGHBORHOOD_SIZE; j < NEIGHBORHOOD_SIZE; j++) {
    // If location i,j is lucky enough, spawn a cache!
    if (luck([i, j].toString()) < CACHE_SPAWN_PROBABILITY) {
      //create_unique_string(i,j)
      const currlength: number = celldict.length;
      celldict.push(create_cell(i, j, currlength));
      spawnCache(i, j, celldict[currlength]);
    }
  }
}

function _create_unique_string(num1: number, num2: number): string {
  return num1 + ":" + num2;
}
function create_cell(x: number, y: number, index: number) {
  const newCell: Cell = {
    xCoord: x,
    yCoord: y,
    coins: Math.floor(luck([x, y, "initialValue"].toString()) * 100),
    index: index,
    decrement_points() {
      this.coins -= 1;
    },
    increment_points() {
      this.coins += 1;
    },
  };
  return newCell;
}
