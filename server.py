from flask import Flask, request, jsonify, render_template

app = Flask(__name__, template_folder='templates')
selected_policy = "Apple"
dropdown_options = ["Apple", "Google", "Proton", "Reddit", "OpenAI"]
goals = [
    {"goal": "Don't sell my data",
     "explanation": "Companies sometimes sell user data to third parties like data brokers. **This can lead to your data being used in ways you didn't expect.**"},
    {"goal": "Allow me to opt-out of cross-site tracking",
     "explanation": "Third-party consistent cookies are used to track your browser activity across different websites, usually for advertising. **This information can be used to build a profile of you and sell it to advertisers.**"},
    {"goal": "Allow me to opt out of targeted ads",
     "explanation": "Targeted ads are ads that allow third-parties to infer information about you without your data being directly sold by the service you're using. **These third parties can sell your data, even if the service you're using does not.**"}
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


@app.route("/results", methods=["GET"])
def results():
    return render_template('results.html', selected_policy=selected_policy)


@app.route("/policy", methods=["GET", "PUT"])
def policy():
    global selected_policy
    if request.method == "PUT":
        data = request.get_json()
        selected_policy = data['policy']
        return jsonify({"policy": selected_policy})

    return jsonify({"policy": selected_policy})


if __name__ == '__main__':
    app.run(debug=True, port=3000)
