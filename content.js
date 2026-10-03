let askButton = null;
let extensionContainer = null;
let activeRequestController = null;

const BACKEND_URL = "http://localhost:3000/api/explain";

function removeAskButton() {
  if (askButton) {
    askButton.remove();
    askButton = null;
  }
}

function handleSelection(event) {
  if (event && askButton && askButton.contains(event.target)) {
    return;
  }

  removeAskButton();

  if (!document.body) {
    return;
  }

  const selection = window.getSelection();
  const selectedText =
    selection && selection.rangeCount ? selection.toString().trim() : "";

  if (!selectedText || !selection || selection.rangeCount === 0) {
    return;
  }

  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();

  askButton = document.createElement("button");
  askButton.type = "button";
  askButton.textContent = "✨ Ask AI";
  askButton.style.position = "absolute";
  askButton.style.zIndex = "2147483647";
  askButton.style.left = `${rect.left + window.scrollX}px`;
  askButton.style.top = `${rect.bottom + window.scrollY + 8}px`;
  askButton.style.padding = "9px 14px";
  askButton.style.border = "none";
  askButton.style.borderRadius = "10px";
  askButton.style.background = "#222";
  askButton.style.color = "white";
  askButton.style.fontSize = "14px";
  askButton.style.fontWeight = "600";
  askButton.style.cursor = "pointer";
  askButton.style.boxShadow = "0 5px 20px rgba(0,0,0,0.25)";
  askButton.style.userSelect = "none";

  askButton.addEventListener("click", () => {
    const activeSelection = window.getSelection();
    const finalText =
      activeSelection && activeSelection.rangeCount
        ? activeSelection.toString().trim()
        : selectedText;

    if (!finalText) {
      return;
    }

    createAIWindow(finalText);
    removeAskButton();
  });

  document.body.appendChild(askButton);
}

document.addEventListener("mouseup", handleSelection);
document.addEventListener("keyup", () => {
  if (
    document.activeElement &&
    ["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)
  ) {
    handleSelection();
  }
});

function createAIWindow(selectedText) {
  if (extensionContainer) {
    if (activeRequestController) {
      activeRequestController.abort();
      activeRequestController = null;
    }
    extensionContainer.remove();
    extensionContainer = null;
  }

  extensionContainer = document.createElement("div");
  extensionContainer.style.position = "fixed";
  extensionContainer.style.top = "100px";
  extensionContainer.style.right = "10px";
  extensionContainer.style.width = "min(390px, calc(100vw - 20px))";
  extensionContainer.style.zIndex = "2147483647";

  const shadow = extensionContainer.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = `
    * { box-sizing: border-box; }
    .panel {
      width: 100%;
      max-width: calc(100vw - 40px);
      max-height: 75vh;
      overflow: hidden;
      border-radius: 22px;
      background: linear-gradient(135deg, rgba(255,255,255,0.96), rgba(225,246,255,0.92));
      border: 1px solid rgba(255,255,255,0.9);
      box-shadow: 0 25px 70px rgba(0,80,120,0.25), 0 5px 20px rgba(0,0,0,0.12);
      color: #17232d;
      font-family: Arial, sans-serif;
      animation: waterDrop 0.55s cubic-bezier(0.16,1,0.3,1);
    }
    @keyframes waterDrop {
      0% { opacity: 0; transform: scale(0.65) translateY(-30px); filter: blur(10px); }
      55% { opacity: 1; transform: scale(1.05) translateY(4px); filter: blur(0); }
      75% { transform: scale(0.98) translateY(-2px); }
      100% { opacity: 1; transform: scale(1) translateY(0); }
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 18px;
      border-bottom: 1px solid rgba(255,255,255,0.8);
      cursor: grab;
      user-select: none;
    }
    .header:active { cursor: grabbing; }
    .title { font-size: 17px; font-weight: 700; }
    .close {
      width: 30px; height: 30px; border: none; border-radius: 50%;
      background: rgba(255,255,255,0.7); font-size: 18px; cursor: pointer;
    }
    .content { padding: 18px; }
    .section { margin-bottom: 20px; }
    .section-title { font-size: 14px; font-weight: 700; margin-bottom: 8px; }
    .selected {
      padding: 12px; border-radius: 12px; background: rgba(255,255,255,0.65);
      font-weight: 600; word-break: break-word;
    }
    .text { margin: 0; font-size: 14px; line-height: 1.6; color: #3d4d58; }
    .answer { white-space: pre-wrap; }
    .loading {
      min-height: 220px; display: flex; flex-direction: column; align-items: center;
      justify-content: center; text-align: center;
    }
    .loading-icon { font-size: 42px; margin-bottom: 15px; animation: waterFloat 1.5s ease-in-out infinite; }
    @keyframes waterFloat {
      0%, 100% { transform: translateY(0) scale(1); }
      50% { transform: translateY(-8px) scale(1.08); }
    }
    .loading-title { font-size: 18px; font-weight: 700; margin-bottom: 6px; }
    .loading-text { font-size: 13px; color: #61727d; }
    .loading-dots { display: flex; gap: 5px; margin-top: 15px; }
    .loading-dots span {
      width: 6px; height: 6px; border-radius: 50%; background: #147aa3;
      animation: loadingDot 1.2s infinite ease-in-out;
    }
    .loading-dots span:nth-child(2) { animation-delay: 0.15s; }
    .loading-dots span:nth-child(3) { animation-delay: 0.3s; }
    @keyframes loadingDot {
      0%, 80%, 100% { opacity: 0.3; transform: translateY(0); }
      40% { opacity: 1; transform: translateY(-5px); }
    }
  `;

  shadow.appendChild(style);

  const panel = document.createElement("div");
  panel.className = "panel";
  panel.innerHTML = `
    <div class="header">
      <div class="title">✨ AI Explanation</div>
      <button class="close" type="button">×</button>
    </div>
    <div class="content">
      <div class="loading">
        <div class="loading-icon">💧</div>
        <div class="loading-title">Thinking...</div>
        <div class="loading-text">Understanding your selected concept</div>
        <div class="loading-dots">
          <span></span><span></span><span></span>
        </div>
      </div>
    </div>
  `;
  shadow.appendChild(panel);

  if (!document.body) {
    return;
  }

  document.body.appendChild(extensionContainer);

  const answerElement = showAnswer(shadow, selectedText);
  const controller = new AbortController();
  activeRequestController = controller;

  fetch(BACKEND_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ selectedText }),
    signal: controller.signal,
  })
    .then(async (response) => {
      const contentType = response.headers.get("content-type") || "";

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Backend error (${response.status}).`);
      }

      if (contentType.includes("application/json")) {
        const data = await response.json().catch(() => ({}));
        if (!data.answer) {
          throw new Error(
            data.error || "The backend returned an empty response.",
          );
        }
        answerElement.textContent = data.answer;
        return;
      }

      if (!response.body) {
        throw new Error("The backend did not provide a readable response.");
      }

      await streamExplanation(response.body, answerElement);
    })
    .catch((error) => {
      if (error.name === "AbortError") {
        return;
      }

      const content = shadow.querySelector(".content");
      if (content) {
        content.innerHTML = `
          <div class="section">
            <div class="section-title">❌ Error</div>
            <p class="text error-message"></p>
          </div>
        `;
        const errorNode = content.querySelector(".error-message");
        if (errorNode) {
          errorNode.textContent = error.message;
        }
      }
    })
    .finally(() => {
      if (activeRequestController === controller) {
        activeRequestController = null;
      }
    });

  const closeButton = panel.querySelector(".close");
  if (closeButton) {
    closeButton.addEventListener("click", () => {
      if (activeRequestController) {
        activeRequestController.abort();
        activeRequestController = null;
      }

      if (extensionContainer) {
        extensionContainer.remove();
        extensionContainer = null;
      }
    });
  }

  makeDraggable(extensionContainer, panel.querySelector(".header"));
}

function showAnswer(shadow, selectedText) {
  const content = shadow.querySelector(".content");
  content.innerHTML = `
    <div class="section">
      <div class="section-title">📌 Selected</div>
      <div class="selected"></div>
    </div>
    <div class="section">
      <div class="section-title">📖 Explanation</div>
      <p class="text answer" aria-live="polite"></p>
    </div>
  `;

  const selectedNode = content.querySelector(".selected");
  if (selectedNode) {
    selectedNode.textContent = selectedText;
  }

  const answerElement = content.querySelector(".answer");
  if (answerElement) {
    answerElement.style.whiteSpace = "pre-wrap";
  }
  return answerElement;
}

async function streamExplanation(body, answerElement) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let pendingWord = "";
  let typingQueue = Promise.resolve();

  const queueText = (text) => {
    pendingWord += text;
    const words = pendingWord.match(/\S+\s*/g) || [];

    if (/\s$/.test(pendingWord)) {
      pendingWord = "";
    } else {
      pendingWord = words.pop() || pendingWord;
    }

    if (words.length) {
      typingQueue = typingQueue.then(async () => {
        for (const word of words) {
          answerElement.appendChild(document.createTextNode(word));
          await new Promise((resolve) => setTimeout(resolve, 18));
        }
      });
    }
  };

  const processEvent = (eventBlock) => {
    const dataLines = [];
    let eventType = "message";

    for (const line of eventBlock.split(/\r?\n/)) {
      if (line.startsWith("event:")) {
        eventType = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        dataLines.push(line.slice(5).trim());
      }
    }

    if (!dataLines.length) {
      return;
    }

    const data = JSON.parse(dataLines.join("\n"));
    if (eventType === "error") {
      throw new Error(
        data.error || "Gemini could not generate an explanation.",
      );
    }

    if (data.text) {
      queueText(data.text);
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });

    let boundary = buffer.indexOf("\n\n");
    while (boundary !== -1) {
      processEvent(buffer.slice(0, boundary));
      buffer = buffer.slice(boundary + 2);
      boundary = buffer.indexOf("\n\n");
    }

    if (done) {
      if (buffer.trim()) {
        processEvent(buffer);
      }
      break;
    }
  }

  if (pendingWord) {
    const finalWord = pendingWord;
    pendingWord = "";
    typingQueue = typingQueue.then(() => {
      answerElement.appendChild(document.createTextNode(finalWord));
    });
  }

  await typingQueue;
}

function makeDraggable(element, handle) {
  if (!element || !handle) {
    return;
  }

  let dragging = false;
  let offsetX = 0;
  let offsetY = 0;

  handle.addEventListener("mousedown", (event) => {
    if (event.target.closest(".close")) {
      return;
    }

    dragging = true;
    const rect = element.getBoundingClientRect();
    offsetX = event.clientX - rect.left;
    offsetY = event.clientY - rect.top;
    event.preventDefault();
  });

  document.addEventListener("mousemove", (event) => {
    if (!dragging) {
      return;
    }

    let left = event.clientX - offsetX;
    let top = event.clientY - offsetY;
    const maxLeft = window.innerWidth - element.offsetWidth;
    const maxTop = window.innerHeight - element.offsetHeight;

    left = Math.max(0, Math.min(left, maxLeft));
    top = Math.max(0, Math.min(top, maxTop));

    element.style.left = `${left}px`;
    element.style.top = `${top}px`;
    element.style.right = "auto";
  });

  document.addEventListener("mouseup", () => {
    dragging = false;
  });
}
