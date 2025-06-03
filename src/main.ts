import { exists, readDir } from '@tauri-apps/plugin-fs';
import { homeDir, join } from '@tauri-apps/api/path';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { openPath } from '@tauri-apps/plugin-opener';

// Get html ui elements
const notification = document.querySelector("#feedback") as HTMLElement
const indexDirectories = document.querySelector("#indexDirectories") as HTMLElement
const currentDirectory = document.querySelector("#currentDirectory") as HTMLInputElement
const button_selectDirectory = document.querySelector("#changeDirectory") as HTMLButtonElement
const button_selectDirectory_Default = document.querySelector("#changeDirectoryDefault") as HTMLButtonElement


// Initialize path variables
notification.innerHTML = "Getting Paths...";
let homePath;
let appdataPath;
let roamingPath = appdataPath + "\\Roaming"
let minecraftPath = roamingPath + "\\.minecraft"
let assetsPath = minecraftPath + "\\assets"
let indexesPath = assetsPath + "\\indexes"

// Top-level async is not supported everywhere, so we need to use a function
async function getHomePath() {
  homePath = await homeDir();
  appdataPath = homePath.replace(/\\[^\\]+\\$/, "\\") + "\\AppData";
  roamingPath = appdataPath + "\\Roaming"
  minecraftPath = roamingPath + "\\.minecraft"
  assetsPath = minecraftPath + "\\assets"
  indexesPath = assetsPath + "\\indexes"
  UpdateUi();
}

getHomePath();
UpdateUi();

// The actual extraction logic (Calls rust function, cause its much faster than JS)
async function Extract(indexFilePath: string) {
  // Prompt the user to select a location to extract too.
  notification.innerHTML = "Select a extract location";
  const output = await open({
    title: "Select Extract Location",
    multiple: false,
    directory: true,
  });
  notification.innerHTML = output ?? "No extract location selected";
  // if none location is abort
  if (!output) {
    AnimateNotification();
    return;
  }
  AnimateNotification();
  notification.innerHTML = `Extracting...`;

  // Do the actual extraction logic
  let t = await invoke('extract', { path: output, index: indexFilePath });
  if (t === "success") {
    notification.innerHTML = `Extracted success : ${output}</a>`;
    // open the extracted directory in the file explorer
    await openPath(output);
  } else {
    notification.innerHTML = `Error: ${t}`;
    return;
  }
}

function MinecraftPathExists(exists: boolean) {
  if (!exists) {
    indexDirectories.innerHTML = "";
    indexDirectories.innerHTML = "No indexes found in the selected directory.";
  }
}

// Update Uis
async function UpdateUi() {
  indexDirectories.innerHTML = "";
  indexesPath = assetsPath + "\\indexes";
  const indexesExists = await exists(indexesPath);
  if (!indexesExists) {
    currentDirectory.value = "invalid";
    MinecraftPathExists(false);
    return;
  }
  currentDirectory.value = assetsPath;
  
  const indexes = await readDir(indexesPath, {});
  
  if (indexes.length === 0) {
    indexDirectories.innerHTML = "No indexes found in the selected directory.";
    MinecraftPathExists(false);
    return;
  }
  indexDirectories.innerHTML = "";
  MinecraftPathExists(true);

  // buttons per index file
  for (let i = 0; i < indexes.length; i++) {
    if (indexes[i].isFile) {
      let fileName = indexes[i].name;

      // Hardcoded values based on https://minecraft.wiki/w/Tutorial:Sound_directory
      // If the file name is not a number, display it as is (probably the version)
      let displayName = fileName.replace(".json", "");
      if (parseInt(displayName) == displayName as any) {
        switch (displayName) {
          case "2": displayName = " 1.19.3"; break;
          case "5": displayName = " 1.20"; break;
          case "8": displayName = " 1.20.2"; break;
          case "12": displayName = " 1.20.3"; break;
          case "16": displayName = " 1.20.5"; break;
          case "17": displayName = " 1.21"; break;
          case "18": displayName = " 1.21.2"; break;
          case "19": displayName = " 1.21.4"; break;
          case "24": displayName = " 1.21.5"; break;
          default: displayName = " Unknown"; break;
        }
      }
      const filePath = await join(indexesPath, fileName);
      const link = document.createElement("button");
      link.classList.add("index-link");
      link.innerHTML = `Extract ${fileName} <span>${displayName}</span>`;

      // Clicking the button to extract the index file
      link.addEventListener("click", async () => {
        link.disabled = true;
        link.textContent = `Extracting...`;
        let s = 0;
        let sd = setInterval(() => {
          link.textContent = `Extracting ${fileName}`;
          s = s + 1;
          s = s % 3;
          if (s === 0) {
            link.textContent = `Extracting ${fileName}.`;
          } else if (s === 1) {
            link.textContent = `Extracting ${fileName}..`;
          } else if (s === 2) {
            link.textContent = `Extracting ${fileName}...`;
          }
        }, 200);
        await Extract(filePath);
        sd && clearInterval(sd);
        link.textContent = `Extract ${fileName}`;
        link.disabled = false;

      });
      indexDirectories.appendChild(link);
    }
  }
}

// Set to default Minecraft assets directory
button_selectDirectory_Default.addEventListener("click", async () => {
  assetsPath = minecraftPath + "\\assets";
  UpdateUi()
})

// Select Minecraft assets directory
button_selectDirectory.addEventListener("click", async () => {

  // Prompt user to select the directory
  let output = await open({
    title: "Select Minecraft Assets Directory",
    multiple: false,
    directory: true,
  });
  notification.innerHTML = output ?? "No directory selected";
  AnimateNotification();

  // if none selected, return
  if (!output) {
    currentDirectory.value = "invalid";
    MinecraftPathExists(false);
    return;
  }

  // check if it is asset folder, if not, look for one
  if (!output.endsWith("\\assets")) {
    const assetsExists = await exists(output + "\\assets");
    if (assetsExists) {
      output = output + "\\assets";
    }
  }
  assetsPath = output;
  UpdateUi();
})


// Change current directory by typing in the input field
currentDirectory.addEventListener("change", async (_) => {
  if (currentDirectory.value === "invalid") {
    MinecraftPathExists(false);
    return;
  }
  assetsPath = currentDirectory.value;
  UpdateUi();
});


// Animate notification
function AnimateNotification() {
  notification.classList.add("show");
  requestAnimationFrame(() => {
    const styile = getComputedStyle(notification);
    const duration = parseFloat(styile.animationDuration) * 1000 + 1000; // Convert to milliseconds
    setTimeout(() => {
      notification.classList.remove("show");
    }, duration);
  });
}


notification.innerHTML = "";


