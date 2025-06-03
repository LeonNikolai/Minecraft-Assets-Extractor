use serde::Deserialize;
use std::collections::HashMap;
use std::env;
use std::fs;
use std::io::{self};
use std::path::PathBuf;

#[derive(Debug, Deserialize)]
struct AssetIndex {
    objects: HashMap<String, AssetEntry>,
}

#[derive(Debug, Deserialize)]
struct AssetEntry {
    hash: String,
    size: u64,
}

fn extract_from_index(outpath : String, index: String) -> io::Result<()> {
    // A lot of assumtions about the folder structure, but its probably fine.
    let index_file_path = PathBuf::from(index);
    let assets_dir = index_file_path.parent().unwrap().to_path_buf().parent().unwrap().to_path_buf();
    let name = index_file_path.file_stem().unwrap().to_str().unwrap();
    let directory_name = format!("{}_assets", name);
    let output_directiory = PathBuf::from(outpath).join(directory_name);

    if !output_directiory.exists() {
        fs::create_dir_all(&output_directiory)?;
    }

    let objects_directory = assets_dir.join("objects");

    fs::create_dir_all(&output_directiory)?;

    let index_file_content = fs::read_to_string(index_file_path)?;
    let asset_index: AssetIndex = serde_json::from_str(&index_file_content).expect("Invalid JSON");

    // Extraction logic basically 
    // Based on https://minecraft.wiki/w/Tutorial:Sound_directory
    for (file_path, entry) in asset_index.objects {
        let hash = entry.hash;
        let subdir = &hash[..2];
        let source_path = objects_directory.join(subdir).join(&hash);
        let destination_path = output_directiory.join(&file_path);
        let destination_dir = destination_path.parent().unwrap();
        fs::create_dir_all(destination_dir)?;
        fs::copy(&source_path, &destination_path)?;
        println!("Extracted: {}", file_path);
    }

    Ok(())
}


#[tauri::command]
async fn extract(path: &str, index:&str) -> Result<String, ()> {
    println!("Greeting: {}", path);
    match extract_from_index(path.to_string(),index.to_string()) {
        Ok(_) => {
            println!("Assets extracted successfully.");
            return Ok(format!("success"));
        }
        Err(e) => {
            eprintln!("Error extracting assets: {}", e);
            return Ok(format!("{}",e));
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![extract])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
