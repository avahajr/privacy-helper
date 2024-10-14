from flask import Flask, request, jsonify, render_template
from openai import OpenAI

from openai_secrets import SECRET_KEY
from privacy_policy import PrivacyPolicy
from prototype import split_into_sentences, split_quotes_by_ellipses
from thefuzz import process
import re

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


class GPTPrompt:
    def __init__(self, model: str = "gpt-4o-mini"):
        self.model = model
        self.client = OpenAI(api_key=SECRET_KEY)

    def construct_prompt(self, goals: list[dict[str, str]]) -> list[dict[str, str]]:
        raise NotImplementedError("Subclasses should implement this method")

    def prompt_gpt(self, prompts: list[dict[str, str]]) -> list[str]:
        system_message = None
        assistant_message = None
        requests = []

        # Identify system and assistant messages
        for message in prompts:
            if message['role'] == 'system':
                system_message = message
            elif message['role'] == 'assistant':
                assistant_message = message

        # Split user prompts into separate request groups
        user_prompts = [message for message in prompts if message['role'] == 'user']
        for user_prompt in user_prompts:
            request_group = [system_message, user_prompt]
            if assistant_message:
                request_group.append(assistant_message)
            requests.append(request_group)

        responses = []
        for request_in_batch in requests:
            response = self.client.chat.completions.create(model=self.model, messages=request_in_batch)
            responses.append(response.choices[0].message.content)

        return responses


class GoalSuggestingPrompt(GPTPrompt):
    def construct_prompt(self, curr_goals: list[dict[str, str]]) -> list[dict[str, str]]:
        goal_summary = ("Here are my privacy goals and the explanation for each. They are in the format "
                        "<goal>:<explanation>."
                        "\n".join(goal['goal'] + ": " + goal['explanation'] for goal in curr_goals))

        system_message = {"role": "system",
                          "content": "You are trying to help a user come up with privacy goals based on their current goals."}

        task = "Based on these goals, suggest 3 new privacy goals for me. Separate each goal with a newline character only."
        user_message = {"role": "user", "content": f"{goal_summary}\n{task}"}
        return [system_message, user_message]

    def process_response(self, responses: list[str]):
        """returns a new goal list"""
        new_goals = []
        for response in responses:
            for new_goal in response.split("\n"):
                if new_goal == "":
                    continue
                print(new_goal)
                goal, explanation = tuple(new_goal.split(":"))
                new_goals.append({"goal": goal, "explanation": explanation.strip()})
        return new_goals


class PolicyAnalysisPrompt(GPTPrompt):
    def __init__(self, company_name: str, model: str = "gpt-4o-mini"):
        super().__init__(model)
        self.selected_policy = company_name
        self.policy_text = PrivacyPolicy(company_name).text

    def construct_prompt(self, curr_goals: list[dict[str, str]]) -> list[dict[str, str]]:
        prompts = []
        system_message = {"role": "system",
                          "content": "You are trying to help a user understand the privacy policy of a service they want to use, and align it with their preexisting goals. Provide minimal answers."}
        prompts.append(system_message)

        for goal in curr_goals:
            prompt = {"role": "user",
                      'content': f"Does the privacy policy of {self.selected_policy} fulfill the following goal? \n{goal['goal']}\n"
                                 "Result format should be: brief (less than 3 sentences) answer, followed by quotes from the privacy policy that support the answer."
                                 "Sample answer for goal \"Do not collect my personal data\":\nThe policy states that <company_name> collects data on users.\n\"We collect data on users.\""}
            prompts.append(prompt)

        assistant_message = {"role": "assistant", "content": self.policy_text}
        prompts.append(assistant_message)

        return prompts

    def process_responses(self, responses: list[str]):
        quotes_for_goals = []

        for response in responses:
            quotes = self.extract_quotes(response)
            summary = self.extract_summary(response)
            quotes_to_sentences = self.find_matches(quotes)
            quotes_for_goals.append({"summary": summary, "quotes": quotes_to_sentences})
        return quotes_for_goals

    def extract_quotes(self, response):
        return re.findall(r'\"(.*?)\"', response)

    def extract_summary(self, response: str) -> str:
        # Remove all quoted text
        summary = re.sub(r'\".*?\"', '', response)
        # Strip leading and trailing whitespace
        return summary.strip()

    def find_matches(self, quotes):
        policy_sentences = split_into_sentences(self.policy_text)
        split_quotes = split_quotes_by_ellipses(quotes)
        # number_of_matches = 0
        quotes_to_sentence_matches = {}

        for j, quote in enumerate(split_quotes, start=1):

            match, score = process.extractOne(quote, policy_sentences)
            if score > 85:
                # number_of_matches += 1
                sentences_with_match = re.findall(r'[^.!?]*' + re.escape(match) + r'[^.!?]*[.!?]',
                                                  self.policy_text)
                for sentence in sentences_with_match:
                    quotes_to_sentence_matches[quote] = sentence

        return quotes_to_sentence_matches


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


@app.route("/gpt/<action>", methods=["GET"])
def ask_gpt(action):
    global goals
    if action == "suggest-goals":
        prompter = GoalSuggestingPrompt()
        prompt = prompter.construct_prompt(goals)
        response = prompter.prompt_gpt(prompt)
        goals += prompter.process_response(response)
        return jsonify(goals)

    elif action == "analyze-policy":
        prompter = PolicyAnalysisPrompt(selected_policy)
        prompt = prompter.construct_prompt(goals)
        responses = prompter.prompt_gpt(prompt)
        summary_and_quotes = prompter.process_responses(responses)

        zipped_results = []
        for goal, summary_and_quotes in zip(goals, summary_and_quotes):
            summary = summary_and_quotes['summary']
            quotes = summary_and_quotes['quotes']
            fuzzy_matches = list(quotes.values())
            gpt_quotes = list(quotes.keys())

            zipped_results.append({
                "goal": goal["goal"],
                "explanation": goal["explanation"],
                "search_summary": summary,
                "fuzzy_matches": fuzzy_matches,
                "gpt_quotes": gpt_quotes
            })

        return jsonify(zipped_results)


if __name__ == '__main__':
    app.run(debug=True, port=3000)
