// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod applications;

use applications::get_all_apps;
use serde::Serialize;
use tantivy::{
    collector::TopDocs,
    doc,
    query::TermQuery,
    schema::{IndexRecordOption, Schema, TextFieldIndexing, TextOptions},
    tokenizer::{self, NgramTokenizer, TextAnalyzer},
    Index, Term,
};
use tauri::{App, AppHandle, GlobalShortcutManager, Manager};
use window_vibrancy::NSVisualEffectMaterial;

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![search, launch_application])
        .setup(setup_app)
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn setup_app(app: &mut App) -> Result<(), Box<dyn std::error::Error>> {
    let app_handle = app.app_handle();
    let main_window = app.get_window("main").unwrap();
    #[cfg(debug_assertions)]
    main_window.open_devtools();

    window_vibrancy::apply_vibrancy(
        &main_window,
        NSVisualEffectMaterial::HudWindow,
        None,
        Some(8.0),
    )?;
    window_shadows::set_shadow(&main_window, false).unwrap();

    let window = main_window.clone();
    let mut shortcut_manager = app_handle.global_shortcut_manager();
    shortcut_manager.register("Alt+Space", move || {
        if window.is_visible().unwrap() {
            let _ = window.hide();
        } else {
            let _ = window.show();
            let _ = window.set_focus();
        }
    })?;
    let window = main_window.clone();
    shortcut_manager.register("Esc", move || {
        let _ = window.hide();
    })?;

    Ok(())
}

#[derive(Serialize, Debug, Clone)]
#[serde(tag = "type", rename_all = "camelCase")]
enum SearchResultItem {
    App(applications::App),
}

#[tauri::command]
fn search(app: AppHandle, keyword: String) -> Result<Vec<SearchResultItem>, tauri::InvokeError> {
    let mut schema_builder = Schema::builder();
    let field_name = schema_builder.add_text_field(
        "name",
        TextOptions::default()
            .set_indexing_options(
                TextFieldIndexing::default()
                    .set_tokenizer("ngram")
                    .set_index_option(IndexRecordOption::WithFreqsAndPositions),
            )
            .set_stored(),
    );
    let field_type = schema_builder.add_text_field("type", TextOptions::default().set_stored());

    let schema = schema_builder.build();
    let index = Index::create_in_ram(schema);
    index.tokenizers().register(
        "ngram",
        TextAnalyzer::builder(NgramTokenizer::all_ngrams(1, 8).unwrap())
            .filter(tokenizer::LowerCaser)
            .build(),
    );

    let all_apps = get_all_apps().map_err(|e| tauri::InvokeError::from_anyhow(e))?;
    let mut index_writer = index.writer(20_000_000).unwrap();
    for app in all_apps.iter() {
        index_writer
            .add_document(doc! {
                field_name => app.name.as_str(),
                field_type => "app",
            })
            .unwrap();
    }
    index_writer.commit().unwrap();

    let searcher = index.reader().unwrap().searcher();
    let query = TermQuery::new(
        Term::from_field_text(field_name, &keyword.to_lowercase()),
        IndexRecordOption::WithFreqsAndPositions,
    );
    let top_docs = searcher.search(&query, &TopDocs::with_limit(5)).unwrap();
    println!("search result of {keyword:?}:");

    let mut result = vec![];
    for (score, doc_addr) in top_docs {
        let doc = searcher.doc(doc_addr).unwrap();
        let name = doc.field_values()[0].value.as_text().unwrap();
        let item_type = doc.field_values()[1].value.as_text().unwrap();
        println!("score={score} name={name:?} type={item_type:?}");
        let item = match item_type {
            "app" => {
                let app = all_apps.iter().find(|a| a.name.as_str() == name).unwrap();
                SearchResultItem::App(app.clone())
            }
            _ => continue,
        };
        result.push(item);
    }
    Ok(result)
}

#[tauri::command]
async fn launch_application(app_path: &str) -> Result<(), String> {
    let _ = std::process::Command::new("open").arg(app_path).spawn();
    Ok(())
}
