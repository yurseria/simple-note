use std::io::{Read, Write};
use std::net::TcpListener;
use tauri::{AppHandle, Emitter};

/// Starts a local HTTP server on a random port to receive the OAuth callback.
/// Emits "cloud:auth-callback" event with the full query string when called.
/// Returns the port number so the frontend can build the redirect_uri.
#[tauri::command]
pub async fn cloud_start_auth_server(app: AppHandle) -> Result<u16, String> {
    let listener = TcpListener::bind("127.0.0.1:0").map_err(|e| e.to_string())?;
    let port = listener.local_addr().map_err(|e| e.to_string())?.port();

    std::thread::spawn(move || {
        if let Ok((mut stream, _)) = listener.accept() {
            let mut buf = [0u8; 4096];
            let n = stream.read(&mut buf).unwrap_or(0);
            let req = String::from_utf8_lossy(&buf[..n]);

            // Extract query string from "GET /?code=...&... HTTP/1.1"
            let query = req
                .lines()
                .next()
                .and_then(|line| line.split_whitespace().nth(1))
                .and_then(|path| path.splitn(2, '?').nth(1))
                .unwrap_or("")
                .to_string();

            // Send success page to browser
            let body = "<html><body><script>window.close()</script><p>로그인 완료. 이 탭을 닫아주세요.</p></body></html>";
            let response = format!(
                "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
                body.len(),
                body
            );
            let _ = stream.write_all(response.as_bytes());
            drop(stream);

            let _ = app.emit("cloud:auth-callback", query);
        }
    });

    Ok(port)
}
