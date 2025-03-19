// 合约地址和ABI
const CONTRACT_ADDRESSES = {
    USDT: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', // USDT合约地址
    USDD: 'TPYmHEhy5n8TCEfYGqW2rPxsghSfzghPDn', // USDD合约地址
    SUNSWAP_ROUTER: 'TKzxdSv2FZKQrEqkKVgp5DcwEXBEKMg2Ax', // SunSwap路由合约
    SUNSWAP_FACTORY: 'TXk8rQSAvPvBRNJxQRX3H9qpsGobFQ3jrH', // SunSwap工厂合约
    LP_TOKEN: '', // 将在初始化时确定
    SUNSWAP_POOL: 'TPeU9W4HwVq7VAYyMwJRmwvXLYuHHP3iGB' // SunSwap流动性挖矿池
};

// ABI定义
const TOKEN_ABI = [
    {
        "constant": true,
        "inputs": [{"name": "_owner", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"name": "balance", "type": "uint256"}],
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [{"name": "_spender", "type": "address"}, {"name": "_value", "type": "uint256"}],
        "name": "approve",
        "outputs": [{"name": "", "type": "bool"}],
        "type": "function"
    }
];

const ROUTER_ABI = [
    {
        "constant": false,
        "inputs": [
            {"name": "amountA", "type": "uint256"},
            {"name": "amountB", "type": "uint256"},
            {"name": "tokenA", "type": "address"},
            {"name": "tokenB", "type": "address"},
            {"name": "to", "type": "address"},
            {"name": "deadline", "type": "uint256"}
        ],
        "name": "addLiquidity",
        "outputs": [
            {"name": "amountA", "type": "uint256"},
            {"name": "amountB", "type": "uint256"},
            {"name": "liquidity", "type": "uint256"}
        ],
        "type": "function"
    }
];

const POOL_ABI = [
    {
        "constant": false,
        "inputs": [{"name": "_amount", "type": "uint256"}],
        "name": "stake",
        "outputs": [],
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [],
        "name": "getReward",
        "outputs": [],
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [],
        "name": "exit",
        "outputs": [],
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [{"name": "_account", "type": "address"}],
        "name": "earned",
        "outputs": [{"name": "", "type": "uint256"}],
        "type": "function"
    }
];

// 应用状态变量
let appState = {
    tronWeb: null,
    account: null,
    isConnected: false,
    balances: {
        trx: 0,
        usdt: 0,
        usdd: 0,
        lp: 0,
        rewards: 0
    },
    contracts: {
        usdt: null,
        usdd: null,
        router: null,
        lpToken: null,
        pool: null
    },
    approvals: {
        usdt: false,
        usdd: false,
        lp: false
    }
};

// DOM元素
const elements = {
    connectWalletBtn: document.getElementById('connectWalletBtn'),
    walletStatus: document.getElementById('walletStatus'),
    checkBalanceBtn: document.getElementById('checkBalanceBtn'),
    trxBalance: document.getElementById('trxBalance'),
    usdtBalance: document.getElementById('usdtBalance'),
    usddBalance: document.getElementById('usddBalance'),
    lpBalance: document.getElementById('lpBalance'),
    currentRewards: document.getElementById('currentRewards'),
    usdtAmount: document.getElementById('usdtAmount'),
    usddAmount: document.getElementById('usddAmount'),
    swapForUsddBtn: document.getElementById('swapForUsddBtn'),
    approveUsdtBtn: document.getElementById('approveUsdtBtn'),
    approveUsddBtn: document.getElementById('approveUsddBtn'),
    addLiquidityBtn: document.getElementById('addLiquidityBtn'),
    approveLpBtn: document.getElementById('approveLpBtn'),
    stakeLpBtn: document.getElementById('stakeLpBtn'),
    harvestBtn: document.getElementById('harvestBtn'),
    unstakeBtn: document.getElementById('unstakeBtn'),
    statusMessage: document.getElementById('statusMessage')
};

// 步骤卡片
const stepCards = {
    step1: document.getElementById('step1Card'),
    step2: document.getElementById('step2Card'),
    step3: document.getElementById('step3Card'),
    step4: document.getElementById('step4Card'),
    step5: document.getElementById('step5Card')
};

// 辅助函数
function showStatus(message, type = 'info') {
    elements.statusMessage.className = `alert alert-${type}`;
    elements.statusMessage.textContent = message;
    elements.statusMessage.style.display = 'block';
    
    // 5秒后自动隐藏
    setTimeout(() => {
        elements.statusMessage.style.display = 'none';
    }, 5000);
}

function activateStep(step) {
    // 移除所有步骤的非活动状态
    Object.values(stepCards).forEach(card => card.classList.add('step-inactive'));
    
    // 激活特定步骤
    stepCards[step].classList.remove('step-inactive');
}

function formatBalance(balance, decimals = 6) {
    return (balance / Math.pow(10, decimals)).toFixed(4);
}

// 验证TronWeb是否可用的函数
function isTronWebAvailable() {
    if (window.tronWeb) {
        return true;
    }
    return false;
}

// 获取TronWeb地址的函数
function getTronWebAddress() {
    if (!window.tronWeb) return null;
    
    // 尝试从不同位置获取地址
    try {
        if (window.tronWeb.defaultAddress && window.tronWeb.defaultAddress.base58) {
            return window.tronWeb.defaultAddress.base58;
        }
        return null;
    } catch (e) {
        console.error("获取地址失败:", e);
        return null;
    }
}

// 检查TronWeb是否已准备好
function isTronWebReady() {
    return window.tronWeb && window.tronWeb.ready;
}

// 添加判断测试模式的辅助函数
function isTestMode() {
    return window.location.protocol === 'file:' || 
           (appState.account === 'TJM6YUNxx8YPWutRxrDDa4WpzECcUt9XqM');
}

// 修改连接钱包函数，使用最新推荐的方法
async function connectWallet() {
    showStatus('正在尝试连接TronLink钱包...', 'info');
    console.log('尝试连接TronLink钱包...');
    
    try {
        // 清除之前的连接
        if (appState.isConnected) {
            appState.account = null;
            appState.isConnected = false;
            appState.tronWeb = null;
        }
        
        // 检测TronLink
        if (!window.tronWeb && !window.tronLink) {
            showStatus('未检测到TronLink钱包。请安装TronLink扩展并刷新页面。', 'danger');
            console.error('未检测到TronLink或TronWeb');
            return;
        }
        
        // 直接方式: 尝试从window.tronWeb获取地址
        let tronWebAddress = null;
        if (window.tronWeb && window.tronWeb.defaultAddress) {
            try {
                tronWebAddress = window.tronWeb.defaultAddress.base58;
                console.log('直接获取地址:', tronWebAddress);
            } catch (e) {
                console.warn('直接获取地址失败:', e);
            }
        }
        
        // 方式2: 如果有TronLink对象，尝试使用TronLink API
        if (!tronWebAddress && window.tronLink) {
            try {
                console.log('尝试使用tronLink.request...');
                // 这是TronLink官方推荐的方法
                const accounts = await window.tronLink.request({method: 'tron_requestAccounts'});
                console.log('TronLink返回账户:', accounts);
                
                if (accounts && accounts.code === 200 && accounts.data && accounts.data.length > 0) {
                    tronWebAddress = accounts.data[0];
                    console.log('TronLink API获取地址:', tronWebAddress);
                }
            } catch (e) {
                console.warn('TronLink API请求失败:', e);
            }
        }
        
        // 最后检查: 如果有window.tronLink.tronWeb，尝试从那里获取地址
        if (!tronWebAddress && window.tronLink && window.tronLink.tronWeb) {
            try {
                tronWebAddress = window.tronLink.tronWeb.defaultAddress.base58;
                console.log('从tronLink.tronWeb获取地址:', tronWebAddress);
            } catch (e) {
                console.warn('从tronLink.tronWeb获取地址失败:', e);
            }
        }
        
        // 如果所有方法都失败，建议用户手动授权
        if (!tronWebAddress) {
            showStatus('无法获取钱包地址。请点击"打开TronLink"按钮，然后在TronLink中授权此网站访问。', 'warning');
            return;
        }
        
        // 成功获取地址
        console.log('成功获取TronLink地址:', tronWebAddress);
        appState.account = tronWebAddress;
        appState.isConnected = true;
        
        // 使用window.tronWeb或window.tronLink.tronWeb
        if (window.tronWeb) {
            appState.tronWeb = window.tronWeb;
        } else if (window.tronLink && window.tronLink.tronWeb) {
            appState.tronWeb = window.tronLink.tronWeb;
        }
        
        // 更新UI
        elements.walletStatus.textContent = `已连接: ${appState.account.substring(0, 6)}...${appState.account.substring(appState.account.length - 4)}`;
        elements.connectWalletBtn.textContent = '已连接';
        elements.connectWalletBtn.disabled = true;
        
        // 初始化合约
        initContracts();
        
        // 激活下一步
        activateStep('step2');
        elements.checkBalanceBtn.disabled = false;
        
        // 检查是否在测试模式
        const isTestMode = window.location.protocol === 'file:' || 
                        (appState.account === 'TJM6YUNxx8YPWutRxrDDa4WpzECcUt9XqM');
                        
        // 在测试模式下自动刷新余额
        if (isTestMode) {
            console.log('测试模式: 自动刷新余额');
            setTimeout(() => {
                checkBalances();
            }, 500);
        }
        
        showStatus('钱包连接成功!', 'success');
    } catch (error) {
        console.error('连接过程中出错:', error);
        showStatus('连接钱包时出错: ' + (error.message || '未知错误'), 'danger');
    }
}

// 修改事件监听器设置，确保所有元素都已加载
function setupEventListeners() {
    // 检查DOM元素是否已加载
    if (!elements.connectWalletBtn) {
        console.error('connectWalletBtn未找到！DOM可能尚未加载');
        setTimeout(setupEventListeners, 100); // 100毫秒后重试
        return;
    }
    
    console.log('设置事件监听器...');
    
    // 连接钱包按钮
    elements.connectWalletBtn.addEventListener('click', function() {
        console.log('连接钱包按钮被点击');
        connectWallet();
    });
    
    // 其他按钮
    if (elements.checkBalanceBtn) elements.checkBalanceBtn.addEventListener('click', checkBalances);
    if (elements.swapForUsddBtn) elements.swapForUsddBtn.addEventListener('click', goToSwap);
    if (elements.approveUsdtBtn) elements.approveUsdtBtn.addEventListener('click', approveUsdt);
    if (elements.approveUsddBtn) elements.approveUsddBtn.addEventListener('click', approveUsdd);
    if (elements.addLiquidityBtn) elements.addLiquidityBtn.addEventListener('click', addLiquidity);
    if (elements.approveLpBtn) elements.approveLpBtn.addEventListener('click', approveLp);
    if (elements.stakeLpBtn) elements.stakeLpBtn.addEventListener('click', stakeLp);
    if (elements.harvestBtn) elements.harvestBtn.addEventListener('click', harvestRewards);
    if (elements.unstakeBtn) elements.unstakeBtn.addEventListener('click', unstake);
    
    // 设置USDT和USDD输入字段的联动（假设1:1汇率）
    if (elements.usdtAmount && elements.usddAmount) {
        elements.usdtAmount.addEventListener('input', function() {
            const usdtAmount = parseFloat(this.value);
            if (!isNaN(usdtAmount)) {
                elements.usddAmount.value = usdtAmount;
            }
        });
        
        elements.usddAmount.addEventListener('input', function() {
            const usddAmount = parseFloat(this.value);
            if (!isNaN(usddAmount)) {
                elements.usdtAmount.value = usddAmount;
            }
        });
    }
}

// 页面加载完成后的初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM加载完成，开始初始化...');
    
    // 检查是否在测试模式下运行（直接打开本地文件）
    const isTestMode = window.location.protocol === 'file:' || 
                      (window.tronWeb && window.tronWeb.defaultAddress && 
                       window.tronWeb.defaultAddress.base58 === 'TJM6YUNxx8YPWutRxrDDa4WpzECcUt9XqM');
    
    if (isTestMode) {
        console.log("检测到测试模式!");
        document.getElementById('testModeBanner').style.display = 'block';
        showStatus('测试模式已激活，使用模拟钱包数据。真实环境请部署到网站或使用本地服务器。', 'warning');
    }
    
    // 设置事件监听器
    setupEventListeners();
    
    // 检查TronLink的加载状态
    function checkTronLinkStatus() {
        console.log('检查TronLink状态...');
        console.log('window.tronWeb:', !!window.tronWeb);
        console.log('window.tronLink:', !!window.tronLink);
        
        if (window.tronWeb || window.tronLink) {
            if (isTestMode) {
                showStatus('测试模式: 点击"连接钱包"按钮使用模拟数据', 'info');
            } else {
                showStatus('已检测到TronLink钱包，请点击"连接钱包"按钮连接', 'info');
            }
        } else {
            if (isTestMode) {
                showStatus('测试模式: 未检测到TronLink，使用模拟数据', 'warning');
            } else {
                showStatus('未检测到TronLink钱包，请安装TronLink扩展并刷新页面', 'warning');
            }
        }
    }
    
    // 等待片刻再检查TronLink状态，因为它可能需要时间加载
    setTimeout(checkTronLinkStatus, 1000);
});

// 初始化应用
async function initApp() {
    console.log('正在初始化应用...');
    
    // 检查是否安装了TronLink
    if (window.tronWeb) {
        appState.tronWeb = window.tronWeb;
        console.log('找到TronWeb实例:', typeof window.tronWeb, window.tronWeb ? 'OK' : 'NULL');
        console.log('TronWeb API:', window.tronWeb.defaultAddress ? 'defaultAddress OK' : 'No defaultAddress');
        console.log('TronWeb ready:', window.tronWeb.ready);
        
        // 如果TronWeb已经准备好，尝试直接连接
        if (window.tronWeb.ready) {
            console.log('TronWeb已准备好，尝试连接');
            connectWallet();
        } else {
            console.log('TronWeb未准备好，等待用户点击连接');
            showStatus('请点击"连接钱包"按钮授权连接', 'info');
        }
    } else {
        showStatus('未检测到TronLink钱包，请安装并解锁TronLink', 'danger');
        console.error('未找到TronWeb');
    }
}

// 初始化合约实例
function initContracts() {
    try {
        // 初始化代币合约
        appState.contracts.usdt = appState.tronWeb.contract(TOKEN_ABI, CONTRACT_ADDRESSES.USDT);
        appState.contracts.usdd = appState.tronWeb.contract(TOKEN_ABI, CONTRACT_ADDRESSES.USDD);
        
        // 初始化路由器合约
        appState.contracts.router = appState.tronWeb.contract(ROUTER_ABI, CONTRACT_ADDRESSES.SUNSWAP_ROUTER);
        
        // 初始化挖矿池合约
        appState.contracts.pool = appState.tronWeb.contract(POOL_ABI, CONTRACT_ADDRESSES.SUNSWAP_POOL);
        
        console.log('合约初始化成功');
    } catch (error) {
        console.error('初始化合约时出错:', error);
        showStatus('初始化合约时出错: ' + error.message, 'danger');
    }
}

// 检查余额
async function checkBalances() {
    if (!appState.isConnected) {
        showStatus('请先连接钱包', 'warning');
        return;
    }
    
    try {
        showStatus('正在检查余额...', 'info');
        
        // 检查是否在测试模式
        const isTestMode = window.location.protocol === 'file:' || 
                        (appState.account === 'TJM6YUNxx8YPWutRxrDDa4WpzECcUt9XqM');
        
        if (isTestMode) {
            console.log('测试模式: 使用模拟余额数据');
            // 使用测试数据
            appState.balances.trx = 50;
            elements.trxBalance.textContent = `${appState.balances.trx.toFixed(4)} TRX`;
            
            appState.balances.usdt = 600; // 测试用的600 USDT
            elements.usdtBalance.textContent = `${appState.balances.usdt.toFixed(4)} USDT`;
            
            appState.balances.usdd = 0;
            elements.usddBalance.textContent = `${appState.balances.usdd.toFixed(4)} USDD`;
            
            showStatus('余额更新成功（测试模式数据）', 'success');
            
            // 在测试模式下直接激活第3步
            activateStep('step3');
            elements.usdtAmount.disabled = false;
            elements.usddAmount.disabled = false;
            elements.swapForUsddBtn.disabled = false;
            elements.approveUsdtBtn.disabled = false;
            elements.approveUsddBtn.disabled = false;
            
            return;
        }
        
        // 以下是正常模式的代码
        // 获取TRX余额
        const trxBalance = await appState.tronWeb.trx.getBalance(appState.account);
        appState.balances.trx = trxBalance / 1e6; // TRX有6位小数
        elements.trxBalance.textContent = `${appState.balances.trx.toFixed(4)} TRX`;
        
        // 获取USDT余额
        const usdtBalance = await appState.contracts.usdt.balanceOf(appState.account).call();
        appState.balances.usdt = usdtBalance / 1e6; // USDT有6位小数
        elements.usdtBalance.textContent = `${appState.balances.usdt.toFixed(4)} USDT`;
        
        // 获取USDD余额
        const usddBalance = await appState.contracts.usdd.balanceOf(appState.account).call();
        appState.balances.usdd = usddBalance / 1e18; // USDD有18位小数
        elements.usddBalance.textContent = `${appState.balances.usdd.toFixed(4)} USDD`;
        
        // 如果LP代币合约已定义，获取LP代币余额
        if (appState.contracts.lpToken) {
            const lpBalance = await appState.contracts.lpToken.balanceOf(appState.account).call();
            appState.balances.lp = lpBalance / 1e18; // LP代币通常有18位小数
            elements.lpBalance.textContent = `${appState.balances.lp.toFixed(4)} LP`;
        }
        
        // 如果已经质押，获取奖励余额
        if (appState.isStaked) {
            const rewards = await appState.contracts.pool.earned(appState.account).call();
            appState.balances.rewards = rewards / 1e18; // 奖励代币通常有18位小数
            elements.currentRewards.textContent = `${appState.balances.rewards.toFixed(4)} SUN`;
        }
        
        showStatus('余额更新成功', 'success');
        
        // 根据余额激活下一步
        if (appState.balances.usdt > 0) {
            activateStep('step3');
            elements.usdtAmount.disabled = false;
            elements.usddAmount.disabled = false;
            elements.swapForUsddBtn.disabled = false;
            elements.approveUsdtBtn.disabled = false;
            elements.approveUsddBtn.disabled = false;
        }
    } catch (error) {
        console.error('检查余额时出错:', error);
        showStatus('检查余额时出错: ' + error.message, 'danger');
    }
}

// 用USDT兑换USDD
function goToSwap() {
    window.open('https://sunswap.com/#/swap', '_blank');
    showStatus('已打开SunSwap交易页面，请完成USDT到USDD的兑换', 'info');
}

// 授权USDT
async function approveUsdt() {
    if (!appState.isConnected) {
        showStatus('请先连接钱包', 'warning');
        return;
    }
    
    const usdtAmount = parseFloat(elements.usdtAmount.value);
    if (isNaN(usdtAmount) || usdtAmount <= 0) {
        showStatus('请输入有效的USDT数量', 'warning');
        return;
    }
    
    try {
        showStatus('正在授权USDT...', 'info');
        
        // 测试模式直接模拟成功
        if (isTestMode()) {
            console.log('测试模式: 模拟USDT授权成功');
            showStatus('测试模式: USDT授权成功', 'success');
            appState.approvals.usdt = true;
            
            // 检查是否可以启用添加流动性按钮
            if (appState.approvals.usdt && appState.approvals.usdd) {
                elements.addLiquidityBtn.disabled = false;
            }
            return;
        }
        
        // 最大授权量，实际上只会使用您指定的金额
        const MAX_UINT256 = '115792089237316195423570985008687907853269984665640564039457584007913129639935';
        
        const result = await appState.contracts.usdt.approve(
            CONTRACT_ADDRESSES.SUNSWAP_ROUTER,
            MAX_UINT256
        ).send();
        
        console.log('USDT授权结果:', result);
        showStatus('USDT授权成功', 'success');
        appState.approvals.usdt = true;
        
        // 检查是否可以启用添加流动性按钮
        if (appState.approvals.usdt && appState.approvals.usdd) {
            elements.addLiquidityBtn.disabled = false;
        }
    } catch (error) {
        console.error('授权USDT时出错:', error);
        showStatus('授权USDT时出错: ' + error.message, 'danger');
    }
}

// 授权USDD
async function approveUsdd() {
    if (!appState.isConnected) {
        showStatus('请先连接钱包', 'warning');
        return;
    }
    
    const usddAmount = parseFloat(elements.usddAmount.value);
    if (isNaN(usddAmount) || usddAmount <= 0) {
        showStatus('请输入有效的USDD数量', 'warning');
        return;
    }
    
    try {
        showStatus('正在授权USDD...', 'info');
        
        // 测试模式直接模拟成功
        if (isTestMode()) {
            console.log('测试模式: 模拟USDD授权成功');
            showStatus('测试模式: USDD授权成功', 'success');
            appState.approvals.usdd = true;
            
            // 检查是否可以启用添加流动性按钮
            if (appState.approvals.usdt && appState.approvals.usdd) {
                elements.addLiquidityBtn.disabled = false;
            }
            return;
        }
        
        const MAX_UINT256 = '115792089237316195423570985008687907853269984665640564039457584007913129639935';
        
        const result = await appState.contracts.usdd.approve(
            CONTRACT_ADDRESSES.SUNSWAP_ROUTER,
            MAX_UINT256
        ).send();
        
        console.log('USDD授权结果:', result);
        showStatus('USDD授权成功', 'success');
        appState.approvals.usdd = true;
        
        // 检查是否可以启用添加流动性按钮
        if (appState.approvals.usdt && appState.approvals.usdd) {
            elements.addLiquidityBtn.disabled = false;
        }
    } catch (error) {
        console.error('授权USDD时出错:', error);
        showStatus('授权USDD时出错: ' + error.message, 'danger');
    }
}

// 添加流动性
async function addLiquidity() {
    if (!appState.isConnected) {
        showStatus('请先连接钱包', 'warning');
        return;
    }
    
    const usdtAmount = parseFloat(elements.usdtAmount.value);
    const usddAmount = parseFloat(elements.usddAmount.value);
    
    if (isNaN(usdtAmount) || usdtAmount <= 0 || isNaN(usddAmount) || usddAmount <= 0) {
        showStatus('请输入有效的USDT和USDD数量', 'warning');
        return;
    }
    
    try {
        showStatus('正在添加流动性...', 'info');
        
        // 测试模式直接模拟成功
        if (isTestMode()) {
            console.log('测试模式: 模拟添加流动性成功');
            
            // 模拟结果
            CONTRACT_ADDRESSES.LP_TOKEN = 'TF17BgPaZYbz8oxbjhriubPDsA7ArKoLX3'; // 模拟LP Token地址
            
            // 模拟LP代币合约和余额
            appState.contracts.lpToken = {
                balanceOf: function(address) {
                    return {
                        call: function() {
                            return Promise.resolve(usdtAmount * 1e18); // 简单模拟LP余额等于USDT金额
                        }
                    };
                },
                approve: function(spender, amount) {
                    return {
                        send: function() {
                            return Promise.resolve({
                                txid: "mock_approve_tx_" + Date.now()
                            });
                        }
                    };
                }
            };
            
            // 更新LP余额显示
            appState.balances.lp = usdtAmount;
            elements.lpBalance.textContent = `${appState.balances.lp.toFixed(4)} LP`;
            
            // 更新USDT和USDD余额，反映添加流动性的结果
            appState.balances.usdt -= usdtAmount;
            elements.usdtBalance.textContent = `${appState.balances.usdt.toFixed(4)} USDT`;
            appState.balances.usdd = 0; // 所有USDD都用于流动性
            elements.usddBalance.textContent = `${appState.balances.usdd.toFixed(4)} USDD`;
            
            // 激活下一步
            activateStep('step4');
            elements.approveLpBtn.disabled = false;
            
            showStatus('测试模式: 流动性添加成功', 'success');
            return;
        }
        
        // 转换为合约所需的金额格式
        const usdtAmountInWei = appState.tronWeb.toSun(usdtAmount.toString());
        const usddAmountInWei = appState.tronWeb.toSun(usddAmount.toString());
        
        // 设置截止时间为当前时间+30分钟
        const deadline = Math.floor(Date.now() / 1000) + 1800;
        
        const result = await appState.contracts.router.addLiquidity(
            usdtAmountInWei,
            usddAmountInWei,
            CONTRACT_ADDRESSES.USDT,
            CONTRACT_ADDRESSES.USDD,
            appState.account,
            deadline
        ).send();
        
        console.log('添加流动性结果:', result);
        showStatus('流动性添加成功', 'success');
        
        // 更新LP代币合约地址
        const pairAddress = await appState.tronWeb.contract().at(CONTRACT_ADDRESSES.SUNSWAP_FACTORY).getPair(CONTRACT_ADDRESSES.USDT, CONTRACT_ADDRESSES.USDD).call();
        CONTRACT_ADDRESSES.LP_TOKEN = pairAddress;
        appState.contracts.lpToken = appState.tronWeb.contract(TOKEN_ABI, pairAddress);
        
        // 激活下一步
        activateStep('step4');
        elements.approveLpBtn.disabled = false;
        
        // 刷新余额
        await checkBalances();
        
        showStatus('成功添加流动性，现在可以授权并质押LP代币', 'success');
    } catch (error) {
        console.error('添加流动性时出错:', error);
        showStatus('添加流动性时出错: ' + error.message, 'danger');
    }
}

// 授权LP代币
async function approveLp() {
    if (!appState.isConnected || !appState.contracts.lpToken) {
        showStatus('请先连接钱包并添加流动性', 'warning');
        return;
    }
    
    try {
        showStatus('正在授权LP代币...', 'info');
        
        // 测试模式直接模拟成功
        if (isTestMode()) {
            console.log('测试模式: 模拟LP代币授权成功');
            showStatus('测试模式: LP代币授权成功', 'success');
            appState.approvals.lp = true;
            
            // 启用质押按钮
            elements.stakeLpBtn.disabled = false;
            return;
        }
        
        const MAX_UINT256 = '115792089237316195423570985008687907853269984665640564039457584007913129639935';
        
        const result = await appState.contracts.lpToken.approve(
            CONTRACT_ADDRESSES.SUNSWAP_POOL,
            MAX_UINT256
        ).send();
        
        console.log('LP代币授权结果:', result);
        showStatus('LP代币授权成功', 'success');
        appState.approvals.lp = true;
        
        // 启用质押按钮
        elements.stakeLpBtn.disabled = false;
    } catch (error) {
        console.error('授权LP代币时出错:', error);
        showStatus('授权LP代币时出错: ' + error.message, 'danger');
    }
}

// 质押LP代币
async function stakeLp() {
    if (!appState.isConnected || !appState.contracts.lpToken || !appState.approvals.lp) {
        showStatus('请先连接钱包、添加流动性并授权LP代币', 'warning');
        return;
    }
    
    try {
        showStatus('正在质押LP代币...', 'info');
        
        // 测试模式直接模拟成功
        if (isTestMode()) {
            console.log('测试模式: 模拟质押LP代币成功');
            
            // 更新状态
            appState.isStaked = true;
            appState.balances.lp = 0; // 所有LP已质押
            elements.lpBalance.textContent = `0.0000 LP`;
            
            // 模拟收益
            appState.balances.rewards = appState.balances.usdt * 0.01; // 模拟收益为USDT的1%
            elements.currentRewards.textContent = `${appState.balances.rewards.toFixed(4)} SUN`;
            
            // 激活收益管理步骤
            activateStep('step5');
            elements.harvestBtn.disabled = false;
            elements.unstakeBtn.disabled = false;
            
            showStatus('测试模式: LP代币质押成功', 'success');
            return;
        }
        
        // 获取LP代币余额
        const lpBalance = await appState.contracts.lpToken.balanceOf(appState.account).call();
        
        // 质押全部LP代币
        const result = await appState.contracts.pool.stake(lpBalance).send();
        
        console.log('质押LP代币结果:', result);
        showStatus('LP代币质押成功', 'success');
        appState.isStaked = true;
        
        // 激活收益管理步骤
        activateStep('step5');
        elements.harvestBtn.disabled = false;
        elements.unstakeBtn.disabled = false;
        
        // 更新余额和收益
        await checkBalances();
    } catch (error) {
        console.error('质押LP代币时出错:', error);
        showStatus('质押LP代币时出错: ' + error.message, 'danger');
    }
}

// 收获奖励
async function harvestRewards() {
    if (!appState.isConnected || !appState.isStaked) {
        showStatus('请先连接钱包并质押LP代币', 'warning');
        return;
    }
    
    try {
        showStatus('正在收获奖励...', 'info');
        
        // 测试模式直接模拟成功
        if (isTestMode()) {
            console.log('测试模式: 模拟收获奖励成功');
            
            // 更新状态
            const currentRewards = appState.balances.rewards;
            appState.balances.rewards = 0; // 收益已收获
            elements.currentRewards.textContent = '0.0000 SUN';
            
            showStatus(`测试模式: 成功收获 ${currentRewards.toFixed(4)} SUN 奖励`, 'success');
            return;
        }
        
        const result = await appState.contracts.pool.getReward().send();
        
        console.log('收获奖励结果:', result);
        showStatus('奖励收获成功', 'success');
        
        // 更新余额和收益
        await checkBalances();
    } catch (error) {
        console.error('收获奖励时出错:', error);
        showStatus('收获奖励时出错: ' + error.message, 'danger');
    }
}

// 解除质押
async function unstake() {
    if (!appState.isConnected || !appState.isStaked) {
        showStatus('请先连接钱包并质押LP代币', 'warning');
        return;
    }
    
    try {
        showStatus('正在解除质押...', 'info');
        
        // 测试模式直接模拟成功
        if (isTestMode()) {
            console.log('测试模式: 模拟解除质押成功');
            
            // 更新状态
            appState.isStaked = false;
            
            // 恢复LP代币余额
            const originalLp = appState.balances.usdt * 0.9; // 假设收回90%的LP (模拟滑点损失)
            appState.balances.lp = originalLp;
            elements.lpBalance.textContent = `${appState.balances.lp.toFixed(4)} LP`;
            
            // 将一半转回USDT，一半转回USDD
            appState.balances.usdt += originalLp / 2;
            elements.usdtBalance.textContent = `${appState.balances.usdt.toFixed(4)} USDT`;
            appState.balances.usdd += originalLp / 2;
            elements.usddBalance.textContent = `${appState.balances.usdd.toFixed(4)} USDD`;
            
            // 清零收益
            appState.balances.rewards = 0;
            elements.currentRewards.textContent = '0.0000 SUN';
            
            // 回到第3步
            activateStep('step3');
            
            showStatus('测试模式: 解除质押成功，已收获所有奖励', 'success');
            return;
        }
        
        const result = await appState.contracts.pool.exit().send();
        
        console.log('解除质押结果:', result);
        showStatus('解除质押成功，同时已收获所有奖励', 'success');
        appState.isStaked = false;
        
        // 更新余额和收益
        await checkBalances();
        
        // 重置步骤
        activateStep('step3');
    } catch (error) {
        console.error('解除质押时出错:', error);
        showStatus('解除质押时出错: ' + error.message, 'danger');
    }
} 