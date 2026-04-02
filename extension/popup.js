const api = typeof browser !== 'undefined' ? browser : chrome;
let extractedContext = '';

const PLATFORMS = {
  // Chat
  chatgpt:     {name: 'ChatGPT',      mode: 'chat',     color: 'ok', url: 'https://chatgpt.com/'},
  claude:      {name: 'Claude',        mode: 'chat',     color: 'ok', url: 'https://claude.ai/new'},
  gemini:      {name: 'Gemini',        mode: 'chat',     color: 'ok', url: 'https://gemini.google.com/app'},
  copilot:     {name: 'Copilot',       mode: 'chat',     color: 'ok', url: 'https://copilot.microsoft.com/'},
  kiro:        {name: 'Kiro',          mode: 'chat',     color: 'ok', url: 'https://kiro.dev/'},
  grok:        {name: 'Grok',          mode: 'chat',     color: 'ok', url: 'https://grok.com/'},
  perplexity:  {name: 'Perplexity',    mode: 'chat',     color: 'ok', url: 'https://www.perplexity.ai/'},
  poe:         {name: 'Poe',           mode: 'chat',     color: 'ok', url: 'https://poe.com/'},
  mistral:     {name: 'Mistral',       mode: 'chat',     color: 'ok', url: 'https://chat.mistral.ai/'},
  deepseek:    {name: 'DeepSeek',      mode: 'chat',     color: 'ok', url: 'https://chat.deepseek.com/'},
  you:         {name: 'You.com',       mode: 'chat',     color: 'ok', url: 'https://you.com/'},
  pi:          {name: 'Pi',            mode: 'chat',     color: 'ok', url: 'https://pi.ai/'},
  qwen:        {name: 'Qwen',          mode: 'chat',     color: 'ok', url: 'https://chat.qwenlm.ai/'},
  huggingface: {name: 'HuggingChat',   mode: 'chat',     color: 'ok', url: 'https://huggingface.co/chat/'},
  cohere:      {name: 'Cohere',        mode: 'chat',     color: 'ok', url: 'https://coral.cohere.com/'},
  reka:        {name: 'Reka',          mode: 'chat',     color: 'ok', url: 'https://chat.reka.ai/'},
  fireworks:   {name: 'Fireworks',     mode: 'chat',     color: 'ok', url: 'https://app.fireworks.ai/'},
  // Video
  runway:      {name: 'Runway',        mode: 'video',    color: 'ok', url: 'https://app.runwayml.com/'},
  pika:        {name: 'Pika',          mode: 'video',    color: 'ok', url: 'https://pika.art/'},
  kling:       {name: 'Kling',         mode: 'video',    color: 'ok', url: 'https://klingai.com/'},
  luma:        {name: 'Luma',          mode: 'video',    color: 'ok', url: 'https://lumalabs.ai/'},
  sora:        {name: 'Sora',          mode: 'video',    color: 'ok', url: 'https://sora.com/'},
  haiper:      {name: 'Haiper',        mode: 'video',    color: 'ok', url: 'https://haiper.ai/'},
  minimax:     {name: 'MiniMax',       mode: 'video',    color: 'ok', url: 'https://minimax.io/'},
  // Image
  midjourney:  {name: 'Midjourney',    mode: 'image',    color: 'ok', url: 'https://midjourney.com/'},
  ideogram:    {name: 'Ideogram',      mode: 'image',    color: 'ok', url: 'https://ideogram.ai/'},
  leonardo:    {name: 'Leonardo',      mode: 'image',    color: 'ok', url: 'https://leonardo.ai/'},
  playground:  {name: 'Playground',    mode: 'image',    color: 'ok', url: 'https://playground.com/'},
  civitai:     {name: 'CivitAI',       mode: 'image',    color: 'ok', url: 'https://civitai.com/'},
  // Music
  suno:        {name: 'Suno',          mode: 'music',    color: 'ok', url: 'https://suno.com/'},
  udio:        {name: 'Udio',          mode: 'music',    color: 'ok', url: 'https://udio.com/'},
  // 3D
  meshy:       {name: 'Meshy',         mode: '3d',       color: 'ok', url: 'https://meshy.ai/'},
  tripo:       {name: 'Tripo',         mode: '3d',       color: 'ok', url: 'https://tripo3d.ai/'},
  // Design
  figma:       {name: 'Figma',         mode: 'design',   color: 'ok', url: 'https://figma.com/'},
  canva:       {name: 'Canva',         mode: 'design',   color: 'ok', url: 'https://canva.com/'},
  framer:      {name: 'Framer',        mode: 'design',   color: 'ok', url: 'https://framer.com/'},
  // Writing
  jasper:      {name: 'Jasper',        mode: 'writing',  color: 'ok', url: 'https://jasper.ai/'},
  notion:      {name: 'Notion AI',     mode: 'writing',  color: 'ok', url: 'https://notion.so/'},
  // Unknown
  unknown:     {name: 'Unknown page',  mode: 'unknown',  color: 'err', url: ''},
};

// Detect platform on load
(async function detectPlatformInit() {
  try {
    const tabs = await api.tabs.query({active: true, currentWindow: true});
    const url = tabs[0]?.url || '';
    // URL-to-platform mapping
    const URL_MAP = {
      'chatgpt.com':'chatgpt', 'chat.openai.com':'chatgpt',
      'claude.ai':'claude', 'gemini.google.com':'gemini',
      'aistudio.google.com':'gemini', 'labs.google':'gemini',
      'copilot.microsoft.com':'copilot', 'kiro.dev':'kiro',
      'grok.com':'grok', 'perplexity.ai':'perplexity',
      'poe.com':'poe', 'chat.mistral.ai':'mistral',
      'chat.deepseek.com':'deepseek', 'you.com':'you',
      'pi.ai':'pi', 'chat.qwenlm.ai':'qwen',
      'huggingface.co':'huggingface', 'coral.cohere.com':'cohere',
      'chat.reka.ai':'reka', 'fireworks.ai':'fireworks',
      'runwayml.com':'runway', 'app.runwayml.com':'runway',
      'pika.art':'pika', 'klingai.com':'kling',
      'lumalabs.ai':'luma', 'sora.com':'sora',
      'haiper.ai':'haiper', 'minimax.io':'minimax',
      'midjourney.com':'midjourney', 'ideogram.ai':'ideogram',
      'leonardo.ai':'leonardo', 'playground.com':'playground',
      'civitai.com':'civitai',
      'suno.com':'suno', 'udio.com':'udio',
      'meshy.ai':'meshy', 'tripo3d.ai':'tripo',
      'figma.com':'figma', 'canva.com':'canva', 'framer.com':'framer',
      'jasper.ai':'jasper', 'notion.so':'notion',
    };
    let platform = 'unknown';
    for (const [domain, id] of Object.entries(URL_MAP)) {
      if (url.includes(domain)) { platform = id; break; }
    }
    if (platform === 'unknown' && url.includes('x.com') && url.includes('grok')) platform = 'grok';

    const info = PLATFORMS[platform] || PLATFORMS.unknown;
    const mode = info.mode || 'unknown';
    const modeLabel = {chat:'Chat',video:'Video',image:'Image',music:'Music','3d':'3D',design:'Design',writing:'Writing'}[mode] || '';
    document.getElementById('platformDot').className = 'dot dot-' + info.color;
    document.getElementById('platformName').textContent = info.name + (modeLabel ? ' — ' + modeLabel + ' mode' : '');

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

    const hasChat = data.messages && data.messages.length > 0;
    const hasCreative = data.creative && (
      data.creative.prompts?.length > 0 ||
      Object.keys(data.creative.settings || {}).length > 0 ||
      Object.keys(data.creative.parameters || {}).length > 0 ||
      data.creative.generations?.length > 0
    );

    if (!hasChat && !hasCreative) {
      status.className = 'status status-err';
      status.textContent = 'No content found. Make sure the page has loaded fully.';
      btn.disabled = false;
      btn.textContent = 'Try Again';
      return;
    }

    // Generate HANDOFF context
    extractedContext = hasCreative ? generateCreativeContext(data) : generateContext(data);

    // Show result
    const mode = data.mode || 'chat';
    const itemCount = hasCreative
      ? (data.creative.prompts?.length || 0) + ' prompts, ' + Object.keys(data.creative.settings || {}).length + ' settings'
      : data.messages.length + ' messages';
    status.className = 'status status-ok';
    status.textContent = 'Extracted ' + itemCount + ' from ' + (PLATFORMS[data.platform]?.name || data.platform) + '. Context ready!';

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

function generateCreativeContext(data) {
  const lines = [];
  const pInfo = PLATFORMS[data.platform] || {name: data.platform, mode: 'creative'};
  const mode = data.mode || pInfo.mode || 'creative';
  const modeLabel = {video:'Video',image:'Image',music:'Music','3d':'3D',design:'Design',writing:'Writing'}[mode] || 'Creative';
  const c = data.creative || {};

  lines.push('# HANDOFF — ' + modeLabel + ' Project Context');
  lines.push('');
  lines.push('Extracted from ' + pInfo.name + ' on ' + new Date().toISOString().split('T')[0]);
  lines.push('Source: ' + data.title);
  lines.push('Mode: ' + modeLabel);
  lines.push('');
  lines.push('---');
  lines.push('');

  // Prompts
  if (c.prompts && c.prompts.length > 0) {
    lines.push('## Prompts');
    lines.push('');
    c.prompts.forEach((p, i) => {
      lines.push('### Prompt ' + (i + 1));
      lines.push('```');
      lines.push(p.text);
      lines.push('```');
      lines.push('');
    });
  }

  // Settings
  if (c.settings && Object.keys(c.settings).length > 0) {
    lines.push('## Settings');
    lines.push('');
    lines.push('| Setting | Value |');
    lines.push('|---------|-------|');
    for (const [k, v] of Object.entries(c.settings)) {
      lines.push('| ' + k + ' | ' + v + ' |');
    }
    lines.push('');
  }

  // Parameters
  const params = c.parameters || {};
  const realParams = Object.entries(params).filter(([k]) => !k.startsWith('_heading_'));
  const headings = Object.entries(params).filter(([k]) => k.startsWith('_heading_'));
  if (realParams.length > 0) {
    lines.push('## Parameters');
    lines.push('');
    realParams.forEach(([k, v]) => {
      lines.push('- **' + k + ':** ' + v);
    });
    lines.push('');
  }

  // Project info from headings
  if (headings.length > 0) {
    lines.push('## Project Info');
    lines.push('');
    headings.forEach(([k, v]) => {
      lines.push('- ' + v);
    });
    lines.push('');
  }

  // Generations
  if (c.generations && c.generations.length > 0) {
    lines.push('## Generations (' + c.generations.length + ')');
    lines.push('');
    c.generations.forEach((g, i) => {
      if (g.type === 'image') {
        lines.push('- Image ' + (i+1) + (g.alt ? ': ' + g.alt : '') + (g.src ? ' — ' + g.src.slice(0, 100) : ''));
      } else if (g.type === 'video') {
        lines.push('- Video ' + (i+1) + (g.src ? ' — ' + g.src.slice(0, 100) : ''));
      } else if (g.type === 'audio') {
        lines.push('- Audio ' + (i+1) + (g.src ? ' — ' + g.src.slice(0, 100) : ''));
      } else if (g.text) {
        lines.push('- Output ' + (i+1) + ': ' + g.text.slice(0, 200));
      }
    });
    lines.push('');
  }

  // Timeline
  if (c.timeline && c.timeline.length > 0) {
    lines.push('## Timeline / Sequence');
    lines.push('');
    c.timeline.forEach(t => lines.push('- ' + t));
    lines.push('');
  }

  // Also include any chat messages if present
  if (data.messages && data.messages.length > 0) {
    lines.push('## Chat History');
    lines.push('');
    const recent = data.messages.slice(-20);
    recent.forEach(m => {
      lines.push(m.role === 'user' ? '**User:**' : '**Assistant:**');
      lines.push(m.content.length > 1000 ? m.content.slice(0, 1000) + '\n...(truncated)' : m.content);
      lines.push('');
    });
  }

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
