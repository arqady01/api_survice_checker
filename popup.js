// 修改 API Key 显示/隐藏的处理逻辑
const apiKeyInput = document.getElementById('apiKey');
const toggleIcon = document.getElementById('togglePassword');

// 点击切换按钮的处理
toggleIcon.addEventListener('click', function(e) {
  e.preventDefault();
  e.stopPropagation();
  
  if (apiKeyInput.type === 'password') {
    apiKeyInput.type = 'text';
    toggleIcon.classList.remove('fa-eye');
    toggleIcon.classList.add('fa-eye-slash');
  } else {
    apiKeyInput.type = 'password';
    toggleIcon.classList.remove('fa-eye-slash');
    toggleIcon.classList.add('fa-eye');
  }
});

// 使用 focusout 事件来处理失去焦点的情况
apiKeyInput.addEventListener('focusout', function(e) {
  // 检查新的焦点元素是否是切换按钮
  if (e.relatedTarget !== toggleIcon) {
    apiKeyInput.type = 'password';
    toggleIcon.classList.remove('fa-eye-slash');
    toggleIcon.classList.add('fa-eye');
  }
});

// 防止输入框点击事件冒泡
document.getElementById('apiKey').addEventListener('click', function(e) {
  e.stopPropagation();
});

// 复制模型ID的函数
async function copyModelId(modelId, event) {
  event.stopPropagation(); // 阻止事件冒泡
  
  // 创建临时输入框
  const tempInput = document.createElement('textarea');
  tempInput.value = modelId;
  document.body.appendChild(tempInput);
  
  try {
    // 选择并复制文本
    tempInput.select();
    document.execCommand('copy');
    
    const copyButton = event.currentTarget;
    
    // 移除可能已存在的所有提示框
    const existingTooltips = document.querySelectorAll('.tooltip');
    existingTooltips.forEach(tooltip => tooltip.remove());
    
    // 创建新的提示框
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.textContent = '复制成功！';
    copyButton.appendChild(tooltip);
    
    // 显示提示框
    setTimeout(() => tooltip.classList.add('show'), 10);
    
    // 2秒后移除提示框
    setTimeout(() => {
      tooltip.classList.remove('show');
      setTimeout(() => tooltip.remove(), 200);
    }, 2000);
  } catch (err) {
    console.error('复制失败:', err);
  } finally {
    // 移除临时输入框
    document.body.removeChild(tempInput);
  }
}

// 生成模型卡片的函数
function generateModelCard(model) {
  const permissions = model.permission && model.permission[0];
  const card = document.createElement('div');
  card.className = 'model-card';
  card.dataset.modelId = model.id;
  
  card.innerHTML = `
    <div class="model-header">
      <h3>${model.id}</h3>
      <div class="model-actions">
        <button class="test-button" title="测试模型可用性">
          <i class="fas fa-vial"></i>
        </button>
        <button class="copy-button" data-model-id="${model.id}">
          <i class="fas fa-copy"></i>
        </button>
      </div>
    </div>
    <div class="model-info">
      <div><i class="fas fa-user"></i> 所有者: ${model.owned_by || '未知'}</div>
      <div><i class="fas fa-clock"></i> 创建时间: ${formatDate(model.created)}</div>
    </div>
    ${permissions ? `
      <div class="model-permission">
        <div class="permission-item ${permissions.allow_create_engine ? 'active' : ''}">
          <i class="fas ${permissions.allow_create_engine ? 'fa-check' : 'fa-times'}"></i> 创建引擎
        </div>
        <div class="permission-item ${permissions.allow_sampling ? 'active' : ''}">
          <i class="fas ${permissions.allow_sampling ? 'fa-check' : 'fa-times'}"></i> 采样
        </div>
        <div class="permission-item ${permissions.allow_logprobs ? 'active' : ''}">
          <i class="fas ${permissions.allow_logprobs ? 'fa-check' : 'fa-times'}"></i> 日志概率
        </div>
        <div class="permission-item ${permissions.allow_search_indices ? 'active' : ''}">
          <i class="fas ${permissions.allow_search_indices ? 'fa-check' : 'fa-times'}"></i> 搜索索引
        </div>
        <div class="permission-item ${permissions.allow_view ? 'active' : ''}">
          <i class="fas ${permissions.allow_view ? 'fa-check' : 'fa-times'}"></i> 查看
        </div>
        <div class="permission-item ${permissions.allow_fine_tuning ? 'active' : ''}">
          <i class="fas ${permissions.allow_fine_tuning ? 'fa-check' : 'fa-times'}"></i> 微调
        </div>
      </div>
    ` : ''}
  `;

  // 添加复制按钮事件监听器
  const copyButton = card.querySelector('.copy-button');
  copyButton.addEventListener('click', (event) => {
    copyModelId(model.id, event);
  });

  // 添加测试按钮事件监听器
  const testButton = card.querySelector('.test-button');
  testButton.addEventListener('click', async () => {
    // 获取当前的 baseUrl 和 apiKey
    const baseUrl = document.getElementById('baseUrl').value.trim();
    const apiKey = document.getElementById('apiKey').value.trim();

    if (!baseUrl || !apiKey) {
      alert('请先填写 Base URL 和 API Key');
      return;
    }

    // 显示加载状态
    testButton.classList.add('loading');
    testButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    // 移除之前的状态类
    card.classList.remove('available', 'unavailable');

    try {
      const result = await testModelAvailability(model.id, baseUrl, apiKey);
      
      // 根据测试结果更新卡片样式
      if (result.success) {
        card.classList.add('available');
        testButton.innerHTML = '<i class="fas fa-check"></i>';
      } else {
        card.classList.add('unavailable');
        testButton.innerHTML = '<i class="fas fa-times"></i>';
      }

      // 添加提示框显示详细信息
      const tooltip = document.createElement('div');
      tooltip.className = 'tooltip';
      tooltip.textContent = result.message;
      testButton.appendChild(tooltip);
      
      setTimeout(() => tooltip.classList.add('show'), 10);
      setTimeout(() => {
        tooltip.classList.remove('show');
        setTimeout(() => tooltip.remove(), 200);
      }, 2000);

    } catch (error) {
      card.classList.add('unavailable');
      testButton.innerHTML = '<i class="fas fa-times"></i>';
    } finally {
      testButton.classList.remove('loading');
    }
  });

  return card;
}

// 添加复制全部功能
let availableModelIds = []; // 存储可用的模型ID

// 复制全部模型ID的函数
async function copyAllModelIds(event) {
  event.stopPropagation();
  if (!availableModelIds.length) return;
  
  const modelIdsText = availableModelIds.join(',');
  
  // 创建临时输入框
  const tempInput = document.createElement('textarea');
  tempInput.value = modelIdsText;
  document.body.appendChild(tempInput);
  
  try {
    // 选择并复制文本
    tempInput.select();
    document.execCommand('copy');
    
    const copyAllButton = event.currentTarget;
    
    // 移除可能已存在的所有提示框
    const existingTooltips = document.querySelectorAll('.tooltip');
    existingTooltips.forEach(tooltip => tooltip.remove());
    
    // 创建新的提示框
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.textContent = '已复制所有模型名称！';
    copyAllButton.appendChild(tooltip);
    
    // 显示提示框
    setTimeout(() => tooltip.classList.add('show'), 10);
    
    // 2秒后移除提示框
    setTimeout(() => {
      tooltip.classList.remove('show');
      setTimeout(() => tooltip.remove(), 200);
    }, 2000);
  } catch (err) {
    console.error('复制失败:', err);
  } finally {
    // 移除临时输入框
    document.body.removeChild(tempInput);
  }
}

// 修改 API 测试部分的代码
document.getElementById('testButton').addEventListener('click', async () => {
  const copyAllContainer = document.getElementById('copyAllContainer');
  copyAllContainer.style.display = 'none'; // 开始测试时隐藏复制全部按钮
  availableModelIds = []; // 清空模型ID列表
  
  const baseUrl = document.getElementById('baseUrl').value.trim();
  const apiKey = document.getElementById('apiKey').value.trim();
  const resultsDiv = document.getElementById('results');

  if (!baseUrl || !apiKey) {
    resultsDiv.innerHTML = '<div class="error-message">请输入 Base URL 和 API Key</div>';
    return;
  }

  let formattedUrl = baseUrl;
  if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
    formattedUrl = 'https://' + formattedUrl;
  }
  
  formattedUrl = formattedUrl.replace(/\/+$/, '');
  
  if (!formattedUrl.endsWith('/v1')) {
    formattedUrl += '/v1';
  }

  resultsDiv.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> 正在测试 API 模型...</div>';

  try {
    const response = await fetch(`${formattedUrl}/models`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      let errorMessage = '';
      switch (response.status) {
        case 401: errorMessage = 'API Key 无效或未授权'; break;
        case 403: errorMessage = '没有访问权限'; break;
        case 404: errorMessage = 'API 端点不存在，请检查 Base URL 是否正确'; break;
        case 429: errorMessage = '请求次数过多，请稍后再试'; break;
        case 500: errorMessage = '服务器内部错误'; break;
        default: errorMessage = `请求失败 (HTTP ${response.status})`;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    const availableModels = data.data || data.models || data;
    
    if (!availableModels || (Array.isArray(availableModels) && availableModels.length === 0)) {
      resultsDiv.innerHTML = '<div class="error-message">未找到可用的模型</div>';
      return;
    }

    // 存储所有模型ID
    availableModelIds = availableModels.map(model => model.id);
    
    // 显示复制全部按钮
    copyAllContainer.style.display = 'block';
    
    // 清空结果区域
    resultsDiv.innerHTML = '';
    
    // 创建模型网格容器
    const modelGrid = document.createElement('div');
    modelGrid.className = 'model-grid';
    
    // 添加每个模型卡片
    availableModels.forEach(model => {
      modelGrid.appendChild(generateModelCard(model));
    });
    
    // 将网格添加到结果区域
    resultsDiv.appendChild(modelGrid);

  } catch (error) {
    copyAllContainer.style.display = 'none'; // 发生错误时隐藏复制全部按钮
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      resultsDiv.innerHTML = '<div class="error-message">连接错误: 无法连接到服务器，请检查 URL 是否正确</div>';
    } else {
      resultsDiv.innerHTML = `<div class="error-message">错误: ${error.message}</div>`;
    }
  }
});

// 添加复制全部按钮的事件监听器
document.getElementById('copyAllButton').addEventListener('click', copyAllModelIds);

function formatDate(timestamp) {
  if (!timestamp) return '未知';
  const date = new Date(timestamp * 1000);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// 自动填充示例 URL
document.getElementById('baseUrl').value = 'https://demo.voapi.top';

// 将 testModelAvailability 函数移到文件前面
async function testModelAvailability(modelName, baseUrl, apiKey) {
  // 确保 baseUrl 格式正确
  let formattedUrl = baseUrl;
  if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
    formattedUrl = 'https://' + formattedUrl;
  }
  formattedUrl = formattedUrl.replace(/\/+$/, '');
  if (!formattedUrl.endsWith('/v1')) {
    formattedUrl += '/v1';
  }

  console.log('Testing model with:', {
    url: `${formattedUrl}/chat/completions`,
    model: modelName
  });

  const testData = {
    model: modelName,
    messages: [
      {
        role: "user",
        content: "Hello"
      }
    ],
    temperature: 0.7,
    max_tokens: 10,
    stream: false
  };

  try {
    const response = await fetch(`${formattedUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });

    const data = await response.json();
    console.log('API Response:', data);

    if (!response.ok) {
      let errorMessage = '';
      if (data.error && data.error.message) {
        errorMessage = data.error.message;
      } else {
        switch (response.status) {
          case 401:
            errorMessage = 'API Key 无效或未授权';
            break;
          case 404:
            errorMessage = '模型不存在或不可用';
            break;
          case 429:
            errorMessage = '请求次数过多，请稍后再试';
            break;
          case 500:
            errorMessage = '服务器内部错误';
            break;
          default:
            errorMessage = `请求失败 (HTTP ${response.status})`;
        }
      }
      throw new Error(errorMessage);
    }

    // 检查响应中是否包含有效的回复
    if (data.choices && data.choices.length > 0) {
      return {
        success: true,
        message: '模型可用并成功返回响应'
      };
    } else {
      throw new Error('模型响应格式异常');
    }
  } catch (error) {
    console.error('Test failed:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

// 添加批量测试模型功能
async function testMultipleModels(modelNames, baseUrl, apiKey) {
  const results = [];
  for (const modelName of modelNames) {
    const result = await testModelAvailability(modelName.trim(), baseUrl, apiKey);
    results.push({
      modelName: modelName.trim(),
      ...result
    });
  }
  return results;
}

// 修改状态显示样式以支持多模型结果
function updateStatusDisplay(statusDiv, results) {
  if (!Array.isArray(results)) {
    results = [{ modelName: '', ...results }];
  }

  const allSuccess = results.every(r => r.success);
  statusDiv.className = `model-status ${allSuccess ? 'success' : 'error'}`;

  const resultsHtml = results.map(result => `
    <div style="display: flex; align-items: start; gap: 8px; margin-bottom: 8px;">
      <i class="fas ${result.success ? 'fa-check-circle' : 'fa-times-circle'}" style="margin-top: 4px;"></i>
      <div>
        ${result.modelName ? `<div style="font-weight: 500; margin-bottom: 4px;">${result.modelName}</div>` : ''}
        <div style="font-size: 13px;">${result.message}</div>
      </div>
    </div>
  `).join('');

  statusDiv.innerHTML = `
    <div style="display: flex; flex-direction: column;">
      <div style="font-weight: 500; margin-bottom: 8px;">
        测试结果 (${results.filter(r => r.success).length}/${results.length} 个模型可用)
      </div>
      ${resultsHtml}
    </div>
  `;
}

// 修改测试按钮的事件处理
document.getElementById('testModelButton').addEventListener('click', async () => {
  const modelNamesInput = document.getElementById('modelName').value.trim();
  const baseUrl = document.getElementById('baseUrl').value.trim();
  const apiKey = document.getElementById('apiKey').value.trim();
  
  let statusDiv = document.querySelector('.model-status');
  if (!statusDiv) {
    statusDiv = document.createElement('div');
    statusDiv.className = 'model-status';
    document.querySelector('.model-test-container').appendChild(statusDiv);
  }

  if (!modelNamesInput || !baseUrl || !apiKey) {
    updateStatusDisplay(statusDiv, {
      success: false,
      message: '请填写所有必要信息'
    });
    return;
  }

  // 分割模型名称
  const modelNames = modelNamesInput.split(',').filter(name => name.trim());

  if (modelNames.length === 0) {
    updateStatusDisplay(statusDiv, {
      success: false,
      message: '请输入至少一个有效的模型名称'
    });
    return;
  }

  // 显示加载状态
  statusDiv.className = 'model-status loading';
  statusDiv.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px;">
      <i class="fas fa-spinner fa-spin"></i>
      <div>正在测试 ${modelNames.length} 个模型的可用性...</div>
    </div>
  `;

  const results = await testMultipleModels(modelNames, baseUrl, apiKey);
  updateStatusDisplay(statusDiv, results);
});

// 添加滚动按钮功能
document.getElementById('scrollTop').addEventListener('click', () => {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
});

document.getElementById('scrollBottom').addEventListener('click', () => {
  window.scrollTo({
    top: document.documentElement.scrollHeight,
    behavior: 'smooth'
  });
});