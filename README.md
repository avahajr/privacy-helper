# privacy-helper quickstart
Hi Vincent! Thanks for testing my app. Here's a quick setup guide:

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

lastly, **change the secret in**  `openai_secrets.py` **to the secret I sent you via slack.**

Finally, run:
```bash
python server.py
```
The app runs on `http://localhost:3000/`. Happy testing! Thank you!
