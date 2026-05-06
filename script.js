// ============ ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ============
let products = [];
let categories = [];
let shopConfig = {};
let cart = [];
let currentPage = 'shop';
let currentCategory = 'all';
let purchaseType = null; // 'retail' или 'wholesale'
let pendingProduct = null; // для сохранения товара перед выбором типа

// Переменные для модального окна
let currentProduct = null;
let selectedMemory = null;
let selectedPrice = null;
let selectedQuantity = 1;
let minQuantity = 1;

// ============ ПОЛУЧЕНИЕ ИНФОРМАЦИИ О ПОЛЬЗОВАТЕЛЕ ============
function getUserInfo() {
    let userName = 'Неизвестный';
    let userId = 'Неизвестно';
    let userUsername = 'Нет username';
    let userPhone = 'Не указан';
    
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe) {
        const user = window.Telegram.WebApp.initDataUnsafe.user;
        if (user) {
            userName = user.first_name || '';
            if (user.last_name) userName += ' ' + user.last_name;
            if (!userName.trim()) userName = 'Пользователь';
            
            userId = user.id || 'Неизвестно';
            userUsername = user.username ? '@' + user.username : 'Нет username';
        }
    }
    
    const savedUser = localStorage.getItem('elwin_user_info');
    if (savedUser) {
        const parsed = JSON.parse(savedUser);
        if (parsed.userPhone) userPhone = parsed.userPhone;
    }
    
    return { userName, userId, userUsername, userPhone };
}

function saveUserInfo(phoneNumber = null) {
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe) {
        const user = window.Telegram.WebApp.initDataUnsafe.user;
        if (user) {
            let userName = user.first_name || '';
            if (user.last_name) userName += ' ' + user.last_name;
            if (!userName.trim()) userName = 'Пользователь';
            
            const existing = localStorage.getItem('elwin_user_info');
            let existingPhone = null;
            if (existing) {
                const parsed = JSON.parse(existing);
                existingPhone = parsed.userPhone;
            }
            
            const userInfo = {
                userName: userName,
                userId: user.id,
                userUsername: user.username ? '@' + user.username : 'Нет username',
                userPhone: phoneNumber || existingPhone || 'Не указан'
            };
            localStorage.setItem('elwin_user_info', JSON.stringify(userInfo));
        }
    }
}

// ============ ЗАГРУЗКА ДАННЫХ ============
async function loadData() {
    try {
        console.log('Загрузка data.json...');
        const response = await fetch('./data.json');
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Данные загружены');
        
        products = data.products;
        categories = data.categories;
        shopConfig = {
            shopName: data.shopName,
            contactPhone: data.contactPhone,
            managerTgId: data.managerTgId,
            botToken: data.botToken
        };
        
        const savedCart = localStorage.getItem('elwin_cart');
        if (savedCart) {
            cart = JSON.parse(savedCart);
        }
        
        const savedPurchaseType = localStorage.getItem('elwin_purchase_type');
        if (savedPurchaseType && (savedPurchaseType === 'retail' || savedPurchaseType === 'wholesale')) {
            purchaseType = savedPurchaseType;
        } else {
            purchaseType = 'retail';
            localStorage.setItem('elwin_purchase_type', 'retail');
        }
        
        if (window.Telegram && window.Telegram.WebApp) {
            window.Telegram.WebApp.expand();
        }
        
        initApp();
        
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        document.getElementById('mainContent').innerHTML = `
            <div style="text-align:center; padding:50px; color:red;">
                ❌ Ошибка загрузки данных<br>
                <small style="color:#888">${error.message}</small><br><br>
                <button onclick="location.reload()" style="padding:10px 20px; background:#1a3a8c; color:white; border:none; border-radius:10px;">↻ Перезагрузить</button>
            </div>
        `;
    }
}

// ============ ПЕРЕКЛЮЧЕНИЕ ТИПА ПОКУПКИ ============
function switchPurchaseType() {
    if (purchaseType === 'retail') {
        purchaseType = 'wholesale';
    } else {
        purchaseType = 'retail';
    }
    localStorage.setItem('elwin_purchase_type', purchaseType);
    
    // Обновляем цены в корзине
    checkAndUpdateCartPrices();
    
    // Обновляем отображение кнопки переключения
    updatePriceToggleButton();
    
    // Перерисовываем текущую страницу
    if (currentPage === 'shop') renderShopPage();
    else if (currentPage === 'sales') renderSalesPage();
    else if (currentPage === 'cart') renderCartPage();
    
    // Показываем уведомление
    const msg = purchaseType === 'wholesale' ? '📦 Включены оптовые цены (от 3 шт)' : '🛍️ Включены розничные цены (до 3 шт)';
    showToast(msg);
}

function updatePriceToggleButton() {
    const toggleBtn = document.getElementById('priceToggleBtn');
    if (toggleBtn) {
        if (purchaseType === 'wholesale') {
            toggleBtn.innerHTML = '📦 Опт';
            toggleBtn.style.background = '#FF8C00';
            toggleBtn.style.color = '#1a3a8c';
        } else {
            toggleBtn.innerHTML = '🛍️ Розница';
            toggleBtn.style.background = '#1a3a8c';
            toggleBtn.style.color = '#FF8C00';
        }
    }
}

function showToast(message) {
    // Удаляем старый тост, если есть
    const existingToast = document.querySelector('.price-toast');
    if (existingToast) existingToast.remove();
    
    const toast = document.createElement('div');
    toast.className = 'price-toast';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: #1a3a8c;
        color: #FF8C00;
        padding: 12px 20px;
        border-radius: 30px;
        font-size: 14px;
        font-weight: bold;
        z-index: 1000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        white-space: nowrap;
        animation: fadeInOut 2s ease forwards;
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        if (toast && toast.remove) toast.remove();
    }, 2000);
}

function initApp() {
    saveUserInfo();
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => switchPage(btn.dataset.page));
    });
    
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            if (currentPage === 'shop') renderShopPage();
        });
    }
    
    // Добавляем кнопку переключения типа цены в шапку
    addPriceToggleButton();
    
    switchPage('shop');
    updateCartBadge();
}

function addPriceToggleButton() {
    const headerCenter = document.querySelector('.header-center');
    if (headerCenter && !document.getElementById('priceToggleBtn')) {
        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'priceToggleBtn';
        toggleBtn.onclick = switchPurchaseType;
        toggleBtn.style.cssText = `
            background: ${purchaseType === 'wholesale' ? '#FF8C00' : '#1a3a8c'};
            color: ${purchaseType === 'wholesale' ? '#1a3a8c' : '#FF8C00'};
            border: none;
            border-radius: 20px;
            padding: 6px 12px;
            font-size: 12px;
            font-weight: bold;
            cursor: pointer;
            margin-left: 10px;
            transition: all 0.3s;
        `;
        toggleBtn.innerHTML = purchaseType === 'wholesale' ? '📦 Опт' : '🛍️ Розница';
        headerCenter.appendChild(toggleBtn);
    }
}

function switchPage(page) {
    currentPage = page;
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.page === page);
    });
    
    if (page === 'shop') renderShopPage();
    else if (page === 'sales') renderSalesPage();
    else if (page === 'cart') renderCartPage();
    else if (page === 'contacts') renderContactsPage();
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const mainContent = document.getElementById('mainContent');
    if (mainContent) mainContent.scrollTop = 0;
    
    updateCartBadge();
}

// ============ ПОЛУЧЕНИЕ ЦЕНЫ В ЗАВИСИМОСТИ ОТ ТИПА ПОКУПКИ ============
function getPriceFromProduct(product, memoryKey, isWholesale) {
    const suffix = isWholesale ? '_opt' : '_retail';
    const priceKey = memoryKey ? `${memoryKey}${suffix}` : `defaultPrice${suffix}`;
    const price = product[priceKey];
    return price && price > 0 ? price : null;
}

function getAvailableMemoryOptions(product) {
    const memorySizes = ['64', '128', '256', '512', '1024'];
    const options = [];
    const isWholesale = (purchaseType === 'wholesale');
    
    for (const size of memorySizes) {
        const price = getPriceFromProduct(product, `price${size}`, isWholesale);
        if (price && price > 0) {
            options.push({ size: parseInt(size), price });
        }
    }
    
    return options;
}

function getDefaultPrice(product) {
    const isWholesale = (purchaseType === 'wholesale');
    return getPriceFromProduct(product, null, isWholesale);
}

function hasDefaultPrice(product) {
    const price = getDefaultPrice(product);
    return price && price > 0;
}

// ============ ЛОГИКА КОРЗИНЫ С ПРОВЕРКОЙ ОПТА ============
function checkAndUpdateCartPrices() {
    let changed = false;
    const isWholesale = (purchaseType === 'wholesale');
    
    cart = cart.map(item => {
        const product = products.find(p => p.id === item.id);
        if (product) {
            let newPrice = null;
            if (item.selectedMemory) {
                const memorySize = item.selectedMemory.replace(' ГБ', '');
                newPrice = getPriceFromProduct(product, `price${memorySize}`, isWholesale);
            } else {
                newPrice = getDefaultPrice(product);
            }
            
            if (newPrice && item.price !== newPrice) {
                changed = true;
                return { ...item, price: newPrice };
            }
        }
        return item;
    });
    
    if (changed) {
        saveCart();
        if (currentPage === 'cart') renderCartPage();
        updateCartBadge();
    }
}

function updateQuantityInCart(index, delta) {
    const isWholesale = (purchaseType === 'wholesale');
    const item = cart[index];
    const newQty = item.quantity + delta;
    
    if (isWholesale) {
        // Опт: минимальное количество 3
        if (newQty < 3) {
            if (newQty <= 0) {
                cart.splice(index, 1);
            } else {
                cart[index].quantity = 3;
                alert('⚠️ При оптовой покупке минимальное количество товара — 3 шт!');
            }
        } else {
            cart[index].quantity = newQty;
        }
    } else {
        // Розница: можно удалять
        if (newQty <= 0) {
            cart.splice(index, 1);
        } else {
            cart[index].quantity = newQty;
            // Проверка: если пользователь выбрал розницу, но добавил >=3 шт одного товара
            if (newQty >= 3 && purchaseType === 'retail') {
                // Предлагаем переключиться на опт
                const switchToOpt = confirm('⚠️ Вы добавили 3 и более штук одного товара!\n\nЦена изменится на минимальную (оптовую)! Переключиться на оптовые цены?');
                if (switchToOpt) {
                    purchaseType = 'wholesale';
                    localStorage.setItem('elwin_purchase_type', 'wholesale');
                    updatePriceToggleButton();
                    alert('✅ Цены пересчитаны по оптовому прайсу!');
                    checkAndUpdateCartPrices();
                    renderCartPage();
                    renderShopPage();
                    updateCartBadge();
                    return;
                }
            }
        }
    }
    
    saveCart();
    renderCartPage();
    updateCartBadge();
}

// ============ КОРЗИНА ============
function saveCart() {
    localStorage.setItem('elwin_cart', JSON.stringify(cart));
    updateCartBadge();
}

function updateCartBadge() {
    const badge = document.getElementById('cartBadge');
    const total = cart.reduce((sum, item) => sum + item.quantity, 0);
    if (badge) {
        badge.textContent = total;
        badge.style.display = total > 0 ? 'flex' : 'none';
    }
}

function getCartTotal() {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

// ============ ОТПРАВКА В TELEGRAM ============
async function sendOrderToTelegram(orderText) {
    if (!shopConfig.botToken || shopConfig.botToken === "ВАШ_ТОКЕН_БОТА") {
        console.log('Бот не настроен');
        alert('⚠️ Заказ создан, но бот не настроен. Сообщите менеджеру.');
        return;
    }
    
    try {
        await fetch(`https://api.telegram.org/bot${shopConfig.botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                chat_id: shopConfig.managerTgId, 
                text: orderText, 
                parse_mode: 'HTML' 
            })
        });
    } catch(e) { console.error(e); }
}

// ============ ФОРМА ОФОРМЛЕНИЯ ЗАКАЗА ============
function openCheckoutForm() {
    if (cart.length === 0) {
        alert('Корзина пуста');
        return;
    }
    
    const userInfo = getUserInfo();
    
    const modal = document.getElementById('checkoutModal');
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Оформление заказа</h3>
                <button class="close-modal" onclick="closeCheckoutModal()">×</button>
            </div>
            <div class="modal-body">
                <form id="orderForm" class="checkout-form">
                    <div class="form-group">
                        <label>ФИО *</label>
                        <input type="text" id="fullName" placeholder="Иванов Иван Иванович" required>
                    </div>
                    <div class="form-group">
                        <label>Город *</label>
                        <input type="text" id="city" placeholder="Москва" required>
                    </div>
                    <div class="form-group">
                        <label>Адрес доставки *</label>
                        <textarea id="address" placeholder="Улица, дом, квартира/офис" required></textarea>
                    </div>
                    <div class="form-group">
                        <label>Номер телефона *</label>
                        <input type="tel" id="phone" placeholder="+7 (999) 123-45-67" value="${userInfo.userPhone !== 'Не указан' ? userInfo.userPhone : ''}" required>
                    </div>
                    <div class="form-group">
                        <label>Комментарий к заказу</label>
                        <textarea id="comment" placeholder="Дополнительная информация..."></textarea>
                    </div>
                    <button type="submit" class="submit-order-btn">✅ Подтвердить заказ</button>
                </form>
            </div>
        </div>
    `;
    modal.style.display = 'block';
    
    document.getElementById('orderForm').onsubmit = (e) => {
        e.preventDefault();
        submitOrder();
    };
}

function closeCheckoutModal() {
    document.getElementById('checkoutModal').style.display = 'none';
    document.getElementById('checkoutModal').innerHTML = '';
}

function submitOrder() {
    const fullName = document.getElementById('fullName')?.value.trim();
    const city = document.getElementById('city')?.value.trim();
    const address = document.getElementById('address')?.value.trim();
    const phone = document.getElementById('phone')?.value.trim();
    const comment = document.getElementById('comment')?.value.trim();
    
    if (!fullName) { alert('Введите ФИО'); return; }
    if (!city) { alert('Введите город'); return; }
    if (!address) { alert('Введите адрес доставки'); return; }
    if (!phone) { alert('Введите номер телефона'); return; }
    
    const userInfo = getUserInfo();
    const priceTypeText = purchaseType === 'wholesale' ? 'ОПТ' : 'РОЗНИЦА';
    
    let order = '🛍️ <b>НОВЫЙ ЗАКАЗ (Elwin Store)</b>\n\n';
    order += `━━━━━━━━━━━━━━━━\n`;
    order += `<b>📋 ДАННЫЕ ПОКУПАТЕЛЯ</b>\n`;
    order += `━━━━━━━━━━━━━━━━\n`;
    order += `👤 <b>ФИО:</b> ${fullName}\n`;
    order += `🏙️ <b>Город:</b> ${city}\n`;
    order += `📍 <b>Адрес доставки:</b> ${address}\n`;
    order += `📞 <b>Телефон:</b> ${phone}\n`;
    order += `📱 <b>Telegram:</b> ${userInfo.userUsername}\n`;
    order += `🆔 <b>Telegram ID:</b> <code>${userInfo.userId}</code>\n`;
    order += `🏷️ <b>Тип цены:</b> ${priceTypeText}\n`;
    if (comment) order += `💬 <b>Комментарий:</b> ${comment}\n`;
    order += `━━━━━━━━━━━━━━━━\n\n`;
    
    order += `<b>🛒 СОСТАВ ЗАКАЗА</b>\n`;
    order += `━━━━━━━━━━━━━━━━\n`;
    
    let total = 0;
    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        order += `📦 ${item.name}\n`;
        order += `   💰 ${item.price}₽ × ${item.quantity} = ${itemTotal}₽\n`;
        if (item.selectedMemory) order += `   💾 Память: ${item.selectedMemory}\n`;
        order += `\n`;
    });
    
    order += `━━━━━━━━━━━━━━━━\n`;
    order += `<b>💰 ИТОГО: ${total}₽</b>\n\n`;
    order += `📅 ${new Date().toLocaleString('ru-RU')}`;
    
    sendOrderToTelegram(order);
    alert('✅ Заказ оформлен! Менеджер свяжется с вами.');
    
    cart = [];
    saveCart();
    closeCheckoutModal();
    if (currentPage === 'cart') renderCartPage();
    updateCartBadge();
}

// ============ МОДАЛЬНОЕ ОКНО ТОВАРА ============
function openProductModal(product) {
    currentProduct = product;
    selectedMemory = null;
    selectedPrice = null;
    selectedQuantity = purchaseType === 'wholesale' ? 3 : 1;
    minQuantity = purchaseType === 'wholesale' ? 3 : 1;
    
    const memoryOptions = getAvailableMemoryOptions(product);
    const hasMemoryOptions = memoryOptions.length > 0;
    const hasDefault = hasDefaultPrice(product);
    
    let memoryHtml = '';
    if (hasMemoryOptions) {
        memoryHtml = `<div id="memoryContainer">
            <div class="step-title"><span class="step-number">1</span> Выберите память</div>
            <div class="variants-grid" id="memoryGrid">
                ${memoryOptions.map(opt => `<button class="variant-option" data-memory="${opt.size}" data-price="${opt.price}">${opt.size} ГБ — ${opt.price}₽</button>`).join('')}
            </div>
        </div>`;
    }
    
    const modal = document.getElementById('modalOverlay');
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <button class="back-modal-btn" id="backModalBtn">← Назад</button>
                <h3 id="modalTitle">${product.name}</h3>
                <button class="close-modal" onclick="closeModal()">×</button>
            </div>
            <div class="modal-body">
                <img src="${product.photo}" class="modal-image" onerror="this.src='https://placehold.co/300x200/eee/999?text=No+Image'">
                <p style="color:#666; margin-bottom:10px;">${product.description}</p>
                <div class="price-type-indicator" style="background:#e8f0fe; padding:8px 12px; border-radius:12px; margin-bottom:15px; text-align:center;">
                    ${purchaseType === 'wholesale' ? '📦 Оптовая цена (от 3 шт)' : '🛍️ Розничная цена (до 3 шт)'}
                </div>
                ${memoryHtml}
                <div id="quantityContainer" style="display:none;">
                    <div class="step-title"><span class="step-number">${hasMemoryOptions ? '2' : '1'}</span> Выберите количество</div>
                    <div class="quantity-selector">
                        <label>Количество: ${purchaseType === 'wholesale' ? '(мин. 3 шт)' : ''}</label>
                        <div class="quantity-controls">
                            <button class="quantity-btn-modal" id="decreaseQty">−</button>
                            <span class="quantity-value" id="quantityValue">${selectedQuantity}</span>
                            <button class="quantity-btn-modal" id="increaseQty">+</button>
                        </div>
                    </div>
                    <div class="total-amount" id="totalAmount">
                        Итого: <span id="totalSum">0</span> ₽
                    </div>
                </div>
                <button class="add-to-cart-btn disabled" id="addToCartBtn">⬅️ Сначала выберите параметры</button>
            </div>
        </div>
    `;
    modal.style.display = 'block';
    
    const backBtn = document.getElementById('backModalBtn');
    backBtn.onclick = () => closeModal();
    
    function updateTotalDisplay() {
        const totalSpan = document.getElementById('totalSum');
        if (totalSpan && selectedPrice) {
            totalSpan.textContent = selectedPrice * selectedQuantity;
        }
    }
    
    function setupQuantityButtons() {
        const decreaseBtn = document.getElementById('decreaseQty');
        const increaseBtn = document.getElementById('increaseQty');
        const quantitySpan = document.getElementById('quantityValue');
        
        if (decreaseBtn && increaseBtn && quantitySpan) {
            const newDecreaseBtn = decreaseBtn.cloneNode(true);
            const newIncreaseBtn = increaseBtn.cloneNode(true);
            decreaseBtn.parentNode.replaceChild(newDecreaseBtn, decreaseBtn);
            increaseBtn.parentNode.replaceChild(newIncreaseBtn, increaseBtn);
            
            newDecreaseBtn.onclick = () => {
                if (selectedQuantity > minQuantity) {
                    selectedQuantity--;
                    quantitySpan.textContent = selectedQuantity;
                    updateTotalDisplay();
                } else if (purchaseType === 'wholesale' && selectedQuantity === minQuantity) {
                    alert('⚠️ Минимальное количество для опта — 3 штуки!');
                }
            };
            newIncreaseBtn.onclick = () => {
                selectedQuantity++;
                quantitySpan.textContent = selectedQuantity;
                updateTotalDisplay();
                
                if (purchaseType === 'retail' && selectedQuantity >= 3) {
                    const switchToOpt = confirm('⚠️ При заказе от 3 штук цена будет пересчитана по оптовому прайсу!\nПереключиться на оптовые цены?');
                    if (switchToOpt) {
                        purchaseType = 'wholesale';
                        localStorage.setItem('elwin_purchase_type', 'wholesale');
                        updatePriceToggleButton();
                        const newPrice = getPriceFromProduct(currentProduct, selectedMemory ? `price${selectedMemory}` : null, true);
                        if (newPrice) selectedPrice = newPrice;
                        quantitySpan.textContent = Math.max(selectedQuantity, 3);
                        selectedQuantity = Math.max(selectedQuantity, 3);
                        minQuantity = 3;
                        updateTotalDisplay();
                        alert('✅ Цены пересчитаны по оптовому прайсу!');
                        renderShopPage();
                        renderCartPage();
                    }
                }
            };
        }
        updateTotalDisplay();
    }
    
    function checkAndShowNextStep() {
        if (hasMemoryOptions && !selectedMemory) return;
        
        document.getElementById('quantityContainer').style.display = 'block';
        document.getElementById('addToCartBtn').textContent = '🛒 Добавить в корзину';
        document.getElementById('addToCartBtn').classList.remove('disabled');
        setupQuantityButtons();
    }
    
    if (hasMemoryOptions) {
        document.querySelectorAll('[data-memory]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('[data-memory]').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                selectedMemory = btn.dataset.memory;
                selectedPrice = parseInt(btn.dataset.price);
                checkAndShowNextStep();
            });
        });
    } else if (hasDefault) {
        selectedPrice = getDefaultPrice(product);
        checkAndShowNextStep();
    }
    
    const addBtn = document.getElementById('addToCartBtn');
    addBtn.onclick = () => {
        if (!selectedPrice) {
            alert('Выберите параметры товара');
            return;
        }
        
        // Проверка для розницы: если пользователь выбрал больше 2 штук
        if (purchaseType === 'retail' && selectedQuantity >= 3) {
            const switchToOpt = confirm('⚠️ Вы выбрали 3 и более штук!\n\nЦена изменится на минимальную (оптовую)! Переключиться на оптовые цены?');
            if (switchToOpt) {
                purchaseType = 'wholesale';
                localStorage.setItem('elwin_purchase_type', 'wholesale');
                updatePriceToggleButton();
                const newPrice = getPriceFromProduct(currentProduct, selectedMemory ? `price${selectedMemory}` : null, true);
                if (newPrice) selectedPrice = newPrice;
                alert('✅ Цены пересчитаны по оптовому прайсу!');
            } else {
                // Если не переключился, но количество >=3, то нельзя добавить
                alert('❌ Для розницы максимальное количество — 2 штуки. Для заказа от 3 штук выберите оптовую цену.');
                return;
            }
        }
        
        cart.push({
            id: currentProduct.id,
            name: currentProduct.name,
            price: selectedPrice,
            selectedMemory: selectedMemory ? selectedMemory + ' ГБ' : null,
            quantity: selectedQuantity
        });
        
        saveCart();
        closeModal();
        alert('✅ Товар добавлен в корзину');
        if (currentPage === 'cart') renderCartPage();
        updateCartBadge();
    };
}

function closeModal() {
    document.getElementById('modalOverlay').style.display = 'none';
    document.getElementById('modalOverlay').innerHTML = '';
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function renderProductCard(product) {
    let displayPrice;
    const memoryOptions = getAvailableMemoryOptions(product);
    
    if (memoryOptions.length > 0) {
        displayPrice = memoryOptions[0].price;
    } else if (hasDefaultPrice(product)) {
        displayPrice = getDefaultPrice(product);
    } else {
        displayPrice = 0;
    }
    
    const productJson = JSON.stringify(product).replace(/'/g, "&#39;").replace(/"/g, '&quot;');
    
    const rightContent = product.sale 
        ? '<span class="sale-badge">🔥 SALE</span>' 
        : '<span class="sale-placeholder"></span>';
    
    return `
        <div class="product-card" onclick='openProductModal(${productJson})'>
            <img src="${product.photo}" class="product-image" onerror="this.src='https://placehold.co/300x200/eee/999?text=No+Image'">
            <div class="product-info">
                <div class="product-name">${escapeHtml(product.name)}</div>
                <div class="product-price-wrapper">
                    <span class="product-price">${displayPrice}₽</span>
                    ${rightContent}
                </div>
                <button class="open-btn">Открыть</button>
            </div>
        </div>
    `;
}

function renderShopPage() {
    if (!products.length) {
        document.getElementById('mainContent').innerHTML = '<div style="text-align:center; padding:50px">Загрузка товаров...</div>';
        return;
    }
    
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    let filtered = currentCategory === 'all' ? products : products.filter(p => p.category === currentCategory);
    if (searchTerm) filtered = filtered.filter(p => p.name.toLowerCase().includes(searchTerm) || p.description.toLowerCase().includes(searchTerm));
    
    const popular = filtered.filter(p => p.popular);
    const other = filtered.filter(p => !p.popular);
    
    let html = `<div class="categories-grid"><div class="category-chip ${currentCategory === 'all' ? 'active' : ''}" data-cat="all">Все</div>`;
    categories.forEach(cat => { 
        html += `<div class="category-chip ${currentCategory === cat ? 'active' : ''}" data-cat="${cat}">${escapeHtml(cat)}</div>`; 
    });
    html += `</div>`;
    
    if (popular.length) html += `<h2 class="section-title">⭐ Популярное</h2><div class="products-grid">${popular.map(p => renderProductCard(p)).join('')}</div>`;
    if (other.length) html += `<h2 class="section-title">📦 Все товары</h2><div class="products-grid">${other.map(p => renderProductCard(p)).join('')}</div>`;
    if (!filtered.length) html = `<div style="text-align:center;padding:50px">🔍 Ничего не найдено</div>`;
    
    document.getElementById('mainContent').innerHTML = html;
    
    document.querySelectorAll('.category-chip').forEach(el => {
        el.addEventListener('click', () => { 
            currentCategory = el.dataset.cat; 
            renderShopPage(); 
        });
    });
}

function renderSalesPage() {
    if (!products.length) {
        document.getElementById('mainContent').innerHTML = '<div style="text-align:center; padding:50px">Загрузка...</div>';
        return;
    }
    const saleProducts = products.filter(p => p.sale === true);
    let html = `<h2 class="section-title">🔥 Акции</h2>`;
    html += `<div class="products-grid">${saleProducts.length ? saleProducts.map(p => renderProductCard(p)).join('') : '<div style="text-align:center;padding:50px">Нет товаров по акции</div>'}</div>`;
    document.getElementById('mainContent').innerHTML = html;
}

function renderCartPage() {
    if (!cart.length) { 
        document.getElementById('mainContent').innerHTML = `
            <div style="min-height: 60vh; display: flex; align-items: center; justify-content: center;">
                <div class="empty-cart">🛒 Корзина пуста</div>
            </div>
        `; 
        return; 
    }
    
    let total = getCartTotal();
    const priceTypeText = purchaseType === 'wholesale' ? 'Оптовые цены (от 3 шт)' : 'Розничные цены (до 3 шт)';
    
    let html = `<h2 class="section-title">🛒 Корзина</h2>`;
    html += `<div class="price-type-notification">
        <span>${purchaseType === 'wholesale' ? '📦' : '🛍️'}</span>
        <span>${priceTypeText}</span>
    </div>`;
    html += `<div class="range-notification">💰 Сумма корзины: ${total} ₽</div>`;
    html += `<div class="cart-items-list">`;
    
    cart.forEach((item, idx) => {
        const itemTotal = item.price * item.quantity;
        html += `
            <div class="cart-item">
                <div class="cart-item-info">
                    <div class="cart-item-title">${escapeHtml(item.name)}</div>
                    <div class="cart-item-price">${item.price}₽ × ${item.quantity} = ${itemTotal}₽</div>
                    <div class="cart-item-details">
                        ${item.selectedMemory ? `💾 ${item.selectedMemory}` : ''}
                    </div>
                </div>
                <div class="cart-item-controls">
                    <button class="quantity-btn" data-idx="${idx}" data-delta="-1">−</button>
                    <span>${item.quantity}</span>
                    <button class="quantity-btn" data-idx="${idx}" data-delta="1">+</button>
                    <button class="remove-item" data-idx="${idx}">🗑️</button>
                </div>
            </div>
        `;
    });
    html += `</div><div class="cart-total"><h3>Итого: ${total}₽</h3><button class="checkout-btn" id="checkoutBtn">✅ Оформить заказ</button></div>`;
    document.getElementById('mainContent').innerHTML = html;
    
    document.querySelectorAll('.quantity-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = parseInt(btn.dataset.idx);
            const delta = parseInt(btn.dataset.delta);
            updateQuantityInCart(idx, delta);
        });
    });
    
    document.querySelectorAll('.remove-item').forEach(btn => {
        btn.addEventListener('click', () => { 
            cart.splice(parseInt(btn.dataset.idx), 1); 
            saveCart(); 
            renderCartPage(); 
            updateCartBadge(); 
        });
    });
    
    document.getElementById('checkoutBtn')?.addEventListener('click', openCheckoutForm);
}

function renderContactsPage() {
    const phone = shopConfig.contactPhone || "+7 (999) 123-45-67";
    document.getElementById('mainContent').innerHTML = `
        <div class="contacts-page">
            <h2 class="section-title">📞 Контакты</h2>
            <div class="contact-phone">${phone}</div>
            <p>Свяжитесь с нами любым удобным способом</p>
            <p style="margin-top:20px; color:#888">Работаем ежедневно 10:00-21:00</p>
        </div>
    `;
}

// Добавляем CSS анимацию для тоста
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInOut {
        0% { opacity: 0; transform: translateX(-50%) translateY(10px); }
        15% { opacity: 1; transform: translateX(-50%) translateY(0); }
        85% { opacity: 1; transform: translateX(-50%) translateY(0); }
        100% { opacity: 0; transform: translateX(-50%) translateY(-10px); visibility: hidden; }
    }
`;
document.head.appendChild(style);

// ============ ЗАПУСК ============
loadData();
