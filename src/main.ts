// @deno-types="npm:@types/leaflet@^1.9.14"
import leaflet, { LatLngExpression } from "leaflet";

// Style sheets
import "leaflet/dist/leaflet.css";
import "./style.css";

// Fix missing marker images
import "./leafletWorkaround.ts";

// Deterministic random number generator
import luck from "./luck.ts";

import { Board, Cache, Coin } from "./board.ts";
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
const cacheMap = new Map<string, Cache>();
let momentoMap: Map<string, string>;
let playerCoins: Coin[];
let polyLineMap: LatLngExpression[][];
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

initialize_movement_buttons();

function move_player(lat: number, long: number) {
  const fromCoords = playerMarker.getLatLng();
  playerMarker.setLatLng(
    {
      lat: playerMarker.getLatLng().lat + lat,
      lng: playerMarker.getLatLng().lng + long,
    },
  );
  const toCoords = playerMarker.getLatLng();
  polyLineMap.push([fromCoords, toCoords]);
  redrawMap();
}

function redrawMap() {
  map.eachLayer((layer) => {
    if (!(layer instanceof leaflet.TileLayer)) {
      map.removeLayer(layer);
    }
  });
  cache_map_to_momento(); // turns the cache map into momento strings, cache objects that are not on screen get sent into the momento map until revealed
  playerMarker.addTo(map);
  map.setView(playerMarker.getLatLng(), GAMEPLAY_ZOOM_LEVEL);
  for (let i = 0; i < polyLineMap.length; i++) {
    leaflet.polyline(polyLineMap[i], { color: "red" }).addTo(map);
  }
  load_cells();
}

function cache_map_to_momento() {
  cacheMap.forEach((_value, key) => {
    const compressed_cache = cacheMap.get(key)!.toMomento();
    momentoMap.set(key, compressed_cache);
  });
}

function initialize_movement_buttons() {
  [
    { id: "north", lat: TILE_DEGREES, lng: 0 },
    { id: "south", lat: -TILE_DEGREES, lng: 0 },
    { id: "west", lat: 0, lng: -TILE_DEGREES },
    { id: "east", lat: 0, lng: TILE_DEGREES },
  ].forEach(({ id, lat, lng }) => {
    document
      .getElementById(id)!
      .addEventListener("click", () => move_player(lat, lng));
  });
}
map.on("locationfound", onLocationFound);
function onLocationFound(e: leaflet.LocationEvent) {
  playerMarker.setLatLng(e.latlng);
  console.log("locationfound");
  // newPolyline(playerMarker.getLatLng());
  //bus.dispatchEvent(new Event("player-moved"));
  map.setView(playerMarker.getLatLng(), GAMEPLAY_ZOOM_LEVEL);
  redrawMap();
}

// initializes location button
document.getElementById("location")!.addEventListener("click", () => {
  map.locate({ setView: true, watch: true, maxZoom: GAMEPLAY_ZOOM_LEVEL });
  console.log("button pressed");

  //playerMarker.setLatLng(location.options.center!);

  //map.on("locationfound", onLocationFound);
  //map.on("locationerror", onLocationError);
  //polylines.createPolyline();
});
//initializes reset button
document.getElementById("reset")!.addEventListener("click", () => {
  localStorage.clear();
  restorePlayerData();
});

//load cells near player
function load_cells() {
  board.getCellsNearPoint(playerMarker.getLatLng()).forEach((cell) => {
    spawnCache(cell.xindex, cell.yindex);
  });
}

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

  //bounds of the rectangle created

  const bounds = board.getCellBounds(cell);

  // Add a rectangle to the map to represent the cache
  const rect = leaflet.rectangle(bounds); // takes in a latLngBounds Object as coordinates for a rectangle
  rect.addTo(map);

  //create cache if there is no cache
  const cacheKey = getCacheKey(cell.xindex, cell.yindex);
  if (!momentoMap.has(cacheKey)) { // creates coins in cache
    cacheMap.set(cacheKey, new Cache());
    for (
      let n = 0;
      n < luck([cell.xindex, cell.yindex, "initialValue"].toString()) * 5;
      n++
    ) {
      cacheMap.get(cacheKey)!.coins.push({ cell: cell, serial: n });
    }
  } else {
    const newCache = new Cache();
    newCache.fromMomento(momentoMap.get(cacheKey)!);
    momentoMap.delete(cacheKey);
    //console.log(newCache)
    cacheMap.set(cacheKey, newCache);
  }

  // Handle interactions with the cache
  rect.bindPopup(() => {
    // Each cache has a random point value, mutable by the player
    const coins: Coin[] = cacheMap.get(cacheKey)!.coins;
    // The popup offers a description and button
    const popupDiv = document.createElement("div");
    popupDiv.innerHTML = `
                <div>There is a cache here at "${cell.xindex.toFixed(2)},${
      cell.yindex.toFixed(2)
    }".  It has coins: <span id='value'></span></div>
                
                
                <button id="withdraw">withdraw</button><button id="deposit">deposit</button>`;
    const popupText = popupDiv.querySelector<HTMLSpanElement>("#value");
    update_cache_coinlist(popupText!, coins);
    // Clicking the button decrements the cache's value and increments the player's points
    popupDiv
      .querySelector<HTMLButtonElement>("#withdraw")!
      .addEventListener("click", () => {
        if (coins.length > 0) {
          playerCoins.push(coins.pop()!);

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

          //update player coin list
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

globalThis.addEventListener("beforeunload", savePlayerData);
globalThis.addEventListener("load", restorePlayerData);

//i need to unload cachemap and then store momento map and playerCoins;

function savePlayerData() {
  console.log("this happens");
  cache_map_to_momento();
  localStorage.setItem("momento", JSON.stringify(momentoMap));
  console.log("this happens");
  stringifyMap("momento", momentoMap);
  localStorage.setItem("polyline", JSON.stringify(polyLineMap));

  localStorage.setItem("playerCoins", JSON.stringify(playerCoins));
  localStorage.setItem(
    "playerlocation",
    JSON.stringify({
      x: playerMarker.getLatLng().lat,
      y: playerMarker.getLatLng().lng,
    }),
  );
}
//turns a map into a dictionary so that it is easily stringified
function stringifyMap(name: string, map: Map<string, string>) {
  const obj: { [key: string]: string } = {};
  map.forEach((value, key) => {
    obj[key] = value;
  });

  const JSONString: string = JSON.stringify(obj);
  localStorage.setItem(name, JSONString);
}
//converts dictionary back into map
function unStringifyMap(name: string) {
  const obj = JSON.parse(localStorage.getItem(name)!)!;
  console.log(obj);
  for (const key in obj) {
    momentoMap.set(key, obj[key]);
  }
}
//called on loading in the page
function restorePlayerData() {
  momentoMap = new Map<string, string>();
  unStringifyMap("momento");
  console.log(momentoMap);
  console.log(localStorage.getItem("playerCoins"));

  if (
    localStorage.getItem("playerCoins") !== undefined &&
    localStorage.getItem("playerCoins") !== null
  ) {
    console.log("playercoins");
    playerCoins = JSON.parse(localStorage.getItem("playerCoins")!)!;
  } else {
    playerCoins = [];
  }
  console.log(localStorage.getItem("playerlocation") !== undefined);
  console.log(localStorage.getItem("playerlocation") !== null);
  if (
    localStorage.getItem("playerlocation") !== undefined &&
    localStorage.getItem("playerlocation") !== null
  ) {
    const temp = JSON.parse(localStorage.getItem("playerlocation")!)!;
    console.log(temp);
    playerMarker.setLatLng({
      lat: temp.x,
      lng: temp.y,
    });
  } else {
    console.log("location reset");
    playerMarker.setLatLng(OAKES_CLASSROOM);
  }
  if (
    localStorage.getItem("polyline") !== undefined &&
    localStorage.getItem("polyline") !== null
  ) {
    polyLineMap = JSON.parse(localStorage.getItem("polyline")!)!;
  } else {
    polyLineMap = [];
  }
  redrawMap();
  update_player_coinlist();
}
