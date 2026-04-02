/**
 * Handoff Content Script — Extracts context from AI platforms
 *
 * Auto-detects mode from URL:
 *   Chat mode: conversations from ChatGPT, Claude, Gemini, etc.
 *   Creative mode: prompts, settings, parameters from Runway, Midjourney, Suno, etc.
 */

(function() {
  'use strict';

  // Platform registry — maps URL patterns to platform ID and mode
  const PLATFORM_REGISTRY = {
    // Chat platforms
    'chatgpt.com': {id: 'chatgpt', mode: 'chat'},
    'chat.openai.com': {id: 'chatgpt', mode: 'chat'},
    'claude.ai': {id: 'claude', mode: 'chat'},
    'gemini.google.com': {id: 'gemini', mode: 'chat'},
    'aistudio.google.com': {id: 'gemini', mode: 'chat'},
    'labs.google': {id: 'gemini', mode: 'chat'},
    'copilot.microsoft.com': {id: 'copilot', mode: 'chat'},
    'kiro.dev': {id: 'kiro', mode: 'chat'},
    'grok.com': {id: 'grok', mode: 'chat'},
    'perplexity.ai': {id: 'perplexity', mode: 'chat'},
    'poe.com': {id: 'poe', mode: 'chat'},
    'chat.mistral.ai': {id: 'mistral', mode: 'chat'},
    'chat.deepseek.com': {id: 'deepseek', mode: 'chat'},
    'you.com': {id: 'you', mode: 'chat'},
    'pi.ai': {id: 'pi', mode: 'chat'},
    'chat.qwenlm.ai': {id: 'qwen', mode: 'chat'},
    'huggingface.co': {id: 'huggingface', mode: 'chat'},
    'coral.cohere.com': {id: 'cohere', mode: 'chat'},
    'chat.reka.ai': {id: 'reka', mode: 'chat'},
    'fireworks.ai': {id: 'fireworks', mode: 'chat'},
    // Video platforms
    'app.runwayml.com': {id: 'runway', mode: 'video'},
    'runwayml.com': {id: 'runway', mode: 'video'},
    'pika.art': {id: 'pika', mode: 'video'},
    'klingai.com': {id: 'kling', mode: 'video'},
    'lumalabs.ai': {id: 'luma', mode: 'video'},
    'sora.com': {id: 'sora', mode: 'video'},
    'haiper.ai': {id: 'haiper', mode: 'video'},
    'minimax.io': {id: 'minimax', mode: 'video'},
    'vidu.com': {id: 'vidu', mode: 'video'},
    // Image platforms
    'midjourney.com': {id: 'midjourney', mode: 'image'},
    'ideogram.ai': {id: 'ideogram', mode: 'image'},
    'leonardo.ai': {id: 'leonardo', mode: 'image'},
    'dreamstudio.ai': {id: 'dreamstudio', mode: 'image'},
    'stability.ai': {id: 'stability', mode: 'image'},
    'playground.com': {id: 'playground', mode: 'image'},
    'lexica.art': {id: 'lexica', mode: 'image'},
    'nightcafe.studio': {id: 'nightcafe', mode: 'image'},
    'openart.ai': {id: 'openart', mode: 'image'},
    'tensor.art': {id: 'tensor', mode: 'image'},
    'civitai.com': {id: 'civitai', mode: 'image'},
    'getimg.ai': {id: 'getimg', mode: 'image'},
    // Music platforms
    'suno.com': {id: 'suno', mode: 'music'},
    'udio.com': {id: 'udio', mode: 'music'},
    'soundraw.io': {id: 'soundraw', mode: 'music'},
    'aiva.ai': {id: 'aiva', mode: 'music'},
    'boomy.com': {id: 'boomy', mode: 'music'},
    // 3D platforms
    'meshy.ai': {id: 'meshy', mode: '3d'},
    'tripo3d.ai': {id: 'tripo', mode: '3d'},
    'spline.design': {id: 'spline', mode: '3d'},
    'kaedim.com': {id: 'kaedim', mode: '3d'},
    // Design platforms
    'figma.com': {id: 'figma', mode: 'design'},
    'canva.com': {id: 'canva', mode: 'design'},
    'framer.com': {id: 'framer', mode: 'design'},
    // Writing platforms
    'jasper.ai': {id: 'jasper', mode: 'writing'},
    'copy.ai': {id: 'copyai', mode: 'writing'},
    'writesonic.com': {id: 'writesonic', mode: 'writing'},
    'notion.so': {id: 'notion', mode: 'writing'},
    'grammarly.com': {id: 'grammarly', mode: 'writing'},
  };

  function detectPlatform() {
    const host = window.location.hostname;
    const path = window.location.pathname;

    // Check for x.com/grok special case
    if (host.includes('x.com') && path.includes('grok')) {
      return {id: 'grok', mode: 'chat'};
    }

    // Match against registry
    for (const [domain, info] of Object.entries(PLATFORM_REGISTRY)) {
      if (host.includes(domain)) return info;
    }

    return {id: 'unknown', mode: 'unknown'};
  }

  // Extract conversation from ChatGPT
  function extractChatGPT() {
    const messages = [];
    // ChatGPT uses article elements or divs with data-message-author-role
    const articles = document.querySelectorAll('[data-message-author-role]');
    if (articles.length > 0) {
      articles.forEach(el => {
        const role = el.getAttribute('data-message-author-role');
        const content = el.innerText.trim();
        if (content) {
          messages.push({ role: role === 'user' ? 'user' : 'assistant', content });
        }
      });
    }

    // Fallback: try conversation turn containers
    if (messages.length === 0) {
      const turns = document.querySelectorAll('[data-testid^="conversation-turn"]');
      turns.forEach(turn => {
        const isUser = turn.querySelector('[data-message-author-role="user"]');
        const textEl = turn.querySelector('.markdown, .whitespace-pre-wrap, [class*="prose"]');
        const content = (textEl || turn).innerText.trim();
        if (content) {
          messages.push({ role: isUser ? 'user' : 'assistant', content });
        }
      });
    }

    // Fallback 2: grab all prose/markdown blocks
    if (messages.length === 0) {
      const blocks = document.querySelectorAll('.markdown.prose, .whitespace-pre-wrap');
      let isUser = true;
      blocks.forEach(block => {
        const content = block.innerText.trim();
        if (content) {
          messages.push({ role: isUser ? 'user' : 'assistant', content });
          isUser = !isUser;
        }
      });
    }

    return messages;
  }

  // Extract conversation from Claude
  function extractClaude() {
    const messages = [];

    // Claude uses fieldset or div containers for each message
    const humanMsgs = document.querySelectorAll('[data-testid="human-turn"], .font-user-message');
    const aiMsgs = document.querySelectorAll('[data-testid="ai-turn"], .font-claude-message');

    // Try data-testid approach first
    if (humanMsgs.length > 0 || aiMsgs.length > 0) {
      const allTurns = document.querySelectorAll('[data-testid="human-turn"], [data-testid="ai-turn"]');
      allTurns.forEach(turn => {
        const isHuman = turn.getAttribute('data-testid') === 'human-turn';
        const content = turn.innerText.trim();
        if (content) {
          messages.push({ role: isHuman ? 'user' : 'assistant', content });
        }
      });
    }

    // Fallback: look for message containers by structure
    if (messages.length === 0) {
      const containers = document.querySelectorAll('.contents > div, [class*="Message"]');
      containers.forEach(container => {
        const text = container.innerText.trim();
        if (text && text.length > 5) {
          // Heuristic: user messages tend to be shorter and don't contain code blocks
          const hasCode = container.querySelector('pre, code, .code-block');
          const isLong = text.length > 500;
          messages.push({
            role: (hasCode || isLong) ? 'assistant' : 'user',
            content: text
          });
        }
      });
    }

    return messages;
  }

  // Extract conversation from Gemini
  function extractGemini() {
    const messages = [];

    // Gemini uses specific message containers
    const turns = document.querySelectorAll('message-content, .conversation-container > div, [class*="query"], [class*="response"]');

    if (turns.length > 0) {
      turns.forEach(turn => {
        const classList = turn.className || '';
        const isUser = classList.includes('query') || classList.includes('user') ||
                       turn.querySelector('[class*="query"]');
        const content = turn.innerText.trim();
        if (content && content.length > 2) {
          messages.push({ role: isUser ? 'user' : 'assistant', content });
        }
      });
    }

    // Fallback: alternating blocks
    if (messages.length === 0) {
      const blocks = document.querySelectorAll('.model-response-text, .query-text, [class*="message-text"]');
      blocks.forEach(block => {
        const classList = block.className || '';
        const isUser = classList.includes('query');
        const content = block.innerText.trim();
        if (content) {
          messages.push({ role: isUser ? 'user' : 'assistant', content });
        }
      });
    }

    return messages;
  }

  // Extract from Copilot
  function extractCopilot() {
    const messages = [];
    const turns = document.querySelectorAll('[class*="message"], [class*="turn"]');
    turns.forEach(turn => {
      const classList = turn.className || '';
      const isUser = classList.includes('user') || classList.includes('human');
      const content = turn.innerText.trim();
      if (content && content.length > 2) {
        messages.push({ role: isUser ? 'user' : 'assistant', content });
      }
    });
    return messages;
  }

  // Generic extractor — works on most chat UIs by detecting common patterns
  function extractGeneric() {
    const messages = [];

    // Strategy 1: look for role-based attributes
    const roleEls = document.querySelectorAll('[data-role], [data-message-role], [data-author], [data-sender]');
    if (roleEls.length > 0) {
      roleEls.forEach(el => {
        const role = (el.getAttribute('data-role') || el.getAttribute('data-message-role') ||
                      el.getAttribute('data-author') || el.getAttribute('data-sender') || '').toLowerCase();
        const isUser = role.includes('user') || role.includes('human');
        const content = el.innerText.trim();
        if (content && content.length > 2) {
          messages.push({ role: isUser ? 'user' : 'assistant', content });
        }
      });
      if (messages.length > 0) return messages;
    }

    // Strategy 2: look for common class patterns
    const selectors = [
      '[class*="user-message"], [class*="assistant-message"], [class*="bot-message"]',
      '[class*="human"], [class*="ai-response"]',
      '[class*="chat-message"], [class*="message-content"]',
      '[class*="query"], [class*="response"]',
      '[class*="turn"], [class*="bubble"]',
    ];

    for (const sel of selectors) {
      const els = document.querySelectorAll(sel);
      if (els.length >= 2) {
        els.forEach(el => {
          const cls = (el.className || '').toLowerCase();
          const isUser = cls.includes('user') || cls.includes('human') || cls.includes('query');
          const content = el.innerText.trim();
          if (content && content.length > 2) {
            messages.push({ role: isUser ? 'user' : 'assistant', content });
          }
        });
        if (messages.length > 0) return messages;
      }
    }

    // Strategy 3: look for markdown/prose blocks (alternating)
    const blocks = document.querySelectorAll('.markdown, .prose, [class*="prose"], pre, [class*="code-block"]');
    if (blocks.length >= 2) {
      let isUser = true;
      blocks.forEach(block => {
        const content = block.innerText.trim();
        if (content && content.length > 5) {
          messages.push({ role: isUser ? 'user' : 'assistant', content });
          isUser = !isUser;
        }
      });
    }

    return messages;
  }

  // ═══════════════════════════════════════════════
  // CREATIVE MODE EXTRACTORS
  // ═══════════════════════════════════════════════

  // Universal creative extractor — scans page for prompts, settings, parameters
  function extractCreative() {
    const result = {
      prompts: [],
      settings: {},
      parameters: {},
      generations: [],
      timeline: [],
      assets: [],
    };

    // ── PROMPTS: find text inputs, textareas, and prompt-like elements ──
    const promptSelectors = [
      'textarea', 'input[type="text"]',
      '[class*="prompt"]', '[class*="Prompt"]',
      '[data-testid*="prompt"]', '[aria-label*="prompt"]',
      '[placeholder*="prompt"]', '[placeholder*="describe"]',
      '[placeholder*="Enter"]', '[placeholder*="Type"]',
      '[class*="input-area"]', '[class*="editor"]',
    ];
    const seenPrompts = new Set();
    promptSelectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        const text = (el.value || el.innerText || el.textContent || '').trim();
        if (text && text.length > 5 && text.length < 5000 && !seenPrompts.has(text)) {
          seenPrompts.add(text);
          result.prompts.push({
            text: text,
            source: el.tagName.toLowerCase() + (el.className ? '.' + el.className.split(' ')[0] : ''),
          });
        }
      });
    });

    // ── SETTINGS: find dropdowns, sliders, toggles, number inputs ──
    // Dropdowns / selects
    document.querySelectorAll('select, [role="listbox"], [role="combobox"]').forEach(el => {
      const label = _findLabel(el);
      const value = el.value || el.innerText?.trim().split('\n')[0] || '';
      if (label && value) {
        result.settings[label] = value;
      }
    });

    // Sliders / range inputs
    document.querySelectorAll('input[type="range"], [role="slider"]').forEach(el => {
      const label = _findLabel(el);
      const value = el.value || el.getAttribute('aria-valuenow') || '';
      if (label && value) {
        result.settings[label] = value;
      }
    });

    // Number inputs
    document.querySelectorAll('input[type="number"]').forEach(el => {
      const label = _findLabel(el);
      if (label && el.value) {
        result.settings[label] = el.value;
      }
    });

    // Toggles / checkboxes
    document.querySelectorAll('input[type="checkbox"], [role="switch"]').forEach(el => {
      const label = _findLabel(el);
      if (label) {
        result.settings[label] = el.checked ? 'on' : 'off';
      }
    });

    // ── PARAMETERS: look for key-value displays (often in sidebars/panels) ──
    const paramPatterns = [
      '[class*="parameter"]', '[class*="Parameter"]',
      '[class*="setting"]', '[class*="Setting"]',
      '[class*="config"]', '[class*="detail"]',
      '[class*="metadata"]', '[class*="info-panel"]',
      '[class*="sidebar"] label', '[class*="panel"] label',
    ];
    paramPatterns.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        const text = el.innerText?.trim();
        if (text && text.includes(':')) {
          const parts = text.split(':');
          const key = parts[0].trim();
          const val = parts.slice(1).join(':').trim();
          if (key && val && key.length < 50 && val.length < 200) {
            result.parameters[key] = val;
          }
        }
      });
    });

    // ── GENERATIONS: find generated content cards/thumbnails ──
    const genSelectors = [
      '[class*="generation"]', '[class*="Generation"]',
      '[class*="result"]', '[class*="output"]',
      '[class*="gallery"] img', '[class*="grid"] img',
      '[class*="preview"]', '[class*="thumbnail"]',
      'video[src]', 'audio[src]',
    ];
    genSelectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        const gen = {};
        if (el.tagName === 'IMG') {
          gen.type = 'image';
          gen.src = el.src || el.getAttribute('data-src') || '';
          gen.alt = el.alt || '';
        } else if (el.tagName === 'VIDEO') {
          gen.type = 'video';
          gen.src = el.src || el.querySelector('source')?.src || '';
        } else if (el.tagName === 'AUDIO') {
          gen.type = 'audio';
          gen.src = el.src || el.querySelector('source')?.src || '';
        } else {
          gen.type = 'content';
          gen.text = el.innerText?.trim().slice(0, 500);
        }
        if (gen.src || gen.text) {
          result.generations.push(gen);
        }
      });
    });

    // Dedupe generations by src
    const seenSrc = new Set();
    result.generations = result.generations.filter(g => {
      if (g.src) {
        if (seenSrc.has(g.src)) return false;
        seenSrc.add(g.src);
      }
      return true;
    }).slice(0, 20);

    // ── TIMELINE: look for timeline/sequence elements (video editors) ──
    const timelineEls = document.querySelectorAll(
      '[class*="timeline"], [class*="Timeline"], [class*="sequence"], [class*="keyframe"]'
    );
    timelineEls.forEach(el => {
      const text = el.innerText?.trim();
      if (text && text.length > 3 && text.length < 500) {
        result.timeline.push(text);
      }
    });
    result.timeline = result.timeline.slice(0, 10);

    // ── PAGE-LEVEL: grab visible text that looks like project info ──
    const headings = document.querySelectorAll('h1, h2, h3, [class*="title"], [class*="Title"], [class*="project-name"]');
    headings.forEach(el => {
      const text = el.innerText?.trim();
      if (text && text.length > 2 && text.length < 100) {
        result.parameters['_heading_' + result.assets.length] = text;
      }
    });

    return result;
  }

  // Helper: find label text near a form element
  function _findLabel(el) {
    // Check for associated label
    if (el.id) {
      const label = document.querySelector('label[for="' + el.id + '"]');
      if (label) return label.innerText?.trim();
    }
    // Check for aria-label
    const ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel.trim();
    // Check for nearby label (parent or sibling)
    const parent = el.closest('label, [class*="field"], [class*="form-group"], [class*="control"]');
    if (parent) {
      const labelEl = parent.querySelector('label, span, [class*="label"]');
      if (labelEl && labelEl !== el) {
        const text = labelEl.innerText?.trim();
        if (text && text.length < 50) return text;
      }
    }
    // Check placeholder
    const ph = el.getAttribute('placeholder');
    if (ph) return ph.trim();
    // Check title
    const title = el.getAttribute('title');
    if (title) return title.trim();
    return '';
  }

  // ═══════════════════════════════════════════════
  // MAIN EXTRACTION
  // ═══════════════════════════════════════════════

  function extract() {
    const {id: platform, mode} = detectPlatform();
    let messages = [];
    let creative = null;

    if (mode === 'chat' || mode === 'unknown') {
      // Chat extraction
      switch (platform) {
        case 'chatgpt': messages = extractChatGPT(); break;
        case 'claude': messages = extractClaude(); break;
        case 'gemini': messages = extractGemini(); break;
        case 'copilot': messages = extractCopilot(); break;
        default: messages = extractGeneric(); break;
      }
      if (messages.length === 0 && platform !== 'unknown') {
        messages = extractGeneric();
      }
    }

    if (mode !== 'chat') {
      // Creative extraction — always run for creative platforms
      creative = extractCreative();
      // Also try chat extraction as fallback (some creative tools have chat interfaces)
      if (!creative.prompts.length && !Object.keys(creative.settings).length) {
        messages = extractGeneric();
      }
    }

    const title = document.title || '';
    const url = window.location.href;

    return {
      platform,
      mode,
      title,
      url,
      messages,
      creative,
      extracted_at: new Date().toISOString(),
      message_count: messages.length,
    };
  }

  // Listen for extraction requests from popup (Firefox/Chrome compatible)
  const runtimeApi = typeof browser !== 'undefined' ? browser : chrome;
  runtimeApi.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'extract') {
      const data = extract();
      sendResponse(data);
    }
    return true; // Keep channel open for async response
  });

})();
