import json

from openai_secrets import SECRET_KEY
from openai import OpenAI
from privacy_policy import PrivacyPolicy
from prototype import split_into_sentences, split_quote_by_ellipses
from thefuzz import process
import re

from typing import TypedDict, Optional, TypeAlias


class CitedSentence(TypedDict):
    sentence: str
    quotes: list[str]


CitedSummary: TypeAlias = list[CitedSentence]


class GoalInfo(TypedDict):
    """Client expects a list of GoalInfo objects."""
    goal: str
    explanation: str
    gpt_summary: Optional[str]
    cited_summary: CitedSummary
    rating: Optional[int]


class GPTPrompt:
    def __init__(self, model: str = "gpt-4o-mini"):
        self.model = model
        self.client = OpenAI(api_key=SECRET_KEY)

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
            request_group = [user_prompt]
            if system_message:
                request_group.append(system_message)
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
                goal, explanation = tuple(new_goal.split(":"))
                new_goals.append({"goal": goal, "explanation": explanation.strip()})
        return new_goals


def extract_summary(response: str) -> str:
    # Remove all quoted text
    summary = re.sub(r'\".*?\"', '', response)
    # Strip leading and trailing whitespace
    return summary.strip()


def extract_quotes(response):
    return re.findall(r'\"(.*?)\"', response)


class PolicyAnalysisPrompt(GPTPrompt):
    def __init__(self, company_name: str, model: str = "gpt-4o-mini"):
        super().__init__(model)
        self.selected_policy = company_name
        self.policy_text = PrivacyPolicy(company_name).text
        self.system_message = {"role": "system",
                               "content": "You are trying to help a user understand the privacy policy of a service they want to use, and align it with their preexisting goals. "
                                          "Read the policy with moderate skepticism, focusing on how technicalities could negatively impact the user's privacy goal. Provide minimal answers."
                                          "When returning JSON, do not include any formating (markdown), only the JSON represented as a string."}

    def get_summary_prompt(self, curr_goals: list[dict[str, str]]) -> list[dict[str, str]]:
        prompts = [self.system_message]

        for goal in curr_goals:
            num_paragraphs_in_summary = None
            match goal['rating']:
                case 0:
                    num_paragraphs_in_summary = 4
                case 1:
                    num_paragraphs_in_summary = 3
                case 2:
                    num_paragraphs_in_summary = 1
            prompt = {"role": "user",
                      'content': f"To what extent does the privacy policy of {self.selected_policy} accomplish the following goal? \n{goal['goal']}\n"
                                 f"Provide a {num_paragraphs_in_summary}-paragraph summary, with no more than 2 sentences in a paragraph."
                                 "Return answer as a string. Do not include quotation marks."
                                 "Sample answer for goal \"Do not collect my personal data\":\nThe policy states that <company_name> does not collect data on users."}
            prompts.append(prompt)

        assistant_message = {"role": "assistant", "content": self.policy_text}
        prompts.append(assistant_message)

        return prompts

    def cite_sources(self, summaries: list[str]):
        """Given a list of summaries, cite sources."""
        prompts = [self.system_message, {"role": "assistant", "content": self.policy_text}]
        sentence_endings = re.compile(r'(?<=[.!?]) +')

        for summary in summaries:
            sentences = sentence_endings.split(summary)
            prompt = {"role": "user",
                      "content": f"Using only the provided privacy policy, find relevant quotes to support the following summary,"
                                 f"represented as a list of sentences:\n{sentences}\n Return a JSON array, each element mapping a sentence to a list of quotes "
                                 f"in the policy (not all sentences have to have a citation). Make sure the JSON is pure so that I can call json.loads() on the string response without any cleaning. "
                                 f"If there are multiple quotes, to support a single sentence, then the quotes property will have two elements in the array.\nSample output:\n"
                                 "[{sentence:\"The policy states that <company_name> does not collect data on users\", quotes:[\"<quote>\"]}, {summary: <summary_sentence>, quotes: [<quote1>,<quote2>]}]"
                      }
            prompts.append(prompt)

        return prompts

    def get_evaluate_goal_achievement_prompts(self, linked_outputs: list[dict[str, str]]) -> list[dict[str, str]]:
        prompts = [{"role": "assistant", "content": self.policy_text}, self.system_message]
        for goal_info in linked_outputs:
            prompt = {"role": "user",
                      'content': f"I want to make sure that the privacy policy of {self.selected_policy} fulfills the following goal: \n{goal_info['goal']}\n"
                                 f"\nEvaluate whether the policy fulfills the goal. You must answer on a scale of 0-2, "
                                 f"0 being being the goal is not at all accomplished, 1 being the goal is somewhat accomplished, and 2 being the goal is fully accomplished.\n"
                                 f"Provide no explanation, only an integer."
                      }
            prompts.append(prompt)

        return prompts

    def find_matches(self, summaries_by_sentences_to_quotes: list[CitedSummary]) -> list[CitedSummary]:
        policy_sentences = split_into_sentences(self.policy_text)
        updated_summaries = []
        for summary in summaries_by_sentences_to_quotes:
            updated_summary = []
            for cited_sentence in summary:
                updated_cited_sentence = {"sentence": cited_sentence["sentence"], "quotes": []}
                for quote in cited_sentence["quotes"]:
                    split_quotes = split_quote_by_ellipses(quote)
                    for split_quote in split_quotes:
                        match, score = process.extractOne(split_quote, policy_sentences)
                        if score > 85:
                            sentences_with_match = re.findall(r'[^.!?]*' + re.escape(match) + r'[^.!?]*[.!?]',
                                                              self.policy_text)
                            for sentence in sentences_with_match:
                                updated_cited_sentence["quotes"].append(
                                    {"gpt_quote": split_quote, "policy_quote": sentence})
                if updated_cited_sentence["quotes"]:
                    updated_summary.append(updated_cited_sentence)
            updated_summaries.append(updated_summary)

        return updated_summaries


def get_summaries(prompter, goals):
    summary_prompts = prompter.get_summary_prompt(goals)
    return prompter.prompt_gpt(summary_prompts)


def get_quotes(prompter, summary_responses) -> list[CitedSummary]:
    quote_prompts = prompter.cite_sources(summary_responses)

    summaries_by_sentences_to_quotes = [json.loads(response) for response in prompter.prompt_gpt(quote_prompts)]
    summaries_by_sentences_to_matched_quotes = prompter.find_matches(summaries_by_sentences_to_quotes)
    return summaries_by_sentences_to_matched_quotes


def get_rating(prompter, goals: list[GoalInfo]):
    evaluate_achievement_prompts = prompter.get_evaluate_goal_achievement_prompts(goals)
    goal_evaluations = [int(response.strip()) for response in prompter.prompt_gpt(evaluate_achievement_prompts)]
    return goal_evaluations
