(function () {
  if (window.__emomonEmbedLoaded) return;
  window.__emomonEmbedLoaded = true;

  var script = document.currentScript;
  var baseUrl = script && script.src ? new URL(script.src).origin : 'https://emomon.vercel.app';
  var moduleName = script && script.dataset.emomonModule ? script.dataset.emomonModule : 'hub';
  var plan = script && script.dataset.emomonPlan ? script.dataset.emomonPlan : 'free';
  var position = script && script.dataset.emomonPosition === 'bottom-left' ? 'bottom-left' : 'bottom-right';
  var isLeft = position === 'bottom-left';
  var source = window.location.href;
  var isOpen = false;

  var root = document.createElement('div');
  root.setAttribute('data-emomon-root', 'true');
  root.style.position = 'fixed';
  root.style[isLeft ? 'left' : 'right'] = '20px';
  root.style.bottom = '20px';
  root.style.zIndex = '2147483000';
  root.style.fontFamily =
    'Inter, "Noto Sans KR", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

  var panel = document.createElement('iframe');
  panel.title = 'Emomon context agent';
  panel.allow = 'clipboard-write';
  panel.src =
    baseUrl +
    '/widget?module=' +
    encodeURIComponent(moduleName) +
    '&plan=' +
    encodeURIComponent(plan) +
    '&source=' +
    encodeURIComponent(source);
  panel.style.position = 'absolute';
  panel.style[isLeft ? 'left' : 'right'] = '0';
  panel.style.bottom = '64px';
  panel.style.width = '390px';
  panel.style.height = '620px';
  panel.style.maxWidth = 'calc(100vw - 24px)';
  panel.style.maxHeight = 'calc(100vh - 96px)';
  panel.style.border = '1px solid rgba(24, 24, 27, 0.14)';
  panel.style.borderRadius = '14px';
  panel.style.boxShadow = '0 24px 80px rgba(17, 24, 39, 0.24)';
  panel.style.background = '#ffffff';
  panel.style.display = 'none';

  var button = document.createElement('button');
  button.type = 'button';
  button.setAttribute('aria-label', 'Emomon context agent open');
  button.style.display = 'inline-flex';
  button.style.alignItems = 'center';
  button.style.gap = '10px';
  button.style.height = '52px';
  button.style.border = '0';
  button.style.borderRadius = '999px';
  button.style.padding = '0 16px 0 10px';
  button.style.background = '#09090b';
  button.style.color = '#ffffff';
  button.style.boxShadow = '0 14px 38px rgba(17, 24, 39, 0.24)';
  button.style.cursor = 'pointer';
  button.style.fontWeight = '900';
  button.style.fontSize = '14px';
  button.style.letterSpacing = '0';

  var mark = document.createElement('span');
  mark.textContent = 'M';
  mark.style.display = 'inline-flex';
  mark.style.alignItems = 'center';
  mark.style.justifyContent = 'center';
  mark.style.width = '34px';
  mark.style.height = '34px';
  mark.style.borderRadius = '10px';
  mark.style.background = '#ffffff';
  mark.style.color = '#09090b';
  mark.style.fontWeight = '900';

  var label = document.createElement('span');
  label.textContent = 'Emomon';

  button.appendChild(mark);
  button.appendChild(label);

  function syncPanel() {
    panel.style.display = isOpen ? 'block' : 'none';
    label.textContent = isOpen ? '닫기' : 'Emomon';
    button.setAttribute('aria-expanded', String(isOpen));
  }

  button.addEventListener('click', function () {
    isOpen = !isOpen;
    syncPanel();
  });

  window.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && isOpen) {
      isOpen = false;
      syncPanel();
    }
  });

  root.appendChild(panel);
  root.appendChild(button);
  document.addEventListener('DOMContentLoaded', function () {
    document.body.appendChild(root);
  });
  if (document.body) {
    document.body.appendChild(root);
  }
})();
