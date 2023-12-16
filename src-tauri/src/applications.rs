use std::path::PathBuf;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct App {
    pub name: String,
    pub icon: String,
    pub path: String,
}

#[derive(Deserialize, Debug, Clone)]
pub struct AppInfo {
    #[serde(rename = "CFBundleName")]
    pub bundle_name: String,
    #[serde(rename = "CFBundleIconFile")]
    pub icon: String,
}

impl App {
    fn read_from_info_plist(app_path: &PathBuf) -> anyhow::Result<Self> {
        let info_plist_path = app_path.join("Contents/Info.plist");
        let mut file = std::fs::File::open(&info_plist_path)?;
        let app_info: AppInfo = plist::from_reader(&mut file)?;
        Ok(Self {
            name: app_info.bundle_name,
            icon: app_info.icon,
            path: app_path.to_str().unwrap().to_string(),
        })
    }
}

const APPLICATION_PATH: &str = "/Applications";

pub fn get_all_apps() -> anyhow::Result<Vec<App>> {
    let dir = std::fs::read_dir(APPLICATION_PATH)?;
    let mut result = vec![];
    for entry in dir {
        let entry = entry?;
        if entry.file_type()?.is_file() {
            continue;
        }
        let name = entry.file_name();
        let name = name.to_str().unwrap();
        if !name.ends_with(".app") {
            continue;
        }
        let app_path = PathBuf::from(APPLICATION_PATH).join(name);
        // println!("app_path={app_path:?}");
        let app = match App::read_from_info_plist(&app_path) {
            Ok(app) => app,
            Err(_) => continue, // ignore this app
        };
        result.push(app);
    }
    Ok(result)
}

#[cfg(test)]
mod tests {
    use super::get_all_apps;

    #[test]
    fn test_get_all_apps() {
        let apps = get_all_apps();
        println!("{apps:#?}");
    }
}
