// 添加调试日志
console.log('Content script loaded');

// 监听fetch请求
const originalFetch = window.fetch;
window.fetch = async function(...args) {
  const requestId = performance.now().toString();
  const startTime = Date.now();
  
  try {
    const response = await originalFetch(...args);
    const endTime = Date.now();
    
    const requestData = {
      requestId,
      method: args[1]?.method || 'GET',
      url: args[0],
      status: response.status,
      duration: endTime - startTime,
      response: await response.clone().text()
    };
    
    console.log('Captured fetch request:', requestData);
    
    // 发送请求数据到background
    chrome.runtime.sendMessage({
      type: 'networkRequest',
      data: requestData
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Failed to send message:', chrome.runtime.lastError);
      } else {
        console.log('Message sent successfully');
      }
    });
    
    return response;
  } catch (error) {
    console.error('Failed to capture fetch request:', error);
    throw error;
  }
};

// 监听XMLHttpRequest
const originalOpen = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function(method, url) {
  this._requestId = performance.now().toString();
  this._startTime = Date.now();
  this._method = method;
  this._url = url;
  
  this.addEventListener('load', () => {
    const requestData = {
      requestId: this._requestId,
      method: this._method,
      url: this._url,
      status: this.status,
      duration: Date.now() - this._startTime,
      response: this.responseText
    };
    
    // 发送请求数据到background
    chrome.runtime.sendMessage({
      type: 'networkRequest',
      data: requestData
    });
  });
  
  originalOpen.apply(this, arguments);
};