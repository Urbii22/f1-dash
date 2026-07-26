use std::{
    fs::File,
    io::{BufRead, BufReader, Read},
    path::Path,
};

use anyhow::Error;
use flate2::read::GzDecoder;

mod server;

pub async fn replay(path: &Path) -> Result<(), Error> {
    if !path.exists() {
        return Err(anyhow::anyhow!(
            "File does not exist at path {}",
            path.display()
        ));
    }

    let file = File::open(path)?;

    let input: Box<dyn Read> = if path.extension().and_then(|value| value.to_str()) == Some("gz") {
        Box::new(GzDecoder::new(file))
    } else {
        Box::new(file)
    };
    let buffer = BufReader::new(input);

    let lines = buffer
        .lines()
        .map_while(Result::ok)
        .collect::<Vec<String>>();

    server::run(lines).await
}
