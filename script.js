document.getElementById('gpnForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const pressure = parseFloat(document.getElementById('pressure').value);
    const depth = parseFloat(document.getElementById('depth').value);
    const resultDiv = document.getElementById('result');
    
    resultDiv.innerHTML = '<p>Идет расчет...</p>';
    
    try {
        // Для локального тестирования с Flask-сервером
        const response = await fetch('https://shaggy-places-repeat.loca.lt/api/calculate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pressure, depth })
        });
        
        const data = await response.json();
        resultDiv.innerHTML = `
            <h3>Результаты анализа</h3>
            <p><strong>Входные данные:</strong></p>
            <ul>
                <li>Давление: ${pressure} атм</li>
                <li>Глубина: ${depth} м</li>
            </ul>
            <p><strong>Результат:</strong> ${data.result.toFixed(2)}</p>
        `;
    } catch (error) {
        resultDiv.innerHTML = `
            <p class="error">Ошибка: ${error.message}</p>
            <p>Проверьте подключение к серверу</p>
        `;
    }
});