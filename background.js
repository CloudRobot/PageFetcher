// 存储请求数据的对象
let requests = {};

// 启用debugger
function enableDebugger() {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (tabs.length > 0) {
      const tabId = tabs[0].id;
      console.log('Attaching debugger to tab:', tabId);
      
      chrome.tabs.get(tabId, function(tab) {
        // 检查是否是正常网页（非 chrome:// 页）
        if (tab && tab.url &&!tab.url.startsWith('chrome://')) {
          chrome.debugger.attach({tabId}, '1.3', () => {
            if (chrome.runtime.lastError) {
              console.error('Debugger attach error:', chrome.runtime.lastError);
              return;
            }
      
            console.log('Debugger attached successfully');
            
            // 启用网络调试
            chrome.debugger.sendCommand(
              {tabId},
              'Network.enable',
              {},
              () => {
                if (chrome.runtime.lastError) {
                  console.error('Network.enable error:', chrome.runtime.lastError);
                } else {
                  console.log('Network debugging enabled');
                }
              }
            );
          });
        } else {
          console.error('Invalid tab: tab information could not be retrieved');
        }
      });
    }
  });
}

// 初始化
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({requests: {}});
  enableDebugger();
});

// 监听标签页切换
chrome.tabs.onActivated.addListener(() => {
  enableDebugger();
});

// 监听请求开始
chrome.debugger.onEvent.addListener((source, method, params) => {
  if (method === 'Network.requestWillBeSent') {
    const requestId = params.requestId;
    requests[requestId] = {
      url: params.request.url,
      method: params.request.method,
      type: params.type,
      startTime: Date.now(),
      status: 'pending'
    };
  }
});

// 监听响应接收
chrome.debugger.onEvent.addListener((source, method, params) => {
  if (method === 'Network.responseReceived') {
    const requestId = params.requestId;
    if (requests[requestId]) {
      requests[requestId].status = 'completed';
      requests[requestId].statusCode = params.response.status;
      requests[requestId].endTime = Date.now();
      
      // 获取响应体
      chrome.debugger.sendCommand(
        {tabId: source.tabId},
        'Network.getResponseBody',
        {requestId},
        (response) => {
          if (response) {
            requests[requestId].response = response.body;
            chrome.storage.local.set({requests});
          }
        }
      );
    }
  }
});

// 监听请求失败
chrome.debugger.onEvent.addListener((source, method, params) => {
  if (method === 'Network.loadingFailed') {
    const requestId = params.requestId;
    if (requests[requestId]) {
      requests[requestId].status = 'failed';
      requests[requestId].error = params.errorText;
      chrome.storage.local.set({requests});
    }
  }
});

// 初始化
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({requests: {}});
});