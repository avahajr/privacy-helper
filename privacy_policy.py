import os


class PrivacyPolicy:
    """Processes the privacy policy of a company."""

    def __init__(self, company_name):
        self.path = os.path.join(os.getcwd(), "static", "policies", company_name.lower() + ".txt")
        self.text = self.get_policy_text()

    def get_policy_text(self):
        with open(self.path) as f:
            policy_text = " ".join(line.rstrip() for line in f if line != "\n")
        return policy_text
