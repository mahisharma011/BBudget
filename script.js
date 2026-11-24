/* 1. HTML ELEMENTS */

// Transaction form
const form = document.getElementById("entryForm");
const titleInput = document.getElementById("title");
const amountInput = document.getElementById("amount");
const typeInput = document.getElementById("type");
const categoryInput = document.getElementById("category");
const dateInput = document.getElementById("date");

// Filters
const searchInput = document.getElementById("searchInput");
const filterType = document.getElementById("filterType");
const filterCategory = document.getElementById("filterCategory");
const sortEntries = document.getElementById("sortEntries");

// Transaction display
const entryList = document.getElementById("entryList");
const entryCount = document.getElementById("entryCount");

// Summary
const balanceElement = document.getElementById("balance");
const incomeElement = document.getElementById("income");
const expenseElement = document.getElementById("expense");
const balanceCaption = document.getElementById("balanceCaption");

// Budget
const budgetInput = document.getElementById("budget");
const saveBudgetButton = document.getElementById("saveBudget");
const clearBudgetButton = document.getElementById("clearBudget");
const budgetStatus = document.getElementById("budgetStatus");
const budgetNote = document.getElementById("budgetNote");
const budgetProgress = document.getElementById("budgetProgress");

// Other elements
const monthPicker = document.getElementById("monthPicker");
const categoryBreakdown = document.getElementById("categoryBreakdown");
const exportButton = document.getElementById("exportCsv");
const submitButton = document.getElementById("submitEntry");
const cancelEditButton = document.getElementById("cancelEdit");


/* 2. APPLICATION DATA */

const ENTRY_KEY = "budgetBuddyEntries";
const BUDGET_KEY = "budgetBuddyMonthlyBudgets";
const OLD_BUDGET_KEY = "budgetBuddyBudget";

const today = new Date();

function getLocalDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

const todayString = getLocalDate(today);
const currentMonth = todayString.slice(0, 7);

monthPicker.value = currentMonth;
monthPicker.max = currentMonth;

dateInput.value = todayString;
dateInput.max = todayString;


/* 3. LOCAL STORAGE */

function readStorage(key, fallback) {
    try {
        const savedData = localStorage.getItem(key);

        if (savedData === null) {
            return fallback;
        }

        return JSON.parse(savedData);

    } catch (error) {
        console.error("Unable to read saved data:", error);
        return fallback;
    }
}

function generateId() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
        return crypto.randomUUID();
    }

    return "entry-" + Date.now() + "-" + Math.random();
}


// Load existing transactions
const savedEntries = readStorage(ENTRY_KEY, []);

let entries = Array.isArray(savedEntries)
    ? savedEntries
        .filter(function(entry) {
            return entry &&
                typeof entry === "object" &&
                typeof entry.title === "string" &&
                Number.isFinite(Number(entry.amount)) &&
                Number(entry.amount) > 0 &&
                ["income", "expense"].includes(entry.type) &&
                typeof entry.date === "string";
        })
        .map(function(entry) {
            return {
                id: String(entry.id ?? generateId()),
                title: entry.title,
                amount: Number(entry.amount),
                type: entry.type,
                category: entry.category || "Other",
                date: entry.date
            };
        })
    : [];


// Load monthly budgets
const savedBudgets = readStorage(BUDGET_KEY, {});

let budgets = savedBudgets &&
    typeof savedBudgets === "object" &&
    !Array.isArray(savedBudgets)
        ? savedBudgets
        : {};


// Support budget saved in the previous version
const oldBudget = Number(localStorage.getItem(OLD_BUDGET_KEY));

if (!budgets[currentMonth] && Number.isFinite(oldBudget) && oldBudget > 0) {
    budgets[currentMonth] = oldBudget;
}


function saveEntries() {
    localStorage.setItem(ENTRY_KEY, JSON.stringify(entries));
}

function saveBudgets() {
    localStorage.setItem(BUDGET_KEY, JSON.stringify(budgets));
}


/* 4. FORMAT HELPERS */

function formatMoney(amount) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2
    }).format(amount);
}

function formatDate(dateString) {
    const date = new Date(dateString + "T00:00:00");

    return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}

function formatMonth(monthString) {
    const date = new Date(monthString + "-01T00:00:00");

    return date.toLocaleDateString("en-IN", {
        month: "long",
        year: "numeric"
    });
}

function getSelectedMonth() {
    return monthPicker.value || currentMonth;
}


/* 5. INITIAL PAGE INFORMATION */

document.getElementById("today").textContent =
    today.toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "short",
        year: "numeric"
    });


/* 6. ADD AND EDIT TRANSACTIONS */

let editingId = null;

form.addEventListener("submit", function(event) {

    event.preventDefault();

    const title = titleInput.value.trim();
    const amount = Number(amountInput.value);
    const type = typeInput.value;
    const category = categoryInput.value;
    const date = dateInput.value;

    // Validate transaction details
    if (
        !title ||
        !Number.isFinite(amount) ||
        amount <= 0 ||
        !date
    ) {
        alert("Please enter valid transaction details.");
        return;
    }

    // Prevent future dates
    if (date > todayString) {
        alert("Future dates cannot be recorded.");
        return;
    }

    const transaction = {
        id: editingId || generateId(),
        title: title,
        amount: amount,
        type: type,
        category: category,
        date: date
    };

    if (editingId !== null) {

        // Update existing transaction
        entries = entries.map(function(entry) {

            return String(entry.id) === editingId
                ? transaction
                : entry;

        });

    } else {

        // Add new transaction
        entries.unshift(transaction);
    }

    // Display the month of the saved transaction
    monthPicker.value = date.slice(0, 7);

    saveEntries();

    resetForm();
    updatePage();
});


/* 7. RESET TRANSACTION FORM */

function resetForm() {

    form.reset();

    editingId = null;

    dateInput.value = todayString;
    dateInput.max = todayString;

    document.getElementById("formEyebrow").textContent = "New note";

    document.getElementById("formHeading").textContent = "Add entry";

    submitButton.textContent = "Record entry";

    cancelEditButton.hidden = true;
}

cancelEditButton.addEventListener("click", resetForm);


/* 8. EDIT TRANSACTION */

function editEntry(id) {

    const selectedEntry = entries.find(function(entry) {
        return String(entry.id) === String(id);
    });

    if (!selectedEntry) {
        return;
    }

    editingId = String(selectedEntry.id);

    // Fill form with existing transaction details
    titleInput.value = selectedEntry.title;
    amountInput.value = selectedEntry.amount;
    typeInput.value = selectedEntry.type;
    categoryInput.value = selectedEntry.category;
    dateInput.value = selectedEntry.date;

    monthPicker.value = selectedEntry.date.slice(0, 7);

    // Change form heading and button
    document.getElementById("formEyebrow").textContent = "Make a change";

    document.getElementById("formHeading").textContent = "Edit entry";

    submitButton.textContent = "Save changes";

    cancelEditButton.hidden = false;

    updatePage();

    // Move to the editing form
    document.getElementById("planner").scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}


/* 9. DELETE TRANSACTION */

function removeEntry(id) {

    const shouldDelete = confirm(
        "Are you sure you want to remove this transaction?"
    );

    if (!shouldDelete) {
        return;
    }

    entries = entries.filter(function(entry) {
        return String(entry.id) !== String(id);
    });

    if (editingId === String(id)) {
        resetForm();
    }

    saveEntries();
    updatePage();
}


/* 10. MONTHLY SUMMARY */

function updateSummary(monthEntries) {

    let income = 0;
    let expense = 0;

    monthEntries.forEach(function(entry) {

        if (entry.type === "income") {
            income += entry.amount;
        } else {
            expense += entry.amount;
        }

    });

    const balance = income - expense;

    incomeElement.textContent = formatMoney(income);

    expenseElement.textContent = formatMoney(expense);

    balanceElement.textContent = formatMoney(balance);

    balanceElement.classList.remove(
        "positive-balance",
        "negative-balance"
    );

    if (balance >= 0) {

        balanceElement.classList.add("positive-balance");

        balanceCaption.textContent =
            "You have a positive balance.";

    } else {

        balanceElement.classList.add("negative-balance");

        balanceCaption.textContent =
            "Expenses are higher than income.";
    }

    return {
        income: income,
        expense: expense,
        balance: balance
    };
}


/* 11. SEARCH, FILTER AND SORT */

function getFilteredEntries(monthEntries) {

    const searchText = searchInput.value.trim().toLowerCase();

    const selectedType = filterType.value;

    const selectedCategory = filterCategory.value;

    const sorting = sortEntries.value;


    // Apply search and filters
    let filtered = monthEntries.filter(function(entry) {

        const matchesSearch =
            entry.title.toLowerCase().includes(searchText) ||
            entry.category.toLowerCase().includes(searchText);

        const matchesType =
            selectedType === "all" ||
            entry.type === selectedType;

        const matchesCategory =
            selectedCategory === "all" ||
            entry.category === selectedCategory;

        return matchesSearch && matchesType && matchesCategory;
    });


    // Sort the filtered transactions
    filtered.sort(function(a, b) {

        if (sorting === "newest") {
            return b.date.localeCompare(a.date);
        }

        if (sorting === "oldest") {
            return a.date.localeCompare(b.date);
        }

        if (sorting === "highest") {
            return b.amount - a.amount;
        }

        if (sorting === "lowest") {
            return a.amount - b.amount;
        }

        return 0;
    });

    return filtered;
}


/* 12. DISPLAY TRANSACTIONS */

function showEntries(monthEntries) {

    entryList.replaceChildren();

    const filtered = getFilteredEntries(monthEntries);

    if (filtered.length === 0) {

        const emptyMessage = document.createElement("p");

        emptyMessage.className = "empty";

        emptyMessage.textContent =
            monthEntries.length === 0
                ? "No entries for this month. Add your first transaction."
                : "No matching transactions found.";

        entryList.appendChild(emptyMessage);

    } else {

        filtered.forEach(function(entry) {

            const item = document.createElement("article");

            item.className = "entry " + entry.type;


            // Entry marker
            const mark = document.createElement("span");

            mark.className = "entry-mark";

            mark.setAttribute("aria-hidden", "true");


            // Transaction information
            const info = document.createElement("div");

            info.className = "entry-info";

            const title = document.createElement("h3");

            title.textContent = entry.title;

            const details = document.createElement("p");

            details.textContent =
                entry.category + " · " + formatDate(entry.date);

            info.appendChild(title);

            info.appendChild(details);


            // Transaction amount
            const amount = document.createElement("p");

            amount.className =
                "entry-amount " +
                (entry.type === "income" ? "positive" : "negative");

            amount.textContent =
                (entry.type === "income" ? "+" : "−") +
                formatMoney(entry.amount);


            // Action buttons
            const actions = document.createElement("div");

            actions.className = "entry-actions";


            // Edit button
            const editButton = document.createElement("button");

            editButton.type = "button";

            editButton.className = "edit-btn";

            editButton.textContent = "Edit";

            editButton.addEventListener("click", function() {
                editEntry(entry.id);
            });


            // Delete button
            const deleteButton = document.createElement("button");

            deleteButton.type = "button";

            deleteButton.className = "delete-btn";

            deleteButton.textContent = "Remove";

            deleteButton.setAttribute(
                "aria-label",
                "Remove " + entry.title
            );

            deleteButton.addEventListener("click", function() {
                removeEntry(entry.id);
            });


            actions.appendChild(editButton);

            actions.appendChild(deleteButton);


            // Build transaction row
            item.appendChild(mark);

            item.appendChild(info);

            item.appendChild(amount);

            item.appendChild(actions);

            entryList.appendChild(item);
        });
    }


    // Update transaction count
    entryCount.textContent =
        filtered.length + " shown · " +
        monthEntries.length + " total";

    return filtered;
}


/* 13. MONTHLY BUDGET */

function updateBudget(monthExpense) {

    const month = getSelectedMonth();

    const budget = Number(budgets[month]) || 0;

    const budgetTrack = budgetProgress.parentElement;

    budgetInput.value = budget > 0 ? budget : "";

    budgetTrack.classList.remove("over");

    budgetNote.classList.remove("warning");


    if (budget <= 0) {

        budgetStatus.textContent = "Set a monthly budget";

        budgetNote.textContent =
            "Set a limit to keep an eye on monthly spending.";

        budgetProgress.style.width = "0%";

        return;
    }


    const remaining = budget - monthExpense;

    const percentage = (monthExpense / budget) * 100;

    // Update progress bar
    budgetProgress.style.width =
        Math.min(percentage, 100) + "%";


    if (percentage > 100) {

        budgetTrack.classList.add("over");
    }


    // Show remaining amount
    if (remaining >= 0) {

        budgetStatus.textContent =
            formatMoney(remaining) + " left";

        budgetNote.textContent =
            formatMoney(monthExpense) +
            " used out of " +
            formatMoney(budget) + ".";

    } else {

        budgetStatus.textContent =
            formatMoney(Math.abs(remaining)) + " over";

        budgetNote.textContent =
            "You have crossed your monthly spending limit.";

        budgetNote.classList.add("warning");
    }
}


// Save budget for selected month
saveBudgetButton.addEventListener("click", function() {

    const budget = Number(budgetInput.value);

    if (!Number.isFinite(budget) || budget <= 0) {

        alert("Please enter a valid monthly budget.");

        return;
    }

    budgets[getSelectedMonth()] = budget;

    saveBudgets();

    updatePage();
});


// Remove monthly budget
clearBudgetButton.addEventListener("click", function() {

    const month = getSelectedMonth();

    if (!budgets[month]) {
        return;
    }

    delete budgets[month];

    saveBudgets();

    updatePage();
});


/* 14. CATEGORY-WISE SPENDING */

function showCategoryBreakdown(monthEntries, totalExpense) {

    categoryBreakdown.replaceChildren();

    const categoryTotals = {};


    // Calculate total spending in each category
    monthEntries.forEach(function(entry) {

        if (entry.type === "expense") {

            if (!categoryTotals[entry.category]) {
                categoryTotals[entry.category] = 0;
            }

            categoryTotals[entry.category] += entry.amount;
        }

    });


    // Convert object into an array and sort by amount
    const categoryData = Object.entries(categoryTotals);

    categoryData.sort(function(a, b) {
        return b[1] - a[1];
    });


    if (categoryData.length === 0) {

        const message = document.createElement("p");

        message.className = "empty-category";

        message.textContent =
            "Your spending categories will appear here.";

        categoryBreakdown.appendChild(message);

        return;
    }


    // Display each category
    categoryData.forEach(function(item) {

        const categoryName = item[0];

        const categoryAmount = item[1];

        const percentage =
            totalExpense > 0
                ? (categoryAmount / totalExpense) * 100
                : 0;


        const row = document.createElement("div");

        row.className = "category-row";


        // Category name and amount
        const top = document.createElement("div");

        top.className = "category-top";

        const name = document.createElement("span");

        name.textContent = categoryName;

        const value = document.createElement("span");

        value.textContent =
            formatMoney(categoryAmount) +
            " · " + Math.round(percentage) + "%";

        top.appendChild(name);

        top.appendChild(value);


        // Progress bar
        const track = document.createElement("div");

        track.className = "category-track";

        const fill = document.createElement("span");

        fill.style.width = percentage + "%";

        track.appendChild(fill);


        row.appendChild(top);

        row.appendChild(track);

        categoryBreakdown.appendChild(row);
    });
}


/* 15. CSV EXPORT */

function escapeCSV(value) {

    const text = String(value ?? "");

    return '"' + text.replace(/"/g, '""') + '"';
}


function exportTransactions() {

    const selectedMonth = getSelectedMonth();

    const monthEntries = entries.filter(function(entry) {

        return entry.date.startsWith(selectedMonth);

    });


    if (monthEntries.length === 0) {

        alert("There are no transactions to export for this month.");

        return;
    }


    const headings = [
        "Date",
        "Description",
        "Type",
        "Category",
        "Amount"
    ];


    const rows = monthEntries.map(function(entry) {

        return [
            entry.date,
            entry.title,
            entry.type,
            entry.category,
            entry.amount
        ];

    });


    const csvContent = [
        headings,
        ...rows

    ].map(function(row) {

        return row.map(escapeCSV).join(",");

    }).join("\r\n");


    // Create downloadable CSV file
    const blob = new Blob(
        ["\uFEFF" + csvContent],
        { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(blob);

    const downloadLink = document.createElement("a");

    downloadLink.href = url;

    downloadLink.download =
        "BudgetBuddy-" + selectedMonth + ".csv";

    document.body.appendChild(downloadLink);

    downloadLink.click();

    downloadLink.remove();

    URL.revokeObjectURL(url);
}

exportButton.addEventListener("click", exportTransactions);


/* 16. UPDATE THE COMPLETE PAGE */

function updatePage() {

    const selectedMonth = getSelectedMonth();


    // Get transactions for selected month
    const monthEntries = entries.filter(function(entry) {

        return entry.date.startsWith(selectedMonth);

    });


    const monthName = formatMonth(selectedMonth);


    // Update month information
    document.getElementById("termLabel").textContent = monthName;

    document.getElementById("monthHeading").textContent =
        "Showing entries for " + monthName + ".";


    // Update financial summary
    const summary = updateSummary(monthEntries);


    // Update monthly budget
    updateBudget(summary.expense);


    // Update category breakdown
    showCategoryBreakdown(monthEntries, summary.expense);


    // Update transaction list
    showEntries(monthEntries);


    // Disable export if there are no transactions
    exportButton.disabled = monthEntries.length === 0;
}


/* 17. EVENT LISTENERS */

// Change selected month
monthPicker.addEventListener("change", function() {

    if (!monthPicker.value) {
        monthPicker.value = currentMonth;
    }

    resetForm();

    updatePage();
});


// Search transactions
searchInput.addEventListener("input", updatePage);


// Filter transactions
filterType.addEventListener("change", updatePage);

filterCategory.addEventListener("change", updatePage);


// Sort transactions
sortEntries.addEventListener("change", updatePage);


// Sidebar navigation
const navigationLinks = document.querySelectorAll(".sidebar nav a");

navigationLinks.forEach(function(link) {

    link.addEventListener("click", function() {

        navigationLinks.forEach(function(navLink) {

            navLink.classList.remove("active");

        });

        link.classList.add("active");
    });
});


/* 18. INITIALIZE APPLICATION */

updatePage();
