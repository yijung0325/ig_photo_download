// 建立右鍵選單（只在圖片/影片上出現）
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "igdl",
    title: "下載這個 IG 媒體",
    contexts: ["image", "video"]
  });
});

function downloadByUrl(url, suggestName) {
  const clean = (url || "").split("?")[0];
  const name = suggestName || (clean.split("/").pop() || "ig-media");
  return new Promise((resolve) => {
    chrome.downloads.download({ url, filename: name, saveAs: false }, (id) => {
      if (chrome.runtime.lastError) resolve({ ok: false, error: chrome.runtime.lastError.message });
      else resolve({ ok: true, id });
    });
  });
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "igdl") return;
  const url = info.srcUrl || info.linkUrl;
  if (!url || url.startsWith("blob:")) {
    // 右鍵在使用 blob: 的情況下，提示改用 Network 抓取
    chrome.tabs.sendMessage(tab.id, { type: "TOAST", text: "此媒體為 blob/串流，請改用開發者工具 Network 抓 mp4/jpg。" });
    return;
  }
  const res = await downloadByUrl(url);
  if (!res.ok) chrome.tabs.sendMessage(tab.id, { type: "TOAST", text: "下載失敗：" + (res.error || "未知錯誤") });
});

// 仍保留來自 content script 的下載訊息（按鈕用）
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "DOWNLOAD" && msg.url) {
    downloadByUrl(msg.url, msg.suggestName).then(sendResponse);
    return true; // keep channel open
  }
});
