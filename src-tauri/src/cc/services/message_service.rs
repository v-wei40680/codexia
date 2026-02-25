use crate::cc::state::CCState;
use claude_agent_sdk_rs::Message;
use futures::StreamExt;

pub async fn send_message_and_wait(
    session_id: &str,
    message: &str,
    state: &CCState,
    mut message_callback: impl FnMut(Message) + Send,
) -> Result<(), String> {
    let client = state
        .get_client(session_id)
        .await
        .ok_or("Client not found")?;

    {
        let mut client = client.lock().await;
        client.connect().await.map_err(|e| e.to_string())?;
    }

    {
        let mut client = client.lock().await;
        client.query(message).await.map_err(|e| e.to_string())?;
    }

    loop {
        let result = {
            let client = client.lock().await;
            let mut stream = client.receive_response();
            stream.next().await
        };

        match result {
            Some(Ok(msg)) => {
                message_callback(msg.clone());
                if matches!(msg, Message::Result(_)) {
                    break;
                }
            }
            Some(Err(e)) => return Err(e.to_string()),
            None => break,
        }
    }

    Ok(())
}

pub async fn send_message(
    session_id: &str,
    message: &str,
    state: &CCState,
    message_callback: impl Fn(Message) + Send + 'static,
) -> Result<(), String> {
    if state.get_client(session_id).await.is_none() {
        return Err("Client not found".to_string());
    }

    let session_id_owned = session_id.to_string();
    let message_owned = message.to_string();
    let state_cloned = state.clone();

    // Start streaming responses
    tokio::spawn(async move {
        if let Err(err) = send_message_and_wait(
            &session_id_owned,
            &message_owned,
            &state_cloned,
            message_callback,
        )
        .await
        {
            log::error!("Error sending/receiving message: {}", err);
        }
    });

    Ok(())
}
