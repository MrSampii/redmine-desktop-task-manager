window.RedmineApp = window.RedmineApp || {};
window.RedmineApp.utils = window.RedmineApp.utils || {};

window.RedmineApp.utils.createDescriptionHelpers = function createDescriptionHelpers(state) {
  const { escapeHtml, formatBytes, formatTs } = window.RedmineApp.utils;
  function appendApiKey(url) {
    const apiKey = String(state.config?.apiKey || '').trim();
    const baseUrl = String(state.config?.baseUrl || '').trim();
    if (!apiKey || !baseUrl) {
      return url;
    }

    try {
      const target = new URL(url);
      const base = new URL(baseUrl);
      if (target.origin !== base.origin) {
        return url;
      }

      if (target.searchParams.has('key')) {
        return target.toString();
      }

      target.searchParams.set('key', apiKey);
      return target.toString();
    } catch {
      return url;
    }
  }

  function resolveDescriptionUrl(rawUrl) {
    const value = String(rawUrl || '').trim();
    if (!value) {
      return '';
    }

    if (/^(data:|blob:)/i.test(value)) {
      return value;
    }

    const baseUrl = String(state.config?.baseUrl || '').trim();
    try {
      const absolute = /^https?:\/\//i.test(value)
        ? new URL(value)
        : new URL(value, `${baseUrl.replace(/\/+$/, '')}/`);
      return appendApiKey(absolute.toString());
    } catch {
      return value;
    }
  }

  function findAttachmentUrlByReference(reference, issue) {
    const ref = String(reference || '').trim();
    if (!ref) {
      return '';
    }

    const byName = (issue?.attachments || []).find((item) => String(item.filename || '').toLowerCase() === ref.toLowerCase());
    return byName?.contentUrl || '';
  }

  function sanitizeDescriptionHtml(rawDescription, issue) {
    const source = String(rawDescription || '').trim();
    if (!source) {
      return '<span class="meta">No description available.</span>';
    }

    let normalized = source;
    normalized = normalized.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, src) => {
      const mapped = findAttachmentUrlByReference(src, issue) || src;
      return `<img alt="${escapeHtml(alt)}" src="${escapeHtml(mapped)}" />`;
    });
    normalized = normalized.replace(/!([^!\s]+)!/g, (_, ref) => {
      const mapped = findAttachmentUrlByReference(ref, issue) || ref;
      return `<img src="${escapeHtml(mapped)}" alt="embedded image" />`;
    });

    const maybeHtml = /<\s*[a-z][\s\S]*>/i.test(normalized);
    const inputHtml = maybeHtml ? normalized : normalized.replace(/\n/g, '<br>');

    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${inputHtml}</div>`, 'text/html');
    const root = doc.body.firstElementChild;
    if (!root) {
      return '<span class="meta">No description available.</span>';
    }

    root.querySelectorAll('script,style,iframe,object,embed,link,meta').forEach((node) => node.remove());

    root.querySelectorAll('*').forEach((node) => {
      [...node.attributes].forEach((attr) => {
        const name = attr.name.toLowerCase();
        const value = attr.value;

        if (name.startsWith('on') || name === 'style') {
          node.removeAttribute(attr.name);
          return;
        }

        if (node.tagName.toLowerCase() === 'a' && name === 'href') {
          const href = resolveDescriptionUrl(value);
          if (!/^https?:\/\//i.test(href)) {
            node.removeAttribute(attr.name);
            return;
          }

          node.setAttribute('href', href);
          node.setAttribute('target', '_blank');
          node.setAttribute('rel', 'noopener noreferrer');
          return;
        }

        if (node.tagName.toLowerCase() === 'img' && name === 'src') {
          const src = resolveDescriptionUrl(value);
          if (!src) {
            node.remove();
            return;
          }

          node.setAttribute('src', src);
          node.setAttribute('loading', 'lazy');
          return;
        }

        if (!['href', 'src', 'alt', 'title', 'target', 'rel', 'loading'].includes(name)) {
          node.removeAttribute(attr.name);
        }
      });
    });

    return root.innerHTML || '<span class="meta">No description available.</span>';
  }

  function buildAttachmentAccessUrl(url) {
    const raw = String(url || '').trim();
    if (!raw) {
      return '';
    }

    if (!state.config?.apiKey) {
      return raw;
    }

    const separator = raw.includes('?') ? '&' : '?';
    return `${raw}${separator}key=${encodeURIComponent(state.config.apiKey)}`;
  }

  function renderAttachmentCard(attachment, idx) {
    const previewUrl = buildAttachmentAccessUrl(attachment.thumbnailUrl || attachment.contentUrl);
    const isImage = String(attachment?.contentType || '').toLowerCase().startsWith('image/')
      || /\.(png|jpg|jpeg|gif|bmp|webp|svg)$/.test(String(attachment?.filename || '').toLowerCase());
    const preview = isImage && previewUrl
      ? `<img class="attachment-preview" src="${escapeHtml(previewUrl)}" alt="${escapeHtml(attachment.filename)}" />`
      : '<div class="attachment-file-icon">FILE</div>';

    return `
      <div class="attachment-card">
        ${preview}
        <div class="attachment-meta">
          <div class="attachment-name">${escapeHtml(attachment.filename || 'unnamed')}</div>
          <div class="meta">${escapeHtml(formatBytes(attachment.filesize))} | ${escapeHtml(attachment.contentType || 'file')}</div>
          <div class="meta">${escapeHtml(attachment.author || '-')} | ${escapeHtml(formatTs(attachment.createdOn))}</div>
        </div>
        <div class="row">
          <button type="button" class="secondary" data-action="open-attachment" data-index="${idx}">Open</button>
        </div>
      </div>
    `;
  }

  return {
    buildAttachmentAccessUrl,
    renderAttachmentCard,
    sanitizeDescriptionHtml,
  };
};
