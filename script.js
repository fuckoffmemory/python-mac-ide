let pyodide = null;
const editor = document.getElementById('code-editor');
const output = document.getElementById('output-terminal');
const fileTabs = document.getElementById('file-tabs');
const themeBtn = document.getElementById('theme-toggle-btn');
const runBtn = document.getElementById('run-btn');
const newFileBtn = document.getElementById('new-file-btn');
const installLibBtn = document.getElementById('install-lib-btn');

// Состояние файлов
let files = {'main.py': editor.value};
let currentFile = 'main.py';

// Загрузка темы при старте
if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark-mode');
}

// Инициализация Pyodide
async function loadPyodide() {
    output.textContent = 'Загружается Python...';
    try {
        pyodide = await loadPyodideFromCDN();
        output.textContent = '';
    } catch (err) {
        output.textContent = 'Ошибка загрузки Python.';
    }
}
loadPyodide();

// Функционал вкладок
function createTab(filename) {
    const tab = document.createElement('div');
    tab.className = 'tab';
    tab.dataset.filename = filename;
    tab.textContent = filename;
    
    // Переключение между файлами
    tab.onclick = () => {
        saveCurrentFile();
        switchToFile(filename);
    };
    
    // Закрытие по ПКМ (опционально)
    tab.oncontextmenu = (e) => {
        e.preventDefault();
        if (Object.keys(files).length > 1) {
            delete files[filename];
            tab.remove();
            switchToFile('main.py');
            localStorage.setItem('files', JSON.stringify(files));
        }
    };
    return tab;
}

function saveCurrentFile() {
    files[currentFile] = editor.value;
    localStorage.setItem('files', JSON.stringify(files));
}

function switchToFile(filename) {
    currentFile = filename;
    editor.value = files[filename];
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.filename === filename));
}

// Создание нового файла
newFileBtn.onclick = () => {
    let name = prompt("Введите имя файла (например, test.py):", "test.py");
    if (!name || files[name]) return;
    files[name] = '# Новый файл\n';
    fileTabs.appendChild(createTab(name));
    switchToFile(name);
    localStorage.setItem('files', JSON.stringify(files));
};

// Загрузка сохраненных файлов
if (localStorage.getItem('files')) {
    files = JSON.parse(localStorage.getItem('files'));
    Object.keys(files).forEach(fname => {
        if (fname !== 'main.py') fileTabs.appendChild(createTab(fname));
    });
}

// Сохранение текста при вводе
editor.addEventListener('input', () => {
    files[currentFile] = editor.value;
});

// Смена темы
themeBtn.onclick = () => {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
};

// Установка библиотек (аналог вашего request на функцию import)
installLibBtn.onclick = async () => {
    if (!pyodide) return alert('Python еще грузится...');
    const pkg = prompt("Введите название пакета (например, numpy):");
    if (!pkg) return;
    output.textContent += `[Установка] ${pkg}...\n`;
    try {
        await pyodide.loadPackage([pkg]); // Или micropip.install(pkg)
        output.textContent += `[Готово] Пакет ${pkg} установлен.\n`;
    } catch(e) {
        output.textContent += `[Ошибка] Не удалось установить ${pkg}.\n`;
    }
};

// Запуск кода
runBtn.onclick = () => {
    if (!pyodide) return alert('Python еще грузится...');
    saveCurrentFile(); // Сохраняем перед запуском
    output.textContent = ''; // Очищаем терминал
    
    // Собираем весь проект в один скрипт, сохраняя структуру папок в памяти Pyodide
    let fullCode = "";
    for (const [filename, content] of Object.entries(files)) {
        fullCode += f'# Файл: {filename}\n{content}\n\n';
    }

    try {
        // Передаем все файлы в виртуальную ФС Pyodide (чтобы импорты работали корректно)
        for (const [filename, content] of Object.entries(files)) {
            pyodide.FS.writeFile(filename, content);
        }
        
        // Выполняем главный файл
        const result = pyodide.runPython(fullCode);
        if (result !== undefined && result !== null) {
            output.textContent += result + "\n";
        }
    } catch (err) {
        output.textContent += "Ошибка выполнения:\n" + err.message + "\n";
    }
};

// Следим за изменениями URL хэша для вкладок (опционально)
window.addEventListener('hashchange', () => {
    const hashFile = location.hash.slice(1);
    if (files[hashFile]) switchToFile(hashFile);
});
switchToFile(currentFile);
