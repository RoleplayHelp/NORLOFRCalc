class DamageCalculator {
    constructor() {
        this.percentageBuffs = [];
        this.fixedBuffs = [];
        this.physicalShields = [];
    }

    addPercentageBuff(value) {
        this.percentageBuffs.push(value / 100);
    }

    addFixedBuff(value) {
        this.fixedBuffs.push(value);
    }

    removePercentageBuff(index) {
        this.percentageBuffs.splice(index, 1);
    }

    removeFixedBuff(index) {
        this.fixedBuffs.splice(index, 1);
    }

    addPhysicalShield(shield) {
        this.physicalShields.push(shield);
    }

    removePhysicalShield(index) {
        this.physicalShields.splice(index, 1);
    }

    calculateStat(baseStat) {
        let result = baseStat;
        for (let buff of this.percentageBuffs) {
            result *= (1 + buff);
        }
        const totalFixedBuff = this.fixedBuffs.reduce((sum, buff) => sum + buff, 0);
        result += totalFixedBuff;
        return Math.max(0, result);
    }

    calculateSkillDamage(baseDamage, skillMultiplier) {
        const damage = baseDamage * (skillMultiplier / 100);
        return this.calculateStat(damage);
    }

    calculateDamageTaken(damageInfo, defenderInfo) {
        let { incomingDamage, defPierce, piercingDamage, trueDamage, fatalDamage, constantDamage } = damageInfo;
        let { defense, fakeHP, damageReduction } = defenderInfo;

        // Áp dụng giảm sát thương
        if (!trueDamage && !fatalDamage) {
            incomingDamage *= (1 - damageReduction / 100);
        }

        let remainingDamage = incomingDamage;

        // Xử lý khiên vật lý
        if (!piercingDamage && !fatalDamage) {
            for (let shield of this.physicalShields) {
                if (constantDamage && shield.durability <= remainingDamage) {
                    continue; // Bỏ qua khiên nếu CDD và độ bền khiên <= sát thương
                }
                let damageToShield = remainingDamage * (1 - shield.damageReduction / 100);
                damageToShield = Math.max(0, damageToShield - shield.fakeHP - shield.def);
                let absorbed = Math.min(shield.durability, damageToShield);
                remainingDamage -= absorbed;
                shield.durability -= absorbed;
                if (remainingDamage <= 0) break;
            }
            // Lọc bỏ các khiên đã hết độ bền
            this.physicalShields = this.physicalShields.filter(shield => shield.durability > 0);
        }

        // Áp dụng Fake HP
        if (!fatalDamage && fakeHP > 0) {
            let absorbed = Math.min(fakeHP, remainingDamage);
            remainingDamage -= absorbed;
        }

        // Áp dụng Def
        if (!defPierce && !fatalDamage) {
            remainingDamage = Math.max(0, remainingDamage - defense);
        }

        return Math.max(0, remainingDamage);
    }

    loadState(state) {
        this.percentageBuffs = state.percentageBuffs || [];
        this.fixedBuffs = state.fixedBuffs || [];
        this.physicalShields = state.physicalShields || [];
    }

    getState() {
        return {
            percentageBuffs: this.percentageBuffs,
            fixedBuffs: this.fixedBuffs,
            physicalShields: this.physicalShields
        };
    }
}

class UIManager {
    constructor(calculator) {
        this.calculator = calculator;
        this.initElements();
        this.bindEvents();
        this.loadState();
    }

    initElements() {
        // Các elements cho phần tính toán chỉ số
        this.baseStatInput = document.getElementById('base-stat');
        this.baseDamageInput = document.getElementById('base-damage');
        this.skillMultiplierInput = document.getElementById('skill-multiplier');
        this.buffPercentageInput = document.getElementById('buff-percentage');
        this.buffFixedInput = document.getElementById('buff-fixed');
        this.addPercentageBuffButton = document.getElementById('add-percentage-buff');
        this.addFixedBuffButton = document.getElementById('add-fixed-buff');
        this.percentageBuffList = document.getElementById('percentage-buff-list');
        this.fixedBuffList = document.getElementById('fixed-buff-list');

        // Các elements cho phần tính toán sát thương nhận vào
        this.incomingDamageInput = document.getElementById('incoming-damage');
        this.defPierceCheckbox = document.getElementById('def-pierce');
        this.piercingDamageCheckbox = document.getElementById('piercing-damage');
        this.trueDamageCheckbox = document.getElementById('true-damage');
        this.fatalDamageCheckbox = document.getElementById('fatal-damage');
        this.constantDamageCheckbox = document.getElementById('constant-damage');
        this.defenseInput = document.getElementById('defense');
        this.fakeHPInput = document.getElementById('fake-hp');
        this.damageReductionInput = document.getElementById('damage-reduction');
        this.shieldDurabilityInput = document.getElementById('shield-durability');
        this.shieldDefInput = document.getElementById('shield-def');
        this.shieldFakeHPInput = document.getElementById('shield-fake-hp');
        this.shieldDamageReductionInput = document.getElementById('shield-damage-reduction');
        this.addShieldButton = document.getElementById('add-shield');
        this.shieldList = document.getElementById('shield-list');

        this.calculateButton = document.getElementById('calculate');
        this.clearDataButton = document.getElementById('clear-data');
        this.resultDiv = document.getElementById('result');

        // Tab elements
        this.tabButtons = document.querySelectorAll('.tab-button');
        this.tabPanes = document.querySelectorAll('.tab-pane');
        this.subTabButtons = document.querySelectorAll('.sub-tab-button');
        this.subTabPanes = document.querySelectorAll('.sub-tab-pane');
    }

    bindEvents() {
        this.addPercentageBuffButton.addEventListener('click', () => this.addBuff('percentage'));
        this.addFixedBuffButton.addEventListener('click', () => this.addBuff('fixed'));
        this.addShieldButton.addEventListener('click', () => this.addShield());
        this.calculateButton.addEventListener('click', () => this.calculate());
        this.clearDataButton.addEventListener('click', () => this.clearAllData());

        this.tabButtons.forEach(button => {
            button.addEventListener('click', () => this.switchTab(button));
        });
        this.subTabButtons.forEach(button => {
            button.addEventListener('click', () => this.switchSubTab(button));
        });

        // Prevent selecting both Piercing Damage and Fatal Damage
        this.piercingDamageCheckbox.addEventListener('change', () => {
            if (this.piercingDamageCheckbox.checked) {
                this.fatalDamageCheckbox.checked = false;
            }
        });
        this.fatalDamageCheckbox.addEventListener('change', () => {
            if (this.fatalDamageCheckbox.checked) {
                this.piercingDamageCheckbox.checked = false;
            }
        });
    }

    switchTab(clickedButton) {
        this.tabButtons.forEach(button => button.classList.remove('active'));
        this.tabPanes.forEach(pane => pane.classList.remove('active'));
        clickedButton.classList.add('active');
        const tabId = clickedButton.getAttribute('data-tab');
        document.getElementById(tabId).classList.add('active');
    }

    switchSubTab(clickedButton) {
        this.subTabButtons.forEach(button => button.classList.remove('active'));
        this.subTabPanes.forEach(pane => pane.classList.remove('active'));
        clickedButton.classList.add('active');
        const subTabId = clickedButton.getAttribute('data-sub-tab');
        document.getElementById(subTabId).classList.add('active');
    }

    addBuff(type) {
        const input = type === 'percentage' ? this.buffPercentageInput : this.buffFixedInput;
        const value = parseFloat(input.value);
        if (isNaN(value)) return;

        const buffElement = document.createElement('div');
        buffElement.classList.add('buff-item');
        
        const removeButton = document.createElement('button');
        removeButton.textContent = 'X';
        removeButton.addEventListener('click', () => this.removeBuff(type, buffElement));
        
        const valueSpan = document.createElement('span');
        valueSpan.classList.add('buff-value');
        valueSpan.textContent = `${type === 'percentage' ? value + '%' : value}`;
        
        buffElement.appendChild(removeButton);
        buffElement.appendChild(valueSpan);

        if (type === 'percentage') {
            this.percentageBuffList.appendChild(buffElement);
            this.calculator.addPercentageBuff(value);
        } else {
            this.fixedBuffList.appendChild(buffElement);
            this.calculator.addFixedBuff(value);
        }

        input.value = '';
        this.saveState();
    }

    removeBuff(type, element) {
        const index = Array.from(element.parentNode.children).indexOf(element);
        if (type === 'percentage') {
            this.percentageBuffList.removeChild(element);
            this.calculator.removePercentageBuff(index);
        } else {
            this.fixedBuffList.removeChild(element);
            this.calculator.removeFixedBuff(index);
        }
        this.saveState();
    }

    addShield() {
        const durability = parseFloat(this.shieldDurabilityInput.value);
        const def = parseFloat(this.shieldDefInput.value) || 0;
        const fakeHP = parseFloat(this.shieldFakeHPInput.value) || 0;
        const damageReduction = parseFloat(this.shieldDamageReductionInput.value) || 0;

        if (isNaN(durability)) return;

        const shield = { durability, def, fakeHP, damageReduction };
        this.calculator.addPhysicalShield(shield);

        const shieldElement = document.createElement('div');
        shieldElement.classList.add('shield-item');
        shieldElement.textContent = `Độ bền: ${durability}, Def: ${def}, Máu ảo: ${fakeHP}, Giảm damage: ${damageReduction}%`;

        const removeButton = document.createElement('button');
        removeButton.textContent = 'X';
        removeButton.addEventListener('click', () => this.removeShield(shieldElement));
        shieldElement.appendChild(removeButton);

        this.shieldList.appendChild(shieldElement);

        this.shieldDurabilityInput.value = '';
        this.shieldDefInput.value = '';
        this.shieldFakeHPInput.value = '';
        this.shieldDamageReductionInput.value = '';
        this.saveState();
    }

    removeShield(element) {
        const index = Array.from(this.shieldList.children).indexOf(element);
        this.shieldList.removeChild(element);
        this.calculator.removePhysicalShield(index);
        this.saveState();
    }

    calculate() {
        const activeTab = document.querySelector('.tab-pane.active').id;

        if (activeTab === 'stat-buff') {
            const activeSubTab = document.querySelector('.sub-tab-pane.active').id;
            let result;
            if (activeSubTab === 'stat') {
                const baseStat = parseFloat(this.baseStatInput.value) || 0;
                result = this.calculator.calculateStat(baseStat);
                this.resultDiv.textContent = `Kết quả tính toán chỉ số: ${result.toFixed(2)}`;
            } else {
                const baseDamage = parseFloat(this.baseDamageInput.value) || 0;
                const skillMultiplier = parseFloat(this.skillMultiplierInput.value) || 0;
                result = this.calculator.calculateSkillDamage(baseDamage, skillMultiplier);
                this.resultDiv.textContent = `Kết quả tính toán sát thương gây ra: ${result.toFixed(2)}`;
            }
        } else {
            const damageInfo = {
                incomingDamage: parseFloat(this.incomingDamageInput.value) || 0,
                defPierce: this.defPierceCheckbox.checked,
                piercingDamage: this.piercingDamageCheckbox.checked,
                trueDamage: this.trueDamageCheckbox.checked,
                fatalDamage: this.fatalDamageCheckbox.checked,
                constantDamage: this.constantDamageCheckbox.checked
            };
            const defenderInfo = {
                defense: parseFloat(this.defenseInput.value) || 0,
                fakeHP: parseFloat(this.fakeHPInput.value) || 0,
                damageReduction: parseFloat(this.damageReductionInput.value) || 0
            };
            const result = this.calculator.calculateDamageTaken(damageInfo, defenderInfo);
            this.resultDiv.textContent = `Sát thương cuối cùng: ${result.toFixed(2)}`;
        }
        this.saveState();
    }

    clearAllData() {
        // Clear all input fields
        const inputs = document.querySelectorAll('input');
        inputs.forEach(input => {
            if (input.type === 'number') {
                input.value = '';
            } else if (input.type === 'checkbox') {
                input.checked = false;
            }
        });

        // Clear buff and shield lists
        this.percentageBuffList.innerHTML = '';
        this.fixedBuffList.innerHTML = '';
        this.shieldList.innerHTML = '';

        // Reset calculator
        this.calculator = new DamageCalculator();

        // Clear result
        this.resultDiv.textContent = '';

        // Clear localStorage
        localStorage.removeItem('damageCalculatorState');

        alert('Tất cả dữ liệu đã được xóa.');
    }

    saveState() {
        const state = {
            activeTab: document.querySelector('.tab-button.active').getAttribute('data-tab'),
            activeSubTab: document.querySelector('.sub-tab-button.active')?.getAttribute('data-sub-tab'),
            baseStat: this.baseStatInput.value,
            baseDamage: this.baseDamageInput.value,
            skillMultiplier: this.skillMultiplierInput.value,
            incomingDamage: this.incomingDamageInput.value,
            defense: this.defenseInput.value,
            fakeHP: this.fakeHPInput.value,
            damageReduction: this.damageReductionInput.value,
            defPierce: this.defPierceCheckbox.checked,
            piercingDamage: this.piercingDamageCheckbox.checked,
            trueDamage: this.trueDamageCheckbox.checked,
            fatalDamage: this.fatalDamageCheckbox.checked,
            constantDamage: this.constantDamageCheckbox.checked,
            calculator: this.calculator.getState()
        };
        localStorage.setItem('damageCalculatorState', JSON.stringify(state));
    }

loadState() {
        const savedState = localStorage.getItem('damageCalculatorState');
        if (savedState) {
            const state = JSON.parse(savedState);
            this.switchTab(document.querySelector(`.tab-button[data-tab="${state.activeTab}"]`));
            if (state.activeSubTab) {
                this.switchSubTab(document.querySelector(`.sub-tab-button[data-sub-tab="${state.activeSubTab}"]`));
            }
            this.baseStatInput.value = state.baseStat || '';
            this.baseDamageInput.value = state.baseDamage || '';
            this.skillMultiplierInput.value = state.skillMultiplier || '';
            this.incomingDamageInput.value = state.incomingDamage || '';
            this.defenseInput.value = state.defense || '';
            this.fakeHPInput.value = state.fakeHP || '';
            this.damageReductionInput.value = state.damageReduction || '';
            this.defPierceCheckbox.checked = state.defPierce || false;
            this.piercingDamageCheckbox.checked = state.piercingDamage || false;
            this.trueDamageCheckbox.checked = state.trueDamage || false;
            this.fatalDamageCheckbox.checked = state.fatalDamage || false;
            this.constantDamageCheckbox.checked = state.constantDamage || false;
            this.calculator.loadState(state.calculator);
            this.renderBuffsAndShields();
        }
    }

    renderBuffsAndShields() {
        // Render percentage buffs
        this.percentageBuffList.innerHTML = '';
        this.calculator.percentageBuffs.forEach((buff, index) => {
            const buffElement = document.createElement('div');
            buffElement.classList.add('buff-item');
            buffElement.textContent = `${(buff * 100).toFixed(1)}%`;
            const removeButton = document.createElement('button');
            removeButton.textContent = 'X';
            removeButton.addEventListener('click', () => this.removeBuff('percentage', buffElement));
            buffElement.appendChild(removeButton);
            this.percentageBuffList.appendChild(buffElement);
        });

        // Render fixed buffs
        this.fixedBuffList.innerHTML = '';
        this.calculator.fixedBuffs.forEach((buff, index) => {
            const buffElement = document.createElement('div');
            buffElement.classList.add('buff-item');
            buffElement.textContent = buff.toString();
            const removeButton = document.createElement('button');
            removeButton.textContent = 'X';
            removeButton.addEventListener('click', () => this.removeBuff('fixed', buffElement));
            buffElement.appendChild(removeButton);
            this.fixedBuffList.appendChild(buffElement);
        });

        // Render shields
        this.shieldList.innerHTML = '';
        this.calculator.physicalShields.forEach((shield, index) => {
            const shieldElement = document.createElement('div');
            shieldElement.classList.add('shield-item');
            shieldElement.textContent = `Độ bền: ${shield.durability}, Def: ${shield.def}, Máu ảo: ${shield.fakeHP}, Giảm damage: ${shield.damageReduction}%`;
            const removeButton = document.createElement('button');
            removeButton.textContent = 'X';
            removeButton.addEventListener('click', () => this.removeShield(shieldElement));
            shieldElement.appendChild(removeButton);
            this.shieldList.appendChild(shieldElement);
        });
    }
}

// Khởi tạo ứng dụng
document.addEventListener('DOMContentLoaded', () => {
    const calculator = new DamageCalculator();
    new UIManager(calculator);
});