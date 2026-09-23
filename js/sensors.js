/**
 * Robot Laboratuvarı - 3D Sensör Test Parkuru (Test Arenası) & Yönerge Motoru
 * Robot istasyondan istasyona yürür/gezer, her istasyonda öğrenciye yazılı yönergeler
 * ve canlı robot telemetri raporu sunulur.
 */

class SensorLaboratory {
    constructor(scene, camera, renderer, builder, controls) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.builder = builder;
        this.controls = controls;

        this.currentStationIndex = 0;
        this.isTravelling = false;
        this.travelProgress = 0;
        this.travelStartPos = new THREE.Vector3();
        this.travelTargetPos = new THREE.Vector3();

        this.driveState = {
            up: false,
            down: false,
            left: false,
            right: false
        };
        this.isHeadlightsOn = false;

        // 6 İstasyonun Bilgileri, Konumları ve Öğrenci Yönergeleri
        this.stations = [
            {
                id: 'distance',
                name: '1. Mesafe & Engel Parkuru',
                icon: '📏',
                pos: new THREE.Vector3(0, 0, 0),
                camOffset: new THREE.Vector3(0, 2.5, 6.5),
                title: 'Mesafe Sensörü Test İstasyonu',
                purpose: 'Mesafe sensörleri, robotların önlerindeki engelleri ve duvarları görmesini, kazaları önlemesini sağlar.',
                steps: [
                    'Adım 1: Yön tuşlarıyla (⬆️ İleri / W) robotunu önündeki turuncu engele doğru sür!',
                    'Adım 2: Robot yaklaştıkça mesafe sensörünün bip sesini ve azalan cm değerini takip et.',
                    'Adım 3: 20 cm kaldığında robotun acil fren yapıp durduğunu gözlemle!'
                ],
                controlType: 'distance',
                telemetryInit: 'Durum: Yol Açık (⬆️ tuşuyla engele sür)',
                completed: false
            },
            {
                id: 'light',
                name: '2. Karanlık Işık Tüneli',
                icon: '🌙',
                pos: new THREE.Vector3(14, 0, 0),
                camOffset: new THREE.Vector3(0, 2.5, 6.5),
                title: 'Işık Sensörü (LDR) Test İstasyonu',
                purpose: 'Işık sensörleri çevredeki aydınlık miktarını ölçer. Gece veya tünellerde otomatik farların yanmasını sağlar.',
                steps: [
                    'Adım 1: Yön tuşlarıyla (⬆️) robotunu sürerek tünelin içine sok!',
                    'Adım 2: Tünele girdiğinde farların otomatik yandığını gözlemle.',
                    'Adım 3: [L] tuşuna basarak farları manuel açıp kapatmayı dene!'
                ],
                controlType: 'light',
                telemetryInit: 'Ortam Işığı: %100 (Aydınlık) | ⬆️ Tünele sür',
                completed: false
            },
            {
                id: 'temp',
                name: '3. Isı & İklim Odası',
                icon: '🔥',
                pos: new THREE.Vector3(14, 0, 14),
                camOffset: new THREE.Vector3(0, 2.5, 6.5),
                title: 'Isı Sensörü Test İstasyonu',
                purpose: 'Isı sensörleri robotun motorlarının ve çiplerinin aşırı ısınıp bozulmasını engeller.',
                steps: [
                    'Adım 1: ⬅️ / ⬆️ tuşlarıyla robotunu soldaki ATEŞ SÜTUNUNA (🔥) yanaştır.',
                    'Adım 2: Sıcaklığı hissedince fanlarının hızla dönüp buhar çıkardığını izle!',
                    'Adım 3: Şimdi sağdaki BUZ SÜTUNUNA (❄️) sür ve robotun titreyişini incele!'
                ],
                controlType: 'temp',
                telemetryInit: 'Sıcaklık: 24°C (Normal) | Sütunlara yanaş',
                completed: false
            },
            {
                id: 'sound',
                name: '4. Ses & Akustik Sahnesi',
                icon: '📣',
                pos: new THREE.Vector3(0, 0, 14),
                camOffset: new THREE.Vector3(0, 2.5, 6.5),
                title: 'Ses Sensörü (Mikrofon) Test İstasyonu',
                purpose: 'Ses sensörleri ortamdaki alkış, konuşma ve müzik gibi ses dalgalarını algılar.',
                steps: [
                    'Adım 1: ⬆️ tuşuyla robotunu hoparlörlerin arasındaki sahneye doğru sür.',
                    'Adım 2: [BOŞLUK / SPACE] tuşuna veya "Yüksek Ses" butonuna bas!',
                    'Adım 3: Robotunun müzik ritmiyle dans edişini izle!'
                ],
                controlType: 'sound',
                telemetryInit: 'Ses Düzeyi: 40 dB | [SPACE] ile müzik aç',
                completed: false
            },
            {
                id: 'motion',
                name: '5. Hareket Takip Pisti',
                icon: '🏃',
                pos: new THREE.Vector3(-14, 0, 14),
                camOffset: new THREE.Vector3(0, 2.5, 6.5),
                title: 'Hareket Sensörü (PIR) Test İstasyonu',
                purpose: 'Hareket sensörleri önünden geçen insan, hayvan veya araçları anında fark eder.',
                steps: [
                    'Adım 1: Robotunu kapının önündeki gözlem çizgisine getir.',
                    'Adım 2: [H] tuşuna veya "Karakteri Yürüt" düğmesine tıkla.',
                    'Adım 3: Robotunun kafasını çevirip hareket eden arkadaşını takip edişini gör!'
                ],
                controlType: 'motion',
                telemetryInit: 'PIR Sensör: [H] ile karakteri koştur',
                completed: false
            },
            {
                id: 'color',
                name: '6. Renk Seçim Meydanı',
                icon: '🔵',
                pos: new THREE.Vector3(-14, 0, 0),
                camOffset: new THREE.Vector3(0, 2.5, 6.5),
                title: 'RGB Renk Sensörü Test İstasyonu',
                purpose: 'Renk sensörleri fabrikalarda ürünleri renklerine göre ayırır ve robotun doğru hedefi bulmasını sağlar.',
                steps: [
                    'Adım 1: Robotunu ortadaki MAVİ KÜP kaidesine doğru sür!',
                    'Adım 2: Mavi küpe dokunduğunda renk sensörünün parıldamasını izle!',
                    'Adım 3: Tüm test parkurunu başarıyla tamamla ve diplomanı al!'
                ],
                controlType: 'color',
                telemetryInit: 'Hedef: Mavi küpün üzerine sür!',
                completed: false
            }
        ];

        this.parkGroup = new THREE.Group();
        this.parkGroup.name = 'sensor_test_park';
        this.scene.add(this.parkGroup);

        // Dinamik Deney Objeleri
        this.distanceObstacle = null;
        this.movingCharacter = null;
        this.colorTargets = [];
        this.heatParticles = [];
        this.tunnelMesh = null;

        this.ambientLightRef = null;
        this.dirLightRef = null;

        this.isDancing = false;
        this.isSleeping = false;
        this.isShivering = false;

        this.build3DTestPark();
    }

    setLights(ambient, dir) {
        this.ambientLightRef = ambient;
        this.dirLightRef = dir;
    }

    // ===================================================
    // 3D TEST PARKURU SAHNESİ VE DEKORLARININ İNŞASI
    // ===================================================
    build3DTestPark() {
        // 1. Zemin Yolu (İstasyonları birbirine bağlayan geniş asfalt pist)
        const roadMat = new THREE.MeshStandardMaterial({
            color: 0x334155,
            roughness: 0.8
        });

        // 4 ana bağlantı yolu (Kare formunda pist)
        const roads = [
            { w: 18, h: 4, x: 7, z: 0, rot: 0 },
            { w: 4, h: 18, x: 14, z: 7, rot: 0 },
            { w: 18, h: 4, x: 7, z: 14, rot: 0 },
            { w: 4, h: 18, x: 0, z: 7, rot: 0 },
            { w: 18, h: 4, x: -7, z: 14, rot: 0 },
            { w: 4, h: 18, x: -14, z: 7, rot: 0 },
            { w: 18, h: 4, x: -7, z: 0, rot: 0 }
        ];

        roads.forEach(r => {
            const geo = new THREE.PlaneGeometry(r.w, r.h);
            geo.rotateX(-Math.PI / 2);
            const mesh = new THREE.Mesh(geo, roadMat);
            mesh.position.set(r.x, -1.39, r.z);
            mesh.receiveShadow = true;
            this.parkGroup.add(mesh);
        });

        // Yol çizgileri (Sarı kesikli şeritler)
        const lineMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
        const lineGeo = new THREE.PlaneGeometry(1.2, 0.2);
        lineGeo.rotateX(-Math.PI / 2);

        for (let x = 1; x < 13; x += 2.5) {
            const line = new THREE.Mesh(lineGeo, lineMat);
            line.position.set(x, -1.38, 0);
            this.parkGroup.add(line);
        }

        // İstasyon Zemin Platformları (Daire Podlar)
        this.stations.forEach((st, idx) => {
            const podGeo = new THREE.CylinderGeometry(3.5, 3.8, 0.3, 32);
            const podColors = [0x52d4b6, 0x243f78, 0xff735c, 0xff8bbb, 0x38bdf8, 0xa855f7];
            const podMat = new THREE.MeshStandardMaterial({
                color: podColors[idx % podColors.length],
                roughness: 0.3
            });
            const pod = new THREE.Mesh(podGeo, podMat);
            pod.position.set(st.pos.x, -1.4, st.pos.z);
            pod.receiveShadow = true;
            this.parkGroup.add(pod);

            // İstasyon Numarası Tabela Direği
            const poleGeo = new THREE.CylinderGeometry(0.1, 0.1, 3.2, 12);
            const pole = new THREE.Mesh(poleGeo, new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.6 }));
            pole.position.set(st.pos.x - 2.8, 0.2, st.pos.z - 2.8);
            this.parkGroup.add(pole);

            // Tabela Kutusu
            const signGeo = new THREE.BoxGeometry(1.4, 0.9, 0.15);
            const sign = new THREE.Mesh(signGeo, new THREE.MeshStandardMaterial({ color: 0xffd34e }));
            sign.position.set(st.pos.x - 2.8, 1.8, st.pos.z - 2.8);
            this.parkGroup.add(sign);
        });

        // ==========================================
        // İSTASYON ÖZEL DEKORLARI
        // ==========================================

        // 1. İstasyon: Mesafe Bariyeri & Koniler
        [-1.8, 1.8].forEach(x => {
            const coneGeo = new THREE.ConeGeometry(0.25, 0.7, 16);
            const coneMat = new THREE.MeshStandardMaterial({ color: 0xff4757 });
            const cone = new THREE.Mesh(coneGeo, coneMat);
            cone.position.set(x, -1.05, 2.8);
            this.parkGroup.add(cone);
        });

        // 2. İstasyon: Işık Tüneli (Kemerli Karanlık Tünel)
        const tunnelGeo = new THREE.CylinderGeometry(2.4, 2.4, 4.2, 24, 1, true, 0, Math.PI);
        tunnelGeo.rotateZ(Math.PI / 2);
        tunnelGeo.rotateY(-Math.PI / 2);
        const tunnelMat = new THREE.MeshStandardMaterial({
            color: 0x0f172a,
            side: THREE.DoubleSide,
            roughness: 0.9
        });
        this.tunnelMesh = new THREE.Mesh(tunnelGeo, tunnelMat);
        this.tunnelMesh.position.set(14, 0.8, 0);
        this.tunnelMesh.castShadow = true;
        this.parkGroup.add(this.tunnelMesh);

        // 3. İstasyon: Isı Odası (Ateş ve Buz Sütunları)
        const heatPillar = new THREE.Mesh(
            new THREE.CylinderGeometry(0.4, 0.4, 2.5, 16),
            new THREE.MeshStandardMaterial({ color: 0xff4757, emissive: 0xff0000, emissiveIntensity: 0.4 })
        );
        heatPillar.position.set(12, -0.1, 15.8);
        this.parkGroup.add(heatPillar);

        const icePillar = new THREE.Mesh(
            new THREE.CylinderGeometry(0.4, 0.4, 2.5, 16),
            new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.4 })
        );
        icePillar.position.set(16, -0.1, 15.8);
        this.parkGroup.add(icePillar);

        // 4. İstasyon: Ses Sahnesi Hoparlörleri
        [-2.4, 2.4].forEach(x => {
            const spkGeo = new THREE.BoxGeometry(0.9, 1.8, 0.8);
            const spkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b });
            const spk = new THREE.Mesh(spkGeo, spkMat);
            spk.position.set(x, -0.5, 16);
            this.parkGroup.add(spk);

            // Hoparlör konileri
            [0.2, -0.3].forEach(y => {
                const cGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.1, 16);
                cGeo.rotateX(Math.PI / 2);
                const c = new THREE.Mesh(cGeo, new THREE.MeshStandardMaterial({ color: 0xffd34e }));
                c.position.set(x, -0.5 + y, 15.55);
                this.parkGroup.add(c);
            });
        });

        // 5. İstasyon: Hareket Pisti Başlangıç Kapısı
        const gateGeo = new THREE.TorusGeometry(1.6, 0.12, 12, 24, Math.PI);
        const gate = new THREE.Mesh(gateGeo, new THREE.MeshStandardMaterial({ color: 0x52d4b6 }));
        gate.position.set(-14, 0.3, 11.5);
        this.parkGroup.add(gate);

        // 6. İstasyon: Renk Meydanı Kaideleri
        [-2.0, 0, 2.0].forEach((x, idx) => {
            const pColors = [0xff4757, 0x1e90ff, 0x2ed573];
            const pGeo = new THREE.CylinderGeometry(0.6, 0.7, 0.5, 16);
            const pMesh = new THREE.Mesh(pGeo, new THREE.MeshStandardMaterial({ color: pColors[idx] }));
            pMesh.position.set(-14 + x, -1.15, -2.5);
            this.parkGroup.add(pMesh);
        });
    }

    // ===================================================
    // İSTASYON GEZİNTİSİ & YUMUŞAK HAREKET (NAVIGATION)
    // ===================================================
    startParkTour(stationIndex = 0) {
        this.currentStationIndex = stationIndex;
        const targetSt = this.stations[this.currentStationIndex];

        // Robotu istasyona yerleştir
        if (this.builder && this.builder.robotGroup) {
            this.builder.robotGroup.position.copy(targetSt.pos);
            this.builder.robotGroup.rotation.set(0, 0, 0);
        }

        // Kamerayı istasyona odakla
        this.controls.target.copy(targetSt.pos);
        this.camera.position.copy(targetSt.pos).add(targetSt.camOffset);
        this.controls.update();

        this.setupStationExperiment(targetSt);
        this.updateInstructionCard(targetSt);
    }

    goToStation(targetIndex) {
        if (targetIndex < 0 || targetIndex >= this.stations.length || this.isTravelling) return;

        this.isTravelling = true;
        this.travelProgress = 0;
        this.travelStartPos.copy(this.builder.robotGroup.position);
        this.travelTargetPos.copy(this.stations[targetIndex].pos);

        // Gezinti sırasında robotun gideceği yöne dönmesi
        const dir = new THREE.Vector3().subVectors(this.travelTargetPos, this.travelStartPos).normalize();
        const targetRotY = Math.atan2(dir.x, dir.z);
        this.builder.robotGroup.rotation.y = targetRotY;

        // Botti anons yapsın
        if (window.Botti) {
            window.Botti.speak(`🚗 Harika! Şimdi <b>${this.stations[targetIndex].name}</b>'na doğru yola çıkıyoruz!`);
        }
        if (window.KidAudio) {
            window.KidAudio.playRotate();
        }

        this.currentStationIndex = targetIndex;
    }

    nextStation() {
        if (this.currentStationIndex < this.stations.length - 1) {
            this.goToStation(this.currentStationIndex + 1);
        } else {
            // Son istasyon da bitti, büyük zafer kutlaması
            this.triggerGrandCelebration();
        }
    }

    prevStation() {
        if (this.currentStationIndex > 0) {
            this.goToStation(this.currentStationIndex - 1);
        }
    }

    // ===================================================
    // İSTASYON DENEYLERİ KURULUMU
    // ===================================================
    setupStationExperiment(st) {
        this.clearDynamicObjects();
        this.resetRobotPose();

        switch (st.id) {
            case 'distance':
                this.setupDistanceStation(st);
                break;
            case 'light':
                this.setupLightStation(st);
                break;
            case 'temp':
                this.setupTempStation(st);
                break;
            case 'sound':
                this.setupSoundStation(st);
                break;
            case 'motion':
                this.setupMotionStation(st);
                break;
            case 'color':
                this.setupColorStation(st);
                break;
        }

        this.updateTelemetry(st.telemetryInit);
    }

    clearDynamicObjects() {
        if (this.distanceObstacle) {
            this.scene.remove(this.distanceObstacle);
            this.distanceObstacle = null;
        }
        if (this.movingCharacter) {
            this.scene.remove(this.movingCharacter);
            this.movingCharacter = null;
        }
        this.colorTargets.forEach(t => this.scene.remove(t));
        this.colorTargets = [];

        this.heatParticles.forEach(pt => this.scene.remove(pt.mesh));
        this.heatParticles = [];

        // Sahne ışıklarını ve arka planı normale al
        if (this.ambientLightRef) this.ambientLightRef.intensity = 0.85;
        if (this.dirLightRef) this.dirLightRef.intensity = 1.1;
        this.scene.background = new THREE.Color(0xf0f9ff);
    }

    resetRobotPose() {
        this.isDancing = false;
        this.isSleeping = false;
        this.isShivering = false;
        if (this.builder && this.builder.attachedParts.head) {
            this.builder.attachedParts.head.rotation.set(0, 0, 0);
        }
        this.setRobotHeadlights(false);
    }

    // 1. Mesafe İstasyonu
    setupDistanceStation(st) {
        const boxGeo = new THREE.BoxGeometry(1.0, 1.0, 1.0);
        const boxMat = new THREE.MeshStandardMaterial({ color: 0xff735c, roughness: 0.3 });
        const box = new THREE.Mesh(boxGeo, boxMat);
        box.castShadow = true;

        const group = new THREE.Group();
        group.add(box);
        group.position.set(st.pos.x, -0.65, st.pos.z + 3.5);
        this.scene.add(group);
        this.distanceObstacle = group;
    }

    setDistanceSliderVal(valPercent) {
        if (!this.distanceObstacle) return;
        const st = this.stations[0];
        const z = st.pos.z + 1.3 + (valPercent / 100) * 3.2;
        this.distanceObstacle.position.z = z;

        const cm = Math.round(15 + (valPercent / 100) * 85);
        const distLabel = document.getElementById('distanceDisplay');
        if (distLabel) distLabel.innerText = `${cm} cm`;

        if (window.KidAudio) {
            window.KidAudio.playSensorAlert(1 - (valPercent / 100));
        }

        if (cm <= 25) {
            this.updateTelemetry(`🚨 [Mesafe]: ${cm} cm | ENGEL TESPİT EDİLDİ (ACİL FREN YAPILDI)`);
            this.markStationDone('distance');
        } else {
            this.updateTelemetry(`[Mesafe]: ${cm} cm | Yol Açık, ilerleme güvenli.`);
        }
    }

    // 2. Işık İstasyonu
    setupLightStation(st) {
        // Tünel ortamı hazır
    }

    setLightStationMode(mode) {
        if (mode === 'dark') {
            this.scene.background = new THREE.Color(0x0a0f1d);
            if (this.ambientLightRef) this.ambientLightRef.intensity = 0.15;
            if (this.dirLightRef) this.dirLightRef.intensity = 0.2;
            this.setRobotHeadlights(true);
            this.updateTelemetry('💡 [Işık Sensörü]: Işık Azaldı (%10) | OTOMATİK FARLAR AÇILDI');
            this.markStationDone('light');
            if (window.KidAudio) window.KidAudio.playSnap();
        } else {
            this.scene.background = new THREE.Color(0xf0f9ff);
            if (this.ambientLightRef) this.ambientLightRef.intensity = 0.85;
            if (this.dirLightRef) this.dirLightRef.intensity = 1.1;
            this.setRobotHeadlights(false);
            this.updateTelemetry('☀️ [Işık Sensörü]: Işık Bol (%95) | Gündüz Enerji Tasarrufu');
            if (window.KidAudio) window.KidAudio.playClick();
        }
    }

    setRobotHeadlights(on) {
        this.isHeadlightsOn = !!on;
        if (!this.builder || !this.builder.robotGroup) return;
        this.builder.robotGroup.traverse(child => {
            if (child.name === 'eye' || child.name === 'powerCore' || child.name === 'antennaLight') {
                if (child.material) {
                    child.material.emissiveIntensity = on ? 2.8 : 0.8;
                }
            }
        });
    }

    toggleHeadlights() {
        this.setRobotHeadlights(!this.isHeadlightsOn);
        this.updateTelemetry(this.isHeadlightsOn ? '💡 Far Açık (%100 LED Aydınlatma)' : '💡 Far Kapalı');
        return this.isHeadlightsOn;
    }

    // 3. Isı İstasyonu
    setupTempStation(st) {}

    setTempStationMode(mode) {
        this.isShivering = false;
        if (mode === 'hot') {
            this.scene.background = new THREE.Color(0xfff1e6);
            this.spawnSteamParticles();
            this.updateTelemetry('🔥 [Isı Sensörü]: 42°C (YÜKSEK) | SOĞUTUCU FANLAR ÇALIŞIYOR');
            this.markStationDone('temp');
            if (window.KidAudio) window.KidAudio.playSensorAlert(0.9);
        } else if (mode === 'cold') {
            this.scene.background = new THREE.Color(0xe0f2fe);
            this.isShivering = true;
            this.updateTelemetry('❄️ [Isı Sensörü]: -8°C (DONMA) | DAHİLİ ISITICILAR DEVREDE');
            this.markStationDone('temp');
            if (window.KidAudio) window.KidAudio.playClick();
        } else {
            this.scene.background = new THREE.Color(0xf0f9ff);
            this.updateTelemetry('🙂 [Isı Sensörü]: 22°C (İdeal Sıcaklık)');
        }
    }

    spawnSteamParticles() {
        const st = this.stations[2];
        for (let i = 0; i < 8; i++) {
            const pGeo = new THREE.SphereGeometry(0.14, 8, 8);
            const pMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 });
            const p = new THREE.Mesh(pGeo, pMat);
            p.position.set(st.pos.x + (Math.random() - 0.5) * 0.8, 0.5, st.pos.z + (Math.random() - 0.5) * 0.8);
            this.scene.add(p);
            this.heatParticles.push({ mesh: p, vy: 0.03 + Math.random() * 0.02, life: 1.0 });
        }
    }

    // 4. Ses İstasyonu
    setupSoundStation(st) {}

    setSoundStationMode(mode) {
        this.isDancing = false;
        this.isSleeping = false;
        if (mode === 'loud') {
            this.isDancing = true;
            this.updateTelemetry('📣 [Ses Sensörü]: 85 dB (MÜZİK TESPİT EDİLDİ) | DANS MODU AKTİF');
            this.markStationDone('sound');
            if (window.KidAudio) window.KidAudio.playDanceBeat();
        } else if (mode === 'quiet') {
            this.isSleeping = true;
            this.updateTelemetry('🤫 [Ses Sensörü]: 15 dB (SESSİZ ORTAM) | UYKU VE PİL TASARRUFU');
            this.markStationDone('sound');
            if (window.KidAudio) window.KidAudio.playClick();
        } else {
            this.updateTelemetry('🗣️ [Ses Sensörü]: 45 dB (Konuşma Sesi) | Seni dinliyorum.');
        }
    }

    // 5. Hareket İstasyonu
    setupMotionStation(st) {}

    runMotionCharacter() {
        const st = this.stations[4];
        if (this.movingCharacter) this.scene.remove(this.movingCharacter);

        const charGroup = new THREE.Group();
        const headGeo = new THREE.SphereGeometry(0.32, 16, 12);
        const head = new THREE.Mesh(headGeo, new THREE.MeshStandardMaterial({ color: 0xffd34e }));
        charGroup.add(head);

        const bodyGeo = new THREE.CylinderGeometry(0.2, 0.25, 0.6, 12);
        const body = new THREE.Mesh(bodyGeo, new THREE.MeshStandardMaterial({ color: 0x52d4b6 }));
        body.position.y = -0.45;
        charGroup.add(body);

        let startX = st.pos.x - 4.5;
        charGroup.position.set(startX, -0.6, st.pos.z + 2.0);
        this.scene.add(charGroup);
        this.movingCharacter = charGroup;

        this.updateTelemetry('🏃 [PIR Sensör]: HAREKETLİ NESNE ALGILANDI! (Takip ediliyor)');
        this.markStationDone('motion');
        if (window.KidAudio) window.KidAudio.playSuccess();

        const moveInterval = setInterval(() => {
            if (!this.movingCharacter) {
                clearInterval(moveInterval);
                return;
            }
            startX += 0.12;
            this.movingCharacter.position.x = startX;
            this.movingCharacter.position.y = -0.6 + Math.abs(Math.sin(startX * 4)) * 0.2;

            // Robotun kafası koşan karakteri takip etsin
            if (this.builder && this.builder.attachedParts.head) {
                const headDiff = startX - st.pos.x;
                this.builder.attachedParts.head.rotation.y = -(headDiff / 4.5) * 0.7;
            }

            if (startX > st.pos.x + 4.5) {
                clearInterval(moveInterval);
                this.scene.remove(this.movingCharacter);
                this.movingCharacter = null;
                if (this.builder && this.builder.attachedParts.head) {
                    this.builder.attachedParts.head.rotation.y = 0;
                }
            }
        }, 30);
    }

    // 6. Renk İstasyonu
    setupColorStation(st) {
        const colors = [
            { name: 'Kırmızı', hex: 0xff4757, isTarget: false, x: -2.0 },
            { name: 'Mavi', hex: 0x1e90ff, isTarget: true, x: 0 },
            { name: 'Yeşil', hex: 0x2ed573, isTarget: false, x: 2.0 }
        ];

        this.colorTargets = [];
        colors.forEach(c => {
            const group = new THREE.Group();
            const geo = new THREE.BoxGeometry(0.75, 0.75, 0.75);
            const mat = new THREE.MeshStandardMaterial({ color: c.hex, roughness: 0.2 });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.castShadow = true;
            group.add(mesh);

            group.position.set(st.pos.x + c.x, -0.7, st.pos.z + 2.5);
            group.userData = { isColorTarget: true, targetData: c };
            this.scene.add(group);
            this.colorTargets.push(group);
        });
    }

    pickColorTarget(targetGroup) {
        const data = targetGroup.userData.targetData;
        if (data.isTarget) {
            this.updateTelemetry('🔵 [Renk Sensörü]: HEDEF BULUNDU: MAVİ | ONAYLANDI ✅');
            this.markStationDone('color');
            if (window.KidAudio) window.KidAudio.playSuccess();

            targetGroup.position.y = -0.2;
            setTimeout(() => { targetGroup.position.y = -0.7; }, 600);
        } else {
            this.updateTelemetry(`[Renk Sensörü]: Algılanan: ${data.name} | Hedef MAVİ olmalı, tekrar dene.`);
            if (window.KidAudio) window.KidAudio.playClick();
        }
    }

    // ===================================================
    // GÖREV TAMAMLAMA & RAPORLAMA
    // ===================================================
    markStationDone(stationId) {
        const st = this.stations.find(s => s.id === stationId);
        if (st && !st.completed) {
            st.completed = true;
            if (window.KidAudio) window.KidAudio.playSuccess();

            // İstasyona yıldız ver
            const badge = document.getElementById(`stationBadge-${st.id}`);
            if (badge) badge.innerHTML = '⭐';

            // Toplam yıldızı güncelle
            const total = this.stations.filter(s => s.completed).length;
            const scoreBadge = document.getElementById('totalStarsCount');
            if (scoreBadge) scoreBadge.innerText = `${total}/6 ⭐`;

            // Yönerge kartındaki "Sonraki İstasyona Git" butonunu parlat
            const nextBtn = document.getElementById('btnNextStation');
            if (nextBtn) {
                nextBtn.classList.add('pulse-border');
            }

            if (window.Botti) {
                window.Botti.speak(`🌟 Harika iş! ${st.name} testini başarıyla tamamladın! Haydi sonraki istasyona geçelim!`);
            }
        }
    }

    updateTelemetry(text) {
        const el = document.getElementById('stationTelemetryText');
        if (el) el.innerHTML = text;
    }

    updateInstructionCard(st) {
        // Başlık ve İkon
        document.getElementById('stationTitleText').innerText = `${st.icon} ${st.name}`;
        document.getElementById('stationPurposeText').innerText = st.purpose;

        // Adım adım yönergeler
        const stepsContainer = document.getElementById('stationStepsList');
        if (stepsContainer) {
            stepsContainer.innerHTML = '';
            st.steps.forEach(step => {
                const li = document.createElement('li');
                li.innerText = step;
                stepsContainer.appendChild(li);
            });
        }

        // İlgili kontrol alt panelini aç
        document.querySelectorAll('.sensor-control-subpanel').forEach(p => {
            if (p.id === `ctrl-${st.controlType}`) {
                p.classList.remove('hidden');
            } else {
                p.classList.add('hidden');
            }
        });

        // Breadcrumb/istasyon butonlarını güncelle
        document.querySelectorAll('.station-step-btn').forEach((btn, idx) => {
            if (idx === this.currentStationIndex) {
                btn.classList.add('active-station-step');
            } else {
                btn.classList.remove('active-station-step');
            }
        });

        // Botti'nin sesli yönlendirmesi
        if (window.Botti) {
            window.Botti.speak(`📍 <b>${st.name}</b>'ndayız!<br>${st.steps[0]}`);
        }
    }

    triggerGrandCelebration() {
        if (window.KidAudio) window.KidAudio.playFanfare();
        if (window.Botti) {
            window.Botti.speak(
                "🏆 <b>TEBRİKLER MUCİT!</b><br>Robotun tüm test parkurunu başarıyla geçti ve diplomasını hak etti!"
            );
        }
        const modal = document.getElementById('certificateModal');
        if (modal) {
            const nameEl = document.getElementById('certRobotName');
            if (nameEl && this.builder) {
                nameEl.innerText = this.builder.robotName || 'Harika Robot';
            }
            modal.classList.remove('hidden');
        }
    }

    // ===================================================
    // ANİMASYON & HAREKET DÖNGÜSÜ
    // ===================================================
    animate(delta) {
        // İstasyondan istasyona yürüyüş animasyonu
        if (this.isTravelling) {
            this.travelProgress += 0.015;
            if (this.travelProgress >= 1.0) {
                this.travelProgress = 1.0;
                this.isTravelling = false;

                const currentSt = this.stations[this.currentStationIndex];
                this.builder.robotGroup.position.copy(currentSt.pos);
                this.builder.robotGroup.rotation.set(0, 0, 0); // Kameraya dönsün

                this.controls.target.copy(currentSt.pos);
                this.camera.position.copy(currentSt.pos).add(currentSt.camOffset);
                this.controls.update();

                this.setupStationExperiment(currentSt);
                this.updateInstructionCard(currentSt);

                if (window.KidAudio) window.KidAudio.playSnap();
            } else {
                // Lerp ile robotu ve kamerayı kaydır
                const t = this.travelProgress;
                this.builder.robotGroup.position.lerpVectors(this.travelStartPos, this.travelTargetPos, t);

                // Yürüyüş / tekerlek yuvarlanma adımı efekti
                this.builder.robotGroup.position.y = Math.abs(Math.sin(t * Math.PI * 8)) * 0.15;

                // Kamera da robotu takip etsin
                const currentSt = this.stations[this.currentStationIndex];
                this.controls.target.copy(this.builder.robotGroup.position);
                this.camera.position.copy(this.builder.robotGroup.position).add(currentSt.camOffset);
            }
        }

        // ==========================================
        // ÇOCUĞUN ROBOTU YÖN TUŞLARI / D-PAD İLE SÜRMESİ
        // ==========================================
        if (!this.isTravelling && this.builder && this.builder.robotGroup) {
            const robot = this.builder.robotGroup;
            let isMoving = false;

            // Sağa & Sola Dönüş
            if (this.driveState.left) {
                robot.rotation.y += 0.045;
            }
            if (this.driveState.right) {
                robot.rotation.y -= 0.045;
            }

            // İleri & Geri Sürüş
            const speed = 0.11;
            if (this.driveState.up) {
                robot.position.x += Math.sin(robot.rotation.y) * speed;
                robot.position.z += Math.cos(robot.rotation.y) * speed;
                isMoving = true;
            }
            if (this.driveState.down) {
                robot.position.x -= Math.sin(robot.rotation.y) * (speed * 0.6);
                robot.position.z -= Math.cos(robot.rotation.y) * (speed * 0.6);
                isMoving = true;
            }

            if (isMoving) {
                // Yürüyüş / sallanma adımı efekti
                robot.position.y = Math.abs(Math.sin(performance.now() * 0.015)) * 0.12;
                // Kamera yumuşakça robotu takip etsin
                this.controls.target.lerp(robot.position, 0.08);

                // Tekerlekler veya pervaneler dönsün
                robot.traverse(child => {
                    if (child.name && child.name.includes('wheel')) {
                        child.rotation.x += 0.2;
                    }
                });
            }

            // ==========================================
            // CANLI SENSÖR ETKİLEŞİM & YAKINLIK TETİKLERİ
            // ==========================================

            // 1. İstasyon (Mesafe): Robot engele yaklaştıkça ölç
            if (this.currentStationIndex === 0 && this.distanceObstacle) {
                const dist = robot.position.distanceTo(this.distanceObstacle.position);
                const cm = Math.max(15, Math.round(dist * 22));
                const distLabel = document.getElementById('distanceDisplay');
                if (distLabel) distLabel.innerText = `${cm} cm`;
                const distSlider = document.getElementById('distanceSlider');
                if (distSlider) distSlider.value = Math.min(100, Math.max(0, (dist / 3.5) * 100));

                if (dist < 1.15) {
                    this.updateTelemetry(`🚨 [Mesafe]: ${cm} cm | ENGEL YAKALANDI (ACİL FREN YAPILDI)`);
                    this.markStationDone('distance');
                    this.driveState.up = false; // Acil fren
                } else if (isMoving) {
                    this.updateTelemetry(`[Mesafe]: ${cm} cm | Engele yaklaşıyorsun...`);
                }
            }

            // 2. İstasyon (Işık): Tünelin içine girince
            if (this.currentStationIndex === 1) {
                if (Math.abs(robot.position.x - 14) < 2.0 && Math.abs(robot.position.z) < 2.5) {
                    this.setLightStationMode('dark');
                }
            }

            // 3. İstasyon (Isı): Ateş veya buz sütununa yanaşınca
            if (this.currentStationIndex === 2) {
                const dHeat = robot.position.distanceTo(new THREE.Vector3(12, 0, 15.8));
                const dIce = robot.position.distanceTo(new THREE.Vector3(16, 0, 15.8));
                if (dHeat < 2.2) {
                    this.setTempStationMode('hot');
                } else if (dIce < 2.2) {
                    this.setTempStationMode('cold');
                }
            }

            // 4. İstasyon (Ses): Sahne merkezine çıkınca
            if (this.currentStationIndex === 3) {
                const dStage = robot.position.distanceTo(new THREE.Vector3(0, 0, 14));
                if (dStage < 2.5 && !this.stations[3].completed) {
                    this.setSoundStationMode('loud');
                }
            }

            // 5. İstasyon (Hareket): Başlangıç kapısına yaklaşınca
            if (this.currentStationIndex === 4) {
                const dGate = robot.position.distanceTo(new THREE.Vector3(-14, 0, 11.5));
                if (dGate < 2.8 && !this.movingCharacter && !this.stations[4].completed) {
                    this.runMotionCharacter();
                }
            }

            // 6. İstasyon (Renk): Mavi küpe dokununca
            if (this.currentStationIndex === 5) {
                const dBlue = robot.position.distanceTo(new THREE.Vector3(-14, 0, 2.5));
                if (dBlue < 2.0 && !this.stations[5].completed) {
                    const blueTarget = this.colorTargets.find(t => t.userData && t.userData.targetData && t.userData.targetData.isTarget);
                    if (blueTarget) this.pickColorTarget(blueTarget);
                }
            }
        }

        // Dans animasyonu
        const time = performance.now() * 0.005;
        if (this.isDancing && this.builder && this.builder.robotGroup) {
            this.builder.robotGroup.position.y = Math.abs(Math.sin(time * 3)) * 0.3;
            this.builder.robotGroup.rotation.z = Math.sin(time * 3) * 0.15;
            this.builder.robotGroup.rotation.y = Math.sin(time * 2) * 0.2;
        }

        // Titreme animasyonu
        if (this.isShivering && this.builder && this.builder.robotGroup) {
            this.builder.robotGroup.position.x = (Math.random() - 0.5) * 0.08;
            this.builder.robotGroup.position.y = (Math.random() - 0.5) * 0.08;
        }

        // Uyku animasyonu
        if (this.isSleeping && this.builder && this.builder.robotGroup) {
            this.builder.robotGroup.position.y = -0.2 + Math.sin(time * 0.5) * 0.04;
            this.builder.robotGroup.rotation.x = 0.2;
        }

        // Buhar parçacıkları
        for (let i = this.heatParticles.length - 1; i >= 0; i--) {
            const pt = this.heatParticles[i];
            pt.mesh.position.y += pt.vy;
            pt.life -= 0.02;
            pt.mesh.scale.setScalar(pt.life * 1.5);
            if (pt.life <= 0) {
                this.scene.remove(pt.mesh);
                this.heatParticles.splice(i, 1);
            }
        }
    }
}

window.SensorLaboratory = SensorLaboratory;
