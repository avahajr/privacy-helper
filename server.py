from flask import Flask, request, jsonify, render_template

app = Flask(__name__)
dropdown_options = ["Apple", "Google", "Proton", "Reddit", "OpenAI"]
goals = [
    {"goal": "Don't sell my data", "explanation": ""},
    {"goal": "Don't track me", "explanation": ""},
    {"goal": "Disidentify all information", "explanation": ""}
]


@app.route('/')
def home():
    return render_template('input.html', dropdown_options=dropdown_options, goals=goals)

@app.route('/goals')
def get_goals():
    return jsonify(goals)

@app.route('/add/goal', methods=['POST'])
def add_goal():
    data = request.get_json()
    goals.append({"goal": data['goal'], "explanation": data['explanation']})
    return jsonify(goals)


@app.route('/remove/goal', methods=['DELETE'])
def delete_goal():
    data = request.get_json()
    goal_id_to_delete = data['goalId']
    goals.pop(goal_id_to_delete)
    return jsonify(goals)


@app.route('/api/data', methods=['GET'])
def get_data():
    data = {
        "message": "Hello, World!",
        "status": "success"
    }
    return jsonify(data)


@app.route('/api/data', methods=['POST'])
def post_data():
    data = request.get_json()
    response = {
        "received_data": data,
        "status": "success"
    }
    return jsonify(response)


if __name__ == '__main__':
    app.run(debug=True, port=3000)
