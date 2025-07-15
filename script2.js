document.addEventListener('DOMContentLoaded', () => {

    // スクロールアニメーション用のObserver
    let scrollObserver;

    // ポータルの全データを管理するオブジェクト
    const portalManager = {
        // データキー
        keys: {
            sections: 'portalSections_v2', // セクションの並び順とタイトル
            links: 'portalLinks_v2',      // 全てのリンクアイテム
        },
        
        // データ本体
        sections: [],
        links: {},

        // 初期化処理
        init() {
            this.loadData();
            this.renderSections();
            this.setupSectionSortable();
            this.setupLinkSortable();
            this.addEventListeners();
        },

        // ローカルストレージからデータを読み込む
        loadData() {
            const savedSections = localStorage.getItem(this.keys.sections);
            const savedLinks = localStorage.getItem(this.keys.links);

            if (savedSections) {
                this.sections = JSON.parse(savedSections);
            } else {
                this.sections = this.getDefaultSections();
            }

            if (savedLinks) {
                this.links = JSON.parse(savedLinks);
            } else {
                this.links = this.getDefaultLinks();
            }
        },
        
        // データをローカルストレージに保存する
        saveData() {
            localStorage.setItem(this.keys.sections, JSON.stringify(this.sections));
            localStorage.setItem(this.keys.links, JSON.stringify(this.links));
        },
        
        // セクションとリンクを画面に描画する
        renderSections() {
            const mainContainer = document.getElementById('main-container');
            mainContainer.innerHTML = ''; // コンテナをクリア

            this.sections.forEach(section => {
                const sectionElement = this.createSectionElement(section);
                mainContainer.appendChild(sectionElement);
            });
        },
        
        // セクション要素を生成する
        createSectionElement(section) {
            let element;
            // 'widget' タイプは特別なカードとして生成
            if (section.type === 'widget') {
                element = document.createElement(section.tag || 'div');
                element.className = 'widget-card sortable-section';
                if (section.id === 'weather-widget') {
                    element.innerHTML = `
                        <i class="fa-solid fa-grip-vertical drag-handle" title="セクションを移動"></i>
                        <div class="card-header"><h3><i class="fa-solid fa-sun"></i> 大阪の天気</h3></div>
                        <div id="weather-info" class="card-content"><p>読み込み中...</p></div>
                    `;
                } else {
                     element.innerHTML = `
                        <i class="fa-solid fa-grip-vertical drag-handle" title="セクションを移動"></i>
                        <i class="${section.icon} card-icon"></i>
                        <h3>${section.title}</h3>
                        <p>${section.description}</p>
                    `;
                    element.href = section.url;
                    element.target = '_blank';
                    element.rel = 'noopener noreferrer';
                }
            } else { // 通常のセクション
                element = document.createElement('section');
                element.className = 'sortable-section';
                element.innerHTML = `
                    <div class="section-header">
                        <h2 data-title-id="${section.id}">
                            <i class="fa-solid fa-grip-vertical drag-handle" title="セクションを移動"></i>
                            <i class="${section.icon}"></i>
                            <span class="section-title">${section.title}</span>
                            <button class="edit-title-btn" title="タイトルを編集"><i class="fa-solid fa-pencil"></i></button>
                        </h2>
                        ${section.id === 'favorites' ? '<button id="add-favorite-btn" class="button-add" title="お気に入りを追加"><i class="fa-solid fa-plus"></i></button>' : ''}
                    </div>
                    <div id="${section.id}-list" class="${section.gridClass || 'card-grid-small'}"></div>
                `;
                const linkContainer = element.querySelector(`#${section.id}-list`);
                (this.links[section.id] || []).forEach(link => {
                    linkContainer.appendChild(this.createLinkElement(link, section.id === 'favorites'));
                });
            }
            element.id = section.id;
            return element;
        },

        // リンクカード要素を生成する
        createLinkElement(link, isFavorite = false) {
            const a = document.createElement('a');
            a.href = link.url;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            a.className = 'card';
            a.dataset.id = link.id;

            a.innerHTML = `
                <i class="${link.icon} ${link.description ? 'card-icon' : 'card-icon-small'}"></i>
                ${link.description ? `<h3>${link.title}</h3>` : `<h4>${link.title}</h4>`}
                ${link.description ? `<p>${link.description}</p>` : ''}
            `;
            // お気に入りのみ削除ボタンを追加
            if (isFavorite) {
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'button-delete';
                deleteBtn.title = '削除';
                deleteBtn.innerHTML = '<i class="fa-solid fa-trash-can"></i>';
                a.appendChild(deleteBtn);
            }
            return a;
        },
        
        // 全体のイベントリスナーを設定
        addEventListeners() {
            const mainContainer = document.getElementById('main-container');
            mainContainer.addEventListener('click', (e) => {
                // お気に入り追加ボタン
                if (e.target.closest('#add-favorite-btn')) {
                    this.showFavoriteModal(true);
                }
                // 削除ボタン
                if (e.target.closest('.button-delete')) {
                    e.preventDefault();
                    e.stopPropagation();
                    const card = e.target.closest('.card');
                    this.deleteFavorite(card.dataset.id);
                }
                // タイトル編集ボタン
                if (e.target.closest('.edit-title-btn')) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.handleEditClick(e.target.closest('.edit-title-btn'));
                }
            });
            // モーダル関連
            document.getElementById('close-modal-btn').addEventListener('click', () => this.showFavoriteModal(false));
            document.getElementById('favorite-modal').addEventListener('click', (e) => {
                if (e.target.id === 'favorite-modal') this.showFavoriteModal(false);
            });
            document.getElementById('favorite-form').addEventListener('submit', (e) => this.addFavorite(e));
        },

        // セクションの並び替えを設定
        setupSectionSortable() {
            const mainContainer = document.getElementById('main-container');
            Sortable.create(mainContainer, {
                animation: 150,
                ghostClass: 'sortable-ghost',
                handle: '.drag-handle',
                onEnd: (evt) => {
                    const movedItem = this.sections.splice(evt.oldIndex, 1)[0];
                    this.sections.splice(evt.newIndex, 0, movedItem);
                    this.saveData();
                }
            });
        },

        // リンクのカテゴリ間移動を設定
        setupLinkSortable() {
            this.sections.filter(s => s.type === 'link-section').forEach(section => {
                const container = document.getElementById(`${section.id}-list`);
                Sortable.create(container, {
                    group: 'shared-links',
                    animation: 150,
                    ghostClass: 'sortable-ghost',
                    onEnd: (evt) => {
                        const fromId = evt.from.id.replace('-list', '');
                        const toId = evt.to.id.replace('-list', '');
                        
                        const movedItem = this.links[fromId].splice(evt.oldIndex, 1)[0];
                        this.links[toId].splice(evt.newIndex, 0, movedItem);
                        
                        this.saveData();
                    }
                });
            });
        },

        // 以下、お気に入り・タイトル編集の個別ロジック
        showFavoriteModal(show) {
            document.getElementById('favorite-modal').style.display = show ? 'flex' : 'none';
            if (show) document.getElementById('favorite-name').focus();
        },

        addFavorite(event) {
            event.preventDefault();
            const name = document.getElementById('favorite-name').value.trim();
            const url = document.getElementById('favorite-url').value.trim();
            if (name && url) {
                const newFavorite = {
                    id: `fav-${Date.now()}`,
                    title: name,
                    url: url,
                    icon: 'fa-solid fa-link',
                    description: ''
                };
                this.links.favorites.push(newFavorite);
                this.saveData();
                this.renderSections();
                this.setupLinkSortable(); // 再描画後にSortableを再設定
                event.target.reset();
                this.showFavoriteModal(false);
            }
        },

        deleteFavorite(linkId) {
            if (confirm('このお気に入りを削除しますか？')) {
                this.links.favorites = this.links.favorites.filter(link => link.id !== linkId);
                this.saveData();
                this.renderSections();
                this.setupLinkSortable();
            }
        },

        handleEditClick(button) {
            const h2 = button.closest('h2');
            const titleSpan = h2.querySelector('.section-title');
            if (titleSpan.isContentEditable) this.saveTitle(titleSpan, button);
            else this.startEditing(titleSpan, button);
        },

        startEditing(span, button) {
            span.dataset.originalTitle = span.innerText;
            span.contentEditable = true;
            span.focus();
            span.classList.add('editing');
            button.innerHTML = '<i class="fa-solid fa-check"></i>';
            const blurHandler = () => this.saveTitle(span, button);
            span.addEventListener('blur', blurHandler, { once: true });
            span.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') { e.preventDefault(); span.removeEventListener('blur', blurHandler); this.saveTitle(span, button); }
                if (e.key === 'Escape') { span.removeEventListener('blur', blurHandler); this.cancelEditing(span, button); }
            });
        },

        saveTitle(span, button) {
            if (!span.isContentEditable) return;
            span.contentEditable = false;
            span.classList.remove('editing');
            button.innerHTML = '<i class="fa-solid fa-pencil"></i>';
            const newTitle = span.innerText.trim();
            const sectionId = span.closest('h2').dataset.titleId;
            const section = this.sections.find(s => s.id === sectionId);
            if (section && newTitle) {
                section.title = newTitle;
                this.saveData();
            } else {
                span.innerText = span.dataset.originalTitle;
            }
        },

        cancelEditing(span, button) {
            span.innerText = span.dataset.originalTitle;
            span.contentEditable = false;
            span.classList.remove('editing');
            button.innerHTML = '<i class="fa-solid fa-pencil"></i>';
        },

        // デフォルトデータ
        getDefaultSections() {
            return [
                { id: 'weather-widget', type: 'widget', tag: 'div' },
                { id: 'kinjirou-widget', type: 'widget', tag: 'a', title: '勤次郎', icon: 'fa-solid fa-user-clock', description: '勤怠管理システム', url: 'https://ini5a.kinjirou-asp.jp/PLNT1701/KinjirouWeb/kinjirou/kwtop/kwtop.aspx?type=20005' },
                { id: 'favorites', type: 'link-section', title: 'お気に入り', icon: 'fa-solid fa-star' },
                { id: 'schedule', type: 'link-section', title: 'Schedule', icon: 'fa-solid fa-calendar-days', gridClass: 'card-grid' },
                { id: 'accounting-links', type: 'link-section', title: '経理部専用ツール', icon: 'fa-solid fa-calculator' },
                { id: 'company-links', type: 'link-section', title: '社内共通リンク', icon: 'fa-solid fa-building' },
                { id: 'ai-tools', type: 'link-section', title: 'AIツール', icon: 'fa-solid fa-brain' },
            ];
        },
        getDefaultLinks() {
            return {
                favorites: [],
                schedule: [
                    { id: 'sc1', title: '年間業務', url: '', icon: 'fa-solid fa-calendar-week', description: '年間の業務スケジュールを確認します。' },
                    { id: 'sc2', title: '経理業務', url: 'https://outlook.office.com/calendar/view/month', icon: 'fa-regular fa-calendar', description: '経理業務のカレンダーを開きます。' },
                    { id: 'sc3', title: '部内突発タスク', url: 'https://0505toto.github.io/todo/', icon: 'fa-solid fa-list-check', description: '部内で発生したタスクを管理します。' }
                ],
                'accounting-links': [
                    { id: 'ac1', title: 'Moneytree', url: 'https://business.getmoneytree.com/landing', icon: 'fa-solid fa-tree', description: '' },
                    { id: 'ac2', title: 'Bill One', url: 'https://plantec-kk.app.bill-one.com/recipient/accounting/invoices', icon: 'fa-solid fa-file-invoice-dollar', description: '' },
                    { id: 'ac3', title: 'MakeLeaps', url: 'https://app.makeleaps.com/home/', icon: 'fa-solid fa-file-signature', description: '' },
                    { id: 'ac4', title: '楽楽精算', url: 'https://rsphoto.rakurakuseisan.jp/yCiwuzXNzTa/', icon: 'fa-solid fa-train-subway', description: '' },
                    { id: 'ac5', title: 'SPC NetBanking', url: 'https://0505toto.github.io/NetBankingportal/', icon: 'fa-solid fa-building-columns', description: '' },
                    { id: 'ac6', title: 'A-saas', url: 'https://menu.a-saas.jp/', icon: 'fa-solid fa-gears', description: '' },
                    { id: 'ac7', title: 'main銀行', url: 'https://corporate.bk.mufg.jp/frontend/auth', icon: 'fa-solid fa-yen-sign', description: '' },
                    { id: 'ac8', title: 'sub銀行', url: 'https://www.b-direct.resonabank.co.jp/0010c/oauth/auth?response_type=code&client_id=OPRS0010&redirect_uri=https://wb.resona-gr.co.jp/webservice/WSOI0102E100M.do', icon: 'fa-solid fa-jpy', description: '' }
                ],
                'company-links': [
                    { id: 'co1', title: 'Garoon', url: 'https://hz6n32v7pq52.cybozu.com/g/', icon: 'fa-solid fa-shapes', description: '' },
                    { id: 'co2', title: 'Kintone', url: 'https://hz6n32v7pq52.cybozu.com/k/#/portal', icon: 'fa-solid fa-cloud', description: '' },
                    { id: 'co3', title: '経理住所録Hub※工事中', url: 'https://hz6n32v7pq52.cybozu.com/k/168/?view=20#sort_0=f13312458&order_0=desc&qs=1/', icon: 'fa-solid fa-address-book', description: '' },
                    { id: 'co4', title: 'PT Info', url: 'https://0505toto.github.io/Info-1/', icon: 'fa-solid fa-wand-magic-sparkles', description: '' },
                    { id: 'co5', title: 'Operation Portal', url: '#', icon: 'fa-solid fa-briefcase', description: '' }
                ],
                'ai-tools': [
                    { id: 'ai1', title: 'ChatGPT', url: 'https://chatgpt.com/', icon: 'fa-solid fa-robot', description: '' },
                    { id: 'ai2', title: 'Gemini', url: 'https://gemini.google.com/app?hl=ja', icon: 'fa-solid fa-star-of-life', description: '' }
                ]
            };
        }
    };
    
    // 天気予報ウィジェット
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
            weatherWidget.innerHTML = `<div class="weather-main"><i class="fa-solid fa-sun"></i><span class="weather-temp">${tempC}°C</span><span class="weather-desc">${description}</span></div><div class="weather-sub"><span>最高: ${maxTemp}°C</span> / <span>最低: ${minTemp}°C</span></div>`;
        } catch (error) {
            weatherWidget.innerHTML = '<p>天気情報を取得できませんでした。</p>';
        }
    };
    
    // パーティクルエフェクト
    const setupParticles = () => {
        if (typeof particlesJS !== 'undefined') {
            particlesJS('particles-js', { /* ... 省略 ... */ });
        }
    };
    
    // Quick Access（変更なし）
    const quickAccessApp = { /* ... 変更がないため省略 ... */ };

    // ===== 初期化処理の実行 =====
    portalManager.init();
    fetchWeather();
    setupParticles();

});
