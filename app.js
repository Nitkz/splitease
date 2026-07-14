// State Management
let members = [];
let expenses = [];

// DOM Elements
const tabBtns = document.querySelectorAll('.tab-btn');
const viewSections = document.querySelectorAll('.view-section');

const memberForm = document.getElementById('member-form');
const memberNameInput = document.getElementById('member-name');
const membersList = document.getElementById('members-list');
const expensePayerSelect = document.getElementById('expense-payer');
const expenseSplitOptions = document.getElementById('expense-split-options');

const expenseForm = document.getElementById('expense-form');
const expenseTitleInput = document.getElementById('expense-title');
const expenseAmountInput = document.getElementById('expense-amount');
const expensesList = document.getElementById('expenses-list');

const totalSpentEl = document.getElementById('total-spent-amount');
const balancesList = document.getElementById('balances-list');
const settlementsList = document.getElementById('settlements-list');

// Event Listeners
document.addEventListener('DOMContentLoaded', init);

function init() {
    // Setup tabs
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.target));
    });

    // Forms
    memberForm.addEventListener('submit', handleAddMember);
    expenseForm.addEventListener('submit', handleAddExpense);

    render();
}

function switchTab(targetId) {
    tabBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.target === targetId);
    });
    viewSections.forEach(sec => {
        sec.classList.toggle('active', sec.id === targetId);
    });
}

function generateId() {
    return Math.random().toString(36).substring(2, 9);
}

// Members Logic
function handleAddMember(e) {
    e.preventDefault();
    const name = memberNameInput.value.trim();
    if (name) {
        members.push({ id: generateId(), name });
        memberNameInput.value = '';
        render();
    }
}

function removeMember(id) {
    // Check if member is involved in expenses
    const involved = expenses.some(ex => ex.payerId === id || ex.splitAmongIds.includes(id));
    if (involved) {
        alert("Cannot remove member involved in existing expenses.");
        return;
    }
    members = members.filter(m => m.id !== id);
    render();
}

// Expenses Logic
function handleAddExpense(e) {
    e.preventDefault();
    const title = expenseTitleInput.value.trim();
    const amount = parseFloat(expenseAmountInput.value);
    const payerId = expensePayerSelect.value;
    
    // Get checked split options
    const splitCheckboxes = document.querySelectorAll('input[name="split-member"]:checked');
    const splitAmongIds = Array.from(splitCheckboxes).map(cb => cb.value);

    if (splitAmongIds.length === 0) {
        alert("Must split with at least one person.");
        return;
    }

    if (title && amount > 0 && payerId) {
        expenses.push({
            id: generateId(),
            title,
            amount,
            payerId,
            splitAmongIds,
            date: new Date().toLocaleDateString()
        });
        
        expenseForm.reset();
        // re-check all split options by default
        document.querySelectorAll('input[name="split-member"]').forEach(cb => cb.checked = true);
        render();
    }
}

function removeExpense(id) {
    expenses = expenses.filter(e => e.id !== id);
    render();
}

// Calculations
function calculateBalances() {
    const balances = {};
    members.forEach(m => balances[m.id] = 0);

    expenses.forEach(ex => {
        if (!balances[ex.payerId] && balances[ex.payerId] !== 0) return; // in case member was removed forcefully somehow
        
        const splitAmount = ex.amount / ex.splitAmongIds.length;
        
        // Payer gets the full amount added to their balance
        balances[ex.payerId] += ex.amount;
        
        // Everyone in split subtracts their share
        ex.splitAmongIds.forEach(id => {
            if (balances[id] !== undefined) {
                balances[id] -= splitAmount;
            }
        });
    });

    return balances;
}

function calculateSettlements(balances) {
    const debtors = [];
    const creditors = [];

    for (const [id, balance] of Object.entries(balances)) {
        if (balance < -0.01) debtors.push({ id, amount: Math.abs(balance) });
        if (balance > 0.01) creditors.push({ id, amount: balance });
    }

    // Sort by amount descending
    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    const settlements = [];
    let d = 0, c = 0;

    while (d < debtors.length && c < creditors.length) {
        const debtor = debtors[d];
        const creditor = creditors[c];
        
        const amount = Math.min(debtor.amount, creditor.amount);
        
        if (amount > 0.01) {
            settlements.push({
                from: debtor.id,
                to: creditor.id,
                amount: amount
            });
        }

        debtor.amount -= amount;
        creditor.amount -= amount;

        if (debtor.amount < 0.01) d++;
        if (creditor.amount < 0.01) c++;
    }

    return settlements;
}

// Render Functions
function render() {
    renderMembers();
    renderExpenses();
    renderDashboard();
}

function renderMembers() {
    // Member list tab
    if (members.length === 0) {
        membersList.innerHTML = '<p class="empty-state">No members added yet.</p>';
        expensePayerSelect.innerHTML = '<option value="" disabled selected>Select a member</option>';
        expenseSplitOptions.innerHTML = '<p class="empty-state">Add members first.</p>';
    } else {
        membersList.innerHTML = '';
        expensePayerSelect.innerHTML = '<option value="" disabled selected>Select a member</option>';
        expenseSplitOptions.innerHTML = '';

        members.forEach(m => {
            // List item
            const li = document.createElement('li');
            li.className = 'member-item';
            li.innerHTML = `
                <span>${m.name}</span>
                <button type="button" class="btn danger-btn" onclick="removeMember('${m.id}')">Remove</button>
            `;
            membersList.appendChild(li);

            // Payer dropdown
            const option = document.createElement('option');
            option.value = m.id;
            option.textContent = m.name;
            expensePayerSelect.appendChild(option);

            // Split checkbox
            const label = document.createElement('label');
            label.className = 'checkbox-label';
            label.innerHTML = `
                <input type="checkbox" name="split-member" value="${m.id}" checked>
                ${m.name}
            `;
            expenseSplitOptions.appendChild(label);
        });
    }
}

function renderExpenses() {
    if (expenses.length === 0) {
        expensesList.innerHTML = '<p class="empty-state">No expenses recorded yet.</p>';
    } else {
        expensesList.innerHTML = '';
        expenses.forEach(ex => {
            const payer = members.find(m => m.id === ex.payerId);
            const payerName = payer ? payer.name : 'Unknown';
            
            const div = document.createElement('div');
            div.className = 'expense-item';
            div.innerHTML = `
                <div class="expense-info">
                    <h4>${ex.title}</h4>
                    <p>Paid by ${payerName} on ${ex.date} • Split among ${ex.splitAmongIds.length}</p>
                </div>
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <span class="expense-amount">$${ex.amount.toFixed(2)}</span>
                    <button type="button" class="btn danger-btn" onclick="removeExpense('${ex.id}')">X</button>
                </div>
            `;
            expensesList.appendChild(div);
        });
    }
}

function renderDashboard() {
    const totalSpent = expenses.reduce((sum, ex) => sum + ex.amount, 0);
    totalSpentEl.textContent = `$${totalSpent.toFixed(2)}`;

    const balances = calculateBalances();
    const settlements = calculateSettlements(balances);

    // Render Balances
    if (members.length === 0) {
        balancesList.innerHTML = '<p class="empty-state">Add members and expenses to see balances.</p>';
    } else {
        balancesList.innerHTML = '';
        members.forEach(m => {
            const bal = balances[m.id];
            const div = document.createElement('div');
            div.className = 'balance-item';
            
            let balClass = '';
            let balText = '';
            
            if (bal > 0.01) {
                balClass = 'balance-positive';
                balText = `gets back $${bal.toFixed(2)}`;
            } else if (bal < -0.01) {
                balClass = 'balance-negative';
                balText = `owes $${Math.abs(bal).toFixed(2)}`;
            } else {
                balText = 'settled up';
            }

            div.innerHTML = `
                <span>${m.name}</span>
                <span class="${balClass}">${balText}</span>
            `;
            balancesList.appendChild(div);
        });
    }

    // Render Settlements
    if (settlements.length === 0) {
        settlementsList.innerHTML = '<p class="empty-state">No settlements needed right now.</p>';
    } else {
        settlementsList.innerHTML = '';
        settlements.forEach(s => {
            const from = members.find(m => m.id === s.from)?.name || 'Unknown';
            const to = members.find(m => m.id === s.to)?.name || 'Unknown';
            
            const div = document.createElement('div');
            div.className = 'settlement-item';
            div.innerHTML = `
                <span class="settlement-text">${from} owes ${to} <strong>$${s.amount.toFixed(2)}</strong></span>
            `;
            settlementsList.appendChild(div);
        });
    }
}
