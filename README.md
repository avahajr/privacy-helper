# privacy-helper quickstart
A web app to suggest privacy goals and evaluate a company's privacy policy based on those goals. Powered by RAG and GPT!
![Screenshot 2024-10-14 at 12 02 33 PM](https://github.com/user-attachments/assets/de60f354-3c85-454c-9639-5df06668f62e)
![Screenshot 2024-10-14 at 12 03 59 PM](https://github.com/user-attachments/assets/a7b2e805-328c-4930-8c8e-c28a91a8ac8f)
[video demo](https://youtu.be/qEdCk1Vfg_c) on YouTube
## Try it yourself! (Requires OpenAI api key)

After cloning...
create & activate virtual environment for python 
(if you use pip)
```bash
python3 -m venv venv
pip install -r requirements.txt
source venv/bin/activate
```
(if you use conda)
```bash
conda env create -f environment.yml
conda activate mvp-prototype
```

lastly, **change the secret in**  `openai_secrets.py` **your API key.**

Finally, run:
```bash
python server.py
```
The app runs on `http://localhost:3000/`. Happy testing! Thank you!
