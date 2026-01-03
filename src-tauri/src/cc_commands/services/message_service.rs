use crate::cc_commands::state::CCState;
use claude_agent_sdk_rs::Message;
use futures::StreamExt;

pub async fn send_message(
    session_id: &str,
    message: &str,
    state: &CCState,
    message_callback: impl Fn(Message) + Send + 'static,
) -> Result<(), String> {
    let client = state
        .get_client(session_id)
        .await
        .ok_or("Client not found")?;

    // Ensure client is connected before sending (lazy connection)
    {
        let mut client = client.lock().await;
        client.connect().await.map_err(|e| e.to_string())?;
    }

    // Send the query
    {
        let mut client = client.lock().await;
        client.query(message).await.map_err(|e| e.to_string())?;
    }

    // Start streaming responses
    tokio::spawn(async move {
        loop {
            let result = {
                let client = client.lock().await;
                let mut stream = client.receive_response();
                stream.next().await
            };

            match result {
                Some(Ok(msg)) => {
                    message_callback(msg.clone());

                    // Stop streaming on Result message
                    if matches!(msg, Message::Result(_)) {
                        break;
                    }
                }
                Some(Err(e)) => {
                    log::error!("Error receiving message: {}", e);
                    break;
                }
                None => break,
            }
        }
    });

    Ok(())
}
