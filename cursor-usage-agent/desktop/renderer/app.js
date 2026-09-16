const $ = (id) => document.getElementById(id);

function setBusy(busy) {
  ['enroll', 'sync', 'loadSecret', 'refreshUsage'].forEach((id) => {
    const el = $(id);
    if (el) el.disabled = busy;
  });
}

function showMessage(text, isError = false) {
  const el = $('message');
  if (!text) {
    el.hidden = true;
    return;
  }
  el.hidden = false;
  el.textContent = text;
  el.classList.toggle('error', Boolean(isError));
}

function formatPct(n) {
  if (n == null || Number.isNaN(n)) return '—';
  return `${Math.round(n * 10) / 10}%`;
}

function relativeTime(iso) {
  if (!iso) return '—';
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '—';
  const diff = Date.now() - t;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 48) return `${hrs}h ago`;
  return new Date(iso).toLocaleString();
}

function cycleLabel(start, end) {
  if (!start && !end) return '—';
  const a = start ? new Date(start).toLocaleDateString() : '?';
  const b = end ? new Date(end).toLocaleDateString() : '?';
  return `${a} → ${b}`;
}

function daysLeft(end) {
  if (!end) return null;
  const t = new Date(end).getTime();
  if (!Number.isFinite(t)) return null;
  return Math.max(0, Math.ceil((t - Date.now()) / 86400000));
}

function renderUsage(data) {
  const card = $('usageCard');
  if (!data || !data.summary) {
    card.hidden = true;
    return;
  }
  card.hidden = false;
  const s = data.summary;
  $('userName').textContent = s.name || 'You';
  $('userEmail').textContent = s.email || '—';
  const pct = s.percent;
  $('usagePct').textContent = formatPct(pct);
  $('usageRing').style.setProperty('--p', pct == null ? 0 : Math.min(100, Math.max(0, pct)));
  $('plan').textContent = s.plan || '—';
  $('cycle').textContent = cycleLabel(s.billingCycleStart, s.billingCycleEnd);
  const left = daysLeft(s.billingCycleEnd);
  $('cycleHint').textContent =
    left == null ? '' : left === 0 ? 'Resets today' : `${left} days left`;
  $('usageLastSync').textContent = relativeTime(s.lastSeenAt);

  if (s.displayMessage) {
    $('displayMessage').hidden = false;
    $('displayMessage').textContent = s.displayMessage;
  } else {
    $('displayMessage').hidden = true;
  }

  const auto = s.autoPercent;
  const api = s.apiPercent;
  $('autoBar').style.width = `${auto == null ? 0 : Math.min(100, auto)}%`;
  $('apiBar').style.width = `${api == null ? 0 : Math.min(100, api)}%`;
  $('autoPct').textContent = formatPct(auto);
  $('apiPct').textContent = formatPct(api);

  const history = $('history');
  history.innerHTML = '';
  const snaps = Array.isArray(data.snapshots) ? data.snapshots : [];
  if (!snaps.length) {
    history.innerHTML = '<li class="empty">No sync history yet</li>';
  } else {
    for (const snap of snaps.slice(0, 12)) {
      const usage = snap.usage || {};
      const p =
        typeof usage.autoPercentUsed === 'number' &&
        (usage.apiPercentUsed == null || usage.apiPercentUsed === 0)
          ? usage.autoPercentUsed
          : typeof usage.totalPercentUsed === 'number'
            ? usage.totalPercentUsed
            : typeof usage.autoPercentUsed === 'number'
              ? usage.autoPercentUsed
              : typeof usage.apiPercentUsed === 'number'
                ? usage.apiPercentUsed
                : null;
      const li = document.createElement('li');
      li.innerHTML = `<span>${new Date(snap.timestamp).toLocaleString()}</span><span>${formatPct(p)}</span>`;
      history.appendChild(li);
    }
  }

  const devices = $('devices');
  devices.innerHTML = '';
  const list = Array.isArray(data.devices) ? data.devices : [];
  if (!list.length) {
    devices.innerHTML = '<li class="empty">No devices</li>';
  } else {
    for (const d of list) {
      const li = document.createElement('li');
      const title = document.createElement('div');
      title.innerHTML = `<strong>${d.deviceName || 'Device'}</strong><div class="meta">${d.operatingSystem || ''} · agent ${d.agentVersion || '?'}${d.cursorVersion ? ` · Cursor ${d.cursorVersion}` : ''}</div>`;
      const when = document.createElement('div');
      when.className = 'meta';
      when.textContent = relativeTime(d.lastSeenAt);
      li.appendChild(title);
      li.appendChild(when);
      devices.appendChild(li);
    }
  }
}

function applyStatus(status) {
  if (!status) return;
  $('enrolled').textContent = status.enrolled ? 'Yes' : 'Not yet';
  $('lastSync').textContent = status.lastSyncAt
    ? new Date(status.lastSyncAt).toLocaleString()
    : '—';
  $('openAtLogin').checked = Boolean(status.openAtLogin);
  if (status.serverUrl && !$('serverUrl').value) {
    $('serverUrl').value = status.serverUrl;
  }
  if (status.message) showMessage(status.message, Boolean(status.error));
  if (status.myUsage) renderUsage(status.myUsage);
  if (status.myUsageError) {
    $('usageCard').hidden = false;
    $('userName').textContent = 'Could not load usage';
    $('userEmail').textContent = status.myUsageError;
    showMessage(status.myUsageError, true);
  }
  if (status.enrolled) {
    $('setup').hidden = true;
  }
}

async function refresh() {
  const status = await window.cursorUsage.getStatus();
  applyStatus(status);
  if (status.enrolled) {
    try {
      const usage = await window.cursorUsage.getMyUsage();
      renderUsage(usage);
    } catch {
      /* keep prior */
    }
  }
}

$('loadSecret').addEventListener('click', async () => {
  setBusy(true);
  showMessage('Loading secret…');
  try {
    const secret = await window.cursorUsage.fetchInstallSecret($('serverUrl').value);
    $('secret').value = secret || '';
    showMessage('Secret loaded from hub');
  } catch (e) {
    showMessage(e instanceof Error ? e.message : 'Failed to load secret', true);
  } finally {
    setBusy(false);
  }
});

$('enroll').addEventListener('click', async () => {
  setBusy(true);
  showMessage('Enrolling… this may take a minute on first run');
  try {
    let secret = $('secret').value.trim();
    const serverUrl = $('serverUrl').value.trim();
    if (!secret && serverUrl) {
      secret = await window.cursorUsage.fetchInstallSecret(serverUrl);
      $('secret').value = secret || '';
    }
    const status = await window.cursorUsage.enroll({ serverUrl, enrollmentSecret: secret });
    applyStatus(status);
    showMessage('Connected. Your usage is below.');
  } catch (e) {
    showMessage(e instanceof Error ? e.message : 'Enroll failed', true);
  } finally {
    setBusy(false);
  }
});

$('sync').addEventListener('click', async () => {
  setBusy(true);
  showMessage('Syncing…');
  try {
    const status = await window.cursorUsage.sync();
    applyStatus(status);
    showMessage('Sync complete');
  } catch (e) {
    showMessage(e instanceof Error ? e.message : 'Sync failed', true);
  } finally {
    setBusy(false);
  }
});

$('refreshUsage').addEventListener('click', async () => {
  setBusy(true);
  showMessage('Loading your data…');
  try {
    const usage = await window.cursorUsage.getMyUsage();
    renderUsage(usage);
    showMessage('Updated');
  } catch (e) {
    showMessage(e instanceof Error ? e.message : 'Could not load usage', true);
  } finally {
    setBusy(false);
  }
});

$('openAtLogin').addEventListener('change', async (e) => {
  const status = await window.cursorUsage.setOpenAtLogin(e.target.checked);
  applyStatus(status);
});

$('openHub').addEventListener('click', async () => {
  const status = await window.cursorUsage.getStatus();
  if (status.serverUrl) {
    await window.cursorUsage.openExternal(status.serverUrl);
  } else {
    showMessage('Enroll first so we know your hub URL', true);
  }
});

window.cursorUsage.onStatus(applyStatus);
void refresh();
