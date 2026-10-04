const BACKEND_URL = "http://localhost:3000/api/explain";
const EXPLANATION_MESSAGE = "explain-selected-text";

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== EXPLANATION_MESSAGE) {
    return false;
  }

  if (
    typeof message.selectedText !== "string" ||
    !message.selectedText.trim()
  ) {
    sendResponse({ error: "Select some text to explain." });
    return false;
  }

  fetch(BACKEND_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ selectedText: message.selectedText }),
  })
    .then(async (response) => {
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || `Backend error (${response.status}).`);
      }
      if (!data.answer) {
        throw new Error("The backend returned an empty response.");
      }
      sendResponse({ answer: data.answer });
    })
    .catch((error) => {
      sendResponse({
        error:
          error.message || "Please check that the local backend is running.",
      });
    });

  return true;
});
