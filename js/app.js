/**
 * Robot Laboratuvarı - Ana Uygulama Yöneticisi (App Controller)
 * Three.js sahnesi, kamera, ışıklar, aşamalar arası geçiş ve UI bağlamaları.
 * Yeni: Görev Merkezi, Telemetri, Canlı Dünya, Sinematik kamera entegrasyonu.
 */

class RobotLabApp {
    constructor() {
        this.currentStage = 'tutorial'; // 'tutorial' | 'custom_build' | 'sensor_lab' | 'missions'
        this.container = document.getElementById('canvasContainer');

        // Delta-time hesaplaması için son kare zamanı
        this.lastFrameTime = performance.now();

        // Auto-rotate idle modu (5 saniye etkileşim yoksa)
        this.lastInteractionTime = performance.now();
        this.idleRotateActive = false;
        this.IDLE_TIMEOUT = 5000; // 5 saniye

        this.initThree();
        this.initControllers();
        this.bindUIEvents();
        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);

        // Başlangıçta örnek şablonu (DostBot) yükle
        this.startTutorial();
    }

    initThree() {
        const width = this.container.clientWidth || window.innerWidth;
        const height = this.container.clientHeight || window.innerHeight;

        // 1. Sahne
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf0f9ff);

        // 2. Kamera
        this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 200);
        this.camera.position.set(0, 1.2, 5.8);

        // 3. Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        // Pixar-style cinematic rendering
        if (THREE.ACESFilmicToneMapping !== undefined) {
            this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
            this.renderer.toneMappingExposure = 1.15;
        }
        if (this.renderer.physicallyCorrectLights !== undefined) {
            this.renderer.physicallyCorrectLights = true;
        }
        this.container.appendChild(this.renderer.domElement);

        // 4. OrbitControls — Çocuk dostu UX ayarları
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.08;           // Daha doğal sönümleme
        this.controls.maxPolarAngle = Math.PI * 0.48; // Yerin altına kesinlikle geçemez
        this.controls.minPolarAngle = Math.PI * 0.1;  // Tam tepeden bakışı sınırla
        this.controls.minDistance = 2.0;               // Parçaları yakından inceleme
        this.controls.maxDistance = 40.0;              // Geniş panoramik görünüm (kalibrasyon odası için)
        this.controls.enablePan = false;               // Çocuklar sahneyi yanlışlıkla kaydırmasın
        this.controls.target.set(0, 0.2, -30);         // Başlangıçta Tasarım Garajına odaklan
        this.camera.position.set(0, 2.5, -24);         // Kamera Garajın içinde/önünde başlar
        this.controls.autoRotate = false;
        this.controls.autoRotateSpeed = 1.0;           // Idle modda yavaş döndürme hızı

        // Kullanıcı kameraya müdahale ediyor mu? (3. şahıs takibi için)
        this.userOrbiting = false;
        this.controls.addEventListener('start', () => { this.userOrbiting = true; });
        this.controls.addEventListener('end', () => { this.userOrbiting = false; });

        // 5. Işıklar — Pixar Sinematik Işıklandırma
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.55);
        this.scene.add(this.ambientLight);

        // Ana güneş ışığı (yüksek çözünürlüklü gölge)
        this.dirLight = new THREE.DirectionalLight(0xfffbeb, 1.4);
        this.dirLight.position.set(4, 8, 5);
        this.dirLight.castShadow = true;
        this.dirLight.shadow.mapSize.width = 2048;
        this.dirLight.shadow.mapSize.height = 2048;
        this.dirLight.shadow.bias = -0.001;
        this.dirLight.shadow.camera.near = 0.5;
        this.dirLight.shadow.camera.far = 90;
        this.dirLight.shadow.camera.left = -30;
        this.dirLight.shadow.camera.right = 30;
        this.dirLight.shadow.camera.top = 30;
        this.dirLight.shadow.camera.bottom = -30;
        this.scene.add(this.dirLight);

        // Dolgu ışığı (mavi tonu — Pixar soğuk-sıcak kontrast)
        const fillLight = new THREE.DirectionalLight(0x93c5fd, 0.7);
        fillLight.position.set(-5, 3, -3);
        this.scene.add(fillLight);

        // Yarım küre ışık — gökyüzü/zemin renk dolgusu (Pixar karakteristik)
        this.hemiLight = new THREE.HemisphereLight(0x87ceeb, 0xd4b896, 0.5);
        this.scene.add(this.hemiLight);

        // Rim ışığı (robotun arkasını aydınlatır, Pixar kenar parlaması)
        this.rimLight = new THREE.SpotLight(0x38bdf8, 3.0, 25, Math.PI / 7, 0.5);
        this.rimLight.position.set(-4, 7, -4);
        this.rimLight.castShadow = false;
        this.scene.add(this.rimLight);
        this.rimLightTarget = new THREE.Object3D();
        this.scene.add(this.rimLightTarget);
        this.rimLight.target = this.rimLightTarget;

        // Garaj plazma çekirdek parlaması
        this.garageGlow = new THREE.PointLight(0x38bdf8, 2.0, 10);
        this.garageGlow.position.set(0, 0.5, -30);
        this.scene.add(this.garageGlow);

        // 6. ÇALIŞMA MASASI VE TASARIM GARAJI (Design Lab)
        this.garageGroup = new THREE.Group();
        this.garageGroup.position.set(0, 0, -30); // Parkurdan uzakta, başlangıç garajı
        this.scene.add(this.garageGroup);

        // Zemin Kaidesi (Studio Pod)
        const podGeo = new THREE.CylinderGeometry(2.4, 2.7, 0.4, 32);
        const podMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, metalness: 0.1 });
        this.podMesh = new THREE.Mesh(podGeo, podMat);
        this.podMesh.position.y = -1.4;
        this.podMesh.receiveShadow = true;
        this.garageGroup.add(this.podMesh);

        // Kaide neon halkası
        const ringGeo = new THREE.TorusGeometry(2.45, 0.06, 16, 48);
        ringGeo.rotateX(Math.PI / 2);
        const ringMesh = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0x52d4b6 }));
        ringMesh.position.y = -1.2;
        this.garageGroup.add(ringMesh);

        // Garaj Duvarları (Camlı ve Neonlu Teknoloji Odası)
        const wallGeo = new THREE.BoxGeometry(16, 8, 0.5);
        const glassMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, transparent: true, opacity: 0.8, metalness: 0.8, roughness: 0.1 });
        const backWall = new THREE.Mesh(wallGeo, glassMat);
        backWall.position.set(0, 2.6, -6);
        this.garageGroup.add(backWall);

        const sideGeo = new THREE.BoxGeometry(0.5, 8, 12);
        const leftWall = new THREE.Mesh(sideGeo, glassMat);
        leftWall.position.set(-8, 2.6, 0);
        this.garageGroup.add(leftWall);

        const rightWall = new THREE.Mesh(sideGeo, glassMat);
        rightWall.position.set(8, 2.6, 0);
        this.garageGroup.add(rightWall);

        // Neon Şeritler (Tavan)
        const neonMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
        const neonGeo = new THREE.BoxGeometry(15.8, 0.2, 0.6);
        const topNeon = new THREE.Mesh(neonGeo, neonMat);
        topNeon.position.set(0, 6.5, -5.8);
        this.garageGroup.add(topNeon);

        // Neon zemin ızgara çizgileri (hız hissi verir)
        const gridLineMat = new THREE.MeshBasicMaterial({ color: 0x0ea5e9, transparent: true, opacity: 0.3 });
        for (let i = -6; i <= 6; i += 2) {
            const hLine = new THREE.Mesh(new THREE.PlaneGeometry(16, 0.06), gridLineMat);
            hLine.rotation.x = -Math.PI / 2;
            hLine.position.set(0, -1.18, i);
            this.garageGroup.add(hLine);
            const vLine = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 12), gridLineMat);
            vLine.rotation.x = -Math.PI / 2;
            vLine.position.set(i, -1.18, 0);
            this.garageGroup.add(vLine);
        }

        // Yan duvar neon aksanlar + point ışıklar
        [-7.6, 7.6].forEach((x, side) => {
            // Dikey neon şerit
            const stripMesh = new THREE.Mesh(
                new THREE.BoxGeometry(0.12, 5.5, 0.12),
                new THREE.MeshBasicMaterial({ color: side === 0 ? 0x52d4b6 : 0xff735c })
            );
            stripMesh.position.set(x, 1.5, 0);
            this.garageGroup.add(stripMesh);

            // Şeritten yayılan point ışık (garajı renklendirir)
            const pl = new THREE.PointLight(side === 0 ? 0x52d4b6 : 0xff735c, 1.2, 12);
            pl.position.set(x * 0.9, 2, -30);
            this.scene.add(pl);
        });

        // Tavan sarkık panel ışıkları (3 adet, eşit aralıklı)
        [-4, 0, 4].forEach(x => {
            const panelGeo = new THREE.BoxGeometry(2.5, 0.12, 0.8);
            const panelMat = new THREE.MeshBasicMaterial({ color: 0xfff8e7 });
            const panel = new THREE.Mesh(panelGeo, panelMat);
            panel.position.set(x, 5.8, -2);
            this.garageGroup.add(panel);

            const pl = new THREE.PointLight(0xfff8e7, 0.8, 8);
            pl.position.set(x, 5.5, -32);
            this.scene.add(pl);
        });

        window.addEventListener('resize', () => this.onWindowResize());

        // Etkileşim takibi: herhangi bir tıklama/dokunuş idle zamanlayıcısını sıfırlar
        const resetIdle = () => this.resetIdleTimer();
        this.renderer.domElement.addEventListener('pointerdown', resetIdle);
        this.renderer.domElement.addEventListener('pointermove', resetIdle);
        this.renderer.domElement.addEventListener('wheel', resetIdle);
        window.addEventListener('keydown', resetIdle);
    }

    onWindowResize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    initControllers() {
        // Builder Motoru
        this.builder = new RobotBuilder(this.scene, this.camera, this.renderer, this.controls);

        // Sensör Laboratuvarı Motoru (klasik 6 istasyon modu)
        this.sensorLab = new SensorLaboratory(this.scene, this.camera, this.renderer, this.builder, this.controls);
        this.sensorLab.setLights(this.ambientLight, this.dirLight);

        // Telemetri Sistemi (5.1)
        this.telemetry = new TelemetrySystem();
        this.telemetry.bindPanel();

        // Canlı Dünya Sistemi (5.12, 5.16, 5.17, 5.11, 7.5, 5.13)
        this.world = new WorldSystem(this.scene, this.camera, this.controls);
        this.world.buildDynamicWorld();
        this.world.buildGarageProps(this.garageGroup);
        this.world.buildCalibrationRoom();
        this.world.buildCompanion();

        // Görev Merkezi (5.8 vb.)
        this.missions = new MissionController(this.scene, this.camera, this.controls, this.builder, this.world, this.telemetry);

        // Parkur Yapıcı (5.15)
        this.trackBuilder = new TrackBuilderController(this.scene, this.camera, this.controls, this.builder);

        // Botti Maskot Bağlantısı
        if (window.Botti) {
            window.Botti.bindElements(
                document.getElementById('bottiSpeechText'),
                document.getElementById('bottiMascot')
            );
        }
    }

    // ==========================================
    // YENİ: Görev Merkezi geçişi (aşama 4)
    // ==========================================
    startMissionCenter() {
        this.currentStage = 'missions';

        document.getElementById('navStage1Btn').classList.remove('nav-active');
        document.getElementById('navStage2Btn').classList.remove('nav-active');
        document.getElementById('navStage3Btn').classList.remove('nav-active');
        document.getElementById('navMissionCenterBtn').classList.add('nav-active');

        this.showSensorsStageChrome(true);
        this.missions.enterMissions();

        // Drone görünür olsun (5.13)
        this.world.showCompanion(true);

        setTimeout(() => this.onWindowResize(), 120);
    }

    // ==========================================
    // SENSÖR AŞAMASI UI KROMU (HUD + panel görünürlüğü)
    // show: true → sürüş HUD + sağ panel alanı missions panellerine açılır
    // ==========================================
    showSensorsStageChrome(show) {
        const workspace = document.querySelector('.main-workspace');
        if (workspace) {
            if (show) workspace.classList.add('sensor-mode');
            else workspace.classList.remove('sensor-mode');
            workspace.classList.remove('full-canvas-mode');
        }

        const drivingHud = document.getElementById('drivingHud');
        if (drivingHud) drivingHud.classList.toggle('hidden', !show);

        const btnTogglePanel = document.getElementById('btnTogglePanel');
        if (btnTogglePanel) {
            btnTogglePanel.classList.toggle('hidden', !show);
            btnTogglePanel.innerHTML = '<span>👁️ Yönerge Panelini Gizle</span>';
        }

        // Tüm sağ panelleri kapat (missions.setUIState sonra açar)
        ['sensorLabPanel', 'missionsHubPanel', 'calibrationPanel', 'comparePanel', 'freeExplorePanel', 'missionPanel', 'trackBuilderPanel'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.add('hidden');
        });

        // Sol palet & edit paneli sadece montaj aşamalarında
        const isBuildStage = this.currentStage === 'tutorial' || this.currentStage === 'custom_build';
        document.getElementById('partsPalettePanel').classList.toggle('hidden', !isBuildStage);
        document.getElementById('editControlPanel').classList.toggle('hidden', !isBuildStage);
        document.getElementById('tutorialGuidanceBanner').classList.toggle('hidden', this.currentStage !== 'tutorial');
    }

    // ==========================================
    // AŞAMALAR ARASI GEÇİŞ (STAGES)
    // ==========================================
    startTutorial() {
        this.currentStage = 'tutorial';
        this.builder.loadTutorialTemplate();

        document.getElementById('navStage1Btn').classList.add('nav-active');
        document.getElementById('navStage2Btn').classList.remove('nav-active');
        document.getElementById('navStage3Btn').classList.remove('nav-active');
        document.getElementById('navMissionCenterBtn').classList.remove('nav-active');

        this.showSensorsStageChrome(false);
        document.getElementById('partsPalettePanel').classList.remove('hidden');
        document.getElementById('editControlPanel').classList.remove('hidden');

        this.world.showCompanion(false);
        this.telemetry.hide();

        // Kamerayı garaja odakla
        this.controls.target.set(0, 0.2, -30);
        this.camera.position.set(0, 2.5, -24);

        // Tutorial aşamasında parça kutusunu başlangıç parçalarına filtrele
        this.filterPaletteForTutorial(true);
        setTimeout(() => this.onWindowResize(), 100);
    }

    startCustomBuild() {
        this.currentStage = 'custom_build';
        this.builder.loadCustomBuilder('square');

        document.getElementById('navStage1Btn').classList.remove('nav-active');
        document.getElementById('navStage2Btn').classList.add('nav-active');
        document.getElementById('navStage3Btn').classList.remove('nav-active');
        document.getElementById('navMissionCenterBtn').classList.remove('nav-active');

        this.showSensorsStageChrome(false);
        document.getElementById('partsPalettePanel').classList.remove('hidden');
        document.getElementById('editControlPanel').classList.remove('hidden');

        this.world.showCompanion(false);
        this.telemetry.hide();

        // Kamerayı garaja odakla
        this.controls.target.set(0, 0.2, -30);
        this.camera.position.set(0, 2.5, -24);

        // Tüm parçaları göster
        this.filterPaletteForTutorial(false);
        setTimeout(() => this.onWindowResize(), 100);
    }

    startSensorLab() {
        this.currentStage = 'sensor_lab';
        this.builder.mode = 'sensor_lab';

        document.getElementById('navStage1Btn').classList.remove('nav-active');
        document.getElementById('navStage2Btn').classList.remove('nav-active');
        document.getElementById('navStage3Btn').classList.add('nav-active');
        document.getElementById('navMissionCenterBtn').classList.remove('nav-active');

        this.showSensorsStageChrome(true);
        document.getElementById('sensorLabPanel').classList.remove('hidden');

        // Soket göstergelerini kaldır
        this.builder.updateSocketIndicators();

        this.world.showCompanion(true);
        this.telemetry.show();

        // 3D Test Parkuruna KOŞARAK GEÇİŞ (Sinematik)
        this.sensorLab.runToPark();

        setTimeout(() => this.onWindowResize(), 120);

        if (window.Botti) {
            window.Botti.speak(
                `🏎️ Hoş geldin <b>Sensör Test Parkuru</b>na!<br>İşte tasarladığın <b>${this.builder.robotName}</b> pistte hazır! Sağdaki yönergeleri oku, yön tuşlarıyla robotunu sürerek istasyonları tamamla!`
            );
        }
    }

    filterPaletteForTutorial(isTutorial) {
        const tabBar = document.querySelector('.palette-tab-bar');
        const bodySec = document.getElementById('bodySelectorSection');
        if (tabBar) tabBar.style.display = isTutorial ? 'none' : 'flex';
        if (bodySec) bodySec.style.display = isTutorial ? 'none' : 'block';

        document.querySelectorAll('.palette-part-card').forEach(card => {
            if (isTutorial) {
                if (card.dataset.tutorialRequired === 'true') {
                    card.classList.remove('hidden');
                    card.classList.add('pulse-border');
                } else {
                    card.classList.add('hidden');
                    card.classList.remove('pulse-border');
                }
            } else {
                card.classList.remove('hidden');
                card.classList.remove('pulse-border');
            }
        });
    }

    // ==========================================
    // UI ETKİNLİKLERİ (EVENT LISTENERS)
    // ==========================================
    bindUIEvents() {
        // 1. Üst Navigasyon Butonları
        document.getElementById('navStage1Btn').addEventListener('click', () => {
            if (window.KidAudio) window.KidAudio.playClick();
            this.trackBuilder.exit();
            this.startTutorial();
        });

        document.getElementById('navStage2Btn').addEventListener('click', () => {
            if (window.KidAudio) window.KidAudio.playClick();
            this.trackBuilder.exit();
            this.startCustomBuild();
        });

        document.getElementById('navStage3Btn').addEventListener('click', () => {
            if (window.KidAudio) window.KidAudio.playClick();
            this.trackBuilder.exit();
            this.startSensorLab();
        });

        // YENİ: Görev Merkezi nav butonu
        document.getElementById('navMissionCenterBtn').addEventListener('click', () => {
            if (window.KidAudio) window.KidAudio.playClick();
            this.trackBuilder.exit();
            this.startMissionCenter();
        });

        // 2. Ses & Konuşma Butonları
        document.getElementById('toggleMuteBtn').addEventListener('click', e => {
            const isMuted = window.KidAudio ? window.KidAudio.toggleMute() : false;
            e.currentTarget.innerHTML = isMuted ? '🔇' : '🔊';
        });

        document.getElementById('toggleVoiceBtn').addEventListener('click', e => {
            const isVoiceOn = window.Botti ? window.Botti.toggleVoice() : true;
            e.currentTarget.innerHTML = isVoiceOn ? '🗣️ Açık' : '🗣️ Kapalı';
        });

        // Botti maskotuna tıklayınca son cümleyi tekrar söylesin
        document.getElementById('bottiMascot').addEventListener('click', () => {
            if (window.Botti) window.Botti.repeatLast();
        });

        // Kategori Sekmeleri Filtreleme
        document.querySelectorAll('.palette-tab-btn').forEach(btn => {
            btn.addEventListener('click', e => {
                document.querySelectorAll('.palette-tab-btn').forEach(b => b.classList.remove('active-palette-tab'));
                e.currentTarget.classList.add('active-palette-tab');
                const cat = e.currentTarget.dataset.category;

                document.querySelectorAll('.palette-part-card').forEach(card => {
                    if (this.currentStage === 'tutorial') {
                        if (card.dataset.tutorialRequired === 'true') {
                            card.classList.remove('hidden');
                        } else {
                            card.classList.add('hidden');
                        }
                    } else {
                        if (cat === 'all' || card.dataset.category === cat) {
                            card.classList.remove('hidden');
                        } else {
                            card.classList.add('hidden');
                        }
                    }
                });
                if (window.KidAudio) window.KidAudio.playClick();
            });
        });

        // 3. Parça Kutusu (Palette) Tıklama ve Sürükleme
        document.querySelectorAll('.palette-part-card').forEach(card => {
            const partKey = card.dataset.part;

            // Tek Tıkla Tak (Özellikle çocuklar ve dokunmatik cihazlar için)
            card.addEventListener('click', () => {
                this.builder.addPartByName(partKey);
            });

            // Sürükle-Bırak (HTML5 Drag & Drop)
            card.addEventListener('dragstart', e => {
                e.dataTransfer.setData('text/plain', partKey);
                // Sürükleme başladığında uygun soketi parlat
                if (this.builder) {
                    this.builder.highlightSocketForCategory(card.dataset.category);
                }
            });

            card.addEventListener('dragend', e => {
                // Sürükleme bittiğinde parlamayı kapat
                if (this.builder) {
                    this.builder.clearSocketHighlight();
                }
            });
        });

        // 3D Canvas Sürükle-Bırak Hedefi
        this.renderer.domElement.addEventListener('dragover', e => {
            e.preventDefault();
        });

        this.renderer.domElement.addEventListener('drop', e => {
            e.preventDefault();
            const partKey = e.dataTransfer.getData('text/plain');
            if (partKey) {
                this.builder.addPartByName(partKey);
            }
            if (this.builder) {
                this.builder.clearSocketHighlight();
            }
        });

        // 4. Gövde Tipi Değiştirme Butonları (Özgün Mod)
        document.querySelectorAll('.body-select-btn').forEach(btn => {
            btn.addEventListener('click', e => {
                const bodyType = e.currentTarget.dataset.body;
                this.builder.setBodyByType(bodyType);
            });
        });

        // 5. Düzenleme Masası (Edit Panel) Kontrolleri (Canva Butonları)
        document.getElementById('btnScaleUp').addEventListener('click', () => this.builder.scaleSelected(1.1));
        document.getElementById('btnScaleDown').addEventListener('click', () => this.builder.scaleDownSelected());
        document.getElementById('btnRotate').addEventListener('click', () => this.builder.rotateSelected());
        document.getElementById('btnMirror').addEventListener('click', () => this.builder.mirrorSelected());
        document.getElementById('btnNudgeLeft').addEventListener('click', () => this.builder.nudgeSelected(-1));
        document.getElementById('btnNudgeRight').addEventListener('click', () => this.builder.nudgeSelected(1));
        document.getElementById('btnDeletePart').addEventListener('click', () => this.builder.deleteSelected());
        document.getElementById('btnClearRobot').addEventListener('click', () => {
            if (confirm('Robotunu sıfırlamak istiyor musun?')) {
                this.builder.clearRobot();
                this.builder.setBodyByType('square');
            }
        });

        // Renk Paleti Butonları
        document.querySelectorAll('.color-swatch-btn').forEach(btn => {
            btn.addEventListener('click', e => {
                const hexStr = e.currentTarget.dataset.color;
                const hexVal = parseInt(hexStr.replace('#', '0x'), 16);
                this.builder.paintSelected(hexVal);
            });
        });

        // Robot Adı Girişi
        const nameInput = document.getElementById('robotNameInput');
        if (nameInput) {
            nameInput.addEventListener('input', e => {
                this.builder.robotName = e.target.value.trim() || 'DostBot';
            });
        }

        // "Robotumu Tamamladım! ➔ Sensör Laboratuvarı" Butonu
        document.getElementById('btnFinishRobot').addEventListener('click', () => {
            this.startSensorLab();
        });

        // Tutorial Tamamlama Modal Butonu
        document.getElementById('btnGoCustomFromTutorial').addEventListener('click', () => {
            document.getElementById('tutorialCompleteModal').classList.add('hidden');
            this.startCustomBuild();
        });

        // 6. Sensör Test Parkuru Gezinme Butonları (Breadcrumb & İleri/Geri)
        document.querySelectorAll('.station-step-btn').forEach(btn => {
            btn.addEventListener('click', e => {
                const idx = parseInt(e.currentTarget.dataset.index, 10);
                this.sensorLab.goToStation(idx);
            });
        });

        const btnPrev = document.getElementById('btnPrevStation');
        if (btnPrev) {
            btnPrev.addEventListener('click', () => this.sensorLab.prevStation());
        }

        const btnNext = document.getElementById('btnNextStation');
        if (btnNext) {
            btnNext.addEventListener('click', () => this.sensorLab.nextStation());
        }

        // Mesafe Kaydırıcısı (Slider)
        const distSlider = document.getElementById('distanceSlider');
        if (distSlider) {
            distSlider.addEventListener('input', e => {
                this.sensorLab.setDistanceSliderVal(parseFloat(e.target.value));
            });
        }

        // Işık Tüneli Düğmeleri
        const btnLightDark = document.getElementById('btnLightDark');
        if (btnLightDark) {
            btnLightDark.addEventListener('click', () => this.sensorLab.setLightStationMode('dark'));
        }
        const btnLightBright = document.getElementById('btnLightBright');
        if (btnLightBright) {
            btnLightBright.addEventListener('click', () => this.sensorLab.setLightStationMode('bright'));
        }

        // Isı Odası Düğmeleri
        const btnTempHot = document.getElementById('btnTempHot');
        if (btnTempHot) {
            btnTempHot.addEventListener('click', () => this.sensorLab.setTempStationMode('hot'));
        }
        const btnTempCold = document.getElementById('btnTempCold');
        if (btnTempCold) {
            btnTempCold.addEventListener('click', () => this.sensorLab.setTempStationMode('cold'));
        }
        const btnTempNormal = document.getElementById('btnTempNormal');
        if (btnTempNormal) {
            btnTempNormal.addEventListener('click', () => this.sensorLab.setTempStationMode('normal'));
        }

        // Ses Sahnesi Düğmeleri
        const btnSoundLoud = document.getElementById('btnSoundLoud');
        if (btnSoundLoud) {
            btnSoundLoud.addEventListener('click', () => this.sensorLab.setSoundStationMode('loud'));
        }
        const btnSoundQuiet = document.getElementById('btnSoundQuiet');
        if (btnSoundQuiet) {
            btnSoundQuiet.addEventListener('click', () => this.sensorLab.setSoundStationMode('quiet'));
        }
        const btnSoundNormal = document.getElementById('btnSoundNormal');
        if (btnSoundNormal) {
            btnSoundNormal.addEventListener('click', () => this.sensorLab.setSoundStationMode('normal'));
        }

        // Hareket Düğmesi
        const btnMotion = document.getElementById('btnRunMotionCharacter');
        if (btnMotion) {
            btnMotion.addEventListener('click', () => this.sensorLab.runMotionCharacter());
        }

        // Renk Hedefleri Tıklama (3D Sahnede tıklamayla da çalışır)
        this.renderer.domElement.addEventListener('pointerdown', e => {
            if (this.currentStage === 'sensor_lab' && this.sensorLab.currentStationIndex === 5) {
                const rect = this.renderer.domElement.getBoundingClientRect();
                const mouse = new THREE.Vector2(
                    ((e.clientX - rect.left) / rect.width) * 2 - 1,
                    -((e.clientY - rect.top) / rect.height) * 2 + 1
                );
                const raycaster = new THREE.Raycaster();
                raycaster.setFromCamera(mouse, this.camera);
                const intersects = raycaster.intersectObjects(this.sensorLab.colorTargets, true);
                if (intersects.length > 0) {
                    let target = intersects[0].object;
                    while (target.parent && !target.userData.isColorTarget) {
                        target = target.parent;
                    }
                    if (target.userData.isColorTarget) {
                        this.sensorLab.pickColorTarget(target);
                    }
                }
            }
        });

        // 7. Sertifika Modal Kapatma / İndirme
        document.getElementById('btnCloseCertificate').addEventListener('click', () => {
            document.getElementById('certificateModal').classList.add('hidden');
        });

        document.getElementById('btnDownloadCertificate').addEventListener('click', () => {
            window.print();
        });

        // 8. Yönerge Panelini Gizle / Aç Yüzen Düğmesi
        const btnTogglePanel = document.getElementById('btnTogglePanel');
        if (btnTogglePanel) {
            btnTogglePanel.addEventListener('click', () => {
                const workspace = document.querySelector('.main-workspace');
                if (!workspace) return;
                const isFull = workspace.classList.toggle('full-canvas-mode');
                btnTogglePanel.innerHTML = isFull ? '<span>📋 Yönerge Panelini Aç</span>' : '<span>👁️ Yönerge Panelini Gizle</span>';
                setTimeout(() => this.onWindowResize(), 150);
                if (window.KidAudio) window.KidAudio.playClick();
            });
        }

        // 9. Klavye ile Robot Sürüşü (W-A-S-D / Yön Tuşları / H / L / Boşluk)
        window.addEventListener('keydown', e => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            if (!this.sensorLab) return;

            // Klasik parkur modu veya Görev Merkezi modunda sürüş aktif
            const drivingMode = this.currentStage === 'sensor_lab' || this.currentStage === 'missions';
            if (!drivingMode) return;

            let handled = false;
            switch (e.key) {
                case 'ArrowUp':
                case 'w':
                case 'W':
                    this.sensorLab.driveState.up = true;
                    this.highlightDpad('dpadUp', true);
                    handled = true;
                    break;
                case 'ArrowDown':
                case 's':
                case 'S':
                    this.sensorLab.driveState.down = true;
                    this.highlightDpad('dpadDown', true);
                    handled = true;
                    break;
                case 'ArrowLeft':
                case 'a':
                case 'A':
                    this.sensorLab.driveState.left = true;
                    this.highlightDpad('dpadLeft', true);
                    handled = true;
                    break;
                case 'ArrowRight':
                case 'd':
                case 'D':
                    this.sensorLab.driveState.right = true;
                    this.highlightDpad('dpadRight', true);
                    handled = true;
                    break;
                case 'h':
                case 'H':
                    if (window.KidAudio) window.KidAudio.playHonk();
                    handled = true;
                    break;
                case 'l':
                case 'L':
                    if (this.sensorLab) {
                        this.sensorLab.toggleHeadlights();
                        if (window.KidAudio) window.KidAudio.playClick();
                    }
                    handled = true;
                    break;
                case ' ':
                    // Boşluk tuşu: klasik parkurda dans/koşu + zıplama; görev merkezinde zıplama
                    if (this.currentStage === 'sensor_lab') {
                        if (this.sensorLab.currentStationIndex === 3) {
                            this.sensorLab.setSoundStationMode('loud');
                        } else if (this.sensorLab.currentStationIndex === 4) {
                            this.sensorLab.runMotionCharacter();
                        }
                    }
                    this.sensorLab.jump();
                    if (window.KidAudio) window.KidAudio.playHonk();
                    handled = true;
                    break;
            }
            if (handled && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
                e.preventDefault();
            }
        });

        window.addEventListener('keyup', e => {
            if (!this.sensorLab) return;
            const drivingMode = this.currentStage === 'sensor_lab' || this.currentStage === 'missions';
            if (!drivingMode) return;
            switch (e.key) {
                case 'ArrowUp':
                case 'w':
                case 'W':
                    this.sensorLab.driveState.up = false;
                    this.highlightDpad('dpadUp', false);
                    break;
                case 'ArrowDown':
                case 's':
                case 'S':
                    this.sensorLab.driveState.down = false;
                    this.highlightDpad('dpadDown', false);
                    break;
                case 'ArrowLeft':
                case 'a':
                case 'A':
                    this.sensorLab.driveState.left = false;
                    this.highlightDpad('dpadLeft', false);
                    break;
                case 'ArrowRight':
                case 'd':
                case 'D':
                    this.sensorLab.driveState.right = false;
                    this.highlightDpad('dpadRight', false);
                    break;
            }
        });

        // 10. Dokunmatik & Fare D-Pad Butonları
        const bindDpadTouch = (elemId, key) => {
            const btn = document.getElementById(elemId);
            if (!btn) return;
            const start = (e) => {
                e.preventDefault();
                if (this.sensorLab) this.sensorLab.driveState[key] = true;
                btn.classList.add('pressed');
            };
            const stop = (e) => {
                e.preventDefault();
                if (this.sensorLab) this.sensorLab.driveState[key] = false;
                btn.classList.remove('pressed');
            };
            btn.addEventListener('pointerdown', start);
            btn.addEventListener('pointerup', stop);
            btn.addEventListener('pointerleave', stop);
            btn.addEventListener('pointercancel', stop);
        };

        bindDpadTouch('dpadUp', 'up');
        bindDpadTouch('dpadDown', 'down');
        bindDpadTouch('dpadLeft', 'left');
        bindDpadTouch('dpadRight', 'right');

        const btnHonk = document.getElementById('btnActionHonk');
        if (btnHonk) {
            btnHonk.addEventListener('click', () => {
                if (window.KidAudio) window.KidAudio.playHonk();
            });
        }

        const btnHeadlight = document.getElementById('btnActionHeadlight');
        if (btnHeadlight) {
            btnHeadlight.addEventListener('click', () => {
                if (this.sensorLab) {
                    this.sensorLab.toggleHeadlights();
                    if (window.KidAudio) window.KidAudio.playClick();
                }
            });
        }
    }

    highlightDpad(elemId, isPressed) {
        const btn = document.getElementById(elemId);
        if (btn) {
            if (isPressed) {
                btn.classList.add('pressed');
            } else {
                btn.classList.remove('pressed');
            }
        }
    }

    // ==========================================
    // IDLE AUTO-ROTATE (Etkileşim yoksa robotu döndür)
    // ==========================================
    resetIdleTimer() {
        this.lastInteractionTime = performance.now();
        if (this.idleRotateActive) {
            this.idleRotateActive = false;
            this.controls.autoRotate = false;
        }
    }

    checkIdleRotate(now) {
        // Sadece montaj modunda (tutorial veya custom_build) auto-rotate uygula
        if (this.currentStage === 'sensor_lab' || this.currentStage === 'missions') {
            if (this.idleRotateActive) {
                this.idleRotateActive = false;
                this.controls.autoRotate = false;
            }
            return;
        }

        if (!this.idleRotateActive && (now - this.lastInteractionTime) > this.IDLE_TIMEOUT) {
            this.idleRotateActive = true;
            this.controls.autoRotate = true;
        }
    }

    // ==========================================
    // ANİMASYON DÖNGÜSÜ (RENDER LOOP)
    // ==========================================
    animate(time) {
        requestAnimationFrame(this.animate);

        // Gerçek delta-time hesaplaması (saniye cinsinden)
        const now = performance.now();
        const deltaTime = Math.min((now - this.lastFrameTime) / 1000, 0.05); // Max 50ms cap
        this.lastFrameTime = now;

        // Idle auto-rotate kontrolü
        this.checkIdleRotate(now);

        this.controls.update();

        if (this.builder) {
            this.builder.animate(deltaTime);
        }

        // Klasik Sensör Parkuru aşaması
        if (this.currentStage === 'sensor_lab' && this.sensorLab) {
            this.sensorLab.animate(deltaTime);
        }

        // Görev Merkezi aşaması: görev motoru + dünya + parkur yapıcı
        if (this.currentStage === 'missions') {
            if (this.trackBuilder) this.trackBuilder.update(deltaTime);

            // Sürüş girdisi var mı? (missions güncellemesi için)
            const ds = this.sensorLab.driveState;
            const isDriving = ds.up || ds.down || ds.left || ds.right;
            const speedRatio = Math.min(1, Math.abs(this.sensorLab.velocity.forward) / this.sensorLab.MAX_SPEED);

            // Sürüş fiziğini missions modunda da uygula (sensorLab'in sürüş bloğu yalnızca kendi aşamasında çalışır)
            if (this.missions && this.missions.mode !== 'missions_hub_entering') {
                this.missions.update(deltaTime, isDriving, speedRatio);
                this._applyMissionDriving(deltaTime);
            }

            // Sinematik aktifken chase kamerası karışmasın
            if (!this.world.cinematicActive) {
                this._missionChaseCamera(deltaTime);
            }
        }

        // Canlı dünya güncellemesi (her aşamada dekorlar yaşasın)
        if (this.world) {
            const robot = this.builder ? this.builder.robotGroup : null;
            this.world.update(deltaTime, robot);
        }

        // Rim ışığı robotun pozisyonunu takip etsin (Pixar kenar parlaması)
        if (this.builder && this.builder.robotGroup && this.rimLight && this.rimLightTarget) {
            const rPos = this.builder.robotGroup.position;
            this.rimLightTarget.position.set(rPos.x, rPos.y + 0.5, rPos.z);
            this.rimLightTarget.updateMatrixWorld();
        }

        // Garaj plazma çekirdek nabız efekti
        if (this.garageGlow && this.currentStage !== 'sensor_lab') {
            this.garageGlow.intensity = 1.6 + 0.5 * Math.sin(now / 900);
        }

        this.renderer.render(this.scene, this.camera);

    }

    // ==========================================
    // YENİ: Görev modunda sürüş fiziği uygula
    // (sensorLab.driveState kullanılır, aynı ivme/decel hissi)
    // ==========================================
    _applyMissionDriving(delta) {
        const robot = this.builder.robotGroup;
        if (!robot || !this.sensorLab) return;
        const sl = this.sensorLab;
        const ds = sl.driveState;
        const m = this.missions;

        // Otonom görevde kullanıcı sürüşü devre dışı (robot kendi rotasında)
        if (m.activeMission && m.activeMission.id === 'autonomous') {
            return;
        }

        // Dönüş
        if (ds.left) {
            sl.velocity.turn += sl.TURN_SPEED;
        } else if (ds.right) {
            sl.velocity.turn -= sl.TURN_SPEED;
        }
        sl.velocity.turn *= sl.TURN_DECEL;
        if (Math.abs(sl.velocity.turn) < 0.001) sl.velocity.turn = 0;
        robot.rotation.y += sl.velocity.turn;

        // İleri / Geri
        if (ds.up) {
            sl.velocity.forward = Math.min(sl.velocity.forward + sl.DRIVE_ACCEL, sl.MAX_SPEED);
        } else if (ds.down) {
            sl.velocity.forward = Math.max(sl.velocity.forward - sl.DRIVE_ACCEL, -sl.MAX_REVERSE);
        } else {
            sl.velocity.forward *= sl.DRIVE_DECEL;
            if (Math.abs(sl.velocity.forward) < 0.001) sl.velocity.forward = 0;
        }

        const isMoving = Math.abs(sl.velocity.forward) > 0.002 || Math.abs(sl.velocity.turn) > 0.002;

        // Serbest keşif dışında: mesafe < ~25cm iken otomatik fren (5.3 davranışı)
        if (m.autobrakeEnabled && m.activeMission !== null && Math.abs(sl.velocity.forward) > 0.001) {
            const t = m.telemetry.data;
            if (t.distance < 25 && sl.velocity.forward > 0) {
                sl.velocity.forward = -0.04;
                if (window.KidAudio) window.KidAudio.playSensorAlert(0.05);
            }
        }

        if (Math.abs(sl.velocity.forward) > 0.001) {
            robot.position.x += Math.sin(robot.rotation.y) * sl.velocity.forward;
            robot.position.z += Math.cos(robot.rotation.y) * sl.velocity.forward;
        }

        // Oyun hissi: pitch/roll + toz
        if (isMoving) {
            robot.position.y = Math.abs(Math.sin(performance.now() * 0.012)) * 0.05;
            const targetPitch = sl.velocity.forward * 0.5;
            robot.rotation.x = THREE.MathUtils.lerp(robot.rotation.x, targetPitch, 0.1);
            const targetRoll = -sl.velocity.turn * 3.5;
            robot.rotation.z = THREE.MathUtils.lerp(robot.rotation.z, targetRoll, 0.1);
            if (Math.random() < Math.abs(sl.velocity.forward) * 3) {
                sl.spawnDustParticle(robot.position.clone().add(new THREE.Vector3(0, -0.4, 0)));
            }
            robot.traverse(child => {
                if (child.name && child.name.includes('wheel')) {
                    child.rotation.x += sl.velocity.forward * 1.5;
                }
            });
        } else {
            robot.rotation.x = THREE.MathUtils.lerp(robot.rotation.x, 0, 0.1);
            robot.rotation.z = THREE.MathUtils.lerp(robot.rotation.z, 0, 0.1);
        }

        // Zıplama fiziği
        if (sl.isJumping) {
            sl.verticalVelocity += sl.GRAVITY;
            robot.position.y += sl.verticalVelocity;
            if (robot.position.y <= 0) {
                robot.position.y = 0;
                sl.isJumping = false;
                sl.verticalVelocity = 0;
            }
        }

        // Sınırlar (missions alanı)
        robot.position.x = Math.max(-22, Math.min(22, robot.position.x));
        robot.position.z = Math.max(-8, Math.min(34, robot.position.z));
    }

    // ==========================================
    // YENİ: Görev modu takip kamerası (sensorLab chase benzeri)
    // ==========================================
    _missionChaseCamera(delta) {
        const robot = this.builder.robotGroup;
        if (!robot || this.userOrbiting) return;
        const sl = this.sensorLab;

        const idealOffset = new THREE.Vector3(
            -Math.sin(robot.rotation.y) * 4.5,
            2.0,
            -Math.cos(robot.rotation.y) * 4.5
        );
        const speedWarp = Math.abs(sl.velocity.forward) * 3.0;
        idealOffset.add(new THREE.Vector3(-Math.sin(robot.rotation.y) * speedWarp, 0, -Math.cos(robot.rotation.y) * speedWarp));

        const idealCamPos = robot.position.clone().add(idealOffset);
        this.camera.position.lerp(idealCamPos, 0.05);

        const idealTarget = robot.position.clone().add(new THREE.Vector3(
            Math.sin(robot.rotation.y) * 2.0,
            0.5,
            Math.cos(robot.rotation.y) * 2.0
        ));
        this.controls.target.lerp(idealTarget, 0.08);

        const targetFov = 45 + (Math.abs(sl.velocity.forward) / sl.MAX_SPEED) * 5;
        this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, 0.05);
        this.camera.updateProjectionMatrix();
    }
}

// Uygulamayı başlat
window.addEventListener('DOMContentLoaded', () => {
    window.app = new RobotLabApp();
});
