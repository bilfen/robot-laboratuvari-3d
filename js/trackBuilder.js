/**
 * Robot Laboratuvarı - Parkur Yapıcı (Track Builder)
 * 5.15: Öğrenci kendi test parkurunu oluşturur, TEST PARKURU ile robotla dener.
 * Mode toggle butonlarıyla gezinme/sürükleme; engel yerleştirme raycast ile.
 */

class TrackBuilderController {
    constructor(scene, camera, controls, builder) {
        this.scene = scene;
        this.camera = camera;
        this.controls = controls;
        this.builder = builder;

        this.active = false;
        this.selectedTool = 'obstacle';
        this.placed = [];
        this.gridHelper = null;
        this.ghost = null;

        this._bindUI();
    }

    _bindUI() {
        document.querySelectorAll('.tb-tool-btn').forEach(btn => {
            btn.addEventListener('click', e => {
                document.querySelectorAll('.tb-tool-btn').forEach(b => b.classList.remove('tb-tool-active'));
                e.currentTarget.classList.add('tb-tool-active');
                this.selectedTool = e.currentTarget.dataset.tool;
                this._updateGhost();
            });
        });

        document.getElementById('btnBuilderTest').addEventListener('click', () => this.startTest());
        document.getElementById('btnBuilderTestStop').addEventListener('click', () => this.stopTest());
        document.getElementById('btnBuilderClear').addEventListener('click', () => this.clearAll());
        document.getElementById('btnBuilderCount').innerHTML = '0 parça';
    }

    enter() {
        this.active = true;
        window.app.missions.setUIState('track_builder');
        window.app.missions.mode = 'track_builder';
        // Not: sahne kromu (HUD/paneller) setUIState içinde açılıyor

        // Izgara yardımcısı
        if (!this.gridHelper) {
            this.gridHelper = new THREE.GridHelper(24, 24, 0x38bdf8, 0x64748b);
            this.gridHelper.position.y = -1.15;
            this.gridHelper.material.transparent = true;
            this.gridHelper.material.opacity = 0.4;
            this.scene.add(this.gridHelper);
        }
        this.gridHelper.visible = true;

        // Robot hazır konum
        window.app.missions.placeRobotAt(new THREE.Vector3(0, 0, 8), 0);
        this.controls.target.set(0, 0, 6);
        this.camera.position.set(0, 7, 14);

        if (window.Botti) window.Botti.speak('🏗️ <b>Parkur Yapıcı</b>: Araç seç, zemine tıkla ve yerleştir! "TEST PARKURU" ile dene.');
        this._updateCount();
        this._bindCanvas();
        this._updateGhost();
    }

    exit() {
        this.active = false;
        if (this.gridHelper) this.gridHelper.visible = false;
        this._hideGhost();
        this.stopTest();
    }

    _bindCanvas() {
        if (this._canvasBound) return;
        this._canvasBound = true;
        const dom = this.builder.renderer.domElement;
        dom.addEventListener('pointerdown', e => {
            if (!this.active || window.app.missions.mode !== 'track_builder' || this.testing) return;
            // Sol tık = yerleştir, sağ tık = kaldır
            const rect = dom.getBoundingClientRect();
            const mouse = new THREE.Vector2(
                ((e.clientX - rect.left) / rect.width) * 2 - 1,
                -((e.clientY - rect.top) / rect.height) * 2 + 1
            );
            const ray = new THREE.Raycaster();
            ray.setFromCamera(mouse, this.camera);
            const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 1.2); // y = -1.2
            const hit = new THREE.Vector3();
            if (ray.ray.intersectPlane(groundPlane, hit)) {
                // Grid snap 1.0 birim
                hit.x = Math.round(hit.x);
                hit.z = Math.round(hit.z);
                hit.y = 0;
                if (e.button === 2) {
                    this._removeAt(hit);
                } else {
                    this._placeAt(hit);
                }
            }
        });
        dom.addEventListener('contextmenu', e => { if (this.active) e.preventDefault(); });
    }

    _toolDef(tool) {
        switch (tool) {
            case 'obstacle': return { color: 0xff735c, geo: () => new THREE.BoxGeometry(0.8, 0.8, 0.8), y: -0.65, sensor: 'mesafe' };
            case 'wall': return { color: 0x243f78, geo: () => new THREE.BoxGeometry(2.2, 1.3, 0.3), y: -0.4, sensor: 'mesafe' };
            case 'colortile': return { color: 0x1e90ff, geo: () => new THREE.BoxGeometry(1.3, 0.1, 1.3), y: -1.13, sensor: 'rgb' };
            case 'light': return { color: 0xfff8e7, geo: () => new THREE.SphereGeometry(0.28, 14, 10), y: 1.3, sensor: 'ışık', light: true };
            case 'sound': return { color: 0x1e293b, geo: () => new THREE.BoxGeometry(0.6, 1.1, 0.5), y: -0.45, sensor: 'ses' };
            case 'movingtarget': return { color: 0xffd34e, geo: () => new THREE.SphereGeometry(0.3, 12, 10), y: -0.55, sensor: 'PIR', runner: true };
            case 'ramp': return { color: 0x94a3b8, geo: () => new THREE.BoxGeometry(1.6, 0.12, 1.2), y: -0.9, rotX: -0.22, sensor: '—' };
            case 'tunnel': return { color: 0x0f172a, geo: () => { const g = new THREE.CylinderGeometry(1.0, 1.0, 2.8, 16, 1, true, 0, Math.PI); g.rotateZ(Math.PI / 2); g.rotateY(-Math.PI / 2); return g; }, y: 0.15, sensor: 'ışık' };
            case 'sensorstation': return { color: 0x52d4b6, geo: () => new THREE.CylinderGeometry(0.1, 0.12, 1.7, 10), y: -0.3, sensor: 'tümü', screen: true };
            default: return null;
        }
    }

    _placeAt(pos) {
        const def = this._toolDef(this.selectedTool);
        if (!def) return;
        const mesh = new THREE.Mesh(def.geo(), new THREE.MeshStandardMaterial({ color: def.color, roughness: 0.4, transparent: def.sensor === 'ışık' && def.light, opacity: def.light ? 0.95 : 1, emissive: def.light ? def.color : 0x000000, emissiveIntensity: def.light ? 1.2 : 0 }));
        mesh.position.set(pos.x, def.y, pos.z);
        if (def.rotX) mesh.rotation.x = def.rotX;
        if (def.runner) mesh.userData = { isTBRunner: true, baseX: pos.x, dir: 1 };
        if (def.light) { const pl = new THREE.PointLight(def.color, 1.0, 8); mesh.add(pl); }
        if (def.screen) {
            const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.45), new THREE.MeshBasicMaterial({ map: WorldSystem.makePanelTexture(['SENSOR', 'ISTASYONU'], '#52d4b6'), transparent: true }));
            screen.position.y = 1.1;
            mesh.add(screen);
        }
        mesh.castShadow = true;
        mesh.userData = Object.assign(mesh.userData || {}, { isTBProp: true, tbSensor: def.sensor });
        this.scene.add(mesh);
        this.placed.push(mesh);
        this._updateCount();
        if (window.KidAudio) window.KidAudio.playSnap();
    }

    _removeAt(pos) {
        for (let i = this.placed.length - 1; i >= 0; i--) {
            const p = this.placed[i];
            if (Math.abs(p.position.x - pos.x) < 0.8 && Math.abs(p.position.z - pos.z) < 0.8) {
                this.scene.remove(p);
                this.placed.splice(i, 1);
                this._updateCount();
                if (window.KidAudio) window.KidAudio.playClick();
                return;
            }
        }
    }

    _updateCount() {
        const el = document.getElementById('btnBuilderCount');
        if (el) el.innerHTML = `${this.placed.length} parça`;
    }

    _updateGhost() {
        if (!this.active) return;
        this._hideGhost();
        const def = this._toolDef(this.selectedTool);
        if (!def) return;
        this.ghost = new THREE.Mesh(def.geo(), new THREE.MeshBasicMaterial({ color: def.color, transparent: true, opacity: 0.35 }));
        this.ghost.visible = false;
        this.scene.add(this.ghost);
        const dom = this.builder.renderer.domElement;
        if (this._ghostMove) dom.removeEventListener('pointermove', this._ghostMove);
        this._ghostMove = e => {
            if (!this.active || this.testing) return;
            const rect = dom.getBoundingClientRect();
            const mouse = new THREE.Vector2(
                ((e.clientX - rect.left) / rect.width) * 2 - 1,
                -((e.clientY - rect.top) / rect.height) * 2 + 1
            );
            const ray = new THREE.Raycaster();
            ray.setFromCamera(mouse, this.camera);
            const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 1.2);
            const hit = new THREE.Vector3();
            if (ray.ray.intersectPlane(groundPlane, hit)) {
                this.ghost.position.set(Math.round(hit.x), def.y, Math.round(hit.z));
                this.ghost.visible = true;
            }
        };
        dom.addEventListener('pointermove', this._ghostMove);
    }

    _hideGhost() {
        if (this.ghost) {
            this.scene.remove(this.ghost);
            this.ghost = null;
        }
    }

    startTest() {
        if (this.placed.length === 0) {
            if (window.Botti) window.Botti.speak('🏗️ Önce birkaç parça yerleştir, sonra test et!');
            return;
        }
        this.testing = true;
        this.gridHelper.visible = false;
        this._hideGhost();
        window.app.missions.telemetry.beginMission('Özel Parkur Testi');
        // Robotu başlangıca al
        window.app.missions.placeRobotAt(new THREE.Vector3(0, 0, 8), 0);
        this.controls.target.set(0, 0, 8);
        this.camera.position.set(0, 4, 13);
        document.getElementById('btnBuilderTest').classList.add('hidden');
        document.getElementById('btnBuilderTestStop').classList.remove('hidden');
        if (window.Botti) window.Botti.speak('🏎️ <b>TEST PARKURU</b> başladı! Robotunu sür ve sensörlerin yeni parkurda nasıl çalıştığını izle!');
        if (window.KidAudio) window.KidAudio.playFanfare();
    }

    stopTest() {
        this.testing = false;
        if (this.gridHelper) this.gridHelper.visible = this.active;
        window.app.missions.telemetry.showReport({ name: 'Özel Parkur Testi' }, true);
        document.getElementById('btnBuilderTest').classList.remove('hidden');
        document.getElementById('btnBuilderTestStop').classList.add('hidden');
    }

    clearAll() {
        this.placed.forEach(p => this.scene.remove(p));
        this.placed = [];
        this._updateCount();
        if (window.KidAudio) window.KidAudio.playClick();
    }

    update(delta) {
        if (!this.active) return;
        // Koşucu animasyonu
        this.placed.forEach(p => {
            if (p.userData && p.userData.isTBRunner) {
                p.position.x += p.userData.dir * delta * 2.2;
                if (Math.abs(p.position.x - p.userData.baseX) > 3.5) p.userData.dir *= -1;
                p.position.y = -0.55 + Math.abs(Math.sin(p.position.x * 3)) * 0.18;
            }
        });
    }
}

window.TrackBuilderController = TrackBuilderController;
