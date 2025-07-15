// HTMLドキュメントの読み込みが完了したら、中の処理を実行する
document.addEventListener('DOMContentLoaded', () => {

    // スクロールアニメーション用のObserverを、複数の関数から使えるように定義
    let scrollObserver;

    /**
     * ==================================
     * ★ 機能1: お気に入り管理システム
     * ==================================
     */
    const favoritesApp = {
        addBtn: document.getElementById('add-favorite-btn'),
        closeBtn: document.getElementById('close-modal-btn'),
        modal: document.getElementById('favorite-modal'),
        form: document.getElementById('favorite-form'),
        list: document.getElementById('favorites-list'),
        nameInput: document.getElementById('favorite-name'),
        urlInput: document.getElementById('favorite-url'),
        favorites: [],

        init() {
            this.addEventListeners();
            this.loadFavorites();
            this.setupSortable();
        },

        addEventListeners() {
            this.addBtn.addEventListener('click', () => this.toggleModal(true));
            this.closeBtn.addEventListener('click', () => this.toggleModal(false));
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) this.toggleModal(false);
            });
            this.form.addEventListener('submit', (e) => this.addFavorite(e));
        },

        toggleModal(show) {
            this.modal.style.display = show ? 'flex' : 'none';
            if (show) this.nameInput.focus();
        },

        loadFavorites() {
            this.favorites = JSON.parse(localStorage.getItem('portalFavoritesV2')) || [];
            this.renderFavorites();
        },

        saveFavorites() {
            localStorage.setItem('portalFavoritesV2', JSON.stringify(this.favorites));
        },

        renderFavorites() {
            this.list.innerHTML = '';
            this.favorites.forEach(fav => {
                const favElement = this.createFavoriteElement(fav);
                this.list.appendChild(favElement);
                if (scrollObserver) {
                    scrollObserver.observe(favElement);
                }
            });
        },
        
        addFavorite(event) {
            event.preventDefault();
            const name = this.nameInput.value.trim();
            const url = this.urlInput.value.trim();

            if (name && url) {
                const newFavorite = { id: Date.now(), name: name, url: url };
                this.favorites.push(newFavorite);
                this.saveFavorites();
                this.renderFavorites();
                this.form.reset();
                this.toggleModal(false);
            }
        },

        deleteFavorite(id) {
            if (confirm('このお気に入りを削除しますか？')) {
                this.favorites = this.favorites.filter(fav => fav.id !== id);
                this.saveFavorites();
                this.renderFavorites();
            }
        },

        createFavoriteElement(fav) {
            const a = document.createElement('a');
            a.href = fav.url;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            a.className = 'card favorite-card fade-in-up';
            a.dataset.id = fav.id;

            a.innerHTML = `
                <i class="fa-solid fa-link card-icon-small"></i>
                <h4>${this.escapeHTML(fav.name)}</h4>
                <p>${this.escapeHTML(fav.url)}</p>
                <button class="button-delete" title="削除">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            `;
            
            const deleteBtn = a.querySelector('.button-delete');
            deleteBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.deleteFavorite(fav.id);
            });

            return a;
        },

        setupSortable() {
            Sortable.create(this.list, {
                group: { name: 'shared-links', pull: 'clone', put: false },
                animation: 150,
                ghostClass: 'sortable-ghost',
                onEnd: (evt) => {
                    const newOrder = Array.from(this.list.children).map(item => Number(item.dataset.id));
                    this.favorites.sort((a, b) => newOrder.indexOf(a.id) - newOrder.indexOf(b.id));
                    this.saveFavorites();
                }
            });
        },

        escapeHTML(str) {
            const p = document.createElement('p');
            p.textContent = str;
            return p.innerHTML;
        }
    };

    /**
     * ==================================
     * ★ 機能2: タイトル編集機能
     * ==================================
     */
    const titleEditor = {
        init() {
            this.loadTitles();
            this.addEventListeners();
        },

        loadTitles() {
            document.querySelectorAll('h2[data-title-id]').forEach(h2 => {
                const titleId = h2.dataset.titleId;
                const savedTitle = localStorage.getItem(`title_${titleId}`);
                if (savedTitle) {
                    h2.querySelector('.section-title').innerText = savedTitle;
                }
            });
        },

        addEventListeners() {
            document.querySelectorAll('.edit-title-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.handleEditClick(button);
                });
            });
        },

        handleEditClick(button) {
            const h2 = button.closest('h2');
            const titleSpan = h2.querySelector('.section-title');
            
            if (titleSpan.isContentEditable) {
                this.saveTitle(titleSpan, button);
            } else {
                this.startEditing(titleSpan, button);
            }
        },

        startEditing(span, button) {
            span.dataset.originalTitle = span.innerText;
            span.contentEditable = true;
            span.focus();
            span.classList.add('editing');
            button.innerHTML = '<i class="fa-solid fa-check"></i>';

            span.addEventListener('blur', this.onBlurHandler = (e) => {
                this.saveTitle(span, button);
            }, { once: true });

            span.addEventListener('keydown', this.onKeydownHandler = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.saveTitle(span, button);
                } else if (e.key === 'Escape') {
                    this.cancelEditing(span, button);
                }
            });
        },

        saveTitle(span, button) {
            if (!span.isContentEditable) return;

            span.removeEventListener('blur', this.onBlurHandler);
            span.removeEventListener('keydown', this.onKeydownHandler);
            
            span.contentEditable = false;
            span.classList.remove('editing');
            button.innerHTML = '<i class="fa-solid fa-pencil"></i>';
            
            const newTitle = span.innerText.trim();
            const titleId = span.closest('h2').dataset.titleId;
            
            if (newTitle && newTitle !== span.dataset.originalTitle) {
                localStorage.setItem(`title_${titleId}`, newTitle);
            } else {
                span.innerText = span.dataset.originalTitle;
            }
        },

        cancelEditing(span, button) {
             if (!span.isContentEditable) return;

            span.removeEventListener('blur', this.onBlurHandler);
            span.removeEventListener('keydown', this.onKeydownHandler);

            span.innerText = span.dataset.originalTitle;
            span.contentEditable = false;
            span.classList.remove('editing');
            button.innerHTML = '<i class="fa-solid fa-pencil"></i>';
        }
    };

    /**
     * ==================================
     * ★ 機能3: 静的リンクの並び替え機能
     * ==================================
     */
    const sortableLinks = {
        targets: [
            { containerId: 'accounting-links-grid', storageKey: 'accountingLinksOrder' },
            { containerId: 'ai-tools-grid', storageKey: 'aiToolsOrder' },
            { containerId: 'company-links-grid', storageKey: 'companyLinksOrder' }
        ],

        init() {
            this.targets.forEach(target => {
                const container = document.getElementById(target.containerId);
                if (container) {
                    this.applySavedOrder(container, target.storageKey);
                    this.setupSortable(container, target.storageKey);
                }
            });
        },

        applySavedOrder(container, storageKey) {
            const savedOrder = JSON.parse(localStorage.getItem(storageKey));
            if (!savedOrder) return;
            const items = new Map();
            container.childNodes.forEach(node => {
                if (node.nodeType === 1 && node.tagName === 'A') {
                    items.set(node.getAttribute('href'), node);
                }
            });
            savedOrder.forEach(key => {
                const item = items.get(key);
                if (item) container.appendChild(item);
            });
        },

        setupSortable(container, storageKey) {
            Sortable.create(container, {
                group: { name: 'shared-links', pull: 'clone', put: false },
                animation: 150,
                ghostClass: 'sortable-ghost',
                onEnd: () => {
                    const newOrder = Array.from(container.children).map(item => item.getAttribute('href'));
                    localStorage.setItem(storageKey, JSON.stringify(newOrder));
                }
            });
        }
    };
    
    /**
     * ==================================
     * ★★★ 新機能: セクションの並び替え機能 ★★★
     * ==================================
     */
    const sectionSorter = {
        container: document.getElementById('main-container'),
        storageKey: 'portalSectionOrder',

        init() {
            this.applySavedOrder();
            this.setupSortable();
        },

        applySavedOrder() {
            const savedOrder = JSON.parse(localStorage.getItem(this.storageKey));
            if (!savedOrder) return;
            
            const sections = new Map();
            this.container.querySelectorAll('.sortable-section').forEach(section => {
                sections.set(section.id, section);
            });

            savedOrder.forEach(id => {
                const section = sections.get(id);
                if(section) {
                    this.container.appendChild(section);
                }
            });
        },

        setupSortable() {
            Sortable.create(this.container, {
                animation: 150,
                ghostClass: 'sortable-ghost',
                handle: '.drag-handle', // ドラッグハンドルを指定
                filter: '#widgets', // ウィジェットセクションは移動不可にする
                onEnd: () => {
                    const newOrder = Array.from(this.container.children)
                        .map(item => item.id)
                        .filter(id => id && id !== 'widgets'); // IDがあり、ウィジェットでないもの
                    localStorage.setItem(this.storageKey, JSON.stringify(newOrder));
                }
            });
        }
    };

    /**
     * ==================================
     * ★ 機能4: Quick Access 機能
     * ==================================
     */
    const quickAccessApp = {
        list: document.getElementById('quick-access-list'),
        placeholder: document.querySelector('.drop-placeholder'),
        items: [],

        init() {
            this.loadItems();
            this.setupSortable();
        },

        loadItems() {
            this.items = JSON.parse(localStorage.getItem('quickAccessItems')) || [];
            this.renderItems();
        },

        saveItems() {
            localStorage.setItem('quickAccessItems', JSON.stringify(this.items));
        },

        renderItems() {
            this.list.innerHTML = '';
            
            if (this.items.length === 0) {
                this.list.appendChild(this.placeholder);
                this.placeholder.style.display = 'block';
            } else {
                this.placeholder.style.display = 'none';
                this.items.forEach(item => {
                    const itemElement = this.createItemElement(item);
                    this.list.appendChild(itemElement);
                    
                    requestAnimationFrame(() => {
                        itemElement.classList.add('visible');
                    });
                });
            }
        },

        createItemElement(item) {
            const a = document.createElement('a');
            a.href = item.url;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            a.className = 'card fade-in-up';
            a.dataset.id = item.id;

            a.innerHTML = item.htmlContent + `
                <button class="button-delete" title="削除">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            `;

            const deleteBtn = a.querySelector('.button-delete');
            deleteBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.deleteItem(item.id);
            });
            return a;
        },
        
        addItem(originalElement) {
             const url = originalElement.href;
             if (this.items.some(item => item.url === url)) {
                 originalElement.remove();
                 return;
             }
             const cleanClone = originalElement.cloneNode(true);
             const existingButton = cleanClone.querySelector('.button-delete');
             if (existingButton) existingButton.remove();
             const newItem = {
                 id: Date.now(),
                 url: url,
                 htmlContent: cleanClone.innerHTML
             };
             this.items.push(newItem);
             this.saveItems();
             this.renderItems();
        },

        deleteItem(id) {
            this.items = this.items.filter(item => item.id !== id);
            this.saveItems();
            this.renderItems();
        },

        setupSortable() {
            Sortable.create(this.list, {
                group: 'shared-links',
                animation: 150,
                ghostClass: 'sortable-ghost',
                onAdd: (evt) => {
                    this.addItem(evt.item);
                },
                onEnd: (evt) => {
                    if (evt.from === evt.to) {
                        const newOrder = Array.from(this.list.children)
                                             .map(item => Number(item.dataset.id))
                                             .filter(id => !isNaN(id));
                        if (newOrder.length > 0) {
                            this.items.sort((a, b) => newOrder.indexOf(a.id) - newOrder.indexOf(b.id));
                            this.saveItems();
                        }
                    }
                }
            });
        }
    };

    /**
     * ==================================
     * 機能5: 天気予報ウィジェット
     * ==================================
     */
    const fetchWeather = async () => {
        const weatherWidget = document.getElementById('weather-info');
        if (!weatherWidget) return;
        const apiUrl = 'https://wttr.in/Osaka?format=j1';
        try {
            const response = await fetch(apiUrl);
            if (!response.ok) throw new Error('天気情報の取得に失敗');
            const data = await response.json();
            const currentCondition = data.current_condition[0];
            const todayWeather = data.weather[0];
            const description = currentCondition.weatherDesc[0].value;
            const tempC = currentCondition.temp_C;
            const maxTemp = todayWeather.maxtempC;
            const minTemp = todayWeather.mintempC;
            let weatherIcon = 'fa-solid fa-cloud-sun';
            if (description.includes('Sunny') || description.includes('Clear')) weatherIcon = 'fa-solid fa-sun';
            else if (description.includes('Rain') || description.includes('Shower')) weatherIcon = 'fa-solid fa-cloud-showers-heavy';
            else if (description.includes('Cloudy') || description.includes('Overcast')) weatherIcon = 'fa-solid fa-cloud';
            else if (description.includes('Snow')) weatherIcon = 'fa-solid fa-snowflake';
            
            weatherWidget.innerHTML = `<div class="weather-main"><i class="${weatherIcon}"></i><span class="weather-temp">${tempC}°C</span><span class="weather-desc">${description}</span></div><div class="weather-sub"><span>最高: ${maxTemp}°C</span> / <span>最低: ${minTemp}°C</span></div>`;
        } catch (error) {
            weatherWidget.innerHTML = '<p>天気情報を取得できませんでした。</p>';
        }
    };

    /**
     * ==================================
     * 機能6: スクロールアニメーション
     * ==================================
     */
    const setupScrollAnimations = () => {
        const animatedElements = document.querySelectorAll('.card');
        if (animatedElements.length === 0) return;
        
        scrollObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    if (!entry.target.closest('#quick-access-sidebar') && !entry.target.classList.contains('favorite-card')) {
                       scrollObserver.unobserve(entry.target);
                    }
                }
            });
        }, { threshold: 0.1 });

        animatedElements.forEach((el) => {
            if (!el.classList.contains('fade-in-up')) {
                el.classList.add('fade-in-up');
            }
            scrollObserver.observe(el);
        });
    };

    /**
     * ==================================
     * 機能7: パーティクルエフェクト
     * ==================================
     */
    const setupParticles = () => {
        if (typeof particlesJS !== 'undefined') {
            particlesJS('particles-js', {
                "particles": { "number": { "value": 60, "density": { "enable": true, "value_area": 800 } }, "color": { "value": "#ffffff" }, "shape": { "type": "circle" }, "opacity": { "value": 0.5, "random": true }, "size": { "value": 3, "random": true }, "line_linked": { "enable": true, "distance": 150, "color": "#ffffff", "opacity": 0.4, "width": 1 }, "move": { "enable": true, "speed": 2, "direction": "none", "random": false, "straight": false, "out_mode": "out" } },
                "interactivity": { "detect_on": "canvas", "events": { "onhover": { "enable": true, "mode": "repulse" }, "onclick": { "enable": true, "mode": "push" } } },
                "retina_detect": true
            });
        } else {
            console.error('particles.js is not loaded.');
        }
    };
    
    // ==================================
    // 各機能の初期化・実行
    // ==================================
    fetchWeather();
    favoritesApp.init();
    titleEditor.init();
    sortableLinks.init();
    sectionSorter.init(); // ★ セクション並び替え機能の初期化を追加
    quickAccessApp.init();
    setupScrollAnimations();
    setupParticles();

});
