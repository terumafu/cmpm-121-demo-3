// todo
const app: HTMLDivElement = document.querySelector("#app")!;
const button = document.createElement("button");
button.innerHTML = "click me!";
button.addEventListener("click", () => {
  alert("you clicked the button");
});
app.append(button);
