use axum::{
    extract::{
        State as AxumState,
        ws::{Message, WebSocket, WebSocketUpgrade},
    },
    response::IntoResponse,
};
use futures::{sink::SinkExt, stream::StreamExt};
use serde_json::json;
use tokio::sync::broadcast;

pub(super) async fn ws_handler(
    ws: WebSocketUpgrade,
    AxumState(event_tx): AxumState<broadcast::Sender<(String, serde_json::Value)>>,
) -> impl IntoResponse {
    ws.on_upgrade(|socket| handle_socket(socket, event_tx))
}

async fn handle_socket(
    socket: WebSocket,
    event_tx: broadcast::Sender<(String, serde_json::Value)>,
) {
    let (mut sender, mut receiver) = socket.split();
    let mut event_rx = event_tx.subscribe();

    let mut send_task = tokio::spawn(async move {
        while let Ok((event, payload)) = event_rx.recv().await {
            let message = json!({
                "event": event,
                "payload": payload
            });

            if sender
                .send(Message::Text(message.to_string().into()))
                .await
                .is_err()
            {
                break;
            }
        }
    });

    let mut recv_task = tokio::spawn(async move {
        while let Some(Ok(msg)) = receiver.next().await {
            if matches!(msg, Message::Close(_)) {
                break;
            }
        }
    });

    tokio::select! {
        _ = &mut send_task => recv_task.abort(),
        _ = &mut recv_task => send_task.abort(),
    }
}

#[cfg(test)]
mod tests {
    use super::ws_handler;
    use axum::{Router, routing::get};
    use futures::StreamExt;
    use serde_json::json;
    use tokio::sync::broadcast;
    use tokio::time::{Duration, timeout};
    use tokio_tungstenite::{connect_async, tungstenite::Message};

    #[tokio::test]
    async fn websocket_route_accepts_connection_and_forwards_events() {
        let (event_tx, _) = broadcast::channel(16);
        let app = Router::new().route("/ws", get(ws_handler)).with_state(event_tx.clone());
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
            .await
            .expect("bind websocket test listener");
        let addr = listener.local_addr().expect("read local addr");

        let server_task = tokio::spawn(async move {
            axum::serve(listener, app)
                .await
                .expect("run websocket test server");
        });

        let (mut socket, _) = timeout(
            Duration::from_secs(5),
            connect_async(format!("ws://{addr}/ws")),
        )
        .await
        .expect("websocket handshake timeout")
        .expect("websocket handshake failed");

        tokio::time::sleep(Duration::from_millis(50)).await;
        event_tx
            .send(("test:event".to_string(), json!({ "ok": true })))
            .expect("broadcast websocket event");

        let message = timeout(Duration::from_secs(5), socket.next())
            .await
            .expect("timed out waiting for websocket message")
            .expect("websocket stream closed")
            .expect("websocket read failed");

        match message {
            Message::Text(text) => {
                let value: serde_json::Value =
                    serde_json::from_str(&text).expect("parse websocket JSON");
                assert_eq!(value["event"], "test:event");
                assert_eq!(value["payload"], json!({ "ok": true }));
            }
            other => panic!("expected text websocket message, got: {other:?}"),
        }

        server_task.abort();
    }
}
