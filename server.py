from flask import Flask, request, jsonify, render_template

app = Flask(__name__)


@app.route('/')
def home():
    return render_template('input.html')


@app.route('/api/data', methods=['GET'])
def get_data():
    data = {
        "message": "Hello, World!",
        "status": "success"
    }
    return jsonify(data)


@app.route('/api/data', methods=['POST'])
def post_data():
    data = request.get_json()
    response = {
        "received_data": data,
        "status": "success"
    }
    return jsonify(response)


if __name__ == '__main__':
    app.run(debug=True, port=3000)
