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

    // Generate HANDOFF context (full + summary)
    extractedContext = hasCreative ? generateCreativeContext(data) : generateContext(data);
    extractedSummary = generateSummary(data);

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

let extractedSummary = '';

function generateSummary(data) {
  const lines = [];
  const pInfo = PLATFORMS[data.platform] || {name: data.platform};
  const mode = data.mode || pInfo.mode || 'chat';

  lines.push('# HANDOFF — Project Summary');
  lines.push('');
  lines.push('Source: ' + pInfo.name + ' | ' + data.title);
  lines.push('Extracted: ' + new Date().toISOString().split('T')[0]);
  lines.push('Full context: see attached HANDOFF.md file');
  lines.push('');
  lines.push('---');
  lines.push('');

  if (mode !== 'chat' && data.creative) {
    const c = data.creative;
    if (c.prompts?.length) {
      lines.push('## Prompts Used');
      c.prompts.forEach((p, i) => lines.push((i+1) + '. ' + p.text.slice(0, 200)));
      lines.push('');
    }
    if (Object.keys(c.settings || {}).length) {
      lines.push('## Key Settings');
      for (const [k, v] of Object.entries(c.settings).slice(0, 10)) {
        lines.push('- ' + k + ': ' + v);
      }
      lines.push('');
    }
    if (c.generations?.length) {
      lines.push('## Generations: ' + c.generations.length + ' outputs');
      lines.push('');
    }
  } else if (data.messages?.length) {
    // Chat summary: extract key decisions and current task
    const decisions = extractDecisions(data.messages);
    const files = extractFileReferences(data.messages.map(m => m.content).join('\n'));
    const currentTask = extractCurrentTask(data.messages);

    lines.push('## Conversation: ' + data.messages.length + ' messages');
    lines.push('');

    if (files.length) {
      lines.push('## Files Referenced');
      files.slice(0, 15).forEach(f => lines.push('- `' + f + '`'));
      lines.push('');
    }

    if (decisions.length) {
      lines.push('## Key Decisions');
      decisions.slice(0, 10).forEach(d => lines.push('- ' + d));
      lines.push('');
    }

    if (currentTask) {
      lines.push('## Current Task');
      lines.push(currentTask.slice(0, 300));
      lines.push('');
    }

    // Last 3 exchanges as context
    lines.push('## Recent Context (last 3 exchanges)');
    lines.push('');
    const recent = data.messages.slice(-6);
    recent.forEach(m => {
      const role = m.role === 'user' ? '**User:**' : '**Assistant:**';
      lines.push(role);
      lines.push(m.content.length > 300 ? m.content.slice(0, 300) + '...' : m.content);
      lines.push('');
    });
  }

  lines.push('---');
  lines.push('*For full context, attach the downloaded HANDOFF.md file to this conversation.*');

  return lines.join('\n');
}

async function copyClipboard(text, btnId) {
  try {
    await navigator.clipboard.writeText(text);
    const btn = document.getElementById(btnId);
    const orig = btn.textContent;
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = orig; }, 1500);
  } catch(e) {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
}

async function copyContext() {
  await copyClipboard(extractedContext, 'copyBtn');
}

async function copySummary() {
  await copyClipboard(extractedSummary, 'copySummaryBtn');
}

function downloadContext() {
  const blob = new Blob([extractedContext], {type: 'text/markdown'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'HANDOFF.md';
  a.click();
  URL.revokeObjectURL(url);
  const btn = document.getElementById('downloadBtn');
  const orig = btn.textContent;
  btn.textContent = 'Saved!';
  setTimeout(() => { btn.textContent = orig; }, 1500);
}

function openTarget() {
  const url = document.getElementById('targetAgent').value;
  if (url) {
    // Copy summary (not full) — saves tokens. User attaches full file separately.
    navigator.clipboard.writeText(extractedSummary).then(() => {
      api.tabs.create({url: url});
    });
  }
}

// ═══════════════════════════════════════════════
// TABS
// ═══════════════════════════════════════════════

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('content' + tab.dataset.tab.charAt(0).toUpperCase() + tab.dataset.tab.slice(1)).classList.add('active');
    if (tab.dataset.tab === 'projects') checkServer();
  });
});

// ═══════════════════════════════════════════════
// LOCAL PROJECTS (via Handoff server on localhost:9090)
// ═══════════════════════════════════════════════

const SERVER = 'http://localhost:9090';
let projectContext = '';
let projectSummaryText = '';

async function checkServer() {
  const statusEl = document.getElementById('serverStatus');
  try {
    const r = await fetch(SERVER + '/api/projects', {signal: AbortSignal.timeout(2000)});
    if (r.ok) {
      statusEl.className = 'status status-ok';
      statusEl.textContent = 'Connected to local Handoff server';
      document.getElementById('projectsOnline').style.display = 'block';
      document.getElementById('projectsOffline').style.display = 'none';
      loadProjects();
    } else {
      throw new Error('bad response');
    }
  } catch(e) {
    // Server not running — auto-start it
    statusEl.className = 'status status-working';
    statusEl.textContent = 'Starting local server...';
    document.getElementById('projectsOnline').style.display = 'none';
    document.getElementById('projectsOffline').style.display = 'none';
    try {
      const response = await api.runtime.sendNativeMessage('handoff_host', {action: 'start'});
      if (response && response.ok) {
        statusEl.className = 'status status-ok';
        statusEl.textContent = 'Connected to local Handoff server';
        document.getElementById('projectsOnline').style.display = 'block';
        loadProjects();
        return;
      }
    } catch(nativeErr) {
      // Native messaging not available — show manual button
    }
    statusEl.className = 'status status-warn';
    statusEl.textContent = 'Could not auto-start server';
    document.getElementById('projectsOffline').style.display = 'block';
  }
}

async function loadProjects() {
  try {
    const r = await fetch(SERVER + '/api/projects');
    const projects = await r.json();
    const list = document.getElementById('projectList');
    if (!projects.length) {
      list.innerHTML = '<div class="empty">No projects added. Enter a folder path above.</div>';
      return;
    }
    let h = '';
    for (const p of projects) {
      const escapedPath = p.path.replace(/'/g, "\\'");
      h += '<div class="project-card">' +
        '<h4>' + esc(p.name) + '</h4>' +
        '<div class="meta">' + esc(p.path) + ' · ' + (p.files || 0) + ' files · ' + (p.lines || 0).toLocaleString() + ' lines · ' + (p.languages || '') + '</div>' +
        '<div class="actions">' +
        '<button class="btn btn-primary btn-sm" data-action="generate" data-path="' + esc(p.path) + '">Generate</button>' +
        '<button class="btn btn-blue btn-sm" data-action="rescan" data-path="' + esc(p.path) + '">Rescan</button>' +
        '<button class="btn btn-sm" style="background:#450a0a;color:#ef4444" data-action="remove" data-path="' + esc(p.path) + '">Remove</button>' +
        '</div></div>';
    }
    list.innerHTML = h;
    // Attach click handlers
    list.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        const path = btn.dataset.path;
        if (action === 'generate') generateProject(path);
        else if (action === 'rescan') rescanProject(path);
        else if (action === 'remove') removeProject(path);
      });
    });
  } catch(e) {
    document.getElementById('projectList').innerHTML = '<div class="empty">Error loading projects</div>';
  }
}

function esc(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

async function addProject() {
  const input = document.getElementById('addPath');
  const path = input.value.trim();
  if (!path) return;
  try {
    const r = await fetch(SERVER + '/api/projects/add', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({path})
    });
    const data = await r.json();
    if (data.ok) {
      input.value = '';
      loadProjects();
    } else {
      alert(data.error || 'Failed to add');
    }
  } catch(e) {
    alert('Server error: ' + e.message);
  }
}

async function removeProject(path) {
  await fetch(SERVER + '/api/projects/remove', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({path})
  });
  loadProjects();
  document.getElementById('projectResult').style.display = 'none';
}

async function rescanProject(path) {
  await fetch(SERVER + '/api/projects/scan', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({path})
  });
  loadProjects();
}

async function generateProject(path) {
  try {
    const r = await fetch(SERVER + '/api/generate', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({path})
    });
    const data = await r.json();
    if (data.content) {
      projectContext = data.content;
      // Generate a summary from the full context (first 40 lines)
      const lines = data.content.split('\n');
      projectSummaryText = lines.slice(0, 40).join('\n') + '\n\n---\n*For full context, attach the downloaded HANDOFF.md file.*';

      document.getElementById('projectStats').textContent = data.content.length.toLocaleString() + ' characters';
      document.getElementById('projectPreview').textContent = data.content.slice(0, 800) + (data.content.length > 800 ? '\n...' : '');
      document.getElementById('projectResult').style.display = 'block';
    }
  } catch(e) {
    alert('Generate failed: ' + e.message);
  }
}

function projectCopySummary() { copyClipboard(projectSummaryText, 'projectCopySummaryBtn'); }
function projectCopyFull() { copyClipboard(projectContext, 'projectCopyBtn'); }
function projectDownload() {
  const blob = new Blob([projectContext], {type: 'text/markdown'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'HANDOFF.md';
  a.click();
  URL.revokeObjectURL(url);
  const btn = document.getElementById('projectDownloadBtn');
  const orig = btn.textContent;
  btn.textContent = 'Saved!';
  setTimeout(() => { btn.textContent = orig; }, 1500);
}

// ═══════════════════════════════════════════════
// EVENT LISTENERS
// ═══════════════════════════════════════════════

// This Page tab
document.getElementById('extractBtn').addEventListener('click', doExtract);
document.getElementById('copyBtn').addEventListener('click', copyContext);
document.getElementById('copySummaryBtn').addEventListener('click', copySummary);
document.getElementById('downloadBtn').addEventListener('click', downloadContext);
document.getElementById('targetAgent').addEventListener('change', openTarget);

// My Projects tab
document.getElementById('addBtn').addEventListener('click', addProject);
document.getElementById('addPath').addEventListener('keydown', e => { if (e.key === 'Enter') addProject(); });
document.getElementById('browseBtn').addEventListener('click', browseFolder);

async function browseFolder() {
  // Open the full dashboard in a tab — tabs don't lose focus like popups do
  api.tabs.create({url: 'http://localhost:9090'});
}
document.getElementById('projectCopySummaryBtn').addEventListener('click', projectCopySummary);
document.getElementById('projectCopyBtn').addEventListener('click', projectCopyFull);
document.getElementById('projectDownloadBtn').addEventListener('click', projectDownload);
document.getElementById('startServerBtn').addEventListener('click', startServer);

async function startServer() {
  const btn = document.getElementById('startServerBtn');
  const progress = document.getElementById('startProgress');
  btn.disabled = true;
  btn.textContent = 'Starting...';
  progress.style.display = 'block';
  progress.textContent = 'Checking Python and dependencies...';

  try {
    // Use native messaging to start the server locally
    const response = await api.runtime.sendNativeMessage('handoff_host', {action: 'start'});
    if (response && response.ok) {
      progress.textContent = 'Server started!';
      progress.style.color = '#22c55e';
      // Switch to online view
      setTimeout(() => {
        document.getElementById('projectsOnline').style.display = 'block';
        document.getElementById('projectsOffline').style.display = 'none';
        document.getElementById('serverStatus').className = 'status status-ok';
        document.getElementById('serverStatus').textContent = 'Connected to local Handoff server';
        loadProjects();
      }, 1000);
    } else {
      progress.textContent = response?.error || 'Failed to start server';
      progress.style.color = '#ef4444';
      btn.disabled = false;
      btn.textContent = 'Retry';
    }
  } catch(e) {
    // Native messaging not available — fallback to manual instructions
    progress.innerHTML = 'Auto-start not available. Run this once in terminal:<br><code style="background:#111;padding:4px 8px;border-radius:4px;font-size:12px">cd ~/Desktop/Handoff && ./start.sh</code>';
    progress.style.color = '#f59e0b';
    btn.disabled = false;
    btn.textContent = 'Retry';
  }
}
