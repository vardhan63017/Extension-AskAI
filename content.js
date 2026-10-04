let askButton = null;
let extensionContainer = null;
let activeRequestController = null;
let activeTypingCancels = new Set();
let typingGeneration = 0;

const EXPLANATION_MESSAGE = "explain-selected-text";

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
    selection && selection.rangeCount ? selection.toString() : "";

  if (!selectedText.trim() || !selection || selection.rangeCount === 0) {
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
        ? activeSelection.toString()
        : selectedText;

    if (!finalText.trim()) {
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
  cancelTypingAnimations();

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
  extensionContainer.style.height = "min(520px, calc(100vh - 120px))";
  extensionContainer.style.minWidth = "min(290px, calc(100vw - 20px))";
  extensionContainer.style.minHeight = "min(300px, calc(100vh - 120px))";
  extensionContainer.style.maxWidth = "calc(100vw - 20px)";
  extensionContainer.style.maxHeight = "calc(100vh - 20px)";
  extensionContainer.style.resize = "both";
  extensionContainer.style.overflow = "hidden";
  extensionContainer.style.borderRadius = "22px";
  extensionContainer.style.zIndex = "2147483647";

  const shadow = extensionContainer.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = `
    * { box-sizing: border-box; }
    .panel {
      width: 100%;
      height: 100%;
      min-width: 0;
      min-height: 0;
      display: flex;
      flex-direction: column;
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
      flex: 0 0 auto;
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
    .content {
      flex: 1 1 auto;
      min-height: 0;
      padding: 14px;
      overflow-y: auto;
      overscroll-behavior: contain;
      scrollbar-width: thin;
      scrollbar-color: rgba(20,122,163,0.35) transparent;
    }
    .section {
      margin-bottom: 11px;
      padding: 13px 14px;
      border: 1px solid rgba(255,255,255,0.76);
      border-radius: 14px;
      background: rgba(255,255,255,0.52);
      box-shadow: 0 4px 14px rgba(29,98,125,0.06);
    }
    .section:last-child { margin-bottom: 0; }
    .section-title {
      margin-bottom: 8px;
      color: #145d79;
      font-size: 13px;
      font-weight: 700;
      line-height: 1.35;
    }
    .selected {
      padding: 11px 12px;
      border-radius: 10px;
      background: rgba(255,255,255,0.66);
      font-weight: 600;
      line-height: 1.55;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }
    .text { margin: 0; font-size: 14px; line-height: 1.6; color: #3d4d58; }
    .answer { white-space: pre-wrap; overflow-wrap: anywhere; }
    .answer-list {
      display: grid;
      gap: 6px;
      margin: 0;
      padding-left: 20px;
    }
    .answer-list li::marker { color: #147aa3; }
    .typing-cursor {
      display: inline-block;
      margin-left: 1px;
      color: #147aa3;
      animation: cursorBlink 0.85s steps(2, start) infinite;
    }
    @keyframes cursorBlink { to { visibility: hidden; } }
    .deep-dive-section { padding: 0; overflow: hidden; }
    .deep-dive-toggle {
      display: flex;
      width: 100%;
      min-height: 46px;
      align-items: center;
      justify-content: space-between;
      padding: 12px 14px;
      border: 0;
      background: transparent;
      color: #145d79;
      font: inherit;
      font-size: 13px;
      font-weight: 700;
      text-align: left;
      cursor: pointer;
    }
    .deep-dive-toggle:hover { background: rgba(255,255,255,0.32); }
    .deep-dive-chevron { transition: transform 220ms ease; }
    .deep-dive-section.is-open .deep-dive-chevron { transform: rotate(180deg); }
    .deep-dive-body {
      display: grid;
      grid-template-rows: 0fr;
      opacity: 0;
      transition: grid-template-rows 260ms ease, opacity 200ms ease;
    }
    .deep-dive-section.is-open .deep-dive-body {
      grid-template-rows: 1fr;
      opacity: 1;
    }
    .deep-dive-inner { min-height: 0; overflow: hidden; }
    .deep-dive-inner .answer-list { padding: 0 14px 14px 34px; }
    @media (prefers-reduced-motion: reduce) {
      .deep-dive-body, .deep-dive-chevron, .typing-cursor { transition: none; animation: none; }
    }
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

  const controller = new AbortController();
  activeRequestController = controller;

  chrome.runtime
    .sendMessage({ type: EXPLANATION_MESSAGE, selectedText })
    .then((result) => {
      if (controller.signal.aborted) {
        return;
      }
      if (result?.error) {
        throw new Error(result.error);
      }
      if (!result?.answer) {
        throw new Error("The backend returned an empty response.");
      }
      showAnswer(shadow, selectedText, result.answer);
    })
    .catch((error) => {
      if (controller.signal.aborted || error.name === "AbortError") {
        return;
      }

      const content = shadow.querySelector(".content");
      if (content) {
        content.innerHTML = `
          <div class="section">
            <div class="section-title">❌ Unable to generate explanation</div>
            <p class="text error-message"></p>
          </div>
        `;
        const errorNode = content.querySelector(".error-message");
        if (errorNode) {
          errorNode.textContent = /select less text/i.test(error.message)
            ? "Select less text and try again."
            : /daily usage limit/i.test(error.message)
              ? error.message
              : error.message || "Please try again in a moment.";
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
      cancelTypingAnimations();

      if (extensionContainer) {
        extensionContainer.remove();
        extensionContainer = null;
      }
    });
  }

  makeDraggable(extensionContainer, panel.querySelector(".header"));
}

function showAnswer(shadow, selectedText, answer) {
  if (!answer || typeof answer !== "object" || Array.isArray(answer)) {
    throw new Error("The explanation response was invalid.");
  }

  const content = shadow.querySelector(".content");
  content.replaceChildren();

  const selectedSection = document.createElement("section");
  selectedSection.className = "section selected-section";
  const selectedTitle = document.createElement("div");
  selectedTitle.className = "section-title";
  selectedTitle.textContent = "📌 Selected";
  const selectedNode = document.createElement("div");
  selectedNode.className = "selected";
  selectedNode.textContent = selectedText;
  selectedSection.append(selectedTitle, selectedNode);
  content.appendChild(selectedSection);

  const orderedSections = [
    ["definition", "📖 Simple Definition", "text"],
    ["example", "💡 Example", "text"],
    ["realWorldExample", "🌍 Real-World Example", "text"],
    ["howItWorks", "⚙️ How It Works", "ordered"],
    ["applications", "📱 Applications", "list"],
    ["advantages", "⭐ Advantages", "list"],
    ["limitations", "⚠️ Limitations", "list"],
    ["deepDive", "🔍 Deep Dive", "text"],
  ];
  const textTargets = [];

  for (const [key, title, fieldType] of orderedSections) {
    const value = answer[key];
    const listType = fieldType === "list" || fieldType === "ordered";
    const items = listType
      ? Array.isArray(value)
        ? value.filter((item) => typeof item === "string" && item.trim())
        : []
      : typeof value === "string" && value.trim()
        ? [value]
        : [];
    const section = createAnswerSection(
      title,
      items.length ? items : ["Not applicable to this selection."],
      items.length ? fieldType : "text",
    );
    content.appendChild(section.container);
    textTargets.push(...section.textTargets);
  }
  animateSections(textTargets, typingGeneration);
}

function createAnswerSection(title, items, fieldType) {
  const container = document.createElement("section");
  container.className = "section answer-section";
  const heading = document.createElement("div");
  heading.className = "section-title";
  heading.textContent = title;
  let textTargets;
  if (fieldType === "text") {
    const paragraph = document.createElement("p");
    paragraph.className = "text answer";
    paragraph.setAttribute("aria-live", "off");
    container.append(heading, paragraph);
    textTargets = [[paragraph, items[0].trim()]];
  } else {
    const list = document.createElement(fieldType === "ordered" ? "ol" : "ul");
    list.className = "answer-list";
    textTargets = items.map((item) => {
      const listItem = document.createElement("li");
      listItem.className = "text answer";
      listItem.setAttribute("aria-live", "off");
      list.appendChild(listItem);
      return [listItem, item.trim()];
    });
    container.append(heading, list);
  }
  return { container, textTargets };
}

async function animateSections(textTargets, generation) {
  for (const [element, text] of textTargets) {
    if (generation !== typingGeneration) {
      return;
    }
    await typeCharacters(element, text, generation);
  }
}

function typeCharacters(element, text, generation) {
  return new Promise((resolve) => {
    if (generation !== typingGeneration) {
      resolve();
      return;
    }

    const characters = Array.from(text);
    const textNode = document.createTextNode("");
    const cursor = document.createElement("span");
    cursor.className = "typing-cursor";
    cursor.setAttribute("aria-hidden", "true");
    cursor.textContent = "▍";
    element.append(textNode, cursor);

    let index = 0;
    let timer = null;
    const finish = () => {
      if (timer !== null) {
        clearTimeout(timer);
      }
      cursor.remove();
      activeTypingCancels.delete(cancel);
      resolve();
    };
    const cancel = () => finish();
    activeTypingCancels.add(cancel);

    const typeNextCharacter = () => {
      if (generation !== typingGeneration || index >= characters.length) {
        finish();
        return;
      }
      textNode.appendData(characters[index]);
      index += 1;
      timer = setTimeout(typeNextCharacter, 15 + Math.random() * 15);
    };

    typeNextCharacter();
  });
}

function cancelTypingAnimations() {
  typingGeneration += 1;
  for (const cancel of [...activeTypingCancels]) {
    cancel();
  }
  activeTypingCancels.clear();
}

async function streamExplanation(body) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let answer = "";

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

    answer += data.text || "";
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

  return answer;
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
