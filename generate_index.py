import os
import json

SESSIONS_DIR = "sessions"
OUTPUT_FILE = os.path.join(SESSIONS_DIR, "index.json")

def generate_index():
    files = []

    for filename in os.listdir(SESSIONS_DIR):
        file_path = os.path.join(SESSIONS_DIR, filename)

        # Skip directories
        if not os.path.isfile(file_path):
            continue

        # Exclude template and index
        if filename in ["_template.json", "index.json"]:
            continue

        # Only include .json files
        if filename.endswith(".json"):
            files.append(filename)

    # Optional: sort for consistency
    files.sort()

    # Write index.json
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(files, f, indent=4)

    print(f"index.json generated with {len(files)} entries.")

if __name__ == "__main__":
    generate_index()