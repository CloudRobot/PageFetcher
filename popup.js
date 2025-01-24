// 初始化
document.addEventListener('DOMContentLoaded', () => {
  initFilter();
  getRequests();
  chrome.storage.onChanged.addListener(handleStorageChange);
  
  // 初始化关闭按钮
  document.getElementById('close-response-viewer').addEventListener('click', () => {
    document.getElementById('response-viewer').style.display = 'none';
  });
});

// 处理storage变化
function handleStorageChange(changes) {
  if (changes.requests) {
    const completedRequests = Object.values(changes.requests.newValue).filter(
      req => req.status !== 'pending'
    );
    applyFilter(completedRequests);
  }
}

// 获取请求数据
function getRequests() {
  chrome.storage.local.get('requests', (data) => {
    if (data.requests) {
      const completedRequests = Object.values(data.requests).filter(
        req => req.status !== 'pending'
      );
      applyFilter(completedRequests);
    }
  });
}

// 应用筛选
function applyFilter(requests) {
  const filter = document.getElementById('type-filter').value;
  const filteredRequests = filter === 'all' 
    ? requests 
    : requests.filter(req => req.type === filter);
  updateTable(filteredRequests);
}

// 初始化筛选器
function initFilter() {
  const filter = document.getElementById('type-filter');
  filter.onchange = () => getRequests();
}

// 截断URL
function truncateUrl(url, maxLength = 50) {
  if (url.length <= maxLength) return url;
  const partLength = Math.floor((maxLength - 3) / 2);
  return `${url.substring(0, partLength)}...${url.substring(url.length - partLength)}`;
}

// 更新表格
function updateTable(requests) {
  const tbody = document.querySelector('#requests-table tbody');
  tbody.innerHTML = '';

  requests.forEach(request => {
    const row = document.createElement('tr');
    
    // Method
    const methodCell = document.createElement('td');
    methodCell.textContent = request.method;
    row.appendChild(methodCell);

    // URL
    const urlCell = document.createElement('td');
    const urlSpan = document.createElement('span');
    urlSpan.textContent = truncateUrl(request.url);
    urlSpan.title = request.url; // Tooltip显示完整URL
    urlSpan.style.cursor = 'pointer';
    urlSpan.onclick = () => {
      const responseContent = document.getElementById('response-content');
      responseContent.textContent = request.url;
      document.getElementById('response-viewer').style.display = 'block';
    };
    urlCell.appendChild(urlSpan);
    row.appendChild(urlCell);

    // Status
    const statusCell = document.createElement('td');
    const statusSpan = document.createElement('span');
    statusSpan.textContent = request.status;
    statusSpan.classList.add('status', request.status);
    statusCell.appendChild(statusSpan);
    row.appendChild(statusCell);

    // Duration
    const durationCell = document.createElement('td');
    if (request.endTime) {
      const duration = (request.endTime - request.startTime).toFixed(2);
      durationCell.textContent = `${duration} ms`;
    } else {
      durationCell.textContent = '-';
    }
    row.appendChild(durationCell);

    // Size
    const sizeCell = document.createElement('td');
    sizeCell.textContent = request.size ? `${request.size} B` : '-';
    row.appendChild(sizeCell);

    // Response
    const responseCell = document.createElement('td');
    if (request.response) {
      const viewButton = document.createElement('button');
      viewButton.textContent = 'View';
      viewButton.onclick = () => {
        const responseContent = document.getElementById('response-content');
        responseContent.textContent = formatResponse(request.response);
        document.getElementById('response-viewer').style.display = 'block';
      };
      responseCell.appendChild(viewButton);
    } else {
      responseCell.textContent = 'Loading...';
    }
    row.appendChild(responseCell);

    tbody.appendChild(row);
  });
}

// 格式化响应体
function formatResponse(response) {
  if (!response) return 'No response available';
  
  try {
    const parsed = JSON.parse(response);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return response;
  }
}