class SaveManager {
    constructor() {
        this.STORAGE_KEY = 'neon_runner_data_v1';
        this.data = this.load();
    }

    load() {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
        return {
            unlockedStages: 1,
            bestTimes: {} // { stageId: timeInSeconds }
        };
    }

    save() {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data));
    }

    unlockStage(stage) {
        if (stage > this.data.unlockedStages) {
            this.data.unlockedStages = stage;
            this.save();
        }
    }

    saveTime(stage, time) {
        if (!this.data.bestTimes[stage] || time < this.data.bestTimes[stage]) {
            this.data.bestTimes[stage] = time;
            this.save();
            return true; // New record
        }
        return false;
    }

    getBestTime(stage) {
        return this.data.bestTimes[stage] || null;
    }

    getUnlockedStages() {
        return this.data.unlockedStages;
    }

    resetData() {
        this.data = {
            unlockedStages: 1,
            bestTimes: {}
        };
        this.save();
    }
}
