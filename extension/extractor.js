/**
 * Handoff Content Script — Extracts conversations from AI chat platforms
 *
 * Each platform has a different DOM structure. This script detects which
 * platform we're on and extracts messages accordingly.
 */

(function() {
  'use strict';

  // Detect which platform we're on
  function detectPlatform() {
    const host = window.location.hostname;
    const path = window.location.pathname;
    if (host.includes('chatgpt.com') || host.includes('chat.openai.com')) return 'chatgpt';
    if (host.includes('claude.ai')) return 'claude';
    if (host.includes('gemini.google.com') || host.includes('aistudio.google.com') || host.includes('labs.google')) return 'gemini';
    if (host.includes('copilot.microsoft.com')) return 'copilot';
    if (host.includes('kiro.dev')) return 'kiro';
    if (host.includes('grok.com') || (host.includes('x.com') && path.includes('grok'))) return 'grok';
    if (host.includes('perplexity.ai')) return 'perplexity';
    if (host.includes('poe.com')) return 'poe';
    if (host.includes('chat.mistral.ai')) return 'mistral';
    if (host.includes('chat.deepseek.com')) return 'deepseek';
    if (host.includes('you.com')) return 'you';
    if (host.includes('pi.ai')) return 'pi';
    if (host.includes('chat.qwenlm.ai')) return 'qwen';
    if (host.includes('huggingface.co')) return 'huggingface';
    if (host.includes('coral.cohere.com')) return 'cohere';
    if (host.includes('chat.reka.ai')) return 'reka';
    if (host.includes('fireworks.ai')) return 'fireworks';
    return 'unknown';
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

  // Main extraction function
  function extract() {
    const platform = detectPlatform();
    let messages = [];

    switch (platform) {
      case 'chatgpt': messages = extractChatGPT(); break;
      case 'claude': messages = extractClaude(); break;
      case 'gemini': messages = extractGemini(); break;
      case 'copilot': messages = extractCopilot(); break;
      default: messages = extractGeneric(); break;
    }

    // If platform-specific extractor failed, try generic as fallback
    if (messages.length === 0 && platform !== 'unknown') {
      messages = extractGeneric();
    }

    // Get page title for context
    const title = document.title || '';
    const url = window.location.href;

    return {
      platform,
      title,
      url,
      messages,
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
