
import api from '../../utils/axios'

async function sendMessage(payload, onChunk) {
 try {
    const response = await fetch(`${import.meta.env.VITE_SERVER_URL}/api/agent/chat`, {
        method: "POST",
        body: payload,
        credentials: "include" // for axios withCredentials parity
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
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
                                onChunk(data.content);
                            } else if (data.type === 'final') {
                                finalData = data.data;
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
    console.log(error)
    return null
 }
}

export default sendMessage
