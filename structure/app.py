from flask import Flask, render_template, request, jsonify, send_file
import pandas as pd
import matplotlib.pyplot as plt
import os
from io import BytesIO

app = Flask(__name__)

# Store uploaded dataframe in memory
df_global = None

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/upload", methods=["POST"])
def upload_file():
    global df_global
    file = request.files["file"]
    if file.filename.endswith(".csv"):
        df_global = pd.read_csv(file)
    elif file.filename.endswith((".xlsx", ".xls")):
        df_global = pd.read_excel(file)
    else:
        return jsonify({"error": "Invalid file format"}), 400
    return jsonify({"columns": list(df_global.columns)})

@app.route("/sample", methods=["GET"])
def sample_data():
    global df_global
    data = {
        "Name": ["Alice", "Bob", "Charlie", "David"],
        "Age": [25, 30, 35, 40],
        "Score": [85, 90, 95, 88]
    }
    df_global = pd.DataFrame(data)
    return jsonify({"columns": list(df_global.columns)})

@app.route("/analysis", methods=["POST"])
def analysis():
    global df_global
    if df_global is None:
        return jsonify({"error": "No data loaded"}), 400
    stats = df_global.describe(include="all").to_dict()
    return jsonify(stats)

@app.route("/plot", methods=["POST"])
def plot():
    global df_global
    if df_global is None:
        return jsonify({"error": "No data loaded"}), 400

    columns = request.json.get("columns", [])
    if not columns or any(col not in df_global.columns for col in columns):
        return jsonify({"error": "Invalid columns"}), 400

    plt.figure(figsize=(6, 4))
    df_global[columns].plot()
    plt.title("Selected Columns Plot")
    plt.xlabel("Index")
    plt.ylabel("Value")
    plt.grid(True)

    buf = BytesIO()
    plt.savefig(buf, format="png")
    buf.seek(0)
    return send_file(buf, mimetype="image/png")

if __name__ == "__main__":
    app.run(debug=True)
