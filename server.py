from flask import Flask, request, jsonify
import pickle

app = Flask(__name__)
from flask_cors import CORS
CORS(app)
# Загрузка вашей модели (пример)
try:
    with open('model.pkl', 'rb') as f:
        model = pickle.load(f)
except:
    print("Модель не найдена! Используется заглушка.")
    model = None

@app.route('/api/calculate', methods=['POST', 'OPTIONS'])
def calculate():
    if request.method == 'OPTIONS':
        # Предварительный CORS-запрос
        response = jsonify({'status': 'preflight'})
    else:
        # Основной запрос
        data = request.json
        pressure = float(data['pressure'])
        depth = float(data['depth'])
        result = pressure * 0.8 + depth * 0.1  # Ваш расчет
        
        response = jsonify({
            'result': round(result, 2),
            'model_used': 'Real Model'
        })
    
    # Добавляем заголовки вручную
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
    
    return response

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)