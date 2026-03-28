// 監看 DOM，替 <img> 加上 Download 按鈕
const ADDED = new WeakSet();

function getHighestResImageUrl(img) {
  // 檢查 srcset 屬性，取最高解析度
  const srcset = img.srcset || img.getAttribute('data-srcset');
  if (srcset) {
    const sources = srcset.split(',').map(s => s.trim());
    let maxWidth = 0;
    let bestUrl = null;
    sources.forEach(source => {
      const parts = source.split(' ');
      if (parts.length >= 2) {
        const url = parts[0];
        const widthMatch = parts[1].match(/(\d+)w/);
        if (widthMatch) {
          const width = parseInt(widthMatch[1]);
          if (width > maxWidth) {
            maxWidth = width;
            bestUrl = url;
          }
        }
      }
    });
    if (bestUrl) return bestUrl;
  }
  
  // 如果沒有 srcset，嘗試其他屬性
  return img.getAttribute('data-src') || img.currentSrc || img.src;
}

function makeBtn(el) {
  const btn = document.createElement('button');
  btn.textContent = 'Download';
  btn.style.position = 'absolute';
  btn.style.top = '8px';
  btn.style.right = '8px';
  btn.style.zIndex = 9999;
  btn.style.padding = '6px 10px';
  btn.style.borderRadius = '10px';
  btn.style.border = 'none';
  btn.style.background = 'rgba(0,0,0,.7)';
  btn.style.color = '#fff';
  btn.style.cursor = 'pointer';
  btn.style.fontSize = '12px';
  btn.addEventListener('click', async (e) => {
    e.stopPropagation();
    let url = getHighestResImageUrl(el);
    if (!url) {
      url = el.currentSrc || el.src;
    }
    const u = (url || '').split('?')[0];
    const name = u.endsWith('.webp') ? 'photo.webp' : (u.split('/').pop() || 'photo.jpg');

    if (!url) {
      showToast('找不到圖片來源。');
      return;
    }

    chrome.runtime.sendMessage({ type: 'DOWNLOAD', url, suggestName: name }, (res) => {
      if (!res?.ok) {
        showToast('下載失敗：' + (res?.error || '未知錯誤'));
      } else {
        showToast('開始下載…');
      }
    });
  });
  return btn;
}

function decorate(el) {
  if (ADDED.has(el)) return;
  // 包裝一個相對定位容器，好讓按鈕定位
  const wrapper = el.closest('[role="button"], article, div') || el.parentElement;
  if (!wrapper) return;
  const host = wrapper;
  const style = window.getComputedStyle(host);
  if (style.position === 'static') host.style.position = 'relative';

  const btn = makeBtn(el);
  host.appendChild(btn);
  ADDED.add(el);
}

function scan() {
  document.querySelectorAll('img[src]').forEach((el) => {
    // 過濾頭像/圖示，小於一定尺寸的不加
    const rect = el.getBoundingClientRect();
    if (rect.width < 120 || rect.height < 120) return;
    decorate(el);
  });
}

const mo = new MutationObserver(() => scan());
mo.observe(document.documentElement, { childList: true, subtree: true });
scan();

// 簡單 Toast
function showToast(text) {
  const t = document.createElement('div');
  t.textContent = text;
  t.style.position = 'fixed';
  t.style.left = '50%';
  t.style.top = '10%';
  t.style.transform = 'translateX(-50%)';
  t.style.background = 'rgba(0,0,0,.8)';
  t.style.color = '#fff';
  t.style.padding = '10px 14px';
  t.style.borderRadius = '10px';
  t.style.zIndex = 10000;
  t.style.fontSize = '14px';
  t.style.pointerEvents = 'none';
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 1800);
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === 'TOAST' && msg.text) showToast(msg.text);
});
