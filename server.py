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

@app.route('/calculate', methods=['POST'])
def calculate():
    data = request.json
    pressure = float(data['pressure'])
    depth = float(data['depth'])
    
    # Пример обработки (замените на вашу модель)
    if model:
        result = model.predict([[pressure, depth]])[0]
    else:
        result = pressure * 0.8 + depth * 0.1  # Заглушка
    
    return jsonify({
        'result': round(result, 2),
        'model_used': 'Real Model' if model else 'Test Formula'
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)