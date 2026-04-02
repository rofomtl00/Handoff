const runtimeApi = typeof browser !== 'undefined' ? browser : chrome;

// Listen for browse requests from popup
runtimeApi.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'browse_and_add') {
    // This runs in the background script — survives popup closing
    runtimeApi.runtime.sendNativeMessage('handoff_host', {action: 'browse_and_add'})
      .then(response => {
        // Store result so popup can read it when reopened
        runtimeApi.storage.local.set({lastBrowse: response});
      })
      .catch(err => {
        runtimeApi.storage.local.set({lastBrowse: {ok: false, error: err.message}});
      });
    sendResponse({started: true});
  }
  return true;
});
