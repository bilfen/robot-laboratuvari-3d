/**
 * Robot Laboratuvarı - Telemetri, Enerji, Rozet ve Rapor Motoru
 * 5.1 Gerçek Zamanlı Sensör Kontrol Paneli
 * 5.5 Enerji Yönetimi  |  5.9 Rozet Sistemi  |  5.10 Görev Sonu Analiz Ekranı
 * Sadece DOM günceller; sensör hesapları missions.js'ten gelir.
 */

class TelemetrySystem {
    constructor() {
        // Gösterilecek ham değerler (missions.js her karede set eder)
        this.data = {
            distance: 100, light: 95, temp: 24, sound: 35, motion: false,
            rgb: { r: 128, g: 128, b: 128 },
            motor: 0, leftMotor: 0, rightMotor: 0,
            battery: 100, mode: 'BEKLEMEDE', activeSensor: '—'
        };

        // 5.5 Enerji yönetimi durum makinesi
        this.energy = {
            total: 100, used: 0,
            drainPerSec: 0,            // aktif tüketim (drift + motor)
            ledCost: 0.35,             // LED/far açıkken ek tüketim
            drivingCost: 0.5,          // sürüş temel tüketimi
            charging: false,
            depleted: false
        };

        // 5.10 Rapor toplayıcı
        this.report = null;
        this._sampling = 0;
    }

    // ============= PANEL BAĞLAMA =============
    bindPanel() {
        this.el = {
            distance: document.getElementById('tDist'),
            light: document.getElementById('tLight'),
            temp: document.getElementById('tTemp'),
            sound: document.getElementById('tSound'),
            motion: document.getElementById('tMotion'),
            rgb: document.getElementById('tRgb'),
            rgbDot: document.getElementById('tRgbDot'),
            motor: document.getElementById('tMotor'),
            motorBar: document.getElementById('tMotorBar'),
            motors: document.getElementById('tMotorsLR'),
            batteryFill: document.getElementById('tBatteryFill'),
            batteryText: document.getElementById('tBatteryText'),
            sensor: document.getElementById('tActiveSensor'),
            mode: document.getElementById('tMode'),
            panel: document.getElementById('telemetryPanel')
        };
        return !!this.el.distance;
    }

    show() { if (this.el && this.el.panel) this.el.panel.classList.remove('hidden'); }
    hide() { if (this.el && this.el.panel) this.el.panel.classList.add('hidden'); }

    // ============= 5.5 ENERJİ =============
    beginMission() {
        this.energy.total = 100;
        this.energy.used = 0;
        this.energy.charging = false;
        this.energy.depleted = false;
        this.report = {
            missionName: '', startTime: performance.now(),
            sensorsUsed: { distance: false, light: false, pir: false, color: false, temp: false, sound: false },
            maxSpeed: 0, minDistance: 999, collisions: 0, reactionOk: null, energyUsed: 0
        };
    }

    endMission() {
        if (this.report) {
            this.report.energyUsed = this.energy.used.toFixed(1);
            this.report.duration = this.report.startTime ? (performance.now() - this.report.startTime) : 0;
        }
        return this.report;
    }

    updateEnergy(delta, isDriving, headlightsOn, maxSpeedRef, speedRatio) {
        const en = this.energy;
        if (en.depleted) return;

        if (en.charging) {
            en.total = Math.min(100, en.total + 18 * delta);
            if (en.total >= 100) en.charging = false;
            return;
        }

        // Tüketim: sürüş + LED + taban akısı
        let drain = 0.12; // boşta rölanti tüketimi
        if (isDriving) drain += en.drivingCost * (0.4 + 0.6 * speedRatio);
        if (headlightsOn) drain += en.ledCost;

        en.drainPerSec = drain;
        const before = en.total;
        en.total = Math.max(0, en.total - drain * delta);
        en.used = Math.min(100, en.used + (before - en.total));

        if (en.total <= 5 && !en.depleted) {
            en.depleted = true;
            if (window.KidAudio) window.KidAudio.playError();
        }
    }

    charge() {
        this.energy.charging = true;
        if (window.KidAudio) window.KidAudio.playCharge();
    }

    // ============= RAPOR KAYITLARI =============
    logSensorUse(key) { if (this.report) this.report.sensorsUsed[key] = true; }
    logSpeed(pct) { if (this.report && pct > this.report.maxSpeed) this.report.maxSpeed = Math.round(pct); }
    logMinDistance(cm) { if (this.report && cm < this.report.minDistance) this.report.minDistance = cm; }
    logCollision() { if (this.report) this.report.collisions++; }
    logReaction(ok) { if (this.report) this.report.reactionOk = ok; }

    // ============= 5.10 GÖREV RAPORU =============
    showReport(mission, passed) {
        const r = this.endMission();
        if (!r) return;

        const duration = Math.max(0, r.duration || 0);
        const mm = String(Math.floor(duration / 60000)).padStart(2, '0');
        const ss = String(Math.floor((duration % 60000) / 1000)).padStart(2, '0');

        const setUsed = (id, used) => {
            const e = document.getElementById(id);
            if (e) {
                e.innerHTML = used ? '✓' : '—';
                e.className = used ? 'report-check yes' : 'report-check no';
            }
        };

        const rows = [
            ['Mesafe Sensörü', r.sensorsUsed.distance], ['Işık Sensörü', r.sensorsUsed.light],
            ['PIR Sensörü', r.sensorsUsed.pir], ['Renk Sensörü', r.sensorsUsed.color],
            ['Sıcaklık Sensörü', r.sensorsUsed.temp], ['Ses Sensörü', r.sensorsUsed.sound]
        ];
        const sensHtml = rows.map(([n, u]) => `<div class="report-row"><span>${n}</span><span class="${u ? 'report-check yes' : 'report-check no'}">${u ? '✓' : '—'}</span></div>`).join('');

        document.getElementById('reportTitle').innerHTML = `${passed ? '✅' : '❌'} GÖREV: ${mission.name}`;
        document.getElementById('reportTime').innerText = `${mm}:${ss}`;
        document.getElementById('reportSensors').innerHTML = sensHtml;
        document.getElementById('reportMaxSpeed').innerText = `${r.maxSpeed}%`;
        document.getElementById('reportMinDist').innerText = r.minDistance >= 999 ? '—' : `${r.minDistance} cm`;
        document.getElementById('reportCollisions').innerText = `${r.collisions}`;
        document.getElementById('reportEnergy').innerText = `%${r.energyUsed}`;
        document.getElementById('reportReaction').innerHTML = r.reactionOk === true ? '✓' : (r.reactionOk === false ? '✗' : '—');

        const modal = document.getElementById('missionReportModal');
        if (modal) modal.classList.remove('hidden');
    }

    // ============= 5.9 ROZETLER =============
    static BADGES = [
        { id: 'sensor_master', icon: '🏅', name: 'Sensor Master', desc: 'Tüm sensörleri başarıyla kullandı.' },
        { id: 'autonomous_driver', icon: '🏅', name: 'Autonomous Driver', desc: 'Otonom görevi tamamladı.' },
        { id: 'energy_saver', icon: '🏅', name: 'Energy Saver', desc: 'Görevi minimum enerjiyle tamamladı.' },
        { id: 'precision_driver', icon: '🏅', name: 'Precision Driver', desc: 'Parkuru yüksek hassasiyetle tamamladı.' },
        { id: 'robot_engineer', icon: '🏅', name: 'Robot Engineer', desc: 'Arıza senaryosunu başarıyla çözdü.' }
    ];

    static loadBadges() {
        try { return JSON.parse(localStorage.getItem('rl_badges') || '{}'); } catch (e) { return {}; }
    }
    static saveBadges(b) {
        try { localStorage.setItem('rl_badges', JSON.stringify(b)); } catch (e) { }
    }

    awardBadge(id) {
        const badges = TelemetrySystem.loadBadges();
        if (badges[id]) return false; // zaten var
        badges[id] = true;
        TelemetrySystem.saveBadges(badges);
        const badge = TelemetrySystem.BADGES.find(b => b.id === id);
        if (badge && window.Botti) {
            window.Botti.speak(`🏆 <b>YENİ ROZET!</b> ${badge.icon} <b>${badge.name}</b> kazandın!`);
        }
        if (window.KidAudio) window.KidAudio.playFanfare();
        this.renderBadgeShelf();
        return true;
    }

    renderBadgeShelf() {
        const shelf = document.getElementById('badgeShelf');
        if (!shelf) return;
        const badges = TelemetrySystem.loadBadges();
        shelf.innerHTML = TelemetrySystem.BADGES.map(b => {
            const owned = badges[b.id];
            return `<div class="badge-item ${owned ? 'badge-owned' : 'badge-locked'}" title="${b.desc}">
                        <span class="badge-icon">${owned ? b.icon : '🔒'}</span>
                        <span class="badge-name">${b.name}</span>
                    </div>`;
        }).join('');
    }

    // ============= HER KAREDE ÇAĞRILAN ANA GÜNCELLEME =============
    update(delta) {
        if (!this.el || !this.el.distance) return;
        const d = this.data;

        if (this.el.distance) this.el.distance.innerText = `${Math.round(d.distance)} cm`;
        if (this.el.light) this.el.light.innerText = `${Math.round(d.light)} %`;
        if (this.el.temp) this.el.temp.innerText = `${d.temp.toFixed(1)} °C`;
        if (this.el.sound) this.el.sound.innerText = `${Math.round(d.sound)} dB`;
        if (this.el.motion) {
            this.el.motion.innerText = d.motion ? 'AKTİF' : 'BEKLEMEDE';
            this.el.motion.className = d.motion ? 'tele-val warn' : 'tele-val ok';
        }
        if (this.el.rgb) this.el.rgb.innerText = `R: ${d.rgb.r} G: ${d.rgb.g} B: ${d.rgb.b}`;
        if (this.el.rgbDot) this.el.rgbDot.style.background = `rgb(${d.rgb.r},${d.rgb.g},${d.rgb.b})`;

        if (this.el.motor) this.el.motor.innerText = `${Math.round(d.motor)} %`;
        if (this.el.motorBar) this.el.motorBar.style.width = `${Math.min(100, Math.abs(d.motor))}%`;
        if (this.el.motors) this.el.motors.innerText = `L: ${Math.round(d.leftMotor)} | R: ${Math.round(d.rightMotor)}`;

        const en = this.energy;
        if (this.el.batteryFill) {
            this.el.batteryFill.style.width = `${en.total}%`;
            this.el.batteryFill.className = 'battery-fill ' + (en.total > 50 ? 'batt-ok' : (en.total > 20 ? 'batt-mid' : 'batt-low'));
        }
        if (this.el.batteryText) {
            this.el.batteryText.innerText = en.charging ? '⚡ ŞARJ OLUYOR' : `%${Math.round(en.total)}`;
            if (en.charging) this.el.batteryText.classList.add('charging-pulse');
            else this.el.batteryText.classList.remove('charging-pulse');
        }
        if (this.el.sensor) this.el.sensor.innerText = d.activeSensor;
        if (this.el.mode) {
            this.el.mode.innerText = d.mode;
            this.el.mode.className = 'tele-val ' + (d.mode === 'BEKLEMEDE' ? 'idle' : 'active');
        }
    }
}

window.TelemetrySystem = TelemetrySystem;
