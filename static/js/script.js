import { API_BASE_URL } from './config.js';
document.getElementById('gpnForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Собираем данные формы
    const test_kill = {
        'Номер скважины': document.getElementById('well_number').value,
        'Дата глушения': document.getElementById('kill_date').value,
        'Рпл (ат) (перед глушением)': parseFloat(document.getElementById('pressure').value),
        'Газовый факт м3/т': parseFloat(document.getElementById('gas_factor').value),
        'Глубина кровли пласта по вертикале (м)': parseFloat(document.getElementById('depth').value),
        'Расчетная плотность (г/см3)': parseFloat(document.getElementById('density').value),
        '1_ρ г/см3': parseFloat(document.getElementById('density1').value),
        '2_ρ г/см3': parseFloat(document.getElementById('density2').value),
        '3_ρ г/см3': parseFloat(document.getElementById('density3').value)
    };
    
    const additional_test_kill = {
        'Тип\nскважины': document.getElementById('well_type').value,
        'Куст': parseInt(document.getElementById('cluster').value),
        'Пласт': document.getElementById('formation').value,
        'СЭ': document.getElementById('se').value
    };
    
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = '<div class="loading">Идет расчет...(1-2 минуты)</div>';
    console.log(API_BASE_URL);
    try {
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
        
        const data = await response.json();
        
        if (data.status === 'success') {
            // Создаем контейнер для результатов
            resultDiv.innerHTML = `
                <h3>Результаты анализа для скважины ${data.well_number}</h3>
                <p class="report-meta">Дата глушения: ${data.kill_date}</p>
                <div class="report-image" id="imageContainer">
                    <div class="image-loading">Идет загрузка изображения...</div>
                </div>
                <div class="report-text">
                    <h4>Текстовый отчет:</h4>
                    <pre>${data.report}</pre>
                </div>
            `;
            
            // Загрузка изображения через URL
            const imageContainer = document.getElementById('imageContainer');
            const img = new Image();
            
            img.onload = function() {
                imageContainer.innerHTML = '';
                imageContainer.appendChild(img);
            };
            
            img.onerror = function() {
                imageContainer.innerHTML = '<div class="error">Ошибка загрузки изображения</div>';
            };
            
            img.src = data.image_url; // Используем URL вместо base64
            img.alt = "График анализа";
            img.style.maxWidth = '100%';
            img.style.height = 'auto';
            img.style.borderRadius = '6px';
            img.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
        }
        else {
            resultDiv.innerHTML = `
                <div class="error">Ошибка: ${data.message}</div>
                <p>Проверьте введенные данные и подключение к серверу</p>
            `;
        }
    } catch (error) {
        resultDiv.innerHTML = `
            <div class="error">Ошибка: ${error.message}</div>
            <p>Проверьте подключение к серверу</p>
        `;
    }
});