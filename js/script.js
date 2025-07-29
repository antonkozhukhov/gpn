console.log('ghbdtn')

let API_BASE_URL;

try {
  const config = await import('./config.js');
  API_BASE_URL = config.API_BASE_URL;
  console.log(API_BASE_URL)

} catch {
  API_BASE_URL = 'https://резервный-адрес';
}

// Вспомогательная функция для безопасного получения значений
function getFormValue(id, isNumber = false) {
    const element = document.getElementById(id);
    if (!element) return null;
    
    const value = element.value.trim();
    if (isNumber) {
        const numValue = parseFloat(value);
        return isNaN(numValue) ? null : numValue;
    }
    return value;
}

document.getElementById('gpnForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Валидация обязательных полей
    const requiredFields = ['well_number', 'kill_date', 'pressure', 'gas_factor', 'depth', 'density'];
    for (const fieldId of requiredFields) {
        if (!getFormValue(fieldId)) {
            showError(`Поле "${document.getElementById(fieldId).previousElementSibling.textContent}" обязательно для заполнения`);
            return;
        }
    }

    // Собираем данные формы с валидацией
    const test_kill = {
        'Номер скважины': getFormValue('well_number'),
        'Дата глушения': getFormValue('kill_date'),
        'Рпл (ат) (перед глушением)': getFormValue('pressure', true),
        'Газовый факт м3/т': getFormValue('gas_factor', true),
        'Глубина кровли пласта по вертикале (м)': getFormValue('depth', true),
        'Расчетная плотность (г/см3)': getFormValue('density', true),
        '1_ρ г/см3': getFormValue('density1', true) || 0,
        '2_ρ г/см3': getFormValue('density2', true) || 0,
        '3_ρ г/см3': getFormValue('density3', true) || 0
    };
    
    const additional_test_kill = {
        'Тип\nскважины': getFormValue('well_type'),
        'Куст': getFormValue('cluster', true) || 0,
        'Пласт': getFormValue('formation'),
        'СЭ': getFormValue('se')
    };
    
    const resultDiv = document.getElementById('result');
    const submitButton = e.target.querySelector('button[type="submit"]');
    
    try {
        // Показываем индикатор загрузки
        submitButton.disabled = true;
        resultDiv.innerHTML = '<div class="loading">Идет расчет...(1-2 минуты)</div>';
        
        const response = await fetch(`${API_BASE_URL}/api/generate_report`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                test_kill,
                additional_test_kill
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Ошибка сервера: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.status === 'success') {
            showResults(data);
        } else {
            throw new Error(data.message || 'Неизвестная ошибка сервера');
        }
    } catch (error) {
        showError(error.message);
    } finally {
        submitButton.disabled = false;
    }
});

function showResults(data) {
    const resultDiv = document.getElementById('result');
    
    resultDiv.innerHTML = `
        <h3>Результаты анализа для скважины ${escapeHtml(data.well_number)}</h3>
        <p class="report-meta">Дата глушения: ${escapeHtml(data.kill_date)}</p>
        <div class="report-image" id="imageContainer">
            <div class="image-loading">Идет загрузка изображения...</div>
        </div>
        <div class="report-text">
            <!-- <h4>Текстовый отчет:</h4>  -->
            <pre>${escapeHtml(data.report)}</pre>
        </div>
    `;
    
    // Проверяем наличие Base64 данных изображения
    if (data.image) {
        loadImageFromBase64(data.image);
    }
    // Если Base64 нет, но есть URL (для обратной совместимости)
    else if (data.image_url) {
        loadImage(data.image_url);
    }
}

function loadImageFromBase64(base64String) {
    const imageContainer = document.getElementById('imageContainer');
    const img = new Image();
    
    img.onload = function() {
        imageContainer.innerHTML = '';
        imageContainer.appendChild(img);
    };
    
    img.onerror = function() {
        imageContainer.innerHTML = '<div class="error">Ошибка загрузки изображения</div>';
    };
    
    // Убедитесь, что base64String включает правильный префикс (например, 'data:image/png;base64,')
    if (!base64String.startsWith('data:')) {
        // Добавляем стандартный префикс для PNG (можете изменить на нужный вам формат)
        base64String = `data:image/png;base64,${base64String}`;
    }
    
    img.src = base64String;
    img.alt = "График анализа";
    img.style.maxWidth = '100%';
    img.style.height = 'auto';
    img.style.borderRadius = '6px';
    img.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
}

function loadImage(url) {
    const imageContainer = document.getElementById('imageContainer');
    const img = new Image();
    
    img.onload = function() {
        imageContainer.innerHTML = '';
        imageContainer.appendChild(img);
    };
    
    img.onerror = function() {
        imageContainer.innerHTML = '<div class="error">Ошибка загрузки изображения</div>';
    };
    
    img.src = url;
    img.alt = "График анализа";
    img.style.maxWidth = '100%';
    img.style.height = 'auto';
    img.style.borderRadius = '6px';
    img.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
}

function showError(message) {
    document.getElementById('result').innerHTML = `
        <div class="error">Ошибка: ${escapeHtml(message)}</div>
        <p>Проверьте введенные данные и подключение к серверу</p>
    `;
}

// Защита от XSS
function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return unsafe;
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}