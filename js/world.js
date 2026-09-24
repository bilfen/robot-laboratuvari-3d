/**
 * Robot Laboratuvarı - Canlı Dünya Sistemi (World)
 * 5.12 Dinamik Dünya  |  5.16 Garaj Genişletme  |  5.17 Hava Koşulları
 * 5.11 Sinematik Kamera  |  7.5 Sensör VFX  |  5.2 Kalibrasyon Odası dekorları
 * 5.13 3D Yardımcı Drone
 * Dekorlar yol göstericidir; mevcut sürüş fiziğine ve mekaniklere dokunmaz.
 */

class WorldSystem {
    constructor(scene, camera, controls) {
        this.scene = scene;
        this.camera = camera;
        this.controls = controls;

        this.animated = [];           // { obj, fn(obj, t, delta) }
        this.rain = null;
        this.pirCone = null;
        this.vfxRings = [];

        // 5.11 Sinematik kamera durumu
        this.cinematic = { active: false, t: 0, dur: 1.4, fromPos: new THREE.Vector3(), toPos: new THREE.Vector3(), fromTgt: new THREE.Vector3(), toTgt: new THREE.Vector3() };

        // 5.17 Hava koşulları
        this.weatherMode = 'normal';
        this.sensorMod = { distNoise: 0, lightMul: 1, soundMul: 1 };

        // Sınır override (kalibrasyon odası / parkur yapıcı için)
        this.boundsOverride = null;

        this.companion = null;
    }

    // ====================================================
    // YARDIMCI: Yazılı panel dokusu (hologram/tablet)
    // ====================================================
    static makePanelTexture(lines, accent = '#38bdf8') {
        const c = document.createElement('canvas');
        c.width = 256; c.height = 128;
        const x = c.getContext('2d');
        x.fillStyle = 'rgba(10,18,38,0.92)';
        x.fillRect(0, 0, 256, 128);
        x.strokeStyle = accent;
        x.lineWidth = 4;
        x.strokeRect(3, 3, 250, 122);
        x.fillStyle = accent;
        x.font = 'bold 17px monospace';
        lines.forEach((l, i) => x.fillText(l, 14, 30 + i * 24));
        return new THREE.CanvasTexture(c);
    }

    // ====================================================
    // 5.12 DİNAMİK DÜNYA (canlı robotik araştırma merkezi)
    // ====================================================
    buildDynamicWorld() {
        const g = new THREE.Group();
        g.name = 'dynamic_world';
        this.scene.add(g);
        this.worldGroup = g;

        const metalMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.7, roughness: 0.3 });

        // --- Küçük bakım robotları (waypoint devriye) ---
        const mkMaintenanceBot = (color, waypoints, speed) => {
            const bot = new THREE.Group();
            const body = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 12), new THREE.MeshStandardMaterial({ color, roughness: 0.35 }));
            body.castShadow = true;
            bot.add(body);
            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x38bdf8, emissiveIntensity: 1.4 }));
            eye.position.set(0, 0.08, 0.26);
            bot.add(eye);
            [-0.16, 0.16].forEach(x => {
                const w = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.07, 12), metalMat);
                w.rotation.z = Math.PI / 2;
                w.position.set(x, -0.26, 0);
                bot.add(w);
            });
            const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.24, 6), metalMat);
            ant.position.y = 0.4; bot.add(ant);
            const antTip = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff4757 }));
            antTip.position.y = 0.54; bot.add(antTip);
            bot.position.copy(waypoints[0]);
            g.add(bot);
            this.animated.push({
                obj: bot, t: Math.random(), speed,
                fn: (o, dt, self) => {
                    self.t = (self.t + dt * self.speed) % 1;
                    const seg = self.t * (waypoints.length);
                    const i = Math.floor(seg) % waypoints.length;
                    const j = (i + 1) % waypoints.length;
                    const f = seg - Math.floor(seg);
                    const a = waypoints[i], b = waypoints[j];
                    o.position.lerpVectors(a, b, f);
                    o.position.y += Math.abs(Math.sin(self.t * 40)) * 0.02;
                    const dir = new THREE.Vector3().subVectors(b, a);
                    if (dir.lengthSq() > 0.0001) o.rotation.y = Math.atan2(dir.x, dir.z);
                }
            });
            return bot;
        };

        mkMaintenanceBot(0xff8bbb, [new THREE.Vector3(-10, -1.0, 4), new THREE.Vector3(10, -1.0, 4), new THREE.Vector3(10, -1.0, 10), new THREE.Vector3(-10, -1.0, 10)], 0.05);
        mkMaintenanceBot(0x52d4b6, [new THREE.Vector3(4, -1.0, -4), new THREE.Vector3(4, -1.0, 12)], 0.08);
        mkMaintenanceBot(0xffd34e, [new THREE.Vector3(-16, -1.0, 0), new THREE.Vector3(-16, -1.0, 14), new THREE.Vector3(-4, -1.0, 14)], 0.06);

        // --- Dönen mekanik kollar (2 istasyonda) ---
        [[18.5, -3], [-18.5, 17]].forEach(([x, z]) => {
            const armRoot = new THREE.Group();
            armRoot.position.set(x, -1.2, z);
            const base = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.55, 0.5, 16), metalMat);
            base.position.y = 0.25; armRoot.add(base);
            const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 1.4, 12), new THREE.MeshStandardMaterial({ color: 0xffd34e, roughness: 0.4 }));
            tower.position.y = 1.1; armRoot.add(tower);
            const armA = new THREE.Group(); armA.position.y = 1.8;
            const seg1 = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.16, 0.2), new THREE.MeshStandardMaterial({ color: 0xff735c, roughness: 0.4 }));
            seg1.position.x = 0.6; armA.add(seg1);
            const joint = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), metalMat);
            joint.position.x = 1.25; armA.add(joint);
            const seg2 = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.13, 0.16), new THREE.MeshStandardMaterial({ color: 0x52d4b6, roughness: 0.4 }));
            seg2.position.x = 1.7; armA.add(seg2);
            const claw = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.3, 8), metalMat);
            claw.rotation.z = -Math.PI / 2; claw.position.x = 2.25; armA.add(claw);
            armRoot.add(armA);
            g.add(armRoot);
            this.animated.push({
                obj: armRoot, phase: Math.random() * 6,
                fn: (o, dt, self) => {
                    self.phase += dt;
                    o.rotation.y = self.phase * 0.35;
                    armA.rotation.z = Math.sin(self.phase * 0.9) * 0.18 - 0.15;
                }
            });
        });

        // --- Hologram ekranları (havada veri panelleri) ---
        const holoDefs = [
            { x: 8, z: -5.5, y: 2.6, lines: ['PARKUR DURUM', 'SISTEM: AKTIF', 'SENSOR NET: %98'], c: '#38bdf8' },
            { x: -8, z: 19.5, y: 2.4, lines: ['ENERJI AGI', 'YUK: 62%', 'SEBEKE: STABIL'], c: '#52d4b6' },
            { x: 19.5, z: 8, y: 2.4, lines: ['AR-GE KAYIT', 'TEST #1042', 'SONUC: GECERLI'], c: '#ff8bbb' }
        ];
        holoDefs.forEach(d => {
            const tex = WorldSystem.makePanelTexture(d.lines, d.c);
            const panel = new THREE.Mesh(
                new THREE.PlaneGeometry(2.2, 1.1),
                new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
            );
            panel.position.set(d.x, d.y, d.z);
            g.add(panel);
            // Alt projeksiyon pylonu
            const pyl = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, d.y, 8), metalMat);
            pyl.position.set(d.x, d.y / 2 - 0.6, d.z);
            g.add(pyl);
            this.animated.push({
                obj: panel, phase: Math.random() * 6,
                fn: (o, dt, self) => {
                    self.phase += dt;
                    o.position.y = d.y + Math.sin(self.phase * 0.8) * 0.1;
                    o.rotation.y = Math.sin(self.phase * 0.4) * 0.25;
                    o.material.opacity = 0.7 + Math.sin(self.phase * 3) * 0.12;
                }
            });
        });

        // --- Enerji kabloları + akan ışık pulse ---
        const cableDefs = [
            [new THREE.Vector3(-20, -1.1, -6), new THREE.Vector3(-10, 0.4, -3), new THREE.Vector3(-2, -1.0, -2)],
            [new THREE.Vector3(20, -1.1, 18), new THREE.Vector3(12, 0.3, 16), new THREE.Vector3(4, -1.0, 12)]
        ];
        cableDefs.forEach((pts, ci) => {
            const curve = new THREE.CatmullRomCurve3(pts);
            const tube = new THREE.Mesh(
                new THREE.TubeGeometry(curve, 32, 0.05, 8, false),
                new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 })
            );
            g.add(tube);
            const pulse = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), new THREE.MeshBasicMaterial({ color: ci === 0 ? 0x52d4b6 : 0xffd34e }));
            g.add(pulse);
            this.animated.push({
                obj: pulse, t: ci * 0.5,
                fn: (o, dt, self) => {
                    self.t = (self.t + dt * 0.25) % 1;
                    o.position.copy(curve.getPointAt(self.t));
                }
            });
        });

        // --- Hareketli bariyer (merkez kavşak, dekoratif) ---
        const barrier = new THREE.Group();
        const barBody = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.16, 0.16), new THREE.MeshStandardMaterial({ color: 0xff4757 }));
        const stripeMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
        for (let i = -1; i <= 1; i++) {
            const s = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.18, 0.18), stripeMat);
            s.position.x = i * 0.8; barrier.add(s);
        }
        barrier.add(barBody);
        [-1.3, 1.3].forEach(x => {
            const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.9, 8), metalMat);
            leg.position.set(x, -0.45, 0); barrier.add(leg);
        });
        barrier.position.set(7, 0.45, 7);
        g.add(barrier);
        this.animated.push({
            obj: barrier, phase: 0,
            fn: (o, dt, self) => {
                self.phase += dt;
                o.position.x = 7 + Math.sin(self.phase * 0.5) * 3.5;
            }
        });

        // --- Neon köşe pilonları (nabız atan) ---
        [[-21, -7], [21, -7], [-21, 21], [21, 21]].forEach(([x, z], i) => {
            const pylon = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 2.6, 8), metalMat);
            pylon.position.set(x, 0.1, z);
            g.add(pylon);
            const neonColors = [0x52d4b6, 0x38bdf8, 0xff8bbb, 0xffd34e];
            const tip = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), new THREE.MeshBasicMaterial({ color: neonColors[i] }));
            tip.position.set(x, 1.6, z);
            g.add(tip);
            this.animated.push({
                obj: tip, phase: i,
                fn: (o, dt, self) => {
                    self.phase += dt;
                    const s = 1 + Math.sin(self.phase * 2 + i) * 0.15;
                    o.scale.setScalar(s);
                }
            });
        });
    }

    // ====================================================
    // 5.16 TASARIM GARAJI GENİŞLETMESİ (film sahnesi kalitesi)
    // ====================================================
    buildGarageProps(garageGroup) {
        if (!garageGroup) return;
        const g = new THREE.Group();
        g.name = 'garage_props';
        garageGroup.add(g);

        const metalMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.7, roughness: 0.3 });
        const darkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });
        const woodMat = new THREE.MeshStandardMaterial({ color: 0xd6b28a, roughness: 0.7 });

        // --- Robot montaj masası (sol) ---
        const table = new THREE.Group();
        table.position.set(-4.6, -0.9, 1.2);
        const top = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.14, 1.4), woodMat);
        top.position.y = 1.0; top.castShadow = true; table.add(top);
        [[-1.15, -0.55], [1.15, -0.55], [-1.15, 0.55], [1.15, 0.55]].forEach(([x, z]) => {
            const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.0, 10), metalMat);
            leg.position.set(x, 0.5, z); table.add(leg);
        });
        // Masada vidalar / aletler
        for (let i = 0; i < 4; i++) {
            const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.09, 8), metalMat);
            screw.position.set(-0.9 + i * 0.6, 1.12, 0.4);
            table.add(screw);
        }
        g.add(table);

        // --- Garaj robotik kolu (masa üstünde, arka planda çalışır) ---
        const armRoot = new THREE.Group();
        armRoot.position.set(-4.6, 0.12, 0.6);
        const armBase = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 0.22, 12), metalMat);
        armRoot.add(armBase);
        const aArm = new THREE.Group();
        const aSeg = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.1, 0.13), new THREE.MeshStandardMaterial({ color: 0xff735c, roughness: 0.4 }));
        aSeg.position.x = 0.42; aArm.add(aSeg);
        const aClaw = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.22, 8), metalMat);
        aClaw.rotation.z = -Math.PI / 2; aClaw.position.x = 0.92; aArm.add(aClaw);
        aArm.position.y = 0.22;
        armRoot.add(aArm);
        g.add(armRoot);
        this.animated.push({
            obj: armRoot, phase: 0,
            fn: (o, dt, self) => {
                self.phase += dt;
                o.rotation.y = Math.sin(self.phase * 0.5) * 0.9;
                aArm.rotation.z = -0.2 + Math.sin(self.phase * 0.8) * 0.25;
            }
        });

        // --- 3D yazıcı (sağ) ---
        const printer = new THREE.Group();
        printer.position.set(4.6, -0.9, 1.2);
        const frame = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.3, 1.0), new THREE.MeshStandardMaterial({ color: 0x243f78, roughness: 0.35, transparent: true, opacity: 0.55 }));
        frame.position.y = 0.95; printer.add(frame);
        const pBase = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.08, 0.9), darkMat);
        pBase.position.y = 0.42; printer.add(pBase);
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.2, 0.16), new THREE.MeshStandardMaterial({ color: 0xff4757, emissive: 0xff4757, emissiveIntensity: 0.5 }));
        head.position.y = 1.1; printer.add(head);
        const printout = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), new THREE.MeshStandardMaterial({ color: 0x52d4b6, roughness: 0.4 }));
        printout.position.y = 0.6; printer.add(printout);
        g.add(printer);
        this.animated.push({
            obj: head, phase: 0,
            fn: (o, dt, self) => {
                self.phase += dt;
                o.position.x = Math.sin(self.phase * 1.2) * 0.32;
                o.position.z = Math.cos(self.phase * 0.7) * 0.28;
                printout.scale.y = 0.5 + Math.abs(Math.sin(self.phase * 0.15)) * 0.6;
                printout.position.y = 0.42 + printout.scale.y * 0.15;
            }
        });

        // --- Parça rafları (arka duvar önünde) ---
        [[-5.8, -4.6], [3.4, 6.4]].forEach(([x0, x1], row) => {
            const shelf = new THREE.Group();
            shelf.position.set((x0 + x1) / 2, -0.9, -4.7);
            const board = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 0.08, 0.7), woodMat);
            board.position.y = 0.9; shelf.add(board);
            const board2 = board.clone(); board2.position.y = 1.7; shelf.add(board2);
            [[-0.9, 0.9], [0, 0.9], [0.9, 0.9], [-0.6, 1.7], [0.5, 1.7]].forEach(([dx, dy], i) => {
                const colors = [0x243f78, 0xffd34e, 0xff735c, 0x52d4b6, 0xff8bbb];
                const box = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), new THREE.MeshStandardMaterial({ color: colors[i % 5], roughness: 0.45 }));
                box.position.set(dx, dy + 0.25, 0);
                box.castShadow = true;
                shelf.add(box);
            });
            g.add(shelf);
        });

        // --- Dijital mühendislik ekranı (duvarda) ---
        const engTex = WorldSystem.makePanelTexture(['MOTORIZ KALIBRASYON', 'TORK: 4.2 Nm', 'VOLT: 11.8V', 'DURUM: HAZIR'], '#52d4b6');
        const engScreen = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.6), new THREE.MeshBasicMaterial({ map: engTex, transparent: true, opacity: 0.95 }));
        engScreen.position.set(-3.2, 3.4, -5.6);
        g.add(engScreen);
        const engFrame = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.8, 0.08), darkMat);
        engFrame.position.set(-3.2, 3.4, -5.66);
        g.add(engFrame);
        this.animated.push({
            obj: engScreen, phase: 0,
            fn: (o, dt, self) => {
                self.phase += dt;
                o.material.opacity = 0.8 + Math.sin(self.phase * 2.4) * 0.12;
            }
        });

        // --- Holografik robot modeli (merkezde dönen) ---
        const holo = new THREE.Group();
        holo.position.set(0, 0.4, -3.2);
        const holoBodyGeo = (typeof THREE.CapsuleGeometry === 'function')
            ? new THREE.CapsuleGeometry(0.35, 0.5, 4, 12)
            : new THREE.CylinderGeometry(0.35, 0.35, 1.0, 12);
        const holoBody = new THREE.Mesh(holoBodyGeo, new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true, transparent: true, opacity: 0.6 }));
        holoBody.position.y = 0.9; holo.add(holoBody);
        const holoHead = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true, transparent: true, opacity: 0.6 }));
        holoHead.position.y = 1.65; holo.add(holoHead);
        const holoRing = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.02, 8, 32), new THREE.MeshBasicMaterial({ color: 0x52d4b6, transparent: true, opacity: 0.7 }));
        holoRing.rotation.x = Math.PI / 2; holoRing.position.y = 0.2; holo.add(holoRing);
        g.add(holo);
        this.animated.push({
            obj: holo, phase: 0,
            fn: (o, dt, self) => {
                self.phase += dt;
                o.rotation.y = self.phase * 0.6;
                o.children[2].rotation.z = self.phase * 1.2;
                o.position.y = 0.4 + Math.sin(self.phase * 1.5) * 0.06;
            }
        });

        // --- Test platformu (kaide) ---
        const pad = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.25, 0.22, 24), new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.3 }));
        pad.position.set(4.6, -0.78, -3.4);
        pad.receiveShadow = true;
        g.add(pad);
        const padRing = new THREE.Mesh(new THREE.TorusGeometry(1.12, 0.035, 10, 40), new THREE.MeshBasicMaterial({ color: 0xffd34e }));
        padRing.rotation.x = Math.PI / 2; padRing.position.set(4.6, -0.66, -3.4);
        g.add(padRing);
        this.animated.push({
            obj: padRing, phase: 0,
            fn: (o, dt, self) => {
                self.phase += dt;
                o.material.color.setHex(Math.sin(self.phase * 2) > 0 ? 0xffd34e : 0x52d4b6);
            }
        });
    }

    // ====================================================
    // 5.2 SENSÖR KALİBRASYON ODASI (dekor + istasyonlar)
    // z = 24..34 bölgesi, giriş kemeri ile
    // ====================================================
    buildCalibrationRoom() {
        const g = new THREE.Group();
        g.name = 'calibration_room';
        this.scene.add(g);
        this.calibrationGroup = g;

        // Zemin platformu
        const floor = new THREE.Mesh(new THREE.BoxGeometry(14, 0.24, 11), new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.5 }));
        floor.position.set(0, -1.28, 29);
        floor.receiveShadow = true;
        g.add(floor);

        // Neon zemin çizgileri
        const lineMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.35 });
        for (let i = -6; i <= 6; i += 2) {
            const l = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 10), lineMat);
            l.rotation.x = -Math.PI / 2;
            l.position.set(i, -1.15, 29);
            g.add(l);
        }

        // Giriş kemeri (z=23.5)
        const archMat = new THREE.MeshStandardMaterial({ color: 0x243f78, roughness: 0.4, metalness: 0.4 });
        [-1.9, 1.9].forEach(x => {
            const pil = new THREE.Mesh(new THREE.BoxGeometry(0.35, 3.4, 0.35), archMat);
            pil.position.set(x, 0.5, 23.5);
            g.add(pil);
        });
        const archTop = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.35, 0.35), archMat);
        archTop.position.set(0, 2.35, 23.5);
        g.add(archTop);
        const archSign = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.55), new THREE.MeshBasicMaterial({ map: WorldSystem.makePanelTexture(['SENSOR KALIBRASYON LAB'], '#ffd34e'), transparent: true }));
        archSign.position.set(0, 2.9, 23.5);
        g.add(archSign);

        // --- RGB kalibrasyon karoları (kırmızı, yeşil, mavi, sarı, beyaz) ---
        const tileColors = [
            { name: 'KIRMIZI', hex: 0xff4757, rgb: [255, 0, 0] },
            { name: 'YESIL', hex: 0x2ed573, rgb: [0, 255, 0] },
            { name: 'MAVI', hex: 0x1e90ff, rgb: [0, 0, 255] },
            { name: 'SARI', hex: 0xffd32e, rgb: [255, 255, 0] },
            { name: 'BEYAZ', hex: 0xf8fafc, rgb: [255, 255, 255] }
        ];
        this.calTiles = [];
        tileColors.forEach((t, i) => {
            const tile = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 1.5), new THREE.MeshStandardMaterial({ color: t.hex, roughness: 0.35 }));
            tile.position.set(-5.2 + i * 2.6, -1.14, 32.4);
            tile.receiveShadow = true;
            tile.userData = { tileName: t.name, tileHex: t.hex, tileRgb: t.rgb };
            g.add(tile);
            this.calTiles.push(tile);

            // Karo numarası direği
            const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.4, 8), new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.6 }));
            pole.position.set(-5.2 + i * 2.6, -0.4, 33.4);
            g.add(pole);
        });

        // --- Mesafe kalibrasyon şeridi (100/75/50/25/10 cm işaret direkleri) ---
        const marks = [100, 75, 50, 25, 10];
        marks.forEach((cm, i) => {
            const x = -6 + i * 3;
            const post = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 0.12), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 }));
            post.position.set(x, -0.75, 25.6);
            g.add(post);
            const label = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.25), new THREE.MeshBasicMaterial({ map: WorldSystem.makePanelTexture([cm + ' cm'], '#ff735c') }));
            label.position.set(x, -0.75, 25.68);
            g.add(label);
        });

        // --- Işık kaynağı (dim edilebilir lamba) ---
        const lampPole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 2.6, 10), new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.6 }));
        lampPole.position.set(6, 0.1, 27);
        g.add(lampPole);
        this.calLampHead = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 10), new THREE.MeshStandardMaterial({ color: 0xfff8e7, emissive: 0xfff8e7, emissiveIntensity: 1.0 }));
        this.calLampHead.position.set(6, 1.6, 27);
        g.add(this.calLampHead);
        this.calLampLight = new THREE.PointLight(0xfff8e7, 1.2, 10);
        this.calLampLight.position.set(6, 1.5, 27);
        g.add(this.calLampLight);

        // --- Ses kaynağı hoparlör ---
        const spk = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.4, 0.6), new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 }));
        spk.position.set(-6, -0.5, 27);
        g.add(spk);
        const spkCone = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.08, 14), new THREE.MeshStandardMaterial({ color: 0xffd34e }));
        spkCone.rotation.x = Math.PI / 2;
        spkCone.position.set(-6, -0.3, 26.7);
        g.add(spkCone);
        this.calSpeaker = spkCone;

        // --- Isı kaynağı küçük füze sobası ---
        const heater = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, 1.0, 12), new THREE.MeshStandardMaterial({ color: 0xff735c, emissive: 0xff2200, emissiveIntensity: 0.35 }));
        heater.position.set(3, -0.7, 26);
        g.add(heater);
        this.calHeater = heater;

        // Oda duvar kaide ışıkları
        [[-7, 29], [7, 29]].forEach(([x, z]) => {
            const strip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 3.2, 0.1), new THREE.MeshBasicMaterial({ color: 0x52d4b6 }));
            strip.position.set(x, 0.4, z);
            g.add(strip);
        });
    }

    // ====================================================
    // 5.13 3D YARDIMCI DRONE (Botti'nin sahne partneri)
    // ====================================================
    buildCompanion() {
        const g = new THREE.Group();
        g.name = 'companion_drone';
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3, metalness: 0.2 }));
        g.add(body);
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x38bdf8, emissiveIntensity: 1.6 }));
        eye.position.set(0, 0.04, 0.17);
        g.add(eye);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.025, 8, 24), new THREE.MeshBasicMaterial({ color: 0xffd34e }));
        ring.rotation.x = Math.PI / 2;
        ring.position.y = -0.05;
        g.add(ring);
        const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.18, 6), new THREE.MeshStandardMaterial({ color: 0x64748b }));
        ant.position.y = 0.26;
        g.add(ant);
        g.visible = false;
        this.scene.add(g);
        this.companion = g;
        this.companionRing = ring;
    }

    // ====================================================
    // 5.17 HAVA KOŞULLARI & ÇEVRE
    // ====================================================
    setWeather(mode) {
        this.weatherMode = mode;
        const bg = this.scene.background;
        const amb = window.app ? window.app.ambientLight : null;
        const dir = window.app ? window.app.dirLight : null;

        // Sensör bozulma katsayıları (gerçekçi etki)
        this.sensorMod = { distNoise: 0, lightMul: 1, soundMul: 1 };

        switch (mode) {
            case 'dark':
                if (bg && bg.isColor) bg.setHex(0x0a0f1d);
                if (amb) amb.intensity = 0.18;
                if (dir) dir.intensity = 0.25;
                this.sensorMod.lightMul = 0.12;
                this.sensorMod.distNoise = 0.06;
                break;
            case 'bright':
                if (bg && bg.isColor) bg.setHex(0xffffff);
                if (amb) amb.intensity = 1.15;
                if (dir) dir.intensity = 2.0;
                this.sensorMod.lightMul = 1.4;
                break;
            case 'fog':
                this.scene.fog = new THREE.Fog(0xdbeafe, 8, 30);
                if (bg && bg.isColor) bg.setHex(0xdbeafe);
                this.sensorMod.distNoise = 0.18;
                this.sensorMod.lightMul = 0.85;
                break;
            case 'rain':
                this.scene.fog = new THREE.Fog(0x94a3b8, 10, 34);
                if (bg && bg.isColor) bg.setHex(0xb6c4d6);
                if (amb) amb.intensity = 0.5;
                if (dir) dir.intensity = 0.7;
                this.sensorMod.distNoise = 0.12;
                this.sensorMod.soundMul = 1.25;
                this.spawnRain();
                break;
            case 'lowvis':
                this.scene.fog = new THREE.Fog(0x64748b, 2, 13);
                if (bg && bg.isColor) bg.setHex(0x64748b);
                if (amb) amb.intensity = 0.35;
                if (dir) dir.intensity = 0.4;
                this.sensorMod.distNoise = 0.35;
                this.sensorMod.lightMul = 0.5;
                break;
            default: // normal
                this.scene.fog = null;
                if (bg && bg.isColor) bg.setHex(0xf0f9ff);
                if (amb) amb.intensity = 0.55;
                if (dir) dir.intensity = 1.4;
                this.clearRain();
                break;
        }
        return this.sensorMod;
    }

    spawnRain() {
        if (this.rain) return;
        const count = 900;
        const pos = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            pos[i * 3] = (Math.random() - 0.5) * 60;
            pos[i * 3 + 1] = Math.random() * 14 - 1;
            pos[i * 3 + 2] = (Math.random() - 0.5) * 60;
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const mat = new THREE.PointsMaterial({ color: 0x9ec8f0, size: 0.09, transparent: true, opacity: 0.65 });
        this.rain = new THREE.Points(geo, mat);
        this.scene.add(this.rain);
    }

    clearRain() {
        if (this.rain) {
            this.scene.remove(this.rain);
            this.rain = null;
        }
    }

    // ====================================================
    // 7.5 SENSÖR VFX (görselleştirilmiş çalışma mantığı)
    // ====================================================

    // Ultrasonik dalga halkaları
    spawnUltrasonicPing(robotGroup) {
        if (!robotGroup) return;
        for (let i = 0; i < 3; i++) {
            const ring = new THREE.Mesh(
                new THREE.TorusGeometry(0.18, 0.022, 8, 24),
                new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.85 })
            );
            const fwd = new THREE.Vector3(Math.sin(robotGroup.rotation.y), 0, Math.cos(robotGroup.rotation.y));
            ring.position.copy(robotGroup.position).add(fwd.clone().multiplyScalar(0.5 + i * 0.25)).add(new THREE.Vector3(0, 0.3, 0));
            ring.rotation.y = robotGroup.rotation.y;
            this.scene.add(ring);
            this.vfxRings.push({ mesh: ring, life: 1.0, grow: 2.4, delay: i * 0.08 });
        }
    }

    // PIR algılama konisi
    setPIRCone(visible, robotGroup) {
        if (visible && !this.pirCone && robotGroup) {
            const geo = new THREE.ConeGeometry(1.5, 3.2, 24, 1, true);
            geo.rotateX(-Math.PI / 2);
            geo.translate(0, 0, 1.6);
            const mat = new THREE.MeshBasicMaterial({ color: 0xffd34e, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false });
            this.pirCone = new THREE.Mesh(geo, mat);
            this.scene.add(this.pirCone);
        }
        if (this.pirCone) {
            this.pirCone.visible = !!visible;
            if (visible && robotGroup) {
                this.pirCone.position.copy(robotGroup.position).add(new THREE.Vector3(0, 0.45, 0));
                this.pirCone.rotation.y = robotGroup.rotation.y;
            }
        }
    }

    // RGB zemine ışık huzmesi
    setColorBeam(on, robotGroup) {
        if (on && !this.colorBeam && robotGroup) {
            const geo = new THREE.CylinderGeometry(0.02, 0.28, 1.2, 12, 1, true);
            const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false });
            this.colorBeam = new THREE.Mesh(geo, mat);
            this.scene.add(this.colorBeam);
        }
        if (this.colorBeam) {
            this.colorBeam.visible = !!on;
            if (on && robotGroup) {
                const fwd = new THREE.Vector3(Math.sin(robotGroup.rotation.y), 0, Math.cos(robotGroup.rotation.y));
                this.colorBeam.position.copy(robotGroup.position).add(fwd.multiplyScalar(0.9)).add(new THREE.Vector3(0, -0.2, 0));
                this.colorBeam.rotation.y = robotGroup.rotation.y;
                const t = performance.now() * 0.004;
                this.colorBeam.material.color.setRGB(0.5 + 0.5 * Math.sin(t), 0.5 + 0.5 * Math.sin(t + 2), 0.5 + 0.5 * Math.sin(t + 4));
            }
        }
    }

    updateVFX(delta) {
        // Ultrasonik halkaları büyüt/soldur
        for (let i = this.vfxRings.length - 1; i >= 0; i--) {
            const r = this.vfxRings[i];
            if (r.delay > 0) { r.delay -= delta; continue; }
            r.life -= delta * 1.4;
            r.mesh.scale.addScalar(r.grow * delta);
            r.mesh.material.opacity = Math.max(0, r.life) * 0.85;
            if (r.life <= 0) {
                this.scene.remove(r.mesh);
                this.vfxRings.splice(i, 1);
            }
        }
        // Yağmur
        if (this.rain) {
            const p = this.rain.geometry.attributes.position;
            for (let i = 0; i < p.count; i++) {
                let y = p.getY(i) - delta * 14;
                if (y < -1.5) y = 12;
                p.setY(i, y);
            }
            p.needsUpdate = true;
        }
    }

    // ====================================================
    // 5.11 SİNEMATİK KAMERA (kontrolü asla kilitler gibi engellemez)
    // ====================================================
    playCinematic(name, robotGroup) {
        if (!robotGroup) return;
        const c = this.cinematic;
        const rp = robotGroup.position.clone();
        const ry = robotGroup.rotation.y;
        const fwd = new THREE.Vector3(Math.sin(ry), 0, Math.cos(ry));
        const side = new THREE.Vector3(Math.cos(ry), 0, -Math.sin(ry));

        let toPos, toTgt = rp.clone().add(new THREE.Vector3(0, 0.4, 0)), dur = 1.4;
        switch (name) {
            case 'garage_exit':
                toPos = rp.clone().add(side.clone().multiplyScalar(3.4)).add(new THREE.Vector3(0, 1.6, 0)).add(fwd.clone().multiplyScalar(-2.2));
                dur = 2.2;
                break;
            case 'first_detection':
                toPos = rp.clone().add(fwd.clone().multiplyScalar(2.6)).add(new THREE.Vector3(0, 1.1, 0)).add(side.clone().multiplyScalar(1.4));
                dur = 1.3;
                break;
            case 'brake':
                toPos = rp.clone().add(side.clone().multiplyScalar(2.8)).add(new THREE.Vector3(0, 0.9, 0));
                dur = 1.2;
                break;
            case 'color_detect':
                toPos = rp.clone().add(new THREE.Vector3(0, 3.0, 0)).add(fwd.clone().multiplyScalar(1.6));
                dur = 1.3;
                break;
            case 'target_follow':
                toPos = rp.clone().add(fwd.clone().multiplyScalar(-2.6)).add(new THREE.Vector3(0, 2.2, 0)).add(side.clone().multiplyScalar(1.8));
                dur = 1.4;
                break;
            case 'mission_complete':
            default:
                toPos = rp.clone().add(side.clone().multiplyScalar(4.2)).add(new THREE.Vector3(0, 2.4, 0)).add(fwd.clone().multiplyScalar(-3));
                dur = 2.0;
                break;
        }
        c.fromPos.copy(this.camera.position);
        c.fromTgt.copy(this.controls.target);
        c.toPos.copy(toPos);
        c.toTgt.copy(toTgt);
        c.t = 0;
        c.dur = dur;
        c.active = true;
        if (window.KidAudio) window.KidAudio.playRobotBeep(520);
    }

    get cinematicActive() { return this.cinematic.active; }

    updateCinematic(delta) {
        const c = this.cinematic;
        if (!c.active) return;
        c.t += delta / c.dur;
        const t = Math.min(1, c.t);
        const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        this.camera.position.lerpVectors(c.fromPos, c.toPos, e);
        this.controls.target.lerpVectors(c.fromTgt, c.toTgt, e);
        this.controls.update();
        if (t >= 1) c.active = false; // kontrol kullanıcıya/chase kameraya geri döner
    }

    // ====================================================
    // ANA GÜNCELLEME
    // ====================================================
    update(delta, robotGroup) {
        const t = performance.now() * 0.001;

        // Dekor animasyonları
        for (const a of this.animated) {
            a.fn(a.obj, delta, a);
        }

        this.updateVFX(delta);
        this.updateCinematic(delta);

        // 5.13 Drone takip (lab modlarında görünür)
        if (this.companion && this.companion.visible && robotGroup) {
            const behind = new THREE.Vector3(-Math.sin(robotGroup.rotation.y), 0, -Math.cos(robotGroup.rotation.y)).multiplyScalar(1.3);
            const target = robotGroup.position.clone().add(behind).add(new THREE.Vector3(0, 1.5 + Math.sin(t * 2.2) * 0.1, 0));
            this.companion.position.lerp(target, 0.04);
            this.companionRing.rotation.z = t * 2;
            this.companion.lookAt(robotGroup.position.x, this.companion.position.y - 0.6, robotGroup.position.z);
        }
    }

    showCompanion(v) { if (this.companion) this.companion.visible = !!v; }
}

window.WorldSystem = WorldSystem;
