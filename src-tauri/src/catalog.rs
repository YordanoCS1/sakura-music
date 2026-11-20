// Búsqueda en catálogos de Internet (iTunes / Deezer / MusicBrainz) desde el
// núcleo de la aplicación.
//
// El frontend no puede llamar directamente a Deezer (sin cabeceras CORS) ni a
// MusicBrainz (exige un User-Agent identificado): por eso estas peticiones se
// hacen aquí, con `reqwest`, y se devuelven como JSON estructurado.

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "snake_case")]
pub struct CatalogAlbum {
    pub source: String,
    pub id: String,
    pub title: String,
    pub artist: String,
    pub year: Option<String>,
    pub track_count: u32,
    pub cover_url: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "snake_case")]
pub struct CatalogAlbumTrack {
    pub id: Option<String>,
    pub source: String,
    pub title: String,
    pub artist: String,
    pub album: String,
    pub album_artist: Option<String>,
    pub year: Option<String>,
    pub genre: Option<String>,
    pub track_number: Option<String>,
    pub cover_url: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "snake_case")]
pub struct CatalogCandidate {
    pub source: String,
    pub title: String,
    pub artist: String,
    pub album: String,
    pub album_artist: Option<String>,
    pub year: Option<String>,
    pub genre: Option<String>,
    pub track_number: Option<String>,
    pub cover_url: Option<String>,
}

// User-Agent identificativo exigido por MusicBrainz (y respetado por todos).
pub(crate) const APP_UA: &str =
    "SakuraMusic/2.0 (https://github.com/sakura-music; sakura@music.app)";

async fn http_client() -> reqwest::Client {
    reqwest::Client::builder()
        .user_agent(APP_UA)
        .build()
        .unwrap_or_else(|_| reqwest::Client::new())
}

/// Lanza un GET y devuelve el JSON crudo (serde_json::Value).
async fn get_json(client: &reqwest::Client, url: &str) -> Result<serde_json::Value, String> {
    let res = client
        .get(url)
        .send()
        .await
        .map_err(|e| format!("Error de red: {e}"))?;
    let status = res.status();
    if !status.is_success() {
        return Err(format!("La API respondió con HTTP {}", status.as_u16()));
    }
    res.json::<serde_json::Value>()
        .await
        .map_err(|e| format!("Error al leer respuesta JSON: {e}"))
}

// ── iTunes / Apple Music ──────────────────────────────────────────────────

fn itunes_hd(url: &str) -> String {
    url.replace("/100x100bb", "/600x600bb")
}

async fn search_itunes_albums(
    client: &reqwest::Client,
    q: &str,
) -> Result<Vec<CatalogAlbum>, String> {
    let url = format!(
        "https://itunes.apple.com/search?term={}&entity=album&limit=20",
        urlencoding(q)
    );
    let data = get_json(client, &url).await?;
    let items = data
        .get("results")
        .and_then(|r| r.as_array())
        .cloned()
        .unwrap_or_default();
    let albums = items
        .into_iter()
        .map(|it| CatalogAlbum {
            source: "itunes".to_string(),
            id: it["collectionId"]
                .as_u64()
                .map(|v| v.to_string())
                .unwrap_or_default(),
            title: it["collectionName"].as_str().unwrap_or("").to_string(),
            artist: it["artistName"].as_str().unwrap_or("").to_string(),
            year: it["releaseDate"]
                .as_str()
                .map(|s| s.chars().take(4).collect()),
            track_count: it["trackCount"].as_u64().unwrap_or(0) as u32,
            cover_url: Some(itunes_hd(it["artworkUrl100"].as_str().unwrap_or(""))),
        })
        .collect();
    Ok(albums)
}

async fn open_itunes_album(
    client: &reqwest::Client,
    id: &str,
    country: &str,
) -> Result<Vec<CatalogAlbumTrack>, String> {
    // `country` proviene del storefront del enlace cuando el usuario lo pegó;
    // sin él, algunos álbumes (p. ej. EPs japoneses) no devuelven pistas en USA.
    let cc = if country.is_empty() { "us" } else { country };
    let url = format!(
        "https://itunes.apple.com/lookup?id={}&entity=song&limit=200&country={}",
        urlencoding(id),
        urlencoding(cc)
    );
    let data = get_json(client, &url).await?;
    let results = data
        .get("results")
        .and_then(|r| r.as_array())
        .cloned()
        .unwrap_or_default();
    let album = results
        .iter()
        .find(|r| r["wrapperType"].as_str() == Some("collection"));
    let album_title = album
        .and_then(|a| a["collectionName"].as_str())
        .unwrap_or("")
        .to_string();
    let album_artist = album
        .and_then(|a| a["artistName"].as_str())
        .unwrap_or("")
        .to_string();
    let album_cover = album
        .and_then(|a| a["artworkUrl100"].as_str())
        .map(itunes_hd);

    let tracks = results
        .iter()
        .filter(|r| r["wrapperType"].as_str() == Some("track"))
        .map(|t| CatalogAlbumTrack {
            id: t["trackId"].as_u64().map(|v| v.to_string()),
            source: "itunes".to_string(),
            title: t["trackName"].as_str().unwrap_or("").to_string(),
            artist: t["artistName"]
                .as_str()
                .unwrap_or(&album_artist)
                .to_string(),
            album: t["collectionName"]
                .as_str()
                .unwrap_or(&album_title)
                .to_string(),
            album_artist: Some(album_artist.clone()),
            year: t["releaseDate"]
                .as_str()
                .map(|s| s.chars().take(4).collect()),
            genre: t["primaryGenreName"].as_str().map(|s| s.to_string()),
            track_number: t["trackNumber"].as_u64().map(|v| v.to_string()),
            cover_url: Some(
                t["artworkUrl100"]
                    .as_str()
                    .map(itunes_hd)
                    .unwrap_or_else(|| album_cover.clone().unwrap_or_default()),
            ),
        })
        .collect();
    Ok(tracks)
}

// ── Deezer ────────────────────────────────────────────────────────────────

async fn search_deezer_albums(
    client: &reqwest::Client,
    q: &str,
) -> Result<Vec<CatalogAlbum>, String> {
    let url = format!(
        "https://api.deezer.com/search/album?q={}&limit=20",
        urlencoding(q)
    );
    let data = get_json(client, &url).await?;
    if data.get("error").is_some() {
        return Err("La API de Deezer devolvió un error.".to_string());
    }
    let items = data
        .get("data")
        .and_then(|r| r.as_array())
        .cloned()
        .unwrap_or_default();
    let albums = items
        .into_iter()
        .map(|it| {
            let artist = it["artist"]["name"].as_str().unwrap_or("").to_string();
            CatalogAlbum {
                source: "deezer".to_string(),
                id: it["id"].as_u64().map(|v| v.to_string()).unwrap_or_default(),
                title: it["title"].as_str().unwrap_or("").to_string(),
                artist,
                year: it["release_date"]
                    .as_str()
                    .map(|s| s.chars().take(4).collect()),
                track_count: it["nb_tracks"].as_u64().unwrap_or(0) as u32,
                cover_url: it["cover_xl"]
                    .as_str()
                    .or(it["cover_big"].as_str())
                    .or(it["cover_medium"].as_str())
                    .map(|s| s.to_string()),
            }
        })
        .collect();
    Ok(albums)
}

async fn open_deezer_album(
    client: &reqwest::Client,
    id: &str,
    _country: &str,
) -> Result<Vec<CatalogAlbumTrack>, String> {
    let url = format!("https://api.deezer.com/album/{}", urlencoding(id));
    let data = get_json(client, &url).await?;
    if data.get("error").is_some() {
        return Err("La API de Deezer devolvió un error.".to_string());
    }
    let album_title = data["title"].as_str().unwrap_or("").to_string();
    let album_artist = data["artist"]["name"].as_str().unwrap_or("").to_string();
    let album_year = data["release_date"]
        .as_str()
        .map(|s| s.chars().take(4).collect());
    let cover = data["cover_xl"]
        .as_str()
        .or(data["cover_big"].as_str())
        .or(data["cover_medium"].as_str())
        .map(|s| s.to_string());

    let items = data["tracks"]["data"]
        .as_array()
        .cloned()
        .unwrap_or_default();
    let tracks = items
        .into_iter()
        .map(|t| CatalogAlbumTrack {
            id: t["id"]
                .as_u64()
                .map(|v| v.to_string())
                .or_else(|| t["id"].as_str().map(|v| v.to_string())),
            source: "deezer".to_string(),
            title: t["title"].as_str().unwrap_or("").to_string(),
            artist: t["artist"]["name"]
                .as_str()
                .unwrap_or(&album_artist)
                .to_string(),
            album: album_title.clone(),
            album_artist: Some(album_artist.clone()),
            year: album_year.clone(),
            genre: None,
            track_number: t["track_position"].as_u64().map(|v| v.to_string()),
            cover_url: cover.clone(),
        })
        .collect();
    Ok(tracks)
}

// ── MusicBrainz ───────────────────────────────────────────────────────────

async fn search_musicbrainz_albums(
    client: &reqwest::Client,
    q: &str,
) -> Result<Vec<CatalogAlbum>, String> {
    let url = format!(
        "https://musicbrainz.org/ws/2/release/?query=release:{}&fmt=json&limit=20&inc=artist-credits+release-groups+media",
        urlencoding(q)
    );
    let data = get_json(client, &url).await?;
    let items = data
        .get("releases")
        .and_then(|r| r.as_array())
        .cloned()
        .unwrap_or_default();
    let albums = items
        .into_iter()
        .map(|it| {
            let id = it["id"].as_str().unwrap_or("").to_string();
            let artist = it["artist-credit"]
                .as_array()
                .map(|ac| {
                    ac.iter()
                        .filter_map(|c| c["name"].as_str())
                        .collect::<Vec<_>>()
                        .join(" ")
                })
                .unwrap_or_default();
            let track_count: u32 = it["media"]
                .as_array()
                .map(|m| {
                    m.iter()
                        .map(|x| x["track-count"].as_u64().unwrap_or(0))
                        .sum::<u64>() as u32
                })
                .unwrap_or(0);
            CatalogAlbum {
                source: "musicbrainz".to_string(),
                id,
                title: it["title"].as_str().unwrap_or("").to_string(),
                artist,
                year: it["date"].as_str().map(|s| s.chars().take(4).collect()),
                track_count,
                cover_url: Some(format!(
                    "https://coverartarchive.org/release/{}/front-500",
                    it["id"].as_str().unwrap_or("")
                )),
            }
        })
        .collect();
    Ok(albums)
}

async fn open_musicbrainz_album(
    client: &reqwest::Client,
    id: &str,
    _country: &str,
) -> Result<Vec<CatalogAlbumTrack>, String> {
    let url = format!(
        "https://musicbrainz.org/ws/2/release/{}?fmt=json&inc=recordings+artist-credits",
        urlencoding(id)
    );
    let data = get_json(client, &url).await?;
    let album_title = data["title"].as_str().unwrap_or("").to_string();
    let album_artist = data["artist-credit"]
        .as_array()
        .map(|ac| {
            ac.iter()
                .filter_map(|c| c["name"].as_str())
                .collect::<Vec<_>>()
                .join(" ")
        })
        .unwrap_or_default();
    let album_year = data["date"].as_str().map(|s| s.chars().take(4).collect());
    let cover = format!("https://coverartarchive.org/release/{id}/front-500");

    let media = data["media"].as_array().cloned().unwrap_or_default();
    let mut tracks = Vec::new();
    for m in media {
        if let Some(list) = m["tracks"].as_array() {
            for t in list {
                let rec_artist = t["artist-credit"]
                    .as_array()
                    .and_then(|ac| ac[0]["artist"]["name"].as_str())
                    .or_else(|| {
                        t["artist-credit"]
                            .as_array()
                            .and_then(|ac| ac[0]["name"].as_str())
                    })
                    .map(|s| s.to_string())
                    .unwrap_or_else(|| album_artist.clone());
                tracks.push(CatalogAlbumTrack {
                    id: t["id"].as_str().map(|v| v.to_string()),
                    source: "musicbrainz".to_string(),
                    title: t["title"].as_str().unwrap_or("").to_string(),
                    artist: rec_artist,
                    album: album_title.clone(),
                    album_artist: Some(album_artist.clone()),
                    year: album_year.clone(),
                    genre: None,
                    track_number: t["number"].as_str().map(|s| s.to_string()),
                    cover_url: Some(cover.clone()),
                });
            }
        }
    }
    Ok(tracks)
}

// ── Reexpedición pública (comandos Tauri) ─────────────────────────────────

async fn search_itunes_songs(
    client: &reqwest::Client,
    q: &str,
) -> Result<Vec<CatalogCandidate>, String> {
    let url = format!(
        "https://itunes.apple.com/search?term={}&entity=song&limit=16",
        urlencoding(q)
    );
    let data = get_json(client, &url).await?;
    let items = data
        .get("results")
        .and_then(|r| r.as_array())
        .cloned()
        .unwrap_or_default();
    Ok(items
        .into_iter()
        .map(|it| CatalogCandidate {
            source: "itunes".to_string(),
            title: it["trackName"].as_str().unwrap_or("").to_string(),
            artist: it["artistName"].as_str().unwrap_or("").to_string(),
            album: it["collectionName"].as_str().unwrap_or("").to_string(),
            album_artist: it["artistName"].as_str().map(|s| s.to_string()),
            year: it["releaseDate"]
                .as_str()
                .map(|s| s.chars().take(4).collect()),
            genre: it["primaryGenreName"].as_str().map(|s| s.to_string()),
            track_number: it["trackNumber"].as_u64().map(|v| v.to_string()),
            cover_url: Some(itunes_hd(it["artworkUrl100"].as_str().unwrap_or(""))),
        })
        .collect())
}

async fn search_deezer_songs(
    client: &reqwest::Client,
    q: &str,
) -> Result<Vec<CatalogCandidate>, String> {
    let url = format!(
        "https://api.deezer.com/search?q={}&limit=16",
        urlencoding(q)
    );
    let data = get_json(client, &url).await?;
    if data.get("error").is_some() {
        return Err("La API de Deezer devolvió un error.".to_string());
    }
    let items = data
        .get("data")
        .and_then(|r| r.as_array())
        .cloned()
        .unwrap_or_default();
    Ok(items
        .into_iter()
        .map(|it| {
            let artist = it["artist"]["name"].as_str().unwrap_or("").to_string();
            CatalogCandidate {
                source: "deezer".to_string(),
                title: it["title"].as_str().unwrap_or("").to_string(),
                artist: artist.clone(),
                album: it["album"]["title"].as_str().unwrap_or("").to_string(),
                album_artist: Some(artist),
                year: None,
                genre: None,
                track_number: None,
                cover_url: it["album"]["cover_xl"]
                    .as_str()
                    .or(it["album"]["cover_big"].as_str())
                    .or(it["album"]["cover_medium"].as_str())
                    .map(|s| s.to_string()),
            }
        })
        .collect())
}

async fn search_musicbrainz_songs(
    client: &reqwest::Client,
    q: &str,
) -> Result<Vec<CatalogCandidate>, String> {
    let url = format!(
        "https://musicbrainz.org/ws/2/recording/?query=recording:{}&fmt=json&limit=20",
        urlencoding(q)
    );
    let data = get_json(client, &url).await?;
    let items = data
        .get("recordings")
        .and_then(|r| r.as_array())
        .cloned()
        .unwrap_or_default();
    Ok(items
        .into_iter()
        .map(|it| {
            let artist = it["artist-credit"][0]["artist"]["name"]
                .as_str()
                .or(it["artist-credit"][0]["name"].as_str())
                .unwrap_or("")
                .to_string();
            let release_id = it["releases"][0]["id"].as_str().unwrap_or("").to_string();
            CatalogCandidate {
                source: "musicbrainz".to_string(),
                title: it["title"].as_str().unwrap_or("").to_string(),
                artist: artist.clone(),
                album: it["releases"][0]["title"]
                    .as_str()
                    .unwrap_or("")
                    .to_string(),
                album_artist: Some(artist),
                year: it["first-release-date"]
                    .as_str()
                    .map(|s| s.chars().take(4).collect()),
                genre: None,
                track_number: None,
                cover_url: if release_id.is_empty() {
                    None
                } else {
                    Some(format!(
                        "https://coverartarchive.org/release/{release_id}/front-500"
                    ))
                },
            }
        })
        .collect())
}

#[tauri::command]
pub async fn search_catalog_songs(
    source: String,
    query: String,
) -> Result<Vec<CatalogCandidate>, String> {
    let client = http_client().await;
    let q = query.trim();
    if q.is_empty() {
        return Ok(vec![]);
    }
    match source.as_str() {
        "itunes" => search_itunes_songs(&client, q).await,
        "deezer" => search_deezer_songs(&client, q).await,
        "musicbrainz" => search_musicbrainz_songs(&client, q).await,
        other => Err(format!("Plataforma desconocida: {other}")),
    }
}

#[tauri::command]
pub async fn search_catalog_albums(
    source: String,
    query: String,
) -> Result<Vec<CatalogAlbum>, String> {
    let client = http_client().await;
    let q = query.trim();
    if q.is_empty() {
        return Ok(vec![]);
    }
    match source.as_str() {
        "itunes" => search_itunes_albums(&client, q).await,
        "deezer" => search_deezer_albums(&client, q).await,
        "musicbrainz" => search_musicbrainz_albums(&client, q).await,
        other => Err(format!("Plataforma desconocida: {other}")),
    }
}

/// Devuelve las pistas de un álbum. `country` es el storefront de iTunes
/// cuando se pega un enlace (si viene vacío, se usa `us`).
#[tauri::command]
pub async fn open_catalog_album(
    source: String,
    id: String,
    country: String,
) -> Result<Vec<CatalogAlbumTrack>, String> {
    let client = http_client().await;
    match source.as_str() {
        "itunes" => open_itunes_album(&client, &id, &country).await,
        "deezer" => open_deezer_album(&client, &id, &country).await,
        "musicbrainz" => open_musicbrainz_album(&client, &id, &country).await,
        other => Err(format!("Plataforma desconocida: {other}")),
    }
}

// url-encoding básico (no depende de crate externo).
fn urlencoding(input: &str) -> String {
    let mut out = String::with_capacity(input.len());
    for byte in input.bytes() {
        match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                out.push(byte as char)
            }
            _ => out.push_str(&format!("%{byte:02X}")),
        }
    }
    out
}
