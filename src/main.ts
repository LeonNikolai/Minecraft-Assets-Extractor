

import * as fs from '@tauri-apps/plugin-fs';
import * as path from '@tauri-apps/api/path';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { openPath } from '@tauri-apps/plugin-opener';
// when using `"withGlobalTauri": true`, you may use
// const { exists, BaseDirectory } = window.__TAURI__.fs;

// Check if the `$APPDATA/avatar.png` file exists


const notification = document.querySelector("#feedback") as HTMLElement
const indexDirectories = document.querySelector("#indexDirectories") as HTMLElement
const currentDirectory = document.querySelector("#currentDirectory") as HTMLInputElement
const button_selectDirectory = document.querySelector("#changeDirectory") as HTMLButtonElement
const button_selectDirectory_Default = document.querySelector("#changeDirectoryDefault") as HTMLButtonElement

currentDirectory.addEventListener("change", async (_) => {
  if (currentDirectory.value === "invalid") {
    MinecraftPathExists(false);
    return;
  }
  assetsPath = currentDirectory.value;
  UpdatePaths();
});

notification.innerHTML = "Getting Paths...";
let homePath;
let appdataPath;
let roamingPath = appdataPath + "\\Roaming"
let minecraftPath = roamingPath + "\\.minecraft"
let assetsPath = minecraftPath + "\\assets"
let indexesPath = assetsPath + "\\indexes"
async function getHomePath() {
  homePath = await path.homeDir();
  appdataPath = homePath.replace(/\\[^\\]+\\$/, "\\") + "\\AppData";
  roamingPath = appdataPath + "\\Roaming"
  minecraftPath = roamingPath + "\\.minecraft"
  assetsPath = minecraftPath + "\\assets"
  indexesPath = assetsPath + "\\indexes"
  UpdatePaths();
}
getHomePath();

UpdatePaths();

function MinecraftPathExists(exists: boolean) {
  if (!exists) {
    indexDirectories.innerHTML = "";
    indexDirectories.innerHTML = "No indexes found in the selected directory.";
  }
}
async function UpdatePaths() {
  indexDirectories.innerHTML = "";
  indexesPath = assetsPath + "\\indexes";
  const indexesExists = await fs.exists(indexesPath);
  if (!indexesExists) {
    currentDirectory.value = "invalid";
    MinecraftPathExists(false);
    return;
  }
  MinecraftPathExists(true);
  currentDirectory.value = assetsPath;

  const indexes = await fs.readDir(indexesPath, {});

  if (indexes.length === 0) {
    indexDirectories.innerHTML = "No indexes found in the selected directory.";
    MinecraftPathExists(false);
    return;
  }
  indexDirectories.innerHTML = "";
  for (let i = 0; i < indexes.length; i++) {
    if (indexes[i].isFile) {
      let fileName = indexes[i].name;
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
      const filePath = await path.join(indexesPath, fileName);
      const link = document.createElement("button");
      link.classList.add("index-link");
      link.innerHTML = `Extract ${fileName} <span>${displayName}</span>`;
      console.log("", filePath)
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
button_selectDirectory_Default.addEventListener("click", async () => {
  assetsPath = minecraftPath + "\\assets";
  UpdatePaths()
})
button_selectDirectory.addEventListener("click", async () => {
  let output = await open({
    title: "Select Minecraft Assets Directory",
    multiple: false,
    directory: true,
  });
  notification.innerHTML = output ?? "No directory selected";
  AnimateNotification();
  if (!output) {
    currentDirectory.value = "invalid";
    MinecraftPathExists(false);
    return;
  }
  // check if the selected directory is a valid Minecraft assets directory
  if (!output.endsWith("\\assets")) {
    // check if the selected directory contains asset folder
    const assetsExists = await fs.exists(output + "\\assets");
    if (assetsExists) {
      output = output + "\\assets";
    }
  }

  assetsPath = output;
  UpdatePaths();
})

function AnimateNotification() {
  notification.classList.add("show");
  requestAnimationFrame(() => {
    const styile = getComputedStyle(notification);
    const duration = parseFloat(styile.animationDuration) * 1000 + 1000; // Convert to milliseconds
    setTimeout(() => {
      console.log("remove class :", duration);
      notification.classList.remove("show");
    }, duration);
  });
}
notification.innerHTML = "";
async function Extract(indexFilePath: string) {
  console.log("Run")
  notification.innerHTML = "Select a file"
  const output = await open({
    title: "Select Extract Location",
    multiple: false,
    directory: true,
  });
  notification.innerHTML = output ?? "No extract location selected";
  if (!output) {
    AnimateNotification();
    return;
  }
  notification.innerHTML = `Extracting ${indexFilePath}...`;
  AnimateNotification();
  notification.innerHTML = `Extracting...`;
  let t = await invoke('extract', { path: output, index: indexFilePath });
  if (t === "success") {
    notification.innerHTML = `Extracted success : ${output}</a>`;
    await openPath(output);
  } else {
    notification.innerHTML = `Error: ${t}`;
    return;
  }
  console.log("Done")
}