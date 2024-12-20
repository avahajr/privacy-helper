from flask import Flask, request, jsonify, render_template
from privacy_policy import PrivacyPolicy
from gpt_prompt import GoalSuggestingPrompt, PolicyAnalysisPrompt, get_summaries, get_quotes, get_rating

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

privacy_policy = None


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

@app.route('/update/goal', methods=['PUT'])
def update_goal():
    data = request.get_json()
    goal_id = data['goalId']
    new_goal = data['newGoal']

    if 0 <= goal_id < len(goals):
        goals[goal_id]['goal'] = new_goal
        return jsonify(goals[goal_id]), 200
    else:
        return jsonify({"error": "Invalid goal ID"}), 400

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

    return jsonify({"policy": selected_policy, "text": PrivacyPolicy(selected_policy).text})


@app.route("/gpt/suggest-goals", methods=["GET"])
def suggest_goals():
    global goals
    prompter = GoalSuggestingPrompt()
    prompt = prompter.construct_prompt(goals)
    response = prompter.prompt_gpt(prompt)
    goals += prompter.process_response(response)
    return jsonify(goals)


@app.route("/gpt/analyze-policy/summary", methods=["GET"])
def get_goal_summaries():
    global goals
    prompter = PolicyAnalysisPrompt(selected_policy)
    summary_responses = get_summaries(prompter, goals)
    for goal in goals:
        goal["gpt_summary"] = summary_responses.pop(0)
    return jsonify(goals)

@app.route("/gpt/analyze-policy/quotes", methods=["GET"])
def get_goal_quotes():
    global goals
    prompter = PolicyAnalysisPrompt(selected_policy)
    summaries_by_sentence_to_found_quotes = get_quotes(prompter, [goal["gpt_summary"] for goal in goals])

    for goal in goals:
        goal["cited_summary"] = summaries_by_sentence_to_found_quotes.pop(0)
    return jsonify(goals)

@app.route("/gpt/analyze-policy/rating", methods=["GET"])
def get_goal_ratings():
    global goals
    prompter = PolicyAnalysisPrompt(selected_policy)
    goal_evaluations = get_rating(prompter, goals)

    for i, goal in enumerate(goals):
        goal["rating"] = goal_evaluations[i]

    goals.sort(key=lambda x: x["rating"])
    return jsonify(goals)

if __name__ == '__main__':
    app.run(debug=True, port=3000)
