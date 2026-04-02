const api = typeof browser !== 'undefined' ? browser : chrome;
let extractedContext = '';

const PLATFORMS = {
  chatgpt:     {name: 'ChatGPT',      color: 'ok', url: 'https://chatgpt.com/'},
  claude:      {name: 'Claude',        color: 'ok', url: 'https://claude.ai/new'},
  gemini:      {name: 'Gemini',        color: 'ok', url: 'https://gemini.google.com/app'},
  copilot:     {name: 'Copilot',       color: 'ok', url: 'https://copilot.microsoft.com/'},
  kiro:        {name: 'Kiro',          color: 'ok', url: 'https://kiro.dev/'},
  grok:        {name: 'Grok',          color: 'ok', url: 'https://grok.com/'},
  perplexity:  {name: 'Perplexity',    color: 'ok', url: 'https://www.perplexity.ai/'},
  poe:         {name: 'Poe',           color: 'ok', url: 'https://poe.com/'},
  mistral:     {name: 'Mistral',       color: 'ok', url: 'https://chat.mistral.ai/'},
  deepseek:    {name: 'DeepSeek',      color: 'ok', url: 'https://chat.deepseek.com/'},
  you:         {name: 'You.com',       color: 'ok', url: 'https://you.com/'},
  pi:          {name: 'Pi',            color: 'ok', url: 'https://pi.ai/'},
  qwen:        {name: 'Qwen',          color: 'ok', url: 'https://chat.qwenlm.ai/'},
  huggingface: {name: 'HuggingChat',   color: 'ok', url: 'https://huggingface.co/chat/'},
  cohere:      {name: 'Cohere',        color: 'ok', url: 'https://coral.cohere.com/'},
  reka:        {name: 'Reka',          color: 'ok', url: 'https://chat.reka.ai/'},
  fireworks:   {name: 'Fireworks',     color: 'ok', url: 'https://app.fireworks.ai/'},
  unknown:     {name: 'Unknown page',  color: 'err', url: ''},
};

// Detect platform on load
(async function detectPlatformInit() {
  try {
    const tabs = await api.tabs.query({active: true, currentWindow: true});
    const url = tabs[0]?.url || '';
    let platform = 'unknown';
    if (url.includes('chatgpt.com') || url.includes('chat.openai.com')) platform = 'chatgpt';
    else if (url.includes('claude.ai')) platform = 'claude';
    else if (url.includes('gemini.google.com') || url.includes('aistudio.google.com') || url.includes('labs.google')) platform = 'gemini';
    else if (url.includes('copilot.microsoft.com')) platform = 'copilot';
    else if (url.includes('kiro.dev')) platform = 'kiro';
    else if (url.includes('grok.com') || (url.includes('x.com') && url.includes('grok'))) platform = 'grok';
    else if (url.includes('perplexity.ai')) platform = 'perplexity';
    else if (url.includes('poe.com')) platform = 'poe';
    else if (url.includes('chat.mistral.ai')) platform = 'mistral';
    else if (url.includes('chat.deepseek.com')) platform = 'deepseek';
    else if (url.includes('you.com')) platform = 'you';
    else if (url.includes('pi.ai')) platform = 'pi';
    else if (url.includes('chat.qwenlm.ai')) platform = 'qwen';
    else if (url.includes('huggingface.co')) platform = 'huggingface';
    else if (url.includes('coral.cohere.com')) platform = 'cohere';
    else if (url.includes('chat.reka.ai')) platform = 'reka';
    else if (url.includes('fireworks.ai')) platform = 'fireworks';

    const info = PLATFORMS[platform];
    document.getElementById('platformDot').className = 'dot dot-' + info.color;
    document.getElementById('platformName').textContent = info.name;

    if (platform === 'unknown') {
      document.getElementById('status').className = 'status status-err';
      document.getElementById('status').textContent = 'Navigate to ChatGPT, Claude, Gemini, or Copilot first. Current page: ' + (url.split('/')[2] || 'unknown');
      document.getElementById('extractBtn').disabled = true;
    }

    // Build target dropdown dynamically — exclude current platform
    const select = document.getElementById('targetAgent');
    select.innerHTML = '<option value="">— Select target agent —</option>';
    for (const [key, info] of Object.entries(PLATFORMS)) {
      if (key === 'unknown' || key === platform || !info.url) continue;
      const opt = document.createElement('option');
      opt.value = info.url;
      opt.textContent = info.name;
      select.appendChild(opt);
    }
  } catch(e) {
    document.getElementById('platformName').textContent = 'Error: ' + e.message;
    document.getElementById('platformDot').className = 'dot dot-err';
  }
})();

async function doExtract() {
  const btn = document.getElementById('extractBtn');
  const status = document.getElementById('status');
  btn.disabled = true;
  btn.textContent = 'Extracting...';
  status.className = 'status status-working';
  status.textContent = 'Reading conversation from page...';

  try {
    const [tab] = await api.tabs.query({active: true, currentWindow: true});

    // Inject content script if not already there
    try {
      await api.scripting.executeScript({
        target: {tabId: tab.id},
        files: ['extractor.js']
      });
    } catch(e) {
      // Already injected, that's fine
    }

    // Request extraction
    const data = await api.tabs.sendMessage(tab.id, {action: 'extract'});

    if (!data || !data.messages || data.messages.length === 0) {
      status.className = 'status status-err';
      status.textContent = 'No messages found. Make sure the conversation is visible on the page.';
      btn.disabled = false;
      btn.textContent = 'Try Again';
      return;
    }

    // Generate HANDOFF context from conversation
    extractedContext = generateContext(data);

    // Show result
    status.className = 'status status-ok';
    status.textContent = 'Extracted ' + data.messages.length + ' messages from ' + (PLATFORMS[data.platform]?.name || data.platform) + '. Context ready!';

    document.getElementById('stats').textContent =
      data.messages.length + ' messages · ' + extractedContext.length.toLocaleString() + ' characters · ' + data.platform;
    document.getElementById('preview').textContent = extractedContext.slice(0, 1000) + (extractedContext.length > 1000 ? '\n\n...(truncated in preview)' : '');
    document.getElementById('result').style.display = 'block';

    btn.textContent = 'Re-Extract';
    btn.disabled = false;

  } catch(e) {
    status.className = 'status status-err';
    status.textContent = 'Extraction failed: ' + e.message;
    btn.disabled = false;
    btn.textContent = 'Try Again';
  }
}

function generateContext(data) {
  const lines = [];
  lines.push('# HANDOFF — Conversation Context');
  lines.push('');
  lines.push('Extracted from ' + (PLATFORMS[data.platform]?.name || data.platform) + ' on ' + new Date().toISOString().split('T')[0]);
  lines.push('Source: ' + data.title);
  lines.push('Messages: ' + data.messages.length);
  lines.push('');
  lines.push('---');
  lines.push('');

  const allText = data.messages.map(m => m.content).join('\n');
  const files = extractFileReferences(allText);
  const decisions = extractDecisions(data.messages);
  const currentTask = extractCurrentTask(data.messages);

  if (files.length > 0) {
    lines.push('## Files Referenced');
    lines.push('');
    files.forEach(f => lines.push('- `' + f + '`'));
    lines.push('');
  }

  if (decisions.length > 0) {
    lines.push('## Key Decisions Made');
    lines.push('');
    decisions.forEach(d => lines.push('- ' + d));
    lines.push('');
  }

  if (currentTask) {
    lines.push('## Current Task');
    lines.push('');
    lines.push(currentTask);
    lines.push('');
  }

  lines.push('## Conversation (recent)');
  lines.push('');
  const recent = data.messages.slice(-40);
  recent.forEach(m => {
    const role = m.role === 'user' ? '**User:**' : '**Assistant:**';
    const content = m.content.length > 2000
      ? m.content.slice(0, 2000) + '\n...(truncated)'
      : m.content;
    lines.push(role);
    lines.push(content);
    lines.push('');
  });

  lines.push('---');
  lines.push('');
  lines.push('*Generated by Handoff — https://github.com/rofomtl00/Handoff*');

  return lines.join('\n');
}

function extractFileReferences(text) {
  const files = new Set();
  const patterns = [
    /[`"']([a-zA-Z0-9_/.-]+\.(py|js|ts|tsx|jsx|go|rs|java|cpp|c|h|rb|php|yaml|yml|json|toml|md|html|css|sh|sql))[`"']/g,
    /(?:^|\s)([\w/.-]+\.(py|js|ts|go|rs|java|yaml|json|md|html|css|sh))/gm,
  ];
  patterns.forEach(pat => {
    let match;
    while ((match = pat.exec(text)) !== null) {
      const f = match[1];
      if (f.length > 3 && f.length < 100 && !f.startsWith('http')) {
        files.add(f);
      }
    }
  });
  return Array.from(files).sort().slice(0, 30);
}

function extractDecisions(messages) {
  const decisions = [];
  const keywords = ['removed', 'decided', 'changed to', 'switched to', 'fixed by',
                     'the fix is', 'solution:', 'we should', "don't", 'never ', 'always ',
                     'disabled', 'enabled', 'replaced', 'instead of'];
  messages.forEach(m => {
    if (m.role !== 'assistant') return;
    const lines = m.content.split('\n');
    lines.forEach(line => {
      const lower = line.toLowerCase();
      if (keywords.some(kw => lower.includes(kw))) {
        const clean = line.trim().replace(/^[-*•]\s*/, '');
        if (clean.length > 15 && clean.length < 200) {
          decisions.push(clean);
        }
      }
    });
  });
  return [...new Set(decisions)].slice(0, 20);
}

function extractCurrentTask(messages) {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'user') {
      const content = messages[i].content.trim();
      if (content.length > 10) {
        return content.length > 500 ? content.slice(0, 500) + '...' : content;
      }
    }
  }
  return '';
}

async function copyContext() {
  try {
    await navigator.clipboard.writeText(extractedContext);
    const btn = document.getElementById('copyBtn');
    const orig = btn.textContent;
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = orig; }, 1500);
  } catch(e) {
    const ta = document.createElement('textarea');
    ta.value = extractedContext;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
}

function openTarget() {
  const url = document.getElementById('targetAgent').value;
  if (url) {
    navigator.clipboard.writeText(extractedContext).then(() => {
      api.tabs.create({url: url});
    });
  }
}

// Attach event listeners
document.getElementById('extractBtn').addEventListener('click', doExtract);
document.getElementById('copyBtn').addEventListener('click', copyContext);
document.getElementById('targetAgent').addEventListener('change', openTarget);
