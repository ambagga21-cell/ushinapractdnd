/**
 * TaskBoard — Приложение для управления задачами
 * Полная функциональность: drag-and-drop, localStorage, фильтры, сортировка
 */

// ============================================
// Глобальное состояние
// ============================================
let tasks = [];
let draggedTask = null;
let currentFilters = {
    category: 'all',
    priority: 'all',
    sortBy: 'created'
};

// ============================================
// Инициализация при загрузке
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    loadTasks();
    setupEventListeners();
    renderAllTasks();
    updateStats();
    updateColumnCounts();
});

// ============================================
// Работа с localStorage
// ============================================
function loadTasks() {
    const saved = localStorage.getItem('taskboard_tasks');
    if (saved) {
        try {
            tasks = JSON.parse(saved);
        } catch (e) {
            console.error('Ошибка загрузки задач:', e);
            tasks = [];
            showNotification('Ошибка загрузки данных', 'error');
        }
    }
}

function saveTasks() {
    localStorage.setItem('taskboard_tasks', JSON.stringify(tasks));
}

// ============================================
// Генерация ID
// ============================================
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// ============================================
// Настройка обработчиков событий
// ============================================
function setupEventListeners() {
    // Форма добавления задачи
    document.getElementById('taskForm').addEventListener('submit', handleAddTask);

    // Фильтры и сортировка
    document.getElementById('filterCategory').addEventListener('change', (e) => {
        currentFilters.category = e.target.value;
        renderAllTasks();
    });

    document.getElementById('filterPriority').addEventListener('change', (e) => {
        currentFilters.priority = e.target.value;
        renderAllTasks();
    });

    document.getElementById('sortBy').addEventListener('change', (e) => {
        currentFilters.sortBy = e.target.value;
        renderAllTasks();
    });

    document.getElementById('clearFilters').addEventListener('click', clearFilters);

    // Модальное окно редактирования
    document.getElementById('modalClose').addEventListener('click', closeEditModal);
    document.getElementById('cancelEdit').addEventListener('click', closeEditModal);
    document.getElementById('editForm').addEventListener('submit', handleEditTask);

    // Модальное окно удаления
    document.getElementById('deleteModalClose').addEventListener('click', closeDeleteModal);
    document.getElementById('cancelDelete').addEventListener('click', closeDeleteModal);
    document.getElementById('confirmDelete').addEventListener('click', confirmDeleteTask);

    // Drag-and-drop для колонок
    setupDragAndDrop();

    // Закрытие модальных окон по клику вне
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeEditModal();
            closeDeleteModal();
        }
    });
}

// ============================================
// Добавление задачи
// ============================================
function handleAddTask(e) {
    e.preventDefault();

    const title = document.getElementById('taskTitle').value.trim();
    const category = document.getElementById('taskCategory').value;
    const description = document.getElementById('taskDescription').value.trim();
    const dueDate = document.getElementById('taskDueDate').value;
    const priority = document.getElementById('taskPriority').value;

    if (!title) {
        showNotification('Введите название задачи', 'error');
        return;
    }

    const newTask = {
        id: generateId(),
        title,
        category,
        description,
        dueDate: dueDate || null,
        priority,
        status: 'new',
        createdAt: new Date().toISOString()
    };

    tasks.push(newTask);
    saveTasks();
    renderAllTasks();
    updateStats();
    updateColumnCounts();

    // Очистка формы
    document.getElementById('taskForm').reset();
    document.getElementById('taskPriority').value = 'medium';

    showNotification('Задача успешно добавлена!', 'success');
}

// ============================================
// Рендеринг всех задач
// ============================================
function renderAllTasks() {
    // Очистка всех колонок
    ['new', 'in-progress', 'review', 'done'].forEach(status => {
        const column = document.getElementById(`column-${status}`);
        column.innerHTML = '';
    });

    // Фильтрация и сортировка
    let filteredTasks = filterTasks();
    filteredTasks = sortTasks(filteredTasks);

    // Распределение по колонкам
    filteredTasks.forEach(task => {
        const card = createTaskCard(task);
        const column = document.getElementById(`column-${task.status}`);
        if (column) {
            column.appendChild(card);
        }
    });

    // Показ пустого состояния
    ['new', 'in-progress', 'review', 'done'].forEach(status => {
        const column = document.getElementById(`column-${status}`);
        const taskCount = filteredTasks.filter(t => t.status === status).length;
        if (taskCount === 0 && column.children.length === 0) {
            column.innerHTML = '<div class="empty-column"><span>📭</span><p>Нет задач</p></div>';
        }
    });

    updateColumnCounts();
}

// ============================================
// Фильтрация задач
// ============================================
function filterTasks() {
    return tasks.filter(task => {
        const categoryMatch = currentFilters.category === 'all' || task.category === currentFilters.category;
        const priorityMatch = currentFilters.priority === 'all' || task.priority === currentFilters.priority;
        return categoryMatch && priorityMatch;
    });
}

// ============================================
// Сортировка задач
// ============================================
function sortTasks(tasksToSort) {
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };

    return [...tasksToSort].sort((a, b) => {
        switch (currentFilters.sortBy) {
            case 'created':
                return new Date(b.createdAt) - new Date(a.createdAt);
            case 'dueDate':
                if (!a.dueDate) return 1;
                if (!b.dueDate) return -1;
                return new Date(a.dueDate) - new Date(b.dueDate);
            case 'priority':
                return priorityOrder[a.priority] - priorityOrder[b.priority];
            case 'title':
                return a.title.localeCompare(b.title);
            default:
                return 0;
        }
    });
}

// ============================================
// Создание карточки задачи
// ============================================
function createTaskCard(task) {
    const card = document.createElement('div');
    card.className = `task-card priority-${task.priority}`;
    card.draggable = true;
    card.dataset.taskId = task.id;

    // Проверка просрочки
    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';
    const overdueClass = isOverdue ? 'overdue' : '';

    // Форматирование даты
    let dueDateDisplay = '';
    if (task.dueDate) {
        const date = new Date(task.dueDate);
        dueDateDisplay = `📅 ${date.toLocaleDateString('ru-RU')}`;
    }

    // Названия категорий
    const categoryNames = {
        study: '📚 Учебная',
        home: '🏠 Домашнее',
        project: '💼 Проект',
        personal: '👤 Личное',
        team: '👥 Командная',
        exam: '🎓 Экзамен'
    };

    card.innerHTML = `
        <div class="task-card-header">
            <span class="task-card-title">${escapeHtml(task.title)}</span>
            <div class="task-card-actions">
                <button class="task-card-btn edit-btn" title="Редактировать">✏️</button>
                <button class="task-card-btn delete-btn" title="Удалить">🗑️</button>
            </div>
        </div>
        ${task.description ? `<p class="task-card-description">${escapeHtml(task.description)}</p>` : ''}
        <div class="task-card-meta">
            <span class="task-category category-${task.category}">${categoryNames[task.category] || task.category}</span>
            ${task.dueDate ? `<span class="task-due-date ${overdueClass}">${dueDateDisplay}</span>` : ''}
        </div>
    `;

    // Обработчики событий
    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragend', handleDragEnd);
    card.querySelector('.edit-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        openEditModal(task);
    });
    card.querySelector('.delete-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        openDeleteModal(task.id);
    });

    return card;
}

// ============================================
// Drag-and-Drop
// ============================================
function setupDragAndDrop() {
    const columns = document.querySelectorAll('.column-content');

    columns.forEach(column => {
        column.addEventListener('dragover', handleDragOver);
        column.addEventListener('dragenter', handleDragEnter);
        column.addEventListener('dragleave', handleDragLeave);
        column.addEventListener('drop', handleDrop);
    });
}

function handleDragStart(e) {
    draggedTask = e.target;
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', e.target.dataset.taskId);
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
    draggedTask = null;

    // Убираем подсветку со всех колонок
    document.querySelectorAll('.column-content').forEach(col => {
        col.classList.remove('drag-over');
    });
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function handleDragEnter(e) {
    e.preventDefault();
    const column = e.target.closest('.column-content');
    if (column) {
        column.classList.add('drag-over');
    }
}

function handleDragLeave(e) {
    const column = e.target.closest('.column-content');
    if (column && !column.contains(e.relatedTarget)) {
        column.classList.remove('drag-over');
    }
}

function handleDrop(e) {
    e.preventDefault();
    const column = e.target.closest('.column-content');
    if (!column || !draggedTask) return;

    column.classList.remove('drag-over');

    const taskId = draggedTask.dataset.taskId;
    const newStatus = column.id.replace('column-', '');

    // Обновление статуса задачи
    const task = tasks.find(t => t.id === taskId);
    if (task && task.status !== newStatus) {
        task.status = newStatus;
        saveTasks();
        renderAllTasks();
        updateStats();

        // Сообщение о перемещении
        const statusNames = {
            'new': 'Новые',
            'in-progress': 'В работе',
            'review': 'На проверке',
            'done': 'Завершённые'
        };
        showNotification(`Задача перемещена: ${statusNames[newStatus]}`, 'info');
    }
}

// ============================================
// Редактирование задачи
// ============================================
function openEditModal(task) {
    document.getElementById('editTaskId').value = task.id;
    document.getElementById('editTitle').value = task.title;
    document.getElementById('editCategory').value = task.category;
    document.getElementById('editDescription').value = task.description || '';
    document.getElementById('editDueDate').value = task.dueDate || '';
    document.getElementById('editPriority').value = task.priority;
    document.getElementById('editStatus').value = task.status;

    document.getElementById('editModal').classList.remove('hidden');
}

function closeEditModal() {
    document.getElementById('editModal').classList.add('hidden');
    document.getElementById('editForm').reset();
}

function handleEditTask(e) {
    e.preventDefault();

    const taskId = document.getElementById('editTaskId').value;
    const task = tasks.find(t => t.id === taskId);

    if (!task) {
        showNotification('Задача не найдена', 'error');
        return;
    }

    task.title = document.getElementById('editTitle').value.trim();
    task.category = document.getElementById('editCategory').value;
    task.description = document.getElementById('editDescription').value.trim();
    task.dueDate = document.getElementById('editDueDate').value || null;
    task.priority = document.getElementById('editPriority').value;
    task.status = document.getElementById('editStatus').value;

    saveTasks();
    renderAllTasks();
    updateStats();
    closeEditModal();

    showNotification('Задача обновлена!', 'success');
}

// ============================================
// Удаление задачи
// ============================================
function openDeleteModal(taskId) {
    document.getElementById('deleteTaskId').value = taskId;
    document.getElementById('deleteModal').classList.remove('hidden');
}

function closeDeleteModal() {
    document.getElementById('deleteModal').classList.add('hidden');
}

function confirmDeleteTask() {
    const taskId = document.getElementById('deleteTaskId').value;
    const taskIndex = tasks.findIndex(t => t.id === taskId);

    if (taskIndex !== -1) {
        tasks.splice(taskIndex, 1);
        saveTasks();
        renderAllTasks();
        updateStats();
        closeDeleteModal();
        showNotification('Задача удалена', 'success');
    }
}

// ============================================
// Статистика
// ============================================
function updateStats() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'done').length;
    const inProgress = tasks.filter(t => t.status === 'in-progress').length;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const overdue = tasks.filter(t => {
        if (!t.dueDate || t.status === 'done') return false;
        const dueDate = new Date(t.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate < today;
    }).length;

    document.getElementById('totalTasks').textContent = total;
    document.getElementById('completedTasks').textContent = completed;
    document.getElementById('inProgressTasks').textContent = inProgress;
    document.getElementById('overdueTasks').textContent = overdue;
}

// ============================================
// Счётчики колонок
// ============================================
function updateColumnCounts() {
    const filteredTasks = filterTasks();

    ['new', 'in-progress', 'review', 'done'].forEach(status => {
        const count = filteredTasks.filter(t => t.status === status).length;
        const countElement = document.getElementById(`count-${status}`);
        if (countElement) {
            countElement.textContent = count;
        }
    });
}

// ============================================
// Очистка фильтров
// ============================================
function clearFilters() {
    currentFilters = {
        category: 'all',
        priority: 'all',
        sortBy: 'created'
    };

    document.getElementById('filterCategory').value = 'all';
    document.getElementById('filterPriority').value = 'all';
    document.getElementById('sortBy').value = 'created';

    renderAllTasks();
    showNotification('Фильтры сброшены', 'info');
}

// ============================================
// Уведомления
// ============================================
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type}`;

    setTimeout(() => {
        notification.classList.add('hidden');
    }, 3000);
}

// ============================================
// Экранирование HTML
// ============================================
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
