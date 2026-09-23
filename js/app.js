/**
 * Robot Laboratuvarı - Ana Uygulama Yöneticisi (App Controller)
 * Three.js sahnesi, kamera, ışıklar, aşamalar arası geçiş ve UI bağlamaları.
 */

class RobotLabApp {
    constructor() {
        this.currentStage = 'tutorial'; // 'tutorial' | 'custom_build' | 'sensor_lab'
        this.container = document.getElementById('canvasContainer');

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
        this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
        this.camera.position.set(0, 1.2, 5.8);

        // 3. Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        // 4. OrbitControls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxPolarAngle = Math.PI / 2 + 0.05; // Yerin altına geçmesin
        this.controls.minDistance = 3.0;
        this.controls.maxDistance = 10.0;
        this.controls.target.set(0, 0.2, 0);

        // 5. Işıklar
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
        this.scene.add(this.ambientLight);

        this.dirLight = new THREE.DirectionalLight(0xfffbeb, 1.1);
        this.dirLight.position.set(4, 8, 5);
        this.dirLight.castShadow = true;
        this.dirLight.shadow.mapSize.width = 1024;
        this.dirLight.shadow.mapSize.height = 1024;
        this.dirLight.shadow.bias = -0.001;
        this.scene.add(this.dirLight);

        const fillLight = new THREE.DirectionalLight(0x93c5fd, 0.5);
        fillLight.position.set(-5, 3, -3);
        this.scene.add(fillLight);

        // 6. Çalışma Masası Kaidesi (Studio Pod)
        const podGeo = new THREE.CylinderGeometry(2.4, 2.7, 0.4, 32);
        const podMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.2,
            metalness: 0.1
        });
        this.podMesh = new THREE.Mesh(podGeo, podMat);
        this.podMesh.position.y = -1.4;
        this.podMesh.receiveShadow = true;
        this.scene.add(this.podMesh);

        // Kaide neon halkası
        const ringGeo = new THREE.TorusGeometry(2.45, 0.06, 16, 48);
        ringGeo.rotateX(Math.PI / 2);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x52d4b6 });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.position.y = -1.2;
        this.scene.add(ringMesh);

        window.addEventListener('resize', () => this.onWindowResize());
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

        // Sensör Laboratuvarı Motoru
        this.sensorLab = new SensorLaboratory(this.scene, this.camera, this.renderer, this.builder, this.controls);
        this.sensorLab.setLights(this.ambientLight, this.dirLight);

        // Botti Maskot Bağlantısı
        if (window.Botti) {
            window.Botti.bindElements(
                document.getElementById('bottiSpeechText'),
                document.getElementById('bottiMascot')
            );
        }
    }

    // ==========================================
    // AŞAMALAR ARASI GEÇİŞ (STAGES)
    // ==========================================
    startTutorial() {
        this.currentStage = 'tutorial';
        this.builder.loadTutorialTemplate();

        // UI panellerini ayarla
        document.getElementById('navStage1Btn').classList.add('nav-active');
        document.getElementById('navStage2Btn').classList.remove('nav-active');
        document.getElementById('navStage3Btn').classList.remove('nav-active');

        const workspace = document.querySelector('.main-workspace');
        if (workspace) workspace.classList.remove('sensor-mode', 'full-canvas-mode');

        const drivingHud = document.getElementById('drivingHud');
        if (drivingHud) drivingHud.classList.add('hidden');

        const btnTogglePanel = document.getElementById('btnTogglePanel');
        if (btnTogglePanel) btnTogglePanel.classList.add('hidden');

        document.getElementById('partsPalettePanel').classList.remove('hidden');
        document.getElementById('editControlPanel').classList.remove('hidden');
        document.getElementById('sensorLabPanel').classList.add('hidden');
        document.getElementById('tutorialGuidanceBanner').classList.remove('hidden');

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

        const workspace = document.querySelector('.main-workspace');
        if (workspace) workspace.classList.remove('sensor-mode', 'full-canvas-mode');

        const drivingHud = document.getElementById('drivingHud');
        if (drivingHud) drivingHud.classList.add('hidden');

        const btnTogglePanel = document.getElementById('btnTogglePanel');
        if (btnTogglePanel) btnTogglePanel.classList.add('hidden');

        document.getElementById('partsPalettePanel').classList.remove('hidden');
        document.getElementById('editControlPanel').classList.remove('hidden');
        document.getElementById('sensorLabPanel').classList.add('hidden');
        document.getElementById('tutorialGuidanceBanner').classList.add('hidden');

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

        const workspace = document.querySelector('.main-workspace');
        if (workspace) {
            workspace.classList.add('sensor-mode');
            workspace.classList.remove('full-canvas-mode');
        }

        const drivingHud = document.getElementById('drivingHud');
        if (drivingHud) drivingHud.classList.remove('hidden');

        const btnTogglePanel = document.getElementById('btnTogglePanel');
        if (btnTogglePanel) {
            btnTogglePanel.classList.remove('hidden');
            btnTogglePanel.innerHTML = '<span>👁️ Yönerge Panelini Gizle</span>';
        }

        document.getElementById('partsPalettePanel').classList.add('hidden');
        document.getElementById('editControlPanel').classList.add('hidden');
        document.getElementById('sensorLabPanel').classList.remove('hidden');
        document.getElementById('tutorialGuidanceBanner').classList.add('hidden');

        // Soket göstergelerini kaldır
        this.builder.updateSocketIndicators();

        // 3D Test Parkurunu Başlat (1. İstasyon: Mesafe)
        this.sensorLab.startParkTour(0);

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
            this.startTutorial();
        });

        document.getElementById('navStage2Btn').addEventListener('click', () => {
            if (window.KidAudio) window.KidAudio.playClick();
            this.startCustomBuild();
        });

        document.getElementById('navStage3Btn').addEventListener('click', () => {
            if (window.KidAudio) window.KidAudio.playClick();
            this.startSensorLab();
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
            if (this.currentStage !== 'sensor_lab' || !this.sensorLab) return;

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
                    // Boşluk tuşu: Ses istasyonunda dansı, Hareket istasyonunda koşan karakteri, diğerlerinde kornayı çalar
                    if (this.sensorLab.currentStationIndex === 3) {
                        this.sensorLab.setSoundStationMode('loud');
                    } else if (this.sensorLab.currentStationIndex === 4) {
                        this.sensorLab.runMotionCharacter();
                    } else {
                        if (window.KidAudio) window.KidAudio.playHonk();
                    }
                    handled = true;
                    break;
            }
            if (handled && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
                e.preventDefault();
            }
        });

        window.addEventListener('keyup', e => {
            if (this.currentStage !== 'sensor_lab' || !this.sensorLab) return;
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
    // ANİMASYON DÖNGÜSÜ (RENDER LOOP)
    // ==========================================
    animate(time) {
        requestAnimationFrame(this.animate);

        this.controls.update();

        if (this.builder) {
            this.builder.animate(0.016);
        }

        if (this.currentStage === 'sensor_lab' && this.sensorLab) {
            this.sensorLab.animate(0.016);
        }

        this.renderer.render(this.scene, this.camera);
    }
}

// Uygulamayı başlat
window.addEventListener('DOMContentLoaded', () => {
    window.app = new RobotLabApp();
});
