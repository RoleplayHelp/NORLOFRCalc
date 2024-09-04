class DamageCalculator {
    constructor() {
        this.percentageBuffs = [];
        this.fixedBuffs = [];
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

    calculateDamageTaken(incomingDamage, defense, damageReduction) {
        const damageAfterDefense = Math.max(0, incomingDamage - defense);
        const finalDamage = damageAfterDefense * (1 - (damageReduction / 100));
        return Math.max(0, finalDamage);
    }

    loadState(state) {
        this.percentageBuffs = state.percentageBuffs || [];
        this.fixedBuffs = state.fixedBuffs || [];
    }

    getState() {
        return {
            percentageBuffs: this.percentageBuffs,
            fixedBuffs: this.fixedBuffs
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
        this.tabButtons = document.querySelectorAll('.tab-button');
        this.tabPanes = document.querySelectorAll('.tab-pane');
        this.subTabButtons = document.querySelectorAll('.sub-tab-button');
        this.subTabPanes = document.querySelectorAll('.sub-tab-pane');
        this.baseStatInput = document.getElementById('base-stat');
        this.baseDamageInput = document.getElementById('base-damage');
        this.skillMultiplierInput = document.getElementById('skill-multiplier');
        this.incomingDamageInput = document.getElementById('incoming-damage');
        this.defenseInput = document.getElementById('defense');
        this.damageReductionInput = document.getElementById('damage-reduction');
        this.buffPercentageInput = document.getElementById('buff-percentage');
        this.buffFixedInput = document.getElementById('buff-fixed');
        this.addPercentageBuffButton = document.getElementById('add-percentage-buff');
        this.addFixedBuffButton = document.getElementById('add-fixed-buff');
        this.percentageBuffList = document.getElementById('percentage-buff-list');
        this.fixedBuffList = document.getElementById('fixed-buff-list');
        this.calculateButton = document.getElementById('calculate');
        this.resultDiv = document.getElementById('result');
		this.clearDataButton = document.getElementById('clear-data');
    }

    bindEvents() {
        this.tabButtons.forEach(button => {
            button.addEventListener('click', () => this.switchTab(button));
        });
        this.subTabButtons.forEach(button => {
            button.addEventListener('click', () => this.switchSubTab(button));
        });
        this.addPercentageBuffButton.addEventListener('click', () => this.addBuff('percentage'));
        this.addFixedBuffButton.addEventListener('click', () => this.addBuff('fixed'));
        this.calculateButton.addEventListener('click', () => this.calculate());
		this.clearDataButton.addEventListener('click', () => this.clearAllData());

        const inputs = document.querySelectorAll('input[type="number"]');
        inputs.forEach(input => {
            input.addEventListener('input', () => this.saveState());
        });
    }

    switchTab(clickedButton) {
        this.tabButtons.forEach(button => button.classList.remove('active'));
        this.tabPanes.forEach(pane => pane.classList.remove('active'));
        clickedButton.classList.add('active');
        const tabId = clickedButton.getAttribute('data-tab');
        document.getElementById(tabId).classList.add('active');
        this.saveState();
    }

    switchSubTab(clickedButton) {
        this.subTabButtons.forEach(button => button.classList.remove('active'));
        this.subTabPanes.forEach(pane => pane.classList.remove('active'));
        clickedButton.classList.add('active');
        const subTabId = clickedButton.getAttribute('data-sub-tab');
        document.getElementById(subTabId).classList.add('active');
        this.saveState();
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

    calculate() {
        const activeTab = document.querySelector('.tab-pane.active').id;
        let result;

        if (activeTab === 'stat-buff') {
            const activeSubTab = document.querySelector('.sub-tab-pane.active').id;
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
            const incomingDamage = parseFloat(this.incomingDamageInput.value) || 0;
            const defense = parseFloat(this.defenseInput.value) || 0;
            const damageReduction = parseFloat(this.damageReductionInput.value) || 0;
            result = this.calculator.calculateDamageTaken(incomingDamage, defense, damageReduction);
            this.resultDiv.textContent = `Sát thương nhận vào: ${result.toFixed(2)}`;
        }

        this.saveState();
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
            damageReduction: this.damageReductionInput.value,
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
            this.damageReductionInput.value = state.damageReduction || '';
            this.calculator.loadState(state.calculator);
            this.renderBuffs();
        }
    }

    renderBuffs() {
        this.percentageBuffList.innerHTML = '';
        this.fixedBuffList.innerHTML = '';
        this.calculator.percentageBuffs.forEach(buff => {
            this.renderBuff('percentage', buff * 100);
        });
        this.calculator.fixedBuffs.forEach(buff => {
            this.renderBuff('fixed', buff);
        });
    }

    renderBuff(type, value) {
        const buffElement = document.createElement('div');
        buffElement.classList.add('buff-item');
        
        const removeButton = document.createElement('button');
        removeButton.textContent = 'X';
        removeButton.addEventListener('click', () => this.removeBuff(type, buffElement));
        
        const valueSpan = document.createElement('span');
        valueSpan.classList.add('buff-value');
        valueSpan.textContent = `${type === 'percentage' ? value.toFixed(1) + '%' : value.toFixed(1)}`;
        
        buffElement.appendChild(removeButton);
        buffElement.appendChild(valueSpan);

        if (type === 'percentage') {
            this.percentageBuffList.appendChild(buffElement);
        } else {
            this.fixedBuffList.appendChild(buffElement);
        }
    }
	
	clearAllData() {
        // Xóa localStorage
        localStorage.removeItem('damageCalculatorState');

        // Đặt lại giá trị của tất cả các trường nhập liệu
        this.baseStatInput.value = '';
        this.baseDamageInput.value = '';
        this.skillMultiplierInput.value = '';
        this.incomingDamageInput.value = '';
        this.defenseInput.value = '';
        this.damageReductionInput.value = '';
        this.buffPercentageInput.value = '';
        this.buffFixedInput.value = '';

        // Xóa tất cả các buff
        this.percentageBuffList.innerHTML = '';
        this.fixedBuffList.innerHTML = '';
        this.calculator.percentageBuffs = [];
        this.calculator.fixedBuffs = [];

        // Đặt lại kết quả
        this.resultDiv.textContent = '';

        // Chuyển về tab đầu tiên
        this.switchTab(this.tabButtons[0]);
        if (this.subTabButtons.length > 0) {
            this.switchSubTab(this.subTabButtons[0]);
        }

        alert('Tất cả dữ liệu đã được xóa.');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const calculator = new DamageCalculator();
    new UIManager(calculator);
});