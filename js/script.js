console.log('ghbdtn')
import JSZip from 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';


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
        'СЭ': getFormValue('se'),
        'Объем МСКО': getFormValue('msko_volume', true),
        'Концентрация МСКО': getFormValue('msko_density', true),
        'Сложность'  :getFormValue('kill_complexity')
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
            <pre>${escapeHtml(data.report)}</pre>
        </div>
        <div class="download-section" id="downloadSection">
            <button id="downloadReportBtn" class="download-btn">Скачать отчет (ZIP)</button>
        </div>
    `;
    
    // Добавляем обработчик для кнопки скачивания
    document.getElementById('downloadReportBtn').addEventListener('click', () => {
        downloadReport(data);
    });
    
    // Проверяем наличие Base64 данных изображения
    if (data.image) {
        loadImageFromBase64(data.image);
    }
    // Если Base64 нет, но есть URL (для обратной совместимости)
    else if (data.image_url) {
        loadImage(data.image_url);
    }
}

async function downloadReport(data) {
    try {
        const downloadBtn = document.getElementById('downloadReportBtn');
        downloadBtn.disabled = true;
        downloadBtn.textContent = 'Подготовка архива...';
        
        // Создаем ZIP архив
        const zip = new JSZip();
        
        // Добавляем текстовый отчет
        const reportFilename = `Отчет_${data.well_number}_${data.kill_date}.txt`;
        zip.file(reportFilename, data.report);
        
        // Добавляем изображение (если есть)
        if (data.image) {
            // Удаляем префикс base64 если он есть
            const base64Data = data.image.startsWith('data:') 
                ? data.image.split(',')[1] 
                : data.image;
            
            const imgFilename = `График_${data.well_number}_${data.kill_date}.png`;
            zip.file(imgFilename, base64Data, { base64: true });
        }
        
        // Генерируем архив
        const content = await zip.generateAsync({ type: 'blob' });
        
        // Создаем ссылку для скачивания
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Отчет_${data.well_number}_${data.kill_date}.zip`;
        document.body.appendChild(a);
        a.click();
        
        // Очистка
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            downloadBtn.disabled = false;
            downloadBtn.textContent = 'Скачать отчет (ZIP)';
        }, 100);
        
    } catch (error) {
        console.error('Ошибка при создании архива:', error);
        alert('Не удалось создать архив отчета');
        const downloadBtn = document.getElementById('downloadReportBtn');
        downloadBtn.disabled = false;
        downloadBtn.textContent = 'Скачать отчет (ZIP)';
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

document.addEventListener('DOMContentLoaded', function() {
  // Получаем все числовые поля
  const numericInputs = document.querySelectorAll('.numeric-input');
  
  // Для каждого поля добавляем обработчик событий
  numericInputs.forEach(input => {
    // Проверка при изменении значения
    input.addEventListener('input', validateNumberInput);
    // Проверка при потере фокуса
    input.addEventListener('blur', validateNumberInput);
    // Проверка при загрузке страницы
    validateNumberInput({ target: input });
  });
  
  // Функция валидации
  function validateNumberInput(event) {
    const input = event.target;
    const messageElement = input.nextElementSibling;
    
    // Проверяем, является ли значение числом
    if (isNaN(input.valueAsNumber) || input.value === '') {
      input.classList.add('invalid');
      messageElement.textContent = 'Введите число';
      return false;
    }
    
    // Проверяем минимальное значение (0 для большинства полей)
    const minValue = input.id === 'pressure' ? 0 : 0; // Можно настроить индивидуально
    if (input.valueAsNumber < minValue) {
      input.classList.add('invalid');
      messageElement.textContent = `Значение не может быть меньше ${minValue}`;
      return false;
    }
    
   
    
    // Если все проверки пройдены
    input.classList.remove('invalid');
    messageElement.textContent = '';
    return true;
  }
  
  // Модифицируем вашу функцию getFormValue для использования валидации
  function getFormValue(id, isNumber = false) {
    const element = document.getElementById(id);
    if (!element) return null;
    
    // Вызываем валидацию перед получением значения
    const isValid = validateNumberInput({ target: element });
    if (!isValid && isNumber) return null;
    
    const value = element.value.trim();
    if (isNumber) {
      const numValue = parseFloat(value);
      return isNaN(numValue) ? null : numValue;
    }
    return value;
  }
});