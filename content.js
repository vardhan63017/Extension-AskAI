let askButton = null;
let extensionContainer = null;

// ============================================
// TEXT SELECTION
// ============================================

document.addEventListener("mouseup", (event) => {
  // Don't remove Ask AI button when clicking it
  if (askButton && askButton.contains(event.target)) {
    return;
  }

  // Remove old Ask AI button
  if (askButton) {
    askButton.remove();
    askButton = null;
  }

  const selection = window.getSelection();
  const selectedText = selection ? selection.toString().trim() : "";

  if (!selectedText || !selection || selection.rangeCount === 0) {
    return;
  }

  console.log("Selected:", selectedText);

  // ========================================
  // CREATE ASK AI BUTTON
  // ========================================

  askButton = document.createElement("button");

  askButton.innerText = "✨ Ask AI";

  askButton.style.position = "absolute";
  askButton.style.zIndex = "2147483647";

  askButton.style.padding = "9px 14px";

  askButton.style.border = "none";
  askButton.style.borderRadius = "10px";

  askButton.style.background = "#222";
  askButton.style.color = "white";

  askButton.style.fontSize = "14px";
  askButton.style.fontWeight = "600";

  askButton.style.cursor = "pointer";

  askButton.style.boxShadow = "0 5px 20px rgba(0,0,0,0.25)";

  // ========================================
  // FIND SELECTED TEXT POSITION
  // ========================================

  const range = selection.getRangeAt(0);

  const rect = range.getBoundingClientRect();

  askButton.style.left = `${rect.left + window.scrollX}px`;

  askButton.style.top = `${rect.bottom + window.scrollY + 8}px`;

  document.body.appendChild(askButton);

  // ========================================
  // ASK AI CLICK
  // ========================================

  askButton.addEventListener("click", () => {
    console.log("Ask AI clicked!");

    console.log("Selected text:", selectedText);

    createAIWindow(selectedText);

    askButton.remove();

    askButton = null;
  });
});

// ============================================
// CREATE AI WINDOW
// ============================================

function createAIWindow(selectedText) {
  console.log("Creating AI window...");

  // Remove previous window
  if (extensionContainer) {
    extensionContainer.remove();

    extensionContainer = null;
  }

  // ========================================
  // OUTER CONTAINER
  // ========================================

  extensionContainer = document.createElement("div");

  extensionContainer.style.position = "fixed";

  extensionContainer.style.top = "100px";

  extensionContainer.style.right = "10px";

  extensionContainer.style.width = "min(390px, calc(100vw - 20px))";

  extensionContainer.style.height = "auto";

  extensionContainer.style.zIndex = "2147483647";

  // ========================================
  // SHADOW DOM
  // ========================================

  const shadow = extensionContainer.attachShadow({
    mode: "open",
  });

  // ========================================
  // STYLES
  // ========================================

  const style = document.createElement("style");

  style.textContent = `

        * {
            box-sizing: border-box;
        }


        .panel {

            width: 100%;

            max-width: calc(100vw - 40px);

            max-height: 75vh;

            overflow-y: auto;

            border-radius: 22px;

            background:
                linear-gradient(
                    135deg,
                    rgba(255,255,255,0.96),
                    rgba(225,246,255,0.92)
                );

            backdrop-filter: blur(20px);

            border:
                1px solid rgba(255,255,255,0.9);

            box-shadow:
                0 25px 70px rgba(0,80,120,0.25),
                0 5px 20px rgba(0,0,0,0.12);

            color: #17232d;

            font-family:
                Arial,
                sans-serif;

            animation:
                waterDrop
                0.55s
                cubic-bezier(0.16,1,0.3,1);

        }


        @keyframes waterDrop {

            0% {

                opacity: 0;

                transform:
                    scale(0.65)
                    translateY(-30px);

                filter: blur(10px);

            }


            55% {

                opacity: 1;

                transform:
                    scale(1.05)
                    translateY(4px);

                filter: blur(0);

            }


            75% {

                transform:
                    scale(0.98)
                    translateY(-2px);

            }


            100% {

                opacity: 1;

                transform:
                    scale(1)
                    translateY(0);

            }

        }


        .header {

            display: flex;

            justify-content:
                space-between;

            align-items: center;

            padding: 16px 18px;

            border-bottom:
                1px solid rgba(255,255,255,0.8);

            cursor: grab;

            user-select: none;

        }


        .header:active {

            cursor: grabbing;

        }


        .title {

            font-size: 17px;

            font-weight: 700;

        }


        .close {

            width: 30px;

            height: 30px;

            border: none;

            border-radius: 50%;

            background:
                rgba(255,255,255,0.7);

            font-size: 18px;

            cursor: pointer;

        }


        .content {

            padding: 18px;

        }


        .section {

            margin-bottom: 20px;

        }


        .section-title {

            font-size: 14px;

            font-weight: 700;

            margin-bottom: 8px;

        }


        .selected {

            padding: 12px;

            border-radius: 12px;

            background:
                rgba(255,255,255,0.65);

            font-weight: 600;

            word-break: break-word;

        }


        .text {

            margin: 0;

            font-size: 14px;

            line-height: 1.6;

            color: #3d4d58;

        }


        .example {

            padding: 12px;

            border-radius: 12px;

            background:
                rgba(220,245,255,0.7);

            font-size: 14px;

            line-height: 1.6;

        }


        ul {

            padding-left: 20px;

            font-size: 14px;

            line-height: 1.7;

        }
        /* ========================================
   LOADING SCREEN
   ======================================== */

.loading {

    min-height: 300px;

    display: flex;

    flex-direction: column;

    align-items: center;

    justify-content: center;

    text-align: center;

}


.loading-icon {

    font-size: 42px;

    margin-bottom: 15px;

    animation:
        waterFloat 1.5s ease-in-out infinite;
@keyframes waterFloat {

    0% {

        transform:
            translateY(0)
            scale(1);

    }

    50% {

        transform:
            translateY(-8px)
            scale(1.08);

    }

    100% {

        transform:
            translateY(0)
            scale(1);

    }

}
.loading-title {

    font-size: 18px;

    font-weight: 700;

    margin-bottom: 6px;

}


.loading-text {

    font-size: 13px;

    color: #61727d;

}


.loading-dots {

    display: flex;

    gap: 5px;

    margin-top: 15px;
}


.loading-dots span {

    width: 6px;

    height: 6px;

    border-radius: 50%;

    background: #147aa3;

    animation:
        loadingDot 1.2s infinite ease-in-out;
}


.loading-dots span:nth-child(2) {

    animation-delay: 0.15s;

}


.loading-dots span:nth-child(3) {

    animation-delay: 0.3s;

}


@keyframes loadingDot {

    0%,
    80%,
    100% {

        opacity: 0.3;

        transform:
            translateY(0);

    }

    40% {

        opacity: 1;

        transform:
            translateY(-5px);

    }

}

        .deep {

            width: 100%;

            padding: 12px;

            border: none;

            border-radius: 12px;

            background:
                linear-gradient(
                    135deg,
                    #147aa3,
                    #125b83
                );

            color: white;

            font-weight: 600;

            cursor: pointer;

        }

    `;

  shadow.appendChild(style);

  // ========================================
  // PANEL
  // ========================================

  const panel = document.createElement("div");

  panel.className = "panel";

  panel.innerHTML = `

    <div class="header">

        <div class="title">
            ✨ AI Explanation
        </div>

        <button class="close">
            ×
        </button>

    </div>


    <div class="content">

        <div class="loading">

            <div class="loading-icon">
                💧
            </div>

            <div class="loading-title">
                Thinking...
            </div>

            <div class="loading-text">
                Understanding your selected concept
            </div>

            <div class="loading-dots">
                <span></span>
                <span></span>
                <span></span>
            </div>

        </div>

    </div>

`;

  shadow.appendChild(panel);

  // ========================================
  // ADD TO PAGE
  // ========================================

  document.body.appendChild(extensionContainer);
  setTimeout(() => {
    showAnswer(shadow, selectedText);
  }, 1500);

  console.log("AI window successfully added!");

  // ========================================
  // CLOSE
  // ========================================

  panel.querySelector(".close").addEventListener("click", () => {
    extensionContainer.remove();

    extensionContainer = null;
  });

  // ========================================
  // DRAG
  // ========================================

  makeDraggable(extensionContainer, panel.querySelector(".header"));
}

// ============================================
// DRAG FUNCTION
// ============================================

function makeDraggable(element, handle) {
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
function showAnswer(shadow, selectedText) {
  const content = shadow.querySelector(".content");

  content.innerHTML = `

        <div class="section">

            <div class="section-title">
                📌 Selected
            </div>

            <div class="selected"></div>

        </div>


        <div class="section">

            <div class="section-title">
                📖 Simple Definition
            </div>

            <p class="text">

                This is a temporary explanation.
                Later, our AI will generate the
                actual explanation based on the
                selected concept.

            </p>

        </div>


        <div class="section">

            <div class="section-title">
                💡 Example
            </div>

            <div class="example">

                This will eventually contain
                a practical example generated
                by AI.

            </div>

        </div>


        <div class="section">

            <div class="section-title">
                🌍 Real-world Use
            </div>

            <p class="text">

                The AI will explain where this
                concept is used in real software
                and industry.

            </p>

        </div>


        <div class="section">

            <div class="section-title">
                ⚙️ How It Works
            </div>

            <p class="text">

                The AI will break the concept
                down step by step.

            </p>

        </div>


        <div class="section">

            <div class="section-title">
                🚀 Applications
            </div>

            <ul>

                <li>Web development</li>

                <li>Software applications</li>

                <li>Engineering systems</li>

            </ul>

        </div>


        <div class="section">

            <div class="section-title">
                🧠 Want to go deeper?
            </div>

            <button class="deep">

                Ask AI for a deeper explanation

            </button>

        </div>

    `;

  // Safely insert selected text

  content.querySelector(".selected").textContent = selectedText;

  // Deep Dive button

  content.querySelector(".deep").addEventListener("click", () => {
    alert("Real AI Deep Dive will be connected later.");
  });
}
