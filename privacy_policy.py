import os


class PrivacyPolicy:
    """Processes the privacy policy of a company."""

    def __init__(self, company_name):
        self.path = os.path.join(os.getcwd(), "static", "policies", company_name.lower() + ".md")
        self.text = self.get_policy_text()

    def get_policy_text(self):

        with open(self.path) as f:
            lines = f.readlines()

        policy_text = []
        empty_line_count = 0

        for line in lines:
            if line.strip() == "":
                empty_line_count += 1
            else:
                if empty_line_count >= 2:
                    policy_text.append("")
                policy_text.append(line.rstrip())
                empty_line_count = 0

        return "\n".join(policy_text)
