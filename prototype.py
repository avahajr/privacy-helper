import re
import sys
import textwrap

from openai import OpenAI

from thefuzz import process

from openai_secrets import SECRET_KEY
from privacy_policy import PrivacyPolicy


def print_multiline(text, width=100):
    wrapped_text = textwrap.fill(text, width=width)
    print(wrapped_text)


def split_into_sentences(text):
    sentences = re.split(r'(?<=[.!?]) +', text)  # Split the string into sentences

    return sentences


def split_quotes_by_ellipses(quote_list):
    split_quotes = []
    for quote in quote_list:
        parts = quote.split('...')
        split_quotes.extend(part.strip() for part in parts if part.strip())
    return split_quotes


class PolicyReader:
    def __init__(self, company_name, system_message=None):
        self.company_name = company_name
        self.system_message = system_message or (
            f"You are trying to help a user understand the privacy policy of a service ({company_name}) they "
            "want to use. Provide minimal answers.")
        self.client = OpenAI(api_key=SECRET_KEY)
        self.policy = PrivacyPolicy(company_name)

    def suggest_questions(self):
        question_suggestions = self.client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": self.system_message},
                {"role": "user",
                 "content": "Suggest 5 questions about this privacy policy that a person trying to safeguard their "
                            f"data would want answered.\n{self.policy.policy_text}"},
            ]
        )
        return question_suggestions.choices[0].message.content

    def find_matches(self, quotes):
        print("Quote analysis:")
        print('=' * 100)
        policy_sentences = split_into_sentences(self.policy.policy_text)
        split_quotes = split_quotes_by_ellipses(quotes)
        number_of_matches = 0

        for j, quote in enumerate(split_quotes, start=1):
            print(f"Quote {j}:")
            print_multiline(quote)
            print("-" * 25)
            match, score = process.extractOne(quote, policy_sentences)

            if score > 85:
                number_of_matches += 1
                sentences_with_match = re.findall(r'[^.!?]*' + re.escape(match) + r'[^.!?]*[.!?]', self.policy.policy_text)
                for sentence in sentences_with_match:
                    print("(Fuzzy) match found:")
                    print_multiline(f"\"{sentence.strip()}\" (score: {score})")
                    print("-" * 100)
            else:
                print_multiline(f"No sufficient match found. Closest match:\n{match}\nMatch score: {score}")
                print("-" * 100)
        return number_of_matches == len(split_quotes)


def main(company_name=None, question_to_answer=None, outfile=None):
    if outfile is not None:
        sys.stdout = open(outfile, 'w')

    if company_name is None:
        while True:
            company_name = input("Enter the name of the company whose privacy policy you want to review: ")
            if company_name.lower() not in ['apple', 'google', 'proton', 'reddit', 'openai']:
                print("Please enter a valid company name.")
            else:
                break

    reader = PolicyReader(company_name)

    print("Path to policy:", reader.policy.path)
    print()
    print(f"Suggested questions for {company_name.title()}'s privacy policy:")
    question_suggestions = reader.suggest_questions()
    print(question_suggestions)
    print("=" * 100)

    if question_to_answer is None:
        question_to_answer = input("Input the question you want answered (1-5) or ask a different question: ")
    if question_to_answer in ['1', '2', '3', '4', '5']:
        question = question_suggestions.split("\n")[int(question_to_answer) - 1]
    else:
        question = question_to_answer

    cprint(f"Question: {question}", "green")
    print()

    answer = reader.client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": reader.system_message},
            {"role": "user",
             "content": f"{question}\nThe structure of the answer should be a summary, followed by one or more exact "
                        f"quotations from the policy where you got that information. Wrap the quote(s) in "
                        "quotation marks. Sample answer:\nThe policy states that <company_name> collects data on "
                        "users.\n\"We collect data on users.\""},
            {"role": "assistant", "content": reader.policy.policy_text},
        ]
    )

    for i in range(len(answer.choices)):
        print_multiline(f"Model's answer (index {i}):")
        print('=' * 100)
        answer_text = answer.choices[0].message.content
        print_multiline(answer_text)
        quotes = re.findall(r'\"(.*?)\"', answer_text)

        if reader.find_matches(quotes):
            print("All quotes found in the policy text.")
            break
    if outfile is not None:
        sys.stdout.close()


if __name__ == "__main__":
    for company in ['apple', 'google', 'proton', 'reddit', 'openai']:
        main(company_name=company, question_to_answer='1', outfile=f"results/{company}_output.txt")
