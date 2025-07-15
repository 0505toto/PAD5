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
            // ★変更: 並び替え機能は新しい cardSorter に一任するため、ここでの setupSortable() 呼び出しは削除
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
            // 現在のスクロール位置を保持
            const scrollY = window.scrollY;

            this.list.innerHTML = '';
            this.favorites.forEach(fav => {
                const favElement = this.createFavoriteElement(fav);
                this.list.appendChild(favElement);
                if (scrollObserver) {
                    scrollObserver.observe(favElement);
                }
            });
            
            // スクロール位置を復元
            window.scrollTo(0, scrollY);
        },
        
        addFavorite(event) {
            event.preventDefault();
            const name = this.nameInput.value.trim();
            const url = this.urlInput.value.trim();

            if (name && url) {
                const newFavorite = { id: Date.now(), name: name, url: url };
                this.favorites.push(newFavorite);
                this.saveFavorites();
                
                // 新しい要素をリストの末尾に追加
                const newElement = this.createFavoriteElement(newFavorite);
                this.list.appendChild(newElement);
                if (scrollObserver) {
                    scrollObserver.observe(newElement);
                }
                
                // ★変更: 新しいカードが追加されたので、全体の配置を保存する
                cardSorter.saveOrder();

                this.form.reset();
                this.toggleModal(false);
            }
        },

        deleteFavorite(id) {
            if (confirm('このお気に入りを削除しますか？')) {
                this.favorites = this.favorites.filter(fav => fav.id !== id);
                this.saveFavorites();
                this.renderFavorites();

                // ★変更: カードが削除されたので、全体の配置を保存する
                cardSorter.saveOrder();
            }
        },

        createFavoriteElement(fav) {
            const a = document.createElement('a');
            a.href = fav.url;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            a.className = 'card favorite-card'; // アニメーションクラスはObserverが付ける
            a.dataset.id = fav.id;

            // ★変更: お気に入りのURL(<p>タグ)を表示しないように修正
            a.innerHTML = `
                <i class="fa-solid fa-link card-icon-small"></i>
                <h4>${this.escapeHTML(fav.name)}</h4>
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
        // (このセクションは元のコードから変更ありません)
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

            // フォーカスが外れた時とキー入力のイベントリスナーを設定
            const saveHandler = () => this.saveTitle(span, button);
            const keydownHandler = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.saveTitle(span, button);
                } else if (e.key === 'Escape') {
                    this.cancelEditing(span, button);
                }
            };

            span.addEventListener('blur', saveHandler, { once: true });
            span.addEventListener('keydown', keydownHandler);

            // リスナーを後で削除できるように保存
            span.dataset.saveHandler = saveHandler;
            span.dataset.keydownHandler = keydownHandler;
        },

        saveTitle(span, button) {
            if (!span.isContentEditable) return;

            span.removeEventListener('blur', span.dataset.saveHandler);
            span.removeEventListener('keydown', span.dataset.keydownHandler);
            
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

            span.removeEventListener('blur', span.dataset.saveHandler);
            span.removeEventListener('keydown', span.dataset.keydownHandler);

            span.innerText = span.dataset.originalTitle;
            span.contentEditable = false;
            span.classList.remove('editing');
            button.innerHTML = '<i class="fa-solid fa-pencil"></i>';
        }
    };
    
    /**
     * ==================================
     * ★★★ 新機能: カード全体の並び替え機能 ★★★
     * ==================================
     */
    const cardSorter = {
        storageKey: 'portalCardOrderV3', // バージョンアップ

        init() {
            this.applyOrder();
            this.setupSortable();
        },
        
        getCardId(card) {
            if (card.classList.contains('favorite-card')) return `fav-${card.dataset.id}`;
            if (card.id) return card.id;
            const href = card.getAttribute('href');
            if (href) return href;
            return null;
        },

        saveOrder() {
            const orderData = {};
            document.querySelectorAll('.card-container').forEach(container => {
                // コンテナのIDを特定
                const containerId = container.id || (container.closest('section') ? container.closest('section').id : null);
                if (containerId) {
                    const cardIds = Array.from(container.querySelectorAll('.card')).map(card => this.getCardId(card)).filter(Boolean);
                    orderData[containerId] = cardIds;
                }
            });
            localStorage.setItem(this.storageKey, JSON.stringify(orderData));
        },

        applyOrder() {
            const savedOrder = JSON.parse(localStorage.getItem(this.storageKey));
            if (!savedOrder) return;

            const allCards = new Map();
            document.querySelectorAll('.card-container .card').forEach(card => {
                const id = this.getCardId(card);
                if (id) allCards.set(id, card);
            });

            // 一度すべてのコンテナからカードを退避
            allCards.forEach(card => card.remove());
            
            // 保存された順序に従ってカードを再配置
            Object.keys(savedOrder).forEach(containerId => {
                const container = document.getElementById(containerId) || document.querySelector(`#${containerId} .card-container`);
                if(container){
                     savedOrder[containerId].forEach(cardId => {
                        const cardElement = allCards.get(cardId);
                        if (cardElement) {
                            container.appendChild(cardElement);
                            allCards.delete(cardId);
                        }
                    });
                }
            });
            
            // 順序データになかった新しいカードなどを最初のコンテナに戻す（念のため）
            if(allCards.size > 0){
                const firstContainer = document.querySelector('.card-container');
                allCards.forEach(card => firstContainer.appendChild(card));
            }
        },

        setupSortable() {
            const containers = document.querySelectorAll('.card-container');
            containers.forEach(container => {
                Sortable.create(container, {
                    group: 'shared-links', // Quick Access と連携するための共通グループ名
                    animation: 200,
                    ghostClass: 'sortable-ghost',
                    chosenClass: 'sortable-chosen',
                    forceFallback: true, // スクロール挙動を改善
                    onEnd: () => {
                        this.saveOrder();
                    }
                });
            });
        }
    };

    /**
     * ==================================
     * ★ 機能3: セクションの並び替え機能
     * ==================================
     */
    const sectionSorter = {
        container: document.getElementById('main-container'),
        storageKey: 'portalSectionOrderV2', // バージョンアップ

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
                animation: 200,
                ghostClass: 'sortable-ghost',
                handle: '.drag-handle',
                // ★変更: 'filter'オプションを削除し、#widgets セクションも移動可能にする
                onEnd: () => {
                    // ★変更: #widgets も含めてすべてのIDを保存する
                    const newOrder = Array.from(this.container.children)
                        .map(item => item.id)
                        .filter(id => id); // IDがあるものだけを対象
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
        // (このセクションは元のコードから変更ありません)
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
                // プレースホルダーを再挿入
                if (this.placeholder) this.list.appendChild(this.placeholder);
                this.placeholder.style.display = 'block';
            } else {
                if (this.placeholder) this.placeholder.style.display = 'none';
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
            a.className = 'card';
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
                 // 既に存在する場合は追加しない（元の要素はonAddで削除されるので、ここで終了）
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
             this.renderItems(); // 全体を再描画して順序と表示を正しく保つ
        },

        deleteItem(id) {
            this.items = this.items.filter(item => item.id !== id);
            this.saveItems();
            this.renderItems();
        },

        setupSortable() {
            Sortable.create(this.list, {
                group: 'shared-links', // カードコンテナと共通のグループ名
                animation: 150,
                ghostClass: 'sortable-ghost',
                onAdd: (evt) => {
                    // 他のリストからアイテムが追加されたら、クローンとして扱う
                    this.addItem(evt.item);
                    // 元のリストからドロップされたアイテムは自動的に削除されるので、
                    // QuickAccessにはコピーが作成される挙動になる
                    evt.item.remove();
                },
                onEnd: (evt) => {
                    // Quick Access内で並び替えた場合
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
        // APIは https://github.com/chubin/wttr.in を利用
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
            
            const weatherIconMap = {
                "Sunny": "fa-sun",
                "Clear": "fa-moon", // 夜は月アイコンに
                "Partly cloudy": "fa-cloud-sun",
                "Cloudy": "fa-cloud",
                "Overcast": "fa-smog",
                "Mist": "fa-smog",
                "Patchy rain possible": "fa-cloud-rain",
                "Patchy snow possible": "fa-cloud-meatball",
                "Patchy sleet possible": "fa-cloud-meatball",
                "Thundery outbreaks possible": "fa-cloud-bolt",
                "Rain": "fa-cloud-showers-heavy",
                "Showers": "fa-cloud-showers-heavy",
                "Snow": "fa-snowflake",
            };
            let weatherIcon = "fa-solid fa-cloud-sun"; // デフォルト
            for (const key in weatherIconMap) {
                if (description.includes(key)) {
                    weatherIcon = "fa-solid " + weatherIconMap[key];
                    break;
                }
            }
            
            weatherWidget.innerHTML = `<div class="weather-main"><i class="${weatherIcon}"></i><span class="weather-temp">${tempC}°C</span><span class="weather-desc">${description}</span></div><div class="weather-sub"><span>最高: ${maxTemp}°C</span> / <span>最低: ${minTemp}°C</span></div>`;
        } catch (error) {
            console.error(error);
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
                    // Quick Access内のアイテムは再表示される可能性があるため、unobserveしない
                    if (!entry.target.closest('#quick-access-sidebar')) {
                       scrollObserver.unobserve(entry.target);
                    }
                }
            });
        }, { threshold: 0.1 });

        animatedElements.forEach((el) => {
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
    titleEditor.init();
    sectionSorter.init();
    quickAccessApp.init();

    // ★重要: favoritesApp.init() の後 (DOM生成後) に cardSorter.init() を実行
    favoritesApp.init();
    cardSorter.init();
    
    setupScrollAnimations();
    setupParticles();
});
