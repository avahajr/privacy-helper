from flask import Flask, request, jsonify, render_template
from privacy_policy import PrivacyPolicy
from gpt_prompt import GoalSuggestingPrompt, PolicyAnalysisPrompt, get_summaries, get_quotes, link_outputs, get_rating

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


@app.route("/gpt/analyze-policy", methods=["GET"])
def analyze_policy():
    global goals
    prompter = PolicyAnalysisPrompt(selected_policy)

    summary_responses = get_summaries(prompter, goals)
    extracted_quotes = get_quotes(prompter, summary_responses)
    linked_outputs = link_outputs(prompter, goals, summary_responses, extracted_quotes)
    goal_evaluations = get_rating(prompter, linked_outputs)

    for goal_info, evaluation in zip(linked_outputs, goal_evaluations):
        goal_info["rating"] = evaluation

    goals_by_achievement = [[], [], []]
    for goal_info in linked_outputs:
        goals_by_achievement[goal_info["rating"]].append(goal_info)

    return jsonify(goals_by_achievement)

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
    extracted_quotes = get_quotes(prompter, [goal["gpt_summary"] for goal in goals])
    prompter.find_matches([quote for quotes in extracted_quotes for quote in quotes])
    for goal in goals:
        goal["gpt_quotes"] = extracted_quotes.pop(0)
    return jsonify(goals)

@app.route("/gpt/analyze-policy/rating", methods=["GET"])
def get_goal_ratings():
    global goals
    prompter = PolicyAnalysisPrompt(selected_policy)
    goal_evaluations = get_rating(prompter, goals)

    for i, goal in enumerate(goals):
        goal["rating"] = goal_evaluations[i]

    return jsonify(goals)

if __name__ == '__main__':
    app.run(debug=True, port=3000)
