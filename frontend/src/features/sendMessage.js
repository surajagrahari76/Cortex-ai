async function sendMessage(payload, onChunk) {
  try {
    const response = await fetch("/api/agent/chat", {
      method: "POST",
      body: payload,
      credentials: "include" // for axios withCredentials parity
    });

    if (!response.ok) {
      let errMessage = `Error: ${response.statusText || response.status}`;
      try {
        const errData = await response.json();
        if (errData && errData.message) {
          errMessage = errData.message;
        }
      } catch (e) { }

      if (onChunk && errMessage && errMessage !== 'undefined') {
        onChunk(errMessage);
      }
      return { error: errMessage };
    }

    if (onChunk) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let done = false;
      let buffer = "";
      let finalData = null;

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          let boundary = buffer.indexOf('\n\n');
          while (boundary !== -1) {
            const message = buffer.slice(0, boundary);
            buffer = buffer.slice(boundary + 2);

            if (message.startsWith('data: ')) {
              const dataStr = message.slice(6);
              if (dataStr === '[DONE]') {
                break;
              }
              try {
                const data = JSON.parse(dataStr);
                if (data.type === 'chunk') {
                  if (data.content !== undefined && data.content !== null && data.content !== 'undefined') {
                    onChunk(data.content);
                  }
                } else if (data.type === 'final') {
                  finalData = data.data;
                } else if (data.type === 'error') {
                  const errorMsg = data.message || 'An error occurred.';
                  if (errorMsg !== 'undefined') {
                    onChunk(`\n\n⚠️ ${errorMsg}`);
                  }
                }
              } catch (e) {
                console.error("Parse error", e);
              }
            }
            boundary = buffer.indexOf('\n\n');
          }
        }
      }
      return finalData;
    } else {
      const data = await response.json();
      return data;
    }
  } catch (error) {
    console.error("sendMessage error:", error);
    const errText = error?.message || "Failed to send message. Please check connection.";
    if (onChunk && errText !== 'undefined') {
      onChunk(errText);
    }
    return { error: errText };
  }
}

export default sendMessage
