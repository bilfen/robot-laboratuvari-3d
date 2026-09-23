/**
 * Robot Laboratuvarı - 3D Robot İnşa ve Düzenleme Motoru (Builder)
 * Çocuklar için sürükle-bırak, manyetik soketleme (snap-to-socket),
 * parça seçimi, ölçekleme, döndürme ve renk değiştirme motoru.
 */

class RobotBuilder {
    constructor(scene, camera, renderer, controls) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.controls = controls;

        this.robotGroup = new THREE.Group();
        this.robotGroup.name = 'robot_root';
        this.robotGroup.position.set(0, 0, -30); // Tasarım Garajı konumu
        this.scene.add(this.robotGroup);

        this.mode = 'tutorial'; // 'tutorial' | 'custom'
        this.currentBody = null;
        this.attachedParts = {
            head: null,
            armLeft: null,
            armRight: null,
            legs: null,
            chest: null,
            accessory: null
        };

        this.selectedPart = null;
        this.socketIndicators = [];
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.tutorialStep = 0;
        this.tutorialCompleted = false;

        this.robotName = 'DostBot';

        this.initSocketIndicators();
        this.setupInteractions();
    }

    // Soketleri gösteren parlayan halkalar
    initSocketIndicators() {
        this.socketGroup = new THREE.Group();
        this.socketGroup.name = 'socket_indicators';
        this.robotGroup.add(this.socketGroup);
    }

    updateSocketIndicators() {
        // Mevcut göstergeleri temizle
        while (this.socketGroup.children.length > 0) {
            this.socketGroup.remove(this.socketGroup.children[0]);
        }
        this.socketIndicators = [];

        if (!this.currentBody || !this.currentBody.userData.sockets) return;

        const sockets = this.currentBody.userData.sockets;

        for (const [slot, pos] of Object.entries(sockets)) {
            // Eğer o slotta parça yoksa veya seçili parçaysa hedef göstergeyi aç
            const hasPart = !!this.attachedParts[slot];
            if (!hasPart || (this.mode === 'tutorial' && !this.attachedParts[slot])) {
                const ringGeo = new THREE.TorusGeometry(0.26, 0.04, 12, 24);
                ringGeo.rotateX(Math.PI / 2);
                const ringMat = new THREE.MeshBasicMaterial({
                    color: 0xffd34e,
                    transparent: true,
                    opacity: 0.85
                });
                const ring = new THREE.Mesh(ringGeo, ringMat);
                ring.position.copy(pos);
                ring.userData = { isSocket: true, slot: slot, baseScale: 1.0, baseColor: 0xffd34e };
                this.socketGroup.add(ring);
                this.socketIndicators.push(ring);
            }
        }
    }

    highlightSocketForCategory(category) {
        // 'head', 'arm', 'legs', 'wheel', 'accessory', vs. kategorisine göre ilgili soketi parlat
        const targetSlots = 
            category.includes('head') ? ['head'] :
            category.includes('arm') ? ['armLeft', 'armRight'] :
            category.includes('legs') || category.includes('wheel') ? ['legs'] :
            category.includes('acc') ? ['accessory'] : 
            category.includes('sensor') ? ['chest'] : [];

        this.socketIndicators.forEach(ring => {
            if (targetSlots.includes(ring.userData.slot)) {
                // Sürüklenen parçanın takılabileceği soketi büyüt ve parlat (Manyetik çekim hissi)
                ring.userData.baseScale = 1.6;
                ring.material.color.setHex(0x3b82f6); // Mavi glow
                ring.material.opacity = 0.95;
            } else {
                // Diğer soketleri soluklaştır
                ring.userData.baseScale = 0.7;
                ring.material.opacity = 0.3;
            }
        });
    }

    clearSocketHighlight() {
        this.socketIndicators.forEach(ring => {
            ring.userData.baseScale = 1.0;
            ring.material.color.setHex(ring.userData.baseColor);
            ring.material.opacity = 0.85;
        });
    }

    animate(delta) {
        // Soket halkalarını hafifçe parlat ve döndür
        const time = performance.now() * 0.003;
        this.socketIndicators.forEach(ring => {
            ring.rotation.y = time;
            const baseScale = ring.userData.baseScale || 1.0;
            ring.scale.setScalar(baseScale + Math.sin(time * 3) * (0.12 * baseScale));
        });

        // Eğer seçili bir parça varsa hafifçe parlasın
        if (this.selectedPart && this.selectedPart.userData && this.selectedPart.userData.selectionRing) {
            this.selectedPart.userData.selectionRing.rotation.y = time * 2;
        }

        // Robotun parçalarını dinamik canlandır (matkap, radar, pervane, alev, hover)
        if (this.robotGroup) {
            this.robotGroup.traverse(child => {
                if (child.name === 'spiral_drill_mesh') {
                    child.rotation.y += 0.15;
                } else if (child.name === 'rotating_dish') {
                    child.rotation.y += 0.03;
                } else if (child.name === 'rotor_blades') {
                    child.rotation.y += 0.25;
                } else if (child.name === 'holo_orbit') {
                    child.rotation.z += 0.04;
                } else if (child.name === 'hoverGlow') {
                    child.scale.setScalar(1 + Math.sin(time * 6) * 0.12);
                } else if (child.name === 'jetFlame') {
                    child.scale.y = 1 + Math.sin(time * 12) * 0.15;
                }
            });

            // Robotun genel idle canlılık animasyonu (hafif nefes alma)
            if (this.mode !== 'sensor_lab') {
                this.robotGroup.position.y = Math.sin(time * 0.8) * 0.05;
            }
        }
    }

    // ==========================================
    // ÖRNEK ŞABLON (TUTORIAL) BAŞLATMA
    // ==========================================
    loadTutorialTemplate() {
        this.mode = 'tutorial';
        this.clearRobot();
        this.robotName = 'DostBot';

        // 1. Şablon Gövdesi: Sevimli Mint Kare Gövde
        const body = RobotPartsFactory.createSquareBody(RobotColors.mint);
        this.setBody(body);

        this.tutorialStep = 0;
        this.tutorialCompleted = false;

        // Botti rehberini bilgilendir
        if (window.Botti) {
            window.Botti.speak(
                "🤖 Hoş geldin küçük mucit! Ben <b>Botti</b>!<br>Haydi ilk olarak örnek robotumuz <b>DostBot</b>'u tamamlayalım. Sol taraftaki parçalardan <b>Gözlü Kafa</b>'ya tıkla veya sürükle!"
            );
        }

        this.updateSocketIndicators();
        this.updateUI();
    }

    // ==========================================
    // ÖZGÜN TASARIM MASASINI BAŞLATMA
    // ==========================================
    loadCustomBuilder(bodyType = 'square') {
        this.mode = 'custom';
        this.clearRobot();
        this.robotName = 'Pofuduk Bot';

        this.setBodyByType(bodyType);

        if (window.Botti) {
            window.Botti.speak(
                "🎨 Harika! Şimdi tamamen özgürsün! İstediğin gövdeyi, kolları ve kafayı seç. Renklerini değiştir ve robotuna harika bir isim ver!"
            );
        }

        this.updateSocketIndicators();
        this.updateUI();
    }

    // Gövde tipi değiştir
    setBodyByType(type) {
        let body;
        switch (type) {
            case 'round':
                body = RobotPartsFactory.createRoundBody(RobotColors.yellow);
                break;
            case 'triangle':
                body = RobotPartsFactory.createTriangleBody(RobotColors.coral);
                break;
            case 'wheel':
                body = RobotPartsFactory.createWheelBody(RobotColors.blue);
                break;
            case 'mecha':
                body = RobotPartsFactory.createMechaBody(RobotColors.blue);
                break;
            case 'square':
            default:
                body = RobotPartsFactory.createSquareBody(RobotColors.mint);
                break;
        }
        this.setBody(body);
    }

    setBody(bodyMesh) {
        if (this.currentBody) {
            this.robotGroup.remove(this.currentBody);
        }
        this.currentBody = bodyMesh;
        this.robotGroup.add(this.currentBody);
        this.selectPart(this.currentBody);
        this.updateSocketIndicators();

        if (window.KidAudio) {
            window.KidAudio.playSnap();
        }

        // Gövde değiştiğinde kameraya hafif bir "bounce" (esneme) efekti ver
        if (window.app && window.app.camera) {
            window.app.camera.position.y += 1.2;
            window.app.camera.position.z += 1.5;
        }
    }

    // ==========================================
    // PARÇA EKLEME / SOKETE YERLEŞTİRME
    // ==========================================
    attachPart(slot, partMesh) {
        if (!this.currentBody) return;

        // Eski parçayı kaldır
        if (this.attachedParts[slot]) {
            this.robotGroup.remove(this.attachedParts[slot]);
            this.attachedParts[slot] = null;
        }

        const socketPos = this.currentBody.userData.sockets[slot] || new THREE.Vector3(0, 0, 0);
        partMesh.position.copy(socketPos);

        // Kafa veya kollar için özel offset ayarları
        if (partMesh.userData.socketOffset) {
            partMesh.position.add(partMesh.userData.socketOffset);
        }

        this.robotGroup.add(partMesh);
        this.attachedParts[slot] = partMesh;
        this.selectPart(partMesh);

        // Efekt ve ses
        if (window.KidAudio) {
            window.KidAudio.playSnap();
        }
        this.spawnSnapParticles(partMesh.position);

        this.updateSocketIndicators();

        // Tutorial kontrolü
        if (this.mode === 'tutorial') {
            this.checkTutorialProgress();
        }

        this.updateUI();
    }

    // Parça adına göre hızlı ekleme (Tıklayınca uçarak yerine gitmesi)
    addPartByName(partKey) {
        let partMesh = null;
        let targetSlot = null;

        switch (partKey) {
            // Kafalar
            case 'head-round':
                partMesh = RobotPartsFactory.createRoundHead();
                targetSlot = 'head';
                break;
            case 'head-screen':
                partMesh = RobotPartsFactory.createScreenHead();
                targetSlot = 'head';
                break;
            case 'head-visor':
                partMesh = RobotPartsFactory.createVisorHead();
                targetSlot = 'head';
                break;
            case 'head-cyber-helmet':
                partMesh = RobotPartsFactory.createCyberHelmetHead();
                targetSlot = 'head';
                break;
            case 'head-hologram-dome':
                partMesh = RobotPartsFactory.createHologramDomeHead();
                targetSlot = 'head';
                break;
            case 'head-cat-bot':
                partMesh = RobotPartsFactory.createCatBotHead();
                targetSlot = 'head';
                break;

            // Kollar
            case 'arm-clamp-left':
                partMesh = RobotPartsFactory.createClampArm(true);
                targetSlot = 'armLeft';
                break;
            case 'arm-clamp-right':
                partMesh = RobotPartsFactory.createClampArm(false);
                targetSlot = 'armRight';
                break;
            case 'arm-round-left':
                partMesh = RobotPartsFactory.createRoundArm(true);
                targetSlot = 'armLeft';
                break;
            case 'arm-round-right':
                partMesh = RobotPartsFactory.createRoundArm(false);
                targetSlot = 'armRight';
                break;
            case 'arm-blaster-left':
                partMesh = RobotPartsFactory.createBlasterArm(true);
                targetSlot = 'armLeft';
                break;
            case 'arm-blaster-right':
                partMesh = RobotPartsFactory.createBlasterArm(false);
                targetSlot = 'armRight';
                break;
            case 'arm-shield-left':
                partMesh = RobotPartsFactory.createShieldArm(true);
                targetSlot = 'armLeft';
                break;
            case 'arm-shield-right':
                partMesh = RobotPartsFactory.createShieldArm(false);
                targetSlot = 'armRight';
                break;
            case 'arm-drill-left':
                partMesh = RobotPartsFactory.createDrillArm(true);
                targetSlot = 'armLeft';
                break;
            case 'arm-drill-right':
                partMesh = RobotPartsFactory.createDrillArm(false);
                targetSlot = 'armRight';
                break;
            case 'arm-hydraulic-left':
                partMesh = RobotPartsFactory.createHydraulicArm(true);
                targetSlot = 'armLeft';
                break;
            case 'arm-hydraulic-right':
                partMesh = RobotPartsFactory.createHydraulicArm(false);
                targetSlot = 'armRight';
                break;

            // Bacaklar & Tekerlekler & Sürüş
            case 'legs-bipedal':
                partMesh = RobotPartsFactory.createBipedalLegs();
                targetSlot = 'legs';
                break;
            case 'legs-wheel':
                partMesh = RobotPartsFactory.createSingleWheel();
                targetSlot = 'legs';
                break;
            case 'legs-rocket':
                partMesh = RobotPartsFactory.createRocketBooster();
                targetSlot = 'legs';
                break;
            case 'legs-spider':
                partMesh = RobotPartsFactory.createSpiderLegs();
                targetSlot = 'legs';
                break;
            case 'legs-hover':
                partMesh = RobotPartsFactory.createHoverPads();
                targetSlot = 'legs';
                break;
            case 'legs-heavy-treads':
                partMesh = RobotPartsFactory.createHeavyTreads();
                targetSlot = 'legs';
                break;

            // Aksesuarlar & Kanatlar
            case 'acc-propeller':
                partMesh = RobotPartsFactory.createPropeller();
                targetSlot = 'accessory';
                break;
            case 'acc-cyber-wings':
                partMesh = RobotPartsFactory.createCyberWings();
                targetSlot = 'accessory';
                break;
            case 'acc-satellite':
                partMesh = RobotPartsFactory.createSatelliteDish();
                targetSlot = 'accessory';
                break;
            case 'acc-jetpack':
                partMesh = RobotPartsFactory.createJetpack();
                targetSlot = 'accessory';
                break;
            case 'acc-crown':
                partMesh = RobotPartsFactory.createCrown();
                targetSlot = 'accessory';
                break;

            // Sensörler
            case 'sensor-distance':
                partMesh = RobotPartsFactory.createDistanceSensor();
                targetSlot = 'chest';
                break;
            case 'sensor-light':
                partMesh = RobotPartsFactory.createLightSensor();
                targetSlot = 'chest';
                break;
            case 'sensor-temp':
                partMesh = RobotPartsFactory.createTemperatureSensor();
                targetSlot = 'chest';
                break;
            case 'sensor-sound':
                partMesh = RobotPartsFactory.createSoundSensor();
                targetSlot = 'chest';
                break;
            case 'sensor-color':
                partMesh = RobotPartsFactory.createColorSensor();
                targetSlot = 'chest';
                break;
            default:
                console.warn('Bilinmeyen parça:', partKey);
                return;
        }

        if (partMesh && targetSlot) {
            this.attachPart(targetSlot, partMesh);
        }
    }

    // ==========================================
    // PARÇA SEÇİMİ VE DÜZENLEME (EDIT TABLE)
    // ==========================================
    selectPart(mesh) {
        // Önceki seçimi kaldır
        if (this.selectedPart && this.selectedPart.userData && this.selectedPart.userData.selectionRing) {
            this.selectedPart.remove(this.selectedPart.userData.selectionRing);
            delete this.selectedPart.userData.selectionRing;
        }

        this.selectedPart = mesh;

        if (this.selectedPart) {
            // Seçim halkası ekle
            const selGeo = new THREE.TorusGeometry(0.5, 0.03, 8, 24);
            selGeo.rotateX(Math.PI / 2);
            const selMat = new THREE.MeshBasicMaterial({
                color: 0x38bdf8,
                transparent: true,
                opacity: 0.9
            });
            const selRing = new THREE.Mesh(selGeo, selMat);
            selRing.position.y = 0.05;
            this.selectedPart.add(selRing);
            this.selectedPart.userData.selectionRing = selRing;

            // Seçim sesi
            if (window.KidAudio) {
                window.KidAudio.playClick();
            }
        }

        this.updateEditPanelInfo();
    }

    // Büyüt (Scale Up)
    scaleSelected(factor = 1.1) {
        if (!this.selectedPart) return;
        const s = this.selectedPart.scale.x * factor;
        if (s <= 1.8 && s >= 0.6) {
            this.selectedPart.scale.set(s, s, s);
            if (window.KidAudio) window.KidAudio.playClick();
        }
    }

    // Küçült (Scale Down)
    scaleDownSelected() {
        this.scaleSelected(0.9);
    }

    // Döndür (Rotate)
    rotateSelected() {
        if (!this.selectedPart) return;
        this.selectedPart.rotation.y += Math.PI / 4; // 45 derece dön
        if (window.KidAudio) window.KidAudio.playRotate();
    }

    // Aynala (Mirror)
    mirrorSelected() {
        if (!this.selectedPart) return;
        // Sol kolsa sağ kol kopyasını yap veya X eksenini ters çevir
        if (this.selectedPart.userData && this.selectedPart.userData.type === 'arm') {
            const isLeft = this.selectedPart.userData.isLeft;
            const oppositeSlot = isLeft ? 'armRight' : 'armLeft';

            // Klonla ve karşıya tak
            const clone = this.selectedPart.clone();
            clone.userData = { ...this.selectedPart.userData, isLeft: !isLeft };
            this.attachPart(oppositeSlot, clone);
            if (window.Botti) {
                window.Botti.speak("✨ Kolu diğer tarafa aynaladım! İki kolun da hazır!");
            }
        } else {
            this.selectedPart.rotation.y += Math.PI;
            if (window.KidAudio) window.KidAudio.playRotate();
        }
    }

    // Sağa / Sola Kaydır
    nudgeSelected(dir = 1) {
        if (!this.selectedPart) return;
        this.selectedPart.position.x += dir * 0.1;
        if (window.KidAudio) window.KidAudio.playClick();
    }

    // Seçili parçanın rengini değiştir
    paintSelected(colorHex) {
        if (!this.selectedPart) return;

        this.selectedPart.traverse(child => {
            if (child.isMesh && child.material && !child.userData.isSocket && child !== this.selectedPart.userData.selectionRing) {
                // Sadece göz/ışık olmayan ana malzemeleri boya
                if (!child.name.includes('eye') && !child.name.includes('Light') && !child.name.includes('powerCore')) {
                    child.material.color.setHex(colorHex);
                }
            }
        });

        if (window.KidAudio) window.KidAudio.playClick();
    }

    // Seçili parçayı sil
    deleteSelected() {
        if (!this.selectedPart) return;
        if (this.selectedPart === this.currentBody) {
            // Gövdeyi silmek yerine uyar
            if (window.Botti) {
                window.Botti.speak("Gövde robotun kalbidir! Onu silemezsin ama değiştirebilirsin.");
            }
            return;
        }

        // Slotlardan temizle
        for (const [slot, part] of Object.entries(this.attachedParts)) {
            if (part === this.selectedPart) {
                this.attachedParts[slot] = null;
                break;
            }
        }

        this.robotGroup.remove(this.selectedPart);
        this.selectedPart = null;
        this.updateSocketIndicators();
        this.updateEditPanelInfo();
        if (window.KidAudio) window.KidAudio.playClick();
    }

    // Tüm robotu temizle
    clearRobot() {
        while (this.robotGroup.children.length > 0) {
            this.robotGroup.remove(this.robotGroup.children[0]);
        }
        this.initSocketIndicators();
        this.currentBody = null;
        this.attachedParts = {
            head: null,
            armLeft: null,
            armRight: null,
            legs: null,
            chest: null,
            accessory: null
        };
        this.selectedPart = null;
    }

    // ==========================================
    // ETKİLEŞİM & TIKLAMA / RAYCASTING
    // ==========================================
    setupInteractions() {
        const dom = this.renderer.domElement;

        dom.addEventListener('pointerdown', e => {
            const rect = dom.getBoundingClientRect();
            this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

            this.raycaster.setFromCamera(this.mouse, this.camera);
            const intersects = this.raycaster.intersectObjects(this.robotGroup.children, true);

            if (intersects.length > 0) {
                // Tıklanan nesnenin üst grubunu bul
                let target = intersects[0].object;
                while (target.parent && target.parent !== this.robotGroup && target.parent !== this.scene) {
                    target = target.parent;
                }
                if (target !== this.socketGroup) {
                    this.selectPart(target);
                }
            }
        });
    }

    // Parça yerine oturunca patlayan yıldız parçacıkları
    spawnSnapParticles(pos) {
        const pCount = 16;
        const pGeo = new THREE.SphereGeometry(0.06, 8, 8);
        const pMat = new THREE.MeshBasicMaterial({ color: 0xffd34e });

        const particles = [];
        for (let i = 0; i < pCount; i++) {
            const p = new THREE.Mesh(pGeo, pMat);
            p.position.copy(pos);
            const vel = new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                Math.random() * 2,
                (Math.random() - 0.5) * 2
            );
            this.scene.add(p);
            particles.push({ mesh: p, vel: vel, life: 1.0 });
        }

        const animParticles = () => {
            let alive = false;
            particles.forEach(pt => {
                if (pt.life > 0) {
                    pt.mesh.position.addScaledVector(pt.vel, 0.04);
                    pt.life -= 0.05;
                    pt.mesh.scale.setScalar(pt.life);
                    alive = true;
                } else if (pt.mesh.parent) {
                    pt.mesh.parent.remove(pt.mesh);
                }
            });
            if (alive) requestAnimationFrame(animParticles);
        };
        animParticles();
    }

    // ==========================================
    // TUTORIAL (ÖRNEK ŞABLON) İLERLEME KONTROLÜ
    // ==========================================
    checkTutorialProgress() {
        const hasHead = !!this.attachedParts.head;
        const hasArmLeft = !!this.attachedParts.armLeft;
        const hasArmRight = !!this.attachedParts.armRight;
        const hasLegs = !!this.attachedParts.legs;

        const count = [hasHead, hasArmLeft, hasArmRight, hasLegs].filter(Boolean).length;

        if (count === 1 && !this.tutHeadSpoken) {
            this.tutHeadSpoken = true;
            if (window.Botti) {
                window.Botti.speak("⭐ Harika başlangıç! Şimdi kollarını takalım! Sol panodaki kollardan birini seç!");
            }
        } else if (count === 2 && !this.tutArmSpoken) {
            this.tutArmSpoken = true;
            if (window.Botti) {
                window.Botti.speak("👏 Süper gidiyorsun! Diğer kolu da eklemeyi unutma!");
            }
        } else if (count === 3 && !this.tutLegsSpoken) {
            this.tutLegsSpoken = true;
            if (window.Botti) {
                window.Botti.speak("🚀 Çok az kaldı! Robotun gezebilmesi için altına tekerlek veya bacak ekle!");
            }
        } else if (count === 4 && !this.tutorialCompleted) {
            this.tutorialCompleted = true;
            if (window.KidAudio) {
                window.KidAudio.playFanfare();
            }
            if (window.Botti) {
                window.Botti.speak(
                    "🎉 <b>Tebrikler Küçük Mucit!</b><br>DostBot'u başarıyla tamamladın ve ilk rozetini kazandın! Artık hayalindeki özgün robotu tasarlayabilirsin. <b>Özgün Robot Tasarla</b> butonuna bas!"
                );
            }

            // Tebrik bannerını ve serbest moda geçiş butonunu aktifleştir
            const banner = document.getElementById('tutorialCompleteModal');
            if (banner) {
                banner.classList.remove('hidden');
            }
        }
    }

    updateEditPanelInfo() {
        const infoLabel = document.getElementById('selectedPartName');
        if (infoLabel) {
            if (this.selectedPart) {
                infoLabel.innerText = this.selectedPart.name || 'Seçili Parça';
            } else {
                infoLabel.innerText = 'Henüz parça seçilmedi';
            }
        }
    }

    updateUI() {
        // Şablon ve serbest moda göre arayüz butonlarını güncelle
        const modeBadge = document.getElementById('currentModeBadge');
        if (modeBadge) {
            modeBadge.innerText = this.mode === 'tutorial' ? '1. Adım: Örnek Şablon Alıştırması' : '2. Adım: Özgün Robot Tasarımı';
        }
    }
}

window.RobotBuilder = RobotBuilder;
