/**
 * Robot Laboratuvarı - Görev Merkezi & Görev Motoru (Missions)
 * 5.8 Seviye Yapısı  |  5.2 Sensör Kalibrasyon Laboratuvarı  |  5.3 Sensörü Programla
 * 5.4 AI Karar İstasyonu  |  5.6 Arıza Simülasyonu  |  5.7 Serbest Keşif  |  5.14 Karşılaştırma Lab
 * Görev mantığı DOM + robot durumunu yönetir; 3D dekorlar world.js'tedir.
 */

// Sınıf geneli DOM yardımcısı (modül kapsamı)
const $m = (id) => document.getElementById(id);

class MissionController {
    constructor(scene, camera, controls, builder, world, telemetry) {
        this.scene = scene;
        this.camera = camera;
        this.controls = controls;
        this.builder = builder;
        this.world = world;
        this.telemetry = telemetry;

        this.mode = 'missions_hub';  // 'missions_hub' | 'calibration' | 'compare_lab' | 'free' | 'mission' | 'track_builder'
        this.activeMission = null;
        this.missionStep = 0;
        this.stepStart = 0;
        this.aiQueue = [];
        this.malfunction = null;     // { type, corrected, timer }
        this.freeProps = [];
        this.aiStation = null;
        this.turboLift = null;

        // Sürüş yetkisi (serbest keşif dışında mesafe < eşikte otomatik fren)
        this.autobrakeEnabled = true;

        // Tünel farları (5.4 karanlık kararının fiziksel karşılığı)
        this.darkZoneX = 14; // tünel merkezi (istasyon 2)

        // Yükleme & render
        this._bindUI();
        this._buildAIStation();

        this.updateHubUI();
        this.telemetry.renderBadgeShelf();
    }

    // ====================================================
    // 5.8 SEVİYE TANIMLARI
    // ====================================================
    static LEVELS = [
        {
            id: 'L1', name: 'LEVEL 1 — Sensörleri Tanı', icon: '🧭', color: 'mint',
            desc: 'Kalibrasyon odasında mesafe ve RGB sensörünü dene, ölçümleri gözlemle.',
            mission: 'calibration'
        },
        {
            id: 'L2', name: 'LEVEL 2 — Sensörleri Kullan', icon: '🛑', color: 'yellow',
            desc: 'Robot 30 cm\'den yakın engel algılarsa DUR. Basit algoritmayı çalıştır!',
            mission: 'logic_basic',
            code: ['MESAFE < 30 CM', '↓', 'ROBOT DUR']
        },
        {
            id: 'L2b', name: 'LEVEL 2+ — Kaç ve Güvenli Kal', icon: '↩️', color: 'yellow',
            desc: 'DUR → GERİ GİT → ENGELDEN KAÇ. Algoritmayı genişlet!',
            mission: 'logic_escape',
            code: ['MESAFE < 30 CM', '↓', 'DUR', '↓', 'GERİ GİT', '↓', 'ENGELDEN KAÇ']
        },
        {
            id: 'L3', name: 'LEVEL 3 — Birden Fazla Sensör', icon: '🧠', color: 'coral',
            desc: 'AI Karar İstasyonu: robot aynı anda birden fazla sensör verisini yorumlayacak.',
            mission: 'ai_station'
        },
        {
            id: 'L4', name: 'LEVEL 4 — Otonom Robot', icon: '🚀', color: 'sky',
            desc: 'Robot minimum müdahaleyle: engel kaç → karanlık tünel → far → enerji → park.',
            mission: 'autonomous'
        },
        {
            id: 'L5', name: 'LEVEL 5 — Robotik Mühendislik', icon: '🛠️', color: 'pink',
            desc: 'Arıza teşhisi + enerji yönetimi + parkur yapıcı test görevi.',
            mission: 'engineering'
        }
    ];

    _bindUI() {
        const $ = id => document.getElementById(id);
        const on = (id, fn) => { const el = $(id); if (el) el.addEventListener('click', fn); };
        // Görev Merkezi açılışı nav butonundan (app.js) yapılır.
        on('btnCalibration', () => this.startCalibrationLab());
        on('btnCompareLab', () => this.startCompareLab());
        on('btnFreeExplore', () => this.startFreeExplore());
        on('btnTrackBuilder', () => window.TrackBuilderController ? window.TrackBuilderController.enter() : null);

        on('btnCalibBack', () => this.exitToHub());
        on('btnCompareBack', () => this.exitToHub());
        on('btnFreeBack', () => this.exitToHub());
        on('btnMissionBack', () => this.exitToHub());
        on('btnMissionAbort', () => this.failMission('Görev iptal edildi.'));
        on('btnReportClose', () => {
        $m('missionReportModal').classList.add('hidden');
            this.exitToHub();
        });

        // 5.3 Mantık görevi: algoritma çalıştır
        on('btnRunAlgorithm', () => this.runLogicAlgorithm());
        on('btnAlgorithmReset', () => this.resetLogicAlgorithm());
        on('btnResetMalfunction', () => this.resetMalfunction());

        // 5.6 Arıza senaryo seçimi
        document.querySelectorAll('.malfunction-btn').forEach(b => {
            b.addEventListener('click', e => this.startMalfunction(e.currentTarget.dataset.malf));
        });

        // 5.7 Serbest keşif araçları
        document.querySelectorAll('.free-tool-btn').forEach(b => {
            b.addEventListener('click', e => this.onFreeTool(e.currentTarget.dataset.tool));
        });
        on('freeClearProps', () => this.clearFreeProps());

        // 5.2 Kalibrasyon: mesafe hedef listesi
        document.querySelectorAll('.cal-dist-btn').forEach(b => {
            b.addEventListener('click', e => this.setCalibrationDistance(parseInt(e.currentTarget.dataset.cm, 10)));
        });
        on('calLampOn', () => this.setCalLamp(true));
        on('calLampOff', () => this.setCalLamp(false));
        on('calSpeakerOn', () => this.setCalSpeaker(true));
        on('calSpeakerOff', () => this.setCalSpeaker(false));
        on('calHeaterOn', () => this.setCalHeater(true));
        on('calHeaterOff', () => this.setCalHeater(false));

        // 5.17 Hava durumu (missions paneli içinde)
        document.querySelectorAll('.weather-btn').forEach(b => {
            b.addEventListener('click', e => this.setWeatherMode(e.currentTarget.dataset.weather));
        });

        // 5.11 Sinematik yeniden oynatma
        on('btnReplayCinematic', () => {
            if (this.lastCinematic) this.world.playCinematic(this.lastCinematic, this.builder.robotGroup);
        });
    }

    // ====================================================
    // GÖREV MERKEZİ KARTLARI (5.8)
    // ====================================================
    updateHubUI() {
        const wrap = document.getElementById('levelCards');
        if (!wrap) return;
        wrap.innerHTML = '';
        MissionController.LEVELS.forEach((lv, i) => {
            const card = document.createElement('button');
            card.className = `level-card level-${lv.color}`;
            card.innerHTML = `
                <div class="level-card-header">
                    <span class="level-card-icon">${lv.icon}</span>
                    <span class="level-card-name">${lv.name}</span>
                </div>
                <span class="level-card-desc">${lv.desc}</span>
                <span class="level-card-status ${lv.done ? 'done' : 'todo'}">${lv.done ? '✅ TAMAMLANDI' : '▶ BAŞLA'}</span>
                ${lv.code ? `<div class="mission-code-box mini" style="margin:6px 0 0; padding:8px;">${lv.code.map(l => `<div class="code-line ${l === '↓' ? 'code-arrow' : ''}">${l}</div>`).join('')}</div>` : ''}`;
            card.addEventListener('click', () => {
                if (window.KidAudio) window.KidAudio.playClick();
                this.startMissionByLevel(lv, i);
            });
            wrap.appendChild(card);
        });
    }

    startMissionByLevel(lv) {
        switch (lv.mission) {
            case 'calibration': this.startCalibrationLab(); break;
            case 'logic_basic': this.startLogicMission(false); break;
            case 'logic_escape': this.startLogicMission(true); break;
            case 'ai_station': this.startAIMission(); break;
            case 'autonomous': this.startAutonomousMission(); break;
            case 'engineering': this.startEngineeringMission(); break;
            default: if (window.Botti) window.Botti.speak('Bu görev yakında!');
        }
    }

    // ====================================================
    // SAHNE HAZIRLIĞI: robotu parkura taşı
    // ====================================================
    placeRobotAt(pos, rotY = 0) {
        const r = this.builder.robotGroup;
        r.position.copy(pos);
        r.rotation.set(0, rotY, 0);
        r.visible = true;
    }

    // ====================================================
    // GÖREV MERKEZİ (hub = 6 istasyonluk mevcut parkur görünümü)
    // ====================================================
    enterMissions() {
        this.mode = 'missions_hub';
        // Önce sahne kromu (HUD/paneller) hazırlanmalı, SONRA hub paneli açılmalı
        window.app.showSensorsStageChrome(true);
        this.setUIState('missions_hub');
        this.updateHubUI();
        this.placeRobotAt(new THREE.Vector3(0, 0, 6));
        this.world.setWeather('normal');
        if (window.Botti) window.Botti.speak('🎯 <b>Görev Merkezi</b>ne hoş geldin! Bir görev kartı seç ve robotunu test et!');
    }

    exitToHub() {
        this.mode = 'missions_hub';
        this.activeMission = null;
        this.malfunction = null;
        this.clearFreeProps();
        this.world.setWeather('normal');
        this.world.setPIRCone(false);
        this.world.setColorBeam(false);
        this.setUIState('missions_hub');
        this.placeRobotAt(new THREE.Vector3(0, 0, 6));
    }

    // ====================================================
    // UI DURUM MAKİNESİ
    // ====================================================
    setUIState(state) {
        const $ = id => document.getElementById(id);
        const panels = ['missionsHubPanel', 'calibrationPanel', 'comparePanel', 'freeExplorePanel', 'missionPanel', 'trackBuilderPanel'];
        panels.forEach(p => { const el = $(p); if (el) el.classList.add('hidden'); });

        // Görev modlarında sahne kromu (sürüş HUD + sensor-mode grid) her zaman açık;
        // panel açma işlemi bu çağrıdan SONRA yapılır.
        window.app.showSensorsStageChrome(true);

        switch (state) {
        case 'missions_hub': $m('missionsHubPanel').classList.remove('hidden'); this.telemetry.show(); break;
        case 'calibration': $m('calibrationPanel').classList.remove('hidden'); this.telemetry.show(); break;
        case 'compare_lab': $m('comparePanel').classList.remove('hidden'); this.telemetry.show(); break;
        case 'free': $m('freeExplorePanel').classList.remove('hidden'); this.telemetry.show(); break;
        case 'mission': $m('missionPanel').classList.remove('hidden'); this.telemetry.show(); break;
        case 'track_builder': $m('trackBuilderPanel').classList.remove('hidden'); this.telemetry.show(); break;
        }
    }

    // ====================================================
    // 5.2 KALİBRASYON LABORATUVARI
    // ====================================================
    startCalibrationLab() {
        this.mode = 'calibration';
        this.setUIState('calibration');
        this.placeRobotAt(new THREE.Vector3(0, 0, 25.6), 0);
        // Kamerayı odaya sok
        this.controls.target.set(0, 0, 29);
        this.camera.position.set(0, 4.2, 22.5);
        this._subtask = 'mesafe';
        this._showCalSub('mesafe');
        this.calMarker = null;
        if (window.Botti) window.Botti.speak('🔬 <b>Sensör Kalibrasyon Odası</b>na hoş geldin! Mesafe hedeflerinden birini seç ve robotunu çizgiye sür.');
    }

    _showCalSub(sub) {
        document.querySelectorAll('.cal-subpanel').forEach(p => p.classList.add('hidden'));
        const panel = document.getElementById('calSub-' + sub);
        if (panel) panel.classList.remove('hidden');
        document.querySelectorAll('.cal-tab-btn').forEach(b => {
            b.classList.toggle('cal-tab-active', b.dataset.sub === sub);
        });
        this._subtask = sub;
    }

    setCalibrationDistance(cm) {
        // Şerit üzerinde hedef nokta (z=25.6 çizgisi, x=-6..+6)
        const marks = { 100: -6, 75: -3, 50: 0, 25: 3, 10: 6 };
        const x = marks[cm] ?? 0;
        if (this.calMarker) this.scene.remove(this.calMarker);
        const ring = new THREE.Mesh(
            new THREE.TorusGeometry(0.55, 0.05, 10, 28),
            new THREE.MeshBasicMaterial({ color: 0xffd34e })
        );
        ring.rotation.x = Math.PI / 2;
        ring.position.set(x, -1.1, 25.6);
        this.scene.add(ring);
        this.calMarker = ring;
        this._calTargetCm = cm;
        this._calTargetX = x;
        this.calReadingEl = document.getElementById('calGraphReading');
        if (window.Botti) window.Botti.speak(`🎯 Hedef çizgi: <b>${cm} cm</b>. Robotu çizgiye sür ve sensör ne ölçüyor bak!`);
    }

    setCalLamp(on) {
        if (this.world.calLampHead) this.world.calLampHead.material.emissiveIntensity = on ? 1.6 : 0.05;
        if (this.world.calLampLight) this.world.calLampLight.intensity = on ? 1.4 : 0;
        if (on && window.Botti) window.Botti.speak('💡 Işık kaynağı açıldı! Robotunu lambaya yaklaştır, ışık sensörü yüzdesini izle.');
    }
    setCalSpeaker(on) {
        if (this.world.calSpeaker) this.world.calSpeaker.material.color.setHex(on ? 0xff4757 : 0xffd34e);
        if (on && window.KidAudio) window.KidAudio.playDanceBeat();
        if (on && window.Botti) window.Botti.speak('📣 Hoparlör açıldı! Ses seviyesi dB değerini izle.');
    }
    setCalHeater(on) {
        if (this.world.calHeater) this.world.calHeater.material.emissiveIntensity = on ? 1.2 : 0.35;
        if (on && window.Botti) window.Botti.speak('🔥 Isıtıcı çalıştı! Robotu yaklaştır, sıcaklık değerini izle.');
    }

    // ====================================================
    // 5.14 SENSÖR KARŞILAŞTIRMA LABORATUVARI
    // ====================================================
    startCompareLab() {
        this.mode = 'compare_lab';
        this.setUIState('compare_lab');
        this.placeRobotAt(new THREE.Vector3(-14, 0, -4), 0);
        this.controls.target.set(-14, 0, -2);
        this.camera.position.set(-14, 3.5, -8.5);
        // Test engeli
        if (this.compareObstacle) this.scene.remove(this.compareObstacle);
        const obs = new THREE.Group();
        const box = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), new THREE.MeshStandardMaterial({ color: 0xff735c, roughness: 0.3 }));
        box.castShadow = true;
        obs.add(box);
        obs.position.set(-14, -0.6, -0.5);
        this.scene.add(obs);
        this.compareObstacle = obs;
        if (window.Botti) window.Botti.speak('🆚 <b>Karşılaştırma Labı</b>: Aynı engele iki sensörle yaklaş! Ultrasonik cm ölçer, IR sadece VAR/YOK der. Her sensör aynı problemi aynı şekilde çözmez!');
    }

    // ====================================================
    // 5.7 SERBEST KEŞİF MODU
    // ====================================================
    startFreeExplore() {
        this.mode = 'free';
        this.autobrakeEnabled = false;
        this.setUIState('free');
        this.placeRobotAt(new THREE.Vector3(0, 0, 6));
        this.controls.target.set(0, 0, 6);
        this.camera.position.set(0, 3.2, 11);
        if (window.Botti) window.Botti.speak('🗺️ <b>Serbest Keşif Modu</b>: Parkur senin! Araçlarla engel koy, renk ve ışık değiştir, ses üret. Hiçbir görev yok!');
    }

    onFreeTool(tool) {
        const robot = this.builder.robotGroup;
        const fwd = new THREE.Vector3(Math.sin(robot.rotation.y), 0, Math.cos(robot.rotation.y));
        const placePos = robot.position.clone().add(fwd.multiplyScalar(2.2));

        const mk = (geo, color, emissive = 0x000000, ei = 0) => {
            const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.4, emissive, emissiveIntensity: ei }));
            m.castShadow = true;
            return m;
        };

        let prop = null;
        switch (tool) {
            case 'obstacle':
                prop = mk(new THREE.BoxGeometry(0.8, 0.8, 0.8), 0xff735c);
                prop.position.copy(placePos).setY(-0.65);
                break;
            case 'wall':
                prop = mk(new THREE.BoxGeometry(2.4, 1.4, 0.3), 0x243f78);
                prop.position.copy(placePos).setY(-0.35);
                prop.rotation.y = robot.rotation.y + Math.PI / 2;
                break;
            case 'colortile': {
                const colors = [0xff4757, 0x2ed573, 0x1e90ff, 0xffd32e, 0xf8fafc];
                prop = mk(new THREE.BoxGeometry(1.4, 0.1, 1.4), colors[Math.floor(Math.random() * colors.length)]);
                prop.position.copy(placePos).setY(-1.13);
                prop.userData = { isFreeColorTile: true, tileRgb: null };
                break;
            }
            case 'light': {
                prop = mk(new THREE.SphereGeometry(0.3, 14, 10), 0xfff8e7, 0xfff8e7, 1.4);
                prop.position.copy(placePos).setY(1.4);
                const pl = new THREE.PointLight(0xfff8e7, 1.2, 9);
                prop.add(pl);
                prop.userData = { isFreeLight: true };
                break;
            }
            case 'sound': {
                prop = mk(new THREE.BoxGeometry(0.6, 1.2, 0.5), 0x1e293b);
                prop.position.copy(placePos).setY(-0.4);
                prop.userData = { isFreeSound: true };
                break;
            }
            case 'movingtarget': {
                prop = new THREE.Group();
                const head = mk(new THREE.SphereGeometry(0.3, 14, 10), 0xffd34e);
                prop.add(head);
                const body = mk(new THREE.CylinderGeometry(0.18, 0.22, 0.55, 10), 0x52d4b6);
                body.position.y = -0.42; prop.add(body);
                prop.position.copy(placePos).setY(-0.55);
                prop.userData = { isFreeRunner: true, baseX: placePos.x, dir: 1 };
                break;
            }
            case 'ramp': {
                prop = mk(new THREE.BoxGeometry(1.6, 0.12, 1.2), 0x94a3b8);
                prop.position.copy(placePos).setY(-0.85);
                prop.rotation.x = -0.25;
                prop.userData = { isFreeRamp: true };
                break;
            }
            case 'tunnel': {
                prop = new THREE.Group();
                const tubeGeo = new THREE.CylinderGeometry(1.1, 1.1, 3, 18, 1, true, 0, Math.PI);
                tubeGeo.rotateZ(Math.PI / 2);
                tubeGeo.rotateY(-Math.PI / 2);
                const tube = new THREE.Mesh(tubeGeo, new THREE.MeshStandardMaterial({ color: 0x0f172a, side: THREE.DoubleSide, roughness: 0.85 }));
                prop.add(tube);
                prop.position.copy(placePos).setY(0.2);
                prop.userData = { isFreeTunnel: true };
                break;
            }
            case 'sensorstation': {
                prop = new THREE.Group();
                const post = mk(new THREE.CylinderGeometry(0.08, 0.1, 1.8, 10), 0x64748b);
                post.position.y = 0.9; prop.add(post);
                const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.5), new THREE.MeshBasicMaterial({ map: WorldSystem.makePanelTexture(['SENSOR', 'ISTASYONU'], '#52d4b6'), transparent: true }));
                screen.position.y = 1.85; prop.add(screen);
                prop.position.copy(placePos);
                prop.userData = { isFreeStation: true };
                break;
            }
        }

        if (prop) {
            this.scene.add(prop);
            this.freeProps.push(prop);
            if (window.KidAudio) window.KidAudio.playSnap();
        }
    }

    clearFreeProps() {
        this.freeProps.forEach(p => this.scene.remove(p));
        this.freeProps = [];
    }

    // ====================================================
    // 5.3 MANTIK GÖREVLERİ (L2)
    // ====================================================
    startLogicMission(escape) {
        this.mode = 'mission';
        this.activeMission = {
            id: escape ? 'logic_escape' : 'logic_basic',
            name: escape ? 'Algoritma: Dur-GeriGit-Kaç' : 'Acil Dur Algoritması',
            steps: escape
                ? ['Algoritmayı çalıştır (MESAFE<30 → DUR → GERİ → KAÇ)', 'Robotu engele sür ve tepkiyi izle', 'Görev başarılı: robot güvenli mesafede durmalı']
                : ['Algoritmayı çalıştır (MESAFE<30 → DUR)', 'Robotu engele doğru sür', '30 cm içinde otomatik DURma tetiklenmeli'],
            current: 0
        };
        this.setUIState('mission');
        this.missionDone = false; // Görev tetikleyicisini sıfırla
        $m('missionTitle').innerHTML = `🧩 ${this.activeMission.name}`;
        $m('missionCodeBox').innerHTML = (escape ? MissionController.LEVELS[2].code : MissionController.LEVELS[1].code)
            .map(l => `<div class="code-line ${l === '↓' ? 'code-arrow' : ''}">${l}</div>`).join('');
        $m('missionStatusText').innerHTML = '⏳ <b>ALGORİTMA HAZIR.</b> "Algoritmayı Yükle" butonuna bas, sonra robotu engele sür!';
        $m('missionProgress').style.width = '0%';
        $m('btnRunAlgorithm').classList.remove('hidden');
        $m('btnAlgorithmReset').classList.remove('hidden');
        $m('btnResetMalfunction').classList.add('hidden');
        this.algorithmLoaded = false;
        this.placeRobotAt(new THREE.Vector3(0, 0, 0), 0);
        this.controls.target.set(0, 0, 0);
        this.camera.position.set(0, 3, 6);
        if (this.logicObstacle) this.scene.remove(this.logicObstacle);
        const obs = new THREE.Group();
        const box = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), new THREE.MeshStandardMaterial({ color: 0xff735c, roughness: 0.35 }));
        box.castShadow = true;
        obs.add(box);
        obs.position.set(0, -0.65, 3.4);
        this.scene.add(obs);
        this.logicObstacle = obs;
        this.telemetry.beginMission(this.activeMission.name);
        if (window.Botti) window.Botti.speak('🧩 Görev: robot <b>30 cm</b>\'den yakın engel algılarsa <b>durmalı</b>. Önce algoritmayı yükle!');
    }

    runLogicAlgorithm() {
        this.algorithmLoaded = true;
        const box = $m('missionCodeBox');
        box.classList.remove('algo-running'); void box.offsetWidth; box.classList.add('algo-running');
        $m('missionStatusText').innerHTML = '✅ <b>ALGORİTMA YÜKLENDİ.</b> Şimdi robotu ⬆️ ile engele doğru sür!';
        if (window.KidAudio) window.KidAudio.playSuccess();
    }

    resetLogicAlgorithm() {
        this.algorithmLoaded = false;
        $m('missionStatusText').innerHTML = '↺ Algoritma sıfırlandı. Tekrar yükle.';
        if (this.logicObstacle) this.logicObstacle.position.set(0, -0.65, 3.4);
        this.placeRobotAt(new THREE.Vector3(0, 0, 0), 0);
    }

    // ====================================================
    // 5.4 AI KARAR İSTASYONU (L3)
    // ====================================================
    _buildAIStation() {
        const g = new THREE.Group();
        g.name = 'ai_decision_station';
        // Konum: parkurun kuzey köşesi
        const basePos = new THREE.Vector3(-7, 0, 21);
        const pad = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.7, 0.3, 28), new THREE.MeshStandardMaterial({ color: 0xa855f7, roughness: 0.35 }));
        pad.position.set(basePos.x, -1.35, basePos.z);
        pad.receiveShadow = true;
        g.add(pad);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(2.42, 0.05, 10, 40), new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
        ring.rotation.x = Math.PI / 2;
        ring.position.set(basePos.x, -1.18, basePos.z);
        g.add(ring);
        const tex = WorldSystem.makePanelTexture(['AI KARAR', 'ISTASYONU', 'SENSOR FÜZYONU AKTIF'], '#a855f7');
        const screen = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.3), new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide }));
        screen.position.set(basePos.x, 2.3, basePos.z);
        g.add(screen);
        [[-2.0, 0], [2.0, 0]].forEach(([dx]) => {
            const pil = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 2.4, 10), new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.6 }));
            pil.position.set(basePos.x + dx, 0, basePos.z);
            g.add(pil);
        });
        this.scene.add(g);
        this.aiStation = { group: g, pos: basePos.clone() };
    }

    startAIMission() {
        this.mode = 'mission';
        this.activeMission = {
            id: 'ai_station',
            name: 'AI Karar İstasyonu',
            steps: ['Robotu AI istasyonuna sür (mor pad)', '4 sensörden eşzamanlı veri akışını izle', 'Robotun seçtiği davranışı onayla'],
            current: 0
        };
        this.setUIState('mission');
        $m('missionTitle').innerHTML = '🧠 AI Karar İstasyonu';
        $m('missionCodeBox').innerHTML = ['SENSÖR VERİSİ OKU', '↓', 'DURUMU YORUMLA', '↓', 'DAVRANIŞ SEÇ'].map(l => `<div class="code-line ${l === '↓' ? 'code-arrow' : ''}">${l}</div>`).join('');
        $m('missionStatusText').innerHTML = '🤖 <b>KARAR VERİLİYOR...</b> Robotu mor AI padine sür!';
        $m('missionProgress').style.width = '0%';
        $m('btnRunAlgorithm').classList.add('hidden');
        $m('btnAlgorithmReset').classList.add('hidden');
        $m('btnResetMalfunction').classList.add('hidden');
        this.placeRobotAt(new THREE.Vector3(-7, 0, 16), 0);
        this.controls.target.set(-7, 0, 18);
        this.camera.position.set(-7, 3, 23);
        this.aiDecided = false;
        this.telemetry.beginMission(this.activeMission.name);
        if (window.Botti) window.Botti.speak('🧠 Robot artık <b>aynı anda</b> mesafe, ışık, ses ve hareket verisini okuyacak. Padine sür ve karar sürecini izle!');
    }

    _runAIDecision() {
        this.aiDecided = true;
        const t = this.telemetry.data;
        const decisions = [];
        if (t.distance < 30) decisions.push({ icon: '🚨', text: 'Engel algılandı → <b>Frenleme</b>' });
        if (t.light < 25) decisions.push({ icon: '💡', text: 'Karanlık algılandı → <b>Farları aç</b>' });
        if (t.sound > 70) decisions.push({ icon: '📣', text: 'Yüksek ses algılandı → <b>Kaynağa yönel</b>' });
        if (t.motion) decisions.push({ icon: '👀', text: 'Hareket algılandı → <b>Takip modu</b>' });
        if (decisions.length === 0) decisions.push({ icon: '✅', text: 'Ortam güvenli → <b>Devriye devam</b>' });

        const status = $m('missionStatusText');
        status.innerHTML = '🤖 <b>KARAR VERİLİYOR...</b>';
        let i = 0;
        const showNext = () => {
            if (i < decisions.length) {
                const d = decisions[i++];
                status.innerHTML += `<div class="ai-decision-line">${d.icon} ${d.text}</div>`;
                if (window.KidAudio) window.KidAudio.playRobotBeep(600 + i * 120);
                setTimeout(showNext, 700);
            } else {
                $m('missionProgress').style.width = '100%';
                if (window.KidAudio) window.KidAudio.playSuccess();
                this._completeMission(true, 'AI Decision Station');
            }
        };
        setTimeout(showNext, 900);
    }

    // ====================================================
    // 5.6 ARIZA SİMÜLASYONU (L5)
    // ====================================================
    static MALFUNCTIONS = {
        motor: { name: 'Senaryo 1: Sol Motor Yavaşlıyor', desc: 'Robot sağa doğru sapacak. Fark et ve düzelt!' },
        distance: { name: 'Senaryo 2: Mesafe Sensörü Hatalı', desc: 'Sensör geçici yanlış veri gönderiyor. Telemetriyi izle!' },
        color: { name: 'Senaryo 3: RGB Sensörü Karıştırıyor', desc: 'Renk değerleri karışıyor. Doğru rengi teşhis et!' },
        light: { name: 'Senaryo 4: Işık Sensörü Düşük Hassasiyet', desc: 'Sensör düşük hassasiyet moduna geçti.' }
    };

    startMalfunction(type) {
        const def = MissionController.MALFUNCTIONS[type];
        if (!def) return;
        this.mode = 'mission';
        this.activeMission = {
            id: 'malfunction_' + type,
            name: 'Arıza Teşhisi: ' + def.name,
            steps: ['Belirtileri gözlemle (telemetri paneli)', 'Problemi teşhis et', 'Sıfırla düğmesiyle onar'],
            current: 0
        };
        this.malfunction = { type, corrected: false, timer: 0 };
        this.setUIState('mission');
        $m('missionTitle').innerHTML = '🛠️ ' + def.name;
        $m('missionCodeBox').innerHTML = ['BELİRTİYİ GÖZLE', '↓', 'TEŞHİS ET', '↓', 'ONAR'].map(l => `<div class="code-line ${l === '↓' ? 'code-arrow' : ''}">${l}</div>`).join('');
        $m('missionStatusText').innerHTML = `⚠️ <b>${def.desc}</b>`;
        $m('missionProgress').style.width = '0%';
        $m('btnRunAlgorithm').classList.add('hidden');
        $m('btnAlgorithmReset').classList.add('hidden');
        $m('btnResetMalfunction').classList.remove('hidden');
        this.placeRobotAt(new THREE.Vector3(0, 0, 0), 0);
        this.controls.target.set(0, 0, 0);
        this.camera.position.set(0, 3, 6);
        this.telemetry.beginMission(this.activeMission.name);
        this.telemetry.awardBadge('robot_engineer');
        if (window.KidAudio) window.KidAudio.playError();
        if (window.Botti) window.Botti.speak('⚠️ <b>Arıza!</b> ' + def.desc + ' Telemetri panelini izle ve teşhis et!');
    }

    resetMalfunction() {
        if (!this.malfunction) return;
        this.malfunction.corrected = true;
        $m('missionStatusText').innerHTML = '✅ <b>ARIZA GİDERİLDİ!</b> Robot tekrar tam performansında.';
        $m('missionProgress').style.width = '100%';
        if (window.KidAudio) window.KidAudio.playSuccess();
        this.telemetry.awardBadge('robot_engineer');
        this._completeMission(true, this.activeMission.name);
    }

    // ====================================================
    // L4 OTONOM GÖREV + 5.18 FİNAL MİSYON (basitleştirilmiş rota)
    // ====================================================
    startAutonomousMission() {
        this.mode = 'mission';
        this.activeMission = {
            id: 'autonomous',
            name: 'Otonom Robot Görevi',
            steps: ['Robot otonom: engel kaçma', 'Karanlık tünel: farlar otomatik', 'AI istasyonu: sensör füzyonu', 'Enerji istasyonu: şarj', 'Bitişe park'],
            current: 0
        };
        this.setUIState('mission');
        $m('missionTitle').innerHTML = '🚀 Otonom Robot Görevi';
        $m('missionCodeBox').innerHTML = ['SENSÖR OKU', '↓', 'KARAR VER', '↓', 'UYGULA', '↓', 'TEKRARLA'].map(l => `<div class="code-line ${l === '↓' ? 'code-arrow' : ''}">${l}</div>`).join('');
        $m('missionStatusText').innerHTML = '🤖 <b>OTONOM MOD BAŞLADI.</b> Robot rotayı kendisi izliyor... (izle ve öğren!)';
        $m('missionProgress').style.width = '5%';
        ['btnRunAlgorithm', 'btnAlgorithmReset', 'btnResetMalfunction'].forEach(id => $m(id).classList.add('hidden'));
        this.placeRobotAt(new THREE.Vector3(0, 0, -8), 0);
        this.telemetry.beginMission(this.activeMission.name);
        // Otonom rota noktaları: engel → tünel → AI pad → enerji → bitiş
        this.autoRoute = [
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(4, 0, 6),
            new THREE.Vector3(14, 0, 0),   // tünel
            new THREE.Vector3(-7, 0, 21),  // AI pad
            new THREE.Vector3(7, 0, 21),   // enerji pad
            new THREE.Vector3(0, 0, 14)    // bitiş (ses sahnesi)
        ];
        this.autoIndex = 0;
        this.autoHeadlightsAuto = true;
        if (window.Botti) window.Botti.speak('🚀 Robot <b>otonom modda</b>! Sadece izle: kaçacak, fırları yakacak, şarj olacak, park edecek!');
    }

    _updateAutonomous() {
        const robot = this.builder.robotGroup;
        const target = this.autoRoute[this.autoIndex];
        if (!target) return;

        // Hedefe dön
        const toTarget = new THREE.Vector3().subVectors(target, robot.position);
        toTarget.y = 0;
        const dist = toTarget.length();
        const desiredRot = Math.atan2(toTarget.x, toTarget.z);
        let rotDiff = desiredRot - robot.rotation.y;
        while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
        while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
        robot.rotation.y += THREE.MathUtils.clamp(rotDiff, -0.04, 0.04);

        // Tünel içinde farlar otomatik
        const inTunnel = Math.abs(robot.position.x - 14) < 2.2 && Math.abs(robot.position.z) < 2.5;
        if (inTunnel && !this.sensorLabRef().isHeadlightsOn) this.sensorLabRef().toggleHeadlights();
        if (!inTunnel && this.sensorLabRef().isHeadlightsOn && Math.abs(robot.position.x - 14) > 3.2) this.sensorLabRef().toggleHeadlights();

        if (dist > 0.5) {
            robot.position.x += Math.sin(robot.rotation.y) * 0.09;
            robot.position.z += Math.cos(robot.rotation.y) * 0.09;
        } else {
            // Waypoint tamamlandı
            this.autoIndex++;
            const pct = Math.min(100, Math.round((this.autoIndex / this.autoRoute.length) * 100));
            $m('missionProgress').style.width = pct + '%';
            const names = ['Engel aşıldı ✅', 'Tünel geçildi (farlar açıldı) ✅', 'AI istasyonu okundu ✅', 'Enerji istasyonu: şarj ✅', 'Park edildi ✅'];
            if (this.autoIndex <= names.length) $m('missionStatusText').innerHTML = `🤖 ${names[this.autoIndex - 1]}`;
            if (this.autoIndex >= this.autoRoute.length) {
                if (window.KidAudio) window.KidAudio.playFanfare();
                this.world.playCinematic('mission_complete', robot);
                this._completeMission(true, 'Otonom Robot Görevi');
                this.telemetry.awardBadge('autonomous_driver');
            } else if (this.autoIndex === 4) {
                this.telemetry.charge();
            }
        }
    }

    sensorLabRef() { return window.app.sensorLab; }

    // ====================================================
    // L5 MÜHENDİSLİK GÖREVİ (arıza + enerji birleşik)
    // ====================================================
    startEngineeringMission() {
        // Enerji yönetimli sürüş görevi: LED tasarrufu + şarj
        this.mode = 'mission';
        this.activeMission = {
            id: 'engineering',
            name: 'Mühendislik Görevi: Enerji Yönetimi',
            steps: ['Batarya %40 ile başlar', 'Enerji istasyonuna (turuncu pad) sür', 'LED kullanımını minimize et', 'Görevi minimum enerjiyle bitir'],
            current: 0
        };
        this.setUIState('mission');
        $m('missionTitle').innerHTML = '🔋 Enerji Yönetimi Görevi';
        $m('missionCodeBox').innerHTML = ['ENERJİ DURUMU', '↓', 'TÜKETİMİ AZALT', '↓', 'ŞARJ OL', '↓', 'GÖREVİ BİTİR'].map(l => `<div class="code-line ${l === '↓' ? 'code-arrow' : ''}">${l}</div>`).join('');
        $m('missionStatusText').innerHTML = '🔋 Batarya <b>%40</b>. Turuncu <b>Enerji İstasyonuna</b> sür ve şarj ol! Gereksiz LED kullanma.';
        $m('missionProgress').style.width = '0%';
        ['btnRunAlgorithm', 'btnAlgorithmReset', 'btnResetMalfunction'].forEach(id => $m(id).classList.add('hidden'));
        this.telemetry.beginMission(this.activeMission.name);
        // Batarya beginMission sıfırlamasından SONRA %40'a ayarlanır (5.5)
        this.telemetry.energy.total = 40;
        this.telemetry.energy.used = 60;
        this.telemetry.energy.charging = false;
        this.placeRobotAt(new THREE.Vector3(-6, 0, 18), 0);
        this.controls.target.set(-6, 0, 18);
        this.camera.position.set(-6, 3, 25);
        this.energyMissionActive = true;
        this.energyCharged = false;
        if (window.Botti) window.Botti.speak('🔋 Görev: <b>minimum enerji</b> ile istasyona ulaş ve şarj ol! Far gereksizse kapat.');
    }

    // ====================================================
    // GÖREV TAMAMLAMA
    // ====================================================
    _completeMission(passed, nameOverride) {
        const m = this.activeMission;
        if (!m) return;
        $m('missionProgress').style.width = '100%';
        // Seviye kartını tamamlandı olarak işaretle
        const lv = MissionController.LEVELS.find(l => l.mission === m.id);
        if (lv && passed) { lv.done = true; this.updateHubUI(); }
        this.telemetry.showReport({ name: nameOverride || m.name }, passed);
        if (passed) {
            if (m.id === 'logic_basic' || m.id === 'logic_escape') this.telemetry.awardBadge('sensor_master');
            if (m.id === 'engineering') this.telemetry.awardBadge('energy_saver');
            if (m.id === 'autonomous') this.telemetry.awardBadge('precision_driver');
        }
        this.activeMission = null;
    }

    failMission(reason) {
        if (this.activeMission) {
            this.telemetry.showReport({ name: this.activeMission.name }, false);
        }
        this.activeMission = null;
        if (window.KidAudio) window.KidAudio.playError();
        if (window.Botti) window.Botti.speak('📋 ' + reason);
        this.exitToHub();
    }

    // ====================================================
    // HAVA DURUMU (missions panelinden erişilir)
    // ====================================================
    setWeatherMode(mode) {
        const mods = this.world.setWeather(mode);
        document.querySelectorAll('.weather-btn').forEach(b => b.classList.toggle('weather-active', b.dataset.weather === mode));
        if (window.Botti) {
            const names = { normal: 'Normal', dark: 'Karanlık', bright: 'Yoğun Işık', fog: 'Sisli', rain: 'Yağmurlu', lowvis: 'Düşük Görüş' };
            window.Botti.speak(`🌦️ Çevre: <b>${names[mode]}</b>. Sensör etkisi: mesafe gürültüsü %${Math.round(mods.distNoise * 100)}, ışık x${mods.lightMul.toFixed(1)}`);
        }
    }

    // ====================================================
    // HER KARE: SENSÖR SİMÜLASYONU + GÖREV KONTROLLERİ
    // ====================================================
    update(delta, isDriving, speedRatio) {
        const robot = this.builder.robotGroup;
        if (!robot) return;

        // ---- Sürüldü mü? ----
        const driving = isDriving && (this.mode === 'free' || this.mode === 'mission' || this.mode === 'calibration' || this.mode === 'compare_lab' || this.mode === 'missions_hub');

        // ---- SENSÖR SİMÜLASYONU ----
        this._simulateSensors(robot, delta, driving, speedRatio);

        // ---- ENERJİ ----
        const headOn = this.sensorLabRef() ? this.sensorLabRef().isHeadlightsOn : false;
        this.telemetry.updateEnergy(delta, driving, headOn, null, speedRatio);

        // ---- MODA ÖZEL GÜNCELLEMELER ----
        if (this.mode === 'calibration') this._updateCalibration();
        if (this.mode === 'compare_lab') this._updateCompare();
        if (this.mode === 'mission' && this.activeMission) {
            if (this.activeMission.id === 'logic_basic' || this.activeMission.id === 'logic_escape') this._updateLogicMission();
            else if (this.activeMission.id === 'ai_station') this._updateAIMission();
            else if (this.activeMission.id === 'autonomous') this._updateAutonomous();
            else if (this.activeMission.id === 'engineering') this._updateEnergyMission();
            else if (this.activeMission.id.startsWith('malfunction_')) this._updateMalfunction();
        }
        if (this.mode === 'free') this._updateFreeProps(delta);

        // ---- MALFUNCTION etkileri (her modda sürebilir) ----
        this._applyMalfunction(delta);

        this.telemetry.update(delta);
    }

    _simulateSensors(robot, delta, driving, speedRatio = 0) {
        const t = this.telemetry.data;
        const mods = this.world.sensorMod;
        const now = performance.now();
        const sl = this.sensorLabRef();

        // MESAFE: en yakın 3D engel bulundu (logic/color obstacles, ai pad, servo vs. basit raycast yerine yakınlık)
        let nearest = 100;
        const candidates = [];
        if (this.logicObstacle) candidates.push(this.logicObstacle.position);
        if (this.compareObstacle) candidates.push(this.compareObstacle.position);
        if (sl && sl.distanceObstacle) candidates.push(sl.distanceObstacle.position);
        if (this.aiStation) candidates.push(this.aiStation.pos.clone().setY(-0.6));
        this.freeProps.forEach(p => { if (p.userData && (p.userData.isFreeColorTile || p.userData.isFreeRunner || p.userData.isFreeTunnel)) return; candidates.push(p.position); });

        const fwd = new THREE.Vector3(Math.sin(robot.rotation.y), 0, Math.cos(robot.rotation.y));
        candidates.forEach(c => {
            const to = new THREE.Vector3().subVectors(c, robot.position); to.y = 0;
            const dist = to.length();
            const dot = to.normalize().dot(fwd);
            if (dot > 0.55) nearest = Math.min(nearest, dist * 22); // 1 birim ≈ 22 cm (parkur ölçeği)
        });
        // Sınır duvarları ~ ölçek
        nearest = Math.min(nearest, Math.min(22 - Math.abs(robot.position.x), 22 - Math.abs(robot.position.z)) * 22);
        if (nearest < 0) nearest = 4;

        // Hava gürültüsü + arıza
        const noise = (Math.random() - 0.5) * 2 * mods.distNoise * 20;
        let cm = Math.max(2, Math.min(120, nearest + noise));
        if (this.malfunction && this.malfunction.type === 'distance' && !this.malfunction.corrected) {
            if (Math.random() < 0.25) cm = Math.max(4, cm + (Math.random() < 0.5 ? -30 : 45)); // sapık okuma
        }

        const prevDist = t.distance;
        t.distance = cm;
        if (driving) this.telemetry.logMinDistance(Math.round(cm));

        // IŞIK: lamp/ızgara mesafesi + hava
        let lightPct = 95;
        if (this.world.calLampLight) {
            const dl = robot.position.distanceTo(this.world.calLampLight.position);
            lightPct = THREE.MathUtils.clamp(100 - dl * 9, 5, 100);
        }
        lightPct *= mods.lightMul;
        if (this.malfunction && this.malfunction.type === 'light' && !this.malfunction.corrected) lightPct *= 0.25;
        t.light = THREE.MathUtils.clamp(lightPct, 2, 100);

        // SICAKLIK
        let temp = 24;
        if (this.world.calHeater) {
            const dh = robot.position.distanceTo(this.world.calHeater.position);
            if (dh < 6) temp += Math.max(0, (6 - dh) * 4);
        }
        if (sl && this.mode !== 'calibration' && this.mode !== 'compare_lab') {
            const dHeat = robot.position.distanceTo(new THREE.Vector3(12, 0, 15.8));
            const dIce = robot.position.distanceTo(new THREE.Vector3(16, 0, 15.8));
            if (dHeat < 2.5) temp = 42;
            else if (dIce < 2.5) temp = -6;
        }
        t.temp = temp;

        // SES
        let soundDb = 35;
        if (this.world.calSpeaker && this._calSpeakerOn) {
            const ds = robot.position.distanceTo(this.world.calSpeaker.position);
            soundDb = Math.max(35, 95 - ds * 8);
        }
        this.freeProps.forEach(p => {
            if (p.userData && p.userData.isFreeSound) {
                const d = robot.position.distanceTo(p.position);
                if (d < 5) soundDb = Math.max(soundDb, 90 - d * 10);
            }
        });
        if (sl && sl.isDancing) soundDb = Math.max(soundDb, 85);
        soundDb *= mods.soundMul;
        if (driving) soundDb = Math.max(soundDb, 45 + speedRatio * 20); // motor sesi
        t.sound = soundDb;

        // HAREKET (PIR): koşan karakter / runner / movingCharacter
        let motion = false;
        if (sl && sl.movingCharacter) motion = true;
        this.freeProps.forEach(p => { if (p.userData && p.userData.isFreeRunner) motion = true; });
        t.motion = motion;
        this.world.setPIRCone(motion, robot);

        // RGB: zemin/altındaki karo rengi
        let rgb = { r: 128, g: 128, b: 128 };
        let colorName = 'GRİ (varsayılan)';
        // kalibrasyon karoları
        if (this.world.calTiles) {
            this.world.calTiles.forEach(tile => {
                if (robot.position.distanceTo(tile.position) < 1.3) {
                    rgb = { r: tile.userData.tileRgb[0], g: tile.userData.tileRgb[1], b: tile.userData.tileRgb[2] };
                    colorName = tile.userData.tileName;
                }
            });
        }
        // serbest keşif karoları
        this.freeProps.forEach(p => {
            if (p.userData && p.userData.isFreeColorTile && robot.position.distanceTo(p.position) < 1.3) {
                const c = new THREE.Color(p.material.color.getHex());
                rgb = { r: Math.round(c.r * 255), g: Math.round(c.g * 255), b: Math.round(c.b * 255) };
                colorName = 'ÖZEL KARO';
            }
        });
        // legacy color targets
        if (sl && sl.colorTargets && sl.colorTargets.length) {
            sl.colorTargets.forEach(tg => {
                if (robot.position.distanceTo(tg.position) < 1.5) {
                    const c = new THREE.Color(tg.userData.targetData.hex);
                    rgb = { r: Math.round(c.r * 255), g: Math.round(c.g * 255), b: Math.round(c.b * 255) };
                    colorName = tg.userData.targetData.name.toUpperCase();
                }
            });
        }
        t.rgb = rgb;
        this._activeColorName = colorName;

        // AKTİF SENSÖR: hangi değer değişiyor / öne çıkıyor?
        let active = '—';
        if (cm < 45) active = 'MESAFE';
        else if (t.motion) active = 'PIR';
        else if (soundDb > 65) active = 'SES';
        else if (t.light < 40 || t.light > 98) active = 'IŞIK';
        else if (temp !== 24) active = 'SICAKLIK';
        else if (colorName !== 'GRİ (varsayılan)') active = 'RGB';
        t.activeSensor = active;

        // MOD
        t.mode = this.mode === 'mission' ? 'GÖREV: ' + (this.activeMission ? this.activeMission.name : '') :
                 this.mode === 'free' ? 'SERBEST KEŞİF' :
                 this.mode === 'calibration' ? 'KALİBRASYON' :
                 this.mode === 'compare_lab' ? 'KARŞILAŞTIRMA' : 'BEKLEMEDE';

        // MOTOR HIZI (sahte encoder)
        const motorPct = driving ? Math.round(speedRatio * 100) : 0;
        t.motor = motorPct;
        const drift = (this.malfunction && this.malfunction.type === 'motor' && !this.malfunction.corrected) ? 25 : 0;
        t.leftMotor = Math.max(0, motorPct - drift);
        t.rightMotor = motorPct;
        this.telemetry.logSpeed(motorPct);

        // SENSÖR VFX: ultrasonik ping (yaklaşınca)
        if (cm < 60 && Math.random() < 0.12 && driving) {
            this.world.spawnUltrasonicPing(robot);
        }
        // RGB beam: renk karosunun üstünde
        this.world.setColorBeam(colorName !== 'GRİ (varsayılan)' && this.mode !== 'free', robot);
    }

    // ---- Kalibrasyon güncellemesi: mini grafik + soru ----
    _updateCalibration() {
        const robot = this.builder.robotGroup;
        const t = this.telemetry.data;
        const graphEl = document.getElementById('calGraphReading');
        const realEl = document.getElementById('calRealDistance');
        if (!graphEl || !realEl) return;

        if (this._subtask === 'mesafe') {
            // Robot şeritte mi? Çizgiler z=25.6 üzerinde x=-6..6
            const onStrip = Math.abs(robot.position.z - 25.6) < 1.4 && Math.abs(robot.position.x) <= 6.5;
            const realCm = onStrip ? Math.round(robot.position.x >= 0 ? (6 - Math.abs(robot.position.x)) / 6 * 95 + 5 : 100) : null;

            // Gerçek mesafe: işaretlere göre simüle (x=-6 → 100cm, x=6 → 10cm)
            let real = null;
            if (onStrip) {
                const rel = (6 - robot.position.x) / 12; // 0..1 (soldan sağa)
                real = Math.round(100 - rel * 90);       // 100..10 cm
            }
            realEl.innerHTML = real !== null ? `✅ Şeritte | Çizgi: <b>${real} cm</b> | Sensör: <b>${Math.round(t.distance)} cm</b>` : 'Robotu ölçüm şeridine sür (turuncu çizgi).';
            graphEl.innerHTML = real !== null ? `<span class="graph-bar" style="width:${Math.min(100, t.distance)}%; background:${Math.abs(t.distance - real) < 4 ? '#52d4b6' : '#ff735c'}"></span>` : '';
            graphEl.innerHTML += real !== null ? `<span class="graph-label">${Math.abs(t.distance - real) < 4 ? '✅ Gerçek ile ölçüm AYNI' : '⚠️ Fark: ' + Math.abs(Math.round(t.distance) - real) + ' cm'}</span>` : '';
        } else if (this._subtask === 'rgb') {
            realEl.innerHTML = `Renk altında: <b>${this._activeColorName}</b> | RGB: <b>${t.rgb.r} / ${t.rgb.g} / ${t.rgb.b}</b>`;
            graphEl.innerHTML = `<div class="rgb-preview" style="background:rgb(${t.rgb.r},${t.rgb.g},${t.rgb.b})"></div>`;
            // RGB görev tamamlandı işareti: beyaz karo
            if (this._activeColorName === 'BEYAZ' && !this._calRgbDone) {
                this._calRgbDone = true;
                if (window.KidAudio) window.KidAudio.playSuccess();
                this.telemetry.awardBadge('sensor_master');
            }
        } else {
            realEl.innerHTML = `Işık: <b>${Math.round(t.light)}%</b> | Sıcaklık: <b>${t.temp.toFixed(1)}°C</b> | Ses: <b>${Math.round(t.sound)} dB</b>`;
            graphEl.innerHTML = '';
        }
    }

    // ---- Karşılaştırma lab: iki sensör yan yana ----
    _updateCompare() {
        const el = document.getElementById('compareReadout');
        if (!el) return;
        const t = this.telemetry.data;
        const robot = this.builder.robotGroup;
        if (!this.compareObstacle) return;
        const d = robot.position.distanceTo(this.compareObstacle.position) * 22;
        const inRange = d < 60;
        el.innerHTML = `
            <div class="compare-row"><span class="compare-badge ultrasonic">ULTRASONİK</span><span>Mesafe: <b>${Math.round(t.distance)} cm</b></span></div>
            <div class="compare-row"><span class="compare-badge ir">IR SENSÖR</span><span>Algılama: <b>${inRange ? 'VAR ⚠️' : 'YOK ✅'}</b></span></div>
            <p class="compare-note">💡 ${inRange ? 'IR sensör sadece VAR/YOK der; ultrasonik kaç cm olduğunu söyler.' : 'İki sensör de henüz tetiklenmedi — yaklaş!'}</p>`;
    }

    // ---- Mantık görevi: otomatik fren kontrolü ----
    _updateLogicMission() {
        const robot = this.builder.robotGroup;
        if (!this.logicObstacle || !this.algorithmLoaded || this.missionDone) return;
        const t = this.telemetry.data;
        // XZ düzleminde mesafe (yükseklik dahil edilmez)
        const dx = robot.position.x - this.logicObstacle.position.x;
        const dz = robot.position.z - this.logicObstacle.position.z;
        const distCm = Math.sqrt(dx * dx + dz * dz) * 22;
        const threshold = 30;

        if (distCm < threshold) {
            // MESAFE < 30 CM → ROBOT DUR (gerçek fren: hızı kes + geri it)
            const sl = this.sensorLabRef();
            sl.velocity.forward = 0;
            this.builder.robotGroup.position.addScaledVector(
                new THREE.Vector3(Math.sin(robot.rotation.y), 0, Math.cos(robot.rotation.y)), -0.06
            );
            this.missionDone = true;
            this.telemetry.logReaction(true);
            $m('missionStatusText').innerHTML = '🛑 <b>ALGORİTMA ÇALIŞTI!</b> MESAFE < 30 CM → ROBOT DURdu.';
            $m('missionProgress').style.width = '100%';
            if (window.KidAudio) window.KidAudio.playSuccess();
            this.world.playCinematic('brake', robot);
            const escape = this.activeMission.id === 'logic_escape';
            if (escape) {
                // Kaçma fazı: otomatik geri git + dön
                let phase = 0;
                const escapeInterval = setInterval(() => {
                    const r = this.builder.robotGroup;
                    if (phase < 30) {
                        r.position.x -= Math.sin(r.rotation.y) * 0.06;
                        r.position.z -= Math.cos(r.rotation.y) * 0.06;
                    } else if (phase < 60) {
                        r.rotation.y += 0.08;
                    }
                    phase++;
                    if (phase >= 60) {
                        clearInterval(escapeInterval);
                        $m('missionStatusText').innerHTML = '↩️ <b>DUR → GERİ GİT → ENGELDEN KAÇ tamamlandı!</b>';
                        if (window.KidAudio) window.KidAudio.playFanfare();
                        this._completeMission(true, 'Algoritma: Dur-GeriGit-Kaç');
                    }
                }, 33);
                return;
            }
            this._completeMission(true, 'Acil Dur Algoritması');
            this.telemetry.awardBadge('sensor_master');
        }
    }

    _updateAIMission() {
        const robot = this.builder.robotGroup;
        if (this.aiDecided || !this.aiStation) return;
        if (robot.position.distanceTo(this.aiStation.pos) < 2.4) {
            this.world.playCinematic('first_detection', robot);
            this._runAIDecision();
        }
    }

    _updateEnergyMission() {
        const robot = this.builder.robotGroup;
        const stationPos = new THREE.Vector3(7, 0, 21);
        // Enerji padini missions hub'ında göster (yerde işaret)
        if (!this.energyPad) {
            const pad = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.8, 0.14, 24), new THREE.MeshStandardMaterial({ color: 0xff9f43, roughness: 0.4, emissive: 0xff9f43, emissiveIntensity: 0.25 }));
            pad.position.set(stationPos.x, -1.32, stationPos.z);
            this.scene.add(pad);
            this.energyPad = pad;
        }
        if (!this.energyCharged && robot.position.distanceTo(stationPos) < 2.2) {
            this.energyCharged = true;
            this.telemetry.charge();
            $m('missionStatusText').innerHTML = '⚡ <b>ŞARJ EDİLİYOR...</b> Batarya doluyor!';
            setTimeout(() => {
                $m('missionStatusText').innerHTML = '✅ <b>ŞARJ TAMAM!</b> Görev minimum enerjiyle tamamlandı.';
                $m('missionProgress').style.width = '100%';
                if (window.KidAudio) window.KidAudio.playFanfare();
                this._completeMission(true, 'Enerji Yönetimi Görevi');
            }, 2200);
        }
    }

    _updateMalfunction() {
        // Görsel efekt: motor arızasında robot sapması
        if (this.malfunction && this.malfunction.type === 'motor' && !this.malfunction.corrected) {
            const robot = this.builder.robotGroup;
            const sl = this.sensorLabRef();
            if (Math.abs(sl.velocity.forward) > 0.01) {
                robot.rotation.y -= 0.004; // sağa sürüklenme
            }
        }
    }

    _applyMalfunction(delta) {
        if (!this.malfunction || this.malfunction.corrected) return;
        this.malfunction.timer += delta;
        // Renk arızası: telemetri RGB'sinde karıştırma
        if (this.malfunction.type === 'color') {
            const t = this.telemetry.data.rgb;
            // her ~1.2 sn'de kanallar yer değiştirir
            if (Math.random() < delta * 0.8) {
                const tmp = t.r;
                t.r = t.b; t.b = tmp;
            }
        }
    }

    // ---- Serbest keşif props animasyonları ----
    _updateFreeProps(delta) {
        this.freeProps.forEach(p => {
            const u = p.userData;
            if (!u) return;
            if (u.isFreeRunner) {
                p.position.x += u.dir * delta * 2.2;
                if (Math.abs(p.position.x - u.baseX) > 4) u.dir *= -1;
                p.position.y = -0.55 + Math.abs(Math.sin(p.position.x * 3)) * 0.18;
                p.rotation.y = u.dir > 0 ? 0 : Math.PI;
            }
        });
    }
}

window.MissionController = MissionController;
