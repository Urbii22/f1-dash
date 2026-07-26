use anyhow::Context;
use flate2::read::GzDecoder;
use signalr::ParsedFrame;
use std::{
    fs::File,
    io::{BufRead, BufReader, Read},
    path::Path,
};

pub fn frames(path: &Path) -> anyhow::Result<Vec<ParsedFrame>> {
    let file = File::open(path).with_context(|| format!("opening {}", path.display()))?;
    let input: Box<dyn Read> = if path.extension().and_then(|x| x.to_str()) == Some("gz") {
        Box::new(GzDecoder::new(file))
    } else {
        Box::new(file)
    };
    let mut frames = Vec::new();
    for line in BufReader::new(input).lines() {
        match line {
            Ok(line) => frames.extend(signalr::parse_frames(&line)),
            Err(error) => {
                tracing::warn!(?error, "discarding truncated recording tail");
                break;
            }
        }
    }
    Ok(frames)
}

pub fn recording_files(path: &Path) -> anyhow::Result<Vec<std::path::PathBuf>> {
    if path.is_file() {
        return Ok(vec![path.to_path_buf()]);
    }
    let mut files = walkdir::WalkDir::new(path)
        .into_iter()
        .filter_map(Result::ok)
        .filter(|entry| entry.file_type().is_file())
        .map(|entry| entry.into_path())
        .filter(|path| {
            let name = path.file_name().and_then(|x| x.to_str()).unwrap_or("");
            name.ends_with(".data.txt") || name.ends_with(".data.txt.gz")
        })
        .collect::<Vec<_>>();
    files.sort();
    Ok(files)
}
