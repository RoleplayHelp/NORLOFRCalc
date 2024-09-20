class DamageCalculator {
    constructor() {
        this.percentageBuffs = [];
        this.fixedBuffs = [];
        this.physicalShields = [];
    }

    resetShields() {
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

    calculateDamageTaken(attacksInfo, defenderInfo) {
        let totalDamage = 0;
        let currentFakeHP = defenderInfo.fakeHP;
        let currentShields = [...this.physicalShields];

        for (let attack of attacksInfo) {
            let { incomingDamage, defPierce, piercingDamage, trueDamage, fatalDamage, constantDamage } = attack;
            let remainingDamage = incomingDamage;

            // Áp dụng giảm sát thương chung (trừ True Damage và Fatal Damage)
            if (!trueDamage && !fatalDamage) {
                remainingDamage *= (1 - defenderInfo.damageReduction / 100);
            }

            // Xử lý khiên vật lý (Fatal Damage vẫn bị chặn bởi khiên)
            if (!piercingDamage) {
                if (constantDamage) {
                    // Logic CDD giữ nguyên
                    for (let shield of currentShields) {
                        if (remainingDamage > shield.durability) {
                            shield.durability = 0;
                        } else {
                            let damageToShield = remainingDamage * (1 - shield.damageReduction / 100);
                            damageToShield = Math.max(0, damageToShield - shield.fakeHP - shield.def);
                            let absorbed = Math.min(shield.durability, damageToShield);
                            remainingDamage -= absorbed;
                            shield.durability -= absorbed;
                        }
                        if (remainingDamage <= 0) break;
                    }
                } else {
                    // Xử lý thông thường cho các loại sát thương khác
                    for (let shield of currentShields) {
                        if (shield.durability <= 0) continue;
                        let damageToShield = remainingDamage * (1 - shield.damageReduction / 100);
                        damageToShield = Math.max(0, damageToShield - shield.fakeHP - shield.def);
                        let absorbed = Math.min(shield.durability, damageToShield);
                        remainingDamage -= absorbed;
                        shield.durability -= absorbed;
                        if (remainingDamage <= 0) break;
                    }
                }
                currentShields = currentShields.filter(shield => shield.durability > 0);
            }

            // Áp dụng Fake HP (trừ Fatal Damage)
            if (!fatalDamage && currentFakeHP > 0) {
                let absorbed = Math.min(currentFakeHP, remainingDamage);
                remainingDamage -= absorbed;
                currentFakeHP -= absorbed;
            }

            // Áp dụng Def (nếu không phải Xuyên Def hoặc Fatal Damage)
            if (!defPierce && !fatalDamage) {
                remainingDamage = Math.max(0, remainingDamage - defenderInfo.defense);
            }

            totalDamage += Math.max(0, remainingDamage);
        }

        return totalDamage;
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
        this.baseStatInput = document.getElementById('base-stat');
        this.baseDamageInput = document.getElementById('base-damage');
        this.skillMultiplierInput = document.getElementById('skill-multiplier');
        this.buffPercentageInput = document.getElementById('buff-percentage');
        this.buffFixedInput = document.getElementById('buff-fixed');
        this.addPercentageBuffButton = document.getElementById('add-percentage-buff');
        this.addFixedBuffButton = document.getElementById('add-fixed-buff');
        this.percentageBuffList = document.getElementById('percentage-buff-list');
        this.fixedBuffList = document.getElementById('fixed-buff-list');

        this.attacksContainer = document.getElementById('attacks-container');
        this.addAttackButton = document.getElementById('add-attack');
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

        this.tabButtons = document.querySelectorAll('.tab-button');
        this.tabPanes = document.querySelectorAll('.tab-pane');
        this.subTabButtons = document.querySelectorAll('.sub-tab-button');
        this.subTabPanes = document.querySelectorAll('.sub-tab-pane');

        this.statHelpButton = document.getElementById('stat-help-button');
        this.damageHelpButton = document.getElementById('damage-help-button');
        this.statHelpModal = document.getElementById('stat-help-modal');
        this.damageHelpModal = document.getElementById('damage-help-modal');
        this.closeButtons = document.querySelectorAll('.close');
    }

    bindEvents() {
        if (this.addPercentageBuffButton) {
            this.addPercentageBuffButton.addEventListener('click', () => this.addBuff('percentage'));
        }
        if (this.addFixedBuffButton) {
            this.addFixedBuffButton.addEventListener('click', () => this.addBuff('fixed'));
        }
        if (this.addShieldButton) {
            this.addShieldButton.addEventListener('click', () => this.addShield());
        }
        if (this.addAttackButton) {
            this.addAttackButton.addEventListener('click', () => this.addAttack());
        }
        if (this.calculateButton) {
            this.calculateButton.addEventListener('click', () => this.calculate());
        }
        if (this.clearDataButton) {
            this.clearDataButton.addEventListener('click', () => this.clearAllData());
        }

        this.tabButtons.forEach(button => {
            button.addEventListener('click', () => this.switchTab(button));
        });
        this.subTabButtons.forEach(button => {
            button.addEventListener('click', () => this.switchSubTab(button));
        });

        if (this.statHelpButton) {
            this.statHelpButton.addEventListener('click', () => this.openHelpModal('stat-help-modal'));
        }
        if (this.damageHelpButton) {
            this.damageHelpButton.addEventListener('click', () => this.openHelpModal('damage-help-modal'));
        }
        this.closeButtons.forEach(button => {
            button.addEventListener('click', () => this.closeHelpModal(button.closest('.modal').id));
        });
        window.addEventListener('click', (event) => {
            if (event.target.classList.contains('modal')) {
                this.closeHelpModal(event.target.id);
            }
        });
    }

    openHelpModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
        }
    }

    closeHelpModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }
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

    addAttack() {
        const attackIndex = this.attacksContainer.children.length;
        const attackTemplate = `
            <div class="attack-info">
                <h3>Thông tin sát thương ${attackIndex + 1}</h3>
                <div class="input-group">
                    <label for="incoming-damage-${attackIndex}">Chỉ số sát thương:</label>
                    <input type="number" id="incoming-damage-${attackIndex}" min="0" step="any">
                </div>
                <div class="effect-group">
                    <label><input type="checkbox" id="def-pierce-${attackIndex}"> Xuyên Def</label>
                    <label><input type="checkbox" id="piercing-damage-${attackIndex}"> Piercing Damage</label>
                    <label><input type="checkbox" id="true-damage-${attackIndex}"> True Damage</label>
                    <label><input type="checkbox" id="fatal-damage-${attackIndex}"> Fatal Damage</label>
                    <label><input type="checkbox" id="constant-damage-${attackIndex}"> CDD (Constant Damage)</label>
                </div>
            </div>`;
        this.attacksContainer.insertAdjacentHTML('beforeend', attackTemplate);

        if (attackIndex > 0) {
            const prevAttack = this.attacksContainer.children[attackIndex - 1];
            const newAttack = this.attacksContainer.children[attackIndex];
            ['def-pierce', 'piercing-damage', 'true-damage', 'fatal-damage', 'constant-damage'].forEach(effect => {
                newAttack.querySelector(`#${effect}-${attackIndex}`).checked = prevAttack.querySelector(`#${effect}-${attackIndex - 1}`).checked;
            });
        }
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
            // Đọc lại tất cả thông tin từ giao diện người dùng mỗi lần tính toán
            const attacksInfo = Array.from(this.attacksContainer.children).map((attack, index) => ({
                incomingDamage: parseFloat(attack.querySelector(`#incoming-damage-${index}`).value) || 0,
                defPierce: attack.querySelector(`#def-pierce-${index}`).checked,
                piercingDamage: attack.querySelector(`#piercing-damage-${index}`).checked,
                trueDamage: attack.querySelector(`#true-damage-${index}`).checked,
                fatalDamage: attack.querySelector(`#fatal-damage-${index}`).checked,
                constantDamage: attack.querySelector(`#constant-damage-${index}`).checked
            }));

            const defenderInfo = {
                defense: parseFloat(this.defenseInput.value) || 0,
                fakeHP: parseFloat(this.fakeHPInput.value) || 0,
                damageReduction: parseFloat(this.damageReductionInput.value) || 0
            };

            // Đặt lại trạng thái của calculator trước mỗi lần tính toán
            this.calculator.resetShields();
            this.calculator.physicalShields = Array.from(this.shieldList.children).map(shieldElement => {
                const [durability, def, fakeHP, damageReduction] = shieldElement.textContent.match(/\d+(\.\d+)?/g).map(Number);
                return { durability, def, fakeHP, damageReduction };
            });

            const result = this.calculator.calculateDamageTaken(attacksInfo, defenderInfo);
            this.resultDiv.textContent = `Tổng sát thương cuối cùng: ${result.toFixed(2)}`;
        }
        this.saveState();
    }

    clearAllData() {
        const inputs = document.querySelectorAll('input');
        inputs.forEach(input => {
            if (input.type === 'number') {
                input.value = '';
            } else if (input.type === 'checkbox') {
                input.checked = false;
            }
        });

        this.percentageBuffList.innerHTML = '';
        this.fixedBuffList.innerHTML = '';
        this.shieldList.innerHTML = '';
        this.attacksContainer.innerHTML = '';
        this.addAttack();

        this.calculator = new DamageCalculator();

        this.resultDiv.textContent = '';

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
            defense: this.defenseInput.value,
            fakeHP: this.fakeHPInput.value,
            damageReduction: this.damageReductionInput.value,
            attacks: Array.from(this.attacksContainer.children).map((attack, index) => ({
                incomingDamage: document.getElementById(`incoming-damage-${index}`).value,
                defPierce: document.getElementById(`def-pierce-${index}`).checked,
                piercingDamage: document.getElementById(`piercing-damage-${index}`).checked,
                trueDamage: document.getElementById(`true-damage-${index}`).checked,
                fatalDamage: document.getElementById(`fatal-damage-${index}`).checked,
                constantDamage: document.getElementById(`constant-damage-${index}`).checked
            })),
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
            this.defenseInput.value = state.defense || '';
            this.fakeHPInput.value = state.fakeHP || '';
            this.damageReductionInput.value = state.damageReduction || '';
            
            this.attacksContainer.innerHTML = '';
            if (state.attacks && state.attacks.length > 0) {
                state.attacks.forEach((attack, index) => {
                    this.addAttack();
                    document.getElementById(`incoming-damage-${index}`).value = attack.incomingDamage || '';
                    document.getElementById(`def-pierce-${index}`).checked = attack.defPierce || false;
                    document.getElementById(`piercing-damage-${index}`).checked = attack.piercingDamage || false;
                    document.getElementById(`true-damage-${index}`).checked = attack.trueDamage || false;
                    document.getElementById(`fatal-damage-${index}`).checked = attack.fatalDamage || false;
                    document.getElementById(`constant-damage-${index}`).checked = attack.constantDamage || false;
                });
            } else {
                this.addAttack();
            }
            
            this.calculator.loadState(state.calculator);
            this.renderBuffsAndShields();
        }
    }

    renderBuffsAndShields() {
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
    const ui = new UIManager(calculator);
});