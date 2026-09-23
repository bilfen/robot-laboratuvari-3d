/**
 * Robot Laboratuvarı - 3D Robot Parça Üreticisi
 * Tüm parçalar Three.js geometrileri ile çocuk dostu, parlak ve renkli olarak modellenmiştir.
 */

const RobotColors = {
    yellow: 0xffd34e,
    mint: 0x52d4b6,
    coral: 0xff735c,
    blue: 0x243f78,
    sky: 0xa4e6ff,
    pink: 0xff8bbb,
    white: 0xf8fafc,
    metal: 0x64748b,
    gold: 0xfbbf24,
    eyeGlow: 0x38bdf8,
    screenDark: 0x0f172a
};

class RobotPartsFactory {
    static createToyMaterial(colorHex, options = {}) {
        return new THREE.MeshStandardMaterial({
            color: colorHex,
            roughness: options.roughness !== undefined ? options.roughness : 0.3,
            metalness: options.metalness !== undefined ? options.metalness : 0.15,
            emissive: options.emissive || 0x000000,
            emissiveIntensity: options.emissiveIntensity || 0,
            flatShading: options.flatShading || false
        });
    }

    // ==========================================
    // 1. GÖVDELER (BODIES)
    // ==========================================

    // Kare Gövde (Modern Kutu Robot)
    static createSquareBody(color = RobotColors.mint) {
        const group = new THREE.Group();
        group.name = 'body_square';

        const mainMat = this.createToyMaterial(color);
        const accentMat = this.createToyMaterial(RobotColors.yellow);
        const metalMat = this.createToyMaterial(RobotColors.metal, { metalness: 0.6, roughness: 0.2 });

        // Ana kutu gövde
        const boxGeo = new THREE.BoxGeometry(1.8, 1.8, 1.4);
        const boxMesh = new THREE.Mesh(boxGeo, mainMat);
        boxMesh.castShadow = true;
        boxMesh.receiveShadow = true;
        group.add(boxMesh);

        // Göğüs Ekranı
        const screenGeo = new THREE.BoxGeometry(1.1, 0.9, 0.1);
        const screenMat = new THREE.MeshStandardMaterial({
            color: 0x0f172a,
            emissive: 0x1e3a8a,
            emissiveIntensity: 0.4
        });
        const screen = new THREE.Mesh(screenGeo, screenMat);
        screen.position.set(0, 0.15, 0.71);
        group.add(screen);

        // Göğüs Kalp / Enerji Çekirdeği
        const heartGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.1, 16);
        heartGeo.rotateX(Math.PI / 2);
        const heartMat = new THREE.MeshStandardMaterial({
            color: 0x38bdf8,
            emissive: 0x38bdf8,
            emissiveIntensity: 0.9
        });
        const heart = new THREE.Mesh(heartGeo, heartMat);
        heart.name = 'powerCore';
        heart.position.set(0, 0.15, 0.77);
        group.add(heart);

        // Dekoratif Butonlar
        [-0.35, 0, 0.35].forEach((x, i) => {
            const btnColor = [0xff4757, 0x2ed573, 0xffa502][i];
            const btnGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.06, 12);
            btnGeo.rotateX(Math.PI / 2);
            const btn = new THREE.Mesh(btnGeo, this.createToyMaterial(btnColor));
            btn.position.set(x, -0.5, 0.72);
            group.add(btn);
        });

        // Yan omuz mafsalları (Sol & Sağ)
        [-0.95, 0.95].forEach(x => {
            const jointGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.3, 16);
            jointGeo.rotateZ(Math.PI / 2);
            const joint = new THREE.Mesh(jointGeo, metalMat);
            joint.position.set(x, 0.3, 0);
            group.add(joint);
        });

        group.userData = {
            type: 'body',
            subtype: 'square',
            sockets: {
                head: new THREE.Vector3(0, 1.05, 0),
                armLeft: new THREE.Vector3(-1.1, 0.3, 0),
                armRight: new THREE.Vector3(1.1, 0.3, 0),
                legs: new THREE.Vector3(0, -1.0, 0),
                chest: new THREE.Vector3(0, 0.15, 0.8),
                back: new THREE.Vector3(0, 0.2, -0.75)
            }
        };

        return group;
    }

    // Yuvarlak Gövde (Sevimli Kapsül / Küre Robot)
    static createRoundBody(color = RobotColors.yellow) {
        const group = new THREE.Group();
        group.name = 'body_round';

        const mainMat = this.createToyMaterial(color);
        const bellyMat = this.createToyMaterial(RobotColors.white);

        // Ana gövde (Yumuşatılmış Kapsül / Küre)
        const bodyGeo = new THREE.SphereGeometry(1.1, 32, 24);
        bodyGeo.scale(1.0, 1.15, 0.95);
        const bodyMesh = new THREE.Mesh(bodyGeo, mainMat);
        bodyMesh.castShadow = true;
        bodyMesh.receiveShadow = true;
        group.add(bodyMesh);

        // Göbek paneli (Beyaz tatlı yuvarlak)
        const bellyGeo = new THREE.SphereGeometry(0.85, 24, 16);
        bellyGeo.scale(0.85, 0.9, 0.35);
        const belly = new THREE.Mesh(bellyGeo, bellyMat);
        belly.position.set(0, -0.05, 0.72);
        group.add(belly);

        // Göğüs Gösterge Çizgileri
        for (let i = 0; i < 3; i++) {
            const barGeo = new THREE.BoxGeometry(0.5 - i * 0.1, 0.05, 0.04);
            const barMat = new THREE.MeshStandardMaterial({
                color: 0x52d4b6,
                emissive: 0x52d4b6,
                emissiveIntensity: 0.6
            });
            const bar = new THREE.Mesh(barGeo, barMat);
            bar.position.set(0, 0.2 - i * 0.12, 0.95);
            group.add(bar);
        }

        group.userData = {
            type: 'body',
            subtype: 'round',
            sockets: {
                head: new THREE.Vector3(0, 1.25, 0),
                armLeft: new THREE.Vector3(-1.15, 0.2, 0),
                armRight: new THREE.Vector3(1.15, 0.2, 0),
                legs: new THREE.Vector3(0, -1.15, 0),
                chest: new THREE.Vector3(0, 0.1, 0.95),
                back: new THREE.Vector3(0, 0.2, -0.95)
            }
        };

        return group;
    }

    // Üçgen Gövde (Fütüristik / Hızlı Yarışçı Robot)
    static createTriangleBody(color = RobotColors.coral) {
        const group = new THREE.Group();
        group.name = 'body_triangle';

        const mainMat = this.createToyMaterial(color);
        const metalMat = this.createToyMaterial(RobotColors.metal, { metalness: 0.5 });

        // Prizmatik Üçgen Gövde
        const triGeo = new THREE.ConeGeometry(1.35, 2.0, 3);
        triGeo.rotateY(Math.PI);
        const triMesh = new THREE.Mesh(triGeo, mainMat);
        triMesh.castShadow = true;
        group.add(triMesh);

        // Ön havalandırma / Izgara
        const grillGeo = new THREE.BoxGeometry(0.7, 0.6, 0.08);
        const grillMat = this.createToyMaterial(RobotColors.screenDark);
        const grill = new THREE.Mesh(grillGeo, grillMat);
        grill.position.set(0, -0.3, 0.65);
        group.add(grill);

        // Neon Işık Çizgisi
        const neonGeo = new THREE.BoxGeometry(0.15, 0.9, 0.06);
        const neonMat = new THREE.MeshStandardMaterial({
            color: 0xffd34e,
            emissive: 0xffd34e,
            emissiveIntensity: 0.8
        });
        const neon = new THREE.Mesh(neonGeo, neonMat);
        neon.position.set(0, 0.35, 0.45);
        group.add(neon);

        group.userData = {
            type: 'body',
            subtype: 'triangle',
            sockets: {
                head: new THREE.Vector3(0, 1.15, 0),
                armLeft: new THREE.Vector3(-1.05, 0.0, 0),
                armRight: new THREE.Vector3(1.05, 0.0, 0),
                legs: new THREE.Vector3(0, -1.05, 0),
                chest: new THREE.Vector3(0, 0.1, 0.6),
                back: new THREE.Vector3(0, 0.1, -0.6)
            }
        };

        return group;
    }

    // Tekerlekli Gezgin Gövde (Rover / Arazi Robotu)
    static createWheelBody(color = RobotColors.blue) {
        const group = new THREE.Group();
        group.name = 'body_wheel';

        const mainMat = this.createToyMaterial(color);
        const tireMat = this.createToyMaterial(0x1e293b, { roughness: 0.8 });
        const rimMat = this.createToyMaterial(RobotColors.yellow);

        // Şasi
        const chassisGeo = new THREE.BoxGeometry(1.6, 1.2, 1.8);
        const chassis = new THREE.Mesh(chassisGeo, mainMat);
        chassis.position.y = 0.2;
        chassis.castShadow = true;
        group.add(chassis);

        // 4 Büyük Arazi Tekerleği
        const wheelGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.35, 18);
        wheelGeo.rotateZ(Math.PI / 2);

        const wheelPositions = [
            [-0.95, -0.2, 0.6],  // Ön sol
            [0.95, -0.2, 0.6],   // Ön sağ
            [-0.95, -0.2, -0.6], // Arka sol
            [0.95, -0.2, -0.6]   // Arka sağ
        ];

        wheelPositions.forEach((pos, idx) => {
            const wheelGroup = new THREE.Group();
            wheelGroup.position.set(...pos);

            const tire = new THREE.Mesh(wheelGeo, tireMat);
            tire.castShadow = true;
            wheelGroup.add(tire);

            // Jant
            const rimGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.37, 12);
            rimGeo.rotateZ(Math.PI / 2);
            const rim = new THREE.Mesh(rimGeo, rimMat);
            wheelGroup.add(rim);

            wheelGroup.name = `wheel_${idx}`;
            group.add(wheelGroup);
        });

        // Ön tampon
        const bumperGeo = new THREE.BoxGeometry(1.5, 0.2, 0.2);
        const bumper = new THREE.Mesh(bumperGeo, this.createToyMaterial(RobotColors.coral));
        bumper.position.set(0, -0.1, 1.0);
        group.add(bumper);

        group.userData = {
            type: 'body',
            subtype: 'wheel',
            sockets: {
                head: new THREE.Vector3(0, 1.0, 0),
                armLeft: new THREE.Vector3(-0.95, 0.4, 0),
                armRight: new THREE.Vector3(0.95, 0.4, 0),
                legs: new THREE.Vector3(0, -0.4, 0),
                chest: new THREE.Vector3(0, 0.3, 0.95),
                back: new THREE.Vector3(0, 0.3, -0.95)
            }
        };

        return group;
    }

    // ==========================================
    // 2. KAFALAR (HEADS)
    // ==========================================

    // Yuvarlak Gülen Kafa (Sevimli Robot)
    static createRoundHead(color = RobotColors.sky) {
        const group = new THREE.Group();
        group.name = 'head_round';

        const headMat = this.createToyMaterial(color);

        // Kafa küresi
        const headGeo = new THREE.SphereGeometry(0.7, 24, 20);
        const headMesh = new THREE.Mesh(headGeo, headMat);
        headMesh.castShadow = true;
        group.add(headMesh);

        // Kocaman sevimli gözler (Sol & Sağ)
        [-0.24, 0.24].forEach(x => {
            // Göz çerçevesi
            const eyeFrameGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.08, 16);
            eyeFrameGeo.rotateX(Math.PI / 2);
            const eyeFrame = new THREE.Mesh(eyeFrameGeo, this.createToyMaterial(RobotColors.white));
            eyeFrame.position.set(x, 0.1, 0.62);
            group.add(eyeFrame);

            // Parlayan göz bebeği
            const eyeGlowGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.09, 16);
            eyeGlowGeo.rotateX(Math.PI / 2);
            const eyeGlowMat = new THREE.MeshStandardMaterial({
                color: 0x0284c7,
                emissive: 0x38bdf8,
                emissiveIntensity: 0.8
            });
            const eyeGlow = new THREE.Mesh(eyeGlowGeo, eyeGlowMat);
            eyeGlow.name = 'eye';
            eyeGlow.position.set(x, 0.1, 0.64);
            group.add(eyeGlow);
        });

        // Gülen sevimli ağız
        const smileGeo = new THREE.TorusGeometry(0.15, 0.035, 8, 16, Math.PI);
        smileGeo.rotateZ(Math.PI);
        const smileMat = this.createToyMaterial(0x0f172a);
        const smile = new THREE.Mesh(smileGeo, smileMat);
        smile.position.set(0, -0.22, 0.65);
        group.add(smile);

        // Tepe Anteni
        const stalkGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.45, 8);
        const stalk = new THREE.Mesh(stalkGeo, this.createToyMaterial(RobotColors.metal));
        stalk.position.set(0, 0.85, 0);
        group.add(stalk);

        // Anten Ucu Işıklı Top
        const ballGeo = new THREE.SphereGeometry(0.12, 16, 12);
        const ballMat = new THREE.MeshStandardMaterial({
            color: 0xff4757,
            emissive: 0xff4757,
            emissiveIntensity: 0.9
        });
        const ball = new THREE.Mesh(ballGeo, ballMat);
        ball.name = 'antennaLight';
        ball.position.set(0, 1.1, 0);
        group.add(ball);

        // Kulaklar (Yan silindirler)
        [-0.72, 0.72].forEach(x => {
            const earGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.16, 16);
            earGeo.rotateZ(Math.PI / 2);
            const ear = new THREE.Mesh(earGeo, this.createToyMaterial(RobotColors.yellow));
            ear.position.set(x, 0.05, 0);
            group.add(ear);
        });

        group.userData = { type: 'head', socketOffset: new THREE.Vector3(0, 0.65, 0) };
        return group;
    }

    // Ekranlı Retro Kafa (Monitör / TV Kafa)
    static createScreenHead(color = RobotColors.yellow) {
        const group = new THREE.Group();
        group.name = 'head_screen';

        const headMat = this.createToyMaterial(color);

        // Monitör kutusu
        const boxGeo = new THREE.BoxGeometry(1.2, 0.95, 0.95);
        const box = new THREE.Mesh(boxGeo, headMat);
        box.castShadow = true;
        group.add(box);

        // Monitör ekranı
        const scrGeo = new THREE.BoxGeometry(0.9, 0.65, 0.06);
        const scrMat = new THREE.MeshStandardMaterial({
            color: 0x022c22,
            emissive: 0x059669,
            emissiveIntensity: 0.5
        });
        const scr = new THREE.Mesh(scrGeo, scrMat);
        scr.position.set(0, 0.05, 0.49);
        group.add(scr);

        // Dijital Piksel Gözler (^ _ ^)
        [-0.22, 0.22].forEach(x => {
            const pixGeo = new THREE.BoxGeometry(0.15, 0.15, 0.03);
            const pixMat = new THREE.MeshStandardMaterial({
                color: 0x34d399,
                emissive: 0x10b981,
                emissiveIntensity: 1.0
            });
            const pix = new THREE.Mesh(pixGeo, pixMat);
            pix.position.set(x, 0.1, 0.52);
            group.add(pix);
        });

        // Çift yaylı tepe antenleri
        [-0.3, 0.3].forEach((x, i) => {
            const antGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.35, 8);
            antGeo.rotateZ(i === 0 ? 0.2 : -0.2);
            const ant = new THREE.Mesh(antGeo, this.createToyMaterial(RobotColors.metal));
            ant.position.set(x, 0.6, 0);
            group.add(ant);

            const tipGeo = new THREE.SphereGeometry(0.09, 12, 10);
            const tip = new THREE.Mesh(tipGeo, this.createToyMaterial(RobotColors.coral));
            tip.position.set(x + (i === 0 ? -0.05 : 0.05), 0.78, 0);
            group.add(tip);
        });

        group.userData = { type: 'head', socketOffset: new THREE.Vector3(0, 0.55, 0) };
        return group;
    }

    // Gözlüklü / Vizörlü Kafa
    static createVisorHead(color = RobotColors.coral) {
        const group = new THREE.Group();
        group.name = 'head_visor';

        const headMat = this.createToyMaterial(color);

        // Kafa kapsülü
        const geo = new THREE.SphereGeometry(0.68, 24, 18);
        geo.scale(0.95, 1.05, 0.95);
        const mesh = new THREE.Mesh(geo, headMat);
        mesh.castShadow = true;
        group.add(mesh);

        // Tek parça kavisli neon vizör
        const visorGeo = new THREE.CylinderGeometry(0.69, 0.69, 0.3, 24, 1, false, 0, Math.PI);
        visorGeo.rotateY(-Math.PI / 2);
        const visorMat = new THREE.MeshStandardMaterial({
            color: 0xf43f5e,
            emissive: 0xff0055,
            emissiveIntensity: 0.85,
            roughness: 0.1
        });
        const visor = new THREE.Mesh(visorGeo, visorMat);
        visor.position.set(0, 0.12, 0.02);
        group.add(visor);

        group.userData = { type: 'head', socketOffset: new THREE.Vector3(0, 0.6, 0) };
        return group;
    }

    // ==========================================
    // 3. KOLLAR (ARMS)
    // ==========================================

    // Kıskaçlı Mekanik Kol
    static createClampArm(isLeft = true, color = RobotColors.yellow) {
        const group = new THREE.Group();
        group.name = isLeft ? 'arm_clamp_left' : 'arm_clamp_right';

        const armMat = this.createToyMaterial(color);
        const metalMat = this.createToyMaterial(RobotColors.metal, { metalness: 0.6 });

        // Üst kol kemiği
        const upperArmGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.7, 12);
        const upperArm = new THREE.Mesh(upperArmGeo, armMat);
        upperArm.position.y = -0.35;
        upperArm.castShadow = true;
        group.add(upperArm);

        // Dirsek mafsalı
        const elbowGeo = new THREE.SphereGeometry(0.16, 12, 10);
        const elbow = new THREE.Mesh(elbowGeo, metalMat);
        elbow.position.y = -0.7;
        group.add(elbow);

        // Alt kol
        const lowerArmGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.6, 12);
        const lowerArm = new THREE.Mesh(lowerArmGeo, armMat);
        lowerArm.position.y = -1.0;
        group.add(lowerArm);

        // Kıskaç El Grubu
        const handGroup = new THREE.Group();
        handGroup.position.y = -1.35;

        const baseGeo = new THREE.BoxGeometry(0.25, 0.1, 0.2);
        const base = new THREE.Mesh(baseGeo, metalMat);
        handGroup.add(base);

        // Kıskaç Parmakları (2 adet)
        [-0.1, 0.1].forEach(x => {
            const clawGeo = new THREE.BoxGeometry(0.06, 0.28, 0.15);
            const claw = new THREE.Mesh(clawGeo, this.createToyMaterial(RobotColors.coral));
            claw.position.set(x, -0.15, 0);
            handGroup.add(claw);
        });

        group.add(handGroup);

        group.userData = { type: 'arm', isLeft: isLeft };
        return group;
    }

    // Yuvarlak Pofuduk Kol (Tatlı Küresel El)
    static createRoundArm(isLeft = true, color = RobotColors.sky) {
        const group = new THREE.Group();
        group.name = isLeft ? 'arm_round_left' : 'arm_round_right';

        const armMat = this.createToyMaterial(color);

        // Kavisli kol borusu
        const armGeo = new THREE.CylinderGeometry(0.14, 0.12, 1.1, 14);
        const arm = new THREE.Mesh(armGeo, armMat);
        arm.position.y = -0.55;
        arm.castShadow = true;
        group.add(arm);

        // Beyaz Eldiven / Yuvarlak El
        const handGeo = new THREE.SphereGeometry(0.24, 16, 14);
        const handMat = this.createToyMaterial(RobotColors.white);
        const hand = new THREE.Mesh(handGeo, handMat);
        hand.position.y = -1.2;
        group.add(hand);

        group.userData = { type: 'arm', isLeft: isLeft };
        return group;
    }

    // Manyetik / Roket Fırlatıcı Kol
    static createBlasterArm(isLeft = true, color = RobotColors.coral) {
        const group = new THREE.Group();
        group.name = isLeft ? 'arm_blaster_left' : 'arm_blaster_right';

        const armMat = this.createToyMaterial(color);
        const metalMat = this.createToyMaterial(RobotColors.metal, { metalness: 0.7 });

        // Kol gövdesi
        const armGeo = new THREE.CylinderGeometry(0.16, 0.14, 0.9, 16);
        const arm = new THREE.Mesh(armGeo, armMat);
        arm.position.y = -0.45;
        group.add(arm);

        // Namlu / Fırlatıcı
        const nozzleGeo = new THREE.CylinderGeometry(0.22, 0.16, 0.45, 16);
        const nozzle = new THREE.Mesh(nozzleGeo, metalMat);
        nozzle.position.y = -1.0;
        group.add(nozzle);

        // Işıltılı enerji ucu
        const energyGeo = new THREE.SphereGeometry(0.13, 12, 10);
        const energyMat = new THREE.MeshStandardMaterial({
            color: 0x38bdf8,
            emissive: 0x0284c7,
            emissiveIntensity: 0.9
        });
        const energy = new THREE.Mesh(energyGeo, energyMat);
        energy.position.y = -1.2;
        group.add(energy);

        group.userData = { type: 'arm', isLeft: isLeft };
        return group;
    }

    // ==========================================
    // 4. BACAKLAR & HAREKET BİRİMLERİ (LEGS & WHEELS)
    // ==========================================

    // Çift Bipedal Robot Ayaklar
    static createBipedalLegs(color = RobotColors.blue) {
        const group = new THREE.Group();
        group.name = 'legs_bipedal';

        const legMat = this.createToyMaterial(color);
        const bootMat = this.createToyMaterial(RobotColors.coral);

        [-0.45, 0.45].forEach(x => {
            const legSub = new THREE.Group();
            legSub.position.x = x;

            // Bacak borusu
            const legGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.85, 12);
            const leg = new THREE.Mesh(legGeo, legMat);
            leg.position.y = -0.42;
            leg.castShadow = true;
            legSub.add(leg);

            // Diz eklemi
            const kneeGeo = new THREE.SphereGeometry(0.18, 12, 10);
            const knee = new THREE.Mesh(kneeGeo, this.createToyMaterial(RobotColors.metal));
            knee.position.y = -0.42;
            legSub.add(knee);

            // Sevimli robot botu / ayak
            const bootGeo = new THREE.BoxGeometry(0.38, 0.22, 0.65);
            const boot = new THREE.Mesh(bootGeo, bootMat);
            boot.position.set(0, -0.9, 0.12);
            boot.castShadow = true;
            legSub.add(boot);

            group.add(legSub);
        });

        group.userData = { type: 'legs', socketOffset: new THREE.Vector3(0, 0, 0) };
        return group;
    }

    // Tek Büyük Denge Tekerleği (Gizmo Bot)
    static createSingleWheel(color = RobotColors.yellow) {
        const group = new THREE.Group();
        group.name = 'legs_single_wheel';

        const tireMat = this.createToyMaterial(0x1e293b, { roughness: 0.9 });
        const rimMat = this.createToyMaterial(color);

        // Çatal bağlantısı
        const forkGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.6, 12);
        const fork = new THREE.Mesh(forkGeo, this.createToyMaterial(RobotColors.metal));
        fork.position.y = -0.3;
        group.add(fork);

        // Büyük tekerlek
        const wheelGroup = new THREE.Group();
        wheelGroup.name = 'rolling_wheel';
        wheelGroup.position.y = -0.75;

        const tireGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.35, 24);
        tireGeo.rotateZ(Math.PI / 2);
        const tire = new THREE.Mesh(tireGeo, tireMat);
        tire.castShadow = true;
        wheelGroup.add(tire);

        const rimGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.38, 16);
        rimGeo.rotateZ(Math.PI / 2);
        const rim = new THREE.Mesh(rimGeo, rimMat);
        wheelGroup.add(rim);

        group.add(wheelGroup);

        group.userData = { type: 'legs' };
        return group;
    }

    // Roket İtici / Uçan Jet Nozulu
    static createRocketBooster(color = RobotColors.metal) {
        const group = new THREE.Group();
        group.name = 'legs_rocket';

        const metalMat = this.createToyMaterial(color, { metalness: 0.7, roughness: 0.2 });

        // Nozul konisi
        const coneGeo = new THREE.CylinderGeometry(0.3, 0.65, 0.9, 18, 1, true);
        const cone = new THREE.Mesh(coneGeo, metalMat);
        cone.position.y = -0.45;
        group.add(cone);

        // Parıldayan Jet Alevi (Turuncu/Mavi)
        const flameGeo = new THREE.ConeGeometry(0.4, 0.9, 16);
        flameGeo.rotateX(Math.PI);
        const flameMat = new THREE.MeshBasicMaterial({
            color: 0x38bdf8,
            transparent: true,
            opacity: 0.85
        });
        const flame = new THREE.Mesh(flameGeo, flameMat);
        flame.name = 'jetFlame';
        flame.position.y = -1.2;
        group.add(flame);

        group.userData = { type: 'legs' };
        return group;
    }

    // ==========================================
    // 5. AKSESUARLAR & SENSÖRLER
    // ==========================================

    // Dönen Pervane Şapkası
    static createPropeller(color = RobotColors.coral) {
        const group = new THREE.Group();
        group.name = 'acc_propeller';

        // Göbek
        const hubGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.15, 16);
        const hub = new THREE.Mesh(hubGeo, this.createToyMaterial(RobotColors.yellow));
        group.add(hub);

        // Dönen kanatlar
        const blades = new THREE.Group();
        blades.name = 'rotor_blades';

        [-0.45, 0.45].forEach(x => {
            const bladeGeo = new THREE.BoxGeometry(0.45, 0.03, 0.12);
            const blade = new THREE.Mesh(bladeGeo, this.createToyMaterial(color));
            blade.position.x = x;
            blades.add(blade);
        });

        blades.position.y = 0.1;
        group.add(blades);

        group.userData = { type: 'accessory' };
        return group;
    }

    // 3D Mesafe Sensörü (Ultrasonik Gözler)
    static createDistanceSensor() {
        const group = new THREE.Group();
        group.name = 'sensor_distance';

        const pcbMat = this.createToyMaterial(0x1e3a8a); // Mavi PCB devre kartı
        const sensorMat = this.createToyMaterial(RobotColors.metal, { metalness: 0.8 });

        // Kart tabanı
        const boardGeo = new THREE.BoxGeometry(0.8, 0.45, 0.1);
        const board = new THREE.Mesh(boardGeo, pcbMat);
        group.add(board);

        // Çift ultrasonik göz
        [-0.22, 0.22].forEach(x => {
            const eyeGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.2, 16);
            eyeGeo.rotateX(Math.PI / 2);
            const eye = new THREE.Mesh(eyeGeo, sensorMat);
            eye.position.set(x, 0, 0.12);
            group.add(eye);

            // İç ızgara
            const gridGeo = new THREE.CircleGeometry(0.11, 12);
            const gridMat = new THREE.MeshBasicMaterial({ color: 0x0284c7 });
            const grid = new THREE.Mesh(gridGeo, gridMat);
            grid.position.set(x, 0, 0.221);
            group.add(grid);
        });

        group.userData = { type: 'sensor', sensorType: 'distance' };
        return group;
    }

    // 3D Işık Sensörü (LDR / Fotodirenç)
    static createLightSensor() {
        const group = new THREE.Group();
        group.name = 'sensor_light';

        const baseGeo = new THREE.CylinderGeometry(0.28, 0.32, 0.15, 16);
        baseGeo.rotateX(Math.PI / 2);
        const base = new THREE.Mesh(baseGeo, this.createToyMaterial(RobotColors.metal));
        group.add(base);

        // Kubbe optik lens
        const domeGeo = new THREE.SphereGeometry(0.2, 16, 12);
        const domeMat = new THREE.MeshStandardMaterial({
            color: 0xffd34e,
            emissive: 0xffd34e,
            emissiveIntensity: 0.6,
            roughness: 0.1,
            transparent: true,
            opacity: 0.9
        });
        const dome = new THREE.Mesh(domeGeo, domeMat);
        dome.name = 'lightSensorDome';
        dome.position.z = 0.12;
        group.add(dome);

        group.userData = { type: 'sensor', sensorType: 'light' };
        return group;
    }

    // 3D Isı Sensörü (Termometre Çubuğu)
    static createTemperatureSensor() {
        const group = new THREE.Group();
        group.name = 'sensor_temp';

        // Cam tüp
        const tubeGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.7, 12);
        const tubeMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.5,
            roughness: 0.1
        });
        const tube = new THREE.Mesh(tubeGeo, tubeMat);
        group.add(tube);

        // İç cıva / sıvı
        const fluidGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.45, 10);
        const fluidMat = new THREE.MeshBasicMaterial({ color: 0xff4757 });
        const fluid = new THREE.Mesh(fluidGeo, fluidMat);
        fluid.name = 'tempLiquid';
        fluid.position.y = -0.1;
        group.add(fluid);

        // Alt hazne
        const bulbGeo = new THREE.SphereGeometry(0.14, 14, 12);
        const bulb = new THREE.Mesh(bulbGeo, fluidMat);
        bulb.position.y = -0.38;
        group.add(bulb);

        group.userData = { type: 'sensor', sensorType: 'temp' };
        return group;
    }

    // 3D Ses Sensörü (Mini Mikrofon)
    static createSoundSensor() {
        const group = new THREE.Group();
        group.name = 'sensor_sound';

        // Mikrofon kapsülü
        const capGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.35, 16);
        capGeo.rotateX(Math.PI / 2);
        const capMat = this.createToyMaterial(RobotColors.gold, { metalness: 0.8 });
        const cap = new THREE.Mesh(capGeo, capMat);
        group.add(cap);

        // Ön ızgara
        const grillGeo = new THREE.SphereGeometry(0.17, 16, 12);
        const grill = new THREE.Mesh(grillGeo, this.createToyMaterial(0x1e293b));
        grill.position.z = 0.18;
        group.add(grill);

        group.userData = { type: 'sensor', sensorType: 'sound' };
        return group;
    }

    // 3D Renk Sensörü (RGB Tarayıcı)
    static createColorSensor() {
        const group = new THREE.Group();
        group.name = 'sensor_color';

        const baseGeo = new THREE.BoxGeometry(0.5, 0.5, 0.12);
        const base = new THREE.Mesh(baseGeo, this.createToyMaterial(0x1e293b));
        group.add(base);

        // Üç renkli LED (Kırmızı, Yeşil, Mavi)
        const ledPositions = [
            [-0.12, 0.1, 0.08],
            [0.12, 0.1, 0.08],
            [0, -0.12, 0.08]
        ];
        const ledColors = [0xff4757, 0x2ed573, 0x1e90ff];

        ledPositions.forEach((pos, idx) => {
            const ledGeo = new THREE.SphereGeometry(0.07, 12, 10);
            const ledMat = new THREE.MeshStandardMaterial({
                color: ledColors[idx],
                emissive: ledColors[idx],
                emissiveIntensity: 0.8
            });
            const led = new THREE.Mesh(ledGeo, ledMat);
            led.position.set(...pos);
            led.name = `rgb_led_${idx}`;
            group.add(led);
        });

        group.userData = { type: 'sensor', sensorType: 'color' };
        return group;
    }

    // ==========================================
    // 6. YENİ GELİŞMİŞ GÖVDELER (ADVANCED BODIES)
    // ==========================================

    // Zırhlı Mecha Gövde (Heavy Mecha Core)
    static createMechaBody(color = RobotColors.blue) {
        const group = new THREE.Group();
        group.name = 'body_mecha';

        const mainMat = this.createToyMaterial(color, { roughness: 0.25, metalness: 0.35 });
        const darkMat = this.createToyMaterial(0x1e293b, { roughness: 0.5 });
        const goldMat = this.createToyMaterial(RobotColors.gold, { metalness: 0.8 });

        // Ana zırhlı göğüs
        const chestGeo = new THREE.BoxGeometry(2.0, 1.9, 1.5);
        const chest = new THREE.Mesh(chestGeo, mainMat);
        chest.castShadow = true;
        group.add(chest);

        // Omuz Roket Yuvaları (Sol & Sağ)
        [-0.95, 0.95].forEach(x => {
            const podGeo = new THREE.BoxGeometry(0.5, 0.6, 0.9);
            const pod = new THREE.Mesh(podGeo, darkMat);
            pod.position.set(x, 0.9, 0);
            group.add(pod);

            // Roket uçları
            [-0.1, 0.1].forEach(rx => {
                const rGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.2, 12);
                rGeo.rotateX(Math.PI / 2);
                const rMesh = new THREE.Mesh(rGeo, new THREE.MeshStandardMaterial({ color: 0xff4757, emissive: 0xff0000, emissiveIntensity: 0.5 }));
                rMesh.position.set(x + rx, 0.9, 0.46);
                group.add(rMesh);
            });
        });

        // Dönen Plazma Reaktör Çekirdeği
        const coreGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.15, 24);
        coreGeo.rotateX(Math.PI / 2);
        const coreMat = new THREE.MeshStandardMaterial({
            color: 0x00f2fe,
            emissive: 0x00f2fe,
            emissiveIntensity: 1.2
        });
        const core = new THREE.Mesh(coreGeo, coreMat);
        core.name = 'powerCore';
        core.position.set(0, 0.15, 0.76);
        group.add(core);

        // Reaktör koruma kafesi (Altın)
        const ringGeo = new THREE.TorusGeometry(0.42, 0.05, 12, 24);
        const ring = new THREE.Mesh(ringGeo, goldMat);
        ring.position.set(0, 0.15, 0.77);
        group.add(ring);

        group.userData = {
            type: 'body',
            subtype: 'mecha',
            sockets: {
                head: new THREE.Vector3(0, 1.15, 0),
                armLeft: new THREE.Vector3(-1.25, 0.35, 0),
                armRight: new THREE.Vector3(1.25, 0.35, 0),
                legs: new THREE.Vector3(0, -1.05, 0),
                chest: new THREE.Vector3(0, 0.15, 0.85),
                back: new THREE.Vector3(0, 0.3, -0.85)
            }
        };
        return group;
    }

    // ==========================================
    // 7. YENİ GELİŞMİŞ KAFALAR (ADVANCED HEADS)
    // ==========================================

    // Siber Samuray Kaskı (Gundam/Mecha Helmet)
    static createCyberHelmetHead(color = RobotColors.coral) {
        const group = new THREE.Group();
        group.name = 'head_cyber_helmet';

        const mainMat = this.createToyMaterial(color, { roughness: 0.2 });
        const goldMat = this.createToyMaterial(RobotColors.gold, { metalness: 0.85 });

        // Ana kask
        const helmetGeo = new THREE.BoxGeometry(1.2, 1.1, 1.2);
        const helmet = new THREE.Mesh(helmetGeo, mainMat);
        helmet.castShadow = true;
        group.add(helmet);

        // Altın V-Anten (Gundam Crest)
        const crestGeo = new THREE.ConeGeometry(0.18, 0.75, 4);
        const crestLeft = new THREE.Mesh(crestGeo, goldMat);
        crestLeft.rotation.z = -0.55;
        crestLeft.position.set(-0.25, 0.85, 0.4);
        group.add(crestLeft);

        const crestRight = new THREE.Mesh(crestGeo, goldMat);
        crestRight.rotation.z = 0.55;
        crestRight.position.set(0.25, 0.85, 0.4);
        group.add(crestRight);

        // Çift Neon Göz Çizgisi
        [-0.26, 0.26].forEach(x => {
            const eyeGeo = new THREE.BoxGeometry(0.26, 0.08, 0.08);
            const eyeMat = new THREE.MeshStandardMaterial({
                color: 0x38bdf8,
                emissive: 0x38bdf8,
                emissiveIntensity: 1.2
            });
            const eye = new THREE.Mesh(eyeGeo, eyeMat);
            eye.name = 'eye';
            eye.position.set(x, 0.08, 0.62);
            eye.rotation.z = x < 0 ? -0.15 : 0.15;
            group.add(eye);
        });

        // Yanak Havalandırma Egzozları
        [-0.62, 0.62].forEach(x => {
            const exGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.25, 12);
            exGeo.rotateZ(Math.PI / 2);
            const ex = new THREE.Mesh(exGeo, this.createToyMaterial(0x1e293b));
            ex.position.set(x, -0.15, 0.2);
            group.add(ex);
        });

        group.userData = { type: 'head', socketOffset: new THREE.Vector3(0, 0.65, 0) };
        return group;
    }

    // Hologram Cam Kubbe Kafa (Hologram Dome Head)
    static createHologramDomeHead() {
        const group = new THREE.Group();
        group.name = 'head_hologram_dome';

        // Şeffaf Cam Küre
        const domeGeo = new THREE.SphereGeometry(0.75, 24, 20);
        const domeMat = new THREE.MeshPhysicalMaterial({
            color: 0xa4e6ff,
            transparent: true,
            opacity: 0.45,
            roughness: 0.05,
            transmission: 0.8,
            thickness: 0.5
        });
        const dome = new THREE.Mesh(domeGeo, domeMat);
        dome.position.y = 0.2;
        group.add(dome);

        // İçeride yüzen parlayan holografik çekirdek / emoji
        const holoGeo = new THREE.SphereGeometry(0.35, 16, 14);
        const holoMat = new THREE.MeshStandardMaterial({
            color: 0x00f2fe,
            emissive: 0x00f2fe,
            emissiveIntensity: 1.4
        });
        const holo = new THREE.Mesh(holoGeo, holoMat);
        holo.name = 'eye';
        holo.position.y = 0.2;
        group.add(holo);

        // Dönen mini yörünge halkası
        const orbitGeo = new THREE.TorusGeometry(0.5, 0.03, 8, 24);
        const orbitMat = new THREE.MeshBasicMaterial({ color: 0xffd34e });
        const orbit = new THREE.Mesh(orbitGeo, orbitMat);
        orbit.name = 'holo_orbit';
        orbit.position.y = 0.2;
        orbit.rotation.x = Math.PI / 3;
        group.add(orbit);

        // Metalik boyun kaidesi
        const neckGeo = new THREE.CylinderGeometry(0.45, 0.55, 0.3, 16);
        const neck = new THREE.Mesh(neckGeo, this.createToyMaterial(RobotColors.metal, { metalness: 0.8 }));
        neck.position.y = -0.4;
        group.add(neck);

        group.userData = { type: 'head', socketOffset: new THREE.Vector3(0, 0.65, 0) };
        return group;
    }

    // Sevimli Kedi Robot Kafa (Cat-Bot Head)
    static createCatBotHead(color = RobotColors.pink) {
        const group = new THREE.Group();
        group.name = 'head_cat_bot';

        const headMat = this.createToyMaterial(color);

        // Kafa Küresi
        const headGeo = new THREE.SphereGeometry(0.72, 24, 20);
        const head = new THREE.Mesh(headGeo, headMat);
        head.castShadow = true;
        group.add(head);

        // Sivri Kedi Kulakları (Sol & Sağ)
        [-0.45, 0.45].forEach((x, i) => {
            const earGeo = new THREE.ConeGeometry(0.28, 0.6, 4);
            const ear = new THREE.Mesh(earGeo, headMat);
            ear.position.set(x, 0.75, 0);
            ear.rotation.z = i === 0 ? 0.3 : -0.3;
            group.add(ear);

            // Kulak içi pembe parça
            const innerGeo = new THREE.ConeGeometry(0.16, 0.4, 4);
            const inner = new THREE.Mesh(innerGeo, this.createToyMaterial(RobotColors.white));
            inner.position.set(x + (i === 0 ? 0.05 : -0.05), 0.75, 0.1);
            inner.rotation.z = i === 0 ? 0.3 : -0.3;
            group.add(inner);
        });

        // Kocaman Anime Gözleri
        [-0.24, 0.24].forEach(x => {
            const eyeGeo = new THREE.SphereGeometry(0.18, 16, 12);
            eyeGeo.scale(1.0, 1.25, 0.4);
            const eyeMat = new THREE.MeshStandardMaterial({
                color: 0x10b981,
                emissive: 0x34d399,
                emissiveIntensity: 0.9
            });
            const eye = new THREE.Mesh(eyeGeo, eyeMat);
            eye.name = 'eye';
            eye.position.set(x, 0.08, 0.62);
            group.add(eye);
        });

        // Lazer Bıyıklar (Çift Çizgiler)
        [-0.55, 0.55].forEach(x => {
            const w1Geo = new THREE.CylinderGeometry(0.02, 0.02, 0.45, 6);
            w1Geo.rotateZ(Math.PI / 2);
            const w1 = new THREE.Mesh(w1Geo, this.createToyMaterial(RobotColors.yellow));
            w1.position.set(x, -0.05, 0.5);
            group.add(w1);
        });

        group.userData = { type: 'head', socketOffset: new THREE.Vector3(0, 0.6, 0) };
        return group;
    }

    // ==========================================
    // 8. YENİ GELİŞMİŞ KOLLAR (ADVANCED ARMS)
    // ==========================================

    // Enerji Kalkanı Kolu (Plasma Shield Arm)
    static createShieldArm(isLeft = true, color = RobotColors.blue) {
        const group = new THREE.Group();
        group.name = isLeft ? 'arm_shield_left' : 'arm_shield_right';

        const armMat = this.createToyMaterial(color);

        // Üst kol
        const armGeo = new THREE.CylinderGeometry(0.14, 0.12, 1.0, 12);
        const arm = new THREE.Mesh(armGeo, armMat);
        arm.position.y = -0.5;
        group.add(arm);

        // Kalkan emitörü
        const emitGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.2, 16);
        emitGeo.rotateX(Math.PI / 2);
        const emitter = new THREE.Mesh(emitGeo, this.createToyMaterial(RobotColors.metal));
        emitter.position.set(isLeft ? -0.2 : 0.2, -0.9, 0.2);
        group.add(emitter);

        // Parlayan Neon Kalkan Diski
        const shieldGeo = new THREE.CylinderGeometry(0.65, 0.65, 0.05, 6);
        shieldGeo.rotateX(Math.PI / 2);
        const shieldMat = new THREE.MeshStandardMaterial({
            color: 0x00f2fe,
            emissive: 0x00f2fe,
            emissiveIntensity: 0.9,
            transparent: true,
            opacity: 0.8
        });
        const shield = new THREE.Mesh(shieldGeo, shieldMat);
        shield.name = 'plasmaShield';
        shield.position.set(isLeft ? -0.25 : 0.25, -0.9, 0.32);
        group.add(shield);

        group.userData = { type: 'arm', isLeft: isLeft };
        return group;
    }

    // Dönen Madenci Matkabı Kolu (Spiral Drill Arm)
    static createDrillArm(isLeft = true, color = RobotColors.yellow) {
        const group = new THREE.Group();
        group.name = isLeft ? 'arm_drill_left' : 'arm_drill_right';

        const armMat = this.createToyMaterial(color);
        const metalMat = this.createToyMaterial(RobotColors.metal, { metalness: 0.85, roughness: 0.15 });

        // Kol
        const armGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.8, 12);
        const arm = new THREE.Mesh(armGeo, armMat);
        arm.position.y = -0.4;
        group.add(arm);

        // Dönen Matkap Konisi
        const drillGroup = new THREE.Group();
        drillGroup.name = 'spiral_drill_mesh';
        drillGroup.position.y = -0.95;

        const coneGeo = new THREE.ConeGeometry(0.32, 0.85, 12);
        coneGeo.rotateX(Math.PI);
        const cone = new THREE.Mesh(coneGeo, metalMat);
        drillGroup.add(cone);

        // Spiral yivler
        const ringGeo = new THREE.TorusGeometry(0.24, 0.04, 8, 16);
        const ring = new THREE.Mesh(ringGeo, this.createToyMaterial(0xff4757));
        ring.position.y = 0.15;
        drillGroup.add(ring);

        group.add(drillGroup);

        group.userData = { type: 'arm', isLeft: isLeft };
        return group;
    }

    // Hidrolik 3 Mafsallı Ekskavatör Kolu
    static createHydraulicArm(isLeft = true, color = RobotColors.coral) {
        const group = new THREE.Group();
        group.name = isLeft ? 'arm_hydraulic_left' : 'arm_hydraulic_right';

        const mainMat = this.createToyMaterial(color);
        const metalMat = this.createToyMaterial(RobotColors.metal, { metalness: 0.7 });

        // Üst segment
        const seg1 = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.7, 0.18), mainMat);
        seg1.position.y = -0.35;
        group.add(seg1);

        // Hidrolik piston silindiri
        const piston = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.6, 8), metalMat);
        piston.position.set(isLeft ? 0.12 : -0.12, -0.4, 0.1);
        group.add(piston);

        // Alt segment (Açılı)
        const seg2 = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.6, 0.15), mainMat);
        seg2.position.set(0, -0.95, 0.1);
        seg2.rotation.x = -0.2;
        group.add(seg2);

        // 3 Tırnaklı Pnömatik Kıskaç
        const clawGroup = new THREE.Group();
        clawGroup.position.set(0, -1.35, 0.18);
        [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3].forEach(angle => {
            const claw = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.35, 0.08), metalMat);
            claw.position.set(Math.cos(angle) * 0.12, -0.15, Math.sin(angle) * 0.12);
            clawGroup.add(claw);
        });
        group.add(clawGroup);

        group.userData = { type: 'arm', isLeft: isLeft };
        return group;
    }

    // ==========================================
    // 9. YENİ GELİŞMİŞ HAREKET / BACAK BİRİMLERİ
    // ==========================================

    // 4 Bacaklı Örümcek Yürüyücü (Quadruped Spider Walker)
    static createSpiderLegs(color = RobotColors.blue) {
        const group = new THREE.Group();
        group.name = 'legs_spider';

        const legMat = this.createToyMaterial(color);
        const metalMat = this.createToyMaterial(RobotColors.metal, { metalness: 0.6 });

        // Merkezi Kaide
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 0.4, 16), legMat);
        base.position.y = -0.2;
        group.add(base);

        // 4 Açılı Örümcek Bacağı
        const angles = [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4];
        angles.forEach(a => {
            const legSub = new THREE.Group();
            legSub.rotation.y = a;

            // Üst bacak (dışarı doğru)
            const uGeo = new THREE.CylinderGeometry(0.1, 0.08, 0.8, 10);
            uGeo.rotateZ(Math.PI / 3);
            const uMesh = new THREE.Mesh(uGeo, legMat);
            uMesh.position.set(0.4, -0.1, 0);
            legSub.add(uMesh);

            // Alt bacak (aşağı doğru)
            const lGeo = new THREE.CylinderGeometry(0.08, 0.06, 0.8, 10);
            lGeo.rotateZ(-Math.PI / 6);
            const lMesh = new THREE.Mesh(lGeo, metalMat);
            lMesh.position.set(0.85, -0.65, 0);
            legSub.add(lMesh);

            // Vantuzlu Ayak Tabanı
            const foot = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), this.createToyMaterial(RobotColors.yellow));
            foot.position.set(1.05, -1.05, 0);
            legSub.add(foot);

            group.add(legSub);
        });

        group.userData = { type: 'legs' };
        return group;
    }

    // Anti-Yerçekimi Hover Yastıkları (Hover Repulsor Pads)
    static createHoverPads(color = RobotColors.mint) {
        const group = new THREE.Group();
        group.name = 'legs_hover';

        const padMat = this.createToyMaterial(color);

        [-0.7, 0.7].forEach(x => {
            const padGroup = new THREE.Group();
            padGroup.position.x = x;

            // Hover Diski
            const diskGeo = new THREE.CylinderGeometry(0.55, 0.65, 0.25, 24);
            const disk = new THREE.Mesh(diskGeo, padMat);
            disk.position.y = -0.3;
            padGroup.add(disk);

            // Alt Plazma Işıması
            const glowGeo = new THREE.ConeGeometry(0.5, 0.6, 16);
            const glowMat = new THREE.MeshBasicMaterial({
                color: 0x38bdf8,
                transparent: true,
                opacity: 0.85
            });
            const glow = new THREE.Mesh(glowGeo, glowMat);
            glow.name = 'hoverGlow';
            glow.position.y = -0.7;
            padGroup.add(glow);

            group.add(padGroup);
        });

        group.userData = { type: 'legs' };
        return group;
    }

    // Ağır Palet Tank Sistemi (Heavy Caterpillar Treads)
    static createHeavyTreads(color = RobotColors.metal) {
        const group = new THREE.Group();
        group.name = 'legs_heavy_treads';

        const rubberMat = this.createToyMaterial(0x1e293b, { roughness: 0.9 });
        const gearMat = this.createToyMaterial(RobotColors.yellow);

        [-0.85, 0.85].forEach(x => {
            const treadGroup = new THREE.Group();
            treadGroup.position.set(x, -0.4, 0);

            // Palet bandı
            const beltGeo = new THREE.BoxGeometry(0.35, 0.7, 2.0);
            const belt = new THREE.Mesh(beltGeo, rubberMat);
            treadGroup.add(belt);

            // 3 adet iç dişli çark
            [-0.6, 0, 0.6].forEach(z => {
                const gearGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.38, 16);
                gearGeo.rotateZ(Math.PI / 2);
                const gear = new THREE.Mesh(gearGeo, gearMat);
                gear.position.z = z;
                treadGroup.add(gear);
            });

            group.add(treadGroup);
        });

        group.userData = { type: 'legs' };
        return group;
    }

    // ==========================================
    // 10. YENİ GELİŞMİŞ AKSESUARLAR (ADVANCED ACCESSORIES)
    // ==========================================

    // Foton Kanatları (Mecha Cyber Wings)
    static createCyberWings(color = RobotColors.yellow) {
        const group = new THREE.Group();
        group.name = 'acc_cyber_wings';

        const mainMat = this.createToyMaterial(color);
        const neonMat = new THREE.MeshStandardMaterial({
            color: 0x00f2fe,
            emissive: 0x00f2fe,
            emissiveIntensity: 1.0,
            transparent: true,
            opacity: 0.85
        });

        // Çift Kanat (Sol & Sağ)
        [-1, 1].forEach(dir => {
            const wingGroup = new THREE.Group();
            wingGroup.position.set(dir * 0.4, 0.2, -0.2);

            // 3 Katmanlı enerji tüyü
            [0, 1, 2].forEach(i => {
                const featherGeo = new THREE.BoxGeometry(1.2 - i * 0.25, 0.12, 0.04);
                const feather = new THREE.Mesh(featherGeo, neonMat);
                feather.position.set(dir * (0.6 - i * 0.1), i * 0.25, -i * 0.05);
                feather.rotation.z = dir * (0.35 - i * 0.15);
                wingGroup.add(feather);
            });

            group.add(wingGroup);
        });

        group.userData = { type: 'accessory' };
        return group;
    }

    // Dönen Radar & Uydu Çanağı (Rotating Satellite Dish)
    static createSatelliteDish() {
        const group = new THREE.Group();
        group.name = 'acc_satellite';

        // Kaide direği
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.5, 12), this.createToyMaterial(RobotColors.metal));
        group.add(pole);

        // Çanak Grubu
        const dishGroup = new THREE.Group();
        dishGroup.name = 'rotating_dish';
        dishGroup.position.y = 0.35;

        // Parabolik çanak
        const dishGeo = new THREE.SphereGeometry(0.42, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
        dishGeo.rotateX(Math.PI / 4);
        const dish = new THREE.Mesh(dishGeo, this.createToyMaterial(RobotColors.white));
        dishGroup.add(dish);

        // Sinyal alıcı iğne ve yanıp sönen lamba
        const needle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.35, 8), this.createToyMaterial(RobotColors.metal));
        needle.position.set(0, 0.15, 0.25);
        dishGroup.add(needle);

        const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10), new THREE.MeshBasicMaterial({ color: 0xff0055 }));
        beacon.position.set(0, 0.32, 0.25);
        dishGroup.add(beacon);

        group.add(dishGroup);

        group.userData = { type: 'accessory' };
        return group;
    }

    // Çift Türbinli Roket Çantası (Twin Jetpack Backpack)
    static createJetpack(color = RobotColors.coral) {
        const group = new THREE.Group();
        group.name = 'acc_jetpack';

        const mainMat = this.createToyMaterial(color);
        const metalMat = this.createToyMaterial(RobotColors.metal, { metalness: 0.7 });

        // Çift Silindirik Yakıt Tankı
        [-0.32, 0.32].forEach(x => {
            const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.8, 16), mainMat);
            tank.position.set(x, 0, -0.2);
            group.add(tank);

            // Alt egzoz nozulu
            const noz = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.22, 0.25, 14), metalMat);
            noz.position.set(x, -0.5, -0.2);
            group.add(noz);

            // Alev Konisi
            const flame = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.5, 12), new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.9 }));
            flame.rotateX(Math.PI);
            flame.position.set(x, -0.85, -0.2);
            group.add(flame);
        });

        group.userData = { type: 'accessory' };
        return group;
    }

    // Altın Mucit Tacı (Royal Inventor Crown)
    static createCrown() {
        const group = new THREE.Group();
        group.name = 'acc_crown';

        const goldMat = this.createToyMaterial(RobotColors.gold, { metalness: 0.9, roughness: 0.15 });

        // Taç taban halkası
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.38, 0.15, 16), goldMat);
        group.add(base);

        // 5 Sivri Uç
        for (let i = 0; i < 5; i++) {
            const angle = (i * Math.PI * 2) / 5;
            const tip = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.3, 4), goldMat);
            tip.position.set(Math.cos(angle) * 0.33, 0.2, Math.sin(angle) * 0.33);
            group.add(tip);

            // Uçlardaki parlayan yakut taşlar
            const gem = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff0055 }));
            gem.position.set(Math.cos(angle) * 0.33, 0.35, Math.sin(angle) * 0.33);
            group.add(gem);
        }

        group.userData = { type: 'accessory' };
        return group;
    }
}

window.RobotColors = RobotColors;
window.RobotPartsFactory = RobotPartsFactory;
